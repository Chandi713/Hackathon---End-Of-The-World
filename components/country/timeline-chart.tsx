"use client"

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  ComposedChart,
  Area,
  ReferenceLine,
} from "recharts"
import { CountryRisk } from "@/lib/types"

interface TimelineChartProps {
  countryName: string
  timeline: CountryRisk['timeline']
}

// Custom tooltip
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload) return null
  return (
    <div className="glass rounded-lg p-3 text-xs border border-border">
      <div className="font-mono font-bold text-foreground mb-1.5">{label}</div>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 mb-0.5">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="text-foreground font-mono">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export function TimelineChart({ countryName, timeline = [] }: TimelineChartProps) {
  // Map timeline data to chart format if needed. Assuming strict structure match for now.
  // Or ensure fallbacks.
  const chartData = timeline.map((t: any) => ({
    year: t.year,
    instability: t.instability || 0,
    weather: t.weather || 0,
    disasters: t.disaster || t.disasters || 0
  }))

  return (
    <div className="glass rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">
          Historical Timeline (2000-2024)
        </h3>
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          Multi-Factor Analysis
        </span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData}>
          <CartesianGrid stroke="hsl(222, 20%, 14%)" strokeDasharray="3 3" />
          <XAxis
            dataKey="year"
            tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "hsl(222, 20%, 16%)" }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "hsl(222, 20%, 16%)" }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "hsl(222, 20%, 16%)" }}
          />
          <ReTooltip content={<CustomTooltip />} />
          <ReferenceLine
            x={2022}
            yAxisId="left"
            stroke="hsl(0, 84%, 60%)"
            strokeDasharray="4 4"
            label={{
              value: "Feb 2022: Russian Invasion",
              position: "top",
              fill: "hsl(0, 84%, 60%)",
              fontSize: 9,
            }}
          />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="instability"
            name="Instability Index"
            stroke="hsl(217, 91%, 60%)"
            fill="hsl(217, 91%, 60%)"
            fillOpacity={0.1}
            strokeWidth={2}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="weather"
            name="Weather Severity"
            stroke="hsl(38, 92%, 50%)"
            strokeWidth={2}
            dot={false}
          />
          <Bar
            yAxisId="right"
            dataKey="disasters"
            name="Disaster Events"
            fill="hsl(0, 84%, 60%)"
            opacity={0.4}
            radius={[2, 2, 0, 0]}
          />
        </ComposedChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3 pt-3 border-t border-border">
        {[
          { label: "Instability Index", color: "hsl(217, 91%, 60%)" },
          { label: "Weather Severity", color: "hsl(38, 92%, 50%)" },
          { label: "Disaster Events", color: "hsl(0, 84%, 60%)" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[10px] text-muted-foreground">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
