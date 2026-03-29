import { cookies } from "next/headers"

import { AdminThemeProvider, type AdminTheme } from "@/components/admin/admin-theme-provider"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

type AdminLayoutProps = {
  readonly children: React.ReactNode
  readonly params: Promise<{
    tenantSlug: string
  }>
}

export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const cookieStore = await cookies()
  const { tenantSlug } = await params
  const initialTheme = cookieStore.get("admin-theme")?.value === "dark" ? "dark" : "light"

  return (
    <AdminThemeProvider initialTheme={initialTheme as AdminTheme}>
      <SidebarProvider>
        <AppSidebar tenantSlug={tenantSlug} />
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
            <SidebarTrigger />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Admin</p>
              <h1 className="text-sm font-semibold text-foreground">Panel operativo</h1>
            </div>
          </header>
          <div className="flex flex-1 flex-col">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </AdminThemeProvider>
  )
}
