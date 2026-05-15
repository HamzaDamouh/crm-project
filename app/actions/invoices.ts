"use server"

import prisma from "@/lib/db"
import { Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// ——— Zod Schemas ———

const RecordPaymentSchema = z.object({
  invoiceId: z.number().int().positive("Invoice ID must be a positive integer."),
  amount: z.number().positive("Payment amount must be greater than 0."),
  method: z.enum(["cash", "cheque", "transfer", "debt_transfer"], {
    error: "Invalid payment method.",
  }),
  paidByEntityId: z.number().int().positive("Payer entity ID must be a positive integer."),
  chequeNumber: z.string().optional(),
  paymentDate: z.string().min(1, "Payment date is required."),
  notes: z.string().optional(),
})

// ——— Server Actions ———

export async function recordPayment(data: unknown) {
  // Validate input
  const parsed = RecordPaymentSchema.safeParse(data)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e: { message: string }) => e.message).join(", ")
    return { success: false, message: `Validation error: ${errors}` }
  }
  const input = parsed.data

  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Fetch invoice with lock to prevent race conditions
      // Using a raw query for FOR UPDATE if it was postgres, but for SQLite we don't have row-level locks.
      // We rely on the serializable nature of the transaction or check before update.
      const invoice = await tx.invoice.findUnique({
        where: { id: input.invoiceId },
        include: { entity: true },
      })

      if (!invoice) {
        throw new Error("Invoice not found.")
      }

      if (input.amount > invoice.balance_due) {
        throw new Error(`Amount exceeds balance due (${invoice.balance_due} MAD).`)
      }

      // Check if the payer entity is valid for a debt transfer
      if (input.method === "debt_transfer" && input.paidByEntityId !== invoice.entity_id) {
        const payer = await tx.entity.findUnique({ where: { id: input.paidByEntityId } })
        if (!payer) throw new Error("Payer entity not found.")
      }

      // 2. Create the payment record
      const payment = await tx.payment.create({
        data: {
          invoice_id: input.invoiceId,
          paid_by_entity_id: input.paidByEntityId,
          method: input.method,
          amount: input.amount,
          cheque_number: input.chequeNumber || null,
          payment_date: new Date(input.paymentDate),
          notes: input.notes || null,
        },
      })

      // 3. Update invoice amounts with optimistic locking
      const newAmountPaid = invoice.amount_paid + input.amount
      const newBalanceDue = invoice.total - newAmountPaid
      const newStatus = newBalanceDue <= 0 ? "paid" : newAmountPaid > 0 ? "open" : invoice.status

      const updateResult = await tx.invoice.updateMany({
        where: { 
          id: input.invoiceId,
          balance_due: invoice.balance_due
        },
        data: {
          amount_paid: newAmountPaid,
          balance_due: Math.max(0, newBalanceDue),
          status: newStatus,
        },
      })

      if (updateResult.count === 0) {
        throw new Error("La facture a été modifiée par une autre transaction. Veuillez réessayer.")
      }

      // 4. Update entity balances
      if (input.method === "debt_transfer" && input.paidByEntityId !== invoice.entity_id) {
        // Debt transfer: B (payer) takes on A's (invoice owner) debt.
        // B's debt to the store increases. A's debt to the store decreases.
        await tx.entity.update({
          where: { id: invoice.entity_id },
          data: { balance_due: { decrement: input.amount } }
        })
        await tx.entity.update({
          where: { id: input.paidByEntityId },
          data: { balance_due: { increment: input.amount } }
        })
      } else {
        // Normal payment (cash, cheque, transfer). Always decreases the invoice's entity balance.
        await tx.entity.update({
          where: { id: invoice.entity_id },
          data: { balance_due: { decrement: input.amount } }
        })
      }

      // 5. If debt_transfer or paid by a different entity, create a debt transfer
      if (input.method === "debt_transfer" || input.paidByEntityId !== invoice.entity_id) {
        await tx.debtTransfer.create({
          data: {
            from_entity_id: input.paidByEntityId,
            to_entity_id: invoice.entity_id,
            amount: input.amount,
            related_payment_id: payment.id,
            note: input.notes || `Payment for invoice ${invoice.invoice_number || "#" + invoice.id} transferred`,
          },
        })
      }
      
      return payment
    })

    revalidatePath(`/invoices/${input.invoiceId}`)
    revalidatePath("/invoices")
    revalidatePath("/dashboard")
    revalidatePath("/clients")

    return { success: true, message: `Payment of ${input.amount} MAD recorded.` }
  } catch (error) {
    console.error("Error recording payment:", error)
    const msg = error instanceof Error ? error.message : "Failed to record payment."
    return { success: false, message: msg }
  }
}
