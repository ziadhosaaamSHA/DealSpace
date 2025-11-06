<?php

namespace App\Listeners;

use App\Events\LeadAssigned;
use App\Events\NotificationEvent;

class NotifyUserLeadAssigned
{
    public function handle(LeadAssigned $event)
    {
        // Notify the assigned user
        event(new NotificationEvent([
            'title' => 'Lead Assigned',
            'message' => "A new lead ({$event->lead->name}) has been assigned to you",
            'action' => "/leads/{$event->lead->id}",
            'image' => $event->lead->picture ?? null
        ], $event->user->id));
    }
}