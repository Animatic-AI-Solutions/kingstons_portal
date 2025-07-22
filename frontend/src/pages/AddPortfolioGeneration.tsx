import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DynamicPageContainer from '../components/DynamicPageContainer';
import { findCashFund, isCashFund } from '../utils/fundUtils';
import FundSelectionManager from '../components/generation/FundSelectionManager';
import { DateInput, BaseInput } from '../components/ui';

interface Fund {
  id: number;
  fund_name: string;
  isin_number?: string;
  risk_factor?: number;
  fund_cost?: number;
  status: string;
  created_at?: string;
}

interface GenerationFormData {
  generation_name: string;
  description: string;
  created_at: string; // ISO date string for backlogged generations
}

interface PortfolioFund {
  fund_id: number;
  target_weighting: number;
}

interface PortfolioTemplate {
  id: number;
  name: string;
  created_at: string;
}

const AddPortfolioGeneration: React.FC = () => {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const navigate = useNavigate();
  const { api } = useAuth();
  
  const [formData, setFormData] = useState<GenerationFormData>({
    generation_name: '',
    description: '',
    created_at: '' // Initialize created_at to empty string
  });
  
  const [portfolio, setPortfolio] = useState<PortfolioTemplate | null>(null);
  const [availableFunds, setAvailableFunds] = useState<Fund[]>([]);
  const [selectedFunds, setSelectedFunds] = useState<number[]>([]);
  const [fundWeightings, setFundWeightings] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingFunds, setIsLoadingFunds] = useState(false);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(true);
  const [fundSearchTerm, setFundSearchTerm] = useState('');
  const [latestGenerationId, setLatestGenerationId] = useState<number | null>(null);
  const [isLoadingLatestFunds, setIsLoadingLatestFunds] = useState(false);
  const [hasUserModifiedFunds, setHasUserModifiedFunds] = useState(false);

  useEffect(() => {
    if (portfolioId) {
      fetchPortfolioDetails();
      fetchAllFunds();
    }
  }, [portfolioId]);

  useEffect(() => {
    // When both availableFunds and latestGenerationId are available, fetch the funds from that generation
    // BUT only if the user hasn't made any modifications yet
    if (latestGenerationId && availableFunds.length > 0 && !hasUserModifiedFunds) {
      fetchLatestGenerationFunds(latestGenerationId);
    }
  }, [latestGenerationId, availableFunds, hasUserModifiedFunds]);

  // Separate effect to handle fallback cash fund selection when no latest generation exists
  useEffect(() => {
    // Only auto-select cash fund if:
    // 1. We have available funds
    // 2. We confirmed there's no latest generation (latestGenerationId is explicitly null, not undefined)
    // 3. No funds are currently selected
    // 4. We're not currently loading latest funds
    // 5. User hasn't made modifications
    if (availableFunds.length > 0 && latestGenerationId === null && selectedFunds.length === 0 && !isLoadingLatestFunds && !hasUserModifiedFunds) {
      const cashFund = findCashFund(availableFunds);
      if (cashFund) {
        setSelectedFunds([cashFund.id]);
        setFundWeightings({
          [cashFund.id.toString()]: '0'
        });
      }
    }
  }, [availableFunds, latestGenerationId, selectedFunds, isLoadingLatestFunds, hasUserModifiedFunds]);

  const fetchPortfolioDetails = async () => {
    try {
      setIsLoadingPortfolio(true);
      const response = await api.get(`/available_portfolios/${portfolioId}`);
      setPortfolio(response.data);
      
      // Fetch the most recent generation for this portfolio
      const generationsResponse = await api.get(`/available_portfolios/${portfolioId}/generations`);
      if (generationsResponse.data && generationsResponse.data.length > 0) {
        // The API returns generations ordered by created_at desc, so first one is the latest
        const latestGeneration = generationsResponse.data[0];
        setLatestGenerationId(latestGeneration.id);
      } else {
        // Explicitly set to null if no generations exist (first generation)
        setLatestGenerationId(null);
      }
      
    } catch (err: any) {
      console.error('Error fetching portfolio details:', err);
      setError('Failed to fetch portfolio template details');
    } finally {
      setIsLoadingPortfolio(false);
    }
  };

  const fetchAllFunds = async () => {
    try {
      setIsLoadingFunds(true);
      const response = await api.get('/funds', {
        params: { status: 'active' }
      });
      // Sort funds alphabetically by fund_name
      const sortedFunds = response.data.sort((a: Fund, b: Fund) => 
        a.fund_name.localeCompare(b.fund_name)
      );
      setAvailableFunds(sortedFunds);
      
      // Don't automatically select cash fund here - let the latest generation's funds take precedence
      // The latest generation funds will be loaded by the useEffect that depends on availableFunds
      
    } catch (err: any) {
      setError('Failed to fetch funds');
      console.error('Error fetching funds:', err);
    } finally {
      setIsLoadingFunds(false);
    }
  };

  const fetchLatestGenerationFunds = async (generationId: number) => {
    try {
      setIsLoadingLatestFunds(true);
      const response = await api.get(`/available_portfolios/available_portfolio_funds/generation/${generationId}`);
      
      if (response.data && response.data.length > 0) {
        // Process the funds to pre-populate selection and weightings
        const fundIds = response.data.map((fund: any) => fund.fund_id);
        const weightings: Record<string, string> = {};
        
        response.data.forEach((fund: any) => {
          weightings[fund.fund_id.toString()] = fund.target_weighting.toString();
        });
        
        // Ensure cash fund is always included
        const cashFund = findCashFund(availableFunds);
        if (cashFund && !fundIds.includes(cashFund.id)) {
          fundIds.push(cashFund.id);
          weightings[cashFund.id.toString()] = '0';
        }
        
        setSelectedFunds(fundIds);
        setFundWeightings(weightings);
      }
    } catch (err: any) {
      console.error('Error fetching latest generation funds:', err);
      setError('Failed to load funds from latest generation');
    } finally {
      setIsLoadingLatestFunds(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // Clear errors when user makes changes
    if (error) {
      setError(null);
    }
    
    // Real-time date validation
    if (name === 'created_at') {
      if (value.trim()) {
        const dateValidationResult = validateCreationDate(value);
        if (!dateValidationResult.isValid) {
          setDateError(dateValidationResult.error);
        } else {
          setDateError(null);
        }
      } else {
        setDateError(null); // Clear error if date is empty (valid)
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFundSelection = (fundId: number) => {
    const fund = availableFunds.find(f => f.id === fundId);
    
    // Prevent deselection of cash fund
    if (fund && isCashFund(fund) && selectedFunds.includes(fundId)) {
      // Show a brief message or just ignore the action
      return;
    }
    
    // Clear errors when user makes changes
    if (error) {
      setError(null);
    }
    
    // Mark that user has modified funds
    setHasUserModifiedFunds(true);
    
    setSelectedFunds(prev => {
      if (prev.includes(fundId)) {
        const newSelected = prev.filter(id => id !== fundId);
        // Remove weighting for unselected fund
        const newWeightings = { ...fundWeightings };
        delete newWeightings[fundId.toString()];
        setFundWeightings(newWeightings);
        return newSelected;
      } else {
        // Set empty weighting for newly selected fund
        setFundWeightings(prev => ({
          ...prev,
          [fundId.toString()]: ''
        }));
        return [...prev, fundId];
      }
    });
  };

  const handleWeightingChange = (fundId: number, weighting: string) => {
    // Clear errors when user makes changes
    if (error) {
      setError(null);
    }
    
    // Mark that user has modified funds
    setHasUserModifiedFunds(true);
    
    // Allow empty string for clearing the field
    if (weighting === '') {
      setFundWeightings(prev => ({
        ...prev,
        [fundId.toString()]: ''
      }));
      return;
    }
    
    // Remove any non-numeric characters except decimal point
    const cleanedValue = weighting.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = cleanedValue.split('.');
    if (parts.length > 2) {
      return; // Invalid: multiple decimal points
    }
    
    // Limit to 2 decimal places
    if (parts.length === 2 && parts[1].length > 2) {
      return; // Invalid: too many decimal places
    }
    
    // Convert to number to validate range
    const numValue = parseFloat(cleanedValue);
    
    // Allow partial inputs during typing (e.g., "10." for "10.0")
    if (!isNaN(numValue) && numValue > 100) {
      return; // Invalid: exceeds 100%
    }
    
    setFundWeightings(prev => ({
      ...prev,
      [fundId.toString()]: cleanedValue
    }));
  };

  const validateForm = () => {
    // Clear any previous errors before validation
    setError(null);
    setDateError(null); // Clear date error
    
    // Auto-generate generation name if empty
    const generationName = formData.generation_name.trim() || generateGenerationName();
    
    if (!generationName) {
      setError('Unable to generate generation name');
      return false;
    }
    
    // Validate creation date if provided
    if (formData.created_at && formData.created_at.trim()) {
      const dateValidationResult = validateCreationDate(formData.created_at);
      if (!dateValidationResult.isValid) {
        setDateError(dateValidationResult.error);
        return false;
      }
    }
    
    // Check if there are any existing date errors
    if (dateError) {
      return false;
    }
    
    // Validate fund weightings
    if (selectedFunds.length === 0) {
      setError('Please select at least one fund');
      return false;
    }
    
    // Calculate total weighting
    const totalWeighting = Object.values(fundWeightings).reduce((a, b) => {
      const numValue = parseFloat(b) || 0;
      return a + numValue;
    }, 0);
    
    // Check if total weighting equals 100%
    if (Math.abs(totalWeighting - 100) > 0.01) {
      setError(`Total fund weighting must equal 100%. Current total: ${totalWeighting.toFixed(2)}%`);
      return false;
    }
    
    return true;
  };

  const validateCreationDate = (dateString: string) => {
    if (!dateString.trim()) {
      return { isValid: true, error: null }; // Empty date is valid (will use current date)
    }
    
    try {
      let date: Date;
      let year: number, month: number, day: number;
      
      // Handle dd/mm/yyyy format (from DateInput component)
      if (dateString.includes('/')) {
        const parts = dateString.trim().split('/');
        
        // Check if we have exactly 3 parts
        if (parts.length !== 3) {
          return { 
            isValid: false, 
            error: 'Invalid date format. Please use dd/mm/yyyy format.' 
          };
        }
        
        // Parse day, month, year
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        year = parseInt(parts[2], 10);
        
        // Check for invalid numbers
        if (isNaN(day) || isNaN(month) || isNaN(year)) {
          return { 
            isValid: false, 
            error: 'Invalid date format. Please enter valid numbers.' 
          };
        }
        
        // Check year range (reasonable range for business purposes)
        if (year < 1900 || year > 2100) {
          return { 
            isValid: false, 
            error: 'Year must be between 1900 and 2100.' 
          };
        }
        
        // Check month range
        if (month < 1 || month > 12) {
          return { 
            isValid: false, 
            error: 'Month must be between 01 and 12.' 
          };
        }
        
        // Check day range for the specific month/year
        const daysInMonth = new Date(year, month, 0).getDate();
        if (day < 1 || day > daysInMonth) {
          return { 
            isValid: false, 
            error: `Day must be between 01 and ${daysInMonth.toString().padStart(2, '0')} for the selected month.` 
          };
        }
        
        // Create date object (month is 0-indexed in Date constructor)
        date = new Date(year, month - 1, day);
        
        // Verify the date components match what we parsed (catches invalid dates)
        if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
          return { 
            isValid: false, 
            error: 'The entered date does not correspond to a valid calendar date.' 
          };
        }
        
      } else {
        // Handle ISO format (YYYY-MM-DD)
        date = new Date(dateString);
        
        // Check if the date is invalid (NaN)
        if (isNaN(date.getTime())) {
          return { 
            isValid: false, 
            error: 'Invalid date format. Please enter a valid date.' 
          };
        }
        
        // For ISO format input (YYYY-MM-DD), do additional validation
        if (dateString.includes('-') && dateString.length === 10) {
          const parts = dateString.split('-').map(Number);
          [year, month, day] = parts;
          
          // Check year range
          if (year < 1900 || year > 2100) {
            return { 
              isValid: false, 
              error: 'Year must be between 1900 and 2100.' 
            };
          }
          
          // Check month range
          if (month < 1 || month > 12) {
            return { 
              isValid: false, 
              error: 'Month must be between 01 and 12.' 
            };
          }
          
          // Check day range for the specific month/year
          const daysInMonth = new Date(year, month, 0).getDate();
          if (day < 1 || day > daysInMonth) {
            return { 
              isValid: false, 
              error: `Day must be between 01 and ${daysInMonth.toString().padStart(2, '0')} for the selected month.` 
            };
          }
          
          // Verify the date components match what we parsed
          if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
            return { 
              isValid: false, 
              error: 'The entered date does not correspond to a valid calendar date.' 
            };
          }
        }
      }
      
      // Check if date is too far in the future (more than 10 years)
      const tenYearsFromNow = new Date();
      tenYearsFromNow.setFullYear(tenYearsFromNow.getFullYear() + 10);
      
      if (date > tenYearsFromNow) {
        return { 
          isValid: false, 
          error: 'Creation date cannot be more than 10 years in the future.' 
        };
      }
      
      // Check if date is too far in the past (more than 50 years)
      const fiftyYearsAgo = new Date();
      fiftyYearsAgo.setFullYear(fiftyYearsAgo.getFullYear() - 50);
      
      if (date < fiftyYearsAgo) {
        return { 
          isValid: false, 
          error: 'Creation date cannot be more than 50 years in the past.' 
        };
      }
      
      return { isValid: true, error: null };
      
    } catch (error) {
      return { 
        isValid: false, 
        error: 'Invalid date format. Please enter a valid date.' 
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // IMPORTANT: Validation preserves all user input - no state reset on validation errors
    if (validateForm()) {
      try {
        setIsSubmitting(true);
        setError(null);
        setDateError(null); // Clear date error on successful submission
        
        // Use auto-generated name if field is empty
        const generationName = formData.generation_name.trim() || generateGenerationName();
        
        // Prepare the funds data
        const fundsData = selectedFunds.map(fundId => ({
          fund_id: fundId,
          target_weighting: parseFloat(fundWeightings[fundId.toString()] || '0')
        }));
        
        // Prepare the payload
        const payload: any = {
          generation_name: generationName,
          description: formData.description,
          funds: fundsData
        };

        // Include created_at only if a date is provided (for backlogged generations)
        if (formData.created_at.trim()) {
          // Convert date string to ISO datetime format for backend
          let createdAtDate: Date;
          
          if (formData.created_at.includes('/')) {
            // Handle dd/mm/yyyy format
            const parts = formData.created_at.split('/');
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const year = parseInt(parts[2], 10);
            
            // Create date object (month is 0-indexed in Date constructor)
            createdAtDate = new Date(year, month - 1, day);
          } else {
            // Handle ISO format
            createdAtDate = new Date(formData.created_at);
          }
          
          payload.created_at = createdAtDate.toISOString();
        }

        // Create the portfolio generation
        await api.post(`/available_portfolios/${portfolioId}/generations`, payload);
        
        // Navigate back to the template details page with refresh flag
        navigate(`/definitions/portfolio-templates/${portfolioId}`, {
          state: { refreshNeeded: true }
        });
      } catch (err: any) {
        console.error('Error creating portfolio generation:', err);
        // API errors also preserve user input - only error message is updated
        if (err.response?.data?.detail) {
          const detail = err.response.data.detail;
          if (Array.isArray(detail)) {
            setError(detail.map(item => item.msg || String(item)).join(', '));
          } else {
            setError(String(detail));
          }
        } else {
          setError('Failed to create portfolio generation');
        }
      } finally {
        setIsSubmitting(false);
      }
    }
    // Note: If validation fails, user's form state (selectedFunds, fundWeightings, formData) is preserved

  };

  // Calculate total weighting for the progress bar
  const totalWeighting = useMemo(() => {
    return Object.values(fundWeightings).reduce((a, b) => {
      const numValue = parseFloat(b) || 0;
      return a + numValue;
    }, 0);
  }, [fundWeightings]);

  // Auto-generation function for generation name
  const generateGenerationName = () => {
    if (!portfolio) return '';
    
    // Use the created_at field if provided, otherwise use current date
    const date = formData.created_at ? new Date(formData.created_at) : new Date();
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    
    return `${portfolio.name} ${month} ${year}`;
  };

  const handleClearAllFunds = () => {
    // Clear errors when user makes changes
    if (error) {
      setError(null);
    }
    
    // Mark that user has modified funds
    setHasUserModifiedFunds(true);
    
    setSelectedFunds([]);
    setFundWeightings({});
    
    // Re-add cash fund if it exists
    const cashFund = findCashFund(availableFunds);
    if (cashFund) {
      setSelectedFunds([cashFund.id]);
      setFundWeightings({ [cashFund.id.toString()]: '0' });
    }
  };

  if (isLoadingPortfolio) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700"></div>
      </div>
    );
  }

  return (
    <DynamicPageContainer maxWidth="2800px" className="py-8">
      {/* Breadcrumb Navigation */}
      <nav className="mb-8 flex" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <Link to="/definitions/portfolio-templates" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary-700">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
              </svg>
              Portfolio Templates
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
              </svg>
              <button 
                onClick={() => navigate(`/definitions/portfolio-templates/${portfolioId}`, {
                  state: { refreshNeeded: true }
                })}
                className="ml-1 text-sm font-medium text-gray-500 hover:text-primary-700 md:ml-2"
              >
                {portfolio?.name || 'Template'}
              </button>
            </div>
          </li>
          <li aria-current="page">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
              </svg>
              <span className="ml-1 text-sm font-medium text-primary-700 md:ml-2">Add Generation</span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="flex justify-between items-center mb-8 mt-4">
        <div className="flex items-center">
          <div className="bg-primary-100 p-2 rounded-lg mr-3 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">
            Add Generation to {portfolio?.name || 'Template Portfolio'}
          </h1>
        </div>
        <button
          onClick={() => navigate(`/definitions/portfolio-templates/${portfolioId}`, {
            state: { refreshNeeded: true }
          })}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back
        </button>
      </div>

      {/* Main Content */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
        {(error || dateError) && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-0">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-red-700 text-sm font-medium">{error || dateError}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="w-full lg:w-1/3">
                  <BaseInput
                    label="Generation Name"
                    helperText="(optional) - Leave empty to auto-generate"
                    id="generation_name"
                    name="generation_name"
                    value={formData.generation_name}
                    onChange={handleChange}
                    placeholder="Leave empty to auto-generate"
                  />
                  {!formData.generation_name.trim() && portfolio && (
                    <div className="mt-1 text-xs text-gray-500">
                      <span className="font-medium">Auto-generated:</span> {generateGenerationName()}
                    </div>
                  )}
                </div>
                <div className="w-full lg:w-1/3">
                  <DateInput
                    label="Creation Date"
                    id="created_at"
                    name="created_at"
                    value={formData.created_at}
                    onChange={(date, formatted) => {
                      if (date) {
                        // Valid date - use ISO string
                        const dateValue = date.toISOString();
                        setFormData(prev => ({
                          ...prev,
                          created_at: dateValue
                        }));
                        setDateError(null); // Clear any previous errors
                      } else {
                        // Invalid date or empty - validate the raw input
                        setFormData(prev => ({
                          ...prev,
                          created_at: formatted || ''
                        }));
                        
                        // Real-time date validation for invalid dates
                        if (formatted && formatted.trim()) {
                          const dateValidationResult = validateCreationDate(formatted);
                          if (!dateValidationResult.isValid) {
                            setDateError(dateValidationResult.error);
                          } else {
                            setDateError(null);
                          }
                        } else {
                          setDateError(null); // Clear error if date is empty (valid)
                        }
                      }
                      
                      // Clear general errors when user makes changes
                      if (error) {
                        setError(null);
                      }
                    }}
                    placeholder="Select creation date"
                    helperText="Leave empty to use current date/time"
                    required={false}
                  />
                  {dateError && (
                    <p className="mt-1 text-xs text-red-500">{dateError}</p>
                  )}
                </div>
                <div className="w-full lg:w-1/3">
                  <BaseInput
                    label="Description"
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Enter a detailed description of this portfolio generation"
                  />
                </div>
              </div>
              
              {latestGenerationId && (
                <div className="mt-2">
                  <div className="flex items-center">
                    <div className="text-sm text-gray-600">
                      {isLoadingLatestFunds ? 
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-700" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Loading funds from latest generation...
                        </span> :
                        <span>Funds and weightings from the latest generation have been pre-loaded below. You can adjust them as needed.</span>
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fund Selection Section */}
          <div className="p-5">
            <div className="rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 sm:px-6">
                <h3 className="text-base font-medium text-gray-900">Fund Selection</h3>
              </div>
              
              <div className="p-4">
                {availableFunds.length === 0 ? (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          No funds available. Please add funds before creating a portfolio generation.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <FundSelectionManager
                    availableFunds={availableFunds}
                    selectedFunds={selectedFunds}
                    fundWeightings={fundWeightings}
                    onFundSelect={handleFundSelection}
                    onFundDeselect={handleFundSelection}
                    onWeightingChange={handleWeightingChange}
                    onClearAll={handleClearAllFunds}
                    searchQuery={fundSearchTerm}
                    onSearchChange={setFundSearchTerm}
                    isLoading={isLoadingFunds || isLoadingLatestFunds}
                    error={error}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
            <div className="flex-1">
              {(error || dateError) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mr-4">
                  <div className="flex items-center">
                    <svg className="h-4 w-4 text-red-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-700">{error || dateError}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex space-x-3">
              <Link
                to={`/definitions/portfolio-templates/${portfolioId}`}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || dateError !== null}
                className={`bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 shadow-sm transition-colors duration-200 ${
                  isSubmitting || dateError !== null ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </span>
                ) : (
                  'Create Generation'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </DynamicPageContainer>
  );
};

export default AddPortfolioGeneration; 