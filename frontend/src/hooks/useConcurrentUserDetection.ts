import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface PageUser {
  user_id: number;
  user_info: {
    name: string;
    avatar?: string;
  };
  entered_at: string;
  last_seen: string;
}

interface UseConcurrentUserDetectionProps {
  pageIdentifier: string;
  pageName: string;
  onlyForProductPages?: boolean;
}

interface UseConcurrentUserDetectionReturn {
  showConcurrentUserModal: boolean;
  currentUsers: PageUser[];
  handleConfirmProceed: () => void;
  handleCancel: () => void;
  isCheckingPresence: boolean;
}

export const useConcurrentUserDetection = ({
  pageIdentifier,
  pageName,
  onlyForProductPages = true
}: UseConcurrentUserDetectionProps): UseConcurrentUserDetectionReturn => {
  const { api, user } = useAuth();
  const navigate = useNavigate();
  
  const [showConcurrentUserModal, setShowConcurrentUserModal] = useState(false);
  const [currentUsers, setCurrentUsers] = useState<PageUser[]>([]);
  const [isCheckingPresence, setIsCheckingPresence] = useState(true);
  const [hasUserConfirmed, setHasUserConfirmed] = useState(false);

  // Check if this is a product details page that should show the warning
  const isProductDetailsPage = useCallback(() => {
    if (!onlyForProductPages) return true;
    
    // Define patterns for product details pages
    const productPagePatterns = [
      /^portfolio-generation-\d+$/,
      /^product-details-\d+$/,
      /^fund-details-\d+$/,
      /^portfolio-template-\d+$/,
      /^client-product-\d+$/
    ];
    
    return productPagePatterns.some(pattern => pattern.test(pageIdentifier));
  }, [pageIdentifier, onlyForProductPages]);

  // Check for existing users on the page
  const checkPagePresence = useCallback(async () => {
    if (!user || hasUserConfirmed || !isProductDetailsPage()) {
      setIsCheckingPresence(false);
      return;
    }

    try {
      setIsCheckingPresence(true);
      
      // First, check if there are other users on this page
      const presenceResponse = await api.get(`/presence/${pageIdentifier}`);
      const users = presenceResponse.data.users || [];
      
      // Filter out the current user
      const otherUsers = users.filter((pageUser: PageUser) => pageUser.user_id !== user.id);
      
      setCurrentUsers(users);
      
      // Show modal if there are other users on the page
      if (otherUsers.length > 0) {
        setShowConcurrentUserModal(true);
      } else {
        // If no other users, register this user's presence
        await registerUserPresence();
      }
    } catch (error) {
      console.error('Error checking page presence:', error);
      // If presence check fails, continue normally without blocking
      await registerUserPresence();
    } finally {
      setIsCheckingPresence(false);
    }
  }, [pageIdentifier, user, hasUserConfirmed, isProductDetailsPage, api]);

  // Register the current user's presence on the page
  const registerUserPresence = useCallback(async () => {
    if (!user) return;

    try {
      await api.post(`/presence/${pageIdentifier}/enter`);
    } catch (error) {
      console.error('Error registering user presence:', error);
    }
  }, [pageIdentifier, user, api]);

  // Clean up presence when user leaves
  const cleanupPresence = useCallback(async () => {
    if (!user) return;

    try {
      await api.delete(`/presence/${pageIdentifier}/exit`);
    } catch (error) {
      console.error('Error cleaning up user presence:', error);
    }
  }, [pageIdentifier, user, api]);

  // Handle user confirming to proceed despite other users
  const handleConfirmProceed = useCallback(async () => {
    setHasUserConfirmed(true);
    setShowConcurrentUserModal(false);
    
    // Register this user's presence now that they've confirmed
    await registerUserPresence();
  }, [registerUserPresence]);

  // Handle user choosing to go back
  const handleCancel = useCallback(() => {
    setShowConcurrentUserModal(false);

    // Use setTimeout to ensure modal closes before navigation
    setTimeout(() => {
      // Navigate back to previous page, or fallback to products page
      if (window.history.length > 2) {
        // If there's a previous page in history, go back
        navigate(-1);
      } else {
        // Otherwise, navigate to products page as fallback
        navigate('/products');
      }
    }, 100);
  }, [navigate]);

  // Initialize presence checking on mount
  useEffect(() => {
    if (user && isProductDetailsPage()) {
      checkPagePresence();
    }

    // Cleanup on unmount
    return () => {
      if (user && (hasUserConfirmed || !showConcurrentUserModal)) {
        cleanupPresence();
      }
    };
  }, [user, pageIdentifier, isProductDetailsPage]);

  // Handle page visibility changes to clean up presence when user leaves
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && (hasUserConfirmed || !showConcurrentUserModal)) {
        cleanupPresence();
      }
    };

    const handleBeforeUnload = () => {
      if (hasUserConfirmed || !showConcurrentUserModal) {
        cleanupPresence();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [cleanupPresence, hasUserConfirmed, showConcurrentUserModal]);

  return {
    showConcurrentUserModal,
    currentUsers,
    handleConfirmProceed,
    handleCancel,
    isCheckingPresence
  };
}; 