import { cookies } from "next/headers"

import { AdminWorkspacePreferenceSync } from "@/components/auth/admin-workspace-preference-sync"
import { PlatformShell } from "@/components/platform/platform-shell"
import { requirePlatformAccess } from "@/lib/auth/platform"

type PlatformLayoutProps = {
  readonly children: React.ReactNode
}

export default async function PlatformLayout({ children }: PlatformLayoutProps) {
  const cookieStore = await cookies()
  const initialTheme = cookieStore.get("admin-theme")?.value === "dark" ? "dark" : "light"
  const access = await requirePlatformAccess("/platform")

  return (
    <PlatformShell
      initialTheme={initialTheme}
      user={{
        name: access.profile.fullName,
        email: access.profile.email,
        avatar: "/placeholder.svg",
      }}
    >
      <AdminWorkspacePreferenceSync href="/platform" />
      {children}
    </PlatformShell>
  )
}
