import React, { useState, useEffect, useCallback, useRef } from 'react';

/**
 * ProductGallery
 *
 * Fullscreen lightbox overlay for browsing product images on the
 * 42" showroom TV. Designed for the privacy wall product cards in
 * EstimatorShowroomView. Dark backdrop, gold accents, large main
 * image with thumbnail strip and arrow navigation.
 *
 * Keyboard: ArrowLeft/ArrowRight to cycle, Escape to close.
 */

const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const FONT_BODY = "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif";
const GOLD = '#D4A853';
const GOLD_DIM = 'rgba(212, 168, 83, 0.45)';
const BACKDROP = 'rgba(10, 10, 10, 0.92)';

export interface GalleryImage {
  url: string;
  label: string;
}

export interface ProductGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  images: GalleryImage[];
}

const ProductGallery: React.FC<ProductGalleryProps> = ({
  isOpen,
  onClose,
  productName,
  images,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [fadeClass, setFadeClass] = useState<'in' | 'out'>('in');
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset to first image when gallery opens with new product
  useEffect(() => {
    if (isOpen) {
      setActiveIndex(0);
      setFadeClass('in');
    }
  }, [isOpen, productName]);

  // Navigate with smooth crossfade
  const goTo = useCallback(
    (index: number) => {
      if (index === activeIndex || images.length === 0) return;
      setFadeClass('out');
      setTimeout(() => {
        setActiveIndex(index);
        setFadeClass('in');
      }, 180);
    },
    [activeIndex, images.length]
  );

  const goNext = useCallback(() => {
    if (images.length === 0) return;
    goTo((activeIndex + 1) % images.length);
  }, [activeIndex, images.length, goTo]);

  const goPrev = useCallback(() => {
    if (images.length === 0) return;
    goTo((activeIndex - 1 + images.length) % images.length);
  }, [activeIndex, images.length, goTo]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose, goNext, goPrev]);

  // Focus container on open for keyboard capture
  useEffect(() => {
    if (isOpen && containerRef.current) {
      containerRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[activeIndex];

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: BACKDROP,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        outline: 'none',
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        aria-label="Close gallery"
        style={{
          position: 'absolute',
          top: 20,
          right: 24,
          zIndex: 55,
          background: 'rgba(30, 30, 30, 0.8)',
          border: `1px solid ${GOLD_DIM}`,
          borderRadius: 8,
          width: 44,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'border-color 0.2s, background 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = GOLD;
          e.currentTarget.style.background = 'rgba(50, 50, 50, 0.9)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = GOLD_DIM;
          e.currentTarget.style.background = 'rgba(30, 30, 30, 0.8)';
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke={GOLD}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Product name header */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          left: 0,
          right: 0,
          textAlign: 'center',
          zIndex: 52,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 22,
            fontFamily: FONT_DISPLAY,
            fontWeight: 600,
            color: GOLD,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
          }}
        >
          {productName}
        </h2>
        <div
          style={{
            marginTop: 4,
            fontSize: 12,
            fontFamily: FONT_BODY,
            color: 'rgba(232, 224, 212, 0.5)',
            letterSpacing: 1,
          }}
        >
          {activeIndex + 1} of {images.length}
        </div>
      </div>

      {/* Main image area with arrows */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          padding: '80px 80px 100px',
          position: 'relative',
          minHeight: 0,
        }}
      >
        {/* Left arrow */}
        {images.length > 1 && (
          <button
            onClick={goPrev}
            aria-label="Previous image"
            style={{
              position: 'absolute',
              left: 20,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 53,
              background: 'rgba(30, 30, 30, 0.7)',
              border: `1px solid ${GOLD_DIM}`,
              borderRadius: '50%',
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'border-color 0.2s, background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = GOLD;
              e.currentTarget.style.background = 'rgba(50, 50, 50, 0.9)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = GOLD_DIM;
              e.currentTarget.style.background = 'rgba(30, 30, 30, 0.7)';
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke={GOLD}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}

        {/* Main image */}
        <div
          style={{
            maxWidth: '85%',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <img
            key={currentImage.url}
            src={currentImage.url}
            alt={currentImage.label}
            style={{
              maxWidth: '100%',
              maxHeight: '70vh',
              objectFit: 'contain',
              borderRadius: 8,
              border: `1px solid rgba(212, 168, 83, 0.15)`,
              opacity: fadeClass === 'in' ? 1 : 0,
              transition: 'opacity 0.18s ease-in-out',
              background: 'rgba(20, 20, 20, 0.6)',
            }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          {/* Image label */}
          <div
            style={{
              fontSize: 14,
              fontFamily: FONT_BODY,
              fontWeight: 500,
              color: 'rgba(232, 224, 212, 0.7)',
              textAlign: 'center',
              letterSpacing: 0.5,
              marginTop: 4,
            }}
          >
            {currentImage.label}
          </div>
        </div>

        {/* Right arrow */}
        {images.length > 1 && (
          <button
            onClick={goNext}
            aria-label="Next image"
            style={{
              position: 'absolute',
              right: 20,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 53,
              background: 'rgba(30, 30, 30, 0.7)',
              border: `1px solid ${GOLD_DIM}`,
              borderRadius: '50%',
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'border-color 0.2s, background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = GOLD;
              e.currentTarget.style.background = 'rgba(50, 50, 50, 0.9)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = GOLD_DIM;
              e.currentTarget.style.background = 'rgba(30, 30, 30, 0.7)';
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke={GOLD}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            padding: '0 40px',
            overflowX: 'auto',
            zIndex: 52,
          }}
        >
          {images.map((img, i) => (
            <button
              key={img.url}
              onClick={() => goTo(i)}
              aria-label={`View ${img.label}`}
              style={{
                width: 60,
                height: 60,
                flexShrink: 0,
                borderRadius: 6,
                overflow: 'hidden',
                border:
                  i === activeIndex
                    ? `2px solid ${GOLD}`
                    : '2px solid rgba(80, 80, 80, 0.5)',
                cursor: 'pointer',
                opacity: i === activeIndex ? 1 : 0.55,
                transition: 'opacity 0.2s, border-color 0.2s',
                background: 'rgba(20, 20, 20, 0.8)',
                padding: 0,
              }}
              onMouseEnter={(e) => {
                if (i !== activeIndex) {
                  e.currentTarget.style.opacity = '0.85';
                  e.currentTarget.style.borderColor = GOLD_DIM;
                }
              }}
              onMouseLeave={(e) => {
                if (i !== activeIndex) {
                  e.currentTarget.style.opacity = '0.55';
                  e.currentTarget.style.borderColor = 'rgba(80, 80, 80, 0.5)';
                }
              }}
            >
              <img
                src={img.url}
                alt={img.label}
                loading="lazy"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductGallery;
