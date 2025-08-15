-- EGS Tutoring Supabase Schema Migration
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create custom types for enums
create type user_role as enum ('parent', 'student', 'tutor', 'admin');
create type city_type as enum (
  'Ajax', 'Aurora', 'Barrie', 'Belleville', 'Brampton', 'Brantford', 'Burlington', 
  'Cambridge', 'Chatham-Kent', 'Clarington', 'Collingwood', 'Cornwall', 'Dryden',
  'Georgina', 'Grimsby', 'Guelph', 'Hamilton', 'Huntsville', 'Innisfil',
  'Kawartha Lakes', 'Kenora', 'Kingston', 'Kitchener', 'Leamington', 'London',
  'Markham', 'Midland', 'Milton', 'Mississauga', 'Newmarket', 'Niagara Falls',
  'Niagara-on-the-Lake', 'North Bay', 'Oakville', 'Orangeville', 'Orillia',
  'Oshawa', 'Ottawa', 'Peterborough', 'Pickering', 'Quinte West', 'Richmond Hill',
  'Sarnia', 'St. Catharines', 'St. Thomas', 'Stratford', 'Sudbury', 'Tecumseh',
  'Thunder Bay', 'Timmins', 'Toronto', 'Vaughan', 'Wasaga Beach', 'Waterloo',
  'Welland', 'Whitby', 'Windsor', 'Woodstock'
);
create type grade_level as enum (
  'Kindergarten', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 
  'College', 'University'
);
create type service_type as enum ('Online', 'In-Person', 'Both (Online & In-Person)');
create type location_type as enum ('Online', 'In-Person', '---');
create type status_type as enum ('Accepted', 'Disputed', 'Resolved', 'Void');
create type homework_completion as enum ('excellent', 'good', 'satisfactory', 'needs_improvement');
create type participation_level as enum ('high', 'medium', 'low');
create type audience_type as enum ('all', 'parent', 'student', 'tutor');

-- Users table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username varchar(50) unique,
  first_name varchar(50) default 'None',
  last_name varchar(50) default 'None',
  address varchar(60) default 'Unknown',
  city city_type default 'Toronto',
  role user_role default 'parent',
  parent_id uuid references public.profiles(id) on delete cascade,
  rate_online decimal(10,2) default 35.00,
  rate_in_person decimal(10,2) default 60.00,
  stripe_account_id varchar(100),
  profile_picture_url text,
  
  -- Google Calendar Integration
  google_access_token text, -- Will be encrypted at app level
  google_refresh_token text, -- Will be encrypted at app level
  google_token_expiry timestamptz,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Referrals
create table public.referrals (
  id uuid default uuid_generate_v4() primary key,
  code varchar(16) unique not null,
  referrer_id uuid references public.profiles(id) on delete cascade not null,
  prospective_email varchar(255) not null,
  referred_id uuid references public.profiles(id) on delete set null,
  reward_applied boolean default false,
  created_at timestamptz default now()
);

-- User Documents
create table public.user_documents (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  file_url text not null, -- Supabase Storage URL
  file_name varchar(255),
  uploaded_at timestamptz default now()
);

-- Error Tickets
create table public.error_tickets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  message text not null,
  file_url text, -- Supabase Storage URL
  created_at timestamptz default now()
);

-- Announcements
create table public.announcements (
  id uuid default uuid_generate_v4() primary key,
  name varchar(255),
  description text,
  address varchar(255),
  start_time timestamptz,
  end_time timestamptz,
  image_url text, -- Supabase Storage URL
  link text,
  audience audience_type default 'all',
  created_at timestamptz default now(),
  expires_at timestamptz
);

-- Tutoring Requests
create table public.tutoring_requests (
  id uuid default uuid_generate_v4() primary key,
  parent_id uuid references public.profiles(id) on delete cascade not null,
  student_id uuid references public.profiles(id) on delete cascade not null,
  subject varchar(100) not null,
  city city_type default 'Toronto',
  grade grade_level default 'Kindergarten',
  service service_type default 'Online',
  description text not null,
  is_accepted varchar(15) default 'Not Accepted',
  created_at timestamptz default now()
);

-- Tutor Responses
create table public.tutor_responses (
  id uuid default uuid_generate_v4() primary key,
  request_id uuid references public.tutoring_requests(id) on delete cascade not null,
  tutor_id uuid references public.profiles(id) on delete cascade not null,
  message text not null,
  rejected boolean default false,
  created_at timestamptz default now()
);

