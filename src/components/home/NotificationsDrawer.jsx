import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Icon from '@/components/ui/Icon';
import Button from '@/components/ui/Button';
import { useNotifications } from '@/hooks/useNotifications';

const NOTIF_ICONS = {
  friend_request: { icon: 'user-plus', color: 'text-amber-500 bg-amber-500/15 border-amber-400/30' },
  friend_accepted: { icon: 'check-circle', color: 'text-emerald-500 bg-emerald-500/15 border-emerald-400/30' },
  duo_invite: { icon: 'heart-outline', color: 'text-rose-500 bg-rose-500/15 border-rose-400/30' },
  post_like: { icon: 'sparkles', color: 'text-gold bg-gold/15 border-gold/30' },
  dm_message: { icon: 'message-square', color: 'text-cyan-500 bg-cyan-500/15 border-cyan-400/30' },
  default: { icon: 'bell', color: 'text-gold bg-gold/15 border-gold/30' },
};

export default function NotificationsDrawer({ isOpen, onClose }) {
  const {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    acceptFriendRequest,
    declineFriendRequest,
  } = useNotifications();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 cursor-pointer"
          />

          {/* Slide-Over Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed inset-y-0 right-0 w-full sm:w-96 bg-midnight text-cream shadow-2xl z-50 border-l border-gold/20 flex flex-col font-sans"
          >
            {/* Drawer Header */}
            <header className="p-4 border-b border-gold/20 flex items-center justify-between bg-midnight-light shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gold/15 text-gold border border-gold/30 shrink-0">
                  <Icon name="bell" size={18} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-gold text-lg leading-tight flex items-center gap-2">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500 text-white font-sans font-bold">
                        {unreadCount} New
                      </span>
                    )}
                  </h3>
                  <p className="text-[10px] text-cream/60">Real-time updates & requests</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="text-[11px] text-gold hover:underline font-serif"
                    title="Mark all as read"
                  >
                    Mark read
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-cream/70 hover:text-gold hover:bg-gold/10 transition-colors"
                >
                  <Icon name="x" size={18} />
                </button>
              </div>
            </header>

            {/* Notifications Body */}
            <div className="flex-1 overflow-y-auto divide-y divide-gold/10 p-3 space-y-2.5">
              {loading ? (
                <div className="py-16 text-center text-cream/50 text-xs font-serif">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-16 text-center space-y-3 px-4">
                  <div className="w-12 h-12 rounded-full bg-gold/10 text-gold flex items-center justify-center mx-auto border border-gold/20">
                    <Icon name="bell" size={24} />
                  </div>
                  <h4 className="font-serif text-base text-cream font-bold">No notifications yet</h4>
                  <p className="text-xs text-cream/60 leading-relaxed">
                    Friend requests, shared duo journal invites, and social interactions will appear here.
                  </p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const style = NOTIF_ICONS[notif.type] || NOTIF_ICONS.default;

                  return (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => markAsRead(notif.id)}
                      className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                        notif.read
                          ? 'bg-midnight-light/40 border-gold/10 opacity-80'
                          : 'bg-gold/10 border-gold/30 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Sender Avatar or Icon */}
                        {notif.senderPhoto ? (
                          <img
                            src={notif.senderPhoto}
                            alt={notif.senderName || 'Sender'}
                            className="w-9 h-9 rounded-full object-cover border border-gold/40 shrink-0 mt-0.5"
                          />
                        ) : (
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold shrink-0 border ${style.color}`}>
                            <Icon name={style.icon} size={16} />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-serif text-xs font-bold text-gold truncate">
                              {notif.title || notif.senderName || 'Notification'}
                            </h4>
                            <span className="text-[9px] text-cream/40 shrink-0">
                              {new Date(notif.createdAt?.seconds ? notif.createdAt.seconds * 1000 : Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <p className="text-xs text-cream/90 leading-relaxed mt-0.5">
                            {notif.message}
                          </p>
                        </div>
                      </div>

                      {/* Special Action Buttons for Friend Requests */}
                      {notif.type === 'friend_request' && (
                        <div className="flex items-center gap-2 pt-1 border-t border-gold/10">
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              acceptFriendRequest(notif);
                            }}
                            icon={<Icon name="check" size={14} />}
                            className="flex-1 text-xs py-1.5"
                          >
                            Accept
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              declineFriendRequest(notif.id);
                            }}
                            icon={<Icon name="x" size={14} />}
                            className="flex-1 text-xs py-1.5 border-cream/30 text-cream/80 hover:bg-white/10"
                          >
                            Decline
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
