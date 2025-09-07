import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Navbar() {
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-teal-700">
          ZeroCraftr V0
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-sm font-medium hover:text-teal-700 transition-colors">
            Dashboard
          </Link>
          <Link href="/devices" className="text-sm font-medium hover:text-teal-700 transition-colors">
            Devices
          </Link>
          <Button variant="outline" size="sm" className="border-teal-700 text-teal-700 hover:bg-teal-50 bg-transparent">
            Settings
          </Button>
        </div>
      </div>
    </nav>
  )
}
