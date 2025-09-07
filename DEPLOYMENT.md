# ZeroCraftr V0 Deployment Guide

## Prerequisites

- Vercel account
- Upstash Redis database
- Timescale Cloud database
- Node.js 18+ for local development

## Environment Variables

### Required Variables

\`\`\`bash
# Internal security keys
ORG_API_KEY=a322af42c2dfbe969d5031895d4890ff
EDGE_PAIRING_SECRET=35e0b786a4b5394309ab32e2c569daee786fce8985c10461e38bdbff85ab75f4

# API configuration
NEXT_PUBLIC_API_BASE_URL=https://your-app.vercel.app
NEXT_PUBLIC_POLL_INTERVAL_MS=5000

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://guiding-urchin-59184.upstash.io
UPSTASH_REDIS_REST_TOKEN=AecwAAIncDE4MGVlMDc5N2FmYjU0ZWZlYWFjMjRmYmIwYjFhN2U2YXAxNTkxODQ

# Timescale Database
TIMESCALE_WRITE_URL=postgres://tsdbadmin:haea8k5vsz5hf9px@qotqtogcax.mh86dzqbtg.tsdb.cloud.timescale.com:31172/tsdb?sslmode=require

# Optional: Error monitoring
SENTRY_DSN=https://example@o11776.ingest.sentry.io/12345
\`\`\`

## Deployment Steps

### 1. Deploy to Vercel

\`\`\`bash
# Clone and deploy
git clone <your-repo>
cd zerocraftr-v0
vercel --prod

# Or use Vercel dashboard
# 1. Import GitHub repository
# 2. Configure environment variables
# 3. Deploy
\`\`\`

### 2. Configure Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add all required environment variables
4. Redeploy the application

### 3. Initialize Database Schema

The Timescale schema will be automatically initialized when the first telemetry data is processed. You can also manually trigger initialization:

\`\`\`bash
# Using the API endpoint
curl -X POST https://your-app.vercel.app/api/worker
\`\`\`

### 4. Test the Deployment

1. **Create a device:**
   \`\`\`bash
   curl -X POST https://your-app.vercel.app/api/devices \
     -H "Authorization: Bearer a322af42c2dfbe969d5031895d4890ff" \
     -H "Content-Type: application/json" \
     -d '{"name": "Test Device", "location": "Factory Floor"}'
   \`\`\`

2. **Send test telemetry:**
   \`\`\`bash
   # Use the device_api_key from step 1
   curl -X POST https://your-app.vercel.app/api/telemetry \
     -H "Authorization: Bearer a322af42c2dfbe969d5031895d4890ff" \
     -H "X-ZeroCraftr-Device-ID: <device_id>" \
     -H "X-ZeroCraftr-Timestamp: $(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" \
     -H "X-ZeroCraftr-Signature: <computed_signature>" \
     -H "Content-Type: application/json" \
     -d '{"version":"1.0","device_id":"<device_id>","ts":"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)","metrics":[{"name":"power_active_w","value":1500,"unit":"W"}]}'
   \`\`\`

3. **Check dashboard:**
   Visit `https://your-app.vercel.app/dashboard` to see live data

## Production Considerations

### Security
- Rotate API keys regularly
- Use HTTPS only
- Monitor authentication failures
- Implement rate limiting if needed

### Monitoring
- Set up Sentry for error tracking
- Monitor Redis queue size
- Track Timescale database performance
- Set up alerts for system failures

### Scaling
- Redis can handle high throughput
- Timescale automatically scales with data volume
- Vercel functions auto-scale based on demand
- Consider implementing connection pooling for high loads

### Backup & Recovery
- Timescale provides automated backups
- Export device configurations regularly
- Document recovery procedures

## Troubleshooting

### Common Issues

1. **Telemetry not appearing in dashboard:**
   - Check Redis connection
   - Verify Timescale schema initialization
   - Check worker process status

2. **Authentication failures:**
   - Verify ORG_API_KEY matches
   - Check device API key generation
   - Validate HMAC signature computation

3. **Database connection issues:**
   - Verify TIMESCALE_WRITE_URL format
   - Check network connectivity
   - Review connection pool settings

### Debug Endpoints

- `GET /api/telemetry` - View ingestion metrics
- `GET /api/worker` - Check worker status
- `GET /api/devices` - List registered devices

## Support

For issues or questions:
1. Check application logs in Vercel dashboard
2. Review error tracking in Sentry
3. Monitor database performance in Timescale console
4. Check Redis metrics in Upstash dashboard
