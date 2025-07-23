// =============================================================================
// FRONTEND COMPONENTS: Advisor Display and Selection
// =============================================================================
// These components support the new advisor relationships in the UI

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// =============================================================================
// TYPESCRIPT INTERFACES
// =============================================================================

interface AdvisorInfo {
  advisor_id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  client_groups_count: number;
  total_products_count: number;
}

interface ClientGroup {
  id: number;
  name: string;
  type?: string;
  status?: string;
  created_at: string;
  
  // New advisor relationship fields
  advisor_id?: number;
  advisor_name?: string;
  advisor_email?: string;
  advisor_first_name?: string;
  advisor_last_name?: string;
  advisor_assignment_status?: 'HAS_ADVISOR' | 'LEGACY_ADVISOR_ONLY' | 'NO_ADVISOR';
  
  // Legacy field for backward compatibility
  advisor?: string;
}

// =============================================================================
// ADVISOR DISPLAY COMPONENT (Priority 2.3)
// =============================================================================
// File: frontend/src/components/ui/AdvisorDisplay.tsx

interface AdvisorDisplayProps {
  advisorName?: string;
  advisorEmail?: string;
  legacyAdvisor?: string;
  showEmail?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const AdvisorDisplay: React.FC<AdvisorDisplayProps> = ({
  advisorName,
  advisorEmail,
  legacyAdvisor,
  showEmail = true,
  className = '',
  size = 'md'
}) => {
  // Size-based styling
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };
  
  const emailSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm', 
    lg: 'text-base'
  };

  // Display current advisor (from profile)
  if (advisorName) {
    return (
      <div className={`${sizeClasses[size]} ${className}`}>
        <span className="font-medium text-gray-900">
          {advisorName}
        </span>
        {showEmail && advisorEmail && (
          <span className={`ml-2 ${emailSizeClasses[size]} text-gray-500`}>
            ({advisorEmail})
          </span>
        )}
        <span className="ml-1 text-xs text-green-600 bg-green-50 px-1 rounded">
          ✓
        </span>
      </div>
    );
  }
  
  // Display legacy advisor (transition period)
  if (legacyAdvisor) {
    return (
      <div className={`${sizeClasses[size]} ${className}`}>
        <span className="text-gray-700">
          {legacyAdvisor}
        </span>
        <span className="ml-1 text-xs text-yellow-600 bg-yellow-50 px-1 rounded">
          Legacy
        </span>
      </div>
    );
  }
  
  // No advisor assigned
  return (
    <span className={`${sizeClasses[size]} text-gray-400 italic ${className}`}>
      No Advisor
    </span>
  );
};

// =============================================================================
// ADVISOR SELECT COMPONENT (Priority 3.1)
// =============================================================================
// File: frontend/src/components/ui/AdvisorSelect.tsx

