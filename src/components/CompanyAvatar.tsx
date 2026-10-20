import React from 'react';

interface CompanyAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showVerified?: boolean;
}

// Generate deterministic vibrant pastel gradient from name
const GRADIENTS = [
  'from-indigo-500 to-purple-600',
  'from-blue-600 to-cyan-500',
  'from-violet-600 to-fuchsia-600',
  'from-emerald-500 to-teal-700',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-teal-600 to-emerald-600',
  'from-purple-600 to-indigo-700',
];

export const CompanyAvatar: React.FC<CompanyAvatarProps> = ({
  name,
  size = 'md',
  className = '',
  showVerified = false,
}) => {
  const cleanName = (name || 'Company').trim();
  
  // Calculate deterministic index
  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = (hash << 5) - hash + cleanName.charCodeAt(i);
    hash |= 0;
  }
  const gradient = GRADIENTS[Math.abs(hash) % GRADIENTS.length];

  // Get initials (up to 2 letters)
  const parts = cleanName.split(/\s+/).filter(Boolean);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : cleanName.slice(0, 2).toUpperCase();

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs rounded-lg',
    md: 'w-11 h-11 text-sm rounded-xl',
    lg: 'w-14 h-14 text-lg rounded-2xl',
    xl: 'w-16 h-16 text-xl rounded-2xl',
  };

  return (
    <div className="relative inline-flex flex-shrink-0">
      <div
        className={`${sizeClasses[size]} bg-gradient-to-br ${gradient} text-white font-black tracking-wider flex items-center justify-center shadow-sm select-none border border-white/20 ${className}`}
      >
        <span>{initials}</span>
      </div>
      {showVerified && (
        <span
          className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center text-[9px] text-white font-black shadow-xs"
          title="Verified Employer"
        >
          ✓
        </span>
      )}
    </div>
  );
};
