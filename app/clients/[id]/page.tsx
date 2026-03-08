import prisma from "@/lib/db"
import { notFound } from "next/navigation"
import { ClientDetailClient } from "@/components/client-detail"

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const clientId = parseInt(params.id)
  if (isNaN(clientId)) notFound()

  const entity = await prisma.entity.findUnique({
    where: { id: clientId },
    include: {
      invoices: {
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          type: true,
          status: true,
          invoice_number: true,
          issue_date: true,
          total: true,
          amount_paid: true,
          balance_due: true,
        },
      },
    },
  })

  if (!entity) notFound()

  // Payments made BY this client (including on behalf of others)
  const payments = await prisma.payment.findMany({
    where: { paid_by_entity_id: clientId },
    orderBy: { payment_date: "desc" },
    include: {
      invoice: {
        select: {
          id: true,
          invoice_number: true,
          entity_id: true,
          entity: { select: { name: true } },
        },
      },
    },
  })

  // Debt transfers involving this client
  const debtTransfers = await prisma.debtTransfer.findMany({
    where: {
      OR: [{ from_entity_id: clientId }, { to_entity_id: clientId }],
    },
    orderBy: { created_at: "desc" },
    include: {
      fromEntity: { select: { name: true } },
      toEntity: { select: { name: true } },
      related_payment: {
        include: {
          invoice: {
            include: {
              entity: { select: { name: true } }
            }
          }
        }
      }
    },
  })


  return (
    <ClientDetailClient
      entity={{
        id: entity.id,
        name: entity.name,
        type: entity.type,
        phone: entity.phone,
        email: entity.email,
        address: entity.address,
        ice: entity.ice,
        balance_due: entity.balance_due,
      }}
      invoices={entity.invoices.map((inv) => ({
        ...inv,
        issue_date: inv.issue_date?.toISOString() || null,
      }))}
      payments={payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        method: p.method,
        payment_date: p.payment_date?.toISOString() || null,
        cheque_number: p.cheque_number,
        invoiceId: p.invoice?.id || null,
        invoiceNumber: p.invoice?.invoice_number || null,
        invoiceEntityName: p.invoice?.entity?.name || null,
        invoiceEntityId: p.invoice?.entity_id || null,
      }))}
      debtTransfers={debtTransfers.map((dt) => ({
        id: dt.id,
        from_entity_id: dt.from_entity_id,
        to_entity_id: dt.to_entity_id,
        amount: dt.amount,
        note: dt.note,
        created_at: dt.created_at.toISOString(),
        fromEntity: dt.fromEntity,
        toEntity: dt.toEntity,
        relatedInvoiceNumber: dt.related_payment?.invoice?.invoice_number || dt.related_payment?.invoice?.id ? `#${dt.related_payment.invoice.id}` : null,
        relatedInvoiceEntityName: dt.related_payment?.invoice?.entity?.name || null,
      }))}
    />
  )
}
