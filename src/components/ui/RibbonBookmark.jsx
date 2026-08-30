import React, { useId } from 'react';

const sizeMap = {
  sm: { width: 20, height: 48 },
  md: { width: 28, height: 72 },
  lg: { width: 36, height: 96 },
};

export default function RibbonBookmark({
  size = 'md',
  className = '',
  ...props
}) {
  const gradientId = useId();
  const filterId = useId();

  const dimensions = typeof size === 'object'
    ? size
    : sizeMap[size] || sizeMap.md;

  const { width, height } = dimensions;

  return (
    <div
      className={`pointer-events-none drop-shadow-md select-none ${className}`}
      aria-hidden="true"
      {...props}
    >
      <svg
        width={width}
        height={height}
        viewBox="0 0 28 72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#A8863A" />
            <stop offset="35%" stopColor="#D4B86A" />
            <stop offset="70%" stopColor="#C5A14E" />
            <stop offset="100%" stopColor="#8F6E28" />
          </linearGradient>
          <filter id={filterId} x="-20%" y="-10%" width="140%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Main Ribbon Body with classic notched tail */}
        <path
          d="M0 0 H28 V64 L14 54 L0 64 Z"
          fill={`url(#${gradientId})`}
        />

        {/* Stitched vintage gold border detail */}
        <path
          d="M3 0 V58 L14 49 L25 58 V0"
          stroke="#FAF3E6"
          strokeWidth="0.75"
          strokeDasharray="2 1.5"
          strokeOpacity="0.4"
          fill="none"
        />
      </svg>
    </div>
  );
}

export { RibbonBookmark };
