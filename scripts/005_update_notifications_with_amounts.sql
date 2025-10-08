-- Update the notification functions to include amount information

-- Function to notify users when reserved items become available (updated version)
CREATE OR REPLACE FUNCTION notify_reserved_item_available()
RETURNS TRIGGER AS $$
DECLARE
  reserved_request RECORD;
BEGIN
  -- Check if item status changed to available and has pending reserves
  IF NEW.status = 'available' AND (OLD IS NULL OR OLD.status != 'available') THEN
    -- Find the oldest pending reserve request for this item that can be fulfilled
    SELECT br.*, p.full_name, p.email
    INTO reserved_request
    FROM public.borrow_requests br
    JOIN public.profiles p ON br.user_id = p.id
    WHERE br.item_id = NEW.id 
      AND br.request_type = 'reserve' 
      AND br.status = 'pending'
      AND br.requested_amount <= NEW.available_amount  -- Only notify if available amount can fulfill the request
    ORDER BY br.requested_at ASC
    LIMIT 1;
    
    -- If there's a pending reserve that can be fulfilled, notify the user
    IF reserved_request.id IS NOT NULL THEN
      PERFORM create_notification(
        reserved_request.user_id,
        'Reserved Item Available',
        'Your reserved item "' || NEW.name || '" (' || reserved_request.requested_amount || ' unit' || 
        CASE WHEN reserved_request.requested_amount > 1 THEN 's' ELSE '' END || ') is now available for pickup!',
        'item_available',
        NEW.id,
        reserved_request.id
      );
      
      RAISE NOTICE 'Notification sent to user % for available item % (amount: %)', 
        reserved_request.user_id, NEW.id, reserved_request.requested_amount;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to notify users when their requests are approved/rejected (updated version)
CREATE OR REPLACE FUNCTION notify_request_status_change()
RETURNS TRIGGER AS $$
DECLARE
  item_name TEXT;
BEGIN
  -- Get item name for the notification
  SELECT name INTO item_name FROM public.items WHERE id = NEW.item_id;
  
  -- Notify when request is approved
  IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status != 'approved') THEN
    PERFORM create_notification(
      NEW.user_id,
      'Request Approved',
      'Your request for "' || item_name || '" (' || NEW.requested_amount || ' unit' || 
      CASE WHEN NEW.requested_amount > 1 THEN 's' ELSE '' END || ') has been approved!',
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
      'Your request for "' || item_name || '" (' || NEW.requested_amount || ' unit' || 
      CASE WHEN NEW.requested_amount > 1 THEN 's' ELSE '' END || ') has been rejected.',
      'item_rejected',
      NEW.item_id,
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;