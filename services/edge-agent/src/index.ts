import { createHmac } from "crypto"
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs"
import { join } from "path"
import dotenv from "dotenv"

// Load environment variables
dotenv.config()

interface TelemetryPayload {
  version: string
  device_id: string
  ts: string
  metrics: Array<{
    name: string
    value: number
    unit: string
  }>
  tags?: Record<string, string>
}

interface BufferedMessage {
  payload: TelemetryPayload
  timestamp: string
  signature: string
  headers: Record<string, string>
}

class ZeroCraftrEdgeAgent {
  private deviceId: string
  private deviceApiKey: string | null = null
  private pairingToken: string | null = null
  private telemetryUrl: string
  private bufferFile: string
  private isRunning = false
  private sendInterval: NodeJS.Timeout | null = null
  private retryInterval: NodeJS.Timeout | null = null

  // Simulation state
  private powerBase = 1000 // Base power consumption in watts
  private energyAccumulator = 0
  private wasteAccumulator = 0

  constructor() {
    this.deviceId = process.env.DEVICE_ID || "edge-agent-001"
    this.deviceApiKey = process.env.DEVICE_API_KEY || null
    this.pairingToken = process.env.PAIRING_TOKEN || null
    this.telemetryUrl = process.env.TELEMETRY_URL || "http://localhost:3000/api/telemetry"

    // Create buffer directory
    const bufferDir = join(__dirname, "../buffer")
    if (!existsSync(bufferDir)) {
      mkdirSync(bufferDir, { recursive: true })
    }
    this.bufferFile = join(bufferDir, `${this.deviceId}-buffer.json`)

    console.log(`[EdgeAgent] Initialized for device: ${this.deviceId}`)
    console.log(`[EdgeAgent] Telemetry URL: ${this.telemetryUrl}`)
  }

  /**
   * Compute HMAC signature for telemetry payload
   */
  private computeSignature(deviceKey: string, timestamp: string, payload: string): string {
    const message = `${timestamp}.${payload}`
    const hmac = createHmac("sha256", deviceKey)
    hmac.update(message)
    return hmac.digest("base64")
  }

  /**
   * Pair device using pairing token
   */
  private async pairDevice(): Promise<boolean> {
    if (!this.pairingToken) {
      console.error("[EdgeAgent] No pairing token provided")
      return false
    }

    try {
      console.log("[EdgeAgent] Attempting to pair device...")

      const pairUrl = this.telemetryUrl.replace("/api/telemetry", "/api/pair")
      const response = await fetch(pairUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pairing_token: this.pairingToken,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        this.deviceApiKey = data.device_api_key
        console.log(`[EdgeAgent] Device paired successfully: ${data.device_id}`)
        console.log(`[EdgeAgent] Received API key: ${this.deviceApiKey?.substring(0, 20)}...`)
        return true
      } else {
        const error = await response.json()
        console.error(`[EdgeAgent] Pairing failed: ${error.error}`)
        return false
      }
    } catch (error) {
      console.error("[EdgeAgent] Pairing error:", error)
      return false
    }
  }

  /**
   * Generate realistic telemetry data
   */
  private generateTelemetryData(): TelemetryPayload {
    const now = new Date().toISOString()

    // Simulate power consumption with some variation
    const powerVariation = (Math.random() - 0.5) * 200 // ±100W variation
    const currentPower = Math.max(0, this.powerBase + powerVariation)

    // Accumulate energy (kWh = W * hours / 1000)
    const intervalHours = 5 / 3600 // 5 seconds in hours
    const energyIncrement = (currentPower * intervalHours) / 1000
    this.energyAccumulator += energyIncrement

    // Simulate waste generation (random small amounts)
    if (Math.random() < 0.1) {
      // 10% chance of waste generation
      this.wasteAccumulator += Math.random() * 0.5 // Up to 0.5kg
    }

    // Calculate CO2 emissions (using 0.7 kg CO2 per kWh factor)
    const co2Emissions = energyIncrement * 0.7

    const metrics = [
      {
        name: "power_active_w",
        value: Math.round(currentPower * 100) / 100,
        unit: "W",
      },
      {
        name: "energy_kwh",
        value: Math.round(energyIncrement * 10000) / 10000,
        unit: "kWh",
      },
      {
        name: "co2_kg",
        value: Math.round(co2Emissions * 10000) / 10000,
        unit: "kg",
      },
    ]

    // Occasionally add waste data
    if (this.wasteAccumulator > 0) {
      metrics.push({
        name: "waste_kg",
        value: Math.round(this.wasteAccumulator * 1000) / 1000,
        unit: "kg",
      })
      this.wasteAccumulator = 0 // Reset after reporting
    }

    return {
      version: "1.0",
      device_id: this.deviceId,
      ts: now,
      metrics,
      tags: {
        production_line: "line-1",
        location: "factory-floor-a",
        agent_version: "1.0.0",
      },
    }
  }

