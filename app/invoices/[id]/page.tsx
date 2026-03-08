import prisma from "@/lib/db"
import { notFound } from "next/navigation"
import { InvoiceDetailClient } from "@/components/invoice-detail"

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const invoiceId = parseInt(params.id)
  if (isNaN(invoiceId)) notFound()

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      entity: true,
      lines: {
        include: {
          product: { select: { name: true, reference: true } },
        },
      },
      payments: {
        include: {
          paidByEntity: { select: { name: true } },
        },
        orderBy: { payment_date: "desc" },
      },
    },
  })

  if (!invoice) notFound()

  const allEntities = await prisma.entity.findMany({
    where: { is_active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })

  // Serialize dates to strings for the client component
  const serialized = {
    ...invoice,
    issue_date: invoice.issue_date?.toISOString() || null,
    due_date: invoice.due_date?.toISOString() || null,
    created_at: undefined,
    lines: invoice.lines.map((l) => ({
      ...l,
      description: l.description,
      product: l.product,
    })),
    payments: invoice.payments.map((p) => ({
      ...p,
      payment_date: p.payment_date?.toISOString() || null,
      created_at: undefined,
    })),
  }

  return (
    <InvoiceDetailClient
      invoice={serialized}
      allEntities={allEntities}
    />
  )
}
