import { motion } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AreaChart, Area,
  ComposedChart, Line, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts"
import type { CountryRisk } from "@/lib/types"

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="glass rounded-lg p-3 text-xs border border-border shadow-xl backdrop-blur-md bg-background/90">
      <div className="font-mono font-bold text-foreground mb-2 pb-1 border-b border-border">{label}</div>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 justify-between min-w-[120px]">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
          </div>
          <span className="text-foreground font-mono font-medium">{typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export function RiskTabs({ country }: { country: CountryRisk }) {
  const conflictData = country.monthly_conflict?.map((d: any) => ({
    month: d.month,
    events: d.events || 0,
    fatalities: d.fatalities || 0
  })) || []

  // Enhanced weather data with simulated precipitation for aesthetics
  const weatherData = country.monthly_weather?.map((d: any) => ({
    month: d.month,
    tempAnomaly: d.temp_anomaly || 0,
    precip: Math.max(0, (Math.sin(d.month.charCodeAt(0)) * 50) + 50 + (Math.random() * 20)), // Simulated precip
  })) || []

  // Generate colors for pie chart
  const pieColors = ["#3b82f6", "#ef4444", "#f59e0b", "#06b6d4", "#f97316"]
  const disasterTypes = country.disaster_breakdown?.map((d: any, i: number) => ({
    name: d.type,
    value: d.count,
    color: pieColors[i % pieColors.length]
  })) || []

  const totalDisasters = disasterTypes.reduce((acc: number, curr: any) => acc + curr.value, 0) || 0

  // Simulated Cascade Network Data
  const cascadeNodes = [
    { id: "central", x: 300, y: 150, r: 25, color: country.color, label: country.iso3 },
    { id: "n1", x: 150, y: 80, r: 15, color: "#3b82f6", label: "Neighbor 1" },
    { id: "n2", x: 450, y: 80, r: 18, color: "#ef4444", label: "Trade Partner" },
    { id: "n3", x: 100, y: 200, r: 12, color: "#f59e0b", label: "Reg. Ally" },
    { id: "n4", x: 500, y: 220, r: 16, color: "#06b6d4", label: "Supplier" },
    { id: "n5", x: 300, y: 280, r: 14, color: "#8b5cf6", label: "Energy Src" },
  ]

  const cascadeLinks = [
    { source: "n1", target: "central", risk: "high" },
    { source: "n2", target: "central", risk: "critical" },
    { source: "n3", target: "central", risk: "low" },
    { source: "n4", target: "central", risk: "moderate" },
    { source: "n5", target: "central", risk: "high" },
  ]

  return (
    <div className="glass rounded-xl border border-border overflow-hidden">
      <Tabs defaultValue="cascade" className="w-full">
        <div className="border-b border-border px-4 py-3 bg-muted/20">
          <TabsList className="bg-background/50 h-9 p-1 gap-1">
            <TabsTrigger value="conflict" className="text-xs px-3 data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-md">
              Conflict & Politics
            </TabsTrigger>
            <TabsTrigger value="weather" className="text-xs px-3 data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-md">
              Weather & Climate
            </TabsTrigger>
            <TabsTrigger value="disasters" className="text-xs px-3 data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-md">
              Disasters
            </TabsTrigger>
            <TabsTrigger value="cascade" className="text-xs px-3 data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-md">
              Cascade Risk
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="conflict" className="p-6 mt-0">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={conflictData}>
                <defs>
                  <linearGradient id="colorConflict" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#ef4444', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="events" name="Conflict Events" stroke="#ef4444" strokeWidth={2} fill="url(#colorConflict)" />
                <Area type="monotone" dataKey="fatalities" name="Fatalities" stroke="#f59e0b" strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="weather" className="p-6 mt-0">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={weatherData}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fill: "#ef4444", fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: 'Temp (°C)', angle: -90, position: 'insideLeft', fill: '#ef4444', fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: "#3b82f6", fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: 'Precip (mm)', angle: 90, position: 'insideRight', fill: '#3b82f6', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#334155', opacity: 0.1 }} />
                <Bar yAxisId="right" dataKey="precip" name="Precipitation" fill="#3b82f6" opacity={0.3} radius={[4, 4, 0, 0]} barSize={20} />
                <Line yAxisId="left" type="monotone" dataKey="tempAnomaly" name="Temp Anomaly" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: "#ef4444", strokeWidth: 2, stroke: "#000" }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="disasters" className="p-6 mt-0">
          <div className="flex flex-col md:flex-row items-center gap-8 h-[300px]">
            <div className="relative w-full md:w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={disasterTypes}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {disasterTypes.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold font-mono text-foreground">{totalDisasters}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Events</span>
              </div>
            </div>

            <div className="w-full md:w-1/2 space-y-4 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
              <h4 className="text-sm font-semibold text-muted-foreground border-b border-border pb-2">Disaster Breakdown</h4>
              {disasterTypes.map((type: any, i: number) => (
                <div key={`${type.name}-${i}`} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full ring-2 ring-transparent group-hover:ring-offset-1 group-hover:ring-2 transition-all" style={{ backgroundColor: type.color, ["--tw-ring-color" as any]: type.color }} />
                    <span className="text-sm text-foreground font-medium">{type.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(type.value / totalDisasters) * 100}%`, backgroundColor: type.color }} />
                    </div>
                    <span className="font-mono text-sm text-foreground w-6 text-right">{type.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="cascade" className="p-6 mt-0 relative min-h-[350px] flex items-center justify-center bg-black/20 rounded-lg">
          <div className="absolute top-4 left-4 z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-semibold text-red-400">Critical Risk Flow</span>
            </div>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              Simulated risk propagation network showing dependencies and vulnerability transfer.
            </p>
          </div>

          <svg viewBox="0 0 600 400" className="w-full h-full max-w-[800px]">
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="22" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" opacity="0.5" />
              </marker>
            </defs>

            {/* Connection Lines */}
            {cascadeLinks.map((link, i) => {
              const s = cascadeNodes.find(n => n.id === link.source)!
              const t = cascadeNodes.find(n => n.id === link.target)!
              const color = link.risk === "critical" ? "#ef4444" : link.risk === "high" ? "#f97316" : "#3b82f6"

              return (
                <g key={i}>
                  <line x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke={color} strokeWidth={link.risk === "critical" ? 3 : 1} strokeOpacity={0.4} strokeDasharray="4 4" />
                  <circle r={3} fill={color}>
                    <animateMotion dur={`${2 + Math.random()}s`} repeatCount="indefinite" path={`M${s.x},${s.y} L${t.x},${t.y}`} />
                  </circle>
                </g>
              )
            })}

            {/* Nodes */}
            {cascadeNodes.map((node, i) => (
              <g key={node.id}>
                {/* Pulse effect for central node */}
                {node.id === "central" && (
                  <circle cx={node.x} cy={node.y} r={node.r + 10} fill="none" stroke={node.color} opacity="0.3">
                    <animate attributeName="r" from={node.r} to={node.r + 20} dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.3" to="0" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}

                <circle cx={node.x} cy={node.y} r={node.r} fill={node.color} stroke="#1e293b" strokeWidth={3} className="drop-shadow-lg" />
                <text x={node.x} y={node.y + node.r + 15} textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold">{node.label}</text>
              </g>
            ))}
          </svg>
        </TabsContent>
      </Tabs>
    </div>
  )
}
