"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Clock, CheckCircle2, XCircle } from "lucide-react"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface Item {
  id: string
  name: string
  description: string | null
  category: string | null
  image_url: string | null
  status: string
  current_borrower_id: string | null
}

interface ItemCardProps {
  item: Item
  userId: string
}

export function ItemCard({ item, userId }: ItemCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const getStatusBadge = () => {
    switch (item.status) {
      case "available":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Available
          </Badge>
        )
      case "borrowed":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Borrowed
          </Badge>
        )
      case "reserved":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Reserved
          </Badge>
        )
      default:
        return null
    }
  }

  const handleRequest = async (requestType: "borrow" | "reserve") => {
    setIsLoading(true)
    try {
      const { error } = await supabase.from("borrow_requests").insert({
        item_id: item.id,
        user_id: userId,
        request_type: requestType,
        notes: notes || null,
      })

      if (error) throw error

      setIsDialogOpen(false)
      setNotes("")
      router.refresh()
    } catch (error) {
      console.error("Error creating request:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <CardHeader className="p-0">
          <div className="relative aspect-square bg-slate-100">
            <Image
              src={item.image_url || "/placeholder.svg?height=300&width=300"}
              alt={item.name}
              fill
              className="object-cover"
            />
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-lg leading-tight">{item.name}</h3>
            {getStatusBadge()}
          </div>
          {item.category && <p className="text-xs text-muted-foreground mb-2">{item.category}</p>}
          {item.description && <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>}
        </CardContent>
        <CardFooter className="p-4 pt-0">
          {item.status === "available" ? (
            <Button onClick={() => setIsDialogOpen(true)} className="w-full">
              Request to Borrow
            </Button>
          ) : item.status === "borrowed" ? (
            <Button onClick={() => setIsDialogOpen(true)} variant="outline" className="w-full">
              Reserve Item
            </Button>
          ) : (
            <Button disabled className="w-full">
              Already Reserved
            </Button>
          )}
        </CardFooter>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{item.status === "available" ? "Request to Borrow" : "Reserve Item"}</DialogTitle>
            <DialogDescription>
              {item.status === "available"
                ? "Submit a request to borrow this item. Staff will review and approve your request."
                : "This item is currently borrowed. You can reserve it to be notified when it becomes available."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional information..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={() => handleRequest(item.status === "available" ? "borrow" : "reserve")}
              disabled={isLoading}
            >
              {isLoading ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
