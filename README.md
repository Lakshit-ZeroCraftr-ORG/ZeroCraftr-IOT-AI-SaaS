# ZeroCraftr V0 - Manufacturing Telemetry Platform

A Next.js + TypeScript web application for secure manufacturing telemetry ingestion, real-time monitoring, and sustainability analytics.

## Features

- 🔒 **Secure Telemetry Ingestion** - HMAC-SHA256 authenticated API endpoints
- 📊 **Real-time Dashboard** - Live KPI tracking and charts with 5-second updates
- 📱 **Device Management** - QR code pairing and device lifecycle management
- 🌱 **Sustainability Metrics** - Energy, emissions, and waste tracking
- 🚀 **Edge Agent** - TypeScript device simulator and edge agent



## API Documentation

### Telemetry Ingestion
\`\`\`bash

**Payload Schema:**
\`\`\`json
{
  "power_w": 1500,
  "energy_kwh": 2.5,
  "co2_kg": 1.75,
  "waste_kg": 0.5
}
\`\`\`

**Example Request:**
\`\`\`bash
PAYLOAD='{"device_id":"device-001","timestamp":'$(date +%s000)',"power_w":1500,"energy_kwh":2.5,"co2_kg":1.75,"waste_kg":0.5}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "device-api-key" -binary | base64)

curl -X POST http://localhost:3000/api/telemetry \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-org-api-key" \
  -H "X-Signature: $SIGNATURE" \
Authorization: Bearer <ORG_API_KEY>
\`\`\`

#### Create Device
\`\`\`bash
POST /api/devices
Authorization: Bearer <ORG_API_KEY>
Content-Type: application/json

{
  "name": "Production Line A",
  "location": "Factory Floor 1"
}
\`\`\`

#### Pair Device
\`\`\`bash
POST /api/pair
Content-Type: application/json

{
  "device_id": "device-001",
  "pairing_token": "pair-token-12345"
}
\`\`\`

#### Rotate Device Key
\`\`\`bash
POST /api/devices/rotate
Authorization: Bearer <ORG_API_KEY>
Content-Type: application/json

{
  "device_id": "device-001"
}
\`\`\`

### Telemetry Aggregates
\`\`\`bash
GET /api/telemetry/aggregates
Authorization: Bearer <ORG_API_KEY>
\`\`\`

Returns real-time KPI data for dashboard display.

## Edge Agent & Simulator

### Running the Device Simulator

The device simulator creates multiple virtual devices sending realistic telemetry data:

\`\`\`bash
# Run 5 devices for 60 seconds
pnpm simulator

# Custom configuration
NUM_DEVICES=10 DURATION=300 pnpm simulator

# Run individual edge agent
cd services/edge-agent
DEVICE_ID=test-001 DEVICE_API_KEY=test-key pnpm start
\`\`\`

### Edge Agent Configuration

Create `.env` file in `services/edge-agent/`:
\`\`\`env
DEVICE_ID=your-device-id
DEVICE_API_KEY=your-device-api-key
# OR for pairing:
# PAIRING_TOKEN=your-pairing-token

TELEMETRY_URL=http://localhost:3000/api/telemetry
ORG_API_KEY=your-org-api-key
\`\`\`

The edge agent features:
- Automatic device pairing with tokens
- Realistic telemetry data generation
- HMAC signature computation
- Network failure buffering and retry
- Comprehensive logging

## Testing

### Running Tests

\`\`\`bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run specific test file
pnpm test crypto.test.ts

# Run integration tests
pnpm test integration.test.ts
\`\`\`

### Test Coverage

The test suite includes:
- **Unit Tests**: Crypto functions, device management, API validation
- **Integration Tests**: Full telemetry flow from device creation to data ingestion
- **API Tests**: All endpoints with various success/failure scenarios

Target coverage: 80% lines, functions, branches, and statements.

### Manual Testing

1. **Create a test device:**
\`\`\`bash
curl -X POST http://localhost:3000/api/devices \
  -H "Authorization: Bearer your-org-api-key" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Device","location":"Test Lab"}'
\`\`\`

2. **Send test telemetry:**
\`\`\`bash
# Use the device_id and api_key from step 1
pnpm simulator
\`\`\`

3. **Verify in dashboard:**
- Visit http://localhost:3000/dashboard
- Check real-time KPI updates
- Verify device status and telemetry charts

## Security

### HMAC Authentication
- All telemetry requests signed with device-specific API keys
- SHA-256 HMAC with base64 encoding
- Constant-time signature comparison prevents timing attacks

### Timestamp Validation
- Requests must be within ±5 minutes of server time
- Prevents replay attacks with old signatures

### API Key Management
- Organization-level API key for device management
- Device-specific API keys for telemetry ingestion
- Secure key rotation with immediate effect

### Security Headers
- CORS protection for API endpoints
- Request size limits and rate limiting (production)
- Comprehensive request logging without key exposure

## Architecture

### Data Flow
1. **Device Registration**: Create device via web UI, get QR code
2. **Device Pairing**: Edge agent scans QR, exchanges token for API key
3. **Telemetry Ingestion**: Signed telemetry data sent to `/api/telemetry`
4. **Queue Processing**: Valid data enqueued (Redis or in-memory)
5. **Real-time Updates**: Dashboard polls aggregates every 5 seconds

### Queue System
- **Development**: In-memory queue with 10,000 item limit and LRU eviction
- **Production**: Upstash Redis streams for horizontal scaling

### Database Integration
- **Time-series Data**: Optional TimescaleDB for historical analytics
- **Device Registry**: In-memory with Redis persistence option
- **Queue Storage**: Redis streams or in-memory fallback

## Deployment

### Vercel Deployment

1. **Push to GitHub and connect to Vercel**

2. **Set environment variables in Vercel dashboard:**
\`\`\`env
ORG_API_KEY=your-production-org-key
EDGE_PAIRING_SECRET=your-production-pairing-secret
NEXT_PUBLIC_API_BASE_URL=https://your-app.vercel.app
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token
\`\`\`

3. **Deploy:**
\`\`\`bash
vercel --prod
\`\`\`

### Docker Deployment

\`\`\`dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
\`\`\`

### Environment Variables

**Required:**
- `ORG_API_KEY` - Organization API key for device management
- `EDGE_PAIRING_SECRET` - Secret for device pairing tokens

**Optional:**
- `UPSTASH_REDIS_REST_URL` - Redis URL for production queue
- `UPSTASH_REDIS_REST_TOKEN` - Redis authentication token
- `TIMESCALE_WRITE_URL` - TimescaleDB connection for time-series data
- `SENTRY_DSN` - Error tracking and monitoring

## Project Structure

\`\`\`
zerocraftr-v0/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── telemetry/     # Telemetry ingestion & aggregates
│   │   ├── devices/       # Device management & key rotation
│   │   └── pair/          # Device pairing endpoint
│   ├── dashboard/         # Real-time dashboard
│   ├── devices/           # Device management UI
│   ├── page.tsx           # Landing page
│   ├── layout.tsx         # Root layout with navigation
│   └── globals.css        # Global styles with design tokens
├── components/            # React components
│   ├── Navbar.tsx         # Top navigation
│   ├── LeftSidebar.tsx    # Sidebar navigation
│   ├── KpiCard.tsx        # KPI display cards
│   ├── LiveChart.tsx      # Real-time Recharts components
│   ├── CreateDeviceModal.tsx  # Device creation modal
│   ├── DeviceQRModal.tsx  # QR code generation modal
│   └── ui/                # shadcn/ui components
├── lib/                   # Utility libraries
│   ├── config.ts          # Configuration constants
│   ├── crypto.ts          # HMAC signature utilities
│   ├── devices.ts         # Device registry management
│   ├── queue.ts           # Queue management (Redis/memory)
│   └── utils.ts           # Utility functions
├── services/              # External services
│   ├── edge-agent/        # TypeScript edge agent
│   │   ├── src/index.ts   # Main agent logic
│   │   └── package.json   # Agent dependencies
│   └── device-simulator/  # Multi-device simulator
│       ├── simulator.js   # Node.js simulator
│       └── simulator.sh   # Bash simulator
├── __tests__/             # Test files
│   ├── crypto.test.ts     # Crypto function tests
│   ├── telemetry.test.ts  # API endpoint tests
│   ├── devices.test.ts    # Device management tests
│   └── integration.test.ts # End-to-end tests
├── jest.config.js         # Jest configuration
├── jest.setup.js          # Test setup and mocks
└── README.md              # This file
\`\`\`

## Development Roadmap

- [x] **Phase 1:** Project scaffold and basic UI
- [x] **Phase 2:** Telemetry ingestion API with HMAC auth
- [x] **Phase 3:** Device management and QR pairing
- [x] **Phase 4:** Real-time dashboard with live charts
- [x] **Phase 5:** Edge agent and device simulator
- [x] **Phase 6:** Testing and documentation

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes with tests
4. Run the test suite: `pnpm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For questions or issues:
1. Check the [GitHub Issues](https://github.com/your-org/zerocraftr-v0/issues)
2. Review the API documentation above
3. Run the test suite to verify your setup
4. Check server logs for detailed error messages
\`\`\`

\`\`\`json file="" isHidden
