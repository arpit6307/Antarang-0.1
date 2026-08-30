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

export default function DiarySettingsModal({ isOpen, onClose, diary }) {
  const { updateDiary, deleteDiary } = useDiaries();

  const [name, setName] = useState(diary?.name || '');
  const [color, setColor] = useState(diary?.coverColor || COLORS[0]);
  const [coverImage, setCoverImage] = useState(diary?.coverImage || '');
  const [icon, setIcon] = useState(diary?.icon || ICONS[0]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const url = await uploadToCloudinary(file);
      setCoverImage(url);
    } catch (err) {
      console.warn('Error uploading cover image:', err);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!diary || !name.trim()) return;
    setIsSaving(true);
    try {
      await updateDiary(diary.id, {
        name: name.trim(),
        coverColor: color,
        coverImage,
        icon,
      });
      onClose();
    } catch (err) {
      console.warn('Error updating diary settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!diary || !window.confirm('Are you sure you want to delete this diary?')) return;
    setIsDeleting(true);
    try {
      await deleteDiary(diary.id);
      onClose();
    } catch (err) {
      console.warn('Error deleting diary:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!diary) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Diary Customization and Settings">
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSave}
        className="flex flex-col gap-6"
      >
        <Input
          label="Diary Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Diary Title"
          required
        />

        {/* Custom Cover Image Section */}
        <div>
          <label className="block text-xs font-serif font-bold tracking-wider text-midnight uppercase mb-2">
            Custom Cover Image (Cloudinary CDN)
          </label>
          <div className="flex items-center gap-4">
            {coverImage ? (
              <div className="relative w-20 h-24 rounded-lg overflow-hidden border border-gold/40 shadow-md flex-shrink-0">
                <img src={coverImage} alt="Cover Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setCoverImage('')}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black"
                >
                  <Icon name="close" size={12} />
                </button>
              </div>
            ) : (
              <div className="w-20 h-24 rounded-lg bg-midnight/5 border-2 border-dashed border-gold/30 flex items-center justify-center text-gold flex-shrink-0">
                <Icon name="camera" size={20} />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gold/15 text-gold-dark hover:bg-gold/25 font-semibold text-xs border border-gold/30 transition-all">
                <Icon name="upload" size={14} />
                <span>{isUploadingImage ? 'Uploading...' : 'Upload Cover Photo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploadingImage}
                  className="hidden"
                />
              </label>
              <p className="text-[11px] text-ink-muted">
                Upload a custom background photo for your diary cover card.
              </p>
            </div>
          </div>
        </div>

        {/* Cover Color Pickers */}
        <div>
          <label className="block text-xs font-serif font-bold tracking-wider text-midnight uppercase mb-2">
            Cover Accent Color
          </label>
          <div className="grid grid-cols-6 gap-3">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-10 h-10 rounded-full transition-transform ${
                  color === c ? 'ring-2 ring-gold ring-offset-2 ring-offset-cream scale-110' : 'hover:scale-105'
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Select color ${c}`}
              />
            ))}
          </div>
        </div>

        {/* Icon Picker */}
        <div>
          <label className="block text-xs font-serif font-bold tracking-wider text-midnight uppercase mb-2">
            Diary Cover Icon
          </label>
          <div className="grid grid-cols-4 gap-3">
            {ICONS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIcon(i)}
                className={`p-3 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                  icon === i ? 'bg-gold text-midnight' : 'bg-midnight/5 text-ink-muted hover:bg-gold/10'
                }`}
                aria-label={`Select icon ${i}`}
              >
                <Icon name={i} size={20} />
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gold/15">
          <Button
            type="button"
            variant="ghost"
            onClick={handleDelete}
            loading={isDeleting}
            className="text-rose-700 hover:bg-rose-50"
            icon={<Icon name="trash" size={14} />}
          >
            Delete Diary
          </Button>

          <div className="flex gap-3">
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={isSaving}>
              Save Settings
            </Button>
          </div>
        </div>
      </motion.form>
    </Modal>
  );
}
