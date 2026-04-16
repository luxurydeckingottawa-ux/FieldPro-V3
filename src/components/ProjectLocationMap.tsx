import React from 'react';
import { ExternalLink, MapPin, Camera } from 'lucide-react';

interface ProjectLocationMapProps {
  address: string;
  className?: string;
  hideAddress?: boolean;
}

const ProjectLocationMap: React.FC<ProjectLocationMapProps> = ({ address, className = '', hideAddress = false }) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  // Street View Static API URL
  const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=800x600&location=${encodeURIComponent(address)}&key=${apiKey}`;
  
  // Google Maps URL for external link
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  if (!apiKey) {
    const sampleImageUrl = `https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=800&h=600`;
    
    return (
      <div className={`group relative overflow-hidden rounded-[2.5rem] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl ${className}`}>
        <div className="h-full w-full relative">
          <img 
            src={sampleImageUrl} 
            alt="Sample House Preview"
            className="w-full h-full object-cover opacity-60 grayscale hover:grayscale-0 transition-all duration-700"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--brand-gold)]/20 border border-[var(--brand-gold)]/30 flex items-center justify-center backdrop-blur-md">
              <Camera className="w-5 h-5 text-[var(--brand-gold-light)]" />
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black text-white uppercase tracking-widest">House Preview</p>
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-tight max-w-[120px]">
                Sample Image (API Key Required)
              </p>
            </div>
            <a 
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-[8px] font-black text-white uppercase tracking-widest transition-all backdrop-blur-md"
            >
              View Map <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`group relative overflow-hidden rounded-[2.5rem] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl ${className}`}>
      {/* Image Container */}
      <div className="aspect-[16/10] w-full overflow-hidden relative bg-[var(--bg-secondary)]">
        <img 
          src={streetViewUrl} 
          alt={`Street view of ${address}`}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          referrerPolicy="no-referrer"
          onError={(e) => {
            // Fallback if image fails to load
            (e.target as HTMLImageElement).src = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(address)}&zoom=18&size=800x600&maptype=satellite&key=${apiKey}`;
          }}
        />
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* External Link Button */}
        <a 
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-6 right-6 p-4 bg-white text-black rounded-2xl shadow-2xl transform translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 hover:bg-[var(--brand-gold)] hover:scale-110 active:scale-95"
          title="Open in Google Maps"
        >
          <ExternalLink size={20} />
        </a>
      </div>
      
      {/* Address Label */}
      {!hideAddress && (
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/20">
              <MapPin className="w-4 h-4 text-[var(--brand-gold)]" />
            </div>
            <div>
              <p className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-widest mb-0.5">Project Location</p>
              <p className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-tight truncate max-w-[200px] sm:max-w-none">
                {address}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectLocationMap;
