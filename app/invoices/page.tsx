import prisma from "@/lib/db"
import { InvoiceListClient } from "@/components/invoice-list"

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams?: {
    query?: string
    status?: string
    type?: string
    page?: string
  }
}) {
  const query = searchParams?.query || ""
  const status = searchParams?.status || "all"
  const type = searchParams?.type || "all"
  const page = Number(searchParams?.page) || 1
  const pageSize = 10
  const skip = (page - 1) * pageSize

  const where: any = {
    AND: [
      query
        ? {
            OR: [
              { invoice_number: { contains: query } },
              { entity: { name: { contains: query } } },
            ],
          }
        : {},
      type !== "all" ? { type } : {},
    ],
  }

  // Handle status filter specifically to match the logic in components/invoice-list.tsx
  if (status === "paid") {
    where.AND.push({ balance_due: 0 })
  } else if (status === "unpaid") {
    where.AND.push({ balance_due: { gt: 0 }, amount_paid: 0 })
  } else if (status === "partial") {
    where.AND.push({ balance_due: { gt: 0 }, amount_paid: { gt: 0 } })
  } else if (status === "draft") {
    where.AND.push({ status: "draft" })
  }

  const [invoices, totalCount] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { created_at: "desc" },
      include: {
        entity: { select: { name: true } },
      },
      skip,
      take: pageSize,
    }),
    prisma.invoice.count({ where }),
  ])

  return (
    <InvoiceListClient
      invoices={invoices.map((inv) => ({
        id: inv.id,
        type: inv.type,
        status: inv.status,
        invoice_number: inv.invoice_number,
        issue_date: inv.issue_date?.toISOString() || null,
        total: inv.total,
        amount_paid: inv.amount_paid,
        balance_due: inv.balance_due,
        entity: inv.entity,
      }))}
      totalCount={totalCount}
      pageSize={pageSize}
      currentPage={page}
    />
  )
}

