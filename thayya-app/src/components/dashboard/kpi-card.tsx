"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface KpiCardProps {
  title: string
  value: string
  change?: string
  changeType?: "positive" | "negative" | "neutral"
  icon: LucideIcon
}

export function KpiCard({ title, value, change, changeType = "neutral", icon: Icon }: KpiCardProps) {
  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
            {change && (
              <p
                className={cn(
                  "text-xs font-medium",
                  changeType === "positive" && "text-emerald-600",
                  changeType === "negative" && "text-red-500",
                  changeType === "neutral" && "text-muted-foreground"
                )}
              >
                {change}
              </p>
            )}
          </div>
          <div className="rounded-lg bg-primary/10 p-3">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
