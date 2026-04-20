# AmeryMed Developer Guide

## 1. Project Location

The current application code lives here:

- `/Users/amerytech/Downloads/amerymed-web`

All code and styling changes we have made so far are stored in this same local project folder. You do not need to wait for the remaining production items before the code exists locally. The remaining work is mostly:

- documentation
- production configuration
- DNS / Resend completion
- deployment / packaging steps
- optional database automation

Important top-level folders:

- `app/` - Next.js App Router pages and API routes
- `components/` - reusable UI components
- `lib/` - Supabase clients and industry feed ingestion helpers
- `public/` - images and static assets
- `docs/` - project documentation

## 2. What This App Does

This is a responsive Next.js + Supabase application for:

- client portal login and upload workflow
- admin portal login and operations dashboard
- upload history and intake tracking
- admin audit visibility
- upload notification email via Resend
- physician-specific client identity display
- client-facing live healthcare industry feed

The same codebase supports desktop and mobile browsers.

## 3. Current Architecture

### Frontend

- Framework: Next.js 16 App Router
- UI: React 19
- Styling: CSS modules plus some page-level styles

Main pages:

- `app/page.tsx`
  - landing page
- `app/login/page.tsx`
  - unified login
- `app/client/login/page.tsx`
  - client login
- `app/admin/login/page.tsx`
  - admin login
- `app/client/page.tsx`
  - client portal
- `app/admin/page.tsx`
  - admin dashboard

Main reusable UI:

- `components/portal-login-shell.tsx`
  - shared login shell for client/admin logins
- `components/admin-files.tsx`
  - admin file management
- `components/admin-audit-log.tsx`
  - audit activity panel

### Backend / Data

- Database: Supabase Postgres
- Auth: Supabase Auth
- File storage: Supabase Storage bucket `client-documents`
- Email: Resend
- Live feed ingestion:
  - `app/api/industry-updates/sync/route.ts`
  - `lib/industry-updates.ts`
  - `lib/supabase-admin.ts`

### Runtime Flow

Client login flow:

1. User signs in via Supabase Auth.
2. App reads `profiles`.
3. `profiles.client_id` links to `clients.id`.
4. Client portal loads provider identity and upload history for that client.

Admin login flow:

1. User signs in via Supabase Auth.
2. App checks `profiles.role = 'admin'`.
3. Admin dashboard loads uploads and audit logs.

Upload flow:

1. Client chooses file and metadata.
2. File uploads to Supabase Storage bucket `client-documents`.
3. Metadata inserts into `public.uploads`.
4. Notification route sends email through Resend.

Industry feed flow:

1. Client portal calls `/api/industry-updates/sync`.
2. Server pulls official external sources.
3. New items insert into `public.industry_updates`.
4. Server route returns official live feed items to the client portal.

## 4. Database Structure

Core tables in current use:

- `public.clients`
- `public.profiles`
- `public.uploads`
- `public.audit_logs`
- `public.industry_updates`

### `public.clients`

Purpose:

- one row per physician / practice client portal identity

Important fields:

- `id`
- `clinic_name`
- `physician_name`
- `practice_name`
- `address`
- `individual_npi`
- `contact_email`
- `display_name`
- legacy `contact_name` may still exist in your table

### `public.profiles`

Purpose:

- maps authenticated users to app roles and client records

Important fields:

- `id`
- `email`
- `role`
- `client_id`
- `full_name`
- `created_at`

Role behavior:

- `admin` users should usually have `client_id = null`
- `client` users should point to the correct `clients.id`

### `public.uploads`

Purpose:

- stores uploaded file metadata

Important fields used by the app:

- `id`
- `client_id`
- `uploaded_by`
- `file_name`
- `file_path`
- `file_size`
- `file_type`
- `clinic_name`
- `category`
- `patient_reference`
- `notes`
- `status`
- `created_at`

### `public.audit_logs`

Purpose:

- admin actions such as status changes, note updates, and deletes

Important fields:

- `id`
- `user_id`
- `user_email`
- `action`
- `upload_id`
- `file_name`
- `details`
- `created_at`

### `public.industry_updates`

Purpose:

- stores official-source healthcare update items displayed in client portal

Important fields:

- `id`
- `title`
- `summary`
- `topic`
- `source_name`
- `source_url`
- `audience`
- `is_published`
- `published_at`
- `created_at`

## 5. Key SQL Queries

### Add client-provider identity fields

```sql
alter table public.clients
  add column if not exists physician_name text,
  add column if not exists practice_name text,
  add column if not exists address text,
  add column if not exists individual_npi text,
  add column if not exists contact_email text,
  add column if not exists display_name text;
```

