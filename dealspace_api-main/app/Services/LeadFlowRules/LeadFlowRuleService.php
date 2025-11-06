<?php

namespace App\Services\LeadFlowRules;

use App\Models\LeadFlowRule;
use App\Models\Person;
use App\Services\ActionPlans\ActionPlanService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LeadFlowRuleService
{
    protected ActionPlanService $actionPlanService;

    public function __construct(ActionPlanService $actionPlanService)
    {
        $this->actionPlanService = $actionPlanService;
    }

    /**
     * Evaluate if a person matches a rule
     */
    public function evaluateRule(Person $person, LeadFlowRule $rule): bool
    {
        // Load conditions if not already loaded
        if (!$rule->relationLoaded('ruleConditions')) {
            $rule->load('ruleConditions');
        }

        $conditions = $rule->ruleConditions;

        Log::info("Evaluating rule conditions", [
            'rule_id' => $rule->id,
            'rule_name' => $rule->name,
            'conditions_count' => $conditions->count(),
            'conditions' => $conditions->map(fn($c) => [
                'field' => $c->field,
                'operator' => $c->operator,
                'value' => $c->value
            ])->toArray()
        ]);

        if ($conditions->isEmpty()) {
            Log::info("No conditions - rule matches by default", ['rule_id' => $rule->id]);
            return true;
        }

        $matchType = $rule->match_type ?? 'all';
        $matches = [];

        foreach ($conditions as $condition) {
            $result = $this->evaluateCondition($person, $condition);
            $matches[] = $result;
            
            Log::info("Condition evaluation", [
                'rule_id' => $rule->id,
                'field' => $condition->field,
                'operator' => $condition->operator,
                'expected' => $condition->value,
                'actual' => $this->getFieldValue($person, $condition->field),
                'result' => $result ? 'MATCH' : 'NO MATCH'
            ]);
        }

        $finalResult = $matchType === 'all' 
            ? !in_array(false, $matches, true)
            : in_array(true, $matches, true);

        Log::info("Rule evaluation complete", [
            'rule_id' => $rule->id,
            'match_type' => $matchType,
            'matches' => $matches,
            'final_result' => $finalResult ? 'MATCH' : 'NO MATCH'
        ]);

        return $finalResult;
    }

    /**
     * Evaluate a single condition
     */
    protected function evaluateCondition(Person $person, $condition): bool
    {
        $field = $condition->field;
        $operator = $condition->operator;
        $expectedValue = $condition->value;

        $actualValue = $this->getFieldValue($person, $field);

        return $this->compareValues($actualValue, $operator, $expectedValue);
    }

    /**
     * Get field value from person
     */
    protected function getFieldValue(Person $person, string $field)
    {
        // Handle nested fields (e.g., 'emails.0.email')
        if (str_contains($field, '.')) {
            $parts = explode('.', $field);
            $value = $person;

            foreach ($parts as $part) {
                if (is_numeric($part)) {
                    $value = $value[$part] ?? null;
                } elseif (is_object($value)) {
                    $value = $value->$part ?? null;
                } elseif (is_array($value)) {
                    $value = $value[$part] ?? null;
                } else {
                    return null;
                }

                if ($value === null) {
                    return null;
                }
            }

            return $value;
        }

        // Direct field access
        return $person->$field ?? null;
    }

    /**
     * Compare values based on operator
     */
    protected function compareValues($actualValue, string $operator, $expectedValue): bool
    {
        switch ($operator) {
            case 'equals':
                return $actualValue == $expectedValue;

            case 'not_equals':
                return $actualValue != $expectedValue;

            case 'greater_than':
                return is_numeric($actualValue) && is_numeric($expectedValue) && $actualValue > $expectedValue;

            case 'greater_than_or_equal':
                return is_numeric($actualValue) && is_numeric($expectedValue) && $actualValue >= $expectedValue;

            case 'less_than':
                return is_numeric($actualValue) && is_numeric($expectedValue) && $actualValue < $expectedValue;

            case 'less_than_or_equal':
                return is_numeric($actualValue) && is_numeric($expectedValue) && $actualValue <= $expectedValue;

            case 'contains':
                return is_string($actualValue) && str_contains(strtolower($actualValue), strtolower($expectedValue));

            case 'not_contains':
                return is_string($actualValue) && !str_contains(strtolower($actualValue), strtolower($expectedValue));

            case 'starts_with':
                return is_string($actualValue) && str_starts_with(strtolower($actualValue), strtolower($expectedValue));

            case 'ends_with':
                return is_string($actualValue) && str_ends_with(strtolower($actualValue), strtolower($expectedValue));

            case 'is_empty':
                return empty($actualValue);

            case 'is_not_empty':
                return !empty($actualValue);

            default:
                Log::warning("Unknown operator", ['operator' => $operator]);
                return false;
        }
    }

    /**
     * Process a new lead through all rules
     */
    public function processLead(Person $person, ?string $sourceType = null, ?string $sourceName = null): ?LeadFlowRule
    {
        Log::info("Processing lead through lead flow rules", [
            'person_id' => $person->id,
            'source_type' => $sourceType,
            'source_name' => $sourceName,
            'tenant_id' => tenant('id')
        ]);

        try {
            // Build base query
            $query = LeadFlowRule::where('tenant_id', tenant('id'))
                ->where('is_active', true)
                ->with('ruleConditions');

            // ✅ FIX: More flexible source matching
            if ($sourceType && $sourceName) {
                $query->where(function($q) use ($sourceType, $sourceName) {
                    // Match exact source
                    $q->where(function($subQ) use ($sourceType, $sourceName) {
                        $subQ->where('source_type', $sourceType)
                             ->where('source_name', $sourceName);
                    })
                    // OR match source_type with any source_name
                    ->orWhere(function($subQ) use ($sourceType) {
                        $subQ->where('source_type', $sourceType)
                             ->whereNull('source_name');
                    })
                    // OR match if both are null (applies to all sources)
                    ->orWhere(function($subQ) {
                        $subQ->whereNull('source_type')
                             ->whereNull('source_name');
                    })
                    // OR explicitly marked as default
                    ->orWhere('is_default', true);
                });
            } else {
                // No source specified - only get rules without source restrictions or defaults
                $query->where(function($q) {
                    $q->whereNull('source_type')
                      ->whereNull('source_name')
                      ->orWhere('is_default', true);
                });
            }

            $rules = $query->orderBy('priority')->orderBy('id')->get();

            Log::info("Fetched lead flow rules", [
                'rules_count' => $rules->count(),
                'query_source_type' => $sourceType,
                'query_source_name' => $sourceName,
                'rules' => $rules->map(fn($r) => [
                    'id' => $r->id,
                    'name' => $r->name,
                    'priority' => $r->priority,
                    'source_type' => $r->source_type,
                    'source_name' => $r->source_name,
                    'is_default' => $r->is_default,
                    'conditions_count' => $r->ruleConditions->count()
                ])->toArray()
            ]);

            // Find first matching rule
            foreach ($rules as $rule) {
                Log::info("Testing rule", [
                    'rule_id' => $rule->id,
                    'rule_name' => $rule->name,
                    'is_default' => $rule->is_default
                ]);

                if ($rule->is_default || $this->evaluateRule($person, $rule)) {
                    Log::info("Rule matched! Applying actions", [
                        'rule_id' => $rule->id,
                        'rule_name' => $rule->name
                    ]);
                    
                    $this->applyRule($person, $rule);
                    return $rule;
                }
            }

            Log::info("No matching rules found", ['person_id' => $person->id]);
            return null;

        } catch (\Exception $e) {
            Log::error("Error processing lead through rules", [
                'person_id' => $person->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return null;
        }
    }

    /**
     * Apply rule actions to a person
     */
    public function applyRule(Person $person, LeadFlowRule $rule): void
    {
        DB::transaction(function () use ($person, $rule) {
            $updates = [];

            // Assign agent
            if ($rule->assigned_agent_id) {
                $person->assigned_user_id = $rule->assigned_agent_id;
                $updates['assigned_user_id'] = $rule->assigned_agent_id;
            }

            // Assign lender
            if ($rule->assigned_lender_id) {
                $person->assigned_lender_id = $rule->assigned_lender_id;
                $updates['assigned_lender_id'] = $rule->assigned_lender_id;
            }

            // Assign to group
            if ($rule->available_for_group_id) {
                $person->available_for_group_id = $rule->available_for_group_id;
                $updates['available_for_group_id'] = $rule->available_for_group_id;
            }

            // Assign to pond
            if ($rule->pond_id) {
                $person->assigned_pond_id = $rule->pond_id;
                $updates['pond_id'] = $rule->pond_id;
            }

            // Apply action plan
            if ($rule->action_plan_id) {
                $this->actionPlanService->assignToPerson(
                    $rule->actionPlan,
                    $person->id,
                    $person->agent_id
                );
                $updates['action_plan_id'] = $rule->action_plan_id;
            }

            $person->save();

            // Update rule statistics
            $rule->increment('leads_count');
            $rule->update(['last_lead_at' => now()]);

            Log::info("Lead flow rule applied successfully", [
                'rule_id' => $rule->id,
                'person_id' => $person->id,
                'rule_name' => $rule->name,
                'updates' => $updates
            ]);
        });
    }

    /**
     * Copy rules from one source to another
     */
    public function copyRulesFromSource(
        string $fromSourceType,
        string $fromSourceName,
        string $toSourceType,
        string $toSourceName
    ): int {
        $sourceRules = LeadFlowRule::where('tenant_id', tenant('id'))
            ->where('source_type', $fromSourceType)
            ->where('source_name', $fromSourceName)
            ->with('ruleConditions')
            ->get();

        $count = 0;

        foreach ($sourceRules as $sourceRule) {
            $newRule = $sourceRule->replicate([
                'leads_count',
                'last_lead_at'
            ]);

            $newRule->source_type = $toSourceType;
            $newRule->source_name = $toSourceName;
            $newRule->save();

            // Copy conditions
            foreach ($sourceRule->ruleConditions as $condition) {
                $newCondition = $condition->replicate();
                $newCondition->lead_flow_rule_id = $newRule->id;
                $newCondition->save();
            }

            $count++;
        }

        return $count;
    }
}