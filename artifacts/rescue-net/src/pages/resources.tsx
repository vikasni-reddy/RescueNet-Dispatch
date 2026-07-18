import { Layout } from "@/components/layout"
import { useListResources } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Plus, MapPin, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ResourcesPage() {
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [search, setSearch] = useState("")

  const { data: resources, isLoading } = useListResources(
    { type: typeFilter !== "all" ? typeFilter : undefined }, 
    { query: { queryKey: ["resources", { typeFilter }] } }
  )

  const filteredResources = resources?.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="flex flex-col gap-6 max-w-7xl mx-auto h-full">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Resource Registry</h1>
              <p className="text-muted-foreground">Manage active units, vehicles, and personnel.</p>
            </div>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Add Resource
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-lg border border-border shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search resources by name..." 
                className="pl-9 bg-background" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="w-full sm:w-[200px]">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Resource Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="medical">Medical</SelectItem>
                  <SelectItem value="rescue">Rescue</SelectItem>
                  <SelectItem value="fire">Fire</SelectItem>
                  <SelectItem value="police">Police</SelectItem>
                  <SelectItem value="boat">Boat / Marine</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i}>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex justify-between"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-6 w-16" /></div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-10 w-full mt-4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredResources?.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground border border-dashed rounded-lg">
              No resources found matching the criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredResources?.map(resource => (
                <Card key={resource.id} className="hover:border-primary/50 transition-colors flex flex-col">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-base line-clamp-1" title={resource.name}>{resource.name}</CardTitle>
                      <Badge variant={resource.isAvailable ? "outline" : "secondary"} className="shrink-0 text-[10px]">
                        {resource.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                      <Activity className="w-3 h-3" /> {resource.type}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 flex-1 flex flex-col justify-end">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded mb-3">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span className="truncate">{resource.lat.toFixed(4)}, {resource.lng.toFixed(4)}</span>
                    </div>
                    
                    <Button variant={resource.isAvailable ? "default" : "secondary"} className="w-full text-xs h-8" disabled={!resource.isAvailable}>
                      {resource.isAvailable ? "Deploy Resource" : "Currently Assigned"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

        </div>
      </div>
    </Layout>
  )
}
