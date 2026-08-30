import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Icon from '@/components/ui/Icon';

export default function CustomDropdown({
  label,
  value,
  onChange,
  options = [],
  icon = null,
  placeholder = 'Select option...',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) =>
    typeof opt === 'string' ? opt === value : opt.value === value
  );

  const selectedLabel = typeof selectedOption === 'string'
    ? selectedOption
    : selectedOption?.label || value || placeholder;

  const handleSelect = (optValue) => {
    onChange(optValue);
    setIsOpen(false);
  };

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-serif font-bold tracking-wider text-midnight uppercase mb-1.5 flex items-center gap-1.5">
          {icon && <Icon name={icon} size={14} className="text-gold" />}
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 rounded-xl text-sm font-sans font-medium bg-midnight/5 border border-gold/25 text-midnight hover:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold flex items-center justify-between transition-all cursor-pointer shadow-sm"
      >
        <span className="truncate flex items-center gap-2">
          {selectedLabel}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-gold ml-2 flex-shrink-0"
        >
          <Icon name="chevron-left" size={16} className="-rotate-90" />
        </motion.span>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.ul
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-50 w-full mt-1 bg-white border border-gold/30 rounded-xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto"
          >
            {options.map((option, idx) => {
              const val = typeof option === 'string' ? option : option.value;
              const lbl = typeof option === 'string' ? option : option.label;
              const optIcon = typeof option === 'object' ? option.icon : null;
              const isSelected = val === value;

              return (
                <li key={idx}>
                  <button
                    type="button"
                    onClick={() => handleSelect(val)}
                    className={`w-full px-4 py-2.5 text-xs sm:text-sm font-sans text-left flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-gold/15 text-midnight font-semibold'
                        : 'text-midnight/80 hover:bg-gold/10 hover:text-midnight'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      {optIcon && <Icon name={optIcon} size={14} className="text-gold" />}
                      {lbl}
                    </span>
                    {isSelected && (
                      <Icon name="check" size={14} className="text-gold flex-shrink-0" />
                    )}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
