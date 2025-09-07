import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"

interface KpiCardProps {
  title: string
  value: string | number
  unit?: string
  change?: number
  icon?: React.ReactNode
  sparklineData?: number[]
}

export function KpiCard({ title, value, unit, change, icon, sparklineData }: KpiCardProps) {
  const isPositive = change !== undefined && change >= 0
  const changeColor = isPositive ? "text-green-600" : "text-red-600"
  const TrendIcon = isPositive ? TrendingUp : TrendingDown

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value}
          {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
        </div>
        {change !== undefined && (
          <div className={`flex items-center text-xs ${changeColor} mt-1`}>
            <TrendIcon className="h-3 w-3 mr-1" />
            {Math.abs(change)}% from last hour
          </div>
        )}
        {sparklineData && sparklineData.length > 0 && (
          <div className="mt-2 h-8">
            {/* Simple sparkline visualization could be added here */}
            <div className="text-xs text-muted-foreground">Trend data available</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
