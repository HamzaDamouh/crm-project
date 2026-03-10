import prisma from "@/lib/db"
import { StockClient } from "@/components/stock-view"

export default async function StockPage() {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    include: {
      category: { select: { name: true } },
      purchaseOrderLines: {
        include: {
          purchaseOrder: {
            include: {
              supplier: { select: { name: true } },
            },
          },
        },
        orderBy: { purchaseOrder: { created_at: "desc" } },
      },
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
      products={products.map((p) => {
        let totalCost = 0;
        let totalQty = 0;
        const purchaseHistory = p.purchaseOrderLines.map(line => {
          totalCost += line.unit_cost * line.qty_ordered;
          totalQty += line.qty_ordered;
          return {
            id: line.id,
            date: line.purchaseOrder?.created_at.toISOString() || new Date().toISOString(),
            supplierName: line.purchaseOrder?.supplier?.name || "Inconnu",
            qty: line.qty_ordered,
            unitCost: line.unit_cost,
          };
        });
        const averageUnitCost = totalQty > 0 ? totalCost / totalQty : null;

        return {
          id: p.id,
          name: p.name,
          reference: p.reference,
          stock_qty: p.stock_qty,
          stock_min: p.stock_min,
          unit: p.unit,
          is_active: p.is_active,
          category: p.category?.name || "Uncategorized",
          purchaseHistory,
          averageUnitCost,
        };
      })}
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
