import { Layout } from "@/components/layout"
import { useGetIncident, useGetResourceRecommendations, useGetIncidentTimeline, useAssignResource, useUpdateIncident, getGetIncidentQueryKey, getGetIncidentTimelineQueryKey } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertCircle, CheckCircle2, Clock, MapPin, Phone, Users, ShieldAlert,
  Cpu, Activity, Send, Info, Zap, Package, Tag, BarChart2, CircleDot,
  Flame, Droplets, Home, Stethoscope, ShieldCheck, Anchor, Utensils,
  FileText, BrainCircuit
} from "lucide-react"
import { useParams } from "wouter"
import { format } from "date-fns"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

// ─── Icon helpers ─────────────────────────────────────────────────────────────

function NeedIcon({ need }: { need: string }) {
  const map: Record<string, React.ReactNode> = {
    medical:  <Stethoscope className="w-4 h-4" />,
    rescue:   <ShieldCheck className="w-4 h-4" />,
    fire:     <Flame className="w-4 h-4" />,
    police:   <ShieldAlert className="w-4 h-4" />,
    food:     <Utensils className="w-4 h-4" />,
    water:    <Droplets className="w-4 h-4" />,
    shelter:  <Home className="w-4 h-4" />,
    boat:     <Anchor className="w-4 h-4" />,
  }
  return <>{map[need] ?? <AlertCircle className="w-4 h-4" />}</>
}

const NEED_COLORS: Record<string, string> = {
  medical:  "bg-red-500/15 text-red-400 border-red-500/30",
  rescue:   "bg-orange-500/15 text-orange-400 border-orange-500/30",
  fire:     "bg-amber-500/15 text-amber-400 border-amber-500/30",
  police:   "bg-blue-500/15 text-blue-400 border-blue-500/30",
  food:     "bg-green-500/15 text-green-400 border-green-500/30",
  water:    "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  shelter:  "bg-purple-500/15 text-purple-400 border-purple-500/30",
  boat:     "bg-teal-500/15 text-teal-400 border-teal-500/30",
  other:    "bg-secondary text-muted-foreground border-border",
}

const TIMELINE_ICONS: Record<string, React.ReactNode> = {
  "Report Received":                <FileText className="w-3 h-3" />,
  "AI Analysis Complete":           <BrainCircuit className="w-3 h-3" />,
  "Heuristic Analysis Applied":     <BrainCircuit className="w-3 h-3" />,
  "Resource Recommendation Generated": <Package className="w-3 h-3" />,
  "Resource Dispatched":            <Send className="w-3 h-3" />,
  "Incident Resolved":              <CheckCircle2 className="w-3 h-3" />,
  "Incident Closed":                <CheckCircle2 className="w-3 h-3" />,
}

