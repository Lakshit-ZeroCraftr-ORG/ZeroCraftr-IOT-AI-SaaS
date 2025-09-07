// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Mock environment variables for tests
process.env.ORG_API_KEY = "test-org-key"
process.env.EDGE_PAIRING_SECRET = "test-pairing-secret"
process.env.NEXT_PUBLIC_POLL_INTERVAL_MS = "1000"