### List client records

```sql
select id, clinic_name, contact_email
from public.clients
order by clinic_name;
```

### List profiles

```sql
select id, email, role, client_id
from public.profiles
order by email;
```

### Link client users to the correct client row

```sql
update public.profiles
set client_id = 'PUT_CLIENT_ID_HERE'
where email = 'client@example.com';
```

### Clear admin client link

```sql
update public.profiles
set client_id = null
where email = 'admin@example.com'
  and role = 'admin';
```

### Create industry feed table

```sql
create table if not exists public.industry_updates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  topic text,
  source_name text,
  source_url text,
  audience text not null default 'client',
  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
```

### Create chat messages table

```sql
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  sender_user_id uuid references auth.users(id) on delete set null,
  sender_role text,
  sender_email text,
  body text not null,
  created_at timestamptz not null default now()
);
```

### Enable RLS on messages

```sql
alter table public.messages enable row level security;
```

### Client read policy for messages

```sql
create policy "clients can read their own messages"
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'client'
      and profiles.client_id = messages.client_id
  )
);
```

### Client insert policy for messages

```sql
create policy "clients can insert their own messages"
on public.messages
for insert
to authenticated
with check (
  sender_role = 'client'
  and sender_user_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'client'
      and profiles.client_id = messages.client_id
  )
);
```

### Admin read policy for messages

```sql
create policy "admins can read all messages"
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);
```

### Admin insert policy for messages

```sql
create policy "admins can insert all messages"
on public.messages
for insert
to authenticated
with check (
  sender_role = 'admin'
  and sender_user_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);
```

### Verify chat RLS

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename = 'messages';
```

```sql
select policyname, permissive, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'messages'
order by policyname;
```

### Optional profile auto-create trigger

This is recommended so future users added in Supabase Auth automatically get a matching `public.profiles` row.

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, client_id, full_name)
  values (
    new.id,
    new.email,
    'client',
    null,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
```

```sql
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

Important note:

- this trigger defaults all new users to `role = 'client'`
- after creating a new admin user, update that row manually to `role = 'admin'`
- after creating a new client user, set the correct `client_id`

### Example QA user inserts when profiles are not auto-created

```sql
insert into public.profiles (id, email, role, client_id)
values
  ('PASTE_QA_CLIENT_AUTH_USER_ID', 'qa.client@amerytechnet.com', 'client', '78215985-709e-488d-aefa-02bdf4aec604'),
  ('PASTE_QA_ADMIN_AUTH_USER_ID', 'qa.admin@amerytechnet.com', 'admin', null);
```

## 6. Packaging And Deployment

### Local commands

Mac or Linux:

```bash
npm install
npm run dev
npm run lint
npm run build
npm run start
```

Windows Command Prompt:

```bat
npm install
npm run dev
npm run lint
npm run build
npm run start
```

Windows PowerShell:

```powershell
npm install
npm run dev
npm run lint
npm run build
npm run start
```

### Required environment variables

Your production or local `.env.local` should include:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
UPLOAD_NOTIFY_TO=...
UPLOAD_NOTIFY_FROM=...
```

Recommended sender after Resend verification:

- `UPLOAD_NOTIFY_FROM=noreply@send.amerytechnet.com`

### Current hosting note

This app is a Next.js application. It should be deployed to a host that supports Node.js runtime for server routes such as:

- `/api/notify-upload`
- `/api/industry-updates/sync`

If SmarterASP is used, confirm the hosting plan supports:

- Node.js app hosting
- environment variables
- long-running server-side app process or supported Node deployment model

If the hosting plan only supports static file hosting, the API routes will not work.

### What to package for deployment

Deploy the project folder contents, not just a few pages:

- `app/`
- `components/`
- `lib/`
- `public/`
- `docs/`
- `package.json`
- `package-lock.json`
- `next.config.ts`
- `tsconfig.json`
- `postcss.config.mjs`
- `eslint.config.mjs`

Do not deploy:

- `node_modules/`
- `.next/`
- local Mac files like `.DS_Store`

### Suggested deployment sequence

1. Make sure local `npm run build` passes.
2. Confirm Supabase tables, storage bucket, RLS policies, and Realtime are enabled.
3. Confirm Resend DNS is verified.
4. Set production environment variables on the host.
5. Upload / publish the project.
6. Install dependencies on the host.
7. Start the app.
8. Test client login, admin login, upload flow, chat flow, and live feed.

## 7. Adding New Clients And Users

