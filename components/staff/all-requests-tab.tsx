"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, User, CheckCircle2, XCircle, Clock } from "lucide-react"
import Image from "next/image"

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
    status: string
    amount: number
    available_amount: number
  }
  profiles: {
    id: string
    full_name: string | null
    email: string
  }
}

interface AllRequestsTabProps {
  requests: Request[]
}

export function AllRequestsTab({ requests }: AllRequestsTabProps) {
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

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No requests found</p>
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
                  {getStatusBadge(request.status)}
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {request.profiles.full_name || request.profiles.email}
                  </p>
                  <p className="capitalize">{request.request_type} Request</p>
                  <p className="font-medium text-foreground">
                    Amount: {request.requested_amount}
                  </p>
                </div>
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
