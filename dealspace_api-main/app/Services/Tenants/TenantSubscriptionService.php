<?php

namespace App\Services\Tenants;

use App\Models\Tenant;
use App\Models\User;
use App\Enums\RoleEnum;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Laravel\Cashier\Exceptions\IncompletePayment;

class TenantSubscriptionService implements TenantSubscriptionServiceInterface
{
    /**
     * Get tenant from user.
     */
    public function getTenantFromUser(User $user): ?Tenant
    {
        if (!$user->tenant_id) {
            return null;
        }

        return Tenant::find($user->tenant_id);
    }

    /**
     * Check if tenant has active subscription.
     */
    public function hasActiveSubscription(Tenant $tenant): bool
    {
        return $tenant->subscribed('default');
    }

    /**
     * Get subscription details for tenant.
     */
    public function getSubscriptionDetails(Tenant $tenant): ?array
    {
        $subscription = $tenant->subscription('default');
        
        if (!$subscription) {
            return null;
        }

        $owner = $tenant->owner();

        return [
            'tenant_id' => $tenant->id,
            'owner' => $owner ? [
                'id' => $owner->id,
                'name' => $owner->name,
                'email' => $owner->email,
            ] : null,
            'subscription' => [
                'id' => $subscription->id,
                'stripe_id' => $subscription->stripe_id,
                'status' => $subscription->stripe_status,
                'plan' => $tenant->currentPlan(),
                'cancel_at_period_end' => $subscription->cancel_at_period_end,
                'current_period_end' => $subscription->current_period_end,
                'trial_ends_at' => $subscription->trial_ends_at,
                'ends_at' => $subscription->ends_at,
                'on_trial' => $subscription->onTrial(),
                'on_grace_period' => $subscription->onGracePeriod(),
                'canceled' => $subscription->canceled(),
            ],
        ];
    }

