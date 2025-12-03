UPDATE public.user_roles 
SET role = 'admin' 
WHERE user_id = (SELECT id FROM profiles WHERE email = 'juniorkojak2@gmail.com');