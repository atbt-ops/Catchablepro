import React, { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useApp } from '../context/AppContext';
import { Interview, InterviewReminderAlert, User, Job } from '../types';
import {
  generate24hReminderEmail,
  generateIcsContent,
  formatInterviewTypeLabel,
  formatInterviewModeLabel,
} from '../services/reminders';
import {
  X,
  Mail,
  Send,
  Calendar,
  Clock,
  Video,
  Copy,
  Check,
  Download,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { colors, spacing, radii, shadows } from '../theme/tokens.stylex';

const styles = stylex.create({
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(4px)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    maxWidth: '680px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: shadows.xl,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    padding: `${spacing.md} ${spacing.lg}`,
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: colors.border,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSubtle,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIcon: {
    width: '36px',
    height: '36px',
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
    color: colors.primary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '1rem',
    fontWeight: 800,
    color: colors.text,
    margin: 0,
  },
  subtitle: {
    fontSize: '0.6875rem',
    color: colors.textSecondary,
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    borderWidth: 0,
    cursor: 'pointer',
    color: colors.textMuted,
    padding: '6px',
    borderRadius: radii.md,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailMetaBar: {
    padding: `${spacing.sm} ${spacing.lg}`,
    backgroundColor: '#f1f5f9',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: colors.border,
    fontSize: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaLabel: {
    width: '60px',
    color: colors.textMuted,
    fontWeight: 700,
    textTransform: 'uppercase',
    fontSize: '0.625rem',
  },
  metaValue: {
    color: colors.text,
    fontWeight: 600,
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  bodyScroll: {
    padding: spacing.lg,
    overflowY: 'auto',
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  emailCard: {
    backgroundColor: '#ffffff',
    borderRadius: radii.lg,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    boxShadow: shadows.sm,
  },
  emailBanner: {
    backgroundColor: '#4338ca',
    padding: '20px 24px',
    color: '#ffffff',
  },
  bannerBadgeRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  bannerBadge: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    padding: '3px 8px',
    borderRadius: radii.sm,
  },
  bannerTitle: {
    fontSize: '1.25rem',
    fontWeight: 800,
    margin: '0 0 6px 0',
    color: '#ffffff',
  },
  bannerSubtitle: {
    fontSize: '0.8125rem',
    opacity: 0.95,
    margin: 0,
    lineHeight: 1.4,
  },
  emailContent: {
    padding: '24px',
  },
  detailsBox: {
    backgroundColor: '#f8fafc',
    borderRadius: radii.md,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#e2e8f0',
    padding: '16px',
    marginBottom: '20px',
  },
  ctaRow: {
    textAlign: 'center',
    margin: '24px 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  joinBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: colors.primary,
    color: '#ffffff',
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: 700,
    padding: '12px 24px',
    borderRadius: radii.md,
    boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.3)',
  },
  prepBox: {
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#c7d2fe',
    backgroundColor: '#f5f7ff',
    padding: '14px 18px',
    borderRadius: radii.md,
    marginBottom: '20px',
  },
  footerBar: {
    padding: `${spacing.md} ${spacing.lg}`,
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  actionBtn: {
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: '14px',
    paddingRight: '14px',
    borderRadius: radii.md,
    fontSize: '0.75rem',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'background-color 0.15s ease',
  },
  primaryActionBtn: {
    backgroundColor: colors.primary,
    color: colors.textInverse,
    borderWidth: 0,
  },
  secondaryActionBtn: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
  },
});

interface ReminderEmailPreviewModalProps {
  interview: Interview;
  onClose: () => void;
  existingAlert?: InterviewReminderAlert;
}

export const ReminderEmailPreviewModal: React.FC<ReminderEmailPreviewModalProps> = ({
  interview,
  onClose,
  existingAlert,
}) => {
  const {
    users,
    jobs,
    companyProfiles,
    currentUser,
    send24hReminderNow,
    acknowledgeReminder,
    showToast,
  } = useApp();

  const [copiedLink, setCopiedLink] = useState(false);

  const candidate = users.find((u) => u.id === interview.candidateId) || {
    id: interview.candidateId,
    name: 'Candidate',
    email: 'candidate@example.com',
  } as User;

  const employer = users.find((u) => u.id === interview.employerId) || {
    id: interview.employerId,
    name: interview.interviewerName,
    email: interview.interviewerEmail,
  } as User;

  const job = jobs.find((j) => j.id === interview.jobId) || {
    id: interview.jobId,
    title: 'Software Engineer',
    companyName: 'Acme Cloud',
  } as Job;

  const companyName = job.companyName || employer.company_name || 'Catchablepro Employer';

  // Construct or use existing alert
  const alertData = existingAlert || generate24hReminderEmail(
    interview,
    candidate,
    employer,
    companyName,
    job.title,
    true
  );

  const confirmed = interview.confirmedSlot || interview.proposedSlots[0] || {
    id: 'slot-1',
    dateTime: new Date(Date.now() + 86400000).toISOString(),
    durationMinutes: 45,
  };

  const interviewDate = new Date(confirmed.dateTime);
  const formattedDate = interviewDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = interviewDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const handleCopyMeetingLink = () => {
    if (interview.meetingLink) {
      navigator.clipboard.writeText(interview.meetingLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      showToast({
        type: 'info',
        title: 'Meeting Link Copied! 📋',
        message: interview.meetingLink,
      });
    }
  };

  const handleDownloadIcs = () => {
    const icsString = generateIcsContent(interview, job.title, companyName);
    const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `interview-${job.title.replace(/\s+/g, '-').toLowerCase()}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast({
      type: 'success',
      title: 'Calendar File (.ics) Downloaded 📅',
      message: 'Import into Google Calendar, Outlook, or Apple Calendar.',
    });
  };

  const handleSendNow = () => {
    send24hReminderNow(interview.id);
  };

  const isCandidateViewing = currentUser?.role === 'candidate';

  return (
    <div {...stylex.props(styles.overlay)} onClick={onClose}>
      <div {...stylex.props(styles.modal)} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div {...stylex.props(styles.header)}>
          <div {...stylex.props(styles.headerLeft)}>
            <div {...stylex.props(styles.headerIcon)}>
              <Mail size={18} />
            </div>
            <div>
              <h3 {...stylex.props(styles.title)}>Automated 24h Reminder Email Alert</h3>
              <p {...stylex.props(styles.subtitle)}>
                {interview.reminder24hSent
                  ? `Delivered to ${candidate.email} • ${new Date(interview.reminder24hSentAt || Date.now()).toLocaleDateString()}`
                  : `Scheduled for candidate ${candidate.name} (T-24 Hours)`}
              </p>
            </div>
          </div>
          <button {...stylex.props(styles.closeBtn)} onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Email Meta Bar */}
        <div {...stylex.props(styles.emailMetaBar)}>
          <div {...stylex.props(styles.metaRow)}>
            <span {...stylex.props(styles.metaLabel)}>From:</span>
            <span {...stylex.props(styles.metaValue)}>
              {companyName} Hiring Team &lt;{interview.interviewerEmail}&gt;
            </span>
          </div>
          <div {...stylex.props(styles.metaRow)}>
            <span {...stylex.props(styles.metaLabel)}>To:</span>
            <span {...stylex.props(styles.metaValue)}>
              {candidate.name} &lt;{candidate.email}&gt;
            </span>
          </div>
          <div {...stylex.props(styles.metaRow)}>
            <span {...stylex.props(styles.metaLabel)}>Subject:</span>
            <span {...stylex.props(styles.metaValue)}>
              {alertData.emailSubject}
            </span>
          </div>
          <div {...stylex.props(styles.metaRow)}>
            <span {...stylex.props(styles.metaLabel)}>Trigger:</span>
            <span {...stylex.props(styles.metaValue)} style={{ color: colors.primary, fontWeight: 700 }}>
              ⏱️ Automated 24 Hours Prior to Confirmed Time ({new Date(alertData.scheduledFor).toLocaleString()})
            </span>
          </div>
        </div>

        {/* Email Preview Body */}
        <div {...stylex.props(styles.bodyScroll)}>
          <div {...stylex.props(styles.emailCard)}>
            {/* Banner */}
            <div {...stylex.props(styles.emailBanner)}>
              <div {...stylex.props(styles.bannerBadgeRow)}>
                <span {...stylex.props(styles.bannerBadge)}>
                  24-Hour Interview Reminder
                </span>
                <span style={{ fontSize: '11px', opacity: 0.9, fontWeight: 600 }}>
                  Catchablepro Automated Alert
                </span>
              </div>
              <h2 {...stylex.props(styles.bannerTitle)}>Upcoming Interview Tomorrow</h2>
              <p {...stylex.props(styles.bannerSubtitle)}>
                Hi {candidate.name}, your interview for <strong>{job.title}</strong> at <strong>{companyName}</strong> is scheduled in 24 hours.
              </p>
            </div>

            {/* Email Core Content */}
            <div {...stylex.props(styles.emailContent)}>
              {/* Interview Snapshot */}
              <div {...stylex.props(styles.detailsBox)}>
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 700 }}>
                    Interview Round
                  </span>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                    {interview.title}
                  </div>
                  <div style={{ fontSize: '12px', color: colors.primary, fontWeight: 600 }}>
                    {formatInterviewTypeLabel(interview.interviewType)}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                  <div>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                      Date & Time
                    </span>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                      {formattedDate}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#059669' }}>
                      {formattedTime} ({confirmed.durationMinutes} mins)
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                      Interviewer
                    </span>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                      {interview.interviewerName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {interview.interviewerEmail}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                      Format / Platform
                    </span>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                      {formatInterviewModeLabel(interview.mode)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Video Link */}
              {interview.meetingLink && (
                <div {...stylex.props(styles.ctaRow)}>
                  <a
                    href={interview.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    {...stylex.props(styles.joinBtn)}
                  >
                    <Video size={16} />
                    <span>Join Video Meeting</span>
                    <ExternalLink size={14} />
                  </a>
                  <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Direct: {interview.meetingLink}</span>
                    <button
                      onClick={handleCopyMeetingLink}
                      style={{ background: 'none', border: 0, cursor: 'pointer', color: colors.primary, padding: 0 }}
                      title="Copy meeting link"
                    >
                      {copiedLink ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Preparation Checklist */}
              <div {...stylex.props(styles.prepBox)}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#3730a3', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={14} />
                  <span>Preparation Instructions & Notes from Interviewer</span>
                </div>
                <div style={{ fontSize: '12px', color: '#1e1b4b', lineHeight: 1.5 }}>
                  {interview.customReminderNotes || interview.notes || 'Please ensure you are in a quiet room with a stable high-speed connection. Test your camera and microphone beforehand.'}
                </div>
              </div>

              {/* Calendar Download Helper */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={18} color="#4f46e5" />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>Add to Your Calendar</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Includes automatic reminder alarm 24 hours prior</div>
                  </div>
                </div>
                <button
                  onClick={handleDownloadIcs}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    color: '#334155',
                  }}
                >
                  <Download size={12} />
                  <span>Download .ICS File</span>
                </button>
              </div>

              {/* Email Footer */}
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', fontSize: '11px', color: '#94a3b8', lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 4px' }}>
                  Need to reschedule? Please reply to {interview.interviewerEmail} as early as possible so we can adjust the schedule.
                </p>
                <p style={{ margin: 0 }}>
                  This automated 24-hour reminder was generated by the Catchablepro Interview Engine on behalf of {companyName}.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div {...stylex.props(styles.footerBar)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: colors.textSecondary }}>
              Status:
            </span>
            {interview.reminder24hSent ? (
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={13} />
                <span>Alert Dispatched</span>
              </span>
            ) : (
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={13} />
                <span>Scheduled for Auto-Send (T-24h)</span>
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <button
              onClick={handleDownloadIcs}
              {...stylex.props(styles.actionBtn, styles.secondaryActionBtn)}
            >
              <Download size={13} />
              <span>.ICS Calendar Invite</span>
            </button>

            {isCandidateViewing && existingAlert && (
              <button
                onClick={() => {
                  acknowledgeReminder(existingAlert.id);
                  onClose();
                }}
                {...stylex.props(styles.actionBtn, styles.primaryActionBtn)}
              >
                <UserCheck size={14} />
                <span>Acknowledge & Confirm Attendance</span>
              </button>
            )}

            {!interview.reminder24hSent && !isCandidateViewing && (
              <button
                onClick={handleSendNow}
                {...stylex.props(styles.actionBtn, styles.primaryActionBtn)}
              >
                <Send size={13} />
                <span>Send 24h Alert Now</span>
              </button>
            )}

            <button
              onClick={onClose}
              {...stylex.props(styles.actionBtn, styles.secondaryActionBtn)}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
