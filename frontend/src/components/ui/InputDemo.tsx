import React, { useState } from 'react';
import { 
  BaseInput, 
  NumberInput, 
  TextArea, 
  InputLabel, 
  InputError, 
  InputGroup, 
  InputRow, 
  InputColumn,
  Button 
} from './index';

const InputDemo: React.FC = () => {
  const [formData, setFormData] = useState({
    clientName: '',
    email: '',
    fundValue: 0,
    riskScore: 0,
    description: '',
    portfolio: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.clientName.trim()) {
      newErrors.clientName = 'Client name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (formData.fundValue <= 0) {
      newErrors.fundValue = 'Fund value must be greater than 0';
    }
    
    if (formData.riskScore < 1 || formData.riskScore > 10) {
      newErrors.riskScore = 'Risk score must be between 1 and 10';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      console.log('Form submitted:', formData);
    }
  };

  // Icons for demo
  const UserIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );

  const EmailIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );

  const PoundIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
    </svg>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Universal Input Components Demo</h1>
        
        {/* Form Demo */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* BaseInput Examples */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">Text Inputs</h2>
              
              <BaseInput
                label="Client Name"
                placeholder="Enter client name"
                value={formData.clientName}
                onChange={(e) => handleInputChange('clientName', e.target.value)}
                error={errors.clientName}
                required
                leftIcon={UserIcon}
              />
              
              <BaseInput
                type="email"
                label="Email Address"
                placeholder="client@example.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                error={errors.email}
                required
                leftIcon={EmailIcon}
                helperText="We'll use this for important notifications"
              />
              
              <BaseInput
                type="password"
                label="Password"
                placeholder="Enter password"
                size="lg"
                helperText="Must be at least 8 characters"
              />
            </div>
            
            {/* NumberInput Examples */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">Number Inputs</h2>
              
              <NumberInput
                label="Fund Value"
                format="currency"
                currency="£"
                value={formData.fundValue}
                onChange={(e) => handleInputChange('fundValue', parseFloat(e.target.value) || 0)}
                error={errors.fundValue}
                required
                min={0}
                decimalPlaces={2}
                thousandSeparator
              />
              
              <NumberInput
                label="Risk Score"
                value={formData.riskScore}
                onChange={(e) => handleInputChange('riskScore', parseFloat(e.target.value) || 0)}
                error={errors.riskScore}
                required
                min={1}
                max={10}
                step={0.1}
                showSteppers
                helperText="Rate from 1 (low risk) to 10 (high risk)"
              />
              
              <NumberInput
                label="Expected Return"
                format="percentage"
                value={7.5}
                decimalPlaces={1}
                suffix="%"
                disabled
                helperText="Based on historical performance"
              />
            </div>
          </div>
          
          {/* TextArea Examples */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Text Areas</h2>
            
            <InputRow gap="lg">
              <TextArea
                label="Portfolio Description"
                placeholder="Describe the investment portfolio..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                minRows={3}
                maxRows={6}
                showCharacterCount
                maxLength={500}
                helperText="Provide a detailed description of the investment strategy"
              />
              
              <TextArea
                label="Notes"
                placeholder="Additional notes..."
                value={formData.portfolio}
                onChange={(e) => handleInputChange('portfolio', e.target.value)}
                minRows={3}
                resize="vertical"
                variant="success"
                helperText="Any additional information"
              />
            </InputRow>
          </div>
          
          {/* Input Groups Examples */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Input Groups</h2>
            
            <InputGroup orientation="horizontal" spacing="sm">
              <BaseInput
                placeholder="Search funds..."
                className="flex-1"
              />
              <Button type="button" size="md">
                Search
              </Button>
            </InputGroup>
            
            <InputRow>
              <BaseInput
                label="First Name"
                placeholder="John"
                className="flex-1"
              />
              <BaseInput
                label="Last Name"
                placeholder="Doe"
                className="flex-1"
              />
            </InputRow>
          </div>
          
          {/* Component States Demo */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Component States</h2>
            
            <InputRow>
              <BaseInput
                label="Default State"
                placeholder="Default input"
                className="flex-1"
              />
              <BaseInput
                label="Success State"
                placeholder="Valid input"
                variant="success"
                value="Valid data"
                className="flex-1"
              />
              <BaseInput
                label="Error State"
                placeholder="Invalid input"
                error="This field is required"
                className="flex-1"
              />
              <BaseInput
                label="Disabled State"
                placeholder="Disabled input"
                disabled
                value="Cannot edit"
                className="flex-1"
              />
            </InputRow>
          </div>
          
          {/* Size Variations */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Size Variations</h2>
            
            <InputColumn>
              <BaseInput
                label="Small Input"
                placeholder="Small size input"
                size="sm"
                leftIcon={UserIcon}
              />
              <BaseInput
                label="Medium Input (default)"
                placeholder="Medium size input"
                size="md"
                leftIcon={UserIcon}
              />
              <BaseInput
                label="Large Input"
                placeholder="Large size input"
                size="lg"
                leftIcon={UserIcon}
              />
            </InputColumn>
          </div>
          
          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
            <Button type="submit">
              Save Client
            </Button>
          </div>
        </form>
      </div>
      
      {/* Standalone Components Demo */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Standalone Components</h2>
        
        <div className="space-y-4">
          <div>
            <InputLabel htmlFor="demo-label" required helpText="This is a help tooltip">
              Standalone Label
            </InputLabel>
            <BaseInput id="demo-label" placeholder="Input with standalone label" />
          </div>
          
          <InputError>
            This is a standalone error message component
          </InputError>
          
          <InputError showIcon={false}>
            Error message without icon
          </InputError>
        </div>
      </div>
    </div>
  );
};

export default InputDemo; 