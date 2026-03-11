"use server"

import prisma from "@/lib/db"
import { Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"

interface RecordPaymentData {
  invoiceId: number
  amount: number
  method: string // 'cash' | 'cheque' | 'transfer' | 'debt_transfer'
  paidByEntityId: number
  chequeNumber?: string
  paymentDate: string
  notes?: string
}

export async function recordPayment(data: RecordPaymentData) {
  try {
    if (data.amount <= 0) {
      return { success: false, message: "Payment amount must be greater than 0." }
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Fetch invoice with lock to prevent race conditions
      // Using a raw query for FOR UPDATE if it was postgres, but for SQLite we don't have row-level locks.
      // We rely on the serializable nature of the transaction or check before update.
      const invoice = await tx.invoice.findUnique({
        where: { id: data.invoiceId },
        include: { entity: true },
      })

      if (!invoice) {
        throw new Error("Invoice not found.")
      }

      if (data.amount > invoice.balance_due) {
        throw new Error(`Amount exceeds balance due (${invoice.balance_due} MAD).`)
      }

      // Check if the payer entity is valid for a debt transfer
      if (data.method === "debt_transfer" && data.paidByEntityId !== invoice.entity_id) {
        const payer = await tx.entity.findUnique({ where: { id: data.paidByEntityId } })
        if (!payer) throw new Error("Payer entity not found.")
      }

      // 2. Create the payment record
      const payment = await tx.payment.create({
        data: {
          invoice_id: data.invoiceId,
          paid_by_entity_id: data.paidByEntityId,
          method: data.method,
          amount: data.amount,
          cheque_number: data.chequeNumber || null,
          payment_date: new Date(data.paymentDate),
          notes: data.notes || null,
        },
      })

      // 3. Update invoice amounts with optimistic locking
      const newAmountPaid = invoice.amount_paid + data.amount
      const newBalanceDue = invoice.total - newAmountPaid
      const newStatus = newBalanceDue <= 0 ? "paid" : newAmountPaid > 0 ? "open" : invoice.status

      const updateResult = await tx.invoice.updateMany({
        where: { 
          id: data.invoiceId,
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
      if (data.method === "debt_transfer" && data.paidByEntityId !== invoice.entity_id) {
        // Debt transfer: B (payer) takes on A's (invoice owner) debt.
        // B's debt to the store increases. A's debt to the store decreases.
        await tx.entity.update({
          where: { id: invoice.entity_id },
          data: { balance_due: { decrement: data.amount } }
        })
        await tx.entity.update({
          where: { id: data.paidByEntityId },
          data: { balance_due: { increment: data.amount } }
        })
      } else {
        // Normal payment (cash, cheque, transfer). Always decreases the invoice's entity balance.
        await tx.entity.update({
          where: { id: invoice.entity_id },
          data: { balance_due: { decrement: data.amount } }
        })
      }

      // 5. If debt_transfer or paid by a different entity, create a debt transfer
      if (data.method === "debt_transfer" || data.paidByEntityId !== invoice.entity_id) {
        await tx.debtTransfer.create({
          data: {
            from_entity_id: data.paidByEntityId,
            to_entity_id: invoice.entity_id,
            amount: data.amount,
            related_payment_id: payment.id,
            note: data.notes || `Payment for invoice ${invoice.invoice_number || "#" + invoice.id} transferred`,
          },
        })
      }
      
      return payment
    })

    revalidatePath(`/invoices/${data.invoiceId}`)
    revalidatePath("/invoices")
    revalidatePath("/dashboard")
    revalidatePath("/clients")

    return { success: true, message: `Payment of ${data.amount} MAD recorded.` }
  } catch (error) {
    console.error("Error recording payment:", error)
    const msg = error instanceof Error ? error.message : "Failed to record payment."
    return { success: false, message: msg }
  }
}
