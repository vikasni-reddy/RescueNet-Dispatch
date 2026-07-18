import { useGetIncident } from "@workspace/api-client-react"
import { Link, useParams } from "wouter"
import { ShieldAlert, CheckCircle2, Clock, AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

function formatIncidentId(id: string | number) {
  return `INC-${String(id).padStart(4, "0")}`
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
    timeZone: "Asia/Kolkata",
  })
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:     { label: "Pending Review",  color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/30",  icon: <Clock className="w-4 h-4" /> },
  triaged:     { label: "Under Review",    color: "text-blue-400 bg-blue-400/10 border-blue-400/30",       icon: <RefreshCw className="w-4 h-4" /> },
  dispatched:  { label: "Dispatched",      color: "text-green-500 bg-green-500/10 border-green-500/30",    icon: <CheckCircle2 className="w-4 h-4" /> },
  resolved:    { label: "Resolved",        color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30", icon: <CheckCircle2 className="w-4 h-4" /> },
}

export default function ReportConfirmationPage() {
  const { id } = useParams<{ id: string }>()
  const { data: incident, isLoading, isError } = useGetIncident(id!, {
    query: { queryKey: ["incident", id], refetchInterval: 15_000, enabled: !!id },
  })

  const status = incident?.status ?? "pending"
  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["pending"]
  const incidentId = formatIncidentId(id!)
  const submittedAt = incident?.createdAt ? formatTime(incident.createdAt) : null

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Public header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <span className="font-bold text-base tracking-tight">RescueNet AI</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10 md:py-16">
        <div className="w-full max-w-lg">

          {isLoading && (
            <div className="rounded-2xl border border-border bg-card p-10 text-center animate-pulse">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-6" />
              <div className="h-5 w-48 bg-muted rounded mx-auto mb-3" />
              <div className="h-4 w-64 bg-muted rounded mx-auto" />
            </div>
          )}

          {isError && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center">
              <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h2 className="text-lg font-bold mb-2">Could not load confirmation</h2>
              <p className="text-sm text-muted-foreground mb-6">Your report was received, but we could not load the details. Please note your reference and contact local emergency services if needed.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/"><Button variant="outline"><ArrowLeft className="w-4 h-4 mr-1.5" />Return to Home</Button></Link>
                <Link href="/report"><Button>Report Another Emergency</Button></Link>
              </div>
            </div>
          )}

          {!isLoading && !isError && incident && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">

              {/* Success header */}
              <div className="bg-green-500/10 border-b border-green-500/20 px-6 py-6 text-center">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-green-500/20 mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h1 className="text-xl font-bold text-green-500">Emergency Report Submitted</h1>
                <p className="text-sm text-muted-foreground mt-1">Your report has been received and is being processed.</p>
              </div>

              {/* Incident details */}
              <div className="px-6 py-6 space-y-4">

                <div className="rounded-xl bg-muted/40 border border-border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Incident ID</p>
                    <p className="text-2xl font-black tracking-tight text-primary">{incidentId}</p>
                  </div>
                  <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${statusCfg.color}`}>
                    {statusCfg.icon}
                    {statusCfg.label}
                  </div>
                </div>

                {submittedAt && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 shrink-0" />
                    Submitted on {submittedAt}
                  </div>
                )}

                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-4 text-sm leading-relaxed text-foreground/90">
                  Our AI has analyzed your report and notified the emergency response team. Help is being coordinated. Please keep your phone available. If the situation worsens, contact emergency services at <span className="font-bold">112</span> immediately.
                </div>

                {/* Auto-refreshing status note */}
                <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
                  <RefreshCw className="w-3 h-3" />
                  Status updates automatically every 15 seconds
                </p>
              </div>

              {/* Actions */}
              <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
                <Link href="/" className="flex-1">
                  <Button variant="outline" className="w-full gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Return to Home
                  </Button>
                </Link>
                <Link href="/report" className="flex-1">
                  <Button className="w-full gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Report Another Emergency
                  </Button>
                </Link>
              </div>

            </div>
          )}

        </div>
      </main>

      <footer className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground">
        RescueNet AI · Emergency Response System · Built for Idea2Impact Hackathon 2026
      </footer>
    </div>
  )
}