### Add a new physician / practice

1. Insert a row in `public.clients`
2. Include:
   - `clinic_name`
   - `practice_name`
   - `physician_name`
   - `address`
   - `individual_npi`
   - `contact_email`
   - optional `display_name`
3. Create the user in Supabase Authentication.
4. Make sure a row exists in `public.profiles`.
5. Set:
   - `role = 'client'`
   - `client_id = clients.id`

Example:

```sql
insert into public.clients (
  clinic_name,
  practice_name,
  physician_name,
  address,
  individual_npi,
  contact_email,
  display_name
) values (
  'NEW PRACTICE',
  'NEW PRACTICE',
  'Dr. Example Physician',
  '123 Main St, City, ST ZIP',
  '1234567890',
  'example@clinic.com',
  'Dr. Example Physician'
);
```

### Add a new admin

1. Create the user in Supabase Authentication
2. Make sure a row exists in `public.profiles`
3. Set:
   - `role = 'admin'`
   - `client_id = null`

Example:

```sql
update public.profiles
set role = 'admin',
    client_id = null
where lower(email) = lower('new.admin@amerytechnet.com');
```

## 8. Residual Production Items

These are the main items still worth completing before final production rollout:

- finish Resend DNS verification for email notifications
- confirm final production hosting model for Next.js server routes
- add the profile auto-create trigger in Supabase
- create a reusable QA test account set
- perform final browser testing on desktop and mobile
- optionally restore richer upload email success wording after Resend is verified

## 9. Chat Retention And Archive Policy

### Recommended UI history window

For performance and readability, the portal should not try to render unlimited chat history in the first screen load.

Recommended starting point:

- client portal: load latest `100-150` messages
- admin portal: load latest `200-300` messages

Later enhancement options:

- `Load older messages` button
- server-side pagination
- search by client, sender, or patient reference

### Recommended live retention

Recommended starting rule:

- keep all chat messages in `public.messages` for `12 months`

This gives office staff and admins enough recent operational context for:

- upload clarifications
- billing follow-up
- missing-document conversations
- insurance card and face sheet questions

### Recommended archive retention

Recommended archive rule:

- move messages older than `12 months` into `public.messages_archive`
- retain archive for `3-7 years`

Suggested business choice:

- active table: `12 months`
- archive table: `7 years`

### Example archive table

```sql
create table if not exists public.messages_archive (
  id uuid primary key,
  client_id uuid,
  sender_user_id uuid,
  sender_role text,
  sender_email text,
  body text,
  created_at timestamptz not null,
  archived_at timestamptz not null default now()
);
```

### Example archive workflow

First copy old rows into archive:

```sql
insert into public.messages_archive (
  id,
  client_id,
  sender_user_id,
  sender_role,
  sender_email,
  body,
  created_at
)
select
  id,
  client_id,
  sender_user_id,
  sender_role,
  sender_email,
  body,
  created_at
from public.messages
where created_at < now() - interval '365 days'
on conflict (id) do nothing;
```

Then remove archived rows from the live table:

```sql
delete from public.messages
where created_at < now() - interval '365 days';
```

### Operational safeguards

Before enabling archive cleanup in production:

- verify archive insert completed successfully
- test on a small batch first
- confirm admin users do not need those rows in the live thread view
- export or back up old rows before first large archive run

### Future enhancement ideas

- add `Load older messages` in admin and client chat
- add archived thread search in admin
- add export by client or date range
- add scheduled archive job through database automation or host scheduler

### Remove old manual seed feed items

```sql
delete from public.industry_updates
where source_url is null
  and source_name ilike 'AmeryMed%';
```

### Preview uploads for a specific client

```sql
select id, file_name, file_path, created_at
from public.uploads
where client_id = 'PUT_CLIENT_ID_HERE'
order by created_at desc;
```

### Delete uploads for a specific client

```sql
delete from public.uploads
where client_id = 'PUT_CLIENT_ID_HERE';
```

## 6. Environment Variables

Current app expects these in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `ADMIN_NOTIFICATION_EMAIL`
- `FROM_EMAIL`
- `RESEND_API_KEY`

Recommended note:

- `SUPABASE_SERVICE_ROLE_KEY` should stay server-side only
- never expose it in browser code or share it publicly

## 7. Running the App

### On macOS

Requirements:

- Node.js 20+ recommended
- npm

Commands:

```bash
cd /Users/amerytech/Downloads/amerymed-web
npm install
npm run dev
```

Open:

- `http://localhost:3000`

Other useful commands:

