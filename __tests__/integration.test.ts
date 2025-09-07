import { computeHmacSignature } from "@/lib/crypto"

describe("End-to-End Telemetry Flow", () => {
  const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000"

  it("should complete full device lifecycle", async () => {
    // 1. Create device
    const createResponse = await fetch(`${baseUrl}/api/devices`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.ORG_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Integration Test Device",
        location: "Test Lab",
      }),
    })

    expect(createResponse.status).toBe(201)
    const device = await createResponse.json()

    // 2. Pair device
    const pairResponse = await fetch(`${baseUrl}/api/pair`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        device_id: device.device_id,
        pairing_token: device.pairing_token,
      }),
    })

    expect(pairResponse.status).toBe(200)
    const pairData = await pairResponse.json()

    // 3. Send telemetry
    const telemetryPayload = {
      device_id: device.device_id,
      timestamp: Date.now(),
      power_w: 2000,
      energy_kwh: 3.5,
      co2_kg: 2.45,
      waste_kg: 0.8,
    }

    const signature = computeHmacSignature(JSON.stringify(telemetryPayload), pairData.device_api_key)

    const telemetryResponse = await fetch(`${baseUrl}/api/telemetry`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.ORG_API_KEY}`,
        "X-Signature": signature,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(telemetryPayload),
    })

    expect(telemetryResponse.status).toBe(200)

    // 4. Verify aggregates
    const aggregatesResponse = await fetch(`${baseUrl}/api/telemetry/aggregates`, {
      headers: {
        Authorization: `Bearer ${process.env.ORG_API_KEY}`,
      },
    })

    expect(aggregatesResponse.status).toBe(200)
    const aggregates = await aggregatesResponse.json()
    expect(aggregates.current_power_kw).toBeGreaterThan(0)
  }, 30000)
})
