<?php

namespace App\Scopes;

use App\Enums\RoleEnum;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

trait DealScopes
{
    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        $role = $user->role instanceof RoleEnum ? $user->role : RoleEnum::from($user->role);

        return match ($role) {
            RoleEnum::OWNER, RoleEnum::ADMIN => $query,
            RoleEnum::AGENT => $query->where(function (Builder $q) use ($user) {
                $q->whereHas('users', fn ($qq) => $qq->where('users.id', $user->id))
                  ->orWhereHas('people', fn ($qq) => $qq->whereHas('collaborators', fn ($qqq) => $qqq->where('user_id', $user->id)))
                  ->orWhereHas('people', fn ($qq) => $qq->where('assigned_user_id', $user->id));
            }),
            RoleEnum::ISAs => $query->whereHas('people', fn ($qq) => $qq->where('assigned_user_id', $user->id)),
            RoleEnum::LENDER => $query->whereHas('people', fn ($qq) => $qq->where('assigned_lender_id', $user->id)),
        };
    }
}
