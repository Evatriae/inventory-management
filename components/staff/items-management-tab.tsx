"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, CheckCircle2, XCircle, Clock, Users } from "lucide-react"
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

interface Item {
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

interface ItemsManagementTabProps {
  items: Item[]
  onUpdate: () => Promise<void>
}

export function ItemsManagementTab({ items, onUpdate }: ItemsManagementTabProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  const [isCustomCategory, setIsCustomCategory] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    image_url: "",
    amount: 1,
  })
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  // Fetch unique categories from existing items
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('items')
          .select('category')
          .not('category', 'is', null)

        if (error) throw error

        // Extract unique categories
        const uniqueCategories = [...new Set(data.map(item => item.category).filter(Boolean))]
        setCategories(uniqueCategories.sort())
      } catch (error) {
        console.error('Error fetching categories:', error)
      }
    }

    fetchCategories()
  }, [supabase])

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

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploading(true)
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `items/${fileName}`
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('item-images')
        .upload(filePath, file)
      
      if (error) throw error
      
      // Get public URL
      const { data: publicData } = supabase.storage
        .from('item-images')
        .getPublicUrl(filePath)
      
      return publicData.publicUrl
      
    } catch (error) {
      console.error('Error uploading image:', error)
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleAddItem = async () => {
    if (!formData.name || !formData.category || !formData.description || (!formData.image_url && !imageFile)) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields and provide an image",
        variant: "destructive",
      })
      return
    }
    
    setIsLoading(true)
    try {
      let imageUrl = formData.image_url
      
      // If file is selected, upload it
      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile)
        if (!uploadedUrl) {
          toast({
            title: "Upload Failed",
            description: "Failed to upload image",
            variant: "destructive",
          })
          return
        }
        imageUrl = uploadedUrl
      }
      
      const { error } = await supabase.from("items").insert({
        name: formData.name,
        description: formData.description || null,
        category: formData.category || null,
        image_url: imageUrl || null,
        amount: formData.amount,
        available_amount: formData.amount,
        status: "available",
      })

      if (error) throw error

      // If a new category was created, refresh the categories list
      if (isCustomCategory && formData.category && !categories.includes(formData.category)) {
        setCategories(prev => [...prev, formData.category].sort())
      }

      setIsAddDialogOpen(false)
      setFormData({ name: "", description: "", category: "", image_url: "", amount: 1 })
      setImageFile(null)
      setIsCustomCategory(false)
      await onUpdate()
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
      let imageUrl = formData.image_url
      
      // If file is selected, upload it
      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile)
        if (!uploadedUrl) {
          toast({
            title: "Upload Failed",
            description: "Failed to upload image",
            variant: "destructive",
          })
          return
        }
        imageUrl = uploadedUrl
      }
      
      // Calculate the new available_amount based on the amount change
      const amountDifference = formData.amount - selectedItem.amount
      const newAvailableAmount = selectedItem.available_amount + amountDifference

      const { error } = await supabase
        .from("items")
        .update({
          name: formData.name,
          description: formData.description || null,
          category: formData.category || null,
          image_url: imageUrl || null,
          amount: formData.amount,
          available_amount: Math.max(0, newAvailableAmount), // Ensure it doesn't go negative
        })
        .eq("id", selectedItem.id)

      if (error) throw error

      // If a new category was created, refresh the categories list
      if (isCustomCategory && formData.category && !categories.includes(formData.category)) {
        setCategories(prev => [...prev, formData.category].sort())
      }

      setIsEditDialogOpen(false)
      setSelectedItem(null)
      setFormData({ name: "", description: "", category: "", image_url: "", amount: 1 })
      setImageFile(null)
      setIsCustomCategory(false)
      await onUpdate()
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
      amount: item.amount,
    })
    // Check if the item's category is in the existing categories list
    setIsCustomCategory(item.category ? !categories.includes(item.category) : false)
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (item: Item) => {
    setSelectedItem(item)
    setIsDeleteDialogOpen(true)
  }

  const handleProcessReservations = async (itemId: string, itemName: string) => {
    setIsLoading(true)
    try {
      // Call the database function to process pending reservations
      const { data, error } = await supabase
        .rpc('process_pending_reservations', { item_id_param: itemId })

      if (error) throw error

      const result = data?.[0]
      if (result) {
        const { converted_count, notified_count } = result
        toast({
          title: "Reservations Processed",
          description: `Processed reservations for "${itemName}": ${converted_count} reservations converted to approval requests, ${notified_count} users notified about queue position`,
        })
      } else {
        toast({
          title: "No Reservations",
          description: `No pending reservations found for "${itemName}"`,
        })
      }

      await onUpdate()
    } catch (error) {
      console.error("Error processing reservations:", error)
      toast({
        title: "Error",
        description: "Failed to process reservations",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteItem = async () => {
    if (!selectedItem) return

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from("items")
        .delete()
        .eq("id", selectedItem.id)

      if (error) throw error

      setIsDeleteDialogOpen(false)
      setSelectedItem(null)
      await onUpdate()
    } catch (error) {
      console.error("Error deleting item:", error)
    } finally {
      setIsLoading(false)
    }
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
                  <div className="mb-2">
                    <p className="text-sm font-medium">
                      Available: {item.available_amount} / {item.amount}
                    </p>
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{item.description}</p>
                  )}
                  <div className="flex gap-2">
                    <Button onClick={() => openEditDialog(item)} variant="outline" size="sm" className="flex-1">
                      <Pencil className="h-3 w-3 mr-2" />
                      Edit
                    </Button>
                    <Button 
                      onClick={() => handleProcessReservations(item.id, item.name)}
                      variant="outline" 
                      size="sm" 
                      className="flex-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      disabled={isLoading}
                    >
                      <Users className="h-3 w-3 mr-2" />
                      Process Queue
                    </Button>
                    <Button 
                      onClick={() => openDeleteDialog(item)} 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={item.status === 'borrowed'}
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      Delete
                    </Button>
                  </div>
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
              <div className="space-y-3">
                {/* Category Selection */}
                <div>
                  <Select
                    value={isCustomCategory ? "custom" : formData.category}
                    onValueChange={(value) => {
                      if (value === "custom") {
                        setIsCustomCategory(true)
                        setFormData({ ...formData, category: "" })
                      } else {
                        setIsCustomCategory(false)
                        setFormData({ ...formData, category: value })
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category or create new" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">+ Create New Category</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Custom Category Input */}
                {isCustomCategory && (
                  <div>
                    <Label htmlFor="custom-category" className="text-sm text-gray-600">New Category Name</Label>
                    <Input
                      id="custom-category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="Enter new category name"
                      className="mt-1"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Total Amount *</Label>
              <Input
                id="amount"
                type="number"
                min={1}
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) || 1 })}
                required
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
              <Label>Image</Label>
              <div className="space-y-3">
                {/* File Upload Section */}
                <div>
                  <Label htmlFor="image-file" className="text-sm text-gray-600">Upload Image File</Label>
                  <Input
                    id="image-file"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setImageFile(file)
                        setFormData({ ...formData, image_url: "" }) // Clear URL when file is selected
                      }
                    }}
                    className="mt-1"
                    disabled={uploading}
                  />
                  {uploading && <p className="text-sm text-blue-600 mt-1">Uploading image...</p>}
                </div>
                
                {/* OR Separator */}
                <div className="flex items-center space-x-2">
                  <div className="flex-1 border-t"></div>
                  <span className="text-sm text-gray-500">OR</span>
                  <div className="flex-1 border-t"></div>
                </div>
                
                {/* URL Input Section */}
                <div>
                  <Label htmlFor="image_url" className="text-sm text-gray-600">Image URL</Label>
                  <Input
                    id="image_url"
                    value={formData.image_url}
                    onChange={(e) => {
                      setFormData({ ...formData, image_url: e.target.value })
                      if (e.target.value) {
                        setImageFile(null) // Clear file when URL is entered
                      }
                    }}
                    placeholder="https://example.com/image.jpg"
                    className="mt-1"
                    disabled={uploading}
                  />
                </div>
                
                {/* Image Preview */}
                {(imageFile || formData.image_url) && (
                  <div className="mt-3">
                    <Label className="text-sm text-gray-600">Preview</Label>
                    <div className="mt-1 border rounded-lg p-2 bg-gray-50">
                      {imageFile ? (
                        <img
                          src={URL.createObjectURL(imageFile)}
                          alt="Preview"
                          className="w-20 h-20 object-cover rounded"
                        />
                      ) : formData.image_url ? (
                        <img
                          src={formData.image_url}
                          alt="Preview"
                          className="w-20 h-20 object-cover rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg?height=80&width=80"
                          }}
                        />
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
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
              <div className="space-y-3">
                {/* Category Selection */}
                <div>
                  <Select
                    value={isCustomCategory ? "custom" : formData.category}
                    onValueChange={(value) => {
                      if (value === "custom") {
                        setIsCustomCategory(true)
                        setFormData({ ...formData, category: "" })
                      } else {
                        setIsCustomCategory(false)
                        setFormData({ ...formData, category: value })
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category or create new" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">+ Create New Category</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Custom Category Input */}
                {isCustomCategory && (
                  <div>
                    <Label htmlFor="edit-custom-category" className="text-sm text-gray-600">New Category Name</Label>
                    <Input
                      id="edit-custom-category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="Enter new category name"
                      className="mt-1"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Total Amount *</Label>
              <Input
                id="edit-amount"
                type="number"
                min={1}
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) || 1 })}
                required
              />
              {selectedItem && (
                <p className="text-sm text-muted-foreground">
                  Current available: {selectedItem.available_amount} / {selectedItem.amount}
                </p>
              )}
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
              <Label>Image</Label>
              <div className="space-y-3">
                {/* File Upload Section */}
                <div>
                  <Label htmlFor="edit-image-file" className="text-sm text-gray-600">Upload Image File</Label>
                  <Input
                    id="edit-image-file"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setImageFile(file)
                        setFormData({ ...formData, image_url: "" }) // Clear URL when file is selected
                      }
                    }}
                    className="mt-1"
                    disabled={uploading}
                  />
                  {uploading && <p className="text-sm text-blue-600 mt-1">Uploading image...</p>}
                </div>
                
                {/* OR Separator */}
                <div className="flex items-center space-x-2">
                  <div className="flex-1 border-t"></div>
                  <span className="text-sm text-gray-500">OR</span>
                  <div className="flex-1 border-t"></div>
                </div>
                
                {/* URL Input Section */}
                <div>
                  <Label htmlFor="edit-image_url" className="text-sm text-gray-600">Image URL</Label>
                  <Input
                    id="edit-image_url"
                    value={formData.image_url}
                    onChange={(e) => {
                      setFormData({ ...formData, image_url: e.target.value })
                      if (e.target.value) {
                        setImageFile(null) // Clear file when URL is entered
                      }
                    }}
                    placeholder="https://example.com/image.jpg"
                    className="mt-1"
                    disabled={uploading}
                  />
                </div>
                
                {/* Image Preview */}
                {(imageFile || formData.image_url) && (
                  <div className="mt-3">
                    <Label className="text-sm text-gray-600">Preview</Label>
                    <div className="mt-1 border rounded-lg p-2 bg-gray-50">
                      {imageFile ? (
                        <img
                          src={URL.createObjectURL(imageFile)}
                          alt="Preview"
                          className="w-20 h-20 object-cover rounded"
                        />
                      ) : formData.image_url ? (
                        <img
                          src={formData.image_url}
                          alt="Preview"
                          className="w-20 h-20 object-cover rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg?height=80&width=80"
                          }}
                        />
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
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

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedItem?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteItem} 
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? "Deleting..." : "Delete Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
