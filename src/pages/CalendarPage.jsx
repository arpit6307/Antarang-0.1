import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query as firestoreQuery, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';
import { useDiaries } from '@/hooks/useDiaries';
import { lockManager } from '@/lib/lockManager';
import { db } from '@/lib/firebase';
import Icon from '@/components/ui/Icon';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import AddOfficeLeaveModal from '@/components/calendar/AddOfficeLeaveModal';

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

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MOOD_ICONS = {
  happy: 'happy',
  loved: 'loved',
  calm: 'calm',
  anxious: 'anxious',
  grateful: 'grateful',
  sad: 'sad',
  thoughtful: 'thoughtful',
};

const INDIAN_HOLIDAYS = [
  { date: '2026-01-01', name: 'New Year’s Day', type: 'Holiday', icon: 'sparkles', desc: 'Welcome 2026!' },
  { date: '2026-01-14', name: 'Makar Sankranti / Pongal', type: 'Festival', icon: 'flame', desc: 'Harvest festival of kites & sweets' },
  { date: '2026-01-26', name: 'Republic Day', type: 'National', icon: 'shield-check', desc: 'National Holiday' },
  { date: '2026-02-15', name: 'Maha Shivratri', type: 'Festival', icon: 'sparkles', desc: 'Night of Lord Shiva' },
  { date: '2026-03-04', name: 'Holi (Festival of Colors)', type: 'Festival', icon: 'sparkles', desc: 'Joyful festival of colors & joy' },
  { date: '2026-03-21', name: 'Eid al-Fitr', type: 'Festival', icon: 'moon', desc: 'Celebration of togetherness & feast' },
  { date: '2026-04-03', name: 'Good Friday', type: 'Holiday', icon: 'calendar', desc: 'Spring holiday' },
  { date: '2026-04-14', name: 'Ambedkar Jayanti / Baisakhi', type: 'Holiday', icon: 'star', desc: 'Harvest & Commemoration day' },
  { date: '2026-05-01', name: 'May Day / Labor Day', type: 'Holiday', icon: 'calendar', desc: 'International Workers Day' },
  { date: '2026-05-27', name: 'Eid al-Adha (Bakrid)', type: 'Festival', icon: 'moon', desc: 'Feast of Sacrifice' },
  { date: '2026-08-15', name: 'Independence Day', type: 'National', icon: 'shield-check', desc: '79th Indian Independence Day' },
  { date: '2026-08-28', name: 'Raksha Bandhan', type: 'Festival', icon: 'heart-outline', desc: 'Bond of love between siblings' },
  { date: '2026-09-04', name: 'Janmashtami', type: 'Festival', icon: 'sparkles', desc: 'Birth of Lord Krishna' },
  { date: '2026-09-14', name: 'Ganesh Chaturthi', type: 'Festival', icon: 'sparkles', desc: 'Welcoming Lord Ganesha' },
  { date: '2026-10-02', name: 'Gandhi Jayanti', type: 'National', icon: 'shield-check', desc: 'National Holiday' },
  { date: '2026-10-20', name: 'Dussehra (Vijayadashami)', type: 'Festival', icon: 'flame', desc: 'Triumph of Good over Evil' },
  { date: '2026-11-08', name: 'Diwali (Festival of Lights)', type: 'Festival', icon: 'sparkles', desc: 'Grand Festival of Lights & Prosperity' },
  { date: '2026-11-09', name: 'Govardhan Puja / Bhai Dooj', type: 'Festival', icon: 'heart-outline', desc: 'Post-Diwali celebrations' },
  { date: '2026-11-24', name: 'Guru Nanak Jayanti', type: 'Holiday', icon: 'star', desc: 'Gurpurab celebrations' },
  { date: '2026-12-25', name: 'Christmas Day', type: 'Festival', icon: 'sparkles', desc: 'Winter holiday of joy & gifts' },
];

const HOLIDAYS_MAP = new Map(INDIAN_HOLIDAYS.map((h) => [h.date, h]));

