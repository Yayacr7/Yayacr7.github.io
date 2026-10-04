-- =====================================================================
-- Sharp: server-side lock for paid content.
-- Run once in Supabase > SQL Editor, after creating your project.
--
-- How it works:
--   * Course content lives in the premium_content table, not in the website files.
--   * Row Level Security means the database itself refuses to send a row unless
--     the signed-in person has access. Bypassing the website's code doesn't help.
--   * Access = paid plan in app_metadata (only the server can set it; users
--     cannot edit their own app_metadata) OR an account younger than 3 days.
-- =====================================================================

create table if not exists public.premium_content (
  slug       text primary key,
  title      text not null,
  body_html  text not null,
  min_plan   text not null default 'trial'
             check (min_plan in ('trial', 'starter', 'builder', 'founder')),
  updated_at timestamptz not null default now()
);

-- Locked by default: with RLS on and no matching policy, nobody can read or write.
alter table public.premium_content enable row level security;

-- What the signed-in person may see: 'founder', 'builder', 'starter', 'trial' or 'none'.
create or replace function public.np_access_level()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when u.raw_app_meta_data ->> 'plan' = 'founder' then 'founder'
    when u.raw_app_meta_data ->> 'plan' = 'builder' then 'builder'
    when u.raw_app_meta_data ->> 'plan' = 'starter' then 'starter'
    when u.created_at > now() - interval '3 days'   then 'trial'
    else 'none'
  end
  from auth.users u
  where u.id = auth.uid()
$$;

revoke all on function public.np_access_level() from public, anon;
grant execute on function public.np_access_level() to authenticated;

drop policy if exists "Read content your plan includes" on public.premium_content;
create policy "Read content your plan includes"
  on public.premium_content
  for select
  to authenticated
  using (
    case public.np_access_level()
      when 'founder' then true
      when 'trial'   then true                          -- the trial is Founder access
      when 'builder' then min_plan in ('trial', 'starter', 'builder')
      when 'starter' then min_plan in ('trial', 'starter')
      else false
    end
  );

-- No insert, update or delete policies on purpose: content can only be changed
-- from the Supabase dashboard or with the service_role key, never from the site.

-- Rule for every table you add later: turn on RLS the moment you create it.

-- =====================================================================
-- Paid spreadsheets: a PRIVATE storage bucket. Files can only be fetched
-- through a short-lived signed link, and only by people whose plan
-- includes them (Builder, Founder, or an active trial).
-- After running this, upload the four .xlsx files in
-- Supabase > Storage > sharp-files.
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('sharp-files', 'sharp-files', false)
on conflict (id) do update set public = false;

drop policy if exists "Download files your plan includes" on storage.objects;
create policy "Download files your plan includes"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'sharp-files'
    and public.np_access_level() in ('founder', 'builder', 'trial')
  );
-- No insert, update or delete policies: only you can change files, from the dashboard.
