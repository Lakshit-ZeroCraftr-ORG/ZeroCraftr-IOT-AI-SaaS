import { computeSignature, verifySignature, validateTimestamp } from "@/lib/crypto"

describe("Crypto utilities", () => {
  const deviceKey = "test-device-key-12345"
  const timestamp = "2025-01-07T12:00:00.000Z"
  const payload =
    '{"version":"1.0","device_id":"dev-001","ts":"2025-01-07T12:00:00.000Z","metrics":[{"name":"power_active_w","value":123.4,"unit":"W"}]}'

  describe("computeSignature", () => {
    it("should compute consistent HMAC signatures", () => {
      const signature1 = computeSignature(deviceKey, timestamp, payload)
      const signature2 = computeSignature(deviceKey, timestamp, payload)

      expect(signature1).toBe(signature2)
      expect(signature1).toBeTruthy()
      expect(typeof signature1).toBe("string")
    })

    it("should produce different signatures for different inputs", () => {
      const signature1 = computeSignature(deviceKey, timestamp, payload)
      const signature2 = computeSignature(deviceKey, timestamp, payload + "modified")
      const signature3 = computeSignature("different-key", timestamp, payload)

      expect(signature1).not.toBe(signature2)
      expect(signature1).not.toBe(signature3)
    })
  })

  describe("verifySignature", () => {
    it("should verify valid signatures", () => {
      const signature = computeSignature(deviceKey, timestamp, payload)
      const isValid = verifySignature(signature, signature)

      expect(isValid).toBe(true)
    })

    it("should reject invalid signatures", () => {
      const validSignature = computeSignature(deviceKey, timestamp, payload)
      const invalidSignature = computeSignature("wrong-key", timestamp, payload)

      const isValid = verifySignature(validSignature, invalidSignature)
      expect(isValid).toBe(false)
    })

    it("should handle malformed signatures gracefully", () => {
      const validSignature = computeSignature(deviceKey, timestamp, payload)

      expect(verifySignature("invalid-base64!", validSignature)).toBe(false)
      expect(verifySignature("", validSignature)).toBe(false)
      expect(verifySignature(validSignature, "")).toBe(false)
    })
  })

  describe("validateTimestamp", () => {
    it("should accept current timestamps", () => {
      const now = new Date().toISOString()
      expect(validateTimestamp(now)).toBe(true)
    })

    it("should accept timestamps within 5 minute window", () => {
      const fourMinutesAgo = new Date(Date.now() - 4 * 60 * 1000).toISOString()
      const fourMinutesFromNow = new Date(Date.now() + 4 * 60 * 1000).toISOString()

      expect(validateTimestamp(fourMinutesAgo)).toBe(true)
      expect(validateTimestamp(fourMinutesFromNow)).toBe(true)
    })

    it("should reject timestamps outside 5 minute window", () => {
      const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000).toISOString()
      const sixMinutesFromNow = new Date(Date.now() + 6 * 60 * 1000).toISOString()

      expect(validateTimestamp(sixMinutesAgo)).toBe(false)
      expect(validateTimestamp(sixMinutesFromNow)).toBe(false)
    })

    it("should reject invalid timestamp formats", () => {
      expect(validateTimestamp("invalid-date")).toBe(false)
      expect(validateTimestamp("")).toBe(false)
      expect(validateTimestamp("2025-13-45T99:99:99.999Z")).toBe(false)
    })
  })
})
