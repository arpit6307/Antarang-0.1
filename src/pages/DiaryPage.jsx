import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEntries } from '@/hooks/useEntries';
import { useDiaries } from '@/hooks/useDiaries';
import { useSharedChat } from '@/hooks/useSharedChat';
import Icon from '@/components/ui/Icon';
import Button from '@/components/ui/Button';
import EntryEditor from '@/components/diary/EntryEditor';
import PageFlip from '@/components/diary/PageFlip';
import MoodSelector from '@/components/diary/MoodSelector';
import PhotoAttachment from '@/components/diary/PhotoAttachment';
import DiarySettingsModal from '@/components/diary/DiarySettingsModal';
import LiveChatDrawer from '@/components/diary/LiveChatDrawer';
import InvitePartnerModal from '@/components/diary/InvitePartnerModal';

export default function DiaryPage() {
  const { diaryId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { diaries } = useDiaries();
  const diary = diaries?.find((d) => d.id === diaryId);
  const { entries, addEntry, updateEntry } = useEntries(diaryId, diary?.ownerUid);
  const { messages, sendMessage } = useSharedChat(diary?.ownerUid || diary?.uid, diaryId);

  const [currentEntryIndex, setCurrentEntryIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [flipDirection, setFlipDirection] = useState('forward');

  const [draftContent, setDraftContent] = useState('');
  const [draftMood, setDraftMood] = useState(null);
  const [draftPhotos, setDraftPhotos] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const hasTriggeredRef = useRef(false);
  const currentEntry = entries?.[currentEntryIndex];

  useEffect(() => {
    if (location.state?.openNewEntry && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      setIsCreatingNew(true);
      setIsEditing(true);
      setDraftContent('');
      setDraftMood(null);
      setDraftPhotos([]);
      return;
    }

    if (!isCreatingNew && entries && entries.length > 0) {
      if (location.state?.entryIndex !== undefined) {
        const idx = Math.max(0, Math.min(location.state.entryIndex, entries.length - 1));
        setCurrentEntryIndex(idx);
      } else if (location.state?.entryId) {
        const idx = entries.findIndex((e) => e.id === location.state.entryId);
        if (idx !== -1) {
          setCurrentEntryIndex(idx);
        }
      }
    }
  }, [location.state, entries, isCreatingNew]);

  const handleNext = () => {
    if (currentEntryIndex < (entries?.length || 0) - 1 && !isEditing && !isCreatingNew) {
      setFlipDirection('forward');
      setCurrentEntryIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentEntryIndex > 0 && !isEditing && !isCreatingNew) {
      setFlipDirection('backward');
      setCurrentEntryIndex((prev) => prev - 1);
    }
  };

  const handleCreateNew = () => {
    setIsCreatingNew(true);
    setIsEditing(true);
    setDraftContent('');
    setDraftMood(null);
    setDraftPhotos([]);
  };

  const handleEdit = () => {
    if (currentEntry) {
      setIsEditing(true);
      setDraftContent(currentEntry.content || '');
      setDraftMood(currentEntry.mood || null);
      setDraftPhotos(currentEntry.photoUrls || []);
    }
  };

  const saveCurrentEntry = async (content = draftContent, mood = draftMood, photos = draftPhotos) => {
    if (!content.trim() && !mood && photos.length === 0) return;
    setIsSaving(true);
    try {
      if (isCreatingNew) {
        await addEntry({
          content,
          mood,
          photoUrls: photos,
          createdAt: new Date().toISOString(),
        });
        setIsCreatingNew(false);
        setCurrentEntryIndex(0);
      } else if (currentEntry) {
        await updateEntry(currentEntry.id, {
          content,
          mood,
          photoUrls: photos,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn('Error saving entry:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const finishEditing = async () => {
    await saveCurrentEntry();
    setIsEditing(false);
    setIsCreatingNew(false);
  };

  const dateToDisplay = isCreatingNew
    ? (location.state?.defaultDate ? new Date(location.state.defaultDate) : new Date())
    : currentEntry?.createdAt
    ? new Date(currentEntry.createdAt)
    : new Date();

  const formatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const timeOptions = { hour: 'numeric', minute: '2-digit' };

  return (
    <div className="flex flex-col h-screen bg-midnight text-cream font-sans">
      {/* Header with Back, Title, Settings & New Entry Button */}
      <header className="flex items-center justify-between px-4 py-3 bg-midnight-light border-b border-gold/20 sticky top-0 z-20">
        <Button variant="ghost" onClick={() => navigate('/')} aria-label="Back">
          <Icon name="chevron-left" className="w-6 h-6 text-gold" />
        </Button>

        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <h1 className="font-serif text-base sm:text-xl font-bold text-gold truncate max-w-[120px] sm:max-w-xs">
            {diary?.name || 'Diary'}
          </h1>

          {/* Co-Authors Member Avatars Bar */}
          {diary?.collaboratorProfiles && Object.keys(diary.collaboratorProfiles).length > 0 && (
            <div
              onClick={() => setIsInviteOpen(true)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gold/15 border border-gold/30 cursor-pointer hover:bg-gold/25 transition-all shrink-0"
              title="View Co-Authors & Members"
            >
              <div className="flex items-center -space-x-1.5">
                {Object.values(diary.collaboratorProfiles).slice(0, 3).map((m, idx) => (
                  <div key={m.uid || idx} className="w-5 h-5 rounded-full border border-gold overflow-hidden bg-midnight shrink-0">
                    {m.photoURL ? (
                      <img src={m.photoURL} alt={m.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full text-[9px] font-bold text-gold flex items-center justify-center font-serif">
                        {m.displayName?.[0] || 'M'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <span className="text-[10px] font-serif font-bold text-gold hidden sm:inline">
                {Object.keys(diary.collaboratorProfiles).length} Members
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Invite Partner Button */}
          <button
            type="button"
            onClick={() => setIsInviteOpen(true)}
            className="p-1.5 sm:p-2 rounded-xl bg-gold/10 text-gold hover:bg-gold/25 transition-all cursor-pointer flex items-center gap-1 text-xs border border-gold/20"
            title="Invite Partner / Bestie"
          >
            <Icon name="heart-outline" size={16} className="text-rose-400" />
            <span className="hidden md:inline font-serif">Co-Author</span>
          </button>

          {/* Live Chat Drawer Trigger */}
          <button
            type="button"
            onClick={() => setIsChatOpen(true)}
            className="relative p-1.5 sm:p-2 rounded-xl bg-gold/10 text-gold hover:bg-gold/25 transition-all cursor-pointer flex items-center gap-1 text-xs border border-gold/20"
            title="Live Chat & Whispers"
          >
            <Icon name="message-square" size={16} />
            <span className="hidden md:inline font-serif">Chat</span>
            {messages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-midnight animate-pulse">
                {messages.length}
              </span>
            )}
          </button>

          {/* Diary Settings Button */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 sm:p-2 rounded-xl bg-gold/10 text-gold hover:bg-gold/25 transition-all cursor-pointer border border-gold/20"
            title="Diary Settings"
          >
            <Icon name="settings" size={16} />
          </button>

          {/* New Entry Button */}
          <Button variant="ghost" onClick={handleCreateNew} aria-label="New Entry">
            <Icon name="plus" className="w-6 h-6 text-gold" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative flex flex-col items-center justify-center p-4 sm:p-8">
        {!isEditing && entries?.length > 0 && (
          <>
            <button
              onClick={handlePrev}
              disabled={currentEntryIndex === 0}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 hidden sm:block text-gold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <Icon name="chevron-left" className="w-8 h-8" />
            </button>
            <button
              onClick={handleNext}
              disabled={currentEntryIndex === (entries?.length || 0) - 1}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hidden sm:block text-gold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <Icon name="chevron-right" className="w-8 h-8" />
            </button>
          </>
        )}

        <div className="w-full max-w-2xl h-full relative">
          {isCreatingNew || (entries?.length > 0) ? (
            <PageFlip
              pageKey={isCreatingNew ? 'new' : currentEntry?.id}
              direction={flipDirection}
              onNext={handleNext}
              onPrev={handlePrev}
            >
              <div
                className={`bg-cream text-ink h-full rounded-lg shadow-2xl p-6 sm:p-10 overflow-y-auto paper-texture ${
                  !isEditing ? 'cursor-pointer' : ''
                }`}
                onClick={!isEditing ? handleEdit : undefined}
              >
                <div className="mb-6 flex justify-between items-end border-b border-ink/10 pb-4">
                  <div>
                    <h2 className="font-serif text-2xl sm:text-3xl font-bold text-wine">
                      {dateToDisplay.toLocaleDateString('en-US', formatOptions)}
                    </h2>
                    <p className="text-ink-muted text-sm mt-1 font-sans">
                      {dateToDisplay.toLocaleTimeString('en-US', timeOptions)}
                    </p>
                  </div>
                  {!isEditing && currentEntry?.mood && (
                    <div className="flex items-center gap-2 text-wine bg-wine/5 px-3 py-1.5 rounded-full border border-wine/10">
                      <span className="text-sm font-medium">{currentEntry.mood}</span>
                    </div>
                  )}
                </div>

                <div className="min-h-[300px]">
                  <EntryEditor
                    content={isEditing ? draftContent : currentEntry?.content || ''}
                    onChange={(html) => setDraftContent(html)}
                    editable={isEditing}
                  />
                </div>

                {!isEditing && currentEntry?.photoUrls?.length > 0 && (
                  <div className="mt-8 grid grid-cols-1 gap-4">
                    {currentEntry.photoUrls.map((url, idx) => (
                      <img key={idx} src={url} alt="Attached memory" className="max-w-full rounded-xl shadow-md border border-gold/20" />
                    ))}
                  </div>
                )}
              </div>
            </PageFlip>
          ) : (
            <div className="h-full flex items-center justify-center text-gold/80 flex-col gap-4 bg-white/5 rounded-2xl border border-gold/20 p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-gold/15 text-gold flex items-center justify-center border border-gold/30">
                <Icon name="book" className="w-8 h-8" />
              </div>
              <h3 className="font-serif text-xl font-bold text-cream">No reflections in this diary yet</h3>
              <p className="font-sans text-xs text-cream/70 max-w-sm">
                Click below to start writing your first memory in <strong className="text-gold">{diary?.name || 'this journal'}</strong>.
              </p>
              <Button variant="primary" onClick={handleCreateNew} icon={<Icon name="plus" size={16} />}>
                Write First Reflection
              </Button>
            </div>
          )}
        </div>
      </main>

      {!isEditing && entries?.length > 0 && (
        <div className="py-2 text-center text-sm text-gold-dark/80 font-serif sticky bottom-0 bg-midnight border-t border-gold/10">
          Page {currentEntryIndex + 1} of {entries.length}
        </div>
      )}

      {isEditing && (
        <div className="bg-midnight-light border-t border-gold/20 p-4 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.4)] z-30">
          <div className="max-w-2xl mx-auto space-y-4">
            <MoodSelector
              selected={draftMood}
              onSelect={(mood) => setDraftMood(mood)}
            />
            <div className="flex items-center justify-between pt-2 border-t border-gold/10">
              <PhotoAttachment
                photoUrls={draftPhotos}
                onPhotosChange={(urls) => setDraftPhotos(urls)}
                diaryId={diaryId}
                entryId={isCreatingNew ? 'new' : currentEntry?.id}
              />
              <div className="flex items-center gap-4">
                {isSaving && (
                  <span className="text-xs text-gold animate-pulse">Saving entry...</span>
                )}
                <Button onClick={finishEditing} variant="primary" loading={isSaving} className="px-6 font-bold">
                  Save Entry
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <DiarySettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        diary={diary}
      />

      <LiveChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={messages}
        onSendMessage={sendMessage}
        diary={diary}
      />

      <InvitePartnerModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        diary={diary}
      />
    </div>
  );
}