function TimelineIcon({ action }: { action: string }) {
  for (const [key, icon] of Object.entries(TIMELINE_ICONS)) {
    if (action.includes(key) || key.includes(action)) return <>{icon}</>
  }
  return <CircleDot className="w-3 h-3" />
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function IncidentDetailPage() {
  const { id } = useParams()
  const incidentId = parseInt(id || "0", 10)
  const queryClient = useQueryClient()

  const [dispatchingResId, setDispatchingResId] = useState<number | null>(null)

  const { data: incident, isLoading: incidentLoading } = useGetIncident(incidentId, {
    query: { enabled: !!incidentId, queryKey: getGetIncidentQueryKey(incidentId), refetchInterval: 8000 }
  })

  const { data: recommendations, isLoading: recsLoading } = useGetResourceRecommendations(incidentId, {
    query: { enabled: !!incidentId && incident?.status === "pending", queryKey: ["recommendations", incidentId] }
  })

  const { data: timeline, isLoading: timelineLoading } = useGetIncidentTimeline(incidentId, {
    query: { enabled: !!incidentId, queryKey: getGetIncidentTimelineQueryKey(incidentId), refetchInterval: 10000 }
  })

  const assignResource = useAssignResource()
  const updateIncident = useUpdateIncident()

  const handleDispatch = (resourceId: number, justification: string) => {
    setDispatchingResId(resourceId)
    assignResource.mutate({ id: incidentId, data: { resourceId, justification } }, {
      onSuccess: () => {
        toast.success("Resource dispatched successfully")
        queryClient.invalidateQueries({ queryKey: getGetIncidentQueryKey(incidentId) })
        queryClient.invalidateQueries({ queryKey: getGetIncidentTimelineQueryKey(incidentId) })
        setDispatchingResId(null)
      },
      onError: () => {
        toast.error("Failed to dispatch resource")
        setDispatchingResId(null)
      },
    })
  }

  const handleStatusUpdate = (status: string) => {
    updateIncident.mutate({ id: incidentId, data: { status } }, {
      onSuccess: () => {
        toast.success(`Status updated to ${status.replace(/_/g, " ")}`)
        queryClient.invalidateQueries({ queryKey: getGetIncidentQueryKey(incidentId) })
        queryClient.invalidateQueries({ queryKey: getGetIncidentTimelineQueryKey(incidentId) })
      },
    })
  }

  if (incidentLoading) {
    return (
      <Layout>
        <div className="p-8 space-y-6">
          <Skeleton className="h-12 w-1/3" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-80 w-full" />
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (!incident) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center h-full">
          <div className="text-center text-muted-foreground">Incident not found.</div>
        </div>
      </Layout>
    )
  }

  // Parse JSON fields
  let reasoningFactors: string[] = []
  try { if (incident.aiReasoningFactors) reasoningFactors = JSON.parse(incident.aiReasoningFactors) } catch {}

  let requiredResources: string[] = []
  try { if (incident.aiRequiredResources) requiredResources = JSON.parse(incident.aiRequiredResources) } catch {}

  const isHeuristic = incident.analysisMode === "heuristic"
  const hasConfidence = typeof incident.aiConfidence === "number" && incident.aiConfidence > 0
  const scoreColor =
    (incident.priorityScore ?? 0) >= 90 ? "stroke-critical" :
    (incident.priorityScore ?? 0) >= 70 ? "stroke-high" :
    (incident.priorityScore ?? 0) >= 40 ? "stroke-medium" : "stroke-low"

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-7xl mx-auto flex flex-col gap-6">

          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-lg border border-border shadow-sm">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold tracking-tight">INC-{incident.id.toString().padStart(4, "0")}</h1>
                <Badge variant={incident.urgency as any} className="uppercase text-xs">{incident.urgency}</Badge>
                <Badge variant="outline" className="capitalize text-xs">{incident.status.replace(/_/g, " ")}</Badge>
                {incident.disasterType && (
                  <Badge variant="secondary" className="text-xs capitalize">
                    <Tag className="w-3 h-3 mr-1" />
                    {incident.disasterType.replace(/_/g, " ")}
                  </Badge>
                )}
                {isHeuristic && (
                  <Badge variant="outline" className="text-xs text-amber-400 border-amber-500/40 bg-amber-500/10">
                    <Zap className="w-3 h-3 mr-1" />Heuristic Mode
                  </Badge>
                )}
              </div>
              <p className="text-lg font-medium leading-snug">{incident.summary}</p>
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              {incident.status === "assigned" && (
                <Button onClick={() => handleStatusUpdate("en_route")} variant="secondary" size="sm">Mark En Route</Button>
              )}
              {incident.status === "en_route" && (
                <Button onClick={() => handleStatusUpdate("in_progress")} variant="secondary" size="sm">Mark On Scene</Button>
              )}
              {incident.status === "in_progress" && (
                <Button onClick={() => handleStatusUpdate("resolved")} size="sm" className="bg-green-600 hover:bg-green-700 text-white">Resolve Incident</Button>
              )}
              {incident.status === "resolved" && (
                <Button onClick={() => handleStatusUpdate("closed")} variant="outline" size="sm">Close Incident</Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Main column ── */}
            <div className="lg:col-span-2 flex flex-col gap-6">

              {/* AI Triage Analysis */}
              <Card className="border-border overflow-hidden">
                <div className="bg-primary/10 border-b border-border p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <Cpu className="w-5 h-5" />
                    {isHeuristic ? "Heuristic Triage Analysis" : "AI Triage Analysis"}
                  </div>
                  {isHeuristic ? (
                    <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                      AI offline — keyword classification
                    </span>
                  ) : (
                    <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded-full">
                      GPT-4o-mini analysis
                    </span>
                  )}
                </div>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-8">

                    {/* Priority ring */}
                    <div className="flex flex-col items-center justify-center shrink-0">
                      <div className="relative w-32 h-32 flex items-center justify-center mb-3">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="45" className="stroke-muted fill-none stroke-[8]" />
                          <circle
                            cx="50" cy="50" r="45"
                            className={`fill-none stroke-[8] ${scoreColor}`}
                            strokeDasharray={`${(incident.priorityScore ?? 0) * 2.83} 283`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute text-center">
                          <div className="text-3xl font-black">{incident.priorityScore ?? 0}</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Priority</div>
                        </div>
                      </div>
                      {hasConfidence ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-full border border-border">
                          <BarChart2 className="w-3 h-3" />
                          Confidence: <span className="font-semibold text-foreground">{incident.aiConfidence}%</span>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-full border border-border">
                          Confidence N/A
                        </div>
                      )}
                    </div>

                    {/* Analysis details */}
                    <div className="flex-1 space-y-5">

                      {/* Primary need + category + disaster type */}
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Classification</h4>
                        <div className="flex flex-wrap gap-2">
                          <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full border ${NEED_COLORS[incident.needType] ?? NEED_COLORS.other}`}>
                            <NeedIcon need={incident.needType} />
                            {incident.needType.charAt(0).toUpperCase() + incident.needType.slice(1)}
                          </span>
                          {incident.incidentCategory && (
                            <Badge variant="outline" className="capitalize">{incident.incidentCategory}</Badge>
                          )}
                          {incident.disasterType && incident.disasterType !== "other" && incident.disasterType !== "null" && (
                            <Badge variant="secondary" className="capitalize">{incident.disasterType.replace(/_/g, " ")}</Badge>
                          )}
                        </div>
                      </div>

                      {/* AI explanation / assessment */}
                      {incident.aiExplanation && (
                        <div className="bg-muted/60 border border-border rounded-md p-3">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Assessment</h4>
                          <p className="text-sm leading-relaxed">{incident.aiExplanation}</p>
                        </div>
                      )}

                      {/* Risk factors */}
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Risk Factors Identified</h4>
                        {reasoningFactors.length > 0 ? (
                          <ul className="space-y-1.5">
                            {reasoningFactors.map((factor, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <span>{factor}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No specific risk factors extracted.</p>
                        )}
                      </div>

                      {/* AI-recommended resource types */}
                      {requiredResources.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Required Resource Types</h4>
                          <div className="flex flex-wrap gap-2">
                            {requiredResources.map((rt) => (
                              <span
                                key={rt}
                                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${NEED_COLORS[rt] ?? NEED_COLORS.other}`}
                              >
                                <NeedIcon need={rt} />
                                {rt.charAt(0).toUpperCase() + rt.slice(1)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Original Report */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    Original Report
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-md font-mono text-sm border border-border whitespace-pre-wrap leading-relaxed">
                    {incident.rawText}
                  </div>
                  {incident.translatedText && (
                    <div className="mt-4">
                      <p className="text-xs text-muted-foreground mb-1.5">
                        Translated from {incident.originalLanguage ?? "unknown"}:
                      </p>
                      <div className="bg-background p-4 rounded-md font-mono text-sm border border-border">
                        {incident.translatedText}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>

            {/* ── Sidebar column ── */}
            <div className="flex flex-col gap-6">

              {/* Incident metadata */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Incident Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">{incident.address || "Not specified"}</p>
                      {incident.lat && incident.lng && (
                        <p className="text-xs font-mono text-muted-foreground mt-0.5">{incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">People Affected</p>
                      <p className="text-sm text-muted-foreground">
                        {incident.peopleAffected != null ? `~${incident.peopleAffected} people` : "Not reported"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Contact</p>
                      <p className="text-sm text-muted-foreground">{incident.contactInfo || "None provided"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Reported</p>
                      <p className="text-sm text-muted-foreground">{format(new Date(incident.createdAt), "PPpp")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dispatch recommendations or current assignment */}
              {incident.status === "pending" ? (
                <Card className="border-primary/40 shadow-[0_0_12px_rgba(var(--primary),0.08)]">
                  <div className="bg-primary/5 border-b border-primary/20 p-4 flex items-center gap-2">
                    <Send className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">Dispatch Recommendations</span>
                  </div>
                  <CardContent className="p-0">
                    {recsLoading ? (
                      <div className="p-4 space-y-3">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    ) : recommendations?.length ? (
                      <div className="divide-y divide-border">
                        {recommendations.map((rec) => (
                          <div key={rec.resource.id} className="p-4 flex flex-col gap-3">
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <h4 className="font-semibold text-sm">{rec.resource.name}</h4>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                  <span className={`text-xs px-2 py-0.5 rounded-full border ${NEED_COLORS[rec.resource.type] ?? NEED_COLORS.other}`}>
                                    {rec.resource.type}
                                  </span>
                                  {rec.distance != null ? (
                                    <span className="text-xs text-muted-foreground">{rec.distance.toFixed(1)} km</span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">No coords</span>
                                  )}
                                  <span className="text-xs text-muted-foreground">• ETA {rec.eta}</span>
                                </div>
                              </div>
                              <Badge variant="secondary" className="text-xs shrink-0">{Math.round(rec.confidence)}% match</Badge>
                            </div>
                            <p className="text-xs bg-muted p-2.5 rounded border border-border/50 text-muted-foreground flex gap-2 leading-relaxed">
                              <Info className="w-3 h-3 shrink-0 mt-0.5" />
                              {rec.reason}
                            </p>
                            <Button
                              size="sm"
                              onClick={() => handleDispatch(rec.resource.id, rec.reason)}
                              disabled={dispatchingResId !== null}
                            >
                              {dispatchingResId === rec.resource.id ? "Dispatching…" : "Dispatch Unit"}
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-sm text-muted-foreground">
                        No available resources match this incident.
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="w-4 h-4" /> Current Assignment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {incident.assignedResourceId ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-secondary rounded-md border border-border flex items-center justify-between gap-2">
                          <span className="font-medium text-sm">{incident.assignedResourceName}</span>
                          <Badge className="text-xs">{incident.status.replace(/_/g, " ")}</Badge>
                        </div>
                        {incident.dispatchJustification && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Dispatch Justification:</p>
                            <p className="text-sm bg-muted p-2.5 rounded border border-border leading-relaxed">{incident.dispatchJustification}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No resource assigned.</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Event Timeline */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Event Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  {timelineLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : timeline && timeline.length > 0 ? (
                    <div className="relative border-l-2 border-border ml-3 space-y-5">
                      {timeline.map((entry, idx) => {
                        const isFirst = idx === 0
                        const isLast = idx === timeline.length - 1
                        const isResolution = entry.action.includes("Resolved") || entry.action.includes("Closed")
                        const dotColor = isResolution
                          ? "bg-green-500 border-green-700"
                          : isFirst
                          ? "bg-primary border-primary/50"
                          : isLast
                          ? "bg-amber-400 border-amber-600"
                          : "bg-muted-foreground border-muted"
                        return (
                          <div key={entry.id} className="relative pl-6">
                            <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center ${dotColor}`}>
                              <span className="text-[8px] text-white">
                                <TimelineIcon action={entry.action} />
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold">{entry.action}</span>
                              <span className="text-xs text-muted-foreground">{format(new Date(entry.timestamp), "MMM d, HH:mm:ss")}</span>
                              {entry.details && (
                                <span className="text-xs text-muted-foreground mt-1 leading-relaxed">{entry.details}</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No timeline events yet.</p>
                  )}
                </CardContent>
              </Card>

            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
