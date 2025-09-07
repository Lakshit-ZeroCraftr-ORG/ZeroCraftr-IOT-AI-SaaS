import { type NextRequest, NextResponse } from "next/server"
import { getTelemetryAggregates, getTelemetryTimeSeries } from "@/lib/timescale"
import { inMemoryQueue } from "@/lib/queue"
import { config } from "@/lib/config"

/**
 * Aggregate telemetry data for dashboard
 * GET /api/telemetry/aggregates?device_id=dev-001&from=ISO&to=ISO&interval=60s
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get("device_id")
    const fromParam = searchParams.get("from")
    const toParam = searchParams.get("to")
    const interval = searchParams.get("interval") || "60s"

    if (config.TIMESCALE_WRITE_URL) {
      // Use Timescale for production data
      const hours =
        fromParam && toParam
          ? Math.ceil((new Date(toParam).getTime() - new Date(fromParam).getTime()) / (1000 * 60 * 60))
          : 24

      const [aggregates, timeSeries] = await Promise.all([
        getTelemetryAggregates(deviceId || undefined),
        getTelemetryTimeSeries(hours, deviceId || undefined),
      ])

      // Calculate current KPIs from aggregates
      const kpis = aggregates.reduce(
        (acc, device) => ({
          current_power_w: acc.current_power_w + (device.current_power_w || 0),
          today_energy_kwh: acc.today_energy_kwh + (device.today_energy_kwh || 0),
          today_co2_kg: acc.today_co2_kg + (device.today_co2_kg || 0),
          today_waste_kg: acc.today_waste_kg + (device.today_waste_kg || 0),
        }),
        {
          current_power_w: 0,
          today_energy_kwh: 0,
          today_co2_kg: 0,
          today_waste_kg: 0,
        },
      )

      return NextResponse.json({
        kpis,
        timeSeries,
        devices: aggregates,
        source: "timescale",
        timestamp: new Date().toISOString(),
      })
    }

    // Fallback to in-memory queue for development
    const to = toParam ? new Date(toParam) : new Date()
    const from = fromParam ? new Date(fromParam) : new Date(to.getTime() - 24 * 60 * 60 * 1000)

    // Get recent data from in-memory queue (development)
    const recentData = inMemoryQueue.getRecentData(deviceId || undefined, 24)

    // Filter by time range
    const filteredData = recentData.filter((item) => {
      const itemTime = new Date(item.timestamp)
      return itemTime >= from && itemTime <= to
    })

    // Parse interval (simple implementation for 60s intervals)
    const intervalMs = interval === "60s" ? 60 * 1000 : 60 * 1000

    // Group data by time intervals
    const aggregatedData: Array<{
      timestamp: string
      power_w?: number
      energy_kwh?: number
      co2_kg?: number
      waste_kg?: number
      count: number
    }> = []

    // Create time buckets
    const buckets = new Map<string, any>()

    for (let time = from.getTime(); time < to.getTime(); time += intervalMs) {
      const bucketKey = new Date(time).toISOString()
      buckets.set(bucketKey, {
        timestamp: bucketKey,
        power_w: 0,
        energy_kwh: 0,
        co2_kg: 0,
        waste_kg: 0,
        count: 0,
      })
    }

    // Aggregate metrics into buckets
    filteredData.forEach((item) => {
      const itemTime = new Date(item.timestamp).getTime()
      const bucketTime = Math.floor(itemTime / intervalMs) * intervalMs
      const bucketKey = new Date(bucketTime).toISOString()

      const bucket = buckets.get(bucketKey)
      if (bucket && item.payload.metrics) {
        item.payload.metrics.forEach((metric: any) => {
          switch (metric.name) {
            case "power_active_w":
              bucket.power_w += metric.value
              break
            case "energy_kwh":
              bucket.energy_kwh += metric.value
              break
            case "co2_kg":
              bucket.co2_kg += metric.value
              break
            case "waste_kg":
              bucket.waste_kg += metric.value
              break
          }
        })
        bucket.count++
      }
    })

    // Convert to array and calculate averages
    buckets.forEach((bucket) => {
      if (bucket.count > 0) {
        bucket.power_w = bucket.power_w / bucket.count
        // Energy and emissions are cumulative, don't average
      }
      aggregatedData.push(bucket)
    })

    const kpis = {
      current_power_w: Math.max(...aggregatedData.map((d) => d.power_w || 0)),
      today_energy_kwh: aggregatedData.reduce((sum, d) => sum + (d.energy_kwh || 0), 0),
      today_co2_kg: aggregatedData.reduce((sum, d) => sum + (d.co2_kg || 0), 0),
      today_waste_kg: aggregatedData.reduce((sum, d) => sum + (d.waste_kg || 0), 0),
    }

    return NextResponse.json({
      kpis,
      timeSeries: aggregatedData,
      devices: [],
      source: "memory",
      device_id: deviceId,
      from: from.toISOString(),
      to: to.toISOString(),
      interval,
      total_points: aggregatedData.length,
    })
  } catch (error) {
    console.error("[v0] Aggregates API error:", error)
    return NextResponse.json({ error: "Failed to fetch aggregates" }, { status: 500 })
  }
}
