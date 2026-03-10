"use core"
"use server"

import prisma from "@/lib/db"
import { Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"

/**
 * Automate inventory updates when receiving a Purchase Order.
 * @param orderId - The ID of the Purchase Order to receive.
 */
export async function receivePurchaseOrder(orderId: number) {
  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Fetch the Purchase Order and its lines
      const purchaseOrder = await tx.purchaseOrder.findUnique({
        where: { id: orderId },
        include: { lines: true },
      })

      if (!purchaseOrder) {
        throw new Error(`Purchase Order with ID ${orderId} not found`)
      }

      if (purchaseOrder.status === 'received') {
        throw new Error(`Purchase Order ${orderId} has already been received`)
      }

      // 2. Update PurchaseOrder status to 'received'
      await tx.purchaseOrder.update({
        where: { id: orderId },
        data: { status: 'received' },
      })

      // 3. Process each line: update qty_received, create StockMovement, and increment Product stock
      for (const line of purchaseOrder.lines) {
        const receivedQty = line.qty_ordered // Assuming full receipt for now

        // Update qty_received on the line
        await tx.purchaseOrderLine.update({
          where: { id: line.id },
          data: { qty_received: line.qty_ordered },
        })

        // Create StockMovement
        await tx.stockMovement.create({
          data: {
            product_id: line.product_id,
            movement_type: 'in',
            qty: receivedQty,
            reference_type: 'purchase_order',
            reference_id: orderId,
            note: `Received from Purchase Order #${orderId}`,
          },
        })

        // Increment stock_qty on Product
        await tx.product.update({
          where: { id: line.product_id },
          data: {
            stock_qty: {
              increment: receivedQty,
            },
          },
        })
      }

      return { success: true, message: "Purchase order received and inventory updated successfully." }
    })

    // 4. Revalidate pages
    revalidatePath("/stock")
    revalidatePath("/purchase-orders")

    return result
  } catch (error) {
    console.error("Error receiving purchase order:", error)
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." }
  }
}

/**
 * Create a new Purchase Order.
 * @param data - The Purchase Order data.
 */
export async function createPurchaseOrder(data: {
  supplierId: number
  notes?: string
  lines: {
    productId: number
    qty: number
    unitCost: number
  }[]
}) {
  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Create the Purchase Order
      const purchaseOrder = await tx.purchaseOrder.create({
        data: {
          supplier_id: data.supplierId,
          status: 'received', // Create directly as received
          ordered_at: new Date(),
          notes: data.notes,
          lines: {
            create: data.lines.map((line) => ({
              product_id: line.productId,
              qty_ordered: line.qty,
              qty_received: line.qty, // Fully received immediately
              unit_cost: line.unitCost,
            })),
          },
        },
        include: { lines: true },
      })

      let totalCost = 0

      // 2. Process each line: create StockMovement, and increment Product stock
      for (const line of purchaseOrder.lines) {
        totalCost += line.qty_ordered * line.unit_cost

        // Create StockMovement
        await tx.stockMovement.create({
          data: {
            product_id: line.product_id,
            movement_type: 'in',
            qty: line.qty_ordered,
            reference_type: 'purchase_order',
            reference_id: purchaseOrder.id,
            note: `Achat - Bon de commande #${purchaseOrder.id}`,
          },
        })

        // Increment stock_qty on Product
        await tx.product.update({
          where: { id: line.product_id },
          data: {
            stock_qty: {
              increment: line.qty_ordered,
            },
          },
        })
      }

      // 3. Update supplier's balance_due by adding the total purchase cost
      await tx.entity.update({
        where: { id: data.supplierId },
        data: {
          balance_due: {
            increment: totalCost,
          },
        },
      })

      return { success: true, message: "Bon de commande créé avec succès.", orderId: purchaseOrder.id }
    })

    revalidatePath("/purchase-orders")
    revalidatePath("/stock")
    revalidatePath("/dashboard")

    return result
  } catch (error) {
    console.error("Error creating purchase order:", error)
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." }
  }
}
