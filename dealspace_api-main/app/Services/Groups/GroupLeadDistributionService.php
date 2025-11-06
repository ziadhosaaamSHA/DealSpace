<?php

namespace App\Services\Groups;

use App\Models\Group;
use App\Models\Person;
use App\Events\LeadAvailableForClaim;
use App\Events\LeadAssigned;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use App\Enums\GroupDistributionEnum;
use App\Services\Notifications\NotificationServiceInterface;


class GroupLeadDistributionService
{
    public function distributeLead(array $params): void
    {
        $group = Group::find($params['groupId']);
        $lead = Person::find($params['personId']);
        Log::info(
            sprintf(
                'Distributing Lead ID %d to Group ID %d. Method: %s. Distribution Value: %s',
                $lead->id,
                $group->id,
                GroupDistributionEnum::label($group->distribution->value),
                $group->distribution->name
            )
        );
        if ($group->distribution === GroupDistributionEnum::FIRST_TO_CLAIM) {
            $this->handleFirstToClaim($lead, $group);
            Log::info("Done HandleFirstToClaim");
        } else {
            $this->handleRoundRobin($lead, $group);
            Log::info("Done HandleRoundRobin");
        }
    }

    private function handleFirstToClaim(Person $lead, Group $group): void
    {
        Log::info(sprintf(
            'Starting First-to-claim distribution for Lead ID %d, Group ID %d, Distribution Type: %s',
            $lead->id,
            $group->id,
            $group->distribution->name
        ));

        $expiresAt = now()->addMinutes($group->claim_window);

        // Set lead as available for claim with expiration
        $lead->update([
            'claim_expires_at' => $expiresAt,
            'available_for_group_id' => $group->id
        ]);

        Log::info("Lead ID {$lead->id} is now available for claim by Group ID {$group->id} until {$expiresAt}.");

        // Log the SQL that would be used to query the lead and its bindings
        $query = \App\Models\Person::where('id', $lead->id)->toSql();
        \Log::info("Lead query SQL: {$query}", ['bindings' => [$lead->id]]);

        // Re-query the lead from the database and log the retrieved record
        $freshLead = \App\Models\Person::find($lead->id);
        \Log::info('Queried lead from DB', ['lead' => $freshLead ? $freshLead->toArray() : null]);

        // Schedule the expiry handler to run exactly when claim window ends
        \App\Jobs\HandleExpiredLeadClaims::dispatch()->delay($expiresAt);

        // Notify group members about new lead (broadcast event used elsewhere)
        event(new LeadAvailableForClaim($lead, $group));

        // --- NEW: create a real notification so frontend receives it and the notification action can trigger a claim
        try {
            // qualify the column name to avoid ambiguous column errors on sqlite when joins exist
            $userIds = $group->users()->pluck('users.id')->toArray();

            // Build a frontend-friendly action URL that indicates a claim should be attempted when clicked.
            $actionUrl = "/people/{$lead->id}?claim=1";

            /** @var NotificationServiceInterface $notificationService */
            $notificationService = app(NotificationServiceInterface::class);

            $notificationService->create([
                'title' => 'Lead available to claim',
                'message' => "A new lead is available for claim in group \"{$group->name}\"",
                'action' => $actionUrl,
                'image' => null,
                'user_ids' => $userIds,
                // add tenant id if your NotificationService requires it
                'tenant_id' => function_exists('tenant') ? tenant('id') : null,
            ]);
        } catch (\Throwable $e) {
            Log::error("Failed to create group claim notification: {$e->getMessage()}", [
                'lead_id' => $lead->id,
                'group_id' => $group->id,
            ]);
        }
    }

    private function handleRoundRobin(Person $lead, Group $group): void
    {
        Log::info(sprintf('Starting Round-robin distribution for Lead ID %d, Group ID %d, Distribution Type: %s', 
            $lead->id, 
            $group->id, 
            $group->distribution->name
        ));
        $users = $group->users()->orderBy('id')->get();
        if ($users->count() === 0) {
            Log::warning("Group {$group->id} has no users for round-robin distribution");
            return;
        }

        // Use database transaction to ensure atomicity
        DB::transaction(function () use ($group, $users, $lead) {
            // Get fresh group data to ensure we have latest last_assigned_index
            $group->refresh();
            
            // Get next user in rotation
            $nextIndex = ($group->last_assigned_index + 1) % $users->count();
            $nextUser = $users[$nextIndex];

            // Update group's last assigned index
            $group->update([
                'last_assigned_index' => $nextIndex
            ]);

            // Assign lead to next user
            $lead->update([
                'assigned_user_id' => $nextUser->id
            ]);

            // Notify user about new lead
            event(new LeadAssigned($lead, $nextUser));
        });
    }
}