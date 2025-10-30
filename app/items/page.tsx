"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { ItemGrid } from "@/components/item-grid"
import { AppHeader } from "@/components/app-header"
import { PageLoading } from "@/components/ui/loading"

export default function ItemsPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      try {
        // Get user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          router.push("/auth/login")
          return
        }

        setUser(user)

        // Get user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        setProfile(profile)

        // Get all items
        const { data: items } = await supabase
          .from("items")
          .select("*")
          .order("created_at", { ascending: false })

        setItems(items || [])
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageLoading text="Loading available items..." />
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader user={user} profile={profile} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Available Items</h1>
          <p className="text-slate-600">Browse and request items from our inventory</p>
        </div>
        <ItemGrid items={items} userId={user.id} />
      </main>
    </div>
  )
}
