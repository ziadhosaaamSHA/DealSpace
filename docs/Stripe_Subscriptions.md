# Stripe Subscriptions: Implementation Guide

This document explains how subscriptions are implemented end-to-end (backend and frontend) and how to modify plans, flows, and related behaviors.

---

## High-level Architecture

- Billing is tenant-based (one subscription per tenant).
- Laravel Cashier (Stripe) is used; the billable model is Tenant.
- Plan definitions are read from configuration and exposed via API.
- Upgrades may require a new Stripe Checkout session; downgrades apply at period end without proration.
- Webhooks keep local subscription records in sync with Stripe.
- The frontend uses RTK Query endpoints to manage subscription lifecycle, billing portal, invoices, and usage.

---

## Data Model and Migrations

- Tenant billing columns:
  - [dealspace_api-main/database/migrations/2025_10_15_000001_add_stripe_fields_to_tenants_table.php](dealspace_api-main/database/migrations/2025_10_15_000001_add_stripe_fields_to_tenants_table.php)
- Tenant-based subscriptions:
  - [dealspace_api-main/database/migrations/2025_10_15_000002_update_subscriptions_for_tenants.php](dealspace_api-main/database/migrations/2025_10_15_000002_update_subscriptions_for_tenants.php)
- Usage snapshots per-tenant:
  - [dealspace_api-main/database/migrations/2025_10_15_000003_update_subscription_usage_for_tenants.php](dealspace_api-main/database/migrations/2025_10_15_000003_update_subscription_usage_for_tenants.php)

Models:
- Tenant (Billable, owns subscriptions)
  - [dealspace_api-main/app/Models/Tenant.php](dealspace_api-main/app/Models/Tenant.php)
  - Key helpers: [`App\Models\Tenant::hasActiveSubscription`](dealspace_api-main/app/Models/Tenant.php), [`App\Models\Tenant::currentPlan`](dealspace_api-main/app/Models/Tenant.php), [`App\Models\Tenant::owner`](dealspace_api-main/app/Models/Tenant.php)
- Subscription (extends Cashier Subscription)
  - [dealspace_api-main/app/Models/Subscription.php](dealspace_api-main/app/Models/Subscription.php)

Cashier setup (Billable on Tenant):
- [dealspace_api-main/app/Providers/AppServiceProvider.php](dealspace_api-main/app/Providers/AppServiceProvider.php) sets `Cashier::useCustomerModel(Tenant::class)` in `boot()`.

---

## Backend

### Configuration

Plans are defined in config. Code reads both `config('plans')` and `config('subscriptions.plans')`. Keep these consistent or consolidate.

- Primary API exposure uses `config('plans')`:
  - Referenced by [`App\Http\Controllers\Api\SubscriptionController::plans`](dealspace_api-main/app/Http/Controllers/Api/SubscriptionController.php)
- Feature-gating middleware references `config('subscriptions.plans')`:
  - [dealspace_api-main/config/subscriptions.php](dealspace_api-main/config/subscriptions.php)

Example plan entry (config/subscriptions.php):
```php
// filepath: /workspaces/DealSpace/dealspace_api-main/config/subscriptions.php
// ...existing code...
'plans' => [
    'pro' => [
        'name' => 'Pro Plan',
        'price_id' => env('STRIPE_PRO_PRICE_ID'),
        'price' => 29.99,
        'features' => [
            'Unlimited deals',
            // ...
        ],
    ],
],
// ...existing code...
```

Environment:
- STRIPE keys (Cashier): `STRIPE_KEY`, `STRIPE_SECRET`
- Price IDs: `STRIPE_BASIC_PRICE_ID`, `STRIPE_PRO_PRICE_ID`, `STRIPE_ENTERPRISE_PRICE_ID`
- Frontend URL for redirects: `APP_FRONTEND_URL` or `app.frontend_url` config used by service/controller

### Routes

