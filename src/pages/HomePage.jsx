import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useDiaries } from '@/hooks/useDiaries';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import DiaryCard from '@/components/home/DiaryCard';
import CreateDiaryModal from '@/components/home/CreateDiaryModal';
import InvitePartnerModal from '@/components/diary/InvitePartnerModal';
import NotificationsDrawer from '@/components/home/NotificationsDrawer';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';

export default function HomePage() {
  const { user, updateProfile } = useAuth();
  const { diaries, createDiary, loading } = useDiaries();
  const { unreadCount } = useNotifications();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour >= 5 && hour < 12) greeting = 'Good morning';
  else if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
  else if (hour >= 17 && hour < 21) greeting = 'Good evening';
  else greeting = 'Good night';

  const handleCreateSuggested = async (suggestedDiaries) => {
    await Promise.all(suggestedDiaries.map((d) => createDiary(d)));
    if (user && updateProfile) {
      await updateProfile({ onboardingCompleted: true });
    }
  };

  const handleSkipOnboarding = async () => {
    if (user && updateProfile) {
      await updateProfile({ onboardingCompleted: true });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user && user.onboardingCompleted === false && (!diaries || diaries.length === 0)) {
    const suggestions = [
      { name: 'Daily Life', coverColor: '#0B1121', icon: 'book' },
      { name: 'Love Life', coverColor: '#5B1A2A', icon: 'heart-outline' },
      { name: 'Travel Journal', coverColor: '#1A3C40', icon: 'camera' },
      { name: 'Night Thoughts', coverColor: '#2D1854', icon: 'moon' },
    ];

    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-6 font-sans">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full text-center flex flex-col items-center bg-white p-8 md:p-12 rounded-2xl shadow-xl border border-gold/20"
        >
          <div className="w-16 h-16 bg-gold/15 rounded-full flex items-center justify-center mb-6 text-gold border border-gold/30">
            <Icon name="book" size={32} />
          </div>
          <h1 className="font-serif text-3xl md:text-4xl text-midnight mb-4">
            Welcome to Antarang, {user.displayName || 'Writer'}
          </h1>
          <p className="font-sans text-ink-muted mb-8 text-lg">
            Would you like to start with some suggested diaries?
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-10">
            {suggestions.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="p-4 rounded-xl flex items-center gap-4 text-cream shadow-md"
                style={{ backgroundColor: s.coverColor }}
              >
                <div className="bg-white/10 p-2 rounded-lg">
                  <Icon name={s.icon} size={24} />
                </div>
                <span className="font-serif text-lg">{s.name}</span>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Button variant="ghost" onClick={handleSkipOnboarding} className="w-full sm:w-auto">
              Skip, I'll create my own
            </Button>
            <Button
              variant="primary"
              onClick={() => handleCreateSuggested(suggestions)}
              className="w-full sm:w-auto"
            >
              Start with these
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const sharedDiariesCount = diaries.filter((d) => d.isShared).length;

  return (
    <div className="min-h-screen bg-cream font-sans">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-10 space-y-6 md:space-y-8">
        {/* Header & Stats Section */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-gold/20 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-gold font-bold">
                  My Bookshelf
                </h1>
                <p className="font-serif text-sm sm:text-lg text-midnight-light mt-0.5">
                  {greeting}, {user?.displayName || 'Writer'}
                </p>
              </div>

              {/* Notification Bell Trigger */}
              <button
                type="button"
                onClick={() => setIsNotifOpen(true)}
                className="relative p-2.5 rounded-2xl bg-white border border-gold/30 shadow-sm text-gold hover:bg-gold/10 transition-all cursor-pointer shrink-0 ml-auto sm:ml-0"
                title="Open Notifications"
              >
                <Icon name="bell" size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-white shadow-sm animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>

            {/* Mobile Action Buttons */}
            <div className="flex sm:hidden items-center gap-2.5 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsInviteModalOpen(true)}
                icon={<Icon name="heart-outline" size={14} className="text-rose-500" />}
                className="flex-1 text-xs py-2"
              >
                Share Duo
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                icon={<Icon name="plus" size={14} />}
                className="flex-1 text-xs py-2"
              >
                + New Diary
              </Button>
            </div>
          </div>

          {/* Premium Stats Cards Bar (Mobile + Desktop Optimized) */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 sm:gap-4">
            {/* Total Books Card */}
            <div className="bg-gradient-to-br from-white to-amber-50/50 p-3.5 sm:p-4 rounded-2xl border border-gold/30 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gold/20 text-gold flex items-center justify-center font-bold shrink-0 border border-gold/30 shadow-inner">
                <Icon name="book" size={20} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] font-serif uppercase text-gold-dark font-bold tracking-wider block truncate">
                  Total Books
                </span>
                <p className="font-serif text-xl sm:text-2xl font-bold text-midnight leading-tight">
                  {diaries.length}
                </p>
              </div>
            </div>

            {/* Duo Journals Card */}
            <div className="bg-gradient-to-br from-white to-rose-50/50 p-3.5 sm:p-4 rounded-2xl border border-rose-300/40 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center font-bold shrink-0 border border-rose-400/30 shadow-inner">
                <Icon name="heart-outline" size={20} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] font-serif uppercase text-rose-600 font-bold tracking-wider block truncate">
                  Duo Journals
                </span>
                <p className="font-serif text-xl sm:text-2xl font-bold text-midnight leading-tight">
                  {sharedDiariesCount}
                </p>
              </div>
            </div>

            {/* Desktop Action Buttons */}
            <div className="hidden sm:flex items-center gap-3 ml-auto lg:ml-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsInviteModalOpen(true)}
                icon={<Icon name="heart-outline" size={16} className="text-rose-500" />}
              >
                Join / Share Duo Journal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                icon={<Icon name="plus" size={16} />}
              >
                New Diary
              </Button>
            </div>
          </div>
        </header>

        {/* Bookshelf Grid */}
        {diaries.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 sm:py-20 text-center bg-white rounded-2xl border border-gold/20 p-6 sm:p-8 shadow-sm"
          >
            <Icon name="bookmark" className="w-14 h-14 sm:w-16 sm:h-16 text-gold mb-4" />
            <h2 className="font-serif text-xl sm:text-2xl text-midnight mb-2">Your bookshelf is empty</h2>
            <p className="font-sans text-xs sm:text-sm text-ink-muted mb-6">Create your first diary to begin writing</p>
            <Button variant="primary" onClick={() => setIsModalOpen(true)}>
              Create Diary
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5 md:gap-6"
          >
            {diaries.map((diary, index) => (
              <motion.div
                key={diary.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <DiaryCard diary={diary} />
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: diaries.length * 0.04 }}
            >
              <DiaryCard isCreateCard onCreateClick={() => setIsModalOpen(true)} />
            </motion.div>
          </motion.div>
        )}

        <CreateDiaryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        <InvitePartnerModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />
        <NotificationsDrawer isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
      </div>
    </div>
  );
}
