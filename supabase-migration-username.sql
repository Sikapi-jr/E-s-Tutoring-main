-- Migration: Add username field to existing profiles table
-- Run this in your Supabase SQL Editor

-- Add username column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN username varchar(50) UNIQUE;

-- Update the trigger function to include username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, first_name, last_name, role, city)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'username', null),
    COALESCE(new.raw_user_meta_data->>'first_name', 'None'),
    COALESCE(new.raw_user_meta_data->>'last_name', 'None'),
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'parent'),
    COALESCE((new.raw_user_meta_data->>'city')::city_type, 'Toronto')
  );
  RETURN new;
END;
$$;

-- Create an index on username for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Optional: Add a comment to document the username field
COMMENT ON COLUMN profiles.username IS 'Unique username for user login and identification';

-- Verify the migration
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;