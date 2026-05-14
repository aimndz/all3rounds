create table if not exists public."user" ("id" text not null default gen_random_uuid()::text primary key, "name" text not null, "email" text not null unique, "emailVerified" boolean not null, "image" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create table if not exists public."session" ("id" text not null default gen_random_uuid()::text primary key, "expiresAt" timestamptz not null, "token" text not null unique, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null, "ipAddress" text, "userAgent" text, "userId" text not null references public."user" ("id") on delete cascade);

create table if not exists public."account" ("id" text not null default gen_random_uuid()::text primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references public."user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, "scope" text, "password" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null);

create table if not exists public."verification" ("id" text not null default gen_random_uuid()::text primary key, "identifier" text not null, "value" text not null, "expiresAt" timestamptz not null, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

alter table public."user" alter column "id" set default gen_random_uuid()::text;
alter table public."session" alter column "id" set default gen_random_uuid()::text;
alter table public."account" alter column "id" set default gen_random_uuid()::text;
alter table public."verification" alter column "id" set default gen_random_uuid()::text;

create index if not exists "session_userId_idx" on public."session" ("userId");

create index if not exists "account_userId_idx" on public."account" ("userId");

create index if not exists "verification_identifier_idx" on public."verification" ("identifier");
