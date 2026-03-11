"use server"

import prisma from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function deletePurchaseOrder(id: number) {
  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { lines: true }
    })

    if (!po) return { success: false, error: "Bon de commande introuvable." }

    await prisma.$transaction(async (tx) => {
      // 1. Reverse stock movements and product quantities
      for (const line of po.lines) {
        if (line.qty_received > 0) {
          await tx.product.update({
             where: { id: line.product_id },
             data: { stock_qty: { decrement: line.qty_received } }
          })
          
          await tx.stockMovement.create({
            data: {
              product_id: line.product_id,
              movement_type: "out",
              qty: line.qty_received,
              reference_type: "purchase_order_cancel",
              reference_id: po.id,
              note: "Annulation du bon de commande " + (po.reference || po.id)
            }
          })
        }
      }

      // 2. Reverse supplier balance due
      const totalAmount = po.lines.reduce((sum, line) => sum + (line.qty_ordered * line.unit_cost), 0)
      
      await tx.entity.update({
         where: { id: po.supplier_id },
         data: { balance_due: { decrement: totalAmount } }
      })

      // 3. Delete lines and PO
      await tx.purchaseOrderLine.deleteMany({ where: { purchase_order_id: po.id } })
      await tx.purchaseOrder.delete({ where: { id: po.id } })
    })

    revalidatePath("/achats")
    revalidatePath("/fournisseurs")
    revalidatePath("/stock")
    return { success: true, message: "Bon de commande supprimé avec succès." }
  } catch (error) {
    console.error("Error deleting purchase order:", error)
    return { success: false, error: "Erreur lors de la suppression." }
  }
}

export async function updatePurchaseOrder(
  id: number,
  data: {
    supplierId: number
    notes: string
  },
  lines: { productId: number; qty: number; unitCost: number }[]
) {
  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { lines: true }
    })

    if (!po) return { success: false, error: "Bon de commande introuvable." }

    // Only allow updating drafts to keep things safe and simple regarding stock/balance.
    // Received POs should be credited/returned instead of edited directly.
    if (po.status !== "draft") {
      return { success: false, error: "Seuls les brouillons peuvent être modifiés directement." }
    }

    await prisma.$transaction(async (tx) => {
      // Delete existing lines
      await tx.purchaseOrderLine.deleteMany({ where: { purchase_order_id: po.id } })

      // Create new lines
      for (const line of lines) {
        await tx.purchaseOrderLine.create({
          data: {
            purchase_order_id: po.id,
            product_id: line.productId,
            qty_ordered: line.qty,
            qty_received: 0,
            unit_cost: line.unitCost,
          }
        })
      }

      // Update PO details
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: {
          supplier_id: data.supplierId,
          notes: data.notes,
        }
      })
    })

    revalidatePath("/achats")
    revalidatePath(`/achats/${id}`)
    revalidatePath("/fournisseurs")
    return { success: true, message: "Bon de commande mis à jour avec succès." }
  } catch (error) {
    console.error("Error updating purchase order:", error)
    return { success: false, error: "Erreur lors de la mise à jour." }
  }
}

