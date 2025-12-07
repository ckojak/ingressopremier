-- Promover bmw.kojak@gmail.com para administrador
UPDATE public.user_roles 
SET role = 'admin' 
WHERE user_id = '5f7b01b8-bff9-4bc0-96ec-c3ba708057be';