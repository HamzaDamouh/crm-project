"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, ShoppingCart, FileText, Search } from "lucide-react"
import { saveAsTransaction, generateInvoice } from "@/app/actions/transactions"
import { formatCurrency } from "@/lib/utils"

// ——— Types ———

interface PriceTier {
  id: number
  min_qty: number
  max_qty: number | null
  unit_price: number
  note: string | null
}

interface Product {
  id: number
  name: string
  reference: string | null
  stock_qty: number
  tax_rate: number
  priceTiers: PriceTier[]
}

interface Entity {
  id: number
  name: string
  balance_due: number
  type: string
}

interface LineItem {
  id: string // client-side key
  productId: number | null
  productSearch: string
  qty: number
  unitPrice: number
  lineTotal: number
  taxRate: number
  selectedTier: PriceTier | null
}

interface TransactionFormProps {
  entities: Entity[]
  products: Product[]
}

// ——— Helper: find the best price tier for a qty ———
function findBestTier(tiers: PriceTier[], qty: number): PriceTier | null {
  // Sort by min_qty descending so we match the highest tier first
  const sorted = [...tiers].sort((a, b) => b.min_qty - a.min_qty)
  for (const tier of sorted) {
    if (qty >= tier.min_qty) {
      if (tier.max_qty === null || qty <= tier.max_qty) {
        return tier
      }
    }
  }
  // Fallback to lowest tier
  if (tiers.length > 0) {
    const lowest = [...tiers].sort((a, b) => a.min_qty - b.min_qty)[0]
    return lowest
  }
  return null
}

function emptyLine(): LineItem {
  return {
    id: crypto.randomUUID(),
    productId: null,
    productSearch: "",
    qty: 1,
    unitPrice: 0,
    lineTotal: 0,
    taxRate: 20,
    selectedTier: null,
  }
}

