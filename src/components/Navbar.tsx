import React, { useState, useEffect, useRef } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useApp } from '../context/AppContext';
import {
  Target,
  Search,
  MapPin,
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
import { colors, spacing, radii, shadows } from '../theme/tokens.stylex';

const styles = stylex.create({
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(8px)',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: colors.border,
    boxShadow: shadows.sm,
  },
  container: {
    maxWidth: '1280px',
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '64px',
    gap: spacing.md,
  },
  leftGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
  },
  logoBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: 'transparent',
    borderWidth: 0,
    cursor: 'pointer',
    padding: 0,
    textAlign: 'left',
  },
  logoIcon: {
    width: '36px',
    height: '36px',
    borderRadius: radii.md,
    backgroundColor: '#4f46e5',
    backgroundImage: 'linear-gradient(135deg, #4f46e5, #c026d3)',
    color: colors.textInverse,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.25)',
    flexShrink: 0,
  },
  logoTextCol: {
    display: 'flex',
    flexDirection: 'column',
  },
  logoText: {
    fontSize: '1.25rem',
    fontWeight: 900,
    letterSpacing: '-0.025em',
    color: colors.text,
    lineHeight: 1,
    margin: 0,
  },
  logoHighlight: {
    color: colors.primary,
  },
  logoSub: {
    fontSize: '0.625rem',
    color: colors.textMuted,
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    marginTop: '2px',
    margin: 0,
  },
  demoSwitcherWrap: {
    position: 'relative',
    display: {
      default: 'none',
      '@media (min-width: 1280px)': 'block',
    },
  },
  demoPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    paddingTop: '6px',
    paddingBottom: '6px',
    paddingLeft: '12px',
    paddingRight: '12px',
    fontSize: '0.75rem',
    fontWeight: 600,
    borderRadius: radii.full,
    backgroundColor: {
      default: colors.surfaceSubtle,
      ':hover': colors.border,
    },
    color: colors.textSecondary,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  demoDropdown: {
    position: 'absolute',
    left: 0,
    marginTop: '8px',
    width: '280px',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    boxShadow: shadows.xl,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    paddingTop: '8px',
    paddingBottom: '8px',
    zIndex: 50,
  },
  demoHeader: {
    paddingTop: '6px',
    paddingBottom: '6px',
    paddingLeft: '14px',
    paddingRight: '14px',
    fontSize: '0.6875rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: colors.textMuted,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  demoItem: {
    width: '100%',
    textAlign: 'left',
    paddingTop: '10px',
    paddingBottom: '10px',
    paddingLeft: '14px',
    paddingRight: '14px',
    fontSize: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: {
      default: 'transparent',
      ':hover': colors.surfaceSubtle,
    },
    borderWidth: 0,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  demoItemActive: {
    backgroundColor: colors.primaryLight,
    fontWeight: 700,
  },
  demoRoleBadgeEmployer: {
    fontSize: '0.625rem',
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '8px',
    paddingRight: '8px',
    borderRadius: radii.full,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    backgroundColor: colors.primaryLight,
    color: colors.primaryHover,
  },
  demoRoleBadgeCandidate: {
    fontSize: '0.625rem',
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '8px',
    paddingRight: '8px',
    borderRadius: radii.full,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    backgroundColor: colors.successLight,
    color: colors.successText,
  },
  searchBar: {
    display: {
      default: 'none',
      '@media (min-width: 768px)': 'flex',
    },
    flex: 1,
    maxWidth: '480px',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.lg,
    padding: '6px 10px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    transition: 'all 0.15s ease',
  },
  searchInputWrap: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    paddingRight: '8px',
  },
  searchInput: {
    width: '100%',
    backgroundColor: 'transparent',
    fontSize: '0.8125rem',
    color: colors.text,
    outline: 'none',
    borderWidth: 0,
    fontFamily: 'inherit',
  },
  searchDivider: {
    width: '1px',
    height: '20px',
    backgroundColor: colors.border,
    marginLeft: '4px',
    marginRight: '4px',
  },
  locationSelect: {
    backgroundColor: 'transparent',
    fontSize: '0.75rem',
    color: colors.textSecondary,
    fontWeight: 600,
    outline: 'none',
    borderWidth: 0,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  rightNav: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  roleSwitchBtn: {
    display: {
      default: 'none',
      '@media (min-width: 768px)': 'flex',
    },
    alignItems: 'center',
    gap: '6px',
    paddingTop: '6px',
    paddingBottom: '6px',
    paddingLeft: '12px',
    paddingRight: '12px',
    borderRadius: radii.md,
    fontSize: '0.75rem',
    fontWeight: 700,
    backgroundColor: {
      default: colors.primaryLight,
      ':hover': '#e0e7ff',
    },
    color: colors.primaryHover,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.primaryBorder,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  navGroup: {
    display: {
      default: 'none',
      '@media (min-width: 1024px)': 'flex',
    },
    alignItems: 'center',
    gap: '6px',
  },
  navLink: {
    paddingTop: '6px',
    paddingBottom: '6px',
    paddingLeft: '12px',
    paddingRight: '12px',
    borderRadius: radii.md,
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
    borderWidth: 0,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
    backgroundColor: 'transparent',
    color: colors.textSecondary,
  },
  navLinkActive: {
    backgroundColor: colors.primaryLight,
    color: colors.primaryHover,
  },
  navBadge: {
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '6px',
    paddingRight: '6px',
    borderRadius: radii.full,
    fontSize: '0.625rem',
    fontWeight: 900,
    backgroundColor: colors.primary,
    color: colors.textInverse,
  },
  walletBadge: {
    fontWeight: 700,
    color: colors.successText,
    fontSize: '0.75rem',
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '8px',
    paddingRight: '8px',
    backgroundColor: colors.successLight,
    borderRadius: radii.sm,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.successBorder,
  },
  adminBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    paddingTop: '6px',
    paddingBottom: '6px',
    paddingLeft: '12px',
    paddingRight: '12px',
    borderRadius: radii.md,
    fontSize: '0.75rem',
    fontWeight: 700,
    cursor: 'pointer',
    borderWidth: 0,
    backgroundColor: colors.purpleLight,
    color: colors.purpleText,
  },
  iconBtn: {
    padding: '8px',
    color: colors.textSecondary,
    borderRadius: radii.md,
    backgroundColor: {
      default: 'transparent',
      ':hover': colors.surfaceSubtle,
    },
    borderWidth: 0,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBtn: {
    padding: '4px',
    borderRadius: radii.full,
    backgroundColor: 'transparent',
    borderWidth: 0,
    cursor: 'pointer',
  },
  avatarCircle: {
    width: '36px',
    height: '36px',
    borderRadius: radii.full,
    backgroundColor: '#4f46e5',
    backgroundImage: 'linear-gradient(135deg, #4f46e5, #3730a3)',
    color: colors.textInverse,
    fontWeight: 800,
    fontSize: '0.8125rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: shadows.sm,
  },
  userDropdown: {
    position: 'absolute',
    right: 0,
    marginTop: '8px',
    width: '260px',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    boxShadow: shadows.xl,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    paddingTop: '10px',
    paddingBottom: '10px',
    zIndex: 50,
  },
  userProfileHeader: {
    paddingTop: '12px',
    paddingBottom: '12px',
    paddingLeft: '16px',
    paddingRight: '16px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: colors.border,
  },
  userName: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: colors.text,
    margin: 0,
  },
  userEmail: {
    fontSize: '0.75rem',
    color: colors.textSecondary,
    margin: 0,
    marginTop: '2px',
  },
  menuItem: {
    width: '100%',
    paddingTop: '10px',
    paddingBottom: '10px',
    paddingLeft: '16px',
    paddingRight: '16px',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: colors.textSecondary,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: {
      default: 'transparent',
      ':hover': colors.surfaceSubtle,
    },
    borderWidth: 0,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 0.15s ease',
  },
  menuItemDanger: {
    color: colors.danger,
    backgroundColor: {
      default: 'transparent',
      ':hover': colors.dangerLight,
    },
  },
  mobileToggleBtn: {
    display: {
      default: 'flex',
      '@media (min-width: 1024px)': 'none',
    },
    padding: '8px',
    borderRadius: radii.md,
    color: colors.textSecondary,
    backgroundColor: 'transparent',
    borderWidth: 0,
    cursor: 'pointer',
  },
  mobileDrawer: {
    paddingTop: '16px',
    paddingBottom: '16px',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: colors.border,
    display: {
      default: 'flex',
      '@media (min-width: 1024px)': 'none',
    },
    flexDirection: 'column',
    gap: '12px',
  },
  mobileGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing.sm,
  },
  mobileBtn: {
    padding: '10px',
    borderRadius: radii.md,
    fontSize: '0.75rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    cursor: 'pointer',
    borderWidth: '1px',
    borderStyle: 'solid',
  },
  mobileBtnPrimary: {
    backgroundColor: colors.primaryLight,
    color: colors.primaryHover,
    borderColor: colors.primaryBorder,
  },
  mobileBtnSubtle: {
    backgroundColor: colors.surfaceSubtle,
    color: colors.textSecondary,
    borderColor: colors.border,
  },
  visitorBtnLog: {
    paddingTop: '6px',
    paddingBottom: '6px',
    paddingLeft: '14px',
    paddingRight: '14px',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: colors.textSecondary,
    backgroundColor: {
      default: 'transparent',
      ':hover': colors.surfaceSubtle,
    },
    borderRadius: radii.md,
    borderWidth: 0,
    cursor: 'pointer',
  },
  visitorBtnSign: {
    paddingTop: '6px',
    paddingBottom: '6px',
    paddingLeft: '16px',
    paddingRight: '16px',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: colors.textInverse,
    backgroundColor: {
      default: colors.primary,
      ':hover': colors.primaryHover,
    },
    borderRadius: radii.md,
    borderWidth: 0,
    cursor: 'pointer',
    boxShadow: shadows.sm,
  },
  visitorBtnEmp: {
    paddingTop: '6px',
    paddingBottom: '6px',
    paddingLeft: '14px',
    paddingRight: '14px',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: colors.primaryHover,
    backgroundColor: colors.primaryLight,
    borderRadius: radii.md,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.primaryBorder,
    cursor: 'pointer',
  },
});

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
    <header {...stylex.props(styles.header)}>
      <div {...stylex.props(styles.container)}>
        <div {...stylex.props(styles.row)}>
          {/* Brand Logo & Demo Switcher */}
          <div {...stylex.props(styles.leftGroup)}>
            <button
              onClick={() => setActiveView(isEmployer ? 'employer_jobs' : 'candidate_browse')}
              {...stylex.props(styles.logoBtn)}
            >
              <div {...stylex.props(styles.logoIcon)}>
                <Target size={20} />
              </div>
              <div {...stylex.props(styles.logoTextCol)}>
                <span {...stylex.props(styles.logoText)}>
                  Catch <span {...stylex.props(styles.logoHighlight)}>Able Pro</span>
                </span>
                <span {...stylex.props(styles.logoSub)}>
                  Semantic Hiring
                </span>
              </div>
            </button>

            {/* Quick Demo Switcher Pill */}
            <div {...stylex.props(styles.demoSwitcherWrap)}>
              <button
                onClick={() => setShowDemoSwitcher(!showDemoSwitcher)}
                {...stylex.props(styles.demoPill)}
                title="Switch test accounts"
              >
                <Sparkles size={14} color="#4f46e5" />
                <span>Demo As: {currentUser?.name || 'Visitor'}</span>
                <ChevronDown size={12} />
              </button>

              {showDemoSwitcher && (
                <div {...stylex.props(styles.demoDropdown)}>
                  <div {...stylex.props(styles.demoHeader)}>
                    <span>Select Persona</span>
                    <span style={{ fontSize: '10px', color: '#4f46e5', fontWeight: 'normal', textTransform: 'lowercase' }}>
                      instant switch
                    </span>
                  </div>
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchUser(u.id);
                        setShowDemoSwitcher(false);
                      }}
                      {...stylex.props(
                        styles.demoItem,
                        currentUser?.id === u.id && styles.demoItemActive
                      )}
                    >
                      <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', paddingRight: '8px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{u.name || u.email}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {u.role === 'employer' ? u.company_name || 'Employer' : u.designation || 'Candidate'}
                          {u.is_admin ? ' • Admin' : ''}
                        </div>
                      </div>
                      <span
                        {...stylex.props(
                          u.role === 'employer'
                            ? styles.demoRoleBadgeEmployer
                            : styles.demoRoleBadgeCandidate
                        )}
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
            <div {...stylex.props(styles.searchBar)}>
              <div {...stylex.props(styles.searchInputWrap)}>
                <Search size={16} color="#94a3b8" style={{ marginRight: '8px', flexShrink: 0 }} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search jobs or skills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  {...stylex.props(styles.searchInput)}
                />
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ backgroundColor: 'transparent', border: 0, cursor: 'pointer', color: '#94a3b8', padding: '2px', display: 'flex', alignItems: 'center' }}
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                ) : (
                  <kbd style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '1px 5px', flexShrink: 0, lineHeight: 1 }}>
                    /
                  </kbd>
                )}
              </div>
              <div {...stylex.props(styles.searchDivider)} />
              <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <MapPin size={14} color="#94a3b8" style={{ marginRight: '6px' }} />
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  {...stylex.props(styles.locationSelect)}
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
          <div {...stylex.props(styles.rightNav)}>
            {currentUser ? (
              <>
                {/* Quick Role Perspective Switcher Pill */}
                <button
                  onClick={handleQuickRoleSwitch}
                  title={`Switch to ${isEmployer ? 'Candidate' : 'Employer'} perspective`}
                  {...stylex.props(styles.roleSwitchBtn)}
                >
                  <ArrowRightLeft size={14} />
                  <span>Switch to {isEmployer ? 'Candidate' : 'Employer'}</span>
                </button>

                {/* Candidate Nav Links */}
                {!isEmployer && (
                  <div {...stylex.props(styles.navGroup)}>
                    <button
                      onClick={() => setActiveView('candidate_browse')}
                      {...stylex.props(styles.navLink, activeView === 'candidate_browse' && styles.navLinkActive)}
                    >
                      Jobs &amp; Match
                    </button>
                    <button
                      onClick={() => setActiveView('candidate_applications')}
                      {...stylex.props(styles.navLink, activeView === 'candidate_applications' && styles.navLinkActive)}
                    >
                      <FileCheck size={16} />
                      <span>Applications</span>
                      {candidateAppCount > 0 && (
                        <span {...stylex.props(styles.navBadge)}>
                          {candidateAppCount}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveView('candidate_saved')}
                      {...stylex.props(styles.navLink, activeView === 'candidate_saved' && styles.navLinkActive)}
                    >
                      <Bookmark size={16} />
                      <span>Saved</span>
                    </button>
                    <button
                      onClick={() => setActiveView('candidate_profile')}
                      {...stylex.props(styles.navLink, activeView === 'candidate_profile' && styles.navLinkActive)}
                    >
                      Profile &amp; Resume
                    </button>
                  </div>
                )}

                {/* Employer Nav Links */}
                {isEmployer && (
                  <div {...stylex.props(styles.navGroup)}>
                    <button
                      onClick={() => setActiveView('employer_jobs')}
                      {...stylex.props(styles.navLink, activeView === 'employer_jobs' && styles.navLinkActive)}
                    >
                      Jobs &amp; Meter
                    </button>
                    <button
                      onClick={() => setActiveView('employer_matches')}
                      {...stylex.props(styles.navLink, activeView === 'employer_matches' && styles.navLinkActive)}
                    >
                      Ranked Matches
                    </button>
                    <button
                      onClick={() => setActiveView('employer_pipeline')}
                      {...stylex.props(styles.navLink, activeView === 'employer_pipeline' && styles.navLinkActive)}
                    >
                      <Layers size={16} />
                      <span>Pipeline</span>
                    </button>
                    <button
                      onClick={() => setActiveView('employer_wallet')}
                      {...stylex.props(styles.navLink, activeView === 'employer_wallet' && styles.navLinkActive)}
                    >
                      <Wallet size={16} color="#059669" />
                      <span>Wallet</span>
                      <span {...stylex.props(styles.walletBadge)}>
                        ₹{((companyProfile?.walletBalancePaise || 0) / 100).toLocaleString('en-IN')}
                      </span>
                    </button>
                  </div>
                )}

                {/* Admin Navlink if admin */}
                {isAdmin && (
                  <button
                    onClick={() => setActiveView('admin')}
                    {...stylex.props(styles.adminBadge)}
                  >
                    <Shield size={14} />
                    <span>Admin</span>
                  </button>
                )}

                {/* Feedback Button */}
                <button
                  onClick={onOpenFeedback}
                  title="Send feedback"
                  {...stylex.props(styles.iconBtn)}
                >
                  <MessageSquare size={16} />
                </button>

                {/* User Avatar & Dropdown */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    {...stylex.props(styles.avatarBtn)}
                  >
                    <div {...stylex.props(styles.avatarCircle)}>
                      {(currentUser.name || currentUser.email)[0].toUpperCase()}
                    </div>
                  </button>

                  {showUserMenu && (
                    <div {...stylex.props(styles.userDropdown)}>
                      <div {...stylex.props(styles.userProfileHeader)}>
                        <p {...stylex.props(styles.userName)}>
                          {currentUser.name || currentUser.email}
                        </p>
                        <p {...stylex.props(styles.userEmail)}>{currentUser.email}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                          <span {...stylex.props(styles.demoRoleBadgeEmployer)}>
                            {currentUser.role}
                          </span>
                          {isEmployer && companyProfile && (
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#047857' }}>
                              ₹{((companyProfile.walletBalancePaise || 0) / 100).toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ padding: '4px 0' }}>
                        <button
                          onClick={() => {
                            onOpenAccount();
                            setShowUserMenu(false);
                          }}
                          {...stylex.props(styles.menuItem)}
                        >
                          <Settings size={16} color="#94a3b8" />
                          <span>Account &amp; 2FA</span>
                        </button>

                        <button
                          onClick={() => {
                            onOpenFeedback();
                            setShowUserMenu(false);
                          }}
                          {...stylex.props(styles.menuItem)}
                        >
                          <MessageSquare size={16} color="#94a3b8" />
                          <span>Send Feedback</span>
                        </button>

                        <button
                          onClick={() => {
                            handleQuickRoleSwitch();
                            setShowUserMenu(false);
                          }}
                          {...stylex.props(styles.menuItem)}
                          style={{ color: '#4f46e5' }}
                        >
                          <ArrowRightLeft size={16} color="#6366f1" />
                          <span>Switch to {isEmployer ? 'Candidate' : 'Employer'}</span>
                        </button>
                      </div>

                      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '4px' }}>
                        <button
                          onClick={() => {
                            logout();
                            setShowUserMenu(false);
                          }}
                          {...stylex.props(styles.menuItem, styles.menuItemDanger)}
                        >
                          <LogOut size={16} color="#e11d48" />
                          <span>Sign out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mobile Hamburger Button */}
                <button
                  onClick={() => setShowMobileDrawer(!showMobileDrawer)}
                  {...stylex.props(styles.mobileToggleBtn)}
                >
                  {showMobileDrawer ? <X size={20} /> : <Menu size={20} />}
                </button>
              </>
            ) : (
              /* Anonymous visitor options */
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => onOpenAuth('candidate')}
                  {...stylex.props(styles.visitorBtnLog)}
                >
                  Log in
                </button>
                <button
                  onClick={() => onOpenAuth('candidate')}
                  {...stylex.props(styles.visitorBtnSign)}
                >
                  Sign up
                </button>
                <button
                  onClick={() => onOpenAuth('employer')}
                  {...stylex.props(styles.visitorBtnEmp)}
                >
                  For Employers
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Slide-down Drawer */}
        {showMobileDrawer && (
          <div {...stylex.props(styles.mobileDrawer)}>
            <div {...stylex.props(styles.mobileGrid)}>
              <button
                onClick={() => {
                  handleQuickRoleSwitch();
                  setShowMobileDrawer(false);
                }}
                {...stylex.props(styles.mobileBtn, styles.mobileBtnPrimary)}
              >
                <ArrowRightLeft size={14} />
                <span>Switch to {isEmployer ? 'Candidate' : 'Employer'}</span>
              </button>

              <button
                onClick={() => {
                  onOpenAccount();
                  setShowMobileDrawer(false);
                }}
                {...stylex.props(styles.mobileBtn, styles.mobileBtnSubtle)}
              >
                <Settings size={14} />
                <span>Settings</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
