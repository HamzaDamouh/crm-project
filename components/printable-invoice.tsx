import * as React from "react"
import { formatCurrency, numberToFrenchWords } from "@/lib/utils"

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

interface Entity {
  id: number
  name: string
  phone: string | null
  email: string | null
  address: string | null
  ice: string | null
}

interface Payment {
  id: number
  amount: number
  method: string
  payment_date: string | null
  cheque_number: string | null
  paidByEntity: { name: string }
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

interface PrintableInvoiceProps {
  invoice: Invoice
}

export const PrintableInvoice = React.forwardRef<HTMLDivElement, PrintableInvoiceProps>(
  ({ invoice }, ref) => {
    // Determine the type label
    const typeLabel = invoice.type === "credit_note" ? "AVOIR" : "FACTURE"

    // Format dates
    const dateStr = invoice.issue_date
      ? new Date(invoice.issue_date).toLocaleDateString("fr-MA")
      : new Date().toLocaleDateString("fr-MA")

    return (
      <div
        ref={ref}
        className="print:block hidden bg-white text-black font-sans leading-tight print:break-inside-avoid"
        style={{
          width: "210mm",
          minHeight: "297mm",
          padding: "20mm 15mm 15mm 15mm", // top, right, bottom, left
          position: "relative",
          margin: "0 auto",
        }}
      >
        {/* Header - Easy Bricolage sarl */}
        <div className="flex justify-center border-b-[5px] border-b-blue-900 border-t-[2px] border-t-red-800 pb-2 pt-2 mb-12">
          <h1 className="text-4xl font-extrabold text-blue-900 uppercase tracking-wide">
            EASY BRICOLAGE <span className="text-3xl">- sarl</span>
          </h1>
        </div>

        {/* Date and Client Info */}
        <div className="flex justify-end mb-6">
          <div className="w-1/2 flex flex-col items-end hidden">
             {/* For future expansion if needed */}
          </div>
          <div className="w-[85%] max-w-[350px]">
            <div className="text-right text-sm font-semibold mb-2">
              Casablanca, le {dateStr}
            </div>
            <div className="border-[2px] border-black p-4 text-center">
              <div className="font-bold text-[16px] uppercase">{invoice.entity.name}</div>
              <div className="font-bold text-[14px] mt-1">{invoice.entity.address || ""}</div>
              {invoice.entity.ice && (
                <div className="font-bold text-[13px] mt-2">ICE:{invoice.entity.ice}</div>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Title Bar */}
        <div className="border-[2px] border-black text-center py-1 mb-6 font-bold text-lg bg-gray-100 print:bg-gray-100">
          {typeLabel} N° {invoice.invoice_number || `[PROVISOIRE #${invoice.id}]`}
        </div>

        {/* Main Items Table */}
        {/* Fill table to standard height using min-height or wrapper if needed, but standard is fine */}
        <table className="w-full border-collapse border-[2px] border-black text-[13px] mb-8">
          <thead>
            <tr className="border-[2px] border-black">
              <th className="border-r-[1px] border-black py-1 px-2 font-bold w-[15%]">Réf.</th>
              <th className="border-r-[1px] border-black py-1 px-2 font-bold w-[50%]">DESIGNATION</th>
              <th className="border-r-[1px] border-black py-1 px-2 font-bold w-[10%]">Qté</th>
              <th className="border-r-[1px] border-black py-1 px-2 font-bold w-[12.5%]">P.U HT</th>
              <th className="py-1 px-2 font-bold w-[12.5%]">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line, index) => (
              <tr key={index} className="border-b-[1px] border-black border-dashed font-semibold">
                <td className="border-r-[1px] border-black px-2 py-1 text-center font-bold">
                  {line.product?.reference || ""}
                </td>
                <td className="border-r-[1px] border-black px-2 py-1">
                  {line.product?.name || line.description || "—"}
                </td>
                <td className="border-r-[1px] border-black px-2 py-1 text-center">
                  {line.qty}
                </td>
                <td className="border-r-[1px] border-black px-2 py-1 text-right">
                  {formatCurrency(line.unit_price).replace(" MAD", "")}
                </td>
                <td className="px-2 py-1 text-right">
                  {formatCurrency(line.line_total).replace(" MAD", "")}
                </td>
              </tr>
            ))}
            {/* Pad the rest of the table if very few items so it doesn't look empty like the sample */}
            {Array.from({ length: Math.max(0, 10 - invoice.lines.length) }).map((_, i) => (
              <tr key={`empty-${i}`} className="border-b-[1px] border-black border-dashed h-6">
                <td className="border-r-[1px] border-black"></td>
                <td className="border-r-[1px] border-black"></td>
                <td className="border-r-[1px] border-black"></td>
                <td className="border-r-[1px] border-black"></td>
                <td></td>
              </tr>
            ))}
            
            {/* Totals Rows */}
            <tr className="border-t-[2px] border-black">
              <td colSpan={3} className="border-r-[1px] border-black"></td>
              <td className="border-r-[1px] border-black border-b-[1px] px-2 py-1 font-bold text-center">Total HT</td>
              <td className="border-b-[1px] border-black px-2 py-1 text-right font-bold">
                 {formatCurrency(invoice.subtotal).replace(" MAD", "")}
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="border-r-[1px] border-black"></td>
              <td className="border-r-[1px] border-black border-b-[1px] px-2 py-1 font-bold text-center">TVA {invoice.tax_rate > 0 ? invoice.tax_rate + "%" : "20%"}</td>
              <td className="border-b-[1px] border-black px-2 py-1 text-right font-bold">
                 {formatCurrency(invoice.tax_amount).replace(" MAD", "")}
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="border-r-[1px] border-black"></td>
              <td className="border-r-[1px] border-black px-2 py-1 font-bold text-center">Total TTC Dhs</td>
              <td className="px-2 py-1 text-right font-bold bg-gray-100 print:bg-gray-100">
                 {formatCurrency(invoice.total).replace(" MAD", "")}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Written Total & Footer Details */}
        <div className="font-bold text-[13px] mb-[2mm] text-center w-full max-w-[95%] mx-auto">
          Arrêtée la présente {typeLabel === "AVOIR" ? "Note" : "Facture"} à la somme de: 
          <span className="uppercase ml-1">{numberToFrenchWords(invoice.total)} DIRHAMS</span>
        </div>

