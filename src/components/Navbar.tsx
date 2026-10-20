import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Target,
  Search,
  MapPin,
  Briefcase,
  User as UserIcon,
  Settings,
  LogOut,
  Shield,
  MessageSquare,
  Wallet,
  Sparkles,
  ChevronDown,
  Layers,
  FileCheck,
  Bookmark,
} from 'lucide-react';

interface NavbarProps {
  onOpenAccount: () => void;
  onOpenFeedback: () => void;
  onOpenAuth: (role?: 'candidate' | 'employer') => void;
  activeView: string;
  setActiveView: (view: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  locationFilter: string;
  setLocationFilter: (l: string) => void;
}

const INDIAN_LOCATIONS = [
  'All India',
  'Remote',
  'Bengaluru',
  'Hyderabad',
  'Pune',
  'Mumbai',
  'Delhi NCR',
  'Chennai',
  'Gurugram',
  'Noida',
];

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAccount,
  onOpenFeedback,
  onOpenAuth,
  activeView,
  setActiveView,
  searchQuery,
  setSearchQuery,
  locationFilter,
  setLocationFilter,
}) => {
  const {
    currentUser,
    users,
    switchUser,
    logout,
    companyProfiles,
    applications,
  } = useApp();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDemoSwitcher, setShowDemoSwitcher] = useState(false);

  const isEmployer = currentUser?.role === 'employer';
  const isAdmin = currentUser?.is_admin;
  const companyProfile = currentUser && isEmployer ? companyProfiles[currentUser.id] : null;

  const candidateAppCount = currentUser && !isEmployer
    ? applications.filter((a) => a.candidateId === currentUser.id).length
    : 0;

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveView(isEmployer ? 'employer_jobs' : 'candidate_browse')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-fuchsia-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Target className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Catch <span className="text-indigo-600">Able Pro</span>
              </span>
            </button>

            {/* Quick Demo Switcher Pill */}
            <div className="relative hidden xl:block">
              <button
                onClick={() => setShowDemoSwitcher(!showDemoSwitcher)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                title="Switch test accounts"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Demo As: {currentUser?.name || 'Visitor'}</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {showDemoSwitcher && (
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Switch Test Account
                  </div>
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchUser(u.id);
                        setShowDemoSwitcher(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 ${
                        currentUser?.id === u.id ? 'bg-indigo-50/70 font-semibold text-indigo-600' : 'text-slate-700'
                      }`}
                    >
                      <div className="truncate">
                        <div>{u.name || u.email}</div>
                        <div className="text-[10px] text-slate-400">
                          {u.role === 'employer' ? u.company_name || 'Employer' : 'Candidate'}
                          {u.is_admin ? ' • Admin' : ''}
                        </div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-medium bg-slate-100 text-slate-600">
                        {u.role}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Job Search Bar (Candidate view) */}
          {!isEmployer && (
            <div className="hidden md:flex flex-1 max-w-lg items-center bg-slate-100/90 rounded-full p-1 border border-slate-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
              <div className="flex items-center pl-3 pr-2 flex-1 min-w-0">
                <Search className="w-4 h-4 text-slate-400 flex-shrink-0 mr-2" />
                <input
                  type="text"
                  placeholder="Search jobs, skills (e.g. Python, React)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                />
              </div>
              <div className="h-5 w-px bg-slate-300 mx-1" />
              <div className="flex items-center px-2 flex-shrink-0">
                <MapPin className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer pr-1"
                >
                  {INDIAN_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc === 'All India' ? '' : loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Navigation Items */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <>
                {/* Candidate Nav */}
                {!isEmployer && (
                  <div className="hidden lg:flex items-center gap-1 text-sm font-medium">
                    <button
                      onClick={() => setActiveView('candidate_browse')}
                      className={`px-3 py-1.5 rounded-lg transition-colors ${
                        activeView === 'candidate_browse'
                          ? 'bg-indigo-50 text-indigo-700 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      Jobs & Match
                    </button>
                    <button
                      onClick={() => setActiveView('candidate_applications')}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                        activeView === 'candidate_applications'
                          ? 'bg-indigo-50 text-indigo-700 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <FileCheck className="w-4 h-4" />
                      <span>Applications</span>
                      {candidateAppCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-indigo-600 text-white">
                          {candidateAppCount}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveView('candidate_saved')}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                        activeView === 'candidate_saved'
                          ? 'bg-indigo-50 text-indigo-700 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Bookmark className="w-4 h-4" />
                      <span>Saved</span>
                    </button>
                    <button
                      onClick={() => setActiveView('candidate_profile')}
                      className={`px-3 py-1.5 rounded-lg transition-colors ${
                        activeView === 'candidate_profile'
                          ? 'bg-indigo-50 text-indigo-700 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      Profile & Resume
                    </button>
                  </div>
                )}

                {/* Employer Nav */}
                {isEmployer && (
                  <div className="hidden lg:flex items-center gap-1 text-sm font-medium">
                    <button
                      onClick={() => setActiveView('employer_jobs')}
                      className={`px-3 py-1.5 rounded-lg transition-colors ${
                        activeView === 'employer_jobs'
                          ? 'bg-indigo-50 text-indigo-700 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      Jobs & Meter
                    </button>
                    <button
                      onClick={() => setActiveView('employer_matches')}
                      className={`px-3 py-1.5 rounded-lg transition-colors ${
                        activeView === 'employer_matches'
                          ? 'bg-indigo-50 text-indigo-700 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      Ranked Matches
                    </button>
                    <button
                      onClick={() => setActiveView('employer_pipeline')}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                        activeView === 'employer_pipeline'
                          ? 'bg-indigo-50 text-indigo-700 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                      <span>Pipeline</span>
                    </button>
                    <button
                      onClick={() => setActiveView('employer_wallet')}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                        activeView === 'employer_wallet'
                          ? 'bg-indigo-50 text-indigo-700 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Wallet className="w-4 h-4 text-emerald-600" />
                      <span>Wallet</span>
                      <span className="font-semibold text-emerald-700 text-xs px-1.5 py-0.5 bg-emerald-50 rounded border border-emerald-200">
                        ₹{((companyProfile?.walletBalancePaise || 0) / 100).toLocaleString('en-IN')}
                      </span>
                    </button>
                  </div>
                )}

                {/* Admin Navlink if admin */}
                {isAdmin && (
                  <button
                    onClick={() => setActiveView('admin')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                      activeView === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>Admin</span>
                  </button>
                )}

                {/* Feedback Button */}
                <button
                  onClick={onOpenFeedback}
                  title="Send feedback"
                  className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>

                {/* User Avatar & Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-100 transition-colors focus:outline-none"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white font-bold text-xs flex items-center justify-center ring-2 ring-indigo-200">
                      {(currentUser.name || currentUser.email)[0].toUpperCase()}
                    </div>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {currentUser.name || currentUser.email}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                          {currentUser.role}
                        </span>
                      </div>

                      <div className="py-1">
                        <button
                          onClick={() => {
                            onOpenAccount();
                            setShowUserMenu(false);
                          }}
                          className="w-full px-4 py-2 text-sm text-slate-700 flex items-center gap-2.5 hover:bg-slate-50 transition-colors"
                        >
                          <Settings className="w-4 h-4 text-slate-400" />
                          <span>Account & 2FA</span>
                        </button>

                        <button
                          onClick={() => {
                            onOpenFeedback();
                            setShowUserMenu(false);
                          }}
                          className="w-full px-4 py-2 text-sm text-slate-700 flex items-center gap-2.5 hover:bg-slate-50 transition-colors"
                        >
                          <MessageSquare className="w-4 h-4 text-slate-400" />
                          <span>Leave Feedback</span>
                        </button>
                      </div>

                      <div className="border-t border-slate-100 pt-1">
                        <button
                          onClick={() => {
                            logout();
                            setShowUserMenu(false);
                          }}
                          className="w-full px-4 py-2 text-sm text-rose-600 flex items-center gap-2.5 hover:bg-rose-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4 text-rose-500" />
                          <span>Sign out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Anonymous visitor options */
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenAuth('candidate')}
                  className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Log in
                </button>
                <button
                  onClick={() => onOpenAuth('candidate')}
                  className="px-4 py-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all"
                >
                  Sign up
                </button>
                <div className="h-4 w-px bg-slate-300 mx-1" />
                <button
                  onClick={() => onOpenAuth('employer')}
                  className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
                >
                  For Employers
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
