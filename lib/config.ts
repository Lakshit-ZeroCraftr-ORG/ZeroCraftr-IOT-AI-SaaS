export const config = {
  // Polling interval for dashboard updates (milliseconds)
  POLL_INTERVAL_MS: Number.parseInt(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS || "5000"),

  // API endpoints
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || "",

  // Organization API key for development
  ORG_API_KEY: process.env.ORG_API_KEY || "ORG_API_KEY_PLACEHOLDER",

  // Pairing token secret
  EDGE_PAIRING_SECRET: process.env.EDGE_PAIRING_SECRET || "dev-pairing-secret-key",

  // Redis configuration (optional)
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,

  // Database configuration (optional)
  TIMESCALE_WRITE_URL: process.env.TIMESCALE_WRITE_URL,

  // Observability
  SENTRY_DSN: process.env.SENTRY_DSN,
}
