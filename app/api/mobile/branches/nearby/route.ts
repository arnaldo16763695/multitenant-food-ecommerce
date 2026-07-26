import { getNearbyBranches } from "@/lib/data/mobile-nearby-branches"
import { mobileError, mobileJson } from "@/lib/mobile/api"

function parseCoordinate(value: string | null, label: string) {
  if (!value?.trim()) {
    return { ok: false as const, error: `${label} is required.` }
  }

  const parsedValue = Number(value)

  if (!Number.isFinite(parsedValue)) {
    return { ok: false as const, error: `${label} must be a valid number.` }
  }

  return { ok: true as const, value: parsedValue }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const latitudeResult = parseCoordinate(searchParams.get("lat"), "lat")

  if (!latitudeResult.ok) {
    return mobileError(400, latitudeResult.error)
  }

  const longitudeResult = parseCoordinate(searchParams.get("lng"), "lng")

  if (!longitudeResult.ok) {
    return mobileError(400, longitudeResult.error)
  }

  const limitParam = searchParams.get("limit")
  const parsedLimit = limitParam ? Number(limitParam) : undefined

  if (limitParam && (parsedLimit == null || !Number.isFinite(parsedLimit) || parsedLimit <= 0)) {
    return mobileError(400, "limit must be a positive number.")
  }

  const branches = await getNearbyBranches({
    latitude: latitudeResult.value,
    longitude: longitudeResult.value,
    limit: parsedLimit,
  })

  return mobileJson({ branches })
}
