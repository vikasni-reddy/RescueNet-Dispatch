import { Layout } from "@/components/layout"
import { useGetDashboardStats, useListActivity, useListIncidents } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Clock, CheckCircle2, Truck, ArrowRight, RefreshCw } from "lucide-react"
import { Link } from "wouter"
import { formatDistanceToNow, format } from "date-fns"
import { useState, useEffect } from "react"

const REFETCH_MS = 5_000

export default function Dashboard() {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [tickAgo, setTickAgo] = useState("")

  const { data: stats, isLoading: statsLoading, dataUpdatedAt: statsUpdated } = useGetDashboardStats({
    query: { queryKey: ["dashboard-stats"], refetchInterval: REFETCH_MS },
  })
  const { data: incidents, isLoading: incidentsLoading } = useListIncidents(
    { limit: 5, sortBy: "priorityScore" },
    { query: { queryKey: ["incidents", { limit: 5 }], refetchInterval: REFETCH_MS } }
  )
  const { data: activity, isLoading: activityLoading } = useListActivity(
    { limit: 10 },
    { query: { queryKey: ["activity", { limit: 10 }], refetchInterval: REFETCH_MS } }
  )

  // Track last-updated time
  useEffect(() => {
    if (statsUpdated) setLastUpdated(new Date(statsUpdated))
  }, [statsUpdated])

  useEffect(() => {
    const id = setInterval(() => {
      setTickAgo(formatDistanceToNow(lastUpdated, { addSuffix: true }))
    }, 10_000)
    setTickAgo(formatDistanceToNow(lastUpdated, { addSuffix: true }))
    return () => clearInterval(id)
  }, [lastUpdated])

  const criticalCount = stats?.criticalIncidents ?? 0
  const prevCritical = incidents?.filter(i => i.urgency === "critical").length ?? 0

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="flex flex-col gap-6 max-w-7xl mx-auto">

          {/* Page header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">Command Center Overview</h1>
              <p className="text-muted-foreground text-sm">Live operational statistics and critical queue.</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <RefreshCw className="w-3 h-3" />
                <span>Updated {tickAgo}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
                <span className="text-sm font-medium text-muted-foreground">System Live</span>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <StatsCard
              title="Critical Incidents"
              value={stats?.criticalIncidents}
              icon={<AlertCircle className="w-5 h-5 text-destructive" />}
              loading={statsLoading}
              trend={criticalCount > 0 ? `${criticalCount} requiring immediate action` : "No critical incidents"}
              trendUp={criticalCount > 0}
            />
            <StatsCard
              title="Pending Queue"
              value={stats?.pendingIncidents}
              icon={<Clock className="w-5 h-5 text-yellow-500" />}
              loading={statsLoading}
              trend="Awaiting dispatch"
            />
            <StatsCard
              title="Active Resources"
              value={stats?.resourcesInUse}
              total={stats ? stats.resourcesInUse + stats.availableResources : undefined}
              icon={<Truck className="w-5 h-5 text-primary" />}
              loading={statsLoading}
              trend={`${stats?.resourceUtilizationPercent ?? 0}% utilization`}
            />
            <StatsCard
              title="Resolved Today"
              value={stats?.resolvedIncidents}
              icon={<CheckCircle2 className="w-5 h-5 text-green-500" />}
              loading={statsLoading}
              trend={`Avg ${stats?.avgResolutionTimeMinutes ?? 0}m resolution`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Priority Queue */}
            <Card className="col-span-1 lg:col-span-2 border-border bg-card/50 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/50">
                <div className="space-y-0.5">
                  <CardTitle className="text-base">Priority Action Queue</CardTitle>
                  <CardDescription className="text-xs">Top incidents requiring immediate dispatch.</CardDescription>
                </div>
                <Link href="/incidents" className="text-xs font-medium text-primary hover:underline flex items-center shrink-0">
                  View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {incidentsLoading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                  </div>
                ) : !incidents?.length ? (
                  <div className="p-10 text-center">
                    <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3 opacity-60" />
                    <p className="text-sm font-medium text-muted-foreground">No incidents in queue</p>
                    <p className="text-xs text-muted-foreground mt-1">Everything is operating normally.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {incidents.map(incident => (
                      <Link key={incident.id} href={`/incidents/${incident.id}`} className="block p-4 hover:bg-muted/50 transition-colors group">
                        <div className="flex justify-between items-start mb-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={incident.urgency as any} className="uppercase text-[10px]">{incident.urgency}</Badge>
                            <span className="text-sm font-bold tabular-nums">Score: {incident.priorityScore}</span>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                            {formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm font-medium line-clamp-1 mb-1 group-hover:text-primary transition-colors">
                          {incident.summary || incident.rawText}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">{incident.needType}</Badge>
                          {incident.address && <span className="truncate max-w-[180px]">{incident.address}</span>}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Live Activity Feed */}
            <Card className="border-border bg-card/50 backdrop-blur">
              <CardHeader className="pb-2 border-b border-border/50 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Live Feed</CardTitle>
                <span className="text-xs text-muted-foreground">{format(lastUpdated, "HH:mm:ss")}</span>
              </CardHeader>
              <CardContent className="p-0">
                {activityLoading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : !activity?.length ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No recent activity.
                  </div>
                ) : (
                  <div className="divide-y divide-border/50 h-[380px] overflow-y-auto">
                    {activity.map(item => (
                      <div key={item.id} className="p-3 text-sm flex gap-3 hover:bg-muted/30 transition-colors">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                          item.urgency === "critical" ? "bg-destructive" :
                          item.urgency === "high"     ? "bg-orange-500" :
                          item.urgency === "medium"   ? "bg-yellow-500" : "bg-primary"
                        }`} />
                        <div className="min-w-0">
                          <p className="mb-0.5 text-xs leading-snug">
                            <span className="font-semibold text-foreground">{item.resourceName || "System"}</span>{" "}
                            {item.action}
                          </p>
                          {item.incidentSummary && (
                            <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">{item.incidentSummary}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                          </p>
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
    </Layout>
  )
}

function StatsCard({ title, value, icon, loading, subtitle, total, trend, trendUp }: {
  title: string
  value?: number | null
  icon: React.ReactNode
  loading: boolean
  subtitle?: string
  total?: number
  trend?: string
  trendUp?: boolean
}) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <CardContent className="p-4 md:p-5 flex flex-col justify-between h-full">
        <div className="flex justify-between items-start mb-3">
          <p className="text-xs md:text-sm font-medium text-muted-foreground leading-tight">{title}</p>
          <div className="p-1.5 bg-background rounded-md border border-border/50 shrink-0">{icon}</div>
        </div>
        <div>
          {loading ? (
            <Skeleton className="h-8 w-16 mb-1" />
          ) : (
            <div className="text-2xl md:text-3xl font-bold flex items-baseline gap-1">
              {value ?? 0}
              {total !== undefined && (
                <span className="text-base md:text-lg text-muted-foreground font-normal">/ {total}</span>
              )}
            </div>
          )}
          {(subtitle || trend) && (
            <p className={`text-xs mt-1 truncate ${trendUp ? "text-destructive" : "text-muted-foreground"}`}>
              {trend ?? subtitle}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
