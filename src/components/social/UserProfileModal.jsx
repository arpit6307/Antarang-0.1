import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { motion } from 'motion/react';
import { db } from '@/lib/firebase';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { useAuth } from '@/contexts/AuthContext';
import { useSocialFeed } from '@/hooks/useSocialFeed';
import { useFriends } from '@/hooks/useFriends';
import { useNavigate } from 'react-router-dom';

export default function UserProfileModal({ isOpen, onClose, targetUser, targetUid }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { followingMap, toggleFollowUser, toggleLike } = useSocialFeed();
  const { friendsMap, sentRequestsMap, sendFriendRequest } = useFriends();

  const uid = targetUid || targetUser?.uid || targetUser?.authorUid;

  const [profileData, setProfileData] = useState(targetUser || null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingRequest, setSendingRequest] = useState(false);

  useEffect(() => {
    if (!isOpen || !uid) return;

    let isMounted = true;
    setLoading(true);

    async function loadUserProfileAndPosts() {
      try {
        // 1. Fetch user doc details
        const userDocSnap = await getDoc(doc(db, 'users', uid));
        let uData = targetUser || {};
        if (userDocSnap.exists()) {
          uData = { uid, ...userDocSnap.data() };
        }

        if (isMounted) setProfileData(uData);

        // 2. Fetch user's public posts
        const postsRef = collection(db, 'posts');
        const q = query(postsRef, where('authorUid', '==', uid), orderBy('createdAt', 'desc'));
        const postsSnap = await getDocs(q);

        const list = postsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        if (isMounted) setUserPosts(list);
      } catch (err) {
        console.warn('Error loading user profile modal:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadUserProfileAndPosts();

    return () => {
      isMounted = false;
    };
  }, [isOpen, uid, targetUser]);

  if (!isOpen || !uid) return null;

  const isMe = user?.uid === uid;
  const isFollowing = Boolean(followingMap[uid]);
  const isFriend = Boolean(friendsMap[uid]);
  const isRequestSent = Boolean(sentRequestsMap[uid]);

  const displayName = profileData?.displayName || targetUser?.displayName || targetUser?.authorName || 'Antarang Writer';
  const photoURL = profileData?.photoURL || targetUser?.photoURL || targetUser?.authorPhoto || '';
  const email = profileData?.email || '';
  const bio = profileData?.bio || '';

  const followingCount = Object.keys(profileData?.following || {}).length;
  const followersCount = Object.keys(profileData?.followers || {}).length;

  const handleSendRequest = async () => {
    setSendingRequest(true);
    try {
      await sendFriendRequest({ uid, displayName, photoURL });
    } finally {
      setSendingRequest(false);
    }
  };

  const handleStartDM = () => {
    onClose();
    navigate('/messages', {
      state: {
        activeChatId: null,
        targetUser: { uid, displayName, photoURL },
      },
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Writer Profile Card">
      <div className="space-y-5 font-sans">
        {/* Cover & Profile Header Card */}
        <div className="relative rounded-2xl overflow-hidden border border-gold/30 shadow-md bg-gradient-to-br from-midnight via-midnight-light to-midnight text-cream p-5 text-center space-y-3">
          <div className="relative mx-auto w-20 h-20 rounded-full overflow-hidden border-2 border-gold shadow-lg bg-gold/20 flex items-center justify-center font-serif text-2xl font-bold text-gold">
            {photoURL ? (
              <img src={photoURL} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span>{displayName?.[0] || 'W'}</span>
            )}
          </div>

          <div>
            <h3 className="font-serif text-xl font-bold text-gold flex items-center justify-center gap-1.5">
              <span>{displayName}</span>
              {isFriend && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/40 font-serif font-bold">
                  Friend
                </span>
              )}
            </h3>
            {email && <p className="text-xs text-cream/70 font-mono mt-0.5">{email}</p>}
            {bio && <p className="text-xs text-cream/90 italic mt-2 max-w-sm mx-auto leading-relaxed">"{bio}"</p>}
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gold/20 text-center">
            <div className="bg-gold/10 p-2 rounded-xl border border-gold/20">
              <span className="font-serif text-base font-bold text-gold block leading-tight">{userPosts.length}</span>
              <span className="text-[9px] uppercase font-serif text-cream/70 font-bold">Posts</span>
            </div>
            <div className="bg-gold/10 p-2 rounded-xl border border-gold/20">
              <span className="font-serif text-base font-bold text-gold block leading-tight">{followingCount}</span>
              <span className="text-[9px] uppercase font-serif text-cream/70 font-bold">Following</span>
            </div>
            <div className="bg-gold/10 p-2 rounded-xl border border-gold/20">
              <span className="font-serif text-base font-bold text-gold block leading-tight">{followersCount}</span>
              <span className="text-[9px] uppercase font-serif text-cream/70 font-bold">Followers</span>
            </div>
          </div>

          {/* Action Buttons for non-self writers */}
          {!isMe && (
            <div className="flex items-center gap-2 pt-2">
              {isFriend ? (
                <span className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-serif font-bold text-xs flex items-center justify-center gap-1.5">
                  <Icon name="check-circle" size={14} />
                  <span>Connected Friend</span>
                </span>
              ) : isRequestSent ? (
                <span className="flex-1 py-2 px-3 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/40 font-serif font-bold text-xs flex items-center justify-center gap-1.5">
                  <Icon name="clock" size={14} />
                  <span>Request Sent</span>
                </span>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  loading={sendingRequest}
                  onClick={handleSendRequest}
                  icon={<Icon name="user-plus" size={14} />}
                  className="flex-1 text-xs py-2"
                >
                  Add Friend
                </Button>
              )}

              <Button
                type="button"
                variant={isFollowing ? 'outline' : 'primary'}
                size="sm"
                onClick={() => toggleFollowUser(uid, displayName, photoURL)}
                className={`flex-1 text-xs py-2 ${
                  isFollowing ? 'border-gold/40 text-cream hover:bg-gold/10' : ''
                }`}
              >
                {isFollowing ? 'Following ✓' : '+ Follow'}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleStartDM}
                icon={<Icon name="message-square" size={14} />}
                className="text-xs py-2 border-gold/30 text-cream hover:bg-gold/15"
              >
                DM
              </Button>
            </div>
          )}
        </div>

        {/* Writer's Recent Whispers & Posts */}
        <div className="space-y-3">
          <h4 className="font-serif text-sm font-bold text-midnight flex items-center gap-1.5 border-b border-gold/15 pb-2">
            <Icon name="sparkles" size={16} className="text-gold" />
            <span>Recent Posts ({userPosts.length})</span>
          </h4>

          {loading ? (
            <div className="py-8 text-center text-xs font-serif text-ink-muted">Loading posts...</div>
          ) : userPosts.length === 0 ? (
            <div className="py-8 text-center text-xs font-serif text-ink-muted bg-cream/30 rounded-xl border border-gold/10 p-4">
              This writer has not posted any public whispers yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {userPosts.map((post) => {
                const isLiked = Boolean(post.likes?.[user?.uid]);

                return (
                  <div key={post.id} className="p-3 rounded-xl bg-white border border-gold/20 shadow-xs space-y-2 text-xs">
                    {post.content && (
                      <p className="font-serif text-midnight font-medium leading-relaxed bg-cream/40 p-2.5 rounded-lg border border-gold/10">
                        "{post.content}"
                      </p>
                    )}

                    {post.imageUrl && (
                      <div className="rounded-lg overflow-hidden border border-gold/20 max-h-36">
                        <img src={post.imageUrl} alt="Post attachment" className="w-full h-full object-cover" />
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-ink-muted pt-1">
                      <span className="font-mono text-gold font-bold">#{post.tag || 'antarang'}</span>
                      <button
                        type="button"
                        onClick={() => toggleLike(post.id, post.likes)}
                        className={`flex items-center gap-1 font-serif px-2 py-0.5 rounded-full border cursor-pointer ${
                          isLiked ? 'bg-rose-50 text-rose-600 border-rose-300 font-bold' : 'bg-cream text-midnight/70 border-gold/20'
                        }`}
                      >
                        <Icon name="sparkles" size={12} className={isLiked ? 'text-rose-500' : 'text-gold'} />
                        <span>{post.likeCount || 0} Sparks</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
