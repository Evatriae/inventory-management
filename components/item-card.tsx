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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Item {
  id: string
  name: string
  description: string | null
  category: string | null
  image_url: string | null
  status: string
  current_borrower_id: string | null
  amount: number
  available_amount: number
}

interface ItemCardProps {
  item: Item
  userId: string
}

export function ItemCard({ item, userId }: ItemCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [notes, setNotes] = useState("")
  const [requestedAmount, setRequestedAmount] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const getStatusBadge = () => {
    switch (item.status) {
      case "available":
        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Available
            </Badge>
            <span className="text-xs text-muted-foreground">
              {item.available_amount}/{item.amount}
            </span>
          </div>
        )
      case "borrowed":
        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              <XCircle className="h-3 w-3 mr-1" />
              Borrowed
            </Badge>
            <span className="text-xs text-muted-foreground">
              {item.available_amount}/{item.amount}
            </span>
          </div>
        )
      case "reserved":
        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              <Clock className="h-3 w-3 mr-1" />
              Reserved
            </Badge>
            <span className="text-xs text-muted-foreground">
              {item.available_amount}/{item.amount}
            </span>
          </div>
        )
      default:
        return null
    }
  }

  const handleRequest = async (requestType: "borrow" | "reserve") => {
    setIsLoading(true)
    try {
      // Validate requested amount for both borrow and reserve requests
      if (requestType === "borrow" && (requestedAmount < 1 || requestedAmount > item.available_amount)) {
        throw new Error(`Invalid amount. Please enter a value between 1 and ${item.available_amount}`)
      }
      
      if (requestType === "reserve" && (requestedAmount < 1 || requestedAmount > item.amount)) {
        throw new Error(`Invalid amount. Please enter a value between 1 and ${item.amount}`)
      }

      const { error } = await supabase.from("borrow_requests").insert({
        item_id: item.id,
        user_id: userId,
        request_type: requestType,
        requested_amount: requestedAmount,
        notes: notes || null,
      })

      if (error) throw error

      setIsDialogOpen(false)
      setNotes("")
      setRequestedAmount(1)
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
                ? "Submit a request to borrow this item. Specify the amount you need and staff will review your request."
                : "This item is currently borrowed. You can reserve a specific amount to be notified when it becomes available."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">
                {item.status === "available" ? "Amount to Request" : "Amount to Reserve"}
              </Label>
              <Input
                id="amount"
                type="number"
                min={1}
                max={item.status === "available" ? item.available_amount : item.amount}
                value={requestedAmount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRequestedAmount(parseInt(e.target.value) || 1)}
              />
              <p className="text-sm text-muted-foreground">
                {item.status === "available" 
                  ? `Available: ${item.available_amount} / ${item.amount}`
                  : `Total amount: ${item.amount} (currently borrowed: ${item.amount - item.available_amount})`
                }
              </p>
            </div>
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
              disabled={
                isLoading || 
                requestedAmount < 1 ||
                (item.status === "available" && requestedAmount > item.available_amount) ||
                (item.status === "borrowed" && requestedAmount > item.amount)
              }
            >
              {isLoading ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
