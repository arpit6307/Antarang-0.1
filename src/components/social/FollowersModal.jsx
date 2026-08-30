import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';

function parseList(map) {
  if (!map) return [];
  return Object.entries(map).map(([key, val]) => {
    if (typeof val === 'object' && val !== null) {
      return {
        uid: val.uid || val.targetUid || key,
        displayName: val.displayName || val.targetName || 'Antarang Writer',
        photoURL: val.photoURL || val.targetPhoto || '',
        ...val,
      };
    }
    return {
      uid: key,
      displayName: 'Antarang Writer',
      photoURL: '',
    };
  });
}

export default function FollowersModal({
  isOpen,
  onClose,
  followingMap,
  followersMap,
  friendsMap,
  onToggleFollow,
  onStartDM,
  onSelectUser,
}) {
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'following' | 'followers'

  const friendsList = parseList(friendsMap);
  const followingList = parseList(followingMap);
  const followersList = parseList(followersMap);

  const handleUserClick = (writer) => {
    if (onSelectUser) {
      onClose();
      onSelectUser(writer);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="My Friends & Connections Network">
      <div className="space-y-4 font-sans">
        {/* 3 Tabs Header */}
        <div className="flex border-b border-gold/15 text-xs font-serif font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-2.5 px-2 text-center transition-colors border-b-2 cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'friends'
                ? 'border-gold text-gold bg-gold/10'
                : 'border-transparent text-midnight/60 hover:text-midnight'
            }`}
          >
            <Icon name="heart-outline" size={13} />
            <span>Friends ({friendsList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('following')}
            className={`flex-1 py-2.5 px-2 text-center transition-colors border-b-2 cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'following'
                ? 'border-gold text-gold bg-gold/10'
                : 'border-transparent text-midnight/60 hover:text-midnight'
            }`}
          >
            <Icon name="user-check" size={13} />
            <span>Following ({followingList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('followers')}
            className={`flex-1 py-2.5 px-2 text-center transition-colors border-b-2 cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'followers'
                ? 'border-gold text-gold bg-gold/10'
                : 'border-transparent text-midnight/60 hover:text-midnight'
            }`}
          >
            <Icon name="user" size={13} />
            <span>Followers ({followersList.length})</span>
          </button>
        </div>

        {/* Tab 1: Friends List */}
        {activeTab === 'friends' && (
          <div className="space-y-3">
            {friendsList.length === 0 ? (
              <div className="py-10 text-center text-ink-muted space-y-2 font-serif">
                <Icon name="user-plus" size={28} className="text-gold/40 mx-auto" />
                <p className="text-xs text-midnight font-medium">No friends added yet</p>
                <p className="text-[11px] text-ink-muted">
                  Go to "Search & Writers Hub" page to find writers and send friend requests!
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {friendsList.map((writer) => {
                  const targetUid = writer.uid;

                  return (
                    <div
                      key={targetUid}
                      className="p-3 rounded-xl border border-gold/20 bg-cream/40 flex items-center justify-between gap-3 shadow-sm"
                    >
                      <div
                        onClick={() => handleUserClick(writer)}
                        className="flex items-center gap-3 min-w-0 cursor-pointer group"
                      >
                        {writer.photoURL ? (
                          <img
                            src={writer.photoURL}
                            alt={writer.displayName}
                            className="w-10 h-10 rounded-full object-cover border border-gold/30 shrink-0 group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gold/15 text-gold flex items-center justify-center font-bold font-serif border border-gold/30 shrink-0 text-sm group-hover:scale-105 transition-transform">
                            {writer.displayName?.[0] || 'F'}
                          </div>
                        )}

                        <div className="min-w-0">
                          <h4 className="font-serif text-xs font-bold text-midnight truncate group-hover:text-gold transition-colors">
                            {writer.displayName || 'Antarang Friend'}
                          </h4>
                          <span className="text-[10px] text-emerald-700 font-serif font-bold block truncate">
                            Connected Friend ✓ (Click to view profile)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {onStartDM && (
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              onClose();
                              onStartDM(targetUid, writer.displayName, writer.photoURL);
                            }}
                            icon={<Icon name="message-square" size={14} />}
                            className="text-xs py-1 px-3"
                          >
                            Send DM
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Following List */}
        {activeTab === 'following' && (
          <div className="space-y-3">
            {followingList.length === 0 ? (
              <div className="py-10 text-center text-ink-muted space-y-2 font-serif">
                <Icon name="heart-outline" size={28} className="text-gold/40 mx-auto" />
                <p className="text-xs text-midnight font-medium">You are not following any writers yet</p>
                <p className="text-[11px] text-ink-muted">Click "+ Follow" on any post in the feed to start following writers!</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {followingList.map((writer) => {
                  const targetUid = writer.uid;

                  return (
                    <div
                      key={targetUid}
                      className="p-3 rounded-xl border border-gold/20 bg-cream/40 flex items-center justify-between gap-3 shadow-sm"
                    >
                      <div
                        onClick={() => handleUserClick(writer)}
                        className="flex items-center gap-3 min-w-0 cursor-pointer group"
                      >
                        {writer.photoURL ? (
                          <img
                            src={writer.photoURL}
                            alt={writer.displayName}
                            className="w-10 h-10 rounded-full object-cover border border-gold/30 shrink-0 group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gold/15 text-gold flex items-center justify-center font-bold font-serif border border-gold/30 shrink-0 text-sm group-hover:scale-105 transition-transform">
                            {writer.displayName?.[0] || 'W'}
                          </div>
                        )}

                        <div className="min-w-0">
                          <h4 className="font-serif text-xs font-bold text-midnight truncate group-hover:text-gold transition-colors">
                            {writer.displayName || 'Antarang Writer'}
                          </h4>
                          <span className="text-[10px] text-ink-muted block truncate">
                            Following since {writer.followedAt ? new Date(writer.followedAt).toLocaleDateString() : 'recently'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {onStartDM && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onStartDM(targetUid, writer.displayName, writer.photoURL);
                            }}
                            className="p-1.5 rounded-lg bg-gold/10 text-gold hover:bg-gold/25 transition-colors border border-gold/20 cursor-pointer"
                            title="Direct DM"
                          >
                            <Icon name="message-square" size={14} />
                          </button>
                        )}

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onToggleFollow(targetUid, writer.displayName, writer.photoURL)}
                          className="text-xs py-1 px-3 border-gold/40 text-midnight hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300"
                        >
                          Following ✓
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Followers List */}
        {activeTab === 'followers' && (
          <div className="space-y-3">
            {followersList.length === 0 ? (
              <div className="py-10 text-center text-ink-muted space-y-2 font-serif">
                <Icon name="user" size={28} className="text-gold/40 mx-auto" />
                <p className="text-xs text-midnight font-medium">No followers yet</p>
                <p className="text-[11px] text-ink-muted">Post romantic lines and photos to get followers in the community!</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {followersList.map((writer) => {
                  const targetUid = writer.uid;
                  const isFollowingBack = Boolean(followingMap[targetUid]);

                  return (
                    <div
                      key={targetUid}
                      className="p-3 rounded-xl border border-gold/20 bg-cream/40 flex items-center justify-between gap-3 shadow-sm"
                    >
                      <div
                        onClick={() => handleUserClick(writer)}
                        className="flex items-center gap-3 min-w-0 cursor-pointer group"
                      >
                        {writer.photoURL ? (
                          <img
                            src={writer.photoURL}
                            alt={writer.displayName}
                            className="w-10 h-10 rounded-full object-cover border border-gold/30 shrink-0 group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gold/15 text-gold flex items-center justify-center font-bold font-serif border border-gold/30 shrink-0 text-sm group-hover:scale-105 transition-transform">
                            {writer.displayName?.[0] || 'W'}
                          </div>
                        )}

                        <div className="min-w-0">
                          <h4 className="font-serif text-xs font-bold text-midnight truncate group-hover:text-gold transition-colors">
                            {writer.displayName || 'Antarang Writer'}
                          </h4>
                          <span className="text-[10px] text-ink-muted block truncate">
                            Followed you {writer.followedAt ? new Date(writer.followedAt).toLocaleDateString() : 'recently'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {onStartDM && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onStartDM(targetUid, writer.displayName, writer.photoURL);
                            }}
                            className="p-1.5 rounded-lg bg-gold/10 text-gold hover:bg-gold/25 transition-colors border border-gold/20 cursor-pointer"
                            title="Direct DM"
                          >
                            <Icon name="message-square" size={14} />
                          </button>
                        )}

                        <Button
                          type="button"
                          variant={isFollowingBack ? 'outline' : 'primary'}
                          size="sm"
                          onClick={() => onToggleFollow(targetUid, writer.displayName, writer.photoURL)}
                          className="text-xs py-1 px-3"
                        >
                          {isFollowingBack ? 'Following ✓' : '+ Follow Back'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
