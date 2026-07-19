import { Link, useLocation } from "wouter"
import { useState } from "react"
import { Activity, LayoutDashboard, Map, List, FileBarChart, Siren, Home, Menu, X, Search } from "lucide-react"
import { useRealtime } from "@/hooks/use-realtime"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/map", label: "Live Map", icon: Map },
  { href: "/incidents", label: "Incident Queue", icon: List },
  { href: "/resources", label: "Resources", icon: Activity },
  { href: "/analytics", label: "Analytics", icon: FileBarChart },
]

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const [location] = useLocation()
  const [searchVal, setSearchVal] = useState("")

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const raw = searchVal.trim().toUpperCase().replace(/^INC-0*/, "")
    const id = parseInt(raw, 10)
    if (!isNaN(id) && id > 0) {
      window.location.href = `/incidents/${id}`
      onClose?.()
      setSearchVal("")
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-border shrink-0">
        <Link href="/dashboard" onClick={onClose} className="flex items-center gap-2 text-primary font-bold text-lg tracking-tight hover:opacity-80 transition-opacity">
          <Siren className="w-6 h-6" />
          <span>RescueNet AI</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="md:hidden text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Quick incident search */}
      <div className="px-4 py-3 border-b border-border/50">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            placeholder="Jump to INC-0052…"
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </form>
      </div>

      {/* Nav */}
      <div className="flex-1 py-4 px-4 flex flex-col gap-1 overflow-y-auto">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Command Center</div>
        {navItems.map((item) => {
          const isActive = location === item.href || location.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </div>

      {/* Back to home */}
      <div className="px-4 py-3 border-t border-border/50">
        <Link href="/" onClick={onClose} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <Home className="w-4 h-4 shrink-0" />
          Back to Home
        </Link>
      </div>

      {/* Operator badge */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold border border-border shrink-0">OP</div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate">Operator 01</span>
            <span className="text-xs text-muted-foreground">Active Duty</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <div className="w-64 border-r border-border bg-sidebar h-full hidden md:flex flex-col">
      <SidebarContent />
    </div>
  )
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  useRealtime()

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden selection:bg-primary/30">
      {/* Desktop sidebar */}
      <div className="w-64 border-r border-border bg-sidebar h-full hidden md:flex flex-col shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-sidebar border-r border-border shadow-xl">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 h-full overflow-hidden flex flex-col relative min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center h-14 px-4 border-b border-border bg-background shrink-0 gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2 text-primary font-bold text-base">
            <Siren className="w-5 h-5" />
            RescueNet AI
          </Link>
        </div>

        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        {children}
      </main>
    </div>
  )
}
