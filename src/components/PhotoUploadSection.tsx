import React from 'react';
import { Camera, X, CheckCircle2 } from 'lucide-react';
import { PhotoUpload } from '../types';

interface PhotoUploadSectionProps {
  photos: PhotoUpload[];
  onUpload: (key: string, url: string) => void;
  onRemove: (key: string) => void;
}

const PhotoUploadSection: React.FC<PhotoUploadSectionProps> = ({ photos, onUpload, onRemove }) => {
  const handleFileChange = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpload(key, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {photos.map((photo) => (
        <div key={photo.key} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[2.5rem] p-6 flex flex-col gap-4 shadow-2xl backdrop-blur-md group hover:border-[var(--text-secondary)]/30 transition-all">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">{photo.label}</span>
            {photo.url && <CheckCircle2 className="text-emerald-500 w-5 h-5 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />}
          </div>

          <div className="relative aspect-video bg-[var(--bg-primary)]/5 rounded-[1.5rem] overflow-hidden border border-[var(--border-color)] group/photo">
            {photo.url ? (
              <>
                <img src={photo.url} alt={photo.label} className="w-full h-full object-cover transition-transform duration-500 group-hover/photo:scale-105" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/photo:opacity-100 transition-opacity"></div>
                <button
                  onClick={() => onRemove(photo.key)}
                  className="absolute top-3 right-3 p-2 bg-red-500 text-black rounded-xl opacity-0 group-hover/photo:opacity-100 transition-all shadow-2xl hover:bg-red-400 active:scale-90"
                >
                  <X className="w-4 h-4" strokeWidth={3} />
                </button>
              </>
            ) : (
              <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-[var(--bg-secondary)]/50 transition-all group/label">
                <div className="w-12 h-12 rounded-2xl bg-[var(--bg-primary)]/5 flex items-center justify-center border border-[var(--border-color)] mb-3 group-hover/label:border-emerald-500/30 transition-colors">
                  <Camera className="w-6 h-6 text-[var(--text-secondary)] group-hover/label:text-emerald-500 transition-colors" />
                </div>
                <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] group-hover/label:text-[var(--text-primary)] transition-colors">Take Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleFileChange(photo.key, e)}
                />
              </label>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PhotoUploadSection;
