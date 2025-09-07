import { NextRequest } from "next/server"
import { GET, POST } from "@/app/api/devices/route"
import { POST as PairPOST } from "@/app/api/pair/route"

describe("/api/devices", () => {
  beforeEach(() => {
    process.env.ORG_API_KEY = "test-org-key"
  })

  describe("GET /api/devices", () => {
    it("should return list of devices", async () => {
      const request = new NextRequest("http://localhost:3000/api/devices", {
        headers: {
          Authorization: "Bearer test-org-key",
        },
      })

      const response = await GET(request)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(Array.isArray(data.devices)).toBe(true)
    })

    it("should reject unauthorized requests", async () => {
      const request = new NextRequest("http://localhost:3000/api/devices")

      const response = await GET(request)
      expect(response.status).toBe(401)
    })
  })

  describe("POST /api/devices", () => {
    it("should create new device", async () => {
      const request = new NextRequest("http://localhost:3000/api/devices", {
        method: "POST",
        headers: {
          Authorization: "Bearer test-org-key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Test Device",
          location: "Factory Floor A",
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(201)

      const data = await response.json()
      expect(data.device_id).toBeDefined()
      expect(data.api_key).toBeDefined()
      expect(data.pairing_token).toBeDefined()
    })
  })
})

describe("/api/pair", () => {
  beforeEach(() => {
    process.env.EDGE_PAIRING_SECRET = "test-pairing-secret"
  })

  it("should pair device with valid token", async () => {
    // First create a device to get a pairing token
    const createRequest = new NextRequest("http://localhost:3000/api/devices", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-org-key",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Test Device",
        location: "Test Location",
      }),
    })

    const createResponse = await POST(createRequest)
    const createData = await createResponse.json()

    // Then use the pairing token
    const pairRequest = new NextRequest("http://localhost:3000/api/pair", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        device_id: createData.device_id,
        pairing_token: createData.pairing_token,
      }),
    })

    const pairResponse = await PairPOST(pairRequest)
    expect(pairResponse.status).toBe(200)

    const pairData = await pairResponse.json()
    expect(pairData.device_api_key).toBeDefined()
  })
})
