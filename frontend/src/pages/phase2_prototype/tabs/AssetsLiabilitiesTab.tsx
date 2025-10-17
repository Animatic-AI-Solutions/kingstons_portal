import React, { useState } from 'react';
import { PlusIcon, XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { formatMoney } from '../../../utils/formatMoney';
import { Person, Asset, Liability, OtherClientGroup } from '../types';

interface AssetsLiabilitiesTabProps {
  people: Person[];
  clientOrder: string[];
  assets: Asset[];
  liabilities: Liability[];
  otherClientGroups: OtherClientGroup[];
  onAssetClick: (asset: Asset) => void;
  onLiabilityClick: (liability: Liability) => void;
}

const AssetsLiabilitiesTab: React.FC<AssetsLiabilitiesTabProps> = ({
  people,
  clientOrder,
  assets,
  liabilities,
  otherClientGroups,
  onAssetClick,
  onLiabilityClick
}) => {
  // State for person inclusion
  const [includedPeople, setIncludedPeople] = useState<Set<string>>(new Set(people.map(p => p.id)));
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedClientGroup, setSelectedClientGroup] = useState<string | null>(null);

  // Helper to calculate ownership amounts per person
  const getPersonOwnership = (item: Asset | Liability, personName: string): number => {
    const value = 'value' in item ? item.value : item.amount;

    if (item.ownershipType === 'sole') {
      // Sole ownership - only the named owner has 100%
      return item.owner.includes(personName) ? value : 0;
    } else if (item.ownershipType === 'joint') {
      // Joint ownership - not counted in individual columns (shown in Joint column)
      return 0;
    } else if (item.ownershipType === 'in-common') {
      // In-common ownership - use specified percentages
      const percentage = item.ownershipPercentages?.[personName] || 0;
      return (value * percentage) / 100;
    }
    return 0;
  };

  // Helper to get joint ownership amount
  const getJointOwnership = (item: Asset | Liability): number => {
    const value = 'value' in item ? item.value : item.amount;
    return item.ownershipType === 'joint' ? value : 0;
  };

  // Filter people based on selection and sort by client order
  const displayedPeople = people
    .filter(p => includedPeople.has(p.id))
    .sort((a, b) => {
      const indexA = clientOrder.indexOf(a.id);
      const indexB = clientOrder.indexOf(b.id);
      return indexA - indexB;
    });

  // Toggle person inclusion
  const togglePersonInclusion = (personId: string) => {
    const newIncluded = new Set(includedPeople);
    if (newIncluded.has(personId)) {
      newIncluded.delete(personId);
    } else {
      newIncluded.add(personId);
    }
    setIncludedPeople(newIncluded);
  };

  // Calculate totals per person (only for displayed people)
  const personTotals = displayedPeople.map(person => {
    const personName = `${person.forename} ${person.surname}`;
    const assetTotal = assets.reduce((sum, asset) => sum + getPersonOwnership(asset, personName), 0);
    const liabilityTotal = liabilities.reduce((sum, liability) => sum + getPersonOwnership(liability, personName), 0);
    return {
      name: personName,
      netWorth: assetTotal - liabilityTotal
    };
  });

  const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.amount, 0);
  const netWorth = totalAssets - totalLiabilities;

  // Get sorted people for controls (by client order)
  const sortedPeople = [...people].sort((a, b) => {
    const indexA = clientOrder.indexOf(a.id);
    const indexB = clientOrder.indexOf(b.id);
    return indexA - indexB;
  });

  return (
    <div className="space-y-4">
      {/* Control Section */}
      <div className="bg-white rounded-lg shadow p-3 border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-base font-semibold text-gray-900">Include People</h4>
          <div className="flex gap-2">
            <button
              onClick={() => setIncludedPeople(new Set(people.map(p => p.id)))}
              className="text-sm px-2 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200 transition-colors"
            >
              Select All
            </button>
            <button
              onClick={() => setIncludedPeople(new Set())}
              className="text-sm px-2 py-1 bg-gray-100 text-gray-900 rounded hover:bg-gray-200 transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="text-sm px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors flex items-center gap-1"
            >
              <PlusIcon className="w-3 h-3" />
              Import from Other Client
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {sortedPeople.map(person => {
            const fullName = `${person.title} ${person.forename} ${person.surname}`.trim();
            const isIncluded = includedPeople.has(person.id);
            return (
              <button
                key={person.id}
                onClick={() => togglePersonInclusion(person.id)}
                className={`px-3 py-1.5 rounded-md text-base font-medium transition-colors ${
                  isIncluded
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {fullName}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b">
          <h3 className="text-xl font-semibold">Assets & Liabilities</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Asset / Liability</th>
                {displayedPeople.map((person) => (
                  <th key={person.id} className="px-3 py-2 text-right text-sm font-bold text-gray-900 uppercase">
                    {person.forename} {person.surname}
                  </th>
                ))}
                <th className="px-3 py-2 text-right text-sm font-bold text-gray-900 uppercase">Joint</th>
                <th className="px-3 py-2 text-right text-sm font-bold text-gray-900 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Asset Rows */}
              {assets.map((asset, index) => (
                <tr key={asset.id} className={`hover:bg-gray-50 cursor-pointer ${index === 0 ? 'border-t-2 border-gray-300' : ''}`} onClick={() => onAssetClick(asset)}>
                  <td className="px-3 py-2 text-base font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                      {asset.description}
                    </div>
                  </td>
                  {displayedPeople.map((person) => {
                    const personName = `${person.forename} ${person.surname}`;
                    const amount = getPersonOwnership(asset, personName);
                    return (
                      <td key={person.id} className="px-3 py-2 whitespace-nowrap text-base text-gray-900 text-right">
                        {amount > 0 ? formatMoney(amount) : '-'}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900 text-right">
                    {getJointOwnership(asset) > 0 ? formatMoney(getJointOwnership(asset)) : '-'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900 text-right font-semibold">
                    {formatMoney(asset.value)}
                  </td>
                </tr>
              ))}

              {/* Assets Total Row */}
              <tr className="bg-green-50 font-bold">
                <td className="px-3 py-2 text-base text-gray-900">Total Assets</td>
                {displayedPeople.map((person) => {
                  const personName = `${person.forename} ${person.surname}`;
                  const total = assets.reduce((sum, asset) => sum + getPersonOwnership(asset, personName), 0);
                  return (
                    <td key={person.id} className="px-3 py-2 whitespace-nowrap text-base text-gray-900 text-right">
                      {formatMoney(total)}
                    </td>
                  );
                })}
                <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900 text-right">
                  {formatMoney(assets.reduce((sum, asset) => sum + getJointOwnership(asset), 0))}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900 text-right">
                  {formatMoney(totalAssets)}
                </td>
              </tr>

              {/* Liability Rows */}
              {liabilities.map((liability, index) => (
                <tr key={liability.id} className={`hover:bg-gray-50 cursor-pointer ${index === 0 ? 'border-t-2 border-gray-300' : ''}`} onClick={() => onLiabilityClick(liability)}>
                  <td className="px-3 py-2 text-base font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
                      {liability.description}
                    </div>
                  </td>
                  {displayedPeople.map((person) => {
                    const personName = `${person.forename} ${person.surname}`;
                    const amount = getPersonOwnership(liability, personName);
                    return (
                      <td key={person.id} className="px-3 py-2 whitespace-nowrap text-base text-gray-900 text-right">
                        {amount > 0 ? formatMoney(amount) : '-'}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900 text-right">
                    {getJointOwnership(liability) > 0 ? formatMoney(getJointOwnership(liability)) : '-'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900 text-right font-semibold">
                    {formatMoney(liability.amount)}
                  </td>
                </tr>
              ))}

              {/* Liabilities Total Row */}
              <tr className="bg-red-50 font-bold">
                <td className="px-3 py-2 text-base text-gray-900">Total Liabilities</td>
                {displayedPeople.map((person) => {
                  const personName = `${person.forename} ${person.surname}`;
                  const total = liabilities.reduce((sum, liability) => sum + getPersonOwnership(liability, personName), 0);
                  return (
                    <td key={person.id} className="px-3 py-2 whitespace-nowrap text-base text-gray-900 text-right">
                      {formatMoney(total)}
                    </td>
                  );
                })}
                <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900 text-right">
                  {formatMoney(liabilities.reduce((sum, liability) => sum + getJointOwnership(liability), 0))}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900 text-right">
                  {formatMoney(totalLiabilities)}
                </td>
              </tr>

              {/* Net Worth Row */}
              <tr className="bg-blue-100 font-bold border-t-2 border-gray-400">
                <td className="px-3 py-2 text-base text-gray-900">Net Worth</td>
                {personTotals.map((person, index) => (
                  <td key={index} className="px-3 py-2 whitespace-nowrap text-base text-gray-900 text-right">
                    {formatMoney(person.netWorth)}
                  </td>
                ))}
                <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900 text-right">
                  {formatMoney(
                    assets.reduce((sum, asset) => sum + getJointOwnership(asset), 0) -
                    liabilities.reduce((sum, liability) => sum + getJointOwnership(liability), 0)
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900 text-right">
                  {formatMoney(netWorth)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowImportModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 bg-gray-50 border-b flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Import Asset/Liability from Other Client Group</h3>
              <button onClick={() => setShowImportModal(false)} className="text-gray-900 hover:text-gray-900">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              {!selectedClientGroup ? (
                <div>
                  <h4 className="text-base font-semibold text-gray-900 mb-3">Select Client Group</h4>
                  <div className="space-y-2">
                    {otherClientGroups.map(group => (
                      <button
                        key={group.id}
                        onClick={() => setSelectedClientGroup(group.id)}
                        className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                      >
                        <div className="font-medium text-gray-900">{group.name}</div>
                        <div className="text-base text-gray-900 mt-1">
                          {group.people.map(p => p.name).join(', ')}
                        </div>
                        <div className="text-sm text-gray-900 mt-1">
                          {group.assets.length} asset{group.assets.length !== 1 ? 's' : ''}, {group.liabilities.length} liability{group.liabilities.length !== 1 ? 'ies' : ''}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-4 flex items-center gap-2">
                    <button
                      onClick={() => setSelectedClientGroup(null)}
                      className="text-base text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                      <ChevronLeftIcon className="w-4 h-4" />
                      Back to Client Groups
                    </button>
                  </div>

                  {(() => {
                    const group = otherClientGroups.find(g => g.id === selectedClientGroup);
                    if (!group) return null;

                    return (
                      <div>
                        <h4 className="text-base font-semibold text-gray-900 mb-1">{group.name}</h4>
                        <p className="text-base text-gray-900 mb-4">Select an asset or liability to import (people will be imported automatically)</p>

                        {group.assets.length > 0 && (
                          <div className="mb-6">
                            <h5 className="text-base font-semibold text-gray-900 mb-2">Assets</h5>
                            <div className="space-y-2">
                              {group.assets.map(asset => (
                                <button
                                  key={asset.id}
                                  onClick={() => {
                                    alert(`Import functionality: Would import "${asset.description}" with associated people`);
                                    setShowImportModal(false);
                                    setSelectedClientGroup(null);
                                  }}
                                  className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900">{asset.description}</div>
                                      <div className="text-base text-gray-900 mt-1">
                                        Type: {asset.type} • Owner: {asset.owner}
                                      </div>
                                    </div>
                                    <div className="text-base font-semibold text-gray-900">
                                      {formatMoney(asset.value)}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {group.liabilities.length > 0 && (
                          <div>
                            <h5 className="text-base font-semibold text-gray-900 mb-2">Liabilities</h5>
                            <div className="space-y-2">
                              {group.liabilities.map(liability => (
                                <button
                                  key={liability.id}
                                  onClick={() => {
                                    alert(`Import functionality: Would import "${liability.description}" with associated people`);
                                    setShowImportModal(false);
                                    setSelectedClientGroup(null);
                                  }}
                                  className="w-full text-left px-4 py-3 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900">{liability.description}</div>
                                      <div className="text-base text-gray-900 mt-1">
                                        Type: {liability.type} • Owner: {liability.owner}
                                      </div>
                                    </div>
                                    <div className="text-base font-semibold text-gray-900">
                                      {formatMoney(liability.amount)}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetsLiabilitiesTab;
