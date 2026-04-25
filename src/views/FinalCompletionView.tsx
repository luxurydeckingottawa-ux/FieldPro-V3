
import React, { useEffect } from 'react';
import { PageState } from '../types';
import PhotoUploadSection from '../components/PhotoUploadSection';
import SignaturePad from '../components/SignaturePad';
import { Check } from 'lucide-react';

interface FinalCompletionViewProps {
  state: PageState;
  signature?: string;
  /** Job name (used as Cloudinary sub-folder so portal BuildTracker sees photos live). */
  folderName?: string;
  onUpdate: (update: Partial<PageState>) => void;
  onSignatureUpdate: (dataUrl: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const FinalCompletionView: React.FC<FinalCompletionViewProps> = ({ state, signature, folderName, onUpdate, onSignatureUpdate, onNext, onBack }) => {
  const toggleItem = (id: string) => {
    const newChecklist = state.checklist.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
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

  const handlePhotoToggleNA = (key: string) => {
    const newPhotos = state.photos.map(p =>
      p.key === key
        ? { ...p, isNA: !p.isNA, url: !p.isNA ? undefined : p.url, cloudinaryUrl: !p.isNA ? undefined : p.cloudinaryUrl }
        : p
    );
    onUpdate({ photos: newPhotos });
  };

  const progress = state.checklist.filter(i => i.completed).length;
  const total = state.checklist.length;
  const allPhotosUploaded = state.photos.every(p => !!p.url || !!p.isNA);
  const isComplete = progress === total && allPhotosUploaded && !!signature;

  // Propagate page-level completion so the customer-portal BuildTracker
  // (which reads job.fieldProgress[5].completed) flips to "Complete" in real
  // time once walkthrough + photos + signature are all done.
  useEffect(() => {
    if (isComplete !== state.completed) {
      onUpdate({ completed: isComplete });
    }
  }, [isComplete, state.completed, onUpdate]);

  return (
    <div className="p-6 pb-40 space-y-12 bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300">
      <div className="card-base p-10">
        <h2 className="text-3xl font-display leading-none">Final Site PDI</h2>
        <p className="font-label mt-2">Client Walkthrough & Sign-off</p>
      </div>

      <section className="space-y-6">
        <div className="flex justify-between items-end px-2">
          <h3 className="font-label">Walkthrough Checklist</h3>
          <span className={`font-label px-3 py-1 rounded-full border ${progress === total ? 'bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] border-[var(--brand-gold)]/20' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)]'}`}>
            {progress}/{total} Verified
          </span>
        </div>
        <div className="space-y-3">
          {state.checklist.map((item) => (
            <label 
              key={item.id}
              className={`flex items-start gap-5 p-6 border rounded-[2rem] transition-all cursor-pointer group ${
                item.completed 
                  ? 'bg-[var(--brand-gold)]/5 border-[var(--brand-gold)]/20 shadow-lg shadow-[var(--brand-gold)]/5' 
                  : 'bg-[var(--bg-secondary)] border-[var(--border-color)] shadow-xl hover:bg-[var(--bg-secondary)]/80 hover:border-[var(--text-secondary)]/30'
              }`}
            >
              <div className="relative flex items-center mt-0.5">
                <input 
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => toggleItem(item.id)}
                  className="w-7 h-7 border-2 border-[var(--border-color)] rounded-xl appearance-none checked:bg-[var(--brand-gold)] checked:border-[var(--brand-gold)] transition-all cursor-pointer group-hover:border-[var(--brand-gold)]/50"
                />
                {item.completed && <Check className="absolute left-1.5 top-1.5 text-black" size={16} strokeWidth={4} />}
              </div>
              <span className={`text-sm font-bold select-none leading-snug tracking-tight ${item.completed ? 'text-[var(--brand-gold)]/70 line-through' : 'text-[var(--text-secondary)]'}`}>
                {item.label}
              </span>
            </label>
          ))}
        </div>
      </section>

      <PhotoUploadSection
        photos={state.photos}
        folderName={folderName}
        onUpload={handlePhotoUpload}
        onRemove={handlePhotoRemove}
        onToggleNA={handlePhotoToggleNA}
      />

      <section className="pt-8 border-t border-[var(--border-color)]">
        <div className="p-8 bg-amber-500/5 border border-amber-500/10 rounded-[2.5rem] mb-8">
          <p className="font-label text-amber-500 mb-2">Customer Acknowledgement</p>
          <p className="text-xs text-[var(--text-secondary)]/80 font-medium leading-relaxed">
            By signing, the customer confirms the project is completed satisfactorily and authorizes final payment release.
          </p>
        </div>
        <SignaturePad 
          onSave={onSignatureUpdate} 
          onClear={() => onSignatureUpdate('')}
          initialValue={signature} 
        />
      </section>

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
            Review Submission
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinalCompletionView;
