"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, CheckCircle2, XCircle, Calendar, Trash2 } from "lucide-react"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Request {
  id: string
  request_type: string
  status: string
  requested_at: string
  requested_amount: number
  approved_at: string | null
  borrowed_at: string | null
  expected_return_at: string | null
  returned_at: string | null
  notes: string | null
  items: {
    id: string
    name: string
    description: string | null
    category: string | null
    image_url: string | null
    amount: number
    available_amount: number
  }
}

interface MyRequestsListProps {
  requests: Request[]
  onRequestUpdate?: () => void
}

export function MyRequestsList({ requests, onRequestUpdate }: MyRequestsListProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const supabase = createClient()
  const { toast } = useToast()
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelled
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        )
      default:
        return null
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const handleCancelRequest = async (requestId: string, itemName: string) => {
    setIsLoading(requestId)
    try {
      const { error } = await supabase
        .from("borrow_requests")
        .update({ status: "cancelled" })
        .eq("id", requestId)

      if (error) throw error

      toast({
        title: "Request Cancelled",
        description: `Your request for "${itemName}" has been cancelled successfully.`,
      })

      // Call the parent component's refresh function
      if (onRequestUpdate) {
        onRequestUpdate()
      }
    } catch (error) {
      console.error("Error cancelling request:", error)
      toast({
        title: "Error",
        description: "Failed to cancel the request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(null)
    }
  }

  const canCancelRequest = (request: Request) => {
    return request.status === "pending"
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">You haven&apos;t made any requests yet</p>
      </div>
    )
  }

  return (
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
                  <div className="flex items-center gap-2">
                    {getStatusBadge(request.status)}
                    {canCancelRequest(request) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={isLoading === request.id}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel Request</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to cancel your request for "{request.items.name}"? 
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep Request</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleCancelRequest(request.id, request.items.name)}
                              className="bg-red-600 hover:bg-red-700"
                              disabled={isLoading === request.id}
                            >
                              {isLoading === request.id ? "Cancelling..." : "Cancel Request"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground capitalize">{request.request_type} Request</p>
                <p className="text-sm font-medium">Amount: {request.requested_amount}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Requested
                </p>
                <p className="font-medium">{formatDate(request.requested_at)}</p>
              </div>
              {request.borrowed_at && (
                <div>
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Borrowed
                  </p>
                  <p className="font-medium">{formatDate(request.borrowed_at)}</p>
                </div>
              )}
              {request.expected_return_at && (
                <div>
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Expected Return
                  </p>
                  <p className="font-medium">{formatDate(request.expected_return_at)}</p>
                </div>
              )}
              {request.returned_at && (
                <div>
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Returned
                  </p>
                  <p className="font-medium">{formatDate(request.returned_at)}</p>
                </div>
              )}
            </div>
            {request.notes && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">Notes:</p>
                <p className="text-sm">{request.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
