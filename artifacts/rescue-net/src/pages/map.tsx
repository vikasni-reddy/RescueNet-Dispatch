import { Layout } from "@/components/layout"
import { useListIncidents, useListResources } from "@workspace/api-client-react"
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import useLeafletIconFix, { createPulseIcon, createResourceIcon, FitBoundsToIncidents } from "@/lib/map-utils"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Link } from "wouter"
import { Users, MapPin, Truck } from "lucide-react"

const URGENCY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high:     "#f97316",
  medium:   "#eab308",
  low:      "#22c55e",
}

// Hyderabad centre — never flashes San Francisco
const HYDERABAD: [number, number] = [17.3850, 78.4867]

export default function MapPage() {
  useLeafletIconFix()

  const { data: incidents, isLoading: incLoading } = useListIncidents(
    {}, { query: { queryKey: ["incidents"], refetchInterval: 30000 } }
  )
  const { data: resources, isLoading: resLoading } = useListResources(
    {}, { query: { queryKey: ["resources"], refetchInterval: 30000 } }
  )

  const validIncidents = incidents?.filter(i => i.lat != null && i.lng != null) ?? []
  const validResources = resources?.filter(r => r.lat != null && r.lng != null) ?? []

  const incidentPositions: [number, number][] = validIncidents.map(i => [i.lat!, i.lng!])

  // Polylines for dispatched resources
  const assignments = validIncidents
    .filter(i => i.assignedResourceId && i.lat && i.lng)
    .flatMap(incident => {
      const resource = validResources.find(r => r.id === incident.assignedResourceId)
      if (!resource) return []
      return [{
        id: `line-${incident.id}-${resource.id}`,
        positions: [
          [resource.lat, resource.lng] as [number, number],
          [incident.lat!,  incident.lng!] as [number, number],
        ],
      }]
    })

  const loading = incLoading || resLoading

  return (
    <Layout>
      <div className="flex-1 relative h-full w-full overflow-hidden">

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-[500] bg-background/70 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="w-64 h-6 rounded-full" />
              <Skeleton className="w-48 h-4 rounded-full" />
            </div>
          </div>
        )}

        {/* Legend HUD */}
        <div className="absolute top-4 left-4 z-[400]">
          <Card className="p-3 bg-background/90 backdrop-blur border-border shadow-lg text-xs">
            <h3 className="text-xs font-bold mb-2 uppercase tracking-wide text-muted-foreground">Map Key</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ef4444] border border-white/50" /><span>Critical</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-blue-500 border border-white/50" /><span>Resource ✓</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#f97316] border border-white/50" /><span>High</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-slate-500 border border-white/50" /><span>Resource ✗</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#eab308] border border-white/50" /><span>Medium</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 border border-blue-400 border-dashed rounded" /><span>En Route</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#22c55e] border border-white/50" /><span>Low</span></div>
            </div>
          </Card>
        </div>

        {/* Stats HUD */}
        <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
          <Card className="p-3 bg-background/90 backdrop-blur border-border shadow-lg text-xs min-w-[140px]">
            <div className="space-y-1.5">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Incidents</span>
                <span className="font-bold">{validIncidents.length}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Resources</span>
                <span className="font-bold">{validResources.length}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">En Route</span>
                <span className="font-bold text-blue-400">{assignments.length}</span>
              </div>
            </div>
          </Card>
        </div>

        <MapContainer
          center={HYDERABAD}
          zoom={12}
          style={{ height: "100%", width: "100%", background: "#1e1e24" }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* Auto-fit bounds to incidents once data loads */}
          {incidentPositions.length > 0 && (
            <FitBoundsToIncidents positions={incidentPositions} />
          )}

          {/* Incident markers */}
          {validIncidents.map(incident => (
            <Marker
              key={`inc-${incident.id}`}
              position={[incident.lat!, incident.lng!]}
              icon={createPulseIcon(URGENCY_COLORS[incident.urgency] ?? URGENCY_COLORS.low)}
            >
              <Popup className="incident-popup" maxWidth={280}>
                <div className="p-1 min-w-[240px]">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <span className="font-bold text-sm">INC-{String(incident.id).padStart(4, "0")}</span>
                    <Badge variant={incident.urgency as any} className="text-[10px] uppercase shrink-0">
                      {incident.urgency}
                    </Badge>
                  </div>

                  {/* Summary */}
                  <p className="text-sm mb-3 leading-snug">{incident.summary || incident.rawText}</p>

                  {/* Detail grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
                    <div className="text-muted-foreground">Priority Score</div>
                    <div className="font-bold">{incident.priorityScore ?? "—"}</div>

                    <div className="text-muted-foreground">People Affected</div>
                    <div className="font-medium flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {incident.peopleAffected ?? "Unknown"}
                    </div>

                    <div className="text-muted-foreground">Status</div>
                    <div className="font-medium capitalize">{incident.status?.replace("_", " ")}</div>

                    {incident.assignedResourceName && (
                      <>
                        <div className="text-muted-foreground">Assigned</div>
                        <div className="font-medium flex items-center gap-1 truncate">
                          <Truck className="w-3 h-3 shrink-0" />
                          <span className="truncate">{incident.assignedResourceName}</span>
                        </div>
                      </>
                    )}

                    {incident.address && (
                      <>
                        <div className="text-muted-foreground">Location</div>
                        <div className="font-medium truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{incident.address}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <Link href={`/incidents/${incident.id}`}>
                    <Button size="sm" className="w-full h-7 text-xs">Open Incident Details →</Button>
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Resource markers */}
          {validResources.map(resource => (
            <Marker
              key={`res-${resource.id}`}
              position={[resource.lat, resource.lng]}
              icon={createResourceIcon(resource.type, resource.isAvailable)}
            >
              <Popup maxWidth={240}>
                <div className="p-1 min-w-[200px]">
                  <div className="font-bold mb-0.5 text-sm">{resource.name}</div>
                  <div className="text-xs text-muted-foreground capitalize mb-2">{resource.type}</div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2">
                    <div className="text-muted-foreground">Status</div>
                    <div className="font-medium capitalize">{resource.status?.replace("_", " ")}</div>

                    <div className="text-muted-foreground">Available</div>
                    <div className="font-medium">
                      <Badge variant={resource.isAvailable ? "outline" : "secondary"} className="text-[10px]">
                        {resource.isAvailable ? "Yes" : "No"}
                      </Badge>
                    </div>

                    {resource.capacity != null && (
                      <>
                        <div className="text-muted-foreground">Capacity</div>
                        <div className="font-medium">{resource.capacity}</div>
                      </>
                    )}

                    {resource.assignedIncidentId && (
                      <>
                        <div className="text-muted-foreground">Assigned To</div>
                        <div className="font-medium">INC-{String(resource.assignedIncidentId).padStart(4, "0")}</div>
                      </>
                    )}

                    <div className="text-muted-foreground">Coordinates</div>
                    <div className="font-mono text-[10px]">{resource.lat.toFixed(4)}, {resource.lng.toFixed(4)}</div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Dispatch polylines */}
          {assignments.map(line => (
            <Polyline
              key={line.id}
              positions={line.positions}
              pathOptions={{ color: "#3b82f6", weight: 2.5, dashArray: "6, 4", opacity: 0.75 }}
            />
          ))}
        </MapContainer>
      </div>

      <style>{`
        .leaflet-popup-content-wrapper {
          background-color: hsl(var(--card));
          color: hsl(var(--card-foreground));
          border: 1px solid hsl(var(--border));
          border-radius: var(--radius);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        .leaflet-popup-tip {
          background-color: hsl(var(--card));
        }
        .leaflet-container a.leaflet-popup-close-button {
          color: hsl(var(--muted-foreground));
        }
        .leaflet-popup-content { margin: 12px; }
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </Layout>
  )
}
