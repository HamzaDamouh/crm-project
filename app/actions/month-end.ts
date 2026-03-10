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

    return { success: true, message: `Facture consolidée ${invoiceNumber} créée avec succès`, invoiceId: invoice.id, invoiceNumber }
  } catch (error) {
    console.error("Error generating consolidated invoice:", error)
    return { success: false, message: "Échec de la génération de la facture.", invoiceId: null, invoiceNumber: null }
  }
}

