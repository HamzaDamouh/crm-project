import prisma from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TopClientsChart } from "@/components/top-clients-chart"
import { DollarSign, FileWarning, AlertTriangle, ShoppingBag } from "lucide-react"

export default async function DashboardPage() {
  // ——— ROW 1: Stat Cards ———

  // Total Sales This Month (sum of paid invoices in current month)
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const paidInvoicesThisMonth = await prisma.invoice.findMany({
    where: {
      status: "paid",
      issue_date: { gte: startOfMonth, lte: endOfMonth },
    },
  })
  const totalSalesThisMonth = paidInvoicesThisMonth.reduce((sum, inv) => sum + inv.total, 0)

  // Unpaid Invoices
  const unpaidInvoices = await prisma.invoice.findMany({
    where: { balance_due: { gt: 0 } },
  })
  const unpaidCount = unpaidInvoices.length
  const unpaidTotal = unpaidInvoices.reduce((sum, inv) => sum + inv.balance_due, 0)

  // Low Stock Alerts
  const allProducts = await prisma.product.findMany()
  const lowStockProducts = allProducts.filter((p) => p.stock_qty <= p.stock_min)
  const lowStockCount = lowStockProducts.length

  // Pending Walk-in Sales
  const pendingWalkIns = await prisma.dailySalesLog.count({
    where: { invoiced: false },
  })

  // ——— ROW 2: Recent Invoices + Top Clients ———

  // Recent 8 Invoices
  const recentInvoices = await prisma.invoice.findMany({
    take: 8,
    orderBy: { created_at: "desc" },
    include: { entity: true },
  })

  // Top 5 Clients by revenue (all time, from paid invoices)
  const allPaidInvoices = await prisma.invoice.findMany({
    where: { status: "paid", type: "invoice" },
    include: { entity: true },
  })
  const revenueByClient: Record<string, number> = {}
  for (const inv of allPaidInvoices) {
    const name = inv.entity.name
    revenueByClient[name] = (revenueByClient[name] || 0) + inv.total
  }
  const topClients = Object.entries(revenueByClient)
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // ——— ROW 3: Stock Alerts ———
  // lowStockProducts already fetched above

  function getStatusBadge(status: string, balanceDue: number, total: number) {
    if (status === "paid" || balanceDue === 0)
      return <Badge className="bg-green-600 text-white hover:bg-green-700">Paid</Badge>
    if (balanceDue > 0 && balanceDue < total)
      return <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">Partial</Badge>
    return <Badge className="bg-red-600 text-white hover:bg-red-700">Unpaid</Badge>
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

      {/* ROW 1 — Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Sales This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSalesThisMonth.toLocaleString()} MAD</div>
            <p className="text-xs text-muted-foreground">
              {paidInvoicesThisMonth.length} paid invoice(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Unpaid Invoices</CardTitle>
            <FileWarning className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unpaidTotal.toLocaleString()} MAD</div>
            <p className="text-xs text-muted-foreground">{unpaidCount} invoice(s) outstanding</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">product(s) at or below minimum</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Walk-in Sales</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingWalkIns}</div>
            <p className="text-xs text-muted-foreground">not yet invoiced</p>
          </CardContent>
        </Card>
      </div>

      {/* ROW 2 — Recent Invoices + Top Clients */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInvoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.entity.name}</TableCell>
                    <TableCell>{inv.invoice_number || "—"}</TableCell>
                    <TableCell className="text-right">
                      {inv.total.toLocaleString()} MAD
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(inv.status, inv.balance_due, inv.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top 5 Clients by Revenue */}
        <Card>
          <CardHeader>
            <CardTitle>Top Clients by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {topClients.length > 0 ? (
              <TopClientsChart data={topClients} />
            ) : (
              <p className="text-muted-foreground text-sm">No revenue data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ROW 3 — Stock Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {lowStockProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              All products are above minimum stock levels.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Current Qty</TableHead>
                  <TableHead className="text-right">Minimum</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockProducts.map((p) => {
                  const isCritical = p.stock_qty === 0
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.reference || "—"}</TableCell>
                      <TableCell className={`text-right font-bold ${isCritical ? "text-red-600" : "text-yellow-600"}`}>
                        {p.stock_qty}
                      </TableCell>
                      <TableCell className="text-right">{p.stock_min}</TableCell>
                      <TableCell className="text-center">
                        {isCritical ? (
                          <Badge className="bg-red-600 text-white">Critical</Badge>
                        ) : (
                          <Badge className="bg-yellow-500 text-white">Low</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
