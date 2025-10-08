"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Calendar, User, Package } from "lucide-react"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface Request {
  id: string
  request_type: string
  status: string
  requested_at: string
  requested_amount: number
  notes: string | null
  items: {
    id: string
    name: string
    description: string | null
    category: string | null
    image_url: string | null
    status: string
    amount: number
    available_amount: number
    current_borrower_id: string | null
  }
  profiles: {
    id: string
    full_name: string | null
    email: string
  }
}

interface PendingRequestsTabProps {
  requests: Request[]
  staffId: string
}

export function PendingRequestsTab({ requests, staffId }: PendingRequestsTabProps) {
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
  const [expectedReturnDate, setExpectedReturnDate] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleApprove = async () => {
    if (!selectedRequest || !expectedReturnDate) return

    setIsLoading(true)
    try {
      const now = new Date().toISOString()

      // Check if there's enough available amount
      if (selectedRequest.requested_amount > selectedRequest.items.available_amount) {
        alert("Not enough available quantity to fulfill this request")
        return
      }

      const { error: requestError } = await supabase
        .from("borrow_requests")
        .update({
          status: "approved",
          approved_at: now,
          approved_by: staffId,
          borrowed_at: now,
          expected_return_at: new Date(expectedReturnDate).toISOString(),
        })
        .eq("id", selectedRequest.id)

      if (requestError) throw requestError

      // Update item's available amount
      const newAvailableAmount = selectedRequest.items.available_amount - selectedRequest.requested_amount
      const newStatus = newAvailableAmount > 0 ? "available" : "borrowed"

      const updateData: any = {
        available_amount: newAvailableAmount,
        status: newStatus,
      }

      // Only set current_borrower_id if the item becomes fully borrowed
      if (newAvailableAmount === 0) {
        updateData.current_borrower_id = selectedRequest.profiles.id
      }

      const { error: itemError } = await supabase
        .from("items")
        .update(updateData)
        .eq("id", selectedRequest.items.id)

      if (itemError) throw itemError

      setIsApproveDialogOpen(false)
      setSelectedRequest(null)
      setExpectedReturnDate("")
      router.refresh()
    } catch (error) {
      console.error("Error approving request:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReject = async (requestId: string) => {
    setIsLoading(true)
    try {
      const { error } = await supabase.from("borrow_requests").update({ status: "rejected" }).eq("id", requestId)

      if (error) throw error

      router.refresh()
    } catch (error) {
      console.error("Error rejecting request:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No pending requests</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {requests.map((request) => (
          <Card key={request.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-4">
                <div className="relative h-20 w-20 rounded-md overflow-hidden bg-slate-100 flex-shrink-0">
                  <Image
                    src={request.items.image_url || "/placeholder.svg?height=80&width=80"}
                    alt={request.items.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{request.items.name}</h3>
                    <Badge variant="outline" className="capitalize">
                      {request.request_type}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {request.profiles.full_name || request.profiles.email}
                    </p>
                    <p className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Requested {formatDate(request.requested_at)}
                    </p>
                    {request.items.category && (
                      <p className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {request.items.category}
                      </p>
                    )}
                    <p className="font-medium text-foreground">
                      Requested amount: {request.requested_amount}
                    </p>
                    <p className="text-xs">
                      Available: {request.items.available_amount} / {request.items.amount}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {request.notes && (
                <div className="p-3 bg-slate-50 rounded-md">
                  <p className="text-sm font-medium mb-1">Notes:</p>
                  <p className="text-sm text-muted-foreground">{request.notes}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setSelectedRequest(request)
                    setIsApproveDialogOpen(true)
                  }}
                  className="flex-1"
                  disabled={isLoading || request.requested_amount > request.items.available_amount}
                >
                  {request.requested_amount > request.items.available_amount 
                    ? "Insufficient Quantity" 
                    : "Approve & Record Pickup"
                  }
                </Button>
                <Button
                  onClick={() => handleReject(request.id)}
                  variant="outline"
                  className="flex-1"
                  disabled={isLoading}
                >
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Request & Record Pickup</DialogTitle>
            <DialogDescription>
              The user is picking up the item now. Set the expected return date.
              {selectedRequest && (
                <>
                  <br />
                  <span className="font-medium">
                    Approving {selectedRequest.requested_amount} unit(s) of "{selectedRequest.items.name}" 
                    for {selectedRequest.profiles.full_name || selectedRequest.profiles.email}
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="return-date">Expected Return Date</Label>
              <Input
                id="return-date"
                type="datetime-local"
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={isLoading || !expectedReturnDate}>
              {isLoading ? "Processing..." : "Approve & Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
