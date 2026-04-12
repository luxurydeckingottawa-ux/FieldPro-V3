import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

interface ConnectivityStatusProps {
  isOnline: boolean;
}

const ConnectivityStatus: React.FC<ConnectivityStatusProps> = ({ isOnline }) => {
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all ${
      isOnline 
        ? 'bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] border-[var(--brand-gold)]/20 shadow-[0_0_15px_rgba(196,164,50,0.1)]' 
        : 'bg-rose-500/10 text-rose-500 border-rose-500/20 animate-pulse'
    }`}>
      {isOnline ? (
        <>
          <Wifi className="w-3.5 h-3.5" strokeWidth={3} />
          <span>Sync Active</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5" strokeWidth={3} />
          <span>Offline Mode</span>
        </>
      )}
    </div>
  );
};

export default ConnectivityStatus;
