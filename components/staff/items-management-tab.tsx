"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Plus, Pencil, CheckCircle2, XCircle, Clock } from "lucide-react"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Item {
  id: string
  name: string
  description: string | null
  category: string | null
  image_url: string | null
  status: string
  current_borrower_id: string | null
}

interface ItemsManagementTabProps {
  items: Item[]
}

export function ItemsManagementTab({ items }: ItemsManagementTabProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    image_url: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const getStatusBadge = (status: string) => {
    switch (status) {
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

  const handleAddItem = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase.from("items").insert({
        name: formData.name,
        description: formData.description || null,
        category: formData.category || null,
        image_url: formData.image_url || null,
        status: "available",
      })

      if (error) throw error

      setIsAddDialogOpen(false)
      setFormData({ name: "", description: "", category: "", image_url: "" })
      router.refresh()
    } catch (error) {
      console.error("Error adding item:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditItem = async () => {
    if (!selectedItem) return

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from("items")
        .update({
          name: formData.name,
          description: formData.description || null,
          category: formData.category || null,
          image_url: formData.image_url || null,
        })
        .eq("id", selectedItem.id)

      if (error) throw error

      setIsEditDialogOpen(false)
      setSelectedItem(null)
      setFormData({ name: "", description: "", category: "", image_url: "" })
      router.refresh()
    } catch (error) {
      console.error("Error updating item:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const openEditDialog = (item: Item) => {
    setSelectedItem(item)
    setFormData({
      name: item.name,
      description: item.description || "",
      category: item.category || "",
      image_url: item.image_url || "",
    })
    setIsEditDialogOpen(true)
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add New Item
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No items found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <Card key={item.id}>
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
                    {getStatusBadge(item.status)}
                  </div>
                  {item.category && <p className="text-xs text-muted-foreground mb-2">{item.category}</p>}
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{item.description}</p>
                  )}
                  <Button onClick={() => openEditDialog(item)} variant="outline" size="sm" className="w-full">
                    <Pencil className="h-3 w-3 mr-2" />
                    Edit Item
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Item</DialogTitle>
            <DialogDescription>Add a new item to the inventory</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image_url">Image URL</Label>
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="/placeholder.svg?height=300&width=300"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleAddItem} disabled={isLoading || !formData.name}>
              {isLoading ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>Update item information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Item Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Input
                id="edit-category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-image_url">Image URL</Label>
              <Input
                id="edit-image_url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="/placeholder.svg?height=300&width=300"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleEditItem} disabled={isLoading || !formData.name}>
              {isLoading ? "Updating..." : "Update Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
