"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { AlertTriangle, ChevronDown, ChevronRight, Search, X, ArrowDownCircle, ArrowUpCircle } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface PurchaseHistoryLine {
  id: number; date: string; supplierName: string
  qty: number; unitCost: number
}

interface Product {
  id: number; name: string; reference: string | null
  stock_qty: number; stock_min: number; unit: string | null
  is_active: boolean; category: string
  purchaseHistory: PurchaseHistoryLine[]
  averageUnitCost: number | null
}

interface Movement {
  id: number; product_id: number; movement_type: string
  qty: number; reference_type: string | null; reference_id: number | null
  note: string | null; created_at: string
}

function stockStatus(qty: number, min: number) {
  if (qty < min) return { label: "Critique", className: "bg-red-600 text-white" }
  if (qty === min) return { label: "Bas", className: "bg-yellow-500 text-white" }
  return { label: "En stock", className: "bg-green-600 text-white" }
}

function stockCellColor(qty: number, min: number) {
  if (qty < min) return "text-red-600 font-bold"
  if (qty === min) return "text-yellow-600 font-semibold"
  return "text-green-600"
}

export function StockClient({
  products,
  movements,
}: {
  products: Product[]
  movements: Movement[]
}) {
  const [search, setSearch] = React.useState("")
  const [alertsOpen, setAlertsOpen] = React.useState(true)
  const [selectedProductId, setSelectedProductId] = React.useState<number | null>(null)
  const [panelTab, setPanelTab] = React.useState<"movements" | "purchases">("movements")

  const alerts = products.filter((p) => p.stock_qty <= p.stock_min && p.is_active)

  const filtered = products.filter((p) => {
    const q = search.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      (p.reference && p.reference.toLowerCase().includes(q))
    )
  })

  const selectedProduct = selectedProductId
    ? products.find((p) => p.id === selectedProductId)
    : null
  const selectedMovements = selectedProductId
    ? movements.filter((m) => m.product_id === selectedProductId)
    : []

  return (
    <div className="flex-1 p-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Stock et Inventaire</h1>

      {/* SECTION 1: Alerts */}
      {alerts.length > 0 && (
        <Card className="border-red-300">
          <CardHeader className="cursor-pointer py-3" onClick={() => setAlertsOpen(!alertsOpen)}>
            <CardTitle className="text-lg flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Alertes de stock ({alerts.length})
              {alertsOpen ? <ChevronDown className="h-4 w-4 ml-auto" /> : <ChevronRight className="h-4 w-4 ml-auto" />}
            </CardTitle>
          </CardHeader>
          {alertsOpen && (
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {alerts.map((p) => (
                  <div
                    key={p.id}
                    className="border border-red-200 bg-red-50 rounded-lg p-3 cursor-pointer hover:bg-red-100 transition"
                    onClick={() => setSelectedProductId(p.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm">{p.name}</p>
                        {p.reference && <p className="text-xs text-muted-foreground">{p.reference}</p>}
                      </div>
                      <Badge className="bg-red-600 text-white text-xs">COMMANDER</Badge>
                    </div>
                    <div className="mt-2 text-sm">
                      <span className="text-red-600 font-bold">{p.stock_qty}</span>
                      <span className="text-muted-foreground"> / min {p.stock_min} {p.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* SECTION 2: Full Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Inventaire complet</span>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou SKU..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="text-center">Qté en stock</TableHead>
                <TableHead>Unité</TableHead>
                <TableHead className="text-center">Stock min</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const status = stockStatus(p.stock_qty, p.stock_min)
                return (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedProductId(p.id)}
                  >
                    <TableCell className="font-mono text-sm">{p.reference || "—"}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.category}</TableCell>
                    <TableCell className={`text-center ${stockCellColor(p.stock_qty, p.stock_min)}`}>
                      {p.stock_qty}
                    </TableCell>
                    <TableCell className="text-sm">{p.unit}</TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">{p.stock_min}</TableCell>
                    <TableCell>
                      <Badge className={status.className}>{status.label}</Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Aucun produit trouvé.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Slide-out Panel for Stock Movements */}
      {selectedProduct && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h3 className="font-semibold">{selectedProduct.name}</h3>
              <p className="text-sm text-muted-foreground">{selectedProduct.reference}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedProductId(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-4 border-b bg-muted/30">
            <div className="flex justify-between text-sm">
              <span>Stock actuel</span>
              <span className={`font-bold ${stockCellColor(selectedProduct.stock_qty, selectedProduct.stock_min)}`}>
                {selectedProduct.stock_qty} {selectedProduct.unit}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span>Minimum</span>
              <span>{selectedProduct.stock_min} {selectedProduct.unit}</span>
            </div>
            {selectedProduct.averageUnitCost !== null && (
              <div className="flex justify-between text-sm mt-2 pt-2 border-t">
                <span>Coût Moyen (PUMP)</span>
                <span className="font-semibold text-blue-700">
                  {formatCurrency(selectedProduct.averageUnitCost)}
                </span>
              </div>
            )}
          </div>

          <div className="flex border-b text-sm">
            <button
              onClick={() => setPanelTab("movements")}
              className={`flex-1 py-2 text-center font-medium ${panelTab === "movements" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              Mouvements
            </button>
            <button
              onClick={() => setPanelTab("purchases")}
              className={`flex-1 py-2 text-center font-medium ${panelTab === "purchases" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              Achats
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {panelTab === "movements" ? (
              <div className="space-y-4">
                {selectedMovements.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun mouvement enregistré.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedMovements.map((m) => (
                      <div key={m.id} className="flex items-start gap-3 text-sm border-b pb-2">
                        {m.movement_type === "in" ? (
                          <ArrowDownCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        ) : (
                          <ArrowUpCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className={m.movement_type === "in" ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                              {m.movement_type === "in" ? "+" : "-"}{m.qty}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(m.created_at).toLocaleDateString("fr-MA")}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {m.note || (m.reference_type ? `${m.reference_type} n°${m.reference_id}` : "Aucun détail")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {selectedProduct.purchaseHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun historique d'achat.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedProduct.purchaseHistory.map(ph => (
                      <div key={ph.id} className="flex flex-col text-sm border-b pb-2">
                         <div className="flex justify-between font-medium">
                           <span>{ph.supplierName}</span>
                           <span>{formatCurrency(ph.unitCost * ph.qty)}</span>
                         </div>
                         <div className="flex justify-between text-muted-foreground text-xs mt-1">
                           <span>{ph.qty} {selectedProduct.unit} à {formatCurrency(ph.unitCost)}/u</span>
                           <span>{new Date(ph.date).toLocaleDateString("fr-MA")}</span>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
