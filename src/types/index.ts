export type Role = 'candidate' | 'employer';

export interface User {
  id: number;
  email: string;
  role: Role;
  name: string;
  company_name: string;
  phone: string;
  designation: string;
  email_verified: boolean;
  is_admin: boolean;
  is_suspended: boolean;
  suspended_reason?: string;
  totp_enabled: boolean;
  totp_secret?: string;
  created_at: string;
}

export interface CandidateProfile {
  userId: number;
  headline: string;
  skills: string; // comma-separated
  resumeFilename?: string;
  resumeText?: string;
  autoApply: boolean;
  jobAlerts: boolean;
  lastAlertAt?: string;
  updatedAt: string;
}

export interface CompanyProfile {
  userId: number;
  industry: string;
  size: string;
  website: string;
  about: string;
  hqLocation: string;
  logoFilename?: string;
  walletBalancePaise: number; // In paise: 100 paise = ₹1
  onboardingStep: number; // 1 = company details, 2 = first job, 3 = complete
  updatedAt: string;
}

export type WorkMode = 'On-site' | 'Hybrid' | 'Remote';
export type EmploymentType = 'Full-time' | 'Contract' | 'Internship' | 'Part-time';
export type JobStatus = 'active' | 'paused' | 'closed' | 'draft';

export interface Job {
  id: number;
  employerId: number;
  companyName: string;
  title: string;
  description: string;
  requiredSkills: string; // comma-separated
  location: string;
  employmentType: EmploymentType;
  workMode: WorkMode;
  expMin: number;
  expMax: number;
  salaryMin: number; // In LPA (Lakhs per annum)
  salaryMax: number;
  hideSalary: boolean;
  vacancies: number;
  education: string;
  department: string;
  deadline: string;
  status: JobStatus;
  activeSince: string; // ISO string when activated
  billableSeconds: number;
  createdAt: string;
}

export type ApplicationStage = 'applied' | 'shortlisted' | 'interview' | 'offered' | 'hired' | 'rejected';

export interface Application {
  id: number;
  jobId: number;
  candidateId: number;
  matchPct: number;
  source: 'manual' | 'auto';
  status: ApplicationStage;
  notes: string;
  updatedAt: string;
  createdAt: string;
}

export interface SavedJob {
  candidateId: number;
  jobId: number;
  createdAt: string;
}

export interface WalletTransaction {
  id: number;
  userId: number;
  type: 'topup' | 'debit';
  status: 'created' | 'paid' | 'failed';
  amountPaise: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  jobId?: number;
  note: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: number;
  actorId: number | null;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId?: number;
  targetLabel: string;
  detail: string;
  ip: string;
  createdAt: string;
}

export type FeedbackCategory = 'general' | 'bug' | 'feature' | 'praise';
export type FeedbackStatus = 'new' | 'reviewed' | 'actioned' | 'dismissed';

export interface FeedbackItem {
  id: number;
  userId: number | null;
  role: string;
  email: string;
  category: FeedbackCategory;
  rating?: number; // 1-5
  message: string;
  page: string;
  status: FeedbackStatus;
  createdAt: string;
}

export interface AIDigest {
  id: number;
  kind: 'feedback_digest' | 'jd_skills';
  content: string; // JSON string or text
  coveredTo: number;
  generatedBy: string;
  createdAt: string;
}

export interface MatchDetailResult {
  pct: number;
  matched: string[];
  partial: Array<{ skill: string; via: string; kind: string; pct: number }>;
  missing: string[];
}

export interface CostState {
  daysActive: number;
  accrued: number; // INR
  dailyRate: number; // INR/day
  expired: boolean;
  daysToCap: number;
  nextRate: number | null;
  daysToNext: number | null;
  isFree: boolean;
  accruedDisplay: string;
}

export interface ToastItem {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
}

export type InterviewStatus = 'proposed' | 'confirmed' | 'completed' | 'rescheduled' | 'cancelled';
export type InterviewType = 'screening' | 'technical' | 'system_design' | 'cultural' | 'executive';
export type InterviewMode = 'google_meet' | 'zoom' | 'teams' | 'phone' | 'in_person';

export interface InterviewSlot {
  id: string;
  dateTime: string; // ISO string e.g. "2026-10-28T14:30:00"
  durationMinutes: number; // e.g. 30, 45, 60
  notes?: string;
}

export interface InterviewReminderAlert {
  id: string;
  interviewId: number;
  candidateId: number;
  candidateEmail: string;
  candidateName: string;
  employerId: number;
  companyName: string;
  jobId: number;
  jobTitle: string;
  interviewTitle: string;
  interviewType: InterviewType;
  confirmedDateTime: string; // ISO string of interview
  durationMinutes: number;
  mode: InterviewMode;
  meetingLink?: string;
  locationAddress?: string;
  interviewerName: string;
  interviewerEmail: string;
  notes?: string;
  customReminderNotes?: string;
  type: '24h_before';
  scheduledFor: string; // ISO string 24h prior to interview
  sentAt?: string; // ISO string when sent
  status: 'scheduled' | 'sent' | 'cancelled';
  emailSubject: string;
  emailBodyHtml?: string;
  emailBodyText: string;
  isAutomated: boolean;
  acknowledgedByCandidate?: boolean;
}

export interface Interview {
  id: number;
  applicationId: number;
  jobId: number;
  candidateId: number;
  employerId: number;
  title: string;
  interviewType: InterviewType;
  proposedSlots: InterviewSlot[];
  confirmedSlot?: InterviewSlot;
  mode: InterviewMode;
  meetingLink?: string;
  locationAddress?: string;
  interviewerName: string;
  interviewerEmail: string;
  notes?: string;
  status: InterviewStatus;
  feedback?: string;
  // 24-Hour Automated Reminder Tracking
  reminder24hEnabled?: boolean;
  reminder24hSent?: boolean;
  reminder24hSentAt?: string;
  reminder24hScheduledFor?: string;
  customReminderNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CalendarBlockType = 'busy' | 'preferred';

export interface CalendarAvailabilityBlock {
  id: string;
  employerId: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  type: CalendarBlockType;
  label: string;
}

