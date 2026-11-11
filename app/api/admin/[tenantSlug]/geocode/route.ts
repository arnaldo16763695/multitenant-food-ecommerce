import { NextResponse } from "next/server"

import { requireAdminAccess } from "@/lib/auth/admin"

type GeocodeRouteContext = {
  readonly params: Promise<{
    tenantSlug: string
  }>
}

type NominatimResult = {
  display_name: string
  lat: string
  lon: string
}

// Proxies OpenStreetMap's free Nominatim geocoder server-side -- its usage policy requires a
// descriptive User-Agent (browsers won't let client-side fetch set one), and this keeps the
// request off the customer-facing surface entirely. Used only by the admin branch location map
// picker, which is low-frequency (setting up a branch), unlike checkout -- see
// components/account/customer-address-form.tsx for why customer-facing delivery addresses use
// browser geolocation instead of a geocoding API.
export async function GET(request: Request, context: GeocodeRouteContext) {
  const { tenantSlug } = await context.params
  await requireAdminAccess(tenantSlug)

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? ""

  if (!query) {
    return NextResponse.json({ error: "q is required." }, { status: 400 })
  }

  const nominatimUrl = new URL("https://nominatim.openstreetmap.org/search")
  nominatimUrl.searchParams.set("format", "json")
  nominatimUrl.searchParams.set("q", query)
  nominatimUrl.searchParams.set("limit", "5")

  try {
    const nominatimResponse = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "vz-food-admin/1.0 (branch location picker)",
        "Accept-Language": "es",
      },
    })

    if (!nominatimResponse.ok) {
      return NextResponse.json({ results: [] })
    }

    const data = (await nominatimResponse.json()) as NominatimResult[]

    const results = data
      .map((entry) => ({
        label: entry.display_name,
        latitude: Number(entry.lat),
        longitude: Number(entry.lon),
      }))
      .filter((entry) => Number.isFinite(entry.latitude) && Number.isFinite(entry.longitude))

    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
