# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

```bash
npm run dev       # Start development server (http://localhost:3000)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
rm -rf .next     # Clear Turbopack cache (fixes 404/stall issues)
NEXT_TURBOPACK=0 npm run dev  # Disable Turbopack if it crashes
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
│   ├── page.tsx    # Main dashboard with fund/stock portfolio
│   ├── editor/     # Feishu Bitable stock editor
│   ├── admin/      # Admin panel for invitation codes
│   └── fund/[code]/ # Fund detail page
├── api/            # API routes
│   ├── user-funds/ # Portfolio management (positions, transactions)
│   ├── search/     # Fund/stock search
│   └── feishu/    # Feishu integration
└── middleware.ts   # Auth & i18n middleware
```

### Database (Supabase)

Tables in `supabase/setup.sql`:

- `user_profiles`: User roles (admin/user), links to `auth.users`
- `invitation_codes`: Registration invitation codes
- `user_funds`: User holdings (funds/stocks) with type field
- `fund_transactions`: Buy/sell transaction records

Key columns for portfolio:
- `user_funds.type`: 'fund' or 'stock' (added via migration `002_add_type_column.sql`)
- `fund_transactions.type`: 'fund' or 'stock'

RLS: Use `public.is_admin()` security definer function for admin checks (avoids recursion).

### API Routes

| Endpoint | Description |
|----------|-------------|
| `GET /api/user-funds` | Fetch user's positions and transactions |
| `POST /api/user-funds` | Add new position |
| `PUT /api/user-funds/sort` | Update position order |
| `DELETE /api/user-funds/positions/[id]` | Delete position |
| `POST /api/user-funds/transactions` | Add buy/sell transaction |
| `GET /api/search?q=xxx` | Search funds and stocks |

## Features

### Dashboard (/)
- Left panel: Fund holdings with NAV, shares, cost, profit
- Right panel: Stock holdings with price, shares, profit
- Top overview: Total value, fund value, stock value, total profit
- Drag-and-drop sorting (separate for funds/stocks)
- Real-time price updates

### Feishu Integration (/editor)
- Paste stock info text → Parse → Submit to Feishu Bitable
- Field mapping: code, name, sector, price range, strategy, support, position, highlights

## i18n

Locale stored in `NEXT_LOCALE` cookie (no URL prefix). Translation files in `/messages/` (`en.json`, `zh.json`).

## Authentication

- Invitation code required for registration
- Role-based access: `user_profiles.role` (admin/user)
- Admin routes: `/admin` - requires admin role
- Session managed via Supabase SSR cookies

## Vercel Deployment

```bash
vercel login
vercel link
vercel --prod
```

Required environment variables on Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`

## Troubleshooting

### Turbopack crashes
```bash
rm -rf .next
NEXT_TURBOPACK=0 npm run dev
```

### Admin permission issues
Run in Supabase SQL Editor:
```sql
update public.user_profiles set role = 'admin' where email = 'your@email.com';
```

### Middleware/Proxy issues (Next.js 16)
Use `middleware.ts` instead of `proxy.ts` for locale routing with next-intl.

### Database migration
Apply `supabase/migrations/002_add_type_column.sql` to add stock support:
```sql
alter table public.user_funds add column if not exists type varchar(10) default 'fund';
alter table public.fund_transactions add column if not exists type varchar(10) default 'fund';
```
