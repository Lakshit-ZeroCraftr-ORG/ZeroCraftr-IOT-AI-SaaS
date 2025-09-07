# ZeroCraftr V0 API Documentation

## Authentication

All API endpoints require authentication via the `Authorization` header:

\`\`\`
Authorization: Bearer <ORG_API_KEY>
\`\`\`

## Telemetry Endpoints

### POST /api/telemetry

Ingest telemetry data from manufacturing devices with HMAC signature validation.

**Headers:**
- `Authorization: Bearer <ORG_API_KEY>` - Organization API key
- `X-Signature: <HMAC_SHA256>` - HMAC signature of request body
- `Content-Type: application/json`

**Request Body:**
\`\`\`json
{
  "device_id": "string",
  "timestamp": "number (Unix timestamp in ms)",
  "power_w": "number (optional)",
  "energy_kwh": "number (optional)", 
  "co2_kg": "number (optional)",
  "waste_kg": "number (optional)"
}
\`\`\`

**Response:**
- `200 OK` - Telemetry accepted and queued
- `401 Unauthorized` - Invalid signature or expired timestamp
- `404 Not Found` - Device not found
- `422 Unprocessable Entity` - Invalid payload format

**Example:**
\`\`\`bash
# Generate signature
PAYLOAD='{"device_id":"dev-001","timestamp":1704067200000,"power_w":1500}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "device-api-key" -binary | base64)

# Send request
curl -X POST http://localhost:3000/api/telemetry \
  -H "Authorization: Bearer ORG_API_KEY" \
  -H "X-Signature: $SIGNATURE" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD"
\`\`\`

### GET /api/telemetry/aggregates

Retrieve aggregated telemetry data for dashboard display.

**Query Parameters:**
- `device_id` (optional) - Filter by specific device
- `from` (optional) - Start timestamp (ISO 8601)
- `to` (optional) - End timestamp (ISO 8601)
- `interval` (optional) - Aggregation interval (1m, 5m, 1h, 1d)

**Response:**
\`\`\`json
{
  "current_power_kw": 2.5,
  "today_energy_kwh": 45.2,
  "estimated_co2_kg": 31.64,
  "total_waste_kg": 12.8,
  "last_updated": "2025-01-07T12:34:56.789Z",
  "device_count": 3,
  "active_devices": 2,
  "time_series": [
    {
      "timestamp": "2025-01-07T12:00:00.000Z",
      "power_kw": 2.1,
      "energy_kwh": 2.1,
      "co2_kg": 1.47,
      "waste_kg": 0.5
    }
  ]
}
\`\`\`

## Device Management Endpoints

### GET /api/devices

List all registered devices.

**Response:**
\`\`\`json
{
  "devices": [
    {
      "device_id": "dev-001",
      "name": "Production Line A",
      "location": "Factory Floor 1",
      "status": "active",
      "last_seen": "2025-01-07T12:34:56.789Z",
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  ]
}
\`\`\`

### POST /api/devices

Create a new device with API key and pairing token.

**Request Body:**
\`\`\`json
{
  "name": "string",
  "location": "string (optional)"
}
\`\`\`

**Response:**
\`\`\`json
{
  "device_id": "dev-003",
  "name": "New Device",
  "location": "Factory Floor 2",
  "api_key": "dev-003-api-key-xyz789",
  "pairing_token": "pair-token-abc123",
  "pairing_expires_at": "2025-01-07T12:44:56.789Z"
}
\`\`\`

### POST /api/devices/rotate

Rotate API key for an existing device.

**Request Body:**
\`\`\`json
{
  "device_id": "string"
}
\`\`\`

**Response:**
\`\`\`json
{
  "device_id": "dev-001",
  "new_api_key": "dev-001-new-key-xyz789",
  "rotated_at": "2025-01-07T12:34:56.789Z"
}
\`\`\`

### POST /api/pair

Pair a device using a pairing token to retrieve the API key.

**Request Body:**
\`\`\`json
{
  "device_id": "string",
  "pairing_token": "string"
}
\`\`\`

**Response:**
\`\`\`json
{
  "device_api_key": "dev-001-api-key-abc123",
  "device_id": "dev-001",
  "paired_at": "2025-01-07T12:34:56.789Z"
}
\`\`\`

## Error Responses

All endpoints return consistent error responses:

\`\`\`json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2025-01-07T12:34:56.789Z"
}
\`\`\`

**Common Error Codes:**
- `UNAUTHORIZED` - Missing or invalid API key
- `INVALID_SIGNATURE` - HMAC signature validation failed
- `EXPIRED_TIMESTAMP` - Request timestamp outside ±5 minute window
- `DEVICE_NOT_FOUND` - Device ID not registered
- `INVALID_PAYLOAD` - Request body validation failed
- `PAIRING_TOKEN_EXPIRED` - Pairing token has expired (10 minute limit)
- `PAIRING_TOKEN_USED` - Pairing token already consumed

## Rate Limits

- Telemetry ingestion: 100 requests/minute per device
- Device management: 10 requests/minute per organization
- Dashboard aggregates: 60 requests/minute per organization

## HMAC Signature Generation

Signatures are computed using HMAC-SHA256:

\`\`\`javascript
const crypto = require('crypto')

function computeHmacSignature(payload, deviceApiKey) {
  return crypto
    .createHmac('sha256', deviceApiKey)
    .update(payload)
    .digest('base64')
}
\`\`\`

**Important:** Always use the raw JSON payload string for signature computation, not the parsed object.
