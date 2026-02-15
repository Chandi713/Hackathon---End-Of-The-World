"use client"

import { motion } from "framer-motion"
import { Globe, AlertTriangle, Flame, Waves, BarChart3 } from "lucide-react"
import { AnimatedCounter } from "@/components/animated-counter"
import { DashboardData } from "@/lib/types"

export function StatCards({ data }: { data?: DashboardData['summary'] }) {
  const stats = [
    {
      label: "Countries Monitored",
      value: data?.total_countries || 0,
      icon: Globe,
      color: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/20",
    },
    {
      label: "Active Hotspots",
      value: data?.active_hotspots || 0,
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      borderColor: "border-destructive/20",
      pulse: true,
    },
    {
      label: "Conflict Events",
      value: data?.total_conflict_events || 0,
      icon: Flame,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
      suffix: "",
    },
    {
      label: "Disaster Events",
      value: data?.total_disasters || 0,
      icon: Waves,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
      borderColor: "border-cyan-500/20",
    },
    {
      label: "Data Points Analyzed",
      value: data?.total_data_points || 0,
      icon: BarChart3,
      color: "text-success",
      bgColor: "bg-success/10",
      borderColor: "border-success/20",
      suffix: "+",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {stats.map((stat, i) => {
        const Icon = stat.icon
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className={`glass glass-hover rounded-xl p-4 border ${stat.borderColor} group`}
            title={stat.label}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className={`rounded-lg p-1.5 ${stat.bgColor}`}>
                <Icon className={`h-3.5 w-3.5 ${stat.color}`} />
              </div>
            </div>
            <div className="font-mono text-xl lg:text-2xl font-bold text-foreground truncate">
              <AnimatedCounter
                end={stat.value}
                suffix={stat.suffix || ""}
                duration={2500}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-1 truncate">
              {stat.label}
            </div>
            {stat.pulse && (stat.value > 0) && (
              <div className="mt-2 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
                </span>
                <span className="text-[10px] text-destructive font-mono">LIVE</span>
              </div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
