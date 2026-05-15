import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cache } from "react";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";
import prisma from "@/lib/db";

export const metadata: Metadata = {
  title: "Easy Bricolage SARL — CRM",
  description: "B2B sales management system for hardware tools business in Morocco",
};

// Deduplicate this query across the server render so it only runs once per request
const getPendingCount = cache(async () => {
  return prisma.dailySalesLog.count({
    where: { invoiced: false },
  });
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pendingCount = await getPendingCount();
  return (
    <html lang="en" className={cn("font-sans", geistSans.variable)}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <div className="bg-yellow-400 text-yellow-900 text-sm font-semibold text-center py-1">
          Environnement de démonstration — Easy Bricolage SARL 2024
        </div>
        <SidebarProvider defaultOpen>
          <AppSidebar pendingCount={pendingCount} />
          <main className="flex-1 flex flex-col w-full" style={{ paddingLeft: "16rem" }}>
            <div className="flex h-12 items-center px-4 border-b">
              <SidebarTrigger />
            </div>
            {children}
          </main>
        </SidebarProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
