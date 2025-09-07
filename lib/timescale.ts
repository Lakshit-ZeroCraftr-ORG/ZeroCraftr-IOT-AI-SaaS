import { Pool } from "pg"

let pool: Pool | null = null

export function getTimescalePool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.TIMESCALE_WRITE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
  }
  return pool
}

export interface TelemetryRecord {
  device_id: string
  timestamp: Date
  power_w: number
  energy_kwh: number
  co2_kg?: number
  waste_kg?: number
}

export async function initTimescaleSchema() {
  const pool = getTimescalePool()

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS telemetry (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(255) NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        power_w DECIMAL(10,2) NOT NULL,
        energy_kwh DECIMAL(10,4) NOT NULL,
        co2_kg DECIMAL(10,4),
        waste_kg DECIMAL(10,4),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `)

    // Create hypertable if not exists
    await pool.query(`
      SELECT create_hypertable('telemetry', 'timestamp', if_not_exists => TRUE);
    `)

    console.log("[v0] Timescale schema initialized")
  } catch (error) {
    console.error("[v0] Failed to initialize Timescale schema:", error)
  }
}

export async function insertTelemetryBatch(records: TelemetryRecord[]) {
  const pool = getTimescalePool()

  if (records.length === 0) return

  const values = records
    .map((record, index) => {
      const baseIndex = index * 6
      return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6})`
    })
    .join(", ")

  const params = records.flatMap((record) => [
    record.device_id,
    record.timestamp,
    record.power_w,
    record.energy_kwh,
    record.co2_kg || null,
    record.waste_kg || null,
  ])

  const query = `
    INSERT INTO telemetry (device_id, timestamp, power_w, energy_kwh, co2_kg, waste_kg)
    VALUES ${values}
  `

  try {
    await pool.query(query, params)
    console.log(`[v0] Inserted ${records.length} telemetry records`)
  } catch (error) {
    console.error("[v0] Failed to insert telemetry batch:", error)
    throw error
  }
}

export async function getTelemetryAggregates(deviceId?: string) {
  const pool = getTimescalePool()

  const whereClause = deviceId ? "WHERE device_id = $1" : ""
  const params = deviceId ? [deviceId] : []

  try {
    const result = await pool.query(
      `
      SELECT 
        device_id,
        MAX(power_w) as current_power_w,
        SUM(CASE WHEN timestamp >= CURRENT_DATE THEN energy_kwh ELSE 0 END) as today_energy_kwh,
        SUM(CASE WHEN timestamp >= CURRENT_DATE THEN COALESCE(co2_kg, energy_kwh * 0.7) ELSE 0 END) as today_co2_kg,
        SUM(CASE WHEN timestamp >= CURRENT_DATE THEN COALESCE(waste_kg, 0) ELSE 0 END) as today_waste_kg,
        MAX(timestamp) as last_seen
      FROM telemetry 
      ${whereClause}
      GROUP BY device_id
      ORDER BY last_seen DESC
    `,
      params,
    )

    return result.rows
  } catch (error) {
    console.error("[v0] Failed to get telemetry aggregates:", error)
    return []
  }
}

export async function getTelemetryTimeSeries(hours = 24, deviceId?: string) {
  const pool = getTimescalePool()

  const whereClause = deviceId ? "AND device_id = $2" : ""
  const params = deviceId ? [hours, deviceId] : [hours]

  try {
    const result = await pool.query(
      `
      SELECT 
        time_bucket('5 minutes', timestamp) as time_bucket,
        device_id,
        AVG(power_w) as avg_power_w,
        SUM(energy_kwh) as total_energy_kwh,
        SUM(COALESCE(co2_kg, energy_kwh * 0.7)) as total_co2_kg,
        SUM(COALESCE(waste_kg, 0)) as total_waste_kg
      FROM telemetry 
      WHERE timestamp >= NOW() - INTERVAL '${hours} hours' ${whereClause}
      GROUP BY time_bucket, device_id
      ORDER BY time_bucket DESC
    `,
      params,
    )

    return result.rows
  } catch (error) {
    console.error("[v0] Failed to get telemetry time series:", error)
    return []
  }
}
