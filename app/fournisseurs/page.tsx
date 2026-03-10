import prisma from "@/lib/db"
import { FournisseursListClient } from "@/components/fournisseurs-list"

export default async function FournisseursPage({
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
    type: "supplier",
    name: { contains: query },
  }

  const [entities, totalCount] = await Promise.all([
    prisma.entity.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        purchaseOrders: {
          include: {
            lines: true,
          }
        },
      },
      skip,
      take: pageSize,
    }),
    prisma.entity.count({ where }),
  ])

  const suppliers = entities.map((entity) => {
    let totalPurchased = 0;
    entity.purchaseOrders.forEach(po => {
      po.lines.forEach(line => {
        totalPurchased += (line.qty_ordered * line.unit_cost)
      })
    })

    const lastActivity = entity.purchaseOrders.length > 0
      ? entity.purchaseOrders.reduce((latest, po) =>
          po.created_at > latest ? po.created_at : latest,
          entity.purchaseOrders[0].created_at
        )
      : entity.created_at

    return {
      id: entity.id,
      name: entity.name,
      type: "fournisseur",
      totalPurchased,
      balance_due: entity.balance_due,
      lastActivity: lastActivity.toISOString(),
    }
  })

  return (
    <FournisseursListClient
      suppliers={suppliers}
      totalCount={totalCount}
      pageSize={pageSize}
      currentPage={page}
    />
  )
}
