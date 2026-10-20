import React, { useState, useEffect } from 'react';
import { useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { EmailVerifyBanner } from './components/EmailVerifyBanner';
import { CandidateView } from './components/CandidateView';
import { EmployerDashboard } from './components/EmployerDashboard';
import { AdminPortal } from './components/AdminPortal';
import { AccountModal } from './components/AccountModal';
import { FeedbackModal } from './components/FeedbackModal';
import { AuthModal } from './components/AuthModal';
import { ToastContainer } from './components/ToastContainer';
import {
  Target,
  FileCheck,
  Bookmark,
  User as UserIcon,
  Search,
  Briefcase,
  Sparkles,
  Layers,
  Wallet,
} from 'lucide-react';

export function App() {
  const { currentUser, toasts, dismissToast, applications } = useApp();

  const [activeView, setActiveView] = useState<string>('candidate_browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  // Modals
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalRole, setAuthModalRole] = useState<'candidate' | 'employer'>('candidate');

  const isEmployer = currentUser?.role === 'employer';
  const candidateAppCount = currentUser && !isEmployer
    ? applications.filter((a) => a.candidateId === currentUser.id).length
    : 0;

  // Sync default view when user switches role
  useEffect(() => {
    if (currentUser?.role === 'employer') {
      if (activeView.startsWith('candidate_')) {
        setActiveView('employer_jobs');
      }
    } else {
      if (activeView.startsWith('employer_')) {
        setActiveView('candidate_browse');
      }
    }
  }, [currentUser]);

  const handleOpenAuth = (role: 'candidate' | 'employer' = 'candidate') => {
    setAuthModalRole(role);
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white pb-16 lg:pb-0">
      {/* Top Navigation */}
      <Navbar
        onOpenAccount={() => setShowAccountModal(true)}
        onOpenFeedback={() => setShowFeedbackModal(true)}
        onOpenAuth={handleOpenAuth}
        activeView={activeView}
        setActiveView={setActiveView}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        locationFilter={locationFilter}
        setLocationFilter={setLocationFilter}
      />

      {/* Email Verification Banner */}
      <EmailVerifyBanner />

      {/* Main App Content View */}
      <main className="flex-1">
        {activeView === 'admin' && currentUser?.is_admin ? (
          <AdminPortal />
        ) : currentUser?.role === 'employer' ? (
          <EmployerDashboard
            activeTab={
              activeView === 'employer_matches'
                ? 'matches'
                : activeView === 'employer_pipeline'
                ? 'pipeline'
                : activeView === 'employer_wallet'
                ? 'wallet'
                : activeView === 'employer_profile'
                ? 'profile'
                : 'jobs'
            }
            setActiveTab={(tab) => setActiveView(`employer_${tab}`)}
          />
        ) : (
          <CandidateView
            activeTab={
              activeView === 'candidate_applications'
                ? 'applications'
                : activeView === 'candidate_saved'
                ? 'saved'
                : activeView === 'candidate_profile'
                ? 'profile'
                : 'browse'
            }
            setActiveTab={(tab) => setActiveView(`candidate_${tab}`)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            locationFilter={locationFilter}
            setLocationFilter={setLocationFilter}
          />
        )}
      </main>

      {/* Mobile Bottom Quick Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 flex items-center justify-around text-[10px] font-semibold text-slate-500 shadow-lg">
        {isEmployer ? (
          <>
            <button
              onClick={() => setActiveView('employer_jobs')}
              className={`flex flex-col items-center gap-1 ${
                activeView === 'employer_jobs' ? 'text-indigo-600 font-bold' : 'hover:text-slate-800'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Jobs & Meter</span>
            </button>
            <button
              onClick={() => setActiveView('employer_matches')}
              className={`flex flex-col items-center gap-1 ${
                activeView === 'employer_matches' ? 'text-indigo-600 font-bold' : 'hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Matches</span>
            </button>
            <button
              onClick={() => setActiveView('employer_pipeline')}
              className={`flex flex-col items-center gap-1 ${
                activeView === 'employer_pipeline' ? 'text-indigo-600 font-bold' : 'hover:text-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Pipeline</span>
            </button>
            <button
              onClick={() => setActiveView('employer_wallet')}
              className={`flex flex-col items-center gap-1 ${
                activeView === 'employer_wallet' ? 'text-indigo-600 font-bold' : 'hover:text-slate-800'
              }`}
            >
              <Wallet className="w-4 h-4 text-emerald-600" />
              <span>Wallet</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveView('candidate_browse')}
              className={`flex flex-col items-center gap-1 ${
                activeView === 'candidate_browse' ? 'text-indigo-600 font-bold' : 'hover:text-slate-800'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Browse</span>
            </button>
            <button
              onClick={() => setActiveView('candidate_applications')}
              className={`flex flex-col items-center gap-1 relative ${
                activeView === 'candidate_applications' ? 'text-indigo-600 font-bold' : 'hover:text-slate-800'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>Applied</span>
              {candidateAppCount > 0 && (
                <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-indigo-600 text-white rounded-full text-[9px] flex items-center justify-center font-bold">
                  {candidateAppCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveView('candidate_saved')}
              className={`flex flex-col items-center gap-1 ${
                activeView === 'candidate_saved' ? 'text-indigo-600 font-bold' : 'hover:text-slate-800'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              <span>Saved</span>
            </button>
            <button
              onClick={() => setActiveView('candidate_profile')}
              className={`flex flex-col items-center gap-1 ${
                activeView === 'candidate_profile' ? 'text-indigo-600 font-bold' : 'hover:text-slate-800'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              <span>Profile</span>
            </button>
          </>
        )}
      </nav>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-16 py-10 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-fuchsia-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm">Catch Able Pro</span>
              <p className="text-[11px] text-slate-400">
                Skill-first matching & on-demand recruitment platform.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-medium text-slate-600">
            <button
              onClick={() => setActiveView(currentUser?.role === 'employer' ? 'employer_jobs' : 'candidate_browse')}
              className="hover:text-indigo-600 transition-colors"
            >
              Browse Roles
            </button>
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="hover:text-indigo-600 transition-colors"
            >
              Feedback & Bug Report
            </button>
            <button
              onClick={() => setShowAccountModal(true)}
              className="hover:text-indigo-600 transition-colors"
            >
              Security & 2FA
            </button>
          </div>

          <div className="text-[11px] text-slate-400 text-center md:text-right">
            <span>Built with React 19 & Tailwind CSS • Week 1 Free on-demand meter policy</span>
          </div>
        </div>
      </footer>

      {/* Global Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Modals */}
      {showAccountModal && <AccountModal onClose={() => setShowAccountModal(false)} />}
      {showFeedbackModal && <FeedbackModal onClose={() => setShowFeedbackModal(false)} />}
      {showAuthModal && (
        <AuthModal
          initialRole={authModalRole}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}

