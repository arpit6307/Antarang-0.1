import React, { useState } from 'react';
import { uploadToCloudinary } from '@/lib/cloudinary';
import Icon from '@/components/ui/Icon';

export default function PhotoAttachment({ photoUrls = [], onPhotosChange }) {
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const secureUrl = await uploadToCloudinary(file);
      onPhotosChange([...photoUrls, secureUrl]);
    } catch (error) {
      console.warn('Cloudinary photo upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (indexToRemove) => {
    onPhotosChange(photoUrls.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Upload Button */}
      <div className="flex items-center gap-4">
        <label className="cursor-pointer flex items-center gap-2 text-gold hover:text-gold-light transition-colors">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={handleFileChange}
            disabled={uploading}
          />
          <Icon name="camera" className="w-5 h-5" />
          <span className="font-sans text-sm font-medium">Add Photo</span>
        </label>
        
        {uploading && (
          <div className="w-32 h-2 bg-midnight rounded-full overflow-hidden">
            <div 
              className="h-full bg-gold transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Previews */}
      {photoUrls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photoUrls.map((url, idx) => (
            <div key={idx} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-white/10 cursor-zoom-in">
              <img 
                src={url} 
                alt="Upload preview" 
                className="w-full h-full object-cover"
                onClick={() => setLightboxUrl(url)}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removePhoto(idx);
                }}
                className="absolute top-1 right-1 bg-midnight/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove photo"
              >
                <Icon name="x" className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white hover:text-gold p-2"
            onClick={() => setLightboxUrl(null)}
          >
            <Icon name="x" className="w-8 h-8" />
          </button>
          <img 
            src={lightboxUrl} 
            alt="Fullscreen view" 
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
