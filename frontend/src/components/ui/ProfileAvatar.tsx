import React from 'react';

interface ProfileAvatarProps {
  imageUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  alt?: string;
  onClick?: () => void;
  renderAsButton?: boolean;
}

const ProfileAvatar: React.FC<ProfileAvatarProps> = ({ 
  imageUrl = '/images/Companylogo2.png',
  size = 'md',
  alt = 'Profile',
  onClick,
  renderAsButton = true
}) => {
  // Size mappings
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14'
  };
  
  const commonClasses = `${onClick ? 'cursor-pointer hover:ring-3 hover:ring-primary-300' : ''} overflow-hidden rounded-full focus:outline-none focus:ring-3 focus:ring-primary-500 focus:ring-offset-2 border-2 border-gray-200`;
  
  const imageElement = (
    <img 
      src={imageUrl || '/images/Companylogo2.png'} 
      alt={alt}
      className={`${sizeClasses[size]} object-cover`}
    />
  );
  
  if (renderAsButton) {
    return (
      <button 
        onClick={onClick}
        className={commonClasses}
      >
        {imageElement}
      </button>
    );
  }
  
  return (
    <div 
      onClick={onClick}
      className={commonClasses}
    >
      {imageElement}
    </div>
  );
};

export default ProfileAvatar; 