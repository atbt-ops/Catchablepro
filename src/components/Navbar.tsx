import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { CompanyAvatar } from './CompanyAvatar';
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
  X,
  Menu,
  ArrowRightLeft,
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
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isEmployer = currentUser?.role === 'employer';
  const isAdmin = currentUser?.is_admin;
  const companyProfile = currentUser && isEmployer ? companyProfiles[currentUser.id] : null;

  const candidateAppCount = currentUser && !isEmployer
    ? applications.filter((a) => a.candidateId === currentUser.id).length
    : 0;

  // Keyboard shortcut '/' to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Quick switch role between candidate and employer
  const handleQuickRoleSwitch = () => {
    const targetRole = isEmployer ? 'candidate' : 'employer';
    const altUser = users.find((u) => u.role === targetRole && !u.is_suspended);
    if (altUser) {
      switchUser(altUser.id);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-4">
          {/* Brand Logo & Demo Switcher */}
          <div className="flex items-center gap-4 sm:gap-6">
            <button
              onClick={() => setActiveView(isEmployer ? 'employer_jobs' : 'candidate_browse')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-fuchsia-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-slate-900 leading-none">
                  Catch <span className="text-indigo-600">Able Pro</span>
                </span>
                <span className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase mt-0.5 hidden sm:block">
                  Semantic Hiring
                </span>
              </div>
            </button>

            {/* Quick Demo Switcher Pill */}
            <div className="relative hidden xl:block">
              <button
                onClick={() => setShowDemoSwitcher(!showDemoSwitcher)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors"
                title="Switch test accounts"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Demo As: {currentUser?.name || 'Visitor'}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showDemoSwitcher && (
                <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Select Persona</span>
                    <span className="text-[10px] text-indigo-600 lowercase font-normal">instant switch</span>
                  </div>
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchUser(u.id);
                        setShowDemoSwitcher(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                        currentUser?.id === u.id
                          ? 'bg-indigo-50/80 font-bold text-indigo-700'
                          : 'text-slate-700'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="font-semibold text-slate-900">{u.name || u.email}</div>
                        <div className="text-[11px] text-slate-400">
                          {u.role === 'employer' ? u.company_name || 'Employer' : u.designation || 'Candidate'}
                          {u.is_admin ? ' • Admin' : ''}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          u.role === 'employer'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
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
            <div className="hidden md:flex flex-1 max-w-lg items-center bg-slate-100/90 hover:bg-slate-100 rounded-2xl p-1.5 border border-slate-200 focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-3 focus-within:ring-indigo-100 transition-all">
              <div className="flex items-center pl-2.5 pr-2 flex-1 min-w-0">
                <Search className="w-4 h-4 text-slate-400 flex-shrink-0 mr-2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search jobs, skills (e.g. React, Python)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                />
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">
                    /
                  </kbd>
                )}
              </div>
              <div className="h-5 w-px bg-slate-200 mx-1" />
              <div className="flex items-center px-2 flex-shrink-0">
                <MapPin className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="bg-transparent text-xs text-slate-700 font-semibold focus:outline-none cursor-pointer pr-1"
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

          {/* Navigation Items (Right Side) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {currentUser ? (
              <>
                {/* Quick Role Perspective Switcher Pill */}
                <button
                  onClick={handleQuickRoleSwitch}
                  title={`Switch to ${isEmployer ? 'Candidate' : 'Employer'} perspective`}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/80 transition-colors"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Switch to {isEmployer ? 'Candidate' : 'Employer'}</span>
                </button>

                {/* Candidate Nav Links */}
                {!isEmployer && (
                  <div className="hidden lg:flex items-center gap-1 text-sm font-semibold">
                    <button
                      onClick={() => setActiveView('candidate_browse')}
                      className={`px-3 py-1.5 rounded-xl transition-all ${
                        activeView === 'candidate_browse'
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      Jobs & Match
                    </button>
                    <button
                      onClick={() => setActiveView('candidate_applications')}
                      className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
                        activeView === 'candidate_applications'
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <FileCheck className="w-4 h-4" />
                      <span>Applications</span>
                      {candidateAppCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white">
                          {candidateAppCount}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveView('candidate_saved')}
                      className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
                        activeView === 'candidate_saved'
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Bookmark className="w-4 h-4" />
                      <span>Saved</span>
                    </button>
                    <button
                      onClick={() => setActiveView('candidate_profile')}
                      className={`px-3 py-1.5 rounded-xl transition-all ${
                        activeView === 'candidate_profile'
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      Profile & Resume
                    </button>
                  </div>
                )}

                {/* Employer Nav Links */}
                {isEmployer && (
                  <div className="hidden lg:flex items-center gap-1 text-sm font-semibold">
                    <button
                      onClick={() => setActiveView('employer_jobs')}
                      className={`px-3 py-1.5 rounded-xl transition-all ${
                        activeView === 'employer_jobs'
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      Jobs & Meter
                    </button>
                    <button
                      onClick={() => setActiveView('employer_matches')}
                      className={`px-3 py-1.5 rounded-xl transition-all ${
                        activeView === 'employer_matches'
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      Ranked Matches
                    </button>
                    <button
                      onClick={() => setActiveView('employer_pipeline')}
                      className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
                        activeView === 'employer_pipeline'
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                      <span>Pipeline</span>
                    </button>
                    <button
                      onClick={() => setActiveView('employer_wallet')}
                      className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
                        activeView === 'employer_wallet'
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Wallet className="w-4 h-4 text-emerald-600" />
                      <span>Wallet</span>
                      <span className="font-bold text-emerald-800 text-xs px-2 py-0.5 bg-emerald-50 rounded-lg border border-emerald-200">
                        ₹{((companyProfile?.walletBalancePaise || 0) / 100).toLocaleString('en-IN')}
                      </span>
                    </button>
                  </div>
                )}

                {/* Admin Navlink if admin */}
                {isAdmin && (
                  <button
                    onClick={() => setActiveView('admin')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeView === 'admin'
                        ? 'bg-purple-100 text-purple-900'
                        : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Admin</span>
                  </button>
                )}

                {/* Feedback Button */}
                <button
                  onClick={onOpenFeedback}
                  title="Send feedback"
                  className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>

                {/* User Avatar & Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 transition-colors focus:outline-none"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white font-extrabold text-xs flex items-center justify-center ring-2 ring-indigo-200 shadow-sm">
                      {(currentUser.name || currentUser.email)[0].toUpperCase()}
                    </div>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-68 bg-white rounded-3xl shadow-2xl border border-slate-200 py-2.5 z-50 animate-in fade-in zoom-in-95">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {currentUser.name || currentUser.email}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {currentUser.role}
                          </span>
                          {isEmployer && companyProfile && (
                            <span className="text-[11px] font-bold text-emerald-700">
                              ₹{((companyProfile.walletBalancePaise || 0) / 100).toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="py-1">
                        <button
                          onClick={() => {
                            onOpenAccount();
                            setShowUserMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-xs font-semibold text-slate-700 flex items-center gap-2.5 hover:bg-slate-50 transition-colors"
                        >
                          <Settings className="w-4 h-4 text-slate-400" />
                          <span>Account & 2FA</span>
                        </button>

                        <button
                          onClick={() => {
                            onOpenFeedback();
                            setShowUserMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-xs font-semibold text-slate-700 flex items-center gap-2.5 hover:bg-slate-50 transition-colors"
                        >
                          <MessageSquare className="w-4 h-4 text-slate-400" />
                          <span>Send Feedback</span>
                        </button>

                        <button
                          onClick={() => {
                            handleQuickRoleSwitch();
                            setShowUserMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-xs font-semibold text-indigo-600 flex items-center gap-2.5 hover:bg-indigo-50 transition-colors"
                        >
                          <ArrowRightLeft className="w-4 h-4 text-indigo-500" />
                          <span>Switch to {isEmployer ? 'Candidate' : 'Employer'}</span>
                        </button>
                      </div>

                      <div className="border-t border-slate-100 pt-1">
                        <button
                          onClick={() => {
                            logout();
                            setShowUserMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-xs font-semibold text-rose-600 flex items-center gap-2.5 hover:bg-rose-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4 text-rose-500" />
                          <span>Sign out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mobile Hamburger Button */}
                <button
                  onClick={() => setShowMobileDrawer(!showMobileDrawer)}
                  className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  {showMobileDrawer ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </>
            ) : (
              /* Anonymous visitor options */
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenAuth('candidate')}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Log in
                </button>
                <button
                  onClick={() => onOpenAuth('candidate')}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all"
                >
                  Sign up
                </button>
                <button
                  onClick={() => onOpenAuth('employer')}
                  className="hidden sm:inline-flex px-3.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors border border-indigo-200"
                >
                  For Employers
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Slide-down Drawer */}
        {showMobileDrawer && (
          <div className="lg:hidden py-4 border-t border-slate-100 animate-in slide-in-from-top-3 duration-200 space-y-3">
            {/* Mobile Search input */}
            {!isEmployer && (
              <div className="flex items-center bg-slate-100 rounded-xl p-2 border border-slate-200">
                <Search className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search jobs, skills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs font-bold pt-1">
              <button
                onClick={() => {
                  handleQuickRoleSwitch();
                  setShowMobileDrawer(false);
                }}
                className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center gap-1.5 border border-indigo-100"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Switch to {isEmployer ? 'Candidate' : 'Employer'}</span>
              </button>

              <button
                onClick={() => {
                  onOpenAccount();
                  setShowMobileDrawer(false);
                }}
                className="p-2.5 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5 text-slate-500" />
                <span>Settings</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
