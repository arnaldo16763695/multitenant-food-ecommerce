"use client"

import type { ReactNode } from "react"

import { AdminThemeProvider, type AdminTheme } from "@/components/admin/admin-theme-provider"
import { PlatformSidebar } from "@/components/platform/platform-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

type PlatformShellProps = {
  readonly initialTheme: AdminTheme
  readonly user: {
    name: string
    email: string
    avatar: string
  }
  readonly children: ReactNode
}

export function PlatformShell({ initialTheme, user, children }: PlatformShellProps) {
  return (
    <AdminThemeProvider initialTheme={initialTheme}>
      <SidebarProvider>
        <PlatformSidebar user={user} />
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
            <SidebarTrigger />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Platform</p>
              <h1 className="text-sm font-semibold text-foreground">Panel del SaaS</h1>
            </div>
          </header>
          <div className="flex flex-1 flex-col">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </AdminThemeProvider>
  )
}
