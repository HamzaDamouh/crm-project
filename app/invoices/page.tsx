import prisma from "@/lib/db"
import { InvoiceListClient } from "@/components/invoice-list"

export default async function InvoicesPage() {
  const invoices = await prisma.invoice.findMany({
    orderBy: { created_at: "desc" },
    include: {
      entity: { select: { name: true } },
    },
  })

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
    />
  )
}
