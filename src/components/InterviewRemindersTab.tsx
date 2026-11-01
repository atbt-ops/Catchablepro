import React, { useState, useMemo } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useApp } from '../context/AppContext';
import { Interview, InterviewReminderAlert, User, Job } from '../types';
import { getReminderScheduleInfo } from '../services/reminders';
import { ReminderEmailPreviewModal } from './ReminderEmailPreviewModal';
import {
  Mail,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  Eye,
  Settings,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Check,
  Video,
  UserCheck,
  Calendar,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { colors, spacing, radii, shadows } from '../theme/tokens.stylex';

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
  },
  statusHero: {
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
  heroLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroIconBadge: {
    width: '44px',
    height: '44px',
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
  heroTitle: {
    fontSize: '1.125rem',
    fontWeight: 800,
    color: colors.text,
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  heroSubtitle: {
    fontSize: '0.75rem',
    color: colors.textSecondary,
    margin: '2px 0 0',
  },
  livePill: {
    fontSize: '0.625rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '2px 8px',
    borderRadius: radii.sm,
    backgroundColor: '#dcfce7',
    color: '#15803d',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#86efac',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  pulseDot: {
    width: '6px',
    height: '6px',
    borderRadius: radii.full,
    backgroundColor: '#16a34a',
  },
  heroBtnGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  primaryBtn: {
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: '14px',
    paddingRight: '14px',
    borderRadius: radii.md,
    fontSize: '0.75rem',
    fontWeight: 700,
    color: colors.textInverse,
    backgroundColor: colors.primary,
    borderWidth: 0,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: shadows.sm,
  },
  secondaryBtn: {
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: '12px',
    paddingRight: '12px',
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
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
    gap: spacing.md,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    padding: spacing.md,
    boxShadow: shadows.sm,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  statLabel: {
    fontSize: '0.625rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: colors.textMuted,
    letterSpacing: '0.05em',
  },
  statValue: {
    fontSize: '1.375rem',
    fontWeight: 900,
    color: colors.text,
  },
  statSub: {
    fontSize: '0.6875rem',
    color: colors.textSecondary,
  },
  controlsBar: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: `${spacing.sm} ${spacing.md}`,
    borderRadius: radii.lg,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    padding: '6px 10px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    minWidth: '220px',
  },
  searchInput: {
    borderWidth: 0,
    background: 'none',
    outline: 'none',
    fontSize: '0.75rem',
    color: colors.text,
    width: '100%',
  },
  filterPillRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  filterPill: {
    padding: '4px 10px',
    borderRadius: radii.md,
    fontSize: '0.6875rem',
    fontWeight: 600,
    cursor: 'pointer',
    borderWidth: '1px',
    borderStyle: 'solid',
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
  tableCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    boxShadow: shadows.sm,
    overflow: 'hidden',
  },
  remindersList: {
    display: 'flex',
    flexDirection: 'column',
    divideY: '1px solid',
  },
  reminderRow: {
    padding: spacing.md,
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: colors.border,
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: {
      default: colors.surface,
      ':hover': colors.surfaceSubtle,
    },
    transition: 'background-color 0.15s ease',
  },
  candidateInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    minWidth: {
      default: '100%',
      '@media (min-width: 640px)': '240px',
    },
    flex: '1 1 auto',
  },
  avatar: {
    width: '38px',
    height: '38px',
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
    color: colors.primary,
    fontWeight: 800,
    fontSize: '0.8125rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  interviewInfo: {
    minWidth: {
      default: '100%',
      '@media (min-width: 640px)': '220px',
    },
    flex: '1 1 auto',
  },
  statusBadgeSent: {
    backgroundColor: '#ecfdf5',
    color: '#065f46',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#a7f3d0',
    borderRadius: radii.sm,
    padding: '3px 8px',
    fontSize: '0.6875rem',
    fontWeight: 800,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  statusBadgeScheduled: {
    backgroundColor: '#eff6ff',
    color: '#1e40af',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#bfdbfe',
    borderRadius: radii.sm,
    padding: '3px 8px',
    fontSize: '0.6875rem',
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  statusBadgeDue: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#fde68a',
    borderRadius: radii.sm,
    padding: '3px 8px',
    fontSize: '0.6875rem',
    fontWeight: 800,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  statusBadgeDisabled: {
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#e2e8f0',
    borderRadius: radii.sm,
    padding: '3px 8px',
    fontSize: '0.6875rem',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  actionsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  miniActionBtn: {
    padding: '5px 10px',
    borderRadius: radii.md,
    fontSize: '0.6875rem',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    borderWidth: '1px',
    borderStyle: 'solid',
    transition: 'all 0.15s ease',
  },
  emptyState: {
    padding: spacing.xxl,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.sm,
  },
});

export const InterviewRemindersTab: React.FC = () => {
  const {
    interviews,
    users,
    jobs,
    currentUser,
    reminderAlerts,
    send24hReminderNow,
    toggle24hReminder,
    updateCustomReminderNotes,
    triggerAutomatedReminderCheck,
    showToast,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'sent' | 'scheduled' | 'due'>('all');
  const [selectedInterviewForPreview, setSelectedInterviewForPreview] = useState<Interview | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<number | null>(null);
  const [customNoteDraft, setCustomNoteDraft] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Confirmed interviews for current employer
  const confirmedInterviews = useMemo(() => {
    const employerId = currentUser?.id || 1;
    return interviews
      .filter((iv) => iv.employerId === employerId && iv.status === 'confirmed' && iv.confirmedSlot)
      .sort((a, b) => {
        const timeA = new Date(a.confirmedSlot!.dateTime).getTime();
        const timeB = new Date(b.confirmedSlot!.dateTime).getTime();
        return timeA - timeB;
      });
  }, [interviews, currentUser]);

  // Filtered list
  const filteredInterviews = useMemo(() => {
    return confirmedInterviews.filter((iv) => {
      const candidate = users.find((u) => u.id === iv.candidateId);
      const job = jobs.find((j) => j.id === iv.jobId);
      const scheduleInfo = getReminderScheduleInfo(
        iv.confirmedSlot!.dateTime,
        iv.reminder24hSent,
        iv.reminder24hSentAt
      );

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = candidate?.name.toLowerCase().includes(q);
        const matchTitle = iv.title.toLowerCase().includes(q);
        const matchJob = job?.title.toLowerCase().includes(q);
        if (!matchName && !matchTitle && !matchJob) return false;
      }

      // Status filter
      if (filterStatus === 'sent' && !iv.reminder24hSent) return false;
      if (filterStatus === 'scheduled' && (iv.reminder24hSent || scheduleInfo.isDue)) return false;
      if (filterStatus === 'due' && (iv.reminder24hSent || !scheduleInfo.isDue)) return false;

      return true;
    });
  }, [confirmedInterviews, searchQuery, filterStatus, users, jobs]);

  // Aggregated Stats
  const stats = useMemo(() => {
    let sent = 0;
    let scheduled = 0;
    let due = 0;
    let ack = 0;

    confirmedInterviews.forEach((iv) => {
      const info = getReminderScheduleInfo(
        iv.confirmedSlot!.dateTime,
        iv.reminder24hSent,
        iv.reminder24hSentAt
      );
      if (iv.reminder24hSent) {
        sent++;
      } else if (info.isDue) {
        due++;
      } else {
        scheduled++;
      }
    });

    reminderAlerts.forEach((a) => {
      if (a.acknowledgedByCandidate) ack++;
    });

    return { total: confirmedInterviews.length, sent, scheduled, due, acknowledged: ack };
  }, [confirmedInterviews, reminderAlerts]);

  const handleManualCheck = () => {
    setIsRefreshing(true);
    const sent = triggerAutomatedReminderCheck();
    setTimeout(() => {
      setIsRefreshing(false);
      showToast({
        type: sent > 0 ? 'success' : 'info',
        title: '24h Reminder Check Complete ⏱️',
        message: sent > 0
          ? `Dispatched ${sent} due email alert(s).`
          : 'All confirmed interviews are up-to-date with no pending alerts.',
      });
    }, 400);
  };

  const handleStartEditNotes = (iv: Interview) => {
    setEditingNotesId(iv.id);
    setCustomNoteDraft(iv.customReminderNotes || iv.notes || '');
  };

  const handleSaveNotes = (id: number) => {
    updateCustomReminderNotes(id, customNoteDraft);
    setEditingNotesId(null);
  };

  return (
    <div {...stylex.props(styles.container)}>
      {/* Live Status Hero */}
      <div {...stylex.props(styles.statusHero)}>
        <div {...stylex.props(styles.heroLeft)}>
          <div {...stylex.props(styles.heroIconBadge)}>
            <Mail size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 {...stylex.props(styles.heroTitle)}>Automated 24-Hour Interview Reminders</h2>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669', display: 'inline-flex', alignItems: 'center' }}>
                Auto-Daemon Active
              </span>
            </div>
            <p {...stylex.props(styles.heroSubtitle)}>
              Automatically sends a formatted email alert with Google Meet link and preparation checklist exactly 24 hours prior to every confirmed interview.
            </p>
          </div>
        </div>

        <div {...stylex.props(styles.heroBtnGroup)}>
          <button
            onClick={handleManualCheck}
            disabled={isRefreshing}
            {...stylex.props(styles.secondaryBtn)}
            title="Scan interviews for pending 24h triggers"
          >
            <RefreshCw size={13} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
            <span>{isRefreshing ? 'Checking...' : 'Check Triggers Now'}</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div {...stylex.props(styles.statsRow)}>
        <div {...stylex.props(styles.statCard)}>
          <span {...stylex.props(styles.statLabel)}>Confirmed Interviews</span>
          <span {...stylex.props(styles.statValue)}>{stats.total}</span>
          <span {...stylex.props(styles.statSub)}>Upcoming candidate sessions</span>
        </div>

        <div {...stylex.props(styles.statCard)}>
          <span {...stylex.props(styles.statLabel)} style={{ color: '#059669' }}>
            Alerts Dispatched (Sent)
          </span>
          <span {...stylex.props(styles.statValue)} style={{ color: '#059669' }}>
            {stats.sent}
          </span>
          <span {...stylex.props(styles.statSub)}>24h reminder emails delivered</span>
        </div>

        <div {...stylex.props(styles.statCard)}>
          <span {...stylex.props(styles.statLabel)} style={{ color: '#2563eb' }}>
            In Queue (Next 24h - 48h)
          </span>
          <span {...stylex.props(styles.statValue)} style={{ color: '#2563eb' }}>
            {stats.scheduled}
          </span>
          <span {...stylex.props(styles.statSub)}>Auto-send scheduled at T-24h</span>
        </div>

        <div {...stylex.props(styles.statCard)}>
          <span {...stylex.props(styles.statLabel)} style={{ color: '#7c3aed' }}>
            Candidate Acknowledged
          </span>
          <span {...stylex.props(styles.statValue)} style={{ color: '#7c3aed' }}>
            {stats.acknowledged}
          </span>
          <span {...stylex.props(styles.statSub)}>Confirmed attendance via email</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div {...stylex.props(styles.controlsBar)}>
        <div {...stylex.props(styles.searchBox)}>
          <Search size={14} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search by candidate, role, or round..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            {...stylex.props(styles.searchInput)}
          />
        </div>

        <div {...stylex.props(styles.filterPillRow)}>
          <button
            onClick={() => setFilterStatus('all')}
            {...stylex.props(
              styles.filterPill,
              filterStatus === 'all' ? styles.filterPillActive : styles.filterPillInactive
            )}
          >
            All Confirmed ({confirmedInterviews.length})
          </button>
          <button
            onClick={() => setFilterStatus('sent')}
            {...stylex.props(
              styles.filterPill,
              filterStatus === 'sent' ? styles.filterPillActive : styles.filterPillInactive
            )}
          >
            Delivered ({stats.sent})
          </button>
          <button
            onClick={() => setFilterStatus('scheduled')}
            {...stylex.props(
              styles.filterPill,
              filterStatus === 'scheduled' ? styles.filterPillActive : styles.filterPillInactive
            )}
          >
            Upcoming Queue ({stats.scheduled})
          </button>
          {stats.due > 0 && (
            <button
              onClick={() => setFilterStatus('due')}
              {...stylex.props(
                styles.filterPill,
                filterStatus === 'due' ? styles.filterPillActive : styles.filterPillInactive
              )}
            >
              Due Now ({stats.due})
            </button>
          )}
        </div>
      </div>

      {/* Reminders Queue Table / Card List */}
      <div {...stylex.props(styles.tableCard)}>
        {filteredInterviews.length > 0 ? (
          <div {...stylex.props(styles.remindersList)}>
            {filteredInterviews.map((iv) => {
              const candidate = users.find((u) => u.id === iv.candidateId);
              const job = jobs.find((j) => j.id === iv.jobId);
              const scheduleInfo = getReminderScheduleInfo(
                iv.confirmedSlot!.dateTime,
                iv.reminder24hSent,
                iv.reminder24hSentAt
              );
              const isEditingThis = editingNotesId === iv.id;
              const slot = iv.confirmedSlot!;
              const d = new Date(slot.dateTime);
              const formattedDate = d.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });
              const formattedTime = d.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              });

              return (
                <div key={iv.id} {...stylex.props(styles.reminderRow)}>
                  {/* Candidate Info */}
                  <div {...stylex.props(styles.candidateInfo)}>
                    <div {...stylex.props(styles.avatar)}>
                      {candidate?.name
                        .split(' ')
                        .map((p) => p[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase() || 'CA'}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 800, color: colors.text }}>
                        {candidate?.name || 'Candidate'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                        {candidate?.email}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: colors.primary, fontWeight: 600 }}>
                        {job?.title}
                      </div>
                    </div>
                  </div>

                  {/* Interview Session Info */}
                  <div {...stylex.props(styles.interviewInfo)}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: colors.text }}>
                      {iv.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <Calendar size={12} />
                      <span>{formattedDate} at {formattedTime} ({slot.durationMinutes}m)</span>
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: colors.textMuted }}>
                      Interviewer: {iv.interviewerName}
                    </div>
                  </div>

                  {/* 24-Hour Reminder Status Badge */}
                  <div style={{ minWidth: '170px' }}>
                    <div style={{ marginBottom: '4px' }}>
                      {iv.reminder24hEnabled === false ? (
                        <span {...stylex.props(styles.statusBadgeDisabled)}>
                          <Clock size={11} />
                          <span>Reminder Disabled</span>
                        </span>
                      ) : iv.reminder24hSent ? (
                        <span {...stylex.props(styles.statusBadgeSent)}>
                          <CheckCircle2 size={12} color="#059669" />
                          <span>24h Alert Sent</span>
                        </span>
                      ) : scheduleInfo.isDue ? (
                        <span {...stylex.props(styles.statusBadgeDue)}>
                          <AlertCircle size={12} color="#d97706" />
                          <span>Within 24h Window</span>
                        </span>
                      ) : (
                        <span {...stylex.props(styles.statusBadgeScheduled)}>
                          <Clock size={12} color="#2563eb" />
                          <span>Auto-Send (T-24h)</span>
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: colors.textSecondary }}>
                      {scheduleInfo.relativeCountdown}
                    </div>
                  </div>

                  {/* Custom Prep Note Snippet */}
                  <div style={{ flex: '1 1 200px', maxWidth: '300px' }}>
                    {isEditingThis ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <textarea
                          value={customNoteDraft}
                          onChange={(e) => setCustomNoteDraft(e.target.value)}
                          placeholder="Candidate prep instructions for the 24h alert..."
                          rows={2}
                          style={{
                            fontSize: '0.75rem',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: `1px solid ${colors.primary}`,
                            fontFamily: 'inherit',
                            resize: 'none',
                          }}
                        />
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => handleSaveNotes(iv.id)}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              backgroundColor: colors.primary,
                              color: '#fff',
                              border: 0,
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Save Notes
                          </button>
                          <button
                            onClick={() => setEditingNotesId(null)}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              backgroundColor: '#e2e8f0',
                              border: 0,
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => handleStartEditNotes(iv)}
                        style={{
                          fontSize: '0.6875rem',
                          color: '#475569',
                          backgroundColor: '#f8fafc',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px dashed #cbd5e1',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px',
                        }}
                        title="Click to edit custom prep instructions for this candidate"
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          📝 {iv.customReminderNotes || iv.notes || 'Add custom preparation instructions...'}
                        </span>
                        <Edit2 size={11} color="#64748b" />
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div {...stylex.props(styles.actionsGroup)}>
                    <button
                      onClick={() => setSelectedInterviewForPreview(iv)}
                      {...stylex.props(styles.miniActionBtn)}
                      style={{
                        backgroundColor: '#ffffff',
                        borderColor: '#cbd5e1',
                        color: colors.text,
                      }}
                      title="Preview candidate email alert"
                    >
                      <Eye size={12} color={colors.primary} />
                      <span>Preview Email</span>
                    </button>

                    {!iv.reminder24hSent && (
                      <button
                        onClick={() => send24hReminderNow(iv.id)}
                        {...stylex.props(styles.miniActionBtn)}
                        style={{
                          backgroundColor: colors.primary,
                          borderColor: colors.primary,
                          color: '#ffffff',
                        }}
                        title="Send 24-hour reminder email alert immediately"
                      >
                        <Send size={12} />
                        <span>Send Now</span>
                      </button>
                    )}

                    <button
                      onClick={() => toggle24hReminder(iv.id, iv.reminder24hEnabled === false)}
                      {...stylex.props(styles.miniActionBtn)}
                      style={{
                        backgroundColor: '#ffffff',
                        borderColor: '#cbd5e1',
                        color: iv.reminder24hEnabled === false ? colors.textMuted : '#059669',
                      }}
                      title={iv.reminder24hEnabled === false ? 'Enable 24h auto-reminder' : 'Pause 24h auto-reminder'}
                    >
                      {iv.reminder24hEnabled === false ? (
                        <>
                          <ToggleLeft size={14} color="#94a3b8" />
                          <span>Off</span>
                        </>
                      ) : (
                        <>
                          <ToggleRight size={14} color="#059669" />
                          <span>On</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div {...stylex.props(styles.emptyState)}>
            <Mail size={40} color="#cbd5e1" />
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: colors.text, margin: 0 }}>
              No Confirmed Interviews Found
            </h3>
            <p style={{ fontSize: '0.75rem', color: colors.textSecondary, maxWidth: '400px', margin: 0 }}>
              When you confirm an interview or when a candidate selects a proposed slot, the automated 24-hour reminder schedule will appear here.
            </p>
          </div>
        )}
      </div>

      {/* Email Preview Modal */}
      {selectedInterviewForPreview && (
        <ReminderEmailPreviewModal
          interview={selectedInterviewForPreview}
          onClose={() => setSelectedInterviewForPreview(null)}
        />
      )}
    </div>
  );
};
