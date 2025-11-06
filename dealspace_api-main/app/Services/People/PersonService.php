<?php

namespace App\Services\People;

use App\Exports\PeopleExport;
use App\Exports\PeopleExportTemplate;
use App\Imports\PeopleImport;
use App\Repositories\People\PeopleRepositoryInterface;
use App\Models\Person;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use App\Enums\RoleEnum;
use Illuminate\Support\Facades\Auth;
use App\Services\Groups\GroupLeadDistributionService;
use App\Models\Group;

class PersonService implements PersonServiceInterface
{
    protected $peopleRepository;
    protected $emailService;
    protected $phoneService;
    protected $addressService;
    protected $tagsService;

    /**
     * Constructor.
     *
     * @param PeopleRepositoryInterface $peopleRepository Repository for people operations
     * @param EmailServiceInterface $emailService Service for email operations
     * @param PhoneServiceInterface $phoneService Service for phone operations
     * @param AddressServiceInterface $addressService Service for address operations
     * @param TagServiceInterface $tagsService Service for tag operations
     */
    public function __construct(
        PeopleRepositoryInterface $peopleRepository,
        EmailServiceInterface $emailService,
        PhoneServiceInterface $phoneService,
        AddressServiceInterface $addressService,
        TagServiceInterface $tagsService
    ) {
        $this->peopleRepository = $peopleRepository;
        $this->emailService = $emailService;
        $this->phoneService = $phoneService;
        $this->addressService = $addressService;
        $this->tagsService = $tagsService;
    }

    /**
     * Retrieves all people with pagination.
     *
     * @param int $perPage The number of items per page
     * @param int $page The page number to retrieve
     * @param array $filters The filters to apply
     * @return LengthAwarePaginator Paginated list of people
     */
    public function getAll(int $perPage = 15, int $page = 1, array $filters = []): LengthAwarePaginator
    {
        return $this->peopleRepository->getAll($perPage, $page, $filters);
    }

