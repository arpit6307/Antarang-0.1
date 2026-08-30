import React from 'react';
import { motion } from 'motion/react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const variantStyles = {
  primary: 'bg-gold text-midnight hover:bg-gold-light hover:shadow-[0_0_15px_rgba(197,161,78,0.35)] active:bg-gold-dark font-medium',
  secondary: 'border border-gold text-gold bg-transparent hover:bg-gold/10 active:bg-gold/20 font-medium',
  danger: 'bg-wine text-cream hover:bg-wine-light active:bg-wine/90 font-medium shadow-sm',
  ghost: 'bg-transparent text-cream/90 hover:text-gold hover:bg-white/5 active:bg-white/10 font-medium',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-2.5 sm:py-3 text-base gap-2.5',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  children,
  className = '',
  type = 'button',
  ...props
}) {
  const isInteractiveDisabled = disabled || loading;
  const currentVariant = variantStyles[variant] || variantStyles.primary;
  const currentSize = sizeStyles[size] || sizeStyles.md;

  return (
    <motion.button
      type={type}
      disabled={isInteractiveDisabled}
      whileTap={isInteractiveDisabled ? undefined : { scale: 0.97 }}
      className={`inline-flex items-center justify-center font-sans rounded-lg transition-colors cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-midnight disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none ${currentVariant} ${currentSize} ${className}`}
      aria-disabled={isInteractiveDisabled}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <LoadingSpinner
          size={size === 'lg' ? 'md' : 'sm'}
          className={`shrink-0 ${variant === 'primary' ? 'text-midnight' : 'text-current'}`}
        />
      ) : icon ? (
        <span className="shrink-0 inline-flex items-center justify-center" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children ? <span>{children}</span> : null}
    </motion.button>
  );
}

export { Button };
