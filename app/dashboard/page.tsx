"use client"

import { useState } from "react"
import useSWR from "swr"
import { Navbar } from "@/components/Navbar"
import { LeftSidebar } from "@/components/LeftSidebar"
import { KpiCard } from "@/components/KpiCard"
import { LiveChart } from "@/components/LiveChart"
import { DeviceStatusPanel } from "@/components/DeviceStatusPanel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Activity, Zap, Leaf, Trash2 } from "lucide-react"
import { config } from "@/lib/config"

interface Device {
  device_id: string
  name: string
  location?: string
  last_seen?: string
  status: "active" | "inactive" | "error"
  current_power_w?: number
  today_energy_kwh?: number
  today_co2_kg?: number
  today_waste_kg?: number
}

interface TelemetryMetrics {
  totalTelemetryReceived: number
  authFailures: number
  signatureFailures: number
  timestampFailures: number
  queueFailures: number
  queueSize: number
}

interface AggregatesResponse {
  kpis: {
    current_power_w: number
    today_energy_kwh: number
    today_co2_kg: number
    today_waste_kg: number
  }
  timeSeries: Array<{
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
  }>
  devices: Device[]
  source: "timescale" | "memory"
  timestamp: string
}

// Fetcher functions for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function DashboardPage() {
  const [selectedDevice, setSelectedDevice] = useState<string>("all")
  const [timeRange, setTimeRange] = useState<string>("24h")

  // Fetch devices
  const { data: devicesData, error: devicesError } = useSWR<{ devices: Device[] }>("/api/devices", fetcher, {
    refreshInterval: config.POLL_INTERVAL_MS,
  })

  // Fetch telemetry metrics
  const { data: metricsData, error: metricsError } = useSWR<TelemetryMetrics>("/api/telemetry", fetcher, {
    refreshInterval: config.POLL_INTERVAL_MS,
  })

  const { data: aggregatesData, error: aggregatesError } = useSWR<AggregatesResponse>(
    () => {
      const to = new Date()
      const from = new Date(to.getTime() - 24 * 60 * 60 * 1000) // 24 hours ago
      const deviceParam = selectedDevice !== "all" ? `&device_id=${selectedDevice}` : ""
      return `/api/telemetry/aggregates?from=${from.toISOString()}&to=${to.toISOString()}&interval=60s${deviceParam}`
    },
    fetcher,
    {
      refreshInterval: config.POLL_INTERVAL_MS,
    },
  )

  const kpis = aggregatesData?.kpis || {
    current_power_w: 0,
    today_energy_kwh: 0,
    today_co2_kg: 0,
    today_waste_kg: 0,
  }

  const devices = devicesData?.devices || aggregatesData?.devices || []
  const metrics = metricsData || {
    totalTelemetryReceived: 0,
    authFailures: 0,
    signatureFailures: 0,
    timestampFailures: 0,
    queueFailures: 0,
    queueSize: 0,
  }

  // Calculate success rate
  const totalRequests =
    metrics.totalTelemetryReceived + metrics.authFailures + metrics.signatureFailures + metrics.timestampFailures
  const successRate = totalRequests > 0 ? ((metrics.totalTelemetryReceived / totalRequests) * 100).toFixed(1) : "100"

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground">Real-time manufacturing telemetry overview</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <Activity className="h-3 w-3 mr-1" />
                Live • {config.POLL_INTERVAL_MS / 1000}s
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {aggregatesData?.source === "timescale" ? "Timescale" : "Memory"}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <KpiCard
              title="Current Power"
              value={(kpis.current_power_w / 1000).toFixed(2)}
              unit="kW"
              icon={<Zap className="h-4 w-4" />}
              change={5.2}
            />
            <KpiCard
              title="Today's Energy"
              value={kpis.today_energy_kwh.toFixed(2)}
              unit="kWh"
              icon={<Activity className="h-4 w-4" />}
              change={-2.1}
            />
            <KpiCard
              title="Estimated CO₂"
              value={kpis.today_co2_kg.toFixed(2)}
              unit="kg"
              icon={<Leaf className="h-4 w-4" />}
              change={-8.5}
            />
            <KpiCard
              title="Total Waste"
              value={kpis.today_waste_kg.toFixed(2)}
              unit="kg"
              icon={<Trash2 className="h-4 w-4" />}
              change={12.3}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Live Chart */}
            <div className="lg:col-span-2">
              <LiveChart
                title="Power Consumption (Last 24 Hours)"
                data={aggregatesData?.timeSeries || []}
                loading={!aggregatesData && !aggregatesError}
                error={aggregatesError}
              />
            </div>

            {/* Device Status Panel */}
            <div>
              <DeviceStatusPanel
                devices={devices}
                loading={!devicesData && !devicesError && !aggregatesData}
                error={devicesError}
                onDeviceSelect={setSelectedDevice}
                selectedDevice={selectedDevice}
              />
            </div>
          </div>

          {/* System Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Telemetry Ingestion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-teal-700">{metrics.totalTelemetryReceived}</div>
                <p className="text-xs text-muted-foreground">Messages received</p>
                <div className="mt-2 text-xs">
                  <span className="text-green-600">Success rate: {successRate}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Queue Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-cyan-700">{metrics.queueSize}</div>
                <p className="text-xs text-muted-foreground">Messages in queue</p>
                <div className="mt-2 text-xs">
                  <span className="text-muted-foreground">Processing normally</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Devices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-teal-700">
                  {devices.filter((d) => d.status === "active").length}
                </div>
                <p className="text-xs text-muted-foreground">of {devices.length} total</p>
                <div className="mt-2 text-xs">
                  <span className="text-muted-foreground">
                    {devices.filter((d) => d.status === "inactive").length} inactive
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