```bash
npm run lint
npm run build
npm run start
```

### On Windows or Linux

Requirements:

- Node.js 20+ recommended
- npm

Commands:

```bash
cd path/to/amerymed-web
npm install
npm run dev
```

Open:

- `http://localhost:3000`

Production-style local run:

```bash
npm run build
npm run start
```

## 8. Where the Enhanced Code Is

Main enhanced code files:

- `/Users/amerytech/Downloads/amerymed-web/app/client/page.tsx`
- `/Users/amerytech/Downloads/amerymed-web/app/client/client-portal.module.css`
- `/Users/amerytech/Downloads/amerymed-web/app/admin/page.tsx`
- `/Users/amerytech/Downloads/amerymed-web/app/admin/login/page.tsx`
- `/Users/amerytech/Downloads/amerymed-web/app/client/login/page.tsx`
- `/Users/amerytech/Downloads/amerymed-web/components/portal-login-shell.tsx`
- `/Users/amerytech/Downloads/amerymed-web/components/portal-login-shell.module.css`
- `/Users/amerytech/Downloads/amerymed-web/components/admin-files.tsx`
- `/Users/amerytech/Downloads/amerymed-web/components/admin-files.module.css`
- `/Users/amerytech/Downloads/amerymed-web/components/admin-audit-log.tsx`
- `/Users/amerytech/Downloads/amerymed-web/components/admin-dashboard.module.css`
- `/Users/amerytech/Downloads/amerymed-web/app/api/notify-upload/route.ts`
- `/Users/amerytech/Downloads/amerymed-web/app/api/industry-updates/sync/route.ts`
- `/Users/amerytech/Downloads/amerymed-web/lib/industry-updates.ts`
- `/Users/amerytech/Downloads/amerymed-web/lib/supabase-admin.ts`

## 9. Hosting and Mobile

### Desktop + mobile

This app is already a responsive web app.

That means:

- one deployed web app serves desktop browsers
- the same deployed web app serves mobile browsers on Apple and Android

You do **not** need separate source code for desktop and mobile browser use.

### Hosting on SmarterASP

Because this is a Next.js app with server routes, the host must support:

- Node.js runtime
- environment variables
- server-side execution

If your SmarterASP plan supports Node.js deployment, then yes, it can host the web app.

Deployment requirements:

1. Upload the code or deploy from git
2. Run `npm install`
3. Run `npm run build`
4. Start with `npm run start`
5. Configure environment variables in hosting

Important:

- if you want the industry feed sync and email notifications to work in production, the environment variables must be configured on the host

### What about a true mobile app?

If later you want an App Store / Play Store app, you have 3 choices:

- keep this as a responsive website only
- wrap it as a PWA
- build a native/hybrid mobile app later

For now, the responsive website is enough for both Apple and Android browsers.

## 10. Future Enhancements

### Add a new physician / client

1. Insert a new row in `public.clients`
2. Create a new Supabase Auth user
3. Create or update that user’s `public.profiles` row
4. Set `profiles.role = 'client'`
5. Set `profiles.client_id = clients.id`
6. Test login and upload

### Add a new admin user

1. Create a new Supabase Auth user
2. Create or update the `public.profiles` row
3. Set `role = 'admin'`
4. Keep `client_id = null`

### Add a new feature

Recommended process:

1. Identify whether it is:
   - UI only
   - DB change
   - API route
   - external integration
2. Update schema first if needed
3. Add the UI and server code
4. Test in `npm run dev`
5. Run:

```bash
npm run lint
npm run build
```

6. Verify with real app logins

### Add new live feed sources

Current official sources:

- FDA MedWatch
- NIH News Releases
- CMS Newsroom

To add more:

1. Update `lib/industry-updates.ts`
2. Add a new source definition
3. If needed, add a parser for that source format
4. Re-run sync
5. Confirm items are inserted into `public.industry_updates`

### Add client-admin messaging later

Recommended shape:

- create `messages` table
- link by `client_id`
- use Supabase Realtime
- show conversation panel in client portal
- show operations inbox in admin portal

## 11. Operational Notes

- Email notification is still pending final Resend domain verification
- Upload success emails depend on:
  - correct Resend sender domain
  - `RESEND_API_KEY`
  - `FROM_EMAIL`
  - `ADMIN_NOTIFICATION_EMAIL`
- Industry feed now uses official source-backed sync instead of only manual items

## 12. Recommended Next Documentation Step

Later, it would be useful to add:

- an ER diagram for the tables
- an admin operations playbook
- a deployment checklist for SmarterASP production
- a QA test checklist
