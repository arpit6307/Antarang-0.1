import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  collectionGroup,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  deleteField,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export const useDiaries = () => {
  const { user } = useAuth();
  const [diaries, setDiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unsubscribed = false;
    let unsubscribeOwned = null;

    if (!user) {
      setDiaries([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Single direct real-time listener on user's diaries subcollection
    const ownedRef = collection(db, 'users', user.uid, 'diaries');
    const ownedQuery = query(ownedRef, orderBy('createdAt', 'desc'));

    try {
      unsubscribeOwned = onSnapshot(
        ownedQuery,
        (snapshot) => {
          if (unsubscribed) return;
          const items = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              ownerUid: data.ownerUid || user.uid,
              isOwner: (data.ownerUid || user.uid) === user.uid,
              ...data,
            };
          });
          setDiaries(items);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.warn('Error fetching user diaries:', err);
          if (!unsubscribed) setLoading(false);
        }
      );
    } catch (err) {
      console.warn('Error setting up diaries listener:', err);
      if (!unsubscribed) setLoading(false);
    }

    return () => {
      unsubscribed = true;
      if (unsubscribeOwned) {
        try {
          unsubscribeOwned();
        } catch (_) {}
      }
    };
  }, [user]);

  const createDiary = useCallback(
    async ({ name, coverColor = '#5B1A2A', icon = 'book', description = '', ...rest }) => {
      if (!user) throw new Error('User must be authenticated to create a diary');

      const diariesRef = collection(db, 'users', user.uid, 'diaries');
      const newDiaryData = {
        name,
        coverColor,
        icon,
        description,
        entryCount: 0,
        ownerUid: user.uid,
        collaboratorUids: [user.uid],
        collaboratorProfiles: {
          [user.uid]: {
            uid: user.uid,
            displayName: user.displayName || 'Owner',
            photoURL: user.photoURL || '',
            role: 'owner',
            joinedAt: new Date().toISOString(),
          },
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...rest,
      };

      const docRef = await addDoc(diariesRef, newDiaryData);
      return { id: docRef.id, ...newDiaryData };
    },
    [user]
  );

  const updateDiary = useCallback(
    async (diaryId, updates, targetOwnerUid = null) => {
      if (!user) throw new Error('User must be authenticated to update a diary');
      if (!diaryId) throw new Error('Diary ID is required');

      const ownerUid = targetOwnerUid || user.uid;
      const ownerDiaryRef = doc(db, 'users', ownerUid, 'diaries', diaryId);
      
      const payload = {
        ...updates,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(ownerDiaryRef, payload);

      // Sync to all joined collaborators' mirror docs if available
      try {
        const ownerSnap = await getDoc(ownerDiaryRef);
        if (ownerSnap.exists()) {
          const ownerData = ownerSnap.data();
          const collaborators = ownerData.collaboratorUids || [];
          const syncPromises = collaborators.map(async (collabUid) => {
            if (collabUid !== ownerUid) {
              const collabRef = doc(db, 'users', collabUid, 'diaries', diaryId);
              try {
                await setDoc(
                  collabRef,
                  {
                    id: diaryId,
                    ownerUid: ownerUid,
                    isShared: true,
                    isJoinedShared: true,
                    name: ownerData.name,
                    coverColor: ownerData.coverColor,
                    icon: ownerData.icon,
                    description: ownerData.description || '',
                    inviteCode: ownerData.inviteCode || '',
                    collaboratorUids: ownerData.collaboratorUids || [],
                    collaboratorProfiles: ownerData.collaboratorProfiles || {},
                    entryCount: ownerData.entryCount || 0,
                    updatedAt: serverTimestamp(),
                  },
                  { merge: true }
                );
              } catch (_) {}
            }
          });
          await Promise.all(syncPromises);
        }
      } catch (_) {}
    },
    [user]
  );

  const deleteDiary = useCallback(
    async (diaryId) => {
      if (!user) throw new Error('User must be authenticated to delete a diary');
      if (!diaryId) throw new Error('Diary ID is required');

      const entriesRef = collection(db, 'users', user.uid, 'diaries', diaryId, 'entries');
      const entriesSnap = await getDocs(entriesRef);

      const batch = writeBatch(db);
      entriesSnap.forEach((entryDoc) => {
        batch.delete(entryDoc.ref);
      });

      const diaryRef = doc(db, 'users', user.uid, 'diaries', diaryId);
      batch.delete(diaryRef);

      await batch.commit();
    },
    [user]
  );

  const getDiary = useCallback(
    async (diaryId, targetOwnerUid = null) => {
      if (!user) throw new Error('User must be authenticated to fetch a diary');
      if (!diaryId) throw new Error('Diary ID is required');

      const ownerUid = targetOwnerUid || user.uid;
      const diaryRef = doc(db, 'users', ownerUid, 'diaries', diaryId);
      const docSnap = await getDoc(diaryRef);

      if (!docSnap.exists()) {
        return null;
      }

      return {
        id: docSnap.id,
        ownerUid,
        ...docSnap.data(),
      };
    },
    [user]
  );

  const joinSharedDiaryByCode = useCallback(
    async (code) => {
      if (!user) throw new Error('User must be authenticated');
      const cleanCode = code.trim().toUpperCase();
      if (!cleanCode) return { success: false, error: 'Please enter a valid invite code.' };

      try {
        let foundOwnerUid = null;
        let foundDiaryId = null;
        let foundDiaryName = 'Shared Duo Journal';
        let targetDocRef = null;

        // 1. Check top-level invite_codes lookup doc
        try {
          const codeDocSnap = await getDoc(doc(db, 'invite_codes', cleanCode));
          if (codeDocSnap.exists()) {
            const data = codeDocSnap.data();
            foundOwnerUid = data.ownerUid;
            foundDiaryId = data.diaryId;
            foundDiaryName = data.diaryName || 'Shared Duo Journal';
            targetDocRef = doc(db, 'users', foundOwnerUid, 'diaries', foundDiaryId);
          }
        } catch (_) {}

        // 2. Fallback: Search across collectionGroup for inviteCode
        if (!targetDocRef) {
          try {
            const groupQuery = query(collectionGroup(db, 'diaries'), where('inviteCode', '==', cleanCode));
            const querySnap = await getDocs(groupQuery);

            if (!querySnap.empty) {
              const targetDoc = querySnap.docs[0];
              targetDocRef = targetDoc.ref;
              foundDiaryId = targetDoc.id;
              foundDiaryName = targetDoc.data().name || 'Shared Duo Journal';

              const pathParts = targetDoc.ref.path.split('/');
              if (pathParts.length >= 4 && pathParts[0] === 'users') {
                foundOwnerUid = pathParts[1];
              }
            }
          } catch (_) {}
        }

        if (!targetDocRef) {
          return { success: false, error: 'Invite code not found. Check the code and try again.' };
        }

        // 3. Update target owner diary document with User B's profile
        await updateDoc(targetDocRef, {
          isShared: true,
          collaboratorUids: arrayUnion(user.uid),
          [`collaboratorProfiles.${user.uid}`]: {
            uid: user.uid,
            displayName: user.displayName || 'Partner',
            photoURL: user.photoURL || '',
            role: 'member',
            joinedAt: new Date().toISOString(),
          },
        });

        // 4. Fetch updated owner diary document to sync mirror doc
        const updatedOwnerSnap = await getDoc(targetDocRef);
        const ownerData = updatedOwnerSnap.data();

        // 5. Write mirror shared diary document directly to User B's bookshelf subcollection
        const userBDiaryRef = doc(db, 'users', user.uid, 'diaries', foundDiaryId);
        await setDoc(userBDiaryRef, {
          id: foundDiaryId,
          ownerUid: foundOwnerUid,
          isShared: true,
          isJoinedShared: true,
          name: ownerData.name || foundDiaryName,
          coverColor: ownerData.coverColor || '#5B1A2A',
          icon: ownerData.icon || 'book',
          description: ownerData.description || '',
          inviteCode: cleanCode,
          collaboratorUids: ownerData.collaboratorUids || [foundOwnerUid, user.uid],
          collaboratorProfiles: ownerData.collaboratorProfiles || {},
          entryCount: ownerData.entryCount || 0,
          createdAt: ownerData.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // 6. Record joined code in User B's profile doc
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(
          userDocRef,
          {
            joinedCodes: {
              [cleanCode]: {
                code: cleanCode,
                ownerUid: foundOwnerUid,
                diaryId: foundDiaryId,
                diaryName: foundDiaryName,
                joinedAt: new Date().toISOString(),
              },
            },
          },
          { merge: true }
        );

        // 7. Also sync updated collaborator profiles to all existing collaborators
        try {
          const allCollabs = ownerData.collaboratorUids || [];
          const updatePromises = allCollabs.map(async (cUid) => {
            if (cUid !== foundOwnerUid) {
              await setDoc(
                doc(db, 'users', cUid, 'diaries', foundDiaryId),
                {
                  collaboratorUids: ownerData.collaboratorUids,
                  collaboratorProfiles: ownerData.collaboratorProfiles,
                  updatedAt: serverTimestamp(),
                },
                { merge: true }
              );
            }
          });
          await Promise.all(updatePromises);
        } catch (_) {}

        return { success: true, diaryName: ownerData.name || foundDiaryName };
      } catch (err) {
        console.error('Error joining shared diary:', err);
        return { success: false, error: 'Failed to join diary. Please try again.' };
      }
    },
    [user]
  );

  const removeCollaborator = useCallback(
    async (diaryId, targetUid, targetOwnerUid = null) => {
      if (!user) throw new Error('User must be authenticated');
      if (!diaryId || !targetUid) return;

      const ownerUid = targetOwnerUid || user.uid;
      const ownerDiaryRef = doc(db, 'users', ownerUid, 'diaries', diaryId);

      // 1. Remove target user from owner's document
      await updateDoc(ownerDiaryRef, {
        collaboratorUids: arrayRemove(targetUid),
        [`collaboratorProfiles.${targetUid}`]: deleteField(),
      });

      // 2. Delete mirror document from target user's bookshelf
      try {
        await deleteDoc(doc(db, 'users', targetUid, 'diaries', diaryId));
      } catch (_) {}

      // 3. Update remaining collaborators' mirror docs
      try {
        const ownerSnap = await getDoc(ownerDiaryRef);
        if (ownerSnap.exists()) {
          const ownerData = ownerSnap.data();
          const remainingCollabs = ownerData.collaboratorUids || [];
          const updatePromises = remainingCollabs.map(async (cUid) => {
            if (cUid !== ownerUid) {
              await setDoc(
                doc(db, 'users', cUid, 'diaries', diaryId),
                {
                  collaboratorUids: ownerData.collaboratorUids,
                  collaboratorProfiles: ownerData.collaboratorProfiles,
                  updatedAt: serverTimestamp(),
                },
                { merge: true }
              );
            }
          });
          await Promise.all(updatePromises);
        }
      } catch (_) {}
    },
    [user]
  );

  const leaveSharedDiary = useCallback(
    async (diaryId, ownerUid, code = null) => {
      if (!user || !diaryId || !ownerUid) return;
      try {
        const ownerDiaryRef = doc(db, 'users', ownerUid, 'diaries', diaryId);

        // 1. Remove current user from owner's document
        await updateDoc(ownerDiaryRef, {
          collaboratorUids: arrayRemove(user.uid),
          [`collaboratorProfiles.${user.uid}`]: deleteField(),
        });

        // 2. Delete mirror document from current user's bookshelf
        await deleteDoc(doc(db, 'users', user.uid, 'diaries', diaryId));

        if (code) {
          const userDocRef = doc(db, 'users', user.uid);
          await updateDoc(userDocRef, {
            [`joinedCodes.${code}`]: deleteField(),
          });
        }
      } catch (err) {
        console.error('Error leaving shared diary:', err);
      }
    },
    [user]
  );

  return {
    diaries,
    loading,
    error,
    createDiary,
    updateDiary,
    deleteDiary,
    getDiary,
    joinSharedDiaryByCode,
    removeCollaborator,
    leaveSharedDiary,
  };
};

export default useDiaries;
