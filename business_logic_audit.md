# Easy Bricolage CRM — Business Logic Audit

Full review of all functional features identifying **logic and business process issues** (not code style).

---

## 🔴 Critical Issues (Data Corruption Risk)

### 1. [generateInvoice](file:///c:/Users/Hamza/Desktop/crm-project/app/actions/transactions.ts#90-187) does NOT update entity `balance_due`

**File:** [transactions.ts](file:///c:/Users/Hamza/Desktop/crm-project/app/actions/transactions.ts)

When a direct invoice is created, the client's `balance_due` is **never incremented**, yet [recordPayment](file:///c:/Users/Hamza/Desktop/crm-project/app/actions/invoices.ts#16-97) **decrements** it when paying. This means:
- Client shows 0 MAD owed even though they have an open invoice of 5,000 MAD
- Paying that invoice will make their `balance_due` go **negative** (-5000)
- The `balance_due` warning on the transaction form is useless

> Compare with [generateConsolidatedInvoice](file:///c:/Users/Hamza/Desktop/crm-project/app/actions/month-end.ts#14-115) in [month-end.ts](file:///c:/Users/Hamza/Desktop/crm-project/app/actions/month-end.ts#L93-L96) which correctly does `balance_due: { increment: total }`.

---

### 2. [generateInvoice](file:///c:/Users/Hamza/Desktop/crm-project/app/actions/transactions.ts#90-187) and [saveAsTransaction](file:///c:/Users/Hamza/Desktop/crm-project/app/actions/transactions.ts#43-89) are NOT atomic

**File:** [transactions.ts](file:///c:/Users/Hamza/Desktop/crm-project/app/actions/transactions.ts)

Both functions perform multiple DB writes (create invoice → update stock for N products → create daily logs) as **separate queries** without a `$transaction` wrapper. If any step fails mid-way:
- Invoice exists but stock was only partially decremented
- Stock movements exist without matching invoice lines
- `DailySalesLog` entries are partially created

> Compare with [generateCreditNote](file:///c:/Users/Hamza/Desktop/crm-project/app/actions/returns.ts#12-139) in [returns.ts](file:///c:/Users/Hamza/Desktop/crm-project/app/actions/returns.ts#L70) and [createPurchaseOrder](file:///c:/Users/Hamza/Desktop/crm-project/app/actions/purchase-orders.ts#82-168) in [purchase-orders.ts](file:///c:/Users/Hamza/Desktop/crm-project/app/actions/purchase-orders.ts#L96) which correctly use `$transaction`.

---

### 3. Invoice numbering is inconsistent and will collide

| Action | Prefix | Logic | Problem |
|---|---|---|---|
| [generateInvoice](file:///c:/Users/Hamza/Desktop/crm-project/app/actions/transactions.ts#90-187) | `INV-YYYY-` | `lastInvoice.id + 1` | Uses **database ID**, not invoice count. If any invoice is deleted or a credit note is created, IDs can collide or skip. |
| [generateConsolidatedInvoice](file:///c:/Users/Hamza/Desktop/crm-project/app/actions/month-end.ts#14-115) | `FA-YYYY-` | `count + 1` | Uses count of all `type: "invoice"` records. If an invoice is deleted, numbers will be reused. |
| [generateCreditNote](file:///c:/Users/Hamza/Desktop/crm-project/app/actions/returns.ts#12-139) | `CN-YYYY-` | `count + 1` | Same reuse risk on deletion. |

**Business impact:** Duplicate invoice numbers in accounting, legal compliance issues (in Morocco, invoice numbers must be sequential and never reused).

---

### 4. [recordPayment](file:///c:/Users/Hamza/Desktop/crm-project/app/actions/invoices.ts#16-97) has a race condition with no optimistic locking

**File:** [invoices.ts](file:///c:/Users/Hamza/Desktop/crm-project/app/actions/invoices.ts)

Two simultaneous payments could both read `balance_due = 1000`, both pass the `amount > invoice.balance_due` check, and both succeed — resulting in `amount_paid > total` and `balance_due` going negative. There's no `$transaction` with a re-read or version check.

---

## 🟠 Important Logic Gaps

### 5. Credit notes don't adjust the original invoice

**File:** [returns.ts](file:///c:/Users/Hamza/Desktop/crm-project/app/actions/returns.ts)

When you generate a credit note against an original invoice:
- The original invoice's `balance_due` is **never reduced**
- Only the entity's `balance_due` is decremented
- The original invoice still shows "Impayé" even though a credit note was applied

In a real bricolage scenario: client returns 500 MAD of goods against Invoice #123 (total 2000 MAD). Invoice #123 should show `balance_due = 1500`, but it still shows 2000.

---

### 6. No guard against negative stock

**Files:** [transactions.ts](file:///c:/Users/Hamza/Desktop/crm-project/app/actions/transactions.ts), [purchase-orders-edit.ts](file:///c:/Users/Hamza/Desktop/crm-project/app/actions/purchase-orders-edit.ts)

Nothing prevents selling more than what's in stock. A product with `stock_qty = 3` can be sold in qty 100, making stock -97. The form shows stock info but doesn't enforce it. For a bricolage, this is a **real-world problem**: customers are told items are available, then the warehouse can't fulfill.

---

### 7. Walk-in transactions ([saveAsTransaction](file:///c:/Users/Hamza/Desktop/crm-project/app/actions/transactions.ts#43-89)) don't update entity balance

**File:** [transactions.ts](file:///c:/Users/Hamza/Desktop/crm-project/app/actions/transactions.ts)

When a sale is recorded as a daily log (cash sale), no `entity.balance_due` is updated. This is **correct for walk-ins** but incorrect when `entityId > 0` (a named client). A named client buying on credit via "Enregistrer la Transaction" will see no debt recorded — only the daily log exists.

Later, when month-end consolidation happens, the balance is finally updated. **But between the sale and month-end, the client's outstanding debt is invisible.** The transaction form's balance warning will not show the pending un-invoiced amounts.

---

### 8. Debt transfer logic has accounting issues

**File:** [invoices.ts](file:///c:/Users/Hamza/Desktop/crm-project/app/actions/invoices.ts#L71-L85)

When entity B pays an invoice belonging to entity A:
- Entity B's `balance_due` is decremented (line 66-68)
- Entity A's invoice gets paid
- A `DebtTransfer` record is created

**Problem:** Entity B's `balance_due` goes **negative** (they don't owe anything, they paid on someone else's behalf). This makes their account look like they overpaid. A proper system should track this as a credit/advance on entity B's account, or the debt transfer should increase entity A's balance and decrease entity B's.

---

### 9. [deletePurchaseOrder](file:///c:/Users/Hamza/Desktop/crm-project/app/actions/purchase-orders-edit.ts#6-58) has no return value on error

**File:** [purchase-orders-edit.ts](file:///c:/Users/Hamza/Desktop/crm-project/app/actions/purchase-orders-edit.ts#L54-L57)

The `catch` block only does `console.error` — it doesn't return `{ success: false, error: "..." }`. The client never knows the delete failed.

---

### 10. Month-end consolidation has no per-entity filtering

**File:** [month-end-form.tsx](file:///c:/Users/Hamza/Desktop/crm-project/components/month-end-form.tsx)

The form loads **all** uninvoiced daily sales logs regardless of entity. But when generating the consolidated invoice, the user assigns **one entity** to the invoice. This means:
- Sales to Client A, B, and C can all be bundled into one invoice assigned to Client A
- Client A's `balance_due` increases for goods they didn't buy

**Bricolage scenario:** During the month, you sold to 10 different contractors. At month-end, you accidentally invoice ALL sales to one contractor.

---

### 11. [generateInvoice](file:///c:/Users/Hamza/Desktop/crm-project/app/actions/transactions.ts#90-187) creates invoices with status `draft` but doesn't provide a finalization flow

Invoices created via the transaction form have `status: "draft"`, but there's **no action to convert draft → open**. The dashboard "Record Payment" button already works on drafts, so payments are recorded against a technically unfinished invoice. In accounting, you shouldn't accept payments on drafts.

---

## 🟡 Improvement Opportunities

### 12. No due date on direct invoices

[generateInvoice](file:///c:/Users/Hamza/Desktop/crm-project/app/actions/transactions.ts#90-187) sets `issue_date` but **not `due_date`**. Only [generateConsolidatedInvoice](file:///c:/Users/Hamza/Desktop/crm-project/app/actions/month-end.ts#14-115) sets a 30-day due date. This means aging receivables on the dashboard can't flag overdue direct invoices accurately.

---

### 13. Price tiers: fallback logic may give wrong price

**File:** [transaction-form.tsx](file:///c:/Users/Hamza/Desktop/crm-project/components/transaction-form.tsx#L59-L75)

[findBestTier](file:///c:/Users/Hamza/Desktop/crm-project/components/transaction-form.tsx#58-76) logic: if qty is **below** the minimum tier threshold (e.g., tiers start at qty 10, but customer buys 3), it falls back to the **lowest tier**. This gives the bulk discount price to small-quantity purchases — the opposite of what you want.

---

### 14. Dashboard "Total Sales" only counts `status: "paid"`

**File:** [dashboard/page.tsx](file:///c:/Users/Hamza/Desktop/crm-project/app/dashboard/page.tsx#L27-L36)

For a bricolage distributor, "Sales this month" should include all invoiced sales (including unpaid), not just paid ones. Currently, a month with 100,000 MAD in sales but only 20,000 MAD collected will show "20,000 MAD total sales," which is misleading for business decisions.

---

### 15. Supplier payment doesn't allow paying more than `balance_due`

**File:** [suppliers.ts](file:///c:/Users/Hamza/Desktop/crm-project/app/actions/suppliers.ts#L24-L26)

While this seems correct, it prevents advance payments to suppliers (common in bricolage: paying upfront for a large order that hasn't been received yet). The business might need the ability to make prepayments.

---

## 📋 Summary of Priorities

| Priority | Issue | Impact |
|---|---|---|
| 🔴 **P0** | #1 — Entity balance not updated on [generateInvoice](file:///c:/Users/Hamza/Desktop/crm-project/app/actions/transactions.ts#90-187) | Corrupts all client balances |
| 🔴 **P0** | #2 — No `$transaction` in [generateInvoice](file:///c:/Users/Hamza/Desktop/crm-project/app/actions/transactions.ts#90-187) / [saveAsTransaction](file:///c:/Users/Hamza/Desktop/crm-project/app/actions/transactions.ts#43-89) | Partial data on any failure |
| 🔴 **P0** | #3 — Invoice numbering will produce duplicates | Legal compliance risk |
| 🔴 **P0** | #4 — Race condition on payments | Overpayment / negative balances |
| 🟠 **P1** | #5 — Credit notes don't adjust original invoice | Misleading invoice statuses |
| 🟠 **P1** | #6 — No negative stock guard | Phantom inventory |
| 🟠 **P1** | #7 — Walk-in sales don't track interim debt | Hidden receivables |
| 🟠 **P1** | #8 — Debt transfer makes payer balance negative | Accounting imbalance |
| 🟠 **P1** | #10 — Month-end doesn't filter by entity | Wrong client invoiced |
| 🟡 **P2** | #9, #11, #12, #13, #14, #15 | UX and reporting gaps |

---

> [!IMPORTANT]
> **Before deploying to Vercel + Supabase**, the P0 issues MUST be fixed. They will cause real financial data corruption in production. Also note: the schema currently uses **SQLite** — you'll need to switch to **PostgreSQL** for Supabase, which requires a schema migration and testing pass.
