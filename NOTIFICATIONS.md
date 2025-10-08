# Notifications System

This document describes the notifications functionality implemented in the lending system.

## Features

The notifications system provides the following functionality:

1. **Item Available Notifications**: Users are notified when their reserved items become available
2. **Overdue Return Notifications**: Users are notified when their borrowed items are overdue
3. **Request Status Notifications**: Users are notified when their requests are approved or rejected
4. **Real-time Updates**: Notifications appear in real-time using Supabase real-time subscriptions

## Database Schema

### Notifications Table

```sql
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('item_available', 'return_overdue', 'item_approved', 'item_rejected')),
  is_read boolean NOT NULL DEFAULT false,
  related_item_id uuid REFERENCES items(id) ON DELETE CASCADE,
  related_request_id uuid REFERENCES borrow_requests(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

### Triggers

The system uses PostgreSQL triggers to automatically create notifications:

1. **notify_reserved_item_available()**: Creates notifications when reserved items become available
2. **notify_request_status_change()**: Creates notifications when requests are approved/rejected
3. **check_overdue_items()**: Can be called periodically to create overdue notifications

## Components

### 1. Notifications Component (`components/notifications.tsx`)

A dropdown component that shows notifications in the app header with:
- Real-time notification count badge
- Dropdown list of recent notifications
- Mark as read/unread functionality
- Delete notifications

### 2. NotificationsList Component (`components/notifications-list.tsx`)

A full-page component for viewing all notifications with:
- Bulk mark as read
- Delete read notifications
- Enhanced notification display with item images

### 3. Notifications Page (`app/notifications/page.tsx`)

A dedicated page for viewing all notifications.

## API Endpoints

### Check Overdue Items (`/api/check-overdue`)

- **POST**: Triggers a check for overdue items and creates notifications
- **GET**: Returns endpoint information

This endpoint can be called periodically (e.g., by a cron job) to check for overdue items.

## Setup Instructions

1. **Run the Migration**
   ```bash
   # Execute the SQL migration in your Supabase dashboard or via CLI
   # File: scripts/004_add_notifications.sql
   ```

2. **Configure Real-time** (if not already enabled)
   ```sql
   -- Enable real-time for notifications table
   ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
   ```

3. **Set up Periodic Overdue Checks** (optional)
   
   You can set up a cron job or scheduled task to periodically check for overdue items:
   
   ```bash
   # Example: Daily check at 9 AM
   curl -X POST "https://your-app.com/api/check-overdue" \
     -H "Authorization: Bearer YOUR_INTERNAL_API_TOKEN"
   ```

   Set the `INTERNAL_API_TOKEN` environment variable for security.

## Usage

### For Users

1. **View Notifications**: Click the bell icon in the app header to see recent notifications
2. **Full Notifications Page**: Access `/notifications` or click "Notifications" in the user dropdown
3. **Mark as Read**: Click notifications to mark them as read
4. **Delete Notifications**: Use the delete button on individual notifications

### For Staff

When staff approve/reject requests or mark items as returned, notifications are automatically created for the relevant users.

## Notification Types

1. **`item_available`**: Sent when a reserved item becomes available
2. **`return_overdue`**: Sent when a borrowed item is overdue (max once per 24 hours)
3. **`item_approved`**: Sent when a borrow request is approved
4. **`item_rejected`**: Sent when a borrow request is rejected

## Customization

### Adding New Notification Types

1. Add the new type to the database CHECK constraint
2. Update the TypeScript interfaces
3. Add handling in the notification components
4. Create appropriate triggers or application logic

### Styling

Notifications use different colors based on type:
- Green: Item available
- Blue: Item approved
- Red: Item rejected, overdue
- Gray: Default

## Security

- Row Level Security (RLS) ensures users only see their own notifications
- The overdue check API endpoint can be secured with an internal token
- All notification creation goes through database functions with proper security

## Performance Considerations

- Notifications are limited to 20 most recent in the dropdown
- Real-time subscriptions are properly cleaned up when components unmount
- Database indexes are created for optimal query performance
- Automatic cleanup of old notifications can be implemented if needed

## Troubleshooting

### Notifications Not Appearing

1. Check if real-time is enabled for the notifications table
2. Verify database triggers are created and active
3. Check browser console for subscription errors
4. Ensure user is properly authenticated

### Overdue Checks Not Working

1. Verify the `check_overdue_items()` function exists in the database
2. Check API endpoint authentication
3. Ensure the function is being called periodically
4. Check server logs for errors

### Performance Issues

1. Consider implementing notification cleanup for old notifications
2. Monitor real-time subscription count
3. Optimize database queries if needed
4. Consider pagination for large notification lists