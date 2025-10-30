"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import { MyRequestsList } from "@/components/my-requests-list"

export default function MyRequestsPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  const loadRequests = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return
    
    try {
      const { data: requests } = await supabase
        .from("borrow_requests")
        .select(`
          *,
          items (
            id,
            name,
            description,
            category,
            image_url,
            amount,
            available_amount
          )
        `)
        .eq("user_id", currentUser.id)
        .order("requested_at", { ascending: false })

      setRequests(requests || [])
    } catch (error) {
      console.error("Error loading requests:", error)
    }
  }

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

        // Load requests
        await loadRequests()
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p>Loading...</p>
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">My Requests</h1>
          <p className="text-slate-600">View and track your borrow requests</p>
        </div>
        <MyRequestsList requests={requests} onRequestUpdate={loadRequests} />
      </main>
    </div>
  )
}
