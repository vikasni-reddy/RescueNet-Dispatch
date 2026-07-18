import { useEffect, useRef } from "react"
import { useMap } from "react-leaflet"
import L from "leaflet"

// Fix for default Leaflet marker icons not loading in React
export default function useLeafletIconFix() {
  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    })
  }, [])
}

// Fit map bounds to all valid incident positions; falls back to Hyderabad center
export function FitBoundsToIncidents({ positions }: { positions: [number, number][] }) {
  const map = useMap()
  const fitted = useRef(false)

  useEffect(() => {
    if (fitted.current) return
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions)
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
      fitted.current = true
    }
  }, [positions.length]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

export function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom)
  }, [center, zoom, map])
  return null
}

export const createPulseIcon = (colorHex: string) => {
  return L.divIcon({
    className: "custom-pulse-icon",
    html: `
      <div style="position:relative;display:flex;justify-content:center;align-items:center;width:20px;height:20px;">
        <div style="position:absolute;width:100%;height:100%;border-radius:50%;background-color:${colorHex};opacity:0.4;animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="position:relative;width:12px;height:12px;border-radius:50%;background-color:${colorHex};border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.5);"></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -14],
  })
}

const RESOURCE_TYPE_EMOJI: Record<string, string> = {
  medical: "🏥",
  rescue: "🚁",
  boat: "⛵",
  fire: "🚒",
  police: "🚔",
  food: "🥫",
  shelter: "🏕",
  other: "📦",
}

export const createResourceIcon = (type: string, isAvailable: boolean) => {
  const color = isAvailable ? "#3b82f6" : "#64748b"
  const emoji = RESOURCE_TYPE_EMOJI[type] ?? "📦"
  return L.divIcon({
    className: "custom-resource-icon",
    html: `
      <div style="width:28px;height:28px;background-color:${color};border:2px solid white;border-radius:6px;display:flex;justify-content:center;align-items:center;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,0.4);">
        ${emoji}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  })
}
