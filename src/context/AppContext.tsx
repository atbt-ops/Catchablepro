import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
} from '../data/initialData';
import { matchPct, extractSkills } from '../services/matching';
import { computeCostState } from '../services/pricing';

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
  const [toasts, setToasts] = useState<ToastItem[]>([]);

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
        alert(`This account has been suspended: ${target.suspended_reason || 'Terms violation'}`);
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
