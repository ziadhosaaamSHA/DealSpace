<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Person;
use App\Models\Group;
use App\Models\User;
use App\Enums\RoleEnum;
use App\Events\LeadAssigned;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Services\Groups\GroupLeadDistributionService;
use App\Http\Requests\Groups\DistributeLeadToGroupRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class GroupLeadController extends Controller
{
    private GroupLeadDistributionService $distributionService;

    public function __construct(GroupLeadDistributionService $distributionService)
    {
        $this->distributionService = $distributionService;
    }

    /**
     * Attempt to claim a lead for the authenticated user.
     * POST /api/people/{person}/claim
     */
    public function claim(Request $request, $personId): JsonResponse
    {
        $user = $request->user();

        try {
            $result = DB::transaction(function () use ($personId, $user) {
                // Lock the person row to avoid races
                $lead = Person::where('id', $personId)->lockForUpdate()->first();

                if (!$lead) {
                    return ['status' => 'not_found', 'message' => 'Lead not found'];
                }

                // Must be available for a group
                if (empty($lead->available_for_group_id) || !$lead->claim_expires_at) {
                    return ['status' => 'not_available', 'message' => 'Lead is not available for claim'];
                }

                // Check expiration (claim_expires_at may be a string, ensure it's a Carbon instance)
                $expiresAt = $lead->claim_expires_at instanceof \Carbon\Carbon
                    ? $lead->claim_expires_at
                    : Carbon::parse($lead->claim_expires_at);

                if ($expiresAt->isPast()) {
                    return ['status' => 'expired', 'message' => 'Claim window has expired'];
                }

                // Check user is part of the target group
                $group = Group::find($lead->available_for_group_id);
                if (!$group) {
                    return ['status' => 'not_available', 'message' => 'Target group no longer exists'];
                }

                // Qualify the users.id column to avoid ambiguous column errors on sqlite when joins present
                $isMember = $group->users()->where('users.id', $user->id)->exists();
                if (!$isMember) {
                    return ['status' => 'forbidden', 'message' => 'User is not a member of the group'];
                }

                // If already assigned -> fail unless the assigned user is an Owner or Admin
                if (!empty($lead->assigned_user_id)) {
                    $assignedUser = User::find($lead->assigned_user_id);
                    // If we can't find the assigned user, treat as not assigned and allow claim
                    if ($assignedUser) {
                        $assignedRole = $assignedUser->role ?? null;
                        $isPrivileged = ($assignedRole === RoleEnum::OWNER || $assignedRole === RoleEnum::ADMIN);
                        if (! $isPrivileged) {
                            return ['status' => 'already_assigned', 'message' => 'Lead already assigned'];
                        }
                        // assigned user is privileged (Owner/Admin): allow current user to claim
                    }
                }

                // All good: assign to current user and clear availability fields
                $lead->assigned_user_id = $user->id;
                $lead->available_for_group_id = null;
                $lead->claim_expires_at = null;
                $lead->last_group_id = $group->id;
                $lead->save();

                // Fire assigned event (frontend/notifications can respond)
                event(new LeadAssigned($lead, $user));

                return ['status' => 'claimed', 'lead' => $lead];
            }, 5); // retry attempts

            if ($result['status'] === 'claimed') {
                // return redirect path so frontend can navigate to lead page
                $lead = $result['lead'];
                return response()->json([
                    'success' => true,
                    'message' => 'Lead successfully claimed',
                    'redirect' => "/people/{$lead->id}"
                ]);
            }

            // other known states
            $status = $result['status'] ?? 'error';
            $message = $result['message'] ?? 'Unable to claim lead';
            $code = match ($status) {
                'not_found' => 404,
                'forbidden' => 403,
                'already_assigned' => 409,
                'expired' => 410,
                'not_available' => 400,
                default => 400,
            };

            return response()->json(['success' => false, 'message' => $message], $code);
        } catch (\Throwable $e) {
            Log::error('Error claiming lead: ' . $e->getMessage(), ['person_id' => $personId, 'user_id' => $user?->id]);
            return response()->json(['success' => false, 'message' => 'Server error'], 500);
        }
    }

    /**
     * Distribute Person Based on the Param Group ID
     * @param DistributeLeadToGroupRequest $request
     * @return JsonResponse
     */
    public function distributeToGroup(DistributeLeadToGroupRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $group = Group::findOrFail($validated['groupId']);
        $lead = Person::findOrFail($validated['personId']);

        // Build params as an array so the service receives the expected type
        $params = [
            'personId' => $lead->id,
            'groupId' => $group->id,
        ];

        $this->distributionService->distributeLead($params);

        return successResponse(
            'People distributed successfully',
            ['count' => 1]
        );
    }
}