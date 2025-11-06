<?php

namespace App\Http\Controllers\Api\Deals;

use App\Http\Controllers\Controller;
use App\Http\Requests\Deals\GetClosingDeals;
use App\Http\Requests\Deals\StoreDealRequest;
use App\Http\Requests\Deals\UpdateDealRequest;
use App\Http\Resources\DealCollection;
use App\Http\Resources\DealResource;
use App\Services\Deals\DealServiceInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Models\Deal;
use Illuminate\Support\Facades\Gate;
use App\Services\Tenants\TenantSubscriptionServiceInterface;

class DealsController extends Controller
{
    protected $dealService;
    protected $tenantService;

    public function __construct(DealServiceInterface $dealService, TenantSubscriptionServiceInterface $tenantService)
    {
        $this->dealService = $dealService;
        $this->tenantService = $tenantService;
    }

    /**
     * Get all deals.
     *
     * @return JsonResponse JSON response containing all deals.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = $request->input('per_page', 15);
        $page = $request->input('page', 1);
        $search = $request->input('search', null);
        $personId = $request->input('person_id', null);
        $stageId = $request->input('stage_id', null);

        $deals = $this->dealService->getAll($perPage, $page, $search, $personId, $stageId);
        $totals = $this->dealService->getTotals($search, $personId, $stageId);
        foreach ($deals as $deal) {
            Gate::authorize('viewAny', $deal);
        }

        return successResponse(
            'Deals retrieved successfully',
            new DealCollection($deals, $totals)
        );
    }

    /**
     * Get deals with closing dates within a specified interval.
     *
     * @param Request $request The request instance containing date parameters.
     * @return JsonResponse JSON response containing deals within the date interval.
     */
    public function getByClosingDateInterval(GetClosingDeals $request): JsonResponse
    {

        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $perPage = $request->input('per_page', 15);
        $page = $request->input('page', 1);

        $deals = $this->dealService->getByClosingDateInterval($startDate, $endDate, $perPage, $page);
        foreach ($deals as $deal) {
            Gate::authorize('viewAny', $deal);
        }
        return successResponse(
            'Deals retrieved successfully',
            new DealCollection($deals)
        );
    }

    /**
     * Get a specific deal by ID.
     *
     * @param int $id The ID of the deal to retrieve.
     * @return JsonResponse JSON response containing the deal.
     */
    public function show(int $id): JsonResponse
    {
        $deal = $this->dealService->findById($id);

        Gate::authorize('view', $deal);
        return successResponse(
            'Deal retrieved successfully',
            new DealResource($deal)
        );
    }

    /**
     * Create a new deal.
     *
     * @param StoreDealRequest $request The request instance containing the data to create a deal.
     * @return JsonResponse JSON response containing the created deal and a 201 status code.
     */
    public function store(StoreDealRequest $request): JsonResponse
    {
        $user = $request->user();
        $tenant = $user->tenant;

        $usage = $tenant->getFeatureUsage('deals');
        $limit = $tenant->planConfig()['limits']['deals'] ?? null;
        if ($limit !== null && $usage >= $limit) {
            return response()->json(['message' => 'Deal limit reached for your current plan. Please upgrade to add more deals.'], 403);
        }
        
        Gate::authorize('create', Deal::class);
        $deal = $this->dealService->create($request->validated());

        return successResponse(
            'Deal created successfully',
            new DealResource($deal),
            201
        );
    }

    /**
     * Update an existing deal.
     *
     * @param UpdateDealRequest $request The request instance containing the data to update.
     * @param int $id The ID of the deal to update.
     * @return JsonResponse JSON response containing the updated deal.
     */
    public function update(UpdateDealRequest $request, int $id): JsonResponse
    {
        $deal = $this->dealService->findById($id);
        Gate::authorize('update', $deal);
        $deal = $this->dealService->update($id, $request->validated());

        return successResponse(
            'Deal updated successfully',
            new DealResource($deal)
        );
    }

    /**
     * Delete a deal.
     *
     * @param int $id The ID of the deal to delete.
     * @return JsonResponse JSON response indicating the result of the deletion.
     */
    public function destroy(int $id): JsonResponse
    {
        $deal = $this->dealService->findById($id);
        Gate::authorize('delete', $deal);
        $this->dealService->delete($id);

        return successResponse(
            'Deal deleted successfully',
            null
        );
    }
}