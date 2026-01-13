import React, { useState, useMemo } from 'react';
import {
  XMarkIcon,
  CheckCircleIcon,
  NoSymbolIcon,
  FunnelIcon,
  TrashIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid, NoSymbolIcon as NoSymbolSolid } from '@heroicons/react/24/solid';
import { BaseDropdown } from '@/components/ui';

// ============================================================================
// Types
// ============================================================================

type ActionStatus = 'in_progress' | 'completed' | 'lapsed';
type ActionPriority = 'low' | 'medium' | 'high';
type ActionType = 'client' | 'provider' | 'advisor';

interface Action {
  id: number;
  clientGroupId: number;
  title: string;
  description: string;
  assignedAdvisorId: number | null;
  dueDate: string | null;
  createdAt: string;
  priority: ActionPriority;
  notes: string;
  status: ActionStatus;
  actionType: ActionType;
}

interface ClientGroup {
  id: number;
  name: string;
  status: 'active' | 'lapsed';
}

interface Advisor {
  id: number;
  name: string;
  initials: string;
}

type SortField = 'dueDate' | 'createdAt';
type SortDirection = 'asc' | 'desc';
type DueDateFilter = 'all' | 'overdue' | 'week' | 'month' | 'quarter' | 'year' | 'none';

// ============================================================================
// Constants
// ============================================================================

const STATUS_COLORS: Record<ActionStatus, { bg: string; text: string; border: string }> = {
  in_progress: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  completed: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  lapsed: { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200' },
};

const STATUS_LABELS: Record<ActionStatus, string> = {
  in_progress: 'In Progress',
  completed: 'Completed',
  lapsed: 'Lapsed',
};

const PRIORITY_COLORS: Record<ActionPriority, { bg: string; text: string; dot: string }> = {
  low: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  high: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
};

const PRIORITY_LABELS: Record<ActionPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  client: 'Client',
  provider: 'Provider',
  advisor: 'Advisor',
};

const ACTION_TYPE_COLORS: Record<ActionType, string> = {
  client: 'bg-purple-100 text-purple-700',
  provider: 'bg-teal-100 text-teal-700',
  advisor: 'bg-indigo-100 text-indigo-700',
};

const DUE_DATE_FILTER_LABELS: Record<DueDateFilter, string> = {
  all: 'All Dates',
  overdue: 'Overdue',
  week: 'Next 7 Days',
  month: 'Next 30 Days',
  quarter: 'Next 90 Days',
  year: 'Next Year',
  none: 'No Due Date',
};

// ============================================================================
// Mock Data
// ============================================================================

const mockAdvisors: Advisor[] = [
  { id: 1, name: 'Debbie Kingston', initials: 'DK' },
  { id: 2, name: 'Jan Clements', initials: 'JC' },
];

const mockClientGroups: ClientGroup[] = [
  { id: 1, name: 'Smith Family', status: 'active' },
  { id: 2, name: 'Johnson Trust', status: 'active' },
  { id: 3, name: 'Williams Partnership', status: 'lapsed' },
  { id: 4, name: 'Brown Holdings', status: 'active' },
  { id: 5, name: 'Davis Investments', status: 'active' },
  { id: 6, name: 'Wilson Group', status: 'active' },
  { id: 7, name: 'Taylor Estate', status: 'active' },
  { id: 8, name: 'Anderson Portfolio', status: 'active' },
  { id: 9, name: 'Thomas & Co', status: 'lapsed' },
  { id: 10, name: 'Jackson Family', status: 'active' },
];