export default function CalendarPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { diaries, loading: diariesLoading } = useDiaries();

  const [viewMode, setViewMode] = useState('grid');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const [allEntries, setAllEntries] = useState([]);
  const [customLeaves, setCustomLeaves] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [isAddLeaveModalOpen, setIsAddLeaveModalOpen] = useState(false);
  const [isSelectDiaryModalOpen, setIsSelectDiaryModalOpen] = useState(false);
  const [deletingLeaveId, setDeletingLeaveId] = useState(null);

  // Subscribe to user custom office leaves
  useEffect(() => {
    if (!user) return;
    const leavesRef = collection(db, 'users', user.uid, 'custom_leaves');
    const q = firestoreQuery(leavesRef, orderBy('date', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCustomLeaves(list);
    });

    return () => unsubscribe();
  }, [user]);

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
            entryIndex: index,
            plainText,
            entryDate,
            dateKey: formatDateKey(entryDate),
            ...data,
          };
        });
      });

      const results = await Promise.all(entryPromises);
      const flattened = results.flat();
      setAllEntries(flattened);
    } catch (err) {
      console.error('Error fetching unlocked entries for calendar:', err);
    } finally {
      setLoadingEntries(false);
    }
  }, [user, diaries]);

  useEffect(() => {
    fetchUnlockedEntries();
  }, [fetchUnlockedEntries]);

  // Unlocked diaries list
  const unlockedDiaries = useMemo(() => {
    return (diaries || []).filter((d) => lockManager.isUnlocked(d));
  }, [diaries]);

  // Custom leaves map
  const customLeavesMap = useMemo(() => {
    const map = new Map();
    customLeaves.forEach((leave) => {
      if (leave.date) map.set(leave.date, leave);
    });
    return map;
  }, [customLeaves]);

  // Group entries by dateKey (YYYY-MM-DD)
  const entriesByDateKey = useMemo(() => {
    const map = new Map();
    allEntries.forEach((entry) => {
      const list = map.get(entry.dateKey) || [];
      list.push(entry);
      map.set(entry.dateKey, list);
    });
    return map;
  }, [allEntries]);

  // Build calendar matrix
  const calendarCells = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const todayStr = formatDateKey(new Date());
    const selectedStr = formatDateKey(selectedDate);

    const cells = [];

    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ isBlank: true, id: `blank-${i}` });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dateKey = formatDateKey(dateObj);

      const dayEntries = entriesByDateKey.get(dateKey) || [];
      const festival = HOLIDAYS_MAP.get(dateKey);
      const officeLeave = customLeavesMap.get(dateKey);

      let dominantMood = null;
      if (dayEntries.length > 0) {
        const moodCounts = {};
        dayEntries.forEach((e) => {
          if (e.mood) moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
        });
        const sorted = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) dominantMood = sorted[0][0];
      }

      cells.push({
        isBlank: false,
        key: dateKey,
        dayNumber: d,
        dateObj,
        dateKey,
        isToday: dateKey === todayStr,
        isSelected: dateKey === selectedStr,
        hasEntries: dayEntries.length > 0,
        entriesCount: dayEntries.length,
        dominantMood,
        festival,
        officeLeave,
      });
    }

    return cells;
  }, [currentMonth, selectedDate, entriesByDateKey, customLeavesMap]);

  const selectedDateKey = useMemo(() => formatDateKey(selectedDate), [selectedDate]);
  const selectedDayEntries = useMemo(
    () => entriesByDateKey.get(selectedDateKey) || [],
    [entriesByDateKey, selectedDateKey]
  );
  const selectedDayFestival = useMemo(
    () => HOLIDAYS_MAP.get(selectedDateKey),
    [selectedDateKey]
  );
  const selectedDayLeave = useMemo(
    () => customLeavesMap.get(selectedDateKey),
    [customLeavesMap, selectedDateKey]
  );

  const monthStats = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    let totalMonthEntries = 0;
    const activeDaysSet = new Set();

    allEntries.forEach((entry) => {
      if (entry.entryDate.getFullYear() === year && entry.entryDate.getMonth() === month) {
        totalMonthEntries++;
        activeDaysSet.add(entry.dateKey);
      }
    });

    return {
      totalMonthEntries,
      activeDaysCount: activeDaysSet.size,
    };
  }, [currentMonth, allEntries]);

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };
  const jumpToToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  };

  const handleJumpToHoliday = (holidayDateStr) => {
    const parts = holidayDateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const targetDate = new Date(year, month, day);
    setCurrentMonth(new Date(year, month, 1));
    setSelectedDate(targetDate);
    setViewMode('grid');
  };

  const handleCellClick = (cellDateObj) => {
    setSelectedDate(cellDateObj);
  };

  const handleOpenLeaveModalForDate = (dateObj = selectedDate) => {
    setSelectedDate(dateObj);
    setIsAddLeaveModalOpen(true);
  };

  const handleWriteJournalClick = () => {
    if (unlockedDiaries.length === 0) {
      navigate('/home', { state: { openCreateModal: true } });
      return;
    }

    if (unlockedDiaries.length === 1) {
      navigate(`/diary/${unlockedDiaries[0].id}`, {
        state: { openNewEntry: true, defaultDate: selectedDate },
      });
      return;
    }

    setIsSelectDiaryModalOpen(true);
  };

  const handleSelectDiaryToCreateEntry = (diary) => {
    setIsSelectDiaryModalOpen(false);
    navigate(`/diary/${diary.id}`, {
      state: { openNewEntry: true, defaultDate: selectedDate },
    });
  };

  const handleDeleteLeave = async (leaveId) => {
    if (!user || !leaveId) return;
    setDeletingLeaveId(leaveId);
    try {
      const leaveRef = doc(db, 'users', user.uid, 'custom_leaves', leaveId);
      await deleteDoc(leaveRef);
    } catch (err) {
      console.error('Error deleting leave:', err);
    } finally {
      setDeletingLeaveId(null);
    }
  };

  const handleEntryClick = (entry) => {
    navigate(`/diary/${entry.diaryId}`, {
      state: {
        entryIndex: entry.entryIndex,
        entryId: entry.id,
      },
    });
  };

  const monthYearLabel = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const formattedSelectedDate = selectedDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-cream text-ink font-sans pb-20 md:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-6 sm:pt-10 space-y-6 sm:space-y-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gold/20 pb-4 sm:pb-6">
          <div className="space-y-1">
            <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-midnight font-bold flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-midnight text-gold border border-gold/30 shrink-0 shadow-md">
                <Icon name="calendar" size={26} />
              </div>
              <span>Royal Calendar & Holiday Showcase</span>
            </h1>
            <p className="font-sans text-xs sm:text-sm text-ink-muted">
              Explore diary reflections, Indian public holidays, & 1-click office leave management
            </p>
          </div>

          {/* Action Buttons & Navigation */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenLeaveModalForDate(selectedDate)}
              icon={<Icon name="plus" size={14} />}
              className="text-xs py-2 shadow-md font-bold"
            >
              + Mark Office Leave
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={jumpToToday}
              icon={<Icon name="clock" size={14} />}
              className="text-xs py-2 border-gold/40 text-midnight font-bold"
            >
              Today
            </Button>
          </div>
        </header>

        {/* View Switcher Tabs Bar */}
        <div className="flex bg-midnight-light p-1.5 rounded-2xl border border-gold/25 font-serif text-xs font-bold overflow-x-auto">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`flex-1 py-2.5 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              viewMode === 'grid'
                ? 'bg-gold text-midnight shadow-md font-bold'
                : 'text-cream/70 hover:text-gold'
            }`}
          >
            <Icon name="calendar" size={14} />
            <span>Calendar Grid</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('holidays')}
            className={`flex-1 py-2.5 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              viewMode === 'holidays'
                ? 'bg-gold text-midnight shadow-md font-bold'
                : 'text-cream/70 hover:text-gold'
            }`}
          >
            <Icon name="sparkles" size={14} />
            <span>Indian Holidays 2026 ({INDIAN_HOLIDAYS.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('leaves')}
            className={`flex-1 py-2.5 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              viewMode === 'leaves'
                ? 'bg-gold text-midnight shadow-md font-bold'
                : 'text-cream/70 hover:text-gold'
            }`}
          >
            <Icon name="briefcase" size={14} />
            <span>Leaves Manager ({customLeaves.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('timeline')}
            className={`flex-1 py-2.5 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              viewMode === 'timeline'
                ? 'bg-gold text-midnight shadow-md font-bold'
                : 'text-cream/70 hover:text-gold'
            }`}
          >
            <Icon name="file-text" size={14} />
            <span>Timeline Stream</span>
          </button>
        </div>

        {/* ================= MODE 1: SPECTACULAR CALENDAR GRID VIEW ================= */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Left Column: Interactive Royal Calendar Grid */}
            <div className="lg:col-span-7 space-y-5 sm:space-y-6">
              {/* Premium Analytics Cards */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
                <div className="bg-gradient-to-br from-white to-amber-50/50 p-3 sm:p-4 rounded-2xl border border-gold/30 shadow-sm flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gold/20 text-gold flex items-center justify-center font-bold shrink-0 border border-gold/30 shadow-inner">
                    <Icon name="file-text" size={18} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-serif font-bold text-gold-dark tracking-wider block truncate">
                      This Month
                    </span>
                    <p className="font-serif text-base sm:text-xl font-bold text-midnight leading-tight">
                      {monthStats.totalMonthEntries} <span className="hidden sm:inline text-xs font-normal">Entries</span>
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-white to-rose-50/50 p-3 sm:p-4 rounded-2xl border border-rose-300/40 shadow-sm flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center font-bold shrink-0 border border-rose-400/30 shadow-inner">
                    <Icon name="sparkles" size={18} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-serif font-bold text-rose-600 tracking-wider block truncate">
                      Active Days
                    </span>
                    <p className="font-serif text-base sm:text-xl font-bold text-midnight leading-tight">
                      {monthStats.activeDaysCount} <span className="hidden sm:inline text-xs font-normal">Days</span>
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-white to-indigo-50/50 p-3 sm:p-4 rounded-2xl border border-indigo-300/40 shadow-sm flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/15 text-indigo-600 flex items-center justify-center font-bold shrink-0 border border-indigo-400/30 shadow-inner">
                    <Icon name="briefcase" size={18} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-serif font-bold text-indigo-600 tracking-wider block truncate">
                      Leaves
                    </span>
                    <p className="font-serif text-base sm:text-xl font-bold text-midnight leading-tight">
                      {customLeaves.length} <span className="hidden sm:inline text-xs font-normal">Saved</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Royal Gold Calendar Card */}
              <div className="bg-white rounded-2xl border-2 border-gold/30 shadow-xl p-4 sm:p-6 space-y-4">
                {/* Month Navigation Bar */}
                <div className="flex items-center justify-between pb-3.5 border-b border-gold/20">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="p-2 rounded-xl bg-gold/10 text-midnight hover:text-gold hover:bg-midnight transition-colors cursor-pointer border border-gold/30 shadow-xs"
                  >
                    <Icon name="chevron-left" size={20} />
                  </button>

                  <div className="text-center">
                    <h2 className="font-serif text-xl sm:text-2xl font-bold text-midnight leading-tight">
                      {monthYearLabel}
                    </h2>
                    <span className="text-[10px] uppercase font-serif text-gold font-bold tracking-widest">
                      Antarang Royal Calendar
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={nextMonth}
                    className="p-2 rounded-xl bg-gold/10 text-midnight hover:text-gold hover:bg-midnight transition-colors cursor-pointer border border-gold/30 shadow-xs"
                  >
                    <Icon name="chevron-right" size={20} />
                  </button>
                </div>

                {/* Weekdays Row */}
                <div className="grid grid-cols-7 gap-1.5 text-center">
                  {WEEKDAYS.map((day) => (
                    <div key={day} className="text-xs font-serif font-bold text-gold uppercase tracking-wider py-1 bg-gold/10 rounded-lg border border-gold/20">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Day Tiles Grid */}
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {calendarCells.map((cell) => {
                    if (cell.isBlank) {
                      return <div key={cell.id} className="h-14 sm:h-16 rounded-2xl bg-transparent" />;
                    }

                    return (
                      <button
                        key={cell.key}
                        type="button"
                        onClick={() => handleCellClick(cell.dateObj)}
                        className={`relative h-14 sm:h-16 rounded-2xl flex flex-col items-center justify-between p-1 sm:p-1.5 transition-all cursor-pointer border shadow-sm overflow-hidden w-full max-w-full ${
                          cell.isSelected
                            ? 'bg-gradient-to-br from-gold via-amber-400 to-gold text-midnight border-gold font-bold shadow-lg scale-105 z-10'
                            : cell.isToday
                            ? 'bg-cream border-2 border-gold text-midnight font-bold ring-2 ring-gold/30'
                            : cell.officeLeave
                            ? 'bg-indigo-500/15 text-indigo-900 border-indigo-400/60 hover:border-indigo-600 hover:shadow-md'
                            : cell.festival
                            ? 'bg-amber-500/20 text-amber-950 border-amber-400/60 hover:border-amber-500 hover:shadow-md'
                            : cell.hasEntries
                            ? 'bg-midnight text-cream border-gold/40 hover:border-gold hover:shadow-md'
                            : 'bg-white text-midnight/80 border-gold/20 hover:border-gold/50 hover:bg-amber-50/40'
                        }`}
                      >
                        <div className="w-full flex items-center justify-between px-0.5 sm:px-1">
                          <span className="text-xs sm:text-sm font-mono font-bold shrink-0">{cell.dayNumber}</span>

                          <div className="flex items-center gap-0.5 shrink-0 max-w-[65%] overflow-hidden">
                            {cell.officeLeave && (
                              <span
                                className="text-[8px] sm:text-[9px] px-1 py-0.5 rounded-full bg-indigo-600 text-white font-serif font-bold shrink-0 flex items-center gap-0.5 shadow-xs truncate"
                                title={cell.officeLeave.title}
                              >
                                <Icon name="briefcase" size={9} />
                                <span className="hidden md:inline truncate">{cell.officeLeave.title.split(' ')[0]}</span>
                              </span>
                            )}
                            {cell.festival && (
                              <span
                                className="text-[8px] sm:text-[9px] px-1 py-0.5 rounded-full bg-rose-500 text-white font-serif font-bold shrink-0 flex items-center gap-0.5 shadow-xs truncate"
                                title={cell.festival.name}
                              >
                                <Icon name="sparkles" size={9} />
                                <span className="hidden md:inline truncate">{cell.festival.name.split(' ')[0]}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Entry Mood Icon */}
                        {cell.hasEntries && (
                          <div className="flex items-center gap-1">
                            {cell.dominantMood ? (
                              <Icon
                                name={MOOD_ICONS[cell.dominantMood] || 'sparkles'}
                                size={12}
                                className={cell.isSelected ? 'text-midnight' : 'text-gold'}
                              />
                            ) : (
                              <div className={`w-2 h-2 rounded-full ${cell.isSelected ? 'bg-midnight' : 'bg-gold'}`} />
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Selected Date Interactive Actions & Details */}
            <div className="lg:col-span-5 space-y-5">
              <div className="bg-white rounded-2xl border-2 border-gold/30 shadow-xl p-4 sm:p-6 space-y-4">
                {/* Selected Date Header */}
                <div className="border-b border-gold/20 pb-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-serif font-bold text-gold tracking-wider block">
                      Selected Day Showcase
                    </span>
                    <h3 className="font-serif text-lg font-bold text-midnight">
                      {formattedSelectedDate}
                    </h3>
                  </div>

                  <span className="text-xs px-2.5 py-1 rounded-full bg-gold/15 text-gold font-serif font-bold border border-gold/30">
                    {selectedDayEntries.length} Reflections
                  </span>
                </div>

                {/* Instant Action Bar */}
                <div className="grid grid-cols-2 gap-2 bg-gradient-to-r from-amber-50 to-rose-50 p-3 rounded-2xl border border-gold/30 shadow-xs">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenLeaveModalForDate(selectedDate)}
                    icon={<Icon name="briefcase" size={14} />}
                    className="text-xs py-2 flex items-center justify-center font-bold"
                  >
                    + Leave Date
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleWriteJournalClick}
                    icon={<Icon name="edit" size={14} />}
                    className="text-xs py-2 border-gold/40 text-midnight flex items-center justify-center font-bold bg-white"
                  >
                    + Write Journal
                  </Button>
                </div>

                {/* Festival / Holiday Alert Showcase */}
                {selectedDayFestival && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-100 to-rose-100 border border-amber-400/60 text-amber-950 text-xs flex items-center gap-3 shadow-sm">
                    <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 shadow-sm">
                      <Icon name={selectedDayFestival.icon || 'sparkles'} size={18} />
                    </div>
                    <div>
                      <span className="font-serif font-bold text-sm block text-midnight">{selectedDayFestival.name}</span>
                      <span className="text-[10px] font-serif font-bold text-rose-700 uppercase tracking-wider block mt-0.5">
                        {selectedDayFestival.type} — {selectedDayFestival.desc}
                      </span>
                    </div>
                  </div>
                )}

                {/* Custom Office Leave Details Alert */}
                {selectedDayLeave && (
                  <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-300 text-indigo-950 text-xs flex items-center justify-between gap-2 shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0 shadow-sm">
                        <Icon name="briefcase" size={18} />
                      </div>
                      <div className="min-w-0">
                        <span className="font-serif font-bold text-sm block text-midnight truncate">{selectedDayLeave.title}</span>
                        <span className="text-[10px] text-indigo-700 font-bold capitalize block mt-0.5">
                          Category: {selectedDayLeave.type || 'office leave'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={deletingLeaveId === selectedDayLeave.id}
                      onClick={() => handleDeleteLeave(selectedDayLeave.id)}
                      className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors border border-rose-200 cursor-pointer shrink-0"
                      title="Delete Office Leave"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                )}

                {/* Day Reflections List */}
                <div className="space-y-3 pt-2">
                  <h4 className="font-serif text-xs uppercase font-bold text-gold tracking-wider">
                    Memories Written On This Day:
                  </h4>

                  {selectedDayEntries.length === 0 ? (
                    <div className="py-6 text-center text-xs text-ink-muted bg-cream/30 rounded-xl border border-gold/15 p-4 font-serif">
                      No diary entries written on {formattedSelectedDate}.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                      {selectedDayEntries.map((entry) => (
                        <div
                          key={entry.id}
                          onClick={() => handleEntryClick(entry)}
                          className="p-3 rounded-xl border border-gold/20 bg-white hover:border-gold transition-all cursor-pointer space-y-1.5 shadow-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-serif text-xs font-bold text-midnight truncate">
                              {entry.diaryName}
                            </span>
                            {entry.mood && (
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-gold/15 text-gold font-serif font-bold capitalize">
                                {entry.mood}
                              </span>
                            )}
                          </div>
                          <p className="font-serif text-xs text-midnight/90 line-clamp-2 leading-relaxed">
                            "{entry.plainText}"
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODE 2: INDIAN HOLIDAYS SHOWCASE DIRECTORY ================= */}
        {viewMode === 'holidays' && (
          <div className="bg-white rounded-2xl border-2 border-gold/30 shadow-xl p-4 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gold/20 pb-3">
              <div>
                <h2 className="font-serif text-xl font-bold text-midnight flex items-center gap-2">
                  <Icon name="sparkles" size={20} className="text-gold" />
                  <span>Indian Public Holidays & Festivals 2026 Directory</span>
                </h2>
                <p className="text-xs text-ink-muted">All major national holidays, festivals & celebrations across the year</p>
              </div>

              <span className="text-xs font-mono font-bold text-gold bg-gold/15 px-3 py-1 rounded-full border border-gold/30">
                {INDIAN_HOLIDAYS.length} Holidays
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {INDIAN_HOLIDAYS.map((holiday) => (
                <motion.div
                  key={holiday.date}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl border border-gold/25 bg-gradient-to-br from-amber-50/50 to-rose-50/50 shadow-sm flex flex-col justify-between space-y-3 hover:border-gold transition-all"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-serif uppercase font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-200">
                        {holiday.type}
                      </span>
                      <span className="text-xs font-mono font-bold text-midnight">{holiday.date}</span>
                    </div>

                    <h3 className="font-serif text-base font-bold text-midnight pt-1 flex items-center gap-2">
                      <Icon name={holiday.icon} size={16} className="text-gold shrink-0" />
                      <span>{holiday.name}</span>
                    </h3>
                    <p className="text-xs text-midnight/80">{holiday.desc}</p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleJumpToHoliday(holiday.date)}
                    icon={<Icon name="calendar" size={12} />}
                    className="w-full text-xs py-1.5 border-gold/40 text-midnight font-bold bg-white hover:bg-gold/10"
                  >
                    Jump to Calendar Date
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ================= MODE 3: SAVED OFFICE LEAVES MANAGER ================= */}
        {viewMode === 'leaves' && (
          <div className="bg-white rounded-2xl border-2 border-gold/30 shadow-xl p-4 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gold/20 pb-3">
              <div>
                <h2 className="font-serif text-xl font-bold text-midnight flex items-center gap-2">
                  <Icon name="briefcase" size={20} className="text-gold" />
                  <span>My Saved Office Leaves & Holidays Manager</span>
                </h2>
                <p className="text-xs text-ink-muted">View, add, or cancel casual leaves, sick leaves & WFH</p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => handleOpenLeaveModalForDate(selectedDate)}
                icon={<Icon name="plus" size={14} />}
                className="text-xs py-1.5 font-bold"
              >
                + Mark Leave
              </Button>
            </div>

            {customLeaves.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-cream/30 rounded-2xl border border-gold/15 p-8">
                <Icon name="briefcase" size={32} className="text-gold/40 mx-auto" />
                <h3 className="font-serif text-base text-midnight font-bold">No saved office leaves</h3>
                <p className="text-xs text-ink-muted">Click "+ Mark Leave" to easily record your casual leave or vacation!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {customLeaves.map((leave) => (
                  <div
                    key={leave.id}
                    className="p-4 rounded-2xl border border-gold/20 bg-cream/40 flex flex-col justify-between space-y-3 shadow-sm hover:border-gold transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-serif uppercase font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                          {leave.type || 'Office Leave'}
                        </span>
                        <span className="text-xs font-mono font-bold text-midnight">{leave.date}</span>
                      </div>
                      <h4 className="font-serif text-sm font-bold text-midnight pt-1">{leave.title}</h4>
                      {leave.notes && <p className="text-xs text-ink-muted italic">"{leave.notes}"</p>}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gold/15 text-xs">
                      <span className="text-[10px] text-ink-muted font-bold">Recorded on Calendar</span>
                      <button
                        type="button"
                        disabled={deletingLeaveId === leave.id}
                        onClick={() => handleDeleteLeave(leave.id)}
                        className="px-2.5 py-1 rounded-lg text-xs font-serif border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer flex items-center gap-1 font-bold"
                      >
                        <Icon name="trash" size={12} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= MODE 4: TIMELINE STREAM VIEW ================= */}
        {viewMode === 'timeline' && (
          <div className="bg-white rounded-2xl border-2 border-gold/30 shadow-xl p-4 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gold/20 pb-3">
              <h2 className="font-serif text-xl font-bold text-midnight flex items-center gap-2">
                <Icon name="file-text" size={20} className="text-gold" />
                <span>Memory Timeline Stream</span>
              </h2>
              <span className="text-xs font-mono font-bold text-gold">{allEntries.length} Total Entries</span>
            </div>

            {loadingEntries ? (
              <div className="py-16 text-center text-xs font-serif text-ink-muted">Loading timeline...</div>
            ) : allEntries.length === 0 ? (
              <div className="py-16 text-center text-xs font-serif text-ink-muted bg-cream/30 rounded-2xl p-8 border border-gold/15">
                No entries written yet across your unlocked diaries.
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {allEntries.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => handleEntryClick(entry)}
                    className="p-4 rounded-2xl border border-gold/20 bg-cream/30 hover:border-gold transition-all cursor-pointer space-y-2 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.diaryColor }} />
                        <span className="font-serif text-xs font-bold text-midnight">{entry.diaryName}</span>
                      </div>
                      <span className="text-xs font-mono text-gold font-bold">{entry.dateKey}</span>
                    </div>

                    <p className="font-serif text-sm text-midnight/90 leading-relaxed">
                      "{entry.plainText}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add Office Leave Modal */}
        <AddOfficeLeaveModal
          isOpen={isAddLeaveModalOpen}
          onClose={() => setIsAddLeaveModalOpen(false)}
          defaultDate={selectedDate}
        />

        {/* Select Diary to Write Entry Modal */}
        <Modal
          isOpen={isSelectDiaryModalOpen}
          onClose={() => setIsSelectDiaryModalOpen(false)}
          title="Select Diary to Write Entry"
        >
          <div className="space-y-4 font-sans">
            <p className="text-xs text-midnight/80 leading-relaxed">
              Choose which unlocked diary book you would like to write your entry for{' '}
              <strong className="text-gold">{formattedSelectedDate}</strong>:
            </p>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {unlockedDiaries.map((d) => (
                <div
                  key={d.id}
                  onClick={() => handleSelectDiaryToCreateEntry(d)}
                  className="p-3.5 rounded-2xl border border-gold/30 bg-cream/40 hover:border-gold hover:bg-gold/10 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-xs group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                      style={{ backgroundColor: d.coverColor || '#0B1121' }}
                    >
                      <Icon name={d.icon || 'book'} size={20} />
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-serif text-sm font-bold text-midnight truncate group-hover:text-gold">
                        {d.name}
                      </h4>
                      <span className="text-[10px] text-ink-muted block truncate">
                        {d.isShared ? 'Shared Duo Journal' : 'Personal Journal'}
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => handleSelectDiaryToCreateEntry(d)}
                    icon={<Icon name="edit" size={12} />}
                    className="text-xs py-1.5 px-3 font-bold"
                  >
                    Write Here
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
