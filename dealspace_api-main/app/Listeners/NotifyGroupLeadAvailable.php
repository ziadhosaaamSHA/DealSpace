<?php

namespace App\Listeners;

use App\Events\LeadAvailableForClaim;
use App\Events\NotificationEvent;

class NotifyGroupLeadAvailable
{
    public function handle(LeadAvailableForClaim $event)
    {
        // Notify each group member
        foreach ($event->group->users as $user) {
            event(new NotificationEvent([
                'title' => 'New Lead Available',
                'message' => "A new lead ({$event->lead->name}) is available for claiming",
                'action' => "/leads/{$event->lead->id}/claim",
                'image' => $event->lead->picture ?? null
            ], $user->id));
        }
    }
}