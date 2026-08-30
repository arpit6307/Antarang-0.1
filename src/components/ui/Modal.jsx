import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import Icon from '@/components/ui/Icon';

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (typeof document === 'undefined') {
    return null;
  }

  const modalSize = sizeMap[size] || sizeMap.md;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={title || 'Modal dialog'}
        >
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-midnight/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal Dialog Card */}
          <motion.div
            className={`relative w-full ${modalSize} rounded-2xl bg-midnight-light border border-gold/20 shadow-[0_10px_40px_rgba(0,0,0,0.5)] p-6 sm:p-8 z-10 font-sans text-cream overflow-hidden`}
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gold/10">
              {title ? (
                <h2 className="text-xl sm:text-2xl font-serif font-medium text-gold">
                  {title}
                </h2>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-cream/50 hover:text-gold hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold cursor-pointer ml-auto"
                aria-label="Close modal"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="text-cream/90 text-sm leading-relaxed">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export { Modal };
