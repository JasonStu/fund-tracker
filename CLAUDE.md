# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

```bash
npm run dev       # Start development server (http://localhost:3000)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
rm -rf .next     # Clear Turbopack cache (fixes 404/stall issues)
```

## Tech Stack

- **Framework**: Next.js 16.1.6 with App Router
- **UI**: React 19, Tailwind CSS 4
- **Auth**: Supabase (SSR, Auth, RLS policies)
- **i18n**: next-intl (locales: `en`, `zh`; default: `zh`)
- **External APIs**: Feishu (Lark) Bitable integration

## Architecture

### Route Groups

```
src/app/
├── (auth)/          # Public auth pages (login, register)
├── (dashboard)/     # Protected pages (dashboard, editor, admin)
└── api/            # API routes
```

### Authentication

- Invitation code required for registration
- Role-based access: `user_profiles.role` (admin/user)
- Admin routes: `/admin` - requires admin role
- Session managed via Supabase SSR cookies

### Database (Supabase)

Tables in `supabase/setup.sql`:
- `user_profiles`: User roles, links to `auth.users`
- `invitation_codes`: Registration codes

RLS: Use `public.is_admin()` security definer function for admin checks (avoids recursion).

### Feishu Integration

Stock data flow: `/editor` page → text parser → Feishu Bitable API. See `README.md` for field mapping and troubleshooting.

## i18n

Locale stored in `NEXT_LOCALE` cookie (no URL prefix). Translation files in `/messages/` (`en.json`, `zh.json`).
