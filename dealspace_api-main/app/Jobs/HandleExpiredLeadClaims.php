<?php

namespace App\Jobs;

use App\Models\Person;
use App\Models\Group;
use App\Services\Groups\GroupLeadDistributionService;
use Illuminate\Bus\Queueable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;

class HandleExpiredLeadClaims implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels, Dispatchable;

    public function handle()
    {
        Person::where('claim_expires_at', '<', now())
            ->whereNotNull('available_for_group_id')
            ->chunk(100, function ($leads) {
                foreach ($leads as $lead) {
                    $group = Group::find($lead->available_for_group_id);
                    if (!$group) {
                        continue;
                    }
                    // For first-to-claim groups, assign to configured default
                    if ($group->distribution === 0) { // First-to-claim
                        if ($group->default_user_id) {
                            $lead->update([
                                'assigned_user_id' => $group->default_user_id,
                                'claim_expires_at' => null,
                                'available_for_group_id' => null
                            ]);
                        } elseif ($group->default_group_id) {
                            $defaultGroup = Group::find($group->default_group_id);
                            if ($defaultGroup) {
                                $lead->update([
                                    'claim_expires_at' => null,
                                    'available_for_group_id' => null
                                ]);
                                app(GroupLeadDistributionService::class)->distributeLead([
                                    'personId' => $lead->id,
                                    'groupId' => $defaultGroup->id
                                ]);
                            }
                        } elseif ($group->default_pond_id) {
                            $lead->update([
                                'assigned_pond_id' => $group->default_pond_id,
                                'claim_expires_at' => null,
                                'available_for_group_id' => null
                            ]);
                        }
                    } else {
                        // For round-robin groups, just clear claim fields
                        $lead->update([
                            'claim_expires_at' => null,
                            'available_for_group_id' => null
                        ]);
                    }
                }
            });
    }
}