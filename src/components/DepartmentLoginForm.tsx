import React, { useState } from 'react';
import { 
  Lock, 
  Unlock, 
  KeyRound, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  HelpCircle, 
  Building2,
  Check,
  UserCheck
} from 'lucide-react';
import { TamilNaduLogo } from './TamilNaduLogo';
import { DepartmentCredential } from '../sheetData';

interface DepartmentLoginFormProps {
  departmentName: string;
  credentials: DepartmentCredential;
  departmentMeta?: {
    icon: React.ElementType;
    color: string;
    badge: string;
    bg: string;
  };
  onLoginSuccess: (userId: string) => void;
  onCancel: () => void;
}

export const DepartmentLoginForm: React.FC<DepartmentLoginFormProps> = ({
  departmentName,
  credentials,
  departmentMeta,
  onLoginSuccess,
  onCancel,
}) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  const IconComponent = departmentMeta?.icon || Building2;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanInputUser = userId.trim().toLowerCase();
    const cleanTargetUser = (credentials?.userId || '').trim().toLowerCase();
    const cleanInputPass = password.trim();
    const cleanTargetPass = (credentials?.password || '').trim();

    if (!cleanInputUser || !cleanInputPass) {
      setError('Please enter both User ID and Password.');
      return;
    }

    if (cleanInputUser === cleanTargetUser && cleanInputPass === cleanTargetPass) {
      onLoginSuccess(credentials.userId);
    } else {
      setError(`Invalid User ID or Password for ${departmentName}. Please enter the authorized departmental credentials.`);
    }
  };

  const handleAutoFill = () => {
    if (credentials) {
      setUserId(credentials.userId);
      setPassword(credentials.password);
      setError(null);
    }
  };

  return (
    <div className="max-w-xl mx-auto w-full py-6 px-2 sm:px-4">
      <div className="bg-slate-100 border-2 border-slate-300 rounded-3xl shadow-xl overflow-hidden transition-all">
        
        {/* Top Header Banner with Tamil Nadu Emblem */}
        <div className="bg-[#1e3a5f] text-white p-6 sm:p-7 relative">
          <div className="flex items-center gap-4">
            <TamilNaduLogo className="w-14 h-14 shrink-0 shadow-lg" size={56} />
            <div className="flex-1">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-200 block">
                District Administration, Thoothukudi
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
                {departmentName}
              </h2>
              <p className="text-xs text-slate-200 font-medium mt-0.5">
                Line Department Official Authentication Portal
              </p>
            </div>
            <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md items-center justify-center border border-white/20">
              <IconComponent className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
          {error && (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 flex items-start gap-3 text-rose-900 animate-shake">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm font-bold leading-normal">
                {error}
              </div>
            </div>
          )}

          {/* User ID Input */}
          <div className="space-y-1.5">
            <label className="block text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
              Department User ID
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder={`e.g. ${credentials?.userId || 'user_id'}`}
                autoFocus
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-300 rounded-xl text-base font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 focus:outline-none"
              >
                {showPassword ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Hide</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Show</span>
                  </>
                )}
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-11 pr-11 py-3 bg-slate-50 border-2 border-slate-300 rounded-xl text-base font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-3">
            <button
              type="submit"
              className="w-full py-3.5 px-6 rounded-xl text-base font-black text-white bg-slate-900 hover:bg-slate-800 shadow-md border border-slate-800 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
            >
              <span>Authenticate & Open {departmentName}</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors"
            >
              ← Return to Line Department Overview
            </button>
          </div>

          {/* Credentials Info from Sheet (Collapsible helper) */}
          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 focus:outline-none"
              >
                <HelpCircle className="w-4 h-4 text-slate-500" />
                <span>{showHint ? 'Hide Credentials from Google Sheet' : 'Show Credentials from Google Sheet'}</span>
              </button>
              
              <button
                type="button"
                onClick={handleAutoFill}
                className="text-xs font-bold text-blue-700 hover:text-blue-900 underline underline-offset-2"
              >
                Auto-Fill Credentials
              </button>
            </div>

            {showHint && credentials && (
              <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Configured in Google Sheet &quot;User and Password&quot; Tab:</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-700 font-sans block font-bold">User Id:</span>
                    <span className="font-black text-slate-900">{credentials.userId}</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-700 font-sans block font-bold">Password:</span>
                    <span className="font-black text-slate-900">{credentials.password}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </form>

      </div>
    </div>
  );
};
