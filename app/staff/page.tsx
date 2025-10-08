import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PendingRequestsTab } from "@/components/staff/pending-requests-tab"
import { AllRequestsTab } from "@/components/staff/all-requests-tab"
import { ItemsManagementTab } from "@/components/staff/items-management-tab"
import { BorrowedItemsTab } from "@/components/staff/borrowed-items-tab"

export default async function StaffDashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  // Check if user is staff
  if (profile?.role !== "staff") {
    redirect("/items")
  }

  // Get pending requests
  const { data: pendingRequests } = await supabase
    .from("borrow_requests")
    .select(
      `
      *,
      items (
        id,
        name,
        description,
        category,
        image_url,
        status
      ),
      profiles!borrow_requests_user_id_fkey (
        id,
        full_name,
        email
      )
    `,
    )
    .eq("status", "pending")
    .order("requested_at", { ascending: true })

  const { data: borrowedItems } = await supabase
    .from("borrow_requests")
    .select(
      `
      *,
      items (
        id,
        name,
        description,
        category,
        image_url
      ),
      profiles!borrow_requests_user_id_fkey (
        id,
        full_name,
        email
      )
    `,
    )
    .eq("status", "approved")
    .is("returned_at", null)
    .order("expected_return_at", { ascending: true })

  // Get all requests
  const { data: allRequests } = await supabase
    .from("borrow_requests")
    .select(
      `
      *,
      items (
        id,
        name,
        description,
        category,
        image_url,
        status
      ),
      profiles!borrow_requests_user_id_fkey (
        id,
        full_name,
        email
      )
    `,
    )
    .order("requested_at", { ascending: false })

  // Get all items
  const { data: items } = await supabase.from("items").select("*").order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader user={user} profile={profile} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Staff Dashboard</h1>
          <p className="text-slate-600">Manage inventory and borrow requests</p>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <div className="w-full overflow-x-auto">
            <TabsList className="inline-flex w-max min-w-full">
              <TabsTrigger value="pending" className="whitespace-nowrap">
                Pending Requests
                {pendingRequests && pendingRequests.length > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                    {pendingRequests.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="borrowed" className="whitespace-nowrap">
                Borrowed Items
                {borrowedItems && borrowedItems.length > 0 && (
                  <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
                    {borrowedItems.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="all" className="whitespace-nowrap">All Requests</TabsTrigger>
              <TabsTrigger value="items" className="whitespace-nowrap">Items Management</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="pending">
            <PendingRequestsTab requests={pendingRequests || []} staffId={user.id} />
          </TabsContent>

          <TabsContent value="borrowed">
            <BorrowedItemsTab borrowedItems={borrowedItems || []} />
          </TabsContent>

          <TabsContent value="all">
            <AllRequestsTab requests={allRequests || []} />
          </TabsContent>

          <TabsContent value="items">
            <ItemsManagementTab items={items || []} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
