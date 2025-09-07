import { type NextRequest, NextResponse } from "next/server"
import { getAllDevices, createDevice } from "@/lib/devices"
import { config } from "@/lib/config"

/**
 * GET /api/devices - List all devices
 */
export async function GET() {
  try {
    const devices = getAllDevices()

    // Remove sensitive information from response
    const safeDevices = devices.map((device) => ({
      device_id: device.device_id,
      name: device.name,
      location: device.location,
      created_at: device.created_at,
      last_seen: device.last_seen,
      status: device.status,
      // Don't expose device_api_key or pairing_token
    }))

    return NextResponse.json({ devices: safeDevices })
  } catch (error) {
    console.error("[v0] Failed to fetch devices:", error)
    return NextResponse.json({ error: "Failed to fetch devices" }, { status: 500 })
  }
}

/**
 * POST /api/devices - Create new device
 */
export async function POST(request: NextRequest) {
  try {
    // Validate organization API key
    const authorization = request.headers.get("authorization")
    if (!authorization) {
      return NextResponse.json({ error: "Missing authorization header" }, { status: 401 })
    }

    const orgApiKey = authorization.replace("Bearer ", "")
    if (orgApiKey !== config.ORG_API_KEY) {
      return NextResponse.json({ error: "Invalid organization API key" }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { name, location } = body

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Device name is required" }, { status: 400 })
    }

    // Create device
    const device = createDevice(name, location)

    console.log(`[v0] Created device: ${device.device_id} (${device.name})`)

    // Return device with sensitive information (for initial setup)
    return NextResponse.json({
      device_id: device.device_id,
      name: device.name,
      location: device.location,
      device_api_key: device.device_api_key,
      pairing_token: device.pairing_token,
      pairing_token_expires: device.pairing_token_expires,
      created_at: device.created_at,
      status: device.status,
    })
  } catch (error) {
    console.error("[v0] Failed to create device:", error)
    return NextResponse.json({ error: "Failed to create device" }, { status: 500 })
  }
}
