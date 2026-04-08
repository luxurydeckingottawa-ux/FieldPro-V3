import React, { useRef, useState, useEffect } from 'react';
import { Eraser, PenTool } from 'lucide-react';

interface SignaturePadProps {
  onSave: (signature: string) => void;
  onClear: () => void;
  initialValue?: string;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onClear, initialValue }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!initialValue);

  useEffect(() => {
    if (initialValue && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
        };
        img.src = initialValue;
      }
    }
  }, [initialValue]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      const touch = e.touches[0];
      if (!touch) return;
      x = touch.clientX - rect.left;
      y = touch.clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    // Use the computed style to get the text-primary color for the signature
    const textPrimary = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim();
    ctx.strokeStyle = textPrimary || (document.documentElement.classList.contains('dark') ? '#ffffff' : '#000000');
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      const touch = e.touches[0];
      if (!touch) return;
      x = touch.clientX - rect.left;
      y = touch.clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (hasSignature && canvasRef.current) {
      onSave(canvasRef.current.toDataURL());
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onClear();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2 px-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center border border-[var(--border-color)]">
            <PenTool className="w-4 h-4 text-[var(--brand-gold)]" />
          </div>
          <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Sign Below</span>
        </div>
        <button
          onClick={clear}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[var(--bg-secondary)]/80 hover:text-[var(--text-primary)] transition-all active:scale-95"
        >
          <Eraser className="w-3.5 h-3.5" />
          <span>Clear</span>
        </button>
      </div>

      <div className="relative aspect-[3/1] bg-[var(--bg-secondary)] border-2 border-dashed border-[var(--border-color)] rounded-[2rem] overflow-hidden cursor-crosshair group hover:border-[var(--brand-gold)]/30 transition-all">
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          className="w-full h-full touch-none relative z-10"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-[var(--text-secondary)] font-black uppercase tracking-[0.3em] text-sm">Customer Signature</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignaturePad;
