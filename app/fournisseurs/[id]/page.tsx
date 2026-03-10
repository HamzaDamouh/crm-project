import prisma from "@/lib/db"
import { notFound } from "next/navigation"
import { FournisseurDetailClient } from "@/components/fournisseur-detail"

export default async function FournisseurPage({ params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10)
  if (isNaN(id)) return notFound()

  const entity = await prisma.entity.findUnique({
    where: { id },
    include: {
      purchaseOrders: {
        include: {
          lines: true,
        },
        orderBy: { created_at: "desc" },
      },
      paymentsMade: {
        include: {
          invoice: { select: { invoice_number: true, entity: { select: { name: true, id: true } } } },
        },
        orderBy: { payment_date: "desc" },
      },
      debtTransfersTo: {
        include: {
          fromEntity: { select: { name: true } },
          toEntity: { select: { name: true } },
          related_payment: { select: { invoice: { select: { invoice_number: true, entity: { select: { name: true } } } } } },
        },
        orderBy: { created_at: "desc" },
      },
      debtTransfersFrom: {
        include: {
          fromEntity: { select: { name: true } },
          toEntity: { select: { name: true } },
          related_payment: { select: { invoice: { select: { invoice_number: true, entity: { select: { name: true } } } } } },
        },
        orderBy: { created_at: "desc" },
      },
    },
  })

  if (!entity || entity.type !== "supplier") {
    return notFound()
  }

  const purchaseOrders = entity.purchaseOrders.map((po) => {
    const total = po.lines.reduce((sum, line) => sum + line.qty_ordered * line.unit_cost, 0)
    return {
      id: po.id,
      reference: po.reference,
      status: po.status,
      ordered_at: po.ordered_at ? po.ordered_at.toISOString() : null,
      expected_at: po.expected_at ? po.expected_at.toISOString() : null,
      created_at: po.created_at.toISOString(),
      total,
    }
  })

  const payments = entity.paymentsMade.map((p) => ({
    id: p.id,
    amount: p.amount,
    method: p.method,
    payment_date: p.payment_date ? p.payment_date.toISOString() : null,
    cheque_number: p.cheque_number,
    invoiceId: p.invoice_id,
    invoiceNumber: p.invoice?.invoice_number || null,
    invoiceEntityName: p.invoice?.entity?.name || null,
    invoiceEntityId: p.invoice?.entity?.id || null,
  }))

  const allDebts = [...entity.debtTransfersTo, ...entity.debtTransfersFrom].sort(
    (a, b) => b.created_at.getTime() - a.created_at.getTime()
  )

  const debtTransfers = allDebts.map((d) => ({
    id: d.id,
    from_entity_id: d.from_entity_id,
    to_entity_id: d.to_entity_id,
    amount: d.amount,
    note: d.note,
    created_at: d.created_at.toISOString(),
    fromEntity: d.fromEntity,
    toEntity: d.toEntity,
    relatedInvoiceNumber: d.related_payment?.invoice?.invoice_number || null,
    relatedInvoiceEntityName: d.related_payment?.invoice?.entity?.name || null,
  }))

  return (
    <FournisseurDetailClient
      entity={{
        id: entity.id,
        name: entity.name,
        type: "fournisseur",
        phone: entity.phone,
        email: entity.email,
        address: entity.address,
        ice: entity.ice,
        balance_due: entity.balance_due,
      }}
      purchaseOrders={purchaseOrders}
      payments={payments}
      debtTransfers={debtTransfers}
    />
  )
}
