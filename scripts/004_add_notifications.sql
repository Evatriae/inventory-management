-- Add notifications functionality
-- This migration creates tables and triggers for user notifications

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('item_available', 'return_overdue', 'item_approved', 'item_rejected')),
  is_read boolean NOT NULL DEFAULT false,
  related_item_id uuid REFERENCES public.items(id) ON DELETE CASCADE,
  related_request_id uuid REFERENCES public.borrow_requests(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- Add RLS policies for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow system to insert notifications
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Create function to create notifications
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text,
  p_related_item_id uuid DEFAULT NULL,
  p_related_request_id uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO public.notifications (
    user_id, title, message, type, related_item_id, related_request_id
  ) VALUES (
    p_user_id, p_title, p_message, p_type, p_related_item_id, p_related_request_id
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify users when reserved items become available
CREATE OR REPLACE FUNCTION notify_reserved_item_available()
RETURNS TRIGGER AS $$
DECLARE
  reserved_request RECORD;
BEGIN
  -- Check if item status changed to available and has pending reserves
  IF NEW.status = 'available' AND (OLD IS NULL OR OLD.status != 'available') THEN
    -- Find the oldest pending reserve request for this item
    SELECT br.*, p.full_name, p.email
    INTO reserved_request
    FROM public.borrow_requests br
    JOIN public.profiles p ON br.user_id = p.id
    WHERE br.item_id = NEW.id 
      AND br.request_type = 'reserve' 
      AND br.status = 'pending'
    ORDER BY br.requested_at ASC
    LIMIT 1;
    
    -- If there's a pending reserve, notify the user
    IF reserved_request.id IS NOT NULL THEN
      PERFORM create_notification(
        reserved_request.user_id,
        'Reserved Item Available',
        'Your reserved item "' || NEW.name || '" is now available for pickup!',
        'item_available',
        NEW.id,
        reserved_request.id
      );
      
      RAISE NOTICE 'Notification sent to user % for available item %', reserved_request.user_id, NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for item availability notifications
DROP TRIGGER IF EXISTS trigger_notify_reserved_item_available ON public.items;
CREATE TRIGGER trigger_notify_reserved_item_available
  AFTER UPDATE ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION notify_reserved_item_available();

-- Function to notify users when their requests are approved/rejected
CREATE OR REPLACE FUNCTION notify_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify when request is approved
  IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status != 'approved') THEN
    PERFORM create_notification(
      NEW.user_id,
      'Request Approved',
      'Your request for "' || (SELECT name FROM public.items WHERE id = NEW.item_id) || '" has been approved!',
      'item_approved',
      NEW.item_id,
      NEW.id
    );
  END IF;
  
  -- Notify when request is rejected
  IF NEW.status = 'rejected' AND (OLD IS NULL OR OLD.status != 'rejected') THEN
    PERFORM create_notification(
      NEW.user_id,
      'Request Rejected',
      'Your request for "' || (SELECT name FROM public.items WHERE id = NEW.item_id) || '" has been rejected.',
      'item_rejected',
      NEW.item_id,
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for request status notifications
DROP TRIGGER IF EXISTS trigger_notify_request_status_change ON public.borrow_requests;
CREATE TRIGGER trigger_notify_request_status_change
  AFTER UPDATE ON public.borrow_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_request_status_change();

-- Function to check for overdue items and send notifications
CREATE OR REPLACE FUNCTION check_overdue_items()
RETURNS void AS $$
DECLARE
  overdue_request RECORD;
BEGIN
  -- Find all approved requests that are overdue and haven't been notified recently
  FOR overdue_request IN
    SELECT br.*, i.name as item_name, p.full_name, p.email
    FROM public.borrow_requests br
    JOIN public.items i ON br.item_id = i.id
    JOIN public.profiles p ON br.user_id = p.id
    WHERE br.status = 'approved'
      AND br.expected_return_at < NOW()
      AND br.returned_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.related_request_id = br.id
          AND n.type = 'return_overdue'
          AND n.created_at > NOW() - INTERVAL '24 hours'
      )
  LOOP
    -- Create overdue notification
    PERFORM create_notification(
      overdue_request.user_id,
      'Item Overdue',
      'Your borrowed item "' || overdue_request.item_name || '" is overdue. Please return it as soon as possible.',
      'return_overdue',
      overdue_request.item_id,
      overdue_request.id
    );
    
    RAISE NOTICE 'Overdue notification sent for request %', overdue_request.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to check for overdue items (this would typically be run by a cron job)
-- For now, we'll create a function that can be called manually or by a scheduled task
COMMENT ON FUNCTION check_overdue_items() IS 'Call this function periodically (e.g., daily) to check for overdue items and send notifications';

-- Add comments for documentation
COMMENT ON TABLE public.notifications IS 'User notifications for various events';
COMMENT ON COLUMN public.notifications.type IS 'Type of notification: item_available, return_overdue, item_approved, item_rejected';
COMMENT ON COLUMN public.notifications.is_read IS 'Whether the user has read this notification';