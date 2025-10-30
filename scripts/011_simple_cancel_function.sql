-- Enable user request cancellation functionality
-- Run this in Supabase SQL Editor

-- Step 1: Add cancelled_at column if it doesn't exist
ALTER TABLE public.borrow_requests 
ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone;

-- Step 2: Update the status check constraint to include 'cancelled'
ALTER TABLE public.borrow_requests 
DROP CONSTRAINT IF EXISTS borrow_requests_status_check;

ALTER TABLE public.borrow_requests 
ADD CONSTRAINT borrow_requests_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled'));

-- Step 3: Create RPC function for user cancellation
DROP FUNCTION IF EXISTS cancel_user_request(uuid);

CREATE OR REPLACE FUNCTION cancel_user_request(request_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id uuid;
    request_record record;
BEGIN
    -- Get authenticated user
    current_user_id := auth.uid();
    
    -- Check authentication
    IF current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Get request details
    SELECT * INTO request_record
    FROM borrow_requests 
    WHERE id = request_id;
    
    -- Check if request exists
    IF request_record.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Request not found');
    END IF;
    
    -- Check ownership
    IF request_record.user_id != current_user_id THEN
        RETURN json_build_object('success', false, 'error', 'Can only cancel your own requests');
    END IF;
    
    -- Check status
    IF request_record.status != 'pending' THEN
        RETURN json_build_object('success', false, 'error', 'Can only cancel pending requests');
    END IF;
    
    -- Update request status
    UPDATE borrow_requests 
    SET 
        status = 'cancelled',
        cancelled_at = NOW()
    WHERE id = request_id;
    
    RETURN json_build_object('success', true, 'message', 'Request cancelled successfully');
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION cancel_user_request(uuid) TO authenticated;