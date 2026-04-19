
import React, { useEffect } from 'react';
import { PageState } from '../types';
import PhotoUploadSection from '../components/PhotoUploadSection';
import { Check } from 'lucide-react';

interface ChecklistViewProps {
  title: string;
  pageIndex: number;
  state: PageState;
  /** Job name (used as Cloudinary sub-folder so portal BuildTracker sees photos live). */
  folderName?: string;
  onUpdate: (update: Partial<PageState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const ChecklistView: React.FC<ChecklistViewProps> = ({ title, state, folderName, onUpdate, onNext, onBack }) => {
  const toggleItem = (id: string) => {
    const newChecklist = state.checklist.map(item => 
      item.id === id ? { ...item, completed: !item.completed, isNA: false } : item
    );
    onUpdate({ checklist: newChecklist });
  };

  const toggleNA = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newChecklist = state.checklist.map(item => 
      item.id === id ? { ...item, isNA: !item.isNA, completed: !item.isNA } : item
    );
    onUpdate({ checklist: newChecklist });
  };

  const handlePhotoUpload = (key: string, url: string, cloudinaryUrl?: string) => {
    const newPhotos = state.photos.map(p =>
      p.key === key
        ? { ...p, url, ...(cloudinaryUrl ? { cloudinaryUrl } : {}) }
        : p
    );
    onUpdate({ photos: newPhotos });
  };

  const handlePhotoRemove = (key: string) => {
    const newPhotos = state.photos.map(p =>
      p.key === key ? { ...p, url: undefined, cloudinaryUrl: undefined } : p
    );
    onUpdate({ photos: newPhotos });
  };

  const progress = state.checklist.filter(i => i.completed || i.isNA).length;
  const total = state.checklist.length;
  const allPhotosUploaded = state.photos.every(p => !!p.url);
  const isComplete = progress === total && allPhotosUploaded;

  // Propagate page-level completion flag so the customer-portal BuildTracker
  // (which reads job.fieldProgress[page].completed) updates in real time as
  // the field crew checks off items + uploads photos. Without this effect,
  // pages stayed at completed=false even when every checklist item was ticked
  // and every required photo uploaded.
  useEffect(() => {
    if (isComplete !== state.completed) {
      onUpdate({ completed: isComplete });
    }
  }, [isComplete, state.completed, onUpdate]);

  return (
    <div className="p-6 pb-40 space-y-10 bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300">
      <div className="card-base p-8">
        <h2 className="text-2xl font-display leading-none">{title}</h2>
        <p className="font-label mt-2">Stage Checklist & Photos</p>
      </div>

      <section className="space-y-6">
        <div className="flex justify-between items-end px-2">
          <h3 className="font-label">Mandatory Checklist</h3>
          <span className={`font-label px-3 py-1 rounded-full border ${progress === total ? 'bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] border-[var(--brand-gold)]/20' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)]'}`}>
            {progress}/{total} Verified
          </span>
        </div>
        
        <div className="space-y-3">
          {state.checklist.map((item) => (
            <div 
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`flex items-center justify-between p-6 border rounded-[2rem] transition-all cursor-pointer group ${
                item.completed && !item.isNA
                  ? 'bg-[var(--brand-gold)]/5 border-[var(--brand-gold)]/20 shadow-lg shadow-[var(--brand-gold)]/5' 
                  : item.isNA
                    ? 'bg-amber-500/5 border-amber-500/20 opacity-80'
                    : 'bg-[var(--bg-secondary)] border-[var(--border-color)] shadow-xl hover:bg-[var(--bg-secondary)]/80 hover:border-[var(--text-secondary)]/30'
              }`}
            >
              <div className="flex items-start gap-5 flex-1">
                <div className="relative flex items-center mt-0.5">
                  <input 
                    type="checkbox"
                    checked={item.completed && !item.isNA}
                    onChange={() => {}} // Handled by parent div click
                    className="w-7 h-7 border-2 border-[var(--border-color)] rounded-xl appearance-none checked:bg-[var(--brand-gold)] checked:border-[var(--brand-gold)] transition-all cursor-pointer group-hover:border-[var(--brand-gold)]/50"
                  />
                  {item.completed && !item.isNA && (
                    <Check className="absolute left-1.5 top-1.5 text-black" size={16} strokeWidth={4} />
                  )}
                </div>
                <span className={`text-sm font-bold select-none leading-snug tracking-tight ${item.completed && !item.isNA ? 'text-[var(--brand-gold)]/70 line-through' : item.isNA ? 'text-amber-500/70 italic' : 'text-[var(--text-secondary)]'}`}>
                  {item.label} {item.isNA && <span className="text-[10px] uppercase ml-2 px-2 py-0.5 bg-amber-500/20 rounded-full font-black tracking-widest not-italic">N/A</span>}
                </span>
              </div>

              <button
                onClick={(e) => toggleNA(item.id, e)}
                className={`ml-4 px-4 py-2 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all ${
                  item.isNA 
                    ? 'bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20' 
                    : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-amber-500/50 hover:text-amber-500'
                }`}
              >
                N/A
              </button>
            </div>
          ))}
        </div>
      </section>

      <PhotoUploadSection
        photos={state.photos}
        folderName={folderName}
        onUpload={handlePhotoUpload}
        onRemove={handlePhotoRemove}
      />

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-t border-[var(--border-color)] z-40">
        <div className="max-w-4xl mx-auto flex gap-4">
          <button 
            onClick={onBack}
            className="flex-1 py-5 bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)] rounded-[2rem] font-label text-[10px] hover:bg-[var(--bg-secondary)]/80 hover:text-[var(--text-primary)] transition-all active:scale-[0.98]"
          >
            Back
          </button>
          <button 
            onClick={onNext}
            disabled={!isComplete}
            className={`flex-[2] py-5 rounded-[2rem] font-label text-[10px] transition-all active:scale-[0.98] shadow-2xl ${
              isComplete 
                ? 'bg-[var(--brand-gold)] text-black hover:bg-[var(--brand-gold)]' 
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]/50 cursor-not-allowed border border-[var(--border-color)]'
            }`}
          >
            Next Step
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChecklistView;
