import { Link, useLocation } from "wouter"
import { Activity, LayoutDashboard, Map, List, Settings, FileBarChart, Siren } from "lucide-react"

export function Sidebar() {
  const [location] = useLocation()
  
  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/map", label: "Live Map", icon: Map },
    { href: "/incidents", label: "Incident Queue", icon: List },
    { href: "/resources", label: "Resources", icon: Activity },
    { href: "/analytics", label: "Analytics", icon: FileBarChart },
  ]

  return (
    <div className="w-64 border-r border-border bg-sidebar h-full flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2 text-primary font-bold text-lg tracking-tight">
          <Siren className="w-6 h-6" />
          <span>RescueNet AI</span>
        </Link>
      </div>
      
      <div className="flex-1 py-6 px-4 flex flex-col gap-1 overflow-y-auto">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Command Center</div>
        {navItems.map((item) => {
          const isActive = location === item.href || location.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          )
        })}
      </div>
      
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold border border-border">
            OP
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">Operator 01</span>
            <span className="text-xs text-muted-foreground">Active Duty</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden selection:bg-primary/30">
      <Sidebar />
      <main className="flex-1 h-full overflow-hidden flex flex-col relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        {children}
      </main>
    </div>
  )
}
