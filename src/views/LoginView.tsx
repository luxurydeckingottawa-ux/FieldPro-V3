import React, { useState } from 'react';
import { User, Role } from '../types';
import { APP_USERS } from '../constants';
import { Shield, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { dataService } from '../services/dataService';
import { isSupabaseConfigured } from '../lib/supabase';

interface LoginViewProps {
  onLogin: (user: User) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Chrome autofill sets DOM values without triggering React onChange.
    // Read from DOM directly as the authoritative source to handle both cases.
    const form = e.target as HTMLFormElement;
    const emailVal = (form.querySelector('input[type="email"]') as HTMLInputElement)?.value || email;
    const pwVal = (form.querySelector('input[type="password"]') as HTMLInputElement)?.value || password;

    try {
      if (isSupabaseConfigured()) {
        // Production path: Supabase Auth only — no local fallback
        const user = await dataService.signIn(emailVal, pwVal);
        if (user) {
          onLogin(user);
        } else {
          setError('Invalid email or password. Please try again.');
        }
        return;
      }

      // Dev-only fallback: local APP_USERS (never runs in production since Supabase is always configured there)
      if (import.meta.env.DEV) {
        const mockUser = APP_USERS.find(
          u => u.email.toLowerCase() === emailVal.toLowerCase() && u.password === pwVal
        );
        if (mockUser) {
          onLogin(mockUser);
        } else {
          setError('Invalid email or password.');
        }
      } else {
        setError('Authentication service unavailable. Please contact the administrator.');
      }
    } catch (err) {
      setError('Login failed. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] flex flex-col items-center justify-center p-4 transition-colors duration-300">
      <div className="w-full max-w-md bg-[var(--bg-primary)] rounded-2xl shadow-xl p-8 border border-[var(--border-color)]">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#C4A432] rounded-xl flex items-center justify-center mb-4 shadow-lg">
            <Shield className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Luxury Decking</h1>
          <p className="text-[var(--text-secondary)]">Field Pro & Operations Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest ml-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@luxurydecking.ca"
                className="w-full pl-12 pr-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C4A432] focus:bg-[var(--bg-primary)] transition-all text-[var(--text-primary)]"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest ml-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full pl-12 pr-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C4A432] focus:bg-[var(--bg-primary)] transition-all text-[var(--text-primary)]"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-[#C4A432] text-white font-bold rounded-xl hover:bg-[#D4B84A] transition-all shadow-lg shadow-[#C4A432]/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[var(--border-color)] text-center">
          <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest font-semibold">
            Secure Operations Environment
          </p>
          {isSupabaseConfigured() ? (
            <div className="mt-3 flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#C4A432] shadow-[0_0_6px_rgba(196,164,50,0.5)]" />
              <span className="text-[10px] text-[#C4A432] font-bold uppercase tracking-widest">Cloud Connected</span>
            </div>
          ) : (
            <div className="mt-3 flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
              <span className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">Dev Mode</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginView;
