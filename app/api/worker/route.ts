import { NextResponse } from "next/server"
import { getTelemetryWorker } from "@/lib/worker"
import { config } from "@/lib/config"

/**
 * Manual worker trigger endpoint for development/testing
 * POST /api/worker - Start the telemetry worker
 * DELETE /api/worker - Stop the telemetry worker
 */
export async function POST() {
  try {
    if (!config.UPSTASH_REDIS_REST_URL || !config.TIMESCALE_WRITE_URL) {
      return NextResponse.json(
        {
          error: "Worker requires Redis and Timescale configuration",
        },
        { status: 400 },
      )
    }

    const worker = getTelemetryWorker()
    await worker.start()

    return NextResponse.json({
      status: "Worker started",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Failed to start worker:", error)
    return NextResponse.json(
      {
        error: "Failed to start worker",
      },
      { status: 500 },
    )
  }
}

export async function DELETE() {
  try {
    const worker = getTelemetryWorker()
    worker.stop()

    return NextResponse.json({
      status: "Worker stopped",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Failed to stop worker:", error)
    return NextResponse.json(
      {
        error: "Failed to stop worker",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: "Worker API available",
    endpoints: {
      "POST /api/worker": "Start telemetry worker",
      "DELETE /api/worker": "Stop telemetry worker",
    },
    config: {
      redis_configured: !!config.UPSTASH_REDIS_REST_URL,
      timescale_configured: !!config.TIMESCALE_WRITE_URL,
    },
  })
}
