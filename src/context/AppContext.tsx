import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import {
  User,
  Role,
  CandidateProfile,
  CompanyProfile,
  Job,
  JobStatus,
  Application,
  ApplicationStage,
  SavedJob,
  WalletTransaction,
  AuditLogEntry,
  FeedbackItem,
  AIDigest,
  ToastItem,
  Interview,
  InterviewSlot,
  InterviewStatus,
  InterviewType,
  InterviewMode,
  CalendarAvailabilityBlock,
  CalendarBlockType,
  InterviewReminderAlert,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_COMPANY_PROFILES,
  INITIAL_CANDIDATE_PROFILES,
  INITIAL_JOBS,
  INITIAL_APPLICATIONS,
  INITIAL_SAVED_JOBS,
  INITIAL_WALLET_TRANSACTIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_FEEDBACK,
  INITIAL_INTERVIEWS,
  INITIAL_AVAILABILITY_BLOCKS,
  INITIAL_REMINDER_ALERTS,
} from '../data/initialData';
import { matchPct, extractSkills } from '../services/matching';
import { computeCostState } from '../services/pricing';
import {
  calculate24hReminderTime,
  is24hReminderDue,
  generate24hReminderEmail,
} from '../services/reminders';

interface AppContextType {
  currentUser: User | null;
  users: User[];
  candidateProfiles: Record<number, CandidateProfile>;
  companyProfiles: Record<number, CompanyProfile>;
  jobs: Job[];
  applications: Application[];
  savedJobs: SavedJob[];
  walletTransactions: WalletTransaction[];
  auditLogs: AuditLogEntry[];
  feedbacks: FeedbackItem[];
  aiDigests: AIDigest[];
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  dismissToast: (id: string) => void;

  // Auth & User
  setCurrentUser: (user: User | null) => void;
  switchUser: (userId: number) => void;
  login: (email: string, role?: Role) => boolean;
  register: (data: { email: string; name: string; role: Role; company_name?: string }) => User;
  logout: () => void;
  verifyEmail: (userId?: number) => void;
  updateUser: (userId: number, fields: Partial<User>) => void;
  deleteAccount: (userId: number) => void;

  // Candidate
  currentCandidateProfile: CandidateProfile | null;
  updateCandidateProfile: (fields: Partial<CandidateProfile>) => void;
  toggleAutoApply: (enabled: boolean) => void;
  handleResumeUpload: (fileName: string, rawText: string) => string[];
  applyToJob: (jobId: number, source?: 'manual' | 'auto') => boolean;
  toggleSaveJob: (jobId: number) => void;
  isJobSaved: (jobId: number) => boolean;
  hasAppliedToJob: (jobId: number) => boolean;

  // Employer
  currentCompanyProfile: CompanyProfile | null;
  updateCompanyProfile: (fields: Partial<CompanyProfile>) => void;
  postJob: (jobData: Omit<Job, 'id' | 'employerId' | 'companyName' | 'activeSince' | 'billableSeconds' | 'createdAt'>) => Job;
  updateJob: (jobId: number, fields: Partial<Job>) => void;
  setJobStatus: (jobId: number, status: JobStatus) => void;
  updateApplicationStage: (appId: number, stage: ApplicationStage, notes?: string) => void;
  topupWallet: (amountPaise: number) => void;

  // Interview Scheduler
  interviews: Interview[];
  proposeInterview: (data: {
    applicationId: number;
    jobId: number;
    candidateId: number;
    title: string;
    interviewType: InterviewType;
    proposedSlots: InterviewSlot[];
    mode: InterviewMode;
    meetingLink?: string;
    locationAddress?: string;
    interviewerName: string;
    interviewerEmail: string;
    notes?: string;
    advancePipelineStage?: boolean;
    autoConfirmFirstSlot?: boolean;
  }) => Interview;
  confirmInterviewSlot: (interviewId: number, slotId: string) => void;
  rescheduleInterview: (interviewId: number, newSlots: InterviewSlot[], notes?: string) => void;
  updateInterviewStatus: (interviewId: number, status: InterviewStatus, feedbackOrNote?: string) => void;
  cancelInterview: (interviewId: number, reason?: string) => void;

  // 24-Hour Automated Reminders
  reminderAlerts: InterviewReminderAlert[];
  send24hReminderNow: (interviewId: number) => boolean;
  toggle24hReminder: (interviewId: number, enabled: boolean) => void;
  updateCustomReminderNotes: (interviewId: number, notes: string) => void;
  acknowledgeReminder: (alertId: string) => void;
  triggerAutomatedReminderCheck: () => number;

  // Weekly Calendar Availability & Time Blocks
  availabilityBlocks: CalendarAvailabilityBlock[];
  addAvailabilityBlock: (block: Omit<CalendarAvailabilityBlock, 'id'>) => CalendarAvailabilityBlock;
  updateAvailabilityBlock: (id: string, fields: Partial<CalendarAvailabilityBlock>) => void;
  removeAvailabilityBlock: (id: string) => void;
  applyAvailabilityPreset: (preset: 'standard_hours' | 'block_lunch' | 'clear_all', startDate: string) => void;

  // Admin
  toggleUserSuspension: (userId: number, reason?: string) => void;
  deleteJobAdmin: (jobId: number) => void;
  updateFeedbackStatus: (feedbackId: number, status: FeedbackItem['status']) => void;
  generateFeedbackDigest: () => AIDigest;

