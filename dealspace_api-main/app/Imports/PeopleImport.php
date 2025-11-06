<?php

namespace App\Imports;

use App\Models\Person;
use App\Models\Stage;
use App\Services\People\PersonServiceInterface;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Concerns\Importable;
use Maatwebsite\Excel\Concerns\SkipsEmptyRows;
use Illuminate\Support\Collection;

class PeopleImport implements ToCollection, WithHeadingRow, WithValidation, SkipsEmptyRows
{
    use Importable;

    protected $personService;
    protected $result = [
        'total' => 0,
        'created' => 0,
        'failed' => 0,
        'errors' => []
    ];

    /**
     * Constructor
     *
     * @param PersonServiceInterface $personService
     */
    public function __construct(PersonServiceInterface $personService)
    {
        $this->personService = $personService;
    }

    /**
     * @param Collection $rows
     */
    public function collection(Collection $rows)
    {
        foreach ($rows as $rowIndex => $row) {
            try {
                $rowNumber = $rowIndex + 2; // Account for header row and 0-indexing

                // Skip empty rows (should be handled by SkipsEmptyRows, but just in case)
                if ($row->filter()->isEmpty()) {
                    continue;
                }

                // Extract basic person data
                $stageName = $row['stage'] ?? 'New Lead';

                // Try to find the stage using LIKE or create it
                $stage = Stage::where('name', 'LIKE', "%{$stageName}%")->first();

                if (!$stage) {
                    $stage = Stage::create([
                        'name' => $stageName,
                        'description' => null, // or provide a default/optional description
                    ]);
                }

                $person = [
                    'name' => $row['name'] ?? null,
                    'first_name' => $row['first_name'] ?? null,
                    'last_name' => $row['last_name'] ?? null,
                    'prequalified' => isset($row['prequalified']) ? filter_var($row['prequalified'], FILTER_VALIDATE_BOOLEAN) : false,
                    'stage_id' => $stage->id,
                    'source' => $row['source'] ?? null,
                    'source_url' => $row['source_url'] ?? null,
                    'contacted' => isset($row['contacted']) ? (int)$row['contacted'] : 0,
                    'price' => isset($row['price']) ? (float)$row['price'] : null,
                    'assigned_lender_id' => $row['assigned_lender_id'] ?? null,
                    'assigned_lender_name' => $row['assigned_lender_name'] ?? null,
                    'assigned_user_id' => $row['assigned_user_id'] ?? null,
                    'assigned_pond_id' => $row['assigned_pond_id'] ?? null,
                    'available_for_group_id' => $row['available_for_group_id'] ?? null,
                    'assigned_to' => $row['assigned_to'] ?? null,
                    'timeframe_id' => $row['timeframe_id'] ?? null,
                ];

                // Handle related entities
                $emails = [];
                $phones = [];
                $collaborators = [];
                $addresses = [];
                $tags = [];

                // Process email if present
                if (!empty($row['email'])) {
                    $emails[] = [
                        'value' => $row['email'],
                        'type' => $row['email_type'] ?? 'work',
                        'is_primary' => true,
                        'status' => $row['email_status'] ?? 'Not Validated'
                    ];
                }

                // Process phone if present
                if (!empty($row['phone'])) {
                    $phones[] = [
                        'value' => $row['phone'],
                        'type' => $row['phone_type'] ?? 'mobile',
                        'is_primary' => true,
                        'status' => $row['phone_status'] ?? 'Not Validated'
                    ];
                }

                // Process collaborator if present
                if (!empty($row['collaborator_name'])) {
                    $collaborators[] = [
                        'name' => $row['collaborator_name'],
                        'assigned' => isset($row['collaborator_assigned']) ? filter_var($row['collaborator_assigned'], FILTER_VALIDATE_BOOLEAN) : false,
                        'role' => $row['collaborator_role'] ?? null
                    ];
                }

                // Process address if present
                if (!empty($row['street_address']) || !empty($row['city'])) {
                    $addresses[] = [
                        'street_address' => $row['street_address'] ?? null,
                        'city' => $row['city'] ?? null,
                        'state' => $row['state'] ?? null,
                        'postal_code' => $row['postal_code'] ?? null,
                        'country' => $row['country'] ?? null,
                        'type' => $row['address_type'] ?? 'home',
                        'is_primary' => true
                    ];
                }

                // Process tag if present
                if (!empty($row['tag_name'])) {
                    $tags[] = [
                        'name' => $row['tag_name'],
                        'color' => $row['tag_color'] ?? '#000000',
                        'description' => $row['tag_description'] ?? null
                    ];
                }

                // Add related entities to person data
                $person['emails'] = $emails;
                $person['phones'] = $phones;
                $person['collaborators'] = $collaborators;
                $person['addresses'] = $addresses;
                $person['tags'] = $tags;

                // Create new person
                $this->personService->create($person);
                $this->result['created']++;
                $this->result['total']++;
            } catch (\Exception $e) {
                $this->result['failed']++;
                $this->result['errors'][] = "Row {$rowNumber}: " . $e->getMessage();
            }
        }
    }

    /**
     * Get the validation rules that apply to the import.
     *
     * @return array
     */
    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:255',
            'first_name' => 'sometimes|string|max:255',
            'last_name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|max:255',
            'phone' => 'sometimes|max:20',
        ];
    }

    /**
     * @return array
     */
    public function customValidationMessages()
    {
        return [
            'email.email' => 'The email address is not valid.',
            'name.max' => 'The name is too long (maximum is 255 characters).',
        ];
    }

    /**
     * Get the import results.
     *
     * @return array
     */
    public function getResult(): array
    {
        return $this->result;
    }
}
