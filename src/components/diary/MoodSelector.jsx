import React from 'react';

const MOODS = [
  {
    id: 'happy',
    label: 'Happy',
    icon: (
      <svg viewBox="0 0 20 20" stroke="currentColor" fill="none" className="w-5 h-5" strokeWidth="1.5">
        <circle cx="10" cy="10" r="8" />
        <path d="M7 12c1 1.5 5 1.5 6 0" strokeLinecap="round" />
        <circle cx="7" cy="7.5" r="1" fill="currentColor" stroke="none" />
        <circle cx="13" cy="7.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    )
  },
  {
    id: 'calm',
    label: 'Calm',
    icon: (
      <svg viewBox="0 0 20 20" stroke="currentColor" fill="none" className="w-5 h-5" strokeWidth="1.5">
        <path d="M3 10c2-3 4-3 6 0s4 3 6 0" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 14c2-3 4-3 6 0s4 3 6 0" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    id: 'sad',
    label: 'Sad',
    icon: (
      <svg viewBox="0 0 20 20" stroke="currentColor" fill="none" className="w-5 h-5" strokeWidth="1.5">
        <circle cx="10" cy="10" r="8" />
        <path d="M7 13c1-1.5 5-1.5 6 0" strokeLinecap="round" />
        <circle cx="7" cy="8" r="1" fill="currentColor" stroke="none" />
        <circle cx="13" cy="8" r="1" fill="currentColor" stroke="none" />
      </svg>
    )
  },
  {
    id: 'anxious',
    label: 'Anxious',
    icon: (
      <svg viewBox="0 0 20 20" stroke="currentColor" fill="none" className="w-5 h-5" strokeWidth="1.5">
        <path d="M10 4a6 6 0 016 6c0 4-2 6-6 6s-6-2-6-6a5 5 0 015-5c2 0 4 1 4 3s-1 3-3 3" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'grateful',
    label: 'Grateful',
    icon: (
      <svg viewBox="0 0 20 20" stroke="currentColor" fill="none" className="w-5 h-5" strokeWidth="1.5">
        <path d="M10 18v-8M7 13l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 8c0-3 2.5-4 5-4s5 1 5 4-2 6-5 6" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'loved',
    label: 'Loved',
    icon: (
      <svg viewBox="0 0 20 20" stroke="currentColor" fill="none" className="w-5 h-5" strokeWidth="1.5">
        <path d="M10 17.5l-1.5-1.5C5 12.5 3 10 3 7.5c0-2.5 2-4.5 4.5-4.5 1.5 0 3 .5 3.5 1.5.5-1 2-1.5 3.5-1.5 2.5 0 4.5 2 4.5 4.5 0 2.5-2 5-5.5 8.5L10 17.5z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 5l1-1M17 7l1.5-.5" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'angry',
    label: 'Angry',
    icon: (
      <svg viewBox="0 0 20 20" stroke="currentColor" fill="none" className="w-5 h-5" strokeWidth="1.5">
        <path d="M10 4c-3 0-5 2-5 5 0 1.5.5 3 2 4l-1 4 3-1 2 2 4-5-2-4c2-1 2-3 2-5 0-3-2-5-5-5z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 11l2-3-2-1 1-3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    id: 'thoughtful',
    label: 'Thoughtful',
    icon: (
      <svg viewBox="0 0 20 20" stroke="currentColor" fill="none" className="w-5 h-5" strokeWidth="1.5">
        <path d="M7 16h6M8 18h4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 14c-3 0-4-3-4-5a4 4 0 118 0c0 2-1 5-4 5z" strokeLinecap="round" />
        <path d="M10 5v2" strokeLinecap="round" />
      </svg>
    )
  }
];

export default function MoodSelector({ selected, onSelect, className = '' }) {
  return (
    <div className={`overflow-x-auto pb-2 scrollbar-hide ${className}`}>
      <div className="flex gap-2">
        {MOODS.map(mood => {
          const isSelected = selected === mood.id;
          return (
            <button
              key={mood.id}
              onClick={() => onSelect(isSelected ? null : mood.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 border ${
                isSelected 
                  ? 'bg-gold text-midnight border-gold scale-105' 
                  : 'bg-midnight-light text-cream border-cream/20 hover:border-cream/40'
              }`}
              aria-label={`Mood: ${mood.label}`}
              aria-pressed={isSelected}
            >
              {mood.icon}
              <span className="font-sans text-sm font-medium">{mood.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
