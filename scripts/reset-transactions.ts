/**
 * Reset Script: Clears all transactional data while keeping Clients (Entity) and Products.
 *
 * Tables CLEARED:
 *   DebtTransfer, Payment, InvoiceLine, Invoice,
 *   DailySalesLog, StockMovement, PurchaseOrderLine, PurchaseOrder
 *
 * Tables KEPT (intact):
 *   Entity (clients/suppliers), Product, PriceTier, Category
 *
 * Also resets Entity.balance_due → 0 and Product.stock_qty → 0
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🔄 Starting database reset...")
  console.log("   Keeping: Entities (clients), Products, PriceTiers, Categories")
  console.log("   Clearing: Transactions, Invoices, Payments, Stock Movements, Purchase Orders\n")

  // Delete in order respecting foreign keys
  const debtTransfers = await prisma.debtTransfer.deleteMany()
  console.log(`  ✓ Deleted ${debtTransfers.count} debt transfers`)

  const payments = await prisma.payment.deleteMany()
  console.log(`  ✓ Deleted ${payments.count} payments`)

  const invoiceLines = await prisma.invoiceLine.deleteMany()
  console.log(`  ✓ Deleted ${invoiceLines.count} invoice lines`)

  const invoices = await prisma.invoice.deleteMany()
  console.log(`  ✓ Deleted ${invoices.count} invoices`)

  const dailySalesLogs = await prisma.dailySalesLog.deleteMany()
  console.log(`  ✓ Deleted ${dailySalesLogs.count} daily sales logs (transactions)`)

  const stockMovements = await prisma.stockMovement.deleteMany()
  console.log(`  ✓ Deleted ${stockMovements.count} stock movements`)

  const purchaseOrderLines = await prisma.purchaseOrderLine.deleteMany()
  console.log(`  ✓ Deleted ${purchaseOrderLines.count} purchase order lines`)

  const purchaseOrders = await prisma.purchaseOrder.deleteMany()
  console.log(`  ✓ Deleted ${purchaseOrders.count} purchase orders`)

  // Reset client balances to 0
  const entityReset = await prisma.entity.updateMany({
    data: { balance_due: 0 },
  })
  console.log(`  ✓ Reset balance_due to 0 for ${entityReset.count} entities`)

  // Reset product stock quantities to 0
  const productReset = await prisma.product.updateMany({
    data: { stock_qty: 0 },
  })
  console.log(`  ✓ Reset stock_qty to 0 for ${productReset.count} products`)

  // Count what remains
  const entityCount = await prisma.entity.count()
  const productCount = await prisma.product.count()
  const priceTierCount = await prisma.priceTier.count()
  const categoryCount = await prisma.category.count()

  console.log("\n✅ Database reset complete!")
  console.log(`   Remaining: ${entityCount} entities, ${productCount} products, ${priceTierCount} price tiers, ${categoryCount} categories`)
}

main()
  .catch((e) => {
    console.error("❌ Reset failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
