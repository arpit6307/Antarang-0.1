import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import Icon from '@/components/ui/Icon';
import Button from '@/components/ui/Button';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { useAuth } from '@/contexts/AuthContext';

const CHAT_THEMES = [
  {
    id: 'midnight',
    name: 'Midnight Gold',
    headerBg: 'bg-[#0B1121]',
    messagesBg: 'bg-[#0B1121]',
    borderColor: 'border-[#C5A14E]/30',
    accentText: 'text-[#C5A14E]',
    sentBubble: 'bg-[#C5A14E] text-[#0B1121] font-semibold',
    receivedBubble: 'bg-[#1A2332] text-[#FAF3E6] border border-[#C5A14E]/25',
    colorSwatch: 'from-[#0B1121] to-[#C5A14E]',
  },
  {
    id: 'romance',
    name: 'Love & Sunset',
    headerBg: 'bg-[#3D0F1C]',
    messagesBg: 'bg-gradient-to-b from-[#3D0F1C] via-[#2A0A13] to-[#1F070E]',
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
    messagesBg: 'bg-gradient-to-b from-[#2A163B] to-[#1E0F2B]',
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
    messagesBg: 'bg-gradient-to-b from-[#0F2C3D] to-[#0A1F2C]',
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
    messagesBg: 'bg-gradient-to-b from-[#0F3A2B] to-[#08231A]',
    borderColor: 'border-emerald-400/30',
    accentText: 'text-emerald-300',
    sentBubble: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium shadow-emerald-950/40',
    receivedBubble: 'bg-[#1A523E] text-emerald-100 border border-emerald-400/20',
    colorSwatch: 'from-emerald-500 to-teal-600',
  },
];

const SPARK_CHIPS = [
  { text: 'Thinking of you!', icon: 'heart-outline' },
  { text: 'Let us catch up', icon: 'sparkles' },
  { text: 'Loved your post', icon: 'flame' },
  { text: 'Good night', icon: 'moon' },
];

