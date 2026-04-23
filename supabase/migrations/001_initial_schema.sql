-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Students table
create table public.students (
  id uuid primary key default uuid_generate_v4(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  level text not null check (level in ('beginner', 'intermediate', 'advanced', 'elite')),
  dominant_hand text not null check (dominant_hand in ('right', 'left')),
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Sessions table
create table public.sessions (
  id uuid primary key default uuid_generate_v4(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid references public.students(id) on delete set null,
  date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

-- Serve analyses table
create table public.serve_analyses (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  coach_id uuid not null references auth.users(id) on delete cascade,
  video_url text,
  thumbnail_url text,
  score_overall integer,
  score_stance integer,
  score_trophy integer,
  score_loading integer,
  score_contact integer,
  score_follow_through integer,
  analysis_json jsonb,
  pose_frames_json jsonb,
  detected_phases_json jsonb,
  coach_notes text,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.students enable row level security;
alter table public.sessions enable row level security;
alter table public.serve_analyses enable row level security;

-- RLS Policies for students
create policy "coach_students_select" on public.students
  for select using (coach_id = auth.uid());

create policy "coach_students_insert" on public.students
  for insert with check (coach_id = auth.uid());

create policy "coach_students_update" on public.students
  for update using (coach_id = auth.uid());

create policy "coach_students_delete" on public.students
  for delete using (coach_id = auth.uid());

-- RLS Policies for sessions
create policy "coach_sessions_select" on public.sessions
  for select using (coach_id = auth.uid());

create policy "coach_sessions_insert" on public.sessions
  for insert with check (coach_id = auth.uid());

create policy "coach_sessions_update" on public.sessions
  for update using (coach_id = auth.uid());

create policy "coach_sessions_delete" on public.sessions
  for delete using (coach_id = auth.uid());

-- RLS Policies for serve_analyses
create policy "coach_analyses_select" on public.serve_analyses
  for select using (coach_id = auth.uid());

create policy "coach_analyses_insert" on public.serve_analyses
  for insert with check (coach_id = auth.uid());

create policy "coach_analyses_update" on public.serve_analyses
  for update using (coach_id = auth.uid());

create policy "coach_analyses_delete" on public.serve_analyses
  for delete using (coach_id = auth.uid());

-- Storage buckets
insert into storage.buckets (id, name, public) values ('serve-videos', 'serve-videos', false);
insert into storage.buckets (id, name, public) values ('thumbnails', 'thumbnails', true);

-- Storage policies for serve-videos (private: coach owns folder = uid)
create policy "coach_videos_upload" on storage.objects
  for insert with check (
    bucket_id = 'serve-videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "coach_videos_read" on storage.objects
  for select using (
    bucket_id = 'serve-videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "coach_videos_delete" on storage.objects
  for delete using (
    bucket_id = 'serve-videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for thumbnails (public read, coach upload)
create policy "thumbnails_public_read" on storage.objects
  for select using (bucket_id = 'thumbnails');

create policy "coach_thumbnails_upload" on storage.objects
  for insert with check (
    bucket_id = 'thumbnails'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
