import { createClient } from "@/lib/supabase/server"

export async function checkOverdueItems() {
  const supabase = await createClient()

  try {
    // Call the PostgreSQL function to check for overdue items
    const { error } = await supabase.rpc('check_overdue_items')

    if (error) {
      console.error('Error checking overdue items:', error)
      return false
    }

    console.log('Successfully checked for overdue items')
    return true
  } catch (error) {
    console.error('Error in checkOverdueItems:', error)
    return false
  }
}

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: 'item_available' | 'return_overdue' | 'item_approved' | 'item_rejected',
  relatedItemId?: string,
  relatedRequestId?: string
) {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        related_item_id: relatedItemId || null,
        related_request_id: relatedRequestId || null,
      })
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error creating notification:', error)
    throw error
  }
}