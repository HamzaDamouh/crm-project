"use client"

import * as React from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
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
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"
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

export function InvoiceListClient({
  invoices,
  totalCount,
  pageSize,
  currentPage,
}: {
  invoices: Invoice[]
  totalCount: number
  pageSize: number
  currentPage: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const typeFilter = searchParams.get("type") || "all"
  const statusFilter = searchParams.get("status") || "all"
  const queryFilter = searchParams.get("query") || ""

  const createQueryString = React.useCallback(
    (params: Record<string, string | number | null>) => {
      const newSearchParams = new URLSearchParams(searchParams.toString())

      for (const [key, value] of Object.entries(params)) {
        if (value === null || value === "all" || value === "") {
          newSearchParams.delete(key)
        } else {
          newSearchParams.set(key, String(value))
        }
      }

      return newSearchParams.toString()
    },
    [searchParams]
  )

  const updateFilters = (newParams: Record<string, string | number | null>) => {
    // Reset to page 1 when filters change, unless we're just changing the page itself
    const params = { ...newParams }
    if (!params.page && currentPage !== 1) {
      params.page = 1
    }
    const queryString = createQueryString(params)
    router.push(`${pathname}${queryString ? `?${queryString}` : ""}`)
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Factures</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par numéro ou client..."
            className="pl-9"
            defaultValue={queryFilter}
            onChange={(e) => {
              const val = e.target.value
              // Debounce search update
              const timeout = setTimeout(() => {
                updateFilters({ query: val, page: 1 })
              }, 500)
              return () => clearTimeout(timeout)
            }}
          />
        </div>
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => updateFilters({ type: e.target.value })}
            className="h-9 rounded-md border px-3 text-sm bg-background"
          >
            <option value="all">Tous types</option>
            <option value="invoice">Factures</option>
            <option value="credit_note">Avoirs</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => updateFilters({ status: e.target.value })}
            className="h-9 rounded-md border px-3 text-sm bg-background"
          >
            <option value="all">Tous statuts</option>
            <option value="paid">Payées</option>
            <option value="unpaid">Impayées</option>
            <option value="partial">Partielles</option>
            <option value="draft">Brouillons</option>
          </select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
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
              {invoices.map((inv) => (
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
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                    Aucune facture trouvée pour ces critères.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          Affichage de {invoices.length} sur {totalCount} factures
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateFilters({ page: currentPage - 1 })}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Précédent
          </Button>
          <div className="text-sm font-medium">
            Page {currentPage} sur {totalPages || 1}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateFilters({ page: currentPage + 1 })}
            disabled={currentPage >= totalPages}
          >
            Suivant
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}

