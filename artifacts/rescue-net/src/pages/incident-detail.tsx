import { Layout } from "@/components/layout"
import { useGetIncident, useGetResourceRecommendations, useGetIncidentTimeline, useAssignResource, useUpdateIncident, getGetIncidentQueryKey, getGetIncidentTimelineQueryKey } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, CheckCircle2, Clock, MapPin, Phone, Users, ShieldAlert, Cpu, Activity, Send, Info } from "lucide-react"
import { useParams } from "wouter"
import { format } from "date-fns"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

export default function IncidentDetailPage() {
  const { id } = useParams()
  const incidentId = parseInt(id || "0", 10)
  const queryClient = useQueryClient()
  
  const [dispatchingResId, setDispatchingResId] = useState<number | null>(null)

  const { data: incident, isLoading: incidentLoading } = useGetIncident(incidentId, { 
    query: { enabled: !!incidentId, queryKey: getGetIncidentQueryKey(incidentId) } 
  })
  
  const { data: recommendations, isLoading: recsLoading } = useGetResourceRecommendations(incidentId, {
    query: { enabled: !!incidentId && incident?.status === 'pending', queryKey: ["recommendations", incidentId] }
  })
  
  const { data: timeline, isLoading: timelineLoading } = useGetIncidentTimeline(incidentId, {
    query: { enabled: !!incidentId, queryKey: getGetIncidentTimelineQueryKey(incidentId) }
  })

  const assignResource = useAssignResource()
  const updateIncident = useUpdateIncident()

  const handleDispatch = (resourceId: number, justification: string) => {
    setDispatchingResId(resourceId)
    assignResource.mutate({ 
      id: incidentId, 
      data: { resourceId, justification } 
    }, {
      onSuccess: () => {
        toast.success("Resource dispatched successfully")
        queryClient.invalidateQueries({ queryKey: getGetIncidentQueryKey(incidentId) })
        queryClient.invalidateQueries({ queryKey: getGetIncidentTimelineQueryKey(incidentId) })
        setDispatchingResId(null)
      },
      onError: () => {
        toast.error("Failed to dispatch resource")
        setDispatchingResId(null)
      }
    })
  }

  const handleStatusUpdate = (status: string) => {
    updateIncident.mutate({
      id: incidentId,
      data: { status }
    }, {
      onSuccess: () => {
        toast.success(`Status updated to ${status.replace('_', ' ')}`)
        queryClient.invalidateQueries({ queryKey: getGetIncidentQueryKey(incidentId) })
        queryClient.invalidateQueries({ queryKey: getGetIncidentTimelineQueryKey(incidentId) })
      }
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

  let reasoningFactors: string[] = []
  try {
    if (incident.aiReasoningFactors) {
      reasoningFactors = JSON.parse(incident.aiReasoningFactors)
    }
  } catch (e) {
    console.error("Failed to parse reasoning factors", e)
  }

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-7xl mx-auto flex flex-col gap-6">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-lg border border-border shadow-sm">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">INC-{incident.id.toString().padStart(4, '0')}</h1>
                <Badge variant={incident.urgency as any} className="uppercase">{incident.urgency}</Badge>
                <Badge variant="outline" className="capitalize">{incident.status.replace('_', ' ')}</Badge>
              </div>
              <p className="text-lg font-medium">{incident.summary}</p>
            </div>
            
            {/* Status Actions */}
            <div className="flex gap-2">
              {incident.status === 'assigned' && (
                <Button onClick={() => handleStatusUpdate('en_route')} variant="secondary">Mark En Route</Button>
              )}
              {incident.status === 'en_route' && (
                <Button onClick={() => handleStatusUpdate('in_progress')} variant="secondary">Mark On Scene</Button>
              )}
              {incident.status === 'in_progress' && (
                <Button onClick={() => handleStatusUpdate('resolved')} className="bg-green-600 hover:bg-green-700 text-white">Resolve Incident</Button>
              )}
              {incident.status === 'resolved' && (
                <Button onClick={() => handleStatusUpdate('closed')} variant="outline">Close Incident</Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main Content Column */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {/* AI Analysis Card */}
              <Card className="border-border overflow-hidden">
                <div className="bg-primary/10 border-b border-border p-4 flex items-center gap-2 text-primary font-medium">
                  <Cpu className="w-5 h-5" /> AI Triage Analysis
                </div>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-8">
                    
                    {/* Score Ring */}
                    <div className="flex flex-col items-center justify-center shrink-0">
                      <div className="relative w-32 h-32 flex items-center justify-center mb-2">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="45" className="stroke-muted fill-none stroke-[8]" />
                          <circle 
                            cx="50" cy="50" r="45" 
                            className={`fill-none stroke-[8] ${
                              incident.priorityScore >= 90 ? 'stroke-critical' :
                              incident.priorityScore >= 70 ? 'stroke-high' :
                              incident.priorityScore >= 40 ? 'stroke-medium' :
                              'stroke-low'
                            }`}
                            strokeDasharray={`${incident.priorityScore * 2.83} 283`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute text-center">
                          <div className="text-3xl font-black">{incident.priorityScore}</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Priority</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                        <ShieldAlert className="w-3 h-3" /> Confidence: {incident.aiConfidence}%
                      </div>
                    </div>

                    {/* Factors */}
                    <div className="flex-1 space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Primary Need</h4>
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="text-sm">{incident.needType}</Badge>
                          {incident.incidentCategory && <Badge variant="outline">{incident.incidentCategory}</Badge>}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Risk Factors Identified</h4>
                        <ul className="space-y-2">
                          {reasoningFactors.length > 0 ? reasoningFactors.map((factor, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                              <span>{factor}</span>
                            </li>
                          )) : (
                            <li className="text-sm text-muted-foreground">No specific risk factors extracted.</li>
                          )}
                        </ul>
                      </div>

                      {incident.aiExplanation && (
                        <div>
                           <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Assessment</h4>
                           <p className="text-sm">{incident.aiExplanation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Original Report */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Original Report</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-md font-mono text-sm border border-border whitespace-pre-wrap">
                    {incident.rawText}
                  </div>
                  {incident.translatedText && incident.originalLanguage !== 'en' && (
                    <div className="mt-4">
                      <p className="text-xs text-muted-foreground mb-1">Translated from {incident.originalLanguage}:</p>
                      <div className="bg-background p-4 rounded-md font-mono text-sm border border-border">
                        {incident.translatedText}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
            </div>

            {/* Sidebar Column */}
            <div className="flex flex-col gap-6">
              
              {/* Details */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Incident Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">{incident.address || "Unspecified"}</p>
                      {incident.lat && incident.lng && (
                        <p className="text-xs font-mono text-muted-foreground mt-1">{incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">People Affected</p>
                      <p className="text-sm text-muted-foreground">{incident.peopleAffected || "Unknown"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Contact</p>
                      <p className="text-sm text-muted-foreground">{incident.contactInfo || "None provided"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Reported</p>
                      <p className="text-sm text-muted-foreground">{format(new Date(incident.createdAt), 'PPpp')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dispatch Action Area */}
              {incident.status === 'pending' ? (
                <Card className="border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.1)]">
                  <CardHeader className="bg-primary/5 border-b border-primary/20 pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Send className="w-5 h-5 text-primary" /> Dispatch Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {recsLoading ? (
                      <div className="p-4 space-y-4">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    ) : recommendations?.length ? (
                      <div className="divide-y divide-border">
                        {recommendations.map((rec) => (
                          <div key={rec.resource.id} className="p-4 flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold">{rec.resource.name}</h4>
                                <p className="text-xs text-muted-foreground">{rec.resource.type} • {rec.distance.toFixed(1)}km away • ETA {rec.eta}</p>
                              </div>
                              <Badge variant="secondary" className="text-xs">{rec.confidence}% Match</Badge>
                            </div>
                            <p className="text-xs bg-muted p-2 rounded border border-border/50 text-muted-foreground flex gap-2">
                              <Info className="w-3 h-3 shrink-0 mt-0.5" />
                              {rec.reason}
                            </p>
                            <Button 
                              size="sm" 
                              onClick={() => handleDispatch(rec.resource.id, rec.reason)}
                              disabled={dispatchingResId !== null}
                            >
                              {dispatchingResId === rec.resource.id ? "Dispatching..." : "Dispatch Unit"}
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
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="w-5 h-5" /> Current Assignment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {incident.assignedResourceId ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-secondary rounded-md border border-border flex items-center justify-between">
                          <span className="font-medium">{incident.assignedResourceName}</span>
                          <Badge>{incident.status.replace('_', ' ')}</Badge>
                        </div>
                        {incident.dispatchJustification && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Dispatch Justification:</p>
                            <p className="text-sm bg-muted p-2 rounded">{incident.dispatchJustification}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No resource assigned.</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Timeline */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Event Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  {timelineLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : (
                    <div className="relative border-l border-border ml-3 space-y-6">
                      {timeline?.map((entry, idx) => (
                        <div key={entry.id} className="relative pl-6">
                          <div className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-background ${idx === 0 ? 'bg-primary' : 'bg-muted-foreground'}`} />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium capitalize">{entry.action.replace('_', ' ')}</span>
                            <span className="text-xs text-muted-foreground">{format(new Date(entry.timestamp), 'MMM d, HH:mm:ss')}</span>
                            {entry.details && <span className="text-sm mt-1">{entry.details}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
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
