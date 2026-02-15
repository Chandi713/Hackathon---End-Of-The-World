"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Bot, User, Database, Sparkles } from "lucide-react"
import { getRiskColor } from "@/lib/mock-data"
import Link from "next/link"

interface CountryCardData {
  id: string
  name: string
  riskScore: number
  topThreat: string
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: string[]
  countryCard?: CountryCardData
}

const suggestedPrompts = [
  "What are the top 10 global hotspots right now?",
  "Compare India vs China supply chain risk in 2023",
  "If Ukraine collapses, who else is affected?",
  "What's the drought outlook for East Africa?",
]

const mockResponses: Record<string, { content: string; sources: string[]; countryCard?: CountryCardData }> = {
  "What are the top 10 global hotspots right now?": {
    content: `Based on our latest multi-agent analysis, the top 10 global hotspots are:\n\n| Rank | Country | Risk Score | Primary Threat |\n|------|---------|-----------|----------------|\n| 1 | Ukraine | 94 | Armed Conflict |\n| 2 | Syria | 91 | Civil War |\n| 3 | Yemen | 89 | Famine & Conflict |\n| 4 | Somalia | 87 | Terrorism & Drought |\n| 5 | Afghanistan | 86 | Instability |\n| 6 | Sudan | 84 | Civil Conflict |\n| 7 | Myanmar | 79 | Military Coup |\n| 8 | Ethiopia | 74 | Ethnic Conflict |\n| 9 | Haiti | 72 | Gang Violence |\n| 10 | Libya | 68 | Political Fragmentation |\n\n**Key Insight:** Six of the top 10 countries are experiencing active armed conflict, with supply chain disruptions affecting food, energy, and medicine distribution. The situation in Sudan has deteriorated significantly, moving up 3 positions since our last quarterly assessment.`,
    sources: ["GDELT Event Database", "EM-DAT Disaster Registry", "ERA5 Climate Data", "WHO Health Metrics"],
  },
  "Compare India vs China supply chain risk in 2023": {
    content: `## India vs China: Supply Chain Risk Comparison\n\n**India** (Risk Score: **48** - MODERATE)\n- Climate vulnerability is the primary concern, with monsoon variability affecting 600M+ people\n- Food security index at 40% risk due to groundwater depletion\n- Political stability is relatively strong at 42% risk\n- 3 active disaster situations being monitored\n\n**China** (Risk Score: **42** - MODERATE)\n- Trade tensions represent the dominant risk factor at 50% economic pressure\n- Weather severity moderate at 45% with increasing typhoon frequency\n- Food security better managed at 30% risk due to strategic reserves\n- 2 active disaster situations\n\n**Supply Chain Impact:**\nChina's risk is more concentrated in **trade and economic channels**, while India's risk is distributed across **climate and food security** vectors. For diversification strategies, manufacturers should consider that both countries share overlapping disaster seasons (June-September).`,
    sources: ["ERA5 Climate Data", "World Bank Economic Indicators", "GDELT Trade Analysis"],
    countryCard: { id: "ind", name: "India", riskScore: 48, topThreat: "Climate Vulnerability" },
  },
  "If Ukraine collapses, who else is affected?": {
    content: `## Ukraine Cascade Risk Analysis\n\nA full destabilization of Ukraine would trigger cascading effects across multiple regions:\n\n**Direct Impact (Week 1-2):**\n- **Germany** (80% linked) - Energy supply disruption, refugee pressure\n- **Poland** - Border security, humanitarian crisis management\n- **Moldova** - Energy dependence, political destabilization risk\n\n**Secondary Impact (Month 1):**\n- **Ethiopia** (60% linked) - Wheat import dependency, food price shock\n- **India** (50% linked) - Fertilizer supply chain, sunflower oil disruption\n- **Egypt** - Bread subsidy crisis, wheat import collapse\n\n**Global Ripple (Month 2+):**\n- Global wheat prices estimated to spike **45-60%**\n- Fertilizer shortages affecting **23 developing nations**\n- Energy market volatility impacting **EUR/USD exchange rates**\n\n**Estimated Population at Risk:** 340M people across 15+ countries through food supply chain disruption alone.`,
    sources: ["Cascade Simulation Engine", "GDELT Conflict Data", "FAO Food Security Database", "IEA Energy Reports"],
    countryCard: { id: "ukr", name: "Ukraine", riskScore: 94, topThreat: "Armed Conflict" },
  },
  "What's the drought outlook for East Africa?": {
    content: `## East Africa Drought Outlook\n\nThe drought situation across East Africa remains **critical**, now entering its 6th consecutive failed rainy season in parts of Somalia and Kenya.\n\n**Current Conditions:**\n- **Somalia**: Drought index at **75%** severity. 3.8M people in crisis-level food insecurity\n- **Ethiopia**: Southern regions experiencing severe water stress. Crop yields down **35%**\n- **Kenya**: Northern pastoral regions at emergency level. Livestock losses exceeding **60%**\n\n**Weather Agent Forecast (Next 6 Months):**\n- La Nina conditions weakening - potential improvement in October-December short rains\n- However, groundwater recovery requires **3-5 consecutive normal seasons**\n- Temperature anomaly of **+1.5C** above baseline continues to stress crops\n\n**Supply Chain Implications:**\n- Coffee exports from Ethiopia projected to decline **12%**\n- Livestock trade corridor between Somalia and Kenya disrupted\n- Humanitarian aid requirements: **$4.2B** for the region`,
    sources: ["ERA5 Climate Reanalysis", "FEWS NET Food Security", "EM-DAT Disaster Data", "Weather Agent Forecast Model"],
    countryCard: { id: "som", name: "Somalia", riskScore: 87, topThreat: "Drought & Terrorism" },
  },
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (text?: string) => {
    const message = text || input
    if (!message.trim()) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message,
    }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsTyping(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      })

      if (!res.ok) {
        throw new Error("Failed to fetch response")
      }

      const data = await res.json()

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content,
        sources: data.sources || ["ResilienceAI Network"],
        // countryCard: data.countryCard, // Enable when backend supports it
      }
      setMessages((prev) => [...prev, aiMsg])
    } catch (error) {
      console.error("Chat error:", error)
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error connecting to the agent network. Please ensure the backend services are running.",
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="shrink-0 border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              ResilienceAI Chat
            </h1>
            <p className="text-xs text-muted-foreground">
              Multi-agent intelligence at your fingertips
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-6">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Ask about global risks
            </h2>
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
              Our multi-agent system analyzes conflict, weather, disaster, and economic data across 266 countries to provide real-time risk intelligence.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="text-left glass glass-hover rounded-lg p-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
            >
              {msg.role === "assistant" && (
                <div className="shrink-0 mt-1">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-xl p-4 ${msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "glass border border-border"
                  }`}
              >
                {msg.role === "assistant" ? (
                  <div className="space-y-3">
                    <div className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                      {msg.content.split("\n").map((line, i) => {
                        if (line.startsWith("## ")) {
                          return (
                            <h3 key={i} className="text-base font-bold text-foreground mt-2 mb-1">
                              {line.replace("## ", "")}
                            </h3>
                          )
                        }
                        if (line.startsWith("**") && line.endsWith("**")) {
                          return (
                            <p key={i} className="font-semibold text-foreground mt-2">
                              {line.replace(/\*\*/g, "")}
                            </p>
                          )
                        }
                        if (line.startsWith("| ")) {
                          const cells = line.split("|").filter(Boolean).map((c) => c.trim())
                          if (cells.every((c) => c.match(/^[-]+$/))) return null
                          return (
                            <div key={i} className="flex gap-4 text-xs font-mono py-0.5">
                              {cells.map((cell, j) => (
                                <span key={j} className={j === 0 ? "w-8 text-muted-foreground" : "flex-1"}>
                                  {cell}
                                </span>
                              ))}
                            </div>
                          )
                        }
                        if (line.startsWith("- **")) {
                          const match = line.match(/- \*\*(.+?)\*\*(.*)/)
                          if (match) {
                            return (
                              <div key={i} className="flex gap-1 text-sm mt-1">
                                <span className="font-semibold text-foreground">{match[1]}</span>
                                <span className="text-muted-foreground">{match[2]}</span>
                              </div>
                            )
                          }
                        }
                        if (line.startsWith("- ")) {
                          return (
                            <div key={i} className="flex gap-2 text-sm text-muted-foreground mt-0.5">
                              <span className="text-primary">-</span>
                              {line.slice(2)}
                            </div>
                          )
                        }
                        return line ? <p key={i}>{line.replace(/\*\*/g, "")}</p> : <br key={i} />
                      })}
                    </div>

                    {/* Country Card */}
                    {msg.countryCard && (
                      <Link
                        href={`/country/${msg.countryCard.id}`}
                        className="flex items-center gap-3 rounded-lg bg-secondary/40 border border-border p-3 hover:bg-secondary/60 transition-colors"
                      >
                        <div
                          className="font-mono text-lg font-bold"
                          style={{ color: getRiskColor(msg.countryCard.riskScore) }}
                        >
                          {msg.countryCard.riskScore}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-foreground">
                            {msg.countryCard.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {msg.countryCard.topThreat} - Click to view full analysis
                          </div>
                        </div>
                      </Link>
                    )}

                    {/* Sources */}
                    {msg.sources && (
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
                        <Database className="h-3 w-3 text-muted-foreground mt-0.5" />
                        {msg.sources.map((source) => (
                          <span
                            key={source}
                            className="text-[9px] font-mono bg-secondary/60 text-muted-foreground rounded px-1.5 py-0.5"
                          >
                            {source}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm">{msg.content}</p>
                )}
              </div>
              {msg.role === "user" && (
                <div className="shrink-0 mt-1">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary border border-border">
                    <User className="h-3.5 w-3.5 text-foreground" />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="glass rounded-xl p-4 border border-border">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="shrink-0 border-t border-border p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about global risks, supply chains, country analysis..."
            className="flex-1 rounded-lg bg-secondary border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2.5 hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </button>
        </form>
      </div>
    </div>
  )
}
