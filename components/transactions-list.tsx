"use client"

import * as React from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { DollarSign, Clock, Plus } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface SalesLogEntry {
  id: number
  log_date: string
  qty: number
  unit_price: number
  total: number
  invoiced: boolean
  note: string | null
  product: { name: string; reference: string | null }
}

export function TransactionsListClient({ entries }: { entries: SalesLogEntry[] }) {
  const [filter, setFilter] = React.useState<"all" | "pending" | "invoiced">("all")
  const [selected, setSelected] = React.useState<Set<number>>(new Set())

  const filtered = entries.filter((e) => {
    if (filter === "pending") return !e.invoiced
    if (filter === "invoiced") return e.invoiced
    return true
  })

  // Group by date
  const grouped = filtered.reduce<Record<string, SalesLogEntry[]>>((acc, entry) => {
    const date = new Date(entry.log_date).toLocaleDateString("fr-MA")
    if (!acc[date]) acc[date] = []
    acc[date].push(entry)
    return acc
  }, {})

  const pendingEntries = entries.filter((e) => !e.invoiced)
  const pendingTotal = pendingEntries.reduce((sum, e) => sum + e.total, 0)
  const pendingCount = pendingEntries.length

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((e) => e.id)))
    }
  }

  const selectedTotal = Array.from(selected).reduce((sum, id) => {
    const entry = entries.find((e) => e.id === id)
    return sum + (entry?.total || 0)
  }, 0)

  const tabs = [
    { key: "all" as const, label: "Toutes", count: entries.length },
    { key: "pending" as const, label: "En attente", count: pendingCount },
    { key: "invoiced" as const, label: "Facturées", count: entries.length - pendingCount },
  ]

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
        <Link href="/transactions/new">
          <Button><Plus className="h-4 w-4 mr-2" /> Nouvelle transaction</Button>
        </Link>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-2 gap-4 max-w-lg">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-amber-100 p-2">
              <DollarSign className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valeur en attente</p>
              <p className="text-xl font-bold">{formatCurrency(pendingTotal)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-blue-100 p-2">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nombre en attente</p>
              <p className="text-xl font-bold">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setFilter(tab.key); setSelected(new Set()) }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === tab.key
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead className="text-center">Qté</TableHead>
                <TableHead className="text-right">Prix unitaire</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(grouped).map(([date, items]) => (
                <React.Fragment key={date}>
                  {/* Date Group Header */}
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={7} className="font-semibold text-sm py-2">
                      📅 {date} — {items.length} transaction{items.length > 1 ? "s" : ""}
                    </TableCell>
                  </TableRow>
                  {items.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selected.has(entry.id)}
                          onChange={() => toggleSelect(entry.id)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(entry.log_date).toLocaleTimeString("fr-MA", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
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
                      <TableCell className="text-right">
                        {formatCurrency(entry.unit_price)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(entry.total)}
                      </TableCell>
                      <TableCell>
                        {entry.invoiced ? (
                          <Badge className="bg-green-600 text-white">Facturé</Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-400 text-amber-600">
                            En attente
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Aucune transaction trouvée.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background px-6 py-4 rounded-full shadow-lg flex items-center gap-6 z-50">
          <div className="text-sm font-medium">
            {selected.size} transaction(s) sélectionnée(s) — Total : {formatCurrency(selectedTotal)}
          </div>
          <Link href={`/month-end?selected=${Array.from(selected).join(",")}`}>
            <Button variant="secondary" size="sm">
              Envoyer à la clôture
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
