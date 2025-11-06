<?php

namespace App\Repositories\People;

use App\Models\Person;
use App\Models\Team;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class PeopleRepository implements PeopleRepositoryInterface
{
    protected $model;

    /**
     * Constructor.
     *
     * @param Person $model The Person model instance
     */
    public function __construct(Person $model)
    {
        $this->model = $model;
    }

    /**
     * Retrieves all records with pagination.
     *
     * @param int $perPage The number of items per page
     * @param int $page The page number to retrieve
     * @param array $filters The filters to apply
     * @return LengthAwarePaginator Paginated list of records
     */
    public function getAll(int $perPage = 15, int $page = 1, array $filters = []): LengthAwarePaginator
    {
        $query = $this->buildFilteredQuery($filters);
        return $query->paginate($perPage, ['*'], 'page', $page);
    }

    /**
     * Find a record by its ID.
     *
     * @param int $id The ID of the record to find
     * @return Person The person with the given ID
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException When record not found
     */
    public function findById(int $id): Person
    {
        return $this->model->findOrFail($id);
    }

    /**
     * Get navigation context for a person within filtered results.
     *
     * @param int $id The ID of the current person
     * @param array $filters The same filters used in getAll method
     * @return array Navigation context containing position, total, next_id, previous_id
     */
    public function getNavigationContext(int $id, array $filters = []): array
    {
        $query = $this->buildFilteredQuery($filters);

        // Get all IDs in the filtered result set, ordered the same way as getAll
        $allIds = $query->pluck('id')->toArray();

        // Find the position of current ID
        $currentPosition = array_search($id, $allIds);

        if ($currentPosition === false) {
            // Person not found in filtered results
            return [
                'current_position' => null,
                'total_count' => count($allIds),
                'next_id' => null,
                'previous_id' => null
            ];
        }

        // Calculate navigation
        $nextId = isset($allIds[$currentPosition + 1]) ? $allIds[$currentPosition + 1] : null;
        $previousId = isset($allIds[$currentPosition - 1]) ? $allIds[$currentPosition - 1] : null;

        return [
            'current_position' => $currentPosition + 1, // 1-based position
            'total_count' => count($allIds),
            'next_id' => $nextId,
            'previous_id' => $previousId
        ];
    }

    /**
     * Build a filtered query based on provided filters.
     *
     * @param array $filters The filters to apply
     * @return \Illuminate\Database\Eloquent\Builder
     */
    protected function buildFilteredQuery(array $filters = [])
    {
    $query = $this->model->newQuery();
    $user = Auth::user();

    if ($user) {
        $query = $query->visibleTo($user);
    }
        if (isset($filters['stage_id'])) {
            $query->where('stage_id', $filters['stage_id']);
        }

        if (isset($filters['team_id'])) {
            $team = Team::find($filters['team_id']);

            $users = $team ? $team->users()->pluck('user_id')->toArray() : [];
            $leaders = $team ? $team->leaders()->pluck('user_id')->toArray() : [];

            $query->where(function ($q) use ($users, $leaders) {
                $q->whereIn('assigned_lender_id', array_merge($users, $leaders))
                    ->orWhereIn('assigned_user_id', array_merge($users, $leaders))
                    ->orWhereIn('assigned_pond_id', array_merge($users, $leaders))
                    ->orWhereIn('available_group_id', array_merge($users, $leaders))
                    ->orWhereHas('collaborators', function ($q) use ($users, $leaders) {
                        $q->whereIn('user_id', array_merge($users, $leaders));
                    });
            });
        }

        if (isset($filters['user_ids'])) {
            $query->where(function ($q) use ($filters) {
                $q->whereIn('assigned_lender_id', $filters['user_ids'])
                    ->orWhereIn('assigned_user_id', $filters['user_ids'])
                    ->orWhereIn('assigned_pond_id', $filters['user_ids'])
                    ->orWhereIn('available_for_group_id', $filters['user_ids'])
                    ->orWhereHas('collaborators', function ($q) use ($filters) {
                        $q->whereIn('user_id', $filters['user_ids']);
                    });
            });
        }

        if (isset($filters['deal_type_id'])) {
            $query->whereHas('deals', function ($q) use ($filters) {
                $q->where('type_id', $filters['deal_type_id']);
            });
        }

        if (isset($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%")
                    ->orWhereHas('emailAccounts', function ($q) use ($search) {
                        $q->where('value', 'like', "%{$search}%");
                    })
                    ->orWhereHas('phones', function ($q) use ($search) {
                        $q->where('value', 'like', "%{$search}%");
                    });
            });
        }

        return $query;
    }

    /**
     * Creates a new record with the given data.
     *
     * @param array $data The data to use when creating the record
     * @return Person The newly created record
     */
    public function create(array $data): Person
    {
        return $this->model->create($data);
    }

    /**
     * Update a record with the given ID.
     *
     * @param int $id The ID of the record to update
     * @param array $data The data to update the record with
     * @return Person The updated record
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException When record not found
     */
    public function update(int $id, array $data): Person
    {
        $person = $this->findById($id);
        $person->update($data);
        return $person;
    }

    /**
     * Deletes a record with the given ID.
     *
     * @param int $id The ID of the record to delete
     * @return int The number of deleted records
     */
    public function delete(int $id): int
    {
        return $this->model->destroy($id);
    }

    /**
     * Finds a person by email address.
     *
     * @param string $email The email address to search for
     * @return Person|null The person with the given email address, or null if none found
     */
    public function findByEmail(string $email): ?Person
    {
        return $this->model->whereHas('emailAccounts', function ($query) use ($email) {
            $query->where('value', $email);
        })->first();
    }

    /**
     * Delete all records with optional filters.
     *
     * @param array $filters Filters to apply before deletion
     * @return int Number of deleted records
     */
    public function deleteAll(array $filters = []): int
    {
        $query = $this->buildFilteredQuery($filters);
        return $query->delete();
    }

    /**
     * Delete all records except those with specified IDs, with optional filters.
     *
     * @param array $ids IDs to exclude from deletion
     * @param array $filters Filters to apply before deletion
     * @return int Number of deleted records
     */
    public function deleteAllExcept(array $ids, array $filters = []): int
    {
        $query = $this->buildFilteredQuery($filters);
        $query->whereNotIn('id', $ids);
        return $query->delete();
    }

    /**
     * Delete multiple records by their IDs.
     *
     * @param array $ids IDs of records to delete
     * @return int Number of deleted records
     */
    public function deleteSome(array $ids): int
    {
        return $this->model->whereIn('id', $ids)->delete();
    }

    /**
     * Import multiple people records at once.
     *
     * @param array $people Array of people data to import
     * @return Collection Collection of created Person models
     */
    public function import(array $people): Collection
    {
        $created = new Collection();

        DB::transaction(function () use ($people, &$created) {
            foreach ($people as $personData) {
                $created->push($this->model->create($personData));
            }
        });

        return $created;
    }

    /**
     * Attach multiple collaborators to a person.
     *
     * @param Person $person The person to attach collaborators to
     * @param array $collaboratorIds Array of collaborator IDs to attach
     * @return void
     */
    public function attachCollaborators(Person $person, array $collaboratorIds): void
    {
        $person->collaborators()->sync($collaboratorIds);
    }

    /**
     * Attach a single collaborator to a person.
     *
     * @param Person $person The person to attach the collaborator to
     * @param int $collaboratorId ID of the collaborator to attach
     * @return void
     */
    public function attachCollaborator(Person $person, int $collaboratorId): void
    {
        $person->collaborators()->attach($collaboratorId);
    }

    /**
     * Detach a single collaborator from a person.
     *
     * @param Person $person The person to detach the collaborator from
     * @param int $collaboratorId ID of the collaborator to detach
     * @return void
     */
    public function detachCollaborator(Person $person, int $collaboratorId): void
    {
        $person->collaborators()->detach($collaboratorId);
    }

    /**
     * Set multiple custom field values for a person.
     *
     * @param int $personId The person ID
     * @param array $customFieldValues Array of custom field ID => value pairs
     * @return void
     */
    public function setCustomFieldValues(int $personId, array $customFieldValues): void
    {
        $person = $this->findById($personId);

        DB::transaction(function () use ($person, $customFieldValues) {
            foreach ($customFieldValues as $obj) {
                $person->setCustomFieldValue($obj['id'], $obj['value']);
            }
        });
    }
}
