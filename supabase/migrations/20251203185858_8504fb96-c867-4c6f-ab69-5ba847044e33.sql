-- Add UPDATE policy for orders so users can update their own orders (e.g., status change after payment)
CREATE POLICY "Users can update own orders"
ON public.orders FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);