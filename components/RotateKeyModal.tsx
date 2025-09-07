"use client"

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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Copy, Check, AlertTriangle, RotateCcw } from "lucide-react"

interface Device {
  device_id: string
  name: string
  location?: string
  status: string
}

interface RotateKeyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  device: Device | null
  onKeyRotated: () => void
}

export function RotateKeyModal({ open, onOpenChange, device, onKeyRotated }: RotateKeyModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [newApiKey, setNewApiKey] = useState("")
  const [copied, setCopied] = useState(false)

  const handleRotateKey = async () => {
    if (!device) return

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/devices/rotate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer ORG_API_KEY_PLACEHOLDER",
        },
        body: JSON.stringify({
          device_id: device.device_id,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setNewApiKey(data.new_device_api_key)
        console.log("[v0] Device key rotated successfully:", device.device_id)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to rotate device key")
      }
    } catch (err) {
      setError("Network error occurred")
      console.error("[v0] Rotate key error:", err)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(newApiKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const handleClose = () => {
    setError("")
    setNewApiKey("")
    setCopied(false)
    onOpenChange(false)
    if (newApiKey) {
      onKeyRotated()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Rotate Device API Key</DialogTitle>
          <DialogDescription>
            Generate a new API key for this device. The old key will be immediately invalidated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {device && (
            <div className="text-sm">
              <p>
                <strong>Device:</strong> {device.name}
              </p>
              <p>
                <strong>ID:</strong> {device.device_id}
              </p>
              {device.location && (
                <p>
                  <strong>Location:</strong> {device.location}
                </p>
              )}
            </div>
          )}

          {!newApiKey ? (
            <>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> Rotating the API key will immediately invalidate the current key. Make sure
                  to update your edge agent with the new key to avoid service interruption.
                </AlertDescription>
              </Alert>

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <>
              <Alert>
                <Check className="h-4 w-4" />
                <AlertDescription>
                  New API key generated successfully. Save this key securely - it will not be shown again.
                </AlertDescription>
              </Alert>

              <div>
                <Label className="text-sm font-medium">New Device API Key</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Textarea value={newApiKey} readOnly className="font-mono text-sm resize-none" rows={3} />
                  <Button type="button" variant="outline" size="sm" onClick={copyToClipboard}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {newApiKey ? "Done" : "Cancel"}
          </Button>
          {!newApiKey && (
            <Button onClick={handleRotateKey} disabled={loading} variant="destructive">
              <RotateCcw className="h-4 w-4 mr-2" />
              {loading ? "Rotating..." : "Rotate Key"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
