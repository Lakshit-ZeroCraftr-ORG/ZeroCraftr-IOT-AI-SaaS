"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Copy, Check, AlertCircle } from "lucide-react"

interface CreateDeviceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeviceCreated: () => void
}

interface CreatedDevice {
  device_id: string
  name: string
  location?: string
  device_api_key: string
  pairing_token: string
  pairing_token_expires: string
}

export function CreateDeviceModal({ open, onOpenChange, onDeviceCreated }: CreateDeviceModalProps) {
  const [name, setName] = useState("")
  const [location, setLocation] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [createdDevice, setCreatedDevice] = useState<CreatedDevice | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer ORG_API_KEY_PLACEHOLDER",
        },
        body: JSON.stringify({
          name: name.trim(),
          location: location.trim() || undefined,
        }),
      })

      if (response.ok) {
        const device = await response.json()
        setCreatedDevice(device)
        console.log("[v0] Device created successfully:", device.device_id)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to create device")
      }
    } catch (err) {
      setError("Network error occurred")
      console.error("[v0] Create device error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setName("")
    setLocation("")
    setError("")
    setCreatedDevice(null)
    setCopiedField(null)
    onOpenChange(false)
    if (createdDevice) {
      onDeviceCreated()
    }
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{createdDevice ? "Device Created Successfully" : "Create New Device"}</DialogTitle>
          <DialogDescription>
            {createdDevice
              ? "Save these credentials securely. The API key and pairing token will not be shown again."
              : "Add a new manufacturing device to your telemetry system."}
          </DialogDescription>
        </DialogHeader>

        {!createdDevice ? (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Device Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Production Line A - Power Monitor"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Factory Floor A"
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !name.trim()} className="bg-teal-700 hover:bg-teal-800">
                {loading ? "Creating..." : "Create Device"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Store these credentials securely. They will not be displayed again.</AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Device ID</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input value={createdDevice.device_id} readOnly className="font-mono text-sm" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(createdDevice.device_id, "device_id")}
                  >
                    {copiedField === "device_id" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Device API Key</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Textarea
                    value={createdDevice.device_api_key}
                    readOnly
                    className="font-mono text-sm resize-none"
                    rows={2}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(createdDevice.device_api_key, "api_key")}
                  >
                    {copiedField === "api_key" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Pairing Token (expires in 10 minutes)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Textarea
                    value={createdDevice.pairing_token}
                    readOnly
                    className="font-mono text-sm resize-none"
                    rows={2}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(createdDevice.pairing_token, "pairing_token")}
                  >
                    {copiedField === "pairing_token" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="bg-teal-700 hover:bg-teal-800">
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
