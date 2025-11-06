<?php

namespace App\Providers;

use App\Events\LeadAvailableForClaim;
use App\Events\LeadAssigned;
use App\Listeners\NotifyGroupLeadAvailable;
use App\Listeners\NotifyUserLeadAssigned;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    /**
     * The event to listener mappings for the application.
     *
     * @var array<class-string, array<int, class-string>>
     */
    protected $listen = [
        LeadAvailableForClaim::class => [
            NotifyGroupLeadAvailable::class,
        ],
        LeadAssigned::class => [
            NotifyUserLeadAssigned::class,
        ],
    ];

    /**
     * Register any events for your application.
     */
    public function boot(): void
    {
        //
    }
}