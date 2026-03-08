import prisma from "@/lib/db"
import { PurchaseOrderForm } from "@/components/purchase-order-form"

export default async function NewPurchaseOrderPage() {
  const suppliers = await prisma.entity.findMany({
    where: { type: "supplier", is_active: true },
    orderBy: { name: "asc" },
  })

  const products = await prisma.product.findMany({
    where: { is_active: true },
    orderBy: { name: "asc" },
  })

  return (
    <PurchaseOrderForm
      suppliers={suppliers.map((s: any) => ({
        id: s.id,
        name: s.name,
        type: s.type,
      }))}
      products={products.map((p: any) => ({
        id: p.id,
        name: p.name,
        reference: p.reference,
        stock_qty: p.stock_qty,
      }))}
    />
  )
}
