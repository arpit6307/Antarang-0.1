import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/Icon';
import DiarySettingsModal from '@/components/diary/DiarySettingsModal';

export default function DiaryCard({ diary, isCreateCard, onCreateClick }) {
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  if (isCreateCard) {
    return (
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
        onClick={onCreateClick}
        className="w-full aspect-[3/4] border-2 border-dashed border-gold/50 rounded-2xl flex flex-col items-center justify-center gap-3 text-gold hover:bg-gold/10 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-cream shadow-sm"
        aria-label="Create New Diary"
      >
        <div className="w-12 h-12 rounded-full bg-gold/15 flex items-center justify-center border border-gold/30">
          <Icon name="plus" className="w-6 h-6 text-gold" />
        </div>
        <span className="font-serif text-lg font-bold">New Diary</span>
      </motion.button>
    );
  }

  const handleClick = () => {
    if (diary.lockEnabled && !diary.unlocked) {
      navigate(`/diary/${diary.id}?lock=true`);
    } else {
      navigate(`/diary/${diary.id}`);
    }
  };

  const isLocked = diary.lockEnabled && !diary.unlocked;
  const collaboratorProfiles = diary.collaboratorProfiles
    ? Object.values(diary.collaboratorProfiles)
    : [];
  const hasCollaborators = diary.isShared || collaboratorProfiles.length > 1;

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
        className="group relative w-full aspect-[3/4] rounded-2xl overflow-hidden text-left flex flex-col shadow-md hover:shadow-xl transition-shadow focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-cream border border-gold/20"
        style={{ backgroundColor: diary.coverColor || '#0B1121' }}
      >
        {/* Custom Cover Image Background */}
        {diary.coverImage && (
          <img
            src={diary.coverImage}
            alt={diary.name}
            className="absolute inset-0 w-full h-full object-cover z-0"
          />
        )}

        {/* Book spine shadow effect */}
        <div className="absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-black/60 to-transparent z-10" />
        {/* Gradient overlay for depth & readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/50 z-10" />

        {/* Clickable Card Body */}
        <div
          onClick={handleClick}
          className={`relative z-20 flex flex-col h-full p-4 sm:p-5 cursor-pointer ${
            isLocked ? 'blur-md' : ''
          }`}
        >
          {/* Header Row: Icon & Duo Badge */}
          <div className="flex justify-between items-start mb-auto">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-sm">
              <Icon name={diary.icon || 'book'} className="w-6 h-6 text-cream drop-shadow-md" />
            </div>

            <div className="flex items-center gap-1.5">
              {hasCollaborators && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-serif tracking-wider bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md border border-rose-300/40 backdrop-blur-md flex items-center gap-1">
                  <Icon name="heart-outline" size={10} />
                  <span>Duo Journal</span>
                </span>
              )}
              {diary.lockEnabled && diary.unlocked && (
                <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-md">
                  <Icon name="unlock" className="w-4 h-4 text-cream" />
                </div>
              )}
            </div>
          </div>

          {/* Diary Title */}
          <h3 className="font-serif text-xl sm:text-2xl text-cream text-center mb-3 leading-tight break-words line-clamp-3 drop-shadow-md font-bold">
            {diary.name}
          </h3>

          {/* Footer: Co-Author Avatars & Entry Count */}
          <div className="mt-auto space-y-2">
            {/* Joined Co-Author Avatars Row */}
            {collaboratorProfiles.length > 0 && (
              <div className="flex items-center justify-center -space-x-2">
                {collaboratorProfiles.slice(0, 4).map((member, idx) => (
                  <div
                    key={member.uid || idx}
                    className="relative w-7 h-7 rounded-full border-2 border-gold shadow-md overflow-hidden bg-midnight shrink-0"
                    title={member.displayName || 'Co-Author'}
                  >
                    {member.photoURL ? (
                      <img
                        src={member.photoURL}
                        alt={member.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gold/20 text-gold flex items-center justify-center font-serif text-[10px] font-bold">
                        {member.displayName?.[0] || 'M'}
                      </div>
                    )}
                  </div>
                ))}

                {collaboratorProfiles.length > 4 && (
                  <div className="w-7 h-7 rounded-full border-2 border-gold bg-midnight text-gold font-mono text-[9px] font-bold flex items-center justify-center">
                    +{collaboratorProfiles.length - 4}
                  </div>
                )}
              </div>
            )}

            <div className="text-center">
              <span className="text-[11px] font-sans text-cream/90 uppercase tracking-wider font-semibold drop-shadow-sm">
                {diary.entryCount || 0} entries
              </span>
            </div>
          </div>
        </div>

        {/* Settings Gear Button on Hover */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsSettingsOpen(true);
          }}
          className="absolute top-3 right-3 z-30 p-2 rounded-full bg-black/60 text-cream/90 hover:text-gold hover:bg-black/80 backdrop-blur-md transition-all opacity-80 group-hover:opacity-100 cursor-pointer border border-white/20"
          title="Diary Settings"
        >
          <Icon name="settings" size={16} />
        </button>
      </motion.div>

      <DiarySettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        diary={diary}
      />
    </>
  );
}
