import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    let unsubscribed = false;
    const notifsRef = collection(db, 'users', user.uid, 'notifications');
    const q = query(notifsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (unsubscribed) return;
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setNotifications(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Error reading notifications:', err);
        if (!unsubscribed) setLoading(false);
      }
    );

    return () => {
      unsubscribed = true;
      unsubscribe();
    };
  }, [user]);

  const sendNotification = useCallback(
    async (recipientUid, notifData) => {
      if (!user || !recipientUid) return;
      try {
        const notifsRef = collection(db, 'users', recipientUid, 'notifications');
        await addDoc(notifsRef, {
          senderUid: user.uid,
          senderName: user.displayName || 'Antarang Writer',
          senderPhoto: user.photoURL || '',
          read: false,
          createdAt: serverTimestamp(),
          ...notifData,
        });
      } catch (err) {
        console.error('Error sending notification:', err);
      }
    },
    [user]
  );

  const markAsRead = useCallback(
    async (notifId) => {
      if (!user || !notifId) return;
      try {
        const notifRef = doc(db, 'users', user.uid, 'notifications', notifId);
        await updateDoc(notifRef, { read: true });
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    },
    [user]
  );

  const markAllAsRead = useCallback(async () => {
    if (!user || notifications.length === 0) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach((n) => {
        if (!n.read) {
          const ref = doc(db, 'users', user.uid, 'notifications', n.id);
          batch.update(ref, { read: true });
        }
      });
      await batch.commit();
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }, [user, notifications]);

  const acceptFriendRequest = useCallback(
    async (notif) => {
      if (!user || !notif || !notif.senderUid) return;
      try {
        const friendDataForMe = {
          uid: notif.senderUid,
          displayName: notif.senderName || 'Friend',
          photoURL: notif.senderPhoto || '',
          since: new Date().toISOString(),
        };

        const friendDataForSender = {
          uid: user.uid,
          displayName: user.displayName || 'Friend',
          photoURL: user.photoURL || '',
          since: new Date().toISOString(),
        };

        // 1. Update friends, following, and followers on current user doc
        const myUserRef = doc(db, 'users', user.uid);
        await setDoc(
          myUserRef,
          {
            friends: {
              [notif.senderUid]: friendDataForMe,
            },
            following: {
              [notif.senderUid]: friendDataForMe,
            },
            followers: {
              [notif.senderUid]: friendDataForMe,
            },
          },
          { merge: true }
        );

        // 2. Update friends, following, and followers on sender user doc
        const senderUserRef = doc(db, 'users', notif.senderUid);
        await setDoc(
          senderUserRef,
          {
            friends: {
              [user.uid]: friendDataForSender,
            },
            following: {
              [user.uid]: friendDataForSender,
            },
            followers: {
              [user.uid]: friendDataForSender,
            },
          },
          { merge: true }
        );

        // 3. Send confirmation notification to sender
        await sendNotification(notif.senderUid, {
          type: 'friend_accepted',
          title: 'Friend Request Accepted!',
          message: `${user.displayName || 'Writer'} accepted your friend request. You are now friends!`,
        });

        // 4. Delete the notification
        const notifRef = doc(db, 'users', user.uid, 'notifications', notif.id);
        await deleteDoc(notifRef);
      } catch (err) {
        console.error('Error accepting friend request:', err);
      }
    },
    [user, sendNotification]
  );

  const declineFriendRequest = useCallback(
    async (notifId) => {
      if (!user || !notifId) return;
      try {
        const notifRef = doc(db, 'users', user.uid, 'notifications', notifId);
        await deleteDoc(notifRef);
      } catch (err) {
        console.error('Error declining friend request:', err);
      }
    },
    [user]
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    loading,
    unreadCount,
    sendNotification,
    markAsRead,
    markAllAsRead,
    acceptFriendRequest,
    declineFriendRequest,
  };
}
