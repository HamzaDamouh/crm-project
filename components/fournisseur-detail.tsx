"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet"
import { formatCurrency } from "@/lib/utils"
import { paySupplier } from "@/app/actions/suppliers"
import { toast } from "sonner"

interface EntityInfo {
  id: number; name: string; type: string
  phone: string | null; email: string | null
  address: string | null; ice: string | null
  balance_due: number
}

interface PurchaseOrder {
  id: number; reference: string | null; status: string
  ordered_at: string | null; expected_at: string | null
  created_at: string; total: number
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

function statusBadge(status: string) {
  if (status === "received") return <Badge className="bg-green-600 text-white">Reçu</Badge>
  if (status === "draft") return <Badge className="bg-gray-500 text-white">Brouillon</Badge>
  return <Badge className="bg-blue-600 text-white capitalize">{status}</Badge>
}

export function FournisseurDetailClient({
  entity, purchaseOrders, payments, debtTransfers,
}: {
  entity: EntityInfo
  purchaseOrders: PurchaseOrder[]
  payments: PaymentEntry[]
  debtTransfers: DebtTransferEntry[]
}) {
  const router = useRouter()
  const [tab, setTab] = React.useState<"orders" | "payments" | "debts">("orders")
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false)
  const [paymentAmount, setPaymentAmount] = React.useState("")
  const [paymentMethod, setPaymentMethod] = React.useState("cash")
  const [paymentNotes, setPaymentNotes] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const tabs = [
    { key: "orders" as const, label: "Bons de Commande", count: purchaseOrders.length },
    { key: "payments" as const, label: "Paiements", count: payments.length },
    { key: "debts" as const, label: "Transferts de dettes", count: debtTransfers.length },
  ]

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) {
      toast.error("Veuillez entrer un montant valide")
      return
    }

    setIsSubmitting(true)
    try {
      const result = await paySupplier({
        supplierId: entity.id,
        amount: Number(paymentAmount),
        method: paymentMethod,
        paymentDate: new Date().toISOString(),
        notes: paymentNotes
      })

      if (result.success && 'message' in result) {
        toast.success(result.message)
        setPaymentDialogOpen(false)
        setPaymentAmount("")
        setPaymentNotes("")
        router.refresh()
      } else if ('error' in result) {
        toast.error(result.error)
      }
    } catch {
      toast.error("Une erreur est survenue")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{entity.name}</h1>
          <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="capitalize">Fournisseur</Badge>
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
        <div className="flex flex-col items-end gap-3 text-right">
          <div>
            <p className="text-sm text-muted-foreground">Solde à payer</p>
            <p className={`text-3xl font-bold ${entity.balance_due > 0 ? "text-red-600" : "text-green-600"}`}>
              {formatCurrency(entity.balance_due)}
            </p>
          </div>
          
          <Sheet open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
            <SheetTrigger asChild>
              <Button disabled={entity.balance_due <= 0}>Enregistrer un Paiement</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Enregistrer un paiement pour {entity.name}</SheetTitle>
              </SheetHeader>
              <form onSubmit={handleRecordPayment} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Solde actuel</Label>
                  <p className="text-xl font-semibold text-red-600">{formatCurrency(entity.balance_due)}</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Montant à payer</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    max={entity.balance_due} 
                    value={paymentAmount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentAmount(e.target.value)}
                    required 
                  />
                </div>

                <div className="space-y-2">
                  <Label>Méthode de paiement</Label>
                  <select 
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={paymentMethod} 
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPaymentMethod(e.target.value)}
                  >
                    <option value="cash">Espèces</option>
                    <option value="transfer">Virement Bancaire</option>
                    <option value="cheque">Chèque</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Notes (optionnel)</Label>
                  <textarea 
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={paymentNotes}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPaymentNotes(e.target.value)}
                    placeholder="Référence du virement, etc."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)}>Annuler</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Enregistrement..." : "Confirmer"}
                  </Button>
                </div>
              </form>
            </SheetContent>
          </Sheet>
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

      {/* TAB 1: Purchase Orders */}
      {tab === "orders" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro</TableHead>
                  <TableHead>Date Création</TableHead>
                  <TableHead className="text-right">Total Achat</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrders.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-mono font-medium">
                      {po.reference || `PO-${po.id}`}
                    </TableCell>
                    <TableCell>
                      {new Date(po.created_at).toLocaleDateString("fr-MA")}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(po.total)}</TableCell>
                    <TableCell>{statusBadge(po.status)}</TableCell>
                  </TableRow>
                ))}
                {purchaseOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">Aucun bon de commande.</TableCell>
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
                  <TableHead>Méthode</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {p.payment_date ? new Date(p.payment_date).toLocaleDateString("fr-MA") : "—"}
                    </TableCell>
                    <TableCell className="capitalize">{p.method}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">{formatCurrency(p.amount)}</TableCell>
                  </TableRow>
                ))}
                {payments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">Aucun paiement.</TableCell>
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
                  <TableHead>Détails</TableHead>
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
                          <Badge className="bg-red-600 text-white">Déduit</Badge>
                        ) : (
                          <Badge className="bg-green-600 text-white">Reçu</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isGiver ? (
                          <span>
                            <span className="font-semibold">{formatCurrency(dt.amount)}</span> transféré vers{" "}
                            <span className="font-medium">{dt.toEntity.name}</span>
                          </span>
                        ) : (
                          <span>
                            <span className="font-semibold">{formatCurrency(dt.amount)}</span> reçu de{" "}
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
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">Aucun transfert de dette.</TableCell>
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