- [dealspace_api-main/routes/api.php](dealspace_api-main/routes/api.php)
  - Subscriptions API (auth required):
    - GET `/subscriptions/plans` → [`SubscriptionController::plans`](dealspace_api-main/app/Http/Controllers/Api/SubscriptionController.php)
    - GET `/subscriptions/status` → [`SubscriptionController::status`](dealspace_api-main/app/Http/Controllers/Api/SubscriptionController.php)
    - POST `/subscriptions/subscribe` → [`SubscriptionController::subscribe`](dealspace_api-main/app/Http/Controllers/Api/SubscriptionController.php)
    - POST `/subscriptions/verify` → [`SubscriptionController::verifyCheckoutSession`](dealspace_api-main/app/Http/Controllers/Api/SubscriptionController.php)
    - POST `/subscriptions/cancel` → [`SubscriptionController::cancel`](dealspace_api-main/app/Http/Controllers/Api/SubscriptionController.php)
    - POST `/subscriptions/cancel-now` → [`SubscriptionController::cancelNow`](dealspace_api-main/app/Http/Controllers/Api/SubscriptionController.php)
    - POST `/subscriptions/resume` → [`SubscriptionController::resume`](dealspace_api-main/app/Http/Controllers/Api/SubscriptionController.php)
    - GET `/subscriptions/portal` → [`SubscriptionController::portalSession`](dealspace_api-main/app/Http/Controllers/Api/SubscriptionController.php)
    - GET `/subscriptions/invoices` → [`SubscriptionController::invoices`](dealspace_api-main/app/Http/Controllers/Api/SubscriptionController.php)
  - Stripe webhook (no auth): POST `/stripe/webhook` → [`WebhookController::handleWebhook`](dealspace_api-main/app/Http/Controllers/Api/WebhookController.php)

### Controllers and Services

Controller:
- [dealspace_api-main/app/Http/Controllers/Api/SubscriptionController.php](dealspace_api-main/app/Http/Controllers/Api/SubscriptionController.php)
  - [`::plans`](dealspace_api-main/app/Http/Controllers/Api/SubscriptionController.php) returns plans (from `config('plans')`)
  - [`::status`](dealspace_api-main/app/Http/Controllers/Api/SubscriptionController.php) returns current tenant subscription + permissions
  - [`::subscribe`](dealspace_api-main/app/Http/Controllers/Api/SubscriptionController.php) orchestrates new subscription or plan change
  - [`::verifyCheckoutSession`](dealspace_api-main/app/Http/Controllers/Api/SubscriptionController.php) confirms Checkout success and ensures webhook has synced
  - [`::cancel`](dealspace_api-main/app/Http/Controllers/Api/SubscriptionController.php) schedules cancel at period end
  - [`::cancelNow`](dealspace_api-main/app/Http/Controllers/Api/SubscriptionController.php) immediate cancel and DB cleanup
  - [`::resume`](dealspace_api-main/app/Http/Controllers/Api/SubscriptionController.php) resumes a canceled-at-period-end subscription
  - [`::portalSession`](dealspace_api-main/app/Http/Controllers/Api/SubscriptionController.php) returns Billing Portal URL
  - [`::invoices`](dealspace_api-main/app/Http/Controllers/Api/SubscriptionController.php) lists invoices for the tenant

Service:
- [dealspace_api-main/app/Services/Tenants/TenantSubscriptionService.php](dealspace_api-main/app/Services/Tenants/TenantSubscriptionService.php)
  - Tenant lookup, permissions, and subscription operations:
    - [`App\Services\Tenants\TenantSubscriptionService::getTenantFromUser`](dealspace_api-main/app/Services/Tenants/TenantSubscriptionService.php)
    - [`App\Services\Tenants\TenantSubscriptionService::getSubscriptionDetails`](dealspace_api-main/app/Services/Tenants/TenantSubscriptionService.php)
    - [`App\Services\Tenants\TenantSubscriptionService::createSubscription`](dealspace_api-main/app/Services/Tenants/TenantSubscriptionService.php): creates Stripe Checkout session for new subs
    - [`App\Services\Tenants\TenantSubscriptionService::changePlan`](dealspace_api-main/app/Services/Tenants/TenantSubscriptionService.php): upgrade via Checkout (immediate), downgrade in-place (no proration)
    - Cancel/resume helpers, immediate cancellation with safe DB deletion
  - Interface: [dealspace_api-main/app/Services/Tenants/TenantSubscriptionServiceInterface.php](dealspace_api-main/app/Services/Tenants/TenantSubscriptionServiceInterface.php)

Webhooks:
- [dealspace_api-main/app/Http/Controllers/Api/WebhookController.php](dealspace_api-main/app/Http/Controllers/Api/WebhookController.php)
  - Extends Cashier webhook controller
  - Handles:
    - [`::handleCheckoutSessionCompleted`](dealspace_api-main/app/Http/Controllers/Api/WebhookController.php)
    - [`::handleCustomerSubscriptionCreated`](dealspace_api-main/app/Http/Controllers/Api/WebhookController.php)
    - [`::handleCustomerSubscriptionUpdated`](dealspace_api-main/app/Http/Controllers/Api/WebhookController.php)
    - [`::handleCustomerSubscriptionDeleted`](dealspace_api-main/app/Http/Controllers/Api/WebhookController.php)
    - [`::handleCustomerDeleted`](dealspace_api-main/app/Http/Controllers/Api/WebhookController.php)
  - Syncs local DB:
    - [`::syncSubscription`](dealspace_api-main/app/Http/Controllers/Api/WebhookController.php)
    - [`::syncSubscriptionForTenant`](dealspace_api-main/app/Http/Controllers/Api/WebhookController.php)

