"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PendingRequestsTab } from "@/components/staff/pending-requests-tab"
import { AllRequestsTab } from "@/components/staff/all-requests-tab"
import { ItemsManagementTab } from "@/components/staff/items-management-tab"
import { BorrowedItemsTab } from "@/components/staff/borrowed-items-tab"
import { PageLoading } from "@/components/ui/loading"

export default function StaffDashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [allRequests, setAllRequests] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const loadRequests = async () => {
    try {
      // Get all borrow requests with user and item details
      const { data: allRequests, error: requestsError } = await supabase
        .from("borrow_requests")
        .select(`
          *,
          users:profiles!borrow_requests_user_id_fkey (
            id,
            full_name,
            email
          ),
          items (
            id,
            name,
            description,
            category,
            image_url,
            amount,
            available_amount,
            current_borrower_id,
            status
          )
        `)
        .order("requested_at", { ascending: false })

      if (requestsError) {
        console.error("Requests error:", requestsError)
        setError("Failed to load requests")
      } else {
        setAllRequests(allRequests || [])
      }
    } catch (error) {
      console.error("Error loading requests:", error)
      setError("Failed to load requests")
    }
  }

  const loadItems = async () => {
    try {
      // Get all items for management
      const { data: items, error: itemsError } = await supabase
        .from("items")
        .select("*")
        .order("created_at", { ascending: false })

      if (itemsError) {
        console.error("Items error:", itemsError)
        setError("Failed to load items")
      } else {
        setItems(items || [])
      }
    } catch (error) {
      console.error("Error loading items:", error)
      setError("Failed to load items")
    }
  }

  const refreshData = async () => {
    await Promise.all([loadRequests(), loadItems()])
  }

  useEffect(() => {
    async function loadData() {
      try {
        setError(null)
        
        // Get user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          console.error("Auth error:", userError)
          router.push("/auth/login")
          return
        }

        setUser(user)

        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        if (profileError) {
          console.error("Profile error:", profileError)
          setError("Failed to load user profile")
          return
        }

        setProfile(profile)

        // Check if user is staff
        if (profile?.role !== "staff") {
          console.log("User is not staff, redirecting to items")
          router.push("/items")
          return
        }

        // Load initial data
        await refreshData()
      } catch (error) {
        console.error("Error loading data:", error)
        setError("An unexpected error occurred")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageLoading text="Loading staff dashboard..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button onClick={() => window.location.reload()} className="text-blue-600 underline">
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!user || profile?.role !== "staff") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p>Redirecting...</p>
      </div>
    )
  }

  // Filter for different categories with null checks
  const pendingRequests = (allRequests || []).filter((req) => req?.status === "pending")
  const borrowedItems = (allRequests || []).filter((req) => req?.status === "approved")

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader user={user} profile={profile} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Staff Dashboard</h1>
          <p className="text-slate-600">Manage items and borrow requests</p>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <span>Pending</span>
              {pendingRequests.length > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                  {pendingRequests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="borrowed" className="flex items-center gap-2">
              <span>Borrowed</span>
              {borrowedItems.length > 0 && (
                <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
                  {borrowedItems.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">All Requests</TabsTrigger>
            <TabsTrigger value="items">Items</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <PendingRequestsTab requests={pendingRequests} staffId={user?.id || ""} onUpdate={refreshData} />
          </TabsContent>

          <TabsContent value="borrowed">
                    <BorrowedItemsTab borrowedItems={borrowedItems} onUpdate={refreshData} />
          </TabsContent>

          <TabsContent value="all">
            <AllRequestsTab requests={allRequests || []} />
          </TabsContent>

          <TabsContent value="items">
            <ItemsManagementTab items={items || []} onUpdate={refreshData} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
