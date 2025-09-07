import { config } from "./config"

/**
 * Telemetry data structure for queue
 */
export interface TelemetryData {
  device_id: string
  timestamp: string
  payload: any
  received_at: string
}

/**
 * Queue interface for telemetry data
 */
export interface TelemetryQueue {
  enqueue(data: TelemetryData): Promise<boolean>
  dequeue(): Promise<TelemetryData | null>
  size(): Promise<number>
}

/**
 * In-memory queue implementation for development
 */
class InMemoryQueue implements TelemetryQueue {
  private queue: TelemetryData[] = []
  private maxSize = 10000 // Prevent memory overflow

  async enqueue(data: TelemetryData): Promise<boolean> {
    try {
      if (this.queue.length >= this.maxSize) {
        // Remove oldest entries to prevent memory overflow
        this.queue.shift()
      }

      this.queue.push(data)
      console.log(`[v0] Enqueued telemetry from ${data.device_id}, queue size: ${this.queue.length}`)
      return true
    } catch (error) {
      console.error("[v0] Failed to enqueue telemetry:", error)
      return false
    }
  }

  async dequeue(): Promise<TelemetryData | null> {
    return this.queue.shift() || null
  }

  async size(): Promise<number> {
    return this.queue.length
  }

  // Get recent data for aggregation (development helper)
  getRecentData(deviceId?: string, hours = 24): TelemetryData[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

    return this.queue.filter((item) => {
      const matchesDevice = !deviceId || item.device_id === deviceId
      const isRecent = item.timestamp >= cutoff
      return matchesDevice && isRecent
    })
  }
}

/**
 * Redis queue implementation for production
 */
class RedisQueue implements TelemetryQueue {
  private streamKey = "telemetry:stream"

  async enqueue(data: TelemetryData): Promise<boolean> {
    try {
      if (!config.UPSTASH_REDIS_REST_URL || !config.UPSTASH_REDIS_REST_TOKEN) {
        throw new Error("Redis configuration missing")
      }

      const response = await fetch(`${config.UPSTASH_REDIS_REST_URL}/xadd/${this.streamKey}/*`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.UPSTASH_REDIS_REST_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          "device_id",
          data.device_id,
          "timestamp",
          data.timestamp,
          "payload",
          JSON.stringify(data.payload),
          "received_at",
          data.received_at,
        ]),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Redis XADD failed: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      console.log(`[v0] Enqueued telemetry to Redis from ${data.device_id}, ID: ${result.result}`)
      return true
    } catch (error) {
      console.error("[v0] Failed to enqueue to Redis:", error)
      return false
    }
  }

  async readStream(count = 10): Promise<TelemetryData[]> {
    try {
      if (!config.UPSTASH_REDIS_REST_URL || !config.UPSTASH_REDIS_REST_TOKEN) {
        return []
      }

      const response = await fetch(
        `${config.UPSTASH_REDIS_REST_URL}/xread/COUNT/${count}/STREAMS/${this.streamKey}/0`,
        {
          headers: {
            Authorization: `Bearer ${config.UPSTASH_REDIS_REST_TOKEN}`,
          },
        },
      )

      if (!response.ok) {
        return []
      }

      const result = await response.json()
      const streams = result.result || []

      if (streams.length === 0) return []

      const entries = streams[0][1] || []
      return entries.map((entry: any) => {
        const [id, fields] = entry
        const fieldMap: any = {}

        // Convert field array to object
        for (let i = 0; i < fields.length; i += 2) {
          fieldMap[fields[i]] = fields[i + 1]
        }

        return {
          device_id: fieldMap.device_id,
          timestamp: fieldMap.timestamp,
          payload: JSON.parse(fieldMap.payload || "{}"),
          received_at: fieldMap.received_at,
        }
      })
    } catch (error) {
      console.error("[v0] Failed to read from Redis stream:", error)
      return []
    }
  }

  async dequeue(): Promise<TelemetryData | null> {
    // Implementation would use XREAD for consuming
    // For now, return null as this is primarily for ingestion
    return null
  }

  async size(): Promise<number> {
    try {
      const response = await fetch(`${config.UPSTASH_REDIS_REST_URL}/xlen/${this.streamKey}`, {
        headers: {
          Authorization: `Bearer ${config.UPSTASH_REDIS_REST_TOKEN}`,
        },
      })

      if (!response.ok) {
        return 0
      }

      const result = await response.json()
      return result.result || 0
    } catch (error) {
      console.error("[v0] Failed to get Redis queue size:", error)
      return 0
    }
  }
}

// Global queue instance
let queueInstance: TelemetryQueue

/**
 * Get the telemetry queue instance
 * Uses Redis if configured, otherwise falls back to in-memory queue
 */
export function getTelemetryQueue(): TelemetryQueue {
  if (!queueInstance) {
    if (config.UPSTASH_REDIS_REST_URL && config.UPSTASH_REDIS_REST_TOKEN) {
      console.log("[v0] Using Redis queue for telemetry")
      queueInstance = new RedisQueue()
    } else {
      console.log("[v0] Using in-memory queue for telemetry (development mode)")
      queueInstance = new InMemoryQueue()
    }
  }

  return queueInstance
}

// Export in-memory queue for development access
export const inMemoryQueue = new InMemoryQueue()

export { RedisQueue }
