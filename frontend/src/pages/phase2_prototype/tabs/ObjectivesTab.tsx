import React, { useState } from 'react';
import { ChevronRightIcon, ChevronUpIcon, ChevronDownIcon, PlusIcon, TrashIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Objective, Action } from '../types';

interface ObjectivesTabProps {
  objectives: Objective[];
  actions: Action[];
  onObjectiveClick: (objective: Objective) => void;
  onActionClick: (action: Action) => void;
}

type ObjectiveSortField = 'title' | 'targetDate' | 'priority' | 'status';
type ActionSortField = 'title' | 'assignedTo' | 'dueDate' | 'priority' | 'status';
type SortDirection = 'asc' | 'desc';

const ObjectivesTab: React.FC<ObjectivesTabProps> = ({
  objectives,
  actions,
  onObjectiveClick,
  onActionClick
}) => {
  // Sort state for objectives (default: priority)
  const [objectiveSortField, setObjectiveSortField] = useState<ObjectiveSortField>('priority');
  const [objectiveSortDirection, setObjectiveSortDirection] = useState<SortDirection>('asc');

  // Sort state for actions (default: assignedTo)
  const [actionSortField, setActionSortField] = useState<ActionSortField>('assignedTo');
  const [actionSortDirection, setActionSortDirection] = useState<SortDirection>('asc');

  // Priority ordering for sorting
  const priorityOrder = { 'High': 1, 'Medium': 2, 'Low': 3 };

  // Handle objective column sort
  const handleObjectiveSort = (field: ObjectiveSortField) => {
    if (objectiveSortField === field) {
      setObjectiveSortDirection(objectiveSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setObjectiveSortField(field);
      setObjectiveSortDirection('asc');
    }
  };

  // Handle action column sort
  const handleActionSort = (field: ActionSortField) => {
    if (actionSortField === field) {
      setActionSortDirection(actionSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setActionSortField(field);
      setActionSortDirection('asc');
    }
  };

  // Handle adding new objective
  const handleAddObjective = () => {
    console.log('Add new Aim');
    // TODO: Open modal or form to add new objective
  };

  // Handle adding new action
  const handleAddAction = () => {
    console.log('Add new Action');
    // TODO: Open modal or form to add new action
  };

  // Handle lapse objective
  const handleLapseObjective = (objective: Objective) => {
    console.log('Lapse objective:', objective);
    // TODO: Implement lapse logic
  };

  // Handle delete objective
  const handleDeleteObjective = (objective: Objective) => {
    console.log('Delete objective:', objective);
    // TODO: Implement delete logic
  };

  // Handle lapse action
  const handleLapseAction = (action: Action) => {
    console.log('Lapse action:', action);
    // TODO: Implement lapse logic
  };

  // Handle delete action
  const handleDeleteAction = (action: Action) => {
    console.log('Delete action:', action);
    // TODO: Implement delete logic
  };

  // Sort objectives based on current sort field and direction
  // Always keep Completed objectives at the bottom
  const sortedObjectives = [...objectives].sort((a, b) => {
    // First, separate by status - Completed always goes to bottom
    if (a.status === 'Completed' && b.status !== 'Completed') return 1;
    if (a.status !== 'Completed' && b.status === 'Completed') return -1;

    // If both have same completion status, sort by selected field
    let comparison = 0;

    switch (objectiveSortField) {
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'targetDate':
        comparison = a.targetDate.localeCompare(b.targetDate);
        break;
      case 'priority':
        comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
    }

    return objectiveSortDirection === 'asc' ? comparison : -comparison;
  });

  // Sort actions based on current sort field and direction
  // Always keep Completed actions at the bottom
  const sortedActions = [...actions].sort((a, b) => {
    // First, separate by status - Completed always goes to bottom
    if (a.status === 'Completed' && b.status !== 'Completed') return 1;
    if (a.status !== 'Completed' && b.status === 'Completed') return -1;

    // If both have same completion status, sort by selected field
    let comparison = 0;

    switch (actionSortField) {
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'assignedTo':
        // Advisor before Client
        comparison = a.assignedTo.localeCompare(b.assignedTo);
        break;
      case 'dueDate':
        comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        break;
      case 'priority':
        comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
    }

    return actionSortDirection === 'asc' ? comparison : -comparison;
  });

  // Render sort icon for objectives
  const renderObjectiveSortIcon = (field: ObjectiveSortField) => {
    if (objectiveSortField !== field) {
      return <ChevronUpIcon className="w-4 h-4 text-gray-400 opacity-50" />;
    }
    return objectiveSortDirection === 'asc' ? (
      <ChevronUpIcon className="w-4 h-4 text-gray-700" />
    ) : (
      <ChevronDownIcon className="w-4 h-4 text-gray-700" />
    );
  };

  // Render sort icon for actions
  const renderActionSortIcon = (field: ActionSortField) => {
    if (actionSortField !== field) {
      return <ChevronUpIcon className="w-4 h-4 text-gray-400 opacity-50" />;
    }
    return actionSortDirection === 'asc' ? (
      <ChevronUpIcon className="w-4 h-4 text-gray-700" />
    ) : (
      <ChevronDownIcon className="w-4 h-4 text-gray-700" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Aims Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Aims</h3>
            <button
              onClick={handleAddObjective}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add Aim
            </button>
          </div>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">
                <button
                  onClick={() => handleObjectiveSort('title')}
                  className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                >
                  Title
                  {renderObjectiveSortIcon('title')}
                </button>
              </th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Description</th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">
                <button
                  onClick={() => handleObjectiveSort('targetDate')}
                  className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                >
                  Target Date
                  {renderObjectiveSortIcon('targetDate')}
                </button>
              </th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">
                <button
                  onClick={() => handleObjectiveSort('priority')}
                  className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                >
                  Priority
                  {renderObjectiveSortIcon('priority')}
                </button>
              </th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">
                <button
                  onClick={() => handleObjectiveSort('status')}
                  className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                >
                  Status
                  {renderObjectiveSortIcon('status')}
                </button>
              </th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Actions</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedObjectives.map((obj) => (
              <tr
                key={obj.id}
                className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                  obj.status === 'Completed' ? 'opacity-60' : ''
                }`}
                onClick={() => onObjectiveClick(obj)}
              >
                <td className="px-3 py-2 whitespace-nowrap text-base font-medium text-gray-900">{obj.title}</td>
                <td className="px-3 py-2 text-base text-gray-900">{obj.description}</td>
                <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">{obj.targetDate}</td>
                <td className="px-3 py-2 whitespace-nowrap text-base">
                  <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                    obj.priority === 'High'
                      ? 'bg-red-100 text-red-800'
                      : obj.priority === 'Medium'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {obj.priority}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-base">
                  <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                    obj.status === 'Completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {obj.status}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-base">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLapseObjective(obj);
                      }}
                      className="p-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded transition-colors"
                      title="Lapse"
                    >
                      <XCircleIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteObjective(obj);
                      }}
                      className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-base">
                  <ChevronRightIcon className="w-5 h-5 text-gray-900" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Actions</h3>
            <button
              onClick={handleAddAction}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add Action
            </button>
          </div>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">
                <button
                  onClick={() => handleActionSort('title')}
                  className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                >
                  Title
                  {renderActionSortIcon('title')}
                </button>
              </th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Description</th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">
                <button
                  onClick={() => handleActionSort('assignedTo')}
                  className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                >
                  Assigned To
                  {renderActionSortIcon('assignedTo')}
                </button>
              </th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">
                <button
                  onClick={() => handleActionSort('dueDate')}
                  className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                >
                  Due Date
                  {renderActionSortIcon('dueDate')}
                </button>
              </th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">
                <button
                  onClick={() => handleActionSort('priority')}
                  className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                >
                  Priority
                  {renderActionSortIcon('priority')}
                </button>
              </th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">
                <button
                  onClick={() => handleActionSort('status')}
                  className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                >
                  Status
                  {renderActionSortIcon('status')}
                </button>
              </th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Actions</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedActions.map((action) => (
              <tr
                key={action.id}
                className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                  action.status === 'Completed' ? 'opacity-60' : ''
                }`}
                onClick={() => onActionClick(action)}
              >
                <td className="px-3 py-2 whitespace-nowrap text-base font-medium text-gray-900">{action.title}</td>
                <td className="px-3 py-2 text-base text-gray-900">{action.description}</td>
                <td className="px-3 py-2 whitespace-nowrap text-base">
                  <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                    action.assignedTo === 'Client'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {action.assignedTo}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">
                  {new Date(action.dueDate).toLocaleDateString('en-GB')}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-base">
                  <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                    action.priority === 'High'
                      ? 'bg-red-100 text-red-800'
                      : action.priority === 'Medium'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {action.priority}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-base">
                  <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                    action.status === 'Completed'
                      ? 'bg-green-100 text-green-800'
                      : action.status === 'In Progress'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-200 text-gray-900'
                  }`}>
                    {action.status}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-base">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLapseAction(action);
                      }}
                      className="p-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded transition-colors"
                      title="Lapse"
                    >
                      <XCircleIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAction(action);
                      }}
                      className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-base">
                  <ChevronRightIcon className="w-5 h-5 text-gray-900" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ObjectivesTab;
