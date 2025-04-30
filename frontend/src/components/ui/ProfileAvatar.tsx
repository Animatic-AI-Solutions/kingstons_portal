import React from 'react';

interface ProfileAvatarProps {
  imageUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  alt?: string;
  onClick?: () => void;
}

const ProfileAvatar: React.FC<ProfileAvatarProps> = ({ 
  imageUrl = '/images/Companylogo2.png',
  size = 'md',
  alt = 'Profile',
  onClick
}) => {
  // Size mappings
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14'
  };
  
  return (
    <button 
      onClick={onClick}
      className={`${onClick ? 'cursor-pointer hover:ring-2 hover:ring-primary-300' : ''} overflow-hidden rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 border-2 border-gray-200`}
    >
      <img 
        src={imageUrl || '/images/Companylogo2.png'} 
        alt={alt}
        className={`${sizeClasses[size]} object-cover`}
      />
    </button>
  );
};

export default ProfileAvatar; 