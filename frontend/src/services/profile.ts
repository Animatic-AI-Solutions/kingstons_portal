import { createAuthenticatedApi } from './auth';

const api = createAuthenticatedApi();

export interface ProfileUpdateData {
  preferred_landing_page?: string;
  profile_picture_url?: string;
  timezone?: string;
  default_reporting_period?: string;
  preferred_client_view?: string;
}

export const profileService = {
  /**
   * Update user profile
   * 
   * @param profileData - Profile data to update
   * @returns Updated profile data
   */
  updateProfile: async (profileData: ProfileUpdateData) => {
    try {
      // Only send fields that exist in the database
      const validData: ProfileUpdateData = {};
      
      if (profileData.preferred_landing_page !== undefined) {
        validData.preferred_landing_page = profileData.preferred_landing_page.trim();
      }
      
      if (profileData.profile_picture_url !== undefined) {
        validData.profile_picture_url = profileData.profile_picture_url;
      }
      
      if (profileData.preferred_client_view !== undefined) {
        validData.preferred_client_view = profileData.preferred_client_view;
      }

      const response = await api.put('/auth/update-profile', validData);
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },
}; 