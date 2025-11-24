-- Supabase Migration: Create images table for AI-generated images
-- This table stores generated images from the GPT Image API
-- Run this migration in your Supabase SQL editor or via CLI

-- Create images table
CREATE TABLE IF NOT EXISTS public.images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_id TEXT,
  session_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  revised_prompt TEXT,
  size TEXT NOT NULL,
  quality TEXT NOT NULL,
  background TEXT NOT NULL,
  title TEXT,
  image_data TEXT NOT NULL, -- Base64 encoded PNG
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE public.images IS 'Stores AI-generated images from GPT Image API';
COMMENT ON COLUMN public.images.id IS 'Unique identifier for the image';
COMMENT ON COLUMN public.images.user_id IS 'Reference to authenticated user (nullable for anonymous)';
COMMENT ON COLUMN public.images.anonymous_id IS 'Identifier for anonymous users';
COMMENT ON COLUMN public.images.session_id IS 'Chat session identifier';
COMMENT ON COLUMN public.images.prompt IS 'Original user prompt for image generation';
COMMENT ON COLUMN public.images.revised_prompt IS 'OpenAI optimized prompt';
COMMENT ON COLUMN public.images.size IS 'Image dimensions (1024x1024, 1024x1536, 1536x1024)';
COMMENT ON COLUMN public.images.quality IS 'Image quality setting (low, medium, high)';
COMMENT ON COLUMN public.images.background IS 'Background type (opaque, transparent)';
COMMENT ON COLUMN public.images.title IS 'Optional title/description for the image';
COMMENT ON COLUMN public.images.image_data IS 'Base64 encoded PNG image data';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_images_user_id ON public.images(user_id);
CREATE INDEX IF NOT EXISTS idx_images_session_id ON public.images(session_id);
CREATE INDEX IF NOT EXISTS idx_images_created_at ON public.images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_images_anonymous_id ON public.images(anonymous_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own images
CREATE POLICY "Users can view own images"
  ON public.images
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR user_id IS NULL -- Allow viewing anonymous images
  );

-- RLS Policy: Users can insert their own images
CREATE POLICY "Users can insert own images"
  ON public.images
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    OR user_id IS NULL -- Allow anonymous insertions
  );

-- RLS Policy: Users can update their own images
CREATE POLICY "Users can update own images"
  ON public.images
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own images
CREATE POLICY "Users can delete own images"
  ON public.images
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to automatically update updated_at timestamp
CREATE TRIGGER update_images_updated_at
  BEFORE UPDATE ON public.images
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT ON public.images TO authenticated;
GRANT SELECT, INSERT ON public.images TO anon;

-- Optional: Create a view for image metadata (without base64 data)
CREATE OR REPLACE VIEW public.images_metadata AS
SELECT 
  id,
  user_id,
  anonymous_id,
  session_id,
  prompt,
  revised_prompt,
  size,
  quality,
  background,
  title,
  LENGTH(image_data) as image_size_bytes,
  created_at,
  updated_at
FROM public.images;

COMMENT ON VIEW public.images_metadata IS 'Image metadata without base64 data for efficient querying';

-- Grant access to metadata view
GRANT SELECT ON public.images_metadata TO authenticated;
GRANT SELECT ON public.images_metadata TO anon;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Images table migration completed successfully!';
  RAISE NOTICE 'You can now use the image generation feature.';
END $$;

