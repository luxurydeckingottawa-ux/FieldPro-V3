import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  ArrowLeft, Plus, Search, Pencil, Trash2, X, Check, BookOpen,
  Ruler, Anchor, LayoutGrid, Leaf, Layers, Frame, TrendingUp,
  AlignJustify, Lightbulb, GitBranch, Box, Shield, PlusCircle,
  Umbrella, Hexagon, Gift, ChevronRight, Upload,
  ToggleLeft, ToggleRight, Calendar, Users, Zap, Building2
} from 'lucide-react';
import {
  PriceBookCategory, PriceBookItem,
  loadPriceBook, savePriceBook,
} from '../utils/priceBook';

export type { PriceBookCategory, PriceBookItem };
export { loadPriceBook, savePriceBook };

// â”€â”€ Icon Mapping (not serialised â€” functions can't go in JSON) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type LucideIcon = React.FC<{ className?: string }>;

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  cat_design:   Ruler,
  cat_footings: Anchor,
  cat_framing:  LayoutGrid,
  cat_landscape: Leaf,
  cat_decking:  Layers,
  cat_picframe: Frame,
  cat_steps:    TrendingUp,
  cat_fascia:   AlignJustify,
  cat_lighting: Lightbulb,
  cat_railings: GitBranch,
  cat_skirting: Box,
  cat_privacy:  Shield,
  cat_addons:   PlusCircle,
  cat_pergolas: Umbrella,
  cat_poolfence: Hexagon,
  cat_promo:    Gift,
};

// Slug â†’ icon for the "new category" icon picker
const ICON_SLUG_OPTIONS: { slug: string; label: string; Icon: LucideIcon }[] = [
  { slug: 'Ruler',       label: 'Ruler',       Icon: Ruler },
  { slug: 'Anchor',      label: 'Anchor',      Icon: Anchor },
  { slug: 'LayoutGrid',  label: 'Grid',        Icon: LayoutGrid },
  { slug: 'Leaf',        label: 'Leaf',        Icon: Leaf },
  { slug: 'Layers',      label: 'Layers',      Icon: Layers },
  { slug: 'Frame',       label: 'Frame',       Icon: Frame },
  { slug: 'TrendingUp',  label: 'Trending',    Icon: TrendingUp },
  { slug: 'AlignJustify', label: 'Justify',    Icon: AlignJustify },
  { slug: 'Lightbulb',   label: 'Lightbulb',  Icon: Lightbulb },
  { slug: 'GitBranch',   label: 'Branch',      Icon: GitBranch },
  { slug: 'Box',         label: 'Box',         Icon: Box },
  { slug: 'Shield',      label: 'Shield',      Icon: Shield },
  { slug: 'PlusCircle',  label: 'Plus',        Icon: PlusCircle },
  { slug: 'Umbrella',    label: 'Umbrella',    Icon: Umbrella },
  { slug: 'Hexagon',     label: 'Hexagon',     Icon: Hexagon },
  { slug: 'Gift',        label: 'Gift',        Icon: Gift },
  { slug: 'BookOpen',    label: 'Book',        Icon: BookOpen },
];

const SLUG_TO_ICON: Record<string, LucideIcon> = Object.fromEntries(
  ICON_SLUG_OPTIONS.map(o => [o.slug, o.Icon])
);

// â”€â”€ Unit Options â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const UNIT_OPTIONS = ['Sq. Ft.', 'L.F.', 'Each', 'Per Ft.', 'Per Hour', 'Flat Rate', 'Custom...'];

