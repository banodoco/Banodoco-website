-- ============================================================================
-- Migration 002: Art Pieces, Community Resources, Profile extensions
-- ============================================================================

-- Enable UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. Extend profiles table
-- ============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
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
-- 2. art_pieces table
-- ============================================================================

CREATE TABLE IF NOT EXISTS art_pieces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL DEFAULT 'discord' CHECK (source_type IN ('discord', 'upload')),
  discord_message_id TEXT REFERENCES discord_messages(message_id),
  title TEXT,
  caption TEXT,
  user_id UUID REFERENCES auth.users(id),
  discord_author_id TEXT,
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  media_types TEXT[] NOT NULL DEFAULT '{}',
  thumbnail_url TEXT,
  reaction_count INT NOT NULL DEFAULT 0,
  tags TEXT[] NOT NULL DEFAULT '{}',
  associated_asset_id UUID REFERENCES assets(id),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft', 'hidden')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_art_pieces_status ON art_pieces(status);
CREATE INDEX IF NOT EXISTS idx_art_pieces_user_id ON art_pieces(user_id);
CREATE INDEX IF NOT EXISTS idx_art_pieces_discord_message_id ON art_pieces(discord_message_id);
CREATE INDEX IF NOT EXISTS idx_art_pieces_created_at ON art_pieces(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_art_pieces_reaction_count ON art_pieces(reaction_count DESC);

-- ============================================================================
-- 3. community_resources table
-- ============================================================================

CREATE TABLE IF NOT EXISTS community_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL DEFAULT 'discord' CHECK (source_type IN ('discord', 'upload')),
  discord_message_id TEXT REFERENCES discord_messages(message_id),
  title TEXT NOT NULL,
  description TEXT,
  primary_url TEXT,
  additional_urls TEXT[] NOT NULL DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id),
  discord_author_id TEXT,
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  media_types TEXT[] NOT NULL DEFAULT '{}',
  thumbnail_url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  resource_type TEXT NOT NULL DEFAULT 'other' CHECK (resource_type IN ('tutorial', 'tool', 'model', 'workflow', 'other')),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft', 'hidden')),
  reaction_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_resources_status ON community_resources(status);
CREATE INDEX IF NOT EXISTS idx_community_resources_user_id ON community_resources(user_id);
CREATE INDEX IF NOT EXISTS idx_community_resources_discord_message_id ON community_resources(discord_message_id);
CREATE INDEX IF NOT EXISTS idx_community_resources_created_at ON community_resources(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_resources_reaction_count ON community_resources(reaction_count DESC);
CREATE INDEX IF NOT EXISTS idx_community_resources_resource_type ON community_resources(resource_type);

-- ============================================================================
-- 4. RLS Policies
-- ============================================================================

ALTER TABLE art_pieces ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_resources ENABLE ROW LEVEL SECURITY;

-- Public read for published art
CREATE POLICY "Public can view published art"
  ON art_pieces FOR SELECT
  USING (status = 'published');

-- Authenticated users can insert their own art
CREATE POLICY "Users can insert own art"
  ON art_pieces FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users can update their own art
CREATE POLICY "Users can update own art"
  ON art_pieces FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Public read for published resources
CREATE POLICY "Public can view published resources"
  ON community_resources FOR SELECT
  USING (status = 'published');

-- Authenticated users can insert their own resources
CREATE POLICY "Users can insert own resources"
  ON community_resources FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users can update their own resources
CREATE POLICY "Users can update own resources"
  ON community_resources FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

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
-- 5. Storage bucket for user uploads
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
-- 6. Auto-create profile trigger on auth.users insert
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
