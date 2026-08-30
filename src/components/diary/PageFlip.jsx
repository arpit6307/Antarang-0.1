import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function PageFlip({ children, pageKey, direction = 'forward', onNext, onPrev }) {
  const variants = {
    enter: (dir) => ({
      rotateY: dir === 'forward' ? 90 : -90,
      opacity: 0,
      scale: 0.95,
      transformOrigin: dir === 'forward' ? 'left center' : 'right center',
    }),
    center: {
      rotateY: 0,
      opacity: 1,
      scale: 1,
      transformOrigin: 'center',
    },
    exit: (dir) => ({
      rotateY: dir === 'forward' ? -90 : 90,
      opacity: 0,
      scale: 0.95,
      transformOrigin: dir === 'forward' ? 'right center' : 'left center',
    }),
  };

  const handlePanEnd = (event, info) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    if (offset < -50 || velocity < -500) {
      if (onNext) onNext();
    } else if (offset > 50 || velocity > 500) {
      if (onPrev) onPrev();
    }
  };

  return (
    <div className="w-full h-full relative" style={{ perspective: 1200 }}>
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={pageKey}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            type: 'spring',
            stiffness: 100,
            damping: 20,
            mass: 1,
          }}
          onPanEnd={handlePanEnd}
          className="absolute inset-0 w-full h-full touch-pan-y"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