### Feature Gating

Use middleware to enforce active subscription and optional plan requirement:
- [dealspace_api-main/app/Http/Middleware/CheckTenantSubscription.php](dealspace_api-main/app/Http/Middleware/CheckTenantSubscription.php)
  - [`App\Http\Middleware\CheckTenantSubscription::handle`](dealspace_api-main/app/Http/Middleware/CheckTenantSubscription.php) checks active subscription and validates plan against `config('subscriptions.plans')`.

Apply middleware on routes that require billing.

---

## Frontend

APIs (RTK Query):
- [dealspace_user_panel-main/src/features/subscriptions/subscriptionApi.ts](dealspace_user_panel-main/src/features/subscriptions/subscriptionApi.ts)
  - Endpoints:
    - getPlans → GET `/subscriptions/plans`
    - getTenantStatus → GET `/subscriptions/status`
    - getUsage → GET `/subscriptions/usage`
    - subscribe → POST `/subscriptions/subscribe`
    - verifyCheckoutSession → POST `/subscriptions/verify`
    - cancelSubscription → POST `/subscriptions/cancel`
    - cancelNowSubscription → POST `/subscriptions/cancel-now`
    - resumeSubscription → POST `/subscriptions/resume`
    - getPortalSession → GET `/subscriptions/portal`
    - getInvoices → GET `/subscriptions/invoices`
  - Hooks exported: [`useGetPlansQuery`](dealspace_user_panel-main/src/features/subscriptions/subscriptionApi.ts), [`useGetTenantStatusQuery`](dealspace_user_panel-main/src/features/subscriptions/subscriptionApi.ts), [`useSubscribeMutation`](dealspace_user_panel-main/src/features/subscriptions/subscriptionApi.ts), [`useVerifyCheckoutSessionMutation`](dealspace_user_panel-main/src/features/subscriptions/subscriptionApi.ts), [`useCancelSubscriptionMutation`](dealspace_user_panel-main/src/features/subscriptions/subscriptionApi.ts), [`useCancelNowSubscriptionMutation`](dealspace_user_panel-main/src/features/subscriptions/subscriptionApi.ts), [`useResumeSubscriptionMutation`](dealspace_user_panel-main/src/features/subscriptions/subscriptionApi.ts), [`useGetPortalSessionMutation`](dealspace_user_panel-main/src/features/subscriptions/subscriptionApi.ts), [`useGetInvoicesQuery`](dealspace_user_panel-main/src/features/subscriptions/subscriptionApi.ts)

Store integration:
- [dealspace_user_panel-main/src/app/store.ts](dealspace_user_panel-main/src/app/store.ts) registers `subscriptionApi.reducer` and middleware.

UI:
- Subscription management (choose/switch plans, launch Checkout):
  - [dealspace_user_panel-main/src/features/subscriptions/SubscriptionManagement.tsx](dealspace_user_panel-main/src/features/subscriptions/SubscriptionManagement.tsx)
- Subscription and usage dashboard (status, usage, portal, invoices, cancel/resume):
  - [dealspace_user_panel-main/src/features/subscriptions/SubscriptionUsage.tsx](dealspace_user_panel-main/src/features/subscriptions/SubscriptionUsage.tsx)
- Checkout verification (success return URL):
  - [dealspace_user_panel-main/src/features/subscriptions/VerifySubscription.tsx](dealspace_user_panel-main/src/features/subscriptions/VerifySubscription.tsx)

Flow:
1. User selects plan in SubscriptionManagement → calls `subscribe`.
2. If `action === 'checkout'`, redirect to `data.checkout_url` (Stripe Checkout).
3. Success URL redirects to `/subscriptions/verify?session_id=...`; the app loads [`VerifySubscription`](dealspace_user_panel-main/src/features/subscriptions/VerifySubscription.tsx), calls `verifyCheckoutSession`.
4. Webhooks create/update local subscription; verify endpoint polls for consistency.
5. User manages billing via Billing Portal button in [`SubscriptionUsage`](dealspace_user_panel-main/src/features/subscriptions/SubscriptionUsage.tsx).

