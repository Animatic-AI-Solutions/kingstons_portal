import React, { useState } from 'react';
import { PlusIcon, XMarkIcon, ChevronLeftIcon, ChevronRightIcon, CheckIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { formatMoney, formatMoneyWithoutDecimals } from '../../../utils/formatMoney';
import { Person, Asset, Liability, OtherClientGroup, DefinedBenefitPension, Trusteeship } from '../types';
import { ASSET_CATEGORY_ORDER, LIABILITY_CATEGORY_ORDER, sampleBusinessAssets, sampleBusinessLiabilities, sampleDefinedBenefitPensions, sampleBusinessDefinedBenefitPensions, sampleTrusteeships, sampleBusinessTrusteeships } from '../sampleData';

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

  // State for client type toggle (Family vs Business)
  const [clientType, setClientType] = useState<'family' | 'business'>('family');

  // State for drag and drop reordering
  const [draggedItem, setDraggedItem] = useState<{ type: 'asset' | 'liability', item: Asset | Liability, category: string } | null>(null);
  const [customOrder, setCustomOrder] = useState<Record<string, string[]>>({});

  // Use family or business data based on client type
  const currentAssets = clientType === 'family' ? assets : sampleBusinessAssets;
  const currentLiabilities = clientType === 'family' ? liabilities : sampleBusinessLiabilities;
  const currentDefinedBenefitPensions = clientType === 'family' ? sampleDefinedBenefitPensions : sampleBusinessDefinedBenefitPensions;
  const currentTrusteeships = clientType === 'family' ? sampleTrusteeships : sampleBusinessTrusteeships;

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

  // Identify children in the client group
  const children = people.filter(person =>
    ['Son', 'Daughter', 'Child'].some(term => person.relationship.includes(term))
  );

  // Filter people based on selection and sort by client order
  // Exclude children from main table display
  const displayedPeople = people
    .filter(p => includedPeople.has(p.id))
    .filter(p => !children.some(child => child.id === p.id))
    .sort((a, b) => {
      const indexA = clientOrder.indexOf(a.id);
      const indexB = clientOrder.indexOf(b.id);
      return indexA - indexB;
    });

  // Helper to check if an asset/liability is owned by any displayed person
  const isOwnedByDisplayedPeople = (item: Asset | Liability): boolean => {
    const displayedNames = displayedPeople.map(p => `${p.forename} ${p.surname}`);

    // Check if any displayed person is an owner
    if (item.ownershipType === 'sole') {
      return displayedNames.some(name => item.owner.includes(name));
    } else if (item.ownershipType === 'joint' || item.ownershipType === 'in-common') {
      // For joint/in-common, check if any displayed person has ownership
      if (item.ownershipPercentages) {
        return displayedNames.some(name => (item.ownershipPercentages?.[name] || 0) > 0);
      }
      // Fallback: check if owner string includes any displayed person
      return displayedNames.some(name => item.owner.includes(name));
    }
    return false;
  };

  // Helper to check if an asset/liability is owned by any child
  const isOwnedByChildren = (item: Asset | Liability): boolean => {
    const childNames = children.map(c => `${c.forename} ${c.surname}`);
    if (item.ownershipType === 'sole') {
      return childNames.some(name => item.owner.includes(name));
    }
    // For joint/in-common, check if any child has ownership
    if (item.ownershipPercentages) {
      return childNames.some(name => (item.ownershipPercentages?.[name] || 0) > 0);
    }
    return childNames.some(name => item.owner.includes(name));
  };

  // Filter assets and liabilities to only show those owned by displayed people
  // For business view, show all assets/liabilities (no people-based filtering)
  // For family view, exclude assets/liabilities owned by children
  const filteredAssets = clientType === 'business'
    ? currentAssets
    : currentAssets.filter(asset => isOwnedByDisplayedPeople(asset) && !isOwnedByChildren(asset));
  const filteredLiabilities = clientType === 'business'
    ? currentLiabilities
    : currentLiabilities.filter(liability => isOwnedByDisplayedPeople(liability) && !isOwnedByChildren(liability));

  // Group assets by category in the specified order
  const groupedAssets = ASSET_CATEGORY_ORDER.reduce((acc, category) => {
    const categoryAssets = filteredAssets.filter(asset => asset.category === category);
    if (categoryAssets.length > 0) {
      acc[category] = categoryAssets;
    }
    return acc;
  }, {} as Record<string, Asset[]>);

  // Group liabilities by category in the specified order
  const groupedLiabilities = LIABILITY_CATEGORY_ORDER.reduce((acc, category) => {
    const categoryLiabilities = filteredLiabilities.filter(liability => liability.category === category);
    if (categoryLiabilities.length > 0) {
      acc[category] = categoryLiabilities;
    }
    return acc;
  }, {} as Record<string, Liability[]>);

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

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, type: 'asset' | 'liability', item: Asset | Liability, category: string) => {
    setDraggedItem({ type, item, category });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetItem: Asset | Liability, category: string) => {
    e.preventDefault();

    if (!draggedItem || draggedItem.category !== category) {
      setDraggedItem(null);
      return;
    }

    const items = draggedItem.type === 'asset'
      ? groupedAssets[category] || []
      : groupedLiabilities[category] || [];

    const draggedIndex = items.findIndex(i => i.id === draggedItem.item.id);
    const targetIndex = items.findIndex(i => i.id === targetItem.id);

    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
      setDraggedItem(null);
      return;
    }

    // Create new order for this category
    const newOrder = [...items];
    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, removed);

    // Update custom order state
    const categoryKey = `${draggedItem.type}-${category}`;
    setCustomOrder({
      ...customOrder,
      [categoryKey]: newOrder.map(i => i.id)
    });

    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  // Helper to sort items by custom order
  const sortByCustomOrder = (items: (Asset | Liability)[], type: 'asset' | 'liability', category: string) => {
    const categoryKey = `${type}-${category}`;
    const order = customOrder[categoryKey];

    if (!order) return items;

    return [...items].sort((a, b) => {
      const indexA = order.indexOf(a.id);
      const indexB = order.indexOf(b.id);

      if (indexA === -1) return 1;
      if (indexB === -1) return -1;

      return indexA - indexB;
    });
  };

  // Calculate totals per person (only for displayed people and filtered assets/liabilities)
  const personTotals = displayedPeople.map(person => {
    const personName = `${person.forename} ${person.surname}`;
    const assetTotal = filteredAssets.reduce((sum, asset) => sum + getPersonOwnership(asset, personName), 0);
    const liabilityTotal = filteredLiabilities.reduce((sum, liability) => sum + getPersonOwnership(liability, personName), 0);
    return {
      name: personName,
      netWorth: assetTotal - liabilityTotal
    };
  });

  const totalAssets = filteredAssets.reduce((sum, a) => sum + a.value, 0);
  const totalLiabilities = filteredLiabilities.reduce((sum, l) => sum + l.amount, 0);
  const netWorth = totalAssets - totalLiabilities;

  // Get sorted people for controls (by client order)
  const sortedPeople = [...people].sort((a, b) => {
    const indexA = clientOrder.indexOf(a.id);
    const indexB = clientOrder.indexOf(b.id);
    return indexA - indexB;
  });

  // Filter assets and liabilities owned by children (from current assets, not filtered assets)
  const childrenAssets = currentAssets.filter(asset => {
    return children.some(child => {
      const childName = `${child.forename} ${child.surname}`;
      return asset.owner.includes(childName);
    });
  });

  const childrenLiabilities = currentLiabilities.filter(liability => {
    return children.some(child => {
      const childName = `${child.forename} ${child.surname}`;
      return liability.owner.includes(childName);
    });
  });

  const childrenTotalAssets = childrenAssets.reduce((sum, a) => sum + a.value, 0);
  const childrenTotalLiabilities = childrenLiabilities.reduce((sum, l) => sum + l.amount, 0);
  const childrenNetWorth = childrenTotalAssets - childrenTotalLiabilities;

  return (
    <div className="space-y-4">
      {/* Client Type Toggle */}
      <div className="bg-white rounded-lg shadow p-3 border border-gray-200">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-semibold text-gray-900">Client Group Type</h4>
          <div className="flex gap-2">
            <button
              onClick={() => setClientType('family')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                clientType === 'family'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              }`}
            >
              Family
            </button>
            <button
              onClick={() => setClientType('business')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                clientType === 'business'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              }`}
            >
              Business (Mitchell Consulting Ltd)
            </button>
          </div>
        </div>
        {clientType === 'business' && (
          <div className="mt-2 text-sm text-gray-600 italic">
            Business net worth also appears in the Family view under Business Interests
          </div>
        )}
      </div>

      {/* Control Section - Only show for family view */}
      {clientType === 'family' && (
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
      )}

      {/* Assets Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b">
          <h3 className="text-xl font-semibold">Assets</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-1 text-left text-xs font-bold text-gray-900 uppercase w-96">Asset</th>
                {/* Only show person columns in family mode */}
                {clientType === 'family' && displayedPeople.map((person) => (
                  <th key={person.id} className="px-2 py-1 text-right text-xs font-bold text-gray-900 uppercase w-32">
                    {person.forename}
                  </th>
                ))}
                {/* Only show Joint column if more than one person is displayed and in family mode */}
                {clientType === 'family' && displayedPeople.length > 1 && (
                  <th className="px-2 py-1 text-right text-xs font-bold text-gray-900 uppercase w-32">Joint</th>
                )}
                <th className="px-2 py-1 text-right text-xs font-bold text-gray-900 uppercase w-32">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Asset Subsections - Grouped by Category */}
              {Object.entries(groupedAssets).map(([category, categoryAssets], categoryIndex) => (
                <React.Fragment key={category}>
                  {/* Subsection Header */}
                  <tr className={`bg-primary-100 ${categoryIndex === 0 ? 'border-t-2 border-gray-300' : ''}`}>
                    <td colSpan={clientType === 'business' ? 2 : displayedPeople.length + (displayedPeople.length > 1 ? 3 : 2)} className="px-2 py-0.5 text-xs font-bold text-primary-900 uppercase">
                      {category}
                    </td>
                  </tr>

                  {/* Assets in this category */}
                  {sortByCustomOrder(categoryAssets, 'asset', category).map((asset) => (
                    <tr
                      key={asset.id}
                      className="hover:bg-gray-50 cursor-move group"
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'asset', asset, category)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, asset, category)}
                      onDragEnd={handleDragEnd}
                    >
                      <td className="px-2 py-1 text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-1.5">
                          <Bars3Icon className="w-4 h-4 text-gray-400 group-hover:text-gray-600 cursor-grab active:cursor-grabbing" />
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          <span onClick={(e) => { e.stopPropagation(); onAssetClick(asset); }} className="cursor-pointer">
                            {asset.description}
                          </span>
                        </div>
                      </td>
                      {/* Only show person columns in family mode */}
                      {clientType === 'family' && displayedPeople.map((person) => {
                        const personName = `${person.forename} ${person.surname}`;
                        const amount = getPersonOwnership(asset, personName);
                        return (
                          <td key={person.id} className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 text-right">
                            {amount > 0 ? formatMoneyWithoutDecimals(amount) : '-'}
                          </td>
                        );
                      })}
                      {/* Only show Joint column if more than one person is displayed and in family mode */}
                      {clientType === 'family' && displayedPeople.length > 1 && (
                        <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 text-right">
                          {getJointOwnership(asset) > 0 ? formatMoneyWithoutDecimals(getJointOwnership(asset)) : '-'}
                        </td>
                      )}
                      <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                        {formatMoneyWithoutDecimals(asset.value)}
                      </td>
                    </tr>
                  ))}

                  {/* Subsection Total Row */}
                  <tr className="bg-primary-50 font-semibold">
                    <td className="px-2 py-0.5 text-xs text-gray-900 italic">Total {category}</td>
                    {/* Only show person columns in family mode */}
                    {clientType === 'family' && displayedPeople.map((person) => {
                      const personName = `${person.forename} ${person.surname}`;
                      const orderedAssets = sortByCustomOrder(categoryAssets, 'asset', category);
                      const total = orderedAssets.reduce((sum, asset) => sum + getPersonOwnership(asset, personName), 0);
                      return (
                        <td key={person.id} className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900 text-right">
                          {total > 0 ? formatMoneyWithoutDecimals(total) : '-'}
                        </td>
                      );
                    })}
                    {/* Only show Joint column if more than one person is displayed and in family mode */}
                    {clientType === 'family' && displayedPeople.length > 1 && (
                      <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatMoneyWithoutDecimals(categoryAssets.reduce((sum, asset) => sum + getJointOwnership(asset), 0))}
                      </td>
                    )}
                    <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatMoneyWithoutDecimals(categoryAssets.reduce((sum, asset) => sum + asset.value, 0))}
                    </td>
                  </tr>
                </React.Fragment>
              ))}

              {/* Grand Total Assets Row */}
              <tr className="bg-green-50 font-bold border-t-2 border-gray-400">
                <td className="px-2 py-1 text-sm text-gray-900">Total Assets</td>
                {/* Only show person columns in family mode */}
                {clientType === 'family' && displayedPeople.map((person) => {
                  const personName = `${person.forename} ${person.surname}`;
                  const total = filteredAssets.reduce((sum, asset) => sum + getPersonOwnership(asset, personName), 0);
                  return (
                    <td key={person.id} className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatMoneyWithoutDecimals(total)}
                    </td>
                  );
                })}
                {/* Only show Joint column if more than one person is displayed and in family mode */}
                {clientType === 'family' && displayedPeople.length > 1 && (
                  <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatMoneyWithoutDecimals(filteredAssets.reduce((sum, asset) => sum + getJointOwnership(asset), 0))}
                  </td>
                )}
                <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 text-right">
                  {formatMoneyWithoutDecimals(totalAssets)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Liabilities Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b">
          <h3 className="text-xl font-semibold">Liabilities</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-1 text-left text-xs font-bold text-gray-900 uppercase w-96">Liability</th>
                {/* Only show person columns in family mode */}
                {clientType === 'family' && displayedPeople.map((person) => (
                  <th key={person.id} className="px-2 py-1 text-right text-xs font-bold text-gray-900 uppercase w-32">
                    {person.forename}
                  </th>
                ))}
                {/* Only show Joint column if more than one person is displayed and in family mode */}
                {clientType === 'family' && displayedPeople.length > 1 && (
                  <th className="px-2 py-1 text-right text-xs font-bold text-gray-900 uppercase w-32">Joint</th>
                )}
                <th className="px-2 py-1 text-right text-xs font-bold text-gray-900 uppercase w-32">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Liability Subsections - Grouped by Category */}
              {Object.entries(groupedLiabilities).map(([category, categoryLiabilities]) => (
                <React.Fragment key={category}>
                  {/* Subsection Header */}
                  <tr className="bg-amber-100 border-t-2 border-gray-400">
                    <td colSpan={clientType === 'business' ? 2 : displayedPeople.length + (displayedPeople.length > 1 ? 3 : 2)} className="px-2 py-0.5 text-xs font-bold text-amber-900 uppercase">
                      {category}
                    </td>
                  </tr>

                  {/* Liabilities in this category */}
                  {sortByCustomOrder(categoryLiabilities, 'liability', category).map((liability) => (
                    <tr
                      key={liability.id}
                      className="hover:bg-gray-50 cursor-move group"
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'liability', liability, category)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, liability, category)}
                      onDragEnd={handleDragEnd}
                    >
                      <td className="px-2 py-1 text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-1.5">
                          <Bars3Icon className="w-4 h-4 text-gray-400 group-hover:text-gray-600 cursor-grab active:cursor-grabbing" />
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                          <span onClick={(e) => { e.stopPropagation(); onLiabilityClick(liability); }} className="cursor-pointer">
                            {liability.description}
                          </span>
                        </div>
                      </td>
                      {/* Only show person columns in family mode */}
                      {clientType === 'family' && displayedPeople.map((person) => {
                        const personName = `${person.forename} ${person.surname}`;
                        const amount = getPersonOwnership(liability, personName);
                        return (
                          <td key={person.id} className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 text-right">
                            {amount > 0 ? formatMoneyWithoutDecimals(amount) : '-'}
                          </td>
                        );
                      })}
                      {/* Only show Joint column if more than one person is displayed and in family mode */}
                      {clientType === 'family' && displayedPeople.length > 1 && (
                        <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 text-right">
                          {getJointOwnership(liability) > 0 ? formatMoneyWithoutDecimals(getJointOwnership(liability)) : '-'}
                        </td>
                      )}
                      <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                        {formatMoneyWithoutDecimals(liability.amount)}
                      </td>
                    </tr>
                  ))}

                  {/* Subsection Total Row */}
                  <tr className="bg-amber-50 font-semibold">
                    <td className="px-2 py-0.5 text-xs text-gray-900 italic">Total {category}</td>
                    {/* Only show person columns in family mode */}
                    {clientType === 'family' && displayedPeople.map((person) => {
                      const personName = `${person.forename} ${person.surname}`;
                      const orderedLiabilities = sortByCustomOrder(categoryLiabilities, 'liability', category);
                      const total = orderedLiabilities.reduce((sum, liability) => sum + getPersonOwnership(liability, personName), 0);
                      return (
                        <td key={person.id} className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900 text-right">
                          {total > 0 ? formatMoneyWithoutDecimals(total) : '-'}
                        </td>
                      );
                    })}
                    {/* Only show Joint column if more than one person is displayed and in family mode */}
                    {clientType === 'family' && displayedPeople.length > 1 && (
                      <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900 text-right">
                        {(() => {
                          const orderedLiabilities = sortByCustomOrder(categoryLiabilities, 'liability', category);
                          return formatMoneyWithoutDecimals(orderedLiabilities.reduce((sum, liability) => sum + getJointOwnership(liability), 0));
                        })()}
                      </td>
                    )}
                    <td className="px-2 py-0.5 whitespace-nowrap text-sm text-gray-900 text-right">
                      {(() => {
                        const orderedLiabilities = sortByCustomOrder(categoryLiabilities, 'liability', category);
                        return formatMoneyWithoutDecimals(orderedLiabilities.reduce((sum, liability) => sum + liability.amount, 0));
                      })()}
                    </td>
                  </tr>
                </React.Fragment>
              ))}

              {/* Grand Total Liabilities Row */}
              <tr className="bg-amber-50 font-bold border-t-2 border-gray-400">
                <td className="px-2 py-1 text-sm text-gray-900">Total Liabilities</td>
                {/* Only show person columns in family mode */}
                {clientType === 'family' && displayedPeople.map((person) => {
                  const personName = `${person.forename} ${person.surname}`;
                  const total = filteredLiabilities.reduce((sum, liability) => sum + getPersonOwnership(liability, personName), 0);
                  return (
                    <td key={person.id} className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatMoneyWithoutDecimals(total)}
                    </td>
                  );
                })}
                {/* Only show Joint column if more than one person is displayed and in family mode */}
                {clientType === 'family' && displayedPeople.length > 1 && (
                  <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatMoneyWithoutDecimals(filteredLiabilities.reduce((sum, liability) => sum + getJointOwnership(liability), 0))}
                  </td>
                )}
                <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 text-right">
                  {formatMoneyWithoutDecimals(totalLiabilities)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Net Worth Summary */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b">
          <h3 className="text-xl font-semibold">Net Worth Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-1 text-left text-xs font-bold text-gray-900 uppercase w-96">Summary</th>
                {/* Only show person columns in family mode */}
                {clientType === 'family' && displayedPeople.map((person) => (
                  <th key={person.id} className="px-2 py-1 text-right text-xs font-bold text-gray-900 uppercase w-32">
                    {person.forename}
                  </th>
                ))}
                {/* Only show Joint column if more than one person is displayed and in family mode */}
                {clientType === 'family' && displayedPeople.length > 1 && (
                  <th className="px-2 py-1 text-right text-xs font-bold text-gray-900 uppercase w-32">Joint</th>
                )}
                <th className="px-2 py-1 text-right text-xs font-bold text-gray-900 uppercase w-32">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Net Worth Row */}
              <tr className="bg-blue-100 font-bold">
                <td className="px-2 py-1 text-sm text-gray-900">Net Worth</td>
                {/* Only show person columns in family mode */}
                {clientType === 'family' && personTotals.map((person, index) => (
                  <td key={index} className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatMoneyWithoutDecimals(person.netWorth)}
                  </td>
                ))}
                {/* Only show Joint column if more than one person is displayed and in family mode */}
                {clientType === 'family' && displayedPeople.length > 1 && (
                  <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatMoneyWithoutDecimals(
                      filteredAssets.reduce((sum, asset) => sum + getJointOwnership(asset), 0) -
                      filteredLiabilities.reduce((sum, liability) => sum + getJointOwnership(liability), 0)
                    )}
                  </td>
                )}
                <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 text-right">
                  {formatMoneyWithoutDecimals(netWorth)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Defined Benefit / Hybrid Pensions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b">
          <h3 className="text-xl font-semibold">Defined Benefit / Hybrid Pensions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-1 text-left text-xs font-bold text-gray-900 uppercase w-96">Scheme Name</th>
                {/* Only show person columns in family mode */}
                {clientType === 'family' && displayedPeople.map((person) => (
                  <th key={person.id} className="px-2 py-1 text-center text-xs font-bold text-gray-900 uppercase w-32">
                    {person.forename}
                  </th>
                ))}
                {/* Add spacer columns for Joint and Total to maintain alignment */}
                {clientType === 'family' && displayedPeople.length > 1 && (
                  <th className="px-2 py-1 w-32"></th>
                )}
                <th className="px-2 py-1 w-32"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentDefinedBenefitPensions.length === 0 ? (
                <tr>
                  <td colSpan={clientType === 'business' ? 1 : displayedPeople.length + (displayedPeople.length > 1 ? 3 : 2)} className="px-2 py-4 text-center text-sm text-gray-500 italic">
                    No defined benefit or hybrid pensions recorded
                  </td>
                </tr>
              ) : (
                currentDefinedBenefitPensions.map((pension) => (
                  <tr key={pension.id} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-2 py-1 text-sm font-medium text-gray-900">
                      {pension.schemeName}
                    </td>
                    {/* Only show person columns in family mode */}
                    {clientType === 'family' && displayedPeople.map((person) => {
                      const personName = `${person.forename} ${person.surname}`;
                      const isMember = pension.members.includes(personName);
                      return (
                        <td key={person.id} className="px-2 py-1 text-center">
                          {isMember && (
                            <CheckIcon className="w-4 h-4 text-green-600 mx-auto" />
                          )}
                        </td>
                      );
                    })}
                    {/* Add spacer cells for Joint and Total columns */}
                    {clientType === 'family' && displayedPeople.length > 1 && (
                      <td className="px-2 py-1"></td>
                    )}
                    <td className="px-2 py-1"></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Children's Assets & Liabilities Table - Only show in family mode if children exist */}
      {clientType === 'family' && children.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b">
            <h3 className="text-xl font-semibold">Children's Assets & Liabilities</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1 text-left text-xs font-bold text-gray-900 uppercase w-96">Asset / Liability</th>
                  {children.map((child) => (
                    <th key={child.id} className="px-2 py-1 text-right text-xs font-bold text-gray-900 uppercase w-32">
                      {child.forename}
                    </th>
                  ))}
                  <th className="px-2 py-1 text-right text-xs font-bold text-gray-900 uppercase w-32">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Children's Assets */}
                {childrenAssets.length > 0 && (
                  <>
                    {childrenAssets.map((asset) => (
                      <tr key={asset.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onAssetClick(asset)}>
                        <td className="px-2 py-1 text-sm font-medium text-gray-900">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            {asset.description}
                          </div>
                        </td>
                        {children.map((child) => {
                          const childName = `${child.forename} ${child.surname}`;
                          const amount = getPersonOwnership(asset, childName);
                          return (
                            <td key={child.id} className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 text-right">
                              {amount > 0 ? formatMoneyWithoutDecimals(amount) : '-'}
                            </td>
                          );
                        })}
                        <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                          {formatMoneyWithoutDecimals(asset.value)}
                        </td>
                      </tr>
                    ))}
                  </>
                )}

                {/* Children's Liabilities */}
                {childrenLiabilities.length > 0 && (
                  <>
                    {childrenLiabilities.map((liability) => (
                      <tr key={liability.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onLiabilityClick(liability)}>
                        <td className="px-2 py-1 text-sm font-medium text-gray-900">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                            {liability.description}
                          </div>
                        </td>
                        {children.map((child) => {
                          const childName = `${child.forename} ${child.surname}`;
                          const amount = getPersonOwnership(liability, childName);
                          return (
                            <td key={child.id} className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 text-right">
                              {amount > 0 ? formatMoneyWithoutDecimals(amount) : '-'}
                            </td>
                          );
                        })}
                        <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                          {formatMoneyWithoutDecimals(liability.amount)}
                        </td>
                      </tr>
                    ))}
                  </>
                )}

                {/* Empty state */}
                {childrenAssets.length === 0 && childrenLiabilities.length === 0 && (
                  <tr>
                    <td colSpan={children.length + 2} className="px-2 py-4 text-center text-sm text-gray-500 italic">
                      No assets or liabilities recorded for children
                    </td>
                  </tr>
                )}

                {/* Net Worth Row */}
                {(childrenAssets.length > 0 || childrenLiabilities.length > 0) && (
                  <tr className="bg-blue-50 font-bold border-t-2 border-gray-400">
                    <td className="px-2 py-1 text-sm text-gray-900">Children's Net Worth</td>
                    {children.map((child) => {
                      const childName = `${child.forename} ${child.surname}`;
                      const childAssetTotal = childrenAssets.reduce((sum, asset) => sum + getPersonOwnership(asset, childName), 0);
                      const childLiabilityTotal = childrenLiabilities.reduce((sum, liability) => sum + getPersonOwnership(liability, childName), 0);
                      const childNet = childAssetTotal - childLiabilityTotal;
                      return (
                        <td key={child.id} className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatMoneyWithoutDecimals(childNet)}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatMoneyWithoutDecimals(childrenNetWorth)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trusteeships Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b">
          <h3 className="text-xl font-semibold">Trusteeships</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-1 text-left text-xs font-bold text-gray-900 uppercase w-96">Trust Name</th>
                <th className="px-2 py-1 text-right text-xs font-bold text-gray-900 uppercase w-32">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentTrusteeships.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-2 py-4 text-center text-sm text-gray-500 italic">
                    No trusteeships recorded
                  </td>
                </tr>
              ) : (
                currentTrusteeships.map((trust) => {
                  const totalValue = Object.values(trust.beneficiaries).reduce((sum, val) => sum + val, 0);
                  return (
                    <tr key={trust.id} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-2 py-1 text-sm font-medium text-gray-900">
                        {trust.trustName}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                        {formatMoneyWithoutDecimals(totalValue)}
                      </td>
                    </tr>
                  );
                })
              )}
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
                                      {formatMoneyWithoutDecimals(asset.value)}
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
                                  className="w-full text-left px-4 py-3 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors"
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900">{liability.description}</div>
                                      <div className="text-base text-gray-900 mt-1">
                                        Type: {liability.type} • Owner: {liability.owner}
                                      </div>
                                    </div>
                                    <div className="text-base font-semibold text-gray-900">
                                      {formatMoneyWithoutDecimals(liability.amount)}
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
