import React, { useState, useMemo } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useApp } from '../context/AppContext';
import { Job, ApplicationStage } from '../types';
import { JobCard } from './JobCard';
import { JobDetailModal } from './JobDetailModal';
import { matchPct, parseSkills } from '../services/matching';
import {
  Search,
  Sparkles,
  Zap,
  UploadCloud,
  FileText,
  CheckCircle2,
  Bookmark,
  Layers,
  ArrowUpDown,
  ChevronRight,
  Plus,
  X,
  TrendingUp,
  RotateCcw,
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
  heroBanner: {
    backgroundColor: '#0f172a',
    backgroundImage: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #3b0764 100%)',
    borderRadius: radii.xl,
    color: colors.textInverse,
    padding: spacing.xl,
    position: 'relative',
    overflow: 'hidden',
    boxShadow: shadows.xl,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#312e81',
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xl,
  },
  heroLeft: {
    maxWidth: '580px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  heroPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    paddingTop: '4px',
    paddingBottom: '4px',
    paddingLeft: '12px',
    paddingRight: '12px',
    borderRadius: radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    backdropFilter: 'blur(6px)',
    color: '#c7d2fe',
    fontSize: '0.75rem',
    fontWeight: 600,
    alignSelf: 'flex-start',
  },
  heroTitle: {
    fontSize: '2rem',
    fontWeight: 900,
    letterSpacing: '-0.025em',
    color: colors.textInverse,
    margin: 0,
    lineHeight: 1.15,
  },
  heroSubtitle: {
    fontSize: '0.875rem',
    lineHeight: 1.5,
    color: '#e0e7ff',
    margin: 0,
  },
  heroTrending: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '6px',
    marginTop: '6px',
  },
  heroTrendingLabel: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    color: '#c7d2fe',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  heroTag: {
    paddingTop: '4px',
    paddingBottom: '4px',
    paddingLeft: '10px',
    paddingRight: '10px',
    borderRadius: radii.md,
    fontSize: '0.75rem',
    fontWeight: 500,
    backgroundColor: {
      default: 'rgba(255, 255, 255, 0.1)',
      ':hover': 'rgba(255, 255, 255, 0.2)',
    },
    color: colors.textInverse,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  heroRight: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
    minWidth: '280px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing.sm,
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(8px)',
    padding: '12px 16px',
    borderRadius: radii.lg,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  statLabel: {
    fontSize: '0.625rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#c7d2fe',
    display: 'block',
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: 900,
    color: colors.textInverse,
    display: 'block',
    marginTop: '2px',
  },
  statSub: {
    fontSize: '0.625rem',
    color: '#6ee7b7',
    fontWeight: 600,
  },
  autoApplyBox: {
    padding: '14px',
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(8px)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  autoApplyLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  autoApplyIconBox: {
    width: '36px',
    height: '36px',
    borderRadius: radii.md,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  autoApplyIconActive: {
    backgroundColor: colors.success,
    color: colors.textInverse,
  },
  autoApplyIconInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: colors.textInverse,
  },
  autoApplyTitle: {
    fontWeight: 700,
    fontSize: '0.75rem',
    color: colors.textInverse,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  autoApplySub: {
    fontSize: '0.625rem',
    color: '#c7d2fe',
    margin: 0,
  },
  autoApplyBtn: {
    paddingTop: '6px',
    paddingBottom: '6px',
    paddingLeft: '12px',
    paddingRight: '12px',
    borderRadius: radii.md,
    fontSize: '0.75rem',
    fontWeight: 700,
    cursor: 'pointer',
    borderWidth: 0,
    transition: 'all 0.15s ease',
  },
  autoApplyBtnActive: {
    backgroundColor: colors.surface,
    color: '#1e1b4b',
  },
  autoApplyBtnInactive: {
    backgroundColor: colors.primary,
    color: colors.textInverse,
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
  filterBar: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    boxShadow: shadows.sm,
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  filterPillRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.md,
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.75rem',
    color: colors.textSecondary,
  },
  filterLabel: {
    fontWeight: 700,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontSize: '0.625rem',
  },
  filterPill: {
    paddingTop: '5px',
    paddingBottom: '5px',
    paddingLeft: '12px',
    paddingRight: '12px',
    borderRadius: radii.md,
    fontWeight: 700,
    fontSize: '0.75rem',
    cursor: 'pointer',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'transparent',
    transition: 'all 0.15s ease',
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    color: colors.textInverse,
    boxShadow: '0 1px 3px rgba(79, 70, 229, 0.25)',
  },
  filterPillInactive: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    color: colors.textSecondary,
  },
  filterDivider: {
    height: '16px',
    width: '1px',
    backgroundColor: colors.border,
  },
  sortGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sortSelect: {
    backgroundColor: colors.surfaceSubtle,
    fontWeight: 700,
    color: colors.text,
    borderRadius: radii.md,
    padding: '6px 12px',
    borderWidth: 0,
    outline: 'none',
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
  resetBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: colors.textSecondary,
    backgroundColor: 'transparent',
    borderWidth: 0,
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  jobGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
    gap: spacing.lg,
  },
  emptyCard: {
    textAlign: 'center',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    boxShadow: shadows.sm,
  },
  appCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    padding: spacing.lg,
    boxShadow: shadows.sm,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  appHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  appCompanyAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.primaryBorder,
    color: colors.primary,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontSize: '1rem',
  },
  pipelineGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: spacing.sm,
    textAlign: 'center',
    paddingTop: '12px',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: colors.border,
  },
  pipelineStepDot: {
    width: '28px',
    height: '28px',
    borderRadius: radii.full,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 700,
    margin: '0 auto',
  },
  stepActive: {
    backgroundColor: colors.primary,
    color: colors.textInverse,
    boxShadow: `0 0 0 4px ${colors.primaryLight}`,
  },
  stepCompleted: {
    backgroundColor: colors.success,
    color: colors.textInverse,
  },
  stepUpcoming: {
    backgroundColor: colors.surfaceSubtle,
    color: colors.textMuted,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
  },
  stepLabel: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    marginTop: '6px',
    textTransform: 'capitalize',
  },
  profileGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: spacing.lg,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    padding: spacing.lg,
    boxShadow: shadows.sm,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
  },
  profileStrengthBox: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: '#f8fafc',
    backgroundImage: 'linear-gradient(to right, #f8fafc, #eef2ff)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.primaryBorder,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  strengthBarBg: {
    width: '100%',
    backgroundColor: colors.border,
    height: '8px',
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    backgroundColor: '#4f46e5',
    backgroundImage: 'linear-gradient(to right, #4f46e5, #c026d3)',
    borderRadius: radii.full,
    transition: 'all 0.5s ease',
  },
  skillsBox: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: '12px',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    borderRadius: radii.md,
    minHeight: '56px',
  },
  skillChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    paddingTop: '4px',
    paddingBottom: '4px',
    paddingLeft: '12px',
    paddingRight: '8px',
    borderRadius: radii.md,
    fontSize: '0.75rem',
    fontWeight: 700,
    backgroundColor: colors.surface,
    color: colors.primaryHover,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.primaryBorder,
    boxShadow: shadows.sm,
  },
  removeSkillBtn: {
    padding: '2px',
    borderRadius: radii.full,
    backgroundColor: 'transparent',
    borderWidth: 0,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.textMuted,
  },
  addSkillRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: '10px',
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
  addBtn: {
    padding: '10px 16px',
    borderRadius: radii.md,
    fontSize: '0.75rem',
    fontWeight: 700,
    backgroundColor: colors.surfaceSubtle,
    color: colors.text,
    borderWidth: 0,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  uploadBox: {
    borderWidth: '2px',
    borderStyle: 'dashed',
    borderColor: colors.primaryBorder,
    borderRadius: radii.xl,
    padding: spacing.xl,
    textAlign: 'center',
    position: 'relative',
    cursor: 'pointer',
    backgroundColor: {
      default: 'transparent',
      ':hover': colors.primaryLight,
    },
    transition: 'all 0.15s ease',
  },
  fileInputHidden: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    opacity: 0,
    cursor: 'pointer',
  },
  primaryBtn: {
    paddingTop: '10px',
    paddingBottom: '10px',
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
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
    transition: 'background-color 0.15s ease',
  },
});

