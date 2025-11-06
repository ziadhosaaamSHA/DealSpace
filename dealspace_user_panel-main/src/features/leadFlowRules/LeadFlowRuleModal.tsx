import React, { useState, useEffect } from 'react';
import { FiX, FiPlus, FiTrash2, FiInfo } from 'react-icons/fi';
import {
  useCreateLeadFlowRuleMutation,
  useUpdateLeadFlowRuleMutation,
} from './leadFlowRulesApi';
import { useGetUsersQuery } from '../users/usersApi';
import { useGetGroupsQuery } from '../groups/groupsApi';
import { useGetPondsQuery } from '../ponds/pondsApi';
import { LeadFlowRule, LeadFlowRuleCondition, FIELD_OPTIONS, OPERATOR_OPTIONS } from '../../types/leadFlowRules';
import { toast } from 'react-toastify';
import { User } from '../../types/users';
import { Group } from '../../types/groups';
import { Pond } from '../../types/ponds';

interface LeadFlowRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  rule: LeadFlowRule | null;
  sourceType?: string;
  sourceName?: string;
}

export const LeadFlowRuleModal: React.FC<LeadFlowRuleModalProps> = ({
  isOpen,
  onClose,
  rule,
  sourceType,
  sourceName,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    is_active: true,
    is_default: false,
    match_type: 'all' as 'all' | 'any',
    assigned_agent_id: undefined as number | undefined,
    assigned_lender_id: undefined as number | undefined,
    action_plan_id: undefined as number | undefined,
    group_id: undefined as number | undefined,
    pond_id: undefined as number | undefined,
    source_type: sourceType || '',
    source_name: sourceName || '',
  });

  const [conditions, setConditions] = useState<LeadFlowRuleCondition[]>([]);

  const [createRule, { isLoading: isCreating }] = useCreateLeadFlowRuleMutation();
  const [updateRule, { isLoading: isUpdating }] = useUpdateLeadFlowRuleMutation();
  const { data: usersResponse } = useGetUsersQuery({ page: 1, per_page: 1000 });
  const { data: groupsResponse } = useGetGroupsQuery({ page: 1, per_page: 1000 });
  const { data: pondsResponse } = useGetPondsQuery({ page: 1, per_page: 1000 });

  const users = Array.isArray(usersResponse?.data) ? usersResponse?.data : usersResponse?.data?.items || [];
  const groups = Array.isArray(groupsResponse?.data) ? groupsResponse?.data : groupsResponse?.data?.items || [];
  const ponds = Array.isArray(pondsResponse?.data) ? pondsResponse?.data : pondsResponse?.data?.items || [];

  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name,
        is_active: rule.is_active,
        is_default: rule.is_default,
        match_type: rule.match_type,
        assigned_agent_id: rule.assigned_agent_id,
        assigned_lender_id: rule.assigned_lender_id,
        action_plan_id: rule.action_plan_id,
        group_id: rule.group_id,
        pond_id: rule.pond_id,
        source_type: rule.source_type || '',
        source_name: rule.source_name || '',
      });
      setConditions(rule.rule_conditions || []);
    } else {
      // Reset for new rule
      setFormData({
        name: '',
        is_active: true,
        is_default: false,
        match_type: 'all',
        assigned_agent_id: undefined,
        assigned_lender_id: undefined,
        action_plan_id: undefined,
        group_id: undefined,
        pond_id: undefined,
        source_type: sourceType || '',
        source_name: sourceName || '',
      });
      setConditions([]);
    }
  }, [rule, sourceType, sourceName]);

  const handleAddCondition = () => {
    setConditions([
      ...conditions,
      {
        field: 'price',
        operator: 'greater_than',
        value: '',
        order: conditions.length,
      },
    ]);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleConditionChange = (index: number, field: keyof LeadFlowRuleCondition, value: any) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [field]: value };
    setConditions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.is_default && conditions.length === 0) {
      toast.error('Please add at least one condition or mark as default rule');
      return;
    }

    const payload = {
      ...formData,
      conditions: conditions.map((c, idx) => ({ ...c, order: idx })),
    };

    try {
      if (rule) {
        await updateRule({ id: rule.id, data: payload }).unwrap();
        toast.success('Rule updated successfully');
      } else {
        await createRule(payload).unwrap();
        toast.success('Rule created successfully');
      }
      onClose();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to save rule');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {rule ? 'Edit Rule' : 'Add New Rule'}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
              {/* Rule Name */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rule Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., High-value buyers"
                  required
                />
              </div>

              {/* Status Toggle */}
              <div className="mb-6 flex items-center space-x-6">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-brand-500 focus:ring-brand-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Active</span>
                </label>

                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="h-4 w-4 text-brand-500 focus:ring-brand-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Default Rule</span>
                </label>
              </div>

              {/* Conditions Section */}
              {!formData.is_default && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Conditions
                    </label>
                    <select
                      value={formData.match_type}
                      onChange={(e) => setFormData({ ...formData, match_type: e.target.value as 'all' | 'any' })}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
                    >
                      <option value="all">All conditions</option>
                      <option value="any">Any condition</option>
                    </select>
                  </div>

                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Leads who meet <strong>{formData.match_type}</strong> of these conditions:
                  </p>

                  {/* Conditions List */}
                  <div className="space-y-3">
                    {conditions.map((condition, index) => (
                      <div key={index} className="flex items-center space-x-3 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                        <select
                          value={condition.field}
                          onChange={(e) => handleConditionChange(index, 'field', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
                        >
                          {FIELD_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>

                        <select
                          value={condition.operator}
                          onChange={(e) => handleConditionChange(index, 'operator', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
                        >
                          {OPERATOR_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>

                        <input
                          type="text"
                          value={condition.value}
                          onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
                          placeholder="Value"
                        />

                        <button
                          type="button"
                          onClick={() => handleRemoveCondition(index)}
                          className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddCondition}
                    className="mt-3 inline-flex items-center px-3 py-2 border border-brand-100 shadow-sm text-sm font-medium rounded-md text-brand-600 bg-white hover:bg-brand-25 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-200"
                  >
                    Add Condition
                  </button>
                </div>
              )}

              {/* Assignment Section */}
              <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                  Assignment Actions
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Agent */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Assign to Agent
                    </label>
                    <select
                      value={formData.assigned_agent_id || ''}
                      onChange={(e) => setFormData({ ...formData, assigned_agent_id: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">No agent</option>
                      {users?.map((user: User) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Lender */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Assign to Lender
                    </label>
                    <select
                      value={formData.assigned_lender_id || ''}
                      onChange={(e) => setFormData({ ...formData, assigned_lender_id: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">No lender</option>
                      {users?.map((user: User) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Group */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Assign to Group
                    </label>
                    <select
                      value={formData.group_id || ''}
                      onChange={(e) => setFormData({ ...formData, group_id: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">No group</option>
                      {groups?.map((group: Group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Pond */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Assign to Pond
                    </label>
                    <select
                      value={formData.pond_id || ''}
                      onChange={(e) => setFormData({ ...formData, pond_id: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">No pond</option>
                      {ponds?.map((pond: Pond) => (
                        <option key={pond.id} value={pond.id}>
                          {pond.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-600 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-brand-100 rounded-md shadow-sm text-sm font-medium text-brand-700 bg-white hover:bg-brand-25"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || isUpdating}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating || isUpdating ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};