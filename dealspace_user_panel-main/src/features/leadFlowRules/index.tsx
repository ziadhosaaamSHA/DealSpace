import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DraggableProvided, DraggableStateSnapshot } from 'react-beautiful-dnd';
import {
  useGetLeadFlowRulesQuery,
  useDeleteLeadFlowRuleMutation,
  useReorderRulesMutation,
} from '../../features/leadFlowRules/leadFlowRulesApi';
import { LeadFlowRule } from '../../types/leadFlowRules';
import { LeadFlowRuleModal } from './LeadFlowRuleModal';
import { CopyRulesModal } from './CopyRulesModal';
import AdminLayout from "../../layout/AdminLayout"
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';

export const LeadFlowRulesPage: React.FC = () => {
  // sources removed: keep empty values for modal compatibility
  const sourceType = '';
  const sourceName = '';
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<LeadFlowRule | null>(null);

  const { data: rulesResponse, isLoading } = useGetLeadFlowRulesQuery({
    source_type: sourceType || undefined,
    source_name: sourceName || undefined,
  });

  const [deleteRule] = useDeleteLeadFlowRuleMutation();
  const [reorderRules] = useReorderRulesMutation();

  const rules = rulesResponse?.data || [];
  const nonDefaultRules = rules.filter((r) => !r.is_default);
  const defaultRule = rules.find((r) => r.is_default);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(nonDefaultRules);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const reorderedRules = items.map((rule, index) => ({
      id: rule.id,
      priority: index,
    }));

    try {
      await reorderRules(reorderedRules).unwrap();
      toast.success('Rules reordered successfully');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to reorder rules');
    }
  };

  const handleDeleteRule = async (ruleId: number) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;

    try {
      await deleteRule(ruleId).unwrap();
      toast.success('Rule deleted successfully');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to delete rule');
    }
  };

  const handleAddRule = () => {
    setEditingRule(null);
    setIsRuleModalOpen(true);
  };

  const handleEditRule = (rule: LeadFlowRule) => {
    setEditingRule(rule);
    setIsRuleModalOpen(true);
  };
  return (
    <AdminLayout>
    <div className="min-h-screen">
      {/* Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lead Flow</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Configure automatic lead assignment rules
              </p>
            </div>
          </div>
        </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Info Banner (brand) */}
        <div className="bg-brand-25 dark:bg-brand-950/10 border border-brand-100 dark:border-brand-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-brand-700 dark:text-brand-200">
            <strong>Lead Flow Rules</strong>
            <br />
            Rules are processed from top to bottom — drag and drop to reorder.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 mb-6">
          <button
            onClick={handleAddRule}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-500 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Add Rule
          </button>
        </div>

        {/* Rules List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading rules...</p>
          </div>
        ) : (
          <>
            {/* Non-Default Rules (Draggable) */}
            {nonDefaultRules.length > 0 && (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="rules">
                  {(provided: DroppableProvided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-4 mb-6"
                    >
                      {nonDefaultRules.map((rule, index) => (
                        <Draggable key={rule.id} draggableId={String(rule.id)} index={index}>
                          {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${
                                snapshot.isDragging ? 'shadow-lg' : ''
                              }`}
                            >
                              <RuleCard
                                rule={rule}
                                index={index + 1}
                                dragHandleProps={provided.dragHandleProps}
                                onEdit={() => handleEditRule(rule)}
                                onDelete={() => handleDeleteRule(rule.id)}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}

            {/* Default Rule */}
            {defaultRule && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    {defaultRule.name || 'Default Rule (if none of the above apply)'}
                  </h3>
                  <DefaultRuleCard
                    rule={defaultRule}
                    onEdit={() => handleEditRule(defaultRule)}
                  />
                </div>
              </div>
            )}

            {/* Empty State */}
            {nonDefaultRules.length === 0 && !defaultRule && (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No rules configured</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Get started by creating a new lead flow rule.
                </p>
                <div className="mt-6">
                  <button
                    onClick={handleAddRule}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-500 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
                  >
                    Add Rule
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {isRuleModalOpen && (
        <LeadFlowRuleModal
          isOpen={isRuleModalOpen}
          onClose={() => {
            setIsRuleModalOpen(false);
            setEditingRule(null);
          }}
          rule={editingRule}
          sourceType={sourceType}
          sourceName={sourceName}
        />
      )}

      {isCopyModalOpen && (
        <CopyRulesModal
          isOpen={isCopyModalOpen}
          onClose={() => setIsCopyModalOpen(false)}
          currentSourceType={sourceType}
          currentSourceName={sourceName}
        />
      )}
    </div>
    </AdminLayout>
  );
};

// Rule Card Component
interface RuleCardProps {
  rule: LeadFlowRule;
  index: number;
  dragHandleProps: any;
  onEdit: () => void;
  onDelete: () => void;
}

const RuleCard: React.FC<RuleCardProps> = ({ rule, index, dragHandleProps, onEdit, onDelete }) => {
  return (
    <div className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start flex-1">
          {/* Drag Handle */}
          <div {...dragHandleProps} className="cursor-move mr-4 pt-1">
          </div>

          <div className="flex-1">
            <div className="flex items-center mb-3">
              <div className="flex-1">
                <h4 className="text-base font-semibold text-gray-900 dark:text-white">{rule.name}</h4>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{index}. Rule</span>
              </div>
              {!rule.is_active && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                  Inactive
                </span>
              )}
            </div>

            {/* Conditions */}
            {rule.rule_conditions && rule.rule_conditions.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  Leads who meet <strong>{rule.match_type}</strong> of these conditions:
                </p>
                <div className="space-y-2">
                  {rule.rule_conditions.map((condition, idx) => (
                    <div
                      key={idx}
                      className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400"
                    >
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                        {condition.field}
                      </span>
                      <span>{condition.operator}</span>
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                        {condition.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {rule.assigned_agent && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Agent</span>
                  <p className="font-medium text-gray-900 dark:text-white">{rule.assigned_agent.name}</p>
                </div>
              )}
              {rule.assigned_lender && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Lender</span>
                  <p className="font-medium text-gray-900 dark:text-white">{rule.assigned_lender.name}</p>
                </div>
              )}
              {rule.action_plan && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Action Plan</span>
                  <p className="font-medium text-gray-900 dark:text-white">{rule.action_plan.name}</p>
                </div>
              )}
              {rule.group && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Group</span>
                  <p className="font-medium text-gray-900 dark:text-white">{rule.group.name}</p>
                </div>
              )}
            </div>

            {/* Stats */}
            {rule.leads_count > 0 && (
              <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                {rule.leads_count} leads • Last lead:{' '}
                {rule.last_lead_at
                  ? new Date(rule.last_lead_at).toLocaleString()
                  : 'Never'}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="Edit rule"
          >
            <Edit2 className="h-5 w-5" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
            title="Delete rule"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Default Rule Card Component
interface DefaultRuleCardProps {
  rule: LeadFlowRule;
  onEdit: () => void;
}

const DefaultRuleCard: React.FC<DefaultRuleCardProps> = ({ rule, onEdit }) => {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm flex-1">
          {rule.assigned_agent && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">Agent</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {rule.assigned_agent.name}
                {rule.assigned_agent_id && ' (default)'}
              </p>
            </div>
          )}
          {rule.assigned_lender && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">Lender</span>
              <p className="font-medium text-gray-900 dark:text-white">{rule.assigned_lender.name}</p>
            </div>
          )}
          {rule.action_plan && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">Action Plan</span>
              <p className="font-medium text-gray-900 dark:text-white">{rule.action_plan.name}</p>
            </div>
          )}
          {!rule.assigned_agent && !rule.assigned_lender && !rule.action_plan && (
            <div className="col-span-full text-gray-500 dark:text-gray-400">
              No action plan
            </div>
          )}
        </div>

        <button
          onClick={onEdit}
          className="ml-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          title="Edit default rule"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>

      {rule.leads_count > 0 && (
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          {rule.leads_count} leads • Last lead:{' '}
          {rule.last_lead_at
            ? new Date(rule.last_lead_at).toLocaleString()
            : 'Never'}
        </div>
      )}
    </div>
  );
};