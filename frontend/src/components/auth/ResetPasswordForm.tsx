import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from '../layout/AuthLayout';

const ResetPasswordForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { resetPassword } = useAuth();
  
  // Form validation function
  const validateForm = () => {
    if (!email) {
      setError('Email is required');
      return false;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address');
      return false;
    }
    return true;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      return;
    }
    
    setError(null);
    setSuccess(false);
    setLoading(true);
    
    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 
        'Failed to send password reset email. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };
  
  // Form elements as a contained component within the AuthLayout
  const formContent = (
    <motion.div
      className="w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Logo - bigger and centered */}
      <div className="flex justify-center mb-14">
        <img 
          src="/images/Company logo.svg" 
          alt="Company Logo" 
          className="h-28 w-auto"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const parent = e.currentTarget.parentElement;
            if (parent) {
              // Fallback to text if image fails to load
              const fallbackEl = document.createElement('div');
              fallbackEl.innerHTML = '<div class="h-28 w-28 bg-primary rounded-lg flex items-center justify-center"><span class="text-white text-3xl font-bold">K</span></div>';
              parent.appendChild(fallbackEl.firstChild as Node);
            }
          }}
        />
      </div>
      
      {/* Form */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-1 text-dark-gray">Reset Password</h2>
        <p className="text-sm text-gray-500">
          {success 
            ? "Check your email for reset instructions" 
            : "Enter your email and we'll send you instructions to reset your password"}
        </p>
      </div>
      
      {error && (
        <motion.div 
          className="mb-6 p-4 bg-red-50 text-error-red rounded-lg border border-red-200"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {error}
        </motion.div>
      )}
      
      {/* Success message */}
      {success ? (
        <motion.div
          className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg border border-green-200"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          We've sent instructions to reset your password to <strong>{email}</strong>. 
          Please check your email inbox and follow the instructions.
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input pr-10"
                placeholder="Enter your email"
                required
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
              </div>
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            className="btn-primary flex justify-center items-center"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : 'Send Reset Link'}
          </motion.button>
        </form>
      )}
      
      <div className="text-center mt-6">
        <span className="text-gray-600">Remember your password? </span>
        <Link to="/login" className="text-primary font-medium hover:underline">Sign In</Link>
      </div>
    </motion.div>
  );
  
  return <AuthLayout>{formContent}</AuthLayout>;
};

export default ResetPasswordForm; 