interface CandidateViewProps {
  activeTab: 'browse' | 'applications' | 'saved' | 'profile';
  setActiveTab: (tab: 'browse' | 'applications' | 'saved' | 'profile') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  locationFilter: string;
  setLocationFilter: (l: string) => void;
}

const POPULAR_SKILLS = [
  'React',
  'TypeScript',
  'Python',
  'Node.js',
  'AWS',
  'Docker',
  'PostgreSQL',
  'Next.js',
  'FastAPI',
  'GraphQL',
  'Kubernetes',
  'Redis',
  'SQL',
];

const STAGES: ApplicationStage[] = [
  'applied',
  'shortlisted',
  'interview',
  'offered',
  'hired',
];

const STAGE_LABELS: Record<string, string> = {
  applied: 'Application Sent',
  shortlisted: 'Shortlisted',
  interview: 'Interview Scheduled',
  offered: 'Offer Extended',
  hired: 'Hired 🎉',
  rejected: 'Not Selected',
};

export const CandidateView: React.FC<CandidateViewProps> = ({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  locationFilter,
  setLocationFilter,
}) => {
  const {
    currentUser,
    jobs,
    applications,
    savedJobs,
    companyProfiles,
    currentCandidateProfile,
    updateCandidateProfile,
    toggleAutoApply,
    handleResumeUpload,
    applyToJob,
    toggleSaveJob,
    isJobSaved,
    hasAppliedToJob,
    showToast,
  } = useApp();

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Filters
  const [workModeFilter, setWorkModeFilter] = useState<string>('All');
  const [expFilter, setExpFilter] = useState<string>('All');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'match' | 'newest'>('match');

  // Profile editing state
  const [headline, setHeadline] = useState(currentCandidateProfile?.headline || '');
  const [skillsText, setSkillsText] = useState(currentCandidateProfile?.skills || '');
  const [newSkillInput, setNewSkillInput] = useState('');
  const [resumeTextInput, setResumeTextInput] = useState('');
  const [detectedSkills, setDetectedSkills] = useState<string[]>([]);
  const [profileSavedNotice, setProfileSavedNotice] = useState(false);

  // Sync profile values if user switches
  React.useEffect(() => {
    if (currentCandidateProfile) {
      setHeadline(currentCandidateProfile.headline);
      setSkillsText(currentCandidateProfile.skills);
    }
  }, [currentCandidateProfile]);

  // Candidate active skills parsed as set
  const activeSkillsList = useMemo(() => {
    return Array.from(parseSkills(skillsText));
  }, [skillsText]);

  // Profile strength calculation
  const profileStrength = useMemo(() => {
    let score = 0;
    if (headline.trim().length > 10) score += 25;
    if (activeSkillsList.length >= 3) score += 25;
    if (activeSkillsList.length >= 6) score += 15;
    if (currentCandidateProfile?.resumeFilename) score += 20;
    if (currentCandidateProfile?.autoApply) score += 15;
    return Math.min(score, 100);
  }, [headline, activeSkillsList, currentCandidateProfile]);

  // Filtered & ranked jobs
  const filteredJobs = useMemo(() => {
    const candSkills = currentCandidateProfile?.skills || '';

    return jobs
      .filter((j) => {
        if (j.status !== 'active') return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = j.title.toLowerCase().includes(q);
          const matchCompany = j.companyName.toLowerCase().includes(q);
          const matchSkills = j.requiredSkills.toLowerCase().includes(q);
          if (!matchTitle && !matchCompany && !matchSkills) return false;
        }

        // Location
        if (locationFilter && locationFilter !== 'All India') {
          if (!j.location.toLowerCase().includes(locationFilter.toLowerCase())) return false;
        }

        // Work mode
        if (workModeFilter !== 'All' && j.workMode !== workModeFilter) return false;

        // Department
        if (deptFilter !== 'All' && j.department !== deptFilter) return false;

        // Experience
        if (expFilter === '0-2' && (j.expMin > 2 || j.expMax < 0)) return false;
        if (expFilter === '3-5' && (j.expMin > 5 || j.expMax < 3)) return false;
        if (expFilter === '6+' && j.expMax < 6) return false;

        return true;
      })
      .map((job) => ({
        ...job,
        matchPct: candSkills ? matchPct(candSkills, job.requiredSkills) : 0,
      }))
      .sort((a, b) => {
        if (sortBy === 'match') {
          return b.matchPct - a.matchPct;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [jobs, searchQuery, locationFilter, workModeFilter, deptFilter, expFilter, sortBy, currentCandidateProfile]);

  // Candidate applications
  const myApplications = useMemo(() => {
    if (!currentUser) return [];
    return applications
      .filter((a) => a.candidateId === currentUser.id)
      .map((app) => {
        const job = jobs.find((j) => j.id === app.jobId);
        return {
          ...app,
          job,
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [applications, jobs, currentUser]);

  // Saved jobs list
  const mySavedJobs = useMemo(() => {
    if (!currentUser) return [];
    const savedIds = new Set(
      savedJobs.filter((s) => s.candidateId === currentUser.id).map((s) => s.jobId)
    );
    return jobs.filter((j) => savedIds.has(j.id));
  }, [savedJobs, jobs, currentUser]);

  // Average compatibility score across all active jobs
  const averageMatchPct = useMemo(() => {
    if (filteredJobs.length === 0) return 0;
    const sum = filteredJobs.reduce((acc, j) => acc + (j.matchPct || 0), 0);
    return Math.round(sum / filteredJobs.length);
  }, [filteredJobs]);

  const hasActiveFilters =
    Boolean(searchQuery) ||
    Boolean(locationFilter && locationFilter !== 'All India') ||
    workModeFilter !== 'All' ||
    expFilter !== 'All' ||
    deptFilter !== 'All';

  const resetAllFilters = () => {
    setSearchQuery('');
    setLocationFilter('');
    setWorkModeFilter('All');
    setExpFilter('All');
    setDeptFilter('All');
  };

  const handleAddSkill = (skill: string) => {
    const trimmed = skill.trim().toLowerCase();
    if (!trimmed) return;
    const set = parseSkills(skillsText);
    if (!set.has(trimmed)) {
      set.add(trimmed);
      const updated = Array.from(set).join(', ');
      setSkillsText(updated);
      updateCandidateProfile({ skills: updated });
      showToast({
        type: 'success',
        title: 'Skill Added',
        message: `Added ${trimmed} to your profile stack`,
      });
    }
    setNewSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    const set = parseSkills(skillsText);
    set.delete(skillToRemove.toLowerCase());
    const updated = Array.from(set).join(', ');
    setSkillsText(updated);
    updateCandidateProfile({ skills: updated });
    showToast({
      type: 'info',
      title: 'Skill Removed',
      message: `Removed ${skillToRemove} from your profile`,
    });
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateCandidateProfile({
      headline,
      skills: skillsText,
    });
    setProfileSavedNotice(true);
    setTimeout(() => setProfileSavedNotice(false), 3000);
  };

  const handleSimulateResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sampleText = `Candidate CV proficient in ${skillsText || 'Python, JavaScript, React, Docker, SQL, AWS, TypeScript'}. Seeking engineering challenges.`;
    const extracted = handleResumeUpload(file.name, sampleText);
    setDetectedSkills(extracted);
    showToast({
      type: 'success',
      title: 'Resume Analyzed! 📄',
      message: `Found ${extracted.length} matching tech skills`,
    });
  };

  const handleAnalyzePastedResume = () => {
    if (!resumeTextInput.trim()) return;
    const extracted = handleResumeUpload('pasted_resume.txt', resumeTextInput);
    setDetectedSkills(extracted);
    showToast({
      type: 'success',
      title: 'Text Processed ✨',
      message: `Identified ${extracted.length} technical skills`,
    });
  };

  const addDetectedSkillsToProfile = () => {
    const existing = parseSkills(skillsText);
    for (const s of detectedSkills) {
      existing.add(s.toLowerCase());
    }
    const combined = Array.from(existing).join(', ');
    setSkillsText(combined);
    updateCandidateProfile({ skills: combined });
    setDetectedSkills([]);
    showToast({
      type: 'success',
      title: 'Skills Imported! 🎉',
      message: `Profile updated with new skills`,
    });
  };

  return (
    <div {...stylex.props(styles.container)}>
      {/* Top Hero Banner */}
      <div {...stylex.props(styles.heroBanner)}>
        <div {...stylex.props(styles.heroContent)}>
          <div {...stylex.props(styles.heroLeft)}>
            <div {...stylex.props(styles.heroPill)}>
              <Sparkles size={14} color="#a5b4fc" />
              <span>Semantic Skill Matching Engine</span>
            </div>
            <h1 {...stylex.props(styles.heroTitle)}>
              Roles ranked by what you actually build.
            </h1>
            <p {...stylex.props(styles.heroSubtitle)}>
              Transparent compatibility scoring with credit for aliases (Postgres → PostgreSQL),
              related technologies, and zero resume black holes.
            </p>

            {/* Quick Skill Search Tags */}
            <div {...stylex.props(styles.heroTrending)}>
              <span {...stylex.props(styles.heroTrendingLabel)}>
                Trending:
              </span>
              {['React', 'Python', 'TypeScript', 'Remote', 'Node.js'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSearchQuery(tag)}
                  {...stylex.props(styles.heroTag)}
                >
                  +{tag}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Metrics & Auto-Apply Card */}
          <div {...stylex.props(styles.heroRight)}>
            {/* Live Stats Row */}
            <div {...stylex.props(styles.statsGrid)}>
              <div {...stylex.props(styles.statCard)}>
                <span {...stylex.props(styles.statLabel)}>Active Roles</span>
                <span {...stylex.props(styles.statValue)}>
                  {jobs.filter((j) => j.status === 'active').length}
                </span>
                <span {...stylex.props(styles.statSub)}>Live in India</span>
              </div>

              <div {...stylex.props(styles.statCard)}>
                <span {...stylex.props(styles.statLabel)}>Avg Compatibility</span>
                <span {...stylex.props(styles.statValue)}>
                  {averageMatchPct}%
                </span>
                <span {...stylex.props(styles.statSub)}>Across listings</span>
              </div>
            </div>

            {/* Auto-Apply Controller */}
            <div {...stylex.props(styles.autoApplyBox)}>
              <div {...stylex.props(styles.autoApplyLeft)}>
                <div
                  {...stylex.props(
                    styles.autoApplyIconBox,
                    currentCandidateProfile?.autoApply
                      ? styles.autoApplyIconActive
                      : styles.autoApplyIconInactive
                  )}
                >
                  <Zap size={16} />
                </div>
                <div>
                  <div {...stylex.props(styles.autoApplyTitle)}>
                    <span>Auto-Apply</span>
                    {currentCandidateProfile?.autoApply && (
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#34d399' }} />
                    )}
                  </div>
                  <p {...stylex.props(styles.autoApplySub)}>
                    {currentCandidateProfile?.autoApply ? 'Applying to ≥1% match' : 'Automated apply is off'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => toggleAutoApply(!currentCandidateProfile?.autoApply)}
                {...stylex.props(
                  styles.autoApplyBtn,
                  currentCandidateProfile?.autoApply
                    ? styles.autoApplyBtnActive
                    : styles.autoApplyBtnInactive
                )}
              >
                {currentCandidateProfile?.autoApply ? 'Turn Off' : 'Turn On'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div {...stylex.props(styles.tabNav)}>
        <button
          onClick={() => setActiveTab('browse')}
          {...stylex.props(styles.tabItem, activeTab === 'browse' ? styles.tabItemActive : styles.tabItemInactive)}
        >
          <Search size={16} />
          <span>Browse Jobs ({filteredJobs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('applications')}
          {...stylex.props(styles.tabItem, activeTab === 'applications' ? styles.tabItemActive : styles.tabItemInactive)}
        >
          <Layers size={16} />
          <span>My Applications ({myApplications.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('saved')}
          {...stylex.props(styles.tabItem, activeTab === 'saved' ? styles.tabItemActive : styles.tabItemInactive)}
        >
          <Bookmark size={16} />
          <span>Saved Jobs ({mySavedJobs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          {...stylex.props(styles.tabItem, activeTab === 'profile' ? styles.tabItemActive : styles.tabItemInactive)}
        >
          <FileText size={16} />
          <span>Profile &amp; Resume</span>
        </button>
      </div>

      {/* TAB 1: BROWSE JOBS */}
      {activeTab === 'browse' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Filter Bar with Active Badges */}
          <div {...stylex.props(styles.filterBar)}>
            <div {...stylex.props(styles.filterPillRow)}>
              {/* Work Mode */}
              <div {...stylex.props(styles.filterGroup)}>
                <span {...stylex.props(styles.filterLabel)}>Mode:</span>
                {['All', 'Remote', 'Hybrid', 'On-site'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setWorkModeFilter(mode)}
                    {...stylex.props(
                      styles.filterPill,
                      workModeFilter === mode ? styles.filterPillActive : styles.filterPillInactive
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <div {...stylex.props(styles.filterDivider)} />

              {/* Experience */}
              <div {...stylex.props(styles.filterGroup)}>
                <span {...stylex.props(styles.filterLabel)}>Exp:</span>
                {[
                  { label: 'All', val: 'All' },
                  { label: '0-2y', val: '0-2' },
                  { label: '3-5y', val: '3-5' },
                  { label: '6y+', val: '6+' },
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => setExpFilter(item.val)}
                    {...stylex.props(
                      styles.filterPill,
                      expFilter === item.val ? styles.filterPillActive : styles.filterPillInactive
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div {...stylex.props(styles.filterDivider)} />

              {/* Department */}
              <div {...stylex.props(styles.filterGroup)}>
                <span {...stylex.props(styles.filterLabel)}>Dept:</span>
                {['All', 'Engineering', 'Data Science'].map((dept) => (
                  <button
                    key={dept}
                    onClick={() => setDeptFilter(dept)}
                    {...stylex.props(
                      styles.filterPill,
                      deptFilter === dept ? styles.filterPillActive : styles.filterPillInactive
                    )}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort & Reset Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {hasActiveFilters && (
                <button
                  onClick={resetAllFilters}
                  {...stylex.props(styles.resetBtn)}
                >
                  <RotateCcw size={14} />
                  <span>Reset</span>
                </button>
              )}

              <div {...stylex.props(styles.sortGroup)}>
                <ArrowUpDown size={14} color="#94a3b8" />
                <span {...stylex.props(styles.filterLabel)}>Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'match' | 'newest')}
                  {...stylex.props(styles.sortSelect)}
                >
                  <option value="match">Match % (High to Low)</option>
                  <option value="newest">Recently Posted</option>
                </select>
              </div>
            </div>
          </div>

          {/* Job Cards Grid */}
          {filteredJobs.length > 0 ? (
            <div {...stylex.props(styles.jobGrid)}>
              {filteredJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  candidateProfile={currentCandidateProfile}
                  hasApplied={hasAppliedToJob(job.id)}
                  isSaved={isJobSaved(job.id)}
                  onSelect={(j) => setSelectedJob(j)}
                  onApply={(id) => applyToJob(id, 'manual')}
                  onToggleSave={(id) => toggleSaveJob(id)}
                />
              ))}
            </div>
          ) : (
            <div {...stylex.props(styles.emptyCard)}>
              <Search size={48} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
                No matching roles found
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '400px', margin: '0 auto 16px' }}>
                We couldn't find any listings matching your active filters. Try expanding your search or resetting filters.
              </p>
              <button
                onClick={resetAllFilters}
                {...stylex.props(styles.primaryBtn)}
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY APPLICATIONS */}
      {activeTab === 'applications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Application Pipeline</h2>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Real-time recruiter pipeline tracking
            </span>
          </div>

          {myApplications.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {myApplications.map((app) => {
                const currentStageIndex = STAGES.indexOf(app.status as any);

                return (
                  <div key={app.id} {...stylex.props(styles.appCard)}>
                    {/* Header */}
                    <div {...stylex.props(styles.appHeader)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div {...stylex.props(styles.appCompanyAvatar)}>
                          {app.job?.companyName?.[0] || 'C'}
                        </div>
                        <div>
                          <h3
                            onClick={() => app.job && setSelectedJob(app.job)}
                            style={{ fontWeight: 700, color: '#0f172a', cursor: 'pointer', margin: 0, fontSize: '1rem' }}
                          >
                            {app.job?.title || 'Job Posting'}
                          </h3>
                          <p style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600, margin: '2px 0 0' }}>
                            {app.job?.companyName}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '0.75rem', color: '#94a3b8' }}>
                            <span>Applied {new Date(app.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span style={{ fontWeight: 700, color: '#4f46e5' }}>{app.matchPct}% Match</span>
                            <span>•</span>
                            <span style={{ textTransform: 'capitalize' }}>{app.source === 'auto' ? '⚡ Auto-applied' : 'Direct Apply'}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ padding: '4px 12px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', backgroundColor: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' }}>
                          {STAGE_LABELS[app.status] || app.status}
                        </span>
                        {app.job && (
                          <button
                            onClick={() => setSelectedJob(app.job!)}
                            style={{ padding: '8px', borderRadius: '8px', color: '#94a3b8', backgroundColor: 'transparent', border: 0, cursor: 'pointer' }}
                            title="View job details"
                          >
                            <ChevronRight size={20} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Visual 5-Step Pipeline Progress Indicator */}
                    <div {...stylex.props(styles.pipelineGrid)}>
                      {STAGES.map((stg, idx) => {
                        const isCompleted = currentStageIndex >= idx;
                        const isCurrent = app.status === stg;

                        return (
                          <div key={stg} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div
                              {...stylex.props(
                                styles.pipelineStepDot,
                                isCurrent
                                  ? styles.stepActive
                                  : isCompleted
                                  ? styles.stepCompleted
                                  : styles.stepUpcoming
                              )}
                            >
                              {isCompleted && !isCurrent ? '✓' : idx + 1}
                            </div>
                            <span
                              {...stylex.props(styles.stepLabel)}
                              style={{ color: isCurrent ? '#4f46e5' : isCompleted ? '#0f172a' : '#94a3b8' }}
                            >
                              {stg}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Recruiter Note if any */}
                    {app.notes && (
                      <div style={{ fontSize: '0.75rem', backgroundColor: '#eef2ff', border: '1px solid #c7d2fe', padding: '10px 14px', borderRadius: '10px', color: '#1e1b4b', display: 'flex', gap: '6px' }}>
                        <strong>Recruiter Note:</strong>
                        <span>{app.notes}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div {...stylex.props(styles.emptyCard)}>
              <Layers size={48} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
                No applications yet
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '360px', margin: '0 auto 16px' }}>
                Explore recommended jobs matching your skills or turn on Auto-Apply to apply automatically.
              </p>
              <button
                onClick={() => setActiveTab('browse')}
                {...stylex.props(styles.primaryBtn)}
              >
                Browse Open Roles
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SAVED JOBS */}
      {activeTab === 'saved' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Saved Opportunities</h2>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Bookmarked roles for later review
            </span>
          </div>

          {mySavedJobs.length > 0 ? (
            <div {...stylex.props(styles.jobGrid)}>
              {mySavedJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  candidateProfile={currentCandidateProfile}
                  hasApplied={hasAppliedToJob(job.id)}
                  isSaved={true}
                  onSelect={(j) => setSelectedJob(j)}
                  onApply={(id) => applyToJob(id, 'manual')}
                  onToggleSave={(id) => toggleSaveJob(id)}
                />
              ))}
            </div>
          ) : (
            <div {...stylex.props(styles.emptyCard)}>
              <Bookmark size={48} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
                No saved jobs
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '360px', margin: '0 auto 16px' }}>
                Click the bookmark icon on any job card to save it for later review.
              </p>
              <button
                onClick={() => setActiveTab('browse')}
                {...stylex.props(styles.primaryBtn)}
              >
                Browse Jobs
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PROFILE & RESUME */}
      {activeTab === 'profile' && (
        <div {...stylex.props(styles.profileGrid)}>
          {/* Left Column: Profile Form & Interactive Skills Tag Editor */}
          <div {...stylex.props(styles.profileCard)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Candidate Profile</h2>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0' }}>
                  Your skills power the semantic matching engine for all job listings.
                </p>
              </div>
              {profileSavedNotice && (
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#065f46', backgroundColor: '#ecfdf5', padding: '6px 12px', borderRadius: '10px', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={16} color="#059669" /> Changes saved!
                </span>
              )}
            </div>

            {/* Profile Strength Meter */}
            <div {...stylex.props(styles.profileStrengthBox)}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingUp size={16} color="#4f46e5" />
                  <span>Profile Completeness: {profileStrength}%</span>
                </span>
                <span style={{ fontWeight: 600, color: '#4338ca' }}>
                  {profileStrength >= 80 ? 'All-Star ⭐' : 'Intermediate'}
                </span>
              </div>
              <div {...stylex.props(styles.strengthBarBg)}>
                <div
                  {...stylex.props(styles.strengthBarFill)}
                  style={{ width: `${profileStrength}%` }}
                />
              </div>
              <p style={{ fontSize: '0.6875rem', color: '#64748b', margin: 0 }}>
                {profileStrength < 80
                  ? 'Tip: Upload a resume and add 5+ skills to unlock higher recruiter match visibility.'
                  : 'Your profile has optimal skill coverage for auto-apply and recruiter searches.'}
              </p>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '6px' }}>
                  Professional Headline
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Senior Backend Engineer | Python & Distributed Systems"
                  {...stylex.props(styles.input)}
                  required
                />
              </div>

              {/* Interactive Skill Tag Editor */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
                    Your Technical Stack ({activeSkillsList.length} skills)
                  </label>
                  <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Click &times; to remove</span>
                </div>

                {/* Active Skill Chips */}
                <div {...stylex.props(styles.skillsBox)}>
                  {activeSkillsList.length > 0 ? (
                    activeSkillsList.map((skill) => (
                      <span key={skill} {...stylex.props(styles.skillChip)}>
                        <span>{skill}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          {...stylex.props(styles.removeSkillBtn)}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', padding: '4px' }}>No skills added yet.</span>
                  )}
                </div>

                {/* Add New Skill Input */}
                <div {...stylex.props(styles.addSkillRow)}>
                  <input
                    type="text"
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        handleAddSkill(newSkillInput);
                      }
                    }}
                    placeholder="Type a skill and press Enter (e.g. Docker, GraphQL)..."
                    {...stylex.props(styles.input)}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSkill(newSkillInput)}
                    {...stylex.props(styles.addBtn)}
                  >
                    <Plus size={14} />
                    <span>Add</span>
                  </button>
                </div>

                {/* Popular Skills Cloud (Click-to-Add) */}
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
                    Suggested Tech Skills (Click to add)
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {POPULAR_SKILLS.map((sk) => {
                      const isAdded = activeSkillsList.includes(sk.toLowerCase());
                      return (
                        <button
                          key={sk}
                          type="button"
                          disabled={isAdded}
                          onClick={() => handleAddSkill(sk)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: isAdded ? 'default' : 'pointer',
                            backgroundColor: isAdded ? '#f1f5f9' : '#eef2ff',
                            color: isAdded ? '#94a3b8' : '#4338ca',
                            border: '1px solid #c7d2fe',
                          }}
                        >
                          {isAdded ? `✓ ${sk}` : `+ ${sk}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Job alerts & auto-apply preferences */}
              <div style={{ paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={currentCandidateProfile?.autoApply || false}
                    onChange={(e) => toggleAutoApply(e.target.checked)}
                  />
                  <div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                      Enable Auto-Apply Mode
                    </span>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0' }}>
                      Automatically submit applications when skill compatibility is ≥ 1%.
                    </p>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={currentCandidateProfile?.jobAlerts || false}
                    onChange={(e) =>
                      updateCandidateProfile({ jobAlerts: e.target.checked })
                    }
                  />
                  <div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                      Skill-Matched Daily Alerts
                    </span>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0' }}>
                      Receive instant notifications when new jobs matching your tech stack are posted.
                    </p>
                  </div>
                </label>
              </div>

              <div style={{ paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  {...stylex.props(styles.primaryBtn)}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Resume & Skill Extractor */}
          <div {...stylex.props(styles.profileCard)}>
            <div>
              <h3 style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem', margin: '0 0 4px' }}>
                Resume &amp; Skill Extractor
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                Upload a resume or paste text to auto-detect tech skills into your profile.
              </p>
            </div>

            {/* Upload file box */}
            <div {...stylex.props(styles.uploadBox)}>
              <UploadCloud size={36} color="#4f46e5" style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e1b4b', margin: 0 }}>
                Upload Resume (PDF / DOCX / TXT)
              </p>
              <p style={{ fontSize: '0.6875rem', color: '#94a3b8', margin: '2px 0 0' }}>
                Drag &amp; drop or click to browse
              </p>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleSimulateResumeUpload}
                {...stylex.props(styles.fileInputHidden)}
              />
            </div>

            {currentCandidateProfile?.resumeFilename && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <FileText size={16} color="#4f46e5" style={{ flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {currentCandidateProfile.resumeFilename}
                  </span>
                </div>
                <span style={{ fontSize: '0.625rem', fontWeight: 800, color: '#065f46', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '4px', border: '1px solid #a7f3d0' }}>
                  Active CV
                </span>
              </div>
            )}

            {/* Or paste text */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                Or Paste Resume Summary:
              </label>
              <textarea
                rows={3}
                value={resumeTextInput}
                onChange={(e) => setResumeTextInput(e.target.value)}
                placeholder="Paste bio, work history, or bullet points here to extract skills..."
                {...stylex.props(styles.input)}
              />
              <button
                type="button"
                onClick={handleAnalyzePastedResume}
                {...stylex.props(styles.addBtn)}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Analyze Text
              </button>
            </div>

            {/* Detected Skills Box */}
            {detectedSkills.length > 0 && (
              <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#eef2ff', border: '1px solid #c7d2fe', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={16} color="#4f46e5" />
                    Detected {detectedSkills.length} Skills
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {detectedSkills.map((s) => (
                    <span
                      key={s}
                      style={{ padding: '4px 10px', borderRadius: '8px', backgroundColor: '#fff', color: '#4338ca', fontWeight: 700, fontSize: '0.75rem', border: '1px solid #c7d2fe' }}
                    >
                      +{s}
                    </span>
                  ))}
                </div>
                <button
                  onClick={addDetectedSkillsToProfile}
                  {...stylex.props(styles.primaryBtn)}
                  style={{ width: '100%' }}
                >
                  Add Detected Skills to Stack
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Job Detail Modal */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          companyProfile={companyProfiles[selectedJob.employerId]}
          candidateProfile={currentCandidateProfile}
          hasApplied={hasAppliedToJob(selectedJob.id)}
          isSaved={isJobSaved(selectedJob.id)}
          onClose={() => setSelectedJob(null)}
          onApply={(id) => applyToJob(id, 'manual')}
          onToggleSave={(id) => toggleSaveJob(id)}
        />
      )}
    </div>
  );
};
