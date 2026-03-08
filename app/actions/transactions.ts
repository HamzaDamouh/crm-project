"use server"

import prisma from "@/lib/db"
import { revalidatePath } from "next/cache"

interface LineItem {
  productId: number
  qty: number
  unitPrice: number
  lineTotal: number
}

interface TransactionData {
  entityId: number
  lines: LineItem[]
  subtotal: number
  taxAmount: number
  total: number
}

async function updateStock(lines: LineItem[], referenceType: string, referenceId: number) {
  for (const line of lines) {
    // Create stock movement (out)
    await prisma.stockMovement.create({
      data: {
        product_id: line.productId,
        movement_type: "out",
        qty: line.qty,
        reference_type: referenceType,
        reference_id: referenceId,
        note: `${referenceType} #${referenceId}`,
      },
    })

    // Decrease product stock
    await prisma.product.update({
      where: { id: line.productId },
      data: { stock_qty: { decrement: line.qty } },
    })
  }
}

export async function saveAsTransaction(data: TransactionData) {
  try {
    // Save each line as a daily_sales_log entry
    const logDate = new Date()

    for (const line of data.lines) {
      const log = await prisma.dailySalesLog.create({
        data: {
          log_date: logDate,
          product_id: line.productId,
          qty: line.qty,
          unit_price: line.unitPrice,
          total: line.lineTotal,
          note: data.entityId > 1 ? `Sale to entity #${data.entityId}` : "Walk-in sale",
          invoiced: false,
        },
      })

      // Update stock for each line
      await prisma.stockMovement.create({
        data: {
          product_id: line.productId,
          movement_type: "out",
          qty: line.qty,
          reference_type: "daily_sales_log",
          reference_id: log.id,
          note: `Walk-in sale`,
        },
      })

      await prisma.product.update({
        where: { id: line.productId },
        data: { stock_qty: { decrement: line.qty } },
      })
    }

    revalidatePath("/dashboard")
    revalidatePath("/transactions")

    return { success: true, message: "Transaction saved successfully!" }
  } catch (error) {
    console.error("Error saving transaction:", error)
    return { success: false, message: "Failed to save transaction." }
  }
}

export async function generateQuote(data: TransactionData) {
  try {
    // Generate invoice number
    const lastInvoice = await prisma.invoice.findFirst({
      where: { type: "quote" },
      orderBy: { id: "desc" },
    })
    const nextNum = lastInvoice ? lastInvoice.id + 1 : 1
    const invoiceNumber = `QT-${new Date().getFullYear()}-${String(nextNum).padStart(3, "0")}`

    // Create the invoice record
    const invoice = await prisma.invoice.create({
      data: {
        entity_id: data.entityId,
        type: "quote",
        status: "draft",
        invoice_number: invoiceNumber,
        issue_date: new Date(),
        subtotal: data.subtotal,
        tax_rate: 20,
        tax_amount: data.taxAmount,
        total: data.total,
        amount_paid: 0,
        balance_due: data.total,
        lines: {
          create: data.lines.map((line) => ({
            product_id: line.productId,
            qty: line.qty,
            catalog_price: line.unitPrice,
            unit_price: line.unitPrice,
            line_total: line.lineTotal,
          })),
        },
      },
    })

    // Update stock
    await updateStock(data.lines, "invoice", invoice.id)

    revalidatePath("/dashboard")
    revalidatePath("/invoices")

    return { success: true, message: "Quote generated!", invoiceId: invoice.id }
  } catch (error) {
    console.error("Error generating quote:", error)
    return { success: false, message: "Failed to generate quote." }
  }
}
