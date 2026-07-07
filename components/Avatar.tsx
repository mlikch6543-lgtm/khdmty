import React, { useState } from 'react';

interface AvatarProps {
  src?: string;
  name: string;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ src, name, className = "w-10 h-10 rounded-full" }) => {
  const [error, setError] = useState(false);
  
  const initials = name ? name.trim().charAt(0) : '?';
  
  // Hash function to get a stable, beautiful background color based on name
  const getBgColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      'bg-indigo-600 text-white',
      'bg-emerald-600 text-white',
      'bg-blue-600 text-white',
      'bg-amber-600 text-white',
      'bg-rose-600 text-white',
      'bg-violet-600 text-white',
      'bg-teal-600 text-white',
      'bg-cyan-600 text-white'
    ];
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  if (!src || error) {
    return (
      <div className={`${className} flex items-center justify-center font-bold text-sm shrink-0 select-none ${getBgColor(name)}`}>
        {initials}
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={name} 
      className={`${className} shrink-0 object-cover`}
      onError={() => setError(true)}
      referrerPolicy="no-referrer"
    />
  );
};
