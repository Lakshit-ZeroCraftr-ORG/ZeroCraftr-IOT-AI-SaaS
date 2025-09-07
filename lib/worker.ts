import { getTelemetryQueue, RedisQueue } from "./queue"
import { insertTelemetryBatch, initTimescaleSchema, type TelemetryRecord } from "./timescale"
import { config } from "./config"

/**
 * Background worker to process telemetry data from Redis to Timescale
 */
export class TelemetryWorker {
  private isRunning = false
  private intervalId: NodeJS.Timeout | null = null
  private readonly batchSize = 50
  private readonly intervalMs = 5000 // Process every 5 seconds

  async start() {
    if (this.isRunning) {
      console.log("[v0] Worker already running")
      return
    }

    console.log("[v0] Starting telemetry worker...")

    // Initialize Timescale schema
    await initTimescaleSchema()

    this.isRunning = true
    this.intervalId = setInterval(() => {
      this.processBatch().catch((error) => {
        console.error("[v0] Worker batch processing failed:", error)
      })
    }, this.intervalMs)

    console.log("[v0] Telemetry worker started")
  }

  stop() {
    if (!this.isRunning) return

    console.log("[v0] Stopping telemetry worker...")
    this.isRunning = false

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    console.log("[v0] Telemetry worker stopped")
  }

  private async processBatch() {
    try {
      const queue = getTelemetryQueue()

      // Only process if using Redis queue
      if (!(queue instanceof RedisQueue)) {
        return
      }

      const telemetryData = await queue.readStream(this.batchSize)

      if (telemetryData.length === 0) {
        return
      }

      // Convert to Timescale records
      const records: TelemetryRecord[] = telemetryData.map((data) => ({
        device_id: data.device_id,
        timestamp: new Date(data.timestamp),
        power_w: data.payload.power_w || 0,
        energy_kwh: data.payload.energy_kwh || 0,
        co2_kg: data.payload.co2_kg,
        waste_kg: data.payload.waste_kg,
      }))

      // Insert batch to Timescale
      await insertTelemetryBatch(records)

      console.log(`[v0] Processed ${records.length} telemetry records`)
    } catch (error) {
      console.error("[v0] Failed to process telemetry batch:", error)
    }
  }
}

// Global worker instance
let workerInstance: TelemetryWorker | null = null

export function getTelemetryWorker(): TelemetryWorker {
  if (!workerInstance) {
    workerInstance = new TelemetryWorker()
  }
  return workerInstance
}

// Auto-start worker in production
if (config.UPSTASH_REDIS_REST_URL && config.TIMESCALE_WRITE_URL) {
  getTelemetryWorker().start()
}
