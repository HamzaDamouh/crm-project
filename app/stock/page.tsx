import prisma from "@/lib/db"
import { StockClient } from "@/components/stock-view"

export default async function StockPage() {
  const [products, categories, stockMovements] = await Promise.all([
    prisma.product.findMany({
      take: 100,
      orderBy: { name: "asc" },
      include: {
        category: { select: { id: true, name: true } },
        purchaseOrderLines: {
          take: 20,
          orderBy: { id: "desc" },
          select: {
            id: true,
            qty_ordered: true,
            unit_cost: true,
            purchaseOrder: {
              select: {
                created_at: true,
                supplier: { select: { name: true } },
              },
            },
          },
        },
      },
    }),

    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),

    prisma.stockMovement.findMany({
      take: 100,
      orderBy: { created_at: "desc" },
      include: {
        product: { select: { id: true, name: true } },
      },
    }),
  ])

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
          category_id: p.category?.id || null,
          purchaseHistory,
          averageUnitCost,
          taxRate: p.tax_rate || 20,
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
      categories={categories}
    />
  )
}