  /**
   * Send telemetry data to server
   */
  private async sendTelemetry(payload: TelemetryPayload): Promise<boolean> {
    if (!this.deviceApiKey) {
      console.error("[EdgeAgent] No device API key available")
      return false
    }

    try {
      const timestamp = new Date().toISOString()
      const payloadString = JSON.stringify(payload)
      const signature = this.computeSignature(this.deviceApiKey, timestamp, payloadString)

      const headers = {
        "Content-Type": "application/json",
        Authorization: "Bearer ORG_API_KEY_PLACEHOLDER",
        "x-zerocraftr-device-id": this.deviceId,
        "x-zerocraftr-timestamp": timestamp,
        "x-zerocraftr-signature": signature,
      }

      const response = await fetch(this.telemetryUrl, {
        method: "POST",
        headers,
        body: payloadString,
      })

      if (response.ok) {
        const result = await response.json()
        console.log(
          `[EdgeAgent] Telemetry sent successfully: ${payload.metrics.length} metrics at ${payload.ts.substring(11, 19)}`,
        )
        return true
      } else {
        const error = await response.json()
        console.error(`[EdgeAgent] Telemetry failed: ${response.status} - ${error.error}`)
        return false
      }
    } catch (error) {
      console.error("[EdgeAgent] Network error:", error)
      return false
    }
  }