const mockActions: Action[] = [
  // Smith Family actions
  { id: 1, clientGroupId: 1, title: 'Annual Review Prep', description: 'Prepare documentation for upcoming annual review meeting', assignedAdvisorId: 1, dueDate: '2025-01-20', createdAt: '2025-01-05', priority: 'high', notes: 'Client requested specific focus on pension performance', status: 'in_progress', actionType: 'advisor' },
  { id: 2, clientGroupId: 1, title: 'Update Risk Profile', description: 'Client mentioned change in circumstances - review risk tolerance', assignedAdvisorId: 1, dueDate: '2025-01-25', createdAt: '2025-01-10', priority: 'medium', notes: '', status: 'in_progress', actionType: 'client' },
  { id: 3, clientGroupId: 1, title: 'Request Valuations', description: 'Request latest valuations from Aviva for ISA portfolio', assignedAdvisorId: null, dueDate: '2025-01-15', createdAt: '2025-01-02', priority: 'low', notes: 'Quarterly valuation request', status: 'completed', actionType: 'provider' },

  // Johnson Trust actions
  { id: 4, clientGroupId: 2, title: 'Trust Documentation', description: 'Review and update trust deed with latest beneficiary information', assignedAdvisorId: 2, dueDate: '2025-02-01', createdAt: '2025-01-08', priority: 'high', notes: 'Legal team involvement required', status: 'in_progress', actionType: 'client' },
  { id: 5, clientGroupId: 2, title: 'Fund Switch Analysis', description: 'Analyse potential fund switches following market changes', assignedAdvisorId: 2, dueDate: null, createdAt: '2025-01-12', priority: 'medium', notes: 'No rush - when time permits', status: 'in_progress', actionType: 'advisor' },

  // Williams Partnership (lapsed client)
  { id: 6, clientGroupId: 3, title: 'Final Statement', description: 'Send final statement and close file', assignedAdvisorId: 1, dueDate: '2024-12-01', createdAt: '2024-11-15', priority: 'low', notes: '', status: 'lapsed', actionType: 'advisor' },

  // Brown Holdings actions
  { id: 7, clientGroupId: 4, title: 'Portfolio Rebalance', description: 'Quarterly rebalancing due - review allocations against targets', assignedAdvisorId: 2, dueDate: '2025-01-18', createdAt: '2025-01-03', priority: 'high', notes: 'Significant drift from target allocation', status: 'in_progress', actionType: 'advisor' },
  { id: 8, clientGroupId: 4, title: 'AML Refresh', description: 'AML documentation due for refresh - request updated ID', assignedAdvisorId: null, dueDate: '2025-02-15', createdAt: '2025-01-10', priority: 'medium', notes: 'Send reminder letter', status: 'in_progress', actionType: 'client' },
  { id: 9, clientGroupId: 4, title: 'Chase Zurich', description: 'Chase Zurich for outstanding transfer paperwork', assignedAdvisorId: 2, dueDate: '2025-01-14', createdAt: '2025-01-07', priority: 'high', notes: 'Third request - escalate if no response', status: 'in_progress', actionType: 'provider' },

  // Davis Investments actions
  { id: 10, clientGroupId: 5, title: 'New Contribution', description: 'Process new ISA contribution for tax year', assignedAdvisorId: 1, dueDate: '2025-04-01', createdAt: '2025-01-13', priority: 'medium', notes: 'Client confirmed amount', status: 'in_progress', actionType: 'client' },

  // Wilson Group actions
  { id: 11, clientGroupId: 6, title: 'Vulnerability Assessment', description: 'Update vulnerability assessment following recent discussion', assignedAdvisorId: 2, dueDate: '2025-01-22', createdAt: '2025-01-11', priority: 'high', notes: 'Client disclosed health changes', status: 'in_progress', actionType: 'advisor' },
  { id: 12, clientGroupId: 6, title: 'LPA Registration', description: 'Follow up on LPA registration status with OPG', assignedAdvisorId: 2, dueDate: null, createdAt: '2024-12-20', priority: 'low', notes: 'Waiting for OPG processing', status: 'in_progress', actionType: 'advisor' },

  // Taylor Estate actions
  { id: 13, clientGroupId: 7, title: 'Estate Planning Review', description: 'Comprehensive estate planning review with solicitor', assignedAdvisorId: 1, dueDate: '2025-03-15', createdAt: '2025-01-06', priority: 'medium', notes: 'Book joint meeting', status: 'in_progress', actionType: 'client' },

  // Anderson Portfolio actions
  { id: 14, clientGroupId: 8, title: 'Performance Report', description: 'Prepare bespoke performance report for trustee meeting', assignedAdvisorId: 2, dueDate: '2025-01-28', createdAt: '2025-01-14', priority: 'high', notes: 'Trustees meeting end of January', status: 'in_progress', actionType: 'advisor' },
  { id: 15, clientGroupId: 8, title: 'Fee Discussion', description: 'Discuss fee structure review at next meeting', assignedAdvisorId: 2, dueDate: null, createdAt: '2025-01-09', priority: 'low', notes: '', status: 'in_progress', actionType: 'client' },

  // Thomas & Co (lapsed)
  { id: 16, clientGroupId: 9, title: 'Archive Files', description: 'Archive all client files per retention policy', assignedAdvisorId: 1, dueDate: '2024-10-01', createdAt: '2024-09-15', priority: 'low', notes: '', status: 'completed', actionType: 'advisor' },

  // Jackson Family actions
  { id: 17, clientGroupId: 10, title: 'Pension Consolidation', description: 'Review old workplace pensions for potential consolidation', assignedAdvisorId: 2, dueDate: '2025-02-10', createdAt: '2025-01-04', priority: 'medium', notes: 'Multiple small pots identified', status: 'in_progress', actionType: 'client' },
  { id: 18, clientGroupId: 10, title: 'Provider Research', description: 'Research alternative providers for better fund range', assignedAdvisorId: 2, dueDate: null, createdAt: '2025-01-11', priority: 'low', notes: 'Client interested in ESG options', status: 'in_progress', actionType: 'advisor' },
];

