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
  relatedInvoiceNumber: string | null; relatedInvoiceEntityName: string | null
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
                  <TableHead>Type</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debtTransfers.map((dt) => {
                  const isGiver = dt.to_entity_id === entity.id
                  return (
                    <TableRow key={dt.id}>
                      <TableCell className="w-32">{new Date(dt.created_at).toLocaleDateString("fr-MA")}</TableCell>
                      <TableCell className="w-32">
                        {isGiver ? (
                          <Badge className="bg-red-600 text-white">Deducted</Badge>
                        ) : (
                          <Badge className="bg-green-600 text-white">Received</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isGiver ? (
                          <span>
                            <span className="font-semibold">{dt.amount.toLocaleString()} MAD</span> deducted — used to pay{" "}
                            {dt.relatedInvoiceEntityName ? (
                              <span className="font-medium">{dt.relatedInvoiceEntityName}</span>
                            ) : (
                              <span className="font-medium">{dt.toEntity.name}</span>
                            )}{" "}
                            invoice {dt.relatedInvoiceNumber || "—"}
                          </span>
                        ) : (
                          <span>
                            <span className="font-semibold">{dt.amount.toLocaleString()} MAD</span> received from{" "}
                            <span className="font-medium">{dt.fromEntity.name}</span>
                            {dt.note && <span className="text-muted-foreground text-sm ml-2">({dt.note})</span>}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {debtTransfers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">No debt transfers.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