// ——— Main Component ———
export function TransactionForm({ entities, products }: TransactionFormProps) {
  const router = useRouter()
  const [selectedEntityId, setSelectedEntityId] = React.useState<number>(
    () => entities.find((e) => e.name === "Client Divers")?.id || entities[0]?.id || 0
  )
  const [entitySearch, setEntitySearch] = React.useState("")
  const [entityDropdownOpen, setEntityDropdownOpen] = React.useState(false)
  const [lines, setLines] = React.useState<LineItem[]>([emptyLine()])
  const [submitting, setSubmitting] = React.useState(false)
  const [productDropdownOpen, setProductDropdownOpen] = React.useState<string | null>(null)

  const entityRef = React.useRef<HTMLDivElement>(null)
  const productRefs = React.useRef<Map<string, HTMLDivElement>>(new Map())

  // Close dropdowns on outside click
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (entityRef.current && !entityRef.current.contains(e.target as Node)) {
        setEntityDropdownOpen(false)
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

  const selectedEntity = entities.find((e) => e.id === selectedEntityId)

  // Filtered entities for the dropdown
  const filteredEntities = entities.filter(
    (e) =>
      e.name.toLowerCase().includes(entitySearch.toLowerCase())
  )

  // ——— Line item handlers ———
  function updateLine(lineId: string, updates: Partial<LineItem>) {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l
        const updated = { ...l, ...updates }
        updated.lineTotal = updated.qty * updated.unitPrice
        return updated
      })
    )
  }

  function selectProduct(lineId: string, product: Product) {
    const line = lines.find((l) => l.id === lineId)
    const qty = line?.qty || 1
    const tier = findBestTier(product.priceTiers, qty)
    const unitPrice = tier?.unit_price || 0

    updateLine(lineId, {
      productId: product.id,
      productSearch: `${product.name} (${product.reference || "N/A"})`,
      unitPrice,
      taxRate: product.tax_rate,
      selectedTier: tier,
      lineTotal: qty * unitPrice,
    })
    setProductDropdownOpen(null)
  }

  function onQtyChange(lineId: string, qty: number) {
    const line = lines.find((l) => l.id === lineId)
    if (!line || !line.productId) {
      updateLine(lineId, { qty })
      return
    }
    const product = products.find((p) => p.id === line.productId)
    if (!product) {
      updateLine(lineId, { qty })
      return
    }
    const tier = findBestTier(product.priceTiers, qty)
    const unitPrice = tier?.unit_price || line.unitPrice
    updateLine(lineId, { qty, unitPrice, selectedTier: tier })
  }

  function removeLine(lineId: string) {
    setLines((prev) => {
      const filtered = prev.filter((l) => l.id !== lineId)
      return filtered.length === 0 ? [emptyLine()] : filtered
    })
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()])
  }

  // ——— Calculations ———
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0)
  const taxAmount = lines.reduce((sum, l) => sum + (Math.round(l.lineTotal * (l.taxRate / 100) * 100) / 100), 0)
  const total = Math.round((subtotal + taxAmount) * 100) / 100

  const validLines = lines.filter((l) => l.productId && l.qty > 0 && l.unitPrice > 0)
  const canSubmit = validLines.length > 0 && selectedEntityId > 0

  // ——— Submit handlers ———
  async function handleSaveTransaction() {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const result = await saveAsTransaction({
        entityId: selectedEntityId,
        lines: validLines.map((l) => ({
          productId: l.productId!,
          qty: l.qty,
          unitPrice: l.unitPrice,
          lineTotal: l.lineTotal,
        })),
        subtotal,
        taxAmount,
        total,
      })
      if (result.success) {
        toast.success(result.message)
        setLines([emptyLine()])
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error("Erreur inattendue.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGenerateInvoice() {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const result = await generateInvoice({
        entityId: selectedEntityId,
        lines: validLines.map((l) => ({
          productId: l.productId!,
          qty: l.qty,
          unitPrice: l.unitPrice,
          lineTotal: l.lineTotal,
        })),
        subtotal,
        taxAmount,
        total,
      })
      if (result.success && result.invoiceId) {
        toast.success(result.message)
        router.push(`/invoices/${result.invoiceId}`)
      } else if (result.success) {
        toast.success(result.message)
        router.push(`/invoices`)
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error("Erreur inattendue.")
    } finally {
      setSubmitting(false)
    }
  }

  // ——— Filtered products for dropdown ———
  function getFilteredProducts(search: string) {
    if (!search) return products.slice(0, 10)
    const q = search.toLowerCase()
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.reference && p.reference.toLowerCase().includes(q))
    ).slice(0, 10)
  }

  // ——— Tier label ———
  function tierLabel(tier: PriceTier | null): React.ReactNode {
    if (!tier) return null
    const label = tier.max_qty
      ? `${tier.min_qty}–${tier.max_qty} units`
      : `${tier.min_qty}+ units`
    return (
      <Badge variant="outline" className="text-xs ml-2 border-blue-400 text-blue-600">
        {label}
      </Badge>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <h1 className="text-3xl font-bold tracking-tight">Nouvelle transaction</h1>

      {/* ——— CLIENT SELECTOR ——— */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Client</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-md" ref={entityRef}>
            <Label htmlFor="client-search" className="mb-2 block text-sm">
              Sélectionner le client
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="client-search"
                placeholder="Rechercher un client..."
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
              <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-48 overflow-y-auto">
                {filteredEntities.map((entity) => (
                  <button
                    key={entity.id}
                    type="button"
                    className={`flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent text-left ${
                      entity.id === selectedEntityId ? "bg-accent font-medium" : ""
                    }`}
                    onClick={() => {
                      setSelectedEntityId(entity.id)
                      setEntityDropdownOpen(false)
                      setEntitySearch("")
                    }}
                  >
                    <span>{entity.name}</span>
                    {entity.balance_due > 0 && (
                      <span className="text-red-600 text-xs font-semibold">
                        {formatCurrency(entity.balance_due)}
                      </span>
                    )}
                  </button>
                ))}
                {filteredEntities.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Aucun résultat</div>
                )}
              </div>
            )}
            {selectedEntity && selectedEntity.balance_due > 0 && !entityDropdownOpen && (
              <div className="mt-2 text-sm text-yellow-700 bg-yellow-50 px-3 py-2 rounded-md border border-yellow-200">
                ⚠ Solde impayé: {formatCurrency(selectedEntity.balance_due)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ——— PRODUCT LINE ITEMS ——— */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Produits</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
             <TableHeader>
              <TableRow>
                <TableHead className="w-[320px]">Produit</TableHead>
                <TableHead className="w-[100px]">Qté</TableHead>
                <TableHead className="w-[180px]">Prix unitaire (MAD)</TableHead>
                <TableHead className="w-[120px] text-right">Total ligne</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.id}>
                  {/* Product Selector */}
                  <TableCell>
                    <div
                      className="relative"
                      ref={(el) => {
                        if (el) productRefs.current.set(line.id, el)
                        else productRefs.current.delete(line.id)
                      }}
                    >
                      <Input
                        placeholder="Rechercher par nom ou SKU..."
                        value={productDropdownOpen === line.id ? line.productSearch : (line.productId ? line.productSearch : "")}
                        onChange={(e) => {
                          updateLine(line.id, { productSearch: e.target.value })
                          setProductDropdownOpen(line.id)
                        }}
                        onFocus={() => {
                          setProductDropdownOpen(line.id)
                          if (line.productId) {
                            updateLine(line.id, { productSearch: "" })
                          }
                        }}
                      />
                      {productDropdownOpen === line.id && (
                        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-48 overflow-y-auto">
                          {getFilteredProducts(line.productSearch).map((product) => (
                            <button
                              key={product.id}
                              type="button"
                              className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent text-left"
                              onClick={() => selectProduct(line.id, product)}
                            >
                              <div>
                                <div className="font-medium">{product.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  Réf: {product.reference || "N/A"} • Stock: {product.stock_qty}
                                </div>
                              </div>
                            </button>
                          ))}
                          {getFilteredProducts(line.productSearch).length === 0 && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                              Aucun produit trouvé
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Qty */}
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      value={line.qty}
                      onChange={(e) => onQtyChange(line.id, Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20"
                    />
                  </TableCell>

                  {/* Unit Price + Tier Indicator */}
                  <TableCell>
                    <div className="flex items-center">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={line.unitPrice}
                        onChange={(e) =>
                          updateLine(line.id, {
                            unitPrice: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-24"
                      />
                      {tierLabel(line.selectedTier)}
                    </div>
                  </TableCell>

                  {/* Line Total */}
                  <TableCell className="text-right font-medium">
                    {formatCurrency(line.lineTotal)}
                  </TableCell>

                  {/* Delete */}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeLine(line.id)}
                      className="text-red-500 hover:text-red-700"
                    >
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

      {/* ——— SUMMARY ——— */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Résumé</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-xs ml-auto">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sous-total</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">TVA</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ——— ACTIONS ——— */}
      <div className="flex gap-4 justify-end pb-8">
        <Button
          size="lg"
          variant="outline"
          disabled={!canSubmit || submitting}
          onClick={handleSaveTransaction}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          {submitting ? "Enregistrement..." : "Enregistrer la transaction"}
        </Button>
        <Button
          size="lg"
          disabled={!canSubmit || submitting}
          onClick={handleGenerateInvoice}
        >
          <FileText className="h-4 w-4 mr-2" />
          {submitting ? "Génération..." : "Générer une facture"}
        </Button>
      </div>
    </div>
  )
}
