import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  noPadding = false,
  ...props 
}) => {
  return (
    <div 
      className={`
        bg-white rounded-xl border border-slate-200 shadow-sm 
        ${noPadding ? '' : 'p-6'} 
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};
