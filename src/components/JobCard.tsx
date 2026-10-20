import React, { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Job, CandidateProfile } from '../types';
import { matchDetail } from '../services/matching';
import { CompanyAvatar } from './CompanyAvatar';
import { useApp } from '../context/AppContext';
import {
  MapPin,
  Briefcase,
  CheckCircle2,
  Bookmark,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Share2,
} from 'lucide-react';
import { colors, spacing, radii, shadows } from '../theme/tokens.stylex';

const styles = stylex.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: {
      default: colors.border,
      ':hover': colors.primaryBorder,
    },
    boxShadow: {
      default: shadows.sm,
      ':hover': shadows.lg,
    },
    transition: 'all 0.2s ease',
    padding: spacing.lg,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    backgroundColor: '#34d399',
    backgroundImage: 'linear-gradient(to right, #34d399, #14b8a6, #6366f1)',
  },
  topRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  companyGroup: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  jobTitle: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: {
      default: colors.text,
      ':hover': colors.primary,
    },
    cursor: 'pointer',
    margin: 0,
    lineHeight: 1.3,
    transition: 'color 0.15s ease',
  },
  newBadge: {
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '8px',
    paddingRight: '8px',
    borderRadius: radii.full,
    fontSize: '0.625rem',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    backgroundColor: colors.dangerLight,
    color: colors.dangerText,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.dangerBorder,
    flexShrink: 0,
  },
  companyMeta: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: colors.textSecondary,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '2px',
    margin: 0,
  },
  dot: {
    color: colors.borderStrong,
  },
  department: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: colors.textMuted,
  },
  quickActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
  },
  actionBtn: {
    padding: '8px',
    borderRadius: radii.md,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    backgroundColor: {
      default: colors.surface,
      ':hover': colors.surfaceSubtle,
    },
    color: {
      default: colors.textMuted,
      ':hover': colors.textSecondary,
    },
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  actionBtnSaved: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warningBorder,
    color: colors.warningText,
  },
  matchRow: {
    marginTop: '14px',
    paddingTop: '12px',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: colors.border,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  matchBadgeBase: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    paddingTop: '4px',
    paddingBottom: '4px',
    paddingLeft: '12px',
    paddingRight: '12px',
    borderRadius: radii.full,
    borderWidth: '1px',
    borderStyle: 'solid',
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  matchBadgeHigh: {
    backgroundColor: colors.successLight,
    color: colors.successText,
    borderColor: colors.successBorder,
  },
  matchBadgeMed: {
    backgroundColor: colors.primaryLight,
    color: colors.primaryHover,
    borderColor: colors.primaryBorder,
  },
  matchBadgeLow: {
    backgroundColor: colors.surfaceSubtle,
    color: colors.textSecondary,
    borderColor: colors.border,
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    maxWidth: '120px',
  },
  progressBarBg: {
    width: '100%',
    backgroundColor: colors.surfaceSubtle,
    height: '6px',
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.full,
    transition: 'all 0.5s ease',
  },
  progressBarHigh: {
    backgroundColor: colors.success,
  },
  progressBarMed: {
    backgroundColor: colors.primary,
  },
  progressBarLow: {
    backgroundColor: colors.textMuted,
  },
  metaChips: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: '14px',
    fontSize: '0.75rem',
    fontWeight: 500,
    color: colors.textSecondary,
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    paddingTop: '4px',
    paddingBottom: '4px',
    paddingLeft: '10px',
    paddingRight: '10px',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubtle,
    color: colors.textSecondary,
  },
  chipIcon: {
    width: '14px',
    height: '14px',
    color: colors.textMuted,
  },
  salaryChip: {
    backgroundColor: colors.successLight,
    color: colors.successText,
    fontWeight: 700,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.successBorder,
  },
  typeChip: {
    backgroundColor: colors.primaryLight,
    color: colors.primaryHover,
    fontWeight: 700,
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '8px',
    paddingRight: '8px',
    borderRadius: radii.sm,
    fontSize: '0.6875rem',
  },
  skillsSection: {
    marginTop: spacing.md,
    paddingTop: '12px',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: colors.border,
  },
  skillsHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '0.6875rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  skillsSubtext: {
    fontSize: '0.625rem',
    textTransform: 'lowercase',
    fontWeight: 400,
    color: colors.textMuted,
  },
  skillsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  skillTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    paddingTop: '4px',
    paddingBottom: '4px',
    paddingLeft: '10px',
    paddingRight: '10px',
    borderRadius: radii.sm,
    fontSize: '0.75rem',
    fontWeight: 600,
    borderWidth: '1px',
    borderStyle: 'solid',
    transition: 'all 0.15s ease',
  },
  skillMatched: {
    backgroundColor: colors.successLight,
    color: colors.successText,
    borderColor: colors.successBorder,
  },
  skillPartial: {
    backgroundColor: colors.primaryLight,
    color: colors.primaryHover,
    borderColor: colors.primaryBorder,
  },
  skillMissing: {
    backgroundColor: colors.surfaceSubtle,
    color: colors.textSecondary,
    borderColor: colors.border,
    opacity: 0.85,
  },
  footer: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: colors.border,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  reportBtn: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: {
      default: colors.primary,
      ':hover': colors.primaryHover,
    },
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: 'transparent',
    borderWidth: 0,
    cursor: 'pointer',
    padding: 0,
    transition: 'color 0.15s ease',
  },
  appliedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    paddingTop: '6px',
    paddingBottom: '6px',
    paddingLeft: '14px',
    paddingRight: '14px',
    borderRadius: radii.md,
    backgroundColor: colors.successLight,
    color: colors.successText,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.successBorder,
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  applyBtn: {
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
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
    boxShadow: '0 1px 3px rgba(79, 70, 229, 0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'background-color 0.15s ease, transform 0.1s ease',
  },
});

