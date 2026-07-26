import { getMobileHome } from "@/lib/data/mobile-home"
import { mobileError, mobileJson } from "@/lib/mobile/api"

function parseCoordinate(value: string | null, label: string) {
  if (!value?.trim()) {
    return { ok: false as const, error: `${label} must be a valid number.` }
  }

  const parsedValue = Number(value)

  if (!Number.isFinite(parsedValue)) {
    return { ok: false as const, error: `${label} must be a valid number.` }
  }

  return { ok: true as const, value: parsedValue }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const latitudeParam = searchParams.get("lat")
  const longitudeParam = searchParams.get("lng")

  if ((latitudeParam == null) !== (longitudeParam == null)) {
    return mobileError(400, "lat and lng must be provided together.")
  }

  let latitude: number | undefined
  let longitude: number | undefined

  if (latitudeParam != null && longitudeParam != null) {
    const latitudeResult = parseCoordinate(latitudeParam, "lat")

    if (!latitudeResult.ok) {
      return mobileError(400, latitudeResult.error)
    }

    const longitudeResult = parseCoordinate(longitudeParam, "lng")

    if (!longitudeResult.ok) {
      return mobileError(400, longitudeResult.error)
    }

    latitude = latitudeResult.value
    longitude = longitudeResult.value
  }

  const home = await getMobileHome({ latitude, longitude })

  return mobileJson(home)
}
