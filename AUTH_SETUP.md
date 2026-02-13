# Supabase Authentication Setup Guide

This document describes how to set up Supabase authentication for the Fund Tracker project.

## Prerequisites

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and API keys from Settings > API

## Setup Steps

### 1. Configure Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_admin_password
```

### 2. Set Up Database

Run the SQL script in Supabase SQL Editor:

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and run the contents of `supabase/setup.sql`

This will create:
- `user_profiles` table with role management
- `invitation_codes` table for invite codes
- Row Level Security (RLS) policies
- Auto-profile creation on signup

### 3. Set Up Admin User

After the admin user is created through registration:

1. Get the user ID from Supabase Dashboard > Authentication > Users
2. Run this SQL to make them admin:

```sql
update public.user_profiles
set role = 'admin'
where email = 'admin@example.com';
```

### 4. Configure Email Templates (Optional)

In Supabase Dashboard > Authentication > Templates:

1. **Confirm Email**: Customize the confirmation email template
2. **Reset Password**: Customize the password reset email template

## Usage Flow

### For Admins

1. Go to `/login` and sign in with admin credentials
2. Navigate to `/admin` to create invitation codes
3. Share the code with users

### For Users

1. Visit `/register`
2. Enter the invitation code
3. Fill in email and password
4. Click to create account
5. Login at `/login`

## Project Structure

```
fund-tracker/
├── src/
│   ├── lib/
│   │   └── supabase.ts         # Supabase client configuration
│   ├── contexts/
│   │   └── AuthContext.tsx     # Authentication state management
│   ├── types/
│   │   └── auth.ts             # Auth type definitions
│   ├── app/
│   │   ├── api/auth/
│   │   │   ├── login/route.ts         # User login
│   │   │   ├── register/route.ts      # User registration
│   │   │   ├── validate-code/route.ts  # Validate invitation code
│   │   │   └── invitations/          # Invitation management API
│   │   │       ├── route.ts
│   │   │       └── [id]/route.ts
│   │   └── [locale]/
│   │       ├── login/page.tsx         # Login page
│   │       ├── register/page.tsx      # Registration page
│   │       ├── admin/page.tsx          # Admin invitation management
│   │       └── page.tsx               # Dashboard (protected)
│   └── middleware.ts            # Route protection
├── supabase/
│   └── setup.sql                # Database schema
└── messages/                   # i18n translations
```

## Security Features

- **Invitation-only registration**: Users must have a valid invitation code
- **Role-based access control**: Only admins can create/view invitation codes
- **Row Level Security**: Database-level access control
- **Protected routes**: Middleware redirects unauthenticated users

## Troubleshooting

### User can't login

1. Check that the user has a profile in `public.user_profiles`
2. Verify the user signed up with email/password (not magic link)

### Invitation code not working

1. Check if the code is active: `is_active = true`
2. Check if expired: `expires_at` is in the future
3. Check if already used: `used_by` is not null

### RLS Policy Errors

1. Make sure RLS is enabled on both tables
2. Check that policies are created correctly
3. Ensure service role key is used only in server-side code
