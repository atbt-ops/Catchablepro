import React, { useState, useEffect } from 'react';
import * as stylex from '@stylexjs/stylex';
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
import { colors, spacing, radii, shadows } from './theme/tokens.stylex';

const styles = stylex.create({
  root: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: colors.background,
    color: colors.text,
    paddingBottom: {
      default: '64px',
      '@media (min-width: 1024px)': '0',
    },
  },
  main: {
    flex: 1,
  },
  bottomNav: {
    display: {
      default: 'flex',
      '@media (min-width: 1024px)': 'none',
    },
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(8px)',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: colors.border,
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: '12px',
    paddingRight: '12px',
    alignItems: 'center',
    justifyContent: 'space-around',
    fontSize: '10px',
    fontWeight: 600,
    color: colors.textSecondary,
    boxShadow: shadows.lg,
  },
  bottomNavBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: 'transparent',
    borderWidth: 0,
    cursor: 'pointer',
    padding: 0,
    position: 'relative',
    transition: 'color 0.15s ease',
  },
  bottomNavBtnActive: {
    color: colors.primary,
    fontWeight: 700,
  },
  bottomNavBtnInactive: {
    color: colors.textMuted,
  },
  bottomBadge: {
    position: 'absolute',
    top: '-4px',
    right: '-6px',
    width: '14px',
    height: '14px',
    backgroundColor: colors.primary,
    color: colors.textInverse,
    borderRadius: radii.full,
    fontSize: '9px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
  },
  footer: {
    backgroundColor: colors.surface,
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: colors.border,
    marginTop: spacing.xxl,
    paddingTop: '40px',
    paddingBottom: '40px',
    fontSize: '0.75rem',
    color: colors.textSecondary,
  },
  footerContainer: {
    maxWidth: '1280px',
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  footerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
  },
  footerLogo: {
    width: '32px',
    height: '32px',
    borderRadius: radii.md,
    backgroundColor: '#4f46e5',
    backgroundImage: 'linear-gradient(135deg, #4f46e5, #c026d3)',
    color: colors.textInverse,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.25)',
  },
  footerLinks: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.lg,
    fontWeight: 600,
    color: colors.textSecondary,
  },
  footerLinkBtn: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    cursor: 'pointer',
    color: {
      default: colors.textSecondary,
      ':hover': colors.primary,
    },
    fontSize: '0.75rem',
    fontWeight: 600,
    transition: 'color 0.15s ease',
  },
  footerCopyright: {
    fontSize: '11px',
    color: colors.textMuted,
  },
});

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
    <div {...stylex.props(styles.root)}>
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
      <main {...stylex.props(styles.main)}>
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
      <nav {...stylex.props(styles.bottomNav)}>
        {isEmployer ? (
          <>
            <button
              onClick={() => setActiveView('employer_jobs')}
              {...stylex.props(
                styles.bottomNavBtn,
                activeView === 'employer_jobs' ? styles.bottomNavBtnActive : styles.bottomNavBtnInactive
              )}
            >
              <Briefcase size={16} />
              <span>Jobs &amp; Meter</span>
            </button>
            <button
              onClick={() => setActiveView('employer_matches')}
              {...stylex.props(
                styles.bottomNavBtn,
                activeView === 'employer_matches' ? styles.bottomNavBtnActive : styles.bottomNavBtnInactive
              )}
            >
              <Sparkles size={16} />
              <span>Matches</span>
            </button>
            <button
              onClick={() => setActiveView('employer_pipeline')}
              {...stylex.props(
                styles.bottomNavBtn,
                activeView === 'employer_pipeline' ? styles.bottomNavBtnActive : styles.bottomNavBtnInactive
              )}
            >
              <Layers size={16} />
              <span>Pipeline</span>
            </button>
            <button
              onClick={() => setActiveView('employer_wallet')}
              {...stylex.props(
                styles.bottomNavBtn,
                activeView === 'employer_wallet' ? styles.bottomNavBtnActive : styles.bottomNavBtnInactive
              )}
            >
              <Wallet size={16} color="#10b981" />
              <span>Wallet</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveView('candidate_browse')}
              {...stylex.props(
                styles.bottomNavBtn,
                activeView === 'candidate_browse' ? styles.bottomNavBtnActive : styles.bottomNavBtnInactive
              )}
            >
              <Search size={16} />
              <span>Browse</span>
            </button>
            <button
              onClick={() => setActiveView('candidate_applications')}
              {...stylex.props(
                styles.bottomNavBtn,
                activeView === 'candidate_applications' ? styles.bottomNavBtnActive : styles.bottomNavBtnInactive
              )}
            >
              <FileCheck size={16} />
              <span>Applied</span>
              {candidateAppCount > 0 && (
                <span {...stylex.props(styles.bottomBadge)}>
                  {candidateAppCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveView('candidate_saved')}
              {...stylex.props(
                styles.bottomNavBtn,
                activeView === 'candidate_saved' ? styles.bottomNavBtnActive : styles.bottomNavBtnInactive
              )}
            >
              <Bookmark size={16} />
              <span>Saved</span>
            </button>
            <button
              onClick={() => setActiveView('candidate_profile')}
              {...stylex.props(
                styles.bottomNavBtn,
                activeView === 'candidate_profile' ? styles.bottomNavBtnActive : styles.bottomNavBtnInactive
              )}
            >
              <UserIcon size={16} />
              <span>Profile</span>
            </button>
          </>
        )}
      </nav>

      {/* Footer */}
      <footer {...stylex.props(styles.footer)}>
        <div {...stylex.props(styles.footerContainer)}>
          <div {...stylex.props(styles.footerLeft)}>
            <div {...stylex.props(styles.footerLogo)}>
              <Target size={16} />
            </div>
            <div>
              <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>Catch Able Pro</span>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>
                Skill-first matching &amp; on-demand recruitment platform.
              </p>
            </div>
          </div>

          <div {...stylex.props(styles.footerLinks)}>
            <button
              onClick={() => setActiveView(currentUser?.role === 'employer' ? 'employer_jobs' : 'candidate_browse')}
              {...stylex.props(styles.footerLinkBtn)}
            >
              Browse Roles
            </button>
            <button
              onClick={() => setShowFeedbackModal(true)}
              {...stylex.props(styles.footerLinkBtn)}
            >
              Feedback &amp; Bug Report
            </button>
            <button
              onClick={() => setShowAccountModal(true)}
              {...stylex.props(styles.footerLinkBtn)}
            >
              Security &amp; 2FA
            </button>
          </div>

          <div {...stylex.props(styles.footerCopyright)}>
            <span>Built with React 19 &amp; Meta StyleX • Week 1 Free on-demand meter policy</span>
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
