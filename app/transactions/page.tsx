import prisma from "@/lib/db"
import { TransactionsListClient } from "@/components/transactions-list"

export default async function TransactionsPage() {
  const entries = await prisma.dailySalesLog.findMany({
    orderBy: { log_date: "desc" },
    include: {
      product: { select: { name: true, reference: true } },
    },
  })

  return (
    <TransactionsListClient
      entries={entries.map((e) => ({
        id: e.id,
        log_date: e.log_date.toISOString(),
        qty: e.qty,
        unit_price: e.unit_price,
        total: e.total,
        invoiced: e.invoiced,
        note: e.note,
        product: e.product,
      }))}
    />
  )
}
