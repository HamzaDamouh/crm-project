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
import { AgingReceivablesChart } from "@/components/aging-receivables-chart"
import { DollarSign, FileWarning, AlertTriangle, ShoppingBag, TrendingUp } from "lucide-react"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"
import { DashboardPaymentButton } from "@/components/dashboard-payment-button"

export default async function DashboardPage() {
  // ——— ROW 1: Stat Cards ———

  // Total Sales This Month (sum of paid invoices in current month)
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const paidInvoicesThisMonth = await prisma.invoice.findMany({
    where: {
      type: "invoice",
      issue_date: { gte: startOfMonth, lte: endOfMonth },
    },
    include: {
      lines: true,
    },
  })
  const totalSalesThisMonth = paidInvoicesThisMonth.reduce((sum: number, inv) => sum + inv.total, 0)

  // Gross Profit This Month (Revenue - COGS)
  const totalCOGSThisMonth = paidInvoicesThisMonth.reduce((sum: number, inv) => {
    const invoiceCOGS = inv.lines.reduce((lineSum: number, line) => {
      return lineSum + (line.qty * (line.unit_cost || 0))
    }, 0)
    return sum + invoiceCOGS
  }, 0)
  const grossProfitThisMonth = totalSalesThisMonth - totalCOGSThisMonth
  const profitMargin = totalSalesThisMonth > 0 ? (grossProfitThisMonth / totalSalesThisMonth) * 100 : 0

  // Unpaid Invoices
  const unpaidInvoices = await prisma.invoice.findMany({
    where: { balance_due: { gt: 0 } },
  })
  const unpaidCount = unpaidInvoices.length
  const unpaidTotal = unpaidInvoices.reduce((sum: number, inv) => sum + inv.balance_due, 0)

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

  // Fetch entities for payment modal
  const entities = await prisma.entity.findMany({
    where: { is_active: true },
    select: { id: true, name: true, balance_due: true, type: true },
    orderBy: { name: "asc" }
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
      return <Badge className="bg-green-600 text-white hover:bg-green-700">Payé</Badge>
    if (balanceDue > 0 && balanceDue < total)
      return <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">Partiel</Badge>
    return <Badge className="bg-red-600 text-white hover:bg-red-700">Impayé</Badge>
  }

  // Aging Receivables Calculation
  const agingBuckets = [
    { range: "0-30 days", amount: 0 },
    { range: "31-60 days", amount: 0 },
    { range: "60+ days", amount: 0 },
  ]

  unpaidInvoices.forEach((inv) => {
    const issueDate = new Date(inv.issue_date || inv.created_at)
    const diffMs = now.getTime() - issueDate.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays <= 30) {
      agingBuckets[0].amount += inv.balance_due
    } else if (diffDays <= 60) {
      agingBuckets[1].amount += inv.balance_due
    } else {
      agingBuckets[2].amount += inv.balance_due
    }
  })

  // ——— ROW 3: Recent Invoices ———
  // Recent 8 Invoices (defined above in Row 2 context previously)

  // ——— ROW 4: Stock Alerts ———
  // lowStockProducts already fetched above

  return (
    <div className="flex-1 space-y-6 p-6">
      <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>

      {/* ROW 1 — Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ventes totales ce mois</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSalesThisMonth)}</div>
            <p className="text-xs text-muted-foreground">
              {paidInvoicesThisMonth.length} facture(s) émise(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Factures impayées</CardTitle>
            <FileWarning className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(unpaidTotal)}</div>
            <p className="text-xs text-muted-foreground">{unpaidCount} facture(s) en attente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Marge brute ce mois</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(grossProfitThisMonth)}</div>
            <p className="text-xs text-muted-foreground">
              Ratio de marge: {profitMargin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Link href="/stock" className="block outline-none focus:ring-2 focus:ring-ring rounded-lg">
          <Card className="hover:bg-accent hover:text-accent-foreground transition-colors h-full cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Alertes stock bas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lowStockCount}</div>
              <p className="text-xs text-muted-foreground">produit(s) au seuil minimum</p>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ventes comptoir en attente</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingWalkIns}</div>
            <p className="text-xs text-muted-foreground">non encore facturé(s)</p>
          </CardContent>
        </Card>
      </div>

      {/* ROW 2 — Charts (Side-by-side) */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Aging Receivables Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Âge des créances (Aging Receivables)</CardTitle>
          </CardHeader>
          <CardContent>
            <AgingReceivablesChart data={agingBuckets} />
          </CardContent>
        </Card>

        {/* Top 5 Clients by Revenue */}
        <Card>
          <CardHeader>
            <CardTitle>Meilleurs clients par chiffre d&apos;affaires</CardTitle>
          </CardHeader>
          <CardContent>
            {topClients.length > 0 ? (
              <TopClientsChart data={topClients} />
            ) : (
              <p className="text-muted-foreground text-sm">Aucune donnée de revenu pour le moment.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ROW 3 — Recent Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Factures récentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>N° de facture</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Statut</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentInvoices.map((inv) => (
                <TableRow key={inv.id}>
                   <TableCell className="font-medium">{inv.entity.name}</TableCell>
                  <TableCell>{inv.invoice_number || "—"}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(inv.total)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(inv.status, inv.balance_due, inv.total)}
                  </TableCell>
                  <TableCell className="text-right">
                    {(inv.status === "open" || inv.status === "draft") && inv.balance_due > 0 && (
                      <DashboardPaymentButton
                        invoiceId={inv.id}
                        balanceDue={inv.balance_due}
                        entities={entities}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ROW 3 — Stock Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Alertes stock bas (Cliquer pour créer un bon de commande)</CardTitle>
        </CardHeader>
        <CardContent>
          {lowStockProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Tous les produits sont au-dessus des niveaux de stock minimum.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Qté actuelle</TableHead>
                  <TableHead className="text-right">Minimum</TableHead>
                  <TableHead className="text-center">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockProducts.map((p) => {
                  const isCritical = p.stock_qty === 0
                  return (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium p-0">
                        <Link href={`/purchase-orders/new?productId=${p.id}`} className="block px-4 py-3">
                        {p.name}
                        </Link>
                      </TableCell>
                      <TableCell className="p-0">
                         <Link href={`/purchase-orders/new?productId=${p.id}`} className="block px-4 py-3">
                        {p.reference || "—"}
                        </Link>
                      </TableCell>
                      <TableCell className={`text-right font-bold p-0 ${isCritical ? "text-red-600" : "text-yellow-600"}`}>
                         <Link href={`/purchase-orders/new?productId=${p.id}`} className="block px-4 py-3">
                        {p.stock_qty}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right p-0">
                         <Link href={`/purchase-orders/new?productId=${p.id}`} className="block px-4 py-3">
                        {p.stock_min}
                        </Link>
                      </TableCell>
                      <TableCell className="text-center p-0">
                         <Link href={`/purchase-orders/new?productId=${p.id}`} className="block px-4 py-3">
                        {isCritical ? (
                          <Badge className="bg-red-600 text-white">Critique</Badge>
                        ) : (
                          <Badge className="bg-yellow-500 text-white">Bas</Badge>
                        )}
                        </Link>
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
