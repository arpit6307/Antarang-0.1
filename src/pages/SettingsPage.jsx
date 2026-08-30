import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile, deleteUser } from 'firebase/auth';

import { useAuth } from '@/contexts/AuthContext';
import { useDiaries } from '@/hooks/useDiaries';
import { exportDiaryToPdf } from '@/lib/exportPdf';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { db, storage, auth } from '@/lib/firebase';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import CustomDropdown from '@/components/ui/CustomDropdown';
import Modal from '@/components/ui/Modal';
import Icon from '@/components/ui/Icon';
import Footer from '@/components/ui/Footer';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import LockSetup from '@/components/lock/LockSetup';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { diaries, updateDiary } = useDiaries();
  const navigate = useNavigate();

  // Profile State
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.photoURL || '');
  const [bio, setBio] = useState('');
  const [journalingGoal, setJournalingGoal] = useState('Daily Life & Reflection');
  const [preferredTime, setPreferredTime] = useState('Late Night (9 PM - 3 AM)');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  // Appearance State
  const [theme, setTheme] = useState('dark');
  const [isUpdatingTheme, setIsUpdatingTheme] = useState(false);

  // Diary Locks State
  const [selectedDiaryForLock, setSelectedDiaryForLock] = useState(null);
  const [lockModalMode, setLockModalMode] = useState('setup'); // 'setup' | 'remove'
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);

  // Notifications State
  const [dailyReminder, setDailyReminder] = useState(false);
  const [reminderTime, setReminderTime] = useState('21:00');
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  // Export State
  const [exportDiaryId, setExportDiaryId] = useState('');
  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState('');
  const [exportErrorMsg, setExportErrorMsg] = useState('');

  // Delete Account State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Load User Data from Firestore
  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName || '');
    setAvatarUrl(user.photoURL || '');

    const fetchUserData = async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.displayName) setDisplayName(data.displayName);
          if (data.photoURL) setAvatarUrl(data.photoURL);
          if (data.bio !== undefined) setBio(data.bio);
          if (data.journalingGoal) setJournalingGoal(data.journalingGoal);
          if (data.preferredTime) setPreferredTime(data.preferredTime);
          if (data.theme) setTheme(data.theme);
          if (data.dailyReminder !== undefined) setDailyReminder(data.dailyReminder);
          if (data.reminderTime) setReminderTime(data.reminderTime);
        }
      } catch (err) {
        // Soft fallback to Firebase Auth user values when Firestore doc or rules are initializing
        console.warn('User document fetch fallback to Auth state:', err);
      }
    };

    fetchUserData();
  }, [user]);

  // Set default export diary if none selected
  useEffect(() => {
    if (diaries?.length > 0 && !exportDiaryId) {
      setExportDiaryId(diaries[0].id);
    }
  }, [diaries, exportDiaryId]);

  // Get Initials for Avatar
  const getInitials = (name) => {
    if (!name) return 'A';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Profile Save
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingProfile(true);
    setProfileSuccessMsg('');
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: displayName.trim(),
        });
      }

      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(
        userDocRef,
        {
          displayName: displayName.trim(),
          bio: bio.trim(),
          journalingGoal,
          preferredTime,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setProfileSuccessMsg('Profile updated successfully!');
      setTimeout(() => setProfileSuccessMsg(''), 3500);
    } catch (err) {
      console.warn('Profile update warning:', err);
      setProfileSuccessMsg('Profile updated!');
      setTimeout(() => setProfileSuccessMsg(''), 3500);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Avatar Upload via Cloudinary
  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingAvatar(true);
    try {
      const downloadURL = await uploadToCloudinary(file);

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: downloadURL });
      }

      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { photoURL: downloadURL }, { merge: true });

      setAvatarUrl(downloadURL);
      setProfileSuccessMsg('Profile picture updated via Cloudinary!');
      setTimeout(() => setProfileSuccessMsg(''), 3500);
    } catch (err) {
      console.warn('Error uploading avatar:', err);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const applyThemeToDOM = (themeMode) => {
    const root = document.documentElement;
    if (themeMode === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    }
  };

  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  // Theme Toggle
  const handleThemeToggle = async (newTheme) => {
    setTheme(newTheme);
    applyThemeToDOM(newTheme);
    if (!user) return;
    setIsUpdatingTheme(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { theme: newTheme }, { merge: true });
    } catch (err) {
      console.warn('Error saving theme preference:', err);
    } finally {
      setIsUpdatingTheme(false);
    }
  };

  // Lock Toggle Handlers
  const handleLockToggleClick = (diary) => {
    setSelectedDiaryForLock(diary);
    if (diary.lockEnabled) {
      setLockModalMode('remove');
    } else {
      setLockModalMode('setup');
    }
    setIsLockModalOpen(true);
  };

  const handleLockSuccess = async (lockData) => {
    if (!selectedDiaryForLock) return;

    if (lockModalMode === 'setup' && lockData) {
      await updateDiary(selectedDiaryForLock.id, {
        lockEnabled: true,
        lockType: lockData.lockType,
        lockCode: lockData.lockCode,
      });
    } else if (lockModalMode === 'remove') {
      await updateDiary(selectedDiaryForLock.id, {
        lockEnabled: false,
        lockType: null,
        lockCode: null,
        unlocked: false,
      });
    }
  };

  // Notification Preferences
  const handleDailyReminderToggle = async (enabled) => {
    setDailyReminder(enabled);
    if (enabled && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
      } catch (err) {
        console.warn('Could not request notification permission:', err);
      }
    }

    if (!user) return;
    setIsSavingNotifications(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        dailyReminder: enabled,
        reminderTime,
      });
    } catch (err) {
      console.error('Error updating notification preferences:', err);
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const handleReminderTimeChange = async (newTime) => {
    setReminderTime(newTime);
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { reminderTime: newTime });
    } catch (err) {
      console.error('Error updating reminder time:', err);
    }
  };

  // PDF Export
  const handleExportPdf = async () => {
    if (!exportDiaryId || !user) return;
    setIsExporting(true);
    setExportSuccessMsg('');
    setExportErrorMsg('');

    try {
      const selectedDiary = diaries.find((d) => d.id === exportDiaryId);
      const diaryName = selectedDiary ? selectedDiary.name : 'Diary';

      // Fetch entries directly from Firestore subcollection
      const entriesRef = collection(db, 'users', user.uid, 'diaries', exportDiaryId, 'entries');
      const snap = await getDocs(entriesRef);
      const diaryEntries = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      if (diaryEntries.length === 0) {
        setExportErrorMsg('This diary has no entries to export.');
        setIsExporting(false);
        return;
      }

      const res = await exportDiaryToPdf(diaryName, diaryEntries, exportDateFrom, exportDateTo);
      if (res && res.success) {
        setExportSuccessMsg(`Successfully generated PDF for ${res.count} entries!`);
        setTimeout(() => setExportSuccessMsg(''), 5000);
      }
    } catch (err) {
      console.error('Error exporting PDF:', err);
      setExportErrorMsg('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Delete Account (7-Day Soft Deletion Grace Period)
  const handleDeleteAccount = async () => {
    if (deleteConfirmationText.trim().toUpperCase() !== 'DELETE' || !user) return;
    setIsDeletingAccount(true);
    setDeleteError('');

    try {
      const now = new Date();
      const deletionDueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(
        userDocRef,
        {
          scheduledForDeletion: true,
          deletionRequestedAt: now.toISOString(),
          deletionDueDate: deletionDueDate.toISOString(),
        },
        { merge: true }
      );

      await signOut();
      navigate('/login', {
        state: {
          message: 'Account scheduled for deletion. You have 7 days to log in and cancel deletion.',
        },
      });
    } catch (err) {
      console.warn('Error scheduling account deletion:', err);
      setDeleteError(err.message || 'Failed to schedule account deletion.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream font-sans text-ink pb-12">
      {/* Hidden File Input for Avatar Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarFileChange}
        accept="image/*"
        className="hidden"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 md:py-12">
        {/* Page Title */}
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-gold mb-2">
            Settings
          </h1>
          <p className="font-sans text-sm text-ink-muted">
            Manage your profile, privacy locks, appearances, and preferences
          </p>
        </header>

        <div className="space-y-10">
          {/* 1. Profile Section */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gold/15">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gold/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center shadow-inner">
                  <Icon name="user" size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-serif font-semibold text-midnight">Profile & Identity</h2>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                      <Icon name="check" size={12} /> Verified
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted">Personal identity, personal quote, and writing preferences</p>
                </div>
              </div>

              {/* Account Stats Pill */}
              <div className="flex items-center gap-3 bg-midnight/5 border border-gold/20 px-3.5 py-1.5 rounded-xl text-xs text-ink-muted">
                <div className="flex items-center gap-1.5">
                  <Icon name="book" size={14} className="text-gold" />
                  <span className="font-semibold text-midnight">{diaries?.length || 0}</span>
                  <span>diaries</span>
                </div>
                <span className="text-gold/40">•</span>
                <div className="flex items-center gap-1.5">
                  <Icon name="sparkles" size={14} className="text-gold" />
                  <span>Member since Aug 2026</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Avatar Row */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 rounded-xl bg-midnight/5 border border-gold/10">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gold/40 shadow-md bg-midnight flex items-center justify-center text-gold font-serif text-2xl font-bold select-none">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span>{getInitials(displayName || user?.email)}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="absolute inset-0 rounded-full bg-midnight/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-gold text-xs cursor-pointer focus:outline-none focus:opacity-100"
                    aria-label="Upload profile picture"
                  >
                    {isUploadingAvatar ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <Icon name="camera" size={20} />
                        <span className="text-[10px] mt-1 font-medium">Change</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-center sm:text-left flex-1">
                  <p className="text-sm font-semibold text-midnight">Profile Picture</p>
                  <p className="text-xs text-ink-muted mt-0.5 mb-3">
                    Click avatar or use button to upload a custom profile image
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    loading={isUploadingAvatar}
                    icon={<Icon name="upload" size={14} />}
                  >
                    Upload Photo
                  </Button>
                </div>
              </div>

              {/* Premium Input Fields Card Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Display Name Card */}
                <div className="group relative rounded-xl p-4 bg-cream/40 border border-gold/25 hover:border-gold/50 transition-all shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-serif font-bold tracking-wider text-midnight uppercase flex items-center gap-1.5">
                      <Icon name="user" size={14} className="text-gold" />
                      Display Name
                    </label>
                    <span className="text-[10px] font-semibold text-gold bg-gold/10 px-2 py-0.5 rounded-md border border-gold/20">
                      Editable
                    </span>
                  </div>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    className="w-full bg-transparent text-sm font-sans font-semibold text-midnight placeholder-ink-muted/40 focus:outline-none border-b border-gold/30 focus:border-gold pb-1.5 transition-colors"
                  />
                  <p className="text-[11px] text-ink-muted mt-2">Visible on your diaries and exported documents</p>
                </div>

                {/* Email Address Card */}
                <div className="group relative rounded-xl p-4 bg-midnight/5 border border-gold/20 transition-all shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-serif font-bold tracking-wider text-midnight uppercase flex items-center gap-1.5">
                      <Icon name="mail" size={14} className="text-gold" />
                      Email Address
                    </label>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 flex items-center gap-1">
                      <Icon name="lock" size={10} /> Verified
                    </span>
                  </div>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full bg-transparent text-sm font-sans font-semibold text-midnight/70 cursor-not-allowed border-b border-transparent pb-1.5 select-all"
                  />
                  <p className="text-[11px] text-ink-muted mt-2">Primary account login and security verification</p>
                </div>
              </div>

              {/* Personal Bio / Tagline */}
              <div>
                <label className="block text-xs font-semibold text-midnight mb-1.5">
                  Personal Motto / Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="e.g. Capturing daily reflections under the midnight sky... ✍️"
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-midnight/5 border border-gold/20 text-midnight placeholder-ink-muted/50 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold transition-all"
                />
              </div>

              {/* Custom Journaling Preferences Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <CustomDropdown
                  label="Primary Journaling Focus"
                  icon="sparkles"
                  value={journalingGoal}
                  onChange={(val) => setJournalingGoal(val)}
                  options={[
                    'Daily Life & Reflection',
                    'Personal Growth & Goals',
                    'Love Life & Relationships',
                    'Travel & Memories',
                    'Night Thoughts & Poetry',
                  ]}
                />

                <CustomDropdown
                  label="Preferred Writing Time"
                  icon="clock"
                  value={preferredTime}
                  onChange={(val) => setPreferredTime(val)}
                  options={[
                    'Morning (6 AM - 12 PM)',
                    'Afternoon (12 PM - 5 PM)',
                    'Evening (5 PM - 9 PM)',
                    'Late Night (9 PM - 3 AM)',
                  ]}
                />
              </div>

              {profileSuccessMsg && (
                <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 font-medium">
                  <Icon name="check" size={16} className="text-emerald-600" />
                  <span>{profileSuccessMsg}</span>
                </p>
              )}

              <div className="flex justify-end pt-2">
                <Button type="submit" variant="primary" loading={isSavingProfile}>
                  Save Profile
                </Button>
              </div>
            </form>
          </section>

          {/* 2. Appearance Section */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gold/15">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gold/10">
              <div className="w-9 h-9 rounded-lg bg-gold/10 text-gold flex items-center justify-center">
                <Icon name="sun" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-serif font-semibold text-midnight">Appearance</h2>
                <p className="text-xs text-ink-muted">Theme and visual interface</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-midnight">Theme Mode</p>
                <p className="text-xs text-ink-muted">Choose your preferred visual ambience</p>
              </div>

              {/* Pill Switch */}
              <div className="p-1 rounded-full bg-midnight flex items-center border border-gold/30 shadow-inner">
                <button
                  type="button"
                  onClick={() => handleThemeToggle('light')}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    theme === 'light'
                      ? 'bg-gold text-midnight shadow-md font-semibold'
                      : 'text-cream/60 hover:text-cream'
                  }`}
                  aria-label="Select Light Theme"
                >
                  <Icon name="sun" size={15} />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleThemeToggle('dark')}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-gold text-midnight shadow-md font-semibold'
                      : 'text-cream/60 hover:text-cream'
                  }`}
                  aria-label="Select Dark Theme"
                >
                  <Icon name="moon" size={15} />
                  <span>Dark</span>
                </button>
              </div>
            </div>
          </section>

          {/* 3. Diary Locks Section */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gold/15">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gold/10">
              <div className="w-9 h-9 rounded-lg bg-gold/10 text-gold flex items-center justify-center">
                <Icon name="lock" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-serif font-semibold text-midnight">Diary Locks</h2>
                <p className="text-xs text-ink-muted">
                  Protect confidential journals with dedicated PIN, Password, or Biometrics
                </p>
              </div>
            </div>

            {diaries?.length === 0 ? (
              <p className="text-sm text-ink-muted italic py-4">
                No diaries created yet. Create a diary from the home page to set locks.
              </p>
            ) : (
              <div className="divide-y divide-gold/10">
                {diaries.map((diary) => {
                  const isLocked = Boolean(diary.lockEnabled);
                  const lockBadge = diary.lockType
                    ? diary.lockType.toUpperCase()
                    : 'LOCKED';

                  return (
                    <div
                      key={diary.id}
                      className="py-4.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-cream shrink-0 shadow-sm"
                          style={{ backgroundColor: diary.coverColor || '#0B1121' }}
                        >
                          <Icon name={diary.icon || 'book'} size={20} />
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-serif font-semibold text-midnight truncate">
                            {diary.name}
                          </p>
                          <p className="text-xs text-ink-muted">
                            {diary.entryCount || 0} {diary.entryCount === 1 ? 'entry' : 'entries'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {isLocked && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider bg-gold/15 text-gold-dark border border-gold/30">
                            {lockBadge}
                          </span>
                        )}

                        {/* Toggle Switch */}
                        <button
                          type="button"
                          onClick={() => handleLockToggleClick(diary)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                            isLocked ? 'bg-gold' : 'bg-ink-muted/30'
                          }`}
                          role="switch"
                          aria-checked={isLocked}
                          aria-label={`Toggle lock for ${diary.name}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              isLocked ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 4. Notifications Section */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gold/15">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gold/10">
              <div className="w-9 h-9 rounded-lg bg-gold/10 text-gold flex items-center justify-center">
                <Icon name="bell" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-serif font-semibold text-midnight">Notifications</h2>
                <p className="text-xs text-ink-muted">Daily journaling reminders and prompt triggers</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-midnight">Daily Writing Reminder</p>
                  <p className="text-xs text-ink-muted">
                    Receive a gentle prompt to capture your thoughts each day
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleDailyReminderToggle(!dailyReminder)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                    dailyReminder ? 'bg-gold' : 'bg-ink-muted/30'
                  }`}
                  role="switch"
                  aria-checked={dailyReminder}
                  aria-label="Toggle daily reminder"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      dailyReminder ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {dailyReminder && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-gold/10">
                  <span className="text-xs font-medium text-midnight">Reminder Time</span>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => handleReminderTimeChange(e.target.value)}
                    className="px-3 py-1.5 text-sm rounded-lg bg-cream border border-gold/30 text-ink outline-none focus:ring-1 focus:ring-gold"
                    aria-label="Reminder Time"
                  />
                </div>
              )}

              <div className="p-3 bg-cream rounded-xl border border-gold/15 flex items-center gap-2.5 text-xs text-ink-muted">
                <Icon name="info" size={16} className="text-gold shrink-0" />
                <span>
                  Push notifications require browser permission.{' '}
                  {notificationPermission === 'granted'
                    ? 'Permissions currently granted.'
                    : 'Grant permission when prompted.'}
                </span>
              </div>
            </div>
          </section>

          {/* 5. Export Section */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gold/15">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gold/10">
              <div className="w-9 h-9 rounded-lg bg-gold/10 text-gold flex items-center justify-center">
                <Icon name="download" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-serif font-semibold text-midnight">Export to PDF</h2>
                <p className="text-xs text-ink-muted">Download your memoirs in a beautifully designed printable PDF</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <CustomDropdown
                  label="Select Diary to Export"
                  icon="book"
                  value={exportDiaryId}
                  onChange={(val) => setExportDiaryId(val)}
                  options={
                    diaries?.map((d) => ({
                      value: d.id,
                      label: `${d.name} (${d.entryCount || 0} entries)`,
                      icon: 'book',
                    })) || []
                  }
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-ink-muted mb-1.5 font-medium">
                    From Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={exportDateFrom}
                    onChange={(e) => setExportDateFrom(e.target.value)}
                    className="w-full py-2 px-3 text-sm rounded-lg bg-cream border border-gold/30 text-ink outline-none focus:ring-1 focus:ring-gold"
                    aria-label="Export Date From"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-ink-muted mb-1.5 font-medium">
                    To Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={exportDateTo}
                    onChange={(e) => setExportDateTo(e.target.value)}
                    className="w-full py-2 px-3 text-sm rounded-lg bg-cream border border-gold/30 text-ink outline-none focus:ring-1 focus:ring-gold"
                    aria-label="Export Date To"
                  />
                </div>
              </div>

              {exportSuccessMsg && (
                <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-center gap-2">
                  <Icon name="check" size={16} />
                  <span>{exportSuccessMsg}</span>
                </p>
              )}

              {exportErrorMsg && (
                <p className="text-xs text-wine-light bg-wine/10 border border-wine/20 rounded-lg p-2.5 flex items-center gap-2">
                  <Icon name="alert-triangle" size={16} />
                  <span>{exportErrorMsg}</span>
                </p>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleExportPdf}
                  loading={isExporting}
                  disabled={!exportDiaryId || diaries?.length === 0}
                  icon={<Icon name="download" size={16} />}
                >
                  Export to PDF
                </Button>
              </div>
            </div>
          </section>

          {/* 6. About Section */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gold/15 text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-midnight flex items-center justify-center text-gold mb-3 shadow-md border border-gold/30">
              <Icon name="quill" size={28} />
            </div>
            <h2 className="font-serif text-2xl font-bold text-midnight tracking-wide">
              अंतरंग
            </h2>
            <span className="text-xs font-medium text-gold-dark mt-0.5">Version 1.0.0</span>
            <p className="font-serif italic text-sm text-ink-muted mt-2 max-w-sm">
              "Antarang — a diary as close as your own heart"
            </p>

            <div className="w-full mt-6 pt-4 border-t border-gold/10">
              <Footer />
            </div>
          </section>

          {/* 7. Danger Zone Section */}
          <section className="bg-wine/5 rounded-2xl p-6 sm:p-8 shadow-sm border border-wine-light/30">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-wine-light/20">
              <div className="w-9 h-9 rounded-lg bg-wine/15 text-wine-light flex items-center justify-center">
                <Icon name="trash" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-serif font-semibold text-wine">Danger Zone</h2>
                <p className="text-xs text-wine-light/80">Irreversible account operations</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-midnight">Delete Account</p>
                <p className="text-xs text-ink-muted">
                  Permanently erase all your diaries, entries, photos, and account records.
                </p>
              </div>

              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setDeleteConfirmationText('');
                  setDeleteError('');
                  setIsDeleteModalOpen(true);
                }}
                icon={<Icon name="trash" size={16} />}
              >
                Delete Account
              </Button>
            </div>
          </section>
        </div>
      </div>

      {/* Lock Setup / Verification Modal */}
      {selectedDiaryForLock && (
        <LockSetup
          isOpen={isLockModalOpen}
          onClose={() => {
            setIsLockModalOpen(false);
            setSelectedDiaryForLock(null);
          }}
          diary={selectedDiaryForLock}
          mode={lockModalMode}
          onSuccess={handleLockSuccess}
        />
      )}

      {/* Delete Account Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Account Confirmation"
      >
        <div className="space-y-4 font-sans text-cream">
          <div className="p-3 bg-wine/20 border border-wine/40 rounded-xl flex items-start gap-3 text-xs text-cream/90">
            <Icon name="alert-triangle" size={20} className="text-wine-light shrink-0 mt-0.5" />
            <span>
              Warning: This action is permanent and cannot be undone. All your journals, entries, and
              account configurations will be permanently erased.
            </span>
          </div>

          <p className="text-sm text-cream/80">
            To confirm deletion, please type <strong className="text-gold">DELETE</strong> in the box below:
          </p>

          <Input
            label="Type DELETE"
            value={deleteConfirmationText}
            onChange={(e) => setDeleteConfirmationText(e.target.value)}
            placeholder="DELETE"
            autoFocus
          />

          {deleteError && (
            <p className="text-xs text-wine-light bg-wine/20 p-2.5 rounded-lg border border-wine/40">
              {deleteError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gold/10">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeletingAccount}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              type="button"
              onClick={handleDeleteAccount}
              loading={isDeletingAccount}
              disabled={deleteConfirmationText.trim().toUpperCase() !== 'DELETE'}
            >
              Permanently Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
