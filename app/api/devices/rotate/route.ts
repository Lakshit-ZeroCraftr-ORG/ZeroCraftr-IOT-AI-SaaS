import { type NextRequest, NextResponse } from "next/server"
import { rotateDeviceKey, getDevice } from "@/lib/devices"
import { config } from "@/lib/config"

/**
 * POST /api/devices/rotate - Rotate device API key
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
    const { device_id } = body

    if (!device_id || typeof device_id !== "string") {
      return NextResponse.json({ error: "Device ID is required" }, { status: 400 })
    }

    // Check if device exists
    const device = getDevice(device_id)
    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 })
    }

    // Rotate the API key
    const newApiKey = rotateDeviceKey(device_id)
    if (!newApiKey) {
      return NextResponse.json({ error: "Failed to rotate device key" }, { status: 500 })
    }

    console.log(`[v0] Rotated API key for device: ${device_id}`)

    return NextResponse.json({
      device_id,
      new_device_api_key: newApiKey,
      rotated_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Failed to rotate device key:", error)
    return NextResponse.json({ error: "Failed to rotate device key" }, { status: 500 })
  }
}
