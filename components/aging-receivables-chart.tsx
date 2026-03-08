"use client"

import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts"
import { formatCurrency } from "@/lib/utils"

interface AgingBucket {
  range: string
  amount: number
}

export function AgingReceivablesChart({ data }: { data: AgingBucket[] }) {
  // Use a softer color palette for the buckets
  const COLORS = ["hsl(220, 70%, 50%)", "hsl(35, 90%, 50%)", "hsl(0, 80%, 60%)"]

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <XAxis 
          dataKey="range" 
          tick={{ fontSize: 12 }} 
          axisLine={false}
          tickLine={false}
        />
        <YAxis 
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} 
          tick={{ fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip 
          formatter={(value: any) => [formatCurrency(Number(value)), "Montant dû"]}
          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        />
        <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
