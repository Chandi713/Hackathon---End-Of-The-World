"use client"

import { DashboardData } from "@/lib/types"

export function AlertTicker({ alerts = [] }: { alerts?: DashboardData['alerts'] }) {
  if (!alerts.length) return null

  return (
    <div className="relative overflow-hidden border-b border-border bg-card/50">
      <div className="flex items-center">
        <div className="shrink-0 bg-destructive/10 border-r border-border px-4 py-2">
          <span className="text-xs font-bold text-destructive uppercase tracking-wider font-mono">
            Live Alerts
          </span>
        </div>
        <div className="overflow-hidden flex-1">
          <div className="flex animate-ticker whitespace-nowrap">
            {[...alerts, ...alerts].map((alert, i) => (
              <button
                key={`${alert.id}-${i}`}
                className="inline-flex items-center gap-2 px-6 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
              >
                <div
                  className={`h-2 w-2 rounded-full shrink-0 ${alert.severity === "critical"
                      ? "bg-destructive animate-pulse"
                      : alert.severity === "high"
                        ? "bg-amber-500"
                        : "bg-yellow-500"
                    }`}
                />
                <span className="font-mono text-xs">{alert.text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
