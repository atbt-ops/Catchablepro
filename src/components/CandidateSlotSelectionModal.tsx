import React, { useState } from 'react';
import { Interview, Job, User, InterviewSlot } from '../types';
import {
  Calendar,
  Clock,
  Video,
  CheckCircle2,
  CalendarCheck,
  CalendarClock,
  AlertCircle,
  Copy,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Send,
  X,
  User as UserIcon,
  Building2,
  Mail,
  ChevronRight,
  MapPin,
  Share2,
} from 'lucide-react';

interface CandidateSlotSelectionModalProps {
  interview: Interview;
  job?: Job;
  candidate?: User;
  employerName?: string;
  onConfirmSlot: (interviewId: number, slotId: string, isCandidateAction?: boolean) => void;
  onSubmitAlternateAvailability: (
    interviewId: number,
    notes: string,
    alternateSlot?: { date: string; time: string; duration: number }
  ) => void;
  onClose: () => void;
  isEmployerPreview?: boolean;
}

export const CandidateSlotSelectionModal: React.FC<CandidateSlotSelectionModalProps> = ({
  interview,
  job,
  candidate,
  employerName = 'Catchablepro Hiring Partner',
  onConfirmSlot,
  onSubmitAlternateAvailability,
  onClose,
  isEmployerPreview = false,
}) => {
  const [selectedSlotId, setSelectedSlotId] = useState<string>(
    interview.confirmedSlot?.id || interview.proposedSlots[0]?.id || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAlternateDrawer, setShowAlternateDrawer] = useState(false);
  const [alternateDate, setAlternateDate] = useState(
    new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10)
  );
  const [alternateTime, setAlternateTime] = useState('15:00');
  const [alternateDuration, setAlternateDuration] = useState(45);
  const [alternateNotes, setAlternateNotes] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const isConfirmed = interview.status === 'confirmed' && interview.confirmedSlot;
  const bookingUrl = `https://catchablepro.in/interviews/${interview.id}/schedule`;

  const formatSlotDateTime = (isoString: string): { weekday: string; date: string; time: string } => {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return { weekday: '', date: isoString, time: '' };
    return {
      weekday: d.toLocaleDateString('en-US', { weekday: 'long' }),
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    };
  };

  const handleConfirmSelected = () => {
    if (!selectedSlotId) return;
    setIsSubmitting(true);
    setTimeout(() => {
      onConfirmSlot(interview.id, selectedSlotId, true);
      setIsSubmitting(false);
    }, 400);
  };

  const handleSendAlternate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alternateNotes.trim()) return;
    onSubmitAlternateAvailability(interview.id, alternateNotes, {
      date: alternateDate,
      time: alternateTime,
      duration: alternateDuration,
    });
    setShowAlternateDrawer(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bookingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Google Calendar add link generator
  const getGoogleCalendarUrl = (slot: InterviewSlot) => {
    const start = new Date(slot.dateTime);
    const end = new Date(start.getTime() + slot.durationMinutes * 60000);
    const formatGCal = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const title = encodeURIComponent(`${interview.title} - ${job?.title || 'Catchablepro'}`);
    const details = encodeURIComponent(
      `Interview for ${job?.title || 'Engineering Role'}\nInterviewer: ${interview.interviewerName} (${interview.interviewerEmail})\nMeeting Link: ${interview.meetingLink || 'To be shared'}\nNotes: ${interview.notes || 'None'}`
    );
    const location = encodeURIComponent(interview.meetingLink || 'Online Video Meeting');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatGCal(start)}/${formatGCal(end)}&details=${details}&location=${location}`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 65,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          maxWidth: '680px',
          width: '100%',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Banner: In case of Employer Preview */}
        {isEmployerPreview && (
          <div
            style={{
              padding: '8px 24px',
              backgroundColor: '#4338ca',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={13} color="#a5b4fc" />
              <span>Candidate Availability Portal Simulator — Live Candidate Experience</span>
            </div>
            <button
              onClick={handleCopyLink}
              style={{
                fontSize: '10px',
                fontWeight: 800,
                color: '#e0e7ff',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: '2px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Share2 size={11} />
              <span>{copiedLink ? 'Copied Link!' : 'Copy Candidate URL'}</span>
            </button>
          </div>
        )}

        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px',
            background: 'linear-gradient(to right, #f8fafc, #ffffff)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                backgroundColor: isConfirmed ? '#ecfdf5' : '#eef2ff',
                color: isConfirmed ? '#059669' : '#4f46e5',
                border: `1px solid ${isConfirmed ? '#a7f3d0' : '#c7d2fe'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {isConfirmed ? <CheckCircle2 size={24} /> : <CalendarClock size={24} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    backgroundColor: isConfirmed ? '#ecfdf5' : '#fffbeb',
                    color: isConfirmed ? '#065f46' : '#92400e',
                    border: `1px solid ${isConfirmed ? '#a7f3d0' : '#fde68a'}`,
                  }}
                >
                  {isConfirmed ? 'Locked in Calendar ✓' : 'Awaiting Slot Selection ⏳'}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {job?.companyName || employerName}
                </span>
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '4px 0 0' }}>
                {interview.title}
              </h2>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '2px 0 0' }}>
                Role: <strong style={{ color: '#1e293b' }}>{job?.title || 'Open Position'}</strong> • Candidate:{' '}
                <strong style={{ color: '#4338ca' }}>{candidate?.name || 'Applicant'}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              padding: '6px',
              borderRadius: '8px',
              color: '#64748b',
              backgroundColor: '#f1f5f9',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Key Session Details Strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px',
              padding: '14px',
              backgroundColor: '#f8fafc',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>
                Meeting Platform
              </span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Video size={14} color="#4f46e5" />
                <span>{interview.mode === 'google_meet' ? 'Google Meet' : interview.mode === 'zoom' ? 'Zoom Video' : interview.mode}</span>
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>
                Interviewer
              </span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserIcon size={14} color="#64748b" />
                <span>{interview.interviewerName}</span>
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>
                Duration
              </span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} color="#059669" />
                <span>{interview.proposedSlots[0]?.durationMinutes || 45} minutes</span>
              </span>
            </div>
          </div>

          {/* Instructions or Prep Notes */}
          {interview.notes && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                fontSize: '0.75rem',
                color: '#334155',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <MessageSquare size={16} color="#64748b" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: '#0f172a', display: 'block', marginBottom: '2px' }}>
                  Preparation Notes from Recruiter:
                </strong>
                <span>{interview.notes}</span>
              </div>
            </div>
          )}

          {/* Candidate Alternate Availability Alert if previously submitted */}
          {interview.candidatePreferredNotes && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                fontSize: '0.75rem',
                color: '#1e40af',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <CalendarCheck size={16} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: '#1e3a8a', display: 'block', marginBottom: '2px' }}>
                  Candidate's Stated Preferred Availability:
                </strong>
                <span>"{interview.candidatePreferredNotes}"</span>
              </div>
            </div>
          )}

          {/* STATE 1: ALREADY CONFIRMED */}
          {isConfirmed && interview.confirmedSlot && (
            <div
              style={{
                padding: '24px',
                borderRadius: '18px',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                }}
              >
                <CheckCircle2 size={32} />
              </div>

              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#065f46', margin: 0 }}>
                  Confirmed for {formatSlotDateTime(interview.confirmedSlot.dateTime).weekday}
                </h3>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: '#047857', margin: '4px 0 0' }}>
                  {formatSlotDateTime(interview.confirmedSlot.dateTime).date} at{' '}
                  {formatSlotDateTime(interview.confirmedSlot.dateTime).time}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#065f46', margin: '6px 0 0' }}>
                  Duration: {interview.confirmedSlot.durationMinutes} minutes • 24h reminder notification scheduled
                </p>
              </div>

              {interview.meetingLink && (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '6px' }}>
                  <a
                    href={interview.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '10px 20px',
                      borderRadius: '10px',
                      backgroundColor: '#059669',
                      color: '#ffffff',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)',
                    }}
                  >
                    <Video size={16} />
                    <span>Join Video Room</span>
                    <ExternalLink size={14} />
                  </a>

                  <a
                    href={getGoogleCalendarUrl(interview.confirmedSlot)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '10px 18px',
                      borderRadius: '10px',
                      backgroundColor: '#ffffff',
                      color: '#065f46',
                      border: '1px solid #10b981',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Calendar size={15} />
                    <span>Add to Google Calendar</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* STATE 2: PROPOSED SLOTS (CANDIDATE SELECTS PREFERRED AVAILABILITY) */}
          {!isConfirmed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                  Choose Your Preferred Time Slot:
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                  The employer has suggested {interview.proposedSlots.length} available time options. Click on your preferred slot to confirm:
                </p>
              </div>

              {/* Slot Option Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {interview.proposedSlots.map((slot, idx) => {
                  const { weekday, date, time } = formatSlotDateTime(slot.dateTime);
                  const isSelected = selectedSlotId === slot.id;

                  return (
                    <div
                      key={slot.id}
                      onClick={() => setSelectedSlotId(slot.id)}
                      style={{
                        padding: '14px 18px',
                        borderRadius: '14px',
                        backgroundColor: isSelected ? '#f5f3ff' : '#ffffff',
                        border: `2px solid ${isSelected ? '#4f46e5' : '#e2e8f0'}`,
                        boxShadow: isSelected ? '0 4px 12px rgba(79, 70, 229, 0.12)' : '0 1px 2px rgba(0,0,0,0.02)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            border: `2px solid ${isSelected ? '#4f46e5' : '#cbd5e1'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isSelected ? '#4f46e5' : '#ffffff',
                          }}
                        >
                          {isSelected && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ffffff' }} />}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a' }}>
                              {weekday}, {date}
                            </span>
                            <span style={{ fontSize: '10px', fontWeight: 800, color: '#4338ca', backgroundColor: '#eef2ff', padding: '1px 6px', borderRadius: '4px' }}>
                              Option {idx + 1}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: '#475569', marginTop: '2px' }}>
                            <Clock size={13} color="#4f46e5" />
                            <span style={{ fontWeight: 700, color: '#1e293b' }}>{time}</span>
                            <span>•</span>
                            <span>{slot.durationMinutes} mins</span>
                            <span>•</span>
                            <span style={{ color: '#059669', fontWeight: 600 }}>Available</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSlotId(slot.id);
                          onConfirmSlot(interview.id, slot.id, true);
                        }}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: isSelected ? '#4f46e5' : '#f1f5f9',
                          color: isSelected ? '#ffffff' : '#334155',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <CheckCircle2 size={13} />
                        <span>Select Slot</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Counter-Proposal Drawer Trigger */}
              <div style={{ marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowAlternateDrawer(!showAlternateDrawer)}
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#4f46e5',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 0',
                  }}
                >
                  <CalendarCheck size={14} />
                  <span>
                    {showAlternateDrawer
                      ? 'Hide custom availability form'
                      : 'None of these times work? Propose your preferred availability'}
                  </span>
                </button>

                {showAlternateDrawer && (
                  <form
                    onSubmit={handleSendAlternate}
                    style={{
                      marginTop: '10px',
                      padding: '16px',
                      borderRadius: '14px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b' }}>
                      Suggest Your Preferred Date &amp; Time
                    </span>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                          Preferred Date
                        </label>
                        <input
                          type="date"
                          value={alternateDate}
                          min={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => setAlternateDate(e.target.value)}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px' }}
                          required
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                          Preferred Time
                        </label>
                        <input
                          type="time"
                          value={alternateTime}
                          onChange={(e) => setAlternateTime(e.target.value)}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px' }}
                          required
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                          Duration
                        </label>
                        <select
                          value={alternateDuration}
                          onChange={(e) => setAlternateDuration(Number(e.target.value))}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px' }}
                        >
                          <option value={30}>30 mins</option>
                          <option value={45}>45 mins</option>
                          <option value={60}>60 mins</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                        Availability Notes for Employer *
                      </label>
                      <textarea
                        value={alternateNotes}
                        onChange={(e) => setAlternateNotes(e.target.value)}
                        placeholder="e.g. I am available anytime after 4:00 PM IST on Thursday or Friday morning between 10 AM - 12 PM."
                        rows={2}
                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', fontFamily: 'inherit' }}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        backgroundColor: '#4338ca',
                        color: '#ffffff',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <Send size={13} />
                      <span>Send Availability to Employer</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#64748b',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              cursor: 'pointer',
            }}
          >
            {isConfirmed ? 'Done' : 'Cancel'}
          </button>

          {!isConfirmed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={handleConfirmSelected}
                disabled={!selectedSlotId || isSubmitting}
                style={{
                  padding: '10px 22px',
                  borderRadius: '10px',
                  fontSize: '0.8125rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  backgroundColor: '#4f46e5',
                  border: 'none',
                  cursor: selectedSlotId ? 'pointer' : 'not-allowed',
                  opacity: selectedSlotId ? 1 : 0.6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
                }}
              >
                <CalendarCheck size={16} />
                <span>{isSubmitting ? 'Confirming...' : 'Lock in Preferred Slot'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
