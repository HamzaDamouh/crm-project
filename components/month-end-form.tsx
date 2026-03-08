"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { CalendarCheck, Search, FileText, AlertTriangle } from "lucide-react"
import { generateConsolidatedInvoice } from "@/app/actions/month-end"

interface PendingEntry {
  id: number
  log_date: string
  qty: number
  unit_price: number
  total: number
  product: { id: number; name: string; reference: string | null }
}

interface Entity {
  id: number
  name: string
}

interface EditedPrice {
  [logId: number]: number
}

export function MonthEndClient({
  entries,
  entities,
  currentMonth,
}: {
  entries: PendingEntry[]
  entities: Entity[]
  currentMonth: string
}) {
  const router = useRouter()
  const [editedPrices, setEditedPrices] = React.useState<EditedPrice>({})
  const [selectedEntityId, setSelectedEntityId] = React.useState<number>(
    entities[0]?.id || 0
  )
  const [selectedEntryIds, setSelectedEntryIds] = React.useState<Set<number>>(
    new Set(entries.map((e) => e.id))
  )
  const [entitySearch, setEntitySearch] = React.useState("")
  const [entityDropdownOpen, setEntityDropdownOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const entityRef = React.useRef<HTMLDivElement>(null)

  function toggleEntry(id: number) {
    const next = new Set(selectedEntryIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedEntryIds(next)
  }

  function toggleAll() {
    if (selectedEntryIds.size === entries.length) {
      setSelectedEntryIds(new Set())
    } else {
      setSelectedEntryIds(new Set(entries.map((e) => e.id)))
    }
  }

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (entityRef.current && !entityRef.current.contains(e.target as Node)) {
        setEntityDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const selectedEntity = entities.find((e) => e.id === selectedEntityId)
  const filteredEntities = entities.filter((e) =>
    e.name.toLowerCase().includes(entitySearch.toLowerCase())
  )

  function getPrice(entry: PendingEntry) {
    return editedPrices[entry.id] ?? entry.unit_price
  }

  function getLineTotal(entry: PendingEntry) {
    return entry.qty * getPrice(entry)
  }

  const selectedEntriesList = entries.filter((e) => selectedEntryIds.has(e.id))
  const runningTotal = selectedEntriesList.reduce((sum, e) => sum + getLineTotal(e), 0)
  const taxAmount = Math.round(runningTotal * 0.2 * 100) / 100
  const grandTotal = Math.round((runningTotal + taxAmount) * 100) / 100

  async function handleGenerate() {
    if (selectedEntriesList.length === 0 || !selectedEntityId) return
    setSubmitting(true)
    try {
      const lines = selectedEntriesList.map((e) => ({
        logId: e.id,
        productId: e.product.id,
        qty: e.qty,
        catalogPrice: e.unit_price,
        editedPrice: getPrice(e),
      }))
      const result = await generateConsolidatedInvoice(selectedEntityId, lines)
      if (result.success && result.invoiceId) {
        toast.success(`Invoice ${result.invoiceNumber} generated!`)
        router.push(`/invoices/${result.invoiceId}`)
      } else {
        toast.error("Failed to generate invoice.")
      }
    } catch {
      toast.error("An unexpected error occurred.")
    } finally {
      setSubmitting(false)
    }
  }

  const pricesEdited = Object.keys(editedPrices).length

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <CalendarCheck className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Month-End Closing — {currentMonth}
          </h1>
          <p className="text-muted-foreground">
            Process pending transactions into a consolidated invoice
          </p>
        </div>
      </div>

      {/* Alert */}
      <Card className="border-amber-300 bg-amber-50">
        <CardContent className="flex items-center gap-3 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-semibold text-amber-800">
              {entries.length} unprocessed transaction{entries.length !== 1 ? "s" : ""}
            </p>
            <p className="text-sm text-amber-700">
              {selectedEntryIds.size} transaction{selectedEntryIds.size !== 1 ? "s" : ""} selected — Total: {runningTotal.toLocaleString()} MAD (before tax)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Transaction Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Step 1 — Review &amp; Adjust Prices
            {pricesEdited > 0 && (
              <Badge variant="outline" className="ml-2 border-blue-400 text-blue-600">
                {pricesEdited} price{pricesEdited > 1 ? "s" : ""} modified
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No pending transactions to process.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={
                        entries.length > 0 && selectedEntryIds.size === entries.length
                      }
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="w-40">Unit Price (MAD)</TableHead>
                  <TableHead className="text-right">Line Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const isEdited =
                    editedPrices[entry.id] !== undefined &&
                    editedPrices[entry.id] !== entry.unit_price
                  const isChecked = selectedEntryIds.has(entry.id)
                  return (
                    <TableRow key={entry.id} className={!isChecked ? "opacity-60" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleEntry(entry.id)}
                          aria-label={`Select transaction ${entry.id}`}
                        />
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(entry.log_date).toLocaleDateString("fr-MA")}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{entry.product.name}</div>
                        {entry.product.reference && (
                          <div className="text-xs text-muted-foreground">
                            {entry.product.reference}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{entry.qty}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={getPrice(entry)}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0
                              setEditedPrices((prev) => ({ ...prev, [entry.id]: val }))
                            }}
                            className={`w-24 ${isEdited ? "border-blue-400 bg-blue-50" : ""}`}
                          />
                          {isEdited && (
                            <span className="text-xs text-muted-foreground line-through">
                              {entry.unit_price}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {getLineTotal(entry).toLocaleString()} MAD
                      </TableCell>
                    </TableRow>
                  )
                })}
                {/* Running total row */}
                <TableRow className="bg-muted/30 font-bold">
                  <TableCell colSpan={5} className="text-right">
                    Subtotal (Selected)
                  </TableCell>
                  <TableCell className="text-right">
                    {runningTotal.toLocaleString()} MAD
                  </TableCell>
                </TableRow>
                <TableRow className="font-medium">
                  <TableCell colSpan={5} className="text-right text-sm text-muted-foreground">
                    TVA (20%)
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {taxAmount.toLocaleString()} MAD
                  </TableCell>
                </TableRow>
                <TableRow className="bg-muted/50 font-bold text-lg">
                  <TableCell colSpan={5} className="text-right">
                    Total
                  </TableCell>
                  <TableCell className="text-right">
                    {grandTotal.toLocaleString()} MAD
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Client Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Step 2 — Select Client to Bill</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-md" ref={entityRef}>
            <Label className="mb-2 block text-sm">Bill To</Label>
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
              <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg max-h-48 overflow-y-auto">
                {filteredEntities.map((entity) => (
                  <button
                    key={entity.id}
                    type="button"
                    className={`flex w-full px-3 py-2 text-sm hover:bg-accent text-left ${
                      entity.id === selectedEntityId ? "bg-accent font-medium" : ""
                    }`}
                    onClick={() => {
                      setSelectedEntityId(entity.id)
                      setEntityDropdownOpen(false)
                      setEntitySearch("")
                    }}
                  >
                    {entity.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Generate */}
      <div className="flex justify-end pb-8">
        <Button
          size="lg"
          disabled={selectedEntriesList.length === 0 || !selectedEntityId || submitting}
          onClick={handleGenerate}
        >
          <FileText className="h-4 w-4 mr-2" />
          {submitting ? "Generating..." : "Generate Consolidated Invoice"}
        </Button>
      </div>
    </div>
  )
}
