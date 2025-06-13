import React, { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react';
import { 
  PencilIcon, 
  PlusIcon, 
  TrashIcon, 
  PauseIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export interface ActionButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  variant: 'edit' | 'add' | 'delete' | 'lapse' | 'save' | 'cancel';
  size?: 'mini' | 'xs' | 'icon' | 'sm' | 'md' | 'lg';
  design?: 'minimal' | 'balanced' | 'descriptive';
  iconOnly?: boolean;
  tableContext?: boolean;
  compact?: boolean;
  context?: string;
  loading?: boolean;
  fullWidth?: boolean;
}

const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(({
  variant,
  size = 'md',
  design = 'balanced',
  iconOnly = false,
  tableContext = false,
  compact = false,
  context,
  loading = false,
  fullWidth = false,
  className = '',
  disabled = false,
  children,
  ...props
}, ref) => {
  
  // Icon mapping
  const iconMap = {
    edit: PencilIcon,
    add: PlusIcon,
    delete: TrashIcon,
    lapse: PauseIcon,
    save: CheckIcon,
    cancel: XMarkIcon
  };

  // Color mapping
  const colorMap = {
    edit: 'primary',
    add: 'success',
    delete: 'danger',
    lapse: 'warning',
    save: 'success',
    cancel: 'secondary'
  };

  // Text mapping with context awareness
  const getButtonText = () => {
    if (iconOnly) return '';
    
    const baseTexts = {
      edit: 'Edit',
      add: 'Add',
      delete: 'Delete',
      lapse: 'Lapse',
      save: 'Save',
      cancel: 'Cancel'
    };

    if (context && (variant === 'add' || variant === 'edit' || variant === 'delete')) {
      if (design === 'descriptive') {
        return variant === 'add' ? `Add New ${context}` : 
               variant === 'edit' ? `Edit ${context}` :
               variant === 'delete' ? `Delete ${context}` : baseTexts[variant];
      }
      if (design === 'balanced' && variant === 'add') {
        return `Add ${context}`;
      }
    }

    // Minimal design or table context uses shorter text
    if (design === 'minimal' || tableContext) {
      const shortTexts = {
        edit: size === 'xs' ? 'E' : 'Edit',
        add: size === 'xs' ? 'A' : 'Add',
        delete: size === 'xs' ? 'D' : size === 'mini' ? 'Del' : 'Delete',
        lapse: size === 'xs' ? 'L' : 'Lapse',
        save: size === 'mini' ? '✓' : 'Save',
        cancel: size === 'mini' ? '✕' : 'Cancel'
      };
      return shortTexts[variant] || baseTexts[variant];
    }

    return baseTexts[variant];
  };

  // Auto-adjust size for table context
  const getEffectiveSize = () => {
    if (tableContext && !size) return 'xs';
    if (compact && !size) return 'mini';
    return size;
  };

  const effectiveSize = getEffectiveSize();
  const IconComponent = iconMap[variant];
  const buttonText = getButtonText();
  const showText = !iconOnly && buttonText;

  // Base classes with sleek modern styling
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all duration-150 ease-out active:scale-[0.98] relative';

  // Size classes - keeping them sleek and compact
  const sizeClasses = {
    mini: iconOnly ? 'h-5 w-5 p-1' : 'h-5 px-2 py-1 text-xs',
    xs: iconOnly ? 'h-6 w-6 p-1.5' : 'h-6 px-2.5 py-1 text-xs',
    icon: 'h-7 w-7 p-1.5', // Always icon-only
    sm: iconOnly ? 'h-8 w-8 p-2' : 'h-8 px-3 py-1.5 text-sm',
    md: iconOnly ? 'h-10 w-10 p-2.5' : 'h-10 px-4 py-2 text-sm',
    lg: iconOnly ? 'h-12 w-12 p-3' : 'h-12 px-6 py-3 text-base'
  };

  // Sleek, professional color classes - no gradients, soft red/orange
  const colorClasses = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500/30 border border-primary-600/20 shadow-sm hover:shadow-md',
    success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500/30 border border-green-600/20 shadow-sm hover:shadow-md',
    danger: 'bg-rose-500 hover:bg-rose-600 text-white focus:ring-rose-400/30 border border-rose-500/20 shadow-sm hover:shadow-md',
    warning: 'bg-orange-500 hover:bg-orange-600 text-white focus:ring-orange-400/30 border border-orange-500/20 shadow-sm hover:shadow-md',
    secondary: 'bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 focus:ring-gray-400/30 border border-gray-300 shadow-sm hover:shadow-md'
  };

  // Design-specific modifications - clean and minimal
  const getDesignClasses = () => {
    const color = colorMap[variant] as keyof typeof colorClasses;
    
    if (design === 'minimal' || tableContext) {
      const minimalClasses = {
        primary: 'bg-primary-50 hover:bg-primary-100 text-primary-700 hover:text-primary-800 focus:ring-primary-500/20 border border-primary-200 hover:border-primary-300',
        success: 'bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-800 focus:ring-green-500/20 border border-green-200 hover:border-green-300',
        danger: 'bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 focus:ring-red-500/20 border border-red-200 hover:border-red-300',
        warning: 'bg-orange-50 hover:bg-orange-100 text-orange-700 hover:text-orange-800 focus:ring-orange-500/20 border border-orange-200 hover:border-orange-300',
        secondary: 'bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-700 focus:ring-gray-400/20 border border-gray-200 hover:border-gray-300'
      };
      return minimalClasses[color];
    }
    
    return colorClasses[color];
  };

  // Icon size based on button size
  const iconSizeClasses = {
    mini: 'h-3 w-3',
    xs: 'h-3.5 w-3.5',
    icon: 'h-4 w-4',
    sm: 'h-4 w-4',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  // Disabled classes - clean and simple
  const disabledClasses = disabled 
    ? 'opacity-50 cursor-not-allowed hover:shadow-sm active:scale-100' 
    : '';

  // Width classes
  const widthClasses = fullWidth ? 'w-full' : '';

  // Force icon-only for 'icon' size
  const isIconOnly = iconOnly || effectiveSize === 'icon';

  const buttonClasses = `
    ${baseClasses}
    ${sizeClasses[effectiveSize]}
    ${getDesignClasses()}
    ${disabledClasses}
    ${widthClasses}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={buttonClasses}
      {...props}
    >
      {loading ? (
        <div className="flex items-center">
          <svg className={`animate-spin ${iconSizeClasses[effectiveSize]} ${showText ? 'mr-1.5' : ''}`} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {showText && <span>Loading...</span>}
        </div>
      ) : (
        <>
          <IconComponent className={`${iconSizeClasses[effectiveSize]} ${showText ? 'mr-1.5' : ''}`} />
          {showText && <span>{buttonText}</span>}
        </>
      )}
    </button>
  );
});

ActionButton.displayName = 'ActionButton';

export default ActionButton; 