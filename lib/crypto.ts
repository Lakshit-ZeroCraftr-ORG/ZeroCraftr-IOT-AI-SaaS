import { createHmac, timingSafeEqual } from "crypto"

/**
 * Compute HMAC-SHA256 signature for telemetry payload
 * @param deviceKey - Device API key used as HMAC secret
 * @param timestamp - ISO timestamp string
 * @param payload - JSON payload as string
 * @returns Base64 encoded HMAC signature
 */
export function computeSignature(deviceKey: string, timestamp: string, payload: string): string {
  const message = `${timestamp}.${payload}`
  const hmac = createHmac("sha256", deviceKey)
  hmac.update(message)
  return hmac.digest("base64")
}

/**
 * Compute HMAC-SHA256 signature for telemetry payload (alias for computeSignature)
 * @param payload - JSON payload as string
 * @param deviceKey - Device API key used as HMAC secret
 * @returns Base64 encoded HMAC signature
 */
export function computeHmacSignature(payload: string, deviceKey: string): string {
  const hmac = createHmac("sha256", deviceKey)
  hmac.update(payload)
  return hmac.digest("base64")
}

/**
 * Verify HMAC signature using constant-time comparison
 * @param expectedSignature - Expected signature from request header
 * @param computedSignature - Computed signature from payload
 * @returns True if signatures match
 */
export function verifySignature(expectedSignature: string, computedSignature: string): boolean {
  if (expectedSignature.length !== computedSignature.length) {
    return false
  }

  try {
    const expectedBuffer = Buffer.from(expectedSignature, "base64")
    const computedBuffer = Buffer.from(computedSignature, "base64")

    if (expectedBuffer.length !== computedBuffer.length) {
      return false
    }

    return timingSafeEqual(expectedBuffer, computedBuffer)
  } catch (error) {
    console.error("[v0] Signature verification error:", error)
    return false
  }
}

/**
 * Validate timestamp is within acceptable skew (±5 minutes)
 * @param timestamp - ISO timestamp string
 * @returns True if timestamp is valid and within skew
 */
export function validateTimestamp(timestamp: string): boolean {
  try {
    const requestTime = new Date(timestamp).getTime()
    const currentTime = Date.now()
    const skewMs = 5 * 60 * 1000 // 5 minutes in milliseconds

    if (isNaN(requestTime)) {
      return false
    }

    const timeDiff = Math.abs(currentTime - requestTime)
    return timeDiff <= skewMs
  } catch (error) {
    console.error("[v0] Timestamp validation error:", error)
    return false
  }
}
