import prisma from "@/lib/db"
import { notFound } from "next/navigation"
import { AchatDetailClient } from "@/components/achat-detail"

export default async function AchatDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  const achat = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: { select: { id: true, name: true } },
      lines: {
        include: {
          product: { select: { id: true, name: true, reference: true } }
        }
      }
    }
  })

  if (!achat) notFound()

  return (
    <AchatDetailClient
      achat={{
        id: achat.id,
        reference: achat.reference,
        status: achat.status,
        created_at: achat.created_at.toISOString(),
        supplier: achat.supplier,
        lines: achat.lines.map(l => ({
          id: l.id,
          product: l.product,
          qty_ordered: l.qty_ordered,
          unit_cost: l.unit_cost,
        }))
      }}
    />
  )
}
