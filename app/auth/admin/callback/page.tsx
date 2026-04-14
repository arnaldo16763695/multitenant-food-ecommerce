import { AdminAuthCallback } from "@/components/auth/admin-auth-callback"

type AdminAuthCallbackPageProps = {
  readonly searchParams: Promise<{
    next?: string
  }>
}

export default async function AdminAuthCallbackPage({ searchParams }: AdminAuthCallbackPageProps) {
  const params = await searchParams

  return <AdminAuthCallback nextPath={params.next ?? "/auth/admin/login"} />
}
