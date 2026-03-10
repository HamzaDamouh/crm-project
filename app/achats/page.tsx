import prisma from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export default async function AchatsPage() {
  const achats = await prisma.purchaseOrder.findMany({
    orderBy: { created_at: "desc" },
    include: {
      supplier: { select: { name: true } },
      lines: true,
    },
  })

  // Calculate total for each
  const achatsList = achats.map(po => {
    const total = po.lines.reduce((sum, line) => sum + line.qty_ordered * line.unit_cost, 0);
    return {
      id: po.id,
      reference: po.reference,
      supplierName: po.supplier.name,
      status: po.status,
      created_at: po.created_at,
      total,
    }
  })

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Achats</h1>
        <Button asChild>
          <Link href="/achats/new">
            <Plus className="h-4 w-4 mr-2" />
            Nouvel achat
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead className="text-right">Montant (MAD)</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
             <TableBody>
              {achatsList.map((achat) => (
                <TableRow key={achat.id}>
                  <TableCell className="font-mono font-medium">
                    {achat.reference || `AC-${achat.id}`}
                  </TableCell>
                  <TableCell>
                    {new Date(achat.created_at).toLocaleDateString("fr-MA")}
                  </TableCell>
                  <TableCell>{achat.supplierName}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(achat.total)}
                  </TableCell>
                  <TableCell>
                    {achat.status === "received" ? (
                      <Badge className="bg-green-600 text-white">Reçu</Badge>
                    ) : (
                      <Badge className="bg-blue-600 text-white capitalize">{achat.status}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {achatsList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                     Aucun achat trouvé.
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
