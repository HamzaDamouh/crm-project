"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"

interface Invoice {
  id: number
  type: string
  status: string
  invoice_number: string | null
  issue_date: string | null
  total: number
  amount_paid: number
  balance_due: number
  entity: { name: string }
}

function statusBadge(status: string, balanceDue: number, total: number) {
  if (status === "paid" || balanceDue === 0)
    return <Badge className="bg-green-600 text-white">Payé</Badge>
  if (balanceDue > 0 && balanceDue < total)
    return <Badge className="bg-yellow-500 text-white">Partiel</Badge>
  if (status === "draft")
    return <Badge className="bg-gray-500 text-white">Brouillon</Badge>
  return <Badge className="bg-red-600 text-white">Impayé</Badge>
}

export function InvoiceListClient({ invoices }: { invoices: Invoice[] }) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [typeFilter, setTypeFilter] = React.useState("all")

  const filtered = invoices.filter((inv) => {
    if (typeFilter !== "all" && inv.type !== typeFilter) return false
    if (statusFilter === "paid" && inv.balance_due !== 0) return false
    if (statusFilter === "unpaid" && (inv.balance_due === 0 || inv.amount_paid > 0)) return false
    if (statusFilter === "partial" && !(inv.balance_due > 0 && inv.amount_paid > 0)) return false
    return true
  })

  return (
    <div className="flex-1 p-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Factures</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Toutes les factures</span>
            <div className="flex gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-9 rounded-md border px-3 text-sm bg-background"
              >
                <option value="all">Tous types</option>
                <option value="invoice">Factures</option>
                <option value="credit_note">Avoirs</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border px-3 text-sm bg-background"
              >
                <option value="all">Tous statuts</option>
                <option value="paid">Payées</option>
                <option value="unpaid">Impayées</option>
                <option value="partial">Partielles</option>
              </select>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Payé</TableHead>
                <TableHead className="text-right">Solde</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inv) => (
                <TableRow
                  key={inv.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/invoices/${inv.id}`)}
                >
                  <TableCell className="font-mono font-medium">
                    {inv.invoice_number || `#${inv.id}`}
                  </TableCell>
                  <TableCell>{inv.entity.name}</TableCell>
                  <TableCell className="capitalize">{inv.type}</TableCell>
                  <TableCell>
                    {inv.issue_date
                      ? new Date(inv.issue_date).toLocaleDateString("fr-MA")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(inv.total)}
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    {formatCurrency(inv.amount_paid)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {inv.balance_due > 0 ? (
                      <span className="text-red-600">
                        {formatCurrency(inv.balance_due)}
                      </span>
                    ) : (
                      "0 MAD"
                    )}
                  </TableCell>
                  <TableCell>
                    {statusBadge(inv.status, inv.balance_due, inv.total)}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Aucune facture trouvée.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
