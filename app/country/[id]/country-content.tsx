import type { CountryRisk } from "@/lib/types"
import { RiskRadar } from "@/components/country/risk-radar"
import { TimelineChart } from "@/components/country/timeline-chart"
import { RiskTabs } from "@/components/country/risk-tabs"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"

export function CountryContent({ country }: { country: CountryRisk }) {
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function fetchAnalysis() {
      try {
        const res = await fetch("/api/analyze-country", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ country })
        })
        if (res.ok) {
          const data = await res.json()
          if (mounted && data.analysis) {
            setAnalysis(data.analysis)
          }
        }
      } catch (e) {
        console.error("Failed to fetch analysis:", e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchAnalysis()
    return () => { mounted = false }
  }, [country.iso3]) // Re-run if country changes

  return (
    <div className="space-y-6">
      {/* Radar + Timeline */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RiskRadar country={country} />
        <TimelineChart countryName={country.country_name} timeline={country.timeline} />
      </div>

      {/* AI Insight Panel */}
      <div className="glass rounded-xl border border-primary/20 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className={`h-2 w-2 rounded-full bg-primary ${loading ? "animate-ping" : "animate-pulse"}`} />
          <h3 className="text-sm font-semibold text-foreground">
            AI Agent Analysis
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Analyzing real-time risk vectors...</span>
          </div>
        ) : analysis ? (
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {analysis}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {country.country_name} presents a{" "}
            <span className="text-foreground font-semibold">
              {country.risk_level.toLowerCase()}-risk
            </span>{" "}
            profile with a composite score of{" "}
            <span className="font-mono text-foreground">{country.composite_score}/100</span>.
            The primary threat vector is{" "}
            <span className="text-foreground">{country.top_threat}</span>.
            Based on current metrics, political instability is at {country.domain_scores?.political}%
            and economic pressure is at {country.domain_scores?.economy}%.
          </p>
        )}
      </div>

      {/* Risk Breakdown Tabs */}
      <RiskTabs country={country} />
    </div>
  )
}