    /**
     * Retrieve all people for bulk operations, with optional filters.
     *
     * This method returns a collection of Person models, not paginated, 
     * which is suitable for bulk actions like bulkDelete or bulkExport.
     * 
     * @param array $filters Filters to apply (e.g., stage_id, team_id, user_ids, search)
     * @return \Illuminate\Support\Collection Collection of Person models
     */
    public function getAllForBulk(array $filters = []): \Illuminate\Support\Collection
    {
        $query = Person::query();

        if (!empty($filters['stage_id'])) {
            $query->where('stage_id', $filters['stage_id']);
        }

        if (!empty($filters['team_id'])) {
            $query->where('team_id', $filters['team_id']);
        }

        if (!empty($filters['user_ids']) && is_array($filters['user_ids'])) {
            $query->whereIn('assigned_user_id', $filters['user_ids']);
        }

        if (!empty($filters['deal_type_id'])) {
            $query->where('deal_type_id', $filters['deal_type_id']);
        }

        if (!empty($filters['assigned_pond_id'])) {
            $query->where('assigned_pond_id', $filters['assigned_pond_id']);
        }

        if(!empty($filters['available_group_id'])){
            $query->where('available_for_group_id', $filters['available_for_group_id']);
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%$search%")
                ->orWhere('last_name', 'like', "%$search%")
                ->orWhere('email', 'like', "%$search%")
                ->orWhere('phone', 'like', "%$search%");
            });
        }

        // Optional: Load relationships if needed for policies
        return $query->get();
    }


    /**
     * Finds a person by its ID.
     *
     * @param int $id The ID of the person to find
     * @return Person The person with the given ID
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException When person not found
     */
    public function findById(int $id): Person
    {
        return $this->peopleRepository->findById($id);
    }

    /**
     * Finds a person by ID with navigation context based on filters.
     *
     * @param int $id The ID of the person to find
     * @param array $filters The same filters used in getAll method
     * @return array Array containing the person and navigation data
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException When person not found
     */
    public function findByIdWithNavigation(int $id, array $filters = []): array
    {
        $person = $this->peopleRepository->findById($id);
        $navigation = $this->peopleRepository->getNavigationContext($id, $filters);

        return [
            'person' => $person->load(['emails', 'phones', 'collaborators', 'addresses', 'tags']),
            'navigation' => $navigation
        ];
    }

    /**
     * Creates a new person with associated data.
     *
     * The given data is expected to include the following arrays, which will be
     * processed accordingly:
     * - 'emails': An array of email data, each containing at least a 'value'
     *   and optionally an 'is_primary', which will be set as primary if true.
     * - 'phones': An array of phone data, each containing at least a 'number'
     *   and optionally an 'is_primary', which will be set as primary if true.
     * - 'collaborators_ids': An array of collaborator IDs to associate with the person.
     * - 'addresses': An array of address data, each containing at least a 'street',
     *   'city', 'state', 'zip', and optionally a 'type'.
     * - 'tags': An array of tag data, each containing at least a 'name'.
     *
     * @param array $data The person data including associated entities
     * @return Person The newly created person with all associated data loaded
     */
    public function create(array $data): Person
    {
        return DB::transaction(function () use ($data) {
            // Extract arrays before creating the person
            $emails = $data['emails'] ?? [];
            $phones = $data['phones'] ?? [];
            $collaborators = $data['collaborators_ids'] ?? [];
            $addresses = $data['addresses'] ?? [];
            $tags = $data['tags'] ?? [];

            // Remove arrays from data to prevent SQL errors
            unset($data['emails'], $data['phones'], $data['collaborators_ids'], $data['addresses'], $data['tags']);

            if (isset($data['picture']) && $data['picture'] instanceof UploadedFile) {
                $data['picture'] = $this->uploadPicture($data['picture']);
            }
            $user = Auth::user();
            if ($user) {
                $data['assigned_user_id'] = $user->id; // Default to current user
            }

            $person = Person::create($data);

            // If the request asked to assign to a group or auto-distribute, handle distribution
            if (!empty($data['assign_to_group']) || !empty($data['group_id'])) {
                $groupId = $data['group_id'] ?? $data['assign_to_group'];
                $group = Group::find($groupId);
                if ($group) {
                    // Keep last_group_id for redistributions
                    $person->update(['last_group_id' => $group->id]);
                    app(GroupLeadDistributionService::class)->distributeLead($person, $group);
                }
            }

            // Handle emails if provided
            if (!empty($emails)) {
                foreach ($emails as $emailData) {
                    $this->emailService->create($person->id, $emailData);
                }
            }

            // Handle phones if provided
            if (!empty($phones)) {
                foreach ($phones as $phoneData) {
                    $this->phoneService->create($person->id, $phoneData);
                }
            }

            // Handle collaborators if provided
            if (!empty($collaborators)) {
                $this->peopleRepository->attachCollaborators($person, $collaborators);
            }

            // Handle addresses if provided
            if (!empty($addresses)) {
                foreach ($addresses as $addressData) {
                    $this->addressService->create($person->id, $addressData);
                }
            }

            // Handle tags if provided
            if (!empty($tags)) {
                foreach ($tags as $tagData) {
                    $this->tagsService->create($person->id, $tagData);
                }
            }

            return $person->load(['emails', 'phones', 'collaborators', 'addresses', 'tags']);
        });
    }

    /**
     * Updates an existing person's information.
     *
     * This method updates the details of a person with the specified ID,
     * including their basic information, picture, emails, phones,
     * collaborators, addresses, and tags. It removes existing associated
     * data (emails, phones, etc.) before adding new entries.
     *
     * @param int $id The ID of the person to update
     * @param array $data The data to update the person with, expected to include:
     * - 'emails': An array of email data
     * - 'phones': An array of phone data
     * - 'collaborators': An array of collaborator data
     * - 'addresses': An array of address data
     * - 'tags': An array of tag data
     *
     * @return Person The updated person with all associated data loaded
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException When person not found
     */
    public function update(int $id, array $data): Person
    {
        return DB::transaction(function () use ($id, $data) {
            $person = $this->peopleRepository->findById($id);

            // Extract arrays before updating the person
            $emails = $data['emails'] ?? [];
            $phones = $data['phones'] ?? [];
            $collaborators = $data['collaborators_ids'] ?? [];
            $addresses = $data['addresses'] ?? [];
            $tags = $data['tags'] ?? [];

            // Remove arrays from data to prevent SQL errors
            unset($data['emails'], $data['phones'], $data['collaborators_ids'], $data['addresses'], $data['tags']);

            if (isset($data['picture']) && $data['picture'] instanceof UploadedFile) {
                if ($person->picture) {
                    $this->deletePicture($person->picture);
                }
                $data['picture'] = $this->uploadPicture($data['picture']);
            }

            $person = $this->peopleRepository->update($id, $data);

            // Handle emails if provided
            if (!empty($emails)) {
                // Delete existing emails
                $person->emailAccounts()->delete();
                // Add new emails
                foreach ($emails as $emailData) {
                    $this->emailService->create($person->id, $emailData);
                }
            }

            // Handle phones if provided
            if (!empty($phones)) {
                // Delete existing phones
                $person->phones()->delete();
                // Add new phones
                foreach ($phones as $phoneData) {
                    $this->phoneService->create($person->id, $phoneData);
                }
            }

            // Handle collaborators if provided
            if (!empty($collaborators)) {
                // Clear existing collaborators
                $person->collaborators()->detach();
                // Add new collaborators
                $this->peopleRepository->attachCollaborators($person, $collaborators);
            }

            // Handle addresses if provided
            if (!empty($addresses)) {
                // Delete existing addresses
                $person->addresses()->delete();
                // Add new addresses
                foreach ($addresses as $addressData) {
                    $this->addressService->create($person->id, $addressData);
                }
            }

            // Handle tags if provided
            if (!empty($tags)) {
                // Delete existing tags
                $person->tags()->delete();
                // Add new tags
                foreach ($tags as $tagData) {
                    $this->tagsService->create($person->id, $tagData);
                }
            }

            return $person->load(['emails', 'phones', 'collaborators', 'addresses', 'tags']);
        });
    }

    /**
     * Delete a person by ID.
     *
     * @param int $id The ID of the person to delete
     * @return int The number of deleted records
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException When person not found
     */
    public function delete(int $id): int
    {
        return DB::transaction(function () use ($id) {
            $person = $this->peopleRepository->findById($id);
            if ($person->picture) {
                $this->deletePicture($person->picture);
            }
            return $this->peopleRepository->delete($id);
        });
    }

    /**
     * Delete multiple people in a single transaction.
     *
     * @param array $params Parameters to control the deletion operation
     *     - is_all_selected (bool): Delete all people except those in exception_ids
     *     - exception_ids (array): IDs to exclude from deletion
     *     - ids (array): IDs of people to delete
     * @param array $filters Filters to apply before deletion
     * @return int Number of deleted records
     */
    public function bulkDelete(array $params, array $filters = []): int
    {
        return DB::transaction(function () use ($params, $filters) {
            $isAllSelected = $params['is_all_selected'] ?? false;
            $exceptionIds = $params['exception_ids'] ?? [];
            $ids = $params['ids'] ?? [];

            // Get people to delete for picture cleanup
            $peopleToDelete = null;

            if ($isAllSelected) {
                if (!empty($exceptionIds)) {
                    // Get people to delete for picture cleanup before repository call
                    $peopleToDelete = Person::whereNotIn('id', $exceptionIds)->get();

                    // Delete all except those in exception_ids
                    $result = $this->peopleRepository->deleteAllExcept($exceptionIds, $filters);
                } else {
                    // Get all people for picture cleanup before repository call
                    $peopleToDelete = Person::all();

                    // Delete all
                    $result = $this->peopleRepository->deleteAll($filters);
                }
            } else {
                if (!empty($ids)) {
                    // Get specific people for picture cleanup before repository call
                    $peopleToDelete = Person::whereIn('id', $ids)->get();

                    // Delete specific ids
                    $result = $this->peopleRepository->deleteSome($ids);
                } else {
                    // No records to delete
                    return 0;
                }
            }

            // Clean up pictures
            if ($peopleToDelete) {
                foreach ($peopleToDelete as $person) {
                    if ($person->picture) {
                        $this->deletePicture($person->picture);
                    }
                }
            }

            return $result;
        });
    }

    /**
     * Finds a person by their email address.
     *
     * @param string $email The email address to search for
     * @return Person|null The person with the given email address, or null if none found
     */
    public function findByEmail(string $email): ?Person
    {
        return $this->peopleRepository->findByEmail($email);
    }

    /**
     * Attach a collaborator to a person.
     *
     * @param int $personId ID of the person
     * @param int $collaboratorId ID of the collaborator to attach
     * @return void
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException When person not found
     */
    public function attachCollaborator(int $personId, int $collaboratorId): void
    {
        $person = $this->peopleRepository->findById($personId);
        $this->peopleRepository->attachCollaborator($person, $collaboratorId);
    }

    /**
     * Detach a collaborator from a person.
     *
     * @param int $personId ID of the person
     * @param int $collaboratorId ID of the collaborator to detach
     * @return void
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException When person not found
     */
    public function detachCollaborator(int $personId, int $collaboratorId): void
    {
        $person = $this->peopleRepository->findById($personId);
        $this->peopleRepository->detachCollaborator($person, $collaboratorId);
    }

    /**
     * Attach multiple collaborators to a person.
     *
     * @param int $personId ID of the person
     * @param array $collaboratorIds Array of collaborator IDs to attach
     * @return void
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException When person not found
     */
    public function attachCollaborators(int $personId, array $collaboratorIds): void
    {
        $person = $this->peopleRepository->findById($personId);
        $this->peopleRepository->attachCollaborators($person, $collaboratorIds);
    }

    /**
     * Uploads a picture file to the people/pictures folder in the default filesystem
     * and returns the URL to the uploaded file.
     *
     * @param UploadedFile $file The file to upload
     * @return string The URL to the uploaded file
     */
    protected function uploadPicture(UploadedFile $file): string
    {
        $path = $file->store('people/pictures', 'public');
        return Storage::url($path);
    }

    /**
     * Deletes a picture file by its path.
     *
     * @param string $path The path to the picture file, relative to the public disk
     * @return void
     */
    protected function deletePicture(string $path): void
    {
        $path = str_replace('/storage/', '', $path);
        Storage::disk('public')->delete($path);
    }

    /**
     * Import people from an Excel file.
     *
     * @param UploadedFile $file Excel file to import
     * @return array Results of the import operation
     */
    public function importExcel(UploadedFile $file): array
    {
        // Create a new instance of the PeopleImport class and inject the person service
        $import = new PeopleImport($this);

        // Import the Excel file
        $import->import($file);

        // Return the import results
        return $import->getResult();
    }

    /**
     * Download Excel template for people import.
     *
     * @return BinaryFileResponse Excel file for download
     */
    public function downloadExcelTemplate(): BinaryFileResponse
    {
        // Create a new instance of the PeopleExportTemplate class
        $export = new PeopleExportTemplate();

        // Generate the Excel file with a specific filename
        return $export->download('people_import_template.xlsx');
    }

    /**
     * Export people to Excel based on provided parameters.
     *
     * @param array $params Parameters to control the export operation
     *     - is_all_selected (bool): Export all people except those in exception_ids
     *     - exception_ids (array): IDs to exclude from export
     *     - ids (array): IDs of people to export
     * @return BinaryFileResponse Excel file for download
     */
    public function bulkExport(array $params): BinaryFileResponse
    {
        // Create a new instance of the PeopleExport class with parameters
        $export = new PeopleExport($params);

        // Generate the Excel file with a dynamic filename including timestamp
        $filename = 'people_export_' . date('Y-m-d_His') . '.xlsx';

        return $export->download($filename);
    }

    /**
     * Set custom field values for a person.
     *
     * @param int $personId
     * @param array $customFieldData
     * @return void
     * @throws ValidationException
     */
    public function setCustomFieldValues(int $personId, array $customFieldData): void
    {
        $this->peopleRepository->setCustomFieldValues($personId, $customFieldData);
    }
}
