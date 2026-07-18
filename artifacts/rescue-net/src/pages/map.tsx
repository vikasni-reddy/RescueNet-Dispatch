import { Layout } from "@/components/layout"
import { useListIncidents, useListResources } from "@workspace/api-client-react"
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import useLeafletIconFix, { createPulseIcon, createResourceIcon } from "@/lib/map-utils"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Link } from "wouter"
import { Button } from "@/components/ui/button"

const URGENCY_COLORS: Record<string, string> = {
  critical: "#ef4444", // red-500
  high: "#f97316",     // orange-500
  medium: "#eab308",   // yellow-500
  low: "#22c55e",      // green-500
}

export default function MapPage() {
  useLeafletIconFix()
  
  const { data: incidents } = useListIncidents({}, { query: { queryKey: ["incidents"] } })
  const { data: resources } = useListResources({}, { query: { queryKey: ["resources"] } })

  // Default center (San Francisco)
  const defaultCenter: [number, number] = [37.7749, -122.4194]

  const validIncidents = incidents?.filter(i => i.lat != null && i.lng != null) || []
  const validResources = resources?.filter(r => r.lat != null && r.lng != null) || []

  // Generate polylines for assigned resources
  const assignments = validIncidents
    .filter(i => i.assignedResourceId && i.lat && i.lng)
    .map(incident => {
      const resource = validResources.find(r => r.id === incident.assignedResourceId)
      if (resource && resource.lat && resource.lng) {
        return {
          id: `line-${incident.id}-${resource.id}`,
          positions: [
            [resource.lat, resource.lng] as [number, number],
            [incident.lat!, incident.lng!] as [number, number]
          ]
        }
      }
      return null
    }).filter(Boolean) as { id: string, positions: [[number, number], [number, number]] }[]

  return (
    <Layout>
      <div className="flex-1 relative h-full w-full">
        {/* Map Overlay HUD */}
        <div className="absolute top-4 left-4 z-[400] flex gap-2">
          <Card className="p-3 bg-background/90 backdrop-blur border-border shadow-md">
            <h3 className="text-sm font-bold mb-2">Live Map Key</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-critical border border-white"></div>
                <span>Critical</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500 border border-white"></div>
                <span>Resource Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-high border border-white"></div>
                <span>High</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-slate-500 border border-white"></div>
                <span>Resource Busy</span>
              </div>
            </div>
          </Card>
        </div>

        <MapContainer 
          center={defaultCenter} 
          zoom={13} 
          style={{ height: '100%', width: '100%', background: '#1e1e24' }}
          zoomControl={false}
        >
          {/* Dark themed map tiles */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {validIncidents.map(incident => (
            <Marker 
              key={`inc-${incident.id}`} 
              position={[incident.lat!, incident.lng!]}
              icon={createPulseIcon(URGENCY_COLORS[incident.urgency] || URGENCY_COLORS.low)}
            >
              <Popup className="incident-popup">
                <div className="p-1 min-w-[200px]">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold">INC-{incident.id}</span>
                    <Badge variant={incident.urgency as any} className="text-[10px]">{incident.urgency}</Badge>
                  </div>
                  <p className="text-sm mb-3 line-clamp-2">{incident.summary || incident.rawText}</p>
                  <Link href={`/incidents/${incident.id}`}>
                    <Button size="sm" className="w-full h-7">View Details</Button>
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}

          {validResources.map(resource => (
            <Marker 
              key={`res-${resource.id}`} 
              position={[resource.lat, resource.lng]}
              icon={createResourceIcon(resource.type, resource.isAvailable)}
            >
              <Popup>
                <div className="p-1 min-w-[150px]">
                  <div className="font-bold mb-1">{resource.name}</div>
                  <div className="text-xs text-muted-foreground capitalize mb-2">{resource.type}</div>
                  <Badge variant={resource.isAvailable ? "outline" : "secondary"}>
                    {resource.status}
                  </Badge>
                </div>
              </Popup>
            </Marker>
          ))}

          {assignments.map(line => (
            <Polyline 
              key={line.id} 
              positions={line.positions} 
              pathOptions={{ color: '#3b82f6', weight: 2, dashArray: '5, 5', opacity: 0.6 }} 
            />
          ))}
        </MapContainer>
      </div>
      
      {/* Required CSS for popup dark theme to match our app */}
      <style>{`
        .leaflet-popup-content-wrapper {
          background-color: hsl(var(--card));
          color: hsl(var(--card-foreground));
          border: 1px solid hsl(var(--border));
          border-radius: var(--radius);
        }
        .leaflet-popup-tip {
          background-color: hsl(var(--card));
          border: 1px solid hsl(var(--border));
        }
        .leaflet-container a.leaflet-popup-close-button {
          color: hsl(var(--muted-foreground));
        }
      `}</style>
    </Layout>
  )
}
