-- Database Schema for School Timetable Pro (Supabase / PostgreSQL)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES (Linked to Auth)
create table profiles (
  id uuid references auth.users not null primary key,
  role text not null default 'teacher',
  full_name text,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Profiles
alter table profiles enable row level security;
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- 2. TEACHERS
create table teachers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  department text,
  phone text,
  email text,
  building text,
  max_periods int default 30,
  skills jsonb default '[]', -- List of subject codes/types they can teach
  unavailable_times jsonb default '[]', -- e.g. [{"day": "Tuesday", "period": 1}]
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. SUBJECTS
create table subjects (
  id uuid default uuid_generate_v4() primary key,
  code text not null,
  name text not null,
  grade text,
  teacher_name text, -- Storing name directly for prototype simplicity
  hours int default 1,
  lab text,
  type text default 'Theory', -- 'Theory' or 'Lab'
  required_room_type text, -- e.g., 'Computer', 'Science'
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. CLASSROOMS
create table classrooms (
  id uuid default uuid_generate_v4() primary key,
  classroom_name text not null,
  building_name text,
  capacity int default 40,
  type text default 'Normal', -- 'Normal', 'Computer', 'Science'
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 5. TIMETABLE
create table timetable (
  id uuid default uuid_generate_v4() primary key,
  day text not null, -- 'จันทร์', 'อังคาร', etc.
  period int not null,
  subject_id uuid references subjects(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 6. SUBSTITUTES
create table substitutes (
  id uuid default uuid_generate_v4() primary key,
  date date,
  day text,
  period int,
  leaving_teacher text,
  reason text,
  substitute_teacher text,
  status text default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS for all data tables (Simple 'Public' access for prototype, can be restricted later)
alter table teachers enable row level security;
create policy "Enable all access for all users" on teachers for all using (true) with check (true);

alter table subjects enable row level security;
create policy "Enable all access for all users" on subjects for all using (true) with check (true);

alter table classrooms enable row level security;
create policy "Enable all access for all users" on classrooms for all using (true) with check (true);

alter table timetable enable row level security;
create policy "Enable all access for all users" on timetable for all using (true) with check (true);

alter table substitutes enable row level security;
create policy "Enable all access for all users" on substitutes for all using (true) with check (true);
