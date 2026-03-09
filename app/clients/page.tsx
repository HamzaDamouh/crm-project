import prisma from "@/lib/db"
import { ClientsListClient } from "@/components/clients-list"

export default async function ClientsPage({
  searchParams,
}: {
  searchParams?: {
    query?: string
    page?: string
  }
}) {
  const query = searchParams?.query || ""
  const page = Number(searchParams?.page) || 1
  const pageSize = 10
  const skip = (page - 1) * pageSize

  const where = {
    type: { not: "supplier" },
    name: { contains: query },
  }

  const [entities, totalCount] = await Promise.all([
    prisma.entity.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        invoices: {
          select: { total: true, amount_paid: true, created_at: true },
        },
      },
      skip,
      take: pageSize,
    }),
    prisma.entity.count({ where }),
  ])

  const clients = entities.map((entity) => {
    const totalInvoiced = entity.invoices.reduce((sum, inv) => sum + inv.total, 0)
    const totalPaid = entity.invoices.reduce((sum, inv) => sum + inv.amount_paid, 0)
    const lastActivity = entity.invoices.length > 0
      ? entity.invoices.reduce((latest, inv) =>
          inv.created_at > latest ? inv.created_at : latest,
          entity.invoices[0].created_at
        )
      : entity.created_at

    return {
      id: entity.id,
      name: entity.name,
      type: entity.type,
      totalInvoiced,
      totalPaid,
      balance_due: entity.balance_due,
      lastActivity: lastActivity.toISOString(),
    }
  })

  return (
    <ClientsListClient
      clients={clients}
      totalCount={totalCount}
      pageSize={pageSize}
      currentPage={page}
    />
  )
}

