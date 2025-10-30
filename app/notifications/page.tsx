import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import NotificationsList from "@/components/notifications-list"
import { AppHeader } from "@/components/app-header"

export default async function NotificationsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login")
  }

  // Get user profile to check role
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  // Fetch notifications
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select(`
      *,
      items:related_item_id(name, image_url),
      borrow_requests:related_request_id(request_type, status)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching notifications:", error)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader user={user} profile={profile} />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Notifications</h1>
            <p className="text-slate-600">Stay updated with your requests and item availability</p>
          </div>
          <NotificationsList notifications={notifications || []} />
        </div>
      </main>
    </div>
  )
}