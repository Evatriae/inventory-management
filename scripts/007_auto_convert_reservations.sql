-- Auto-convert reservation requests to approval requests when items become available
-- This migration enhances the existing notification system to also convert reservations

-- Add a field to track original request type
ALTER TABLE public.borrow_requests 
ADD COLUMN IF NOT EXISTS original_request_type text DEFAULT NULL;

-- Enhanced function to handle both notifications and reservation conversion
CREATE OR REPLACE FUNCTION notify_and_convert_reservations()
RETURNS TRIGGER AS $$
DECLARE
  reserved_request RECORD;
  conversion_count INTEGER := 0;
  final_available_amount INTEGER;
BEGIN
  -- Check if item status changed to available or available_amount increased
  IF (NEW.status = 'available' AND (OLD IS NULL OR OLD.status != 'available')) OR
     (NEW.available_amount > COALESCE(OLD.available_amount, 0)) THEN
    
    final_available_amount := NEW.available_amount;
    
    -- Convert pending reservations to borrow requests if there's available quantity
    FOR reserved_request IN
      SELECT br.*
      FROM public.borrow_requests br
      WHERE br.item_id = NEW.id 
        AND br.request_type = 'reserve' 
        AND br.status = 'pending'
        AND br.requested_amount <= final_available_amount
      ORDER BY br.requested_at ASC
    LOOP
      -- Convert reservation to borrow request
      UPDATE public.borrow_requests
      SET 
        request_type = 'borrow',
        original_request_type = 'reserve'
      WHERE id = reserved_request.id;
      
      -- Create notification for the converted request
      PERFORM create_notification(
        reserved_request.user_id,
        'Reservation Ready for Approval',
        'Great news! Your reservation for "' || NEW.name || '" has been automatically converted to a borrow request and is now ready for staff approval. You can pick it up once approved by staff.',
        'item_available',
        NEW.id,
        reserved_request.id
      );
      
      conversion_count := conversion_count + 1;
      
      RAISE NOTICE 'Converted reservation % to borrow request for item %', reserved_request.id, NEW.id;
      
      -- Update available amount to account for this conversion
      final_available_amount := final_available_amount - reserved_request.requested_amount;
      
      -- Stop if we've used up all available quantity
      IF final_available_amount <= 0 THEN
        EXIT;
      END IF;
    END LOOP;
    
    -- Update the NEW record's available_amount if we converted any reservations
    -- This way we modify the record being inserted/updated rather than doing a separate UPDATE
    IF conversion_count > 0 THEN
      NEW.available_amount := final_available_amount;
      RAISE NOTICE 'Converted % reservations to borrow requests for item %, adjusted available amount to %', 
                   conversion_count, NEW.id, final_available_amount;
    END IF;
    
    -- Notify remaining reservations (if any) that couldn't be converted
    FOR reserved_request IN
      SELECT br.*, p.full_name, p.email
      FROM public.borrow_requests br
      JOIN public.profiles p ON br.user_id = p.id
      WHERE br.item_id = NEW.id 
        AND br.request_type = 'reserve' 
        AND br.status = 'pending'
      ORDER BY br.requested_at ASC
      LIMIT 3 -- Notify next 3 in queue
    LOOP
      PERFORM create_notification(
        reserved_request.user_id,
        'Reserved Item Available Soon',
        'Your reserved item "' || NEW.name || '" is becoming available. You are #' || 
        (SELECT COUNT(*) FROM public.borrow_requests 
         WHERE item_id = NEW.id AND request_type = 'reserve' AND status = 'pending' 
         AND requested_at <= reserved_request.requested_at) || ' in the queue.',
        'item_available',
        NEW.id,
        reserved_request.id
      );
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Replace the old trigger with the enhanced one
DROP TRIGGER IF EXISTS trigger_notify_reserved_item_available ON public.items;
CREATE TRIGGER trigger_notify_and_convert_reservations
  AFTER UPDATE ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION notify_and_convert_reservations();

-- Function to manually process reservations for immediate availability
CREATE OR REPLACE FUNCTION process_pending_reservations(item_id_param uuid)
RETURNS TABLE(converted_count integer, notified_count integer) AS $$
DECLARE
  item_record RECORD;
  reserved_request RECORD;
  converted INTEGER := 0;
  notified INTEGER := 0;
BEGIN
  -- Get the current item details
  SELECT * INTO item_record FROM public.items WHERE id = item_id_param;
  
  IF item_record.id IS NULL THEN
    RAISE EXCEPTION 'Item with id % not found', item_id_param;
  END IF;
  
  -- Convert pending reservations to borrow requests if there's available quantity
  FOR reserved_request IN
    SELECT br.*
    FROM public.borrow_requests br
    WHERE br.item_id = item_id_param
      AND br.request_type = 'reserve' 
      AND br.status = 'pending'
      AND br.requested_amount <= item_record.available_amount
    ORDER BY br.requested_at ASC
  LOOP
    -- Convert reservation to borrow request
    UPDATE public.borrow_requests
    SET 
      request_type = 'borrow',
      original_request_type = 'reserve'
    WHERE id = reserved_request.id;
    
    -- Create notification for the converted request
    PERFORM create_notification(
      reserved_request.user_id,
      'Reservation Ready for Approval',
      'Your reservation for "' || item_record.name || '" is now ready for staff approval! You can pick it up once approved.',
      'item_available',
      item_record.id,
      reserved_request.id
    );
    
    converted := converted + 1;
    
    -- Update available amount
    item_record.available_amount := item_record.available_amount - reserved_request.requested_amount;
    
    -- Stop if we've used up all available quantity
    IF item_record.available_amount <= 0 THEN
      EXIT;
    END IF;
  END LOOP;
  
  -- Update the item's available amount if we converted any reservations
  IF converted > 0 THEN
    UPDATE public.items
    SET available_amount = item_record.available_amount
    WHERE id = item_id_param;
  END IF;
  
  -- Notify remaining reservations about their queue position
  FOR reserved_request IN
    SELECT br.*, p.full_name, p.email
    FROM public.borrow_requests br
    JOIN public.profiles p ON br.user_id = p.id
    WHERE br.item_id = item_id_param
      AND br.request_type = 'reserve' 
      AND br.status = 'pending'
    ORDER BY br.requested_at ASC
    LIMIT 5
  LOOP
    PERFORM create_notification(
      reserved_request.user_id,
      'Queue Position Update',
      'Your reserved item "' || item_record.name || '" queue position: #' || 
      (SELECT COUNT(*) FROM public.borrow_requests 
       WHERE item_id = item_id_param AND request_type = 'reserve' AND status = 'pending' 
       AND requested_at <= reserved_request.requested_at),
      'item_available',
      item_record.id,
      reserved_request.id
    );
    
    notified := notified + 1;
  END LOOP;
  
  RETURN QUERY SELECT converted, notified;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION notify_and_convert_reservations() IS 'Automatically converts pending reservations to borrow requests when items become available and sends appropriate notifications';
COMMENT ON FUNCTION process_pending_reservations(uuid) IS 'Manually process pending reservations for a specific item - useful for staff operations';