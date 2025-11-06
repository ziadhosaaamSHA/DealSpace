<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;
use App\Enums\RoleEnum;
use App\Policies\PersonPolicy;
use App\Scopes\DealScopes;

class Deal extends Model
{
    use BelongsToTenant;
    use DealScopes;

    protected $fillable = [
        'name',
        'stage_id',
        'type_id',
        'description',
        'price',
        'projected_close_date',
        'order_weight',
        'commission_value',
        'agent_commission',
        'team_commission',
    ];

    protected $casts = [
        'projected_close_date' => 'date',
        'price' => 'integer',
        'order_weight' => 'integer',
        'commission_value' => 'integer',
        'agent_commission' => 'integer',
        'team_commission' => 'integer',
    ];

    /**
     * Get the stage that this deal belongs to.
     */
    public function stage()
    {
        return $this->belongsTo(DealStage::class);
    }

    /**
     * Get the type that this deal belongs to.
     */
    public function type()
    {
        return $this->belongsTo(DealType::class);
    }

    /**
     * The people that belong to the deal.
     */
    public function people()
    {
        return $this->belongsToMany(Person::class)
            ->withTimestamps();
    }

    /**
     * The users that belong to the deal.
     */
    public function users()
    {
        return $this->belongsToMany(User::class)
            ->withTimestamps();
    }

    /**
     * The attachments that belong to the deal.
     */
    public function attachments()
    {
        return $this->hasMany(DealAttachment::class);
    }
}   
