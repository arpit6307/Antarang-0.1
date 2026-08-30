import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
    scale: 0.96,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: (direction) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
    scale: 0.96,
    transition: {
      duration: 0.25,
      ease: [0.7, 0, 0.84, 0],
    },
  }),
};

export default function OnboardingTour({ isOpen = true, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();

  if (!isOpen) return null;

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      if (user?.uid) {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, { onboardingCompleted: true }, { merge: true });
      }
    } catch (err) {
      console.error('Error updating onboarding status in Firestore:', err);
    } finally {
      setIsSaving(false);
      onComplete?.();
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleDotClick = (index) => {
    if (index === currentStep) return;
    setDirection(index > currentStep ? 1 : -1);
    setCurrentStep(index);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-midnight/90 backdrop-blur-md font-sans select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Antarang Onboarding Tour"
    >
      <div className="relative w-full max-w-xl bg-midnight-light border border-gold/25 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-6 sm:p-10 flex flex-col items-center text-center overflow-hidden">
        {/* Top subtle decorative pattern */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold to-transparent" />

        {/* Step Carousel Body */}
        <div className="w-full min-h-[380px] flex flex-col items-center justify-center relative">
          <AnimatePresence custom={direction} mode="wait">
            {currentStep === 0 && (
              <motion.div
                key="step-0"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full flex flex-col items-center"
              >
                <div className="w-20 h-20 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold mb-6 shadow-[0_0_25px_rgba(197,161,78,0.2)]">
                  <Icon name="quill" size={38} strokeWidth={1.5} />
                </div>
                <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-gold mb-2 tracking-wide">
                  Welcome to Antarang
                </h2>
                <p className="font-serif italic text-gold-light/90 text-lg mb-4">
                  अंतरंग — a diary as close as your own heart
                </p>
                <p className="font-sans text-cream/70 text-sm sm:text-base max-w-md leading-relaxed">
                  Your private, beautiful space for uncensored reflections, memories, dreams, and life
                  chronicles crafted with timeless aesthetic care.
                </p>
              </motion.div>
            )}

            {currentStep === 1 && (
              <motion.div
                key="step-1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full flex flex-col items-center"
              >
                <div className="w-20 h-20 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold mb-6 shadow-[0_0_25px_rgba(197,161,78,0.2)]">
                  <Icon name="book" size={38} strokeWidth={1.5} />
                </div>
                <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-gold mb-2">
                  Organize Your Worlds
                </h2>
                <p className="font-sans text-cream/70 text-sm sm:text-base mb-6 max-w-md">
                  Create unlimited diaries for different parts of your life. Keep thoughts distinct and organized.
                </p>
                <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                  <div className="bg-midnight border border-gold/20 p-3 rounded-xl flex items-center gap-2.5 text-left">
                    <div className="w-8 h-8 rounded-lg bg-wine/60 text-gold flex items-center justify-center shrink-0">
                      <Icon name="heart-outline" size={18} />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-cream">Personal & Love</span>
                  </div>
                  <div className="bg-midnight border border-gold/20 p-3 rounded-xl flex items-center gap-2.5 text-left">
                    <div className="w-8 h-8 rounded-lg bg-midnight-lighter text-gold flex items-center justify-center shrink-0">
                      <Icon name="moon" size={18} />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-cream">Night Thoughts</span>
                  </div>
                  <div className="bg-midnight border border-gold/20 p-3 rounded-xl flex items-center gap-2.5 text-left">
                    <div className="w-8 h-8 rounded-lg bg-emerald-950 text-gold flex items-center justify-center shrink-0">
                      <Icon name="camera" size={18} />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-cream">Travel Chronicles</span>
                  </div>
                  <div className="bg-midnight border border-gold/20 p-3 rounded-xl flex items-center gap-2.5 text-left">
                    <div className="w-8 h-8 rounded-lg bg-purple-950 text-gold flex items-center justify-center shrink-0">
                      <Icon name="streak" size={18} />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-cream">Ideas & Work</span>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step-2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full flex flex-col items-center"
              >
                <div className="w-20 h-20 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold mb-6 shadow-[0_0_25px_rgba(197,161,78,0.2)]">
                  <Icon name="edit" size={36} strokeWidth={1.5} />
                </div>
                <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-gold mb-2">
                  Write With Real-Diary Feel
                </h2>
                <p className="font-sans text-cream/70 text-sm sm:text-base mb-6 max-w-md">
                  Experience a warm paper surface engineered for deep reflection and expressive journaling.
                </p>
                <div className="flex flex-col gap-2.5 w-full max-w-sm text-left text-xs sm:text-sm text-cream/80 bg-midnight/60 p-4 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <Icon name="check" size={16} className="text-gold shrink-0" />
                    <span>Realistic page-flip navigation transitions</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Icon name="check" size={16} className="text-gold shrink-0" />
                    <span>TipTap rich text formatting & mood tracking</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Icon name="check" size={16} className="text-gold shrink-0" />
                    <span>Instant background autosave & photo attachments</span>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step-3"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full flex flex-col items-center"
              >
                <div className="w-20 h-20 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold mb-6 shadow-[0_0_25px_rgba(197,161,78,0.2)]">
                  <Icon name="shield" size={38} strokeWidth={1.5} />
                </div>
                <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-gold mb-2">
                  Unhackable Privacy
                </h2>
                <p className="font-sans text-cream/70 text-sm sm:text-base mb-6 max-w-md">
                  Lock any diary individually with a PIN, password, or device biometrics. Your secrets stay yours alone.
                </p>
                <div className="flex justify-center gap-4 w-full max-w-xs text-center">
                  <div className="flex-1 p-3 rounded-xl bg-midnight border border-gold/20 flex flex-col items-center gap-1.5">
                    <Icon name="key" size={20} className="text-gold" />
                    <span className="text-xs text-cream/80">PIN Lock</span>
                  </div>
                  <div className="flex-1 p-3 rounded-xl bg-midnight border border-gold/20 flex flex-col items-center gap-1.5">
                    <Icon name="lock" size={20} className="text-gold" />
                    <span className="text-xs text-cream/80">Password</span>
                  </div>
                  <div className="flex-1 p-3 rounded-xl bg-midnight border border-gold/20 flex flex-col items-center gap-1.5">
                    <Icon name="fingerprint" size={20} className="text-gold" />
                    <span className="text-xs text-cream/80">Biometrics</span>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div
                key="step-4"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full flex flex-col items-center"
              >
                <div className="w-20 h-20 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold mb-6 shadow-[0_0_25px_rgba(197,161,78,0.2)]">
                  <Icon name="sparkles" size={38} strokeWidth={1.5} />
                </div>
                <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-gold mb-2">
                  Ready to Begin?
                </h2>
                <p className="font-serif italic text-gold-light/90 text-base sm:text-lg mb-6">
                  Your blank pages are waiting for today's thoughts.
                </p>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleFinish}
                    loading={isSaving}
                    className="w-full justify-center shadow-lg"
                  >
                    Create My First Diary
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleFinish}
                    disabled={isSaving}
                    className="text-cream/50 hover:text-cream"
                  >
                    Skip Tour
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation & Dots */}
        <div className="w-full flex items-center justify-between mt-8 pt-6 border-t border-gold/15">
          {currentStep > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              icon={<Icon name="chevron-left" size={18} />}
              aria-label="Previous step"
            >
              Back
            </Button>
          ) : (
            <div className="w-16" />
          )}

          {/* Progress Dots */}
          <div className="flex items-center gap-2">
            {[0, 1, 2, 3, 4].map((stepIdx) => (
              <button
                key={stepIdx}
                type="button"
                onClick={() => handleDotClick(stepIdx)}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  currentStep === stepIdx
                    ? 'w-6 bg-gold shadow-[0_0_8px_rgba(197,161,78,0.5)]'
                    : 'w-2 bg-cream/20 hover:bg-cream/40'
                }`}
                aria-label={`Go to slide ${stepIdx + 1}`}
              />
            ))}
          </div>

          {currentStep < 4 ? (
            <Button
              variant="primary"
              size="sm"
              onClick={handleNext}
              className="flex-row-reverse"
              icon={<Icon name="chevron-right" size={18} />}
              aria-label="Next step"
            >
              Next
            </Button>
          ) : (
            <div className="w-16" />
          )}
        </div>
      </div>
    </div>
  );
}

export { OnboardingTour };
