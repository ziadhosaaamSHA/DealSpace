<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Facades\DB;
use Stancl\Tenancy\Contracts\Tenant as TenantContract;
use Stancl\Tenancy\Database\Concerns\HasDataColumn;
use Laravel\Cashier\Billable;
use App\Enums\RoleEnum;

class Tenant extends Model implements TenantContract
{
    use HasFactory, HasDataColumn, Billable;

    protected $table = 'tenants';
    protected $primaryKey = 'id';
    protected $keyType = 'string';
    public $incrementing = false;
    
    protected $fillable = [
        'id',
        'data',
        'stripe_id',
        'pm_type',
        'pm_last_four',
        'trial_ends_at',
    ];

    protected $casts = [
        'trial_ends_at' => 'datetime',
    ];

    /**
     * Get the users associated with the tenant.
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Get the owner user of this tenant.
     */
    public function owner()
    {
        return $this->users()
            ->where('role', RoleEnum::OWNER->value)
            ->first();
    }

    /**
     * Get all admins of this tenant.
     */
    public function admins()
    {
        return $this->users()
            ->where('role', RoleEnum::ADMIN->value)
            ->get();
    }

    /**
     * Check if tenant has an active subscription.
     */
    public function hasActiveSubscription(): bool
    {
        return $this->subscribed('default');
    }

    /**
     * Get the tenant's current plan name.
     */
    public function currentPlan(): string
    {
        $subscription = $this->subscription('default');
        
        if (!$subscription || !$subscription->valid()) {
            return 'free';
        }

        $plans = config('plans');
        foreach ($plans as $planKey => $planConfig) {
            if ($planConfig['stripe_price_id'] === $subscription->stripe_price) {
                return $planKey;
            }
        }

        return 'free';
    }

    /**
     * Get the tenant's plan configuration.
     */
    public function planConfig(): array
    {
        return config('plans.' . $this->currentPlan());
    }

    /**
     * Check if tenant can perform an action based on plan limits.
     */
    public function canUseFeature(string $feature): bool
    {
        $limits = $this->planConfig()['limits'];
        
        // If limit is null, feature is unlimited
        if (!isset($limits[$feature]) || $limits[$feature] === null) {
            return true;
        }

        // Get current usage
        $usage = $this->getFeatureUsage($feature);
        
        return $usage < $limits[$feature];
    }

    /**
     * Get current usage for a feature.
     */
    public function getFeatureUsage(string $feature): int
    {
        return match($feature) {
            'users' => $this->users()->count(),
            'deals' => DB::table('deals')->count(),
            'contacts' => DB::table('people')->count(),
            default => 0,
        };
    }

    /**
     * Get feature limit for current plan.
     */
    public function getFeatureLimit(string $feature): ?int
    {
        return $this->planConfig()['limits'][$feature] ?? null;
    }

    // TenantContract interface methods
    public function getTenantKeyName(): string
    {
        return 'id';
    }

    public function getTenantKey()
    {
        return $this->getAttribute($this->getTenantKeyName());
    }

    public function getCentralConnection(): string
    {
        return config('database.default');
    }

    public function getInternal(string $key, $default = null)
    {
        return $this->data[$key] ?? $default;
    }

    public function setInternal(string $key, $value): void
    {
        $this->data[$key] = $value;
    }

    public function run(callable $callback)
    {
        return null;
    }
}
