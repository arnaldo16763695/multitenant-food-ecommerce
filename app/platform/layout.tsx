import { PlatformShell } from "@/components/platform/platform-shell"
import { requirePlatformAccess } from "@/lib/auth/platform"

type PlatformLayoutProps = {
  readonly children: React.ReactNode
}

export default async function PlatformLayout({ children }: PlatformLayoutProps) {
  const access = await requirePlatformAccess("/platform")

  return <PlatformShell userName={access.profile.fullName}>{children}</PlatformShell>
}
