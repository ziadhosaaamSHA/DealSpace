<?php

namespace App\Events;

use App\Models\Person;
use App\Models\Group;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class LeadAvailableForClaim
{
    use Dispatchable, SerializesModels;

    public Person $lead;
    public Group $group;

    public function __construct(Person $lead, Group $group)
    {
        $this->lead = $lead;
        $this->group = $group;
    }
}
