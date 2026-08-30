import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

const DEBOUNCE_MS = 1500;

export const useAutosave = (entryId, content, diaryId) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [error, setError] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  const timeoutRef = useRef(null);
  const isInitialMount = useRef(true);
  const latestContentRef = useRef(content);
  const latestEntryIdRef = useRef(entryId);
  const latestDiaryIdRef = useRef(diaryId);
  const lastSavedContentRef = useRef(null);

  // Keep refs up-to-date
  latestContentRef.current = content;
  latestEntryIdRef.current = entryId;
  latestDiaryIdRef.current = diaryId;

  const getStorageKey = useCallback((dId, eId) => {
    return `antarang_draft_${dId || 'temp'}_${eId || 'temp'}`;
  }, []);

  const saveToFirestore = useCallback(
    async (targetContent, targetEntryId, targetDiaryId) => {
      if (!user || !targetDiaryId || !targetEntryId) return;

      try {
        setSaving(true);
        setError(null);

        const entryRef = doc(db, 'users', user.uid, 'diaries', targetDiaryId, 'entries', targetEntryId);
        const diaryRef = doc(db, 'users', user.uid, 'diaries', targetDiaryId);

        const payload =
          typeof targetContent === 'object' && targetContent !== null && !Array.isArray(targetContent)
            ? { ...targetContent, updatedAt: serverTimestamp() }
            : { content: targetContent, updatedAt: serverTimestamp() };

        await updateDoc(entryRef, payload);

        // Also touch diary's updatedAt
        try {
          await updateDoc(diaryRef, { updatedAt: serverTimestamp() });
        } catch {
          // Ignore diary update error if non-fatal
        }

        const now = new Date();
        setLastSaved(now);
        lastSavedContentRef.current = JSON.stringify(targetContent);
        setIsDirty(false);
      } catch (err) {
        console.error('Autosave failed:', err);
        setError(err);
      } finally {
        setSaving(false);
      }
    },
    [user]
  );

  // Force immediate flush of pending changes
  const flush = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (latestEntryIdRef.current && latestDiaryIdRef.current && latestContentRef.current !== undefined) {
      await saveToFirestore(
        latestContentRef.current,
        latestEntryIdRef.current,
        latestDiaryIdRef.current
      );
    }
  }, [saveToFirestore]);

  // Clear offline draft from localStorage
  const clearDraft = useCallback(() => {
    if (latestDiaryIdRef.current && latestEntryIdRef.current) {
      const key = getStorageKey(latestDiaryIdRef.current, latestEntryIdRef.current);
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('Could not clear local draft:', e);
      }
    }
  }, [getStorageKey]);

  // Main autosave watcher
  useEffect(() => {
    // Skip first mount if content is just initializing
    if (isInitialMount.current) {
      isInitialMount.current = false;
      lastSavedContentRef.current = JSON.stringify(content);
      return;
    }

    if (!entryId || !diaryId || content === undefined) return;

    const contentString = JSON.stringify(content);
    if (contentString === lastSavedContentRef.current) {
      return;
    }

    setIsDirty(true);

    // Save locally to localStorage as instant offline backup
    const draftKey = getStorageKey(diaryId, entryId);
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({
          content,
          savedAt: new Date().toISOString(),
        })
      );
    } catch (e) {
      console.warn('LocalStorage draft backup failed:', e);
    }

    // Clear previous debounce timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Schedule debounced Firestore save
    timeoutRef.current = setTimeout(() => {
      saveToFirestore(content, entryId, diaryId);
    }, DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content, entryId, diaryId, getStorageKey, saveToFirestore]);

  // Flush pending changes on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      const currentContentStr = JSON.stringify(latestContentRef.current);
      if (
        latestEntryIdRef.current &&
        latestDiaryIdRef.current &&
        latestContentRef.current !== undefined &&
        currentContentStr !== lastSavedContentRef.current
      ) {
        // Trigger save directly with latest refs
        saveToFirestore(
          latestContentRef.current,
          latestEntryIdRef.current,
          latestDiaryIdRef.current
        );
      }
    };
  }, [saveToFirestore]);

  return {
    saving,
    lastSaved,
    isDirty,
    error,
    flush,
    clearDraft,
  };
};

export default useAutosave;
