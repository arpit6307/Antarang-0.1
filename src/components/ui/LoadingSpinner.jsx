import React from 'react';
import { motion } from 'motion/react';

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-10 h-10',
};

export default function LoadingSpinner({
  size = 'md',
  className = '',
  ...props
}) {
  const sizeClass = sizeMap[size] || sizeMap.md;

  return (
    <motion.svg
      className={`${sizeClass} text-gold ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      aria-label="Loading"
      role="status"
      {...props}
    >
      <circle
        cx="12"
        cy="12"
        r="9.5"
        stroke="currentColor"
        strokeWidth="2.5"
        className="opacity-20"
      />
      <path
        d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </motion.svg>
  );
}

export { LoadingSpinner };