        {/* Signature Area */}
        <div className="flex justify-between items-start mt-8">
           <div className="font-bold text-[13px]">
              Mode de Règlement : {(invoice.payments[0]?.method || "VIREMENT").toUpperCase()}
              {invoice.payments[0]?.cheque_number && ` (N° ${invoice.payments[0].cheque_number})`}
              <br />
              <span className="text-red-700">{/* Left empty for BL N° as requested */}</span>
           </div>
           
           {/* Cachet removed upon request */}
        </div>

        {/* Page Footer */}
        <div className="absolute bottom-[20mm] left-0 right-0 w-full text-center">
             <div className="font-bold text-sm mb-4">Page 1/1</div>
             <div className="border-t-[4px] border-t-red-800 border-b-[2px] border-b-blue-900 mx-[15mm] pt-2 pb-1">
                <div className="font-semibold text-[11px] leading-snug">
                  EASY BRICOLAGE - S.A.R.L - RC : 398823 - IF : 25110357 - ICE : 001911160000039<br/>
                  Taxe professionnelle : 36047825 - CNSS : 5945863<br/>
                  Adresse : 156, Lot Moulay Thami, BD HH24. OULFA - CASABLANCA<br/>
                  Tél: 0663635571 e-mail: abdeslam.damouh@gmail.com
                </div>
             </div>
        </div>

      </div>
    )
  }
)

PrintableInvoice.displayName = "PrintableInvoice"
