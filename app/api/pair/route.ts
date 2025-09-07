import { type NextRequest, NextResponse } from "next/server"
import { getAllDevices } from "@/lib/devices"

/**
 * POST /api/pair - Pair device using pairing token
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { pairing_token } = body

    if (!pairing_token || typeof pairing_token !== "string") {
      return NextResponse.json({ error: "Pairing token is required" }, { status: 400 })
    }

    // Find device with matching pairing token
    const devices = getAllDevices()
    const device = devices.find((d) => d.pairing_token === pairing_token)

    if (!device) {
      console.log(`[v0] Invalid pairing token attempt: ${pairing_token}`)
      return NextResponse.json({ error: "Invalid pairing token" }, { status: 401 })
    }

    // Check if token has expired
    if (device.pairing_token_expires) {
      const expiresAt = new Date(device.pairing_token_expires)
      if (expiresAt < new Date()) {
        console.log(`[v0] Expired pairing token for device: ${device.device_id}`)
        return NextResponse.json({ error: "Pairing token has expired" }, { status: 401 })
      }
    }

    // Invalidate the pairing token (single use)
    device.pairing_token = undefined
    device.pairing_token_expires = undefined
    device.status = "active"

    console.log(`[v0] Device paired successfully: ${device.device_id}`)

    return NextResponse.json({
      device_id: device.device_id,
      device_api_key: device.device_api_key,
      paired_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Failed to pair device:", error)
    return NextResponse.json({ error: "Failed to pair device" }, { status: 500 })
  }
}
