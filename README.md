# ReviewFlow

ReviewFlow is a production-ready Next.js SaaS application for QR-powered customer feedback and Google review flows. Customers provide their own experience details, receive AI-assisted review options based only on that input, tap one to copy it, and then open the business's configured Google review page.

## Architecture

- Next.js App Router with Server Components by default and Client Components for forms, charts, QR previews and clipboard actions.
- Supabase Auth, PostgreSQL, Storage and RLS for owner/admin/public data separation.
- Feature modules under `src/features/*`; shared infrastructure under `src/lib/*`.
- Server-side admin utilities use `SUPABASE_SERVICE_ROLE_KEY` only after server authorization checks.
- AI review rewriting is behind `/api/ai/review-draft` with OpenRouter support, rate limiting, grounding checks and usage logging.
- Admins can edit the review-generation style prompt in `/admin/settings`; fixed server-side safety rules still prevent fabricated review details.

## Database

Apply the migrations in `supabase/migrations`, then `supabase/seed.sql`.

The migration creates:

- `profiles`, `businesses`, `qr_campaigns`, `visitor_sessions`, `analytics_events`, `customer_feedback`, `ai_usage_logs`, `audit_logs`, `platform_settings`
- `app_private` helper functions for `is_admin`, `owns_business`, campaign access and public activity checks
- RLS policies for owner isolation, admin reads, public-only inserts and storage logo access

## Setup

1. Copy `.env.example` to `.env.local` and fill in Supabase, OpenRouter and security values.
2. Apply the Supabase migration and seed file.
3. Create an admin by either setting `raw_app_meta_data.role = "admin"` for a Supabase Auth user or adding the email to `ADMIN_EMAIL_ALLOWLIST`.
4. Run:

```bash
npm install
npm run dev
```

For OpenRouter, set:

```bash
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=provider/model-name
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1/chat/completions
OPENROUTER_SITE_URL=https://your-app-domain.com
OPENROUTER_APP_NAME=ReviewFlow
```

## Validation

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Set `E2E_APP_URL` to a seeded deployment before running `npm run test:e2e`.

## Security Notes

- Service-role credentials are used only in server-only modules and route handlers.
- Open redirects are blocked; Google redirects are always read from the validated stored business URL.
- Raw IP addresses are not stored by default. IPs are salted and hashed for rate limiting.
- Google redirect analytics are labeled as "Opened Google review page", not published reviews.
- AI must preserve sentiment and must not invent facts; local tests cover grounding and low-rating preservation.
