import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Icon from '@/components/ui/Icon';
import { useAuth } from '@/contexts/AuthContext';

const CHAT_THEMES = [
  {
    id: 'midnight',
    name: 'Midnight Gold',
    headerBg: 'bg-[#0B1121]',
    drawerBg: 'bg-[#1A2332]',
    messagesBg: 'bg-[#0B1121]/50',
    borderColor: 'border-[#C5A14E]/30',
    accentText: 'text-[#C5A14E]',
    sentBubble: 'bg-[#C5A14E] text-[#0B1121] font-semibold',
    receivedBubble: 'bg-[#0B1121] text-[#FAF3E6] border border-[#C5A14E]/25',
    colorSwatch: 'from-[#0B1121] to-[#C5A14E]',
  },
  {
    id: 'romance',
    name: 'Love & Sunset',
    headerBg: 'bg-[#3D0F1C]',
    drawerBg: 'bg-[#2A0A13]',
    messagesBg: 'bg-gradient-to-b from-[#3D0F1C]/60 via-[#2A0A13] to-[#1F070E]',
    borderColor: 'border-rose-500/30',
    accentText: 'text-rose-400',
    sentBubble: 'bg-gradient-to-r from-rose-500 to-pink-600 text-white font-medium shadow-rose-950/40',
    receivedBubble: 'bg-[#4C1D2A] text-rose-100 border border-rose-400/20',
    colorSwatch: 'from-rose-500 to-pink-600',
  },
  {
    id: 'lavender',
    name: 'Lavender Dreams',
    headerBg: 'bg-[#2A163B]',
    drawerBg: 'bg-[#1E0F2B]',
    messagesBg: 'bg-gradient-to-b from-[#2A163B]/60 to-[#1E0F2B]',
    borderColor: 'border-purple-400/30',
    accentText: 'text-purple-300',
    sentBubble: 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-medium shadow-purple-950/40',
    receivedBubble: 'bg-[#3B1E54] text-purple-100 border border-purple-400/20',
    colorSwatch: 'from-purple-500 to-indigo-600',
  },
  {
    id: 'ocean',
    name: 'Ocean Breeze',
    headerBg: 'bg-[#0F2C3D]',
    drawerBg: 'bg-[#0A1F2C]',
    messagesBg: 'bg-gradient-to-b from-[#0F2C3D]/60 to-[#0A1F2C]',
    borderColor: 'border-cyan-400/30',
    accentText: 'text-cyan-300',
    sentBubble: 'bg-gradient-to-r from-cyan-500 to-teal-500 text-midnight font-semibold shadow-cyan-950/40',
    receivedBubble: 'bg-[#17435B] text-cyan-50 border border-cyan-400/20',
    colorSwatch: 'from-cyan-500 to-teal-500',
  },
  {
    id: 'emerald',
    name: 'Emerald Forest',
    headerBg: 'bg-[#0F3A2B]',
    drawerBg: 'bg-[#08231A]',
    messagesBg: 'bg-gradient-to-b from-[#0F3A2B]/60 to-[#08231A]',
    borderColor: 'border-emerald-400/30',
    accentText: 'text-emerald-300',
    sentBubble: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium shadow-emerald-950/40',
    receivedBubble: 'bg-[#1A523E] text-emerald-100 border border-emerald-400/20',
    colorSwatch: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'parchment',
    name: 'Cream Parchment',
    headerBg: 'bg-[#EADBCE]',
    drawerBg: 'bg-[#F8F3EA]',
    messagesBg: 'bg-[#F4ECE1]',
    borderColor: 'border-[#C5A14E]/40',
    accentText: 'text-[#8C6A20]',
    sentBubble: 'bg-[#C5A14E] text-midnight font-semibold',
    receivedBubble: 'bg-white text-[#2C2416] border border-[#C5A14E]/30',
    colorSwatch: 'from-[#EADBCE] to-[#C5A14E]',
  },
];

