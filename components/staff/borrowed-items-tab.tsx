"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Calendar, User, AlertCircle } from "lucide-react"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface BorrowedItem {
  id: string
  request_type: string
  status: string
  borrowed_at: string
  expected_return_at: string
  requested_amount: number
  user_id: string
  item_id: string
  items: {
    id: string
    name: string
    description: string | null
    category: string | null
    image_url: string | null
    amount: number
    available_amount: number
    current_borrower_id: string | null
    status: string
  }
  profiles: {
    id: string
    full_name: string | null
    email: string
  }
}

interface BorrowedItemsTabProps {
  borrowedItems: BorrowedItem[]
}

export function BorrowedItemsTab({ borrowedItems }: BorrowedItemsTabProps) {
  const [selectedItem, setSelectedItem] = useState<BorrowedItem | null>(null)
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const isOverdue = (expectedReturnDate: string) => {
    return new Date(expectedReturnDate) < new Date()
  }

  const handleReturn = async () => {
    if (!selectedItem) return

    setIsLoading(true)
    try {
      const now = new Date().toISOString()

      // Update the request status
      const { error: requestError } = await supabase
        .from("borrow_requests")
        .update({
          status: "completed",
          returned_at: now,
        })
        .eq("id", selectedItem.id)

      if (requestError) {
        console.error("Error updating request:", requestError)
        toast({
          title: "Error",
          description: `Error updating request: ${requestError.message}`,
          variant: "destructive",
        })
        return
      }

      // Update the item's available amount and status
      const newAvailableAmount = selectedItem.items.available_amount + selectedItem.requested_amount
      const newStatus = newAvailableAmount > 0 ? "available" : "borrowed"

      const updateData: any = {
        available_amount: newAvailableAmount,
        status: newStatus,
      }

      // Clear current_borrower_id if item becomes available
      if (newStatus === "available") {
        updateData.current_borrower_id = null
      }

      const { error: itemError } = await supabase
        .from("items")
        .update(updateData)
        .eq("id", selectedItem.item_id)

      if (itemError) {
        console.error("Error updating item:", itemError)
        toast({
          title: "Error",
          description: `Error updating item: ${itemError.message}`,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Success",
        description: `Successfully processed return for "${selectedItem.items.name}"`,
      })
      setIsReturnDialogOpen(false)
      setSelectedItem(null)
      router.refresh()
    } catch (error) {
      console.error("Error processing return:", error)
      toast({
        title: "Error",
        description: `Unexpected error processing return: ${error}`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (borrowedItems.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No items currently borrowed</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {borrowedItems.map((item) => {
          const overdue = isOverdue(item.expected_return_at)
          return (
            <Card key={item.id} className={overdue ? "border-red-200" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start gap-4">
                  <div className="relative h-20 w-20 rounded-md overflow-hidden bg-slate-100 flex-shrink-0">
                    <Image
                      src={item.items.image_url || "/placeholder.svg?height=80&width=80"}
                      alt={item.items.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{item.items.name}</h3>
                      {overdue && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Overdue
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {item.profiles.full_name || item.profiles.email}
                      </p>
                      <p className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Borrowed {formatDate(item.borrowed_at)}
                      </p>
                      <p className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Expected return {formatDate(item.expected_return_at)}
                      </p>
                      <p className="font-medium text-foreground">
                        Amount borrowed: {item.requested_amount}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => {
                    setSelectedItem(item)
                    setIsReturnDialogOpen(true)
                  }}
                  className="w-full"
                  disabled={isLoading}
                >
                  Mark as Returned
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Item Return</DialogTitle>
            <DialogDescription>
              Mark this item as returned. {selectedItem && (
                <>
                  Returning {selectedItem.requested_amount} unit(s) of "{selectedItem.items.name}" from {selectedItem.profiles.full_name || selectedItem.profiles.email}.
                  The item will become available for other users to borrow.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReturnDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleReturn} disabled={isLoading}>
              {isLoading ? "Processing..." : "Confirm Return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
