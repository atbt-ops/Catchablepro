import React, { useState, useMemo } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useApp } from '../context/AppContext';
import {
  Interview,
  InterviewSlot,
  InterviewStatus,
  InterviewType,
  InterviewMode,
  Application,
  Job,
  ApplicationStage,
} from '../types';
import { WeeklyCalendarView } from './WeeklyCalendarView';
import { InterviewRemindersTab } from './InterviewRemindersTab';
import { ReminderEmailPreviewModal } from './ReminderEmailPreviewModal';
import { getReminderScheduleInfo } from '../services/reminders';
import {
  Calendar,
  Clock,
  Video,
  Plus,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RotateCcw,
  ExternalLink,
  Copy,
  UserCheck,
  Building2,
  Briefcase,
  Search,
  Filter,
  Check,
  ChevronRight,
  Sparkles,
  MapPin,
  Mail,
  User,
  Share2,
  CalendarCheck,
  CalendarClock,
  Layers,
  ArrowRight,
  MessageSquare,
  Send,
} from 'lucide-react';
import { colors, spacing, radii, shadows } from '../theme/tokens.stylex';

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
  },
  headerBanner: {
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
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBadge: {
    width: '48px',
    height: '48px',
    borderRadius: radii.lg,
    backgroundColor: colors.primaryLight,
    color: colors.primary,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.primaryBorder,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 900,
    color: colors.text,
    letterSpacing: '-0.025em',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.75rem',
    color: colors.textSecondary,
    margin: '2px 0 0',
  },
  primaryBtn: {
    paddingTop: '10px',
    paddingBottom: '10px',
    paddingLeft: '18px',
    paddingRight: '18px',
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
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: shadows.sm,
    transition: 'background-color 0.15s ease',
  },
  secondaryBtn: {
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: '14px',
    paddingRight: '14px',
    borderRadius: radii.md,
    fontSize: '0.75rem',
    fontWeight: 600,
    color: colors.text,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'background-color 0.15s ease',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
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
  controlsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
  },
  filterPills: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingTop: '6px',
    paddingBottom: '6px',
    paddingLeft: '12px',
    paddingRight: '12px',
    borderRadius: radii.md,
    fontSize: '0.75rem',
    fontWeight: 600,
    borderWidth: '1px',
    borderStyle: 'solid',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    color: colors.textInverse,
    borderColor: colors.primary,
  },
  filterPillInactive: {
    backgroundColor: colors.surfaceSubtle,
    color: colors.textSecondary,
    borderColor: colors.border,
  },
  viewModeToggle: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.lg,
    padding: '3px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
  },
  viewModeBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    paddingTop: '6px',
    paddingBottom: '6px',
    paddingLeft: '14px',
    paddingRight: '14px',
    borderRadius: radii.md,
    fontSize: '0.75rem',
    fontWeight: 700,
    borderWidth: 0,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  viewModeBtnActive: {
    backgroundColor: colors.surface,
    color: colors.primary,
    boxShadow: shadows.sm,
  },
  viewModeBtnInactive: {
    backgroundColor: 'transparent',
    color: colors.textMuted,
  },
  interviewList: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  interviewCard: {
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
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  },
  cardTop: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  candidateInfo: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: spacing.md,
    minWidth: 0,
    flex: '1 1 240px',
  },
  avatar: {
    width: '44px',
    height: '44px',
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    color: colors.textInverse,
    fontSize: '1rem',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  candidateName: {
    fontSize: '1rem',
    fontWeight: 800,
    color: colors.text,
    margin: 0,
  },
  jobTitle: {
    fontSize: '0.75rem',
    color: colors.textSecondary,
    margin: '2px 0 0',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  statusBadge: {
    paddingTop: '3px',
    paddingBottom: '3px',
    paddingLeft: '8px',
    paddingRight: '8px',
    borderRadius: radii.sm,
    fontSize: '0.6875rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
  },
  badgeConfirmed: {
    backgroundColor: colors.successLight,
    color: colors.successText,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.successBorder,
  },
  badgeProposed: {
    backgroundColor: colors.warningLight,
    color: colors.warningText,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.warningBorder,
  },
  badgeCompleted: {
    backgroundColor: colors.primaryLight,
    color: colors.primaryHover,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.primaryBorder,
  },
  badgeCancelled: {
    backgroundColor: colors.dangerLight,
    color: colors.dangerText,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.dangerBorder,
  },
  slotsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
  },
  slotItem: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    fontSize: '0.75rem',
    gap: spacing.sm,
  },
  slotItemConfirmed: {
    borderColor: colors.successBorder,
    backgroundColor: colors.successLight,
  },
  pipelineSyncBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '8px',
    paddingRight: '8px',
    borderRadius: radii.sm,
    backgroundColor: '#eef2ff',
    color: '#3730a3',
    fontSize: '11px',
    fontWeight: 700,
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: colors.border,
    fontSize: '0.75rem',
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  detailLabel: {
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: colors.text,
  },
  cardActions: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  actionBtnsRight: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(4px)',
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    maxWidth: '620px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: spacing.xl,
    boxShadow: shadows.xl,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: colors.text,
    margin: 0,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: colors.textSecondary,
  },
  input: {
    padding: '10px 14px',
    borderRadius: radii.md,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    fontSize: '0.8125rem',
    color: colors.text,
    outline: 'none',
  },
  select: {
    padding: '10px 14px',
    borderRadius: radii.md,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    fontSize: '0.8125rem',
    color: colors.text,
    outline: 'none',
    cursor: 'pointer',
  },
  textarea: {
    padding: '10px 14px',
    borderRadius: radii.md,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    fontSize: '0.8125rem',
    color: colors.text,
    outline: 'none',
    minHeight: '80px',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  emptyState: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: '2px',
    borderStyle: 'dashed',
    borderColor: colors.border,
    padding: '48px 24px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.md,
  },
});

interface InterviewSchedulerProps {
  initialJobId?: number | null;
  initialApplicationId?: number | null;
  onNavigateToPipeline?: (jobId?: number) => void;
}

