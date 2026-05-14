begin;

create table if not exists public."user" (
  "id" text not null default gen_random_uuid()::text primary key,
  "name" text not null,
  "email" text not null unique,
  "emailVerified" boolean not null,
  "image" text,
  "createdAt" timestamptz default current_timestamp not null,
  "updatedAt" timestamptz default current_timestamp not null
);

create table if not exists public."session" (
  "id" text not null default gen_random_uuid()::text primary key,
  "expiresAt" timestamptz not null,
  "token" text not null unique,
  "createdAt" timestamptz default current_timestamp not null,
  "updatedAt" timestamptz not null,
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null references public."user" ("id") on delete cascade
);

create table if not exists public."account" (
  "id" text not null default gen_random_uuid()::text primary key,
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null references public."user" ("id") on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  "scope" text,
  "password" text,
  "createdAt" timestamptz default current_timestamp not null,
  "updatedAt" timestamptz not null
);

create table if not exists public."verification" (
  "id" text not null default gen_random_uuid()::text primary key,
  "identifier" text not null,
  "value" text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz default current_timestamp not null,
  "updatedAt" timestamptz default current_timestamp not null
);

alter table public."user" alter column "id" set default gen_random_uuid()::text;
alter table public."session" alter column "id" set default gen_random_uuid()::text;
alter table public."account" alter column "id" set default gen_random_uuid()::text;
alter table public."verification" alter column "id" set default gen_random_uuid()::text;

create index if not exists "session_userId_idx" on public."session" ("userId");
create index if not exists "account_userId_idx" on public."account" ("userId");
create index if not exists "verification_identifier_idx" on public."verification" ("identifier");

do $$
begin
  if exists (
    select 1
    from auth.users
    where email is null
  ) then
    raise exception 'Cannot migrate Supabase auth users without email into Better Auth because Better Auth user.email is required.';
  end if;
end $$;

drop table if exists public.__better_auth_supabase_user_map;

insert into public."user" (
  "id",
  "name",
  "email",
  "emailVerified",
  "image",
  "createdAt",
  "updatedAt"
)
with source as (
  select id::text as source_user_id from auth.users
  union
  select id::text as source_user_id from public.user_profiles
  union
  select user_id::text as source_user_id from public.suggestions
  union
  select reviewed_by::text as source_user_id
  from public.suggestions
  where reviewed_by is not null
)
select
  source.source_user_id,
  coalesce(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    up.display_name,
    split_part(au.email, '@', 1),
    'Migrated User'
  ) as "name",
  coalesce(
    lower(au.email),
    'migrated+' || replace(source.source_user_id, '-', '') || '@all3rounds.invalid'
  ) as "email",
  au.email is not null as "emailVerified",
  coalesce(
    au.raw_user_meta_data->>'avatar_url',
    au.raw_user_meta_data->>'picture'
  ) as "image",
  coalesce(up.created_at, au.created_at, now()) as "createdAt",
  coalesce(up.updated_at, au.updated_at, au.created_at, now()) as "updatedAt"
from source
left join auth.users au
  on au.id::text = source.source_user_id
left join public.user_profiles up
  on up.id::text = source.source_user_id
where not exists (
  select 1
  from public."user" bu
  where bu."id" = source.source_user_id
     or (
       au.email is not null
       and lower(bu."email") = lower(au.email)
     )
)
on conflict ("id") do update set
  "name" = excluded."name",
  "email" = excluded."email",
  "emailVerified" = public."user"."emailVerified" or excluded."emailVerified",
  "image" = coalesce(public."user"."image", excluded."image"),
  "updatedAt" = greatest(public."user"."updatedAt", excluded."updatedAt");

drop trigger if exists on_auth_user_created on auth.users;

drop policy if exists "Logged-in users can suggest" on public.suggestions;
drop policy if exists "Reviewers can read all suggestions" on public.suggestions;
drop policy if exists "Reviewers can update suggestions" on public.suggestions;
drop policy if exists "Users can read own suggestions" on public.suggestions;
drop policy if exists "Admins can read all profiles" on public.user_profiles;
drop policy if exists "Superadmins can read all profiles" on public.user_profiles;
drop policy if exists "Superadmins can update profiles" on public.user_profiles;
drop policy if exists "Users can read own profile" on public.user_profiles;

alter table public.suggestions drop constraint if exists suggestions_user_id_fkey;
alter table public.suggestions drop constraint if exists suggestions_reviewed_by_fkey;
alter table public.user_profiles drop constraint if exists user_profiles_id_fkey;
alter table public.user_profiles drop constraint if exists user_profiles_pkey;

