"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Package, User, LogOut, LayoutDashboard } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { Notifications } from "@/components/notifications"

interface AppHeaderProps {
  user: SupabaseUser
  profile: {
    full_name: string | null
    role: string
  } | null
}

export function AppHeader({ user, profile }: AppHeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/items" className="flex items-center gap-2">
          <Package className="h-6 w-6 text-slate-900" />
          <span className="text-xl font-bold text-slate-900">Lend</span>
        </Link>

        <div className="flex items-center gap-4">
          {profile?.role === "staff" && (
            <Button asChild variant="outline">
              <Link href="/staff">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Staff Dashboard
              </Link>
            </Button>
          )}

          <Notifications userId={user.id} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{profile?.full_name || "User"}</span>
                  <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
                  <span className="text-xs font-normal text-muted-foreground capitalize mt-1">
                    Role: {profile?.role || "user"}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/my-requests">My Requests</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/notifications">Notifications</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
