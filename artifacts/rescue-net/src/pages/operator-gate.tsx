import { Link } from "wouter"
import { ShieldAlert, ShieldCheck, ArrowLeft, LayoutDashboard, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function OperatorGatePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Minimal header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <span className="font-bold text-base tracking-tight">RescueNet AI</span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">

            {/* Header band */}
            <div className="bg-primary/10 border-b border-border px-6 py-6 text-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mx-auto mb-4">
                <ShieldCheck className="w-9 h-9 text-primary" />
              </div>
              <h1 className="text-xl font-bold">Command Center Access</h1>
              <p className="text-sm text-muted-foreground mt-1">Authorized Personnel Only</p>
            </div>

            <div className="px-6 py-6 space-y-5">
              {/* Warning */}
              <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-200/90">
                  This system is reserved for <span className="font-semibold">emergency response operators</span> only. Unauthorized access is prohibited.
                </p>
              </div>

              {/* Access list */}
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">By entering, you confirm you are an authorized operator with access to:</p>
                <ul className="space-y-1.5 mt-2">
                  {[
                    "Live incident dashboard & priority queue",
                    "Tactical map with real-time incident pins",
                    "AI triage analysis & priority scores",
                    "Resource registry & dispatch controls",
                    "Incident lifecycle management",
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 pt-2">
                <Link href="/dashboard">
                  <Button size="lg" className="w-full gap-2 text-base">
                    <LayoutDashboard className="w-5 h-5" />
                    Enter Command Center
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" size="lg" className="w-full gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Return to Home
                  </Button>
                </Link>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                If you are a citizen reporting an emergency,{" "}
                <Link href="/report" className="text-primary underline underline-offset-2 hover:no-underline">
                  click here
                </Link>.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground">
        RescueNet AI · Emergency Response System · Built for Idea2Impact Hackathon 2026
      </footer>
    </div>
  )
}
