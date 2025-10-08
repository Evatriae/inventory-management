import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import { MyRequestsList } from "@/components/my-requests-list"

export default async function MyRequestsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  // Get user's requests with item details
  const { data: requests } = await supabase
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
        amount,
        available_amount
      )
    `,
    )
    .eq("user_id", user.id)
    .order("requested_at", { ascending: false })

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader user={user} profile={profile} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">My Requests</h1>
          <p className="text-slate-600">View and track your borrow requests</p>
        </div>
        <MyRequestsList requests={requests || []} />
      </main>
    </div>
  )
}
