"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Wifi, WifiOff, AlertCircle, Loader2 } from "lucide-react"

interface Device {
  device_id: string
  name: string
  location?: string
  last_seen?: string
  status: "active" | "inactive" | "error"
}

interface DeviceStatusPanelProps {
  devices: Device[]
  loading?: boolean
  error?: any
  onDeviceSelect?: (deviceId: string) => void
  selectedDevice?: string
}

export function DeviceStatusPanel({
  devices = [],
  loading = false,
  error,
  onDeviceSelect,
  selectedDevice = "all",
}: DeviceStatusPanelProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Wifi className="h-4 w-4 text-green-600" />
      case "inactive":
        return <WifiOff className="h-4 w-4 text-gray-400" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <WifiOff className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 text-xs">
            Active
          </Badge>
        )
      case "inactive":
        return (
          <Badge variant="secondary" className="text-xs">
            Inactive
          </Badge>
        )
      case "error":
        return (
          <Badge variant="destructive" className="text-xs">
            Error
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="text-xs">
            Unknown
          </Badge>
        )
    }
  }

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return "Never"

    const date = new Date(lastSeen)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))

    if (diffMinutes < 1) return "Just now"
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`
    return `${Math.floor(diffMinutes / 1440)}d ago`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Device Status</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading devices...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertCircle className="h-6 w-6 mx-auto mb-2 text-red-500" />
              <p className="text-sm text-red-600">Failed to load devices</p>
            </div>
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-8">
            <WifiOff className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No devices found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* All devices filter */}
            <Button
              variant={selectedDevice === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => onDeviceSelect?.("all")}
              className={`w-full justify-start ${
                selectedDevice === "all" ? "bg-teal-700 hover:bg-teal-800" : "hover:bg-teal-50"
              }`}
            >
              <Wifi className="h-4 w-4 mr-2" />
              All Devices ({devices.length})
            </Button>

            {/* Individual devices */}
            {devices.map((device) => (
              <div
                key={device.device_id}
                className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                  selectedDevice === device.device_id
                    ? "border-teal-200 bg-teal-50"
                    : "border-border hover:border-teal-200 hover:bg-teal-50/50"
                }`}
                onClick={() => onDeviceSelect?.(device.device_id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(device.status)}
                    <span className="text-sm font-medium truncate">{device.name}</span>
                  </div>
                  {getStatusBadge(device.status)}
                </div>
                <div className="text-xs text-muted-foreground">
                  <p>ID: {device.device_id}</p>
                  {device.location && <p>Location: {device.location}</p>}
                  <p>Last seen: {formatLastSeen(device.last_seen)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
