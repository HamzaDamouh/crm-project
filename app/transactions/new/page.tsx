import prisma from "@/lib/db"
import { TransactionForm } from "@/components/transaction-form"

export default async function NewTransactionPage() {
  const entities = await prisma.entity.findMany({
    where: { type: { not: "supplier" }, is_active: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      balance_due: true,
      type: true,
    },
  })

  const products = await prisma.product.findMany({
    where: { is_active: true },
    orderBy: { name: "asc" },
    include: {
      priceTiers: {
        orderBy: { min_qty: "asc" },
      },
    },
  })

  return (
    <TransactionForm
      entities={entities}
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        reference: p.reference,
        stock_qty: p.stock_qty,
        priceTiers: p.priceTiers.map((t) => ({
          id: t.id,
          min_qty: t.min_qty,
          max_qty: t.max_qty,
          unit_price: t.unit_price,
          note: t.note,
        })),
      }))}
    />
  )
}
