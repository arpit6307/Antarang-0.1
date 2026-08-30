import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import Icon from '@/components/ui/Icon';

function parseDate(createdAt) {
  if (!createdAt) return null;
  if (typeof createdAt.toDate === 'function') return createdAt.toDate();
  if (createdAt.seconds) return new Date(createdAt.seconds * 1000);
  if (typeof createdAt === 'string' || typeof createdAt === 'number') return new Date(createdAt);
  if (createdAt instanceof Date) return createdAt;
  return null;
}

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function calculateStreaks(datesSet) {
  if (!datesSet || datesSet.size === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const now = new Date();
  const todayKey = formatDateKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = formatDateKey(yesterday);

  // 1. Calculate Current Streak
  let currentStreak = 0;
  let cursor = new Date(now);

  if (datesSet.has(todayKey)) {
    // Has written today
    while (datesSet.has(formatDateKey(cursor))) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }
  } else if (datesSet.has(yesterdayKey)) {
    // Has not written today yet, but wrote yesterday (streak is preserved)
    cursor = new Date(yesterday);
    while (datesSet.has(formatDateKey(cursor))) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }
  } else {
    currentStreak = 0;
  }

  // 2. Calculate Longest Streak
  const sortedDateKeys = Array.from(datesSet).sort();
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate = null;

  for (const dateKey of sortedDateKeys) {
    const [y, m, d] = dateKey.split('-').map(Number);
    const currentDate = new Date(y, m - 1, d);

    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diffMs = currentDate.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
    }

    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
    prevDate = currentDate;
  }

  return { currentStreak, longestStreak };
}

function AnimatedCounter({ value, duration = 1.0 }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const target = Number(value) || 0;
    if (target === 0) {
      setDisplayValue(0);
      return;
    }

    let startTimestamp = null;
    let animationFrameId;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(easeOut * target);
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(target);
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value, duration]);

  return <span>{displayValue}</span>;
}

export default function StatsPanel({ entries = [], className = '' }) {
  // Compute stats from entries
  const { currentStreak, longestStreak, thisMonthCount, topMood, topMoodCount } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const uniqueDatesSet = new Set();
    const moodCounts = {};
    let thisMonthEntries = 0;

    entries.forEach((entry) => {
      const d = parseDate(entry?.createdAt);
      if (d && !isNaN(d.getTime())) {
        uniqueDatesSet.add(formatDateKey(d));

        if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
          thisMonthEntries++;
        }
      }

      if (entry?.mood && typeof entry.mood === 'string') {
        const m = entry.mood.toLowerCase().trim();
        moodCounts[m] = (moodCounts[m] || 0) + 1;
      }
    });

    const { currentStreak, longestStreak } = calculateStreaks(uniqueDatesSet);

    // Find top mood
    let bestMood = null;
    let bestCount = 0;
    Object.entries(moodCounts).forEach(([mood, count]) => {
      if (count > bestCount) {
        bestCount = count;
        bestMood = mood;
      }
    });

    return {
      currentStreak,
      longestStreak,
      thisMonthCount: thisMonthEntries,
      topMood: bestMood,
      topMoodCount: bestCount,
    };
  }, [entries]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-midnight-light border border-gold/25 rounded-2xl p-5 sm:p-6 shadow-xl text-cream font-sans relative overflow-hidden ${className}`}
    >
      {/* Decorative background glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-wine/15 rounded-full blur-3xl pointer-events-none" />

      {/* Stats Grid: 2x2 on mobile, 4x1 on desktop */}
      <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 divide-y sm:divide-y-0 divide-gold/10">
        {/* 1. Current Streak */}
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left p-2 sm:p-0">
          <div className="flex items-center gap-2 mb-2 text-gold">
            <div className="p-2 rounded-xl bg-gold/10 border border-gold/20 text-gold shadow-xs">
              <Icon name="streak" className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium uppercase tracking-wider text-cream/70">
              Current Streak
            </span>
          </div>

          <div className="flex items-baseline gap-1.5 font-serif text-3xl sm:text-4xl font-bold text-cream">
            <span className="text-gold">
              <AnimatedCounter value={currentStreak} />
            </span>
            <span className="text-xs sm:text-sm font-sans font-normal text-cream/60">
              {currentStreak === 1 ? 'day' : 'days'}
            </span>
          </div>

          <p className="mt-1 text-[11px] sm:text-xs text-gold-light/80 font-sans">
            {currentStreak > 0 ? 'Keep writing today!' : 'Start your streak today'}
          </p>
        </div>

        {/* 2. Longest Streak */}
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left p-2 sm:p-0 pt-4 sm:pt-0">
          <div className="flex items-center gap-2 mb-2 text-gold">
            <div className="p-2 rounded-xl bg-gold/10 border border-gold/20 text-gold shadow-xs">
              <Icon name="trophy" className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium uppercase tracking-wider text-cream/70">
              Longest Streak
            </span>
          </div>

          <div className="flex items-baseline gap-1.5 font-serif text-3xl sm:text-4xl font-bold text-cream">
            <span className="text-gold-light">
              <AnimatedCounter value={longestStreak} />
            </span>
            <span className="text-xs sm:text-sm font-sans font-normal text-cream/60">
              {longestStreak === 1 ? 'day' : 'days'}
            </span>
          </div>

          <p className="mt-1 text-[11px] sm:text-xs text-cream/50 font-sans">
            Personal best record
          </p>
        </div>

        {/* 3. This Month */}
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left p-2 sm:p-0 pt-4 sm:pt-0">
          <div className="flex items-center gap-2 mb-2 text-gold">
            <div className="p-2 rounded-xl bg-gold/10 border border-gold/20 text-gold shadow-xs">
              <Icon name="calendar" className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium uppercase tracking-wider text-cream/70">
              This Month
            </span>
          </div>

          <div className="flex items-baseline gap-1.5 font-serif text-3xl sm:text-4xl font-bold text-cream">
            <span className="text-cream">
              <AnimatedCounter value={thisMonthCount} />
            </span>
            <span className="text-xs sm:text-sm font-sans font-normal text-cream/60">
              {thisMonthCount === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          <p className="mt-1 text-[11px] sm:text-xs text-cream/50 font-sans">
            Logged this month
          </p>
        </div>

        {/* 4. Top Mood */}
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left p-2 sm:p-0 pt-4 sm:pt-0">
          <div className="flex items-center gap-2 mb-2 text-gold">
            <div className="p-2 rounded-xl bg-gold/10 border border-gold/20 text-gold shadow-xs">
              <Icon name={topMood || 'heart-outline'} className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium uppercase tracking-wider text-cream/70">
              Top Mood
            </span>
          </div>

          <div className="flex items-baseline gap-2 font-serif text-2xl sm:text-3xl font-bold text-cream">
            {topMood ? (
              <div className="flex items-center gap-2">
                <span className="capitalize text-gold-light">{topMood}</span>
              </div>
            ) : (
              <span className="text-cream/40 font-sans text-xl">—</span>
            )}
          </div>

          <p className="mt-1 text-[11px] sm:text-xs text-cream/50 font-sans">
            {topMoodCount > 0
              ? `${topMoodCount} ${topMoodCount === 1 ? 'entry' : 'entries'} recorded`
              : 'No mood logged yet'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export { StatsPanel };
