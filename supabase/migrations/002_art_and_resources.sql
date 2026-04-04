-- ============================================================================
-- Migration 002: Profile extensions, storage bucket, auth trigger, RLS
-- ============================================================================

-- Enable UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. Extend profiles table
-- ============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS discord_member_id TEXT,
  ADD COLUMN IF NOT EXISTS discord_username TEXT;

-- Ensure username uniqueness
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_unique'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);
  END IF;
END $$;

-- ============================================================================
-- 2. RLS Policies
-- ============================================================================

-- Profiles: public read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public can view profiles' AND tablename = 'profiles'
  ) THEN
    CREATE POLICY "Public can view profiles"
      ON profiles FOR SELECT
      USING (true);
  END IF;
END $$;

-- Profiles: owners can update
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile' AND tablename = 'profiles'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON profiles FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- ============================================================================
-- 3. Storage bucket for user uploads
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('user-uploads', 'user-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: authenticated users can upload to their own folder
CREATE POLICY "Users can upload to own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage policy: public read
CREATE POLICY "Public can read user uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user-uploads');

-- Storage policy: users can update their own files
CREATE POLICY "Users can update own uploads"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'user-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage policy: users can delete their own files
CREATE POLICY "Users can delete own uploads"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- 4. Auto-create profile trigger on auth.users insert
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _discord_username TEXT;
  _display_name TEXT;
  _avatar_url TEXT;
  _username TEXT;
BEGIN
  -- Extract Discord metadata from raw_user_meta_data
  _discord_username := NEW.raw_user_meta_data->>'preferred_username';
  _display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    _discord_username
  );
  _avatar_url := NEW.raw_user_meta_data->>'avatar_url';
  _username := COALESCE(_discord_username, split_part(NEW.email, '@', 1));

  -- Handle username conflicts by appending random suffix
  LOOP
    BEGIN
      INSERT INTO public.profiles (id, username, display_name, avatar_url, discord_username)
      VALUES (NEW.id, _username, _display_name, _avatar_url, _discord_username);
      EXIT; -- Success, exit loop
    EXCEPTION WHEN unique_violation THEN
      _username := _username || '_' || substr(gen_random_uuid()::text, 1, 4);
    END;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
