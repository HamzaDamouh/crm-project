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

import { ClerkProvider, UserButton } from "@clerk/nextjs";
import { frFR } from "@clerk/localizations";
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
    <ClerkProvider
      localization={frFR}
      appearance={{
        variables: {
          colorPrimary: "#ED0007",
          colorTextOnPrimaryBackground: "#ffffff",
        },
        elements: {
          formButtonPrimary:
            "bg-[#ED0007] hover:bg-[#c50006] text-white shadow-sm",
          footerActionLink: "text-[#ED0007] hover:text-[#c50006]",
          headerTitle: "text-gray-900 font-bold",
          headerSubtitle: "text-gray-500",
          socialButtonsBlockButton:
            "border border-gray-200 hover:border-gray-300 hover:bg-gray-50",
          card: "shadow-lg rounded-2xl",
        },
      }}
    >
      <html lang="fr" className={cn("font-sans", geistSans.variable)}>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
        >
          
          <SidebarProvider defaultOpen>
            <AppSidebar pendingCount={pendingCount} />
            <main className="flex-1 flex flex-col w-full" style={{ paddingLeft: "16rem" }}>
              <div className="flex h-12 items-center px-4 border-b justify-between">
                <SidebarTrigger />
                <UserButton
                  afterSignOutUrl="/sign-in"
                  appearance={{
                    elements: {
                      avatarBox: "w-9 h-9 ring-2 ring-[#ED0007]/20 hover:ring-[#ED0007]/40 transition-all",
                    },
                  }}
                />
              </div>
              {children}
            </main>
          </SidebarProvider>
          <Toaster richColors position="top-right" />
        </body>
      </html>
    </ClerkProvider>
  );
}
