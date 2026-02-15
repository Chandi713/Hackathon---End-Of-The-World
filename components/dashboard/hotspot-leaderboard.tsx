"use client"

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { CountryRisk } from "@/lib/types"

function getRiskBg(score: number): string {
  if (score >= 70) return "bg-destructive/10 text-destructive"
  if (score >= 50) return "bg-orange-500/10 text-orange-500"
  if (score >= 30) return "bg-yellow-500/10 text-yellow-500"
  if (score >= 15) return "bg-green-500/10 text-green-500"
  return "bg-green-500/5 text-green-500"
}

function getRiskColor(score: number): string {
  if (score >= 70) return "#ef4444"
  if (score >= 50) return "#f97316"
  if (score >= 30) return "#eab308"
  if (score >= 15) return "#22c55e"
  return "#22c55e"
}

// Mini sparkline component
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const width = 80
  const height = 24
  const points = data
    .map(
      (v, i) =>
        `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`
    )
    .join(" ")

  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function HotspotLeaderboard({ countries = [] }: { countries?: CountryRisk[] }) {
  const router = useRouter()
  // Sort by score desc, take top 10
  const topCountries = [...countries]
    .sort((a, b) => b.composite_score - a.composite_score)
    .slice(0, 10)

  if (!topCountries.length) return null

  return (
    <div className="glass rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">
          Global Hotspots Leaderboard
        </h2>
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          Top 10 At-Risk
        </span>
      </div>
      <div className="divide-y divide-border">
        {topCountries.map((country, i) => {
          // Use timeline for trend, taking recent 4 years instability
          const trend = country.timeline && country.timeline.length > 0
            ? country.timeline.slice(-8).map((t: any) => t.instability)
            : [0, 0, 0, 0]

          const trendEnd = trend[trend.length - 1]
          const trendStart = trend[0]
          const trendDir =
            trendEnd > trendStart
              ? "up"
              : trendEnd < trendStart
                ? "down"
                : "flat"

          return (
            <motion.button
              key={country.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => router.push(`/country/${country.iso3}`)}  // Use iso3 for route
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors group"
            >
              {/* Rank */}
              <span className="w-5 text-xs font-mono text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>

              {/* Country info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    {country.country_name}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 ${getRiskBg(country.composite_score)} border-0`}
                  >
                    {country.risk_level}
                  </Badge>
                </div>
                <span className="text-[10px] text-muted-foreground truncate block">
                  {country.top_threat}
                </span>
              </div>

              {/* Score bar */}
              <div className="w-24 hidden sm:block">
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(country.composite_score, 100)}%` }}
                    transition={{ delay: i * 0.05 + 0.3, duration: 0.8 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: getRiskColor(country.composite_score) }}
                  />
                </div>
              </div>

              {/* Sparkline */}
              <div className="hidden md:block">
                <Sparkline
                  data={trend}
                  color={getRiskColor(country.composite_score)}
                />
              </div>

              {/* Score */}
              <div className="flex items-center gap-1.5 w-14 justify-end">
                <span
                  className="font-mono text-sm font-bold"
                  style={{ color: getRiskColor(country.composite_score) }}
                >
                  {country.composite_score}
                </span>
                {trendDir === "up" ? (
                  <TrendingUp className="h-3 w-3 text-destructive" />
                ) : trendDir === "down" ? (
                  <TrendingDown className="h-3 w-3 text-success" />
                ) : (
                  <Minus className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
