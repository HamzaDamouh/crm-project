"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  ShoppingCart, 
  ShoppingBag,
  FileText, 
  Package, 
  Users, 
  Truck,
  CalendarCheck, 
  CreditCard 
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const navItems = [
  { title: "Tableau de bord", url: "/dashboard", icon: LayoutDashboard },
  { title: "Ventes", url: "/transactions", icon: ShoppingCart },
  { title: "Achats", url: "/achats", icon: ShoppingBag },
  { title: "Factures", url: "/invoices", icon: FileText },
  { title: "Stock", url: "/stock", icon: Package },
  { title: "Clients", url: "/clients", icon: Users },
  { title: "Fournisseurs", url: "/fournisseurs", icon: Truck },
  { title: "Clôture mensuelle", url: "/month-end", icon: CalendarCheck },
  { title: "Paiements", url: "/payments", icon: CreditCard },
]

export function AppSidebar({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <h2 className="text-xl font-bold tracking-tight">Easy Bricolage SARL</h2>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.url || (item.url !== "/" && pathname.startsWith(item.url))
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.title}
                      render={<Link href={item.url} />}
                    >
                      <item.icon />
                      <span className="flex-1">{item.title}</span>
                      {pendingCount > 0 && (item.url === "/transactions" || item.url === "/month-end") && (
                        <span className="ml-auto inline-flex h-5 items-center rounded-full bg-red-600 px-2 text-xs font-medium text-white">
                          {pendingCount}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