interface AdvisorSelectProps {
  value?: number;
  onChange: (advisorId: number | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  className?: string;
}

export const AdvisorSelect: React.FC<AdvisorSelectProps> = ({
  value,
  onChange,
  placeholder = "Select advisor...",
  allowClear = true,
  disabled = false,
  className = ''
}) => {
  // Fetch available advisors
  const { data: advisors, isLoading, error } = useQuery<AdvisorInfo[]>({
    queryKey: ['advisors'],
    queryFn: fetchAvailableAdvisors,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (error) {
    return (
      <div className="text-red-600 text-sm">
        Error loading advisors
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <select
        value={value || ''}
        onChange={(e) => {
          const selectedValue = e.target.value;
          onChange(selectedValue ? parseInt(selectedValue) : null);
        }}
        disabled={disabled || isLoading}
        className={`
          w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${disabled || isLoading ? 'bg-gray-100' : 'bg-white'}
        `}
      >
        <option value="">
          {isLoading ? 'Loading advisors...' : placeholder}
        </option>
        
        {advisors?.map((advisor) => (
          <option key={advisor.advisor_id} value={advisor.advisor_id}>
            {advisor.full_name} ({advisor.email}) - {advisor.client_groups_count} clients
          </option>
        ))}
        
        {allowClear && value && (
          <option value="">Clear Selection</option>
        )}
      </select>
      
      {isLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// ADVISOR ASSIGNMENT COMPONENT (Priority 3.3)
// =============================================================================
// File: frontend/src/components/ui/AdvisorAssignment.tsx

interface AdvisorAssignmentProps {
  clientGroupId: number;
  currentAdvisorId?: number;
  currentAdvisorName?: string;
  currentAdvisorEmail?: string;
  onAssignmentChange?: (newAdvisorId: number | null) => void;
}

export const AdvisorAssignment: React.FC<AdvisorAssignmentProps> = ({
  clientGroupId,
  currentAdvisorId,
  currentAdvisorName,
  currentAdvisorEmail,
  onAssignmentChange
}) => {
  const queryClient = useQueryClient();
  
  // Mutation for advisor assignment
  const assignAdvisorMutation = useMutation({
    mutationFn: ({ clientGroupId, advisorId }: { clientGroupId: number; advisorId: number | null }) =>
      assignAdvisor(clientGroupId, advisorId),
    onSuccess: (updatedClient) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ['client_groups'] });
      queryClient.invalidateQueries({ queryKey: ['advisor_summary'] });
      
      // Call callback if provided
      onAssignmentChange?.(updatedClient.advisor_id);
    },
    onError: (error) => {
      console.error('Failed to assign advisor:', error);
      // Show error notification (implement based on your notification system)
    }
  });

  const handleAdvisorChange = (newAdvisorId: number | null) => {
    assignAdvisorMutation.mutate({
      clientGroupId,
      advisorId: newAdvisorId
    });
  };

  return (
    <div className="space-y-3">
      {/* Current advisor display */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Current Advisor
        </label>
        <AdvisorDisplay
          advisorName={currentAdvisorName}
          advisorEmail={currentAdvisorEmail}
          className="p-2 bg-gray-50 rounded"
        />
      </div>

      {/* Advisor selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Assign New Advisor
        </label>
        <AdvisorSelect
          value={currentAdvisorId}
          onChange={handleAdvisorChange}
          disabled={assignAdvisorMutation.isPending}
          placeholder={
            assignAdvisorMutation.isPending 
              ? "Updating..." 
              : "Select advisor..."
          }
        />
      </div>

      {/* Status indicator */}
      {assignAdvisorMutation.isPending && (
        <div className="text-sm text-blue-600 flex items-center">
          <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-500 border-t-transparent mr-2"></div>
          Updating advisor assignment...
        </div>
      )}

      {assignAdvisorMutation.isError && (
        <div className="text-sm text-red-600">
          Failed to update advisor assignment. Please try again.
        </div>
      )}
    </div>
  );
};

// =============================================================================
// ENHANCED CLIENT CARD COMPONENT (Priority 2.2)
// =============================================================================
// File: frontend/src/components/ui/ClientCard.tsx

interface ClientCardProps {
  client: ClientGroup;
  showAdvisorAssignment?: boolean;
  onClientClick?: (clientId: number) => void;
}

export const ClientCard: React.FC<ClientCardProps> = ({
  client,
  showAdvisorAssignment = false,
  onClientClick
}) => {
  return (
    <div 
      className="bg-white rounded-lg shadow border p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClientClick?.(client.id)}
    >
      {/* Client header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
          <p className="text-sm text-gray-600">{client.type}</p>
        </div>
        <span className={`
          px-2 py-1 text-xs rounded-full
          ${client.status === 'active' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
          }
        `}>
          {client.status}
        </span>
      </div>

      {/* Advisor information */}
      <div className="border-t pt-3">
        <div className="flex justify-between items-center">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Advisor
            </label>
            <div className="mt-1">
              <AdvisorDisplay
                advisorName={client.advisor_name}
                advisorEmail={client.advisor_email}
                legacyAdvisor={client.advisor}
                size="sm"
              />
            </div>
          </div>
          
          {showAdvisorAssignment && (
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click
                // Open advisor assignment modal/dropdown
              }}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// API FUNCTIONS (Priority 3.2)
// =============================================================================
// File: frontend/src/services/advisorApi.ts

export const fetchAvailableAdvisors = async (): Promise<AdvisorInfo[]> => {
  const response = await fetch('/api/client_groups/advisors', {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`, // Implement based on your auth system
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch advisors');
  }
  
  return response.json();
};

export const assignAdvisor = async (
  clientGroupId: number, 
  advisorId: number | null
): Promise<ClientGroup> => {
  const response = await fetch(`/api/client_groups/${clientGroupId}/advisor`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ advisor_id: advisorId }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to assign advisor');
  }
  
  return response.json();
};

export const fetchAdvisorSummary = async (): Promise<AdvisorSummary[]> => {
  const response = await fetch('/api/client_groups/advisor-summary', {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch advisor summary');
  }
  
  return response.json();
};

// Implement based on your authentication system
const getAuthToken = (): string => {
  // Return your JWT token
  return localStorage.getItem('authToken') || '';
};

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

/*
// Example 1: Display advisor in client listing
<AdvisorDisplay
  advisorName={client.advisor_name}
  advisorEmail={client.advisor_email}
  legacyAdvisor={client.advisor}
  showEmail={true}
  size="md"
/>

// Example 2: Advisor selection in form
<AdvisorSelect
  value={selectedAdvisorId}
  onChange={setSelectedAdvisorId}
  placeholder="Choose advisor..."
  allowClear={true}
/>

// Example 3: Full advisor assignment component
<AdvisorAssignment
  clientGroupId={client.id}
  currentAdvisorId={client.advisor_id}
  currentAdvisorName={client.advisor_name}
  currentAdvisorEmail={client.advisor_email}
  onAssignmentChange={(newId) => console.log('Advisor changed to:', newId)}
/>

// Example 4: Enhanced client card
<ClientCard
  client={clientData}
  showAdvisorAssignment={true}
  onClientClick={(id) => navigate(`/clients/${id}`)}
/>
*/ 