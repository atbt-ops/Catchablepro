import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Mail, CheckCircle, AlertTriangle } from 'lucide-react';

export const EmailVerifyBanner: React.FC = () => {
  const { currentUser, verifyEmail } = useApp();
  const [sentNotice, setSentNotice] = useState(false);

  if (!currentUser || currentUser.email_verified) {
    return null;
  }

  const handleSimulateVerify = () => {
    verifyEmail(currentUser.id);
  };

  const handleResend = () => {
    setSentNotice(true);
    setTimeout(() => setSentNotice(false), 4000);
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Confirm your email address:</strong> We sent a verification link to{' '}
            <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">{currentUser.email}</code>.
            {currentUser.role === 'employer'
              ? ' Publishing active jobs and contacting candidates remain locked until confirmed.'
              : ' Auto-Apply and job applications remain locked until confirmed.'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {sentNotice && (
            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Link resent!
            </span>
          )}
          <button
            onClick={handleResend}
            className="px-2.5 py-1 text-xs font-medium text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 rounded-md transition-colors"
          >
            Resend Email
          </button>
          <button
            onClick={handleSimulateVerify}
            className="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm transition-colors flex items-center gap-1"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Verify Now (1-Click)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
