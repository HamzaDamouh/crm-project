"use client"

import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"

interface ClientRevenue {
  name: string
  revenue: number
}

import { formatCurrency } from "@/lib/utils"

export function TopClientsChart({ data }: { data: ClientRevenue[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
        <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Tooltip formatter={(value: any) => [formatCurrency(Number(value)), "Chiffre d'affaires"]} />
        <Bar dataKey="revenue" fill="hsl(220, 70%, 50%)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
