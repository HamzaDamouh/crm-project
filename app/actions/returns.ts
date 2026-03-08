"use server"

import prisma from "@/lib/db"
import { revalidatePath } from "next/cache"

export interface ReturnItem {
  productId: number
  qty: number
  unitPrice: number
}

export async function generateCreditNote(invoiceId: number, items: ReturnItem[]) {
  try {
    // 1. Fetch the original invoice to get entity_id and context
    const originalInvoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { entity: true },
    })

    if (!originalInvoice) {
      return { success: false, message: "Invoice not found." }
    }

    if (items.length === 0) {
      return { success: false, message: "No items provided for return." }
    }

    // 2. Calculate totals and fetch product tax rates
    const productIds = items.map((item) => item.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, tax_rate: true },
    })

    const productTaxMap = new Map<number, number>(
      products.map((p) => [p.id, p.tax_rate])
    )

    let subtotal = 0
    let taxAmount = 0

    const linesData = items.map((item) => {
      const lineTotal = item.qty * item.unitPrice
      const taxRate = productTaxMap.get(item.productId) ?? 20
      const lineTax = lineTotal * (taxRate / 100)

      subtotal += lineTotal
      taxAmount += lineTax

      return {
        product_id: item.productId,
        qty: item.qty,
        catalog_price: item.unitPrice, // Using provided price as relevant for credit
        unit_price: item.unitPrice,
        line_total: lineTotal,
      }
    })

    const finalTaxAmount = Math.round(taxAmount * 100) / 100
    const total = Math.round((subtotal + finalTaxAmount) * 100) / 100

    // 3. Generate unique credit note number
    const count = await prisma.invoice.count({
      where: { type: "credit_note" },
    })
    const year = new Date().getFullYear()
    const creditNoteNumber = `CN-${year}-${String(count + 1).padStart(3, "0")}`

    // 4. Perform everything in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // a. Create the Credit Note Invoice
      const creditNote = await tx.invoice.create({
        data: {
          entity_id: originalInvoice.entity_id,
          type: "credit_note",
          status: "open",
          invoice_number: creditNoteNumber,
          issue_date: new Date(),
          subtotal: subtotal,
          tax_rate: 0, // Using per-line tax
          tax_amount: finalTaxAmount,
          total: total,
          amount_paid: 0,
          balance_due: total,
          notes: `Credit Note for Invoice #${originalInvoice.invoice_number || originalInvoice.id}`,
          lines: {
            create: linesData,
          },
        },
      })

      // b. Update stock and create movements for each item
      for (const item of items) {
        // Increase product stock
        await tx.product.update({
          where: { id: item.productId },
          data: { stock_qty: { increment: item.qty } },
        })

        // Create stock movement (in)
        await tx.stockMovement.create({
          data: {
            product_id: item.productId,
            movement_type: "in",
            qty: item.qty,
            reference_type: "invoice",
            reference_id: creditNote.id,
            note: `Return from Invoice #${originalInvoice.invoice_number || originalInvoice.id}`,
          },
        })
      }

      // c. Deduct from client's balance
      await tx.entity.update({
        where: { id: originalInvoice.entity_id },
        data: { balance_due: { decrement: total } },
      })

      return creditNote
    })

    // 5. Revalidate paths
    revalidatePath("/dashboard")
    revalidatePath("/invoices")
    revalidatePath(`/invoices/${invoiceId}`)
    revalidatePath(`/invoices/${result.id}`)
    revalidatePath("/clients")

    return {
      success: true,
      message: `Credit Note ${creditNoteNumber} generated and client balance updated.`,
      creditNoteId: result.id,
    }
  } catch (error) {
    console.error("Error generating credit note:", error)
    return { success: false, message: "Failed to generate credit note." }
  }
}
