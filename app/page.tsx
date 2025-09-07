import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-teal-800 mb-4">ZeroCraftr V0</h1>
          <p className="text-xl text-teal-600 mb-8">Manufacturing Telemetry & Analytics Platform</p>
          <div className="flex gap-4 justify-center">
            <Button asChild className="bg-teal-700 hover:bg-teal-800">
              <Link href="/dashboard">View Dashboard</Link>
            </Button>
            <Button asChild variant="outline" className="border-teal-700 text-teal-700 hover:bg-teal-50 bg-transparent">
              <Link href="/devices">Manage Devices</Link>
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-teal-800">Real-time Monitoring</CardTitle>
              <CardDescription>Track energy consumption, emissions, and waste in real-time</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Secure HMAC-authenticated telemetry ingestion with live dashboard updates every 5 seconds.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-teal-800">Device Management</CardTitle>
              <CardDescription>Easy device onboarding with QR code pairing</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Generate secure API keys, manage device lifecycle, and pair devices with simple QR codes.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-teal-800">Analytics & Reports</CardTitle>
              <CardDescription>Comprehensive insights into manufacturing operations</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                KPI tracking, trend analysis, and automated reporting for sustainability metrics.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
