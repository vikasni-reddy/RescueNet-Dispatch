import * as React from "react"
import { Link } from "wouter"
import { ShieldAlert, Activity, ArrowRight, ShieldCheck, Zap, Globe, Cpu } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <header className="fixed top-0 w-full z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg tracking-tight">RescueNet AI</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How it works</a>
            <Link href="/dashboard" className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              Launch Command Center
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px]" />
          </div>
          
          <div className="container relative z-10 mx-auto px-4 text-center max-w-4xl">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-8">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
              Live: Global Response Network Active
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
              Triage faster.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-500">Save more lives.</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              The AI-powered command center for emergency response teams. 
              Instantly analyze distress signals, prioritize critical incidents, and dispatch resources with mathematical precision.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/dashboard" className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-base font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring gap-2 w-full sm:w-auto">
                <Activity className="w-5 h-5" />
                Enter Command Center
              </Link>
              <Link href="/incidents/new" className="inline-flex h-12 items-center justify-center rounded-md border border-input bg-background px-8 text-base font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-full sm:w-auto">
                Report Emergency
              </Link>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section id="features" className="py-20 bg-card border-y border-border">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Tactical Superiority in Crises</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Built for the chaos of natural disasters, RescueNet strips away the noise to give commanders exactly what they need to make life-saving decisions.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="p-6 rounded-2xl border border-border bg-background shadow-sm hover:shadow-md transition-shadow">
                <Cpu className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">AI-Driven Triage</h3>
                <p className="text-muted-foreground">Natural language processing instantly reads, translates, and scores incoming distress reports based on severity and urgency.</p>
              </div>
              <div className="p-6 rounded-2xl border border-border bg-background shadow-sm hover:shadow-md transition-shadow">
                <Globe className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Live Tactical Map</h3>
                <p className="text-muted-foreground">Real-time geospatial tracking of all incidents and deployed assets. Visualize the crisis zone as it evolves.</p>
              </div>
              <div className="p-6 rounded-2xl border border-border bg-background shadow-sm hover:shadow-md transition-shadow">
                <Zap className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Smart Dispatch</h3>
                <p className="text-muted-foreground">Algorithms recommend the optimal unit to deploy based on proximity, capability, and incident requirements.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Action Section */}
        <section className="py-24">
          <div className="container mx-auto px-4 text-center">
            <ShieldCheck className="w-16 h-16 text-primary mx-auto mb-6" />
            <h2 className="text-4xl font-bold mb-6">Seconds Matter.</h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Equip your response center with the speed of AI. Don't let critical information get lost in the noise.
            </p>
            <Link href="/dashboard" className="inline-flex h-14 items-center justify-center rounded-md bg-foreground px-8 text-base font-bold text-background shadow transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-1 gap-2">
              Launch RescueNet Dashboard <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-muted-foreground">
        <p className="text-sm">RescueNet AI. Tactical Disaster Response System. Demo Environment.</p>
      </footer>
    </div>
  )
}