---

## Common Tasks

### Add or change a plan

- Update config used by backend and UI:
  - If using `config('plans')`, adjust `config/plans.php` (ensure it exists and matches shape returned by `SubscriptionController::plans`).
  - If gating features via `config('subscriptions.plans')`, also mirror updates in [dealspace_api-main/config/subscriptions.php](dealspace_api-main/config/subscriptions.php).
- Ensure `.env` includes the Stripe price ID for the plan (e.g., `STRIPE_ENTERPRISE_PRICE_ID`).
- Frontend automatically consumes `/subscriptions/plans` for display.

Example new plan:
```php
// filepath: /workspaces/DealSpace/dealspace_api-main/config/subscriptions.php
// ...existing code...
'plans' => [
    // ...existing code...
    'starter' => [
        'name' => 'Starter Plan',
        'price_id' => env('STRIPE_STARTER_PRICE_ID'),
        'price' => 14.99,
        'features' => [
            'Feature A',
            'Feature B',
        ],
    ],
],
// ...existing code...
```

### Gate a feature by plan

Apply middleware with optional plan parameter:
```php
// filepath: /workspaces/DealSpace/dealspace_api-main/routes/api.php
// ...existing code...
Route::middleware(['auth:sanctum', 'tenant.subscription:pro'])->group(function () {
    // Routes requiring active Pro plan
});
// ...existing code...
```
- Enforced by [`App\Http\Middleware\CheckTenantSubscription::handle`](dealspace_api-main/app/Http/Middleware/CheckTenantSubscription.php).

### Change upgrade/downgrade behavior

- Logic lives in:
  - [`App\Services\Tenants\TenantSubscriptionService::changePlan`](dealspace_api-main/app/Services/Tenants/TenantSubscriptionService.php)
- Current rules:
  - Upgrade: create Stripe Checkout (immediate charge) and cancel old subscription if replacing.
  - Downgrade: update current subscription with `proration_behavior = 'none'`, effective next period.

### Cancel/resume

- Schedule cancel at period end: [`SubscriptionController::cancel`](dealspace_api-main/app/Http/Controllers/Api/SubscriptionController.php)
- Immediate cancel: [`SubscriptionController::cancelNow`](dealspace_api-main/app/Http/Controllers/Api/SubscriptionController.php) (cancels in Stripe and deletes local subscription + items in a transaction)
- Resume: [`SubscriptionController::resume`](dealspace_api-main/app/Http/Controllers/Api/SubscriptionController.php)

### Billing Portal & Invoices

- Billing Portal: [`SubscriptionController::portalSession`](dealspace_api-main/app/Http/Controllers/Api/SubscriptionController.php)
- Invoices: [`SubscriptionController::invoices`](dealspace_api-main/app/Http/Controllers/Api/SubscriptionController.php)
- Frontend UI/buttons in:
  - [dealspace_user_panel-main/src/features/subscriptions/SubscriptionUsage.tsx](dealspace_user_panel-main/src/features/subscriptions/SubscriptionUsage.tsx)

---

## Webhook Setup (Local)

1. Run the API server.
2. Use Stripe CLI to forward events:
```sh
# Install Stripe CLI if needed, then:
stripe listen --forward-to http://localhost:8000/api/stripe/webhook
```
- Handler: [`App\Http\Controllers\Api\WebhookController::handleWebhook`](dealspace_api-main/app/Http/Controllers/Api/WebhookController.php)

Verify logs in the IDE output/terminal for sync messages like “Subscription created/updated from webhook”.

---

## Permissions

Only owner/admin can manage subscriptions:
- Checked via service method [`App\Services\Tenants\TenantSubscriptionService::canManageSubscription`](dealspace_api-main/app/Services/Tenants/TenantSubscriptionServiceInterface.php) and enforced in controller actions.
- Frontend hides management buttons based on `status.data.can_manage`.

---

## Troubleshooting

- If Stripe customer was deleted, code auto-recreates and retries:
  - See customer verification/creation in [`TenantSubscriptionService::createSubscription`](dealspace_api-main/app/Services/Tenants/TenantSubscriptionService.php)
- If UI is stuck after checkout:
  - Verify webhooks are reaching the API.
  - Check [`SubscriptionController::verifyCheckoutSession`](dealspace_api-main/app/Http/Controllers/Api/SubscriptionController.php) logs for polling result.
- If plan checks fail:
  - Ensure `config('plans')` and `config('subscriptions.plans')` are in sync.
  - Confirm price IDs in `.env`.

---