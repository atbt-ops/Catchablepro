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
import { Target, Heart, Shield, Sparkles, MapPin, Briefcase } from 'lucide-react';

export function App() {
  const { currentUser } = useApp();

  const [activeView, setActiveView] = useState<string>('candidate_browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  // Modals
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalRole, setAuthModalRole] = useState<'candidate' | 'employer'>('candidate');

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
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white">
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

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-16 py-10 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm">Catch Able Pro</span>
              <p className="text-[11px] text-slate-400">
                Semantic skill matching & on-demand recruitment platform for India.
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
            <span>Built with React 19 & Tailwind CSS. Week 1 Free on-demand meter policy.</span>
          </div>
        </div>
      </footer>

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
