import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export const useEntries = (diaryId, targetOwnerUid = null) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const ownerUid = targetOwnerUid || user?.uid;

  useEffect(() => {
    let unsubscribed = false;
    let unsubscribeStream = null;

    if (!user || !diaryId || !ownerUid) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const entriesRef = collection(db, 'users', ownerUid, 'diaries', diaryId, 'entries');
    const q = query(entriesRef, orderBy('createdAt', 'desc'));

    try {
      unsubscribeStream = onSnapshot(
        q,
        (snapshot) => {
          if (unsubscribed) return;
          const items = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }));
          setEntries(items);
          setLoading(false);
          setError(null);
        },
        () => {
          if (unsubscribed) return;
          getDocs(q)
            .then((snap) => {
              if (unsubscribed) return;
              const fallbackItems = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
              setEntries(fallbackItems);
            })
            .catch(() => {
              if (unsubscribed) return;
              setEntries([]);
            })
            .finally(() => {
              if (!unsubscribed) setLoading(false);
            });
        }
      );
    } catch (_) {
      if (!unsubscribed) {
        setLoading(false);
        setEntries([]);
      }
    }

    return () => {
      unsubscribed = true;
      if (unsubscribeStream) {
        try {
          unsubscribeStream();
        } catch (_) {}
      }
    };
  }, [user, diaryId, ownerUid]);

  const addEntry = useCallback(
    async ({ title = '', content = '', mood = null, photoUrls = [], tags = [], ...rest }) => {
      if (!user) throw new Error('User must be authenticated to create an entry');
      if (!diaryId || !ownerUid) throw new Error('Diary ID is required');

      const entriesRef = collection(db, 'users', ownerUid, 'diaries', diaryId, 'entries');
      const diaryRef = doc(db, 'users', ownerUid, 'diaries', diaryId);

      const newEntryData = {
        title,
        content,
        mood,
        photoUrls,
        tags,
        authorUid: user.uid,
        authorName: user.displayName || 'Writer',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...rest,
      };

      const docRef = await addDoc(entriesRef, newEntryData);

      try {
        await updateDoc(diaryRef, {
          entryCount: increment(1),
          updatedAt: serverTimestamp(),
        });
      } catch (_) {}

      return { id: docRef.id, ...newEntryData };
    },
    [user, diaryId, ownerUid]
  );

  const updateEntry = useCallback(
    async (entryId, updates) => {
      if (!user) throw new Error('User must be authenticated to update an entry');
      if (!diaryId || !entryId || !ownerUid) throw new Error('Diary ID and Entry ID are required');

      const entryRef = doc(db, 'users', ownerUid, 'diaries', diaryId, 'entries', entryId);
      await updateDoc(entryRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    },
    [user, diaryId, ownerUid]
  );

  const deleteEntry = useCallback(
    async (entryId) => {
      if (!user) throw new Error('User must be authenticated to delete an entry');
      if (!diaryId || !entryId || !ownerUid) throw new Error('Diary ID and Entry ID are required');

      const entryRef = doc(db, 'users', ownerUid, 'diaries', diaryId, 'entries', entryId);
      const diaryRef = doc(db, 'users', ownerUid, 'diaries', diaryId);

      await deleteDoc(entryRef);

      try {
        await updateDoc(diaryRef, {
          entryCount: increment(-1),
          updatedAt: serverTimestamp(),
        });
      } catch (_) {}
    },
    [user, diaryId, ownerUid]
  );

  return {
    entries,
    loading,
    error,
    addEntry,
    createEntry: addEntry,
    updateEntry,
    deleteEntry,
  };
};

export default useEntries;