  // Feedback & AI
  submitFeedback: (category: FeedbackItem['category'], rating: number, message: string, page: string) => void;
  extractSkillsFromJd: (text: string) => string[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'catchablepro_';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load state from localStorage or initial seed
  const loadStored = <T,>(key: string, fallback: T): T => {
    try {
      const item = localStorage.getItem(STORAGE_KEY_PREFIX + key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  };

  const [users, setUsers] = useState<User[]>(() => loadStored('users', INITIAL_USERS));
  const [currentUser, setCurrentUserState] = useState<User | null>(() => {
    const stored = loadStored<User | null>('current_user', null);
    if (stored) return stored;
    // Default to candidate Asha Verma for instant exploration
    return INITIAL_USERS.find((u) => u.id === 3) || INITIAL_USERS[0];
  });

  const [candidateProfiles, setCandidateProfiles] = useState<Record<number, CandidateProfile>>(
    () => loadStored('candidate_profiles', INITIAL_CANDIDATE_PROFILES)
  );
  const [companyProfiles, setCompanyProfiles] = useState<Record<number, CompanyProfile>>(
    () => loadStored('company_profiles', INITIAL_COMPANY_PROFILES)
  );
  const [jobs, setJobs] = useState<Job[]>(() => loadStored('jobs', INITIAL_JOBS));
  const [applications, setApplications] = useState<Application[]>(() =>
    loadStored('applications', INITIAL_APPLICATIONS)
  );
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>(() =>
    loadStored('saved_jobs', INITIAL_SAVED_JOBS)
  );
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>(() =>
    loadStored('wallet_transactions', INITIAL_WALLET_TRANSACTIONS)
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() =>
    loadStored('audit_logs', INITIAL_AUDIT_LOGS)
  );
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>(() =>
    loadStored('feedbacks', INITIAL_FEEDBACK)
  );
  const [aiDigests, setAiDigests] = useState<AIDigest[]>(() => loadStored('ai_digests', []));
  const [interviews, setInterviews] = useState<Interview[]>(() =>
    loadStored('interviews', INITIAL_INTERVIEWS)
  );
  const [reminderAlerts, setReminderAlerts] = useState<InterviewReminderAlert[]>(() =>
    loadStored('reminder_alerts', INITIAL_REMINDER_ALERTS)
  );
  const [availabilityBlocks, setAvailabilityBlocks] = useState<CalendarAvailabilityBlock[]>(() =>
    loadStored('availability_blocks', INITIAL_AVAILABILITY_BLOCKS)
  );
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Live state refs to guarantee background timer always accesses fresh state
  const interviewsRef = useRef(interviews);
  interviewsRef.current = interviews;
  const usersRef = useRef(users);
  usersRef.current = users;
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;

  const showToast = (toast: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9) + Date.now();
    setToasts((prev) => [...prev.slice(-4), { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync state changes to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'users', JSON.stringify(users));
  }, [users]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'current_user', JSON.stringify(currentUser));
  }, [currentUser]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'candidate_profiles', JSON.stringify(candidateProfiles));
  }, [candidateProfiles]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'company_profiles', JSON.stringify(companyProfiles));
  }, [companyProfiles]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'jobs', JSON.stringify(jobs));
  }, [jobs]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'applications', JSON.stringify(applications));
  }, [applications]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'saved_jobs', JSON.stringify(savedJobs));
  }, [savedJobs]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'wallet_transactions', JSON.stringify(walletTransactions));
  }, [walletTransactions]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'feedbacks', JSON.stringify(feedbacks));
  }, [feedbacks]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'ai_digests', JSON.stringify(aiDigests));
  }, [aiDigests]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'interviews', JSON.stringify(interviews));
  }, [interviews]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'reminder_alerts', JSON.stringify(reminderAlerts));
  }, [reminderAlerts]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'availability_blocks', JSON.stringify(availabilityBlocks));
  }, [availabilityBlocks]);

  const addAuditLog = (action: string, targetType: string, targetId?: number, targetLabel = '', detail = '') => {
    const entry: AuditLogEntry = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      actorId: currentUser ? currentUser.id : null,
      actorEmail: currentUser ? currentUser.email : 'system',
      action,
      targetType,
      targetId,
      targetLabel,
      detail,
      ip: '103.212.145.2',
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [entry, ...prev]);
  };

  const setCurrentUser = (user: User | null) => {
    setCurrentUserState(user);
    if (user) {
      addAuditLog('auth.switch', 'user', user.id, user.name || user.email, `Switched session to ${user.role}`);
    }
  };

  const switchUser = (userId: number) => {
    const target = users.find((u) => u.id === userId);
    if (target) {
      setCurrentUser(target);
      showToast({
        type: 'info',
        title: 'Switched Account',
        message: `Now browsing as ${target.name || target.email} (${target.role})`,
      });
    }
  };

  const login = (email: string, role?: Role): boolean => {
    const target = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (target) {
      if (target.is_suspended) {
        showToast({
          type: 'error',
          title: 'Account Suspended',
          message: target.suspended_reason || 'This account has been suspended for terms violation.',
        });
        return false;
      }
      setCurrentUser(target);
      addAuditLog('auth.login', 'user', target.id, target.email, 'Standard session login');
      return true;
    }
    // Auto-create demo user if not existing
    const newUser = register({
      email,
      name: email.split('@')[0],
      role: role || 'candidate',
    });
    setCurrentUser(newUser);
    return true;
  };

  const register = ({
    email,
    name,
    role,
    company_name = '',
  }: {
    email: string;
    name: string;
    role: Role;
    company_name?: string;
  }): User => {
    const newId = Math.max(...users.map((u) => u.id), 0) + 1;
    const user: User = {
      id: newId,
      email: email.trim().toLowerCase(),
      role,
      name: name.trim(),
      company_name: company_name.trim(),
      phone: '',
      designation: role === 'employer' ? 'Hiring Lead' : 'Software Professional',
      email_verified: false,
      is_admin: false,
      is_suspended: false,
      totp_enabled: false,
      created_at: new Date().toISOString(),
    };

    setUsers((prev) => [...prev, user]);

    if (role === 'candidate') {
      const profile: CandidateProfile = {
        userId: newId,
        headline: 'Software Professional looking for new opportunities',
        skills: 'javascript, react, python',
        autoApply: false,
        jobAlerts: true,
        updatedAt: new Date().toISOString(),
      };
      setCandidateProfiles((prev) => ({ ...prev, [newId]: profile }));
    } else {
      const profile: CompanyProfile = {
        userId: newId,
        industry: 'Technology',
        size: '11-50 employees',
        website: 'https://example.com',
        about: company_name ? `${company_name} is building the future.` : '',
        hqLocation: 'Bengaluru, India',
        walletBalancePaise: 100000, // free starter ₹1,000 credit
        onboardingStep: 1,
        updatedAt: new Date().toISOString(),
      };
      setCompanyProfiles((prev) => ({ ...prev, [newId]: profile }));
    }

    addAuditLog('auth.register', 'user', newId, user.email, `Registered new ${role} account`);
    return user;
  };

  const logout = () => {
    if (currentUser) {
      addAuditLog('auth.logout', 'user', currentUser.id, currentUser.email, 'Signed out');
    }
    setCurrentUser(null);
  };

  const verifyEmail = (userId?: number) => {
    const uid = userId || currentUser?.id;
    if (!uid) return;
    setUsers((prev) =>
      prev.map((u) => (u.id === uid ? { ...u, email_verified: true } : u))
    );
    if (currentUser && currentUser.id === uid) {
      setCurrentUserState((prev) => (prev ? { ...prev, email_verified: true } : null));
    }
    addAuditLog('auth.verify_email', 'user', uid, '', 'Confirmed email address');
  };

  const updateUser = (userId: number, fields: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...fields } : u))
    );
    if (currentUser && currentUser.id === userId) {
      setCurrentUserState((prev) => (prev ? { ...prev, ...fields } : null));
    }
    addAuditLog('user.update', 'user', userId, '', `Updated fields: ${Object.keys(fields).join(', ')}`);
  };

  const deleteAccount = (userId: number) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setApplications((prev) => prev.filter((a) => a.candidateId !== userId));
    setJobs((prev) => prev.filter((j) => j.employerId !== userId));
    if (currentUser && currentUser.id === userId) {
      setCurrentUserState(null);
    }
    addAuditLog('user.delete', 'user', userId, '', 'Account and associated records deleted');
  };

  // Candidate Profile & Actions
  const currentCandidateProfile = currentUser && currentUser.role === 'candidate'
    ? candidateProfiles[currentUser.id] || null
    : null;

  const updateCandidateProfile = (fields: Partial<CandidateProfile>) => {
    if (!currentUser || currentUser.role !== 'candidate') return;
    setCandidateProfiles((prev) => {
      const current = prev[currentUser.id] || {
        userId: currentUser.id,
        headline: '',
        skills: '',
        autoApply: false,
        jobAlerts: false,
        updatedAt: new Date().toISOString(),
      };
      return {
        ...prev,
        [currentUser.id]: {
          ...current,
          ...fields,
          updatedAt: new Date().toISOString(),
        },
      };
    });
    addAuditLog('profile.update', 'candidate_profile', currentUser.id, currentUser.name, 'Candidate profile updated');
  };

  const toggleAutoApply = (enabled: boolean) => {
    if (!currentUser || currentUser.role !== 'candidate') return;
    updateCandidateProfile({ autoApply: enabled });

    if (enabled) {
      // Auto-apply across all currently active jobs if match >= 1%
      const profile = candidateProfiles[currentUser.id];
      const candSkills = profile?.skills || '';
      let appliedCount = 0;

      for (const job of jobs) {
        if (job.status !== 'active') continue;
        const already = applications.some((a) => a.jobId === job.id && a.candidateId === currentUser.id);
        if (already) continue;

        const score = matchPct(candSkills, job.requiredSkills);
        if (score >= 1) {
          const newApp: Application = {
            id: Date.now() + Math.floor(Math.random() * 10000),
            jobId: job.id,
            candidateId: currentUser.id,
            matchPct: score,
            source: 'auto',
            status: 'applied',
            notes: '',
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          };
          setApplications((prev) => [newApp, ...prev]);
          appliedCount++;
        }
      }
      showToast({
        type: 'success',
        title: 'Auto-Apply Activated ⚡',
        message:
          appliedCount > 0
            ? `Submitted ${appliedCount} matching application${appliedCount === 1 ? '' : 's'}`
            : 'Looking for jobs matching your skills (≥1%)',
      });
      addAuditLog(
        'auto_apply.sweep',
        'candidate',
        currentUser.id,
        currentUser.email,
        `Auto-apply enabled: submitted ${appliedCount} matching applications`
      );
    } else {
      showToast({
        type: 'info',
        title: 'Auto-Apply Paused',
        message: 'Automatic applications are currently disabled.',
      });
    }
  };

  const handleResumeUpload = (fileName: string, rawText: string): string[] => {
    if (!currentUser || currentUser.role !== 'candidate') return [];
    const allRequiredJobSkills = jobs.flatMap((j) => j.requiredSkills.split(',')).map((s) => s.trim());
    const detected = Array.from(extractSkills(rawText, allRequiredJobSkills));

    updateCandidateProfile({
      resumeFilename: fileName,
      resumeText: rawText,
    });
    addAuditLog('resume.upload', 'candidate', currentUser.id, fileName, `Extracted ${detected.length} skills`);
    return detected;
  };

  const applyToJob = (jobId: number, source: 'manual' | 'auto' = 'manual'): boolean => {
    if (!currentUser || currentUser.role !== 'candidate') return false;
    const targetJob = jobs.find((j) => j.id === jobId);
    if (!targetJob) return false;

    const already = applications.some((a) => a.jobId === jobId && a.candidateId === currentUser.id);
    if (already) return false;

    const profile = candidateProfiles[currentUser.id];
    const score = matchPct(profile?.skills || '', targetJob.requiredSkills);

    const newApp: Application = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      jobId,
      candidateId: currentUser.id,
      matchPct: score,
      source,
      status: 'applied',
      notes: '',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    setApplications((prev) => [newApp, ...prev]);
    showToast({
      type: 'success',
      title: 'Application Sent! 🚀',
      message: `Applied to ${targetJob.title} at ${targetJob.companyName} (${score}% match)`,
    });
    addAuditLog(
      source === 'auto' ? 'application.auto_apply' : 'application.apply',
      'job',
      jobId,
      targetJob.title,
      `Match: ${score}%`
    );
    return true;
  };

  const toggleSaveJob = (jobId: number) => {
    if (!currentUser || currentUser.role !== 'candidate') return;
    const targetJob = jobs.find((j) => j.id === jobId);
    const jobTitle = targetJob?.title || 'Role';
    setSavedJobs((prev) => {
      const exists = prev.some((s) => s.jobId === jobId && s.candidateId === currentUser.id);
      if (exists) {
        showToast({
          type: 'info',
          title: 'Removed from Saved',
          message: `Unbookmarked ${jobTitle}`,
        });
        return prev.filter((s) => !(s.jobId === jobId && s.candidateId === currentUser.id));
      } else {
        showToast({
          type: 'success',
          title: 'Job Saved 📌',
          message: `Bookmarked ${jobTitle}`,
        });
        return [...prev, { candidateId: currentUser.id, jobId, createdAt: new Date().toISOString() }];
      }
    });
  };

  const isJobSaved = (jobId: number): boolean => {
    if (!currentUser) return false;
    return savedJobs.some((s) => s.jobId === jobId && s.candidateId === currentUser.id);
  };

  const hasAppliedToJob = (jobId: number): boolean => {
    if (!currentUser) return false;
    return applications.some((a) => a.jobId === jobId && a.candidateId === currentUser.id);
  };

  // Employer Actions
  const currentCompanyProfile = currentUser && currentUser.role === 'employer'
    ? companyProfiles[currentUser.id] || null
    : null;

  const updateCompanyProfile = (fields: Partial<CompanyProfile>) => {
    if (!currentUser || currentUser.role !== 'employer') return;
    setCompanyProfiles((prev) => {
      const current = prev[currentUser.id] || {
        userId: currentUser.id,
        industry: '',
        size: '',
        website: '',
        about: '',
        hqLocation: '',
        walletBalancePaise: 0,
        onboardingStep: 1,
        updatedAt: new Date().toISOString(),
      };
      return {
        ...prev,
        [currentUser.id]: {
          ...current,
          ...fields,
          updatedAt: new Date().toISOString(),
        },
      };
    });
    addAuditLog('company.update', 'company_profile', currentUser.id, currentUser.company_name, 'Company profile updated');
  };

  const postJob = (
    jobData: Omit<Job, 'id' | 'employerId' | 'companyName' | 'activeSince' | 'billableSeconds' | 'createdAt'>
  ): Job => {
    const newId = Math.max(...jobs.map((j) => j.id), 0) + 1;
    const now = new Date().toISOString();
    const newJob: Job = {
      ...jobData,
      id: newId,
      employerId: currentUser?.id || 1,
      companyName: currentUser?.company_name || 'My Company',
      activeSince: jobData.status === 'active' ? now : '',
      billableSeconds: 0,
      createdAt: now,
    };

    setJobs((prev) => [newJob, ...prev]);
    addAuditLog('job.create', 'job', newId, newJob.title, `Status: ${newJob.status}`);

    // If active, run auto-apply sweep for candidates with auto-apply turned on!
    if (newJob.status === 'active') {
      for (const user of users) {
        if (user.role !== 'candidate') continue;
        const prof = candidateProfiles[user.id];
        if (prof?.autoApply) {
          const score = matchPct(prof.skills, newJob.requiredSkills);
          if (score >= 1) {
            const newApp: Application = {
              id: Date.now() + Math.floor(Math.random() * 10000),
              jobId: newId,
              candidateId: user.id,
              matchPct: score,
              source: 'auto',
              status: 'applied',
              notes: '',
              updatedAt: now,
              createdAt: now,
            };
            setApplications((prev) => [newApp, ...prev]);
          }
        }
      }
    }

    showToast({
      type: 'success',
      title: 'Job Published! 🚀',
      message: `${newJob.title} is now active (Week 1 Free)`,
    });

    return newJob;
  };

  const updateJob = (jobId: number, fields: Partial<Job>) => {
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== jobId) return j;
        return { ...j, ...fields };
      })
    );
    addAuditLog('job.update', 'job', jobId, '', `Updated fields: ${Object.keys(fields).join(', ')}`);
  };

  const finalizeJobBilling = (job: Job) => {
    if (job.status !== 'active' || !job.activeSince) return;
    const cost = computeCostState(job.billableSeconds, job.activeSince);
    if (cost.accrued > 0) {
      const paise = cost.accrued * 100;
      // debit company wallet
      setCompanyProfiles((prev) => {
        const prof = prev[job.employerId];
        if (!prof) return prev;
        return {
          ...prev,
          [job.employerId]: {
            ...prof,
            walletBalancePaise: Math.max(0, prof.walletBalancePaise - paise),
          },
        };
      });
      // record transaction
      const tx: WalletTransaction = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        userId: job.employerId,
        type: 'debit',
        status: 'paid',
        amountPaise: paise,
        razorpayOrderId: '',
        razorpayPaymentId: '',
        jobId: job.id,
        note: `Billed for ${Math.floor(cost.daysActive)} days active on ${job.title}`,
        createdAt: new Date().toISOString(),
      };
      setWalletTransactions((prev) => [tx, ...prev]);
    }
  };

  const setJobStatus = (jobId: number, newStatus: JobStatus) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;

    if (job.status === 'active' && newStatus !== 'active') {
      finalizeJobBilling(job);
      updateJob(jobId, {
        status: newStatus,
        activeSince: '',
      });
    } else if (job.status !== 'active' && newStatus === 'active') {
      updateJob(jobId, {
        status: 'active',
        activeSince: new Date().toISOString(),
        billableSeconds: 0, // fresh activation spell resets billable time as in Python
      });
    } else {
      updateJob(jobId, { status: newStatus });
    }
    showToast({
      type: 'info',
      title: `Job ${newStatus === 'active' ? 'Activated' : newStatus === 'paused' ? 'Paused' : 'Closed'}`,
      message: `${job.title} is now ${newStatus}`,
    });
    addAuditLog('job.status_change', 'job', jobId, job.title, `Status: ${job.status} -> ${newStatus}`);
  };

  const updateApplicationStage = (appId: number, stage: ApplicationStage, notes?: string) => {
    setApplications((prev) =>
      prev.map((a) => {
        if (a.id !== appId) return a;
        return {
          ...a,
          status: stage,
          notes: notes !== undefined ? notes : a.notes,
          updatedAt: new Date().toISOString(),
        };
      })
    );
    showToast({
      type: 'info',
      title: 'Hiring Stage Updated',
      message: `Candidate moved to ${stage.toUpperCase()}`,
    });
    addAuditLog('pipeline.stage_change', 'application', appId, '', `Moved to ${stage}`);
  };

  const topupWallet = (amountPaise: number) => {
    if (!currentUser || currentUser.role !== 'employer') return;
    const orderId = `order_${Math.random().toString(36).substring(2, 10)}`;
    const paymentId = `pay_${Math.random().toString(36).substring(2, 10)}`;

    setCompanyProfiles((prev) => {
      const prof = prev[currentUser.id];
      if (!prof) return prev;
      return {
        ...prev,
        [currentUser.id]: {
          ...prof,
          walletBalancePaise: prof.walletBalancePaise + amountPaise,
        },
      };
    });

    const tx: WalletTransaction = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      userId: currentUser.id,
      type: 'topup',
      status: 'paid',
      amountPaise,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      note: `Prepaid wallet top-up (simulated Razorpay)`,
      createdAt: new Date().toISOString(),
    };

    setWalletTransactions((prev) => [tx, ...prev]);
    showToast({
      type: 'success',
      title: 'Wallet Recharged! 💳',
      message: `₹${(amountPaise / 100).toLocaleString('en-IN')} added to company wallet`,
    });
    addAuditLog('wallet.topup', 'user', currentUser.id, currentUser.company_name, `Added ₹${amountPaise / 100}`);
  };

  // Interview Scheduling & Pipeline Synchronization
  const proposeInterview = (data: {
    applicationId: number;
    jobId: number;
    candidateId: number;
    title: string;
    interviewType: InterviewType;
    proposedSlots: InterviewSlot[];
    mode: InterviewMode;
    meetingLink?: string;
    locationAddress?: string;
    interviewerName: string;
    interviewerEmail: string;
    notes?: string;
    advancePipelineStage?: boolean;
    autoConfirmFirstSlot?: boolean;
  }): Interview => {
    const employerId = currentUser?.id || 1;
    const now = new Date().toISOString();
    const isAutoConfirmed = Boolean(data.autoConfirmFirstSlot && data.proposedSlots.length > 0);
    const confirmedSlot = isAutoConfirmed ? data.proposedSlots[0] : undefined;

    const autoLink = data.mode === 'google_meet'
      ? `https://meet.google.com/cat-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}`
      : data.mode === 'zoom'
      ? `https://zoom.us/j/${Math.floor(1000000000 + Math.random() * 9000000000)}`
      : '';

    const scheduledReminderTime = (isAutoConfirmed && confirmedSlot)
      ? calculate24hReminderTime(confirmedSlot.dateTime).toISOString()
      : undefined;

    const newInterview: Interview = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      applicationId: data.applicationId,
      jobId: data.jobId,
      candidateId: data.candidateId,
      employerId,
      title: data.title,
      interviewType: data.interviewType,
      proposedSlots: data.proposedSlots,
      confirmedSlot,
      mode: data.mode,
      meetingLink: data.meetingLink || autoLink,
      locationAddress: data.locationAddress,
      interviewerName: data.interviewerName,
      interviewerEmail: data.interviewerEmail,
      notes: data.notes,
      status: isAutoConfirmed ? 'confirmed' : 'proposed',
      reminder24hEnabled: true,
      reminder24hSent: false,
      reminder24hScheduledFor: scheduledReminderTime,
      createdAt: now,
      updatedAt: now,
    };

    setInterviews((prev) => [newInterview, ...prev]);

    // Automatically sync pipeline state to 'interview'
    if (data.advancePipelineStage !== false) {
      const app = applications.find((a) => a.id === data.applicationId);
      if (app) {
        const slotDesc = data.proposedSlots.length === 1
          ? `Interview scheduled: ${data.title}`
          : `Interview proposed (${data.proposedSlots.length} slots): ${data.title}`;
        updateApplicationStage(app.id, 'interview', slotDesc);
      }
    }

    const candidate = users.find((u) => u.id === data.candidateId);
    showToast({
      type: 'success',
      title: isAutoConfirmed ? 'Interview Confirmed! 📅' : 'Interview Proposed! ✉️',
      message: `${data.proposedSlots.length} slot(s) for ${candidate?.name || 'Candidate'}. Pipeline stage synced to Interview.`,
    });

    addAuditLog(
      'interview.propose',
      'interview',
      newInterview.id,
      data.title,
      `Proposed ${data.proposedSlots.length} slot(s) to candidate #${data.candidateId}`
    );

    return newInterview;
  };

  const confirmInterviewSlot = (interviewId: number, slotId: string) => {
    let chosenSlot: InterviewSlot | undefined;

    setInterviews((prev) =>
      prev.map((iv) => {
        if (iv.id !== interviewId) return iv;
        const chosen = iv.proposedSlots.find((s) => s.id === slotId) || iv.proposedSlots[0];
        chosenSlot = chosen;
        const scheduledTime = calculate24hReminderTime(chosen.dateTime).toISOString();
        return {
          ...iv,
          status: 'confirmed',
          confirmedSlot: chosen,
          reminder24hEnabled: true,
          reminder24hSent: false,
          reminder24hScheduledFor: scheduledTime,
          updatedAt: new Date().toISOString(),
        };
      })
    );

    const iv = interviews.find((i) => i.id === interviewId);
    if (iv) {
      const app = applications.find((a) => a.id === iv.applicationId);
      if (app && app.status !== 'interview') {
        updateApplicationStage(app.id, 'interview', `Interview confirmed: ${iv.title}`);
      }
    }

    showToast({
      type: 'success',
      title: 'Interview Slot Confirmed! 📅',
      message: 'Interview is officially scheduled on candidate & employer calendars. 24h reminder scheduled.',
    });
    addAuditLog('interview.confirm', 'interview', interviewId, '', `Slot ${slotId} confirmed`);
  };

  const rescheduleInterview = (interviewId: number, newSlots: InterviewSlot[], reason?: string) => {
    setInterviews((prev) =>
      prev.map((iv) => {
        if (iv.id !== interviewId) return iv;
        return {
          ...iv,
          status: 'rescheduled',
          proposedSlots: newSlots,
          confirmedSlot: undefined,
          reminder24hSent: false,
          reminder24hSentAt: undefined,
          notes: reason ? (iv.notes ? `${iv.notes} | Rescheduled: ${reason}` : `Rescheduled: ${reason}`) : iv.notes,
          updatedAt: new Date().toISOString(),
        };
      })
    );
    showToast({
      type: 'info',
      title: 'Interview Rescheduled 🔄',
      message: 'New time slot proposals sent to candidate. Reminder reset.',
    });
    addAuditLog('interview.reschedule', 'interview', interviewId, '', reason || 'Rescheduled');
  };

  const updateInterviewStatus = (interviewId: number, status: InterviewStatus, feedbackOrNote?: string) => {
    setInterviews((prev) =>
      prev.map((iv) => {
        if (iv.id !== interviewId) return iv;
        return {
          ...iv,
          status,
          feedback: feedbackOrNote !== undefined ? feedbackOrNote : iv.feedback,
          updatedAt: new Date().toISOString(),
        };
      })
    );
    const iv = interviews.find((i) => i.id === interviewId);
    if (iv && feedbackOrNote) {
      const app = applications.find((a) => a.id === iv.applicationId);
      if (app) {
        updateApplicationStage(app.id, app.status, `${app.notes ? app.notes + ' • ' : ''}Interview Note: ${feedbackOrNote}`);
      }
    }
    showToast({
      type: 'info',
      title: 'Interview Status Updated',
      message: `Marked as ${status.toUpperCase()}`,
    });
    addAuditLog('interview.status_update', 'interview', interviewId, '', `Status: ${status}`);
  };

  const cancelInterview = (interviewId: number, reason?: string) => {
    setInterviews((prev) =>
      prev.map((iv) => {
        if (iv.id !== interviewId) return iv;
        return {
          ...iv,
          status: 'cancelled',
          notes: reason ? (iv.notes ? `${iv.notes} | Cancelled: ${reason}` : `Cancelled: ${reason}`) : iv.notes,
          updatedAt: new Date().toISOString(),
        };
      })
    );
    showToast({
      type: 'warning',
      title: 'Interview Cancelled',
      message: reason || 'Interview cancelled.',
    });
    addAuditLog('interview.cancel', 'interview', interviewId, '', reason || 'Cancelled');
  };

  // 24-Hour Automated Reminder Engine
  const send24hReminderNow = (interviewId: number): boolean => {
    const iv = interviews.find((i) => i.id === interviewId);
    if (!iv) return false;

    const candidate = users.find((u) => u.id === iv.candidateId);
    const employer = users.find((u) => u.id === iv.employerId);
    const job = jobs.find((j) => j.id === iv.jobId);

    if (!candidate || !employer) return false;

    const companyName = job?.companyName || employer.company_name || 'Catchablepro Employer';
    const jobTitle = job?.title || 'Open Position';

    const alert = generate24hReminderEmail(iv, candidate, employer, companyName, jobTitle, false);

    setReminderAlerts((prev) => [alert, ...prev.filter((a) => a.id !== alert.id)]);
    setInterviews((prev) =>
      prev.map((item) =>
        item.id === interviewId
          ? {
              ...item,
              reminder24hSent: true,
              reminder24hSentAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    );

    showToast({
      type: 'success',
      title: '24-Hour Reminder Email Sent! ✉️',
      message: `Alert dispatched to candidate ${candidate.name} (${candidate.email}) for ${iv.title}.`,
    });

    addAuditLog(
      'interview.reminder_24h_manual',
      'interview',
      interviewId,
      iv.title,
      `Sent 24-hour reminder email alert to ${candidate.email}`
    );

    return true;
  };

  const toggle24hReminder = (interviewId: number, enabled: boolean) => {
    setInterviews((prev) =>
      prev.map((iv) =>
        iv.id === interviewId
          ? { ...iv, reminder24hEnabled: enabled, updatedAt: new Date().toISOString() }
          : iv
      )
    );
    showToast({
      type: 'info',
      title: enabled ? '24h Reminder Enabled 🔔' : '24h Reminder Disabled 🔕',
      message: enabled
        ? 'Automated email alert will be sent 24 hours before interview.'
        : 'Automated 24h reminder has been paused for this interview.',
    });
  };

  const updateCustomReminderNotes = (interviewId: number, notes: string) => {
    setInterviews((prev) =>
      prev.map((iv) =>
        iv.id === interviewId
          ? { ...iv, customReminderNotes: notes, updatedAt: new Date().toISOString() }
          : iv
      )
    );
    showToast({
      type: 'success',
      title: 'Reminder Notes Saved 📝',
      message: 'Custom preparation instructions will appear in the candidate email alert.',
    });
  };

  const acknowledgeReminder = (alertId: string) => {
    setReminderAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, acknowledgedByCandidate: true } : a))
    );
    showToast({
      type: 'success',
      title: 'Interview Acknowledged! ✅',
      message: 'Your interviewer has been notified that you are confirmed and ready.',
    });
  };

  const triggerAutomatedReminderCheck = (): number => {
    const currentInterviews = interviewsRef.current;
    const currentUsers = usersRef.current;
    const currentJobs = jobsRef.current;

    let sentCount = 0;
    const newAlerts: InterviewReminderAlert[] = [];
    const updatedInterviewIds: number[] = [];

    currentInterviews.forEach((iv) => {
      if (iv.status !== 'confirmed' || !iv.confirmedSlot) return;
      if (iv.reminder24hEnabled === false || iv.reminder24hSent) return;

      const isDue = is24hReminderDue(iv.confirmedSlot.dateTime, iv.reminder24hSent, iv.reminder24hEnabled);
      if (isDue) {
        const candidate = currentUsers.find((u) => u.id === iv.candidateId);
        const employer = currentUsers.find((u) => u.id === iv.employerId);
        const job = currentJobs.find((j) => j.id === iv.jobId);
        if (candidate && employer) {
          const companyName = job?.companyName || employer.company_name || 'Catchablepro Employer';
          const jobTitle = job?.title || 'Open Position';
          const alert = generate24hReminderEmail(iv, candidate, employer, companyName, jobTitle, true);
          newAlerts.push(alert);
          updatedInterviewIds.push(iv.id);
          sentCount++;
        }
      }
    });

    if (newAlerts.length > 0) {
      setReminderAlerts((prev) => [...newAlerts, ...prev]);
      setInterviews((prev) =>
        prev.map((iv) =>
          updatedInterviewIds.includes(iv.id)
            ? {
                ...iv,
                reminder24hSent: true,
                reminder24hSentAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : iv
        )
      );

      showToast({
        type: 'info',
        title: 'Automated 24h Reminder Dispatched! ✉️',
        message: `Sent 24-hour alert for ${newAlerts.map((a) => a.candidateName).join(', ')}.`,
      });

      addAuditLog(
        'interview.reminder_24h_auto',
        'system',
        undefined,
        'Auto 24h Reminder Daemon',
        `Dispatched ${newAlerts.length} automated 24-hour reminder email(s)`
      );
    }

    return sentCount;
  };

  // Automated 24h Reminder Heartbeat Daemon (runs every 30s with fresh refs)
  useEffect(() => {
    triggerAutomatedReminderCheck();

    const interval = setInterval(() => {
      triggerAutomatedReminderCheck();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Availability Block Management
  const addAvailabilityBlock = (block: Omit<CalendarAvailabilityBlock, 'id'>): CalendarAvailabilityBlock => {
    const newBlock: CalendarAvailabilityBlock = {
      ...block,
      id: `block_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    setAvailabilityBlocks((prev) => [...prev, newBlock]);
    showToast({
      type: 'success',
      title: block.type === 'preferred' ? 'Preferred Slot Added ⭐' : 'Busy Block Added ⛔',
      message: `${block.label} (${block.startTime} - ${block.endTime})`,
    });
    return newBlock;
  };

  const updateAvailabilityBlock = (id: string, fields: Partial<CalendarAvailabilityBlock>) => {
    setAvailabilityBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...fields } : b))
    );
    showToast({
      type: 'info',
      title: 'Time Block Updated',
      message: 'Schedule changes saved.',
    });
  };

  const removeAvailabilityBlock = (id: string) => {
    setAvailabilityBlocks((prev) => prev.filter((b) => b.id !== id));
    showToast({
      type: 'info',
      title: 'Time Block Removed',
      message: 'Removed from your weekly calendar.',
    });
  };

  const applyAvailabilityPreset = (
    preset: 'standard_hours' | 'block_lunch' | 'clear_all',
    startDate: string
  ) => {
    const empId = currentUser?.id || 1;
    const start = new Date(startDate);

    const weekDates: string[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      weekDates.push(d.toISOString().slice(0, 10));
    }

    if (preset === 'clear_all') {
      setAvailabilityBlocks((prev) => prev.filter((b) => !weekDates.includes(b.date)));
      showToast({
        type: 'info',
        title: 'Overrides Cleared',
        message: 'Cleared custom blocks for this work week.',
      });
      return;
    }

    if (preset === 'standard_hours') {
      const newBlocks: CalendarAvailabilityBlock[] = [];
      weekDates.forEach((date, i) => {
        newBlocks.push({
          id: `preset_morn_${Date.now()}_${i}`,
          employerId: empId,
          date,
          startTime: '10:00',
          endTime: '13:00',
          type: 'preferred',
          label: '⭐ Morning Interview Window',
        });
        newBlocks.push({
          id: `preset_aft_${Date.now()}_${i}`,
          employerId: empId,
          date,
          startTime: '14:00',
          endTime: '17:00',
          type: 'preferred',
          label: '⭐ Afternoon Candidate Slots',
        });
      });
      setAvailabilityBlocks((prev) => [
        ...prev.filter((b) => !weekDates.includes(b.date) || b.type !== 'preferred'),
        ...newBlocks,
      ]);
      showToast({
        type: 'success',
        title: 'Standard Hours Applied! ⭐',
        message: '10 AM - 1 PM & 2 PM - 5 PM marked preferred for Monday to Friday.',
      });
    }

    if (preset === 'block_lunch') {
      const lunchBlocks: CalendarAvailabilityBlock[] = weekDates.map((date, i) => ({
        id: `preset_lunch_${Date.now()}_${i}`,
        employerId: empId,
        date,
        startTime: '13:00',
        endTime: '14:00',
        type: 'busy',
        label: 'Lunch & Break 🥪',
      }));
      setAvailabilityBlocks((prev) => [
        ...prev.filter((b) => !(weekDates.includes(b.date) && b.startTime === '13:00' && b.endTime === '14:00')),
        ...lunchBlocks,
      ]);
      showToast({
        type: 'info',
        title: 'Lunch Break Blocked 🥪',
        message: '1:00 PM - 2:00 PM blocked as busy across workdays.',
      });
    }
  };

  // Admin Actions
  const toggleUserSuspension = (userId: number, reason: string = 'Administrative review') => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const newSuspended = !u.is_suspended;
        return {
          ...u,
          is_suspended: newSuspended,
          suspended_reason: newSuspended ? reason : '',
        };
      })
    );
    addAuditLog('admin.toggle_suspension', 'user', userId, '', `Suspension toggled for user ID ${userId}`);
  };

  const deleteJobAdmin = (jobId: number) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    setApplications((prev) => prev.filter((a) => a.jobId !== jobId));
    addAuditLog('admin.delete_job', 'job', jobId, '', 'Moderator removed job posting');
  };

  const updateFeedbackStatus = (feedbackId: number, status: FeedbackItem['status']) => {
    setFeedbacks((prev) =>
      prev.map((f) => (f.id === feedbackId ? { ...f, status } : f))
    );
    addAuditLog('feedback.status', 'feedback', feedbackId, '', `Status set to ${status}`);
  };

  const generateFeedbackDigest = (): AIDigest => {
    const unhandled = feedbacks.filter((f) => f.status === 'new' || f.status === 'reviewed');
    const digestContent = {
      summary: `Analyzed ${unhandled.length} feedback items across Candidate and Employer journeys.`,
      themes: [
        {
          topic: 'Semantic Skill Matching Quality',
          sentiment: 'positive',
          insight: 'Candidates praise the transparent matching breakdown showing why related skills give partial credit.',
        },
        {
          topic: 'Pipeline CSV & Excel Exports',
          sentiment: 'neutral',
          insight: 'Employers are requesting one-click export for shortlisted candidates directly from hiring stages.',
        },
        {
          topic: 'Pricing Meter Transparency',
          sentiment: 'positive',
          insight: 'The 7-day free window encourages fast feedback and closing filled postings promptly.',
        },
      ],
      suggestedFixes: [
        'Add one-click CSV export on the Applicant Pipeline page.',
        'Add expected salary bracket filter on Candidate Search.',
        'Send in-app reminder when a job reaches Day 25 approaching the 30-day cap.',
      ],
    };

    const newDigest: AIDigest = {
      id: Date.now(),
      kind: 'feedback_digest',
      content: JSON.stringify(digestContent, null, 2),
      coveredTo: Math.max(...feedbacks.map((f) => f.id), 0),
      generatedBy: currentUser?.email || 'admin@catchablepro.in',
      createdAt: new Date().toISOString(),
    };

    setAiDigests((prev) => [newDigest, ...prev]);
    addAuditLog('ai.generate_digest', 'digest', newDigest.id, 'Feedback Clustering', 'Generated structured AI insights');
    return newDigest;
  };

  const submitFeedback = (
    category: FeedbackItem['category'],
    rating: number,
    message: string,
    page: string
  ) => {
    const newFeedback: FeedbackItem = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      userId: currentUser?.id || null,
      role: currentUser?.role || 'anonymous',
      email: currentUser?.email || 'anonymous@visitor.com',
      category,
      rating,
      message,
      page,
      status: 'new',
      createdAt: new Date().toISOString(),
    };

    setFeedbacks((prev) => [newFeedback, ...prev]);
    addAuditLog('feedback.submit', 'feedback', newFeedback.id, category, `Rating: ${rating}/5`);
  };

  const extractSkillsFromJd = (text: string): string[] => {
    const allKnown = jobs.flatMap((j) => j.requiredSkills.split(',')).map((s) => s.trim());
    const detected = Array.from(extractSkills(text, allKnown));
    return detected;
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        candidateProfiles,
        companyProfiles,
        jobs,
        applications,
        savedJobs,
        walletTransactions,
        auditLogs,
        feedbacks,
        aiDigests,
        toasts,
        showToast,
        dismissToast,

        setCurrentUser,
        switchUser,
        login,
        register,
        logout,
        verifyEmail,
        updateUser,
        deleteAccount,

        currentCandidateProfile,
        updateCandidateProfile,
        toggleAutoApply,
        handleResumeUpload,
        applyToJob,
        toggleSaveJob,
        isJobSaved,
        hasAppliedToJob,

        currentCompanyProfile,
        updateCompanyProfile,
        postJob,
        updateJob,
        setJobStatus,
        updateApplicationStage,
        topupWallet,

        interviews,
        proposeInterview,
        confirmInterviewSlot,
        rescheduleInterview,
        updateInterviewStatus,
        cancelInterview,

        reminderAlerts,
        send24hReminderNow,
        toggle24hReminder,
        updateCustomReminderNotes,
        acknowledgeReminder,
        triggerAutomatedReminderCheck,

        availabilityBlocks,
        addAvailabilityBlock,
        updateAvailabilityBlock,
        removeAvailabilityBlock,
        applyAvailabilityPreset,

        toggleUserSuspension,
        deleteJobAdmin,
        updateFeedbackStatus,
        generateFeedbackDigest,

        submitFeedback,
        extractSkillsFromJd,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