function formatCurrency(n: number): string {
  return n === 0 ? '$0.00' : `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function newId(): string {
  return `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function newCatId(): string {
  return `cat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// â”€â”€ Style constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const inputCls = 'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-gold)]/50 transition-all placeholder:text-[var(--muted-text)]';
const labelCls = 'block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.18em] mb-1';

// â”€â”€ Sub-component: CategoryModal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface CategoryModalProps {
  initial?: PriceBookCategory;
  itemCount: number;
  onSave: (cat: PriceBookCategory) => void;
  onDelete?: () => void;
  onClose: () => void;
}

function CategoryModal({ initial, itemCount, onSave, onDelete, onClose }: CategoryModalProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [iconSlug, setIconSlug] = useState<string>(() => {
    if (initial?.id) {
      const Icon = CATEGORY_ICON_MAP[initial.id];
      const found = ICON_SLUG_OPTIONS.find(o => o.Icon === Icon);
      return found?.slug ?? 'BookOpen';
    }
    return 'BookOpen';
  });
  const [imageUrl, setImageUrl] = useState<string | undefined>(initial?.imageUrl);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setImageUrl(dataUrl);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: initial?.id ?? newCatId(),
      name: name.trim(),
      imageUrl,
      order: initial?.order ?? 99,
    });
  };

  const PreviewIcon = SLUG_TO_ICON[iconSlug] ?? BookOpen;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest">
            {initial ? 'Edit Category' : 'New Category'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-all">
            <X className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className={labelCls}>Category Name</label>
            <input
              className={inputCls}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Decking"
              autoFocus
            />
          </div>

          {/* Icon picker (only when no image set) */}
          {!imageUrl && (
            <div>
              <label className={labelCls}>Icon</label>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/20 flex items-center justify-center flex-shrink-0">
                  <PreviewIcon className="w-6 h-6 text-[var(--brand-gold)]" />
                </div>
                <select
                  className={`${inputCls} flex-1`}
                  value={iconSlug}
                  onChange={e => setIconSlug(e.target.value)}
                >
                  {ICON_SLUG_OPTIONS.map(o => (
                    <option key={o.slug} value={o.slug}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Image upload */}
          <div>
            <label className={labelCls}>Category Image (optional)</label>
            {imageUrl ? (
              <div className="flex items-center gap-3">
                <img src={imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover border border-white/10" />
                <button
                  onClick={() => setImageUrl(undefined)}
                  className="text-xs text-rose-400 hover:text-rose-300 font-bold transition-colors"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-[var(--text-secondary)] hover:border-white/20 hover:text-[var(--text-primary)] transition-all"
              >
                <Upload className="w-3.5 h-3.5" /> Upload image
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>
        </div>

        <div className="px-6 pb-5 flex items-center justify-between gap-3">
          {/* Delete */}
          {initial && onDelete && (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-400 font-medium">
                  {itemCount > 0 ? `This will also delete ${itemCount} item${itemCount > 1 ? 's' : ''}. Sure?` : 'Delete this category?'}
                </span>
                <button onClick={onDelete} className="px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-xs text-rose-400 font-bold hover:bg-rose-500/30 transition-all">
                  Yes, delete
                </button>
                <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-[var(--text-secondary)] font-bold transition-all">
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-bold transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )
          )}
          {!initial && <div />}

          <div className="flex items-center gap-2 ml-auto">
            <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim()}
              className="px-4 py-2 rounded-xl bg-[var(--brand-gold)] text-black text-xs font-black uppercase tracking-wider disabled:opacity-40 hover:bg-[var(--brand-gold-light)] transition-all"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// â”€â”€ Sub-component: ImageCropModal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const DISPLAY = 280; // px â€” size of the crop preview box

interface ImageCropModalProps {
  src: string;
  onSave: (croppedDataUrl: string) => void;
  onClose: () => void;
}

function ImageCropModal({ src, onSave, onClose }: ImageCropModalProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [natW, setNatW] = useState(0);
  const [natH, setNatH] = useState(0);
  const dragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startOff = useRef({ x: 0, y: 0 });

  const dispW = natW * scale;
  const dispH = natH * scale;

  const clampOffset = useCallback((ox: number, oy: number, dw: number, dh: number) => ({
    x: Math.min(0, Math.max(DISPLAY - dw, ox)),
    y: Math.min(0, Math.max(DISPLAY - dh, oy)),
  }), []);

  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    setNatW(nw);
    setNatH(nh);
    const s = Math.max(DISPLAY / nw, DISPLAY / nh);
    setScale(s);
    const dw = nw * s;
    const dh = nh * s;
    setOffset({ x: -(dw - DISPLAY) / 2, y: -(dh - DISPLAY) / 2 });
  };

  const handleScaleChange = (newScale: number) => {
    setScale(newScale);
    const dw = natW * newScale;
    const dh = natH * newScale;
    setOffset(prev => clampOffset(prev.x, prev.y, dw, dh));
  };

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    startOff.current = { ...offset };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    setOffset(clampOffset(startOff.current.x + dx, startOff.current.y + dy, dispW, dispH));
  };
  const onMouseUp = () => { dragging.current = false; };

  // Touch support for mobile
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    dragging.current = true;
    startPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    startOff.current = { ...offset };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - startPos.current.x;
    const dy = e.touches[0].clientY - startPos.current.y;
    setOffset(clampOffset(startOff.current.x + dx, startOff.current.y + dy, dispW, dispH));
  };
  const onTouchEnd = () => { dragging.current = false; };

  const handleCrop = () => {
    if (!natW || !natH) return;
    // Map the visible crop box back to natural image coordinates
    const cropX = (-offset.x) / scale;
    const cropY = (-offset.y) / scale;
    const cropW = DISPLAY / scale;
    const cropH = DISPLAY / scale;

    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, 300, 300);
      onSave(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.src = src;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest">Crop Image</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-all">
            <X className="w-4 h-4 text-[var(--muted-text)]" />
          </button>
        </div>
        <p className="text-[10px] text-[var(--muted-text)] mb-4">Drag to reposition. Use the slider to zoom.</p>

        {/* Crop preview box */}
        <div
          className="mx-auto rounded-xl overflow-hidden border-2 border-[var(--brand-gold)] select-none touch-none"
          style={{ width: DISPLAY, height: DISPLAY, position: 'relative', cursor: 'grab' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <img
            src={src}
            onLoad={handleImgLoad}
            draggable={false}
            style={{
              position: 'absolute',
              left: offset.x,
              top: offset.y,
              width: dispW || 'auto',
              height: dispH || 'auto',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
        </div>

        {/* Zoom slider */}
        {natW > 0 && (
          <div className="flex items-center gap-3 mt-4">
            <span className="text-[9px] font-black text-[var(--muted-text)] uppercase tracking-widest w-8">Zoom</span>
            <input
              type="range"
              min={Math.max(DISPLAY / natW, DISPLAY / natH)}
              max={Math.max(DISPLAY / natW, DISPLAY / natH) * 4}
              step={0.01}
              value={scale}
              onChange={e => handleScaleChange(parseFloat(e.target.value))}
              className="flex-1 accent-[#B8892A]"
            />
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-[var(--text-secondary)] hover:bg-white/10 transition-all">
            Cancel
          </button>
          <button onClick={handleCrop} className="flex-1 py-2.5 rounded-xl bg-[var(--brand-gold)] text-black text-xs font-black uppercase tracking-wider hover:bg-[var(--brand-gold-light)] transition-all">
            Crop & Save
          </button>
        </div>
      </div>
    </div>
  );
}

// â”€â”€ Sub-component: ItemEditView â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ItemEditViewProps {
  item: PriceBookItem | null;
  categoryId: string;
  onSave: (item: PriceBookItem) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

const BLANK_ITEM = (categoryId: string): PriceBookItem => ({
  id: newId(),
  categoryId,
  name: '',
  description: '',
  price: 0,
  cost: 0,
  unit: 'Each',
  taxable: true,
  isActive: true,
});

function ItemEditView({ item, categoryId, onSave, onDelete, onBack }: ItemEditViewProps) {
  const [form, setForm] = useState<PriceBookItem>(item ?? BLANK_ITEM(categoryId));
  const [customUnit, setCustomUnit] = useState('');
  const [useCustomUnit, setUseCustomUnit] = useState(item ? !UNIT_OPTIONS.slice(0, -1).includes(item.unit) : false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const isNew = !item;

  const set = useCallback(<K extends keyof PriceBookItem>(key: K, val: PriceBookItem[K]) => {
    setForm(prev => ({ ...prev, [key]: val }));
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    e.target.value = '';
    const dataUrl = await readFileAsDataUrl(file);
    setCropSrc(dataUrl);
  };

  const handleCropSave = (cropped: string) => {
    set('imageUrl', cropped);
    setCropSrc(null);
    // Auto-save immediately so the image persists without a separate Save click
    if (form.name.trim()) {
      const finalUnit = useCustomUnit ? customUnit.trim() || 'Each' : form.unit;
      onSave({ ...form, imageUrl: cropped, unit: finalUnit });
    }
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const finalUnit = useCustomUnit ? customUnit.trim() || 'Each' : form.unit;
    onSave({ ...form, unit: finalUnit });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--bg-primary)] border-b border-[var(--border-color)] backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/5 transition-all">
              <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
            <h1 className="text-base font-black text-[var(--text-primary)] uppercase tracking-tight">
              {isNew ? 'New Item' : 'Edit Item'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {!isNew && (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-rose-400">Delete this item?</span>
                  <button onClick={() => onDelete(form.id)} className="px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-xs text-rose-400 font-bold">Yes</button>
                  <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-[var(--text-secondary)] font-bold">No</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="p-2 rounded-xl hover:bg-rose-500/10 transition-all group">
                  <Trash2 className="w-4 h-4 text-[var(--muted-text)] group-hover:text-rose-400 transition-colors" />
                </button>
              )
            )}
            <button onClick={onBack} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!form.name.trim()}
              className="px-4 py-2 rounded-xl bg-[var(--brand-gold)] text-black text-xs font-black uppercase tracking-wider disabled:opacity-40 hover:bg-[var(--brand-gold-light)] transition-all"
            >
              Save Item
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Active toggle */}
        <div className="flex items-center justify-between bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl px-5 py-4">
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">Item Active</p>
            <p className="text-xs text-[var(--muted-text)] mt-0.5">Inactive items are hidden from estimates by default</p>
          </div>
          <button
            onClick={() => set('isActive', !form.isActive)}
            className="transition-all"
          >
            {form.isActive
              ? <ToggleRight className="w-8 h-8 text-[var(--brand-gold)]" />
              : <ToggleLeft className="w-8 h-8 text-[var(--muted-text)]" />
            }
          </button>
        </div>

        {/* Core fields */}
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl px-5 py-5 space-y-4">
          <div>
            <label className={labelCls}>Item Name</label>
            <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Cedar wood decking" autoFocus={isNew} />
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={4}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Describe what is supplied and installed..."
            />
          </div>

          {/* Price + Cost row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Price ($ / unit)</label>
              <input
                className={inputCls}
                type="number"
                min={0}
                step={0.01}
                value={form.price}
                onChange={e => set('price', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className={labelCls}>Cost ($ / unit)</label>
              <input
                className={inputCls}
                type="number"
                min={0}
                step={0.01}
                value={form.cost}
                onChange={e => set('cost', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Unit + Taxable row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Unit of Measure</label>
              {useCustomUnit ? (
                <div className="flex gap-2">
                  <input
                    className={`${inputCls} flex-1`}
                    value={customUnit}
                    onChange={e => setCustomUnit(e.target.value)}
                    placeholder="e.g. Per Panel"
                    autoFocus
                  />
                  <button onClick={() => { setUseCustomUnit(false); set('unit', 'Each'); }} className="p-2 rounded-xl hover:bg-white/5 transition-all">
                    <X className="w-3.5 h-3.5 text-[var(--muted-text)]" />
                  </button>
                </div>
              ) : (
                <select
                  className={inputCls}
                  value={form.unit}
                  onChange={e => {
                    if (e.target.value === 'Custom...') {
                      setUseCustomUnit(true);
                      setCustomUnit('');
                    } else {
                      set('unit', e.target.value);
                    }
                  }}
                >
                  {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              )}
            </div>

            <div>
              <label className={labelCls}>Taxable</label>
              <button
                onClick={() => set('taxable', !form.taxable)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 w-full hover:border-white/20 transition-all"
              >
                {form.taxable
                  ? <ToggleRight className="w-5 h-5 text-[var(--brand-gold)] flex-shrink-0" />
                  : <ToggleLeft className="w-5 h-5 text-[var(--muted-text)] flex-shrink-0" />
                }
                <span className="text-xs font-bold text-[var(--text-secondary)]">
                  {form.taxable ? 'Taxable' : 'Non-taxable'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Margin indicator */}
        {form.price > 0 && form.cost > 0 && (
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl px-5 py-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-widest">Margin</p>
              <p className="text-lg font-black text-[var(--text-primary)]">
                {(((form.price - form.cost) / form.price) * 100).toFixed(1)}%
              </p>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-widest">Gross Profit</p>
              <p className="text-lg font-black text-[var(--brand-gold)]">{formatCurrency(form.price - form.cost)}</p>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-widest">Per Unit Price</p>
              <p className="text-lg font-black text-[var(--text-primary)]">{formatCurrency(form.price)}</p>
            </div>
          </div>
        )}

        {/* Image upload */}
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl px-5 py-5">
          <label className={labelCls}>Item Image (optional)</label>
          {form.imageUrl ? (
            <div className="flex items-center gap-4 mt-2">
              <img src={form.imageUrl} alt="" className="w-20 h-20 rounded-xl object-cover border border-white/10" />
              <button onClick={() => set('imageUrl', undefined)} className="text-xs text-rose-400 hover:text-rose-300 font-bold transition-colors">
                Remove image
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="mt-2 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-[var(--text-secondary)] hover:border-white/20 hover:text-[var(--text-primary)] transition-all"
            >
              <Upload className="w-3.5 h-3.5" /> Upload &amp; Crop Image
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </div>

      </div>

      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          onSave={handleCropSave}
          onClose={() => setCropSrc(null)}
        />
      )}
    </div>
  );
}

// â”€â”€ Sub-component: ItemListView â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ItemListViewProps {
  category: PriceBookCategory;
  items: PriceBookItem[];
  onSelectItem: (item: PriceBookItem) => void;
  onNewItem: () => void;
  onBack: () => void;
}

function ItemListView({ category, items, onSelectItem, onNewItem, onBack }: ItemListViewProps) {
  const [search, setSearch] = useState('');

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const CatIcon = CATEGORY_ICON_MAP[category.id] ?? BookOpen;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--bg-primary)] border-b border-[var(--border-color)] backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/5 transition-all">
              <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[var(--muted-text)] font-medium">Price Book</span>
              <ChevronRight className="w-3.5 h-3.5 text-[var(--muted-text)]" />
              <span className="font-black text-[var(--text-primary)]">{category.name}</span>
            </div>
          </div>
          <button
            onClick={onNewItem}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand-gold)] text-black text-xs font-black uppercase tracking-wider hover:bg-[var(--brand-gold-light)] transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Add Item
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-text)]" />
          <input
            className={`${inputCls} pl-9`}
            placeholder="Search items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-[var(--muted-text)]">
          <span>{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
          {search && <span>filtered from {items.length}</span>}
          <span className="ml-auto flex items-center gap-1.5">
            <CatIcon className="w-3.5 h-3.5 text-[var(--brand-gold)]" />
            <span className="text-[var(--brand-gold)] font-bold">{category.name}</span>
          </span>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl px-6 py-12 text-center">
            <BookOpen className="w-8 h-8 text-[var(--muted-text)] mx-auto mb-3 opacity-50" />
            <p className="text-sm font-bold text-[var(--text-secondary)]">
              {search ? 'No items match that search' : 'No items in this category yet'}
            </p>
            {!search && (
              <button onClick={onNewItem} className="mt-4 text-xs text-[var(--brand-gold)] font-bold hover:underline">
                Add the first item
              </button>
            )}
          </div>
        ) : (
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="px-4 py-3 text-left text-[9px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em]">Name</th>
                  <th className="px-4 py-3 text-left text-[9px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em] hidden md:table-cell">Description</th>
                  <th className="px-4 py-3 text-left text-[9px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em]">Unit</th>
                  <th className="px-4 py-3 text-right text-[9px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em]">Price</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((itm, idx) => (
                  <tr
                    key={itm.id}
                    onClick={() => onSelectItem(itm)}
                    className={`border-b border-[var(--card-border)] last:border-0 cursor-pointer hover:bg-white/[0.02] transition-colors ${!itm.isActive ? 'opacity-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {itm.imageUrl ? (
                          <img src={itm.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover border border-white/10 flex-shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-[var(--brand-gold)]/5 border border-[var(--brand-gold)]/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-black text-[var(--brand-gold)]">{String(idx + 1).padStart(2, '0')}</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--text-primary)] truncate">{itm.name}</p>
                          {!itm.isActive && (
                            <span className="text-[9px] font-black text-[var(--muted-text)] uppercase tracking-widest">Inactive</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-xs text-[var(--text-secondary)] truncate max-w-xs">
                        {itm.description.length > 60 ? `${itm.description.slice(0, 60)}...` : itm.description}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--muted-text)]">{itm.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs font-black text-[var(--text-primary)]">{formatCurrency(itm.price)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={e => { e.stopPropagation(); onSelectItem(itm); }}
                        className="p-1.5 rounded-lg hover:bg-white/5 transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5 text-[var(--muted-text)]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// â”€â”€ Settings nav tabs (shared pattern from BookingSettingsView) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SETTINGS_TABS = [
  { view: 'booking-settings',    label: 'Booking',     icon: <Calendar className="w-3.5 h-3.5" /> },
  { view: 'automation-settings', label: 'Automations', icon: <Zap className="w-3.5 h-3.5" /> },
  { view: 'price-book',          label: 'Price Book',  icon: <BookOpen className="w-3.5 h-3.5" /> },
  { view: 'user-management',     label: 'Users',       icon: <Users className="w-3.5 h-3.5" /> },
  { view: 'business-info',       label: 'Business',    icon: <Building2 className="w-3.5 h-3.5" /> },
];

// â”€â”€ Main component: PriceBookView â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface PriceBookViewProps {
  onBack: () => void;
  onNavigate?: (view: string) => void;
}

type PaneView =
  | { kind: 'categories' }
  | { kind: 'items'; category: PriceBookCategory }
  | { kind: 'edit'; item: PriceBookItem | null; categoryId: string };

const PriceBookView: React.FC<PriceBookViewProps> = ({ onBack, onNavigate }) => {
  const [{ categories, items }, setData] = useState(() => loadPriceBook());
  const [pane, setPane] = useState<PaneView>({ kind: 'categories' });
  const [catModal, setCatModal] = useState<PriceBookCategory | null | 'new'>(null);

  // Persist on every change
  const persist = useCallback((cats: PriceBookCategory[], itms: PriceBookItem[]) => {
    setData({ categories: cats, items: itms });
    savePriceBook(cats, itms);
  }, []);

  // â”€â”€ Category handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleSaveCategory = (cat: PriceBookCategory) => {
    const exists = categories.find(c => c.id === cat.id);
    const next = exists
      ? categories.map(c => c.id === cat.id ? cat : c)
      : [...categories, { ...cat, order: categories.length + 1 }];
    persist(next.sort((a, b) => a.order - b.order), items);
    setCatModal(null);
  };

  const handleDeleteCategory = (catId: string) => {
    persist(
      categories.filter(c => c.id !== catId),
      items.filter(i => i.categoryId !== catId)
    );
    setCatModal(null);
    setPane({ kind: 'categories' });
  };

  // â”€â”€ Item handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleSaveItem = (saved: PriceBookItem) => {
    const exists = items.find(i => i.id === saved.id);
    const next = exists
      ? items.map(i => i.id === saved.id ? saved : i)
      : [...items, saved];
    persist(categories, next);
    // Go back to item list
    const cat = categories.find(c => c.id === saved.categoryId);
    if (cat) setPane({ kind: 'items', category: cat });
  };

  const handleDeleteItem = (id: string) => {
    const catId = items.find(i => i.id === id)?.categoryId;
    persist(categories, items.filter(i => i.id !== id));
    const cat = catId ? categories.find(c => c.id === catId) : undefined;
    if (cat) setPane({ kind: 'items', category: cat });
    else setPane({ kind: 'categories' });
  };

  // â”€â”€ Render pane: item edit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (pane.kind === 'edit') {
    const cat = categories.find(c => c.id === pane.categoryId);
    return (
      <ItemEditView
        item={pane.item}
        categoryId={pane.categoryId}
        onSave={handleSaveItem}
        onDelete={handleDeleteItem}
        onBack={() => {
          if (cat) setPane({ kind: 'items', category: cat });
          else setPane({ kind: 'categories' });
        }}
      />
    );
  }

  // â”€â”€ Render pane: item list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (pane.kind === 'items') {
    const catItems = items.filter(i => i.categoryId === pane.category.id);
    return (
      <>
        <ItemListView
          category={pane.category}
          items={catItems}
          onSelectItem={itm => setPane({ kind: 'edit', item: itm, categoryId: pane.category.id })}
          onNewItem={() => setPane({ kind: 'edit', item: null, categoryId: pane.category.id })}
          onBack={() => setPane({ kind: 'categories' })}
        />
        {/* Category edit modal accessible from item list */}
        {catModal && catModal !== 'new' && (
          <CategoryModal
            initial={catModal}
            itemCount={items.filter(i => i.categoryId === catModal.id).length}
            onSave={handleSaveCategory}
            onDelete={() => handleDeleteCategory(catModal.id)}
            onClose={() => setCatModal(null)}
          />
        )}
      </>
    );
  }

  // â”€â”€ Render pane: category grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const sortedCats = [...categories].sort((a, b) => a.order - b.order);

  return (
    <>
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">

        {/* Header */}
        <header className="sticky top-0 z-40 bg-[var(--bg-primary)] border-b border-[var(--border-color)] backdrop-blur-xl">
          <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/5 transition-all">
                <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
              <div>
                <h1 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tight italic">Price Book</h1>
                <p className="text-[9px] text-[var(--brand-gold)] font-black uppercase tracking-[0.2em]">
                  {items.length} items across {categories.length} categories
                </p>
              </div>
            </div>
            <button
              onClick={() => setCatModal('new')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand-gold)] text-black text-xs font-black uppercase tracking-wider hover:bg-[var(--brand-gold-light)] transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> New Category
            </button>
          </div>
        </header>

        {/* Settings sub-nav */}
        {onNavigate && (
          <div className="bg-[var(--bg-primary)] border-b border-[var(--border-color)]">
            <div className="max-w-5xl mx-auto px-6 flex gap-1 py-2 overflow-x-auto">
              {SETTINGS_TABS.map(tab => (
                <button
                  key={tab.view}
                  onClick={() => onNavigate(tab.view)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    tab.view === 'price-book'
                      ? 'bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] border border-[var(--brand-gold)]/20'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Category grid */}
        <main className="max-w-5xl mx-auto px-6 py-8">
          {sortedCats.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen className="w-10 h-10 text-[var(--muted-text)] mx-auto mb-4 opacity-40" />
              <p className="text-sm font-bold text-[var(--text-secondary)]">No categories yet</p>
              <button onClick={() => setCatModal('new')} className="mt-3 text-xs text-[var(--brand-gold)] font-bold hover:underline">
                Create the first one
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {sortedCats.map(cat => {
                const CatIcon = CATEGORY_ICON_MAP[cat.id] ?? BookOpen;
                const catItemCount = items.filter(i => i.categoryId === cat.id).length;
                const activeCount = items.filter(i => i.categoryId === cat.id && i.isActive).length;

                return (
                  <div
                    key={cat.id}
                    className="group relative bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden cursor-pointer transition-all hover:border-[var(--brand-gold)]/40 hover:shadow-[0_0_0_1px_var(--brand-gold),0_4px_20px_-4px_rgba(196,164,50,0.2)]"
                    style={{ height: '140px' }}
                    onClick={() => setPane({ kind: 'items', category: cat })}
                  >
                    {/* Background */}
                    {cat.imageUrl ? (
                      <img src={cat.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <CatIcon className="w-10 h-10 text-[var(--brand-gold)] opacity-25 group-hover:opacity-40 transition-opacity" />
                      </div>
                    )}

                    {/* Dark gradient overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                    {/* Edit button */}
                    <button
                      onClick={e => { e.stopPropagation(); setCatModal(cat); }}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 hover:bg-black/60 opacity-0 group-hover:opacity-100 transition-all z-10"
                    >
                      <Pencil className="w-3 h-3 text-white" />
                    </button>

                    {/* Text footer */}
                    <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 pt-4">
                      <p className="text-xs font-black text-white leading-tight">{cat.name}</p>
                      <p className="text-[9px] text-white/50 mt-0.5">
                        {catItemCount} item{catItemCount !== 1 ? 's' : ''}
                        {catItemCount !== activeCount && (
                          <span className="ml-1 text-amber-400/70">{catItemCount - activeCount} inactive</span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Add category card */}
              <button
                onClick={() => setCatModal('new')}
                className="h-[140px] border-2 border-dashed border-[var(--card-border)] rounded-2xl flex flex-col items-center justify-center gap-2 text-[var(--muted-text)] hover:border-[var(--brand-gold)]/30 hover:text-[var(--brand-gold)] transition-all group"
              >
                <Plus className="w-6 h-6 opacity-50 group-hover:opacity-100 transition-opacity" />
                <span className="text-[9px] font-black uppercase tracking-widest opacity-50 group-hover:opacity-100 transition-opacity">New Category</span>
              </button>
            </div>
          )}

          {/* Inventory summary */}
          {sortedCats.length > 0 && (
            <div className="mt-8 grid grid-cols-3 gap-4">
              {[
                { label: 'Total Items',    value: items.length },
                { label: 'Active Items',   value: items.filter(i => i.isActive).length },
                { label: 'Categories',     value: categories.length },
              ].map(stat => (
                <div key={stat.label} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl px-5 py-4 text-center">
                  <p className="text-2xl font-black text-[var(--brand-gold)]">{stat.value}</p>
                  <p className="text-[9px] font-black text-[var(--muted-text)] uppercase tracking-[0.18em] mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Category modal (new or edit) */}
      {catModal !== null && (
        <CategoryModal
          initial={catModal === 'new' ? undefined : catModal}
          itemCount={catModal === 'new' ? 0 : items.filter(i => i.categoryId === (catModal as PriceBookCategory).id).length}
          onSave={handleSaveCategory}
          onDelete={catModal !== 'new' ? () => handleDeleteCategory((catModal as PriceBookCategory).id) : undefined}
          onClose={() => setCatModal(null)}
        />
      )}
    </>
  );
};

export default PriceBookView;
