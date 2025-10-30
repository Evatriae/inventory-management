"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Calendar, User, Package, CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState("17:00") // Default to 5 PM
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
    if (!selectedRequest || !selectedDate) return

    setIsLoading(true)
    try {
      const now = new Date().toISOString()

      // Combine selected date and time
      const [hours, minutes] = selectedTime.split(':')
      const returnDateTime = new Date(selectedDate)
      returnDateTime.setHours(parseInt(hours), parseInt(minutes))

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
          expected_return_at: returnDateTime.toISOString(),
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
      setSelectedDate(undefined)
      setSelectedTime("17:00")
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
                {request.request_type === "reserve" ? (
                  <Button
                    onClick={() => handleReject(request.id)} // For reserves, we can only approve by rejecting or letting the system auto-handle
                    variant="outline"
                    className="flex-1"
                    disabled={isLoading}
                  >
                    Remove from Queue
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      setSelectedRequest(request)
                      setSelectedDate(undefined)
                      setSelectedTime("17:00")
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
                )}
                <Button
                  onClick={() => handleReject(request.id)}
                  variant="outline"
                  className="flex-1"
                  disabled={isLoading}
                >
                  {request.request_type === "reserve" ? "Remove" : "Reject"}
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
              <Label>Expected Return Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="return-time">Expected Return Time</Label>
              <Input
                id="return-time"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                required
              />
            </div>
            {selectedDate && (
              <div className="p-3 bg-slate-50 rounded-md">
                <p className="text-sm font-medium">Selected Return Date & Time:</p>
                <p className="text-sm text-muted-foreground">
                  {format(selectedDate, "PPPP")} at {selectedTime}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={isLoading || !selectedDate}>
              {isLoading ? "Processing..." : "Approve & Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
