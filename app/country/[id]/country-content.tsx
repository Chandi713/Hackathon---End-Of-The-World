import type { CountryRisk } from "@/lib/types"
import { RiskRadar } from "@/components/country/risk-radar"
import { TimelineChart } from "@/components/country/timeline-chart"
import { RiskTabs } from "@/components/country/risk-tabs"

export function CountryContent({ country }: { country: CountryRisk }) {
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
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <h3 className="text-sm font-semibold text-foreground">
            AI Agent Analysis
          </h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {country.country_name} presents a{" "}
          <span className="text-foreground font-semibold">
            {country.risk_level.toLowerCase()}-risk
          </span>{" "}
          profile with a composite score of{" "}
          <span className="font-mono text-foreground">{country.composite_score}/100</span>.
          The primary threat vector is{" "}
          <span className="text-foreground">{country.top_threat}</span>, with{" "}
          <span className="font-mono text-foreground">{country.active_disasters}</span>{" "}
          active disaster situations currently being monitored. Political stability
          risk registers at{" "}
          <span className="font-mono text-foreground">{country.domain_scores.political}%</span>,
          while weather severity is at{" "}
          <span className="font-mono text-foreground">{country.domain_scores.weather}%</span>.
          Supply chain disruption probability remains elevated due to compounding
          factors across economic pressure ({country.domain_scores.economy}%) and food
          security concerns ({country.domain_scores.food}%). Our multi-agent system
          recommends continued monitoring with escalated alert protocols.
        </p>
      </div>

      {/* Risk Breakdown Tabs */}
      <RiskTabs country={country} />
    </div>
  )
}
