import React from 'react';

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
type TextVariant = 'default' | 'muted' | 'success' | 'error' | 'warning';

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel;
  children: React.ReactNode;
}

export const Heading: React.FC<HeadingProps> = ({
  level = 'h2',
  className = '',
  children,
  ...props
}) => {
  const styles = {
    h1: "text-4xl font-bold tracking-tight text-slate-900",
    h2: "text-3xl font-semibold tracking-tight text-slate-900",
    h3: "text-2xl font-semibold text-slate-900",
    h4: "text-xl font-semibold text-slate-900",
    h5: "text-lg font-medium text-slate-900",
    h6: "text-base font-medium text-slate-900",
  };

  const Component = level;

  return (
    <Component className={`${styles[level]} ${className}`} {...props}>
      {children}
    </Component>
  );
};

interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  variant?: TextVariant;
  size?: 'sm' | 'md' | 'lg';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  children: React.ReactNode;
}

export const Text: React.FC<TextProps> = ({
  variant = 'default',
  size = 'md',
  weight = 'normal',
  className = '',
  children,
  ...props
}) => {
  const variants = {
    default: "text-slate-900",
    muted: "text-slate-600",
    success: "text-jade-600",
    error: "text-red-600",
    warning: "text-amber-700",
  };

  const sizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };
  
  const weights = {
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
  };

  return (
    <p className={`${variants[variant]} ${sizes[size]} ${weights[weight]} ${className}`} {...props}>
      {children}
    </p>
  );
};

// Typography component with variant-based rendering
type TypographyVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'label' | 'caption';

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  variant?: TypographyVariant;
  children: React.ReactNode;
}

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  className = '',
  children,
  ...props
}) => {
  const styles: Record<TypographyVariant, string> = {
    h1: "text-4xl font-bold tracking-tight",
    h2: "text-3xl font-semibold tracking-tight",
    h3: "text-2xl font-semibold",
    h4: "text-xl font-semibold",
    body: "text-base",
    label: "text-sm font-medium uppercase tracking-wider",
    caption: "text-xs text-slate-500",
  };

  const Component = variant.startsWith('h') ? variant as 'h1' | 'h2' | 'h3' | 'h4' : 'p';

  return (
    <Component className={`${styles[variant]} ${className}`} {...props}>
      {children}
    </Component>
  );
};
