import React, { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Job, CandidateProfile, CompanyProfile } from '../types';
import { matchDetail } from '../services/matching';
import { CompanyAvatar } from './CompanyAvatar';
import { useApp } from '../context/AppContext';
import {
  X,
  Building2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Bookmark,
  Send,
  ExternalLink,
  ShieldCheck,
  Share2,
} from 'lucide-react';
import { colors, spacing, radii, shadows } from '../theme/tokens.stylex';

const styles = stylex.create({
  overlay: {
    position: 'fixed',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    overflowY: 'auto',
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
    maxWidth: '768px',
    width: '100%',
    maxHeight: '92vh',
    overflow: 'hidden',
    boxShadow: shadows.xl,
    display: 'flex',
    flexDirection: 'column',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
  },
  header: {
    padding: spacing.lg,
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: colors.border,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.surfaceSubtle,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  tagList: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    fontSize: '0.75rem',
  },
  deptBadge: {
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '10px',
    paddingRight: '10px',
    borderRadius: radii.full,
    fontWeight: 700,
    backgroundColor: colors.primaryLight,
    color: colors.primaryHover,
  },
  dot: {
    color: colors.borderStrong,
  },
  metaText: {
    fontWeight: 600,
    color: colors.textSecondary,
  },
  jobTitle: {
    fontSize: '1.375rem',
    fontWeight: 900,
    color: colors.text,
    marginTop: '4px',
    margin: 0,
    lineHeight: 1.2,
  },
  companyName: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: colors.primary,
    marginTop: '2px',
    margin: 0,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
  },
  iconBtn: {
    padding: '8px',
    borderRadius: radii.md,
    color: {
      default: colors.textMuted,
      ':hover': colors.text,
    },
    backgroundColor: {
      default: 'transparent',
      ':hover': colors.border,
    },
    borderWidth: 0,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  body: {
    padding: spacing.lg,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
  },
  matchBanner: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    background: 'linear-gradient(to right, #eef2ff, #faf5ff, #eef2ff)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.primaryBorder,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  matchHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  matchHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  matchIconBox: {
    width: '32px',
    height: '32px',
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    color: colors.textInverse,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
  },
  matchTitle: {
    fontWeight: 900,
    color: colors.text,
    fontSize: '0.875rem',
    margin: 0,
  },
  matchSubtitle: {
    fontSize: '0.6875rem',
    color: colors.textSecondary,
    margin: 0,
  },
  matchBadgeText: {
    fontSize: '0.75rem',
    fontWeight: 900,
    paddingTop: '4px',
    paddingBottom: '4px',
    paddingLeft: '12px',
    paddingRight: '12px',
    borderRadius: radii.full,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  matchBadgeHigh: {
    backgroundColor: colors.successLight,
    color: colors.successText,
  },
  matchBadgeMed: {
    backgroundColor: colors.primaryLight,
    color: colors.primaryHover,
  },
  matchBadgeLow: {
    backgroundColor: colors.surfaceSubtle,
    color: colors.textSecondary,
  },
  matchGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: spacing.sm,
    fontSize: '0.75rem',
  },
  matchCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: '14px',
    borderRadius: radii.md,
    borderWidth: '1px',
    borderStyle: 'solid',
    boxShadow: shadows.sm,
  },
  exactCard: {
    borderColor: colors.successBorder,
  },
  creditCard: {
    borderColor: colors.primaryBorder,
  },
  missingCard: {
    borderColor: colors.border,
  },
  matchCardTitle: {
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: spacing.sm,
  },
  exactTitle: {
    color: colors.successText,
  },
  creditTitle: {
    color: colors.primaryHover,
  },
  missingTitle: {
    color: colors.textSecondary,
  },
  tagRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  creditCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  exactTag: {
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '8px',
    paddingRight: '8px',
    borderRadius: radii.sm,
    backgroundColor: colors.successLight,
    color: colors.successText,
    fontWeight: 700,
    fontSize: '0.6875rem',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.successBorder,
  },
  creditTag: {
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '8px',
    paddingRight: '8px',
    borderRadius: radii.sm,
    backgroundColor: colors.primaryLight,
    color: colors.primaryHover,
    fontWeight: 600,
    fontSize: '0.6875rem',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.primaryBorder,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '6px',
    boxSizing: 'border-box',
  },
  creditPct: {
    fontSize: '0.625rem',
    color: colors.primary,
    fontWeight: 700,
  },
  missingTag: {
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '8px',
    paddingRight: '8px',
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSubtle,
    color: colors.textSecondary,
    fontWeight: 500,
    fontSize: '0.6875rem',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
  },
  emptyText: {
    color: colors.textMuted,
    fontStyle: 'italic',
    fontSize: '0.6875rem',
  },
  fullCoverageText: {
    color: colors.success,
    fontWeight: 700,
    fontSize: '0.6875rem',
  },
  snapshotGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: spacing.sm,
  },
  snapshotCard: {
    padding: '14px',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
  },
  snapshotLabel: {
    fontSize: '0.625rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: colors.textMuted,
    display: 'block',
  },
  snapshotValue: {
    fontSize: '0.875rem',
    fontWeight: 800,
    color: colors.text,
    marginTop: '2px',
    display: 'block',
  },
  sectionTitle: {
    fontSize: '0.75rem',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: colors.text,
    marginBottom: spacing.sm,
    margin: 0,
  },
  descriptionBox: {
    fontSize: '0.875rem',
    color: colors.textSecondary,
    lineHeight: 1.6,
    whiteSpace: 'pre-line',
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
  },
  companyBox: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
    fontSize: '0.75rem',
  },
  companyTitle: {
    fontWeight: 700,
    color: colors.text,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    margin: 0,
    fontSize: '0.75rem',
  },
  companyDesc: {
    color: colors.textSecondary,
    lineHeight: 1.5,
    margin: 0,
  },
  companyMetaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.md,
    color: colors.textSecondary,
    paddingTop: '4px',
  },
  link: {
    color: colors.primary,
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontWeight: 600,
  },
  contactForm: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.primaryBorder,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  contactHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactTitle: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: colors.primaryActive,
  },
  cancelBtn: {
    fontSize: '0.75rem',
    color: colors.textMuted,
    backgroundColor: 'transparent',
    borderWidth: 0,
    cursor: 'pointer',
  },
  textarea: {
    width: '100%',
    fontSize: '0.75rem',
    padding: '10px 12px',
    borderRadius: radii.md,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.primaryBorder,
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: colors.surface,
    fontFamily: 'inherit',
    color: colors.text,
  },
  submitMessageBtn: {
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: '14px',
    paddingRight: '14px',
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
    alignSelf: 'flex-start',
    transition: 'background-color 0.15s ease',
  },
  askPromptBtn: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: colors.primary,
    backgroundColor: 'transparent',
    borderWidth: 0,
    cursor: 'pointer',
    padding: 0,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  bookmarkBtn: {
    paddingTop: '10px',
    paddingBottom: '10px',
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    borderRadius: radii.md,
    borderWidth: '1px',
    borderStyle: 'solid',
    fontSize: '0.75rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  bookmarkSaved: {
    backgroundColor: colors.warningLight,
    color: colors.warningText,
    borderColor: colors.warningBorder,
  },
  bookmarkDefault: {
    backgroundColor: colors.surface,
    color: colors.textSecondary,
    borderColor: colors.border,
  },
  appliedStatus: {
    paddingTop: '10px',
    paddingBottom: '10px',
    paddingLeft: '18px',
    paddingRight: '18px',
    borderRadius: radii.md,
    backgroundColor: colors.successLight,
    color: colors.successText,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.successBorder,
    fontSize: '0.75rem',
    fontWeight: 900,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  applySubmitBtn: {
    paddingTop: '10px',
    paddingBottom: '10px',
    paddingLeft: '22px',
    paddingRight: '22px',
    borderRadius: radii.md,
    fontSize: '0.75rem',
    fontWeight: 900,
    color: colors.textInverse,
    backgroundColor: {
      default: colors.primary,
      ':hover': colors.primaryHover,
    },
    borderWidth: 0,
    cursor: 'pointer',
    boxShadow: shadows.md,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'background-color 0.15s ease',
  },
});

