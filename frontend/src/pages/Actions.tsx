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
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Transaction Scheduler</h1>
        <p className="text-gray-600">
          Schedule and manage automated investments and withdrawals for your portfolios.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveSection('create')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeSection === 'create'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Schedule Transaction
          </button>
          <button
            onClick={() => setActiveSection('manage')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeSection === 'manage'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
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