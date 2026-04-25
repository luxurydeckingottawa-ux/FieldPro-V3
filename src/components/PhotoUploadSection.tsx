import React, { useState } from 'react';
import { Camera, X, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { PhotoUpload } from '../types';
import { uploadPhotoToCloudinary } from '../utils/uploadPhoto';

interface PhotoUploadSectionProps {
  photos: PhotoUpload[];
  /** Optional sub-folder name used when storing cloud photos (e.g. job name). */
  folderName?: string;
  /**
   * onUpload is called twice per photo:
   *   1. immediately with the local base64 data URI (for instant preview)
   *   2. again once the cloud upload resolves, now including cloudinaryUrl
   *      so the mid-workflow auto-save can persist a real URL to Supabase
   *      (the auto-save strips data: URIs to stay under DB row limits, which
   *      is why the customer-portal BuildTracker never saw in-progress photos).
   */
  onUpload: (key: string, url: string, cloudinaryUrl?: string) => void;
  onRemove: (key: string) => void;
  /** Tech toggles a photo as Not Applicable for this job. */
  onToggleNA?: (key: string) => void;
}

type UploadStatus = 'idle' | 'uploading' | 'error';

const PhotoUploadSection: React.FC<PhotoUploadSectionProps> = ({ photos, folderName, onUpload, onRemove, onToggleNA }) => {
  const [statusByKey, setStatusByKey] = useState<Record<string, UploadStatus>>({});

  const setStatus = (key: string, status: UploadStatus) => {
    setStatusByKey(prev => ({ ...prev, [key]: status }));
  };

  const handleFileChange = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUri = reader.result as string;
      // 1. Show the photo immediately using the local data URI.
      onUpload(key, dataUri);

      // 2. Push to Cloudinary in the background so auto-save persists a real
      //    URL — which is what the customer portal's BuildTracker reads.
      setStatus(key, 'uploading');
      try {
        const cloudUrl = await uploadPhotoToCloudinary(
          dataUri,
          `${key}_${Date.now()}`,
          folderName,
        );
        onUpload(key, dataUri, cloudUrl);
        setStatus(key, 'idle');
      } catch (err) {
        console.warn(`[PhotoUpload] Cloud upload failed for ${key}:`, err);
        setStatus(key, 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {photos.map((photo) => {
        const status = statusByKey[photo.key] || 'idle';
        const hasCloudUrl = !!photo.cloudinaryUrl || (typeof photo.url === 'string' && photo.url.startsWith('http'));

        return (
          <div className={`border rounded-[2.5rem] p-6 flex flex-col gap-4 shadow-2xl backdrop-blur-md group transition-all ${
            photo.isNA
              ? 'bg-amber-500/5 border-amber-500/20 opacity-80'
              : 'bg-[var(--bg-secondary)] border-[var(--border-color)] hover:border-[var(--text-secondary)]/30'
          }`} key={photo.key}>
            <div className="flex items-center justify-between px-2">
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${photo.isNA ? 'text-amber-500/70 line-through' : 'text-[var(--text-secondary)]'}`}>
                {photo.label}
                {photo.isNA && <span className="text-[9px] ml-2 px-2 py-0.5 bg-amber-500/20 rounded-full font-black tracking-widest no-underline">N/A</span>}
              </span>
              <div className="flex items-center gap-2">
                {status === 'uploading' && !photo.isNA && (
                  <span className="flex items-center gap-1.5 text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing
                  </span>
                )}
                {status === 'error' && !photo.isNA && (
                  <span className="flex items-center gap-1.5 text-[9px] font-black text-rose-400 uppercase tracking-[0.2em]" title="Cloud sync failed — photo still stored locally. It'll retry at submission.">
                    <AlertCircle className="w-3.5 h-3.5" /> Local only
                  </span>
                )}
                {photo.url && hasCloudUrl && status !== 'uploading' && !photo.isNA && (
                  <CheckCircle2 className="text-[var(--brand-gold)] w-5 h-5 shadow-[0_0_10px_rgba(196,164,50,0.3)]" />
                )}
                {onToggleNA && (
                  <button
                    onClick={() => onToggleNA(photo.key)}
                    className={`px-3 py-1.5 rounded-xl border font-black text-[9px] uppercase tracking-widest transition-all ${
                      photo.isNA
                        ? 'bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20'
                        : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-amber-500/50 hover:text-amber-500'
                    }`}
                    title={photo.isNA ? 'Mark as required again' : 'Mark this photo as Not Applicable for this job'}
                  >
                    N/A
                  </button>
                )}
              </div>
            </div>

            <div className="relative aspect-video bg-[var(--bg-primary)]/5 rounded-[1.5rem] overflow-hidden border border-[var(--border-color)] group/photo">
              {photo.isNA ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-amber-500/70">
                  <span className="text-3xl font-black tracking-widest">N/A</span>
                  <span className="text-[9px] uppercase tracking-[0.2em] mt-1 opacity-70">Not Applicable</span>
                </div>
              ) : photo.url ? (
                <>
                  <img src={photo.url} alt={photo.label} className="w-full h-full object-cover transition-transform duration-500 group-hover/photo:scale-105" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/photo:opacity-100 transition-opacity"></div>
                  {status === 'uploading' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Loader2 className="w-8 h-8 text-[var(--brand-gold)] animate-spin" />
                    </div>
                  )}
                  <button
                    onClick={() => {
                      onRemove(photo.key);
                      setStatus(photo.key, 'idle');
                    }}
                    className="absolute top-3 right-3 p-2 bg-red-500 text-black rounded-xl opacity-0 group-hover/photo:opacity-100 transition-all shadow-2xl hover:bg-red-400 active:scale-90"
                  >
                    <X className="w-4 h-4" strokeWidth={3} />
                  </button>
                </>
              ) : (
                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-[var(--bg-secondary)]/50 transition-all group/label">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--bg-primary)]/5 flex items-center justify-center border border-[var(--border-color)] mb-3 group-hover/label:border-[var(--brand-gold)]/30 transition-colors">
                    <Camera className="w-6 h-6 text-[var(--text-secondary)] group-hover/label:text-[var(--brand-gold)] transition-colors" />
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
        );
      })}
    </div>
  );
};

export default PhotoUploadSection;
