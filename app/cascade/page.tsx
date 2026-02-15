"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  AlertTriangle,
  Play,
  RotateCcw,
  ChevronDown,
  Zap,
  TrendingDown,
  DollarSign,
  Clock,
  ArrowRight,
} from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface CascadeNode {
  id: string
  label: string
  type: "origin" | "primary" | "secondary" | "tertiary"
  x: number
  y: number
  risk: number
  impact: string
  delay: number
  active: boolean
  description: string
}

interface CascadeEdge {
  from: string
  to: string
  active: boolean
}


function getRiskColor(risk: number) {
  if (risk >= 85) return "text-red-400"
  if (risk >= 70) return "text-amber-400"
  if (risk >= 50) return "text-yellow-400"
  return "text-emerald-400"
}

function getNodeBg(type: string, active: boolean) {
  if (!active) return "bg-secondary/50 border-border/50"
  switch (type) {
    case "origin": return "bg-red-500/20 border-red-500/60"
    case "primary": return "bg-amber-500/20 border-amber-500/60"
    case "secondary": return "bg-blue-500/20 border-blue-500/60"
    case "tertiary": return "bg-purple-500/20 border-purple-500/60"
    default: return "bg-secondary border-border"
  }
}

function getNodeGlow(type: string) {
  switch (type) {
    case "origin": return "shadow-[0_0_20px_rgba(239,68,68,0.3)]"
    case "primary": return "shadow-[0_0_15px_rgba(245,158,11,0.25)]"
    case "secondary": return "shadow-[0_0_12px_rgba(59,130,246,0.2)]"
    case "tertiary": return "shadow-[0_0_10px_rgba(168,85,247,0.2)]"
    default: return ""
  }
}

