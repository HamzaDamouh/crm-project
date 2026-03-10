"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, ShoppingCart, FileText, Search, Package } from "lucide-react"
import { createPurchaseOrder } from "@/app/actions/purchase-orders"
import { formatCurrency } from "@/lib/utils"

interface Product {
  id: number
  name: string
  reference: string | null
  stock_qty: number
}

interface Entity {
  id: number
  name: string
  type: string
}

interface LineItem {
  id: string
  productId: number | null
  productSearch: string
  qty: number
  unitCost: number
}

interface PurchaseOrderFormProps {
  suppliers: Entity[]
  products: Product[]
}

export function PurchaseOrderForm({ suppliers, products }: PurchaseOrderFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preFilledProductId = searchParams.get("productId")

  const [selectedSupplierId, setSelectedSupplierId] = React.useState<number>(0)
  const [supplierSearch, setSupplierSearch] = React.useState("")
  const [supplierDropdownOpen, setSupplierDropdownOpen] = React.useState(false)
  const [lines, setLines] = React.useState<LineItem[]>([])
  const [submitting, setSubmitting] = React.useState(false)
  const [productDropdownOpen, setProductDropdownOpen] = React.useState<string | null>(null)
  const [notes, setNotes] = React.useState("")

  const supplierRef = React.useRef<HTMLDivElement>(null)
  const productRefs = React.useRef<Map<string, HTMLDivElement>>(new Map())

  // Pre-fill logic
  React.useEffect(() => {
    if (preFilledProductId && products.length > 0) {
      const product = products.find((p) => p.id === parseInt(preFilledProductId))
      if (product) {
        setLines([
          {
            id: crypto.randomUUID(),
            productId: product.id,
            productSearch: `${product.name} (${product.reference || "N/A"})`,
            qty: 10, // Default qty for PO
            unitCost: 0,
          },
        ])
      }
    } else if (lines.length === 0) {
      setLines([emptyLine()])
    }
  }, [preFilledProductId, products])

  // Click outside to close dropdowns
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (supplierRef.current && !supplierRef.current.contains(e.target as Node)) {
        setSupplierDropdownOpen(false)
      }
      productRefs.current.forEach((ref, lineId) => {
        if (ref && !ref.contains(e.target as Node)) {
          if (productDropdownOpen === lineId) {
            setProductDropdownOpen(null)
          }
        }
      })
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [productDropdownOpen])

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId)
  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(supplierSearch.toLowerCase())
  )

  function emptyLine(): LineItem {
    return {
      id: crypto.randomUUID(),
      productId: null,
      productSearch: "",
      qty: 1,
      unitCost: 0,
    }
  }

  function updateLine(lineId: string, updates: Partial<LineItem>) {
    setLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, ...updates } : l))
    )
  }

  function selectProduct(lineId: string, product: Product) {
    updateLine(lineId, {
      productId: product.id,
      productSearch: `${product.name} (${product.reference || "N/A"})`,
    })
    setProductDropdownOpen(null)
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()])
  }

  function removeLine(lineId: string) {
    setLines((prev) => {
      const filtered = prev.filter((l) => l.id !== lineId)
      return filtered.length === 0 ? [emptyLine()] : filtered
    })
  }

  const subtotal = lines.reduce((sum, l) => sum + (l.qty * l.unitCost), 0)
  const canSubmit = selectedSupplierId > 0 && lines.some((l) => l.productId && l.qty > 0)

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const result = await createPurchaseOrder({
        supplierId: selectedSupplierId,
        notes,
        lines: lines
          .filter((l) => l.productId && l.qty > 0)
          .map((l) => ({
            productId: l.productId!,
            qty: l.qty,
            unitCost: l.unitCost,
          })),
      })
      if (result.success && 'message' in result) {
        toast.success(result.message)
        router.push("/achats")
      } else if ('error' in result) {
        toast.error(result.error || "Failed to create PO")
      } else {
        toast.error("Failed to create PO")
      }
    } catch {
      toast.error("An unexpected error occurred.")
    } finally {
      setSubmitting(false)
    }
  }

  function getFilteredProducts(search: string) {
    const q = search.toLowerCase()
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.reference && p.reference.toLowerCase().includes(q))
    ).slice(0, 10)
  }

  return (
    <div className="flex-1 space-y-6 p-6">
       <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Nouvel achat</h1>
      </div>

      {/* Supplier Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fournisseur</CardTitle>
        </CardHeader>
        <CardContent>
           <div className="relative max-w-md" ref={supplierRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un fournisseur..."
                className="pl-9"
                value={supplierDropdownOpen ? supplierSearch : (selectedSupplier?.name || "")}
                onChange={(e) => {
                  setSupplierSearch(e.target.value)
                  setSupplierDropdownOpen(true)
                }}
                onFocus={() => {
                   setSupplierDropdownOpen(true)
                   setSupplierSearch("")
                }}
              />
            </div>
            {supplierDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-48 overflow-y-auto">
                {filteredSuppliers.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent text-left"
                    onClick={() => {
                      setSelectedSupplierId(s.id)
                      setSupplierDropdownOpen(false)
                    }}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Product Lines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Produits</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead className="w-[100px]">Quantité</TableHead>
                <TableHead className="w-[150px]">Prix d'achat (MAD)</TableHead>
                <TableHead className="text-right">Total ligne</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
             <TableBody>
              {lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    <div
                      className="relative"
                      ref={(el) => {
                        if (el) productRefs.current.set(line.id, el)
                        else productRefs.current.delete(line.id)
                      }}
                    >
                      <Input
                        placeholder="Chercher produit..."
                        value={productDropdownOpen === line.id ? line.productSearch : (line.productId ? line.productSearch : "")}
                        onChange={(e) => {
                           updateLine(line.id, { productSearch: e.target.value })
                           setProductDropdownOpen(line.id)
                        }}
                        onFocus={() => {
                           setProductDropdownOpen(line.id)
                           if (line.productId) updateLine(line.id, { productSearch: "" })
                        }}
                      />
                      {productDropdownOpen === line.id && (
                        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-48 overflow-y-auto">
                          {getFilteredProducts(line.productSearch).map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              className="flex w-full flex-col px-3 py-2 text-sm hover:bg-accent text-left"
                              onClick={() => selectProduct(line.id, p)}
                            >
                              <span className="font-medium">{p.name}</span>
                              <span className="text-xs text-muted-foreground">Réf: {p.reference || "N/A"} • Stock: {p.stock_qty}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      value={line.qty}
                      onChange={(e) => updateLine(line.id, { qty: parseFloat(e.target.value) || 0 })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={line.unitCost}
                      onChange={(e) => updateLine(line.id, { unitCost: parseFloat(e.target.value) || 0 })}
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                     {formatCurrency(line.qty * line.unitCost)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => removeLine(line.id)} className="text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button variant="outline" className="mt-4" onClick={addLine}>
            <Plus className="h-4 w-4 mr-2" /> Ajouter une ligne
          </Button>
        </CardContent>
      </Card>

      {/* Summary and Notes */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full h-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Instructions pour le fournisseur..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Résumé</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center text-xl font-bold">
              <span>Total estimé</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Le coût total sera confirmé à la réception.</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-3 pb-8">
        <Button variant="outline" onClick={() => router.back()}>Annuler</Button>
        <Button disabled={!canSubmit || submitting} onClick={handleSubmit}>
          {submitting ? "Création..." : "Créer le bon de commande"}
        </Button>
      </div>
    </div>
  )
}
