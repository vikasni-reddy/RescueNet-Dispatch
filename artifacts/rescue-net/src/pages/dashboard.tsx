import { Layout } from "@/components/layout"
import { useGetDashboardStats, useListActivity, useListIncidents } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Clock, CheckCircle2, Truck, ArrowRight } from "lucide-react"
import { Link } from "wouter"
import { formatDistanceToNow } from "date-fns"

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({ query: { queryKey: ["dashboard-stats"] } })
  const { data: incidents, isLoading: incidentsLoading } = useListIncidents({ limit: 5, sortBy: "priorityScore" }, { query: { queryKey: ["incidents", { limit: 5 }] } })
  const { data: activity, isLoading: activityLoading } = useListActivity({ limit: 8 }, { query: { queryKey: ["activity", { limit: 8 }] } })

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="flex flex-col gap-8 max-w-7xl mx-auto">
          
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-1">Command Center Overview</h1>
              <p className="text-muted-foreground">Live operational statistics and critical queue.</p>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <span className="text-sm font-medium text-muted-foreground">System Live</span>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard 
              title="Critical Incidents" 
              value={stats?.criticalIncidents} 
              icon={<AlertCircle className="w-5 h-5 text-destructive" />} 
              loading={statsLoading} 
              trend="+2 since last hour"
              trendUp={true}
            />
            <StatsCard 
              title="Pending Queue" 
              value={stats?.pendingIncidents} 
              icon={<Clock className="w-5 h-5 text-yellow-500" />} 
              loading={statsLoading} 
            />
            <StatsCard 
              title="Active Resources" 
              value={stats?.resourcesInUse} 
              total={stats?.availableResources}
              icon={<Truck className="w-5 h-5 text-primary" />} 
              loading={statsLoading} 
              subtitle={`${stats?.resourceUtilizationPercent ?? 0}% utilization`}
            />
            <StatsCard 
              title="Resolved Today" 
              value={stats?.resolvedIncidents} 
              icon={<CheckCircle2 className="w-5 h-5 text-green-500" />} 
              loading={statsLoading} 
              subtitle={`Avg ${stats?.avgResolutionTimeMinutes ?? 0}m resolution`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Priority Queue */}
            <Card className="col-span-1 lg:col-span-2 border-border bg-card/50 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/50">
                <div className="space-y-1">
                  <CardTitle>Priority Action Queue</CardTitle>
                  <CardDescription>Top incidents requiring immediate dispatch.</CardDescription>
                </div>
                <Link href="/incidents" className="text-sm font-medium text-primary hover:underline flex items-center">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {incidentsLoading ? (
                  <div className="p-4 space-y-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                  </div>
                ) : incidents?.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">No incidents in queue.</div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {incidents?.map(incident => (
                      <Link key={incident.id} href={`/incidents/${incident.id}`} className="block p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={incident.urgency as any} className="uppercase text-[10px]">{incident.urgency}</Badge>
                            <span className="text-sm font-medium">Score: {incident.priorityScore}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm font-medium line-clamp-1 mb-1">{incident.summary || incident.rawText}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Badge variant="outline" className="text-[10px] px-1 py-0 h-4">{incident.needType}</Badge></span>
                          {incident.address && <span className="truncate max-w-[200px]">{incident.address}</span>}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Live Activity Feed */}
            <Card className="border-border bg-card/50 backdrop-blur">
              <CardHeader className="pb-2 border-b border-border/50">
                <CardTitle className="text-base">Live Feed</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {activityLoading ? (
                   <div className="p-4 space-y-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : (
                  <div className="divide-y divide-border/50 h-[400px] overflow-y-auto">
                    {activity?.map(item => (
                      <div key={item.id} className="p-3 text-sm flex gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        <div>
                          <p className="mb-0.5"><span className="font-medium text-foreground">{item.resourceName || "System"}</span> {item.action}</p>
                          <p className="text-xs text-muted-foreground">
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

function StatsCard({ title, value, icon, loading, subtitle, total, trend, trendUp }: any) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardContent className="p-6 flex flex-col justify-between h-full">
        <div className="flex justify-between items-start mb-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="p-2 bg-background rounded-md border border-border/50">{icon}</div>
        </div>
        <div>
          {loading ? (
            <Skeleton className="h-8 w-16 mb-1" />
          ) : (
            <div className="text-3xl font-bold flex items-baseline gap-1">
              {value} {total !== undefined && <span className="text-lg text-muted-foreground font-normal">/ {total}</span>}
            </div>
          )}
          {(subtitle || trend) && (
            <p className={`text-xs mt-1 ${trendUp ? 'text-destructive' : 'text-muted-foreground'}`}>
              {trend || subtitle}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