export default function CascadePage() {
  // --- DYNAMIC LOGIC ---
  const [allCountries, setAllCountries] = useState<any[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [nodes, setNodes] = useState<CascadeNode[]>([])
  const [edges, setEdges] = useState<CascadeEdge[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [currentStep, setCurrentStep] = useState(-1)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  // Scenarios State
  const [scenarios, setScenarios] = useState<any[]>([])
  const [selectedScenario, setSelectedScenario] = useState<any>(null)
  const [enrichedDescriptions, setEnrichedDescriptions] = useState<Record<string, string>>({})

  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 1. Fetch Data on Mount
  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        if (data.countries) {
          setAllCountries(data.countries)
          generateScenarios(data.countries)
        }
      })
      .catch(err => console.error("Failed to load countries:", err))
  }, [])

  // 2. Generate Scenarios List (Featured + High Risk)
  const generateScenarios = (countries: any[]) => {
    const featured = [
      { iso3: 'UKR', label: 'Ukraine Grain Crisis', icon: 'wheat', description: 'Conflict disrupts global food supply chain', severity: 'critical' },
      { iso3: 'ISR', label: 'Middle East Tech/Security', icon: 'shield', description: 'Regional instability affects tech & logistics', severity: 'critical' },
      { iso3: 'PAK', label: 'Pakistan Climate/Debt', icon: 'cloud-rain', description: 'Floods compound economic vulnerability', severity: 'high' }
    ]

    const dynamicList = countries
      .filter(c => !['UKR', 'ISR', 'PAK'].includes(c.iso3))
      .sort((a: any, b: any) => (b.composite_score || 0) - (a.composite_score || 0)) // Sort by risk
      .slice(0, 10) // Top 10 highest risk
      .map(c => ({
        iso3: c.iso3,
        label: `${c.country_name || c.name || c.id || "Unknown"} Risk Analysis`,
        icon: 'alert-triangle', // Default icon
        description: `High risk detected in ${c.active_disasters > 0 ? 'Disaster' : 'Conflict'} & Economy`,
        severity: (c.risk_level || 'high').toLowerCase()
      }))

    const list = [...featured, ...dynamicList].map(s => {
      // Enrich with real data if available
      const country = countries.find(c => c.iso3 === s.iso3)
      return {
        ...s,
        id: s.iso3,
        countryData: country,
        estimatedImpact: country ? `$${(Math.random() * 2 + 0.5).toFixed(1)}T` : '$1.2T', // Sim impact
        timeToRecover: '12-24 months'
      }
    })

    setScenarios(list)
    if (list.length > 0) {
      selectScenario(list[0])
    }
  }

  // 3. Generate Graph for Selected Scenario
  const generateGraph = (scenario: any) => {
    if (!scenario?.countryData) return { nodes: [], edges: [] }
    const c = scenario.countryData
    const risk = c.composite_score || 50
    const conflict = c.domain_scores?.conflict || 50
    const economy = c.domain_scores?.economy || 50
    const weather = c.domain_scores?.weather || 50

    // Nodes
    const newNodes: CascadeNode[] = []

    // Origin
    newNodes.push({
      id: "origin", label: scenario.label, type: "origin", x: 50, y: 8,
      risk: risk, impact: "Origin Event", delay: 0, active: false,
      description: `Primary disruption event in ${c.name}`
    })

    // Primary (Based on domains)
    if (conflict > 60) {
      newNodes.push({ id: "p1", label: "Port Closures", type: "primary", x: 20, y: 28, risk: conflict, impact: "Logistics Halt", delay: 1, active: false, description: "Security concerns close major ports" })
    } else {
      newNodes.push({ id: "p1", label: "Labor Strikes", type: "primary", x: 20, y: 28, risk: economy, impact: "Workforce drop", delay: 1, active: false, description: "Economic unrest leads to strikes" })
    }

    if (economy > 60) {
      newNodes.push({ id: "p2", label: "Currency Crash", type: "primary", x: 50, y: 28, risk: economy, impact: "Inflation +15%", delay: 1, active: false, description: "Local currency devalues rapidly" })
    } else {
      newNodes.push({ id: "p2", label: "Trade Barriers", type: "primary", x: 50, y: 28, risk: 65, impact: "Tariffs", delay: 1, active: false, description: "New export restrictions imposed" })
    }

    if (weather > 60) {
      newNodes.push({ id: "p3", label: "Infra Damage", type: "primary", x: 80, y: 28, risk: weather, impact: "Power Outages", delay: 1, active: false, description: "Critical infrastructure damaged by event" })
    } else {
      newNodes.push({ id: "p3", label: "Supply Shock", type: "primary", x: 80, y: 28, risk: risk, impact: "Shortages", delay: 1, active: false, description: "Sudden drop in component availability" })
    }

    // Secondary (Generic downstream)
    newNodes.push({ id: "s1", label: "Global Mfg", type: "secondary", x: 15, y: 50, risk: risk - 10, impact: "-20% Output", delay: 3, active: false, description: "Manufacturing slowdown globally" })
    newNodes.push({ id: "s2", label: "Tech Sector", type: "secondary", x: 50, y: 50, risk: risk - 5, impact: "Chip Shortage", delay: 3, active: false, description: "High-tech components delayed" })
    newNodes.push({ id: "s3", label: "Energy Market", type: "secondary", x: 85, y: 50, risk: risk - 15, impact: "Price Volatility", delay: 3, active: false, description: "Energy prices fluctuate wildly" })

    // Tertiary
    newNodes.push({ id: "t1", label: "GDP Contraction", type: "tertiary", x: 20, y: 72, risk: risk - 20, impact: "-0.5% Global", delay: 6, active: false, description: "Global economic slowdown" })
    newNodes.push({ id: "t2", label: "Consumer Cost", type: "tertiary", x: 50, y: 72, risk: risk - 10, impact: "CPI +2%", delay: 6, active: false, description: "Cost of living increases" })
    newNodes.push({ id: "t3", label: "Geopolitics", type: "tertiary", x: 80, y: 72, risk: conflict, impact: "Tension Rise", delay: 6, active: false, description: "Diplomatic relations strain" })

    // Edges
    const newEdges: CascadeEdge[] = [
      { from: "origin", to: "p1", active: false }, { from: "origin", to: "p2", active: false }, { from: "origin", to: "p3", active: false },
      { from: "p1", to: "s1", active: false }, { from: "p2", to: "s2", active: false }, { from: "p3", to: "s3", active: false },
      { from: "p2", to: "s1", active: false }, { from: "p2", to: "s3", active: false },
      { from: "s1", to: "t1", active: false }, { from: "s2", to: "t2", active: false }, { from: "s3", to: "t2", active: false }, { from: "s3", to: "t3", active: false }
    ]

    return { nodes: newNodes, edges: newEdges }
  }

  const selectScenario = (scenario: any) => {
    setSelectedScenario(scenario)
    const { nodes: newNodes, edges: newEdges } = generateGraph(scenario)
    setNodes(newNodes)
    setEdges(newEdges)
    setDropdownOpen(false)
    setIsRunning(false)
    setCurrentStep(-1)
  }

  // Enrich scenarios with AI descriptions
  useEffect(() => {
    const fetchEnrichment = async () => {
      if (scenarios.length === 0 || Object.keys(enrichedDescriptions).length > 0) return

      // Filter for dynamic scenarios only (skip hardcoded featured ones if we want, or include them)
      // Let's include everything that has countryData
      const targets = scenarios
        .filter(s => s.countryData)
        .map(s => ({
          country_name: s.countryData.country_name || s.countryData.name,
          iso3: s.iso3,
          composite_score: s.countryData.composite_score
        }))

      if (targets.length === 0) return

      try {
        const res = await fetch("/api/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ countries: targets })
        })
        if (res.ok) {
          const data = await res.json()
          if (data.descriptions) {
            setEnrichedDescriptions(data.descriptions)
          }
        }
      } catch (e) {
        console.error("Failed to enrich scenarios:", e)
      }
    }

    // Debounce slightly to ensure state is settled
    const timer = setTimeout(fetchEnrichment, 1000)
    return () => clearTimeout(timer)
  }, [scenarios, enrichedDescriptions])

  const runSimulation = useCallback(() => {
    setIsRunning(true)
    setCurrentStep(0)
    // Reset active state
    setNodes(prev => prev.map(n => ({ ...n, active: false })))
    setEdges(prev => prev.map(e => ({ ...e, active: false })))
  }, [])

  const resetSimulation = useCallback(() => {
    // Determine next scenario index
    if (!scenarios.length) return
    const idx = scenarios.findIndex(s => s.id === selectedScenario?.id)
    const nextIdx = (idx + 1) % scenarios.length
    selectScenario(scenarios[nextIdx])
  }, [scenarios, selectedScenario])

  // Auto-run when scenario changes
  useEffect(() => {
    if (selectedScenario) {
      runSimulation()
    }
  }, [selectedScenario, runSimulation])

  useEffect(() => {
    if (!isRunning || currentStep < 0) return

    const stepTypes = ["origin", "primary", "secondary", "tertiary"]
    if (currentStep >= stepTypes.length) {
      setIsRunning(false)
      return
    }

    const timer = setTimeout(() => {
      const currentType = stepTypes[currentStep]
      setNodes(prev =>
        prev.map(n => n.type === currentType ? { ...n, active: true } : n)
      )
      setEdges(prev =>
        prev.map(e => {
          const fromNode = nodes.find(n => n.id === e.from) // use current nodes
          if (!fromNode) return e
          const prevStep = currentStep === 0 ? "origin" : stepTypes[currentStep - 1]
          if (fromNode.type === prevStep || fromNode.type === currentType) {
            return { ...e, active: true }
          }
          return e
        })
      )
      setCurrentStep(prev => prev + 1)
    }, 800)

    return () => clearTimeout(timer)
  }, [isRunning, currentStep, nodes]) // depend on nodes

  const getNodeCenter = (node: CascadeNode) => ({
    x: node.x,
    y: node.y + 3,
  })

  const activeNodes = nodes.filter(n => n.active)
  const totalRisk = activeNodes.length > 0
    ? Math.round(activeNodes.reduce((acc, n) => acc + n.risk, 0) / activeNodes.length)
    : 0

  if (!selectedScenario) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse">Initializing Live Cascade Models...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Cascade Simulator
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Model how disruptions propagate through global supply chains
            </p>
          </div>
          <div className="flex gap-3">
            <ModeToggle />
            <Button
              onClick={runSimulation}
              disabled={isRunning}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Play className="mr-2 h-4 w-4" />
              Run Simulation
            </Button>
            <Button
              onClick={resetSimulation}
              variant="outline"
              className="border-border text-foreground hover:bg-secondary"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Scenario Selectors */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        {/* Featured Scenarios */}
        <div className="glass rounded-xl p-4 relative z-50">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-2">Featured Scenarios</span>
          <div className="relative">
            <button
              onClick={() => { setDropdownOpen(dropdownOpen === 'featured' ? false : 'featured') }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-secondary/60 border border-border hover:border-primary/30 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  {scenarios.find(s => s.id === selectedScenario?.id && ['UKR', 'ISR', 'PAK'].includes(s.iso3))?.label || "Select Guided Scenario"}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
            <AnimatePresence>
              {dropdownOpen === 'featured' && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-xl overflow-hidden shadow-2xl z-50"
                >
                  {scenarios.filter(s => ['UKR', 'ISR', 'PAK'].includes(s.iso3)).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => selectScenario(s)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left border-b border-border last:border-0"
                    >
                      <AlertTriangle className={`h-4 w-4 ${s.severity === 'critical' ? 'text-red-500 dark:text-red-400' : 'text-amber-500 dark:text-amber-400'}`} />
                      <div>
                        <div className="text-sm font-medium text-foreground">{s.label}</div>
                        <div className="text-xs text-muted-foreground">{enrichedDescriptions[s.iso3] || s.description}</div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Country Analysis */}
        <div className="glass rounded-xl p-4 relative z-40">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-2">Analyze Country Risk</span>
          <div className="relative">
            <button
              onClick={() => { setDropdownOpen(dropdownOpen === 'countries' ? false : 'countries') }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-secondary/60 border border-border hover:border-primary/30 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Zap className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-foreground">
                  {scenarios.find(s => s.id === selectedScenario?.id && !['UKR', 'ISR', 'PAK'].includes(s.iso3))?.label || "Select Country..."}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
            <AnimatePresence>
              {dropdownOpen === 'countries' && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-xl overflow-hidden shadow-2xl max-h-[300px] overflow-y-auto z-50"
                >
                  {scenarios.filter(s => !['UKR', 'ISR', 'PAK'].includes(s.iso3)).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => selectScenario(s)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left border-b border-border last:border-0"
                    >
                      <div className={`h-2 w-2 rounded-full ${s.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`} />
                      <div>
                        <div className="text-sm font-medium text-foreground">{s.label}</div>
                        <div className="text-xs text-muted-foreground">{enrichedDescriptions[s.iso3] || s.description}</div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="mb-6 flex items-center gap-6 px-2">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-amber-400" />
          <div>
            <div className="text-xs text-muted-foreground">Est. Impact</div>
            <div className="text-sm font-mono font-bold text-foreground">{selectedScenario.estimatedImpact}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-400" />
          <div>
            <div className="text-xs text-muted-foreground">Recovery</div>
            <div className="text-sm font-mono font-bold text-foreground">{selectedScenario.timeToRecover}</div>
          </div>
        </div>
      </div>

      {/* Main Visualization */}
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-3 glass rounded-xl p-6 relative" ref={containerRef}>
          {/* Step Legend */}
          <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
            {[
              { label: "Origin", color: "bg-red-500" },
              { label: "Primary", color: "bg-amber-500" },
              { label: "Secondary", color: "bg-blue-500" },
              { label: "Tertiary", color: "bg-purple-500" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="relative" style={{ height: "520px" }}>
            {/* SVG Edges */}
            <svg
              ref={svgRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 85"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="edge-active-red" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(239,68,68,0.6)" />
                  <stop offset="100%" stopColor="rgba(239,68,68,0.1)" />
                </linearGradient>
                <linearGradient id="edge-active-amber" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(245,158,11,0.6)" />
                  <stop offset="100%" stopColor="rgba(245,158,11,0.1)" />
                </linearGradient>
                <linearGradient id="edge-active-blue" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(59,130,246,0.6)" />
                  <stop offset="100%" stopColor="rgba(59,130,246,0.1)" />
                </linearGradient>
              </defs>
              {edges.map((e, i) => {
                const fromNode = nodes.find(n => n.id === e.from)
                const toNode = nodes.find(n => n.id === e.to)
                if (!fromNode || !toNode) return null
                const from = getNodeCenter(fromNode)
                const to = getNodeCenter(toNode)
                const gradientId = fromNode.type === "origin" ? "edge-active-red" : fromNode.type === "primary" ? "edge-active-amber" : "edge-active-blue"
                return (
                  <line
                    key={i}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={e.active ? `url(#${gradientId})` : "rgba(100,116,139,0.15)"}
                    strokeWidth={e.active ? 0.8 : 0.2}
                    strokeDasharray={e.active ? "none" : "1 1"}
                  />
                )
              })}
            </svg>

            {/* Nodes */}
            {nodes.map((node) => (
              <motion.div
                key={node.id}
                initial={false}
                animate={{
                  scale: node.active ? 1 : 0.92,
                  opacity: node.active ? 1 : 0.45,
                }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className={`absolute cursor-pointer transition-all duration-500 rounded-lg border px-3 py-2 ${getNodeBg(node.type, node.active)} ${node.active ? getNodeGlow(node.type) : ""}`}
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  transform: "translate(-50%, -50%)",
                  minWidth: "120px",
                  maxWidth: "160px",
                }}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  {node.active && node.type === "origin" && (
                    <Zap className="h-3 w-3 text-red-400" />
                  )}
                  <span className="text-xs font-medium text-foreground truncate">{node.label}</span>
                </div>
                <div className={`text-[10px] font-mono ${node.active ? getRiskColor(node.risk) : "text-muted-foreground"}`}>
                  {node.impact}
                </div>

                {/* Hover tooltip */}
                <AnimatePresence>
                  {hoveredNode === node.id && node.active && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 glass rounded-lg p-3 min-w-[200px]"
                    >
                      <div className="text-xs font-medium text-foreground mb-1">{node.label}</div>
                      <div className="text-[10px] text-muted-foreground mb-2">{node.description}</div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">Risk Score</span>
                        <span className={`font-mono font-bold ${getRiskColor(node.risk)}`}>{node.risk}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] mt-1">
                        <span className="text-muted-foreground">Delay</span>
                        <span className="font-mono text-foreground">+{node.delay}d</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          {/* Progress */}
          <div className="glass rounded-xl p-4">
            <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Simulation Progress</h3>
            <div className="space-y-3">
              {["Origin Event", "Primary Effects", "Secondary Effects", "Tertiary Effects"].map((step, i) => {
                const isActive = currentStep > i
                const isCurrent = currentStep === i && isRunning
                return (
                  <div key={step} className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${isActive ? "bg-primary" : isCurrent ? "bg-primary animate-pulse" : "bg-secondary"}`} />
                    <span className={`text-xs ${isActive ? "text-foreground" : isCurrent ? "text-primary" : "text-muted-foreground"}`}>{step}</span>
                    {isCurrent && <span className="text-[10px] text-primary font-mono">Processing...</span>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Impact Summary */}
          <div className="glass rounded-xl p-4">
            <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Impact Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Avg Risk Score</span>
                <span className={`text-lg font-mono font-bold ${getRiskColor(totalRisk)}`}>
                  {totalRisk || "--"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Nodes Affected</span>
                <span className="text-lg font-mono font-bold text-foreground">{activeNodes.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Active Edges</span>
                <span className="text-lg font-mono font-bold text-foreground">{edges.filter(e => e.active).length}</span>
              </div>
            </div>
          </div>

          {/* Cascade Steps */}
          <div className="glass rounded-xl p-4">
            <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Cascade Timeline</h3>
            <div className="space-y-2">
              {activeNodes.map((node) => (
                <motion.div
                  key={node.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 text-xs"
                >
                  <ArrowRight className="h-3 w-3 text-primary flex-shrink-0" />
                  <span className="text-foreground truncate">{node.label}</span>
                  <Badge variant="outline" className="text-[9px] ml-auto flex-shrink-0 border-border text-muted-foreground">
                    +{node.delay}d
                  </Badge>
                </motion.div>
              ))}
              {activeNodes.length === 0 && (
                <p className="text-xs text-muted-foreground">Run simulation to see cascade timeline</p>
              )}
            </div>
          </div>

          {/* Key Insight */}
          <div className="glass rounded-xl p-4 border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Key Insight</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {activeNodes.length > 6
                ? "Critical cascade detected. Multiple tertiary effects active with cross-sector contagion. Recommend immediate diversification of supply routes."
                : activeNodes.length > 3
                  ? "Secondary effects propagating. Monitor downstream impacts closely and activate contingency plans."
                  : activeNodes.length > 0
                    ? "Initial disruption contained to primary effects. Early intervention recommended to prevent cascade."
                    : "Select a scenario and run the simulation to analyze cascade effects."}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
