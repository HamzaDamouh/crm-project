"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ArrowLeftRight, CreditCard, Search } from "lucide-react"
import { recordPayment } from "@/app/actions/invoices"

interface EntityInfo {
  id: number; name: string; type: string
  phone: string | null; email: string | null
  address: string | null; ice: string | null
  balance_due: number
}

interface Invoice {
  id: number; type: string; status: string
  invoice_number: string | null; issue_date: string | null
  total: number; amount_paid: number; balance_due: number
}

interface PaymentEntry {
  id: number; amount: number; method: string
  payment_date: string | null; cheque_number: string | null
  invoiceId: number | null; invoiceNumber: string | null
  invoiceEntityName: string | null; invoiceEntityId: number | null
}

interface DebtTransferEntry {
  id: number; from_entity_id: number; to_entity_id: number
  amount: number; note: string | null; created_at: string
  fromEntity: { name: string }; toEntity: { name: string }
}

interface AllEntity { id: number; name: string }

function statusBadge(status: string, balanceDue: number, total: number) {
  if (status === "paid" || balanceDue === 0)
    return <Badge className="bg-green-600 text-white">Paid</Badge>
  if (balanceDue > 0 && balanceDue < total)
    return <Badge className="bg-yellow-500 text-white">Partial</Badge>
  return <Badge className="bg-red-600 text-white">Unpaid</Badge>
}

