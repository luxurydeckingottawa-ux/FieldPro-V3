import React from 'react';
import { Shield } from 'lucide-react';
import { COMPANY } from '../config/company';

const Logo: React.FC = () => {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-[var(--text-primary)] rounded-lg flex items-center justify-center shadow-md">
        <Shield className="text-[var(--bg-primary)] w-5 h-5" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-bold text-[var(--text-primary)] leading-none">{COMPANY.name}</span>
        <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest font-semibold">Field Pro</span>
      </div>
    </div>
  );
};

export default Logo;
