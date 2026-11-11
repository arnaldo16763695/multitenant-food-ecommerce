"use client"

import * as React from "react"
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet"
import { LoaderCircle, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type BranchLocationMapPickerProps = {
  readonly tenantSlug: string
  readonly latitude: number | null
  readonly longitude: number | null
  readonly onLocationSelected: (latitude: number, longitude: number) => void
}

type GeocodeResult = {
  readonly label: string
  readonly latitude: number
  readonly longitude: number
}

// Ciudad de Mexico -- a reasonable default center when the branch has no coordinates yet, so the
// map isn't just a blank ocean tile on first open.
const DEFAULT_CENTER: readonly [number, number] = [19.4326, -99.1332]
const DEFAULT_ZOOM = 5
const PINNED_ZOOM = 15

export function BranchLocationMapPicker({ tenantSlug, latitude, longitude, onLocationSelected }: BranchLocationMapPickerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<LeafletMap | null>(null)
  const markerRef = React.useRef<LeafletMarker | null>(null)
  const onLocationSelectedRef = React.useRef(onLocationSelected)
  onLocationSelectedRef.current = onLocationSelected

  const [searchQuery, setSearchQuery] = React.useState("")
  const [searchResults, setSearchResults] = React.useState<readonly GeocodeResult[]>([])
  const [isSearching, setIsSearching] = React.useState(false)
  const [searchError, setSearchError] = React.useState("")

  React.useEffect(() => {
    let isCancelled = false

    async function initializeMap() {
      if (!containerRef.current) {
        return
      }

      const L = await import("leaflet")

      if (isCancelled || !containerRef.current) {
        return
      }

      // Leaflet's default marker icon resolves relative to the page URL, which breaks under
      // bundlers unless pointed explicitly at real image URLs -- use the same pinned version as
      // package.json instead of shipping/copying the PNGs into public/.
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      })

      const hasInitialCoordinates = latitude != null && longitude != null
      const initialCenter: [number, number] = hasInitialCoordinates ? [latitude, longitude] : [...DEFAULT_CENTER]

      const map = L.map(containerRef.current).setView(initialCenter, hasInitialCoordinates ? PINNED_ZOOM : DEFAULT_ZOOM)

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map)

      if (hasInitialCoordinates) {
        markerRef.current = L.marker(initialCenter, { draggable: true }).addTo(map)
        markerRef.current.on("dragend", () => {
          const position = markerRef.current?.getLatLng()
          if (position) {
            onLocationSelectedRef.current(position.lat, position.lng)
          }
        })
      }

      map.on("click", (event: { latlng: { lat: number; lng: number } }) => {
        const { lat, lng } = event.latlng

        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng])
        } else {
          markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map)
          markerRef.current.on("dragend", () => {
            const position = markerRef.current?.getLatLng()
            if (position) {
              onLocationSelectedRef.current(position.lat, position.lng)
            }
          })
        }

        onLocationSelectedRef.current(lat, lng)
      })

      mapRef.current = map
    }

    void initializeMap()

    return () => {
      isCancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // Intentionally mount once per dialog open (the dialog remounts this component fresh each
    // time it opens) -- re-running this effect on every latitude/longitude change would tear
    // down and recreate the whole map on every click, fighting the click handler itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function recenterOn(nextLatitude: number, nextLongitude: number) {
    const map = mapRef.current

    if (!map) {
      return
    }

    import("leaflet").then((L) => {
      if (markerRef.current) {
        markerRef.current.setLatLng([nextLatitude, nextLongitude])
      } else {
        markerRef.current = L.marker([nextLatitude, nextLongitude], { draggable: true }).addTo(map)
        markerRef.current.on("dragend", () => {
          const position = markerRef.current?.getLatLng()
          if (position) {
            onLocationSelectedRef.current(position.lat, position.lng)
          }
        })
      }

      map.setView([nextLatitude, nextLongitude], PINNED_ZOOM)
    })
  }

  async function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmedQuery = searchQuery.trim()

    if (!trimmedQuery) {
      return
    }

    setIsSearching(true)
    setSearchError("")
    setSearchResults([])

    try {
      const response = await fetch(`/api/admin/${tenantSlug}/geocode?q=${encodeURIComponent(trimmedQuery)}`)
      const data = (await response.json()) as { results?: GeocodeResult[]; error?: string }

      if (!response.ok) {
        setSearchError(data.error ?? "No pudimos buscar esa dirección.")
        return
      }

      if (!data.results?.length) {
        setSearchError("No encontramos resultados para esa búsqueda.")
        return
      }

      setSearchResults(data.results)
    } catch {
      setSearchError("No pudimos buscar esa dirección.")
    } finally {
      setIsSearching(false)
    }
  }

  function handleResultClick(result: GeocodeResult) {
    recenterOn(result.latitude, result.longitude)
    onLocationSelected(result.latitude, result.longitude)
    setSearchResults([])
    setSearchQuery(result.label)
  }

  return (
    <div className="space-y-2">
      <form onSubmit={(event) => void handleSearchSubmit(event)} className="flex gap-2">
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Buscar una dirección..."
          className="flex-1"
        />
        <Button type="submit" variant="outline" size="icon-sm" disabled={isSearching}>
          {isSearching ? <LoaderCircle className="animate-spin" /> : <Search />}
        </Button>
      </form>

      {searchError ? <p className="text-xs text-destructive">{searchError}</p> : null}

      {searchResults.length > 0 ? (
        <div className="grid gap-1 rounded-lg border border-border bg-card p-1 text-sm">
          {searchResults.map((result, index) => (
            <button
              key={`${result.latitude}-${result.longitude}-${index}`}
              type="button"
              className="rounded-md px-2 py-1.5 text-left text-card-foreground hover:bg-secondary"
              onClick={() => handleResultClick(result)}
            >
              {result.label}
            </button>
          ))}
        </div>
      ) : null}

      <div ref={containerRef} className="h-64 w-full overflow-hidden rounded-[1rem] border border-border" />
      <p className="text-xs text-muted-foreground">Haz click en el mapa (o arrastra el marcador) para fijar la ubicación de la sucursal.</p>
    </div>
  )
}
