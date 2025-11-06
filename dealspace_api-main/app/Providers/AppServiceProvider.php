<?php

namespace App\Providers;
use App\Models\Deal;
use App\Models\Pond;
use App\Models\Group;
use App\Models\Stage;
use App\Models\Task;
use App\Models\Reminder;
use App\Models\DealStage;
use App\Models\DealType;
use App\Models\Person;
use App\Models\Team;

use App\Policies\PersonPolicy;
use App\Policies\DealPolicy;
use App\Policies\PondPolicy;
use App\Policies\GroupPolicy;
use App\Policies\StagePolicy;
use App\Policies\TaskPolicy;
use App\Policies\ReminderPolicy;
use App\Policies\TeamPolicy;
use App\Policies\DealStagePolicy;
use App\Policies\DealTypePolicy;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;
use Laravel\Cashier\Cashier;
use App\Models\Tenant;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    // In AppServiceProvider boot method
    public function boot()
    {
        Gate::policy(Person::class, PersonPolicy::class);
        Gate::policy(Deal::class, DealPolicy::class);
        Gate::policy(DealType::class, DealTypePolicy::class);
        Gate::policy(DealStage::class, DealStagePolicy::class);
        Gate::policy(Pond::class, PondPolicy::class);
        Gate::policy(Group::class, GroupPolicy::class);
        Gate::policy(Stage::class, StagePolicy::class);
        Gate::policy(Task::class, TaskPolicy::class);
        Gate::policy(Reminder::class, ReminderPolicy::class);
        Gate::policy(Team::class, TeamPolicy::class);
        URL::forceScheme('https');

        // Ensure Cashier treats Tenant as the billable (customer) model so
        // Subscription->owner() resolves using 'tenant_id' in subscriptions table.
        Cashier::useCustomerModel(Tenant::class);
    }
}
