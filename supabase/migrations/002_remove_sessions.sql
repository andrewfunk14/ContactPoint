-- Add student_id directly to serve_analyses
ALTER TABLE public.serve_analyses
  ADD COLUMN student_id uuid REFERENCES public.students(id) ON DELETE SET NULL;

-- Drop session_id (drops FK constraint automatically)
ALTER TABLE public.serve_analyses DROP COLUMN session_id;

-- Drop sessions table (no longer referenced)
DROP TABLE IF EXISTS public.sessions;
