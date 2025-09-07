"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/Navbar"
import { LeftSidebar } from "@/components/LeftSidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CreateDeviceModal } from "@/components/CreateDeviceModal"
import { DeviceQRModal } from "@/components/DeviceQRModal"
import { RotateKeyModal } from "@/components/RotateKeyModal"
import { Plus, Wifi, WifiOff, AlertCircle, QrCode, RotateCcw, Eye } from "lucide-react"

interface Device {
  device_id: string
  name: string
  location?: string
  created_at: string
  last_seen?: string
  status: "active" | "inactive" | "error"
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [rotateModalOpen, setRotateModalOpen] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)

  // Fetch devices
  const fetchDevices = async () => {
    try {
      const response = await fetch("/api/devices")
      if (response.ok) {
        const data = await response.json()
        setDevices(data.devices)
      } else {
        console.error("Failed to fetch devices")
      }
    } catch (error) {
      console.error("Error fetching devices:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDevices()
  }, [])

  const handleCreateDevice = () => {
    setCreateModalOpen(true)
  }

  const handleDeviceCreated = () => {
    fetchDevices()
    setCreateModalOpen(false)
  }

  const handleShowQR = (device: Device) => {
    setSelectedDevice(device)
    setQrModalOpen(true)
  }

  const handleRotateKey = (device: Device) => {
    setSelectedDevice(device)
    setRotateModalOpen(true)
  }

  const handleKeyRotated = () => {
    fetchDevices()
    setRotateModalOpen(false)
  }

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
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            Active
          </Badge>
        )
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>
      case "error":
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Device Management</h1>
              <p className="text-muted-foreground">Manage and configure your manufacturing devices</p>
            </div>
            <Button onClick={handleCreateDevice} className="bg-teal-700 hover:bg-teal-800">
              <Plus className="h-4 w-4 mr-2" />
              Add Device
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading devices...</p>
            </div>
          ) : devices.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="mb-4">
                  <Wifi className="h-12 w-12 text-muted-foreground mx-auto" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No devices found</h3>
                <p className="text-muted-foreground mb-4">Get started by adding your first manufacturing device</p>
                <Button onClick={handleCreateDevice} className="bg-teal-700 hover:bg-teal-800">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Device
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {devices.map((device) => (
                <Card key={device.device_id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(device.status)}
                        <div>
                          <CardTitle className="text-lg">{device.name}</CardTitle>
                          <CardDescription>
                            ID: {device.device_id}
                            {device.location && ` • ${device.location}`}
                          </CardDescription>
                        </div>
                      </div>
                      {getStatusBadge(device.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        <p>Created: {new Date(device.created_at).toLocaleDateString()}</p>
                        <p>Last seen: {formatLastSeen(device.last_seen)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShowQR(device)}
                          className="border-teal-700 text-teal-700 hover:bg-teal-50"
                        >
                          <QrCode className="h-4 w-4 mr-2" />
                          Get QR
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleRotateKey(device)}>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Rotate Key
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <CreateDeviceModal
            open={createModalOpen}
            onOpenChange={setCreateModalOpen}
            onDeviceCreated={handleDeviceCreated}
          />

          <DeviceQRModal open={qrModalOpen} onOpenChange={setQrModalOpen} device={selectedDevice} />

          <RotateKeyModal
            open={rotateModalOpen}
            onOpenChange={setRotateModalOpen}
            device={selectedDevice}
            onKeyRotated={handleKeyRotated}
          />
        </main>
      </div>
    </div>
  )
}
