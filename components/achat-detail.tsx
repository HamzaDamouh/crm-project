"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import { deletePurchaseOrder } from "@/app/actions/purchase-orders-edit"
import { toast } from "sonner"
import { Edit2, Trash2, ArrowLeft } from "lucide-react"

interface PurchaseOrder {
  id: number
  reference: string | null
  status: string
  created_at: string
  supplier: { id: number; name: string }
  lines: {
    id: number
    product: { id: number; name: string; reference: string | null }
    qty_ordered: number
    unit_cost: number
  }[]
}

export function AchatDetailClient({ achat }: { achat: PurchaseOrder }) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = React.useState(false)

  const lines = achat?.lines || []
  const total = lines.reduce((sum, line) => sum + ((line.qty_ordered || 0) * (line.unit_cost || 0)), 0)

  async function handleDelete() {
    if (!confirm("Voulez-vous vraiment supprimer cet achat ? Cette action va déduire les quantités reçues du stock et retirer le montant du solde du fournisseur.")) return
    
    setIsDeleting(true)
    const res = await deletePurchaseOrder(achat.id)
    if (res && res.success) {
      toast.success(res.message)
      router.push("/achats")
    } else {
      toast.error(res?.error || "Erreur de suppression")
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push("/achats")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">
          Achat {achat?.reference || (achat?.id ? `AC-${achat.id}` : "")}
        </h1>
        <Badge className={achat?.status === "received" ? "bg-green-600" : "bg-blue-600"}>
          {achat?.status === "received" ? "Reçu" : (achat?.status || "Brouillon")}
        </Badge>
        
        <div className="flex-1" />
        
        <Button variant="outline" onClick={() => { if (achat?.id) router.push(`/achats/${achat.id}/edit`) }}>
          <Edit2 className="h-4 w-4 mr-2" />
          Modifier
        </Button>
        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting || !achat?.id}>
          <Trash2 className="h-4 w-4 mr-2" />
          {isDeleting ? "Suppression..." : "Supprimer"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-muted-foreground mb-4">Informations Générales</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fournisseur</span>
                <span className="font-medium">{achat?.supplier?.name || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date de commande</span>
                <span className="font-medium">{achat?.created_at ? new Date(achat.created_at).toLocaleDateString("fr-MA") : "N/A"}</span>
              </div>
              <div className="flex justify-between border-t pt-3 mt-3">
                <span className="font-semibold">Montant Total</span>
                <span className="font-bold text-lg">{formatCurrency(total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead className="text-right">Quantité</TableHead>
                <TableHead className="text-right">Prix Unitaire</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    <div className="font-medium">{line.product.name}</div>
                    {line.product.reference && (
                      <div className="text-xs text-muted-foreground">{line.product.reference}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{line.qty_ordered}</TableCell>
                  <TableCell className="text-right">{formatCurrency(line.unit_cost)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(line.qty_ordered * line.unit_cost)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
