-- Add amount functionality to items and borrow_requests tables
-- This migration enables quantity tracking for inventory management

-- Add amount column to items table (total quantity available)
ALTER TABLE public.items 
ADD COLUMN amount integer NOT NULL DEFAULT 1 CHECK (amount >= 0);

-- Add available_amount column to items table (currently available for borrowing)
ALTER TABLE public.items 
ADD COLUMN available_amount integer NOT NULL DEFAULT 1 CHECK (available_amount >= 0);

-- Add requested_amount column to borrow_requests table (amount user wants to borrow)
ALTER TABLE public.borrow_requests 
ADD COLUMN requested_amount integer NOT NULL DEFAULT 1 CHECK (requested_amount > 0);

-- Update existing items to have proper amounts
UPDATE public.items 
SET amount = 1, available_amount = 1 
WHERE amount IS NULL OR available_amount IS NULL;

-- Update existing borrow requests to have requested_amount = 1
UPDATE public.borrow_requests 
SET requested_amount = 1 
WHERE requested_amount IS NULL;

-- Add constraint to ensure available_amount doesn't exceed total amount
ALTER TABLE public.items 
ADD CONSTRAINT check_available_amount_valid 
CHECK (available_amount <= amount);

-- Create function to automatically update available_amount when items are borrowed/returned
CREATE OR REPLACE FUNCTION update_item_availability()
RETURNS TRIGGER AS $$
BEGIN
  -- When a borrow request is approved, decrease available_amount by requested_amount
  IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status != 'approved') THEN
    UPDATE public.items 
    SET available_amount = available_amount - NEW.requested_amount,
        status = CASE 
          WHEN available_amount - NEW.requested_amount <= 0 THEN 'borrowed'
          ELSE 'available'
        END
    WHERE id = NEW.item_id AND available_amount >= NEW.requested_amount;
    
    -- Log the operation
    RAISE NOTICE 'Item % borrowed: reduced available_amount by %', NEW.item_id, NEW.requested_amount;
  END IF;
  
  -- When a borrow request is completed or rejected, increase available_amount by requested_amount
  IF NEW.status IN ('completed', 'rejected') AND OLD IS NOT NULL AND OLD.status = 'approved' THEN
    UPDATE public.items 
    SET available_amount = available_amount + NEW.requested_amount,
        status = CASE 
          WHEN available_amount + NEW.requested_amount > 0 THEN 'available'
          ELSE status
        END
    WHERE id = NEW.item_id;
    
    -- Log the operation
    RAISE NOTICE 'Item % returned: increased available_amount by %', NEW.item_id, NEW.requested_amount;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically manage item availability
DROP TRIGGER IF EXISTS trigger_update_item_availability ON public.borrow_requests;
CREATE TRIGGER trigger_update_item_availability
  AFTER UPDATE ON public.borrow_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_item_availability();

-- Update the items status logic to be based on available_amount
UPDATE public.items 
SET status = CASE 
  WHEN available_amount = 0 THEN 'borrowed'
  ELSE 'available'
END;

-- Add comments for documentation
COMMENT ON COLUMN public.items.amount IS 'Total quantity of this item in inventory';
COMMENT ON COLUMN public.items.available_amount IS 'Number of items currently available for borrowing';
COMMENT ON COLUMN public.borrow_requests.requested_amount IS 'Number of items requested to borrow';

-- Create a view to help with availability calculations
CREATE OR REPLACE VIEW item_availability_summary AS
SELECT 
  i.*,
  COALESCE(SUM(br.requested_amount) FILTER (WHERE br.status = 'pending'), 0) as pending_requests_amount,
  COALESCE(SUM(br.requested_amount) FILTER (WHERE br.status = 'approved'), 0) as currently_borrowed_amount,
  (i.available_amount - COALESCE(SUM(br.requested_amount) FILTER (WHERE br.status = 'pending'), 0)) as effectively_available
FROM public.items i
LEFT JOIN public.borrow_requests br ON i.id = br.item_id
GROUP BY i.id, i.name, i.description, i.category, i.image_url, i.status, i.current_borrower_id, i.amount, i.available_amount, i.created_at, i.updated_at;