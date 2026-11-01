import { Interview, User, InterviewReminderAlert, InterviewType, InterviewMode } from '../types';

export const calculate24hReminderTime = (dateTimeIso: string): Date => {
  const interviewDate = new Date(dateTimeIso);
  // Exactly 24 hours (86,400,000 ms) before the confirmed interview
  return new Date(interviewDate.getTime() - 24 * 60 * 60 * 1000);
};

export const is24hReminderDue = (
  interviewDateTimeIso: string,
  alreadySent?: boolean,
  enabled: boolean = true
): boolean => {
  if (!enabled || alreadySent) return false;
  const interviewDate = new Date(interviewDateTimeIso);
  const now = Date.now();

  // If the interview has already ended (e.g. older than 2 hours ago), don't send retroactive reminder
  if (now > interviewDate.getTime() + 2 * 60 * 60 * 1000) {
    return false;
  }

  const reminderDate = calculate24hReminderTime(interviewDateTimeIso);
  // Due if current time is at or past the 24-hour mark prior to interview
  return now >= reminderDate.getTime();
};

export const getReminderScheduleInfo = (
  interviewDateTimeIso: string,
  sent?: boolean,
  sentAt?: string
): {
  scheduledFor: string;
  isSent: boolean;
  isDue: boolean;
  statusLabel: string;
  relativeCountdown: string;
} => {
  const reminderDate = calculate24hReminderTime(interviewDateTimeIso);
  const now = Date.now();
  const diffMs = reminderDate.getTime() - now;

  if (sent) {
    return {
      scheduledFor: reminderDate.toISOString(),
      isSent: true,
      isDue: false,
      statusLabel: 'Sent',
      relativeCountdown: sentAt ? `Sent on ${new Date(sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : 'Dispatched',
    };
  }

  if (diffMs <= 0) {
    return {
      scheduledFor: reminderDate.toISOString(),
      isSent: false,
      isDue: true,
      statusLabel: 'Due Now',
      relativeCountdown: 'Within 24h window (Pending Dispatch)',
    };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  let countdown = '';
  if (days > 0) {
    countdown = `in ${days}d ${remainingHours}h`;
  } else if (hours > 0) {
    countdown = `in ${hours} hr${hours > 1 ? 's' : ''}`;
  } else {
    const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    countdown = `in ${mins} min${mins > 1 ? 's' : ''}`;
  }

  return {
    scheduledFor: reminderDate.toISOString(),
    isSent: false,
    isDue: false,
    statusLabel: 'Scheduled',
    relativeCountdown: `Triggers ${countdown}`,
  };
};

export const formatInterviewTypeLabel = (type: InterviewType): string => {
  switch (type) {
    case 'screening': return 'Recruiter Screening Call';
    case 'technical': return 'Technical Skills Deep-Dive';
    case 'system_design': return 'System Architecture & Design';
    case 'cultural': return 'Values & Culture Alignment';
    case 'executive': return 'Executive Leadership Chat';
    default: return 'Interview';
  }
};

export const formatInterviewModeLabel = (mode: InterviewMode): string => {
  switch (mode) {
    case 'google_meet': return 'Google Meet Video';
    case 'zoom': return 'Zoom Meeting';
    case 'teams': return 'Microsoft Teams';
    case 'phone': return 'Phone Call';
    case 'in_person': return 'In-Person Onsite';
    default: return 'Online Video';
  }
};

/**
 * Generates an automated 24-hour reminder email alert object
 */
export const generate24hReminderEmail = (
  interview: Interview,
  candidate: User,
  employer: User,
  companyName: string,
  jobTitle: string,
  isAutomated: boolean = true
): InterviewReminderAlert => {
  const confirmed = interview.confirmedSlot || interview.proposedSlots[0] || {
    id: 'slot-fallback',
    dateTime: new Date(Date.now() + 86400000).toISOString(),
    durationMinutes: 45,
  };

  const scheduledFor = calculate24hReminderTime(confirmed.dateTime).toISOString();
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
    timeZoneName: 'short',
  });

  const safeCandidateName = escapeHtml(candidate.name);
  const safeJobTitle = escapeHtml(jobTitle);
  const safeCompanyName = escapeHtml(companyName);
  const safeInterviewTitle = escapeHtml(interview.title);
  const safeInterviewerName = escapeHtml(interview.interviewerName);
  const safeInterviewerEmail = escapeHtml(interview.interviewerEmail);
  const safeLocation = escapeHtml(interview.locationAddress || '');
  const rawPrepNotes = interview.customReminderNotes || interview.notes || 'Please ensure you are in a quiet environment with a stable internet connection and test your microphone beforehand.';
  const safePrepNotes = escapeHtml(rawPrepNotes);

  const subject = `Reminder: 24h Until Your Interview for ${jobTitle} at ${companyName}`;
  const meetLink = interview.meetingLink || 'https://meet.google.com/catchable-interview';
  const safeMeetLink = escapeHtml(meetLink);

  const bodyText = `
Hi ${candidate.name},

This is an automated reminder that your upcoming interview with ${companyName} is scheduled in 24 hours:

Role: ${jobTitle}
Round: ${interview.title} (${formatInterviewTypeLabel(interview.interviewType)})
Date & Time: ${formattedDate} at ${formattedTime}
Duration: ${confirmed.durationMinutes} minutes
Format: ${formatInterviewModeLabel(interview.mode)}
${interview.meetingLink ? `Meeting Link: ${meetLink}` : ''}
${interview.locationAddress ? `Location: ${interview.locationAddress}` : ''}
Interviewer: ${interview.interviewerName} (${interview.interviewerEmail})

Preparation Tips & Notes:
${rawPrepNotes}

Need to reschedule or have questions? Contact ${interview.interviewerEmail} or update via Catchablepro.

Best regards,
${companyName} Hiring Team & Catchablepro Automated Scheduler
`.trim();

  const bodyHtml = `
<div style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
  <div style="background: #4338ca; padding: 24px; color: #ffffff;">
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 6px;">24-Hour Interview Reminder</span>
      <span style="font-size: 12px; opacity: 0.9;">Catchablepro Scheduler</span>
    </div>
    <h1 style="margin: 16px 0 6px; font-size: 22px; font-weight: 800; color: #ffffff;">Upcoming Interview Tomorrow</h1>
    <p style="margin: 0; font-size: 14px; opacity: 0.95;">Hi ${safeCandidateName}, your interview for <strong>${safeJobTitle}</strong> at <strong>${safeCompanyName}</strong> is confirmed in 24 hours.</p>
  </div>

  <div style="padding: 24px;">
    <!-- Key Details Box -->
    <div style="background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; padding: 18px; margin-bottom: 20px;">
      <div style="margin-bottom: 12px;">
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 700;">Interview Round</span>
        <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 2px;">${safeInterviewTitle}</div>
        <div style="font-size: 12px; color: #4338ca; font-weight: 600;">${formatInterviewTypeLabel(interview.interviewType)}</div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
        <div>
          <span style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700;">Date & Time</span>
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px;">${formattedDate}</div>
          <div style="font-size: 12px; font-weight: 600; color: #059669;">${formattedTime} (${confirmed.durationMinutes} mins)</div>
        </div>
        <div>
          <span style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700;">Interviewer</span>
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px;">${safeInterviewerName}</div>
          <div style="font-size: 12px; color: #64748b;">${safeInterviewerEmail}</div>
        </div>
      </div>
    </div>

    <!-- Video Link CTA -->
    ${interview.meetingLink ? `
    <div style="text-align: center; margin: 24px 0;">
      <a href="${safeMeetLink}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.3);">
        Join Video Meeting (${formatInterviewModeLabel(interview.mode)})
      </a>
      <div style="font-size: 11px; color: #64748b; margin-top: 8px;">Direct link: <a href="${safeMeetLink}" style="color: #4f46e5;">${safeMeetLink}</a></div>
    </div>
    ` : ''}

    <!-- Preparation Checklist -->
    <div style="border: 1px solid #c7d2fe; background: #eef2ff; padding: 14px 18px; border-radius: 8px; margin-bottom: 20px;">
      <div style="font-size: 13px; font-weight: 700; color: #3730a3; margin-bottom: 4px;">Preparation Checklist & Notes</div>
      <div style="font-size: 13px; color: #1e1b4b; line-height: 1.5;">${safePrepNotes}</div>
    </div>

    <div style="font-size: 12px; color: #64748b; line-height: 1.6; border-top: 1px solid #f1f5f9; padding-top: 16px;">
      <p style="margin: 0 0 6px;">Need to adjust your time slot or have an emergency? Please notify ${safeInterviewerEmail} at the earliest so we can accommodate you.</p>
      <p style="margin: 0; color: #94a3b8; font-size: 11px;">Sent automatically by Catchablepro Interview Engine on behalf of ${safeCompanyName}.</p>
    </div>
  </div>
</div>
`.trim();

  return {
    id: `alert_${interview.id}_24h_${Date.now()}`,
    interviewId: interview.id,
    candidateId: candidate.id,
    candidateEmail: candidate.email,
    candidateName: candidate.name,
    employerId: employer.id,
    companyName,
    jobId: interview.jobId,
    jobTitle,
    interviewTitle: interview.title,
    interviewType: interview.interviewType,
    confirmedDateTime: confirmed.dateTime,
    durationMinutes: confirmed.durationMinutes,
    mode: interview.mode,
    meetingLink: interview.meetingLink,
    locationAddress: interview.locationAddress,
    interviewerName: interview.interviewerName,
    interviewerEmail: interview.interviewerEmail,
    notes: interview.notes,
    customReminderNotes: interview.customReminderNotes,
    type: '24h_before',
    scheduledFor,
    sentAt: new Date().toISOString(),
    status: 'sent',
    emailSubject: subject,
    emailBodyHtml: bodyHtml,
    emailBodyText: bodyText,
    isAutomated,
    acknowledgedByCandidate: false,
  };
};

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeIcs(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Generates an iCalendar (.ics) string for 1-click import into Google Calendar / Apple Calendar / Outlook
 */
export const generateIcsContent = (
  interview: Interview,
  jobTitle: string,
  companyName: string
): string => {
  const slot = interview.confirmedSlot || interview.proposedSlots[0];
  if (!slot) return '';

  const start = new Date(slot.dateTime);
  const end = new Date(start.getTime() + slot.durationMinutes * 60 * 1000);

  const formatIcsDate = (d: Date) => {
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const title = escapeIcs(`Interview: ${jobTitle} (${interview.title}) - ${companyName}`);
  const description = escapeIcs(`Round: ${interview.title}\nInterviewer: ${interview.interviewerName} (${interview.interviewerEmail})\nFormat: ${formatInterviewModeLabel(interview.mode)}\nMeeting Link: ${interview.meetingLink || 'N/A'}`);
  const location = escapeIcs(interview.meetingLink || interview.locationAddress || 'Online');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Catchablepro//Interview Scheduler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:interview-${interview.id}-${Date.now()}@catchablepro.io`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: Interview in 24 hours',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
};
