# ZeroCraftr Services

This directory contains the edge agent and device simulator services for the ZeroCraftr telemetry platform.

## Edge Agent

The edge agent is a TypeScript Node.js application that runs on manufacturing devices to collect and transmit telemetry data.

### Features

- **Device Pairing**: Automatic pairing using QR code tokens
- **Secure Transmission**: HMAC-SHA256 signed telemetry data
- **Network Resilience**: Local buffering when network is unavailable
- **Realistic Simulation**: Generates power, energy, CO2, and waste metrics
- **Graceful Shutdown**: Handles SIGINT/SIGTERM signals properly

### Setup

\`\`\`bash
cd services/edge-agent
npm install
npm run build
\`\`\`

### Usage

#### With Device API Key
\`\`\`bash
cd services/edge-agent
DEVICE_ID=my-device-001 \
DEVICE_API_KEY=my-device-api-key \
TELEMETRY_URL=http://localhost:3000/api/telemetry \
npm run dev
\`\`\`

#### With Pairing Token
\`\`\`bash
cd services/edge-agent
DEVICE_ID=my-device-001 \
PAIRING_TOKEN=pair-abc123xyz \
TELEMETRY_URL=http://localhost:3000/api/telemetry \
npm run dev
\`\`\`

### Environment Variables

- `DEVICE_ID` - Unique device identifier
- `DEVICE_API_KEY` - Device API key (if already paired)
- `PAIRING_TOKEN` - One-time pairing token (alternative to API key)
- `TELEMETRY_URL` - Telemetry endpoint URL

## Device Simulator

The device simulator creates multiple virtual devices for testing and demonstration.

### Features

- **Multiple Devices**: Simulate 2+ devices simultaneously
- **Realistic Data**: Varied power consumption, energy accumulation
- **Configurable Duration**: Run for specified time period
- **Easy Monitoring**: Built-in status reporting

### Usage

#### Node.js Version (Recommended)
\`\`\`bash
# From project root
pnpm simulator

# With custom configuration
NUM_DEVICES=5 DURATION=600 pnpm simulator
\`\`\`

#### Bash Version
\`\`\`bash
# From project root
pnpm simulator:bash

# With custom configuration
NUM_DEVICES=3 DURATION=300 ./services/device-simulator/simulator.sh
\`\`\`

### Environment Variables

- `NUM_DEVICES` - Number of devices to simulate (default: 2)
- `DURATION` - Simulation duration in seconds (default: 300)
- `TELEMETRY_URL` - Telemetry endpoint URL

## Quick Start

1. **Start the web server:**
   \`\`\`bash
   pnpm dev
   \`\`\`

2. **Run the demo (server + simulator):**
   \`\`\`bash
   pnpm demo
   \`\`\`

3. **Monitor the dashboard:**
   Open http://localhost:3000/dashboard

## Architecture

\`\`\`
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Edge Agent    │───▶│   Next.js API    │───▶│   Dashboard     │
│                 │    │                  │    │                 │
│ • Collects data │    │ • HMAC validation│    │ • Real-time KPIs│
│ • Signs requests│    │ • Queue management│    │ • Live charts   │
│ • Buffers offline│   │ • Device registry│    │ • Device status │
└─────────────────┘    └──────────────────┘    └─────────────────┘
\`\`\`

## Development

### Adding New Metrics

1. **Update the edge agent** (`services/edge-agent/src/index.ts`):
   \`\`\`typescript
   const metrics = [
     // ... existing metrics
     {
       name: "temperature_c",
       value: 25.5,
       unit: "°C"
     }
   ]
   \`\`\`

2. **Update the aggregation API** (`app/api/telemetry/aggregates/route.ts`):
   \`\`\`typescript
   case "temperature_c":
     bucket.temperature_c += metric.value
     break
   \`\`\`

3. **Update the dashboard** to display the new metric.

### Testing Network Failures

1. Start the edge agent
2. Stop the web server (Ctrl+C)
3. Observe buffering behavior in agent logs
4. Restart the web server
5. Watch buffered messages get retried

## Troubleshooting

### Edge Agent Won't Start
- Check that `DEVICE_API_KEY` or `PAIRING_TOKEN` is provided
- Verify the telemetry URL is correct
- Ensure the web server is running

### Simulator Connection Errors
- Confirm the web server is running on the expected port
- Check firewall settings
- Verify the telemetry endpoint is accessible

### No Data in Dashboard
- Check that devices are sending data (look at server logs)
- Verify the aggregation API is working: `GET /api/telemetry/aggregates`
- Ensure the dashboard polling is enabled (check browser network tab)

## Production Deployment

For production deployment:

1. **Build the edge agent:**
   \`\`\`bash
   cd services/edge-agent
   npm run build
   npm start
   \`\`\`

2. **Use environment variables** for configuration
3. **Set up process monitoring** (PM2, systemd, etc.)
4. **Configure log rotation** for long-running deployments
5. **Monitor buffer file sizes** to prevent disk space issues
