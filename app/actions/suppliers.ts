"use server"

import prisma from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function paySupplier(data: {
  supplierId: number
  amount: number
  method: string
  paymentDate: string
  notes?: string
}) {
  try {
    if (data.amount <= 0) return { success: false, error: "Le montant doit être supérieur à 0." }

    const supplier = await prisma.entity.findUnique({
      where: { id: data.supplierId }
    })

    if (!supplier || supplier.type !== "supplier") {
      return { success: false, error: "Fournisseur introuvable." }
    }

    // Removed balance check to allow advance payments (prepayments)
    // which will result in a negative balance_due (meaning supplier owes us)

    await prisma.$transaction([
      prisma.payment.create({
        data: {
          paid_by_entity_id: data.supplierId,
          method: data.method,
          amount: data.amount,
          payment_date: new Date(data.paymentDate),
          notes: data.notes || "Paiement fournisseur",
        }
      }),
      prisma.entity.update({
        where: { id: data.supplierId },
        data: {
          balance_due: { decrement: data.amount }
        }
      })
    ])

    revalidatePath(`/fournisseurs/${data.supplierId}`)
    revalidatePath("/fournisseurs")

    return { success: true, message: `Paiement de ${data.amount} MAD enregistré.` }
  } catch (error) {
    console.error("Error paying supplier:", error)
    return { success: false, error: "Erreur lors du paiement." }
  }
}