export default function LiveChatDrawer({ isOpen, onClose, messages = [], onSendMessage, diary }) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [activeThemeId, setActiveThemeId] = useState('midnight');
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const messagesEndRef = useRef(null);

  const activeTheme = CHAT_THEMES.find((t) => t.id === activeThemeId) || CHAT_THEMES[0];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text);
    setText('');
  };

  const handleQuickReaction = (emojiText) => {
    onSendMessage(emojiText);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Dark Overlay Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Slide-out Drawer */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className={`fixed top-0 right-0 bottom-0 w-full sm:w-96 ${activeTheme.drawerBg} border-l ${activeTheme.borderColor} z-50 flex flex-col shadow-2xl font-sans transition-colors duration-300`}
          >
            {/* Header */}
            <div className={`p-4 ${activeTheme.headerBg} border-b ${activeTheme.borderColor} flex items-center justify-between transition-colors duration-300`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full bg-black/20 ${activeTheme.accentText} flex items-center justify-center border ${activeTheme.borderColor}`}>
                  <Icon name="message-square" size={18} />
                </div>
                <div>
                  <h3 className={`font-serif font-semibold ${activeTheme.accentText} text-base leading-tight flex items-center gap-1.5`}>
                    Live Chat & Whispers
                  </h3>
                  <p className="text-[11px] text-cream/70 truncate max-w-[180px]">
                    {diary?.name || 'Shared Diary'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Theme Switcher Button */}
                <button
                  type="button"
                  onClick={() => setIsThemePickerOpen(!isThemePickerOpen)}
                  className={`p-1.5 rounded-lg text-cream/80 hover:${activeTheme.accentText} hover:bg-white/10 transition-colors cursor-pointer`}
                  title="Change Chat Theme"
                >
                  <Icon name="palette" size={18} />
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className={`p-1.5 rounded-lg text-cream/80 hover:${activeTheme.accentText} hover:bg-white/10 transition-colors cursor-pointer`}
                >
                  <Icon name="close" size={18} />
                </button>
              </div>
            </div>

            {/* Instagram-style Theme Picker Bar */}
            <AnimatePresence>
              {isThemePickerOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className={`px-4 py-2.5 ${activeTheme.headerBg} border-b ${activeTheme.borderColor} flex items-center justify-between gap-2 overflow-x-auto`}
                >
                  <span className={`text-[10px] uppercase font-serif tracking-wider ${activeTheme.accentText} shrink-0`}>
                    Chat Themes:
                  </span>
                  <div className="flex items-center gap-2">
                    {CHAT_THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => {
                          setActiveThemeId(theme.id);
                          setIsThemePickerOpen(false);
                        }}
                        className={`w-6 h-6 rounded-full bg-gradient-to-tr ${theme.colorSwatch} transition-all border ${
                          activeThemeId === theme.id ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100 hover:scale-105'
                        }`}
                        title={theme.name}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick Emotion Chips with clean SVG Icons */}
            <div className={`px-4 py-2 bg-black/20 border-b ${activeTheme.borderColor} flex items-center gap-2 overflow-x-auto text-xs no-scrollbar`}>
              <span className={`text-[10px] uppercase font-serif tracking-wider ${activeTheme.accentText} shrink-0`}>
                Sparks:
              </span>
              {[
                { text: 'Thinking of you!', icon: 'heart-outline' },
                { text: 'Favorite memory', icon: 'sparkles' },
                { text: 'Written with love', icon: 'flame' },
                { text: 'Night thoughts', icon: 'moon' },
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickReaction(chip.text)}
                  className={`px-2.5 py-1 rounded-full bg-black/20 border ${activeTheme.borderColor} text-cream/90 hover:bg-white/15 transition-all shrink-0 text-[11px] cursor-pointer flex items-center gap-1.5`}
                >
                  <Icon name={chip.icon} size={12} />
                  <span>{chip.text}</span>
                </button>
              ))}
            </div>

            {/* Messages Feed */}
            <div className={`flex-1 overflow-y-auto p-4 space-y-3 ${activeTheme.messagesBg} transition-colors duration-300`}>
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-cream/60">
                  <Icon name="sparkles" size={32} className={`${activeTheme.accentText} opacity-50 mb-2`} />
                  <p className={`font-serif text-sm ${activeTheme.accentText}`}>No whispers yet</p>
                  <p className="text-xs text-cream/60 mt-1">
                    Send a quick live message or memory spark to your co-author!
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderUid === user?.uid;
                  const timestamp = msg.createdAt?.seconds
                    ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Just now';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-[10px] font-serif ${activeTheme.accentText}`}>
                          {isMe ? 'You' : msg.senderName || 'Co-Author'}
                        </span>
                        <span className="text-[9px] text-cream/50">{timestamp}</span>
                      </div>

                      <div
                        className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-md ${
                          isMe
                            ? `${activeTheme.sentBubble} rounded-br-none`
                            : `${activeTheme.receivedBubble} rounded-bl-none`
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Bar */}
            <form onSubmit={handleSend} className={`p-3 ${activeTheme.headerBg} border-t ${activeTheme.borderColor} flex items-center gap-2 transition-colors duration-300`}>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write a whisper to your partner..."
                className={`flex-1 px-3.5 py-2.5 rounded-xl text-xs bg-black/20 border ${activeTheme.borderColor} text-cream placeholder-cream/40 focus:outline-none focus:ring-1 focus:ring-white/50 transition-all`}
              />
              <button
                type="submit"
                disabled={!text.trim()}
                className={`p-2.5 rounded-xl ${activeTheme.sentBubble} disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-md shrink-0 flex items-center justify-center`}
              >
                <Icon name="send" size={16} />
              </button>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
