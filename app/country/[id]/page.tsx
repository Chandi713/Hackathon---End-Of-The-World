"use client"

import { use, useState, useEffect } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getRiskColor, getRiskBg } from "@/lib/mock-data"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, MessageSquare } from "lucide-react"
import { CountryContent } from "./country-content"
import { CountryRisk } from "@/lib/types"

export default function CountryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [country, setCountry] = useState<CountryRisk | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/countries/${id}`)
        if (!res.ok) throw new Error("Failed to fetch country")
        const data = await res.json()
        setCountry(data)
      } catch (error) {
        console.error("Error fetching country:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [id])

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-muted-foreground font-mono text-sm">
        LOADING INTELLIGENCE...
      </div>
    )
  }

  if (!country) return notFound()

  return (
    <div className="flex flex-col min-h-screen p-4 lg:p-6 space-y-6">
      {/* Back nav */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {/* Country Header */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        {/* Risk Gauge */}
        <div className="relative flex items-center justify-center">
          <svg width={120} height={120} viewBox="0 0 120 120">
            {/* Background ring */}
            <circle
              cx={60}
              cy={60}
              r={50}
              fill="none"
              stroke="hsl(222, 20%, 14%)"
              strokeWidth={8}
            />
            {/* Score ring */}
            <circle
              cx={60}
              cy={60}
              r={50}
              fill="none"
              stroke={getRiskColor(country.composite_score)}
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={`${(country.composite_score / 100) * 314} 314`}
              transform="rotate(-90 60 60)"
              className="transition-all duration-1000"
            />
            <text
              x={60}
              y={55}
              textAnchor="middle"
              fill="hsl(210, 40%, 96%)"
              fontSize={28}
              fontWeight={700}
              fontFamily="var(--font-jetbrains)"
            >
              {country.composite_score}
            </text>
            <text
              x={60}
              y={72}
              textAnchor="middle"
              fill="hsl(215, 20%, 55%)"
              fontSize={9}
              fontFamily="var(--font-inter)"
            >
              RISK SCORE
            </text>
          </svg>
        </div>

        {/* Country Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              {country.country_name}
            </h1>
            <Badge className={`${getRiskBg(country.composite_score)} border-0 font-mono text-xs`}>
              {country.risk_level}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <div>
              <span className="text-[10px] uppercase tracking-wider block text-muted-foreground/70">Top Threat</span>
              <span className="text-foreground">{country.top_threat}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider block text-muted-foreground/70">Active Alerts</span>
              <span className="font-mono text-foreground">{country.active_disasters}</span>
            </div>
          </div>
        </div>

        {/* AI Button */}
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
        >
          <MessageSquare className="h-4 w-4" />
          Ask AI about {country.country_name}
        </Link>
      </div>

      <CountryContent country={country} />
    </div>
  )
}
