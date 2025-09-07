import { type NextRequest, NextResponse } from "next/server"
import { computeSignature, verifySignature, validateTimestamp } from "@/lib/crypto"
import { getDeviceKey, updateDeviceLastSeen } from "@/lib/devices"
import { getTelemetryQueue, type TelemetryData } from "@/lib/queue"
import { config } from "@/lib/config"

/**
 * Telemetry payload schema
 */
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

/**
 * Metrics for observability
 */
const metrics = {
  totalTelemetryReceived: 0,
  authFailures: 0,
  signatureFailures: 0,
  timestampFailures: 0,
  queueFailures: 0,
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Extract headers
    const authorization = request.headers.get("authorization")
    const deviceId = request.headers.get("x-zerocraftr-device-id")
    const timestamp = request.headers.get("x-zerocraftr-timestamp")
    const signature = request.headers.get("x-zerocraftr-signature")

    // Validate required headers
    if (!authorization || !deviceId || !timestamp || !signature) {
      return NextResponse.json({ error: "Missing required headers" }, { status: 400 })
    }

    // Validate organization API key
    const orgApiKey = authorization.replace("Bearer ", "")
    if (orgApiKey !== config.ORG_API_KEY) {
      metrics.authFailures++
      console.log(`[v0] Invalid org API key attempt from device ${deviceId}`)
      return NextResponse.json({ error: "Invalid organization API key" }, { status: 401 })
    }

    // Validate timestamp
    if (!validateTimestamp(timestamp)) {
      metrics.timestampFailures++
      console.log(`[v0] Invalid timestamp from device ${deviceId}: ${timestamp}`)
      return NextResponse.json({ error: "Invalid timestamp or time skew too large" }, { status: 401 })
    }

    // Get device API key
    const deviceApiKey = getDeviceKey(deviceId)
    if (!deviceApiKey) {
      metrics.authFailures++
      console.log(`[v0] Unknown device ID: ${deviceId}`)
      return NextResponse.json({ error: "Unknown device ID" }, { status: 401 })
    }

    // Parse payload
    let payload: TelemetryPayload
    try {
      payload = await request.json()
    } catch (error) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }

    // Validate payload structure
    if (!payload.version || !payload.device_id || !payload.ts || !Array.isArray(payload.metrics)) {
      return NextResponse.json({ error: "Invalid payload structure" }, { status: 400 })
    }

    // Verify device ID matches header
    if (payload.device_id !== deviceId) {
      return NextResponse.json({ error: "Device ID mismatch between header and payload" }, { status: 400 })
    }

    // Compute and verify HMAC signature
    const payloadString = JSON.stringify(payload)
    const expectedSignature = computeSignature(deviceApiKey, timestamp, payloadString)

    if (!verifySignature(signature, expectedSignature)) {
      metrics.signatureFailures++
      console.log(`[v0] Invalid signature from device ${deviceId}`)
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    // Prepare telemetry data for queue
    const telemetryData: TelemetryData = {
      device_id: deviceId,
      timestamp: payload.ts,
      payload: payload,
      received_at: new Date().toISOString(),
    }

    // Enqueue telemetry data
    const queue = getTelemetryQueue()
    const enqueued = await queue.enqueue(telemetryData)

    if (!enqueued) {
      metrics.queueFailures++
      console.error(`[v0] Failed to enqueue telemetry from device ${deviceId}`)

      // Retry once before failing
      const retryEnqueued = await queue.enqueue(telemetryData)
      if (!retryEnqueued) {
        return NextResponse.json({ error: "Queue temporarily unavailable" }, { status: 502 })
      }
    }

    // Update device last seen
    updateDeviceLastSeen(deviceId)

    // Update metrics
    metrics.totalTelemetryReceived++

    // Log successful ingestion (trimmed payload)
    const trimmedPayload = payloadString.length > 200 ? payloadString.substring(0, 200) + "..." : payloadString

    console.log(`[v0] Telemetry ingested from ${deviceId} at ${timestamp}: ${trimmedPayload}`)

    const processingTime = Date.now() - startTime
    console.log(`[v0] Processing time: ${processingTime}ms`)

    return NextResponse.json({ status: "ok" })
  } catch (error) {
    console.error("[v0] Telemetry ingestion error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * GET endpoint to retrieve metrics for monitoring
 */
export async function GET() {
  const queue = getTelemetryQueue()
  const queueSize = await queue.size()

  return NextResponse.json({
    metrics: {
      ...metrics,
      queueSize,
    },
    timestamp: new Date().toISOString(),
  })
}
