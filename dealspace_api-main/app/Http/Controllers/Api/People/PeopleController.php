<?php

namespace App\Http\Controllers\Api\People;

use App\Http\Controllers\Controller;
use App\Http\Requests\People\StorePeopleRequest;
use App\Http\Requests\People\UpdatePeopleRequest;
use App\Http\Requests\People\BulkDeletePeopleRequest;
use App\Http\Requests\People\BulkExportPeopleRequest;
use App\Http\Requests\People\ImportPeopleRequest;
use App\Http\Requests\People\SetCustomFieldRequest;
use App\Http\Resources\PersonResource;
use App\Http\Resources\PeopleCollection;
use App\Services\People\PersonServiceInterface;
use App\Services\LeadFlowRules\LeadFlowRuleService; 
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use App\Models\Person;
use Illuminate\Support\Facades\Log;

class PeopleController extends Controller
{
    use AuthorizesRequests;
    
    protected $personService;
    protected $leadFlowService; 

    public function __construct(
        PersonServiceInterface $personService,
        LeadFlowRuleService $leadFlowService // Add this
    ) {
        $this->personService = $personService;
        $this->leadFlowService = $leadFlowService; // Add this
    }

    /**
     * Display a paginated list of people.
     *
     * @param Request $request The request instance containing query parameters.
     * @return JsonResponse JSON response containing the list of people and pagination metadata.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->input('per_page', 15);
        $page = $request->input('page', 1);
        $filters = $this->buildFilters($request);

        $people = $this->personService->getAll($perPage, $page, $filters);
        foreach ($people as $person) {
            Gate::authorize('view', $person);
        }
        return successResponse(
            'People retrieved successfully',

            new PeopleCollection($people)
        );
    }

    /**
     * Display the specified Person with navigation context.
     *
     * @param Request $request The request instance containing filter parameters.
     * @param int $id The ID of the Person to retrieve.
     * @return JsonResponse JSON response containing the retrieved Person with navigation data.
     */
    public function show(Request $request, int $id): JsonResponse
    {

        $filters = $this->buildFilters($request);

        // Get person with navigation context
        $result = $this->personService->findByIdWithNavigation($id, $filters);

        Gate::authorize('view', $result['person']);

        return successResponse(
            'Person retrieved successfully',
            [
                'person' => new PersonResource($result['person']),
                'navigation' => $result['navigation']
            ]
        );
    }