interface JobCardProps {
  job: Job;
  candidateProfile: CandidateProfile | null;
  hasApplied: boolean;
  isSaved: boolean;
  onSelect: (job: Job) => void;
  onApply: (jobId: number) => void;
  onToggleSave: (jobId: number) => void;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  candidateProfile,
  hasApplied,
  isSaved,
  onSelect,
  onApply,
  onToggleSave,
}) => {
  const { showToast } = useApp();
  const [, setCopied] = useState(false);

  const candSkills = candidateProfile?.skills || '';
  const match = matchDetail(candSkills, job.requiredSkills);

  // Match score visual styling
  const isHighMatch = match.pct >= 75;
  const isMedMatch = match.pct >= 40 && match.pct < 75;

  const isNew =
    new Date().getTime() - new Date(job.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/#job-${job.id}`;
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        showToast({
          type: 'success',
          title: 'Link Copied 📋',
          message: `Shareable link for ${job.title} copied to clipboard`,
        });
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div {...stylex.props(styles.card)}>
      {/* Top Accent Glow on high match */}
      {candSkills && isHighMatch && <div {...stylex.props(styles.topGlow)} />}

      {/* Main Content */}
      <div>
        <div {...stylex.props(styles.topRow)}>
          <div {...stylex.props(styles.companyGroup)}>
            <CompanyAvatar name={job.companyName} size="md" showVerified={true} />
            <div {...stylex.props(styles.headerInfo)}>
              <div {...stylex.props(styles.titleRow)}>
                <h3
                  onClick={() => onSelect(job)}
                  {...stylex.props(styles.jobTitle)}
                >
                  {job.title}
                </h3>
                {isNew && (
                  <span {...stylex.props(styles.newBadge)}>
                    New
                  </span>
                )}
              </div>
              <p {...stylex.props(styles.companyMeta)}>
                <span>{job.companyName}</span>
                <span {...stylex.props(styles.dot)}>•</span>
                <span {...stylex.props(styles.department)}>{job.department}</span>
              </p>
            </div>
          </div>

          {/* Quick Actions (Share & Bookmark) */}
          <div {...stylex.props(styles.quickActions)}>
            <button
              onClick={handleShare}
              {...stylex.props(styles.actionBtn)}
              title="Share job link"
            >
              <Share2 size={16} />
            </button>
            <button
              onClick={() => onToggleSave(job.id)}
              {...stylex.props(styles.actionBtn, isSaved && styles.actionBtnSaved)}
              title={isSaved ? 'Remove from saved' : 'Save job'}
            >
              <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>

        {/* Match Compatibility Meter Pill */}
        {candSkills ? (
          <div {...stylex.props(styles.matchRow)}>
            <div
              {...stylex.props(
                styles.matchBadgeBase,
                isHighMatch
                  ? styles.matchBadgeHigh
                  : isMedMatch
                  ? styles.matchBadgeMed
                  : styles.matchBadgeLow
              )}
            >
              <Sparkles size={14} />
              <span>{match.pct}% Skill Compatibility</span>
            </div>

            <div {...stylex.props(styles.progressContainer)}>
              <div {...stylex.props(styles.progressBarBg)}>
                <div
                  {...stylex.props(
                    styles.progressFill,
                    isHighMatch
                      ? styles.progressBarHigh
                      : isMedMatch
                      ? styles.progressBarMed
                      : styles.progressBarLow
                  )}
                  style={{ width: `${Math.min(match.pct, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ) : null}

        {/* Job Metadata Chips */}
        <div {...stylex.props(styles.metaChips)}>
          <span {...stylex.props(styles.chip)}>
            <MapPin {...stylex.props(styles.chipIcon)} />
            {job.location} ({job.workMode})
          </span>
          <span {...stylex.props(styles.chip)}>
            <Briefcase {...stylex.props(styles.chipIcon)} />
            {job.expMin} - {job.expMax} yrs
          </span>
          <span {...stylex.props(styles.chip, styles.salaryChip)}>
            {job.hideSalary
              ? 'Salary Undisclosed'
              : `₹${job.salaryMin} - ${job.salaryMax} LPA`}
          </span>
          <span {...stylex.props(styles.typeChip)}>
            {job.employmentType}
          </span>
        </div>

        {/* Skills Breakdown Tags */}
        <div {...stylex.props(styles.skillsSection)}>
          <div {...stylex.props(styles.skillsHeader)}>
            <span>Required Skills</span>
            {candSkills && (
              <span {...stylex.props(styles.skillsSubtext)}>
                {match.matched.length} matched • {match.missing.length} missing
              </span>
            )}
          </div>
          <div {...stylex.props(styles.skillsList)}>
            {job.requiredSkills.split(',').map((s) => {
              const skill = s.trim();
              const isMatched = match.matched.includes(skill.toLowerCase());
              const partialMatch = match.partial.find(
                (p) => p.skill.toLowerCase() === skill.toLowerCase()
              );

              return (
                <span
                  key={skill}
                  title={
                    isMatched
                      ? 'Exact skill match'
                      : partialMatch
                      ? `Related credit (${partialMatch.pct}%) via ${partialMatch.via}`
                      : 'Missing from your profile'
                  }
                  {...stylex.props(
                    styles.skillTag,
                    isMatched
                      ? styles.skillMatched
                      : partialMatch
                      ? styles.skillPartial
                      : styles.skillMissing
                  )}
                >
                  {isMatched && <CheckCircle2 size={14} color="#059669" />}
                  {partialMatch && <Sparkles size={14} color="#6366f1" />}
                  <span>{skill}</span>
                  {partialMatch && (
                    <span style={{ fontSize: '10px', color: '#6366f1', fontWeight: 'bold' }}>
                      {partialMatch.pct}%
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Card Actions Footer */}
      <div {...stylex.props(styles.footer)}>
        <button
          onClick={() => onSelect(job)}
          {...stylex.props(styles.reportBtn)}
        >
          <span>Match Report</span>
          <ArrowRight size={14} />
        </button>

        {hasApplied ? (
          <span {...stylex.props(styles.appliedBadge)}>
            <ShieldCheck size={16} />
            Applied
          </span>
        ) : (
          <button
            onClick={() => onApply(job.id)}
            {...stylex.props(styles.applyBtn)}
          >
            Apply Now
          </button>
        )}
      </div>
    </div>
  );
};
