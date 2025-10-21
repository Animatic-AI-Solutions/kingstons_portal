import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserIcon, FlagIcon, DocumentTextIcon, CurrencyPoundIcon, BanknotesIcon, ShieldCheckIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { formatMoney } from '../../utils/formatMoney';
import DynamicPageContainer from '../../components/DynamicPageContainer';

// Import tabs
import SummaryTab from './tabs/SummaryTab';
import BasicDetailsTab from './tabs/BasicDetailsTab';
import AssetsLiabilitiesTab from './tabs/AssetsLiabilitiesTab';
import IncomeExpenditureTab from './tabs/IncomeExpenditureTab';
import OtherProductsTab from './tabs/OtherProductsTab';
import ObjectivesTab from './tabs/ObjectivesTab';

// Import types
import { Person, Asset, SpecialRelationship } from './types';

// Import sample data
import {
  samplePeople,
  sampleRelationships,
  sampleHealthItems,
  sampleVulnerabilities,
  sampleDocuments,
  sampleRiskAssessments,
  sampleCapacityToLoss,
  assignedMeetings,
  meetingInstances,
  clientManagementInfo,
  sampleAssets,
  sampleLiabilities,
  otherClientGroups,
  sampleIncome,
  sampleExpenditure,
  sampleProducts,
  sampleObjectives,
  sampleActions
} from './sampleData';

