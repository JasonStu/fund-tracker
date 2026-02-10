import React from 'react';

type SortDirection = 'asc' | 'desc' | null;

interface SortIconProps {
  active: boolean;
  direction: SortDirection;
}

export const SortIcon: React.FC<SortIconProps> = ({ active, direction }) => {
  return (
    <span className="inline-flex flex-col ml-1 align-middle h-4 w-2 relative top-0.5">
      <svg 
        className={`w-2 h-2 -mb-0.5 ${active && direction === 'asc' ? 'text-blue-500' : 'text-gray-600'}`} 
        fill="currentColor" 
        viewBox="0 0 20 20"
      >
        <path d="M5 10l5-8 5 8H5z" />
      </svg>
      <svg 
        className={`w-2 h-2 -mt-0.5 ${active && direction === 'desc' ? 'text-blue-500' : 'text-gray-600'}`} 
        fill="currentColor" 
        viewBox="0 0 20 20"
      >
        <path d="M5 10l5 8 5-8H5z" />
      </svg>
    </span>
  );
};
