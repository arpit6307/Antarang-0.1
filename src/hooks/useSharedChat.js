import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export function useSharedChat(diaryOwnerUid, diaryId) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const targetOwnerUid = diaryOwnerUid || user?.uid;

  useEffect(() => {
    if (!user || !diaryId || !targetOwnerUid) {
      setLoading(false);
      return;
    }

    let unsubscribed = false;
    const messagesRef = collection(db, 'users', targetOwnerUid, 'diaries', diaryId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (unsubscribed) return;
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setMessages(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Error reading chat messages:', err);
        setLoading(false);
      }
    );

    return () => {
      unsubscribed = true;
      unsubscribe();
    };
  }, [user, diaryId, targetOwnerUid]);

  const sendMessage = async (text) => {
    if (!text.trim() || !user || !diaryId || !targetOwnerUid) return;

    const messagesRef = collection(db, 'users', targetOwnerUid, 'diaries', diaryId, 'messages');
    await addDoc(messagesRef, {
      senderUid: user.uid,
      senderName: user.displayName || 'Co-Author',
      senderPhoto: user.photoURL || '',
      text: text.trim(),
      createdAt: serverTimestamp(),
    });
  };

  return { messages, sendMessage, loading, unreadCount };
}
