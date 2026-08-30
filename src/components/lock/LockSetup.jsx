import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Icon from '@/components/ui/Icon';
import { useLock } from '@/hooks/useLock';
import { useDiaries } from '@/hooks/useDiaries';
import { useAuth } from '@/contexts/AuthContext';
import { lockManager } from '@/lib/lockManager';

const AUTO_LOCK_OPTIONS = [
  { value: 1, label: '1 min' },
  { value: 5, label: '5 mins' },
  { value: 15, label: '15 mins' },
  { value: 30, label: '30 mins' },
  { value: 0, label: 'Never' },
];

export default function LockSetup({
  diary,
  isOpen = true,
  onClose,
  onCancel,
  onComplete,
  onSuccess,
  mode = 'setup',
}) {
  const { user } = useAuth();
  const { updateDiary } = useDiaries();
  const { biometricsAvailable } = useLock(diary?.id);

  const handleDismiss = () => {
    if (onClose) onClose();
    if (onCancel) onCancel();
  };

  const [step, setStep] = useState(1);
  const [lockType, setLockType] = useState('pin'); // 'pin' | 'password' | 'biometric'

  // PIN state
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // Password state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Biometric state
  const [bioRegistered, setBioRegistered] = useState(false);
  const [bioRegistering, setBioRegistering] = useState(false);

  // Step 3 auto-lock duration
  const [autoLockMinutes, setAutoLockMinutes] = useState(5);

  // UI state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setError('');
  }, [step, lockType]);

  const handleStep1Select = (type) => {
    if (type === 'biometric' && !biometricsAvailable) return;
    setLockType(type);
    setStep(2);
  };

  const handleStep2Next = async () => {
    setError('');

    if (lockType === 'pin') {
      if (!/^\d{4,6}$/.test(pin)) {
        setError('PIN must be between 4 and 6 digits.');
        return;
      }
      if (pin !== confirmPin) {
        setError('PINs do not match. Please verify and try again.');
        return;
      }
      setStep(3);
    } else if (lockType === 'password') {
      if (password.length < 4) {
        setError('Password must be at least 4 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please verify and try again.');
        return;
      }
      setStep(3);
    } else if (lockType === 'biometric') {
      if (!bioRegistered) {
        setError('Please register your biometric credential to continue.');
        return;
      }
      setStep(3);
    }
  };

  const handleRegisterBiometric = async () => {
    setError('');
    setBioRegistering(true);
    try {
      const success = await lockManager.registerBiometric(user?.uid, diary?.id);
      if (success) {
        setBioRegistered(true);
      } else {
        setError('Biometric registration was cancelled or not recognized.');
      }
    } catch {
      setError('An error occurred during biometric registration.');
    } finally {
      setBioRegistering(false);
    }
  };

  const handleFinalSave = async () => {
    if (!diary?.id) return;
    setLoading(true);
    setError('');

    try {
      let secretHash = '';
      if (lockType === 'pin') {
        secretHash = await lockManager.hashSecret(pin);
      } else if (lockType === 'password') {
        secretHash = await lockManager.hashSecret(password);
      }

      const updates = {
        lockEnabled: true,
        lockType,
        lockHash: secretHash,
        autoLockMinutes: Number(autoLockMinutes) || null,
      };

      await updateDiary(diary.id, updates);
      lockManager.unlock(diary.id, Number(autoLockMinutes) || null);
      onSuccess?.(updates);
      onComplete?.(updates);
      handleDismiss();
    } catch (err) {
      setError(err?.message || 'Failed to save privacy lock settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableLock = async () => {
    if (!diary?.id) return;
    setLoading(true);
    setError('');

    try {
      await updateDiary(diary.id, {
        lockEnabled: false,
        lockType: null,
        lockHash: null,
        autoLockMinutes: null,
      });
      lockManager.lock(diary.id);
      onSuccess?.({ lockEnabled: false });
      onComplete?.({ lockEnabled: false });
      handleDismiss();
    } catch (err) {
      setError(err?.message || 'Failed to remove privacy lock.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleDismiss}
      title="Privacy Lock Settings"
      size="md"
    >
      <div className="space-y-5">
        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b border-gold/10 pb-3">
          <div className="flex items-center space-x-2 text-xs font-sans text-cream/60">
            <span
              className={`px-2 py-0.5 rounded-full ${
                step === 1 ? 'bg-gold text-midnight font-bold' : 'bg-midnight-light text-cream/60'
              }`}
            >
              1
            </span>
            <span>Type</span>
            <span>/</span>
            <span
              className={`px-2 py-0.5 rounded-full ${
                step === 2 ? 'bg-gold text-midnight font-bold' : 'bg-midnight-light text-cream/60'
              }`}
            >
              2
            </span>
            <span>Passcode</span>
            <span>/</span>
            <span
              className={`px-2 py-0.5 rounded-full ${
                step === 3 ? 'bg-gold text-midnight font-bold' : 'bg-midnight-light text-cream/60'
              }`}
            >
              3
            </span>
            <span>Auto-Lock</span>
          </div>

          {diary?.lockEnabled && step === 1 && (
            <Button
              variant="danger"
              size="sm"
              loading={loading}
              onClick={handleDisableLock}
              icon={<Icon name="unlock" size={14} />}
            >
              Remove Lock
            </Button>
          )}
        </div>

        {/* Step 1: Choose Lock Type */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            className="space-y-4"
          >
            <p className="text-xs sm:text-sm text-cream/70 font-sans">
              Choose how you would like to protect <span className="text-gold font-medium">"{diary?.name}"</span>:
            </p>

            <div className="grid grid-cols-1 gap-3">
              {/* PIN Card */}
              <button
                type="button"
                onClick={() => handleStep1Select('pin')}
                className={`p-4 rounded-xl border text-left flex items-start space-x-3.5 transition-all cursor-pointer ${
                  lockType === 'pin'
                    ? 'border-gold bg-gold/10 ring-1 ring-gold/40'
                    : 'border-gold/20 bg-midnight-light/60 hover:border-gold/40 hover:bg-gold/5'
                }`}
              >
                <div className="p-2.5 rounded-lg bg-gold/15 text-gold shrink-0 mt-0.5">
                  <Icon name="pin" size={20} />
                </div>
                <div>
                  <h3 className="font-serif text-base text-cream font-medium">PIN Code</h3>
                  <p className="text-xs text-cream/60 font-sans mt-0.5">
                    Fast 4 to 6 digit numeric code. Ideal for quick keypad entry.
                  </p>
                </div>
              </button>

              {/* Password Card */}
              <button
                type="button"
                onClick={() => handleStep1Select('password')}
                className={`p-4 rounded-xl border text-left flex items-start space-x-3.5 transition-all cursor-pointer ${
                  lockType === 'password'
                    ? 'border-gold bg-gold/10 ring-1 ring-gold/40'
                    : 'border-gold/20 bg-midnight-light/60 hover:border-gold/40 hover:bg-gold/5'
                }`}
              >
                <div className="p-2.5 rounded-lg bg-gold/15 text-gold shrink-0 mt-0.5">
                  <Icon name="key" size={20} />
                </div>
                <div>
                  <h3 className="font-serif text-base text-cream font-medium">Password</h3>
                  <p className="text-xs text-cream/60 font-sans mt-0.5">
                    Secure alphanumeric password with minimum 4 characters.
                  </p>
                </div>
              </button>

              {/* Biometric Card */}
              <button
                type="button"
                disabled={!biometricsAvailable}
                onClick={() => handleStep1Select('biometric')}
                className={`p-4 rounded-xl border text-left flex items-start space-x-3.5 transition-all ${
                  !biometricsAvailable
                    ? 'opacity-40 cursor-not-allowed border-white/5 bg-midnight-light/30'
                    : lockType === 'biometric'
                    ? 'border-gold bg-gold/10 ring-1 ring-gold/40 cursor-pointer'
                    : 'border-gold/20 bg-midnight-light/60 hover:border-gold/40 hover:bg-gold/5 cursor-pointer'
                }`}
              >
                <div className="p-2.5 rounded-lg bg-gold/15 text-gold shrink-0 mt-0.5">
                  <Icon name="fingerprint" size={20} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-serif text-base text-cream font-medium">Biometric</h3>
                    {!biometricsAvailable && (
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/10 text-cream/50">
                        Unavailable
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-cream/60 font-sans mt-0.5">
                    {biometricsAvailable
                      ? 'Fast unlock via Touch ID, Face ID, or Windows Hello.'
                      : 'WebAuthn platform authenticator not available on this device.'}
                  </p>
                </div>
              </button>
            </div>
            <div className="flex justify-end pt-2 border-t border-gold/10">
              <Button variant="ghost" size="sm" onClick={handleDismiss}>
                Cancel
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Configure Secrets */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            className="space-y-4"
          >
            {lockType === 'pin' && (
              <div className="space-y-4">
                <Input
                  label="Enter 4-6 Digit PIN"
                  type="password"
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 1234"
                  autoFocus
                />
                <Input
                  label="Confirm PIN"
                  type="password"
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Re-enter your PIN"
                />
              </div>
            )}

            {lockType === 'password' && (
              <div className="space-y-4">
                <div className="relative">
                  <Input
                    label="Enter Password (min 4 chars)"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3.5 top-3.5 text-cream/50 hover:text-gold transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} />
                  </button>
                </div>

                <div className="relative">
                  <Input
                    label="Confirm Password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                  />
                </div>
              </div>
            )}

            {lockType === 'biometric' && (
              <div className="flex flex-col items-center justify-center p-6 bg-midnight-light/40 rounded-xl border border-gold/20 space-y-4 text-center">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center border transition-all ${
                    bioRegistered
                      ? 'bg-gold/20 border-gold text-gold shadow-[0_0_20px_rgba(197,161,78,0.3)]'
                      : 'bg-midnight-light border-gold/30 text-cream/60'
                  }`}
                >
                  <Icon name={bioRegistered ? 'shield-check' : 'fingerprint'} size={32} />
                </div>

                <div>
                  <h4 className="font-serif text-base text-cream font-medium">
                    {bioRegistered ? 'Biometrics Enrolled' : 'Register Biometrics'}
                  </h4>
                  <p className="text-xs text-cream/60 font-sans mt-1 max-w-xs">
                    {bioRegistered
                      ? 'Your device authenticator is registered for this diary.'
                      : 'Click below to register your biometric credential with WebAuthn.'}
                  </p>
                </div>

                {!bioRegistered && (
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={bioRegistering}
                    onClick={handleRegisterBiometric}
                    icon={<Icon name="fingerprint" size={16} />}
                  >
                    Authenticate with Device
                  </Button>
                )}
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleStep2Next}
                disabled={lockType === 'biometric' && !bioRegistered}
              >
                Next
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Auto-Lock Duration Picker & Confirmation */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            className="space-y-5"
          >
            <div>
              <label className="block text-xs font-medium text-cream/80 uppercase tracking-wider mb-2 font-sans">
                Auto-Lock Inactivity Duration
              </label>
              <p className="text-xs text-cream/60 font-sans mb-3">
                Automatically lock this diary after a set period of inactivity:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AUTO_LOCK_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAutoLockMinutes(opt.value)}
                    className={`py-2 px-3 rounded-lg border text-xs font-sans font-medium transition-all cursor-pointer ${
                      autoLockMinutes === opt.value
                        ? 'border-gold bg-gold text-midnight font-bold shadow-[0_0_10px_rgba(197,161,78,0.3)]'
                        : 'border-gold/20 bg-midnight-light/60 text-cream/80 hover:border-gold/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Confirmation Summary Box */}
            <div className="p-3.5 rounded-lg bg-midnight-light/60 border border-gold/15 text-xs text-cream/70 space-y-1.5 font-sans">
              <div className="flex justify-between">
                <span>Diary:</span>
                <span className="text-cream font-medium">{diary?.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Lock Type:</span>
                <span className="text-gold font-medium uppercase">{lockType}</span>
              </div>
              <div className="flex justify-between">
                <span>Auto-Lock:</span>
                <span className="text-cream">
                  {AUTO_LOCK_OPTIONS.find((o) => o.value === autoLockMinutes)?.label}
                </span>
              </div>
            </div>

            {/* Final Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                variant="primary"
                size="md"
                loading={loading}
                onClick={handleFinalSave}
                icon={<Icon name="lock" size={16} />}
              >
                Enable Privacy Lock
              </Button>
            </div>
          </motion.div>
        )}

        {/* Error message display */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-wine-light font-sans"
              role="alert"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}

export { LockSetup };
