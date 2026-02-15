"use client"

import { useEffect, useState } from "react"
import { AlertTicker } from "@/components/dashboard/alert-ticker"
import { RiskMap } from "@/components/dashboard/risk-map"
import { StatCards } from "@/components/dashboard/stat-cards"
import { HotspotLeaderboard } from "@/components/dashboard/hotspot-leaderboard"
import { ThreatMatrix } from "@/components/dashboard/threat-matrix"
import { DashboardData } from "@/lib/types"
import { ModeToggle } from "@/components/mode-toggle"

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/stats")
        if (!res.ok) throw new Error("Failed to fetch data")
        const json = await res.json()
        setData(json)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-muted-foreground font-mono text-sm">
        INITIALIZING DASHBOARD...
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Alert Ticker */}
      <AlertTicker alerts={data?.alerts} />

      {/* Page Content */}
      <div className="flex-1 p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight text-balance">
              Global Risk Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time supply chain risk intelligence across {data?.summary.total_countries || 0} countries
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              System Online | Last updated: 1 min ago
            </div>
            <ModeToggle />
          </div>
        </div>

        {/* Interactive Map */}
        <div className="glass rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">
              Global Risk Heatmap
            </h2>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              Click a country for deep dive
            </span>
          </div>
          <RiskMap countries={data?.countries} />
        </div>

        {/* Stat Cards */}
        <StatCards data={data?.summary} />

        {/* Bottom Row: Leaderboard + Threat Matrix */}
        <div className="grid gap-6 lg:grid-cols-2">
          <HotspotLeaderboard countries={data?.countries} />
          <ThreatMatrix matrix={data?.threat_matrix} />
        </div>
      </div>
    </div>
  )
}
