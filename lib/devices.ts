/**
 * Device registry for development/testing
 * In production, this would be backed by a database
 */

export interface Device {
  device_id: string
  name: string
  device_api_key: string
  location?: string
  created_at: string
  last_seen?: string
  status: "active" | "inactive" | "error"
  pairing_token?: string
  pairing_token_expires?: string
}

// In-memory device registry for development
const deviceRegistry: Map<string, Device> = new Map()

// Initialize with sample devices for testing
const sampleDevices: Device[] = [
  {
    device_id: "dev-001",
    name: "Production Line A - Power Monitor",
    device_api_key: "dev-001-secret-key-12345",
    location: "Factory Floor A",
    created_at: new Date().toISOString(),
    status: "active",
  },
  {
    device_id: "dev-002",
    name: "Waste Monitor - Line B",
    device_api_key: "dev-002-secret-key-67890",
    location: "Factory Floor B",
    created_at: new Date().toISOString(),
    status: "active",
  },
]

// Populate registry with sample devices
sampleDevices.forEach((device) => {
  deviceRegistry.set(device.device_id, device)
})

/**
 * Get device API key by device ID
 * @param deviceId - Device identifier
 * @returns Device API key or null if not found
 */
export function getDeviceKey(deviceId: string): string | null {
  const device = deviceRegistry.get(deviceId)
  return device?.device_api_key || null
}

/**
 * Get device API key by device ID (alias for getDeviceKey)
 * @param deviceId - Device identifier
 * @returns Device API key or null if not found
 */
export function getDeviceApiKey(deviceId: string): Promise<string | null> {
  const device = deviceRegistry.get(deviceId)
  return Promise.resolve(device?.device_api_key || null)
}

/**
 * Get device information by device ID
 * @param deviceId - Device identifier
 * @returns Device object or null if not found
 */
export function getDevice(deviceId: string): Device | null {
  return deviceRegistry.get(deviceId) || null
}

/**
 * Update device last seen timestamp
 * @param deviceId - Device identifier
 */
export function updateDeviceLastSeen(deviceId: string): void {
  const device = deviceRegistry.get(deviceId)
  if (device) {
    device.last_seen = new Date().toISOString()
    device.status = "active"
    deviceRegistry.set(deviceId, device)
  }
}

/**
 * Get all devices
 * @returns Array of all devices
 */
export function getAllDevices(): Device[] {
  return Array.from(deviceRegistry.values())
}

/**
 * Create a new device
 * @param name - Device name
 * @param location - Device location (optional)
 * @returns Created device with generated keys
 */
export function createDevice(name: string, location?: string): Device {
  const deviceId = `dev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const deviceApiKey = `${deviceId}-key-${Math.random().toString(36).substr(2, 16)}`
  const pairingToken = `pair-${Math.random().toString(36).substr(2, 20)}`
  const pairingExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes

  const device: Device = {
    device_id: deviceId,
    name,
    device_api_key: deviceApiKey,
    location,
    created_at: new Date().toISOString(),
    status: "inactive",
    pairing_token: pairingToken,
    pairing_token_expires: pairingExpires,
  }

  deviceRegistry.set(deviceId, device)
  return device
}

/**
 * Rotate device API key
 * @param deviceId - Device identifier
 * @returns New device API key or null if device not found
 */
export function rotateDeviceKey(deviceId: string): string | null {
  const device = deviceRegistry.get(deviceId)
  if (!device) {
    return null
  }

  const newApiKey = `${deviceId}-key-${Math.random().toString(36).substr(2, 16)}`
  device.device_api_key = newApiKey
  deviceRegistry.set(deviceId, device)

  return newApiKey
}

/**
 * Generate new pairing token for existing device
 * @param deviceId - Device identifier
 * @returns New pairing token or null if device not found
 */
export function generatePairingToken(deviceId: string): string | null {
  const device = deviceRegistry.get(deviceId)
  if (!device) {
    return null
  }

  const pairingToken = `pair-${Math.random().toString(36).substr(2, 20)}`
  const pairingExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes

  device.pairing_token = pairingToken
  device.pairing_token_expires = pairingExpires
  deviceRegistry.set(deviceId, device)

  return pairingToken
}
