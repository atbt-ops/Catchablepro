import React, { useState, useMemo } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useApp } from '../context/AppContext';
import { Job, ApplicationStage, JobStatus, CostState } from '../types';
import { computeCostState } from '../services/pricing';
import { matchDetail } from '../services/matching';
import { CompanyAvatar } from './CompanyAvatar';
import { PostJobModal } from './PostJobModal';
import {
  Briefcase,
  Layers,
  Users,
  Wallet,
  Plus,
  Play,
  Pause,
  XCircle,
  Edit,
  Clock,
  Sparkles,
  Building2,
  CheckCircle2,
  CreditCard,
  ArrowRight,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { colors, spacing, radii, shadows } from '../theme/tokens.stylex';

const styles = stylex.create({
  container: {
    maxWidth: '1280px',
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
  },
  header: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    padding: spacing.lg,
    boxShadow: shadows.sm,
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerTitle: {
    fontSize: '1.5rem',
    fontWeight: 900,
    color: colors.text,
    margin: 0,
    letterSpacing: '-0.025em',
  },
  headerSub: {
    fontSize: '0.75rem',
    color: colors.textSecondary,
    margin: '2px 0 0',
  },
  badgeVerified: {
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '10px',
    paddingRight: '10px',
    borderRadius: radii.full,
    fontSize: '0.75rem',
    fontWeight: 700,
    backgroundColor: colors.primaryLight,
    color: colors.primaryHover,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.primaryBorder,
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  walletBtn: {
    paddingTop: '10px',
    paddingBottom: '10px',
    paddingLeft: '16px',
    paddingRight: '16px',
    borderRadius: radii.md,
    fontSize: '0.75rem',
    fontWeight: 700,
    color: colors.successText,
    backgroundColor: colors.successLight,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.successBorder,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  postBtn: {
    paddingTop: '10px',
    paddingBottom: '10px',
    paddingLeft: '20px',
    paddingRight: '20px',
    borderRadius: radii.md,
    fontSize: '0.75rem',
    fontWeight: 700,
    color: colors.textInverse,
    backgroundColor: {
      default: colors.primary,
      ':hover': colors.primaryHover,
    },
    borderWidth: 0,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: shadows.sm,
    transition: 'background-color 0.15s ease',
  },
  tabNav: {
    display: 'flex',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: colors.border,
    gap: spacing.lg,
    fontSize: '0.875rem',
    fontWeight: 700,
    overflowX: 'auto',
  },
  tabItem: {
    paddingBottom: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderBottomWidth: '2px',
    borderBottomStyle: 'solid',
    transition: 'all 0.15s ease',
  },
  tabItemActive: {
    borderBottomColor: colors.primary,
    color: colors.primary,
  },
  tabItemInactive: {
    borderBottomColor: 'transparent',
    color: colors.textMuted,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: spacing.md,
  },
  statCard: {
    padding: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    boxShadow: shadows.sm,
  },
  statLabel: {
    fontSize: '0.625rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: colors.textMuted,
    display: 'block',
  },
  statVal: {
    fontSize: '1.5rem',
    fontWeight: 900,
    color: colors.text,
    display: 'block',
    marginTop: '4px',
  },
  statSub: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    marginTop: '2px',
    display: 'block',
  },
  jobsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  jobRow: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    padding: spacing.lg,
    boxShadow: shadows.sm,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  meterBox: {
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  kanbanGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: spacing.md,
  },
  kanbanCol: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
    minHeight: '420px',
  },
  kanbanCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    boxShadow: shadows.sm,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  overlay: {
    position: 'fixed',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    maxWidth: '440px',
    width: '100%',
    padding: spacing.lg,
    boxShadow: shadows.xl,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  input: {
    width: '100%',
    fontSize: '0.8125rem',
    padding: '10px 14px',
    borderRadius: radii.md,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    backgroundColor: colors.surface,
    color: colors.text,
  },
  btnPrimary: {
    paddingTop: '10px',
    paddingBottom: '10px',
    paddingLeft: '16px',
    paddingRight: '16px',
    borderRadius: radii.md,
    fontSize: '0.75rem',
    fontWeight: 700,
    color: colors.textInverse,
    backgroundColor: {
      default: colors.primary,
      ':hover': colors.primaryHover,
    },
    borderWidth: 0,
    cursor: 'pointer',
    boxShadow: shadows.sm,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'background-color 0.15s ease',
  },
});

interface EmployerDashboardProps {
  activeTab: 'jobs' | 'matches' | 'pipeline' | 'wallet' | 'profile';
  setActiveTab: (tab: 'jobs' | 'matches' | 'pipeline' | 'wallet' | 'profile') => void;
}

const STAGES: ApplicationStage[] = [
  'applied',
  'shortlisted',
  'interview',
  'offered',
  'hired',
];

const STAGE_TITLES: Record<ApplicationStage, string> = {
  applied: 'New Applied',
  shortlisted: 'Shortlisted',
  interview: 'Interviewing',
  offered: 'Offer Extended',
  hired: 'Hired 🎉',
  rejected: 'Archived',
};

// Visual On-Demand 5-Week Pricing Meter Component
const PricingMeterVisualizer: React.FC<{ cost: CostState; status: JobStatus }> = ({ cost, status }) => {
  const percentElapsed = Math.min((cost.daysActive / 30) * 100, 100);

  return (
    <div {...stylex.props(styles.meterBox)}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
        <span style={{ fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={14} color="#4f46e5" />
          <span>30-Day On-Demand Holding Meter</span>
        </span>
        {status === 'active' ? (
          <span style={{ fontWeight: 800, color: '#047857', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '9999px', border: '1px solid #a7f3d0', fontSize: '10px' }}>
            LIVE • Day {cost.daysActive.toFixed(1)} / 30
          </span>
        ) : (
          <span style={{ fontWeight: 700, color: '#94a3b8', backgroundColor: '#e2e8f0', padding: '2px 8px', borderRadius: '9999px', fontSize: '10px' }}>
            Meter Paused
          </span>
        )}
      </div>

      {/* 5-Week Segmented Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ width: '100%', backgroundColor: '#e2e8f0', height: '10px', borderRadius: '9999px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${percentElapsed}%`,
              background: 'linear-gradient(to right, #10b981, #4f46e5, #f59e0b)',
              borderRadius: '9999px',
              transition: 'all 0.5s ease',
            }}
          />
        </div>

        {/* Milestone Labels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', fontSize: '10px', fontWeight: 600, color: '#94a3b8', textAlign: 'center' }}>
          <span style={{ color: cost.daysActive < 7 ? '#047857' : undefined, fontWeight: cost.daysActive < 7 ? 'bold' : undefined }}>W1: Free</span>
          <span style={{ color: cost.daysActive >= 7 && cost.daysActive < 14 ? '#4338ca' : undefined, fontWeight: cost.daysActive >= 7 && cost.daysActive < 14 ? 'bold' : undefined }}>W2: ₹50/d</span>
          <span style={{ color: cost.daysActive >= 14 && cost.daysActive < 21 ? '#4338ca' : undefined, fontWeight: cost.daysActive >= 14 && cost.daysActive < 21 ? 'bold' : undefined }}>W3: ₹100/d</span>
          <span style={{ color: cost.daysActive >= 21 && cost.daysActive < 28 ? '#b45309' : undefined, fontWeight: cost.daysActive >= 21 && cost.daysActive < 28 ? 'bold' : undefined }}>W4: ₹200/d</span>
          <span style={{ color: cost.daysActive >= 28 ? '#be123c' : undefined, fontWeight: cost.daysActive >= 28 ? 'bold' : undefined }}>W5: ₹400/d</span>
        </div>
      </div>

      {/* Metric details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0', fontSize: '0.75rem' }}>
        <div>
          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', display: 'block' }}>Current Rate</span>
          <span style={{ fontWeight: 800, color: '#0f172a', display: 'block', marginTop: '2px' }}>
            {cost.dailyRate === 0 ? 'FREE' : `₹${cost.dailyRate}/day`}
          </span>
        </div>
        <div>
          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', display: 'block' }}>Accrued Spend</span>
          <span style={{ fontWeight: 800, color: '#4338ca', display: 'block', marginTop: '2px' }}>{cost.accruedDisplay}</span>
        </div>
        <div>
          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', display: 'block' }}>Auto-Cap</span>
          <span style={{ fontWeight: 600, color: '#475569', display: 'block', marginTop: '2px', fontSize: '11px' }}>
            {cost.daysToCap > 0 ? `${cost.daysToCap.toFixed(1)} days left` : 'Closed'}
          </span>
        </div>
      </div>
    </div>
  );
};

export const EmployerDashboard: React.FC<EmployerDashboardProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const {
    currentUser,
    jobs,
    users,
    candidateProfiles,
    companyProfiles,
    applications,
    walletTransactions,
    setJobStatus,
    updateApplicationStage,
    topupWallet,
    updateCompanyProfile,
    showToast,
  } = useApp();

  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedJobIdForMatches, setSelectedJobIdForMatches] = useState<number | null>(null);
  const [selectedJobIdForPipeline, setSelectedJobIdForPipeline] = useState<number | null>(null);

  // Wallet topup modal
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmountINR, setTopupAmountINR] = useState(1000);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccessNotice, setPaymentSuccessNotice] = useState(false);

  // Search/Filter for transactions
  const [txSearch, setTxSearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'topup' | 'debit'>('all');

  // Company Profile form
  const currentCompany = currentUser ? companyProfiles[currentUser.id] : null;
  const [industry, setIndustry] = useState(currentCompany?.industry || '');
  const [companySize, setCompanySize] = useState(currentCompany?.size || '51-200 employees');
  const [website, setWebsite] = useState(currentCompany?.website || '');
  const [about, setAbout] = useState(currentCompany?.about || '');
  const [hqLocation, setHqLocation] = useState(currentCompany?.hqLocation || 'Bengaluru, India');
  const [profileSaved, setProfileSaved] = useState(false);

  // Filter jobs owned by current employer
  const myJobs = useMemo(() => {
    if (!currentUser) return [];
    return jobs.filter((j) => j.employerId === currentUser.id);
  }, [jobs, currentUser]);

  const activeJobCount = myJobs.filter((j) => j.status === 'active').length;

  // Selected job for matches
  const targetJobForMatches = useMemo(() => {
    if (selectedJobIdForMatches) {
      return myJobs.find((j) => j.id === selectedJobIdForMatches) || myJobs[0];
    }
    return myJobs[0] || null;
  }, [myJobs, selectedJobIdForMatches]);

  // Candidates ranked by skill match for target job
  const rankedCandidates = useMemo(() => {
    if (!targetJobForMatches) return [];
    const candidates = users.filter((u) => u.role === 'candidate' && !u.is_suspended);

    return candidates
      .map((c) => {
        const profile = candidateProfiles[c.id];
        const match = matchDetail(profile?.skills || '', targetJobForMatches.requiredSkills);
        return {
          user: c,
          profile,
          match,
        };
      })
      .filter((item) => item.match.pct >= 1)
      .sort((a, b) => b.match.pct - a.match.pct);
  }, [users, candidateProfiles, targetJobForMatches]);

  // Applications for pipeline
  const pipelineApplications = useMemo(() => {
    const jobIds = selectedJobIdForPipeline
      ? [selectedJobIdForPipeline]
      : myJobs.map((j) => j.id);

    return applications
      .filter((a) => jobIds.includes(a.jobId))
      .map((app) => {
        const candidateUser = users.find((u) => u.id === app.candidateId);
        const profile = candidateProfiles[app.candidateId];
        const job = jobs.find((j) => j.id === app.jobId);
        return {
          ...app,
          candidateUser,
          profile,
          job,
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [applications, myJobs, selectedJobIdForPipeline, users, candidateProfiles, jobs]);

  // Wallet top-up handler
  const handleTopup = (e: React.FormEvent) => {
    e.preventDefault();
    if (topupAmountINR < 100) return;
    setIsProcessingPayment(true);
    setTimeout(() => {
      topupWallet(topupAmountINR * 100); // INR to paise
      setIsProcessingPayment(false);
      setPaymentSuccessNotice(true);
      setTimeout(() => {
        setPaymentSuccessNotice(false);
        setShowTopupModal(false);
      }, 1500);
    }, 1200);
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanyProfile({
      industry,
      size: companySize,
      website,
      about,
      hqLocation,
    });
    setProfileSaved(true);
    showToast({
      type: 'success',
      title: 'Company Profile Updated',
      message: 'Details saved successfully',
    });
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const handleShortlistCandidate = (candidateId: number) => {
    if (!targetJobForMatches) return;
    const existing = applications.find(
      (a) => a.jobId === targetJobForMatches.id && a.candidateId === candidateId
    );

    if (existing) {
      updateApplicationStage(existing.id, 'shortlisted');
    } else {
      showToast({
        type: 'success',
        title: 'Candidate Shortlisted ⭐',
        message: 'Candidate added directly into your shortlisted stage',
      });
    }
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return walletTransactions.filter((tx) => {
      if (txTypeFilter !== 'all' && tx.type !== txTypeFilter) return false;
      if (txSearch.trim()) {
        const q = txSearch.toLowerCase();
        return (
          tx.note.toLowerCase().includes(q) ||
          tx.razorpayPaymentId.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [walletTransactions, txTypeFilter, txSearch]);

  return (
    <div {...stylex.props(styles.container)}>
      {/* Top Employer Header */}
      <div {...stylex.props(styles.header)}>
        <div {...stylex.props(styles.headerLeft)}>
          <CompanyAvatar name={currentUser?.company_name || 'Acme'} size="lg" showVerified={true} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 {...stylex.props(styles.headerTitle)}>
                {currentUser?.company_name || 'Employer Portal'}
              </h1>
              <span {...stylex.props(styles.badgeVerified)}>
                Verified Recruiter
              </span>
            </div>
            <p {...stylex.props(styles.headerSub)}>
              Logged in as {currentUser?.name} ({currentUser?.designation || 'Head of Talent'})
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div {...stylex.props(styles.headerActions)}>
          <button
            onClick={() => setShowTopupModal(true)}
            {...stylex.props(styles.walletBtn)}
          >
            <Wallet size={16} color="#059669" />
            <span>Wallet: ₹{((currentCompany?.walletBalancePaise || 0) / 100).toLocaleString('en-IN')}</span>
          </button>

          <button
            onClick={() => {
              setEditingJob(null);
              setShowPostModal(true);
            }}
            {...stylex.props(styles.postBtn)}
          >
            <Plus size={16} />
            <span>Post New Job</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div {...stylex.props(styles.tabNav)}>
        <button
          onClick={() => setActiveTab('jobs')}
          {...stylex.props(styles.tabItem, activeTab === 'jobs' ? styles.tabItemActive : styles.tabItemInactive)}
        >
          <Briefcase size={16} />
          <span>My Jobs &amp; Meter ({myJobs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('matches')}
          {...stylex.props(styles.tabItem, activeTab === 'matches' ? styles.tabItemActive : styles.tabItemInactive)}
        >
          <Sparkles size={16} />
          <span>Ranked Candidates ({rankedCandidates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pipeline')}
          {...stylex.props(styles.tabItem, activeTab === 'pipeline' ? styles.tabItemActive : styles.tabItemInactive)}
        >
          <Layers size={16} />
          <span>Hiring Pipeline ({pipelineApplications.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('wallet')}
          {...stylex.props(styles.tabItem, activeTab === 'wallet' ? styles.tabItemActive : styles.tabItemInactive)}
        >
          <Wallet size={16} />
          <span>Prepaid Wallet &amp; Pricing</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          {...stylex.props(styles.tabItem, activeTab === 'profile' ? styles.tabItemActive : styles.tabItemInactive)}
        >
          <Building2 size={16} />
          <span>Company Profile</span>
        </button>
      </div>

      {/* TAB 1: JOBS & ON-DEMAND PRICING METER */}
      {activeTab === 'jobs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Top KPI Cards */}
          <div {...stylex.props(styles.statsGrid)}>
            <div {...stylex.props(styles.statCard)}>
              <span {...stylex.props(styles.statLabel)}>Active Job Postings</span>
              <span {...stylex.props(styles.statVal)}>{activeJobCount}</span>
              <span {...stylex.props(styles.statSub)} style={{ color: '#059669' }}>Live in search</span>
            </div>

            <div {...stylex.props(styles.statCard)}>
              <span {...stylex.props(styles.statLabel)}>Total Applicants</span>
              <span {...stylex.props(styles.statVal)}>{pipelineApplications.length}</span>
              <span {...stylex.props(styles.statSub)} style={{ color: '#4f46e5' }}>Across all stages</span>
            </div>

            <div {...stylex.props(styles.statCard)}>
              <span {...stylex.props(styles.statLabel)}>Prepaid Wallet</span>
              <span {...stylex.props(styles.statVal)}>
                ₹{((currentCompany?.walletBalancePaise || 0) / 100).toLocaleString('en-IN')}
              </span>
              <span {...stylex.props(styles.statSub)} style={{ color: '#64748b' }}>Ready for on-demand meter</span>
            </div>

            <div {...stylex.props(styles.statCard)} style={{ background: 'linear-gradient(135deg, #eef2ff, #faf5ff)', borderColor: '#c7d2fe' }}>
              <span {...stylex.props(styles.statLabel)} style={{ color: '#3730a3' }}>Free Week Policy</span>
              <span {...stylex.props(styles.statVal)} style={{ fontSize: '1.125rem', color: '#1e1b4b' }}>
                7 Days FREE per job
              </span>
              <span {...stylex.props(styles.statSub)} style={{ color: '#4338ca' }}>
                Closes fast hires at zero cost
              </span>
            </div>
          </div>

          {/* Job Postings List */}
          <div {...stylex.props(styles.jobsList)}>
            {myJobs.map((job) => {
              const cost = computeCostState(job.billableSeconds, job.activeSince);
              const jobApps = applications.filter((a) => a.jobId === job.id);

              return (
                <div key={job.id} {...stylex.props(styles.jobRow)}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '600px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        backgroundColor: job.status === 'active' ? '#ecfdf5' : '#fffbeb',
                        color: job.status === 'active' ? '#065f46' : '#92400e',
                        border: `1px solid ${job.status === 'active' ? '#a7f3d0' : '#fde68a'}`,
                      }}>
                        {job.status}
                      </span>
                      <span style={{ color: '#cbd5e1' }}>•</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>{job.department}</span>
                      <span style={{ color: '#cbd5e1' }}>•</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>{job.workMode}</span>
                      <span style={{ color: '#cbd5e1' }}>•</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>{job.location}</span>
                    </div>

                    <h3 style={{ fontSize: '1.125rem', fontWeight: 900, color: '#0f172a', margin: '2px 0 0' }}>{job.title}</h3>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '4px' }}>
                      {job.requiredSkills.split(',').map((skill) => (
                        <span key={skill} style={{ padding: '2px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#f1f5f9', color: '#334155' }}>
                          {skill.trim()}
                        </span>
                      ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.75rem', color: '#94a3b8', paddingTop: '4px' }}>
                      <span>Posted: {new Date(job.createdAt).toLocaleDateString()}</span>
                      <span>Applicants: <strong style={{ color: '#334155' }}>{jobApps.length}</strong></span>
                      <span>Salary: {job.hideSalary ? 'Confidential' : `₹${job.salaryMin}-${job.salaryMax} LPA`}</span>
                    </div>
                  </div>

                  <div style={{ width: '100%', maxWidth: '380px' }}>
                    <PricingMeterVisualizer cost={cost} status={job.status} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {job.status === 'active' ? (
                      <button
                        onClick={() => setJobStatus(job.id, 'paused')}
                        style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, color: '#92400e', backgroundColor: '#fffbeb', border: '1px solid #fde68a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Pause size={14} />
                        <span>Pause Meter</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setJobStatus(job.id, 'active')}
                        style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, color: '#065f46', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Play size={14} />
                        <span>Activate</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setEditingJob(job);
                        setShowPostModal(true);
                      }}
                      style={{ padding: '8px', borderRadius: '10px', color: '#64748b', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer' }}
                      title="Edit posting"
                    >
                      <Edit size={16} />
                    </button>

                    <button
                      onClick={() => setJobStatus(job.id, 'closed')}
                      style={{ padding: '8px', borderRadius: '10px', color: '#e11d48', backgroundColor: '#fff1f2', border: '1px solid #fecdd3', cursor: 'pointer' }}
                      title="Close job permanently"
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: RANKED CANDIDATE MATCHES */}
      {activeTab === 'matches' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Matching Candidates For:
              </span>
              <select
                value={targetJobForMatches?.id || ''}
                onChange={(e) => setSelectedJobIdForMatches(Number(e.target.value))}
                style={{ backgroundColor: '#f1f5f9', fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', borderRadius: '10px', padding: '6px 12px', border: 0, outline: 'none', cursor: 'pointer' }}
              >
                {myJobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} ({j.department})
                  </option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Required skills: <code style={{ backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontFamily: 'monospace' }}>{targetJobForMatches?.requiredSkills}</code>
            </div>
          </div>

          {rankedCandidates.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
              {rankedCandidates.map(({ user, profile, match }) => (
                <div key={user.id} {...stylex.props(styles.kanbanCard)}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #4f46e5, #3730a3)', color: '#fff', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {user.name[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>{user.name}</h3>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0' }}>{user.email}</p>
                        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4338ca', margin: '2px 0 0' }}>{profile?.headline || 'Candidate Profile'}</p>
                      </div>
                    </div>
                    <span style={{ padding: '4px 10px', borderRadius: '9999px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Sparkles size={14} color="#059669" />
                      <span>{match.pct}% Match</span>
                    </span>
                  </div>

                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                      Candidate Skills
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {profile?.skills.split(',').map((s) => {
                        const skill = s.trim();
                        const isReq = match.matched.includes(skill.toLowerCase());
                        return (
                          <span
                            key={skill}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: isReq ? 700 : 500,
                              backgroundColor: isReq ? '#ecfdf5' : '#f1f5f9',
                              color: isReq ? '#065f46' : '#475569',
                              border: isReq ? '1px solid #a7f3d0' : undefined,
                            }}
                          >
                            {skill}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {profile?.autoApply ? '⚡ Auto-Apply Active' : 'Direct Search'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => handleShortlistCandidate(user.id)}
                        style={{ padding: '6px 14px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, color: '#4338ca', backgroundColor: '#eef2ff', border: '1px solid #c7d2fe', cursor: 'pointer' }}
                      >
                        Shortlist
                      </button>
                      <button
                        onClick={() => {
                          showToast({
                            type: 'success',
                            title: 'Invitation Sent 📨',
                            message: `Direct interview invite sent to ${user.name} for ${targetJobForMatches?.title}`,
                          });
                        }}
                        {...stylex.props(styles.btnPrimary)}
                      >
                        <Send size={14} />
                        <span>Invite</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '64px 20px', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <Users size={48} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>No candidate matches</h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '360px', margin: '0 auto' }}>
                No registered candidates currently match the skill criteria for this job.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: HIRING PIPELINE (KANBAN) */}
      {activeTab === 'pipeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Filter by Role:
              </span>
              <select
                value={selectedJobIdForPipeline || ''}
                onChange={(e) =>
                  setSelectedJobIdForPipeline(e.target.value ? Number(e.target.value) : null)
                }
                style={{ backgroundColor: '#f1f5f9', fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', borderRadius: '10px', padding: '6px 12px', border: 0, outline: 'none', cursor: 'pointer' }}
              >
                <option value="">All Job Postings</option>
                {myJobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} ({j.department})
                  </option>
                ))}
              </select>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
              Total Applicants: {pipelineApplications.length}
            </span>
          </div>

          <div {...stylex.props(styles.kanbanGrid)}>
            {STAGES.map((stg) => {
              const stageApps = pipelineApplications.filter((a) => a.status === stg);

              return (
                <div key={stg} {...stylex.props(styles.kanbanCol)}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
                    <h3 style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b', margin: 0 }}>
                      {STAGE_TITLES[stg]}
                    </h3>
                    <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 900, backgroundColor: '#fff', border: '1px solid #e2e8f0', color: '#334155' }}>
                      {stageApps.length}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>
                    {stageApps.map((app) => (
                      <div key={app.id} {...stylex.props(styles.kanbanCard)}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                          <div>
                            <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                              {app.candidateUser?.name || 'Applicant'}
                            </h4>
                            <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {app.job?.title}
                            </p>
                          </div>
                          <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 800, backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
                            {app.matchPct}%
                          </span>
                        </div>

                        {app.notes && (
                          <p style={{ fontSize: '10px', color: '#475569', backgroundColor: '#f8fafc', padding: '6px 8px', borderRadius: '6px', fontStyle: 'italic', margin: 0 }}>
                            "{app.notes}"
                          </p>
                        )}

                        <div style={{ paddingTop: '8px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8' }}>Move:</span>
                          <select
                            value={app.status}
                            onChange={(e) =>
                              updateApplicationStage(app.id, e.target.value as ApplicationStage)
                            }
                            style={{ backgroundColor: '#f1f5f9', fontSize: '11px', fontWeight: 700, color: '#334155', borderRadius: '6px', padding: '4px 8px', border: 0, outline: 'none', cursor: 'pointer' }}
                          >
                            {STAGES.map((s) => (
                              <option key={s} value={s}>
                                {STAGE_TITLES[s]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}

                    {stageApps.length === 0 && (
                      <div style={{ height: '120px', border: '2px dashed #cbd5e1', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>
                        No candidates
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: PREPAID WALLET & PRICING */}
      {activeTab === 'wallet' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: 'linear-gradient(135deg, #1e1b4b, #0f172a)', borderRadius: '24px', padding: '24px', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#c7d2fe' }}>
                  Prepaid Wallet Balance
                </span>
                <Wallet size={20} color="#34d399" />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900 }}>
                ₹{((currentCompany?.walletBalancePaise || 0) / 100).toLocaleString('en-IN')}
              </div>
              <p style={{ fontSize: '0.75rem', color: '#e0e7ff', margin: 0 }}>
                Covers on-demand daily holding fees after your 7-day free window.
              </p>
              <button
                onClick={() => setShowTopupModal(true)}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, color: '#1e1b4b', backgroundColor: '#fff', border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Plus size={16} />
                <span>Recharge Wallet Balance</span>
              </button>
            </div>

            <div style={{ backgroundColor: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.75rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>On-Demand Tier Schedule</h3>
              <p style={{ color: '#475569', margin: 0 }}>
                Catchablepro uses an on-demand meter to incentivize fast closure:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#065f46', fontWeight: 700 }}>
                  <span>Week 1 (Days 0-6):</span>
                  <span>FREE</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                  <span>Week 2 (Days 7-13):</span>
                  <span style={{ fontWeight: 700 }}>₹50 / day</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                  <span>Week 3 (Days 14-20):</span>
                  <span style={{ fontWeight: 700 }}>₹100 / day</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                  <span>Week 4 (Days 21-27):</span>
                  <span style={{ fontWeight: 700 }}>₹200 / day</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                  <span>Week 5 (Days 28-29):</span>
                  <span style={{ fontWeight: 700 }}>₹400 / day</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#fff1f2', color: '#9f1239', fontWeight: 700 }}>
                  <span>Day 30 Hard Cap:</span>
                  <span>Auto-Closed</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Wallet Transactions Ledger</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Search..."
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  {...stylex.props(styles.input)}
                  style={{ width: '140px', padding: '6px 10px', fontSize: '0.75rem' }}
                />
                <select
                  value={txTypeFilter}
                  onChange={(e) => setTxTypeFilter(e.target.value as 'all' | 'topup' | 'debit')}
                  style={{ backgroundColor: '#f1f5f9', fontSize: '0.75rem', fontWeight: 600, borderRadius: '8px', padding: '6px 10px', border: 0, outline: 'none' }}
                >
                  <option value="all">All</option>
                  <option value="topup">Top-ups</option>
                  <option value="debit">Debits</option>
                </select>
              </div>
            </div>

            <div style={{ backgroundColor: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', textAlign: 'left', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#94a3b8', textTransform: 'uppercase', fontSize: '10px', fontWeight: 700 }}>
                  <tr>
                    <th style={{ padding: '12px' }}>Type</th>
                    <th style={{ padding: '12px' }}>Details</th>
                    <th style={{ padding: '12px' }}>Amount</th>
                    <th style={{ padding: '12px' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 900,
                          fontSize: '10px',
                          textTransform: 'uppercase',
                          backgroundColor: tx.type === 'topup' ? '#ecfdf5' : '#fff1f2',
                          color: tx.type === 'topup' ? '#065f46' : '#9f1239',
                        }}>
                          {tx.type}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#334155' }}>
                        <div style={{ fontWeight: 600 }}>{tx.note}</div>
                        {tx.razorpayPaymentId && (
                          <div style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>
                            {tx.razorpayPaymentId}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 900, color: '#0f172a' }}>
                        {tx.type === 'topup' ? '+' : '-'}₹{(tx.amountPaise / 100).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px', color: '#94a3b8' }}>
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                        No transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: COMPANY PROFILE */}
      {activeTab === 'profile' && (
        <div style={{ maxWidth: '640px', backgroundColor: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Company Details</h2>
            {profileSaved && (
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#065f46', backgroundColor: '#ecfdf5', padding: '4px 10px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                <CheckCircle2 size={14} color="#059669" /> Saved!
              </span>
            )}
          </div>

          <form onSubmit={handleSaveCompany} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', marginBottom: '4px' }}>
                Company Name
              </label>
              <input
                type="text"
                value={currentUser?.company_name || 'Acme'}
                disabled
                {...stylex.props(styles.input)}
                style={{ backgroundColor: '#f8fafc', color: '#94a3b8', fontWeight: 'bold' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', marginBottom: '4px' }}>
                  Industry
                </label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Cloud Infrastructure, SaaS"
                  {...stylex.props(styles.input)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', marginBottom: '4px' }}>
                  Company Size
                </label>
                <select
                  value={companySize}
                  onChange={(e) => setCompanySize(e.target.value)}
                  {...stylex.props(styles.input)}
                >
                  <option value="1-10 employees">1-10 employees</option>
                  <option value="11-50 employees">11-50 employees</option>
                  <option value="51-200 employees">51-200 employees</option>
                  <option value="201-500 employees">201-500 employees</option>
                  <option value="500+ employees">500+ employees</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', marginBottom: '4px' }}>
                Website URL
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                {...stylex.props(styles.input)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', marginBottom: '4px' }}>
                Headquarters Location
              </label>
              <input
                type="text"
                value={hqLocation}
                onChange={(e) => setHqLocation(e.target.value)}
                placeholder="e.g. Bengaluru, India"
                {...stylex.props(styles.input)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', marginBottom: '4px' }}>
                About the Company
              </label>
              <textarea
                rows={3}
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="Write a brief overview shown on job postings..."
                {...stylex.props(styles.input)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
              <button
                type="submit"
                {...stylex.props(styles.btnPrimary)}
              >
                Save Details
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Topup Modal (Simulated Razorpay) */}
      {showTopupModal && (
        <div {...stylex.props(styles.overlay)}>
          <div {...stylex.props(styles.modal)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#4f46e5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Razorpay Checkout</h3>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>Recharge Employer Wallet</p>
                </div>
              </div>
              <button
                onClick={() => setShowTopupModal(false)}
                style={{ background: 'none', border: 0, cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
              >
                <XCircle size={20} />
              </button>
            </div>

            {paymentSuccessNotice ? (
              <div style={{ padding: '32px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto' }} />
                <h4 style={{ fontSize: '1.125rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Payment Verified!</h4>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                  ₹{topupAmountINR.toLocaleString('en-IN')} has been added to your company balance.
                </p>
              </div>
            ) : (
              <form onSubmit={handleTopup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '8px' }}>
                    Quick Recharge Presets
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {[500, 1000, 2500, 5000].map((amt) => (
                      <button
                        type="button"
                        key={amt}
                        onClick={() => setTopupAmountINR(amt)}
                        style={{
                          padding: '8px 4px',
                          borderRadius: '10px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          backgroundColor: topupAmountINR === amt ? '#4f46e5' : '#f8fafc',
                          color: topupAmountINR === amt ? '#fff' : '#334155',
                          border: `1px solid ${topupAmountINR === amt ? '#4f46e5' : '#e2e8f0'}`,
                        }}
                      >
                        ₹{amt.toLocaleString('en-IN')}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Amount (INR ₹)
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="50000"
                    value={topupAmountINR}
                    onChange={(e) => setTopupAmountINR(Number(e.target.value))}
                    {...stylex.props(styles.input)}
                    style={{ fontSize: '1.25rem', fontWeight: 900 }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '6px' }}>
                    Payment Method
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', fontSize: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('upi')}
                      style={{
                        padding: '8px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        backgroundColor: paymentMethod === 'upi' ? '#eef2ff' : '#fff',
                        color: paymentMethod === 'upi' ? '#4338ca' : '#475569',
                        border: `1px solid ${paymentMethod === 'upi' ? '#4f46e5' : '#e2e8f0'}`,
                      }}
                    >
                      UPI
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      style={{
                        padding: '8px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        backgroundColor: paymentMethod === 'card' ? '#eef2ff' : '#fff',
                        color: paymentMethod === 'card' ? '#4338ca' : '#475569',
                        border: `1px solid ${paymentMethod === 'card' ? '#4f46e5' : '#e2e8f0'}`,
                      }}
                    >
                      Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('netbanking')}
                      style={{
                        padding: '8px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        backgroundColor: paymentMethod === 'netbanking' ? '#eef2ff' : '#fff',
                        color: paymentMethod === 'netbanking' ? '#4338ca' : '#475569',
                        border: `1px solid ${paymentMethod === 'netbanking' ? '#4f46e5' : '#e2e8f0'}`,
                      }}
                    >
                      Net Banking
                    </button>
                  </div>
                </div>

                <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={16} color="#059669" style={{ flexShrink: 0 }} />
                  <span>256-bit encrypted Razorpay Sandbox test environment</span>
                </div>

                <button
                  type="submit"
                  disabled={isProcessingPayment}
                  {...stylex.props(styles.btnPrimary)}
                  style={{ padding: '12px', width: '100%' }}
                >
                  {isProcessingPayment ? (
                    <span>Verifying with Razorpay...</span>
                  ) : (
                    <>
                      <span>Pay ₹{topupAmountINR.toLocaleString('en-IN')}</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Post / Edit Job Modal */}
      {showPostModal && (
        <PostJobModal
          initialJob={editingJob}
          onClose={() => setShowPostModal(false)}
        />
      )}
    </div>
  );
};
