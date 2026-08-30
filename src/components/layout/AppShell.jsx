import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import Icon from '@/components/ui/Icon';

const NAV_ITEMS = [
  { name: 'Home Bookshelf', path: '/', icon: 'book' },
  { name: 'Moments Feed', path: '/feed', icon: 'sparkles' },
  { name: 'Direct DMs', path: '/messages', icon: 'message-square' },
  { name: 'Search Entries', path: '/search', icon: 'search' },
  { name: 'Calendar View', path: '/calendar', icon: 'calendar' },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [deletionInfo, setDeletionInfo] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    if (!user) return;
    const checkDeletionStatus = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists() && snap.data().scheduledForDeletion) {
          const data = snap.data();
          const dueDate = data.deletionDueDate ? new Date(data.deletionDueDate) : new Date();
          const daysLeft = Math.max(1, Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24)));
          setDeletionInfo({ daysLeft, dueDate });
        }
      } catch (_) {}
    };
    checkDeletionStatus();
  }, [user]);

  const handleCancelDeletion = async () => {
    if (!user) return;
    setIsRestoring(true);
    try {
      await setDoc(doc(db, 'users', user.uid), { scheduledForDeletion: false }, { merge: true });
      setDeletionInfo(null);
    } catch (_) {} finally {
      setIsRestoring(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (_) {}
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-cream overflow-hidden font-sans">
      {/* Mobile Top App Bar */}
      <header className="md:hidden bg-midnight border-b border-gold/20 px-4 py-3 flex items-center justify-between z-40 shrink-0">
        <div className="flex items-center gap-2.5" onClick={() => navigate('/')}>
          <div className="w-8 h-8 rounded-lg bg-gold/15 text-gold flex items-center justify-center border border-gold/30 shrink-0">
            <Icon name="quill" size={18} />
          </div>
          <span className="font-serif text-lg font-bold text-gold tracking-wide">
            अंतरंग
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick DMs Icon */}
          <NavLink
            to="/messages"
            className={`p-2 rounded-xl border transition-colors ${
              location.pathname.startsWith('/messages')
                ? 'bg-gold/20 text-gold border-gold/40'
                : 'bg-gold/10 text-cream/80 border-gold/15 hover:text-gold'
            }`}
            title="Direct DMs"
          >
            <Icon name="message-square" size={18} />
          </NavLink>

          {/* Account Settings Avatar */}
          <NavLink
            to="/settings"
            className="flex items-center gap-1.5 p-1 rounded-full bg-gold/10 border border-gold/20 hover:border-gold/40 transition-colors"
            title="Profile & Settings"
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-7 h-7 rounded-full object-cover border border-gold/40"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gold/20 text-gold flex items-center justify-center font-bold font-serif text-xs border border-gold/30">
                {user?.displayName?.[0] || 'U'}
              </div>
            )}
          </NavLink>
        </div>
      </header>

      {/* Rich Expanded Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-midnight border-r border-gold/20 shadow-2xl z-30 shrink-0">
        {/* Brand Header */}
        <div className="p-6 border-b border-gold/15 flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 rounded-xl bg-gold/15 text-gold flex items-center justify-center border border-gold/30 shadow-inner shrink-0">
            <Icon name="quill" size={22} />
          </div>
          <div>
            <h1 className="font-serif text-xl font-bold text-gold tracking-wide leading-tight">
              अंतरंग
            </h1>
            <p className="text-[10px] font-sans text-cream/60 tracking-wider uppercase mt-0.5">
              Royal Journal & Whispers
            </p>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 group font-serif text-sm font-medium ${
                  isActive
                    ? 'bg-gold text-midnight font-bold shadow-lg shadow-gold/10 scale-[1.02]'
                    : 'text-cream/70 hover:text-gold hover:bg-gold/10'
                }`}
              >
                <Icon
                  name={item.icon}
                  size={20}
                  className={isActive ? 'text-midnight' : 'text-gold/80 group-hover:text-gold'}
                />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Desktop User Profile Card & Actions */}
        <div className="p-4 border-t border-gold/15 bg-midnight-light/50 space-y-3">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-midnight border border-gold/15 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-9 h-9 rounded-full object-cover border border-gold/40 shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gold/15 text-gold flex items-center justify-center font-bold font-serif border border-gold/30 shrink-0 text-sm">
                  {user?.displayName?.[0] || 'U'}
                </div>
              )}
              <div className="min-w-0">
                <h4 className="font-serif text-xs font-semibold text-cream truncate">
                  {user?.displayName || 'Writer'}
                </h4>
                <p className="text-[10px] text-cream/50 truncate">{user?.email}</p>
              </div>
            </div>

            <NavLink
              to="/settings"
              className={`p-1.5 rounded-lg transition-colors ${
                location.pathname.startsWith('/settings')
                  ? 'text-gold bg-gold/15'
                  : 'text-cream/60 hover:text-gold hover:bg-gold/10'
              }`}
              title="Account Settings"
            >
              <Icon name="settings" size={18} />
            </NavLink>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-rose-500/30 text-rose-300 text-xs font-serif hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto overflow-x-hidden bg-cream pb-20 md:pb-0">
        {deletionInfo && (
          <div className="bg-amber-900/90 text-amber-100 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs border-b border-amber-500/40 z-30 shadow-md">
            <div className="flex items-center gap-2">
              <Icon name="alert-triangle" size={16} className="text-gold flex-shrink-0" />
              <span>
                <strong>Account Scheduled for Deletion:</strong> Permanent removal in{' '}
                <strong>{deletionInfo.daysLeft} days</strong>.
              </span>
            </div>
            <button
              type="button"
              onClick={handleCancelDeletion}
              disabled={isRestoring}
              className="px-3 py-1 bg-gold text-midnight font-semibold rounded-lg hover:bg-gold-light transition-colors text-[11px] cursor-pointer"
            >
              {isRestoring ? 'Restoring...' : 'Cancel Deletion & Recover Account'}
            </button>
          </div>
        )}
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar (4 Core Items + Touch Feedback) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-midnight/95 backdrop-blur-md border-t border-gold/20 z-50 px-3 flex items-center justify-around shadow-2xl">
        {[
          { name: 'Home', path: '/', icon: 'book' },
          { name: 'Feed', path: '/feed', icon: 'sparkles' },
          { name: 'Search', path: '/search', icon: 'search' },
          { name: 'Calendar', path: '/calendar', icon: 'calendar' },
        ].map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`relative flex flex-col items-center justify-center space-y-1 py-1.5 px-3.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-gold font-bold scale-105 bg-gold/10 border border-gold/20'
                  : 'text-cream-dark/60 hover:text-cream'
              }`}
            >
              <Icon name={item.icon} className={`w-5 h-5 ${isActive ? 'text-gold' : 'text-cream/60'}`} />
              <span className="text-[10px] font-medium tracking-wide font-serif">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
