import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  deleteField,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export function useSocialFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [followingMap, setFollowingMap] = useState({});
  const [followersMap, setFollowersMap] = useState({});
  const [friendsMap, setFriendsMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Subscribe to real-time posts feed
  useEffect(() => {
    let unsubscribed = false;
    const postsRef = collection(db, 'posts');
    const q = query(postsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (unsubscribed) return;
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setPosts(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Error loading social feed:', err);
        if (!unsubscribed) setLoading(false);
      }
    );

    return () => {
      unsubscribed = true;
      unsubscribe();
    };
  }, []);

  // Listen to user following, followers, and friends map
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFollowingMap(data.following || {});
        setFollowersMap(data.followers || {});
        setFriendsMap(data.friends || {});
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Create new Post (Photo or Pick-up line)
  const createPost = async ({ content, imageUrl = '', type = 'thought', tag = 'general' }) => {
    if (!user || (!content.trim() && !imageUrl)) return;

    const postsRef = collection(db, 'posts');
    await addDoc(postsRef, {
      authorUid: user.uid,
      authorName: user.displayName || 'Antarang Writer',
      authorPhoto: user.photoURL || '',
      content: content.trim(),
      imageUrl,
      type,
      tag,
      likes: {},
      likeCount: 0,
      comments: [],
      createdAt: serverTimestamp(),
    });
  };

  // Toggle Like on a Post
  const toggleLike = async (postId, currentLikes = {}) => {
    if (!user || !postId) return;
    const isLiked = Boolean(currentLikes[user.uid]);
    const postRef = doc(db, 'posts', postId);

    const updatedLikes = { ...currentLikes };
    if (isLiked) {
      delete updatedLikes[user.uid];
    } else {
      updatedLikes[user.uid] = true;
    }

    const likeCount = Object.keys(updatedLikes).length;

    await updateDoc(postRef, {
      likes: updatedLikes,
      likeCount,
    });
  };

  // Add Comment to a Post
  const addComment = async (postId, commentText) => {
    if (!user || !postId || !commentText.trim()) return;
    const postRef = doc(db, 'posts', postId);

    const newComment = {
      id: Date.now().toString(),
      authorUid: user.uid,
      authorName: user.displayName || 'Antarang Writer',
      authorPhoto: user.photoURL || '',
      text: commentText.trim(),
      createdAt: new Date().toISOString(),
    };

    await updateDoc(postRef, {
      comments: arrayUnion(newComment),
    });
  };

  // Follow / Unfollow user (updates both following and target's followers)
  const toggleFollowUser = async (targetUid, targetName = '', targetPhoto = '') => {
    if (!user || !targetUid || user.uid === targetUid) return;
    const isFollowing = Boolean(followingMap[targetUid]);
    const userRef = doc(db, 'users', user.uid);
    const targetUserRef = doc(db, 'users', targetUid);

    const updatedFollowing = { ...followingMap };

    if (isFollowing) {
      delete updatedFollowing[targetUid];
      setFollowingMap(updatedFollowing);

      await setDoc(userRef, { following: updatedFollowing }, { merge: true });

      try {
        await updateDoc(targetUserRef, {
          [`followers.${user.uid}`]: deleteField(),
        });
      } catch (_) {}
    } else {
      const followData = {
        uid: targetUid,
        displayName: targetName || 'Writer',
        photoURL: targetPhoto || '',
        followedAt: new Date().toISOString(),
      };
      updatedFollowing[targetUid] = followData;
      setFollowingMap(updatedFollowing);

      await setDoc(userRef, { following: updatedFollowing }, { merge: true });

      try {
        await setDoc(
          targetUserRef,
          {
            followers: {
              [user.uid]: {
                uid: user.uid,
                displayName: user.displayName || 'Writer',
                photoURL: user.photoURL || '',
                followedAt: new Date().toISOString(),
              },
            },
          },
          { merge: true }
        );
      } catch (_) {}
    }
  };

  return {
    posts,
    followingMap,
    followersMap,
    friendsMap,
    loading,
    createPost,
    toggleLike,
    addComment,
    toggleFollowUser,
  };
}
