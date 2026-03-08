"use server"

import prisma from "@/lib/db"
import { revalidatePath } from "next/cache"

interface RecordPaymentData {
  invoiceId: number
  amount: number
  method: string // 'cash' | 'cheque' | 'transfer'
  paidByEntityId: number
  chequeNumber?: string
  paymentDate: string
  notes?: string
}

export async function recordPayment(data: RecordPaymentData) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: data.invoiceId },
      include: { entity: true },
    })

    if (!invoice) {
      return { success: false, message: "Invoice not found." }
    }

    if (data.amount <= 0) {
      return { success: false, message: "Payment amount must be greater than 0." }
    }

    if (data.amount > invoice.balance_due) {
      return { success: false, message: `Amount exceeds balance due (${invoice.balance_due} MAD).` }
    }

    // Create the payment record
    const payment = await prisma.payment.create({
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

    // Update invoice amounts
    const newAmountPaid = invoice.amount_paid + data.amount
    const newBalanceDue = invoice.total - newAmountPaid
    const newStatus = newBalanceDue <= 0 ? "paid" : newAmountPaid > 0 ? "open" : invoice.status

    await prisma.invoice.update({
      where: { id: data.invoiceId },
      data: {
        amount_paid: newAmountPaid,
        balance_due: Math.max(0, newBalanceDue),
        status: newStatus,
      },
    })

    // Update entity balance_due
    await prisma.entity.update({
      where: { id: data.paidByEntityId },
      data: {
        balance_due: { decrement: data.amount },
      },
    })

    // If debt_transfer or paid by a different entity, create a debt transfer
    if (data.method === "debt_transfer" || data.paidByEntityId !== invoice.entity_id) {
      // The person receiving the goods gets their debt reduced on our books (invoice gets paid above)
      // The person who paid on their behalf has their balance reduced
      // Because we "deducted" from their balance
      
      await prisma.debtTransfer.create({
        data: {
          from_entity_id: data.paidByEntityId,
          to_entity_id: invoice.entity_id,
          amount: data.amount,
          related_payment_id: payment.id,
          note: data.notes || `Payment for invoice ${invoice.invoice_number || "#" + invoice.id} transferred`,
        },
      })
    }

    revalidatePath(`/invoices/${data.invoiceId}`)
    revalidatePath("/invoices")
    revalidatePath("/dashboard")

    return { success: true, message: `Payment of ${data.amount} MAD recorded.` }
  } catch (error) {
    console.error("Error recording payment:", error)
    return { success: false, message: "Failed to record payment." }
  }
}
