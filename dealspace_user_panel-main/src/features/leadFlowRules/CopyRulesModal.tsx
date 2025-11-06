import React, { useState } from 'react';
import { useCopyRulesFromSourceMutation } from './leadFlowRulesApi';
import { toast } from 'react-toastify';

interface CopyRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSourceType: string;
  currentSourceName: string;
}

export const CopyRulesModal: React.FC<CopyRulesModalProps> = ({
  isOpen,
  onClose,
  currentSourceType,
  currentSourceName,
}) => {
  const [fromSourceType, setFromSourceType] = useState('');
  const [fromSourceName, setFromSourceName] = useState('');

  const [copyRules, { isLoading }] = useCopyRulesFromSourceMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fromSourceType || !fromSourceName) {
      toast.error('Please select a source to copy from');
      return;
    }

    try {
      const result = await copyRules({
        from_source_type: fromSourceType,
        from_source_name: fromSourceName,
        to_source_type: currentSourceType,
        to_source_name: currentSourceName,
      }).unwrap();

      toast.success(result.message);
      onClose();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to copy rules');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Copy Rules From Another Source
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Copy all rules from another lead flow source to{' '}
                <strong>
                  {currentSourceType} • {currentSourceName}
                </strong>
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Source Type
                  </label>
                  <select
                    value={fromSourceType}
                    onChange={(e) => setFromSourceType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value="">Select source type</option>
                    <option value="Website">Website</option>
                    <option value="Zillow">Zillow</option>
                    <option value="API">API</option>
                    <option value="Manual">Manual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Source Name
                  </label>
                  <input
                    type="text"
                    value={fromSourceName}
                    onChange={(e) => setFromSourceName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., Buyers, Sellers"
                    required
                  />
                </div>
              </div>
            </div>

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
                disabled={isLoading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Copying...' : 'Copy Rules'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};