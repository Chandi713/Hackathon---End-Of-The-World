"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { DashboardData } from "@/lib/types"

const columns = ["Conflict", "Weather", "Pandemic", "Trade"]
const columnKeys = ["conflict", "weather", "pandemic", "trade"] as const

function getIntensityColor(value: number) {
  if (value >= 85) return { bg: "rgba(239,68,68,0.5)", text: "text-red-300" }
  if (value >= 65) return { bg: "rgba(245,158,11,0.4)", text: "text-amber-300" }
  if (value >= 45) return { bg: "rgba(234,179,8,0.3)", text: "text-yellow-300" }
  if (value >= 25) return { bg: "rgba(34,197,94,0.25)", text: "text-green-300" }
  return { bg: "rgba(34,197,94,0.1)", text: "text-green-400" }
}

export function ThreatMatrix({ matrix = [] }: { matrix?: DashboardData['threat_matrix'] }) {
  const [hoveredCell, setHoveredCell] = useState<{
    supply: string
    column: string
    value: number
  } | null>(null)

  if (!matrix.length) return null

  return (
    <div className="glass rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">
          Supply Chain Threat Matrix
        </h2>
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          Impact Severity
        </span>
      </div>

      <div className="p-4">
        {/* Header row */}
        <div className="grid grid-cols-5 gap-2 mb-2">
          <div /> {/* Empty corner */}
          {columns.map((col) => (
            <div
              key={col}
              className="text-center text-[10px] font-mono uppercase tracking-wider text-muted-foreground"
            >
              {col}
            </div>
          ))}
        </div>

        {/* Data rows */}
        {matrix.map((row, rowIdx) => (
          <div key={row.supply} className="grid grid-cols-5 gap-2 mb-2">
            <div className="flex items-center text-xs font-medium text-foreground">
              {row.supply}
            </div>
            {columnKeys.map((col, colIdx) => {
              const value = row[col]
              const { bg, text } = getIntensityColor(value)
              const isHovered =
                hoveredCell?.supply === row.supply &&
                hoveredCell?.column === col
              return (
                <motion.div
                  key={col}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: rowIdx * 0.05 + colIdx * 0.05,
                    duration: 0.3,
                  }}
                  onMouseEnter={() =>
                    setHoveredCell({ supply: row.supply, column: col, value })
                  }
                  onMouseLeave={() => setHoveredCell(null)}
                  className={`relative flex items-center justify-center rounded-lg h-12 cursor-default transition-all ${isHovered ? "ring-1 ring-primary/50 scale-105" : ""
                    }`}
                  style={{ backgroundColor: bg }}
                >
                  <span className={`font-mono text-sm font-bold ${text}`}>
                    {value}
                  </span>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -top-10 left-1/2 -translate-x-1/2 glass rounded-md px-2 py-1 text-[10px] text-foreground whitespace-nowrap z-10"
                    >
                      {row.supply} x {columns[colIdx]}: {value}% impact
                    </motion.div>
                  )}
                </motion.div>
              )
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border">
          <div className="flex items-center gap-6">
            {[
              { label: "Low", color: "rgba(34,197,94,0.25)" },
              { label: "Medium", color: "rgba(234,179,8,0.3)" },
              { label: "High", color: "rgba(245,158,11,0.4)" },
              { label: "Critical", color: "rgba(239,68,68,0.5)" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[10px] text-muted-foreground">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
