import React from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDaysIcon,
  UserGroupIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';

interface PrototypeCard {
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  status: 'active' | 'in_progress' | 'planned';
}

const prototypes: PrototypeCard[] = [
  {
    title: 'Meetings Schedule',
    description: 'Meeting schedule table with colour-coded statuses, year navigation, and meeting management modal.',
    path: '/meetings-prototype',
    icon: <CalendarDaysIcon className="h-8 w-8" />,
    status: 'active',
  },
  {
    title: 'Client Group Phase 2',
    description: 'Advanced client group management with comprehensive person fields, health tracking, and document management.',
    path: '/client-groups-phase2',
    icon: <UserGroupIcon className="h-8 w-8" />,
    status: 'active',
  },
];

const STATUS_STYLES = {
  active: 'bg-green-100 text-green-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  planned: 'bg-gray-100 text-gray-600',
};

const STATUS_LABELS = {
  active: 'Active',
  in_progress: 'In Progress',
  planned: 'Planned',
};

const Prototypes: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BeakerIcon className="h-8 w-8 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900">Prototypes</h1>
          </div>
          <p className="text-gray-600">
            Explore prototype pages for new features and functionality in development.
          </p>
        </div>

        {/* Prototype Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prototypes.map((prototype) => (
            <Link
              key={prototype.path}
              to={prototype.path}
              className="bg-white rounded-lg border border-gray-200 p-5 hover:border-primary-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-2 bg-primary-50 rounded-lg text-primary-600 group-hover:bg-primary-100 transition-colors">
                  {prototype.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
                      {prototype.title}
                    </h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[prototype.status]}`}>
                      {STATUS_LABELS[prototype.status]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {prototype.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Info note */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Prototype pages use mock data for demonstration purposes.
            Features may change before final implementation.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Prototypes;
