"use client"

import { useState } from "react"
import { Bell, Check, X, Clock, Package, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Image from "next/image"

interface Notification {
  id: string
  title: string
  message: string
  type: 'item_available' | 'return_overdue' | 'item_approved' | 'item_rejected' | 'cancellation_request'
  is_read: boolean
  related_item_id: string | null
  related_request_id: string | null
  created_at: string
  items?: {
    name: string
    image_url: string | null
  } | null
  borrow_requests?: {
    request_type: string
    status: string
  } | null
}

interface NotificationsListProps {
  notifications: Notification[]
}

export function NotificationsList({ notifications: initialNotifications }: NotificationsListProps) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId)

      if (error) throw error

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    setIsLoading(true)
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
      
      if (unreadIds.length === 0) return

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", unreadIds)

      if (error) throw error

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (error) {
      console.error("Error marking all as read:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId)

      if (error) throw error

      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    } catch (error) {
      console.error("Error deleting notification:", error)
    }
  }

  const deleteAllRead = async () => {
    setIsLoading(true)
    try {
      const readIds = notifications.filter(n => n.is_read).map(n => n.id)
      
      if (readIds.length === 0) return

      const { error } = await supabase
        .from("notifications")
        .delete()
        .in("id", readIds)

      if (error) throw error

      setNotifications(prev => prev.filter(n => !n.is_read))
    } catch (error) {
      console.error("Error deleting read notifications:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'item_available':
        return <Package className="h-5 w-5 text-green-600" />
      case 'return_overdue':
        return <Clock className="h-5 w-5 text-red-600" />
      case 'item_approved':
        return <Check className="h-5 w-5 text-blue-600" />
      case 'item_rejected':
        return <X className="h-5 w-5 text-red-600" />
      default:
        return <Bell className="h-5 w-5 text-gray-600" />
    }
  }

  const getTypeColor = (type: Notification['type']) => {
    switch (type) {
      case 'item_available':
        return 'bg-green-50 border-green-200'
      case 'return_overdue':
        return 'bg-red-50 border-red-200'
      case 'item_approved':
        return 'bg-blue-50 border-blue-200'
      case 'item_rejected':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const unreadCount = notifications.filter(n => !n.is_read).length
  const readCount = notifications.filter(n => n.is_read).length

  if (notifications.length === 0) {
    return (
      <div className="text-center py-12">
        <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No notifications yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Action buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            {unreadCount} unread, {readCount} read
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              onClick={markAllAsRead}
              disabled={isLoading}
            >
              Mark all as read
            </Button>
          )}
          {readCount > 0 && (
            <Button 
              variant="outline" 
              onClick={deleteAllRead}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete read
            </Button>
          )}
        </div>
      </div>

      {/* Notifications list */}
      <div className="space-y-4">
        {notifications.map((notification) => (
          <Card 
            key={notification.id} 
            className={`${
              !notification.is_read ? 'ring-2 ring-blue-100' : ''
            } ${getTypeColor(notification.type)}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-lg">{notification.title}</h3>
                      {!notification.is_read && (
                        <Badge variant="secondary" className="mt-1">
                          New
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNotification(notification.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-4">
                {notification.items?.image_url && (
                  <div className="relative h-16 w-16 rounded-md overflow-hidden bg-slate-100 flex-shrink-0">
                    <Image
                      src={notification.items.image_url}
                      alt={notification.items.name || "Item"}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm">{notification.message}</p>
                  {notification.items && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Item: {notification.items.name}
                    </p>
                  )}
                  {notification.borrow_requests && (
                    <p className="text-sm text-muted-foreground">
                      Request Type: {notification.borrow_requests.request_type}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDate(notification.created_at)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default NotificationsList