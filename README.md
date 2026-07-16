# ReviewFlow

ReviewFlow is a production-ready Next.js SaaS application for QR-powered customer feedback and Google review flows. Customers provide their own experience details, receive AI-assisted review options based only on that input, tap one to copy it, and then open the business's configured Google review page.

## Architecture

- Next.js App Router with Server Components by default and Client Components for forms, charts, QR previews and clipboard actions.
- Supabase Auth, PostgreSQL, Storage and RLS for owner/admin/public data separation.
- Feature modules under `src/features/*`; shared infrastructure under `src/lib/*`.
- Server-side admin utilities use `SUPABASE_SERVICE_ROLE_KEY` only after server authorization checks.
- AI review rewriting is behind `/api/ai/review-draft` with OpenRouter support, rate limiting, grounding checks and usage logging.
- Admins can edit the review-generation style prompt in `/admin/settings`; fixed server-side safety rules still prevent fabricated review details.
- Paid access is managed through a provider abstraction with Razorpay Subscriptions as the initial provider. Local automated tests may set `BILLING_MOCK_MODE=true`; production startup rejects that setting.

## Database

Apply the migrations in `supabase/migrations`, then `supabase/seed.sql`.

The migrations create:

- `profiles`, `businesses`, `qr_campaigns`, `visitor_sessions`, `analytics_events`, `customer_feedback`, `ai_usage_logs`, `audit_logs`, `platform_settings`
- `app_private` helper functions for `is_admin`, `owns_business`, campaign access and public activity checks
- RLS policies for owner isolation, admin reads, public-only inserts and storage logo access
- `subscriptions`, `payment_transactions`, `billing_events`, `subscription_usage`, `onboarding_progress` and `entitlement_overrides`

## Setup

1. Copy `.env.example` to `.env.local` and fill in Supabase, OpenRouter, Razorpay Test Mode and security values. Never expose `SUPABASE_SECRET_KEY`, `RAZORPAY_KEY_SECRET` or `RAZORPAY_WEBHOOK_SECRET` to the browser.
2. Apply every migration in `supabase/migrations` in filename order, then apply `supabase/seed.sql`.
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
OPENROUTER_DATA_COLLECTION=deny
```

## Razorpay Test Mode

Create three monthly Plans in the Razorpay Dashboard Test Mode using the amounts in `src/config/plans.ts`. Put each returned Plan ID in `RAZORPAY_PLAN_STARTER_MONTHLY`, `RAZORPAY_PLAN_GROWTH_MONTHLY` and `RAZORPAY_PLAN_PRO_MONTHLY`. Set `NEXT_PUBLIC_RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` from the Test Mode API keys.

Configure the webhook endpoint as `${NEXT_PUBLIC_APP_URL}/api/webhooks/razorpay`, copy its secret to `RAZORPAY_WEBHOOK_SECRET`, and subscribe to: `subscription.authenticated`, `subscription.activated`, `subscription.charged`, `subscription.updated`, `subscription.pending`, `subscription.halted`, `subscription.paused`, `subscription.resumed`, `subscription.cancelled`, and `subscription.completed`.

The checkout sequence is: choose a plan → sign up or sign in → server-created Razorpay subscription → Standard Checkout → server-side HMAC verification → server-side subscription fetch → short polling on `/billing/processing` → onboarding. A browser success callback alone never grants access.

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
