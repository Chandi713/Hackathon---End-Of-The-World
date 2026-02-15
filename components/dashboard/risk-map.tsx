"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { CountryRisk } from "@/lib/types"
import { ComposableMap, Geographies, Geography, ZoomableGroup, Sphere, Graticule } from "react-simple-maps"
import { scaleLinear } from "d3-scale"

type Layer = "combined" | "conflict" | "weather" | "disaster"

const geoUrl = "/geo/world-geo.json"

export function RiskMap({ countries = [] }: { countries?: CountryRisk[] }) {
  const [activeLayer, setActiveLayer] = useState<Layer>("combined")
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null)
  const [tooltipContent, setTooltipContent] = useState<CountryRisk | null>(null)
  const router = useRouter()

  const layers: { id: Layer; label: string }[] = [
    { id: "combined", label: "Combined" },
    { id: "conflict", label: "Conflict" },
    { id: "weather", label: "Weather" },
    { id: "disaster", label: "Disaster" },
  ]

  const getRiskForLayer = (country: CountryRisk) => {
    switch (activeLayer) {
      case "conflict":
        return country.domain_scores.political
      case "weather":
        return country.domain_scores.weather
      case "disaster":
        return country.domain_scores.disaster
      default:
        return country.composite_score
    }
  }

  const colorScale = useMemo(() => {
    return scaleLinear<string>()
      .domain([0, 20, 40, 60, 80, 100])
      .range(["#22c55e", "#22c55e", "#eab308", "#f97316", "#ef4444", "#ef4444"])
  }, [])

  const getRiskColor = (score: number) => {
    return colorScale(score)
  }

  // Create a map of ISO3 -> CountryRisk for fast lookup
  const countryMap = useMemo(() => {
    const map = new Map<string, CountryRisk>()
    countries.forEach(c => map.set(c.iso3, c))
    return map
  }, [countries])

  return (
    <div className="relative w-full h-[500px] bg-card/30 rounded-xl overflow-hidden border border-border/50">
      {/* Layer Toggle */}
      <div className="absolute top-4 right-4 z-10 flex gap-1 rounded-lg glass p-1 backdrop-blur-md bg-background/40">
        {layers.map((layer) => (
          <button
            key={layer.id}
            onClick={() => setActiveLayer(layer.id)}
            className={cn(
              "px-3 py-1.5 text-xs font-mono rounded-md transition-all",
              activeLayer === layer.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {layer.label}
          </button>
        ))}
      </div>

      <ComposableMap projectionConfig={{ rotate: [-10, 0, 0], scale: 175 }} className="w-full h-full">
        <ZoomableGroup center={[0, 0]} zoom={1}>
          <Sphere stroke="#222" strokeWidth={0.5} id="sphere" fill="transparent" />
          <Graticule stroke="#222" strokeWidth={0.5} />

          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                // Try to find the country by Name or ISO3? 
                // The topojson usually has Names or ISO numeric/alpha codes. 
                // "United States of America" -> "USA"
                // I need to map topojson properties to my data.
                // world-110m usually uses Names or numeric codes.
                // My data has ISO3. 
                // Using a utility to map or fuzzy match might be needed if IDs don't match.
                // But let's assume valid ISO3 if possible or relax it.
                // Actually, standard world-atlas topojson `id` is usually ISO 3166-1 numeric code (string '840').
                // I need to convert numeric to ISO3? Or name to ISO3?
                // `react-simple-maps` examples often use `geo.properties.name`.
                // My `countryMap` keys are ISO3.
                // I'll try to match by name first? Or I should have a mapping.
                // Wait, I can't easily map '840' to 'USA' in frontend without a huge table.
                // `geo.properties.name` is "United States of America". My data has "United States".
                // I'll try to match by name if possible, or use the `scripts/fips_map` logic... no, that's python.
                // The `risk_scores.json` has `country_name`.

                const countryName = geo.properties.name;
                // Simple name match:
                let countryData = countries.find(c => c.country_name === countryName);

                // If not found, try to fuzzy match common mismatched names (manual overrides)
                if (!countryData) {
                  if (countryName === "United States of America") countryData = countryMap.get("usa");
                  else if (countryName === "Dem. Rep. Congo") countryData = countryMap.get("cod"); // "cod" usually
                  else if (countryName === "Dominican Rep.") countryData = countryMap.get("dom");
                  else if (countryName === "Falkland Is.") countryData = countryMap.get("flk");
                  else if (countryName === "Fr. S. Antarctic Lands") countryData = countryMap.get("atf");
                  else if (countryName === "Central African Rep.") countryData = countryMap.get("caf");
                  else if (countryName === "Eq. Guinea") countryData = countryMap.get("gnq");
                  else if (countryName === "eSwatini") countryData = countryMap.get("swz");
                  else if (countryName === "Bosnia and Herz.") countryData = countryMap.get("bih");
                  else if (countryName === "S. Sudan") countryData = countryMap.get("ssd");
                  // Add more if needed.
                }

                // If still not found, search by partial?
                if (!countryData && countryName) {
                  countryData = countries.find(c =>
                    (c.country_name && typeof c.country_name === 'string' && c.country_name.includes(countryName)) ||
                    (c.country_name && typeof c.country_name === 'string' && countryName.includes(c.country_name))
                  );
                }

                const score = countryData ? getRiskForLayer(countryData) : 0;
                const color = countryData ? getRiskColor(score) : "#1f2937"; // Dark gray if no data

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={() => {
                      if (countryData) {
                        setHoveredCountry(countryData.iso3)
                        setTooltipContent(countryData)
                      }
                    }}
                    onMouseLeave={() => {
                      setHoveredCountry(null)
                      setTooltipContent(null)
                    }}
                    onClick={() => {
                      if (countryData) {
                        router.push(`/country/${countryData.iso3}`)
                      }
                    }}
                    style={{
                      default: {
                        fill: color,
                        outline: "none",
                        stroke: "#111",
                        strokeWidth: 0.5,
                        transition: "all 250ms"
                      },
                      hover: {
                        fill: countryData ? color : "#374151",
                        outline: "none",
                        stroke: "#fff",
                        strokeWidth: 1,
                        cursor: "pointer",
                        filter: "brightness(1.2)"
                      },
                      pressed: {
                        fill: countryData ? color : "#374151",
                        outline: "none",
                        stroke: "#fff",
                        strokeWidth: 1.5,
                      },
                    }}
                  />
                )
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltipContent && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-4 left-4 glass rounded-lg p-4 min-w-[240px] z-20 pointer-events-none shadow-2xl border border-white/10 bg-black/80 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
              <span className="font-bold text-base text-foreground bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                {tooltipContent.country_name}
              </span>
              <div className="flex flex-col items-end">
                <span
                  className="font-mono text-lg font-black leading-none"
                  style={{ color: getRiskColor(getRiskForLayer(tooltipContent)) }}
                >
                  {Math.round(getRiskForLayer(tooltipContent))}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Score</span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-zinc-400">
              <div className="flex justify-between items-center bg-white/5 p-1.5 rounded">
                <span className="text-[10px] uppercase tracking-wide">Top Threat</span>
                <span className="text-white font-medium">{tooltipContent.top_threat}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="flex flex-col bg-white/5 p-1.5 rounded">
                  <span className="text-[10px] text-zinc-500 uppercase">Disasters</span>
                  <span className="text-white font-mono">{tooltipContent.active_disasters}</span>
                </div>
                <div className="flex flex-col bg-white/5 p-1.5 rounded">
                  <span className="text-[10px] text-zinc-500 uppercase">Risk Level</span>
                  <span
                    className="font-mono font-bold"
                    style={{ color: getRiskColor(tooltipContent.composite_score) }}
                  >
                    {tooltipContent.risk_level}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-500">
              <span>ISO: {tooltipContent.iso3}</span>
              <span className="flex items-center gap-1">
                View Details <span className="text-xs">→</span>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
