#!/usr/bin/env node

/**
 * ZeroCraftr Device Simulator (Node.js version)
 * Simulates multiple devices sending telemetry data
 */

const { spawn } = require("child_process")
const { createHmac } = require("crypto")
const fetch = require("node-fetch")
const path = require("path")

// Configuration
const config = {
  telemetryUrl: process.env.TELEMETRY_URL || "http://localhost:3000/api/telemetry",
  numDevices: Number.parseInt(process.env.NUM_DEVICES) || 2,
  duration: Number.parseInt(process.env.DURATION) || 300, // 5 minutes
  orgApiKey: process.env.ORG_API_KEY || "ORG_API_KEY_PLACEHOLDER",
}

console.log("🚀 ZeroCraftr Device Simulator (Node.js)")
console.log("========================================")
console.log(`Telemetry URL: ${config.telemetryUrl}`)
console.log(`Number of devices: ${config.numDevices}`)
console.log(`Duration: ${config.duration}s`)
console.log("")

// Device simulator class
class DeviceSimulator {
  constructor(deviceId) {
    this.deviceId = deviceId
    this.deviceApiKey = `${deviceId}-secret-key-12345`
    this.isRunning = false
    this.interval = null
    this.powerBase = 800 + Math.random() * 400 // 800-1200W base
    this.energyAccumulator = 0
    this.wasteAccumulator = 0
  }

  computeSignature(deviceKey, timestamp, payload) {
    const message = `${timestamp}.${payload}`
    const hmac = createHmac("sha256", deviceKey)
    hmac.update(message)
    return hmac.digest("base64")
  }

  generateTelemetryData() {
    const now = new Date().toISOString()

    // Simulate power with variation
    const powerVariation = (Math.random() - 0.5) * 200
    const currentPower = Math.max(0, this.powerBase + powerVariation)

    // Energy accumulation
    const intervalHours = 5 / 3600 // 5 seconds in hours
    const energyIncrement = (currentPower * intervalHours) / 1000
    this.energyAccumulator += energyIncrement

    // Waste generation
    if (Math.random() < 0.08) {
      this.wasteAccumulator += Math.random() * 0.3
    }

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
        value: Math.round(energyIncrement * 0.7 * 10000) / 10000,
        unit: "kg",
      },
    ]

    if (this.wasteAccumulator > 0) {
      metrics.push({
        name: "waste_kg",
        value: Math.round(this.wasteAccumulator * 1000) / 1000,
        unit: "kg",
      })
      this.wasteAccumulator = 0
    }

    return {
      version: "1.0",
      device_id: this.deviceId,
      ts: now,
      metrics,
      tags: {
        production_line: `line-${Math.ceil(Math.random() * 3)}`,
        location: "factory-floor-sim",
        simulator: "true",
      },
    }
  }

  async sendTelemetry(payload) {
    try {
      const timestamp = new Date().toISOString()
      const payloadString = JSON.stringify(payload)
      const signature = this.computeSignature(this.deviceApiKey, timestamp, payloadString)

      const response = await fetch(config.telemetryUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.orgApiKey}`,
          "x-zerocraftr-device-id": this.deviceId,
          "x-zerocraftr-timestamp": timestamp,
          "x-zerocraftr-signature": signature,
        },
        body: payloadString,
      })

      if (response.ok) {
        console.log(`📊 [${this.deviceId}] Sent ${payload.metrics.length} metrics`)
        return true
      } else {
        const error = await response.json()
        console.error(`❌ [${this.deviceId}] Failed: ${error.error}`)
        return false
      }
    } catch (error) {
      console.error(`🔌 [${this.deviceId}] Network error:`, error.message)
      return false
    }
  }

  async start() {
    console.log(`📱 Starting simulator: ${this.deviceId}`)
    this.isRunning = true

    const loop = async () => {
      if (!this.isRunning) return

      const payload = this.generateTelemetryData()
      await this.sendTelemetry(payload)

      // Schedule next iteration (3-5 seconds)
      const nextInterval = 3000 + Math.random() * 2000
      this.interval = setTimeout(loop, nextInterval)
    }

    await loop()
  }

  stop() {
    console.log(`🛑 Stopping simulator: ${this.deviceId}`)
    this.isRunning = false
    if (this.interval) {
      clearTimeout(this.interval)
      this.interval = null
    }
  }
}

// Main simulation
async function runSimulation() {
  // Check server availability
  try {
    console.log("🔍 Checking server availability...")
    const response = await fetch(config.telemetryUrl.replace("/api/telemetry", "/api/telemetry"), {
      method: "GET",
    })
    console.log("✅ Server is responding")
  } catch (error) {
    console.error("❌ Server not available. Please start the Next.js server first:")
    console.error("  pnpm dev")
    process.exit(1)
  }

  // Create device simulators
  const simulators = []
  for (let i = 1; i <= config.numDevices; i++) {
    const deviceId = `sim-device-${i.toString().padStart(3, "0")}`
    simulators.push(new DeviceSimulator(deviceId))
  }

  // Start all simulators
  console.log(`🚀 Starting ${config.numDevices} device simulators...`)
  for (const simulator of simulators) {
    await simulator.start()
    await new Promise((resolve) => setTimeout(resolve, 500)) // Stagger startup
  }

  console.log("")
  console.log("✅ All simulators started!")
  console.log("")
  console.log("📊 Monitor the dashboard at: http://localhost:3000/dashboard")
  console.log("📈 View telemetry metrics at: http://localhost:3000/api/telemetry")
  console.log("")
  console.log(`Running for ${config.duration} seconds... (Press Ctrl+C to stop)`)

  // Set up cleanup
  const cleanup = () => {
    console.log("\n🛑 Stopping all simulators...")
    simulators.forEach((sim) => sim.stop())
    console.log("✅ All simulators stopped")
    process.exit(0)
  }

  process.on("SIGINT", cleanup)
  process.on("SIGTERM", cleanup)

  // Run for specified duration
  setTimeout(() => {
    console.log("\n⏰ Simulation duration completed")
    cleanup()
  }, config.duration * 1000)
}

// Start simulation
runSimulation().catch((error) => {
  console.error("💥 Simulation failed:", error)
  process.exit(1)
})
