import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { NotificationsList } from "@/components/notifications-list"

export default async function NotificationsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login")
  }

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
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Notifications</h1>
        <NotificationsList notifications={notifications || []} />
      </div>
    </div>
  )
}