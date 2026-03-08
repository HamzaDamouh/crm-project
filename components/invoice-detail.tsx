"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PaymentModal } from "@/components/payment-modal"
import { Printer, CreditCard } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface InvoiceLine {
  id: number
  description: string | null
  qty: number
  catalog_price: number
  override_price: number | null
  override_reason: string | null
  unit_price: number
  line_total: number
  product: { name: string; reference: string | null } | null
}

interface Payment {
  id: number
  amount: number
  method: string
  payment_date: string | null
  paidByEntity: { name: string }
}

interface Entity {
  id: number
  name: string
  phone: string | null
  email: string | null
  address: string | null
  ice: string | null
}

interface Invoice {
  id: number
  type: string
  status: string
  invoice_number: string | null
  issue_date: string | null
  due_date: string | null
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  amount_paid: number
  balance_due: number
  notes: string | null
  entity: Entity
  lines: InvoiceLine[]
  payments: Payment[]
}

interface AllEntity {
  id: number
  name: string
}

function statusBadge(status: string, balanceDue: number, total: number) {
  if (status === "paid" || balanceDue === 0)
    return <Badge className="bg-green-600 text-white">Payé</Badge>
  if (balanceDue > 0 && balanceDue < total)
    return <Badge className="bg-yellow-500 text-white">Partiel</Badge>
  if (status === "draft")
    return <Badge className="bg-gray-500 text-white">Brouillon</Badge>
  return <Badge className="bg-red-600 text-white">Impayé</Badge>
}

export function InvoiceDetailClient({
  invoice,
  allEntities,
}: {
  invoice: Invoice
  allEntities: AllEntity[]
}) {
  const [paymentOpen, setPaymentOpen] = React.useState(false)

  const typeLabel = invoice.type === "credit_note" ? "Avoir" : "Facture"

  return (
    <>
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          main { margin-left: 0 !important; }
          [data-slot="sidebar-wrapper"] { display: none !important; }
        }
      `}</style>

      <div className="flex-1 p-6 max-w-4xl mx-auto">
        {/* Action buttons */}
        <div className="no-print flex gap-3 mb-6 justify-end">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Imprimer / Exporter PDF
          </Button>
          {invoice.balance_due > 0 && (
            <Button onClick={() => setPaymentOpen(true)}>
              <CreditCard className="h-4 w-4 mr-2" /> Enregistrer un paiement
            </Button>
          )}
        </div>

        {/* Invoice Header */}
        <div className="flex justify-between items-start mb-8 border-b pb-6">
          <div>
            <h1 className="text-2xl font-bold">Hamza Distribution</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Distribution d&apos;outillage professionnel
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-semibold">{typeLabel}</h2>
            <p className="text-lg font-mono">{invoice.invoice_number || `#${invoice.id}`}</p>
            {invoice.issue_date && (
              <p className="text-sm text-muted-foreground">
                Date: {new Date(invoice.issue_date).toLocaleDateString("fr-MA")}
              </p>
            )}
            {invoice.due_date && (
              <p className="text-sm text-muted-foreground">
                Échéance : {new Date(invoice.due_date).toLocaleDateString("fr-MA")}
              </p>
            )}
            <div className="mt-2">{statusBadge(invoice.status, invoice.balance_due, invoice.total)}</div>
          </div>
        </div>

        {/* Client Info */}
        <div className="mb-8 p-4 bg-muted/50 rounded-lg">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Client</h3>
          <p className="font-semibold text-lg">{invoice.entity.name}</p>
          {invoice.entity.address && (
            <p className="text-sm">{invoice.entity.address}</p>
          )}
          {invoice.entity.phone && (
            <p className="text-sm">Tel: {invoice.entity.phone}</p>
          )}
          {invoice.entity.ice && (
            <p className="text-sm">ICE: {invoice.entity.ice}</p>
          )}
        </div>

        {/* Line Items */}
        <table className="w-full mb-8 text-sm">
          <thead>
            <tr className="border-b-2 border-foreground/20">
              <th className="text-left py-2 font-medium">Description</th>
              <th className="text-center py-2 font-medium w-20">Qté</th>
              <th className="text-right py-2 font-medium w-32">Prix unitaire</th>
              <th className="text-right py-2 font-medium w-32">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line) => (
              <tr key={line.id} className="border-b">
                <td className="py-3">
                  <div className="font-medium">
                    {line.product?.name || line.description || "—"}
                  </div>
                  {line.product?.reference && (
                    <div className="text-xs text-muted-foreground">
                      SKU: {line.product.reference}
                    </div>
                  )}
                  {line.override_reason && (
                    <div className="text-xs text-amber-600 italic">
                      {line.override_reason}
                    </div>
                  )}
                </td>
                <td className="py-3 text-center">{line.qty}</td>
                <td className="py-3 text-right">
                  {line.override_price !== null && line.override_price !== line.catalog_price ? (
                    <div>
                      <span className="line-through text-muted-foreground text-xs">
                        {formatCurrency(line.catalog_price)}
                      </span>
                      <br />
                      <span className="text-blue-600 font-medium">
                        {formatCurrency(line.unit_price)}
                      </span>
                    </div>
                  ) : (
                    formatCurrency(line.unit_price)
                  )}
                </td>
                <td className="py-3 text-right font-medium">
                  {formatCurrency(line.line_total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sous-total</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">TVA ({invoice.tax_rate}%)</span>
              <span>{formatCurrency(invoice.tax_amount)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
            {invoice.amount_paid > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Payé</span>
                <span>–{formatCurrency(invoice.amount_paid)}</span>
              </div>
            )}
            {invoice.balance_due > 0 && (
              <div className="flex justify-between text-base font-bold text-red-600 border-t pt-2">
                <span>Solde impayé</span>
                <span>{formatCurrency(invoice.balance_due)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Payment History */}
        {invoice.payments.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Historique des paiements</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1">Date</th>
                  <th className="text-left py-1">Méthode</th>
                  <th className="text-left py-1">Payé par</th>
                  <th className="text-right py-1">Montant</th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="py-1">
                      {p.payment_date
                        ? new Date(p.payment_date).toLocaleDateString("fr-MA")
                        : "—"}
                    </td>
                    <td className="py-1 capitalize">{p.method}</td>
                    <td className="py-1">{p.paidByEntity.name}</td>
                    <td className="py-1 text-right font-medium">
                      {formatCurrency(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {invoice.notes && (
          <div className="mb-8 p-4 bg-muted/30 rounded-lg text-sm">
            <p className="font-medium text-muted-foreground mb-1">Notes</p>
            <p>{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {paymentOpen && (
        <PaymentModal
          invoiceId={invoice.id}
          balanceDue={invoice.balance_due}
          defaultEntityId={invoice.entity.id}
          entities={allEntities}
          onClose={() => setPaymentOpen(false)}
        />
      )}
    </>
  )
}
