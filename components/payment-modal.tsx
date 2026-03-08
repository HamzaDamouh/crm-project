"use client"

import * as React from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search } from "lucide-react"
import { recordPayment } from "@/app/actions/invoices"

interface Entity {
  id: number
  name: string
  balance_due?: number
}

interface PaymentModalProps {
  invoiceId: number
  balanceDue: number
  defaultEntityId: number
  entities: Entity[]
  onClose: () => void
}

export function PaymentModal({
  invoiceId,
  balanceDue,
  defaultEntityId,
  entities,
  onClose,
}: PaymentModalProps) {
  const [amount, setAmount] = React.useState(balanceDue)
  const [method, setMethod] = React.useState("cash")
  const [paidByEntityId, setPaidByEntityId] = React.useState(defaultEntityId)
  const [chequeNumber, setChequeNumber] = React.useState("")
  const [paymentDate, setPaymentDate] = React.useState(
    new Date().toISOString().split("T")[0]
  )
  const [notes, setNotes] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [entitySearch, setEntitySearch] = React.useState("")
  const [entityDropdownOpen, setEntityDropdownOpen] = React.useState(false)
  const entityRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (entityRef.current && !entityRef.current.contains(e.target as Node)) {
        setEntityDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const selectedEntity = entities.find((e) => e.id === paidByEntityId)
  const isDebtTransfer = method === "debt_transfer"
  const filteredEntities = entities.filter((e) =>
    e.name.toLowerCase().includes(entitySearch.toLowerCase()) && 
    (isDebtTransfer ? e.id !== defaultEntityId : true)
  )

  React.useEffect(() => {
    if (isDebtTransfer && selectedEntity) {
      setNotes(`Paid via ${selectedEntity.name} account`)
    }
  }, [isDebtTransfer, selectedEntity])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const result = await recordPayment({
        invoiceId,
        amount,
        method,
        paidByEntityId,
        chequeNumber: method === "cheque" ? chequeNumber : undefined,
        paymentDate,
        notes: notes || undefined,
      })
      if (result.success) {
        toast.success(result.message)
        onClose()
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error("An unexpected error occurred.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-4">Record Payment</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Balance due: <span className="font-bold text-red-600">{balanceDue.toLocaleString()} MAD</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div>
            <Label htmlFor="pay-amount">Amount (MAD)</Label>
            <Input
              id="pay-amount"
              type="number"
              min={0.01}
              max={balanceDue}
              step={0.01}
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              required
            />
          </div>

          {/* Method */}
          <div>
            <Label htmlFor="pay-method">Method</Label>
            <select
              id="pay-method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="transfer">Transfer</option>
              <option value="debt_transfer">Deduct from another client's balance</option>
            </select>
          </div>

          {/* Cheque Number */}
          {method === "cheque" && (
            <div>
              <Label htmlFor="pay-cheque">Cheque Number</Label>
              <Input
                id="pay-cheque"
                value={chequeNumber}
                onChange={(e) => setChequeNumber(e.target.value)}
                required
              />
            </div>
          )}

          {/* Paid By (entity selector) */}
          {isDebtTransfer ? (
            <div>
              <Label>Deduct from:</Label>
              <div className="relative" ref={entityRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search clients..."
                    className="pl-9"
                    value={entityDropdownOpen ? entitySearch : (selectedEntity?.name || "")}
                    onChange={(e) => {
                      setEntitySearch(e.target.value)
                      setEntityDropdownOpen(true)
                    }}
                    onFocus={() => {
                      setEntityDropdownOpen(true)
                      setEntitySearch("")
                    }}
                  />
                </div>
                {entityDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg max-h-36 overflow-y-auto">
                    {filteredEntities.map((entity) => (
                      <button
                        key={entity.id}
                        type="button"
                        className={`flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent text-left ${
                          entity.id === paidByEntityId ? "bg-accent font-medium" : ""
                        }`}
                        onClick={() => {
                          setPaidByEntityId(entity.id)
                          setEntityDropdownOpen(false)
                          setEntitySearch("")
                        }}
                      >
                        <span>{entity.name}</span>
                        {entity.balance_due !== undefined && entity.balance_due > 0 && (
                          <span className="text-red-600 text-xs font-semibold">
                            {entity.balance_due.toLocaleString()} MAD due
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedEntity && selectedEntity.balance_due !== undefined && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Available to deduct: <span className="font-medium">{selectedEntity.balance_due.toLocaleString()} MAD</span>
                </p>
              )}
            </div>
          ) : null}

          {/* Date */}
          <div>
            <Label htmlFor="pay-date">Payment Date</Label>
            <Input
              id="pay-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="pay-notes">Notes (optional)</Label>
            <Input
              id="pay-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || amount <= 0 || (isDebtTransfer && (!paidByEntityId || paidByEntityId === defaultEntityId))}>
              {submitting ? "Processing..." : "Record Payment"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
