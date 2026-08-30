import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Icon from '@/components/ui/Icon';
import Button from '@/components/ui/Button';
import { useLock } from '@/hooks/useLock';

export default function LockScreen({ diary, onUnlock, onCancel }) {
  const diaryId = diary?.id;
  const lockType = diary?.lockType || 'pin';
  const lockHash = diary?.lockHash;
  const autoLockMinutes = diary?.autoLockMinutes;

  const { unlock } = useLock(diaryId);

  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake] = useState(0);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          setError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const handleFailedAttempt = useCallback((msg) => {
    setShake((prev) => prev + 1);
    setPin('');
    setFailedAttempts((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        setCooldownSeconds(30);
        setError('Too many failed attempts. Try again in 30s.');
      } else {
        setError(msg || (lockType === 'pin' ? 'Incorrect PIN' : 'Incorrect Password'));
      }
      return next;
    });
  }, [lockType]);

  const handleUnlockAttempt = useCallback(
    async (secret) => {
      if (cooldownSeconds > 0 || isSubmitting) return;
      setIsSubmitting(true);
      setError('');

      try {
        const success = await unlock(secret, lockType, lockHash, autoLockMinutes);
        if (success) {
          setFailedAttempts(0);
          onUnlock?.();
        } else {
          handleFailedAttempt(
            lockType === 'biometric'
              ? 'Biometric verification failed'
              : lockType === 'pin'
              ? 'Incorrect PIN'
              : 'Incorrect Password'
          );
        }
      } catch (err) {
        handleFailedAttempt('Verification failed. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [cooldownSeconds, isSubmitting, unlock, lockType, lockHash, autoLockMinutes, onUnlock, handleFailedAttempt]
  );

  // Keyboard navigation for PIN & Cancel
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel?.();
        return;
      }
      if (lockType === 'pin' && cooldownSeconds === 0) {
        if (/^[0-9]$/.test(e.key)) {
          setPin((prev) => (prev.length < 6 ? prev + e.key : prev));
          setError('');
        } else if (e.key === 'Backspace') {
          setPin((prev) => prev.slice(0, -1));
          setError('');
        } else if (e.key === 'Enter' && pin.length >= 4) {
          handleUnlockAttempt(pin);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lockType, cooldownSeconds, pin, handleUnlockAttempt, onCancel]);

  const handleKeypadPress = (num) => {
    if (cooldownSeconds > 0 || pin.length >= 6) return;
    setError('');
    const newPin = pin + num;
    setPin(newPin);
    // If PIN matches 4 to 6 digits, user can press unlock or it can auto-submit when max length
    if (newPin.length === 6) {
      handleUnlockAttempt(newPin);
    }
  };

  const handleBackspace = () => {
    if (cooldownSeconds > 0) return;
    setError('');
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-midnight/95 backdrop-blur-md p-4 sm:p-6 select-none font-sans text-cream"
      role="dialog"
      aria-modal="true"
      aria-label="Unlock diary"
    >
      {/* Top action bar */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          icon={<Icon name="chevron-left" size={20} />}
          aria-label="Go back"
        >
          Cancel
        </Button>
      </div>

      <motion.div
        key={shake}
        animate={shake > 0 ? { x: [-10, 10, -8, 8, -4, 4, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm flex flex-col items-center text-center"
      >
        {/* Lock Icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold mb-4 shadow-[0_0_25px_rgba(197,161,78,0.2)]">
          <Icon name="lock" size={32} />
        </div>

        {/* Diary Title */}
        <h2 className="font-serif text-2xl sm:text-3xl text-cream font-medium tracking-wide mb-1">
          {diary?.name || 'Protected Diary'}
        </h2>
        <p className="text-xs sm:text-sm text-cream/60 font-sans mb-6">
          {cooldownSeconds > 0
            ? `Too many failed attempts. Try again in ${cooldownSeconds}s`
            : lockType === 'pin'
            ? 'Enter your PIN to unlock'
            : lockType === 'password'
            ? 'Enter your password to unlock'
            : 'Authenticate using biometrics to unlock'}
        </p>

        {/* PIN Unlock View */}
        {lockType === 'pin' && (
          <div className="w-full flex flex-col items-center">
            {/* PIN Dots */}
            <div className="flex items-center justify-center gap-3 mb-6 h-8" aria-label={`PIN entered ${pin.length} digits`}>
              {[0, 1, 2, 3, 4, 5].map((idx) => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-200 border ${
                    idx < pin.length
                      ? 'bg-gold border-gold scale-110 shadow-[0_0_8px_rgba(197,161,78,0.6)]'
                      : 'bg-transparent border-gold/30 scale-100'
                  }`}
                />
              ))}
            </div>

            {/* Keypad Grid (3x4) */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full max-w-[260px] sm:max-w-[280px]">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <motion.button
                  key={num}
                  type="button"
                  whileTap={cooldownSeconds === 0 ? { scale: 0.92 } : undefined}
                  disabled={cooldownSeconds > 0 || isSubmitting}
                  onClick={() => handleKeypadPress(String(num))}
                  className="w-16 h-16 sm:w-18 sm:h-18 mx-auto rounded-full bg-midnight-light border border-gold/15 text-cream hover:bg-gold/20 hover:text-gold hover:border-gold/40 text-xl font-medium flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  aria-label={`Digit ${num}`}
                >
                  {num}
                </motion.button>
              ))}

              {/* Row 4: Clear / Submit / 0 / Backspace */}
              <motion.button
                type="button"
                whileTap={cooldownSeconds === 0 ? { scale: 0.92 } : undefined}
                disabled={cooldownSeconds > 0 || isSubmitting || pin.length === 0}
                onClick={() => setPin('')}
                className="w-16 h-16 sm:w-18 sm:h-18 mx-auto rounded-full bg-midnight-light/50 text-cream/70 hover:text-gold text-xs font-sans uppercase tracking-wider flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus:outline-none"
                aria-label="Clear PIN"
              >
                Clear
              </motion.button>

              <motion.button
                type="button"
                whileTap={cooldownSeconds === 0 ? { scale: 0.92 } : undefined}
                disabled={cooldownSeconds > 0 || isSubmitting}
                onClick={() => handleKeypadPress('0')}
                className="w-16 h-16 sm:w-18 sm:h-18 mx-auto rounded-full bg-midnight-light border border-gold/15 text-cream hover:bg-gold/20 hover:text-gold hover:border-gold/40 text-xl font-medium flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                aria-label="Digit 0"
              >
                0
              </motion.button>

              <motion.button
                type="button"
                whileTap={cooldownSeconds === 0 ? { scale: 0.92 } : undefined}
                disabled={cooldownSeconds > 0 || isSubmitting || pin.length === 0}
                onClick={handleBackspace}
                className="w-16 h-16 sm:w-18 sm:h-18 mx-auto rounded-full bg-midnight-light border border-gold/15 text-cream hover:bg-gold/20 hover:text-gold text-xl flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                aria-label="Backspace"
              >
                <Icon name="backspace" size={22} />
              </motion.button>
            </div>

            {pin.length >= 4 && (
              <div className="mt-5 w-full max-w-[260px] sm:max-w-[280px]">
                <Button
                  variant="primary"
                  size="md"
                  loading={isSubmitting}
                  disabled={cooldownSeconds > 0}
                  onClick={() => handleUnlockAttempt(pin)}
                  className="w-full shadow-lg"
                >
                  Unlock
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Password Unlock View */}
        {lockType === 'password' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUnlockAttempt(password);
            }}
            className="w-full space-y-4"
          >
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                disabled={cooldownSeconds > 0 || isSubmitting}
                placeholder="Enter password"
                autoFocus
                className="w-full bg-midnight-light border border-gold/30 rounded-lg px-4 py-3 text-cream placeholder-cream/30 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold text-sm pr-11 disabled:opacity-50"
                aria-label="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/50 hover:text-gold transition-colors p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} />
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isSubmitting}
              disabled={cooldownSeconds > 0 || !password}
              className="w-full shadow-lg"
            >
              Unlock Diary
            </Button>
          </form>
        )}

        {/* Biometric Unlock View */}
        {lockType === 'biometric' && (
          <div className="w-full flex flex-col items-center space-y-5">
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={cooldownSeconds > 0 || isSubmitting}
              onClick={() => handleUnlockAttempt()}
              className="w-24 h-24 rounded-full bg-midnight-light border-2 border-gold/40 text-gold flex items-center justify-center shadow-[0_0_30px_rgba(197,161,78,0.25)] hover:bg-gold/15 hover:border-gold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              aria-label="Authenticate with biometrics"
            >
              <Icon name="fingerprint" size={48} />
            </motion.button>

            <Button
              variant="secondary"
              size="md"
              loading={isSubmitting}
              disabled={cooldownSeconds > 0}
              onClick={() => handleUnlockAttempt()}
              icon={<Icon name="fingerprint" size={18} />}
            >
              Tap to Authenticate
            </Button>
          </div>
        )}

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 text-xs sm:text-sm text-wine-light font-sans"
              role="alert"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export { LockScreen };
