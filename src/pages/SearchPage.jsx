import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query as firestoreQuery, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';
import { useDiaries } from '@/hooks/useDiaries';
import { useFriends } from '@/hooks/useFriends';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { lockManager } from '@/lib/lockManager';
import { db } from '@/lib/firebase';
import Icon from '@/components/ui/Icon';
import Button from '@/components/ui/Button';
import UserProfileModal from '@/components/social/UserProfileModal';

const MOODS = [
  { id: 'happy', label: 'Happy' },
  { id: 'calm', label: 'Calm' },
  { id: 'sad', label: 'Sad' },
  { id: 'anxious', label: 'Anxious' },
  { id: 'grateful', label: 'Grateful' },
  { id: 'loved', label: 'Loved' },
  { id: 'angry', label: 'Angry' },
  { id: 'thoughtful', label: 'Thoughtful' },
];

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseEntryDate(createdAt) {
  if (!createdAt) return new Date();
  if (typeof createdAt.toDate === 'function') return createdAt.toDate();
  if (createdAt.seconds) return new Date(createdAt.seconds * 1000);
  if (typeof createdAt === 'string' || typeof createdAt === 'number') return new Date(createdAt);
  if (createdAt instanceof Date) return createdAt;
  return new Date();
}

function getHighlightedText(text, keyword) {
  if (!keyword || !keyword.trim()) return text;
  const terms = keyword.trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return text;

  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-gold/30 text-gold font-semibold px-1 py-0.5 rounded">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function getExcerpt(plainText, keyword, maxLength = 160) {
  if (!plainText) return '';
  if (!keyword || !keyword.trim()) {
    return plainText.length > maxLength ? `${plainText.slice(0, maxLength)}…` : plainText;
  }

  const lowerText = plainText.toLowerCase();
  const lowerKeyword = keyword.toLowerCase().trim();
  const index = lowerText.indexOf(lowerKeyword);

  if (index === -1) {
    return plainText.length > maxLength ? `${plainText.slice(0, maxLength)}…` : plainText;
  }

  const start = Math.max(0, index - 40);
  const end = Math.min(plainText.length, index + lowerKeyword.length + 100);
  let snippet = plainText.slice(start, end);
  if (start > 0) snippet = `…${snippet}`;
  if (end < plainText.length) snippet = `${snippet}…`;
  return snippet;
}

