import React from 'react';

export type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ 
  variant = 'default', 
  children, 
  className = '', 
  ...props 
}) => {
  const variants = {
    default: "border-transparent bg-derivhr-500 text-white hover:bg-derivhr-600",
    secondary: "border-transparent bg-slate-100 text-slate-900 hover:bg-slate-200",
    outline: "text-slate-900 border-slate-200",
    destructive: "border-transparent bg-red-500 text-white hover:bg-red-600",
    success: "border-transparent bg-jade-500 text-white hover:bg-jade-600",
    warning: "border-transparent bg-yellow-500 text-white hover:bg-yellow-600",
  };

  return (
    <div 
      className={`
        inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
        ${variants[variant]} 
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};
