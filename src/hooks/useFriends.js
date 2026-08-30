import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';

export function useFriends() {
  const { user } = useAuth();
  const { sendNotification } = useNotifications();

  const [allUsers, setAllUsers] = useState([]);
  const [friendsMap, setFriendsMap] = useState({});
  const [sentRequestsMap, setSentRequestsMap] = useState({});
  const [loading, setLoading] = useState(false);

  // Load current user's friends and sent requests status
  const loadUserFriendships = useCallback(async () => {
    if (!user) return;
    try {
      const userDocSnap = await getDoc(doc(db, 'users', user.uid));
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        setFriendsMap(data.friends || {});
        setSentRequestsMap(data.sentRequests || {});
      }
    } catch (err) {
      console.warn('Error loading user friendships:', err);
    }
  }, [user]);

  useEffect(() => {
    loadUserFriendships();
  }, [loadUserFriendships]);

  // Fetch all users for search
  const searchUsers = useCallback(
    async (queryText = '') => {
      if (!user) return [];
      setLoading(true);
      try {
        const usersRef = collection(db, 'users');
        const snap = await getDocs(query(usersRef));

        const list = snap.docs
          .map((d) => ({
            uid: d.id,
            ...d.data(),
          }))
          .filter((u) => u.uid !== user.uid);

        setAllUsers(list);

        if (!queryText.trim()) return list;

        const term = queryText.toLowerCase().trim();
        return list.filter((u) => {
          const nameMatch = u.displayName?.toLowerCase().includes(term);
          const emailMatch = u.email?.toLowerCase().includes(term);
          return nameMatch || emailMatch;
        });
      } catch (err) {
        console.error('Error searching users:', err);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  // Send a Friend Request to target user
  const sendFriendRequest = useCallback(
    async (targetUser) => {
      if (!user || !targetUser || !targetUser.uid) return { success: false };

      try {
        // 1. Record sent request in current user's profile
        const myUserRef = doc(db, 'users', user.uid);
        await setDoc(
          myUserRef,
          {
            sentRequests: {
              [targetUser.uid]: {
                targetUid: targetUser.uid,
                targetName: targetUser.displayName || 'Writer',
                targetPhoto: targetUser.photoURL || '',
                sentAt: new Date().toISOString(),
              },
            },
          },
          { merge: true }
        );

        setSentRequestsMap((prev) => ({
          ...prev,
          [targetUser.uid]: { targetUid: targetUser.uid, sentAt: new Date().toISOString() },
        }));

        // 2. Send Friend Request notification to target user
        await sendNotification(targetUser.uid, {
          type: 'friend_request',
          title: 'New Friend Request!',
          message: `${user.displayName || 'An Antarang Writer'} sent you a friend request.`,
        });

        return { success: true };
      } catch (err) {
        console.error('Error sending friend request:', err);
        return { success: false, error: 'Failed to send request.' };
      }
    },
    [user, sendNotification]
  );

  return {
    allUsers,
    friendsMap,
    sentRequestsMap,
    loading,
    searchUsers,
    sendFriendRequest,
    reloadFriendships: loadUserFriendships,
  };
}
