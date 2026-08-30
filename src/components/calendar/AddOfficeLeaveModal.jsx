import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const LEAVE_TYPES = [
  { id: 'casual', label: 'Casual Leave (CL)', icon: 'calendar', defaultTitle: 'Casual Leave (CL)' },
  { id: 'sick', label: 'Sick Leave (SL)', icon: 'sparkles', defaultTitle: 'Sick Leave (SL)' },
  { id: 'vacation', label: 'Annual Vacation / Trip', icon: 'sun', defaultTitle: 'Annual Vacation & Trip' },
  { id: 'wfh', label: 'Work From Home (WFH)', icon: 'user', defaultTitle: 'Work From Home (WFH)' },
  { id: 'custom', label: 'Personal Holiday', icon: 'star', defaultTitle: 'Personal Holiday' },
];

export default function AddOfficeLeaveModal({ isOpen, onClose, defaultDate }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveType, setLeaveType] = useState('casual');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (defaultDate) {
      const d = defaultDate instanceof Date ? defaultDate : new Date(defaultDate);
      setLeaveDate(d.toISOString().split('T')[0]);
    } else {
      setLeaveDate(new Date().toISOString().split('T')[0]);
    }
  }, [defaultDate, isOpen]);

  const handleQuickPreset = (preset) => {
    setLeaveType(preset.id);
    setTitle(preset.defaultTitle);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !leaveDate || !user) return;

    setLoading(true);
    try {
      const leavesRef = collection(db, 'users', user.uid, 'custom_leaves');
      await addDoc(leavesRef, {
        title: title.trim(),
        date: leaveDate,
        type: leaveType,
        notes: notes.trim(),
        createdAt: serverTimestamp(),
      });

      setTitle('');
      setNotes('');
      onClose();
    } catch (err) {
      console.error('Error adding custom office leave:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mark Office Leave / Holiday">
      <form onSubmit={handleSubmit} className="space-y-4 font-sans text-midnight">
        <p className="text-xs font-medium text-midnight/90 leading-relaxed bg-cream/60 p-3 rounded-xl border border-gold/20">
          Mark casual leaves (CL), sick leaves (SL), WFH, or personal holidays on your calendar in 1-click!
        </p>

        {/* 1-Click Quick Presets Bar */}
        <div className="space-y-1.5">
          <label className="block text-xs uppercase font-serif font-bold text-gold-dark tracking-wider">
            ⚡ 1-Click Quick Presets:
          </label>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide text-xs">
            {LEAVE_TYPES.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleQuickPreset(preset)}
                className={`px-3.5 py-2 rounded-full text-xs font-serif font-bold transition-all shrink-0 border cursor-pointer flex items-center gap-1.5 ${
                  leaveType === preset.id && title === preset.defaultTitle
                    ? 'bg-gold text-midnight border-gold shadow-md scale-105'
                    : 'bg-white text-midnight font-semibold border-gold/30 hover:border-gold hover:bg-cream'
                }`}
              >
                <Icon name={preset.icon} size={14} />
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Title Input */}
        <div className="space-y-1">
          <label className="block text-xs font-serif font-bold text-midnight">
            Leave Title / Reason <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Casual Leave (CL) or Family Trip"
            className="w-full p-3 rounded-xl border-2 border-gold/40 bg-white text-midnight font-bold text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30 shadow-xs"
            required
          />
        </div>

        {/* Leave Date Input */}
        <div className="space-y-1">
          <label className="block text-xs font-serif font-bold text-midnight">
            Leave Date <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            value={leaveDate}
            onChange={(e) => setLeaveDate(e.target.value)}
            className="w-full p-3 rounded-xl border-2 border-gold/40 bg-white text-midnight font-bold text-sm font-sans focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30 shadow-xs cursor-pointer"
            required
          />
        </div>

        {/* Leave Category Selector */}
        <div className="space-y-1">
          <label className="block text-xs font-serif font-bold text-midnight">
            Leave Category
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {LEAVE_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleQuickPreset(t)}
                className={`p-3 rounded-xl text-xs font-serif border flex items-center gap-2 transition-all cursor-pointer ${
                  leaveType === t.id
                    ? 'bg-gold text-midnight border-gold font-bold shadow-sm'
                    : 'bg-white text-midnight font-semibold border-gold/25 hover:border-gold/50'
                }`}
              >
                <Icon name={t.icon} size={14} />
                <span className="truncate">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Optional Notes */}
        <div className="space-y-1">
          <label className="block text-xs font-serif font-bold text-midnight">
            Optional Handover / Extra Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any extra note or handover details..."
            rows={2}
            className="w-full p-3 rounded-xl border-2 border-gold/40 bg-white text-midnight font-bold text-sm font-sans focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30 resize-none shadow-xs"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading} disabled={!title.trim() || !leaveDate}>
            Save Office Leave
          </Button>
        </div>
      </form>
    </Modal>
  );
}
