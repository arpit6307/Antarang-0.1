// Manages which diaries are currently unlocked in this session
// Uses sessionStorage so locks reset when tab/browser closes

const UNLOCK_KEY_PREFIX = 'antarang_unlock_';
const AUTO_LOCK_TIMERS = {};

export const lockManager = {
  // Check if a diary is currently unlocked
  isUnlocked(diaryId) {
    if (!diaryId) return false;
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return sessionStorage.getItem(`${UNLOCK_KEY_PREFIX}${diaryId}`) === 'true';
      }
    } catch {
      // Fallback if sessionStorage is inaccessible
    }
    return false;
  },

  // Unlock a diary for this session
  unlock(diaryId, autoLockMinutes = null) {
    if (!diaryId) return;
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(`${UNLOCK_KEY_PREFIX}${diaryId}`, 'true');
      }
    } catch {
      // Fallback
    }
    
    // Clear any existing auto-lock timer
    if (AUTO_LOCK_TIMERS[diaryId]) {
      clearTimeout(AUTO_LOCK_TIMERS[diaryId]);
      delete AUTO_LOCK_TIMERS[diaryId];
    }
    
    // Set auto-lock timer if specified
    if (autoLockMinutes && Number(autoLockMinutes) > 0) {
      AUTO_LOCK_TIMERS[diaryId] = setTimeout(() => {
        this.lock(diaryId);
      }, Number(autoLockMinutes) * 60 * 1000);
    }
  },

  // Lock a diary
  lock(diaryId) {
    if (!diaryId) return;
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem(`${UNLOCK_KEY_PREFIX}${diaryId}`);
      }
    } catch {
      // Fallback
    }
    if (AUTO_LOCK_TIMERS[diaryId]) {
      clearTimeout(AUTO_LOCK_TIMERS[diaryId]);
      delete AUTO_LOCK_TIMERS[diaryId];
    }
  },

  // Lock all diaries
  lockAll() {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        Object.keys(sessionStorage)
          .filter(key => key.startsWith(UNLOCK_KEY_PREFIX))
          .forEach(key => sessionStorage.removeItem(key));
      }
    } catch {
      // Fallback
    }
    Object.keys(AUTO_LOCK_TIMERS).forEach(id => {
      clearTimeout(AUTO_LOCK_TIMERS[id]);
      delete AUTO_LOCK_TIMERS[id];
    });
  },

  // Hash a PIN/password using SHA-256 (for storing in Firestore)
  async hashSecret(secret) {
    if (secret === undefined || secret === null) return '';
    const encoder = new TextEncoder();
    const data = encoder.encode(String(secret));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // Verify a PIN/password against stored hash
  async verifySecret(secret, storedHash) {
    if (!storedHash) return false;
    const hash = await this.hashSecret(secret);
    return hash === storedHash;
  },

  // Check if biometrics are available on this device
  async isBiometricsAvailable() {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) return false;
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  },

  // Register biometric credential for a diary
  async registerBiometric(userId, diaryId) {
    if (typeof window === 'undefined' || !navigator.credentials) return false;
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userIdBytes = new TextEncoder().encode(userId || 'antarang-user');
    
    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'Antarang Diary' },
          user: {
            id: userIdBytes,
            name: `diary-${diaryId}`,
            displayName: 'Antarang User',
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },
            { alg: -257, type: 'public-key' },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        },
      });
      
      if (credential && credential.id) {
        localStorage.setItem(`antarang_bio_${diaryId}`, credential.id);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  // Verify biometric for a diary
  async verifyBiometric(diaryId) {
    if (typeof window === 'undefined' || !navigator.credentials) return false;
    const credId = localStorage.getItem(`antarang_bio_${diaryId}`);
    if (!credId) return false;
    
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    
    try {
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{
            id: Uint8Array.from(atob(credId.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
            type: 'public-key',
          }],
          userVerification: 'required',
          timeout: 60000,
        },
      });
      return !!assertion;
    } catch {
      return false;
    }
  },
};

export default lockManager;
