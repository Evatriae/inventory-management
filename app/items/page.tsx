import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ItemGrid } from "@/components/item-grid"
import { AppHeader } from "@/components/app-header"

export default async function ItemsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login")
  }

  // Get user profile to check role
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  // Get all items
  const { data: items } = await supabase.from("items").select("*").order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader user={user} profile={profile} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Available Items</h1>
          <p className="text-slate-600">Browse and request items from our inventory</p>
        </div>
        <ItemGrid items={items || []} userId={user.id} />
      </main>
    </div>
  )
}
