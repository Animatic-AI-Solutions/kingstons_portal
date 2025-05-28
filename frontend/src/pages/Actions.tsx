import React, { useState } from 'react';
import Card from '../components/ui/Card';
import ScheduledTransactionForm from '../components/ScheduledTransactionForm';
import ScheduledTransactionsList from '../components/ScheduledTransactionsList';

/**
 * Transaction Scheduler Page - Scheduled Transactions Management
 * 
 * This page provides the interface for creating and managing scheduled transactions
 * including investments and withdrawals (both one-time and recurring).
 */
const Actions: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'create' | 'manage'>('create');
  const [refreshKey, setRefreshKey] = useState(0);

  // Trigger refresh of the transactions list when a new transaction is created
  const handleTransactionCreated = () => {
    setRefreshKey(prev => prev + 1);
    setActiveSection('manage'); // Switch to manage section to see the new transaction
  };

  return (
    <div className="container mx-auto px-4 py-3">
      {/* Page Header */}
      <div className="mb-3">
        <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">Scheduler</h1>
        <p className="text-gray-600">
          Schedule and manage automated investments and withdrawals for your portfolios.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-2 px-2 py-2 bg-gray-50 rounded-lg" role="tablist">
          <button
            onClick={() => setActiveSection('create')}
            className={`${
              activeSection === 'create'
                ? 'bg-primary-700 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            } rounded-lg px-4 py-2 font-medium text-base transition-all duration-200 ease-in-out`}
            role="tab"
            aria-selected={activeSection === 'create'}
            aria-controls="create-panel"
            id="create-tab"
          >
            Schedule Transaction
          </button>
          <button
            onClick={() => setActiveSection('manage')}
            className={`${
              activeSection === 'manage'
                ? 'bg-primary-700 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            } rounded-lg px-4 py-2 font-medium text-base transition-all duration-200 ease-in-out`}
            role="tab"
            aria-selected={activeSection === 'manage'}
            aria-controls="manage-panel"
            id="manage-tab"
          >
            Manage Scheduled Transactions
          </button>
        </nav>
      </div>

      {/* Content Sections */}
      {activeSection === 'create' && (
        <div className="w-full">
          <Card className="p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Schedule New Transaction
            </h2>
            <p className="text-gray-600 mb-8">
              Create one-time or recurring investment and withdrawal transactions that will be executed automatically.
            </p>
            <ScheduledTransactionForm onTransactionCreated={handleTransactionCreated} />
          </Card>
        </div>
      )}

      {activeSection === 'manage' && (
        <div className="w-full">
          <Card className="p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Scheduled Transactions
            </h2>
            <p className="text-gray-600 mb-8">
              View, edit, pause, resume, or cancel your scheduled transactions.
            </p>
            <ScheduledTransactionsList key={refreshKey} />
          </Card>
        </div>
      )}
    </div>
  );
};

export default Actions; 