import React from 'react';
import { UserIcon } from '@heroicons/react/24/outline';
import { Objective, Action } from '../types';

interface ObjectivesTabProps {
  objectives: Objective[];
  actions: Action[];
  onObjectiveClick: (objective: Objective) => void;
  onActionClick: (action: Action) => void;
}

const ObjectivesTab: React.FC<ObjectivesTabProps> = ({
  objectives,
  actions,
  onObjectiveClick,
  onActionClick
}) => {
  // Filter objectives
  const activeObjectives = objectives.filter(obj => obj.status !== 'Completed');
  const completedObjectives = objectives.filter(obj => obj.status === 'Completed');

  // Filter actions
  const activeActions = actions.filter(action => action.status !== 'Completed');
  const completedActions = actions.filter(action => action.status === 'Completed');

  return (
    <div className="space-y-6">
      {/* Aims & Objectives Section */}
      <div>
        <div className="mb-3">
          <h3 className="text-xl font-semibold text-gray-900">Aims & Objectives</h3>
          <p className="text-base text-gray-900">Long-term financial goals and targets</p>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {activeObjectives.map((obj) => (
            <div
              key={obj.id}
              className="bg-white rounded-lg shadow p-3 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onObjectiveClick(obj)}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{obj.title}</h3>
                <span className={`px-2 py-0.5 rounded-full text-sm font-medium ${
                  obj.priority === 'High'
                    ? 'bg-red-100 text-red-800'
                    : obj.priority === 'Medium'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {obj.priority} Priority
                </span>
              </div>
              <p className="text-base text-gray-900 mb-2">{obj.description}</p>
              <div className="flex justify-between items-center text-base">
                <span className="text-gray-900">Target: {obj.targetDate}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Historical Aims and Objectives */}
      {completedObjectives.length > 0 && (
        <div className="opacity-60">
          <div className="mb-3">
            <h3 className="text-xl font-semibold text-gray-900">Historical Aims and Objectives</h3>
            <p className="text-base text-gray-900">Completed long-term goals</p>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {completedObjectives.map((obj) => (
              <div
                key={obj.id}
                className="bg-gray-50 rounded-lg shadow p-3 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => onObjectiveClick(obj)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{obj.title}</h3>
                  <span className="px-2 py-0.5 rounded-full text-sm font-medium bg-gray-200 text-gray-900">
                    {obj.priority} Priority
                  </span>
                </div>
                <p className="text-base text-gray-900 mb-2">{obj.description}</p>
                <div className="flex justify-between items-center text-base">
                  <span className="text-gray-900">Target: {obj.targetDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions Section */}
      <div>
        <div className="mb-4">
          <h3 className="text-2xl font-semibold text-gray-900">Actions</h3>
          <p className="text-base text-gray-900">Short-term to-do items for client and advisor</p>
        </div>

        <div className="space-y-4">
          {/* Client Actions */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-blue-600" />
              Client Actions
            </h4>
            <div className="space-y-1.5">
              {activeActions.filter(action => action.assignedTo === 'Client').map((action) => (
                <div
                  key={action.id}
                  className="bg-white rounded-lg shadow p-3 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-blue-500"
                  onClick={() => onActionClick(action)}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <div className="flex-1">
                      <h5 className="text-base font-semibold text-gray-900">{action.title}</h5>
                      <p className="text-base text-gray-900 mt-1">{action.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2">
                      <span className={`px-1.5 py-0.5 rounded-full text-sm font-medium ${
                        action.priority === 'High'
                          ? 'bg-red-100 text-red-800'
                          : action.priority === 'Medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {action.priority}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-base mt-2">
                    <span className="text-gray-900">Due: {new Date(action.dueDate).toLocaleDateString('en-GB')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Advisor Actions */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Advisor Actions
            </h4>
            <div className="space-y-1.5">
              {activeActions.filter(action => action.assignedTo === 'Advisor').map((action) => (
                <div
                  key={action.id}
                  className="bg-white rounded-lg shadow p-3 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-primary-600"
                  onClick={() => onActionClick(action)}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <div className="flex-1">
                      <h5 className="text-base font-semibold text-gray-900">{action.title}</h5>
                      <p className="text-base text-gray-900 mt-1">{action.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2">
                      <span className={`px-1.5 py-0.5 rounded-full text-sm font-medium ${
                        action.priority === 'High'
                          ? 'bg-red-100 text-red-800'
                          : action.priority === 'Medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {action.priority}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-base mt-2">
                    <span className="text-gray-900">Due: {new Date(action.dueDate).toLocaleDateString('en-GB')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Historical Actions */}
          <div className="opacity-60">
            <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Historical Actions
            </h4>
            <div className="space-y-1.5">
              {completedActions.map((action) => (
                <div
                  key={action.id}
                  className="bg-gray-50 rounded-lg shadow p-3 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-gray-400"
                  onClick={() => onActionClick(action)}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <div className="flex-1">
                      <h5 className="text-base font-semibold text-gray-900">{action.title}</h5>
                      <p className="text-base text-gray-900 mt-1">{action.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2">
                      <span className={`px-1.5 py-0.5 rounded-full text-sm font-medium ${
                        action.assignedTo === 'Client' ? 'bg-gray-200 text-gray-900' : 'bg-gray-200 text-gray-900'
                      }`}>
                        {action.assignedTo}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-base mt-2">
                    <span className="text-gray-900">Completed: {new Date(action.dueDate).toLocaleDateString('en-GB')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ObjectivesTab;
