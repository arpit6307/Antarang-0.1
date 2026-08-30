import React from 'react';

export default function Footer({ className = '', ...props }) {
  return (
    <footer
      className={`w-full py-6 px-4 flex items-center justify-center gap-1.5 font-serif text-xs sm:text-sm text-gold/70 select-none ${className}`}
      {...props}
    >
      <span>Developed with</span>
      <svg
        className="w-3.5 h-3.5 text-wine-light fill-wine-light inline-block shrink-0 transition-transform duration-300 hover:scale-125"
        viewBox="0 0 24 24"
        fill="currentColor"
        stroke="none"
        aria-label="love"
        role="img"
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
      <span>by Arpit Singh Yadav</span>
    </footer>
  );
}

export { Footer };
