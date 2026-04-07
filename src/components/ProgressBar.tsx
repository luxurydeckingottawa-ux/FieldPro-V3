import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ current, total }) => {
  const percentage = Math.min(Math.max((current / total) * 100, 0), 100);

  return (
    <div className="w-full bg-[var(--bg-primary)]/5 h-1.5 rounded-full overflow-hidden border border-[var(--border-color)]">
      <div 
        className="bg-emerald-500 h-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

export default ProgressBar;
