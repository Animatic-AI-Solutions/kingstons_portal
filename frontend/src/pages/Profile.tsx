import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { profileService, ProfileUpdateData } from '../services/profile';
import { Card, Button, ProfileAvatar } from '../components/ui';

const landingPageOptions = [
  { value: '/', label: 'Home' },
  { value: '/clients', label: 'Clients' },
  { value: '/products', label: 'Products' },
  { value: '/definitions', label: 'Definitions' },
  { value: '/reporting', label: 'Analytics' }
];

const Profile: React.FC = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  
  // Form state
  const [formData, setFormData] = useState<ProfileUpdateData>({
    preferred_landing_page: '/',
    profile_picture_url: '/images/Companylogo2.png',
    preferred_client_view: 'list'
  });

  // Update form data when user data is loaded
  useEffect(() => {
    if (user) {
      setFormData({
        preferred_landing_page: user.preferred_landing_page || '/',
        profile_picture_url: user.profile_picture_url || '/images/Companylogo2.png',
        preferred_client_view: user.preferred_client_view || 'list'
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');
    
    try {
      console.log('Submitting profile data:', formData);
      await profileService.updateProfile(formData);
      setSuccessMessage('Profile updated successfully');
    } catch (err: any) {
      console.error('Profile update error:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to update profile';
      if (errorMessage === 'No valid profile data provided') {
        setError('No changes to save');
      } else {
        setError(`Failed to update profile: ${errorMessage}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse bg-white rounded-lg shadow p-6">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Card>
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">Profile Settings</h2>
          
          {successMessage && (
            <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">{successMessage}</p>
                </div>
              </div>
            </div>
          )}
          
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="flex flex-col space-y-6">
              {/* Profile Picture Section */}
              <div className="flex flex-col items-center sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                <div className="flex flex-col items-center">
                  <ProfileAvatar 
                    imageUrl={formData.profile_picture_url}
                    size="lg"
                    alt={user?.first_name || 'Advisor'}
                  />
                  <span className="mt-2 text-sm text-gray-500">Using default logo as placeholder</span>
                </div>
                
                <div className="flex flex-col flex-grow">
                  <h3 className="text-base font-medium text-gray-900 mb-2">Profile Information</h3>
                  
                  <div className="grid grid-cols-1 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <p className="text-gray-900">
                        {user?.first_name || ''} {user?.last_name || ''}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <p className="text-gray-900">{user?.email || ''}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Preferences Section */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-base font-medium text-gray-900 mb-4">Preferences</h3>
                
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label htmlFor="preferred_landing_page" className="block text-sm font-medium text-gray-700 mb-1">
                      Default Landing Page
                    </label>
                    <select
                      id="preferred_landing_page"
                      name="preferred_landing_page"
                      value={formData.preferred_landing_page}
                      onChange={handleChange}
                      className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-700 focus:border-primary-700 sm:text-sm"
                    >
                      {landingPageOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-sm text-gray-500">
                      This page will be shown when you first log in. You can still access the homepage and other pages through the navigation menu.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Submit Button */}
              <div className="flex justify-end pt-6 border-t border-gray-200">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default Profile; 