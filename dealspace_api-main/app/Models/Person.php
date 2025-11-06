<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;
use App\Scopes\PersonScopes;



class Person extends Model
{
    use HasFactory;
    use BelongsToTenant;
    use PersonScopes;

    protected $fillable = [
        'name',
        'first_name',
        'last_name',
        'stage',
        'stage_id',
        'source',
        'source_url',
        'contacted',
        'price',
        'assigned_lender_id',
        'assigned_user_id',
        'assigned_pond_id',
        'available_for_group_id',
        'last_group_id',
        'claim_expires_at',
        'picture',
        'background',
        'timeframe_id',
        'created_via',
        'last_activity',
        'initial_assigned_user_id',
        "tenant_id"
    ];

    protected $casts = [
        'prequalified' => 'boolean',
        'price' => 'decimal:2',
        'last_activity' => 'datetime',
    ];

    public function emailAccounts(): HasMany
    {
        return $this->hasMany(PersonEmail::class);
    }

    public function emails(): HasMany
    {
        return $this->hasMany(Email::class);
    }

    public function phones(): HasMany
    {
        return $this->hasMany(PersonPhone::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(Event::class);
    }

    public function texts(): HasMany
    {
        return $this->hasMany(TextMessage::class);
    }

    public function calls(): HasMany
    {
        return $this->hasMany(Call::class);
    }
    public function collaborators(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'person_collaborator', 'person_id', 'user_id');
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(PersonAddress::class);
    }

    public function tags(): HasMany
    {
        return $this->hasMany(PersonTag::class);
    }

    public function stage()
    {
        return $this->belongsTo(Stage::class, 'stage_id');
    }

    public function deals()
    {
        return $this->belongsToMany(Deal::class, 'deal_person', 'person_id', 'deal_id')
            ->withTimestamps();
    }
    /**
     * Assigned user for the person.
     */
    public function assignedUser()
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }
    /**
     * Assigned lender for the person.
     */
    public function assignedLender()
    {
        return $this->belongsTo(User::class, 'assigned_lender_id');
    }
    /**
     * Assigned pond for the person.
    */
    public function assignedPond()
    {
        return $this->belongsTo(Pond::class, 'assigned_pond_id');
    }

    /**
     * Assigned group for the person
     */
    public function assignedGroup()
    {
        return $this->belongsTo(Group::class, 'available_for_group_id');
    }
    
    /**
     * Custom field relationships
     */
    public function customFieldValues(): HasMany
    {
        return $this->hasMany(PersonCustomFieldValue::class);
    }

    public function customFields(): BelongsToMany
    {
        return $this->belongsToMany(CustomField::class, 'person_custom_field_values')
            ->withPivot('value')
            ->withTimestamps();
    }

    public function setCustomFieldValue($customFieldId, $value)
    {
        $this->customFieldValues()->updateOrCreate(
            ['custom_field_id' => $customFieldId],
            ['value' => $value]
        );
    }

    public function isClaimableBy(User $user, Group $group): bool
    {
        return $this->available_for_group_id === $group->id &&
               $this->claim_expires_at > now() &&
               $group->users->contains($user);
    }
}
