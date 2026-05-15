"use server"

import prisma from "@/lib/db"
import { Prisma } from "@prisma/client"
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

export async function saveAsTransaction(data: TransactionData) {
  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const logDate = new Date()
      let totalWalkInSaleAmount = 0

      // Guard against negative stock (must be sequential to read current stock)
      const productIds = data.lines.map(l => l.productId)
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      })
      const productMap = new Map(products.map(p => [p.id, p]))

      for (const line of data.lines) {
        const product = productMap.get(line.productId)
        if (!product) throw new Error(`Produit #${line.productId} introuvable.`)
        if (product.stock_qty < line.qty) {
          throw new Error(
            `Stock insuffisant pour "${product.name}": ${product.stock_qty} disponible(s), ${line.qty} demandé(s).`
          )
        }
      }

      // Create daily sales logs in parallel
      const logs = await Promise.all(
        data.lines.map((line) =>
          tx.dailySalesLog.create({
            data: {
              entity_id: data.entityId > 0 ? data.entityId : null,
              log_date: logDate,
              product_id: line.productId,
              qty: line.qty,
              unit_price: line.unitPrice,
              total: line.lineTotal,
              note: data.entityId > 0 ? `Sale to entity #${data.entityId}` : "Walk-in sale",
              invoiced: false,
            },
          })
        )
      )

      // Accumulate total for the entity balance update
      totalWalkInSaleAmount = data.lines.reduce((sum, l) => sum + l.lineTotal, 0)

      // Create stock movements and decrement stock in parallel
      await Promise.all(
        data.lines.map((line, i) => {
          const log = logs[i]
          return Promise.all([
            tx.stockMovement.create({
              data: {
                product_id: line.productId,
                movement_type: "out",
                qty: line.qty,
                reference_type: "daily_sales_log",
                reference_id: log.id,
                note: `Vente comptoir`,
              },
            }),
            tx.product.update({
              where: { id: line.productId },
              data: { stock_qty: { decrement: line.qty } },
            }),
          ])
        })
      )

      // If this is a named entity, update their balance immediately (Fix #7)
      if (data.entityId > 0 && totalWalkInSaleAmount > 0) {
        // Also add taxes since lineTotal is ex-VAT
        const finalTotal = data.total
        await tx.entity.update({
          where: { id: data.entityId },
          data: { balance_due: { increment: finalTotal } },
        })
      }
    })

    revalidatePath("/dashboard")
    revalidatePath("/transactions")
    revalidatePath("/stock")

    return { success: true, message: "Transaction enregistrée avec succès !" }
  } catch (error) {
    console.error("Error saving transaction:", error)
    const msg = error instanceof Error ? error.message : "Échec de l'enregistrement de la transaction."
    return { success: false, message: msg }
  }
}

export async function generateInvoice(data: TransactionData) {
  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Generate sequential invoice number (collision-proof inside transaction)
      const year = new Date().getFullYear()
      const lastInvoice = await tx.invoice.findFirst({
        where: { type: "invoice", invoice_number: { startsWith: `FA-${year}-` } },
        orderBy: { invoice_number: "desc" },
      })
      const lastNumMatch = lastInvoice?.invoice_number?.match(/-(\d+)$/)
      const lastNum = lastNumMatch ? parseInt(lastNumMatch[1], 10) : 0
      const invoiceNumber = `FA-${year}-${String(lastNum + 1).padStart(4, "0")}`

      // Fetch products for tax rates, unit costs and stock check
      const productIds = data.lines.map(l => l.productId)
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        include: {
          purchaseOrderLines: {
            orderBy: { id: "desc" },
            take: 1,
            select: { unit_cost: true }
          }
        }
      })

      const productMap = new Map(products.map(p => [p.id, p]))

      // Guard against negative stock
      for (const line of data.lines) {
        const product = productMap.get(line.productId)
        if (!product) throw new Error(`Produit #${line.productId} introuvable.`)
        if (product.stock_qty < line.qty) {
          throw new Error(
            `Stock insuffisant pour "${product.name}": ${product.stock_qty} disponible(s), ${line.qty} demandé(s).`
          )
        }
      }

      // Calculate tax per line based on individual product rates
      const calculatedTaxAmount = data.lines.reduce((sum, line) => {
        const product = productMap.get(line.productId)
        const taxRate = product?.tax_rate ?? 20
        return sum + (Number(line.lineTotal) * (Number(taxRate) / 100))
      }, 0)

      const finalTaxAmount = Math.round(calculatedTaxAmount * 100) / 100
      const finalTotal = Math.round((data.subtotal + finalTaxAmount) * 100) / 100

      // Create the invoice
      const invoice = await tx.invoice.create({
        data: {
          entity_id: data.entityId,
          type: "invoice",
          status: "open",
          invoice_number: invoiceNumber,
          issue_date: new Date(),
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          subtotal: data.subtotal,
          tax_rate: 0,
          tax_amount: finalTaxAmount,
          total: finalTotal,
          amount_paid: 0,
          balance_due: finalTotal,
          lines: {
            create: data.lines.map((line) => {
              const product = productMap.get(line.productId)
              return {
                product_id: line.productId,
                qty: line.qty,
                catalog_price: line.unitPrice,
                unit_price: line.unitPrice,
                unit_cost: product?.purchaseOrderLines[0]?.unit_cost ?? 0,
                line_total: line.lineTotal,
              }
            }),
          },
        },
      })

      // Update stock for each line (batched)
      await Promise.all(
        data.lines.map((line) =>
          Promise.all([
            tx.stockMovement.create({
              data: {
                product_id: line.productId,
                movement_type: "out",
                qty: line.qty,
                reference_type: "invoice",
                reference_id: invoice.id,
                note: `Facture ${invoiceNumber}`,
              },
            }),
            tx.product.update({
              where: { id: line.productId },
              data: { stock_qty: { decrement: line.qty } },
            }),
          ])
        )
      )

      // Update entity balance_due (FIX #1)
      await tx.entity.update({
        where: { id: data.entityId },
        data: { balance_due: { increment: finalTotal } },
      })

      // Log daily sales as invoiced (batched)
      const logDate = new Date()
      await Promise.all(
        data.lines.map((line) =>
          tx.dailySalesLog.create({
            data: {
              entity_id: data.entityId > 0 ? data.entityId : null,
              log_date: logDate,
              product_id: line.productId,
              qty: line.qty,
              unit_price: line.unitPrice,
              total: line.lineTotal,
              note: `Facture directe: ${invoice.invoice_number}`,
              invoiced: true,
            },
          })
        )
      )

      return invoice
    })

    revalidatePath("/dashboard")
    revalidatePath("/invoices")
    revalidatePath("/stock")
    revalidatePath("/clients")

    return { success: true, message: "Facture générée !", invoiceId: result.id }
  } catch (error) {
    console.error("Error generating invoice:", error)
    const msg = error instanceof Error ? error.message : "Échec de la génération de la facture."
    return { success: false, message: msg }
  }
}
