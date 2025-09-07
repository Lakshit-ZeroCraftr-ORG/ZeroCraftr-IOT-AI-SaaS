import { NextRequest } from "next/server"
import { POST } from "@/app/api/telemetry/route"
import { computeHmacSignature } from "@/lib/crypto"
import { getDeviceApiKey } from "@/lib/devices"
import jest from "jest" // Import jest to declare the variable

// Mock the dependencies
jest.mock("@/lib/devices")
jest.mock("@/lib/queue")

const mockGetDeviceApiKey = getDeviceApiKey as jest.MockedFunction<typeof getDeviceApiKey>

describe("/api/telemetry", () => {
  const validPayload = {
    device_id: "test-device-001",
    timestamp: Date.now(),
    power_w: 1500,
    energy_kwh: 2.5,
    co2_kg: 1.75,
    waste_kg: 0.5,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.ORG_API_KEY = "test-org-key"
  })

  it("should accept valid telemetry with correct HMAC", async () => {
    const deviceKey = "test-device-key"
    mockGetDeviceApiKey.mockResolvedValue(deviceKey)

    const signature = computeHmacSignature(JSON.stringify(validPayload), deviceKey)

    const request = new NextRequest("http://localhost:3000/api/telemetry", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-org-key",
        "X-Signature": signature,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validPayload),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
  })

  it("should reject requests without org API key", async () => {
    const request = new NextRequest("http://localhost:3000/api/telemetry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validPayload),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it("should reject requests with invalid HMAC signature", async () => {
    const deviceKey = "test-device-key"
    mockGetDeviceApiKey.mockResolvedValue(deviceKey)

    const request = new NextRequest("http://localhost:3000/api/telemetry", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-org-key",
        "X-Signature": "invalid-signature",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validPayload),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it("should reject requests with expired timestamp", async () => {
    const deviceKey = "test-device-key"
    mockGetDeviceApiKey.mockResolvedValue(deviceKey)

    const expiredPayload = {
      ...validPayload,
      timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes ago
    }

    const signature = computeHmacSignature(JSON.stringify(expiredPayload), deviceKey)

    const request = new NextRequest("http://localhost:3000/api/telemetry", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-org-key",
        "X-Signature": signature,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(expiredPayload),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it("should reject requests for unknown devices", async () => {
    mockGetDeviceApiKey.mockResolvedValue(null)

    const signature = computeHmacSignature(JSON.stringify(validPayload), "any-key")

    const request = new NextRequest("http://localhost:3000/api/telemetry", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-org-key",
        "X-Signature": signature,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validPayload),
    })

    const response = await POST(request)
    expect(response.status).toBe(404)
  })
})
