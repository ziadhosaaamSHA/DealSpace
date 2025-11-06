<?php

namespace App\Events;

use App\Models\Person;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class LeadAssigned
{
    use Dispatchable, SerializesModels;

    public Person $lead;
    public User $user;

    public function __construct(Person $lead, User $user)
    {
        $this->lead = $lead;
        $this->user = $user;
    }
}
