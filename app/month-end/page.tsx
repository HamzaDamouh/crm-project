import prisma from "@/lib/db"
import { MonthEndClient } from "@/components/month-end-form"

export default async function MonthEndPage() {
  const pending = await prisma.dailySalesLog.findMany({
    where: { invoiced: false },
    take: 100,
    orderBy: { log_date: "desc" },
    include: {
      product: { select: { id: true, name: true, reference: true, tax_rate: true } },
    },
  })

  const entities = await prisma.entity.findMany({
    where: { type: { not: "supplier" }, is_active: true },
    take: 100,
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })

  const currentMonth = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  return (
    <MonthEndClient
      entries={pending.map((e) => ({
        id: e.id,
        log_date: e.log_date.toISOString(),
        qty: e.qty,
        unit_price: e.unit_price,
        total: e.total,
        product: e.product,
        entity_id: e.entity_id,
      }))}
      entities={entities}
      currentMonth={currentMonth}
    />
  )
}
