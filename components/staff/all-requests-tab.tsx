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
  users: {
    id: string
    full_name: string | null
    email: string
  }
}

interface AllRequestsTabProps {
  requests: Request[]
}

export function AllRequestsTab({ requests }: AllRequestsTabProps) {
  if (!requests || !Array.isArray(requests)) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Unable to load requests</p>
      </div>
    )
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
      {requests.map((request) => {
        const userName = request.users?.full_name || request.users?.email || 'Unknown User'
        
        return (
          <Card key={request.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-4">
                <div className="relative h-20 w-20 rounded-md overflow-hidden bg-slate-100 flex-shrink-0">
                  <Image
                    src={request.items?.image_url || "/placeholder.svg?height=80&width=80"}
                    alt={request.items?.name || "Item"}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{request.items?.name || "Unknown Item"}</h3>
                    <Badge variant="outline">{request.status}</Badge>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {userName}
                    </p>
                    <p className="capitalize">{request.request_type} Request</p>
                    <p>Amount: {request.requested_amount || 0}</p>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        )
      })}
    </div>
  )
}