// ============================================================================
// Helper Functions
// ============================================================================

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
};

const isOverdue = (dateStr: string | null): boolean => {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
};

const isWithinDays = (dateStr: string | null, days: number): boolean => {
  if (!dateStr) return false;
  const dueDate = new Date(dateStr);
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);
  return dueDate >= now && dueDate <= future;
};

// ============================================================================
// Components
// ============================================================================

interface ActionCardProps {
  action: Action;
  onClick: () => void;
  onStatusChange: (status: ActionStatus) => void;
  onDelete: () => void;
}

const ActionCard: React.FC<ActionCardProps> = ({ action, onClick, onStatusChange, onDelete }) => {
  const priorityColors = PRIORITY_COLORS[action.priority];
  const statusColors = STATUS_COLORS[action.status];
  const overdue = isOverdue(action.dueDate) && action.status !== 'completed' && action.status !== 'lapsed';

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStatusChange('completed');
  };

  const handleLapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStatusChange('lapsed');
  };

  const handleReactivate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStatusChange('in_progress');
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <div
      onClick={onClick}
      className={`flex-shrink-0 w-64 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${statusColors.bg} ${statusColors.border}`}
    >
      {/* Header: Priority + Type */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${priorityColors.dot}`} />
          <span className={`text-xs font-medium ${priorityColors.text}`}>
            {PRIORITY_LABELS[action.priority]}
          </span>
        </div>
        <span className={`text-xs px-1.5 py-0.5 rounded ${ACTION_TYPE_COLORS[action.actionType]}`}>
          {ACTION_TYPE_LABELS[action.actionType]}
        </span>
      </div>

      {/* Title */}
      <h4 className="text-sm font-medium text-gray-900 mb-1 line-clamp-1">
        {action.title}
      </h4>

      {/* Description */}
      <p className="text-xs text-gray-600 line-clamp-2 mb-2 min-h-[2rem]">
        {action.description}
      </p>

      {/* Footer: Due Date + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {action.dueDate ? (
            <span className={`text-xs ${overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
              {overdue ? 'Overdue: ' : 'Due: '}{formatDate(action.dueDate)}
            </span>
          ) : (
            <span className="text-xs text-gray-400 italic">No due date</span>
          )}
        </div>

        {action.status !== 'completed' && action.status !== 'lapsed' && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleComplete}
              className="p-1 rounded hover:bg-green-200 transition-colors"
              title="Mark as Complete"
            >
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
            </button>
            <button
              onClick={handleLapse}
              className="p-1 rounded hover:bg-gray-300 transition-colors"
              title="Mark as Lapsed"
            >
              <NoSymbolIcon className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        )}

        {action.status === 'completed' && (
          <div className="flex items-center gap-1">
            <CheckCircleSolid className="h-4 w-4 text-green-600" />
            <button
              onClick={handleDelete}
              className="p-1 rounded hover:bg-red-200 transition-colors"
              title="Delete"
            >
              <TrashIcon className="h-4 w-4 text-red-500" />
            </button>
          </div>
        )}

        {action.status === 'lapsed' && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleReactivate}
              className="p-1 rounded hover:bg-blue-200 transition-colors"
              title="Reactivate"
            >
              <ArrowPathIcon className="h-4 w-4 text-blue-600" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1 rounded hover:bg-red-200 transition-colors"
              title="Delete"
            >
              <TrashIcon className="h-4 w-4 text-red-500" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface ActionDetailModalProps {
  action: Action | null;
  clientGroup: ClientGroup | undefined;
  advisors: Advisor[];
  onClose: () => void;
  onSave: (action: Action) => void;
}

