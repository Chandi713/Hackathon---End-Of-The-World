"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Globe,
  Search,
  Bot,
  MessageSquare,
  Zap,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const navItems = [
  { href: "/", label: "Global Dashboard", icon: Globe },
  { href: "/country/ukr", label: "Country Deep Dive", icon: Search },
  { href: "/agents", label: "Agent Network", icon: Bot },
  { href: "/cascade", label: "Cascade Simulator", icon: Zap },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex h-screen flex-col border-r border-border bg-sidebar transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-border px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground tracking-tight">
                ResilienceAI
              </span>
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
                Risk Intel
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href)
            const Icon = item.icon

            const linkContent = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                  collapsed && "justify-center px-0"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" className="bg-popover text-popover-foreground">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return linkContent
          })}
        </nav>

        {/* Settings & Collapse */}
        <div className="border-t border-border p-3 space-y-1">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="#"
                  className="flex items-center justify-center rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                >
                  <Settings className="h-4 w-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-popover text-popover-foreground">Settings</TooltipContent>
            </Tooltip>
          ) : (
            <Link
              href="#"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Link>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center rounded-lg py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