export function ClientDetailClient({
  entity, invoices, payments, debtTransfers, allEntities, unpaidInvoices,
}: {
  entity: EntityInfo
  invoices: Invoice[]
  payments: PaymentEntry[]
  debtTransfers: DebtTransferEntry[]
  allEntities: AllEntity[]
  unpaidInvoices: Invoice[]
}) {
  const router = useRouter()
  const [tab, setTab] = React.useState<"invoices" | "payments" | "debts">("invoices")
  const [crossPayOpen, setCrossPayOpen] = React.useState(false)

  const tabs = [
    { key: "invoices" as const, label: "Invoices", count: invoices.length },
    { key: "payments" as const, label: "Payments", count: payments.length },
    { key: "debts" as const, label: "Debt Transfers", count: debtTransfers.length },
  ]

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{entity.name}</h1>
          <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="capitalize">{entity.type}</Badge>
            {entity.phone && <span>📞 {entity.phone}</span>}
            {entity.email && <span>✉ {entity.email}</span>}
          </div>
          {entity.address && (
            <p className="text-sm text-muted-foreground mt-1">{entity.address}</p>
          )}
          {entity.ice && (
            <p className="text-sm text-muted-foreground">ICE: {entity.ice}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Balance Due</p>
          <p className={`text-3xl font-bold ${entity.balance_due > 0 ? "text-red-600" : "text-green-600"}`}>
            {entity.balance_due.toLocaleString()} MAD
          </p>
          {unpaidInvoices.length > 0 && (
            <Button className="mt-3" onClick={() => setCrossPayOpen(true)}>
              <ArrowLeftRight className="h-4 w-4 mr-2" /> Cross-Company Payment
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* TAB 1: Invoices */}
      {tab === "invoices" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/invoices/${inv.id}`)}>
                    <TableCell className="font-mono font-medium">
                      {inv.invoice_number || `#${inv.id}`}
                    </TableCell>
                    <TableCell className="capitalize">{inv.type}</TableCell>
                    <TableCell>
                      {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString("fr-MA") : "—"}
                    </TableCell>
                    <TableCell className="text-right">{inv.total.toLocaleString()} MAD</TableCell>
                    <TableCell className="text-right text-green-600">{inv.amount_paid.toLocaleString()} MAD</TableCell>
                    <TableCell className="text-right">
                      {inv.balance_due > 0 ? (
                        <span className="text-red-600 font-semibold">{inv.balance_due.toLocaleString()} MAD</span>
                      ) : "0 MAD"}
                    </TableCell>
                    <TableCell>{statusBadge(inv.status, inv.balance_due, inv.total)}</TableCell>
                  </TableRow>
                ))}
                {invoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No invoices.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* TAB 2: Payments */}
      {tab === "payments" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {p.payment_date ? new Date(p.payment_date).toLocaleDateString("fr-MA") : "—"}
                    </TableCell>
                    <TableCell>
                      {p.invoiceNumber || "N/A"}
                      {p.invoiceEntityId && p.invoiceEntityId !== entity.id && (
                        <Badge variant="outline" className="ml-2 text-xs border-blue-400 text-blue-600">
                          On behalf of {p.invoiceEntityName}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="capitalize">{p.method}</TableCell>
                    <TableCell className="text-right font-medium">{p.amount.toLocaleString()} MAD</TableCell>
                    <TableCell>
                      {p.cheque_number && <span className="text-xs text-muted-foreground">Cheque #{p.cheque_number}</span>}
                    </TableCell>
                  </TableRow>
                ))}
                {payments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No payments.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: Debt Transfers */}
      {tab === "debts" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Counterparty</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debtTransfers.map((dt) => {
                  const isGiver = dt.to_entity_id === entity.id
                  return (
                    <TableRow key={dt.id}>
                      <TableCell>{new Date(dt.created_at).toLocaleDateString("fr-MA")}</TableCell>
                      <TableCell>
                        {isGiver ? (
                          <Badge className="bg-blue-600 text-white">Gave</Badge>
                        ) : (
                          <Badge className="bg-purple-600 text-white">Received</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isGiver ? dt.fromEntity.name : dt.toEntity.name}
                      </TableCell>
                      <TableCell className="text-right font-medium">{dt.amount.toLocaleString()} MAD</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{dt.note || "—"}</TableCell>
                    </TableRow>
                  )
                })}
                {debtTransfers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No debt transfers.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Cross-Company Payment Modal */}
      {crossPayOpen && (
        <CrossCompanyModal
          entityName={entity.name}
          unpaidInvoices={unpaidInvoices}
          allEntities={allEntities.filter((e) => e.id !== entity.id)}
          onClose={() => setCrossPayOpen(false)}
        />
      )}
    </div>
  )
}

// ——— Cross-Company Payment Modal ———
function CrossCompanyModal({
  entityName, unpaidInvoices, allEntities, onClose,
}: {
  entityName: string
  unpaidInvoices: Invoice[]
  allEntities: AllEntity[]
  onClose: () => void
}) {
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState(unpaidInvoices[0]?.id || 0)
  const [paidByEntityId, setPaidByEntityId] = React.useState(allEntities[0]?.id || 0)
  const [amount, setAmount] = React.useState(0)
  const [method, setMethod] = React.useState("transfer")
  const [paymentDate, setPaymentDate] = React.useState(new Date().toISOString().split("T")[0])
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

  const selectedInvoice = unpaidInvoices.find((i) => i.id === selectedInvoiceId)
  const paidByEntity = allEntities.find((e) => e.id === paidByEntityId)
  const filteredEntities = allEntities.filter((e) =>
    e.name.toLowerCase().includes(entitySearch.toLowerCase())
  )

  React.useEffect(() => {
    if (selectedInvoice) setAmount(selectedInvoice.balance_due)
  }, [selectedInvoice])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const result = await recordPayment({
        invoiceId: selectedInvoiceId,
        amount,
        method,
        paidByEntityId,
        paymentDate,
        notes: `Cross-company payment from ${paidByEntity?.name}`,
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <h3 className="text-lg font-semibold mb-1">Cross-Company Payment</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Record a payment from another company toward {entityName}&apos;s invoice
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Invoice selector */}
          <div>
            <Label>Invoice to Credit</Label>
            <select
              value={selectedInvoiceId}
              onChange={(e) => setSelectedInvoiceId(parseInt(e.target.value))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {unpaidInvoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number || `#${inv.id}`} — {inv.balance_due.toLocaleString()} MAD due
                </option>
              ))}
            </select>
          </div>

          {/* Paid By selector */}
          <div>
            <Label>Paid By (different company)</Label>
            <div className="relative" ref={entityRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-9"
                  value={entityDropdownOpen ? entitySearch : (paidByEntity?.name || "")}
                  onChange={(e) => { setEntitySearch(e.target.value); setEntityDropdownOpen(true) }}
                  onFocus={() => { setEntityDropdownOpen(true); setEntitySearch("") }}
                />
              </div>
              {entityDropdownOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg max-h-36 overflow-y-auto">
                  {filteredEntities.map((ent) => (
                    <button key={ent.id} type="button"
                      className={`flex w-full px-3 py-2 text-sm hover:bg-accent text-left ${ent.id === paidByEntityId ? "bg-accent font-medium" : ""}`}
                      onClick={() => { setPaidByEntityId(ent.id); setEntityDropdownOpen(false); setEntitySearch("") }}>
                      {ent.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Amount */}
          <div>
            <Label>Amount (MAD)</Label>
            <Input type="number" min={0.01} max={selectedInvoice?.balance_due || 0} step={0.01}
              value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} required />
          </div>

          {/* Method */}
          <div>
            <Label>Method</Label>
            <select value={method} onChange={(e) => setMethod(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>

          <div>
            <Label>Payment Date</Label>
            <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required />
          </div>

          {/* Summary */}
          {paidByEntity && selectedInvoice && (
            <Card className="border-blue-300 bg-blue-50">
              <CardContent className="p-3 text-sm text-blue-800">
                <CreditCard className="h-4 w-4 inline mr-1" />
                <strong>{paidByEntity.name}</strong> will pay{" "}
                <strong>{amount.toLocaleString()} MAD</strong> toward{" "}
                <strong>{entityName}</strong>&apos;s invoice{" "}
                <strong>{selectedInvoice.invoice_number || `#${selectedInvoice.id}`}</strong>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting || amount <= 0 || !paidByEntityId}>
              {submitting ? "Processing..." : "Confirm Payment"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
