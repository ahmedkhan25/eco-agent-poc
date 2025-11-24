-- Migration: Add rag_contexts table for storing compressed RAG context
-- Run this in Supabase SQL Editor for production database

CREATE TABLE IF NOT EXISTS public.rag_contexts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  query TEXT NOT NULL,
  full_context JSONB NOT NULL,
  compressed_summary TEXT NOT NULL,
  sources JSONB NOT NULL,
  token_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE public.rag_contexts IS 'Stores compressed RAG context from Olympia document searches';
COMMENT ON COLUMN public.rag_contexts.id IS 'Unique identifier for the RAG context (format: ctx_...)';
COMMENT ON COLUMN public.rag_contexts.session_id IS 'Chat session identifier';
COMMENT ON COLUMN public.rag_contexts.query IS 'Original user query';
COMMENT ON COLUMN public.rag_contexts.full_context IS 'Complete RAG results and raw context';
COMMENT ON COLUMN public.rag_contexts.compressed_summary IS 'GPT-4o-mini compressed summary (~800 tokens)';
COMMENT ON COLUMN public.rag_contexts.sources IS 'Array of source document citations';
COMMENT ON COLUMN public.rag_contexts.token_count IS 'Token count of compressed summary';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_rag_contexts_session_id ON public.rag_contexts(session_id);
CREATE INDEX IF NOT EXISTS idx_rag_contexts_created_at ON public.rag_contexts(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.rag_contexts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow all authenticated users to select (context is not sensitive)
CREATE POLICY "Authenticated users can view rag contexts"
  ON public.rag_contexts
  FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- RLS Policy: Allow insert for authenticated and anonymous users
CREATE POLICY "Users can insert rag contexts"
  ON public.rag_contexts
  FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Allow delete for authenticated users
CREATE POLICY "Users can delete rag contexts"
  ON public.rag_contexts
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT SELECT, INSERT ON public.rag_contexts TO authenticated;
GRANT SELECT, INSERT ON public.rag_contexts TO anon;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'RAG contexts table migration completed successfully!';
  RAISE NOTICE 'You can now use the compressed RAG context feature.';
END $$;

