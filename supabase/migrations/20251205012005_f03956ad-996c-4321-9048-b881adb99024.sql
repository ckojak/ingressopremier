-- Update the handle_new_user function to also save cpf and phone
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_type text;
  user_role app_role;
BEGIN
  -- Get user_type from metadata, default to 'client'
  user_type := COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'client');
  
  -- Map user_type to app_role
  IF user_type = 'organizer' THEN
    user_role := 'organizer';
  ELSE
    user_role := 'user';
  END IF;

  -- Insert profile with cpf and phone
  INSERT INTO public.profiles (id, full_name, email, cpf, phone)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'full_name', 
    NEW.email,
    NEW.raw_user_meta_data ->> 'cpf',
    NEW.raw_user_meta_data ->> 'phone'
  );
  
  -- Insert role with the correct value
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$$;