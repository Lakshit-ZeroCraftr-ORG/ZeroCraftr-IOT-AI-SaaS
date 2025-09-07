"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Loader2, AlertCircle } from "lucide-react"

interface ChartDataPoint {
  time_bucket?: string
  timestamp?: string
  device_id?: string
  avg_power_w?: number
  power_w?: number
  total_energy_kwh?: number
  energy_kwh?: number
  total_co2_kg?: number
  co2_kg?: number
  total_waste_kg?: number
  waste_kg?: number
  count?: number
}

interface LiveChartProps {
  title: string
  data: ChartDataPoint[]
  loading?: boolean
  error?: any
}

export function LiveChart({ title, data = [], loading = false, error }: LiveChartProps) {
  const chartData = data
    .map((item) => {
      // Handle both time_bucket (Timescale) and timestamp (memory) formats
      const timeValue = item.time_bucket || item.timestamp
      const time = timeValue
        ? new Date(timeValue).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : ""

      // Handle both avg_power_w (Timescale) and power_w (memory) formats
      const powerValue = item.avg_power_w || item.power_w || 0
      const energyValue = item.total_energy_kwh || item.energy_kwh || 0

      return {
        time,
        power: (powerValue / 1000).toFixed(2), // Convert to kW
        energy: energyValue.toFixed(2),
        timestamp: timeValue,
      }
    })
    .filter((item) => item.timestamp) // Filter out items without valid timestamps

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{`Time: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value} ${entry.name === "Power" ? "kW" : "kWh"}`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading chart data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
              <p className="text-sm text-red-600">Failed to load chart data</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-sm text-muted-foreground">No data available</p>
              <p className="text-xs text-muted-foreground mt-1">Start sending telemetry data to see charts</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="time"
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis className="text-xs fill-muted-foreground" tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="power"
                stroke="rgb(15, 118, 110)" // teal-700
                strokeWidth={2}
                dot={{ fill: "rgb(15, 118, 110)", strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, stroke: "rgb(15, 118, 110)", strokeWidth: 2 }}
                name="Power"
              />
              <Line
                type="monotone"
                dataKey="energy"
                stroke="rgb(6, 182, 212)" // cyan-500
                strokeWidth={2}
                dot={{ fill: "rgb(6, 182, 212)", strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, stroke: "rgb(6, 182, 212)", strokeWidth: 2 }}
                name="Energy"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
