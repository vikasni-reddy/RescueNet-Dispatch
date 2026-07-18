import * as React from "react"
import { Link } from "wouter"
import {
  ShieldAlert, Activity, ArrowRight, ShieldCheck, Zap, Globe, Cpu,
  FileText, Brain, BarChart2, MapPin, Truck, CheckCircle, Clock, Home
} from "lucide-react"
import { Button } from "@/components/ui/button"

const HOW_IT_WORKS_STEPS = [
  { icon: FileText, title: "Emergency Reported", desc: "Anyone can submit a free-text distress signal in any language via the emergency form." },
  { icon: Brain, title: "AI Analyzes Report", desc: "GPT-4o-mini reads the report and extracts urgency, disaster type, need type, and key risk signals." },
  { icon: Cpu, title: "Structured Data Extracted", desc: "Language, translation, people affected, incident category, and confidence score are all captured." },
  { icon: BarChart2, title: "Priority Score Generated", desc: "A hybrid score (AI urgency base + keyword boosts + time decay) ranks each incident 0–100." },
  { icon: MapPin, title: "Appears on Dashboard & Map", desc: "The incident is pinned in real-time on the live tactical map and added to the priority queue." },
  { icon: Truck, title: "AI Recommends Resources", desc: "Nearby available units are ranked by type match, haversine distance, and capacity." },
  { icon: Activity, title: "Operator Dispatches", desc: "One click assigns the best unit. The resource goes en-route and a polyline appears on the map." },
  { icon: CheckCircle, title: "Tracked Until Resolved", desc: "Every status change is logged on a timestamped timeline until the incident is closed." },
]

export default function LandingPage() {
  const handleHowItWorksClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 scroll-smooth">
      <header className="fixed top-0 w-full z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <ShieldAlert className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg tracking-tight">RescueNet AI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" onClick={e => { e.preventDefault(); document.getElementById("features")?.scrollIntoView({ behavior: "smooth" }) }} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Features</a>
            <a href="#how-it-works" onClick={handleHowItWorksClick} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">How it works</a>
            <Link href="/dashboard" className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              Launch Command Center
            </Link>
          </nav>
          {/* Mobile nav */}
          <div className="md:hidden flex items-center gap-2">
            <Link href="/dashboard">
              <Button size="sm">Enter</Button>
            </Link>
          </div>
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
              <Link href="/dashboard" className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-base font-medium text-primary-foreground shadow transition-all hover:bg-primary/90 hover:scale-105 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring gap-2 w-full sm:w-auto">
                <Activity className="w-5 h-5" />
                Enter Command Center
              </Link>
              <Link href="/incidents/new" className="inline-flex h-12 items-center justify-center rounded-md border border-input bg-background px-8 text-base font-medium shadow-sm transition-all hover:bg-accent hover:text-accent-foreground hover:scale-105 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-full sm:w-auto">
                Report Emergency
              </Link>
            </div>

            {/* Quick stats bar */}
            <div className="mt-16 grid grid-cols-3 gap-4 max-w-lg mx-auto">
              {[
                { value: "< 2s", label: "AI Analysis Time" },
                { value: "8+", label: "Languages Supported" },
                { value: "99", label: "Max Priority Score" },
              ].map(stat => (
                <div key={stat.label} className="border border-border/50 rounded-xl p-3 bg-card/40 backdrop-blur">
                  <div className="text-2xl font-black text-primary">{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                </div>
              ))}
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
              {[
                { Icon: Cpu, title: "AI-Driven Triage", desc: "Natural language processing instantly reads, translates, and scores incoming distress reports based on severity and urgency." },
                { Icon: Globe, title: "Live Tactical Map", desc: "Real-time geospatial tracking of all incidents and deployed assets. Visualize the crisis zone as it evolves." },
                { Icon: Zap, title: "Smart Dispatch", desc: "Algorithms recommend the optimal unit to deploy based on proximity, capability, and incident requirements." },
                { Icon: BarChart2, title: "Priority Scoring", desc: "Hybrid 0–100 score combining AI urgency, keyword risk signals, and time-decay for objective triage." },
                { Icon: Clock, title: "Incident Lifecycle", desc: "Full end-to-end tracking from report to resolution. Every status change is timestamped and auditable." },
                { Icon: ShieldCheck, title: "Multi-Language", desc: "Reports in Telugu, Hindi, Urdu, English and more are automatically detected, translated, and processed." },
              ].map(({ Icon, title, desc }) => (
                <div key={title} className="p-6 rounded-2xl border border-border bg-background shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group">
                  <Icon className="w-10 h-10 text-primary mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xl font-semibold mb-2">{title}</h3>
                  <p className="text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">How It Works</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                From the first distress signal to a resolved incident — eight steps, all powered by AI.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-2 gap-6">
                {HOW_IT_WORKS_STEPS.map((step, idx) => {
                  const Icon = step.icon
                  return (
                    <div key={idx} className="flex gap-4 p-5 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 group">
                      <div className="shrink-0 flex flex-col items-center gap-1">
                        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-xs font-bold text-muted-foreground/60">Step {idx + 1}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{step.title}</h3>
                        <p className="text-sm text-muted-foreground">{step.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-12 text-center">
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted px-4 py-2 rounded-full border border-border">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  All 8 steps run automatically once an emergency is submitted
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Action Section */}
        <section className="py-24 bg-card border-t border-border">
          <div className="container mx-auto px-4 text-center">
            <ShieldCheck className="w-16 h-16 text-primary mx-auto mb-6" />
            <h2 className="text-4xl font-bold mb-6">Seconds Matter.</h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Equip your response center with the speed of AI. Don't let critical information get lost in the noise.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/dashboard" className="inline-flex h-14 items-center justify-center rounded-md bg-foreground px-8 text-base font-bold text-background shadow transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-1 gap-2">
                Launch RescueNet Dashboard <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/incidents/new" className="inline-flex h-14 items-center justify-center rounded-md border border-border px-8 text-base font-medium transition-all hover:scale-105 gap-2">
                Report an Emergency
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-10 bg-background">
        <div className="container mx-auto px-4 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-3">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <span className="font-bold text-base">RescueNet AI</span>
          </div>
          <p className="text-sm text-muted-foreground">AI-Powered Emergency Command &amp; Dispatch Platform</p>
          <p className="text-sm font-medium text-primary">Built for Idea2Impact Hackathon 2026</p>
          <p className="text-xs text-muted-foreground mt-4">Powered by GPT-4o-mini · React · PostgreSQL · Leaflet</p>
        </div>
      </footer>
    </div>
  )
}