do $$
begin
  if (
    select data_type
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'suggestions'
      and column_name = 'user_id'
  ) = 'uuid' then
    alter table public.suggestions add column if not exists user_id_better_auth text;
    alter table public.suggestions add column if not exists reviewed_by_better_auth text;

    with source as (
      select id::text as source_user_id from auth.users
      union
      select id::text as source_user_id from public.user_profiles
      union
      select user_id::text as source_user_id from public.suggestions
      union
      select reviewed_by::text as source_user_id
      from public.suggestions
      where reviewed_by is not null
    ),
    user_map as (
      select
        source.source_user_id as supabase_user_id,
        coalesce(ba_by_email."id", ba_by_id."id", source.source_user_id) as better_auth_user_id
      from source
      left join auth.users au
        on au.id::text = source.source_user_id
      left join public."user" ba_by_email
        on au.email is not null
        and lower(ba_by_email."email") = lower(au.email)
      left join public."user" ba_by_id
        on ba_by_id."id" = source.source_user_id
    )
    update public.suggestions s
    set user_id_better_auth = m.better_auth_user_id
    from user_map m
    where s.user_id::text = m.supabase_user_id;

    with source as (
      select id::text as source_user_id from auth.users
      union
      select id::text as source_user_id from public.user_profiles
      union
      select user_id::text as source_user_id from public.suggestions
      union
      select reviewed_by::text as source_user_id
      from public.suggestions
      where reviewed_by is not null
    ),
    user_map as (
      select
        source.source_user_id as supabase_user_id,
        coalesce(ba_by_email."id", ba_by_id."id", source.source_user_id) as better_auth_user_id
      from source
      left join auth.users au
        on au.id::text = source.source_user_id
      left join public."user" ba_by_email
        on au.email is not null
        and lower(ba_by_email."email") = lower(au.email)
      left join public."user" ba_by_id
        on ba_by_id."id" = source.source_user_id
    )
    update public.suggestions s
    set reviewed_by_better_auth = m.better_auth_user_id
    from user_map m
    where s.reviewed_by::text = m.supabase_user_id;

    if exists (
      select 1
      from public.suggestions
      where user_id_better_auth is null
    ) then
      raise exception 'At least one suggestion.user_id could not be mapped to Better Auth.';
    end if;

    if exists (
      select 1
      from public.suggestions
      where reviewed_by is not null
        and reviewed_by_better_auth is null
    ) then
      raise exception 'At least one suggestion.reviewed_by could not be mapped to Better Auth.';
    end if;

    alter table public.suggestions
      alter column user_id type text using user_id_better_auth,
      alter column reviewed_by type text using reviewed_by_better_auth;

    alter table public.suggestions drop column user_id_better_auth;
    alter table public.suggestions drop column reviewed_by_better_auth;
  end if;
end $$;

do $$
begin
  if (
    select data_type
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_profiles'
      and column_name = 'id'
  ) = 'uuid' then
    alter table public.user_profiles add column if not exists id_better_auth text;

    with source as (
      select id::text as source_user_id from auth.users
      union
      select id::text as source_user_id from public.user_profiles
      union
      select user_id::text as source_user_id from public.suggestions
      union
      select reviewed_by::text as source_user_id
      from public.suggestions
      where reviewed_by is not null
    ),
    user_map as (
      select
        source.source_user_id as supabase_user_id,
        coalesce(ba_by_email."id", ba_by_id."id", source.source_user_id) as better_auth_user_id
      from source
      left join auth.users au
        on au.id::text = source.source_user_id
      left join public."user" ba_by_email
        on au.email is not null
        and lower(ba_by_email."email") = lower(au.email)
      left join public."user" ba_by_id
        on ba_by_id."id" = source.source_user_id
    )
    update public.user_profiles up
    set id_better_auth = m.better_auth_user_id
    from user_map m
    where up.id::text = m.supabase_user_id;

    if exists (
      select 1
      from public.user_profiles
      where id_better_auth is null
    ) then
      raise exception 'At least one user_profiles.id could not be mapped to Better Auth.';
    end if;

    alter table public.user_profiles
      alter column id type text using id_better_auth;

    alter table public.user_profiles drop column id_better_auth;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_profiles_pkey'
      and conrelid = 'public.user_profiles'::regclass
  ) then
    alter table public.user_profiles
      add constraint user_profiles_pkey primary key (id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_profiles_id_fkey'
      and conrelid = 'public.user_profiles'::regclass
  ) then
    alter table public.user_profiles
      add constraint user_profiles_id_fkey
      foreign key (id) references public."user" ("id") on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'suggestions_user_id_fkey'
      and conrelid = 'public.suggestions'::regclass
  ) then
    alter table public.suggestions
      add constraint suggestions_user_id_fkey
      foreign key (user_id) references public.user_profiles (id) on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'suggestions_reviewed_by_fkey'
      and conrelid = 'public.suggestions'::regclass
  ) then
    alter table public.suggestions
      add constraint suggestions_reviewed_by_fkey
      foreign key (reviewed_by) references public.user_profiles (id) on delete set null;
  end if;
end $$;

create index if not exists idx_user_profiles_role on public.user_profiles (role);
create index if not exists idx_suggestions_user_id on public.suggestions (user_id);

drop function if exists public.get_admin_review_stats();

create or replace function public.get_admin_review_stats()
returns table (
  reviewed_by text,
  display_name text,
  role text,
  approved bigint,
  rejected bigint,
  total bigint,
  last_review timestamptz,
  total_approved bigint,
  total_rejected bigint,
  total_reviews bigint
)
language sql
stable
as $$
  with overview as (
    select
      count(*) filter (where s.status = 'approved')::bigint as total_approved,
      count(*) filter (where s.status = 'rejected')::bigint as total_rejected,
      count(*) filter (where s.status in ('approved', 'rejected'))::bigint as total_reviews
    from public.suggestions s
  ),
  by_moderator as (
    select
      s.reviewed_by,
      coalesce(up.display_name, 'Unknown') as display_name,
      coalesce(up.role, 'unknown') as role,
      count(*) filter (where s.status = 'approved')::bigint as approved,
      count(*) filter (where s.status = 'rejected')::bigint as rejected,
      count(*)::bigint as total,
      max(s.reviewed_at) as last_review
    from public.suggestions s
    left join public.user_profiles up on up.id = s.reviewed_by
    where s.status in ('approved', 'rejected')
      and s.reviewed_by is not null
    group by s.reviewed_by, up.display_name, up.role
  )
  select
    m.reviewed_by,
    m.display_name,
    m.role,
    m.approved,
    m.rejected,
    m.total,
    m.last_review,
    o.total_approved,
    o.total_rejected,
    o.total_reviews
  from by_moderator m
  cross join overview o
  order by m.total desc;
$$;

commit;
