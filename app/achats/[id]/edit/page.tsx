import { Suspense } from "react"
import prisma from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import { PurchaseOrderForm } from "@/components/purchase-order-form"

export default async function EditAchatPage({
  params,
}: {
  params: { id: string }
}) {
  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  const achat = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      lines: {
        include: {
          product: { select: { id: true, name: true, reference: true } }
        }
      }
    }
  })

  if (!achat) notFound()
  if (achat.status !== 'draft') {
    redirect(`/achats/${id}?error=Only drafts can be edited`)
  }

  const [suppliers, products] = await Promise.all([
    prisma.entity.findMany({
      where: { type: "supplier", is_active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true },
    }),
    prisma.product.findMany({
      where: { is_active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, reference: true, stock_qty: true },
    }),
  ])

  // Map existing purchase order data for the form
  const initialData = {
    id: achat.id,
    supplierId: achat.supplier_id,
    notes: achat.notes || "",
    lines: achat.lines.map((l) => ({
      id: crypto.randomUUID(), // New UUIDs for React keys
      productId: l.product_id,
      productSearch: `${l.product.name} (${l.product.reference || "N/A"})`,
      qty: l.qty_ordered,
      unitCost: l.unit_cost,
    })),
  }

  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <PurchaseOrderForm 
        suppliers={suppliers} 
        products={products} 
        initialData={initialData} 
      />
    </Suspense>
  )
}
