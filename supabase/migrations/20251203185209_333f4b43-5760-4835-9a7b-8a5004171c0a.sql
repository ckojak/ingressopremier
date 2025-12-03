-- Add INSERT policy for tickets table to allow users to create tickets for their paid orders
CREATE POLICY "Users can create tickets for their orders"
ON public.tickets FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.id = tickets.order_item_id
    AND o.user_id = auth.uid()
    AND o.status = 'paid'
  )
);