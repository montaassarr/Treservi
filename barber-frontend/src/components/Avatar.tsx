import React from 'react';
import { generateAvatarProps } from '../utils/avatarUtils';

interface AvatarComponentProps {
  name: string;
  role?: string;
  avatarUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showRing?: boolean;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-20 h-20 text-2xl'
};

const Avatar: React.FC<AvatarComponentProps> = ({
  name,
  role,
  avatarUrl,
  size = 'md',
  className = '',
  showRing = true
}) => {
  const { initials, colorScheme, avatarUrl: generatedUrl } = generateAvatarProps(name, role, avatarUrl);
  const finalAvatarUrl = avatarUrl || generatedUrl;
  const [imageError, setImageError] = React.useState(false);

  return (
    <div
      className={`
        ${sizeClasses[size]}
        rounded-full
        flex items-center justify-center
        font-semibold
        ${showRing ? `ring-2 ${colorScheme.ring} ring-offset-2` : ''}
        ${finalAvatarUrl && !imageError ? '' : colorScheme.bg}
        ${finalAvatarUrl && !imageError ? '' : colorScheme.text}
        transition-all duration-200
        hover:scale-105
        shadow-md
        overflow-hidden
        ${className}
      `}
      title={`${name}${role ? ` (${role})` : ''}`}
    >
      {finalAvatarUrl && !imageError ? (
        <img
          src={finalAvatarUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};

export default Avatar;
