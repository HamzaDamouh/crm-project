import { Suspense } from "react"
import prisma from "@/lib/db"
import { PurchaseOrderForm } from "@/components/purchase-order-form"

export default async function NewAchatPage() {
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

  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <PurchaseOrderForm suppliers={suppliers} products={products} />
    </Suspense>
  )
}
