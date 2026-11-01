import React, { useState, useMemo } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useApp } from '../context/AppContext';
import {
  CalendarAvailabilityBlock,
  CalendarBlockType,
  Interview,
  InterviewSlot,
} from '../types';
import { ReminderEmailPreviewModal } from './ReminderEmailPreviewModal';
import { getReminderScheduleInfo } from '../services/reminders';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Video,
  ExternalLink,
  Copy,
  Sparkles,
  Shield,
  Layers,
  Star,
  Coffee,
  X,
  RotateCcw,
  Check,
  User,
  Briefcase,
  Mail,
  Send,
} from 'lucide-react';
import { colors, spacing, radii, shadows } from '../theme/tokens.stylex';

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    padding: spacing.lg,
    boxShadow: shadows.sm,
  },
  topBar: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: colors.border,
  },
  navControls: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  navBtn: {
    width: '32px',
    height: '32px',
    borderRadius: radii.md,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    color: colors.text,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  todayBtn: {
    paddingTop: '6px',
    paddingBottom: '6px',
    paddingLeft: '12px',
    paddingRight: '12px',
    borderRadius: radii.md,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    fontSize: '0.75rem',
    fontWeight: 700,
    color: colors.text,
    cursor: 'pointer',
  },
  weekRangeText: {
    fontSize: '1rem',
    fontWeight: 800,
    color: colors.text,
    letterSpacing: '-0.02em',
  },
  actionPresets: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  presetBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    paddingTop: '6px',
    paddingBottom: '6px',
    paddingLeft: '12px',
    paddingRight: '12px',
    borderRadius: radii.md,
    fontSize: '0.75rem',
    fontWeight: 700,
    borderWidth: '1px',
    borderStyle: 'solid',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  presetBtnPreferred: {
    backgroundColor: colors.successLight,
    color: colors.successText,
    borderColor: colors.successBorder,
  },
  presetBtnBusy: {
    backgroundColor: colors.surfaceSubtle,
    color: colors.textSecondary,
    borderColor: colors.border,
  },
  presetBtnClear: {
    backgroundColor: 'transparent',
    color: colors.textMuted,
    borderColor: colors.border,
  },
  legendBar: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingTop: '6px',
    paddingBottom: '6px',
    paddingLeft: '12px',
    paddingRight: '12px',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.lg,
    fontSize: '0.75rem',
  },
  legendGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    fontWeight: 600,
    color: colors.textSecondary,
  },
  legendColorBox: {
    width: '12px',
    height: '12px',
    borderRadius: '3px',
  },
  gridWrapper: {
    overflowX: 'auto',
    width: '100%',
    borderRadius: radii.lg,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
  },
  grid: {
    display: 'grid',
    minWidth: '760px',
  },
  headerRow: {
    display: 'grid',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: colors.border,
    backgroundColor: '#f8fafc',
  },
  headerCell: {
    paddingTop: '10px',
    paddingBottom: '10px',
    paddingLeft: '8px',
    paddingRight: '8px',
    textAlign: 'center',
    borderRightWidth: '1px',
    borderRightStyle: 'solid',
    borderRightColor: colors.border,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    minWidth: 0,
    overflow: 'hidden',
  },
  headerCellToday: {
    backgroundColor: '#eff6ff',
  },
  dayName: {
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  dayNumber: {
    fontSize: '1rem',
    fontWeight: 900,
    color: colors.text,
  },
  dayNumberToday: {
    color: colors.primary,
  },
  timeRow: {
    display: 'grid',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: '#f1f5f9',
    minHeight: '68px',
    width: '100%',
  },
  timeLabelCell: {
    paddingTop: '8px',
    paddingRight: '8px',
    textAlign: 'right',
    fontSize: '10px',
    fontWeight: 700,
    color: colors.textMuted,
    borderRightWidth: '1px',
    borderRightStyle: 'solid',
    borderRightColor: colors.border,
    backgroundColor: '#f8fafc',
    userSelect: 'none',
  },
  slotCell: {
    padding: '4px',
    borderRightWidth: '1px',
    borderRightStyle: 'solid',
    borderRightColor: '#f1f5f9',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    cursor: 'pointer',
    transition: 'background-color 0.12s ease',
    minWidth: 0,
    overflow: 'hidden',
  },
  blockItem: {
    padding: '5px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 700,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    overflow: 'hidden',
    cursor: 'pointer',
    boxShadow: shadows.sm,
    transition: 'transform 0.1s ease',
  },
  blockItemPreferred: {
    backgroundColor: '#ecfdf5',
    color: '#065f46',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#a7f3d0',
  },
  blockItemBusy: {
    backgroundColor: '#f1f5f9',
    color: '#334155',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#cbd5e1',
    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(203, 213, 225, 0.4) 10px, rgba(203, 213, 225, 0.4) 20px)',
  },
  interviewBlockConfirmed: {
    backgroundColor: '#eef2ff',
    color: '#3730a3',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#c7d2fe',
    boxShadow: shadows.md,
  },
  interviewBlockProposed: {
    backgroundColor: '#fffbeb',
    color: '#92400e',
    borderWidth: '1px',
    borderStyle: 'dashed',
    borderColor: '#fde68a',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(4px)',
    zIndex: 60,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    maxWidth: '460px',
    width: '100%',
    padding: spacing.lg,
    boxShadow: shadows.xl,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: colors.textSecondary,
  },
  input: {
    padding: '8px 12px',
    borderRadius: radii.md,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    fontSize: '0.8125rem',
    color: colors.text,
    outline: 'none',
  },
  radioRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  },
  radioCard: {
    padding: '10px 12px',
    borderRadius: radii.md,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    transition: 'all 0.15s ease',
  },
  radioCardActivePref: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
    color: '#065f46',
  },
  radioCardActiveBusy: {
    backgroundColor: '#f1f5f9',
    borderColor: '#64748b',
    color: '#0f172a',
  },
});

