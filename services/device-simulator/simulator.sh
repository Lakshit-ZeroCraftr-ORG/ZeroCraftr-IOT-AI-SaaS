#!/bin/bash

# ZeroCraftr Device Simulator
# Simulates multiple devices sending telemetry data

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Default configuration
TELEMETRY_URL="${TELEMETRY_URL:-http://localhost:3000/api/telemetry}"
NUM_DEVICES="${NUM_DEVICES:-2}"
DURATION="${DURATION:-300}" # 5 minutes default

echo "🚀 ZeroCraftr Device Simulator"
echo "================================"
echo "Telemetry URL: $TELEMETRY_URL"
echo "Number of devices: $NUM_DEVICES"
echo "Duration: ${DURATION}s"
echo ""

# Check if the web server is running
echo "🔍 Checking if server is running..."
if ! curl -s "$TELEMETRY_URL" > /dev/null 2>&1; then
    echo "❌ Server not responding at $TELEMETRY_URL"
    echo "Please start the Next.js development server first:"
    echo "  cd $PROJECT_ROOT && pnpm dev"
    exit 1
fi

echo "✅ Server is running"
echo ""

# Function to simulate a single device
simulate_device() {
    local device_num=$1
    local device_id="sim-device-$(printf "%03d" $device_num)"
    local device_api_key="${device_id}-secret-key-12345"
    
    echo "📱 Starting device simulator: $device_id"
    
    # Create temporary directory for this device
    local temp_dir="/tmp/zerocraftr-sim-$device_id"
    mkdir -p "$temp_dir"
    
    # Create device-specific .env file
    cat > "$temp_dir/.env" << EOF
DEVICE_ID=$device_id
DEVICE_API_KEY=$device_api_key
TELEMETRY_URL=$TELEMETRY_URL
EOF
    
    # Start the edge agent for this device
    cd "$SCRIPT_DIR/../edge-agent"
    DEVICE_ID="$device_id" \
    DEVICE_API_KEY="$device_api_key" \
    TELEMETRY_URL="$TELEMETRY_URL" \
    npm run dev > "$temp_dir/output.log" 2>&1 &
    
    local pid=$!
    echo "$pid" > "$temp_dir/pid"
    
    echo "  Device $device_id started (PID: $pid)"
}

# Function to stop all simulators
cleanup() {
    echo ""
    echo "🛑 Stopping all device simulators..."
    
    for i in $(seq 1 $NUM_DEVICES); do
        local device_id="sim-device-$(printf "%03d" $i)"
        local temp_dir="/tmp/zerocraftr-sim-$device_id"
        
        if [ -f "$temp_dir/pid" ]; then
            local pid=$(cat "$temp_dir/pid")
            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid" 2>/dev/null || true
                echo "  Stopped device $device_id (PID: $pid)"
            fi
        fi
        
        # Clean up temp directory
        rm -rf "$temp_dir" 2>/dev/null || true
    done
    
    echo "✅ All simulators stopped"
}

# Set up signal handlers
trap cleanup EXIT INT TERM

# Check if edge agent dependencies are installed
echo "📦 Checking edge agent dependencies..."
cd "$SCRIPT_DIR/../edge-agent"
if [ ! -d "node_modules" ]; then
    echo "Installing edge agent dependencies..."
    npm install
fi

if [ ! -d "dist" ]; then
    echo "Building edge agent..."
    npm run build
fi

echo "✅ Edge agent ready"
echo ""

# Start device simulators
echo "🚀 Starting $NUM_DEVICES device simulators..."
for i in $(seq 1 $NUM_DEVICES); do
    simulate_device $i
    sleep 1 # Stagger startup
done

echo ""
echo "✅ All simulators started!"
echo ""
echo "📊 Monitor the dashboard at: http://localhost:3000/dashboard"
echo "📈 View telemetry metrics at: http://localhost:3000/api/telemetry"
echo ""
echo "Running for ${DURATION} seconds... (Press Ctrl+C to stop early)"

# Wait for specified duration
sleep $DURATION

echo ""
echo "⏰ Simulation duration completed"
