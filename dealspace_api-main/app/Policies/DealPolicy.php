<?php

namespace App\Policies;

use App\Models\Deal;
use App\Models\User;
use Illuminate\Auth\Access\Response;
use App\Enums\RoleEnum;
use App\Models\Person;

class DealPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Deal $deal): bool
    {
        return true;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $this->isOwnerOrAdmin($user)
            || $this->isAssignedPersonAgent($user, new Deal());
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Deal $deal): bool
    {
        return $this->isOwnerOrAdmin($user)
            || $this->isAssignedPersonAgent($user, $deal)
            || $this->isAssignedUser($user, $deal);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Deal $deal): bool
    {
        return $this->isOwnerOrAdmin($user)
            || $this->isAssignedPersonAgent($user, $deal)
            || $this->isAssignedUser($user, $deal);
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Deal $deal): bool
    {
        return $this->isOwnerOrAdmin($user);
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Deal $deal): bool
    {
        return $this->isOwnerOrAdmin($user);
    }

    /**
     * Get the user's role.
     */
    private function role(User $user): RoleEnum
    {
        return $user->role instanceof RoleEnum
            ? $user->role
            : RoleEnum::from((int) $user->role);
    }

    private function isOwnerOrAdmin(User $user): bool
    {
        return in_array($this->role($user), [RoleEnum::OWNER, RoleEnum::ADMIN], true);
    }

    private function isAssignedUser(User $user, Deal $deal): bool
    {
        $userId = $user->id;

        return $deal->users->contains(fn ($u) => $u->id === $userId);
    }
    private function isAssignedPersonAgent(User $user, Deal $deal): bool
    {
        $userId = $user->id;

        return $deal->people->contains(fn ($p) => (int)($p->assigned_user_id ?? 0) === $userId);
    }


}
