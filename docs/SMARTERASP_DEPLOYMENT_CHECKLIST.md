# SmarterASP Production Deployment Checklist

Use this checklist when preparing the AmeryMed app for production deployment.

## Pre-Deployment

- Confirm local code lives in `/Users/amerytech/Downloads/amerymed-web`
- Run `npm run lint`
- Run `npm run build`
- Confirm latest portal UI changes are present locally
- Confirm client upload flow works with QA users
- Confirm admin dashboard works with QA admin user
- Confirm chat works both ways
- Confirm live feed displays official-source items

## Supabase

- `public.clients` contains all required live client rows
- `public.profiles` maps each live login to the correct role
- `public.uploads` table exists and works
- `public.audit_logs` table exists and works
- `public.industry_updates` table exists and works
- `public.messages` table exists and works
- Realtime enabled on `public.messages`
- Storage bucket `client-documents` exists
- RLS policies verified for uploads, chat, and admin flows
- Optional profile auto-create trigger installed

## Resend

- Domain or subdomain added in Resend
- DKIM verified
- SPF verified
- MX verified
- `UPLOAD_NOTIFY_FROM` matches the verified sending domain
- Test upload email successfully sends

## Hosting

- Confirm SmarterASP plan supports Node.js / Next.js runtime
- Add production environment variables
- Publish the application files
- Install dependencies on host
- Start the app successfully
- Verify API routes work in production

## Production Smoke Test

- Open `/client/login`
- Sign in as a client
- Upload a sample file
- Confirm file appears in admin dashboard
- Confirm audit behavior still works
- Send client-to-admin chat message
- Reply from admin to client
- Confirm live feed loads
- Confirm logout returns to correct login page

