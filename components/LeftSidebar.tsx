import Link from "next/link"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Cpu, BarChart3, Settings, Zap, Leaf, Trash2 } from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Devices", href: "/devices", icon: Cpu },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Energy", href: "/energy", icon: Zap },
  { name: "Emissions", href: "/emissions", icon: Leaf },
  { name: "Waste", href: "/waste", icon: Trash2 },
  { name: "Chatbot", href: "/chatbot", icon: Cpu },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function LeftSidebar() {
  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-sidebar-foreground mb-4">Navigation</h2>
        <nav className="space-y-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
