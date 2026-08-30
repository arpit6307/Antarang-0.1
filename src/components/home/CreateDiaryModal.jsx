import React, { useState } from 'react';
import { motion } from 'motion/react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Icon from '@/components/ui/Icon';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { useDiaries } from '@/hooks/useDiaries';

const COLORS = [
  '#0B1121', '#5B1A2A', '#1B3A2D', '#2D1854',
  '#2C3E50', '#1A1A2E', '#7B2D3B', '#1A3C40',
  '#6B3A2A', '#1C1C1C', '#4A0E2B', '#0F3460'
];

const ICONS = [
  'book', 'heart-outline', 'moon', 'quill', 
  'camera', 'streak', 'calendar', 'edit'
];

export default function CreateDiaryModal({ isOpen, onClose }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [coverImage, setCoverImage] = useState('');
  const [icon, setIcon] = useState(ICONS[0]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createDiary } = useDiaries();

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setCoverImage(url);
    } catch (err) {
      console.warn('Error uploading cover photo:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await createDiary({ name: name.trim(), coverColor: color, coverImage, icon });
      setName('');
      setColor(COLORS[0]);
      setCoverImage('');
      setIcon(ICONS[0]);
      onClose();
    } catch (err) {
      console.warn('Error creating diary:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Diary">
      <motion.form 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="flex flex-col gap-6"
      >
        <Input 
          label="Diary Name" 
          value={name} 
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Personal Reflections"
          required
        />

        {/* Custom Cover Photo Option */}
        <div>
          <label className="block text-xs font-serif font-bold tracking-wider text-midnight uppercase mb-2">
            Custom Cover Image (Cloudinary CDN)
          </label>
          <div className="flex items-center gap-4">
            {coverImage ? (
              <div className="relative w-16 h-20 rounded-lg overflow-hidden border border-gold/40 shadow-sm flex-shrink-0">
                <img src={coverImage} alt="Cover Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setCoverImage('')}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black"
                >
                  <Icon name="close" size={10} />
                </button>
              </div>
            ) : (
              <div className="w-16 h-20 rounded-lg bg-midnight/5 border border-dashed border-gold/30 flex items-center justify-center text-gold flex-shrink-0">
                <Icon name="camera" size={18} />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gold/15 text-gold-dark hover:bg-gold/25 font-semibold text-xs border border-gold/30 transition-all">
                <Icon name="upload" size={14} />
                <span>{isUploading ? 'Uploading...' : 'Upload Photo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
              <span className="text-[11px] text-ink-muted">Optional custom background cover image</span>
            </div>
          </div>
        </div>
        
        <div>
          <label className="block text-xs font-serif font-bold tracking-wider text-midnight uppercase mb-2">Cover Accent Color</label>
          <div className="grid grid-cols-6 gap-3">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-10 h-10 rounded-full transition-transform ${color === c ? 'ring-2 ring-gold ring-offset-2 ring-offset-cream scale-110' : 'hover:scale-105'}`}
                style={{ backgroundColor: c }}
                aria-label={`Select color ${c}`}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-serif font-bold tracking-wider text-midnight uppercase mb-2">Icon</label>
          <div className="grid grid-cols-4 gap-3">
            {ICONS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIcon(i)}
                className={`p-3 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${icon === i ? 'bg-gold text-midnight' : 'bg-midnight/5 text-ink-muted hover:bg-gold/10'}`}
                aria-label={`Select icon ${i}`}
              >
                <Icon name={i} className="w-6 h-6" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" loading={isSubmitting} disabled={!name.trim()}>Create Diary</Button>
        </div>
      </motion.form>
    </Modal>
  );
}