-- Accepted Tutors
create table public.accepted_tutors (
  id uuid default uuid_generate_v4() primary key,
  request_id uuid references public.tutoring_requests(id) on delete cascade not null,
  parent_id uuid references public.profiles(id) on delete cascade not null,
  student_id uuid references public.profiles(id) on delete cascade not null,
  tutor_id uuid references public.profiles(id) on delete cascade not null,
  status status_type default 'Accepted',
  accepted_at timestamptz default now()
);

-- Hours/Sessions
create table public.hours (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.profiles(id) on delete cascade not null,
  parent_id uuid references public.profiles(id) on delete cascade not null,
  tutor_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  total_time decimal(5,2) not null,
  location location_type default '---',
  subject varchar(50) not null,
  notes text,
  status status_type default 'Accepted',
  eligible varchar(15) default 'Submitted',
  created_at timestamptz default now()
);

-- Monthly Reports
create table public.monthly_reports (
  id uuid default uuid_generate_v4() primary key,
  tutor_id uuid references public.profiles(id) on delete cascade not null,
  student_id uuid references public.profiles(id) on delete cascade not null,
  month smallint not null,
  year smallint not null,
  progress_summary text default '',
  strengths text default '',
  areas_for_improvement text default '',
  homework_completion homework_completion default 'good',
  participation_level participation_level default 'medium',
  goals_for_next_month text default '',
  additional_comments text default '',
  created_at timestamptz default now(),
  
  -- Ensure unique reports per tutor/student/month/year
  unique(tutor_id, student_id, month, year)
);

-- Weekly Hours Summary
create table public.weekly_hours (
  id uuid default uuid_generate_v4() primary key,
  date date not null,
  parent_id uuid references public.profiles(id) on delete cascade not null,
  online_hours decimal(5,2) not null,
  in_person_hours decimal(5,2) not null,
  total_before_tax decimal(5,2) not null,
  created_at timestamptz default now()
);

-- Monthly Hours Summary
create table public.monthly_hours (
  id uuid default uuid_generate_v4() primary key,
  start_date date default now(),
  end_date date default now(),
  tutor_id uuid references public.profiles(id) on delete cascade not null,
  online_hours decimal(5,2) not null,
  in_person_hours decimal(5,2) not null,
  total_before_tax decimal(5,2) not null,
  created_at timestamptz default now()
);

-- Stripe Payouts
create table public.stripe_payouts (
  id uuid default uuid_generate_v4() primary key,
  tutor_id uuid references public.profiles(id) on delete cascade not null,
  monthly_hours_id uuid references public.monthly_hours(id) on delete restrict not null,
  amount_cents integer not null,
  currency varchar(5) default 'cad',
  stripe_transfer_id varchar(120),
  status varchar(20) default 'created',
  created_at timestamptz default now(),
  
  unique(monthly_hours_id, stripe_transfer_id)
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.referrals enable row level security;
alter table public.user_documents enable row level security;
alter table public.error_tickets enable row level security;
alter table public.announcements enable row level security;
alter table public.tutoring_requests enable row level security;
alter table public.tutor_responses enable row level security;
alter table public.accepted_tutors enable row level security;
alter table public.hours enable row level security;
alter table public.monthly_reports enable row level security;
alter table public.weekly_hours enable row level security;
alter table public.monthly_hours enable row level security;
alter table public.stripe_payouts enable row level security;

-- Basic RLS Policies (Users can access their own data)
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Parents can see their children's data
create policy "Parents can view children" on profiles for select using (
  auth.uid() = parent_id or auth.uid() = id
);

-- Tutors can see their students' basic info
create policy "Tutors can view assigned students" on profiles for select using (
  auth.uid() in (
    select tutor_id from accepted_tutors where student_id = profiles.id
  )
);

-- More policies would be added based on specific business rules...

-- Create indexes for performance
create index idx_profiles_parent_id on profiles(parent_id);
create index idx_profiles_role on profiles(role);
create index idx_hours_tutor_date on hours(tutor_id, date);
create index idx_hours_student_date on hours(student_id, date);
create index idx_tutoring_requests_parent on tutoring_requests(parent_id);
create index idx_accepted_tutors_student on accepted_tutors(student_id);
create index idx_monthly_reports_tutor_student on monthly_reports(tutor_id, student_id);

-- Functions for automatic updated_at timestamps
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Add updated_at triggers
create trigger profiles_updated_at
  before update on profiles
  for each row
  execute function public.handle_updated_at();

-- Insert trigger to create profile after user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, first_name, last_name)
  values (new.id, 
          coalesce(new.raw_user_meta_data->>'username', null),
          coalesce(new.raw_user_meta_data->>'first_name', 'None'),
          coalesce(new.raw_user_meta_data->>'last_name', 'None')
         );
  return new;
end;
$$;

-- Trigger to create profile when user signs up
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();