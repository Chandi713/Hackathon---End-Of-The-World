"use client"

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts"
import type { CountryRisk } from "@/lib/types"

interface RiskRadarProps {
  country: CountryRisk
}

export function RiskRadar({ country }: RiskRadarProps) {
  const data = [
    { axis: "Political", value: country.domain_scores.political, fullMark: 100 },
    { axis: "Weather", value: country.domain_scores.weather, fullMark: 100 },
    { axis: "Disaster", value: country.domain_scores.disaster, fullMark: 100 },
    { axis: "Economic", value: country.domain_scores.economy, fullMark: 100 },
    { axis: "Food", value: country.domain_scores.food, fullMark: 100 },
    { axis: "Health", value: country.domain_scores.health, fullMark: 100 },
  ]

  return (
    <div className="glass rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">
          Multi-Domain Risk Profile
        </h3>
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          6-Axis Radar
        </span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="hsl(222, 20%, 16%)" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: "hsl(215, 20%, 45%)", fontSize: 9 }}
            tickCount={5}
          />
          <Radar
            name={country.country_name}
            dataKey="value"
            stroke="hsl(217, 91%, 60%)"
            fill="hsl(217, 91%, 60%)"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