export default function MessagesPage() {
  const { user } = useAuth();
  const location = useLocation();

  const [activeChatId, setActiveChatId] = useState(location.state?.activeChatId || null);
  const [text, setText] = useState('');
  const [activeThemeId, setActiveThemeId] = useState('midnight');
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(Boolean(location.state?.activeChatId));
  const messagesEndRef = useRef(null);

  const { chats, messages, loadingChats, loadingMessages, sendDirectMessage } = useDirectMessages(activeChatId);

  const activeTheme = CHAT_THEMES.find((t) => t.id === activeThemeId) || CHAT_THEMES[0];

  useEffect(() => {
    if (chats.length > 0 && !activeChatId) {
      setActiveChatId(chats[0].id);
    }
  }, [chats, activeChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeChat = chats.find((c) => c.id === activeChatId);
  const partnerUid = activeChat?.participants?.find((uid) => uid !== user?.uid);
  const partnerProfile = activeChat?.participantProfiles?.[partnerUid] || { displayName: 'Friend', photoURL: '' };

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim() || !activeChatId) return;
    sendDirectMessage(activeChatId, text);
    setText('');
  };

  const handleQuickSpark = (sparkText) => {
    if (!activeChatId) return;
    sendDirectMessage(activeChatId, sparkText);
  };

  const filteredChats = chats.filter((c) => {
    const pUid = c.participants?.find((uid) => uid !== user?.uid);
    const pName = c.participantProfiles?.[pUid]?.displayName || '';
    return pName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="h-screen flex bg-cream font-sans overflow-hidden">
      {/* Inbox Sidebar */}
      <aside
        className={`${
          showMobileChat ? 'hidden md:flex' : 'flex'
        } w-full md:w-80 lg:w-96 bg-midnight text-cream border-r border-gold/20 flex-col shrink-0`}
      >
        <div className="p-4 border-b border-gold/20 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-gold flex items-center gap-2">
              <Icon name="message-square" size={20} />
              <span>Direct DMs</span>
            </h2>
            <span className="text-xs bg-gold/15 text-gold px-2.5 py-0.5 rounded-full font-serif">
              {chats.length} Chats
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats or friends..."
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-midnight-light border border-gold/25 text-cream placeholder-cream/40 focus:outline-none focus:border-gold"
            />
            <Icon name="search" size={14} className="absolute left-3 top-2.5 text-cream/40" />
          </div>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gold/10">
          {loadingChats ? (
            <div className="p-6 text-center text-cream/50 text-xs font-serif">
              Loading inbox...
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="p-6 text-center text-cream/50 space-y-2">
              <Icon name="message-square" size={28} className="text-gold/40 mx-auto" />
              <p className="font-serif text-sm text-gold/80">No DMs yet</p>
              <p className="text-xs text-cream/60">
                Go to the Feed page and click "Send Direct DM" on any user to start chatting!
              </p>
            </div>
          ) : (
            filteredChats.map((chat) => {
              const pUid = chat.participants?.find((uid) => uid !== user?.uid);
              const pProfile = chat.participantProfiles?.[pUid] || { displayName: 'Friend', photoURL: '' };
              const isActive = chat.id === activeChatId;

              return (
                <div
                  key={chat.id}
                  onClick={() => {
                    setActiveChatId(chat.id);
                    setShowMobileChat(true);
                  }}
                  className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${
                    isActive ? 'bg-gold/15 border-l-4 border-gold' : 'hover:bg-midnight-light/60'
                  }`}
                >
                  {pProfile.photoURL ? (
                    <img
                      src={pProfile.photoURL}
                      alt={pProfile.displayName}
                      className="w-10 h-10 rounded-full object-cover border border-gold/30 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gold/20 text-gold flex items-center justify-center font-bold font-serif border border-gold/30 shrink-0">
                      {pProfile.displayName?.[0] || 'F'}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-serif text-sm font-semibold text-cream truncate">
                        {pProfile.displayName}
                      </h4>
                    </div>
                    <p className="text-xs text-cream/60 truncate mt-0.5">
                      {chat.lastMessage || 'No messages yet'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Main Chat Panel */}
      <main
        className={`${
          !showMobileChat ? 'hidden md:flex' : 'flex'
        } flex-1 flex-col ${activeTheme.messagesBg} transition-colors duration-300 relative`}
      >
        {activeChatId ? (
          <>
            {/* Top Chat Header */}
            <header className={`p-4 ${activeTheme.headerBg} border-b ${activeTheme.borderColor} flex items-center justify-between z-10 transition-colors duration-300`}>
              <div className="flex items-center gap-3">
                {/* Mobile Back to Inbox Button */}
                <button
                  type="button"
                  onClick={() => setShowMobileChat(false)}
                  className="md:hidden p-1.5 rounded-lg text-cream/80 hover:text-gold transition-colors"
                >
                  <Icon name="chevron-left" size={20} />
                </button>

                {partnerProfile.photoURL ? (
                  <img
                    src={partnerProfile.photoURL}
                    alt={partnerProfile.displayName}
                    className="w-9 h-9 rounded-full object-cover border border-gold/30 shrink-0"
                  />
                ) : (
                  <div className={`w-9 h-9 rounded-full bg-black/20 ${activeTheme.accentText} flex items-center justify-center font-bold font-serif border ${activeTheme.borderColor}`}>
                    {partnerProfile.displayName?.[0] || 'F'}
                  </div>
                )}

                <div>
                  <h3 className={`font-serif font-bold ${activeTheme.accentText} text-base leading-tight`}>
                    {partnerProfile.displayName}
                  </h3>
                  <span className="text-[10px] text-cream/70">Instagram-Style Direct DM</span>
                </div>
              </div>

              {/* Theme Selector Button */}
              <button
                type="button"
                onClick={() => setIsThemePickerOpen(!isThemePickerOpen)}
                className={`p-2 rounded-xl bg-black/20 ${activeTheme.accentText} border ${activeTheme.borderColor} hover:bg-white/10 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-serif`}
                title="Change DM Theme"
              >
                <Icon name="palette" size={16} />
                <span className="hidden sm:inline">Themes</span>
              </button>
            </header>

            {/* Instagram Theme Picker Drawer */}
            <AnimatePresence>
              {isThemePickerOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className={`px-4 py-2.5 ${activeTheme.headerBg} border-b ${activeTheme.borderColor} flex items-center justify-between gap-2 overflow-x-auto z-10`}
                >
                  <span className={`text-[10px] uppercase font-serif tracking-wider ${activeTheme.accentText} shrink-0`}>
                    Select DM Theme:
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

            {/* Quick Sparks with SVG Icons */}
            <div className={`px-4 py-2 bg-black/20 border-b ${activeTheme.borderColor} flex items-center gap-2 overflow-x-auto text-xs no-scrollbar`}>
              <span className={`text-[10px] uppercase font-serif tracking-wider ${activeTheme.accentText} shrink-0`}>
                Sparks:
              </span>
              {SPARK_CHIPS.map((spark, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickSpark(spark.text)}
                  className={`px-2.5 py-1 rounded-full bg-black/20 border ${activeTheme.borderColor} text-cream/90 hover:bg-white/15 transition-all shrink-0 text-[11px] cursor-pointer flex items-center gap-1.5`}
                >
                  <Icon name={spark.icon} size={12} />
                  <span>{spark.text}</span>
                </button>
              ))}
            </div>

            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
              {loadingMessages ? (
                <div className="h-full flex items-center justify-center text-cream/50 text-xs font-serif">
                  Loading chat history...
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-cream/60">
                  <Icon name="sparkles" size={32} className={`${activeTheme.accentText} opacity-50 mb-2`} />
                  <p className={`font-serif text-sm ${activeTheme.accentText}`}>No messages yet</p>
                  <p className="text-xs text-cream/60 mt-1">Say hi to start the conversation!</p>
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
                          {isMe ? 'You' : msg.senderName || partnerProfile.displayName}
                        </span>
                        <span className="text-[9px] text-cream/50">{timestamp}</span>
                      </div>

                      <div
                        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-xs md:text-sm leading-relaxed break-words shadow-md ${
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

            {/* Message Input Footer */}
            <form onSubmit={handleSend} className={`p-3 md:p-4 ${activeTheme.headerBg} border-t ${activeTheme.borderColor} flex items-center gap-2 transition-colors duration-300`}>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Message ${partnerProfile.displayName}...`}
                className={`flex-1 px-4 py-2.5 rounded-xl text-xs md:text-sm bg-black/20 border ${activeTheme.borderColor} text-cream placeholder-cream/40 focus:outline-none focus:ring-1 focus:ring-white/50 transition-all`}
              />
              <button
                type="submit"
                disabled={!text.trim()}
                className={`p-2.5 md:p-3 rounded-xl ${activeTheme.sentBubble} disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-md shrink-0 flex items-center justify-center`}
              >
                <Icon name="send" size={16} />
              </button>
            </form>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-cream/50">
            <Icon name="message-square" size={48} className="text-gold/40 mb-3" />
            <h3 className="font-serif text-lg text-gold font-bold">Your Messages</h3>
            <p className="text-xs text-cream/60 max-w-sm mt-1">
              Select a chat from the inbox or start a DM with any user from the Feed!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