interface WeeklyCalendarViewProps {
  onSelectSlotForInterview?: (date: string, time: string) => void;
  selectedJobFilter?: number | 'all';
}

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

export const WeeklyCalendarView: React.FC<WeeklyCalendarViewProps> = ({
  onSelectSlotForInterview,
  selectedJobFilter,
}) => {
  const {
    currentUser,
    interviews,
    users,
    jobs,
    availabilityBlocks,
    addAvailabilityBlock,
    updateAvailabilityBlock,
    removeAvailabilityBlock,
    applyAvailabilityPreset,
    showToast,
    send24hReminderNow,
  } = useApp();

  const [previewEmailInterview, setPreviewEmailInterview] = useState<Interview | null>(null);

  // Week navigation: start of week (Monday)
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay(); // 0 is Sun, 1 is Mon...
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  const [daysCount, setDaysCount] = useState<5 | 7>(5); // 5-day workweek vs 7-day full week

  // Slot block creation/edit modal
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [blockDate, setBlockDate] = useState('');
  const [blockStartTime, setBlockStartTime] = useState('10:00');
  const [blockEndTime, setBlockEndTime] = useState('11:00');
  const [blockType, setBlockType] = useState<CalendarBlockType>('preferred');
  const [blockLabel, setBlockLabel] = useState('');

  // Interview Inspector Modal
  const [inspectInterview, setInspectInterview] = useState<Interview | null>(null);

  // Generate week dates array
  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    for (let i = 0; i < daysCount; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(currentWeekStart.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [currentWeekStart, daysCount]);

  // Navigate weeks
  const handlePrevWeek = () => {
    const prev = new Date(currentWeekStart);
    prev.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekStart);
    next.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(next);
  };

  const handleToday = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(monday);
  };

  // Format week range banner
  const weekRangeLabel = useMemo(() => {
    const first = weekDates[0];
    const last = weekDates[weekDates.length - 1];
    const optsMonth: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const optsYear: Intl.DateTimeFormatOptions = { year: 'numeric' };
    return `${first.toLocaleDateString('en-US', optsMonth)} – ${last.toLocaleDateString('en-US', optsMonth)}, ${last.toLocaleDateString('en-US', optsYear)}`;
  }, [weekDates]);

  // Check if a date is Today
  const isToday = (d: Date) => {
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  // Open modal to create block at slot
  const handleSlotClick = (dateStr: string, hour: number) => {
    const startStr = `${hour.toString().padStart(2, '0')}:00`;
    const endStr = `${(hour + 1).toString().padStart(2, '0')}:00`;
    setEditingBlockId(null);
    setBlockDate(dateStr);
    setBlockStartTime(startStr);
    setBlockEndTime(endStr);
    setBlockType('preferred');
    setBlockLabel('⭐ Preferred Interview Window');
    setShowBlockModal(true);
  };

  // Save Block
  const handleSaveBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockDate || !blockStartTime || !blockEndTime) return;

    if (editingBlockId) {
      updateAvailabilityBlock(editingBlockId, {
        date: blockDate,
        startTime: blockStartTime,
        endTime: blockEndTime,
        type: blockType,
        label: blockLabel || (blockType === 'preferred' ? 'Preferred Interview Slot' : 'Busy'),
      });
    } else {
      addAvailabilityBlock({
        employerId: currentUser?.id || 1,
        date: blockDate,
        startTime: blockStartTime,
        endTime: blockEndTime,
        type: blockType,
        label: blockLabel || (blockType === 'preferred' ? 'Preferred Interview Slot' : 'Busy'),
      });
    }

    setShowBlockModal(false);
  };

  // Open existing block for edit
  const handleEditBlock = (block: CalendarAvailabilityBlock, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBlockId(block.id);
    setBlockDate(block.date);
    setBlockStartTime(block.startTime);
    setBlockEndTime(block.endTime);
    setBlockType(block.type);
    setBlockLabel(block.label);
    setShowBlockModal(true);
  };

  // Grid column template CSS with strict column tracking to avoid misalignment
  const gridTemplate = `64px repeat(${daysCount}, minmax(130px, 1fr))`;

  return (
    <div {...stylex.props(styles.container)}>
      {/* Top Header & Navigation */}
      <div {...stylex.props(styles.topBar)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div {...stylex.props(styles.navControls)}>
            <button onClick={handlePrevWeek} {...stylex.props(styles.navBtn)} title="Previous week">
              <ChevronLeft size={18} />
            </button>
            <button onClick={handleToday} {...stylex.props(styles.todayBtn)}>
              Today
            </button>
            <button onClick={handleNextWeek} {...stylex.props(styles.navBtn)} title="Next week">
              <ChevronRight size={18} />
            </button>
          </div>

          <span {...stylex.props(styles.weekRangeText)}>{weekRangeLabel}</span>
        </div>

        {/* View & Presets Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* 5-day vs 7-day */}
          <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '2px', border: '1px solid #cbd5e1' }}>
            <button
              onClick={() => setDaysCount(5)}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 700,
                borderRadius: '6px',
                border: 0,
                backgroundColor: daysCount === 5 ? '#fff' : 'transparent',
                color: daysCount === 5 ? '#4f46e5' : '#64748b',
                boxShadow: daysCount === 5 ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                cursor: 'pointer',
              }}
            >
              Workweek (5d)
            </button>
            <button
              onClick={() => setDaysCount(7)}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 700,
                borderRadius: '6px',
                border: 0,
                backgroundColor: daysCount === 7 ? '#fff' : 'transparent',
                color: daysCount === 7 ? '#4f46e5' : '#64748b',
                boxShadow: daysCount === 7 ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                cursor: 'pointer',
              }}
            >
              Full Week (7d)
            </button>
          </div>

          {/* Quick Presets */}
          <div {...stylex.props(styles.actionPresets)}>
            <button
              onClick={() => applyAvailabilityPreset('standard_hours', weekDates[0].toISOString().slice(0, 10))}
              {...stylex.props(styles.presetBtn, styles.presetBtnPreferred)}
              title="Apply 10 AM - 1 PM & 2 PM - 5 PM preferred slots Mon-Fri"
            >
              <Star size={13} />
              <span>Standard Interview Hours</span>
            </button>

            <button
              onClick={() => applyAvailabilityPreset('block_lunch', weekDates[0].toISOString().slice(0, 10))}
              {...stylex.props(styles.presetBtn, styles.presetBtnBusy)}
              title="Block 1:00 PM - 2:00 PM as busy across workdays"
            >
              <Coffee size={13} />
              <span>Block Lunch (1-2 PM)</span>
            </button>

            <button
              onClick={() => applyAvailabilityPreset('clear_all', weekDates[0].toISOString().slice(0, 10))}
              {...stylex.props(styles.presetBtn, styles.presetBtnClear)}
              title="Clear custom blocks for this week"
            >
              <RotateCcw size={13} />
              <span>Reset Week</span>
            </button>
          </div>
        </div>
      </div>

      {/* Legend & Instructions Bar */}
      <div {...stylex.props(styles.legendBar)}>
        <div {...stylex.props(styles.legendGroup)}>
          <div {...stylex.props(styles.legendItem)}>
            <div {...stylex.props(styles.legendColorBox)} style={{ backgroundColor: '#10b981' }} />
            <span>Preferred Interview Slot (Open to Candidates)</span>
          </div>
          <div {...stylex.props(styles.legendItem)}>
            <div {...stylex.props(styles.legendColorBox)} style={{ backgroundColor: '#64748b' }} />
            <span>Busy / Focus Block (Unavailable)</span>
          </div>
          <div {...stylex.props(styles.legendItem)}>
            <div {...stylex.props(styles.legendColorBox)} style={{ backgroundColor: '#4f46e5' }} />
            <span>Confirmed Interview</span>
          </div>
          <div {...stylex.props(styles.legendItem)}>
            <div {...stylex.props(styles.legendColorBox)} style={{ backgroundColor: '#f59e0b' }} />
            <span>Proposed Slot</span>
          </div>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b' }}>
          <Clock size={12} color="#64748b" />
          <span>Click any slot to mark preferred interview hours or block busy focus time</span>
        </div>
      </div>

      {/* Weekly Interactive Calendar Grid */}
      <div {...stylex.props(styles.gridWrapper)}>
        <div {...stylex.props(styles.grid)} style={{ gridTemplateColumns: gridTemplate, minWidth: daysCount === 7 ? '974px' : '714px' }}>
          {/* Header Row: Days & Dates */}
          <div {...stylex.props(styles.headerRow)} style={{ gridTemplateColumns: gridTemplate, gridColumn: `1 / span ${daysCount + 1}` }}>
            <div style={{ padding: '10px 4px', borderRight: '1px solid #e2e8f0', textAlign: 'center', fontSize: '10px', fontWeight: 700, color: '#94a3b8' }}>
              TIME
            </div>
            {weekDates.map((date) => {
              const today = isToday(date);
              const dayShort = date.toLocaleDateString('en-US', { weekday: 'short' });
              const dayNum = date.getDate();

              return (
                <div
                  key={date.toISOString()}
                  {...stylex.props(styles.headerCell, today && styles.headerCellToday)}
                >
                  <span {...stylex.props(styles.dayName)} style={{ color: today ? '#4f46e5' : undefined }}>
                    {dayShort}
                  </span>
                  <span {...stylex.props(styles.dayNumber, today && styles.dayNumberToday)}>
                    {dayNum}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Time Rows */}
          {HOURS.map((hour) => {
            const timeLabel = `${hour > 12 ? hour - 12 : hour} ${hour >= 12 ? 'PM' : 'AM'}`;
            const hourPrefix = hour.toString().padStart(2, '0');

            return (
              <div
                key={hour}
                {...stylex.props(styles.timeRow)}
                style={{ gridTemplateColumns: gridTemplate, gridColumn: `1 / span ${daysCount + 1}` }}
              >
                {/* Time Label Cell */}
                <div {...stylex.props(styles.timeLabelCell)}>
                  {timeLabel}
                </div>

                {/* Day Slot Cells */}
                {weekDates.map((date) => {
                  const dateStr = date.toISOString().slice(0, 10);

                  // 1. Availability blocks matching this date and hour (spans full duration)
                  const cellBlocks = availabilityBlocks.filter((b) => {
                    if (b.date !== dateStr) return false;
                    const bStartH = parseInt(b.startTime.split(':')[0], 10);
                    const bEndParts = b.endTime.split(':');
                    const bEndH = parseInt(bEndParts[0], 10) + (parseInt(bEndParts[1] || '0', 10) > 0 ? 1 : 0);
                    const effectiveEndH = bEndH <= bStartH ? bStartH + 1 : bEndH;
                    return hour >= bStartH && hour < effectiveEndH;
                  });

                  // 2. Confirmed interviews matching this date and hour
                  const confirmedInterviews = interviews.filter((iv) => {
                    if (iv.status !== 'confirmed' || !iv.confirmedSlot) return false;
                    if (selectedJobFilter && selectedJobFilter !== 'all' && iv.jobId !== selectedJobFilter) return false;
                    const ivDate = iv.confirmedSlot.dateTime.slice(0, 10);
                    const ivHour = parseInt(iv.confirmedSlot.dateTime.slice(11, 13), 10);
                    return ivDate === dateStr && ivHour === hour;
                  });

                  // 3. Proposed slots matching this date and hour
                  const proposedSlots = interviews.flatMap((iv) => {
                    if (iv.status !== 'proposed') return [];
                    if (selectedJobFilter && selectedJobFilter !== 'all' && iv.jobId !== selectedJobFilter) return [];
                    return iv.proposedSlots
                      .filter((s) => {
                        const sDate = s.dateTime.slice(0, 10);
                        const sHour = parseInt(s.dateTime.slice(11, 13), 10);
                        return sDate === dateStr && sHour === hour;
                      })
                      .map((slot) => ({ interview: iv, slot }));
                  });

                  return (
                    <div
                      key={dateStr}
                      {...stylex.props(styles.slotCell)}
                      onClick={() => handleSlotClick(dateStr, hour)}
                      title={`Click to manage availability for ${dateStr} at ${timeLabel}`}
                    >
                      {/* Render Confirmed Interviews */}
                      {confirmedInterviews.map((iv) => {
                        const candidate = users.find((u) => u.id === iv.candidateId);
                        const job = jobs.find((j) => j.id === iv.jobId);

                        return (
                          <div
                            key={iv.id}
                            {...stylex.props(styles.blockItem, styles.interviewBlockConfirmed)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectInterview(iv);
                            }}
                            title="Click to view interview details"
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 800, fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                <User size={11} color="#4338ca" />
                                <span>{candidate?.name || 'Candidate'}</span>
                              </span>
                              <span style={{ fontSize: '9px', fontWeight: 800, backgroundColor: '#c7d2fe', padding: '1px 5px', borderRadius: '4px' }}>
                                {iv.confirmedSlot?.durationMinutes}m
                              </span>
                            </div>
                            <span style={{ fontSize: '10px', color: '#4338ca', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {job?.title} • {iv.title}
                            </span>
                          </div>
                        );
                      })}

                      {/* Render Proposed Interview Slots */}
                      {proposedSlots.map(({ interview: iv, slot }) => {
                        const candidate = users.find((u) => u.id === iv.candidateId);

                        return (
                          <div
                            key={slot.id}
                            {...stylex.props(styles.blockItem, styles.interviewBlockProposed)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectInterview(iv);
                            }}
                            title="Click to view proposal details"
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, fontSize: '10px' }}>
                                <Clock size={10} color="#b45309" />
                                <span>{candidate?.name || 'Proposed'}</span>
                              </span>
                              <span style={{ fontSize: '9px', fontWeight: 700 }}>
                                {slot.durationMinutes}m
                              </span>
                            </div>
                            <span style={{ fontSize: '9px', color: '#b45309' }}>
                              Awaiting candidate reply
                            </span>
                          </div>
                        );
                      })}

                      {/* Render Availability Blocks (Preferred or Busy) */}
                      {cellBlocks.map((b) => {
                        const isPref = b.type === 'preferred';
                        const bStartH = parseInt(b.startTime.split(':')[0], 10);
                        const isContinuation = hour > bStartH;

                        return (
                          <div
                            key={b.id}
                            {...stylex.props(styles.blockItem, isPref ? styles.blockItemPreferred : styles.blockItemBusy)}
                            onClick={(e) => handleEditBlock(b, e)}
                            title={`Click to edit or remove: ${b.label} (${b.startTime} - ${b.endTime})`}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {isPref ? <Star size={11} color="#059669" /> : <Shield size={11} color="#475569" />}
                                <span>{b.label}{isContinuation ? ' · cont.' : ''}</span>
                              </span>
                              <span style={{ fontSize: '9px', fontWeight: 600, opacity: 0.85 }}>
                                {b.startTime}-{b.endTime}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL 1: ADD / EDIT TIME BLOCK */}
      {showBlockModal && (
        <div {...stylex.props(styles.overlay)} onClick={() => setShowBlockModal(false)}>
          <div {...stylex.props(styles.modal)} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {editingBlockId ? 'Edit Calendar Time Block' : 'Manage Availability Slot'}
              </h3>
              <button
                onClick={() => setShowBlockModal(false)}
                style={{ background: 'none', border: 0, cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBlock} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Type Selector (Preferred vs Busy) */}
              <div {...stylex.props(styles.formGroup)}>
                <label {...stylex.props(styles.label)}>Block Category *</label>
                <div {...stylex.props(styles.radioRow)}>
                  <div
                    onClick={() => {
                      setBlockType('preferred');
                      if (!blockLabel || blockLabel.includes('Standup') || blockLabel.includes('Busy')) {
                        setBlockLabel('⭐ Preferred Interview Window');
                      }
                    }}
                    {...stylex.props(
                      styles.radioCard,
                      blockType === 'preferred' && styles.radioCardActivePref
                    )}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Star size={14} color="#059669" />
                      <strong style={{ fontSize: '0.8125rem' }}>Preferred Slot</strong>
                    </div>
                    <span style={{ fontSize: '11px', color: '#047857' }}>
                      Highlight availability for candidate interviews
                    </span>
                  </div>

                  <div
                    onClick={() => {
                      setBlockType('busy');
                      if (!blockLabel || blockLabel.includes('Interview')) {
                        setBlockLabel('Internal Meeting / Focus Time');
                      }
                    }}
                    {...stylex.props(
                      styles.radioCard,
                      blockType === 'busy' && styles.radioCardActiveBusy
                    )}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Shield size={14} color="#475569" />
                      <strong style={{ fontSize: '0.8125rem' }}>Blocked Busy Time</strong>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      Mark as occupied (standups, lunch, deep work)
                    </span>
                  </div>
                </div>
              </div>

              {/* Title / Label */}
              <div {...stylex.props(styles.formGroup)}>
                <label {...stylex.props(styles.label)}>Label / Note</label>
                <input
                  type="text"
                  value={blockLabel}
                  onChange={(e) => setBlockLabel(e.target.value)}
                  placeholder={blockType === 'preferred' ? 'e.g. ⭐ Open Tech Interview Slot' : 'e.g. Daily Standup'}
                  {...stylex.props(styles.input)}
                  required
                />
              </div>

              {/* Date & Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px' }}>
                <div {...stylex.props(styles.formGroup)}>
                  <label {...stylex.props(styles.label)}>Date</label>
                  <input
                    type="date"
                    value={blockDate}
                    onChange={(e) => setBlockDate(e.target.value)}
                    {...stylex.props(styles.input)}
                    required
                  />
                </div>

                <div {...stylex.props(styles.formGroup)}>
                  <label {...stylex.props(styles.label)}>Start</label>
                  <input
                    type="time"
                    value={blockStartTime}
                    onChange={(e) => setBlockStartTime(e.target.value)}
                    {...stylex.props(styles.input)}
                    required
                  />
                </div>

                <div {...stylex.props(styles.formGroup)}>
                  <label {...stylex.props(styles.label)}>End</label>
                  <input
                    type="time"
                    value={blockEndTime}
                    onChange={(e) => setBlockEndTime(e.target.value)}
                    {...stylex.props(styles.input)}
                    required
                  />
                </div>
              </div>

              {/* Direct Propose Interview shortcut */}
              {onSelectSlotForInterview && (
                <div
                  style={{
                    backgroundColor: '#eff6ff',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #bfdbfe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#1e40af', fontWeight: 600 }}>
                    <Sparkles size={14} color="#3b82f6" />
                    <span>Want to invite a candidate for this exact time?</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBlockModal(false);
                      onSelectSlotForInterview(blockDate, blockStartTime);
                    }}
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#fff',
                      backgroundColor: '#2563eb',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: 0,
                      cursor: 'pointer',
                    }}
                  >
                    Propose Here
                  </button>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                {editingBlockId ? (
                  <button
                    type="button"
                    onClick={() => {
                      removeAvailabilityBlock(editingBlockId);
                      setShowBlockModal(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#dc2626',
                      background: 'none',
                      border: 0,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Delete Block</span>
                  </button>
                ) : (
                  <div />
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowBlockModal(false)}
                    style={{
                      padding: '8px 14px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    style={{
                      padding: '8px 16px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      borderRadius: '8px',
                      border: 0,
                      backgroundColor: blockType === 'preferred' ? '#10b981' : '#334155',
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    {editingBlockId ? 'Save Changes' : blockType === 'preferred' ? 'Highlight Slot' : 'Block Time'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: INTERVIEW INSPECTOR */}
      {inspectInterview && (
        <div {...stylex.props(styles.overlay)} onClick={() => setInspectInterview(null)}>
          <div {...stylex.props(styles.modal)} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontSize: '10px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    backgroundColor: inspectInterview.status === 'confirmed' ? '#ecfdf5' : '#fffbeb',
                    color: inspectInterview.status === 'confirmed' ? '#065f46' : '#92400e',
                  }}
                >
                  {inspectInterview.status}
                </span>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {inspectInterview.title}
                </h3>
              </div>
              <button
                onClick={() => setInspectInterview(null)}
                style={{ background: 'none', border: 0, cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            {(() => {
              const candidate = users.find((u) => u.id === inspectInterview.candidateId);
              const job = jobs.find((j) => j.id === inspectInterview.jobId);
              const activeSlot = inspectInterview.confirmedSlot || inspectInterview.proposedSlots[0];

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.8125rem' }}>
                  <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <User size={15} color="#4f46e5" />
                      <strong>Candidate:</strong>
                      <span>{candidate?.name} ({candidate?.email})</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Briefcase size={15} color="#64748b" />
                      <strong>Position:</strong>
                      <span>{job?.title}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={15} color="#059669" />
                      <strong>Scheduled Time:</strong>
                      <span>
                        {new Date(activeSlot?.dateTime || '').toLocaleString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })} ({activeSlot?.durationMinutes} mins)
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <User size={15} color="#64748b" />
                      <strong>Interviewer:</strong>
                      <span>{inspectInterview.interviewerName}</span>
                    </div>
                  </div>

                  {inspectInterview.meetingLink && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Video size={16} color="#059669" />
                        <span style={{ fontWeight: 700, color: '#065f46' }}>Video Conference:</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <a
                          href={inspectInterview.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            backgroundColor: '#059669',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '11px',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>Launch Video Call</span>
                          <ExternalLink size={12} />
                        </a>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(inspectInterview.meetingLink || '');
                            showToast({
                              type: 'success',
                              title: 'Link Copied',
                              message: 'Meeting link copied to clipboard.',
                            });
                          }}
                          style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #a7f3d0', backgroundColor: '#fff', cursor: 'pointer', color: '#065f46' }}
                          title="Copy Link"
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 24-Hour Automated Email Alert Info */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Mail size={16} color="#16a34a" />
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#166534' }}>
                          24-Hour Email Reminder Alert
                        </div>
                        <div style={{ fontSize: '11px', color: '#15803d' }}>
                          {inspectInterview.reminder24hSent
                            ? 'Delivered to candidate inbox'
                            : 'Scheduled for automatic dispatch (T-24h)'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={() => setPreviewEmailInterview(inspectInterview)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #bbf7d0',
                          color: '#166534',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Preview Email
                      </button>
                      {!inspectInterview.reminder24hSent && (
                        <button
                          onClick={() => {
                            send24hReminderNow(inspectInterview.id);
                            setInspectInterview((prev) => prev ? { ...prev, reminder24hSent: true } : null);
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            backgroundColor: '#16a34a',
                            border: 0,
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Send size={11} />
                          <span>Send Now</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {inspectInterview.notes && (
                    <div style={{ fontSize: '0.75rem', color: '#475569', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <strong>Recruiter Instructions:</strong> {inspectInterview.notes}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: '8px' }}>
                    <button
                      onClick={() => setInspectInterview(null)}
                      style={{ padding: '6px 14px', borderRadius: '6px', backgroundColor: '#f1f5f9', border: 0, fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Preview Email Alert Modal */}
      {previewEmailInterview && (
        <ReminderEmailPreviewModal
          interview={previewEmailInterview}
          onClose={() => setPreviewEmailInterview(null)}
        />
      )}
    </div>
  );
};
