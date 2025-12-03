-- Drop existing trigger and function to recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the function to handle user type from metadata
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

  -- Insert profile
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.email);
  
  -- Insert role with the correct value
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fix the current user to organizer
UPDATE public.user_roles 
SET role = 'organizer' 
WHERE user_id = 'fc4a6bc6-7eba-4845-8fd6-54bc68568d47';