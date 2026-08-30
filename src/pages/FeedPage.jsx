import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/Icon';
import Button from '@/components/ui/Button';
import { useSocialFeed } from '@/hooks/useSocialFeed';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { useAuth } from '@/contexts/AuthContext';
import { uploadToCloudinary } from '@/lib/cloudinary';
import FollowersModal from '@/components/social/FollowersModal';
import UserProfileModal from '@/components/social/UserProfileModal';

const PICKUP_LINE_TEMPLATES = [
  'Are you a camera? Because every time I look at you, I smile.',
  'Is your name Google? Because you have everything I have been searching for.',
  'Do you have a map? I keep getting lost in your eyes.',
  'If beauty were a grain of sand, you would be a thousand beaches.',
  'Are you made of copper and tellurium? Because you are CuTe.',
  'Is it hot in here, or is it just the spark between us?',
];

export default function FeedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    posts,
    followingMap,
    followersMap,
    friendsMap,
    loading,
    createPost,
    toggleLike,
    addComment,
    toggleFollowUser,
  } = useSocialFeed();
  const { startDirectChat } = useDirectMessages();

  const [activeTab, setActiveTab] = useState('explore');
  const [postText, setPostText] = useState('');
  const [postTag, setPostTag] = useState('pickup-line');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  // Modals state
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [selectedProfileUid, setSelectedProfileUid] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Comment state per post
  const [openCommentPostId, setOpenCommentPostId] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});
  const [submittingCommentPostId, setSubmittingCommentPostId] = useState(null);

  // Share toast state
  const [copiedPostId, setCopiedPostId] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleTemplateClick = (line) => {
    setPostText(line);
    setPostTag('pickup-line');
  };

  const handleSubmitPost = async (e) => {
    e.preventDefault();
    if (!postText.trim() && !imageFile) return;

    setIsPosting(true);
    try {
      let imageUrl = '';
      if (imageFile) {
        imageUrl = await uploadToCloudinary(imageFile);
      }

      await createPost({
        content: postText,
        imageUrl,
        type: imageFile ? 'photo' : 'pickup_line',
        tag: postTag,
      });

      setPostText('');
      setImageFile(null);
      setImagePreview('');
    } catch (err) {
      console.warn('Error creating post:', err);
    } finally {
      setIsPosting(false);
    }
  };

  const handleStartDM = async (authorUid, authorName, authorPhoto) => {
    if (!user) return;
    if (authorUid === user.uid) return;

    const chatId = await startDirectChat({
      uid: authorUid,
      displayName: authorName,
      photoURL: authorPhoto,
    });

    if (chatId) {
      navigate('/messages', { state: { activeChatId: chatId } });
    }
  };

  const handleOpenUserProfile = (authorUid) => {
    setSelectedProfileUid(authorUid);
    setIsProfileModalOpen(true);
  };

  const handleAddCommentSubmit = async (e, postId) => {
    e.preventDefault();
    const text = commentInputs[postId] || '';
    if (!text.trim()) return;

    setSubmittingCommentPostId(postId);
    try {
      await addComment(postId, text);
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    } finally {
      setSubmittingCommentPostId(null);
    }
  };

  const handleSharePost = async (post) => {
    const shareText = `Check out this whisper on Antarang by ${post.authorName}: "${post.content || 'Photo Post'}"`;
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Antarang Whisper',
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (_) {}
    }

    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopiedPostId(post.id);
      setTimeout(() => setCopiedPostId(null), 2500);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  const friendsCount = Object.keys(friendsMap || {}).length;
  const followingCount = Object.keys(followingMap || {}).length;
  const followersCount = Object.keys(followersMap || {}).length;

  const filteredPosts = posts.filter((post) => {
    if (activeTab === 'friends') {
      const isFriend = Boolean(friendsMap[post.authorUid]);
      const isFollowing = Boolean(followingMap[post.authorUid]);
      const isMe = post.authorUid === user?.uid;
      return isFriend || isFollowing || isMe;
    }
    if (activeTab === 'pickup') return post.tag === 'pickup-line' || post.type === 'pickup_line';
    if (activeTab === 'photos') return Boolean(post.imageUrl);
    return true;
  });

  return (
    <div className="min-h-screen bg-cream font-sans">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gold/20 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-2xl md:text-3xl text-gold font-bold flex items-center gap-2">
                <span>Moments & Whispers Feed</span>
              </h1>
              <p className="text-xs md:text-sm text-ink-muted mt-1 font-sans">
                Share romantic pick-up lines, photos & midnight thoughts with the Antarang community.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* View Connections Button */}
            <button
              type="button"
              onClick={() => setIsFollowersModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gold/15 border border-gold/30 text-midnight font-serif text-xs font-bold hover:bg-gold/25 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
              title="View Friends, Following & Followers"
            >
              <Icon name="heart-outline" size={16} className="text-rose-500" />
              <span>
                {friendsCount} Friends • {followingCount} Following • {followersCount} Followers
              </span>
            </button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/messages')}
              icon={<Icon name="message-square" size={16} />}
              className="text-xs py-2"
            >
              Direct DMs
            </Button>
          </div>
        </header>

        {/* 2-Column Desktop Grid Layout */}
        <div className="flex gap-8">
          {/* Main Feed Column */}
          <div className="flex-1 space-y-6 min-w-0">
            {/* High-Contrast Post Composer Card */}
            <div className="bg-white rounded-2xl p-4 md:p-6 border border-gold/30 shadow-md space-y-4">
              <div className="flex items-center gap-3">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Profile'}
                    className="w-10 h-10 rounded-full object-cover border border-gold/40 shadow-sm shrink-0 cursor-pointer"
                    onClick={() => handleOpenUserProfile(user.uid)}
                  />
                ) : (
                  <div
                    onClick={() => handleOpenUserProfile(user.uid)}
                    className="w-10 h-10 rounded-full bg-gold/15 text-gold flex items-center justify-center font-bold font-serif border border-gold/30 shrink-0 cursor-pointer"
                  >
                    {user?.displayName?.[0] || 'A'}
                  </div>
                )}

                <div className="flex-1">
                  <span
                    onClick={() => handleOpenUserProfile(user.uid)}
                    className="text-xs font-serif font-bold text-midnight block cursor-pointer hover:text-gold transition-colors"
                  >
                    {user?.displayName || 'Writer'}
                  </span>
                  <p className="text-[11px] text-ink-muted">Share a memory, shayari, or pick-up line...</p>
                </div>
              </div>

              <form onSubmit={handleSubmitPost} className="space-y-3">
                <textarea
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  placeholder="Write your romantic line, shayari, or secret whisper here..."
                  rows={3}
                  className="w-full p-3.5 rounded-xl border border-gold/30 bg-white text-midnight font-medium text-sm md:text-base font-sans placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-gold/40 resize-none shadow-inner"
                />

                {/* Pick-up Line Quick Templates */}
                <div className="space-y-1.5">
                  <span className="text-[11px] uppercase font-serif text-gold-dark font-bold tracking-wider flex items-center gap-1">
                    <Icon name="flame" size={14} className="text-rose-500" />
                    <span>Quick Romantic Templates:</span>
                  </span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide text-xs">
                    {PICKUP_LINE_TEMPLATES.map((line, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleTemplateClick(line)}
                        className="px-3 py-1.5 rounded-full bg-gold/10 border border-gold/20 text-midnight font-medium hover:bg-gold/25 transition-all shrink-0 text-[11px] font-serif cursor-pointer"
                      >
                        "{line.slice(0, 32)}..."
                      </button>
                    ))}
                  </div>
                </div>

                {/* Photo Preview */}
                {imagePreview && (
                  <div className="relative w-full max-h-60 rounded-xl overflow-hidden border border-gold/30 shadow-sm">
                    <img src={imagePreview} alt="Upload preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview('');
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black transition-colors cursor-pointer"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                )}

                {/* Controls Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-gold/15">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-midnight font-semibold hover:text-gold cursor-pointer transition-colors px-2.5 py-1.5 rounded-lg bg-cream border border-gold/20">
                      <Icon name="camera" size={16} className="text-gold" />
                      <span>Photo</span>
                      <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </label>

                    <select
                      value={postTag}
                      onChange={(e) => setPostTag(e.target.value)}
                      className="text-xs bg-cream border border-gold/25 rounded-lg px-2.5 py-1.5 text-midnight font-serif font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="pickup-line">#pickup-line</option>
                      <option value="romance">#romance</option>
                      <option value="poetry">#poetry</option>
                      <option value="thought">#thought</option>
                    </select>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    loading={isPosting}
                    disabled={!postText.trim() && !imageFile}
                    icon={<Icon name="send" size={14} />}
                  >
                    Post Line
                  </Button>
                </div>
              </form>
            </div>

            {/* Filter Navigation Tabs */}
            <div className="flex border-b border-gold/20 text-xs font-serif font-bold overflow-x-auto">
              {[
                { id: 'explore', label: 'Explore All', icon: 'sparkles' },
                { id: 'friends', label: `Friends & Following (${friendsCount + followingCount})`, icon: 'heart-outline' },
                { id: 'pickup', label: 'Pick-Up Lines', icon: 'flame' },
                { id: 'photos', label: 'Photos', icon: 'camera' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 flex items-center gap-1.5 transition-colors border-b-2 shrink-0 cursor-pointer ${
                    activeTab === tab.id
                      ? 'border-gold text-gold font-bold bg-gold/10'
                      : 'border-transparent text-midnight/60 hover:text-midnight'
                  }`}
                >
                  <Icon name={tab.icon} size={14} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Posts Feed */}
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-12 text-ink-muted">
                  <Icon name="sparkles" size={28} className="animate-spin text-gold mx-auto mb-2" />
                  <p className="font-serif text-sm">Loading community whispers...</p>
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gold/20 p-6 text-ink-muted space-y-2">
                  <Icon name="heart-outline" size={36} className="text-gold/40 mx-auto mb-1" />
                  <h3 className="font-serif text-base text-midnight font-bold">No posts found</h3>
                  <p className="text-xs">
                    {activeTab === 'friends'
                      ? 'No posts from friends yet. Send friend requests to see their posts here!'
                      : 'Be the first to share a photo or romantic line!'}
                  </p>
                </div>
              ) : (
                filteredPosts.map((post) => {
                  const isLiked = Boolean(post.likes?.[user?.uid]);
                  const isFollowing = Boolean(followingMap[post.authorUid]);
                  const isFriend = Boolean(friendsMap[post.authorUid]);
                  const isMe = post.authorUid === user?.uid;
                  const authorPhoto = isMe && user?.photoURL ? user.photoURL : post.authorPhoto;
                  const commentsList = post.comments || [];
                  const isCommentOpen = openCommentPostId === post.id;
                  const isCopied = copiedPostId === post.id;

                  return (
                    <motion.article
                      key={post.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl border border-gold/25 p-4 md:p-6 shadow-sm space-y-3.5"
                    >
                      {/* Post Header with Clickable Writer Profile */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {authorPhoto ? (
                            <img
                              src={authorPhoto}
                              alt={post.authorName}
                              onClick={() => handleOpenUserProfile(post.authorUid)}
                              className="w-10 h-10 rounded-full object-cover border border-gold/30 shrink-0 cursor-pointer hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div
                              onClick={() => handleOpenUserProfile(post.authorUid)}
                              className="w-10 h-10 rounded-full bg-gold/15 text-gold flex items-center justify-center font-serif font-bold border border-gold/30 shrink-0 cursor-pointer hover:scale-105 transition-transform"
                            >
                              {post.authorName?.[0] || 'U'}
                            </div>
                          )}

                          <div>
                            <div className="flex items-center gap-2">
                              <h4
                                onClick={() => handleOpenUserProfile(post.authorUid)}
                                className="font-serif font-bold text-midnight text-sm cursor-pointer hover:text-gold transition-colors"
                              >
                                {post.authorName}
                              </h4>
                              {isFriend && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-700 font-serif font-bold">
                                  Friend
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gold font-mono font-bold uppercase">
                              #{post.tag || 'antarang'}
                            </span>
                          </div>
                        </div>

                        {!isMe && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleFollowUser(post.authorUid, post.authorName, authorPhoto)}
                              className={`px-3 py-1 rounded-full text-xs font-serif transition-all cursor-pointer border ${
                                isFollowing || isFriend
                                  ? 'bg-cream text-midnight border-gold/30 font-bold'
                                  : 'bg-gold text-midnight font-bold border-gold hover:bg-gold-light'
                              }`}
                            >
                              {isFollowing || isFriend ? 'Following ✓' : '+ Follow'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStartDM(post.authorUid, post.authorName, authorPhoto)}
                              className="p-1.5 rounded-full bg-gold/10 text-gold hover:bg-gold/25 transition-colors cursor-pointer border border-gold/20"
                              title="Send Direct DM"
                            >
                              <Icon name="message-square" size={16} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Post Content */}
                      {post.content && (
                        <p className="font-serif text-sm sm:text-base text-midnight font-medium leading-relaxed whitespace-pre-line bg-gradient-to-r from-amber-50/70 to-rose-50/70 p-4 rounded-xl border border-gold/25 shadow-sm">
                          "{post.content}"
                        </p>
                      )}

                      {/* Post Image */}
                      {post.imageUrl && (
                        <div className="rounded-xl overflow-hidden border border-gold/20 max-h-[420px] bg-black/5">
                          <img
                            src={post.imageUrl}
                            alt="Post attachment"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Actions Bar */}
                      <div className="flex items-center justify-between pt-2 border-t border-gold/15 text-xs">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleLike(post.id, post.likes)}
                            className={`flex items-center gap-1.5 font-serif transition-all cursor-pointer px-3 py-1.5 rounded-full border ${
                              isLiked
                                ? 'bg-rose-50 text-rose-600 border-rose-300 font-bold shadow-xs'
                                : 'bg-cream/60 text-midnight/80 border-gold/20 hover:text-rose-500'
                            }`}
                          >
                            <Icon name="sparkles" size={14} className={isLiked ? 'text-rose-500' : 'text-gold'} />
                            <span>{post.likeCount || 0} Sparks</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setOpenCommentPostId(isCommentOpen ? null : post.id)}
                            className="flex items-center gap-1.5 font-serif text-midnight/80 bg-cream/60 hover:bg-gold/10 px-3 py-1.5 rounded-full border border-gold/20 transition-all cursor-pointer"
                          >
                            <Icon name="message-square" size={14} className="text-gold" />
                            <span>{commentsList.length} Comments</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSharePost(post)}
                          className="flex items-center gap-1.5 font-serif text-gold font-bold bg-gold/10 hover:bg-gold/25 px-3 py-1.5 rounded-full border border-gold/30 transition-all cursor-pointer"
                          title="Share post link"
                        >
                          <Icon name="share-2" size={14} />
                          <span>{isCopied ? 'Copied! ✓' : 'Share'}</span>
                        </button>
                      </div>

                      {/* Expandable Comments Drawer */}
                      <AnimatePresence>
                        {isCommentOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="pt-3 border-t border-gold/15 space-y-3 font-sans overflow-hidden"
                          >
                            <h5 className="font-serif text-xs font-bold text-midnight flex items-center gap-1.5">
                              <Icon name="message-square" size={14} className="text-gold" />
                              <span>Comments ({commentsList.length})</span>
                            </h5>

                            {commentsList.length === 0 ? (
                              <p className="text-xs text-ink-muted italic py-1">No comments yet. Write the first comment!</p>
                            ) : (
                              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {commentsList.map((c) => (
                                  <div key={c.id} className="p-2.5 rounded-xl bg-cream/50 border border-gold/15 flex items-start gap-2.5">
                                    {c.authorPhoto ? (
                                      <img
                                        src={c.authorPhoto}
                                        alt={c.authorName}
                                        onClick={() => handleOpenUserProfile(c.authorUid)}
                                        className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5 border border-gold/30 cursor-pointer"
                                      />
                                    ) : (
                                      <div
                                        onClick={() => handleOpenUserProfile(c.authorUid)}
                                        className="w-7 h-7 rounded-full bg-gold/20 text-gold flex items-center justify-center font-bold font-serif text-xs shrink-0 mt-0.5 border border-gold/30 cursor-pointer"
                                      >
                                        {c.authorName?.[0] || 'C'}
                                      </div>
                                    )}

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between">
                                        <span
                                          onClick={() => handleOpenUserProfile(c.authorUid)}
                                          className="font-serif text-xs font-bold text-midnight truncate cursor-pointer hover:text-gold"
                                        >
                                          {c.authorName}
                                        </span>
                                        <span className="text-[9px] text-ink-muted shrink-0">
                                          {new Date(c.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                      <p className="text-xs text-midnight/90 leading-relaxed mt-0.5">{c.text}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            <form onSubmit={(e) => handleAddCommentSubmit(e, post.id)} className="flex items-center gap-2 pt-1">
                              <input
                                type="text"
                                value={commentInputs[post.id] || ''}
                                onChange={(e) =>
                                  setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                                }
                                placeholder="Write a comment..."
                                className="flex-1 px-3 py-2 rounded-xl bg-white border border-gold/30 text-xs text-midnight placeholder-ink-muted focus:outline-none focus:ring-1 focus:ring-gold"
                              />
                              <Button
                                type="submit"
                                variant="primary"
                                size="sm"
                                loading={submittingCommentPostId === post.id}
                                disabled={!commentInputs[post.id]?.trim()}
                                icon={<Icon name="send" size={12} />}
                                className="text-xs py-1.5 px-3"
                              >
                                Comment
                              </Button>
                            </form>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.article>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Desktop Sidebar */}
          <div className="hidden lg:block w-72 space-y-6 shrink-0">
            {/* Network Connections Card */}
            <div className="bg-white rounded-2xl p-5 border border-gold/20 shadow-sm space-y-3">
              <h3 className="font-serif text-sm font-bold text-midnight flex items-center gap-2 border-b border-gold/15 pb-2">
                <Icon name="user-check" size={16} className="text-gold" />
                <span>My Network Hub</span>
              </h3>

              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div
                  onClick={() => setIsFollowersModalOpen(true)}
                  className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-300/30 cursor-pointer hover:bg-rose-500/20 transition-all"
                >
                  <span className="text-lg font-serif font-bold text-midnight block leading-tight">
                    {friendsCount}
                  </span>
                  <span className="text-[9px] uppercase font-serif text-rose-600 font-bold">Friends</span>
                </div>

                <div
                  onClick={() => setIsFollowersModalOpen(true)}
                  className="p-2.5 rounded-xl bg-gold/10 border border-gold/25 cursor-pointer hover:bg-gold/20 transition-all"
                >
                  <span className="text-lg font-serif font-bold text-midnight block leading-tight">
                    {followingCount}
                  </span>
                  <span className="text-[9px] uppercase font-serif text-gold-dark font-bold">Following</span>
                </div>

                <div
                  onClick={() => setIsFollowersModalOpen(true)}
                  className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-300/30 cursor-pointer hover:bg-amber-500/20 transition-all"
                >
                  <span className="text-lg font-serif font-bold text-midnight block leading-tight">
                    {followersCount}
                  </span>
                  <span className="text-[9px] uppercase font-serif text-amber-700 font-bold">Followers</span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFollowersModalOpen(true)}
                className="w-full text-xs py-1.5 border-gold/30 text-midnight"
              >
                View Friends & Network List
              </Button>
            </div>
          </div>
        </div>

        {/* Followers, Following & Friends Modal */}
        <FollowersModal
          isOpen={isFollowersModalOpen}
          onClose={() => setIsFollowersModalOpen(false)}
          followingMap={followingMap}
          followersMap={followersMap}
          friendsMap={friendsMap}
          onToggleFollow={toggleFollowUser}
          onStartDM={handleStartDM}
          onSelectUser={(u) => handleOpenUserProfile(u.uid)}
        />

        {/* Interactive User Profile Modal */}
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          targetUid={selectedProfileUid}
        />
      </div>
    </div>
  );
}
