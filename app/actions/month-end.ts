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
    
    // Fetch product tax rates and latest unit cost
    const productIds = lines.map(l => l.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { 
        id: true, 
        tax_rate: true,
        purchaseOrderLines: {
          orderBy: { id: "desc" },
          take: 1,
          select: { unit_cost: true }
        }
      }
    })
    
    type ProductWithHistory = { id: number; tax_rate: number; purchaseOrderLines: { unit_cost: number }[] }
    
    const productTaxMap = new Map<number, number>(products.map((p: ProductWithHistory) => [p.id, p.tax_rate]))
    const productCostMap = new Map<number, number>(
      products.map((p: ProductWithHistory) => [p.id, p.purchaseOrderLines[0]?.unit_cost ?? 0])
    )
    
    // Calculate total tax amount
    const taxAmount = lines.reduce((sum, l) => {
      const taxRate = productTaxMap.get(l.productId) ?? 20
      const lineTotal = Number(l.qty) * Number(l.editedPrice)
      return sum + (lineTotal * (Number(taxRate) / 100))
    }, 0)
    
    const roundedTaxAmount = Math.round(taxAmount * 100) / 100
    const total = Math.round((subtotal + roundedTaxAmount) * 100) / 100

    // Generate invoice number without collision
    const year = new Date().getFullYear()
    const lastInvoice = await prisma.invoice.findFirst({
      where: { type: "invoice", invoice_number: { startsWith: `FA-${year}-` } },
      orderBy: { invoice_number: "desc" },
    })
    const lastNumMatch = lastInvoice?.invoice_number?.match(/-(\d+)$/)
    const lastNum = lastNumMatch ? parseInt(lastNumMatch[1], 10) : 0
    const invoiceNumber = `FA-${year}-${String(lastNum + 1).padStart(4, "0")}`

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
        tax_rate: 0,
        tax_amount: roundedTaxAmount,
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
            unit_cost: productCostMap.get(l.productId) ?? 0,
            line_total: l.qty * l.editedPrice,
          })),
        },
      },
    })

    // Update entity balance for purely the DIFFERENCE (Fix #7)
    // The original walk-in sale already increased the balance by (catalogPrice + tax).
    // Now we are replacing it with this invoice which has (editedPrice + tax).
    // So we only increment by the difference (total - originalTotalWithTax).
    
    // Calculate the original total that was already added to the balance:
    const originalSubtotal = lines.reduce((sum, l) => sum + l.qty * l.catalogPrice, 0)
    const originalTaxAmount = lines.reduce((sum, l) => {
      const taxRate = productTaxMap.get(l.productId) ?? 20
      const lineTotal = Number(l.qty) * Number(l.catalogPrice)
      return sum + (lineTotal * (Number(taxRate) / 100))
    }, 0)
    const originalRoundedTax = Math.round(originalTaxAmount * 100) / 100
    const originalTotal = Math.round((originalSubtotal + originalRoundedTax) * 100) / 100
    
    const balanceAdjustment = total - originalTotal

    // If there's an adjustment, apply it
    if (balanceAdjustment !== 0) {
      await prisma.entity.update({
        where: { id: entityId },
        data: { balance_due: { increment: balanceAdjustment } },
      })
    }

    // Mark all daily_sales_log entries as invoiced
    await prisma.dailySalesLog.updateMany({
      where: { id: { in: lines.map((l) => l.logId) } },
      data: { invoiced: true },
    })

    revalidatePath("/month-end")
    revalidatePath("/invoices")
    revalidatePath("/transactions")
    revalidatePath("/dashboard")

    return { success: true, message: `Facture consolidée ${invoiceNumber} créée avec succès`, invoiceId: invoice.id, invoiceNumber }
  } catch (error) {
    console.error("Error generating consolidated invoice:", error)
    return { success: false, message: "Échec de la génération de la facture.", invoiceId: null, invoiceNumber: null }
  }
}