    /**
     * Create new subscription for tenant.
     */
    public function createSubscription(Tenant $tenant, string $planKey): string
    {
        $plan = config("plans.{$planKey}");
        
        if (!$plan || !$plan['stripe_price_id']) {
            throw new \InvalidArgumentException("Invalid plan: {$planKey}");
        }

        $stripe = new \Stripe\StripeClient(config('cashier.secret'));

        // Check if tenant has a valid Stripe customer ID
        if ($tenant->stripe_id) {
            try {
                // Verify the customer exists in Stripe
                $customer = $stripe->customers->retrieve($tenant->stripe_id);
                
                // Check if customer is deleted
                if (isset($customer->deleted) && $customer->deleted) {
                    Log::warning('Stripe customer is deleted, will create new', [
                        'tenant_id' => $tenant->id,
                        'old_stripe_id' => $tenant->stripe_id,
                    ]);
                    $tenant->stripe_id = null;
                    $tenant->pm_type = null;
                    $tenant->pm_last_four = null;
                    $tenant->save();
                } else {
                    Log::info('Existing Stripe customer verified', [
                        'tenant_id' => $tenant->id,
                        'stripe_id' => $tenant->stripe_id,
                    ]);
                }
            } catch (\Stripe\Exception\InvalidRequestException $e) {
                // Customer doesn't exist, clear the invalid ID
                Log::warning('Invalid Stripe customer ID, will create new', [
                    'tenant_id' => $tenant->id,
                    'old_stripe_id' => $tenant->stripe_id,
                    'error' => $e->getMessage(),
                ]);
                $tenant->stripe_id = null;
                $tenant->pm_type = null;
                $tenant->pm_last_four = null;
                $tenant->save();
            } catch (\Exception $e) {
                // Any other error, also clear and recreate
                Log::warning('Error verifying Stripe customer, will create new', [
                    'tenant_id' => $tenant->id,
                    'old_stripe_id' => $tenant->stripe_id,
                    'error' => $e->getMessage(),
                ]);
                $tenant->stripe_id = null;
                $tenant->pm_type = null;
                $tenant->pm_last_four = null;
                $tenant->save();
            }
        }

        // Create or get Stripe customer
        if (!$tenant->hasStripeId()) {
            $owner = $tenant->owner();
            
            try {
                $tenant->createAsStripeCustomer([
                    'name' => $tenant->getInternal('name') ?? ($owner?->name ?? 'Unknown'),
                    'email' => $owner?->email ?? 'no-reply@dealspace.com',
                    'metadata' => [
                        'tenant_id' => $tenant->id,
                    ],
                ]);
                
                // Refresh tenant to get the new stripe_id
                $tenant->refresh();
                
                Log::info('Created new Stripe customer', [
                    'tenant_id' => $tenant->id,
                    'stripe_id' => $tenant->stripe_id,
                ]);
            } catch (\Exception $e) {
                Log::error('Failed to create Stripe customer', [
                    'tenant_id' => $tenant->id,
                    'error' => $e->getMessage(),
                ]);
                throw new \RuntimeException('Failed to create billing account: ' . $e->getMessage());
            }
        }

        // Verify we have a valid Stripe customer ID before proceeding
        if (!$tenant->stripe_id) {
            throw new \RuntimeException('Unable to establish billing account');
        }

        try {
            $checkout = $tenant->newSubscription('default', $plan['stripe_price_id'])
                ->checkout([
                    'success_url' => config('app.frontend_url') . '/subscriptions/verify?session_id={CHECKOUT_SESSION_ID}',
                    'cancel_url' => config('app.frontend_url') . '/admin/subscriptions',
                    'metadata' => [
                        'tenant_id' => $tenant->id,
                        'plan' => $planKey,
                    ],
                    'subscription_data' => [
                        'metadata' => [
                            'tenant_id' => $tenant->id,
                            'plan' => $planKey,
                        ],
                    ],
                ]);

            Log::info('Checkout session created for tenant', [
                'tenant_id' => $tenant->id,
                'plan' => $planKey,
                'checkout_url' => $checkout->url,
            ]);

            return $checkout->url;
        } catch (\Stripe\Exception\InvalidRequestException $e) {
            Log::error('Stripe API error creating checkout', [
                'tenant_id' => $tenant->id,
                'stripe_id' => $tenant->stripe_id,
                'error' => $e->getMessage(),
            ]);
            
            // If customer error, clear and retry once
            if (str_contains($e->getMessage(), 'No such customer')) {
                Log::info('Clearing invalid customer and retrying', [
                    'tenant_id' => $tenant->id,
                ]);
                
                $tenant->stripe_id = null;
                $tenant->pm_type = null;
                $tenant->pm_last_four = null;
                $tenant->save();
                
                // Recursive retry (only once)
                return $this->createSubscription($tenant, $planKey);
            }
            
            throw new \RuntimeException('Stripe error: ' . $e->getMessage());
        } catch (\Exception $e) {
            Log::error('Failed to create checkout session', [
                'tenant_id' => $tenant->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    /**
     * Change tenant's subscription plan.
     */
    public function changePlan(Tenant $tenant, string $newPlanKey): array
    {
        $newPlan = config("plans.{$newPlanKey}");
        
        if (!$newPlan || !$newPlan['stripe_price_id']) {
            throw new \InvalidArgumentException("Invalid plan: {$newPlanKey}");
        }

        $subscription = $tenant->subscription('default');
        
        if (!$subscription) {
            throw new \RuntimeException('No active subscription found');
        }

        if ($subscription->stripe_price === $newPlan['stripe_price_id']) {
            throw new \RuntimeException('Already on this plan');
        }

        $currentPlan = $tenant->currentPlan();
        $isUpgrade = $this->isUpgrade($currentPlan, $newPlanKey);

        try {
            $stripe = new \Stripe\StripeClient(config('cashier.secret'));
            
            if ($isUpgrade) {
                // For upgrades, create a checkout session for immediate payment
                $checkoutSession = $stripe->checkout->sessions->create([
                    'customer' => $tenant->stripe_id,
                    'payment_method_types' => ['card'],
                    'line_items' => [
                        [
                            'price' => $newPlan['stripe_price_id'],
                            'quantity' => 1,
                        ],
                    ],
                    'mode' => 'subscription',
                    'success_url' => config('app.frontend_url') . '/subscriptions/verify?session_id={CHECKOUT_SESSION_ID}',
                    'cancel_url' => config('app.frontend_url') . '/admin/subscriptions',
                    'metadata' => [
                        'tenant_id' => $tenant->id,
                        'plan' => $newPlanKey,
                        'is_plan_change' => 'true',
                    ],
                    'subscription_data' => [
                        'metadata' => [
                            'tenant_id' => $tenant->id,
                            'plan' => $newPlanKey,
                        ],
                    ],
                    // Cancel the existing subscription when the new one is created
                    'subscription_data' => [
                        'metadata' => [
                            'tenant_id' => $tenant->id,
                            'plan' => $newPlanKey,
                            'replaces_subscription' => $subscription->stripe_id,
                        ],
                    ],
                ]);
                
                Log::info('Upgrade checkout session created', [
                    'tenant_id' => $tenant->id,
                    'from' => $currentPlan,
                    'to' => $newPlanKey,
                    'checkout_url' => $checkoutSession->url,
                ]);
                
                return [
                    'action' => 'upgrade',
                    'requires_checkout' => true,
                    'checkout_url' => $checkoutSession->url,
                    'message' => 'Please complete checkout to upgrade your plan.',
                ];
            } else {
                // For downgrades, update immediately and schedule for end of period
                $stripeSubscription = $stripe->subscriptions->retrieve($subscription->stripe_id);
                $subscriptionItemId = $stripeSubscription->items->data[0]->id;
                
                $stripe->subscriptions->update($subscription->stripe_id, [
                    'items' => [
                        [
                            'id' => $subscriptionItemId,
                            'price' => $newPlan['stripe_price_id'],
                        ],
                    ],
                    'proration_behavior' => 'none',
                    'metadata' => [
                        'tenant_id' => $tenant->id,
                        'plan' => $newPlanKey,
                    ],
                ]);
                
                Log::info('Subscription downgraded', [
                    'tenant_id' => $tenant->id,
                    'from' => $currentPlan,
                    'to' => $newPlanKey,
                ]);
                
                return [
                    'action' => 'downgrade',
                    'requires_checkout' => false,
                    'message' => 'Plan change scheduled for end of billing period.',
                    'effective_date' => $subscription->current_period_end,
                ];
            }
        } catch (\Exception $e) {
            Log::error('Failed to change plan', [
                'tenant_id' => $tenant->id,
                'from' => $currentPlan,
                'to' => $newPlanKey,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    /**
     * Cancel subscription at end of period.
     */
    public function cancelSubscription(Tenant $tenant): void
    {
        try {
            $subscription = $tenant->subscription('default');
            
            if (!$subscription) {
                throw new \RuntimeException('No active subscription found');
            }

            $subscription->cancel();

            Log::info('Subscription canceled at period end', [
                'tenant_id' => $tenant->id,
                'ends_at' => $subscription->ends_at,
            ]);
        } catch (\Exception $e) {
            // Handle incomplete payment scenario
            Log::warning('Subscription cancellation failed', [
                'tenant_id' => $tenant->id,
                'error' => $e->getMessage(),
            ]);
            throw new \RuntimeException('Cannot cancel subscription.');
        }
    }
    /**
     * Cancel subscription immediately.
     */
    public function cancelSubscriptionNow(Tenant $tenant): void
    {
        try {
            $subscription = $tenant->subscription('default');

            if (!$subscription) {
                throw new \RuntimeException('No active subscription found');
            }

            // Defensive check: owner should not be null. If it is, suggest configuration fix.
            if (!$subscription->owner) {
                Log::error('Subscription owner is null when attempting immediate cancel', [
                    'tenant_id' => $tenant->id,
                    'subscription_id' => $subscription->id,
                ]);

                throw new \RuntimeException('Subscription owner is null. Make sure Cashier is configured to use the Tenant model: Cashier::useCustomerModel(\App\\Models\\Tenant::class)');
            }

            // Cancel on Stripe immediately
            $subscription->cancelNow();

            // Keep stripe id for logging after delete
            $stripeId = $subscription->stripe_id;

            // Delete subscription and its items from DB inside a transaction
            DB::transaction(function () use ($subscription, $stripeId, $tenant) {
                // Delete subscription items first
                $subscription->items()->delete();

                // Then delete the subscription row itself
                $subscription->delete();

                Log::info('Subscription record deleted from DB after immediate cancellation', [
                    'tenant_id' => $tenant->id,
                    'stripe_id' => $stripeId,
                ]);
            });

            Log::info('Subscription canceled immediately', [
                'tenant_id' => $tenant->id,
                'stripe_id' => $stripeId,
            ]);
        } catch (\Exception $e) {
            Log::warning('Subscription cancellation failed', [
                'tenant_id' => $tenant->id,
                'error' => $e->getMessage(),
            ]);
            throw new \RuntimeException('Cannot cancel subscription.');
        }
    }

    /**
     * Resume canceled subscription.
     */
    public function resumeSubscription(Tenant $tenant): void
    {
        $subscription = $tenant->subscription('default');
        
        if (!$subscription) {
            throw new \RuntimeException('No subscription found');
        }

        if (!$subscription->onGracePeriod()) {
            throw new \RuntimeException('Subscription cannot be resumed');
        }

        $subscription->resume();

        Log::info('Subscription resumed', [
            'tenant_id' => $tenant->id,
        ]);
    }

    /**
     * Check if user can manage tenant subscription.
     */
    public function canManageSubscription(User $user, Tenant $tenant): bool
    {
        return $user->tenant_id === $tenant->id
            && in_array($user->role, [RoleEnum::OWNER, RoleEnum::ADMIN]);
    }

    /**
     * Determine if plan change is an upgrade.
     */
    private function isUpgrade(string $currentPlan, string $newPlan): bool
    {
        $hierarchy = ['free' => 0, 'basic' => 1, 'pro' => 2, 'enterprise' => 3];
        
        return ($hierarchy[$newPlan] ?? 0) > ($hierarchy[$currentPlan] ?? 0);
    }

    /**
     * Get subscription holder (owner).
     */
    public function getSubscriptionHolder(Tenant $tenant): ?User
    {
        return $tenant->owner();
    }

    /**
     * Transfer subscription is not needed for tenant-based subscriptions.
     * Kept for interface compatibility.
     */
    public function transferSubscriptionHolder(Tenant $tenant, User $newHolder): bool
    {
        // Not applicable for tenant-based subscriptions
        // Subscription stays with tenant regardless of ownership changes
        return true;
    }
}