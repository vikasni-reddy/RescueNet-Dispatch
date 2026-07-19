import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export type RealtimeEvent =
  | { type: "incident:new";     id: number; urgency: string; priorityScore: number; summary: string | null }
  | { type: "incident:updated"; id: number; status: string }
  | { type: "incident:dispatched"; id: number; resourceName: string }

/**
 * Subscribes to the /api/events SSE stream.
 * On any incident event, invalidates the relevant React Query keys immediately
 * so the dashboard and incident queue refresh without waiting for their poll interval.
 */
export function useRealtime() {
  const queryClient = useQueryClient()
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let es: EventSource | null = null
    let destroyed = false

    function connect() {
      if (destroyed) return
      es = new EventSource("/api/events")

      es.addEventListener("connected", () => {
        // Clear any pending reconnect timer on successful connection
        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current)
          reconnectTimer.current = null
        }
      })

      es.addEventListener("incident:new", (e: MessageEvent) => {
        const data = JSON.parse(e.data) as RealtimeEvent & { type: "incident:new" }

        // Immediately refresh all incident-related queries — no waiting for poll interval
        queryClient.invalidateQueries({ queryKey: ["incidents"] })
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
        queryClient.invalidateQueries({ queryKey: ["activity"] })

        const urgencyLabel = data.urgency?.toUpperCase() ?? "NEW"
        const desc = data.summary
          ? data.summary.length > 90 ? data.summary.slice(0, 87) + "…" : data.summary
          : "Emergency report received"

        toast.warning(`⚠ ${urgencyLabel} incident reported`, {
          description: desc,
          duration: 10_000,
          action: {
            label: "View",
            onClick: () => { window.location.href = `/incidents/${data.id}` },
          },
        })
      })

      es.addEventListener("incident:updated", (e: MessageEvent) => {
        const data = JSON.parse(e.data) as RealtimeEvent & { type: "incident:updated" }
        queryClient.invalidateQueries({ queryKey: ["incident", String(data.id)] })
        queryClient.invalidateQueries({ queryKey: ["incidents"] })
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      })

      es.addEventListener("incident:dispatched", (e: MessageEvent) => {
        const data = JSON.parse(e.data) as RealtimeEvent & { type: "incident:dispatched" }
        queryClient.invalidateQueries({ queryKey: ["incidents"] })
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
        queryClient.invalidateQueries({ queryKey: ["activity"] })
        toast.success(`${data.resourceName} dispatched`, { duration: 6_000 })
      })

      es.onerror = () => {
        es?.close()
        // Reconnect after 3 seconds if not destroyed
        if (!destroyed) {
          reconnectTimer.current = setTimeout(connect, 3_000)
        }
      }
    }

    connect()

    return () => {
      destroyed = true
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      es?.close()
    }
  }, [queryClient])
}
