import { Layout } from "@/components/layout"
import { useListIncidents } from "@workspace/api-client-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Link } from "wouter"
import { formatDistanceToNow } from "date-fns"
import { Search, Plus } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

function formatId(id: number) {
  return `INC-${String(id).padStart(4, "0")}`
}

export default function IncidentsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all")
  const [search, setSearch] = useState("")

  const { data: incidents, isLoading } = useListIncidents(
    {
      status: statusFilter !== "all" ? statusFilter : undefined,
      urgency: urgencyFilter !== "all" ? urgencyFilter : undefined,
      sortBy: "priorityScore"
    },
    { query: { queryKey: ["incidents", { statusFilter, urgencyFilter }], refetchInterval: 5_000 } }
  )

  // Client-side filter: match by INC-XXXX, bare numeric id, summary text, or address
  const filtered = incidents?.filter(inc => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    // INC-XXXX or bare number
    const numMatch = q.replace(/^inc-0*/, "")
    if (!isNaN(Number(numMatch)) && numMatch !== "" && String(inc.id) === numMatch) return true
    // text match on summary / rawText / address
    if (inc.summary?.toLowerCase().includes(q)) return true
    if (inc.rawText.toLowerCase().includes(q)) return true
    if (inc.address?.toLowerCase().includes(q)) return true
    return false
  })

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="flex flex-col gap-6 max-w-7xl mx-auto h-full">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Incident Queue</h1>
              <p className="text-muted-foreground">Manage and triage all reported emergencies.</p>
            </div>
            <Link href="/incidents/new">
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Report Emergency
              </Button>
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-lg border border-border shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by INC-0052, keyword, or address…"
                className="pl-9 bg-background"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                <SelectTrigger className="w-[140px] bg-background">
                  <SelectValue placeholder="Urgency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Urgencies</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px] bg-background">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="ai_processing">AI Processing</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden flex-1">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[100px]">Priority</TableHead>
                  <TableHead className="w-[120px]">Urgency</TableHead>
                  <TableHead>Incident Summary</TableHead>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead className="w-[150px]">Status</TableHead>
                  <TableHead className="w-[150px]">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-full max-w-[300px]" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : filtered?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      {search ? `No incidents match "${search}"` : "No incidents found matching criteria."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered?.map((incident) => (
                    <TableRow key={incident.id} className="cursor-pointer hover:bg-muted/50" onClick={() => window.location.href = `/incidents/${incident.id}`}>
                      <TableCell className="font-mono text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs ${
                            incident.priorityScore >= 90 ? 'bg-critical text-white' :
                            incident.priorityScore >= 70 ? 'bg-high text-white' :
                            incident.priorityScore >= 40 ? 'bg-medium text-white' :
                            'bg-low text-white'
                          }`}>
                            {incident.priorityScore}
                          </span>
                          <span className="text-[9px] text-muted-foreground">{formatId(incident.id)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={incident.urgency as any} className="uppercase text-[10px]">{incident.urgency}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium truncate max-w-[400px]">{incident.summary || incident.rawText}</div>
                        {incident.address && <div className="text-xs text-muted-foreground truncate max-w-[400px]">{incident.address}</div>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{incident.needType}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium capitalize text-muted-foreground flex items-center gap-1.5">
                          {incident.status === 'pending' && <span className="w-2 h-2 rounded-full bg-yellow-500" />}
                          {incident.status === 'assigned' && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                          {incident.status === 'resolved' && <span className="w-2 h-2 rounded-full bg-green-500" />}
                          {incident.status.replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </Layout>
  )
}
