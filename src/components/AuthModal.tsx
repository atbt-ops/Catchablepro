import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Role } from '../types';
import { X, Sparkles, Building2, User, ArrowRight, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  initialRole?: Role;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ initialRole = 'candidate', onClose }) => {
  const { login, register, switchUser, users } = useApp();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<Role>(initialRole);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    if (mode === 'login') {
      const ok = login(email, role);
      if (ok) onClose();
    } else {
      register({
        email,
        name: name || email.split('@')[0],
        role,
        company_name: companyName,
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {mode === 'login' ? 'Sign In to Catchablepro' : 'Create an Account'}
            </h2>
            <p className="text-xs text-slate-500">
              India's skill-based tech employment exchange.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch between Login and Register */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-1.5 rounded-lg transition-colors ${
              mode === 'login' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
            }`}
          >
            Log In
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-1.5 rounded-lg transition-colors ${
              mode === 'register' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Role toggle if registering */}
        {mode === 'register' && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRole('candidate')}
              className={`p-3 rounded-2xl border text-left transition-all ${
                role === 'candidate'
                  ? 'bg-indigo-50/80 border-indigo-400 text-indigo-900 ring-2 ring-indigo-500/20'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <User className="w-4 h-4 mb-1 text-indigo-600" />
              <div className="font-bold text-xs">Job Seeker</div>
              <div className="text-[10px] text-slate-400">Match & Auto-Apply</div>
            </button>

            <button
              type="button"
              onClick={() => setRole('employer')}
              className={`p-3 rounded-2xl border text-left transition-all ${
                role === 'employer'
                  ? 'bg-indigo-50/80 border-indigo-400 text-indigo-900 ring-2 ring-indigo-500/20'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Building2 className="w-4 h-4 mb-1 text-indigo-600" />
              <div className="font-bold text-xs">Employer</div>
              <div className="text-[10px] text-slate-400">Post & Rank Candidates</div>
            </button>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Your Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          )}

          {mode === 'register' && role === 'employer' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Tech Solutions"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. name@example.com"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all"
          >
            {mode === 'login' ? 'Continue' : 'Create Account'}
          </button>
        </form>

        {/* Quick Demo Logins Section */}
        <div className="pt-3 border-t border-slate-100">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Instant Demo Logins</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {users.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  switchUser(u.id);
                  onClose();
                }}
                className="p-2 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-indigo-50 hover:border-indigo-200 text-left transition-colors"
              >
                <div className="font-bold text-slate-800 truncate">{u.name || u.email}</div>
                <div className="text-[10px] text-slate-500 capitalize">
                  {u.role === 'employer' ? u.company_name || 'Employer' : 'Candidate'}
                  {u.is_admin ? ' (Admin)' : ''}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