export default function SearchPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { diaries, loading: diariesLoading } = useDiaries();
  const { searchUsers, friendsMap, sentRequestsMap, sendFriendRequest } = useFriends();
  const { startDirectChat } = useDirectMessages();

  const [searchMode, setSearchMode] = useState('entries'); // 'entries' | 'users'
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedDiaryId, setSelectedDiaryId] = useState('all');
  const [selectedMood, setSelectedMood] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [allEntries, setAllEntries] = useState([]);
  const [searchResultsUsers, setSearchResultsUsers] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sendingRequestUid, setSendingRequestUid] = useState(null);

  // Profile modal state
  const [selectedProfileUid, setSelectedProfileUid] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Fetch entries from unlocked diaries
  const fetchUnlockedEntries = useCallback(async () => {
    if (!user || !diaries || diaries.length === 0) {
      setAllEntries([]);
      return;
    }

    setLoadingEntries(true);
    try {
      const unlockedDiaries = diaries.filter((d) => lockManager.isUnlocked(d));
      const entryPromises = unlockedDiaries.map(async (diary) => {
        const entriesRef = collection(db, 'users', user.uid, 'diaries', diary.id, 'entries');
        const q = firestoreQuery(entriesRef, orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);

        return snap.docs.map((docSnap, index) => {
          const data = docSnap.data();
          const plainText = data.plainText || stripHtml(data.content || '');
          const entryDate = parseEntryDate(data.createdAt);
          return {
            id: docSnap.id,
            diaryId: diary.id,
            diaryName: diary.name,
            diaryColor: diary.coverColor || '#0B1121',
            diaryIcon: diary.icon || 'book',
            entryIndex: index,
            plainText,
            entryDate,
            ...data,
          };
        });
      });

      const results = await Promise.all(entryPromises);
      const flattened = results.flat();
      setAllEntries(flattened);
    } catch (err) {
      console.error('Error fetching unlocked diary entries for search:', err);
    } finally {
      setLoadingEntries(false);
    }
  }, [user, diaries]);

  useEffect(() => {
    fetchUnlockedEntries();
  }, [fetchUnlockedEntries]);

  // Search users when mode is 'users'
  const handleUserSearch = useCallback(async () => {
    if (searchMode !== 'users') return;
    setLoadingUsers(true);
    try {
      const list = await searchUsers(searchKeyword);
      setSearchResultsUsers(list);
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, [searchMode, searchKeyword, searchUsers]);

  useEffect(() => {
    if (searchMode === 'users') {
      handleUserSearch();
    }
  }, [searchMode, searchKeyword, handleUserSearch]);

  const unlockedDiaries = useMemo(() => {
    return (diaries || []).filter((d) => lockManager.isUnlocked(d));
  }, [diaries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return allEntries.filter((entry) => {
      if (selectedDiaryId !== 'all' && entry.diaryId !== selectedDiaryId) return false;
      if (selectedMood !== 'all' && entry.mood !== selectedMood) return false;

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (entry.entryDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (entry.entryDate > end) return false;
      }

      if (searchKeyword.trim()) {
        const term = searchKeyword.toLowerCase().trim();
        const titleMatch = entry.title ? entry.title.toLowerCase().includes(term) : false;
        const contentMatch = entry.plainText ? entry.plainText.toLowerCase().includes(term) : false;
        const tagMatch = entry.tags ? entry.tags.some((t) => t.toLowerCase().includes(term)) : false;
        const moodMatch = entry.mood ? entry.mood.toLowerCase().includes(term) : false;

        if (!titleMatch && !contentMatch && !tagMatch && !moodMatch) return false;
      }

      return true;
    });
  }, [allEntries, selectedDiaryId, selectedMood, startDate, endDate, searchKeyword]);

  const handleEntryClick = (entry) => {
    navigate(`/diary/${entry.diaryId}`, {
      state: {
        entryIndex: entry.entryIndex,
        entryId: entry.id,
      },
    });
  };

  const handleSendFriendRequest = async (targetUser) => {
    setSendingRequestUid(targetUser.uid);
    try {
      await sendFriendRequest(targetUser);
    } finally {
      setSendingRequestUid(null);
    }
  };

  const handleStartDM = async (targetUser) => {
    const chatId = await startDirectChat({
      uid: targetUser.uid,
      displayName: targetUser.displayName || 'Writer',
      photoURL: targetUser.photoURL || '',
    });
    if (chatId) {
      navigate('/messages', { state: { activeChatId: chatId } });
    }
  };

  const handleOpenUserProfile = (writerUid) => {
    setSelectedProfileUid(writerUid);
    setIsProfileModalOpen(true);
  };

  const clearFilters = () => {
    setSearchKeyword('');
    setSelectedDiaryId('all');
    setSelectedMood('all');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters =
    searchKeyword.trim() !== '' ||
    selectedDiaryId !== 'all' ||
    selectedMood !== 'all' ||
    startDate !== '' ||
    endDate !== '';

  const isLoading = diariesLoading || loadingEntries;

  return (
    <div className="min-h-screen bg-cream text-ink font-sans pb-20 md:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-8 md:pt-10">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-midnight text-gold rounded-xl border border-gold/30 shadow-md">
              <Icon name="search" className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif text-2xl md:text-3xl text-midnight font-bold">
                Search & Writers Hub
              </h1>
              <p className="font-sans text-xs sm:text-sm text-ink-muted">
                Search reflections across diaries or find Antarang writers to connect as friends
              </p>
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div className="flex bg-midnight-light p-1 rounded-xl border border-gold/20 font-serif text-xs font-bold">
            <button
              type="button"
              onClick={() => setSearchMode('entries')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                searchMode === 'entries'
                  ? 'bg-gold text-midnight shadow-sm'
                  : 'text-cream/70 hover:text-gold'
              }`}
            >
              <Icon name="file-text" size={14} />
              <span>Search Entries</span>
            </button>
            <button
              type="button"
              onClick={() => setSearchMode('users')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                searchMode === 'users'
                  ? 'bg-gold text-midnight shadow-sm'
                  : 'text-cream/70 hover:text-gold'
              }`}
            >
              <Icon name="user" size={14} />
              <span>Find Users & Friends</span>
            </button>
          </div>
        </header>

        {/* Search Bar */}
        <div className="relative mb-6">
          <div className="relative flex items-center rounded-xl bg-midnight-light border border-gold/30 focus-within:border-gold focus-within:ring-2 focus-within:ring-gold/30 shadow-md transition-all">
            <div className="absolute left-4 pointer-events-none text-gold">
              <Icon name="search" className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder={
                searchMode === 'entries'
                  ? 'Search words, phrases, feelings in diary entries...'
                  : 'Search Antarang writers by name or email...'
              }
              aria-label="Search"
              className="w-full bg-transparent py-3.5 pl-12 pr-10 text-cream placeholder-cream/40 text-sm md:text-base outline-none font-sans"
            />
            {searchKeyword && (
              <button
                type="button"
                onClick={() => setSearchKeyword('')}
                aria-label="Clear search input"
                className="absolute right-3.5 p-1 rounded-full text-cream/50 hover:text-gold transition-colors"
              >
                <Icon name="x" className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ================= MODE 1: SEARCH DIARY ENTRIES ================= */}
        {searchMode === 'entries' && (
          <>
            {/* Diary Filter Chips */}
            <div className="mb-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide text-xs sm:text-sm">
                <button
                  type="button"
                  onClick={() => setSelectedDiaryId('all')}
                  className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all border ${
                    selectedDiaryId === 'all'
                      ? 'bg-gold text-midnight border-gold font-semibold shadow-sm'
                      : 'bg-midnight-light text-cream/80 border-gold/20 hover:border-gold/50'
                  }`}
                >
                  All Diaries
                </button>
                {unlockedDiaries.map((diary) => {
                  const isSelected = selectedDiaryId === diary.id;
                  return (
                    <button
                      key={diary.id}
                      type="button"
                      onClick={() => setSelectedDiaryId(diary.id)}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all border ${
                        isSelected
                          ? 'bg-gold text-midnight border-gold font-semibold shadow-sm'
                          : 'bg-midnight-light text-cream/80 border-gold/20 hover:border-gold/50'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full inline-block shrink-0"
                        style={{ backgroundColor: diary.coverColor || '#C5A14E' }}
                      />
                      <span>{diary.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Additional Filters Row: Mood & Date Range */}
            <div className="bg-white/70 border border-gold/20 rounded-xl p-3.5 md:p-4 mb-6 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label htmlFor="mood-filter" className="block text-xs font-medium text-ink-muted mb-1">
                    Mood
                  </label>
                  <div className="relative">
                    <select
                      id="mood-filter"
                      value={selectedMood}
                      onChange={(e) => setSelectedMood(e.target.value)}
                      className="w-full bg-cream rounded-lg border border-gold/30 px-3 py-2 text-xs sm:text-sm text-ink outline-none focus:border-gold focus:ring-1 focus:ring-gold appearance-none font-sans"
                    >
                      <option value="all">All Moods</option>
                      {MOODS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-muted">
                      <Icon name="chevron-right" className="w-3.5 h-3.5 rotate-90" />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="from-date" className="block text-xs font-medium text-ink-muted mb-1">
                    From Date
                  </label>
                  <input
                    id="from-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-cream rounded-lg border border-gold/30 px-3 py-2 text-xs sm:text-sm text-ink outline-none focus:border-gold focus:ring-1 focus:ring-gold font-sans"
                  />
                </div>

                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <label htmlFor="to-date" className="block text-xs font-medium text-ink-muted mb-1">
                      To Date
                    </label>
                    <input
                      id="to-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-cream rounded-lg border border-gold/30 px-3 py-2 text-xs sm:text-sm text-ink outline-none focus:border-gold focus:ring-1 focus:ring-gold font-sans"
                    />
                  </div>

                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-xs text-ink-muted hover:text-gold shrink-0 h-9 px-2"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Results Grid */}
            {isLoading ? (
              <div className="py-20 text-center text-ink-muted font-serif">
                Loading reflections...
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="py-16 text-center text-ink-muted space-y-3 bg-white/40 rounded-2xl border border-gold/15 p-8">
                <Icon name="search" size={32} className="text-gold/40 mx-auto" />
                <h3 className="font-serif text-lg text-midnight font-bold">No entries found</h3>
                <p className="text-xs text-ink-muted">Try adjusting your keyword or filter criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredEntries.map((entry) => {
                  const excerpt = getExcerpt(entry.plainText, searchKeyword);
                  const formattedDate = entry.entryDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => handleEntryClick(entry)}
                      className="p-4 sm:p-5 rounded-2xl border border-gold/20 bg-white hover:border-gold shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: entry.diaryColor }}
                            />
                            <span className="font-serif text-xs font-bold text-midnight truncate max-w-[140px]">
                              {entry.diaryName}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-ink-muted">{formattedDate}</span>
                        </div>

                        <p className="font-serif text-xs text-midnight/90 line-clamp-3 leading-relaxed">
                          "{getHighlightedText(excerpt, searchKeyword)}"
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-gold/10 text-xs">
                        {entry.mood ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-serif bg-gold/15 text-gold font-bold capitalize">
                            {entry.mood}
                          </span>
                        ) : (
                          <span />
                        )}
                        <span className="text-gold font-serif font-bold flex items-center gap-1">
                          <span>Read Entry</span>
                          <Icon name="chevron-right" size={14} />
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ================= MODE 2: FIND USERS & FRIENDS ================= */}
        {searchMode === 'users' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gold/20 pb-3">
              <h2 className="font-serif text-lg font-bold text-midnight flex items-center gap-2">
                <Icon name="user-check" size={20} className="text-gold" />
                <span>Antarang Writers Directory</span>
              </h2>
              <span className="text-xs font-mono font-bold text-gold">
                {searchResultsUsers.length} Found
              </span>
            </div>

            {loadingUsers ? (
              <div className="py-20 text-center text-ink-muted font-serif">
                Searching writers...
              </div>
            ) : searchResultsUsers.length === 0 ? (
              <div className="py-16 text-center text-ink-muted space-y-3 bg-white/40 rounded-2xl border border-gold/15 p-8">
                <Icon name="user" size={32} className="text-gold/40 mx-auto" />
                <h3 className="font-serif text-lg text-midnight font-bold">No writers found</h3>
                <p className="text-xs text-ink-muted">Try searching with a different name or email.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {searchResultsUsers.map((writer) => {
                  const isFriend = Boolean(friendsMap[writer.uid]);
                  const isRequestSent = Boolean(sentRequestsMap[writer.uid]);

                  return (
                    <motion.div
                      key={writer.uid}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 sm:p-5 rounded-2xl border border-gold/20 bg-white shadow-sm flex flex-col justify-between space-y-4"
                    >
                      <div
                        onClick={() => handleOpenUserProfile(writer.uid)}
                        className="flex items-center gap-3.5 cursor-pointer group"
                      >
                        {writer.photoURL ? (
                          <img
                            src={writer.photoURL}
                            alt={writer.displayName || 'Writer'}
                            className="w-12 h-12 rounded-full object-cover border-2 border-gold/40 shrink-0 group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gold/20 text-gold flex items-center justify-center font-bold font-serif border-2 border-gold/30 shrink-0 text-base group-hover:scale-105 transition-transform">
                            {writer.displayName?.[0] || 'W'}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <h3 className="font-serif text-base font-bold text-midnight truncate group-hover:text-gold transition-colors">
                            {writer.displayName || 'Antarang Writer'}
                          </h3>
                          <p className="text-xs text-ink-muted truncate">{writer.email}</p>
                          {writer.bio && (
                            <p className="text-[11px] text-midnight/80 italic line-clamp-1 mt-0.5">
                              "{writer.bio}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-gold/10">
                        {isFriend ? (
                          <span className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 font-serif font-bold text-xs flex items-center justify-center gap-1.5">
                            <Icon name="check-circle" size={14} />
                            <span>Friends</span>
                          </span>
                        ) : isRequestSent ? (
                          <span className="flex-1 py-1.5 px-3 rounded-xl bg-amber-50 text-amber-800 border border-amber-300 font-serif font-bold text-xs flex items-center justify-center gap-1.5">
                            <Icon name="clock" size={14} />
                            <span>Request Sent</span>
                          </span>
                        ) : (
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            loading={sendingRequestUid === writer.uid}
                            onClick={() => handleSendFriendRequest(writer)}
                            icon={<Icon name="user-plus" size={14} />}
                            className="flex-1 text-xs py-1.5"
                          >
                            Add Friend
                          </Button>
                        )}

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleStartDM(writer)}
                          icon={<Icon name="message-square" size={14} />}
                          className="text-xs py-1.5 border-gold/40 text-midnight hover:bg-gold/10"
                        >
                          DM
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* User Profile Modal */}
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          targetUid={selectedProfileUid}
        />
      </div>
    </div>
  );
}
