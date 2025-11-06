<?php

namespace App\Models;

use App\Enums\GroupDistributionEnum;
use App\Enums\GroupTypeEnum;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;
use App\Models\User;
use App\Models\Pond;
use App\Scopes\GroupScopes;

class Group extends Model
{
    use HasFactory;
    use BelongsToTenant;
    use GroupScopes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
    */
    protected $fillable = [
        'name',
        'type',
        'distribution',
        'default_user_id',
        'default_pond_id',
        'default_group_id',
        'claim_window',
        'is_primary',
        'last_assigned_index',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'is_primary' => 'boolean',
        'claim_window' => 'integer',
        'distribution' => GroupDistributionEnum::class,
        'type' => GroupTypeEnum::class
    ];


    /**
     * Get the count of the users of the group.
     *
     * @return int
     */
    public function getUsersCountAttribute()
    {
        return $this->users()->count();
    }

    /**
     * The users that belong to the group.
     */
    public function users()
    {
        return $this->belongsToMany(User::class)
            ->withPivot('sort_order')
            ->orderBy('sort_order')
            ->withTimestamps();
    }

    /**
     * Get the default user for this group.
     */
    public function defaultUser()
    {
        return $this->belongsTo(User::class, 'default_user_id');
    }

    /**
     * Get the default group for this group.
     */
    public function defaultGroup()
    {
        return $this->belongsTo(Group::class, 'default_group_id');
    }

    /**
     * Get the default pond for this group.
     */
    public function defaultPond()
    {
        return $this->belongsTo(Pond::class, 'default_pond_id');
    }
}