    /**
     * Store a newly created Person in storage.
     *
     * @param StorePeopleRequest $request The request instance containing the data to store.
     * @return JsonResponse JSON response containing the created Person and a 201 status code.
     */
    public function store(StorePeopleRequest $request): JsonResponse
    {
        $user = $request->user();
        $tenant = $user->tenant;

        $usage = $tenant->getFeatureUsage('contacts');
        $limit = $tenant->planConfig()['limits']['contacts'] ?? null;

        if ($limit !== null && $usage >= $limit) {
            return response()->json(['message' => 'Contacts limit reached for your current plan. Please upgrade to add more contacts.'], 403);
        }
 
        Gate::authorize('create', Person::class);
        $person = $this->personService->create($request->validated());

        // NEW: Process through lead flow rules
        try {
            $matchedRule = $this->leadFlowService->processLead(
                $person,
                $request->input('source_type', 'manual'),
                $request->input('source_name', 'web_form')
            );
            Log::info("Person created and processed through lead flow rules", [
                'person_id' => $person->id,
                'rule_applied' => $matchedRule ? $matchedRule->name : 'none',
                'tenant_id' => tenant('id')
            ]);
            if ($matchedRule) {
                Log::info("Lead flow rule applied", [
                    'person_id' => $person->id,
                    'rule_id' => $matchedRule->id,
                    'rule_name' => $matchedRule->name
                ]);
            }
        } catch (\Exception $e) {
            // Don't fail the person creation if rule processing fails
            Log::error("Lead flow rule processing failed", [
                'person_id' => $person->id,
                'error' => $e->getMessage()
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => new PersonResource($person),
            'message' => 'Person created successfully',
            'lead_flow_applied' => isset($matchedRule) ? $matchedRule->name : null
        ], 201);
    }

    /**
     * Update the specified Person in storage.
     *
     * @param UpdatePeopleRequest $request The request instance containing the data to update.
     * @param int $id The ID of the Person to update.
     * @return JsonResponse JSON response containing the updated Person.
     */
    public function update(UpdatePeopleRequest $request, int $id): JsonResponse
    {
        Gate::authorize('update', Person::findOrFail($id));
        $person = $this->personService->update($id, $request->validated());
        return successResponse(
            'Person updated successfully',
            new PersonResource($person)
        );
    }

    /**
     * Remove the specified Person from storage.
     *
     * @param int $id The ID of the Person to delete.
     * @return JsonResponse JSON response containing the result of the deletion.
     */
    public function destroy(int $id): JsonResponse
    {
        Gate::authorize('delete', Person::findOrFail($id));
        $this->personService->delete($id);
        return successResponse(
            'Person deleted successfully',
            null
        );
    }

    /**
     * Bulk delete people based on provided parameters
     *
     * @param BulkDeletePeopleRequest $request
     * @return JsonResponse
     */
    public function bulkDelete(BulkDeletePeopleRequest $request): JsonResponse
    {
        $filters = $this->buildFilters($request);
        foreach ($this->personService->getAllForBulk($filters) as $person) {
            Gate::authorize('delete', $person);
        }
        $deletedCount = $this->personService->bulkDelete($request->validated(), $filters);

        return successResponse(
            'People deleted successfully',
            ['count' => $deletedCount]
        );
    }

    /**
     * Download Excel template for people import
     *
     * @return \Symfony\Component\HttpFoundation\BinaryFileResponse
     */
    public function downloadTemplate()
    {
        return $this->personService->downloadExcelTemplate();
    }

    /**
     * Import people from Excel file
     *
     * @param ImportPeopleRequest $request
     * @return JsonResponse
     */
    public function import(ImportPeopleRequest $request): JsonResponse
    {
        Gate::authorize('create', Person::class);
        $result = $this->personService->importExcel($request->getFile());

        // ✅ NEW: Process imported leads through rules
        if ($request->boolean('apply_lead_flow', true)) {
            $processedCount = 0;
            $sourceType = $request->input('source_type', 'import');
            $sourceName = $request->input('source_name', 'csv_import');
            
            foreach ($result['imported'] ?? [] as $personData) {
                try {
                    $person = Person::find($personData['id']);
                    if ($person) {
                        $this->leadFlowService->processLead($person, $sourceType, $sourceName);
                        $processedCount++;
                    }
                } catch (\Exception $e) {
                    Log::error("Lead flow failed for imported person", [
                        'person_id' => $personData['id'],
                        'error' => $e->getMessage()
                    ]);
                }
            }
            
            $result['lead_flow_processed'] = $processedCount;
        }

        return response()->json([
            'success' => true,
            'data' => $result,
            'message' => 'Import completed successfully'
        ]);
    }

    /**
     * Bulk export people to Excel based on provided parameters
     *
     * @param BulkExportPeopleRequest $request
     * @return \Symfony\Component\HttpFoundation\BinaryFileResponse
     */
    public function bulkExport(BulkExportPeopleRequest $request)
    {
        return $this->personService->bulkExport($request->validated());
    }

    /**
     * Attach a collaborator to a person
     *
     * @param int $personId
     * @param int $collaboratorId
     * @return JsonResponse
     */
    public function attachCollaborator(int $personId, int $collaboratorId): JsonResponse
    {
        $this->personService->attachCollaborator($personId, $collaboratorId);

        return successResponse(
            'Collaborator attached successfully',
            null
        );
    }

    /**
     * Detach a collaborator from a person
     *
     * @param int $personId
     * @param int $collaboratorId
     * @return JsonResponse
     */
    public function detachCollaborator(int $personId, int $collaboratorId): JsonResponse
    {
        $this->personService->detachCollaborator($personId, $collaboratorId);

        return successResponse(
            'Collaborator detached successfully',
            null
        );
    }

    /**
     * Set custom field values for a person.
     *
     * @param SetCustomFieldRequest $request
     * @param int $id
     * @return JsonResponse
     */
    public function setCustomFields(SetCustomFieldRequest $request, int $id): JsonResponse
    {
        $this->personService->setCustomFieldValues($id, $request->validated()['custom_fields']);

        return successResponse(
            'Custom fields updated successfully',
            null
        );
    }

    /**
     * Build filters array from request parameters
     *
     * @param Request $request
     * @return array
     */
    private function buildFilters(Request $request): array
    {
        $filters = [];

        $stage = $request->input('stage_id');
        if ($stage) {
            $filters['stage_id'] = $stage;
        }

        $team_id = $request->input('team_id');
        if ($team_id) {
            $filters['team_id'] = $team_id;
        }

        $user_ids = $request->input('user_ids');
        if ($user_ids) {
            $filters['user_ids'] = $user_ids;
        }

        $search = $request->input('search');
        if ($search) {
            $filters['search'] = $search;
        }

        $deal_type_id = $request->input('deal_type_id');
        if ($deal_type_id) {
            $filters['deal_type_id'] = $deal_type_id;
        }

        return $filters;
    }
}
