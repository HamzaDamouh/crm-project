"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Search } from "lucide-react"

interface Client {
  id: number
  name: string
  type: string
  totalInvoiced: number
  totalPaid: number
  balance_due: number
  lastActivity: string
}

export function ClientsListClient({ clients }: { clients: Client[] }) {
  const router = useRouter()
  const [search, setSearch] = React.useState("")

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex-1 p-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Clients</h1>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Total Invoiced</TableHead>
                <TableHead className="text-right">Total Paid</TableHead>
                <TableHead className="text-right">Balance Due</TableHead>
                <TableHead>Last Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((client) => (
                <TableRow
                  key={client.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/clients/${client.id}`)}
                >
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {client.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {client.totalInvoiced.toLocaleString()} MAD
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    {client.totalPaid.toLocaleString()} MAD
                  </TableCell>
                  <TableCell className="text-right">
                    {client.balance_due > 0 ? (
                      <span className="text-red-600 font-semibold">
                        {client.balance_due.toLocaleString()} MAD
                      </span>
                    ) : (
                      <span className="text-muted-foreground">0 MAD</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(client.lastActivity).toLocaleDateString("fr-MA")}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No clients found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
