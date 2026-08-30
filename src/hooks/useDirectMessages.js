import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  setDoc,
  serverTimestamp,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export function useDirectMessages(activeChatId = null) {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Subscribe to all 1-on-1 chats user is part of
  useEffect(() => {
    if (!user) {
      setChats([]);
      setLoadingChats(false);
      return;
    }

    const chatsRef = collection(db, 'direct_chats');
    const q = query(chatsRef, where('participants', 'array-contains', user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setChats(list);
        setLoadingChats(false);
      },
      (err) => {
        console.warn('Error fetching direct chats:', err);
        setLoadingChats(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Subscribe to real-time messages of active chat
  useEffect(() => {
    if (!user || !activeChatId) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    setLoadingMessages(true);
    const messagesRef = collection(db, 'direct_chats', activeChatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setMessages(list);
        setLoadingMessages(false);
      },
      (err) => {
        console.warn('Error reading DM messages:', err);
        setLoadingMessages(false);
      }
    );

    return () => unsubscribe();
  }, [user, activeChatId]);

  // Send Direct Message
  const sendDirectMessage = async (chatId, text) => {
    if (!text.trim() || !user || !chatId) return;

    const messagesRef = collection(db, 'direct_chats', chatId, 'messages');
    await addDoc(messagesRef, {
      senderUid: user.uid,
      senderName: user.displayName || 'Antarang User',
      senderPhoto: user.photoURL || '',
      text: text.trim(),
      createdAt: serverTimestamp(),
    });

    const chatDocRef = doc(db, 'direct_chats', chatId);
    await setDoc(
      chatDocRef,
      {
        lastMessage: text.trim(),
        lastMessageAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  // Start or get 1-on-1 DM chat with another user
  const startDirectChat = async (targetUser) => {
    if (!user || !targetUser?.uid) return null;

    // Check if chat already exists
    const existing = chats.find((c) => c.participants?.includes(targetUser.uid));
    if (existing) {
      return existing.id;
    }

    // Create new chat room
    const chatsRef = collection(db, 'direct_chats');
    const docRef = await addDoc(chatsRef, {
      participants: [user.uid, targetUser.uid],
      participantProfiles: {
        [user.uid]: { displayName: user.displayName || 'You', photoURL: user.photoURL || '' },
        [targetUser.uid]: { displayName: targetUser.displayName || targetUser.authorName || 'Friend', photoURL: targetUser.photoURL || targetUser.authorPhoto || '' },
      },
      lastMessage: 'Chat started ❤️',
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });

    return docRef.id;
  };

  return {
    chats,
    messages,
    loadingChats,
    loadingMessages,
    sendDirectMessage,
    startDirectChat,
  };
}
