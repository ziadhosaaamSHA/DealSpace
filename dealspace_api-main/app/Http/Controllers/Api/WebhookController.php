<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Laravel\Cashier\Http\Controllers\WebhookController as CashierWebhookController;

class WebhookController extends CashierWebhookController
{
    /**
     * Handle a Stripe webhook call.
     */
    public function handleWebhook(Request $request)
    {
        Log::info('Webhook received', [
            'type' => $request->input('type'),
        ]);

        return parent::handleWebhook($request);
    }

    /**
     * Handle checkout session completed.
     */
    public function handleCheckoutSessionCompleted(array $payload)
    {
        $session = $payload['data']['object'];
        
        Log::info('Checkout session completed', [
            'session_id' => $session['id'],
            'customer' => $session['customer'],
            'subscription' => $session['subscription'] ?? null,
            'metadata' => $session['metadata'] ?? [],
        ]);

        if (!isset($session['metadata']['tenant_id'])) {
            Log::warning('No tenant_id in session metadata', ['session_id' => $session['id']]);
            return;
        }

        // Use central connection to find tenant
        $tenant = DB::connection(config('database.default'))
            ->table('tenants')
            ->where('id', $session['metadata']['tenant_id'])
            ->first();
        
        if (!$tenant) {
            Log::error('Tenant not found for checkout session', [
                'tenant_id' => $session['metadata']['tenant_id'],
            ]);
            return;
        }

        // Update tenant's Stripe customer ID if needed
        if (!$tenant->stripe_id) {
            DB::connection(config('database.default'))
                ->table('tenants')
                ->where('id', $tenant->id)
                ->update(['stripe_id' => $session['customer']]);
            
            Log::info('Updated tenant Stripe customer ID', [
                'tenant_id' => $tenant->id,
                'customer_id' => $session['customer'],
            ]);
        }

        Log::info('Checkout session processed for tenant', [
            'tenant_id' => $tenant->id,
            'stripe_customer' => $session['customer'],
        ]);
        
        // If there's a subscription, sync it immediately
        if (isset($session['subscription'])) {
            Log::info('Syncing subscription from checkout session', [
                'subscription_id' => $session['subscription'],
            ]);
            
            try {
                $stripe = new \Stripe\StripeClient(config('cashier.secret'));
                $stripeSubscription = $stripe->subscriptions->retrieve($session['subscription']);
                
                // Convert Stripe object to array for processing
                $subscriptionArray = $stripeSubscription->toArray();
                $this->syncSubscriptionForTenant($tenant->id, $subscriptionArray);
                
                // If this is a plan change, cancel the old subscription
                if (isset($subscriptionArray['metadata']['replaces_subscription'])) {
                    $oldSubscriptionId = $subscriptionArray['metadata']['replaces_subscription'];
                    
                    Log::info('Canceling old subscription after upgrade', [
                        'tenant_id' => $tenant->id,
                        'old_subscription' => $oldSubscriptionId,
                        'new_subscription' => $session['subscription'],
                    ]);
                    
                    try {
                        $stripe->subscriptions->cancel($oldSubscriptionId);
                        
                        // Update local record
                        $tenantModel = Tenant::on(config('database.default'))->find($tenant->id);
                        $oldSubscription = $tenantModel->subscriptions()
                            ->where('stripe_id', $oldSubscriptionId)
                            ->first();
                        
                        if ($oldSubscription) {
                            $oldSubscription->markAsCanceled();
                        }
                    } catch (\Exception $e) {
                        Log::error('Failed to cancel old subscription', [
                            'old_subscription' => $oldSubscriptionId,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            } catch (\Exception $e) {
                Log::error('Failed to sync subscription from checkout', [
                    'subscription_id' => $session['subscription'],
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * Handle customer subscription created.
     */
    public function handleCustomerSubscriptionCreated(array $payload)
    {
        Log::info('Subscription created webhook received', [
            'subscription_id' => $payload['data']['object']['id'],
            'customer' => $payload['data']['object']['customer'],
            'metadata' => $payload['data']['object']['metadata'] ?? [],
        ]);
        
        $this->syncSubscription($payload);
    }

    /**
     * Handle customer subscription updated.
     */
    public function handleCustomerSubscriptionUpdated(array $payload)
    {
        Log::info('Subscription updated webhook received', [
            'subscription_id' => $payload['data']['object']['id'],
            'customer' => $payload['data']['object']['customer'],
            'status' => $payload['data']['object']['status'],
        ]);
        
        $this->syncSubscription($payload);
    }

    /**
     * Handle customer subscription deleted.
     */
    public function handleCustomerSubscriptionDeleted(array $payload)
    {
        $stripeSubscription = $payload['data']['object'];
        
        Log::info('Subscription deleted webhook received', [
            'subscription_id' => $stripeSubscription['id'],
            'customer' => $stripeSubscription['customer'],
            'metadata' => $stripeSubscription['metadata'] ?? [],
        ]);
        
        // First, try to find tenant from subscription metadata
        $tenant = null;
        
        if (!empty($stripeSubscription['metadata']['tenant_id'])) {
            Log::info('Looking up tenant from subscription metadata', [
                'tenant_id' => $stripeSubscription['metadata']['tenant_id'],
            ]);
            
            $tenant = Tenant::on(config('database.default'))
                ->find($stripeSubscription['metadata']['tenant_id']);
        }
        
        // Fallback: look up by stripe_id
        if (!$tenant) {
            Log::info('Looking up tenant by stripe_id', [
                'customer' => $stripeSubscription['customer'],
            ]);
            
            $tenant = Tenant::on(config('database.default'))
                ->where('stripe_id', $stripeSubscription['customer'])
                ->first();
        }
        
        if (!$tenant) {
            Log::warning('Tenant not found for deleted subscription', [
                'customer' => $stripeSubscription['customer'],
                'subscription' => $stripeSubscription['id'],
                'metadata' => $stripeSubscription['metadata'] ?? [],
            ]);
            return;
        }

        $subscription = $tenant->subscriptions()
            ->where('stripe_id', $stripeSubscription['id'])
            ->first();

        if ($subscription) {
            // Keep ids for logging after deletion
            $localSubscriptionId = $subscription->id;
            $stripeSubId = $stripeSubscription['id'];

            // Use central connection transaction to delete items then subscription
            $deletedItems = 0;
            $deletedSubscription = 0;
            DB::connection(config('database.default'))->transaction(function () use ($subscription, &$deletedItems, &$deletedSubscription) {
                // Delete subscription items first
                $deletedItems = $subscription->items()->delete();

                // Then delete the subscription row
                // ->delete() on model returns bool; we convert to int for logging consistency
                $deletedSubscription = $subscription->delete() ? 1 : 0;
            });

            Log::info('Subscription and items deleted', [
                'tenant_id' => $tenant->id,
                'subscription_id' => $localSubscriptionId,
                'stripe_subscription_id' => $stripeSubId,
                'items_deleted' => $deletedItems,
                'subscriptions_deleted' => $deletedSubscription,
            ]);
        } else {
            Log::warning('Local subscription record not found', [
                'tenant_id' => $tenant->id,
                'stripe_subscription_id' => $stripeSubscription['id'],
            ]);
        }
    }

    /**
     * Handle customer deleted (Stripe event: customer.deleted).
     */
    public function handleCustomerDeleted(array $payload)
    {
        $stripeCustomer = $payload['data']['object'];
        $stripeCustomerId = $stripeCustomer['id'];
        
        Log::info('Customer deletion webhook received', [
            'customer_id' => $stripeCustomerId,
            'metadata' => $stripeCustomer['metadata'] ?? [],
        ]);
        
        // Try to find tenant from customer metadata first
        $tenant = null;
        
        if (!empty($stripeCustomer['metadata']['tenant_id'])) {
            $tenant = Tenant::on(config('database.default'))
                ->find($stripeCustomer['metadata']['tenant_id']);
        }
        
        // Fallback: look up by stripe_id
        if (!$tenant) {
            $tenant = Tenant::on(config('database.default'))
                ->where('stripe_id', $stripeCustomerId)
                ->first();
        }
        
        if (!$tenant) {
            Log::warning('Tenant not found for deleted customer', [
                'customer_id' => $stripeCustomerId,
            ]);
            return;
        }

        Log::info('Processing customer deletion for tenant', [
            'tenant_id' => $tenant->id,
            'tenant_stripe_id_before' => $tenant->stripe_id,
        ]);

        // Get all subscriptions for this tenant
        $subscriptions = DB::connection(config('database.default'))
            ->table('subscriptions')
            ->where('tenant_id', $tenant->id)
            ->get();

        Log::info('Found subscriptions to delete', [
            'tenant_id' => $tenant->id,
            'subscription_count' => $subscriptions->count(),
            'subscription_ids' => $subscriptions->pluck('id')->toArray(),
        ]);

        // Delete subscription items first
        foreach ($subscriptions as $subscription) {
            $deletedItems = DB::connection(config('database.default'))
                ->table('subscription_items')
                ->where('subscription_id', $subscription->id)
                ->delete();
                
            Log::info('Deleted subscription items', [
                'subscription_id' => $subscription->id,
                'items_deleted' => $deletedItems,
            ]);
        }

        // Delete subscriptions
        $deletedSubscriptions = DB::connection(config('database.default'))
            ->table('subscriptions')
            ->where('tenant_id', $tenant->id)
            ->delete();
        
        Log::info('Deleted subscriptions', [
            'tenant_id' => $tenant->id,
            'subscriptions_deleted' => $deletedSubscriptions,
        ]);
        
        // Get current data column value and decode it
        $currentData = DB::connection(config('database.default'))
            ->table('tenants')
            ->where('id', $tenant->id)
            ->value('data');
        
        $dataArray = $currentData ? json_decode($currentData, true) : [];
        
        // Update the data JSON to clear Stripe fields
        if ($dataArray) {
            $dataArray['stripe_id'] = null;
            $dataArray['pm_type'] = null;
            $dataArray['pm_last_four'] = null;
            $dataArray['trial_ends_at'] = null;
            $dataArray['updated_at'] = now()->toDateTimeString();
        }
        
        // Clear all Stripe-related data from tenant (both columns and data JSON)
        $updated = DB::connection(config('database.default'))
            ->table('tenants')
            ->where('id', $tenant->id)
            ->update([
                'stripe_id' => null,
                'pm_type' => null,
                'pm_last_four' => null,
                'trial_ends_at' => null,
                'data' => !empty($dataArray) ? json_encode($dataArray) : null,
                'updated_at' => now(),
            ]);
        
        Log::info('Cleared tenant Stripe data', [
            'tenant_id' => $tenant->id,
            'rows_updated' => $updated,
        ]);
        
        // Verify the update
        $updatedTenant = DB::connection(config('database.default'))
            ->table('tenants')
            ->where('id', $tenant->id)
            ->first();
            
        Log::info('Customer and subscriptions deleted', [
            'tenant_id' => $tenant->id,
            'stripe_customer_id' => $stripeCustomerId,
            'subscriptions_deleted' => $deletedSubscriptions,
            'tenant_stripe_id_after' => $updatedTenant->stripe_id ?? 'null',
            'tenant_data_after' => $updatedTenant->data,
        ]);
    }

    /**
     * Handle invoice payment failed.
     */
    public function handleInvoicePaymentFailed(array $payload)
    {
        $invoice = $payload['data']['object'];
        
        $tenant = Tenant::on(config('database.default'))
            ->where('stripe_id', $invoice['customer'])
            ->first();
        
        if (!$tenant) {
            return;
        }

        Log::warning('Invoice payment failed for tenant', [
            'tenant_id' => $tenant->id,
            'invoice_id' => $invoice['id'],
            'amount' => $invoice['amount_due'],
        ]);
    }

    /**
     * Handle subscription trial will end.
     */
    public function handleCustomerSubscriptionTrialWillEnd(array $payload)
    {
        $stripeSubscription = $payload['data']['object'];
        
        $tenant = Tenant::on(config('database.default'))
            ->where('stripe_id', $stripeSubscription['customer'])
            ->first();
        
        if (!$tenant) {
            return;
        }

        Log::info('Trial ending soon for tenant', [
            'tenant_id' => $tenant->id,
            'trial_end' => $stripeSubscription['trial_end'],
        ]);
    }

    /**
     * Sync subscription data from Stripe.
     */
    protected function syncSubscription(array $payload)
    {
        $stripeSubscription = $payload['data']['object'];
        
        Log::info('Syncing subscription', [
            'subscription_id' => $stripeSubscription['id'],
            'customer' => $stripeSubscription['customer'],
            'status' => $stripeSubscription['status'],
            'metadata' => $stripeSubscription['metadata'] ?? [],
        ]);
        
        // First, try to find tenant from subscription metadata (for checkout sessions)
        $tenant = null;
        
        if (!empty($stripeSubscription['metadata']['tenant_id'])) {
            Log::info('Looking up tenant from subscription metadata', [
                'tenant_id' => $stripeSubscription['metadata']['tenant_id'],
            ]);
            
            $tenant = Tenant::on(config('database.default'))
                ->find($stripeSubscription['metadata']['tenant_id']);
        }
        
        // Fallback: look up by stripe_id
        if (!$tenant) {
            Log::info('Looking up tenant by stripe_id', [
                'customer' => $stripeSubscription['customer'],
            ]);
            
            $tenant = Tenant::on(config('database.default'))
                ->where('stripe_id', $stripeSubscription['customer'])
                ->first();
        }
        
        if (!$tenant) {
            Log::warning('Tenant not found for subscription sync', [
                'customer' => $stripeSubscription['customer'],
                'subscription' => $stripeSubscription['id'],
                'metadata' => $stripeSubscription['metadata'] ?? [],
            ]);
            return;
        }

        $this->syncSubscriptionForTenant($tenant->id, $stripeSubscription);
    }

    /**
     * Sync subscription for a specific tenant.
     */
    protected function syncSubscriptionForTenant($tenantId, array $stripeSubscription)
    {
        $tenant = Tenant::on(config('database.default'))->find($tenantId);
        
        if (!$tenant) {
            Log::error('Tenant not found', ['tenant_id' => $tenantId]);
            return;
        }

        Log::info('Syncing subscription for tenant', [
            'tenant_id' => $tenant->id,
            'subscription_id' => $stripeSubscription['id'],
            'customer' => $stripeSubscription['customer'],
        ]);

        $subscription = $tenant->subscriptions()
            ->where('stripe_id', $stripeSubscription['id'])
            ->first();

        $priceId = $stripeSubscription['items']['data'][0]['price']['id'];

        if (!$subscription) {
            // Create new subscription record
            $subscription = $tenant->subscriptions()->create([
                'type' => 'default',
                'stripe_id' => $stripeSubscription['id'],
                'stripe_status' => $stripeSubscription['status'],
                'stripe_price' => $priceId,
                'quantity' => $stripeSubscription['items']['data'][0]['quantity'] ?? 1,
                'trial_ends_at' => isset($stripeSubscription['trial_end']) && $stripeSubscription['trial_end']
                    ? \Carbon\Carbon::createFromTimestamp($stripeSubscription['trial_end'])
                    : null,
                'ends_at' => isset($stripeSubscription['cancel_at']) && $stripeSubscription['cancel_at']
                    ? \Carbon\Carbon::createFromTimestamp($stripeSubscription['cancel_at'])
                    : null,
                'cancel_at_period_end' => $stripeSubscription['cancel_at_period_end'] ?? false,
                'current_period_start' => isset($stripeSubscription['current_period_start']) && $stripeSubscription['current_period_start']
                    ? \Carbon\Carbon::createFromTimestamp($stripeSubscription['current_period_start'])
                    : now(),
                'current_period_end' => isset($stripeSubscription['current_period_end']) && $stripeSubscription['current_period_end']
                    ? \Carbon\Carbon::createFromTimestamp($stripeSubscription['current_period_end'])
                    : now()->addMonth(),
            ]);

            Log::info('Subscription created from webhook', [
                'tenant_id' => $tenant->id,
                'subscription_id' => $subscription->id,
                'stripe_id' => $subscription->stripe_id,
            ]);
        } else {
            // Update existing subscription
            $subscription->update([
                'stripe_status' => $stripeSubscription['status'],
                'stripe_price' => $priceId,
                'quantity' => $stripeSubscription['items']['data'][0]['quantity'] ?? 1,
                'cancel_at_period_end' => $stripeSubscription['cancel_at_period_end'] ?? false,
                'ends_at' => isset($stripeSubscription['cancel_at']) && $stripeSubscription['cancel_at']
                    ? \Carbon\Carbon::createFromTimestamp($stripeSubscription['cancel_at'])
                    : null,
                'current_period_start' => isset($stripeSubscription['current_period_start']) && $stripeSubscription['current_period_start']
                    ? \Carbon\Carbon::createFromTimestamp($stripeSubscription['current_period_start'])
                    : $subscription->current_period_start,
                'current_period_end' => isset($stripeSubscription['current_period_end']) && $stripeSubscription['current_period_end']
                    ? \Carbon\Carbon::createFromTimestamp($stripeSubscription['current_period_end'])
                    : $subscription->current_period_end,
            ]);

            Log::info('Subscription updated from webhook', [
                'tenant_id' => $tenant->id,
                'subscription_id' => $subscription->id,
                'status' => $stripeSubscription['status'],
            ]);
        }

        // Sync subscription items
        foreach ($stripeSubscription['items']['data'] as $item) {
            $subscription->items()->updateOrCreate(
                ['stripe_id' => $item['id']],
                [
                    'stripe_product' => $item['price']['product'],
                    'stripe_price' => $item['price']['id'],
                    'quantity' => $item['quantity'] ?? 1,
                ]
            );
        }
        
        Log::info('Subscription sync complete', [
            'tenant_id' => $tenant->id,
            'subscription_id' => $subscription->id,
        ]);
    }
}