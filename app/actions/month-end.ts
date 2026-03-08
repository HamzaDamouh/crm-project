"use server"

import prisma from "@/lib/db"
import { revalidatePath } from "next/cache"

interface ConsolidatedLine {
  logId: number
  productId: number
  qty: number
  catalogPrice: number
  editedPrice: number
}

export async function generateConsolidatedInvoice(
  entityId: number,
  lines: ConsolidatedLine[]
) {
  try {
    const subtotal = lines.reduce((sum, l) => sum + l.qty * l.editedPrice, 0)
    const taxRate = 20
    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100
    const total = Math.round((subtotal + taxAmount) * 100) / 100

    // Generate invoice number
    const year = new Date().getFullYear()
    const count = await prisma.invoice.count({
      where: { type: "invoice" },
    })
    const invoiceNumber = `FA-${year}-${String(count + 1).padStart(3, "0")}`

    // Create the invoice
    const invoice = await prisma.invoice.create({
      data: {
        entity_id: entityId,
        type: "invoice",
        status: "open",
        invoice_number: invoiceNumber,
        issue_date: new Date(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        amount_paid: 0,
        balance_due: total,
        notes: `Consolidated invoice - Month-end closing`,
        lines: {
          create: lines.map((l) => ({
            product_id: l.productId,
            qty: l.qty,
            catalog_price: l.catalogPrice,
            override_price: l.editedPrice !== l.catalogPrice ? l.editedPrice : null,
            override_reason:
              l.editedPrice !== l.catalogPrice ? "Month-end price adjustment" : null,
            unit_price: l.editedPrice,
            line_total: l.qty * l.editedPrice,
          })),
        },
      },
    })

    // Update entity balance
    await prisma.entity.update({
      where: { id: entityId },
      data: { balance_due: { increment: total } },
    })

    // Mark all daily_sales_log entries as invoiced
    await prisma.dailySalesLog.updateMany({
      where: { id: { in: lines.map((l) => l.logId) } },
      data: { invoiced: true },
    })

    revalidatePath("/month-end")
    revalidatePath("/invoices")
    revalidatePath("/transactions")
    revalidatePath("/dashboard")

    return { success: true, invoiceId: invoice.id, invoiceNumber }
  } catch (error) {
    console.error("Error generating consolidated invoice:", error)
    return { success: false, invoiceId: null, invoiceNumber: null }
  }
}