  /**
   * Buffer message to local file for retry
   */
  private bufferMessage(payload: TelemetryPayload): void {
    if (!this.deviceApiKey) return

    try {
      const timestamp = new Date().toISOString()
      const payloadString = JSON.stringify(payload)
      const signature = this.computeSignature(this.deviceApiKey, timestamp, payloadString)

      const bufferedMessage: BufferedMessage = {
        payload,
        timestamp,
        signature,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer ORG_API_KEY_PLACEHOLDER",
          "x-zerocraftr-device-id": this.deviceId,
          "x-zerocraftr-timestamp": timestamp,
          "x-zerocraftr-signature": signature,
        },
      }

      // Read existing buffer
      let buffer: BufferedMessage[] = []
      if (existsSync(this.bufferFile)) {
        try {
          const bufferData = readFileSync(this.bufferFile, "utf-8")
          buffer = JSON.parse(bufferData)
        } catch (error) {
          console.warn("[EdgeAgent] Failed to read buffer file, starting fresh")
        }
      }

      // Add new message
      buffer.push(bufferedMessage)

      // Keep only last 100 messages to prevent unbounded growth
      if (buffer.length > 100) {
        buffer = buffer.slice(-100)
      }

      // Write back to file
      writeFileSync(this.bufferFile, JSON.stringify(buffer, null, 2))
      console.log(`[EdgeAgent] Message buffered (${buffer.length} total)`)
    } catch (error) {
      console.error("[EdgeAgent] Failed to buffer message:", error)
    }
  }

  /**
   * Retry sending buffered messages
   */
  private async retryBufferedMessages(): Promise<void> {
    if (!existsSync(this.bufferFile)) return

    try {
      const bufferData = readFileSync(this.bufferFile, "utf-8")
      const buffer: BufferedMessage[] = JSON.parse(bufferData)

      if (buffer.length === 0) return

      console.log(`[EdgeAgent] Retrying ${buffer.length} buffered messages...`)

      const successfulMessages: number[] = []

      for (let i = 0; i < buffer.length; i++) {
        const message = buffer[i]

        try {
          const response = await fetch(this.telemetryUrl, {
            method: "POST",
            headers: message.headers,
            body: JSON.stringify(message.payload),
          })

          if (response.ok) {
            successfulMessages.push(i)
            console.log(`[EdgeAgent] Buffered message ${i + 1} sent successfully`)
          }
        } catch (error) {
          // Network still down, keep message in buffer
          break
        }
      }

      // Remove successful messages from buffer
      if (successfulMessages.length > 0) {
        const remainingBuffer = buffer.filter((_, index) => !successfulMessages.includes(index))
        writeFileSync(this.bufferFile, JSON.stringify(remainingBuffer, null, 2))
        console.log(
          `[EdgeAgent] ${successfulMessages.length} buffered messages sent, ${remainingBuffer.length} remaining`,
        )
      }
    } catch (error) {
      console.error("[EdgeAgent] Failed to retry buffered messages:", error)
    }
  }

  /**
   * Main telemetry loop
   */
  private async telemetryLoop(): Promise<void> {
    if (!this.isRunning) return

    try {
      // Generate telemetry data
      const payload = this.generateTelemetryData()

      // Try to send telemetry
      const success = await this.sendTelemetry(payload)

      if (!success) {
        // Buffer the message for retry
        this.bufferMessage(payload)
      } else {
        // If send was successful, try to send any buffered messages
        await this.retryBufferedMessages()
      }
    } catch (error) {
      console.error("[EdgeAgent] Telemetry loop error:", error)
    }

    // Schedule next iteration (3-5 seconds)
    const nextInterval = 3000 + Math.random() * 2000 // 3-5 seconds
    this.sendInterval = setTimeout(() => this.telemetryLoop(), nextInterval)
  }

  /**
   * Start the edge agent
   */
  public async start(): Promise<void> {
    console.log("[EdgeAgent] Starting...")

    // If we have a pairing token but no API key, pair first
    if (this.pairingToken && !this.deviceApiKey) {
      const paired = await this.pairDevice()
      if (!paired) {
        console.error("[EdgeAgent] Failed to pair device, exiting")
        process.exit(1)
      }
    }

    // Verify we have an API key
    if (!this.deviceApiKey) {
      console.error("[EdgeAgent] No device API key available. Provide DEVICE_API_KEY or PAIRING_TOKEN.")
      process.exit(1)
    }

    // Start telemetry loop
    this.isRunning = true
    console.log("[EdgeAgent] Starting telemetry transmission...")
    await this.telemetryLoop()

    // Set up retry interval for buffered messages
    this.retryInterval = setInterval(() => {
      this.retryBufferedMessages()
    }, 30000) // Check every 30 seconds
  }

  /**
   * Stop the edge agent
   */
  public stop(): void {
    console.log("[EdgeAgent] Stopping...")
    this.isRunning = false

    if (this.sendInterval) {
      clearTimeout(this.sendInterval)
      this.sendInterval = null
    }

    if (this.retryInterval) {
      clearInterval(this.retryInterval)
      this.retryInterval = null
    }

    console.log("[EdgeAgent] Stopped")
  }
}

// Handle graceful shutdown
const agent = new ZeroCraftrEdgeAgent()

process.on("SIGINT", () => {
  console.log("\n[EdgeAgent] Received SIGINT, shutting down gracefully...")
  agent.stop()
  process.exit(0)
})

process.on("SIGTERM", () => {
  console.log("\n[EdgeAgent] Received SIGTERM, shutting down gracefully...")
  agent.stop()
  process.exit(0)
})

// Start the agent
agent.start().catch((error) => {
  console.error("[EdgeAgent] Failed to start:", error)
  process.exit(1)
})
