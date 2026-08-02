import { ImageIcon } from "lucide-react"

import { PlatformMobileHomeBanners } from "@/components/platform/platform-mobile-home-banners"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getPlatformMobileHomeBannerOptions, getPlatformMobileHomeBanners } from "@/lib/services/platform"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export default async function PlatformHomeBannersPage() {
  const supabase = createSupabaseAdminClient() ?? (await createSupabaseServerClient())

  if (!supabase) {
    throw new Error("Supabase client is not configured.")
  }

  const [banners, options] = await Promise.all([
    getPlatformMobileHomeBanners(supabase),
    getPlatformMobileHomeBannerOptions(supabase),
  ])

  return (
    <section className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Banners</CardDescription>
            <CardTitle className="text-3xl">{banners.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Piezas manuales disponibles para la home mobile.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Activos</CardDescription>
            <CardTitle className="text-3xl">{banners.filter((banner) => banner.isActive).length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Son los que pueden desplazar el fallback derivado en `/api/mobile/home`.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Tenants elegibles</CardDescription>
            <CardTitle className="text-3xl">{options.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Solo tenants con storefront publicado aparecen como opcion.</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <ImageIcon className="size-5 text-orange-700" />
            Home banners mobile
          </CardTitle>
          <CardDescription>
            Cuando existan banners activos, `/api/mobile/home` los devolvera antes de usar banners derivados desde sucursales cercanas o featured brands.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlatformMobileHomeBanners banners={banners} options={options} />
        </CardContent>
      </Card>
    </section>
  )
}