const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  screening: 'Initial Screening',
  technical: 'Technical Coding / Skills Assessment',
  system_design: 'System Architecture & Design',
  cultural: 'Values & Team Fit',
  executive: 'Hiring Manager / Leadership',
};

const MODE_LABELS: Record<InterviewMode, string> = {
  google_meet: 'Google Meet',
  zoom: 'Zoom Video',
  teams: 'Microsoft Teams',
  phone: 'Phone Call',
  in_person: 'In-Person / Office',
};

export const InterviewScheduler: React.FC<InterviewSchedulerProps> = ({
  initialJobId,
  initialApplicationId,
  onNavigateToPipeline,
}) => {
  const {
    currentUser,
    jobs,
    users,
    applications,
    interviews,
    proposeInterview,
    confirmInterviewSlot,
    rescheduleInterview,
    updateInterviewStatus,
    cancelInterview,
    updateApplicationStage,
    availabilityBlocks,
    reminderAlerts,
    send24hReminderNow,
    showToast,
  } = useApp();

  // Employer's jobs
  const myJobs = useMemo(() => {
    if (!currentUser) return [];
    return jobs.filter((j) => j.employerId === currentUser.id);
  }, [jobs, currentUser]);

  const myJobIds = useMemo(() => myJobs.map((j) => j.id), [myJobs]);

  // Employer's applications
  const myApplications = useMemo(() => {
    return applications.filter((a) => myJobIds.includes(a.jobId));
  }, [applications, myJobIds]);

  // Employer's interviews
  const myInterviews = useMemo(() => {
    return interviews.filter((iv) => {
      // either created for employer's jobs or assigned to employer
      return myJobIds.includes(iv.jobId) || (currentUser && iv.employerId === currentUser.id);
    });
  }, [interviews, myJobIds, currentUser]);

  // Filters & View state
  const [statusFilter, setStatusFilter] = useState<'all' | 'proposed' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [selectedJobFilter, setSelectedJobFilter] = useState<number | 'all'>(initialJobId || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'calendar' | 'agenda' | 'cards' | 'reminders'>('calendar');

  // Preview Email Modal
  const [previewEmailInterview, setPreviewEmailInterview] = useState<Interview | null>(null);

  // Propose Modal state
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [formApplicationId, setFormApplicationId] = useState<number>(initialApplicationId || 0);
  const [formTitle, setFormTitle] = useState('Round 1: Technical & Skills Interview');
  const [formType, setFormType] = useState<InterviewType>('technical');
  const [formMode, setFormMode] = useState<InterviewMode>('google_meet');
  const [formCustomLink, setFormCustomLink] = useState('');
  const [formInterviewerName, setFormInterviewerName] = useState(currentUser?.name || 'Recruiting Team');
  const [formInterviewerEmail, setFormInterviewerEmail] = useState(currentUser?.email || '');
  const [formNotes, setFormNotes] = useState('');
  const [formAdvancePipeline, setFormAdvancePipeline] = useState(true);
  const [formReminder24hEnabled, setFormReminder24hEnabled] = useState(true);

  // Time slot proposals in form (multiple slots)
  const defaultSlotDate = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);
  const [formSlots, setFormSlots] = useState<Array<{ date: string; time: string; duration: number }>>([
    { date: defaultSlotDate, time: '14:00', duration: 45 },
    { date: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10), time: '16:00', duration: 45 },
  ]);

  // Feedback / Complete Modal
  const [feedbackModalInterview, setFeedbackModalInterview] = useState<Interview | null>(null);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [advanceToOffer, setAdvanceToOffer] = useState(false);

  // Reschedule Modal
  const [rescheduleModalInterview, setRescheduleModalInterview] = useState<Interview | null>(null);
  const [rescheduleSlots, setRescheduleSlots] = useState<Array<{ date: string; time: string; duration: number }>>([
    { date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10), time: '11:00', duration: 45 },
  ]);

  // Cancel Reason Modal
  const [cancelModalInterview, setCancelModalInterview] = useState<Interview | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Auto-select first application when opening propose modal if none selected
  const openProposeModal = (appId?: number) => {
    if (appId) {
      setFormApplicationId(appId);
    } else if (myApplications.length > 0 && !formApplicationId) {
      // Pick first application that is applied, shortlisted, or interview
      const candidateApp = myApplications.find((a) => ['shortlisted', 'interview', 'applied'].includes(a.status)) || myApplications[0];
      setFormApplicationId(candidateApp.id);
    }
    setShowProposeModal(true);
  };

  // Filtered interviews list
  const filteredInterviews = useMemo(() => {
    return myInterviews
      .filter((iv) => {
        if (statusFilter !== 'all' && iv.status !== statusFilter) return false;
        if (selectedJobFilter !== 'all' && iv.jobId !== selectedJobFilter) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const candidate = users.find((u) => u.id === iv.candidateId);
          const job = jobs.find((j) => j.id === iv.jobId);
          const matchCandidate = candidate?.name.toLowerCase().includes(q) || candidate?.email.toLowerCase().includes(q);
          const matchJob = job?.title.toLowerCase().includes(q);
          const matchTitle = iv.title.toLowerCase().includes(q);
          const matchInterviewer = iv.interviewerName.toLowerCase().includes(q);
          if (!matchCandidate && !matchJob && !matchTitle && !matchInterviewer) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Sort by confirmed slot or first proposed slot
        const timeA = a.confirmedSlot ? new Date(a.confirmedSlot.dateTime).getTime() : a.proposedSlots[0] ? new Date(a.proposedSlots[0].dateTime).getTime() : 0;
        const timeB = b.confirmedSlot ? new Date(b.confirmedSlot.dateTime).getTime() : b.proposedSlots[0] ? new Date(b.proposedSlots[0].dateTime).getTime() : 0;
        return timeA - timeB;
      });
  }, [myInterviews, statusFilter, selectedJobFilter, searchQuery, users, jobs]);

  // KPI Calculations
  const stats = useMemo(() => {
    const upcoming = myInterviews.filter((i) => i.status === 'confirmed').length;
    const proposed = myInterviews.filter((i) => i.status === 'proposed').length;
    const completed = myInterviews.filter((i) => i.status === 'completed').length;
    const totalMinutes = myInterviews
      .filter((i) => ['confirmed', 'completed'].includes(i.status))
      .reduce((acc, curr) => {
        const dur = curr.confirmedSlot?.durationMinutes || curr.proposedSlots[0]?.durationMinutes || 45;
        return acc + dur;
      }, 0);

    return {
      upcoming,
      proposed,
      completed,
      totalHours: (totalMinutes / 60).toFixed(1),
    };
  }, [myInterviews]);

  // Handle Proposing Interview
  const handleProposeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const app = myApplications.find((a) => a.id === formApplicationId);
    if (!app) {
      showToast({
        type: 'error',
        title: 'Application Required',
        message: 'Please choose a candidate application to schedule.',
      });
      return;
    }

    if (formSlots.length === 0) {
      showToast({
        type: 'warning',
        title: 'Slot Required',
        message: 'Please specify at least one date & time slot for the candidate.',
      });
      return;
    }

    const proposedSlots: InterviewSlot[] = formSlots.map((s, idx) => ({
      id: `slot_${Date.now()}_${idx}`,
      dateTime: `${s.date}T${s.time}:00`,
      durationMinutes: s.duration,
      notes: `Slot ${idx + 1}`,
    }));

    proposeInterview({
      applicationId: app.id,
      jobId: app.jobId,
      candidateId: app.candidateId,
      title: formTitle,
      interviewType: formType,
      proposedSlots,
      mode: formMode,
      meetingLink: formCustomLink || undefined,
      interviewerName: formInterviewerName,
      interviewerEmail: formInterviewerEmail,
      notes: formNotes,
      advancePipelineStage: formAdvancePipeline,
    });

    setShowProposeModal(false);
  };

  // Add another slot proposal row
  const addSlotRow = () => {
    const nextDate = new Date(Date.now() + 86400000 * (formSlots.length + 2)).toISOString().slice(0, 10);
    setFormSlots((prev) => [...prev, { date: nextDate, time: '14:00', duration: 45 }]);
  };

  const removeSlotRow = (idx: number) => {
    if (formSlots.length <= 1) return;
    setFormSlots((prev) => prev.filter((_, i) => i !== idx));
  };

  // Format date helper
  const formatDateTime = (isoString?: string) => {
    if (!isoString) return 'Date TBD';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatRelativeDay = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
    return '';
  };

  return (
    <div {...stylex.props(styles.container)}>
      {/* Top Banner */}
      <div {...stylex.props(styles.headerBanner)}>
        <div {...stylex.props(styles.titleGroup)}>
          <div {...stylex.props(styles.iconBadge)}>
            <Calendar size={24} />
          </div>
          <div>
            <h2 {...stylex.props(styles.title)}>Interview Scheduler &amp; Pipeline Sync</h2>
            <p {...stylex.props(styles.subtitle)}>
              Propose flexible interview slots to shortlisted candidates. Automatically syncs with hiring stages in real-time.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onNavigateToPipeline && (
            <button
              onClick={() => onNavigateToPipeline()}
              {...stylex.props(styles.secondaryBtn)}
            >
              <Layers size={15} />
              <span>View Hiring Pipeline</span>
            </button>
          )}

          <button
            onClick={() => openProposeModal()}
            {...stylex.props(styles.primaryBtn)}
          >
            <Plus size={16} />
            <span>Propose New Interview</span>
          </button>
        </div>
      </div>

      {/* View Mode Segmented Bar & Context Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div {...stylex.props(styles.viewModeToggle)}>
          <button
            onClick={() => setViewMode('calendar')}
            {...stylex.props(
              styles.viewModeBtn,
              viewMode === 'calendar' ? styles.viewModeBtnActive : styles.viewModeBtnInactive
            )}
          >
            <Calendar size={14} />
            <span>Weekly Calendar</span>
          </button>
          <button
            onClick={() => setViewMode('agenda')}
            {...stylex.props(
              styles.viewModeBtn,
              viewMode === 'agenda' ? styles.viewModeBtnActive : styles.viewModeBtnInactive
            )}
          >
            <Clock size={14} />
            <span>Agenda</span>
          </button>
          <button
            onClick={() => setViewMode('cards')}
            {...stylex.props(
              styles.viewModeBtn,
              viewMode === 'cards' ? styles.viewModeBtnActive : styles.viewModeBtnInactive
            )}
          >
            <Layers size={14} />
            <span>Cards</span>
          </button>
          <button
            onClick={() => setViewMode('reminders')}
            {...stylex.props(
              styles.viewModeBtn,
              viewMode === 'reminders' ? styles.viewModeBtnActive : styles.viewModeBtnInactive
            )}
          >
            <Mail size={14} color={viewMode === 'reminders' ? '#ffffff' : '#059669'} />
            <span>24h Reminders</span>
            <span
              style={{
                fontSize: '9px',
                backgroundColor: viewMode === 'reminders' ? 'rgba(255,255,255,0.25)' : '#dcfce7',
                color: viewMode === 'reminders' ? '#ffffff' : '#15803d',
                padding: '1px 5px',
                borderRadius: '9999px',
                fontWeight: 800,
              }}
            >
              Auto
            </span>
          </button>
        </div>

        {/* Calendar View Quick Strip: Job Selector & Compact Metrics */}
        {viewMode === 'calendar' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
              <span style={{ fontWeight: 600 }}>Filter:</span>
              <select
                value={selectedJobFilter}
                onChange={(e) => setSelectedJobFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                style={{
                  padding: '5px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#fff',
                  color: '#334155',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Jobs ({myJobs.length})</option>
                {myJobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600 }}>
              <span style={{ color: '#059669', backgroundColor: '#ecfdf5', padding: '3px 8px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                {stats.upcoming} Upcoming
              </span>
              <span style={{ color: '#d97706', backgroundColor: '#fffbeb', padding: '3px 8px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                {stats.proposed} Awaiting Reply
              </span>
              <span style={{ color: '#4338ca', backgroundColor: '#eef2ff', padding: '3px 8px', borderRadius: '6px', border: '1px solid #c7d2fe' }}>
                {stats.totalHours}h Bandwidth
              </span>
            </div>
          </div>
        )}
      </div>

      {/* KPI Metrics: Displayed in Agenda and Cards view */}
      {(viewMode === 'agenda' || viewMode === 'cards') && (
        <>
          <div {...stylex.props(styles.statsGrid)}>
            <div {...stylex.props(styles.statCard)}>
              <span {...stylex.props(styles.statLabel)}>Confirmed / Upcoming</span>
              <span {...stylex.props(styles.statVal)}>{stats.upcoming}</span>
              <span {...stylex.props(styles.statSub)} style={{ color: '#059669' }}>
                Ready on calendar
              </span>
            </div>

            <div {...stylex.props(styles.statCard)}>
              <span {...stylex.props(styles.statLabel)}>Awaiting Candidate</span>
              <span {...stylex.props(styles.statVal)}>{stats.proposed}</span>
              <span {...stylex.props(styles.statSub)} style={{ color: '#d97706' }}>
                Slots proposed
              </span>
            </div>

            <div {...stylex.props(styles.statCard)}>
              <span {...stylex.props(styles.statLabel)}>Completed Rounds</span>
              <span {...stylex.props(styles.statVal)}>{stats.completed}</span>
              <span {...stylex.props(styles.statSub)} style={{ color: '#4f46e5' }}>
                Assessed candidates
              </span>
            </div>

            <div {...stylex.props(styles.statCard)}>
              <span {...stylex.props(styles.statLabel)}>Scheduled Hours</span>
              <span {...stylex.props(styles.statVal)}>{stats.totalHours} hrs</span>
              <span {...stylex.props(styles.statSub)} style={{ color: '#64748b' }}>
                Total interview bandwidth
              </span>
            </div>
          </div>

          {/* Controls & Filter Bar for Agenda/Cards */}
          <div {...stylex.props(styles.controlsRow)}>
            {/* Status Filter Pills */}
            <div {...stylex.props(styles.filterPills)}>
              {[
                { id: 'all', label: `All (${myInterviews.length})` },
                { id: 'confirmed', label: `Upcoming (${stats.upcoming})` },
                { id: 'proposed', label: `Awaiting Reply (${stats.proposed})` },
                { id: 'completed', label: `Completed (${stats.completed})` },
                { id: 'cancelled', label: 'Cancelled' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as any)}
                  {...stylex.props(
                    styles.filterPill,
                    statusFilter === tab.id ? styles.filterPillActive : styles.filterPillInactive
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Right Controls: Job Dropdown & Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <select
                value={selectedJobFilter}
                onChange={(e) => setSelectedJobFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#fff',
                  color: '#334155',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Jobs ({myJobs.length})</option>
                {myJobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px' }} />
                <input
                  type="text"
                  placeholder="Search candidate, round..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    paddingLeft: '32px',
                    paddingRight: '12px',
                    paddingTop: '6px',
                    paddingBottom: '6px',
                    fontSize: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#fff',
                    color: '#0f172a',
                    outline: 'none',
                    width: '180px',
                  }}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* 1. INTERACTIVE WEEKLY CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <WeeklyCalendarView
          selectedJobFilter={selectedJobFilter}
          onSelectSlotForInterview={(date, time) => {
            setFormSlots([{ date, time, duration: 45 }]);
            openProposeModal();
          }}
        />
      )}

      {/* 2. AUTOMATED 24-HOUR REMINDERS DASHBOARD */}
      {viewMode === 'reminders' && (
        <InterviewRemindersTab />
      )}

      {/* 3. AGENDA / CARD VIEW */}
      {(viewMode === 'agenda' || viewMode === 'cards') && (
        filteredInterviews.length > 0 ? (
          <div {...stylex.props(styles.interviewList)}>
          {filteredInterviews.map((iv) => {
            const candidate = users.find((u) => u.id === iv.candidateId);
            const job = jobs.find((j) => j.id === iv.jobId);
            const app = applications.find((a) => a.id === iv.applicationId);
            const isConfirmed = iv.status === 'confirmed';
            const isProposed = iv.status === 'proposed';
            const isCompleted = iv.status === 'completed';
            const isCancelled = iv.status === 'cancelled';

            const activeSlot = iv.confirmedSlot || iv.proposedSlots[0];
            const relativeDay = formatRelativeDay(activeSlot?.dateTime);

            return (
              <div
                key={iv.id}
                {...stylex.props(styles.interviewCard)}
                style={{
                  borderLeftWidth: '5px',
                  borderLeftColor: isConfirmed ? '#10b981' : isProposed ? '#f59e0b' : isCompleted ? '#4f46e5' : '#cbd5e1',
                }}
              >
                {/* Card Top: Candidate + Status */}
                <div {...stylex.props(styles.cardTop)}>
                  <div {...stylex.props(styles.candidateInfo)}>
                    <div {...stylex.props(styles.avatar)}>
                      {candidate?.name.slice(0, 2).toUpperCase() || 'CA'}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 {...stylex.props(styles.candidateName)}>{candidate?.name || 'Candidate'}</h3>
                        {relativeDay && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              backgroundColor: relativeDay === 'Today' ? '#fef2f2' : '#eff6ff',
                              color: relativeDay === 'Today' ? '#dc2626' : '#2563eb',
                            }}
                          >
                            {relativeDay}
                          </span>
                        )}
                      </div>
                      <p {...stylex.props(styles.jobTitle)}>
                        <Briefcase size={12} color="#64748b" />
                        <span>{job?.title || 'Job Opportunity'}</span>
                        <span>•</span>
                        <span style={{ color: '#4f46e5', fontWeight: 700 }}>
                          {INTERVIEW_TYPE_LABELS[iv.interviewType]}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Pipeline Sync indicator */}
                    <span {...stylex.props(styles.pipelineSyncBadge)}>
                      <Layers size={12} />
                      <span>Pipeline: {app?.status ? app.status.toUpperCase() : 'INTERVIEW'}</span>
                    </span>

                    {/* Status badge */}
                    <span
                      {...stylex.props(
                        styles.statusBadge,
                        isConfirmed
                          ? styles.badgeConfirmed
                          : isProposed
                          ? styles.badgeProposed
                          : isCompleted
                          ? styles.badgeCompleted
                          : styles.badgeCancelled
                      )}
                    >
                      {isConfirmed && <CheckCircle2 size={12} />}
                      {isProposed && <Clock size={12} />}
                      {isCompleted && <UserCheck size={12} />}
                      {isCancelled && <XCircle size={12} />}
                      <span>{iv.status.toUpperCase()}</span>
                    </span>
                  </div>
                </div>

                {/* Round Title */}
                <div>
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                    {iv.title}
                  </h4>
                  {iv.notes && (
                    <p style={{ fontSize: '0.8125rem', color: '#475569', margin: 0, backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <strong>Recruiter Instructions:</strong> {iv.notes}
                    </p>
                  )}
                </div>

                {/* Proposed / Confirmed Slots Box */}
                <div {...stylex.props(styles.slotsContainer)}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CalendarClock size={15} color="#4f46e5" />
                      <span>
                        {isConfirmed
                          ? 'Confirmed Interview Time'
                          : `Proposed Options (${iv.proposedSlots.length} slot${iv.proposedSlots.length > 1 ? 's' : ''} sent to candidate)`}
                      </span>
                    </span>

                    {isProposed && (
                      <span style={{ fontSize: '11px', color: '#d97706', fontWeight: 700 }}>
                        Candidate choice pending
                      </span>
                    )}
                  </div>

                  {/* Render slots */}
                  {isConfirmed && iv.confirmedSlot ? (
                    <div {...stylex.props(styles.slotItem, styles.slotItemConfirmed)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <CalendarCheck size={16} color="#059669" />
                        <div>
                          <strong style={{ color: '#065f46', fontSize: '0.8125rem' }}>
                            {formatDateTime(iv.confirmedSlot.dateTime)}
                          </strong>
                          <span style={{ color: '#047857', marginLeft: '8px', fontSize: '11px' }}>
                            ({iv.confirmedSlot.durationMinutes} minutes)
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '11px', color: '#047857', backgroundColor: '#a7f3d0', padding: '2px 8px', borderRadius: '9999px' }}>
                          Locked in Calendar ✓
                        </span>
                        {iv.reminder24hSent ? (
                          <button
                            onClick={() => setPreviewEmailInterview(iv)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#065f46',
                              backgroundColor: '#dcfce7',
                              border: '1px solid #86efac',
                              borderRadius: '9999px',
                              padding: '2px 8px',
                              cursor: 'pointer',
                            }}
                            title="24-Hour Reminder email alert sent to candidate. Click to preview."
                          >
                            <Mail size={11} />
                            <span>24h Alert Sent</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setPreviewEmailInterview(iv)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#1e40af',
                              backgroundColor: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              borderRadius: '9999px',
                              padding: '2px 8px',
                              cursor: 'pointer',
                            }}
                            title="Automated 24h Reminder email alert scheduled. Click to preview or trigger."
                          >
                            <Clock size={11} />
                            <span>Auto 24h Reminder Scheduled</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    iv.proposedSlots.map((slot, sIdx) => (
                      <div key={slot.id} {...stylex.props(styles.slotItem)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 800, color: '#4f46e5', backgroundColor: '#eef2ff', width: '22px', height: '22px', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>
                            {sIdx + 1}
                          </span>
                          <div>
                            <span style={{ fontWeight: 700, color: '#1e293b' }}>
                              {formatDateTime(slot.dateTime)}
                            </span>
                            <span style={{ color: '#64748b', marginLeft: '6px', fontSize: '11px' }}>
                              ({slot.durationMinutes} min)
                            </span>
                          </div>
                        </div>

                        {/* Employer can quick-confirm any proposed slot on candidate's behalf */}
                        <button
                          onClick={() => confirmInterviewSlot(iv.id, slot.id)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#065f46',
                            backgroundColor: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Check size={12} />
                          <span>Confirm this slot</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Details Grid: Meeting Link, Mode, Interviewer */}
                <div {...stylex.props(styles.detailsGrid)}>
                  <div {...stylex.props(styles.detailItem)}>
                    <span {...stylex.props(styles.detailLabel)}>Meeting Mode</span>
                    <span {...stylex.props(styles.detailValue)} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Video size={13} color="#4f46e5" />
                      <span>{MODE_LABELS[iv.mode]}</span>
                    </span>
                  </div>

                  <div {...stylex.props(styles.detailItem)}>
                    <span {...stylex.props(styles.detailLabel)}>Meeting Link / Room</span>
                    {iv.meetingLink ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <a
                          href={iv.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#4f46e5', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          <span>{iv.meetingLink.replace('https://', '')}</span>
                          <ExternalLink size={12} />
                        </a>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(iv.meetingLink || '');
                            showToast({
                              type: 'success',
                              title: 'Link Copied',
                              message: 'Meeting link copied to clipboard.',
                            });
                          }}
                          style={{ padding: '2px 6px', background: 'none', border: 0, cursor: 'pointer', color: '#64748b' }}
                          title="Copy Link"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>Link pending</span>
                    )}
                  </div>

                  <div {...stylex.props(styles.detailItem)}>
                    <span {...stylex.props(styles.detailLabel)}>Interviewer</span>
                    <span {...stylex.props(styles.detailValue)} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <User size={13} color="#64748b" />
                      <span>{iv.interviewerName}</span>
                    </span>
                  </div>

                  <div {...stylex.props(styles.detailItem)}>
                    <span {...stylex.props(styles.detailLabel)}>Candidate Email</span>
                    <span {...stylex.props(styles.detailValue)} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Mail size={13} color="#64748b" />
                      <span>{candidate?.email || 'N/A'}</span>
                    </span>
                  </div>
                </div>

                {/* If completed, show feedback */}
                {iv.feedback && (
                  <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: '#eef2ff', border: '1px solid #c7d2fe', fontSize: '0.75rem', color: '#1e1b4b' }}>
                    <strong>Interviewer Feedback:</strong> {iv.feedback}
                  </div>
                )}

                {/* Bottom Card Actions */}
                <div {...stylex.props(styles.cardActions)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {onNavigateToPipeline && (
                      <button
                        onClick={() => onNavigateToPipeline(iv.jobId)}
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#4f46e5',
                          background: 'none',
                          border: 0,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Layers size={14} />
                        <span>Open in Hiring Pipeline</span>
                        <ChevronRight size={14} />
                      </button>
                    )}
                  </div>

                  <div {...stylex.props(styles.actionBtnsRight)}>
                    {/* 24h Reminder Alert Preview & Quick Dispatch */}
                    {isConfirmed && (
                      <>
                        <button
                          onClick={() => setPreviewEmailInterview(iv)}
                          {...stylex.props(styles.secondaryBtn)}
                          style={{ fontSize: '11px', padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Preview the exact 24-hour reminder email alert candidate receives"
                        >
                          <Mail size={12} color="#4f46e5" />
                          <span>Preview 24h Alert</span>
                        </button>

                        {!iv.reminder24hSent && (
                          <button
                            onClick={() => send24hReminderNow(iv.id)}
                            style={{
                              fontSize: '11px',
                              padding: '6px 10px',
                              borderRadius: '8px',
                              fontWeight: 700,
                              color: '#ffffff',
                              backgroundColor: '#059669',
                              border: 0,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="Send 24-hour reminder email alert immediately"
                          >
                            <Send size={12} />
                            <span>Send 24h Alert</span>
                          </button>
                        )}
                      </>
                    )}

                    {/* Reschedule */}
                    {!isCancelled && !isCompleted && (
                      <button
                        onClick={() => {
                          setRescheduleModalInterview(iv);
                          setRescheduleSlots([
                            { date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10), time: '11:00', duration: 45 },
                          ]);
                        }}
                        {...stylex.props(styles.secondaryBtn)}
                        style={{ fontSize: '11px', padding: '6px 10px' }}
                      >
                        <RotateCcw size={12} />
                        <span>Reschedule</span>
                      </button>
                    )}

                    {/* Mark as Completed */}
                    {!isCompleted && !isCancelled && (
                      <button
                        onClick={() => {
                          setFeedbackModalInterview(iv);
                          setFeedbackNote('');
                          setAdvanceToOffer(false);
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#fff',
                          backgroundColor: '#4f46e5',
                          border: 0,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <CheckCircle2 size={13} />
                        <span>Mark Completed &amp; Feedback</span>
                      </button>
                    )}

                    {/* Cancel Interview */}
                    {!isCancelled && !isCompleted && (
                      <button
                        onClick={() => {
                          setCancelModalInterview(iv);
                          setCancelReason('');
                        }}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#dc2626',
                          backgroundColor: '#fef2f2',
                          border: '1px solid #fecaca',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <XCircle size={12} />
                        <span>Cancel</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div {...stylex.props(styles.emptyState)}>
          <Calendar size={48} color="#94a3b8" />
          <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            No Interviews Found
          </h3>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', maxWidth: '360px', margin: 0 }}>
            {statusFilter !== 'all' || searchQuery
              ? 'No interviews match your active filters. Try clearing filters or search query.'
              : 'Propose flexible interview times to your shortlisted candidates directly from the pipeline.'}
          </p>
          <button
            onClick={() => {
              setStatusFilter('all');
              setSelectedJobFilter('all');
              setSearchQuery('');
              openProposeModal();
            }}
            {...stylex.props(styles.primaryBtn)}
          >
            <Plus size={15} />
            <span>Propose Interview to Candidate</span>
          </button>
        </div>
      ))}

      {/* MODAL 1: PROPOSE NEW INTERVIEW */}
      {showProposeModal && (
        <div {...stylex.props(styles.overlay)} onClick={() => setShowProposeModal(false)}>
          <div {...stylex.props(styles.modal)} onClick={(e) => e.stopPropagation()}>
            <div {...stylex.props(styles.modalHeader)}>
              <div>
                <h3 {...stylex.props(styles.modalTitle)}>Propose Interview Time Slots</h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0' }}>
                  Select an applicant and offer multiple candidate slots. Automatically advances hiring pipeline to "Interview".
                </p>
              </div>
              <button
                onClick={() => setShowProposeModal(false)}
                style={{ padding: '6px', background: 'none', border: 0, cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProposeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Candidate Application Selector */}
              <div {...stylex.props(styles.formGroup)}>
                <label {...stylex.props(styles.label)}>Select Candidate &amp; Role *</label>
                <select
                  value={formApplicationId}
                  onChange={(e) => setFormApplicationId(Number(e.target.value))}
                  {...stylex.props(styles.select)}
                  required
                >
                  <option value={0} disabled>
                    -- Choose an applicant --
                  </option>
                  {myApplications.map((app) => {
                    const c = users.find((u) => u.id === app.candidateId);
                    const j = jobs.find((jb) => jb.id === app.jobId);
                    return (
                      <option key={app.id} value={app.id}>
                        {c?.name} • {j?.title} (Stage: {app.status.toUpperCase()}, Match: {app.matchPct}%)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Interview Type & Title */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div {...stylex.props(styles.formGroup)}>
                  <label {...stylex.props(styles.label)}>Interview Round Type *</label>
                  <select
                    value={formType}
                    onChange={(e) => {
                      const t = e.target.value as InterviewType;
                      setFormType(t);
                      if (t === 'screening') setFormTitle('Round 1: Initial Recruiter Screening');
                      if (t === 'technical') setFormTitle('Round 2: Technical Skills & Problem Solving');
                      if (t === 'system_design') setFormTitle('Round 2: System Architecture & Design');
                      if (t === 'cultural') setFormTitle('Round 3: Values & Culture Alignment');
                      if (t === 'executive') setFormTitle('Final Round: Hiring Manager & Leadership');
                    }}
                    {...stylex.props(styles.select)}
                  >
                    {Object.entries(INTERVIEW_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div {...stylex.props(styles.formGroup)}>
                  <label {...stylex.props(styles.label)}>Round Title *</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Round 2: Technical Deep Dive"
                    {...stylex.props(styles.input)}
                    required
                  />
                </div>
              </div>

              {/* Time Slots Section (Multiple candidate proposals) */}
              <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CalendarClock size={16} color="#4f46e5" />
                    <span>Proposed Time Slots (Candidates choose one) *</span>
                  </label>
                  <button
                    type="button"
                    onClick={addSlotRow}
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#4f46e5',
                      background: 'none',
                      border: 0,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Plus size={13} />
                    <span>Add Another Option</span>
                  </button>
                </div>

                {/* Preferred slots quick-picker */}
                {availabilityBlocks.some((b) => b.type === 'preferred') && (
                  <div style={{ backgroundColor: '#ecfdf5', padding: '8px 12px', borderRadius: '8px', border: '1px solid #a7f3d0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#065f46' }}>
                      ⭐ Quick-Fill from Preferred Interview Slots:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {availabilityBlocks
                        .filter((b) => b.type === 'preferred')
                        .slice(0, 4)
                        .map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => {
                              setFormSlots([{ date: b.date, time: b.startTime, duration: 45 }]);
                            }}
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              backgroundColor: '#fff',
                              color: '#065f46',
                              border: '1px solid #10b981',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                          >
                            {b.date.slice(5)} at {b.startTime} ({b.label})
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Busy conflict alert */}
                {formSlots.some((slot) =>
                  availabilityBlocks.some(
                    (b) => b.type === 'busy' && b.date === slot.date && slot.time >= b.startTime && slot.time < b.endTime
                  )
                ) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#b45309', backgroundColor: '#fffbeb', padding: '8px 12px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                    <AlertCircle size={14} color="#d97706" />
                    <span>Notice: One of the proposed slots overlaps with a blocked busy window on your calendar.</span>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {formSlots.map((slot, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '130px 110px 100px 32px',
                        gap: '8px',
                        alignItems: 'center',
                        backgroundColor: '#fff',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                      }}
                    >
                      <input
                        type="date"
                        value={slot.date}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormSlots((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, date: val } : s))
                          );
                        }}
                        style={{ padding: '6px', fontSize: '11px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                        required
                      />

                      <input
                        type="time"
                        value={slot.time}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormSlots((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, time: val } : s))
                          );
                        }}
                        style={{ padding: '6px', fontSize: '11px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                        required
                      />

                      <select
                        value={slot.duration}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setFormSlots((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, duration: val } : s))
                          );
                        }}
                        style={{ padding: '6px', fontSize: '11px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                      >
                        <option value={30}>30 mins</option>
                        <option value={45}>45 mins</option>
                        <option value={60}>60 mins</option>
                        <option value={90}>90 mins</option>
                      </select>

                      {formSlots.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeSlotRow(idx)}
                          style={{ color: '#ef4444', background: 'none', border: 0, cursor: 'pointer', padding: 0 }}
                          title="Remove Slot"
                        >
                          ✕
                        </button>
                      ) : (
                        <span />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Mode & Link */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div {...stylex.props(styles.formGroup)}>
                  <label {...stylex.props(styles.label)}>Meeting Platform *</label>
                  <select
                    value={formMode}
                    onChange={(e) => setFormMode(e.target.value as InterviewMode)}
                    {...stylex.props(styles.select)}
                  >
                    {Object.entries(MODE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div {...stylex.props(styles.formGroup)}>
                  <label {...stylex.props(styles.label)}>Custom Link / Room</label>
                  <input
                    type="text"
                    value={formCustomLink}
                    onChange={(e) => setFormCustomLink(e.target.value)}
                    placeholder="Leave blank to auto-generate video link"
                    {...stylex.props(styles.input)}
                  />
                </div>
              </div>

              {/* Interviewer details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div {...stylex.props(styles.formGroup)}>
                  <label {...stylex.props(styles.label)}>Interviewer Name *</label>
                  <input
                    type="text"
                    value={formInterviewerName}
                    onChange={(e) => setFormInterviewerName(e.target.value)}
                    {...stylex.props(styles.input)}
                    required
                  />
                </div>

                <div {...stylex.props(styles.formGroup)}>
                  <label {...stylex.props(styles.label)}>Interviewer Email</label>
                  <input
                    type="email"
                    value={formInterviewerEmail}
                    onChange={(e) => setFormInterviewerEmail(e.target.value)}
                    {...stylex.props(styles.input)}
                  />
                </div>
              </div>

              {/* Candidate preparation instructions */}
              <div {...stylex.props(styles.formGroup)}>
                <label {...stylex.props(styles.label)}>Instructions / Prep Notes for Candidate</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Please be ready in a quiet room with IDE setup. We will walk through architecture scenarios."
                  {...stylex.props(styles.textarea)}
                />
              </div>

              {/* Sync Pipeline Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', backgroundColor: '#eef2ff', borderRadius: '8px', border: '1px solid #c7d2fe' }}>
                <input
                  type="checkbox"
                  id="syncPipeline"
                  checked={formAdvancePipeline}
                  onChange={(e) => setFormAdvancePipeline(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#4f46e5', cursor: 'pointer' }}
                />
                <label htmlFor="syncPipeline" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e1b4b', cursor: 'pointer' }}>
                  Automatically synchronize application stage to "Interview" in Hiring Pipeline
                </label>
              </div>

              {/* 24-Hour Automated Reminder Checkbox */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px 14px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="reminder24hCheck"
                    checked={formReminder24hEnabled}
                    onChange={(e) => setFormReminder24hEnabled(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#16a34a', cursor: 'pointer' }}
                  />
                  <label htmlFor="reminder24hCheck" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🔔 Send automated 24-hour reminder email alert to candidate</span>
                    <span style={{ fontSize: '10px', backgroundColor: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '9999px', fontWeight: 800 }}>RECOMMENDED</span>
                  </label>
                </div>
                <p style={{ fontSize: '11px', color: '#14532d', margin: 0, paddingLeft: '24px' }}>
                  Candidate will automatically receive a formatted email alert 24 hours prior to the confirmed interview with Google Meet link and instructions.
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowProposeModal(false)}
                  {...stylex.props(styles.secondaryBtn)}
                >
                  Cancel
                </button>

                <button type="submit" {...stylex.props(styles.primaryBtn)}>
                  <CalendarCheck size={16} />
                  <span>Send Proposals &amp; Sync Pipeline</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: COMPLETE & FEEDBACK */}
      {feedbackModalInterview && (
        <div {...stylex.props(styles.overlay)} onClick={() => setFeedbackModalInterview(null)}>
          <div {...stylex.props(styles.modal)} onClick={(e) => e.stopPropagation()}>
            <div {...stylex.props(styles.modalHeader)}>
              <h3 {...stylex.props(styles.modalTitle)}>Complete Interview &amp; Record Feedback</h3>
              <button
                onClick={() => setFeedbackModalInterview(null)}
                style={{ padding: '6px', background: 'none', border: 0, cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '0.8125rem', color: '#475569', margin: 0 }}>
                Record assessment notes for <strong>{feedbackModalInterview.title}</strong>. This updates both the interview record and the candidate's hiring pipeline notes.
              </p>

              <div {...stylex.props(styles.formGroup)}>
                <label {...stylex.props(styles.label)}>Interview Assessment / Performance Notes *</label>
                <textarea
                  value={feedbackNote}
                  onChange={(e) => setFeedbackNote(e.target.value)}
                  placeholder="e.g. Strong system design instincts. Handled edge cases effectively. Recommend advancing."
                  {...stylex.props(styles.textarea)}
                  required
                />
              </div>

              {/* Option to advance to Offered */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', backgroundColor: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                <input
                  type="checkbox"
                  id="advanceOffer"
                  checked={advanceToOffer}
                  onChange={(e) => setAdvanceToOffer(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#059669', cursor: 'pointer' }}
                />
                <label htmlFor="advanceOffer" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#065f46', cursor: 'pointer' }}>
                  Candidate passed this round: Advance to "Offered" in Pipeline
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setFeedbackModalInterview(null)}
                  {...stylex.props(styles.secondaryBtn)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    updateInterviewStatus(feedbackModalInterview.id, 'completed', feedbackNote);
                    if (advanceToOffer) {
                      updateApplicationStage(feedbackModalInterview.applicationId, 'offered', `Passed interview: ${feedbackNote}`);
                    }
                    setFeedbackModalInterview(null);
                  }}
                  {...stylex.props(styles.primaryBtn)}
                >
                  <CheckCircle2 size={16} />
                  <span>Save Feedback &amp; Mark Completed</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RESCHEDULE */}
      {rescheduleModalInterview && (
        <div {...stylex.props(styles.overlay)} onClick={() => setRescheduleModalInterview(null)}>
          <div {...stylex.props(styles.modal)} onClick={(e) => e.stopPropagation()}>
            <div {...stylex.props(styles.modalHeader)}>
              <h3 {...stylex.props(styles.modalTitle)}>Reschedule Interview</h3>
              <button
                onClick={() => setRescheduleModalInterview(null)}
                style={{ padding: '6px', background: 'none', border: 0, cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '0.8125rem', color: '#475569', margin: 0 }}>
                Propose new time slots for <strong>{rescheduleModalInterview.title}</strong>.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {rescheduleSlots.map((s, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '140px 120px 100px',
                      gap: '8px',
                      alignItems: 'center',
                    }}
                  >
                    <input
                      type="date"
                      value={s.date}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRescheduleSlots((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, date: val } : item))
                        );
                      }}
                      style={{ padding: '8px', fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                    <input
                      type="time"
                      value={s.time}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRescheduleSlots((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, time: val } : item))
                        );
                      }}
                      style={{ padding: '8px', fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                    <select
                      value={s.duration}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setRescheduleSlots((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, duration: val } : item))
                        );
                      }}
                      style={{ padding: '8px', fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    >
                      <option value={30}>30 mins</option>
                      <option value={45}>45 mins</option>
                      <option value={60}>60 mins</option>
                    </select>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setRescheduleModalInterview(null)}
                  {...stylex.props(styles.secondaryBtn)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const newSlots: InterviewSlot[] = rescheduleSlots.map((s, i) => ({
                      id: `reslot_${Date.now()}_${i}`,
                      dateTime: `${s.date}T${s.time}:00`,
                      durationMinutes: s.duration,
                      notes: `Rescheduled option ${i + 1}`,
                    }));
                    rescheduleInterview(rescheduleModalInterview.id, newSlots, 'Rescheduled to new time slot');
                    setRescheduleModalInterview(null);
                  }}
                  {...stylex.props(styles.primaryBtn)}
                >
                  <RotateCcw size={15} />
                  <span>Send Rescheduled Proposals</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CANCEL REASON */}
      {cancelModalInterview && (
        <div {...stylex.props(styles.overlay)} onClick={() => setCancelModalInterview(null)}>
          <div {...stylex.props(styles.modal)} onClick={(e) => e.stopPropagation()}>
            <div {...stylex.props(styles.modalHeader)}>
              <h3 {...stylex.props(styles.modalTitle)}>Cancel Interview</h3>
              <button
                onClick={() => setCancelModalInterview(null)}
                style={{ padding: '6px', background: 'none', border: 0, cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '0.8125rem', color: '#475569', margin: 0 }}>
                Are you sure you want to cancel the interview for <strong>{cancelModalInterview.title}</strong>?
              </p>

              <div {...stylex.props(styles.formGroup)}>
                <label {...stylex.props(styles.label)}>Reason for Cancellation</label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Role filled internally, candidate requested withdrawal"
                  {...stylex.props(styles.input)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setCancelModalInterview(null)}
                  {...stylex.props(styles.secondaryBtn)}
                >
                  Keep Interview
                </button>

                <button
                  type="button"
                  onClick={() => {
                    cancelInterview(cancelModalInterview.id, cancelReason);
                    setCancelModalInterview(null);
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#fff',
                    backgroundColor: '#dc2626',
                    border: 0,
                    cursor: 'pointer',
                  }}
                >
                  Confirm Cancellation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PREVIEW 24H EMAIL ALERT */}
      {previewEmailInterview && (
        <ReminderEmailPreviewModal
          interview={previewEmailInterview}
          onClose={() => setPreviewEmailInterview(null)}
        />
      )}
    </div>
  );
};
