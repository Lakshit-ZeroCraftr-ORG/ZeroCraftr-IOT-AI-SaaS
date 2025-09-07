"use client"

import { useState, useEffect } from "react"
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
import { Download, AlertCircle, RefreshCw } from "lucide-react"

interface Device {
  device_id: string
  name: string
  location?: string
  status: string
}

interface DeviceQRModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  device: Device | null
}

export function DeviceQRModal({ open, onOpenChange, device }: DeviceQRModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Generate QR code when modal opens
  useEffect(() => {
    if (open && device) {
      generateQRCode()
    }
  }, [open, device])

  const generateQRCode = async () => {
    if (!device) return

    setLoading(true)
    setError("")

    try {
      // First, create a new device to get a fresh pairing token
      // In a real implementation, you might have a separate endpoint to regenerate pairing tokens
      const response = await fetch("/api/devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer ORG_API_KEY_PLACEHOLDER",
        },
        body: JSON.stringify({
          name: `${device.name} (QR Regenerated)`,
          location: device.location,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate pairing token")
      }

      const deviceData = await response.json()

      // Create pairing data
      const pairingData = {
        device_id: deviceData.device_id,
        pairing_token: deviceData.pairing_token,
        expires: deviceData.pairing_token_expires,
      }

      // Generate QR code using a simple data URL approach
      // In production, you'd use a proper QR code library
      const qrText = JSON.stringify(pairingData)
      const qrDataUrl = await generateQRDataUrl(qrText)
      setQrDataUrl(qrDataUrl)
    } catch (err) {
      setError("Failed to generate QR code")
      console.error("[v0] QR generation error:", err)
    } finally {
      setLoading(false)
    }
  }

  // Simple QR code generation using a public API (for demo purposes)
  const generateQRDataUrl = async (text: string): Promise<string> => {
    const encodedText = encodeURIComponent(text)
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedText}`

    try {
      const response = await fetch(qrApiUrl)
      if (response.ok) {
        const blob = await response.blob()
        return URL.createObjectURL(blob)
      }
    } catch (error) {
      console.error("QR API error:", error)
    }

    // Fallback: create a simple placeholder
    return (
      "data:image/svg+xml;base64," +
      btoa(`
      <svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="300" height="300" fill="#f0f0f0" stroke="#ccc"/>
        <text x="150" y="140" textAnchor="middle" fontFamily="Arial" fontSize="14" fill="#666">
          QR Code
        </text>
        <text x="150" y="160" textAnchor="middle" fontFamily="Arial" fontSize="12" fill="#666">
          ${device?.device_id || "Device"}
        </text>
      </svg>
    `)
    )
  }

  const downloadQR = () => {
    if (!qrDataUrl || !device) return

    const link = document.createElement("a")
    link.href = qrDataUrl
    link.download = `zerocraftr-qr-${device.device_id}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Device Pairing QR Code</DialogTitle>
          <DialogDescription>Scan this QR code with your edge agent to pair the device</DialogDescription>
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

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Pairing tokens expire in 10 minutes for security. Generate a new QR code if needed.
            </AlertDescription>
          </Alert>

          <div className="flex justify-center">
            {loading ? (
              <div className="w-[300px] h-[300px] bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">Generating QR code...</p>
                </div>
              </div>
            ) : error ? (
              <div className="w-[300px] h-[300px] bg-red-50 border-2 border-dashed border-red-300 flex items-center justify-center">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-400" />
                  <p className="text-sm text-red-600">{error}</p>
                  <Button variant="outline" size="sm" onClick={generateQRCode} className="mt-2 bg-transparent">
                    Retry
                  </Button>
                </div>
              </div>
            ) : qrDataUrl ? (
              <img
                src={qrDataUrl || "/placeholder.svg"}
                alt="Device pairing QR code"
                className="w-[300px] h-[300px] border rounded-lg"
              />
            ) : null}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {qrDataUrl && !loading && (
            <Button onClick={downloadQR} className="bg-teal-700 hover:bg-teal-800">
              <Download className="h-4 w-4 mr-2" />
              Download QR
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
