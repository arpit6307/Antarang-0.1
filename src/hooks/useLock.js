import { useState, useCallback, useEffect } from 'react';
import { lockManager } from '@/lib/lockManager';

export function useLock(diaryId) {
  const [isUnlocked, setIsUnlocked] = useState(() => lockManager.isUnlocked(diaryId));
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);

  useEffect(() => {
    setIsUnlocked(lockManager.isUnlocked(diaryId));
  }, [diaryId]);

  useEffect(() => {
    let mounted = true;
    lockManager.isBiometricsAvailable().then((available) => {
      if (mounted) {
        setBiometricsAvailable(available);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const unlock = useCallback(async (secret, lockType, lockHash, autoLockMinutes) => {
    if (lockType === 'biometric') {
      const success = await lockManager.verifyBiometric(diaryId);
      if (success) {
        lockManager.unlock(diaryId, autoLockMinutes);
        setIsUnlocked(true);
        return true;
      }
      return false;
    }
    
    // PIN or password
    const valid = await lockManager.verifySecret(secret, lockHash);
    if (valid) {
      lockManager.unlock(diaryId, autoLockMinutes);
      setIsUnlocked(true);
      return true;
    }
    return false;
  }, [diaryId]);

  const lock = useCallback(() => {
    lockManager.lock(diaryId);
    setIsUnlocked(false);
  }, [diaryId]);

  return { isUnlocked, unlock, lock, biometricsAvailable };
}

export default useLock;
