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
          entity_id: data.entityId > 0 ? data.entityId : null,
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

    return { success: true, message: "Transaction enregistrée avec succès !" }
  } catch (error) {
    console.error("Error saving transaction:", error)
    return { success: false, message: "Échec de l'enregistrement de la transaction." }
  }
}

export async function generateInvoice(data: TransactionData) {
  try {
    // Generate invoice number
    const lastInvoice = await prisma.invoice.findFirst({
      where: { type: "invoice" },
      orderBy: { id: "desc" },
    })
    const nextNum = lastInvoice ? lastInvoice.id + 1 : 1
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(nextNum).padStart(3, "0")}`

    // Fetch products to get their tax rates and latest unit cost
    const productIds = data.lines.map(l => l.productId)
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
    
    // Calculate total tax amount based on individual product rates
    const calculatedTaxAmount = data.lines.reduce((sum, line) => {
      const taxRate = productTaxMap.get(line.productId) ?? 20
      return sum + (Number(line.lineTotal) * (Number(taxRate) / 100))
    }, 0)
    
    const finalTaxAmount = Math.round(calculatedTaxAmount * 100) / 100
    const finalTotal = Math.round((data.subtotal + finalTaxAmount) * 100) / 100

    // Create the invoice record
    const invoice = await prisma.invoice.create({
      data: {
        entity_id: data.entityId,
        type: "invoice",
        status: "draft",
        invoice_number: invoiceNumber,
        issue_date: new Date(),
        subtotal: data.subtotal,
        tax_rate: 0, // No longer a single global rate
        tax_amount: finalTaxAmount,
        total: finalTotal,
        amount_paid: 0,
        balance_due: finalTotal,
        lines: {
          create: data.lines.map((line) => ({
            product_id: line.productId,
            qty: line.qty,
            catalog_price: line.unitPrice,
            unit_price: line.unitPrice,
            unit_cost: productCostMap.get(line.productId) ?? 0,
            line_total: line.lineTotal,
          })),
        },
      },
    })

    // Update stock via stock movement
    await updateStock(data.lines, "invoice", invoice.id)

    // Log the daily sales with invoiced: true
    const logDate = new Date()
    for (const line of data.lines) {
      await prisma.dailySalesLog.create({
        data: {
          entity_id: data.entityId > 0 ? data.entityId : null,
          log_date: logDate,
          product_id: line.productId,
          qty: line.qty,
          unit_price: line.unitPrice,
          total: line.lineTotal,
          note: `Invoiced directly: ${invoice.invoice_number}`,
          invoiced: true,
        },
      })
    }

    revalidatePath("/dashboard")
    revalidatePath("/invoices")

    return { success: true, message: "Facture générée !", invoiceId: invoice.id }
  } catch (error) {
    console.error("Error generating invoice:", error)
    return { success: false, message: "Échec de la génération de la facture." }
  }
}
