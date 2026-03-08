import prisma from "@/lib/db"
import { StockClient } from "@/components/stock-view"

export default async function StockPage() {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    include: {
      category: { select: { name: true } },
    },
  })

  const stockMovements = await prisma.stockMovement.findMany({
    orderBy: { created_at: "desc" },
    include: {
      product: { select: { id: true, name: true } },
    },
  })

  return (
    <StockClient
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        reference: p.reference,
        stock_qty: p.stock_qty,
        stock_min: p.stock_min,
        unit: p.unit,
        is_active: p.is_active,
        category: p.category?.name || "Uncategorized",
      }))}
      movements={stockMovements.map((m) => ({
        id: m.id,
        product_id: m.product_id,
        movement_type: m.movement_type,
        qty: m.qty,
        reference_type: m.reference_type,
        reference_id: m.reference_id,
        note: m.note,
        created_at: m.created_at.toISOString(),
      }))}
    />
  )
}