interface JobDetailModalProps {
  job: Job;
  companyProfile?: CompanyProfile;
  candidateProfile: CandidateProfile | null;
  hasApplied: boolean;
  isSaved: boolean;
  onClose: () => void;
  onApply: (jobId: number) => void;
  onToggleSave: (jobId: number) => void;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({
  job,
  companyProfile,
  candidateProfile,
  hasApplied,
  isSaved,
  onClose,
  onApply,
  onToggleSave,
}) => {
  const { showToast } = useApp();
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [contactSent, setContactSent] = useState(false);

  const candSkills = candidateProfile?.skills || '';
  const match = matchDetail(candSkills, job.requiredSkills);

  const handleShare = () => {
    const url = `${window.location.origin}/#job-${job.id}`;
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        showToast({
          type: 'success',
          title: 'Link Copied! 📋',
          message: `Shareable link for ${job.title} copied`,
        });
      });
    }
  };

  const handleSendContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactMessage.trim()) return;
    setContactSent(true);
    showToast({
      type: 'success',
      title: 'Inquiry Sent 📨',
      message: `Your message was delivered to ${job.companyName}'s recruiting team`,
    });
    setTimeout(() => {
      setShowContactForm(false);
      setContactSent(false);
      setContactMessage('');
    }, 1500);
  };

  const isHigh = match.pct >= 75;
  const isMed = match.pct >= 40 && match.pct < 75;

  return (
    <div {...stylex.props(styles.overlay)}>
      <div {...stylex.props(styles.modal)}>
        {/* Modal Header */}
        <div {...stylex.props(styles.header)}>
          <div {...stylex.props(styles.headerLeft)}>
            <CompanyAvatar name={job.companyName} size="lg" showVerified={true} />
            <div>
              <div {...stylex.props(styles.tagList)}>
                <span {...stylex.props(styles.deptBadge)}>
                  {job.department || 'Technology'}
                </span>
                <span {...stylex.props(styles.dot)}>•</span>
                <span {...stylex.props(styles.metaText)}>{job.employmentType}</span>
                <span {...stylex.props(styles.dot)}>•</span>
                <span {...stylex.props(styles.metaText)}>{job.workMode}</span>
              </div>
              <h2 {...stylex.props(styles.jobTitle)}>
                {job.title}
              </h2>
              <p {...stylex.props(styles.companyName)}>{job.companyName}</p>
            </div>
          </div>

          <div {...stylex.props(styles.headerRight)}>
            <button
              onClick={handleShare}
              {...stylex.props(styles.iconBtn)}
              title="Share job"
            >
              <Share2 size={20} />
            </button>
            <button
              onClick={onClose}
              {...stylex.props(styles.iconBtn)}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div {...stylex.props(styles.body)}>
          {/* Match compatibility banner */}
          {candSkills && (
            <div {...stylex.props(styles.matchBanner)}>
              <div {...stylex.props(styles.matchHeader)}>
                <div {...stylex.props(styles.matchHeaderLeft)}>
                  <div {...stylex.props(styles.matchIconBox)}>
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h4 {...stylex.props(styles.matchTitle)}>
                      Semantic Skill Compatibility: {match.pct}%
                    </h4>
                    <p {...stylex.props(styles.matchSubtitle)}>
                      Calculated from your profile tech stack vs job requirements
                    </p>
                  </div>
                </div>

                <span
                  {...stylex.props(
                    styles.matchBadgeText,
                    isHigh
                      ? styles.matchBadgeHigh
                      : isMed
                      ? styles.matchBadgeMed
                      : styles.matchBadgeLow
                  )}
                >
                  {isHigh ? 'Strong Match' : isMed ? 'Moderate Match' : 'Low Match'}
                </span>
              </div>

              {/* Breakdown */}
              <div {...stylex.props(styles.matchGrid)}>
                {/* Exact Matches */}
                <div {...stylex.props(styles.matchCard, styles.exactCard)}>
                  <div {...stylex.props(styles.matchCardTitle, styles.exactTitle)}>
                    <CheckCircle2 size={16} />
                    <span>Exact Matches ({match.matched.length})</span>
                  </div>
                  <div {...stylex.props(styles.tagRow)}>
                    {match.matched.length > 0 ? (
                      match.matched.map((s) => (
                        <span key={s} {...stylex.props(styles.exactTag)}>
                          {s}
                        </span>
                      ))
                    ) : (
                      <span {...stylex.props(styles.emptyText)}>No exact matches</span>
                    )}
                  </div>
                </div>

                {/* Partial Matches */}
                <div {...stylex.props(styles.matchCard, styles.creditCard)}>
                  <div {...stylex.props(styles.matchCardTitle, styles.creditTitle)}>
                    <Sparkles size={16} />
                    <span>Related Credit ({match.partial.length})</span>
                  </div>
                  <div {...stylex.props(styles.creditCol)}>
                    {match.partial.length > 0 ? (
                      match.partial.map((p) => (
                        <span key={p.skill} {...stylex.props(styles.creditTag)}>
                          <span>{p.skill}</span>
                          <span {...stylex.props(styles.creditPct)}>
                            via {p.via} ({p.pct}%)
                          </span>
                        </span>
                      ))
                    ) : (
                      <span {...stylex.props(styles.emptyText)}>No related overlaps</span>
                    )}
                  </div>
                </div>

                {/* Missing Skills */}
                <div {...stylex.props(styles.matchCard, styles.missingCard)}>
                  <div {...stylex.props(styles.matchCardTitle, styles.missingTitle)}>
                    <AlertCircle size={16} />
                    <span>Missing Skills ({match.missing.length})</span>
                  </div>
                  <div {...stylex.props(styles.tagRow)}>
                    {match.missing.length > 0 ? (
                      match.missing.map((s) => (
                        <span key={s} {...stylex.props(styles.missingTag)}>
                          {s}
                        </span>
                      ))
                    ) : (
                      <span {...stylex.props(styles.fullCoverageText)}>None! Full coverage.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Snapshot Cards */}
          <div {...stylex.props(styles.snapshotGrid)}>
            <div {...stylex.props(styles.snapshotCard)}>
              <span {...stylex.props(styles.snapshotLabel)}>Compensation</span>
              <span {...stylex.props(styles.snapshotValue)}>
                {job.hideSalary ? 'Undisclosed' : `₹${job.salaryMin} - ${job.salaryMax} LPA`}
              </span>
            </div>

            <div {...stylex.props(styles.snapshotCard)}>
              <span {...stylex.props(styles.snapshotLabel)}>Experience</span>
              <span {...stylex.props(styles.snapshotValue)}>
                {job.expMin} - {job.expMax} Years
              </span>
            </div>

            <div {...stylex.props(styles.snapshotCard)}>
              <span {...stylex.props(styles.snapshotLabel)}>Location</span>
              <span {...stylex.props(styles.snapshotValue)} style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {job.location}
              </span>
            </div>

            <div {...stylex.props(styles.snapshotCard)}>
              <span {...stylex.props(styles.snapshotLabel)}>Vacancies</span>
              <span {...stylex.props(styles.snapshotValue)}>
                {job.vacancies} {job.vacancies === 1 ? 'Opening' : 'Openings'}
              </span>
            </div>
          </div>

          {/* Job Description */}
          <div>
            <h3 {...stylex.props(styles.sectionTitle)}>
              Role Overview &amp; Responsibilities
            </h3>
            <div {...stylex.props(styles.descriptionBox)}>
              {job.description}
            </div>
          </div>

          {/* Company Profile Details */}
          {companyProfile && (
            <div {...stylex.props(styles.companyBox)}>
              <h4 {...stylex.props(styles.companyTitle)}>
                <Building2 size={16} color="#6366f1" />
                <span>About {job.companyName}</span>
              </h4>
              <p {...stylex.props(styles.companyDesc)}>{companyProfile.about}</p>
              <div {...stylex.props(styles.companyMetaRow)}>
                <span>HQ: <strong>{companyProfile.hqLocation}</strong></span>
                <span>Size: <strong>{companyProfile.size}</strong></span>
                {companyProfile.website && (
                  <a
                    href={companyProfile.website}
                    target="_blank"
                    rel="noreferrer"
                    {...stylex.props(styles.link)}
                  >
                    <span>Website</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* In-Modal Recruiter Contact Form */}
          {showContactForm ? (
            <form onSubmit={handleSendContact} {...stylex.props(styles.contactForm)}>
              <div {...stylex.props(styles.contactHeader)}>
                <span {...stylex.props(styles.contactTitle)}>
                  Ask Recruiter a Question
                </span>
                <button
                  type="button"
                  onClick={() => setShowContactForm(false)}
                  {...stylex.props(styles.cancelBtn)}
                >
                  Cancel
                </button>
              </div>
              <textarea
                rows={3}
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Ask about team structure, tech stack, or visa/relocation requirements..."
                {...stylex.props(styles.textarea)}
                required
              />
              <button
                type="submit"
                disabled={contactSent}
                {...stylex.props(styles.submitMessageBtn)}
              >
                <Send size={14} />
                <span>{contactSent ? 'Message Sent!' : 'Send Message'}</span>
              </button>
            </form>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <button
                type="button"
                onClick={() => setShowContactForm(true)}
                {...stylex.props(styles.askPromptBtn)}
              >
                Have a question? Inquire with hiring team →
              </button>
            </div>
          )}
        </div>

        {/* Modal Sticky Footer */}
        <div {...stylex.props(styles.footer)}>
          <button
            onClick={() => onToggleSave(job.id)}
            {...stylex.props(
              styles.bookmarkBtn,
              isSaved ? styles.bookmarkSaved : styles.bookmarkDefault
            )}
          >
            <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />
            <span>{isSaved ? 'Saved in Bookmarks' : 'Save for Later'}</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {hasApplied ? (
              <span {...stylex.props(styles.appliedStatus)}>
                <ShieldCheck size={16} />
                <span>Application Submitted</span>
              </span>
            ) : (
              <button
                onClick={() => onApply(job.id)}
                {...stylex.props(styles.applySubmitBtn)}
              >
                <span>Apply to Role</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
