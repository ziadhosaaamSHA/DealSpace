<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Tenants\TenantSubscriptionServiceInterface;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Exception;

class SubscriptionController extends Controller
{
    protected TenantSubscriptionServiceInterface $tenantService;

    public function __construct(TenantSubscriptionServiceInterface $tenantService)
    {
        $this->tenantService = $tenantService;
    }

    /**
     * Get available subscription plans.
     */
    public function plans(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => config('plans'),
        ]);
    }

    /**
     * Get current tenant subscription status.
     */
    public function status(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $tenant = $this->tenantService->getTenantFromUser($user);

            if (!$tenant) {
                return response()->json([
                    'success' => false,
                    'message' => 'User does not belong to a tenant',
                ], 403);
            }

            $details = $this->tenantService->getSubscriptionDetails($tenant);

            return response()->json([
                'success' => true,
                'data' => [
                    'tenant_id' => $tenant->id,
                    'subscribed' => $tenant->hasActiveSubscription(),
                    'plan' => $tenant->currentPlan(),
                    'can_manage' => $this->tenantService->canManageSubscription($user, $tenant),
                    'subscription' => $details ? $details['subscription'] : null,
                    'owner' => $details ? $details['owner'] : null,
                ],
            ]);
        } catch (Exception $e) {
            Log::error('Failed to get subscription status', [
                'user_id' => $request->user()->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve subscription status',
            ], 500);
        }
    }

    /**
     * Create new subscription or change existing plan.
     */
    public function subscribe(Request $request): JsonResponse
    {
        $request->validate([
            'plan' => 'required|string|in:basic,pro,enterprise',
        ]);

        try {
            $user = $request->user();
            $tenant = $this->tenantService->getTenantFromUser($user);

            if (!$tenant) {
                return response()->json([
                    'success' => false,
                    'message' => 'User does not belong to a tenant',
                ], 403);
            }

            // Check if user can manage subscriptions
            if (!$this->tenantService->canManageSubscription($user, $tenant)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only owners and admins can manage subscriptions',
                ], 403);
            }

            $planKey = $request->plan;

            // Case 1: No active subscription - create new one
            if (!$tenant->hasActiveSubscription()) {
                $checkoutUrl = $this->tenantService->createSubscription($tenant, $planKey);

                return response()->json([
                    'success' => true,
                    'action' => 'checkout',
                    'data' => [
                        'checkout_url' => $checkoutUrl,
                        'plan' => $planKey,
                    ],
                ]);
            }

            // Case 2: Has subscription - change plan
            $result = $this->tenantService->changePlan($tenant, $planKey);

            // If upgrade requires checkout, return checkout URL
            if (isset($result['requires_checkout']) && $result['requires_checkout']) {
                return response()->json([
                    'success' => true,
                    'action' => 'checkout',
                    'message' => $result['message'],
                    'data' => [
                        'checkout_url' => $result['checkout_url'],
                        'plan' => $planKey,
                    ],
                ]);
            }

            // Otherwise, return plan change result
            return response()->json([
                'success' => true,
                'action' => $result['action'],
                'message' => $result['message'],
                'data' => [
                    'plan' => $planKey,
                    'charged_immediately' => $result['charged_immediately'] ?? false,
                    'effective_date' => $result['effective_date'] ?? null,
                ],
            ]);

        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        } catch (\RuntimeException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        } catch (Exception $e) {
            Log::error('Failed to process subscription request', [
                'user_id' => $request->user()->id,
                'plan' => $request->plan,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to process subscription request. Please try again.',
            ], 500);
        }
    }
    /**
     * Verify checkout session after payment.
     */
    public function verifyCheckoutSession(Request $request): JsonResponse
    {
        $request->validate([
            'session_id' => 'required|string',
        ]);

        try {
            $user = $request->user();
            $tenant = $this->tenantService->getTenantFromUser($user);

            if (!$tenant) {
                Log::error('Verification failed: No tenant found', [
                    'user_id' => $user->id,
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'User does not belong to a tenant',
                ], 403);
            }

            Log::info('Starting checkout verification', [
                'tenant_id' => $tenant->id,
                'session_id' => $request->session_id,
                'tenant_stripe_id' => $tenant->stripe_id,
            ]);

            $stripe = new \Stripe\StripeClient(config('cashier.secret'));
            $session = $stripe->checkout->sessions->retrieve($request->session_id, [
                'expand' => ['subscription', 'customer'],
            ]);

            Log::info('Stripe session retrieved', [
                'tenant_id' => $tenant->id,
                'session_id' => $request->session_id,
                'payment_status' => $session->payment_status,
                'subscription_id' => $session->subscription,
                'customer_id' => $session->customer,
            ]);

            if ($session->payment_status !== 'paid') {
                Log::warning('Payment not completed', [
                    'tenant_id' => $tenant->id,
                    'payment_status' => $session->payment_status,
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Payment not completed.',
                    'data' => [
                        'payment_status' => $session->payment_status,
                    ],
                ], 400);
            }

            // Update tenant's Stripe customer ID if needed
            if (!$tenant->stripe_id && isset($session->customer)) {
                $customerId = is_string($session->customer) 
                    ? $session->customer 
                    : $session->customer->id;
                
                $tenant->stripe_id = $customerId;
                $tenant->save();
                
                Log::info('Updated tenant Stripe customer ID', [
                    'tenant_id' => $tenant->id,
                    'customer_id' => $customerId,
                ]);
            }

            // Wait for webhook to create subscription
            $maxAttempts = 15; // Increased from 10
            $attempt = 0;
            $subscription = null;

            Log::info('Waiting for subscription webhook', [
                'tenant_id' => $tenant->id,
                'max_attempts' => $maxAttempts,
            ]);

            while ($attempt < $maxAttempts) {
                $tenant->refresh();
                $subscription = $tenant->subscription('default');
                
                Log::debug('Checking subscription status', [
                    'tenant_id' => $tenant->id,
                    'attempt' => $attempt + 1,
                    'subscription_exists' => $subscription !== null,
                    'subscription_valid' => $subscription?->valid() ?? false,
                    'subscription_status' => $subscription?->stripe_status ?? 'none',
                ]);
                
                if ($subscription && $subscription->valid()) {
                    Log::info('Subscription found and valid', [
                        'tenant_id' => $tenant->id,
                        'subscription_id' => $subscription->id,
                        'stripe_id' => $subscription->stripe_id,
                    ]);
                    break;
                }
                
                sleep(1);
                $attempt++;
            }

            if (!$subscription || !$subscription->valid()) {
                Log::warning('Subscription not ready after waiting', [
                    'tenant_id' => $tenant->id,
                    'attempts' => $maxAttempts,
                    'subscription_exists' => $subscription !== null,
                    'all_subscriptions' => $tenant->subscriptions()->get()->toArray(),
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Subscription is being processed. Please refresh in a moment.',
                    'data' => [
                        'processing' => true,
                    ],
                ], 202);
            }

            Log::info('Subscription verified successfully', [
                'tenant_id' => $tenant->id,
                'subscription_id' => $subscription->id,
                'plan' => $tenant->currentPlan(),
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'subscription' => [
                        'id' => $subscription->id,
                        'status' => $subscription->stripe_status,
                        'plan' => $tenant->currentPlan(),
                    ],
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Failed to verify checkout session', [
                'user_id' => $request->user()->id,
                'session_id' => $request->session_id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to verify checkout session.',
            ], 500);
        }
    }

    /**
     * Cancel subscription at end of period.
     */
    public function cancel(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $tenant = $this->tenantService->getTenantFromUser($user);

            if (!$tenant) {
                return response()->json([
                    'success' => false,
                    'message' => 'User does not belong to a tenant',
                ], 403);
            }

            if (!$this->tenantService->canManageSubscription($user, $tenant)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only owners and admins can manage subscriptions',
                ], 403);
            }

            $this->tenantService->cancelSubscription($tenant);

            return response()->json([
                'success' => true,
                'message' => 'Subscription will be canceled at the end of the billing period.',
                'data' => [
                    'ends_at' => $tenant->subscription('default')->ends_at,
                ],
            ]);

        } catch (\RuntimeException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        } catch (Exception $e) {
            Log::error('Failed to cancel subscription', [
                'user_id' => $request->user()->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel subscription.',
            ], 500);
        }
    }

    /**
     * Cancel subscription immediately.
     */
    public function cancelNow(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $tenant = $this->tenantService->getTenantFromUser($user);

            if (!$tenant) {
                return response()->json([
                    'success' => false,
                    'message' => 'User does not belong to a tenant',
                ], 403);
            }

            if (!$this->tenantService->canManageSubscription($user, $tenant)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only owners and admins can manage subscriptions',
                ], 403);
            }

            $this->tenantService->cancelSubscriptionNow($tenant);

            return response()->json([
                'success' => true,
                'message' => 'Subscription canceled immediately.',
            ]);

        } catch (\RuntimeException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        } catch (Exception $e) {
            Log::error('Failed to cancel subscription immediately', [
                'user_id' => $request->user()->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel subscription.',
            ], 500);
        }
    }

    /**
     * Resume a canceled subscription.
     */
    public function resume(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $tenant = $this->tenantService->getTenantFromUser($user);

            if (!$tenant) {
                return response()->json([
                    'success' => false,
                    'message' => 'User does not belong to a tenant',
                ], 403);
            }

            if (!$this->tenantService->canManageSubscription($user, $tenant)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only owners and admins can manage subscriptions',
                ], 403);
            }

            $this->tenantService->resumeSubscription($tenant);

            return response()->json([
                'success' => true,
                'message' => 'Subscription resumed successfully.',
            ]);

        } catch (\RuntimeException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        } catch (Exception $e) {
            Log::error('Failed to resume subscription', [
                'user_id' => $request->user()->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to resume subscription.',
            ], 500);
        }
    }

    /**
     * Get billing portal session.
     */
    public function portalSession(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $tenant = $this->tenantService->getTenantFromUser($user);

            if (!$tenant) {
                return response()->json([
                    'success' => false,
                    'message' => 'User does not belong to a tenant',
                ], 403);
            }

            if (!$this->tenantService->canManageSubscription($user, $tenant)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only owners and admins can manage subscriptions',
                ], 403);
            }

            if (!$tenant->hasStripeId()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No billing account found',
                ], 400);
            }

            $session = $tenant->billingPortalUrl(
                config('app.frontend_url') . '/admin/subscriptions'
            );

            return response()->json([
                'success' => true,
                'data' => [
                    'url' => $session,
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Failed to create portal session', [
                'user_id' => $request->user()->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create billing portal session.',
            ], 500);
        }
    }

    /**
     * Get tenant invoices.
     */
    public function invoices(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $tenant = $this->tenantService->getTenantFromUser($user);

            if (!$tenant) {
                return response()->json([
                    'success' => false,
                    'message' => 'User does not belong to a tenant',
                ], 403);
            }

            if (!$this->tenantService->canManageSubscription($user, $tenant)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only owners and admins can view invoices',
                ], 403);
            }

            if (!$tenant->hasStripeId()) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                ]);
            }

            $invoices = $tenant->invoices();

            return response()->json([
                'success' => true,
                'data' => $invoices->map(fn($invoice) => [
                    'id' => $invoice->id,
                    'date' => $invoice->date()->toDateString(),
                    'total' => $invoice->total(),
                    'status' => $invoice->status,
                    'invoice_pdf' => $invoice->invoice_pdf,
                ]),
            ]);

        } catch (Exception $e) {
            Log::error('Failed to get invoices', [
                'user_id' => $request->user()->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve invoices.',
            ], 500);
        }
    }

    /**
     * Download invoice.
     */
    public function downloadInvoice(Request $request, string $invoiceId): JsonResponse
    {
        try {
            $user = $request->user();
            $tenant = $this->tenantService->getTenantFromUser($user);

            if (!$tenant) {
                return response()->json([
                    'success' => false,
                    'message' => 'User does not belong to a tenant',
                ], 403);
            }

            if (!$this->tenantService->canManageSubscription($user, $tenant)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only owners and admins can download invoices',
                ], 403);
            }

            return $tenant->downloadInvoice($invoiceId, [
                'vendor' => 'DealSpace',
                'product' => 'Subscription',
            ]);

        } catch (Exception $e) {
            Log::error('Failed to download invoice', [
                'user_id' => $request->user()->id,
                'invoice_id' => $invoiceId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to download invoice.',
            ], 500);
        }
    }

    /**
     * Get current usage and limits.
     */
    public function usage(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $tenant = $this->tenantService->getTenantFromUser($user);

            if (!$tenant) {
                return response()->json([
                    'success' => false,
                    'message' => 'User does not belong to a tenant',
                ], 403);
            }

            $planConfig = $tenant->planConfig();
            $limits = $planConfig['limits'];

            $usage = [];
            foreach ($limits as $feature => $limit) {
                $used = $tenant->getFeatureUsage($feature);
                
                $usage[$feature] = [
                    'used' => $used,
                    'limit' => $limit,
                    'unlimited' => $limit === null,
                    'percentage' => $limit ? min(100, round(($used / $limit) * 100)) : 0,
                    'can_use' => $tenant->canUseFeature($feature),
                ];
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'plan' => $tenant->currentPlan(),
                    'usage' => $usage,
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Failed to get usage', [
                'user_id' => $request->user()->id,
                'tenant_id' => $limits,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve usage data.',
            ], 500);
        }
    }
}