const ActionDetailModal: React.FC<ActionDetailModalProps> = ({
  action,
  clientGroup,
  advisors,
  onClose,
  onSave,
}) => {
  const [editedAction, setEditedAction] = useState<Action | null>(action);

  if (!action || !editedAction || !clientGroup) return null;

  const handleSave = () => {
    if (editedAction) {
      onSave(editedAction);
      onClose();
    }
  };

  const assignedAdvisor = advisors.find((a) => a.id === editedAction.assignedAdvisorId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Action Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Client Group */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Group</label>
            <p className="text-sm text-gray-900">{clientGroup.name}</p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={editedAction.title}
              onChange={(e) => setEditedAction({ ...editedAction, title: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={editedAction.description}
              onChange={(e) => setEditedAction({ ...editedAction, description: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Action Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
            <select
              value={editedAction.actionType}
              onChange={(e) => setEditedAction({ ...editedAction, actionType: e.target.value as ActionType })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {Object.entries(ACTION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={editedAction.priority}
              onChange={(e) => setEditedAction({ ...editedAction, priority: e.target.value as ActionPriority })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={editedAction.status}
              onChange={(e) => setEditedAction({ ...editedAction, status: e.target.value as ActionStatus })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Assigned Advisor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Advisor</label>
            <select
              value={editedAction.assignedAdvisorId || ''}
              onChange={(e) => setEditedAction({
                ...editedAction,
                assignedAdvisorId: e.target.value ? parseInt(e.target.value) : null
              })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Unassigned</option>
              {advisors.map((advisor) => (
                <option key={advisor.id} value={advisor.id}>{advisor.name}</option>
              ))}
            </select>
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
              <p className="text-sm text-gray-900">{formatDate(editedAction.createdAt)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={editedAction.dueDate || ''}
                onChange={(e) => setEditedAction({
                  ...editedAction,
                  dueDate: e.target.value || null
                })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={editedAction.notes}
              onChange={(e) => setEditedAction({ ...editedAction, notes: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Add notes..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

interface DeleteConfirmModalProps {
  action: Action | null;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ action, onClose, onConfirm }) => {
  if (!action) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <TrashIcon className="h-5 w-5 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Delete Action</h2>
          </div>

          <p className="text-sm text-gray-600 mb-2">
            Are you sure you want to delete this action? This cannot be undone.
          </p>

          <div className="bg-gray-50 rounded-md p-3 mb-4">
            <p className="text-sm font-medium text-gray-900">{action.title}</p>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{action.description}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};


// ============================================================================
// Main Component
// ============================================================================

const ActionsPagePrototype: React.FC = () => {
  const [actions, setActions] = useState<Action[]>([...mockActions]);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [actionToDelete, setActionToDelete] = useState<Action | null>(null);

  // Filter state
  const [clientGroupFilter, setClientGroupFilter] = useState<string>('all');
  const [advisorFilter, setAdvisorFilter] = useState<string>('all');
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('all');
  const [dueDateFilter, setDueDateFilter] = useState<DueDateFilter>('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [showLapsed, setShowLapsed] = useState(false);

  // Sort state
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Filter options
  const clientGroupOptions = [
    { value: 'all', label: 'All Clients' },
    ...mockClientGroups.map((cg) => ({ value: cg.id.toString(), label: cg.name })),
  ];

  const advisorOptions = [
    { value: 'all', label: 'All Advisors' },
    ...mockAdvisors.map((a) => ({ value: a.id.toString(), label: a.name })),
  ];

  const actionTypeOptions = [
    { value: 'all', label: 'All Types' },
    ...Object.entries(ACTION_TYPE_LABELS).map(([value, label]) => ({ value, label })),
  ];

  const dueDateOptions = Object.entries(DUE_DATE_FILTER_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  // Filter and sort actions
  const getFilteredActions = (clientGroupId: number): Action[] => {
    return actions
      .filter((a) => a.clientGroupId === clientGroupId)
      .filter((a) => {
        // Status filters
        if (!showCompleted && a.status === 'completed') return false;
        if (!showLapsed && a.status === 'lapsed') return false;

        // Advisor filter
        if (advisorFilter !== 'all' && a.assignedAdvisorId !== parseInt(advisorFilter)) return false;

        // Action type filter
        if (actionTypeFilter !== 'all' && a.actionType !== actionTypeFilter) return false;

        // Due date filter
        if (dueDateFilter !== 'all') {
          if (dueDateFilter === 'none' && a.dueDate !== null) return false;
          if (dueDateFilter === 'overdue' && !isOverdue(a.dueDate)) return false;
          if (dueDateFilter === 'week' && !isWithinDays(a.dueDate, 7)) return false;
          if (dueDateFilter === 'month' && !isWithinDays(a.dueDate, 30)) return false;
          if (dueDateFilter === 'quarter' && !isWithinDays(a.dueDate, 90)) return false;
          if (dueDateFilter === 'year' && !isWithinDays(a.dueDate, 365)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let comparison = 0;

        if (sortField === 'dueDate') {
          // Handle null due dates - put them at the end for ascending, start for descending
          if (!a.dueDate && !b.dueDate) comparison = 0;
          else if (!a.dueDate) comparison = 1;
          else if (!b.dueDate) comparison = -1;
          else comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        } else {
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      });
  };

  // Filter client groups
  const filteredClientGroups = mockClientGroups.filter((cg) => {
    if (clientGroupFilter !== 'all' && cg.id.toString() !== clientGroupFilter) return false;
    return true;
  });

  // Get action counts for summary
  const actionCounts = useMemo(() => {
    const counts = {
      total: 0,
      inProgress: 0,
      completed: 0,
      lapsed: 0,
    };

    actions.forEach((a) => {
      counts.total++;
      if (a.status === 'in_progress') counts.inProgress++;
      if (a.status === 'completed') counts.completed++;
      if (a.status === 'lapsed') counts.lapsed++;
    });

    return counts;
  }, [actions]);

  const handleActionClick = (action: Action) => {
    setSelectedAction(action);
  };

  const handleSaveAction = (updatedAction: Action) => {
    setActions((prev) => prev.map((a) => (a.id === updatedAction.id ? updatedAction : a)));
  };

  const handleStatusChange = (actionId: number, newStatus: ActionStatus) => {
    setActions((prev) =>
      prev.map((a) => (a.id === actionId ? { ...a, status: newStatus } : a))
    );
  };

  const handleDeleteAction = (action: Action) => {
    setActionToDelete(action);
  };

  const confirmDeleteAction = () => {
    if (actionToDelete) {
      setActions((prev) => prev.filter((a) => a.id !== actionToDelete.id));
      setActionToDelete(null);
    }
  };

  const selectedClientGroup = selectedAction
    ? mockClientGroups.find((cg) => cg.id === selectedAction.clientGroupId)
    : undefined;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full mx-auto space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Actions Overview</h1>
          <p className="text-sm text-gray-600">Manage client actions and tasks across all client groups</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500 uppercase">Total</p>
            <p className="text-xl font-bold text-gray-900">{actionCounts.total}</p>
          </div>
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-3">
            <p className="text-xs text-blue-700 uppercase">In Progress</p>
            <p className="text-xl font-bold text-blue-800">{actionCounts.inProgress}</p>
          </div>
          <div className="bg-green-50 rounded-lg border border-green-200 p-3">
            <p className="text-xs text-green-700 uppercase">Completed</p>
            <p className="text-xl font-bold text-green-800">{actionCounts.completed}</p>
          </div>
          <div className="bg-gray-100 rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500 uppercase">Lapsed</p>
            <p className="text-xl font-bold text-gray-600">{actionCounts.lapsed}</p>
          </div>
        </div>

        {/* Filters Row */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1 text-gray-600">
                <FunnelIcon className="h-4 w-4" />
                <span className="text-xs font-medium">Filters:</span>
              </div>

              <div className="w-44">
                <BaseDropdown
                  label="Client"
                  options={clientGroupOptions}
                  value={clientGroupFilter}
                  onChange={(v) => setClientGroupFilter(v.toString())}
                  size="sm"
                  placeholder="All Clients"
                  searchable
                />
              </div>

              <div className="w-40">
                <BaseDropdown
                  label="Advisor"
                  options={advisorOptions}
                  value={advisorFilter}
                  onChange={(v) => setAdvisorFilter(v.toString())}
                  size="sm"
                  placeholder="All Advisors"
                  searchable
                />
              </div>

              <div className="w-32">
                <BaseDropdown
                  label="Type"
                  options={actionTypeOptions}
                  value={actionTypeFilter}
                  onChange={(v) => setActionTypeFilter(v.toString())}
                  size="sm"
                  placeholder="All Types"
                  searchable
                />
              </div>

              <div className="w-36">
                <BaseDropdown
                  label="Due Date"
                  options={dueDateOptions}
                  value={dueDateFilter}
                  onChange={(v) => setDueDateFilter(v.toString() as DueDateFilter)}
                  size="sm"
                  placeholder="All Dates"
                  searchable
                />
              </div>

              <div className="flex items-center gap-3 border-l border-gray-200 pl-3 self-end pb-1">
                <label className="flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={showCompleted}
                    onChange={(e) => setShowCompleted(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-gray-600">Show Completed</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={showLapsed}
                    onChange={(e) => setShowLapsed(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-gray-600">Show Lapsed</span>
                </label>
              </div>
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-2 self-end pb-1">
              <span className="text-xs font-medium text-gray-600">Sort by:</span>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="text-xs border border-gray-300 rounded px-2 py-1.5 h-8 focus:ring-1 focus:ring-primary-500"
              >
                <option value="dueDate">Due Date</option>
                <option value="createdAt">Created Date</option>
              </select>
              <button
                onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
                className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
              >
                {sortDirection === 'asc' ? 'Earliest First' : 'Latest First'}
              </button>
            </div>
          </div>
        </div>

        {/* Client Groups with Actions */}
        <div className="space-y-2">
          {filteredClientGroups.map((clientGroup) => {
            const clientActions = getFilteredActions(clientGroup.id);
            const hasActions = clientActions.length > 0;

            return (
              <div
                key={clientGroup.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                <div className="flex items-stretch">
                  {/* Client Info - Fixed Width */}
                  <div className="w-48 flex-shrink-0 p-3 border-r border-gray-200 bg-gray-50">
                    <h3 className="font-medium text-gray-900 text-sm">{clientGroup.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        clientGroup.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-200 text-gray-500'
                      }`}>
                        {clientGroup.status === 'active' ? 'Active' : 'Lapsed'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {clientActions.length} action{clientActions.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Actions - Horizontal Scroll */}
                  <div className="flex-1 overflow-x-auto">
                    {hasActions ? (
                      <div className="flex gap-3 p-3 min-w-min">
                        {clientActions.map((action) => (
                          <ActionCard
                            key={action.id}
                            action={action}
                            onClick={() => handleActionClick(action)}
                            onStatusChange={(status) => handleStatusChange(action.id, status)}
                            onDelete={() => handleDeleteAction(action)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full p-3 text-sm text-gray-400 italic">
                        No actions match current filters
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state if no client groups */}
        {filteredClientGroups.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No client groups match your filter criteria</p>
          </div>
        )}

        {/* Footer note */}
        <p className="text-xs text-gray-500">
          * Click on an action card to view full details. Use the complete/lapse icons for quick status updates.
        </p>
      </div>

      {/* Action Detail Modal */}
      {selectedAction && (
        <ActionDetailModal
          action={selectedAction}
          clientGroup={selectedClientGroup}
          advisors={mockAdvisors}
          onClose={() => setSelectedAction(null)}
          onSave={handleSaveAction}
        />
      )}

      {/* Delete Confirmation Modal */}
      {actionToDelete && (
        <DeleteConfirmModal
          action={actionToDelete}
          onClose={() => setActionToDelete(null)}
          onConfirm={confirmDeleteAction}
        />
      )}
    </div>
  );
};

export default ActionsPagePrototype;