const ClientGroupPhase2 = () => {
  const navigate = useNavigate();

  // Tab state
  const [activeTab, setActiveTab] = useState('summary');

  // Client order and drag state
  const [clientOrder, setClientOrder] = useState<string[]>(samplePeople.map(p => p.id));
  const [draggedPersonId, setDraggedPersonId] = useState<string | null>(null);

  // Modal state
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showProductInfoPopup, setShowProductInfoPopup] = useState(false);
  const [selectedProductAsset, setSelectedProductAsset] = useState<Asset | null>(null);

  // Main tabs configuration
  const mainTabs = [
    { id: 'summary', label: 'Summary', icon: UserIcon },
    { id: 'objectives', label: 'Aims & Objectives', icon: FlagIcon },
    { id: 'basic', label: 'Basic Details', icon: DocumentTextIcon },
    { id: 'assets', label: 'Assets & Liabilities', icon: CurrencyPoundIcon },
    { id: 'income', label: 'Income & Expenditure', icon: BanknotesIcon },
    { id: 'products', label: 'Other Products', icon: ShieldCheckIcon },
  ];

  // Helper functions
  const isPerson = (item: any): item is Person => {
    return item && 'forename' in item && 'surname' in item && 'niNumber' in item;
  };

  const canBeDeactivated = (item: any): boolean => {
    // Check if item has a status field and is currently Active
    return item && 'status' in item && (item.status === 'Active' || item.status === 'Current');
  };

  const canBeReactivated = (item: any): boolean => {
    // Check if item has a status field and is currently Historical
    return item && 'status' in item && (item.status === 'Historical');
  };

  // Event handlers
  const handleItemClick = (item: any) => {
    // Check if the item is an Asset and if it's a product
    if ('value' in item && item.isProduct) {
      // Show product info popup for assets that are products
      setSelectedProductAsset(item);
      setShowProductInfoPopup(true);
    } else {
      // Show edit popup for regular assets or liabilities
      setSelectedItem(item);
    }
  };

  const closeDetail = () => {
    setSelectedItem(null);
  };

  const handleSave = () => {
    // TODO: Implement save logic here
    console.log('Saving changes:', selectedItem);
    setSelectedItem(null);
  };

  const handleToggleStatus = () => {
    if (!selectedItem || !('status' in selectedItem)) return;

    // Toggle status between Active/Current and Historical
    const newStatus = (selectedItem.status === 'Active' || selectedItem.status === 'Current')
      ? 'Historical'
      : (selectedItem.status === 'Historical' && 'Current' in selectedItem) ? 'Current' : 'Active';

    setSelectedItem({
      ...selectedItem,
      status: newStatus
    });

    console.log(`Toggled status for ${selectedItem.id} to ${newStatus}`);
  };

  // Client order drag and drop handlers
  const handleDragStart = (personId: string) => {
    setDraggedPersonId(personId);
  };

  const handleDragOver = (e: React.DragEvent, targetPersonId: string) => {
    e.preventDefault();

    if (!draggedPersonId || draggedPersonId === targetPersonId) return;

    const draggedIndex = clientOrder.indexOf(draggedPersonId);
    const targetIndex = clientOrder.indexOf(targetPersonId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newOrder = [...clientOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedPersonId);
    setClientOrder(newOrder);
  };

  const handleDragEnd = () => {
    setDraggedPersonId(null);
  };

  // Render person detail view
  const renderPersonDetail = (person: Person) => {
    const fullName = `${person.title} ${person.forename} ${person.middleNames} ${person.surname}`.trim();

    const handleTextareaResize = (e: React.FormEvent<HTMLTextAreaElement>) => {
      const textarea = e.currentTarget;
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    };

    const renderField = (label: string, value: string | number | string[], fullWidth = false) => (
      <div className={`flex items-start py-1.5 px-2 hover:bg-gray-50 border-b border-gray-100 ${fullWidth ? 'col-span-2' : ''}`}>
        <label className="text-sm font-bold text-gray-900 w-36 flex-shrink-0 pt-0.5">{label}:</label>
        {Array.isArray(value) ? (
          <textarea
            defaultValue={value.join(', ')}
            onInput={handleTextareaResize}
            ref={(el) => {
              if (el) {
                el.style.height = 'auto';
                el.style.height = el.scrollHeight + 'px';
              }
            }}
            className="flex-1 px-2 py-0.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500 resize-none overflow-hidden"
          />
        ) : (
          <textarea
            defaultValue={String(value)}
            onInput={handleTextareaResize}
            ref={(el) => {
              if (el) {
                el.style.height = 'auto';
                el.style.height = el.scrollHeight + 'px';
              }
            }}
            className="flex-1 px-2 py-0.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500 resize-none overflow-hidden"
          />
        )}
      </div>
    );

    return (
      <>
        {/* Header with icon and name - Compact */}
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
          <div className="p-2 rounded-full bg-primary-100">
            <UserIcon className="h-5 w-5 text-primary-700" />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-gray-900">{fullName}</h4>
            <p className="text-sm text-gray-900">{person.relationship} • Known as: {person.knownAs}</p>
          </div>
        </div>

        {/* Personal Details Section - Matching Summary Card Layout */}
        <div className="mb-2">
          <h5 className="text-sm font-semibold text-gray-900 uppercase mb-2 flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
            <UserIcon className="w-3 h-3" />
            Personal Details
          </h5>
          <div className="border border-gray-200 rounded bg-white p-3 space-y-2">
            {/* First Grid - Name fields and Previous Names/Status/Place of Birth */}
            <div className="grid grid-cols-2 gap-x-3 text-sm">
              <div className="space-y-2">
                <div>
                  <label className="block font-bold text-blue-600 mb-0.5">Title</label>
                  <input
                    type="text"
                    defaultValue={person.title}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-blue-600 mb-0.5">Forename</label>
                  <input
                    type="text"
                    defaultValue={person.forename}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-blue-600 mb-0.5">Middle Names</label>
                  <input
                    type="text"
                    defaultValue={person.middleNames}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-blue-600 mb-0.5">Surname</label>
                  <input
                    type="text"
                    defaultValue={person.surname}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-blue-600 mb-0.5">Known As</label>
                  <input
                    type="text"
                    defaultValue={person.knownAs}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-blue-600 mb-0.5">Gender</label>
                  <input
                    type="text"
                    defaultValue={person.gender}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-blue-600 mb-0.5">DOB</label>
                  <input
                    type="text"
                    defaultValue={person.dateOfBirth}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-blue-600 mb-0.5">Age</label>
                  <input
                    type="number"
                    defaultValue={person.age}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="block font-bold text-blue-600 mb-0.5">Previous Names</label>
                  <input
                    type="text"
                    defaultValue={person.previousNames}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-blue-600 mb-0.5">Status</label>
                  <input
                    type="text"
                    defaultValue={person.relationshipStatus}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-blue-600 mb-0.5">Place of Birth</label>
                  <input
                    type="text"
                    defaultValue={person.placeOfBirth}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div className="pt-1 space-y-2">
              <div>
                <label className="block text-sm font-bold text-blue-600 mb-0.5">Address Line 1</label>
                <input
                  type="text"
                  defaultValue={person.addressLine1}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-blue-600 mb-0.5">Address Line 2</label>
                <input
                  type="text"
                  defaultValue={person.addressLine2}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-blue-600 mb-0.5">Address Line 3</label>
                <input
                  type="text"
                  defaultValue={person.addressLine3}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-blue-600 mb-0.5">Address Line 4</label>
                <input
                  type="text"
                  defaultValue={person.addressLine4}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-blue-600 mb-0.5">Address Line 5</label>
                <input
                  type="text"
                  defaultValue={person.addressLine5}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-blue-600 mb-0.5">Postcode</label>
                <input
                  type="text"
                  defaultValue={person.postcode}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-blue-600 mb-0.5">Moved in</label>
                <input
                  type="text"
                  defaultValue={person.dateMovedIn}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            {/* Contact Section */}
            <div className="pt-1 space-y-2 text-sm">
              <div>
                <label className="block font-bold text-blue-600 mb-0.5">Primary Email</label>
                <input
                  type="email"
                  defaultValue={person.primaryEmail}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block font-bold text-blue-600 mb-0.5">Secondary Email</label>
                <input
                  type="email"
                  defaultValue={person.secondaryEmail}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block font-bold text-blue-600 mb-0.5">Primary Phone</label>
                <input
                  type="tel"
                  defaultValue={person.primaryPhone}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block font-bold text-blue-600 mb-0.5">Secondary Phone</label>
                <input
                  type="tel"
                  defaultValue={person.secondaryPhone}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            {/* Employment/Security Section */}
            <div className="grid grid-cols-2 gap-x-3 text-sm pt-3">
              <div>
                <div className="space-y-2">
                  <div>
                    <label className="block font-bold text-blue-600 mb-0.5">Employment Status</label>
                    <input
                      type="text"
                      defaultValue={person.employmentStatus}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-blue-600 mb-0.5">Occupation</label>
                    <input
                      type="text"
                      defaultValue={person.occupation}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-blue-600 mb-0.5">NI Number</label>
                    <input
                      type="text"
                      defaultValue={person.niNumber}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
                <div className="space-y-2 mt-3">
                  <div>
                    <label className="block font-bold text-blue-600 mb-0.5">3 words</label>
                    <input
                      type="text"
                      defaultValue={person.safeWords.join(', ')}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-blue-600 mb-0.5">Share Data With</label>
                    <input
                      type="text"
                      defaultValue={person.shareDataWith}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="block font-bold text-blue-600 mb-0.5">Passport</label>
                  <input
                    type="text"
                    defaultValue={person.passportExpiry}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-blue-600 mb-0.5">AML Result</label>
                  <input
                    type="text"
                    defaultValue={person.amlResult}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-blue-600 mb-0.5">AML Date</label>
                  <input
                    type="text"
                    defaultValue={person.amlDate}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div className="mb-2">
          <h5 className="text-sm font-semibold text-gray-900 uppercase mb-2 flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
            Notes
          </h5>
          <div className="border border-gray-200 rounded bg-white p-2">
            <textarea
              defaultValue={person.notes}
              rows={3}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500 resize-none"
              placeholder="Additional information or context..."
            />
          </div>
        </div>
      </>
    );
  };

  // Render Generic Detail View - Compact table-like style
  const renderGenericDetail = () => {
    const entries = Object.entries(selectedItem);
    const regularFields = entries.filter(([key]) => key !== 'id' && key !== 'notes');
    const notesField = entries.find(([key]) => key === 'notes');

    const isSpecialRelationship = 'relationship' in selectedItem && 'dateOfBirth' in selectedItem && 'contactDetails' in selectedItem;
    const peopleNames = samplePeople.map(p => `${p.title} ${p.forename} ${p.surname}`.trim());

    const handleTextareaResize = (e: React.FormEvent<HTMLTextAreaElement>) => {
      const textarea = e.currentTarget;
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    };

    const renderFieldInput = (key: string, value: any) => {
      const label = key.replace(/([A-Z])/g, ' $1').trim();
      const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);

      // Special handling for special relationship fields
      if (isSpecialRelationship) {
        // Professional relationships - multi-select for dependency
        if (key === 'dependency' && Array.isArray(value)) {
          return (
            <div key={key} className="flex items-start py-1.5 px-2 hover:bg-gray-50 border-b border-gray-100">
              <label className="text-sm font-bold text-gray-900 w-36 flex-shrink-0 pt-0.5">{capitalizedLabel}:</label>
              <select
                multiple
                defaultValue={value}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                size={Math.min(peopleNames.length, 5)}
              >
                {peopleNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          );
        }

        // Personal relationships - multi-select for associatedPerson
        if (key === 'associatedPerson' && Array.isArray(value)) {
          return (
            <div key={key} className="flex items-start py-1.5 px-2 hover:bg-gray-50 border-b border-gray-100">
              <label className="text-sm font-bold text-gray-900 w-36 flex-shrink-0 pt-0.5">{capitalizedLabel}:</label>
              <select
                multiple
                defaultValue={value}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                size={Math.min(peopleNames.length, 5)}
              >
                {peopleNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          );
        }
      }

      // Default rendering for other fields
      return (
        <div key={key} className="flex items-start py-1.5 px-2 hover:bg-gray-50 border-b border-gray-100">
          <label className="text-sm font-bold text-gray-900 w-36 flex-shrink-0 pt-0.5">{capitalizedLabel}:</label>
          {Array.isArray(value) ? (
            <textarea
              defaultValue={value.join(', ')}
              onInput={handleTextareaResize}
              ref={(el) => {
                if (el) {
                  el.style.height = 'auto';
                  el.style.height = el.scrollHeight + 'px';
                }
              }}
              className="flex-1 px-2 py-0.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500 resize-none overflow-hidden"
            />
          ) : (
            <textarea
              defaultValue={String(value)}
              onInput={handleTextareaResize}
              ref={(el) => {
                if (el) {
                  el.style.height = 'auto';
                  el.style.height = el.scrollHeight + 'px';
                }
              }}
              className="flex-1 px-2 py-0.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500 resize-none overflow-hidden"
            />
          )}
        </div>
      );
    };

    return (
      <>
        <div className="grid grid-cols-2 divide-x divide-gray-200 border border-gray-200 rounded bg-white">
          {regularFields.map(([key, value]) => renderFieldInput(key, value))}
        </div>

        {/* Notes Section */}
        {notesField && (
          <div className="mt-2">
            <h5 className="text-sm font-semibold text-gray-900 uppercase mb-2 flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
              Notes
            </h5>
            <div className="border border-gray-200 rounded bg-white p-2">
              <textarea
                defaultValue={String(notesField[1])}
                onInput={handleTextareaResize}
                ref={(el) => {
                  if (el) {
                    el.style.height = 'auto';
                    el.style.height = el.scrollHeight + 'px';
                  }
                }}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500 resize-none overflow-hidden min-h-[4rem]"
                placeholder="Additional information or context..."
              />
            </div>
          </div>
        )}
      </>
    );
  };

  // Render product info popup
  const renderProductInfoPopup = () => {
    if (!showProductInfoPopup || !selectedProductAsset) return null;

    const handleNavigateToProduct = () => {
      // Navigate to product details page
      navigate(`/products/${selectedProductAsset.productId}`);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-3 py-2 rounded-t-lg">
            <h3 className="text-2xl font-semibold text-white">
              {selectedProductAsset.description}
            </h3>
            <p className="text-primary-100 text-base mt-1">Product Asset - IRR System Integration</p>
          </div>

          {/* Body */}
          <div className="p-6">
            <div className="mb-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-3 rounded-full bg-blue-100">
                  <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">
                    IRR System Integration
                  </h4>
                  <p className="text-gray-900 leading-relaxed">
                    This asset is linked to a product in the IRR (Internal Rate of Return) system.
                    You can manage valuations and track performance over time through the product details page.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h5 className="font-semibold text-blue-900 mb-2">What you can do:</h5>
                <ul className="space-y-2 text-base text-blue-800">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span><strong>Manually record valuations</strong> - Add new valuation entries to track asset value changes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span><strong>Manage IRR calculations</strong> - View historical performance and IRR metrics</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span><strong>View product details</strong> - Access full product information and history</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-2">
                <h5 className="text-sm font-semibold text-gray-900 uppercase mb-2 px-2">Asset Summary</h5>
                <div className="grid grid-cols-2 divide-x divide-gray-200 border border-gray-200 rounded bg-white">
                  <div className="flex items-start py-1.5 px-2 hover:bg-gray-50 border-b border-gray-100">
                    <label className="text-sm font-bold text-gray-900 w-32 flex-shrink-0 pt-0.5">Type:</label>
                    <span className="text-gray-900 text-sm flex-1 break-words">{selectedProductAsset.type}</span>
                  </div>
                  <div className="flex items-start py-1.5 px-2 hover:bg-gray-50 border-b border-gray-100">
                    <label className="text-sm font-bold text-gray-900 w-32 flex-shrink-0 pt-0.5">Current Value:</label>
                    <span className="text-gray-900 text-sm flex-1 break-words">{formatMoney(selectedProductAsset.value)}</span>
                  </div>
                  <div className="flex items-start py-1.5 px-2 hover:bg-gray-50">
                    <label className="text-sm font-bold text-gray-900 w-32 flex-shrink-0 pt-0.5">Owner:</label>
                    <span className="text-gray-900 text-sm flex-1 break-words">{selectedProductAsset.owner}</span>
                  </div>
                  <div className="flex items-start py-1.5 px-2 hover:bg-gray-50">
                    <label className="text-sm font-bold text-gray-900 w-32 flex-shrink-0 pt-0.5">Product ID:</label>
                    <span className="text-gray-900 text-sm flex-1 font-mono break-words">{selectedProductAsset.productId}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-3 py-2 rounded-b-lg flex items-center justify-end gap-3">
            <button
              onClick={() => {
                setShowProductInfoPopup(false);
                setSelectedProductAsset(null);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Close
            </button>
            <button
              onClick={handleNavigateToProduct}
              className="px-6 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors font-medium shadow-sm"
            >
              Go to Product Details →
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render detail modal
  const renderDetailModal = () => {
    if (!selectedItem) return null;

    const isPersonDetail = isPerson(selectedItem);
    const showDeactivateButton = canBeDeactivated(selectedItem);
    const showReactivateButton = canBeReactivated(selectedItem);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto border border-gray-200">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-3 py-1.5 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              {isPersonDetail ? 'Person Details' : 'Details'}
            </h3>
            <div className="flex items-center gap-1.5">
              {showDeactivateButton && (
                <button
                  onClick={handleToggleStatus}
                  className="flex items-center gap-1 px-2 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                  title="Mark as historical"
                >
                  <span>Deactivate</span>
                </button>
              )}
              {showReactivateButton && (
                <button
                  onClick={handleToggleStatus}
                  className="flex items-center gap-1 px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  title="Mark as active"
                >
                  <span>Reactivate</span>
                </button>
              )}
              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-2 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                <CheckIcon className="w-3 h-3" />
                <span>Save</span>
              </button>
              <button onClick={closeDetail} className="text-gray-900 hover:text-gray-900 transition-colors p-0.5">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-3">
            {isPersonDetail ? renderPersonDetail(selectedItem as Person) : renderGenericDetail()}
          </div>
        </div>
      </div>
    );
  };

  // Render main content based on active tab
  const renderMainContent = () => {
    switch (activeTab) {
      case 'summary':
        return (
          <SummaryTab
            people={samplePeople}
            clientOrder={clientOrder}
            draggedPersonId={draggedPersonId}
            onPersonClick={handleItemClick}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          />
        );
      case 'basic':
        return (
          <BasicDetailsTab
            people={samplePeople}
            clientOrder={clientOrder}
            relationships={sampleRelationships}
            healthItems={sampleHealthItems}
            vulnerabilities={sampleVulnerabilities}
            documents={sampleDocuments}
            riskAssessments={sampleRiskAssessments}
            capacityToLoss={sampleCapacityToLoss}
            assignedMeetings={assignedMeetings}
            meetingInstances={meetingInstances}
            clientManagementInfo={clientManagementInfo}
            onPersonClick={handleItemClick}
            onRelationshipClick={handleItemClick}
            onHealthVulnerabilityClick={handleItemClick}
            onDocumentClick={handleItemClick}
            onRiskAssessmentClick={handleItemClick}
            onCapacityToLossClick={handleItemClick}
            onAssignedMeetingClick={handleItemClick}
            onMeetingInstanceClick={handleItemClick}
          />
        );
      case 'assets':
        return (
          <AssetsLiabilitiesTab
            people={samplePeople}
            clientOrder={clientOrder}
            assets={sampleAssets}
            liabilities={sampleLiabilities}
            otherClientGroups={otherClientGroups}
            onAssetClick={handleItemClick}
            onLiabilityClick={handleItemClick}
          />
        );
      case 'income':
        return (
          <IncomeExpenditureTab
            income={sampleIncome}
            expenditure={sampleExpenditure}
            onIncomeClick={handleItemClick}
            onExpenditureClick={handleItemClick}
          />
        );
      case 'products':
        return (
          <OtherProductsTab
            products={sampleProducts}
            onProductClick={handleItemClick}
          />
        );
      case 'objectives':
        return (
          <ObjectivesTab
            objectives={sampleObjectives}
            actions={sampleActions}
            onObjectiveClick={handleItemClick}
            onActionClick={handleItemClick}
          />
        );
      default:
        return null;
    }
  };

  return (
    <DynamicPageContainer maxWidth="2000px" className="py-3">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-4xl font-normal text-gray-900 font-sans tracking-wide">Mitchell Family</h1>
        <p className="text-gray-900 mt-1 text-base">Client Group Management - Phase 2 Prototype</p>
      </div>

      {/* Horizontal Main Tabs */}
      <div className="mb-6">
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
            {mainTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-900 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-base font-medium whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pb-8">
        {renderMainContent()}
      </div>

      {/* Product Info Popup */}
      {renderProductInfoPopup()}

      {/* Detail Modal */}
      {renderDetailModal()}
    </DynamicPageContainer>
  );
};

export default ClientGroupPhase2;
