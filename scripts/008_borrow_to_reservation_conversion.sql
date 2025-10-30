-- Add functionality to notify users when their borrow request is converted to reservation
-- This extends the existing notification system

-- Function to automatically convert borrow requests to reservations when quantity becomes insufficient
CREATE OR REPLACE FUNCTION auto_convert_insufficient_requests()
RETURNS TRIGGER AS $$
DECLARE
  borrow_request RECORD;
BEGIN
  -- Check if available_amount decreased and there are borrow requests that can't be fulfilled
  IF NEW.available_amount < COALESCE(OLD.available_amount, 0) THEN
    
    -- Find borrow requests that now exceed available quantity
    FOR borrow_request IN
      SELECT br.*
      FROM public.borrow_requests br
      WHERE br.item_id = NEW.id 
        AND br.request_type = 'borrow' 
        AND br.status = 'pending'
        AND br.requested_amount > NEW.available_amount
      ORDER BY br.requested_at ASC
    LOOP
      -- Convert borrow request to reservation
      UPDATE public.borrow_requests
      SET 
        request_type = 'reserve',
        original_request_type = 'borrow'
      WHERE id = borrow_request.id;
      
      -- Create notification for the converted request
      PERFORM create_notification(
        borrow_request.user_id,
        'Request Converted to Reservation',
        'Your borrow request for "' || NEW.name || '" has been automatically converted to a reservation due to insufficient quantity. You will be notified when it becomes available.',
        'item_available',
        NEW.id,
        borrow_request.id
      );
      
      RAISE NOTICE 'Auto-converted borrow request % to reservation for item % due to insufficient quantity', borrow_request.id, NEW.id;
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to notify users when their request is converted to reservation
CREATE OR REPLACE FUNCTION notify_borrow_to_reservation_conversion()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify when borrow request is converted to reservation (insufficient quantity)
  IF NEW.request_type = 'reserve' AND OLD.request_type = 'borrow' AND NEW.original_request_type = 'borrow' THEN
    PERFORM create_notification(
      NEW.user_id,
      'Request Converted to Reservation',
      'Your borrow request for "' || (SELECT name FROM public.items WHERE id = NEW.item_id) || '" has been converted to a reservation due to insufficient quantity. You will be notified when it becomes available.',
      'item_available',
      NEW.item_id,
      NEW.id
    );
    
    RAISE NOTICE 'Notified user % about borrow-to-reservation conversion for request %', NEW.user_id, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic conversion when quantity becomes insufficient
DROP TRIGGER IF EXISTS trigger_auto_convert_insufficient_requests ON public.items;
CREATE TRIGGER trigger_auto_convert_insufficient_requests
  AFTER UPDATE ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION auto_convert_insufficient_requests();

-- Create trigger for borrow-to-reservation conversion notifications
DROP TRIGGER IF EXISTS trigger_notify_borrow_to_reservation ON public.borrow_requests;
CREATE TRIGGER trigger_notify_borrow_to_reservation
  AFTER UPDATE ON public.borrow_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_borrow_to_reservation_conversion();

-- Add comments for documentation
COMMENT ON FUNCTION auto_convert_insufficient_requests() IS 'Automatically converts borrow requests to reservations when item quantity becomes insufficient';
COMMENT ON FUNCTION notify_borrow_to_reservation_conversion() IS 'Notifies users when their borrow request is converted to a reservation due to insufficient quantity';