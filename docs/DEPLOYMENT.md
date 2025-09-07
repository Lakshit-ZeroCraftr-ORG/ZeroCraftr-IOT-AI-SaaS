# Deployment Guide

## Vercel Deployment (Recommended)

### Prerequisites
- Vercel account
- GitHub repository
- Required integrations (see Integration Setup below)

### Steps

1. **Connect Repository:**
   - Import your GitHub repository to Vercel
   - Select the `zerocraftr-v0` project

2. **Configure Environment Variables:**
   Add these variables in Vercel Dashboard → Project Settings → Environment Variables:

   \`\`\`env
   # Required
   ORG_API_KEY=your-secure-org-api-key-here
   EDGE_PAIRING_SECRET=your-secure-pairing-secret-here
   NEXT_PUBLIC_POLL_INTERVAL_MS=5000
   
   # Production Integrations
   UPSTASH_REDIS_REST_URL=your-redis-url
   UPSTASH_REDIS_REST_TOKEN=your-redis-token
   TIMESCALE_WRITE_URL=your-timescale-connection-string
   SENTRY_DSN=your-sentry-dsn
   \`\`\`

3. **Deploy:**
   - Push to main branch or click "Deploy" in Vercel dashboard
   - Vercel will automatically build and deploy

### Integration Setup

#### Upstash Redis (Required for Production)
1. Create account at [upstash.com](https://upstash.com)
2. Create new Redis database
3. Copy REST URL and Token to environment variables

#### TimescaleDB (Optional - Time Series Storage)
1. Create account at [timescale.com](https://www.timescale.com)
2. Create new service
3. Copy connection string to `TIMESCALE_WRITE_URL`

#### Sentry (Optional - Error Monitoring)
1. Create account at [sentry.io](https://sentry.io)
2. Create new Next.js project
3. Copy DSN to `SENTRY_DSN`

## Docker Deployment

### Build Image
\`\`\`bash
# Build production image
docker build -t zerocraftr-v0 .

# Run container
docker run -p 3000:3000 \
  -e ORG_API_KEY=your-api-key \
  -e EDGE_PAIRING_SECRET=your-secret \
  zerocraftr-v0
\`\`\`

### Docker Compose
\`\`\`yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - ORG_API_KEY=your-api-key
      - EDGE_PAIRING_SECRET=your-secret
      - UPSTASH_REDIS_REST_URL=redis://redis:6379
    depends_on:
      - redis
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
\`\`\`

## Self-Hosted Deployment

### Prerequisites
- Node.js 18+
- PM2 (process manager)
- Nginx (reverse proxy)
- Redis (optional)

### Steps

1. **Clone and Build:**
   \`\`\`bash
   git clone <repository-url>
   cd zerocraftr-v0
   npm install
   npm run build
   \`\`\`

2. **Configure Environment:**
   \`\`\`bash
   cp .env.example .env.production
   # Edit .env.production with your values
   \`\`\`

3. **Start with PM2:**
   \`\`\`bash
   npm install -g pm2
   pm2 start npm --name "zerocraftr" -- start
   pm2 save
   pm2 startup
   \`\`\`

4. **Configure Nginx:**
   \`\`\`nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   \`\`\`

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `ORG_API_KEY` | Yes | Organization API key for authentication | `org-key-abc123` |
| `EDGE_PAIRING_SECRET` | Yes | Secret for device pairing tokens | `pairing-secret-xyz789` |
| `NEXT_PUBLIC_POLL_INTERVAL_MS` | No | Dashboard polling interval | `5000` |
| `UPSTASH_REDIS_REST_URL` | No | Redis URL for production queue | `https://...` |
| `UPSTASH_REDIS_REST_TOKEN` | No | Redis authentication token | `token123` |
| `TIMESCALE_WRITE_URL` | No | TimescaleDB connection string | `postgresql://...` |
| `SENTRY_DSN` | No | Sentry error tracking DSN | `https://...` |

## Health Checks

The application exposes health check endpoints:

- `GET /api/health` - Basic health check
- `GET /api/telemetry` - Queue status and metrics

## Monitoring

### Logs
- Application logs: Available in Vercel Functions tab
- Error tracking: Sentry integration (if configured)

### Metrics
- Queue depth: `/api/telemetry` endpoint
- Device status: `/api/devices` endpoint
- Ingestion rate: Application logs

## Scaling Considerations

### Horizontal Scaling
- Stateless design allows multiple instances
- Redis queue handles concurrent ingestion
- Database connections should be pooled

### Performance Optimization
- Enable Redis for production workloads
- Configure appropriate polling intervals
- Use CDN for static assets
- Implement database connection pooling

## Security Checklist

- [ ] Secure API keys generated and stored safely
- [ ] HTTPS enabled in production
- [ ] Environment variables not exposed in client
- [ ] HMAC signatures validated on all telemetry
- [ ] Rate limiting configured
- [ ] Error messages don't leak sensitive information
