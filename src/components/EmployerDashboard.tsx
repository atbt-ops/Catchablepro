import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Job, ApplicationStage, JobStatus, CostState } from '../types';
import { computeCostState } from '../services/pricing';
import { matchDetail } from '../services/matching';
import { CompanyAvatar } from './CompanyAvatar';
import { PostJobModal } from './PostJobModal';
import {
  Briefcase,
  Layers,
  Users,
  Wallet,
  Plus,
  Play,
  Pause,
  XCircle,
  Edit,
  Clock,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Building2,
  CheckCircle2,
  CreditCard,
  ArrowRight,
  ShieldAlert,
  Send,
  MessageSquare,
  ChevronRight,
  Search,
  Filter,
  ArrowUpRight,
  Check,
  QrCode,
  ShieldCheck,
} from 'lucide-react';

interface EmployerDashboardProps {
  activeTab: 'jobs' | 'matches' | 'pipeline' | 'wallet' | 'profile';
  setActiveTab: (tab: 'jobs' | 'matches' | 'pipeline' | 'wallet' | 'profile') => void;
}

const STAGES: ApplicationStage[] = [
  'applied',
  'shortlisted',
  'interview',
  'offered',
  'hired',
];

const STAGE_TITLES: Record<ApplicationStage, string> = {
  applied: 'New Applied',
  shortlisted: 'Shortlisted',
  interview: 'Interviewing',
  offered: 'Offer Extended',
  hired: 'Hired 🎉',
  rejected: 'Archived',
};

// Visual On-Demand 5-Week Pricing Meter Component
const PricingMeterVisualizer: React.FC<{ cost: CostState; status: JobStatus }> = ({ cost, status }) => {
  const percentElapsed = Math.min((cost.daysActive / 30) * 100, 100);

  return (
    <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200/90 space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-700 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-indigo-600" />
          <span>30-Day On-Demand Holding Meter</span>
        </span>
        {status === 'active' ? (
          <span className="font-extrabold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 text-[10px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            LIVE • Day {cost.daysActive.toFixed(1)} / 30
          </span>
        ) : (
          <span className="font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full text-[10px]">
            Meter Paused
          </span>
        )}
      </div>

      {/* 5-Week Segmented Bar */}
      <div className="space-y-1.5">
        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex relative">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-amber-500 transition-all duration-500 rounded-full"
            style={{ width: `${percentElapsed}%` }}
          />
        </div>

        {/* Milestone Labels */}
        <div className="grid grid-cols-5 text-[10px] font-semibold text-slate-400 pt-0.5 text-center">
          <span className={cost.daysActive < 7 ? 'text-emerald-700 font-bold' : ''}>W1: Free</span>
          <span className={cost.daysActive >= 7 && cost.daysActive < 14 ? 'text-indigo-700 font-bold' : ''}>
            W2: ₹50/d
          </span>
          <span className={cost.daysActive >= 14 && cost.daysActive < 21 ? 'text-indigo-700 font-bold' : ''}>
            W3: ₹100/d
          </span>
          <span className={cost.daysActive >= 21 && cost.daysActive < 28 ? 'text-amber-700 font-bold' : ''}>
            W4: ₹200/d
          </span>
          <span className={cost.daysActive >= 28 ? 'text-rose-700 font-bold' : ''}>W5: ₹400/d</span>
        </div>
      </div>

      {/* Metric details */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 text-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Current Rate
          </span>
          <span className="font-extrabold text-slate-900 mt-0.5 block">
            {cost.dailyRate === 0 ? 'FREE' : `₹${cost.dailyRate}/day`}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Accrued Spend
          </span>
          <span className="font-extrabold text-indigo-700 mt-0.5 block">{cost.accruedDisplay}</span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Auto-Cap
          </span>
          <span className="font-semibold text-slate-600 mt-0.5 block text-[11px]">
            {cost.daysToCap > 0 ? `${cost.daysToCap.toFixed(1)} days left` : 'Closed'}
          </span>
        </div>
      </div>
    </div>
  );
};

export const EmployerDashboard: React.FC<EmployerDashboardProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const {
    currentUser,
    jobs,
    users,
    candidateProfiles,
    companyProfiles,
    applications,
    walletTransactions,
    setJobStatus,
    updateApplicationStage,
    topupWallet,
    updateCompanyProfile,
    showToast,
  } = useApp();

  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedJobIdForMatches, setSelectedJobIdForMatches] = useState<number | null>(null);
  const [selectedJobIdForPipeline, setSelectedJobIdForPipeline] = useState<number | null>(null);

  // Wallet topup modal
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmountINR, setTopupAmountINR] = useState(1000);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccessNotice, setPaymentSuccessNotice] = useState(false);

  // Search/Filter for transactions
  const [txSearch, setTxSearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'topup' | 'debit'>('all');

  // Company Profile form
  const currentCompany = currentUser ? companyProfiles[currentUser.id] : null;
  const [industry, setIndustry] = useState(currentCompany?.industry || '');
  const [companySize, setCompanySize] = useState(currentCompany?.size || '51-200 employees');
  const [website, setWebsite] = useState(currentCompany?.website || '');
  const [about, setAbout] = useState(currentCompany?.about || '');
  const [hqLocation, setHqLocation] = useState(currentCompany?.hqLocation || 'Bengaluru, India');
  const [profileSaved, setProfileSaved] = useState(false);

  // Filter jobs owned by current employer
  const myJobs = useMemo(() => {
    if (!currentUser) return [];
    return jobs.filter((j) => j.employerId === currentUser.id);
  }, [jobs, currentUser]);

  const activeJobCount = myJobs.filter((j) => j.status === 'active').length;

  // Selected job for matches
  const targetJobForMatches = useMemo(() => {
    if (selectedJobIdForMatches) {
      return myJobs.find((j) => j.id === selectedJobIdForMatches) || myJobs[0];
    }
    return myJobs[0] || null;
  }, [myJobs, selectedJobIdForMatches]);

  // Candidates ranked by skill match for target job
  const rankedCandidates = useMemo(() => {
    if (!targetJobForMatches) return [];
    const candidates = users.filter((u) => u.role === 'candidate' && !u.is_suspended);

    return candidates
      .map((c) => {
        const profile = candidateProfiles[c.id];
        const match = matchDetail(profile?.skills || '', targetJobForMatches.requiredSkills);
        return {
          user: c,
          profile,
          match,
        };
      })
      .filter((item) => item.match.pct >= 1)
      .sort((a, b) => b.match.pct - a.match.pct);
  }, [users, candidateProfiles, targetJobForMatches]);

  // Applications for pipeline
  const pipelineApplications = useMemo(() => {
    const jobIds = selectedJobIdForPipeline
      ? [selectedJobIdForPipeline]
      : myJobs.map((j) => j.id);

    return applications
      .filter((a) => jobIds.includes(a.jobId))
      .map((app) => {
        const candidateUser = users.find((u) => u.id === app.candidateId);
        const profile = candidateProfiles[app.candidateId];
        const job = jobs.find((j) => j.id === app.jobId);
        return {
          ...app,
          candidateUser,
          profile,
          job,
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [applications, myJobs, selectedJobIdForPipeline, users, candidateProfiles, jobs]);

  // Wallet top-up handler
  const handleTopup = (e: React.FormEvent) => {
    e.preventDefault();
    if (topupAmountINR < 100) return;
    setIsProcessingPayment(true);
    setTimeout(() => {
      topupWallet(topupAmountINR * 100); // INR to paise
      setIsProcessingPayment(false);
      setPaymentSuccessNotice(true);
      setTimeout(() => {
        setPaymentSuccessNotice(false);
        setShowTopupModal(false);
      }, 1500);
    }, 1200);
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanyProfile({
      industry,
      size: companySize,
      website,
      about,
      hqLocation,
    });
    setProfileSaved(true);
    showToast({
      type: 'success',
      title: 'Company Profile Updated',
      message: 'Details saved successfully',
    });
    setTimeout(() => setProfileSaved(false), 3000);
  };

  // Quick Action: Shortlist candidate directly from matches
  const handleShortlistCandidate = (candidateId: number) => {
    if (!targetJobForMatches) return;
    const existing = applications.find(
      (a) => a.jobId === targetJobForMatches.id && a.candidateId === candidateId
    );

    if (existing) {
      updateApplicationStage(existing.id, 'shortlisted');
    } else {
      showToast({
        type: 'success',
        title: 'Candidate Shortlisted ⭐',
        message: 'Candidate added directly into your shortlisted stage',
      });
    }
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return walletTransactions.filter((tx) => {
      if (txTypeFilter !== 'all' && tx.type !== txTypeFilter) return false;
      if (txSearch.trim()) {
        const q = txSearch.toLowerCase();
        return (
          tx.note.toLowerCase().includes(q) ||
          tx.razorpayPaymentId.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [walletTransactions, txTypeFilter, txSearch]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Employer Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <CompanyAvatar name={currentUser?.company_name || 'Acme'} size="lg" showVerified={true} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {currentUser?.company_name || 'Employer Portal'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                Verified Recruiter
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Logged in as {currentUser?.name} ({currentUser?.designation || 'Head of Talent'})
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setShowTopupModal(true)}
            className="flex-1 md:flex-initial px-4 py-2.5 rounded-2xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center justify-center gap-2 shadow-xs"
          >
            <Wallet className="w-4 h-4 text-emerald-600" />
            <span>Wallet: ₹{((currentCompany?.walletBalancePaise || 0) / 100).toLocaleString('en-IN')}</span>
          </button>

          <button
            onClick={() => {
              setEditingJob(null);
              setShowPostModal(true);
            }}
            className="flex-1 md:flex-initial px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Post New Job</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-4 sm:gap-6 text-sm font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`pb-3.5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'jobs'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>My Jobs & Meter ({myJobs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('matches')}
          className={`pb-3.5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'matches'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Ranked Candidates ({rankedCandidates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pipeline')}
          className={`pb-3.5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'pipeline'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Hiring Pipeline ({pipelineApplications.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('wallet')}
          className={`pb-3.5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'wallet'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Prepaid Wallet & Pricing</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3.5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Company Profile</span>
        </button>
      </div>

      {/* TAB 1: JOBS & ON-DEMAND PRICING METER */}
      {activeTab === 'jobs' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Active Job Postings
              </span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {activeJobCount}
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold">Live in search</span>
            </div>

            <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Applicants
              </span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {pipelineApplications.length}
              </span>
              <span className="text-[11px] text-indigo-600 font-semibold">Across all stages</span>
            </div>

            <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Prepaid Wallet
              </span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                ₹{((currentCompany?.walletBalancePaise || 0) / 100).toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Ready for on-demand meter</span>
            </div>

            <div className="p-4 rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 shadow-xs">
              <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block">
                Free Week Policy
              </span>
              <span className="text-sm font-black text-indigo-950 mt-1 block">
                7 Days FREE per job
              </span>
              <span className="text-[11px] text-indigo-700 font-medium">
                Closes fast hires at zero cost
              </span>
            </div>
          </div>

          {/* Job Postings List */}
          <div className="space-y-4">
            {myJobs.map((job) => {
              const cost = computeCostState(job.billableSeconds, job.activeSince);
              const jobApps = applications.filter((a) => a.jobId === job.id);

              return (
                <div
                  key={job.id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-6 hover:border-slate-300 transition-all"
                >
                  {/* Left Column: Job Meta */}
                  <div className="space-y-2.5 max-w-xl">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                          job.status === 'active'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : job.status === 'paused'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {job.status}
                      </span>
                      <span className="text-xs text-slate-300">•</span>
                      <span className="text-xs font-bold text-slate-600">{job.department}</span>
                      <span className="text-xs text-slate-300">•</span>
                      <span className="text-xs text-slate-600">{job.workMode}</span>
                      <span className="text-xs text-slate-300">•</span>
                      <span className="text-xs text-slate-600">{job.location}</span>
                    </div>

                    <h3 className="text-lg font-black text-slate-900">{job.title}</h3>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {job.requiredSkills.split(',').map((skill) => (
                        <span
                          key={skill}
                          className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700"
                        >
                          {skill.trim()}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                      <span>Posted: {new Date(job.createdAt).toLocaleDateString()}</span>
                      <span>Applicants: <strong className="text-slate-700">{jobApps.length}</strong></span>
                      <span>
                        Salary: {job.hideSalary ? 'Confidential' : `₹${job.salaryMin}-${job.salaryMax} LPA`}
                      </span>
                    </div>
                  </div>

                  {/* Middle Column: Visual Pricing Meter */}
                  <div className="xl:w-[360px]">
                    <PricingMeterVisualizer cost={cost} status={job.status} />
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex xl:flex-col items-center gap-2 justify-end">
                    <div className="flex items-center gap-2 w-full">
                      {job.status === 'active' ? (
                        <button
                          onClick={() => setJobStatus(job.id, 'paused')}
                          className="flex-1 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Pause className="w-3.5 h-3.5" />
                          <span>Pause Meter</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setJobStatus(job.id, 'active')}
                          className="flex-1 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Activate</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setEditingJob(job);
                          setShowPostModal(true);
                        }}
                        className="p-2.5 rounded-2xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors"
                        title="Edit posting"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setJobStatus(job.id, 'closed')}
                        className="p-2.5 rounded-2xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors"
                        title="Close job permanently"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 w-full pt-1">
                      <button
                        onClick={() => {
                          setSelectedJobIdForMatches(job.id);
                          setActiveTab('matches');
                        }}
                        className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors text-center"
                      >
                        Ranked Matches
                      </button>
                      <button
                        onClick={() => {
                          setSelectedJobIdForPipeline(job.id);
                          setActiveTab('pipeline');
                        }}
                        className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors text-center"
                      >
                        Pipeline ({jobApps.length})
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: RANKED CANDIDATE MATCHES */}
      {activeTab === 'matches' && (
        <div className="space-y-6">
          {/* Job Selector Dropdown */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Matching Candidates For:
              </span>
              <select
                value={targetJobForMatches?.id || ''}
                onChange={(e) => setSelectedJobIdForMatches(Number(e.target.value))}
                className="bg-slate-100 text-sm font-bold text-slate-900 rounded-xl px-3 py-1.5 border-none focus:outline-none cursor-pointer"
              >
                {myJobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} ({j.department})
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Required skills:{' '}
              <code className="bg-slate-100 px-2 py-1 rounded-lg font-mono text-slate-800">
                {targetJobForMatches?.requiredSkills}
              </code>
            </div>
          </div>

          {/* Ranked Candidate List */}
          {rankedCandidates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {rankedCandidates.map(({ user, profile, match }) => (
                <div
                  key={user.id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:border-indigo-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white font-black text-sm flex items-center justify-center flex-shrink-0 shadow-xs">
                          {user.name[0].toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900">{user.name}</h3>
                          <p className="text-xs text-slate-500">{user.email}</p>
                          <p className="text-xs font-semibold text-indigo-700 mt-0.5">
                            {profile?.headline || 'Candidate Profile'}
                          </p>
                        </div>
                      </div>

                      <div className="px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black flex items-center gap-1 shadow-2xs">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{match.pct}% Match</span>
                      </div>
                    </div>

                    {/* Skill Breakdown */}
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Candidate Skills
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {profile?.skills.split(',').map((s) => {
                          const skill = s.trim();
                          const isReq = match.matched.includes(skill.toLowerCase());
                          return (
                            <span
                              key={skill}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                isReq
                                  ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 shadow-2xs'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {skill}
                            </span>
                          );
                        })}
                      </div>

                      {profile?.resumeFilename && (
                        <p className="text-[11px] text-slate-500 italic pt-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Resume on file: {profile.resumeFilename}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-400">
                      {profile?.autoApply ? '⚡ Auto-Apply Active' : 'Direct Search'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleShortlistCandidate(user.id)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                      >
                        Shortlist
                      </button>
                      <button
                        onClick={() => {
                          showToast({
                            type: 'success',
                            title: 'Invitation Sent 📨',
                            message: `Direct interview invite sent to ${user.name} for ${targetJobForMatches?.title}`,
                          });
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Invite</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900 mb-1">No candidate matches</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                No registered candidates currently match the skill criteria for this job.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: HIRING PIPELINE (KANBAN STAGES) */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Filter by Role:
              </span>
              <select
                value={selectedJobIdForPipeline || ''}
                onChange={(e) =>
                  setSelectedJobIdForPipeline(e.target.value ? Number(e.target.value) : null)
                }
                className="bg-slate-100 text-sm font-bold text-slate-900 rounded-xl px-3 py-1.5 border-none focus:outline-none cursor-pointer"
              >
                <option value="">All Job Postings</option>
                {myJobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} ({j.department})
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs font-bold text-slate-500">
              Total Applicants: {pipelineApplications.length}
            </span>
          </div>

          {/* Kanban Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {STAGES.map((stg) => {
              const stageApps = pipelineApplications.filter((a) => a.status === stg);

              return (
                <div
                  key={stg}
                  className="bg-slate-50/80 rounded-3xl p-4 border border-slate-200/80 flex flex-col space-y-3 min-h-[420px]"
                >
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      {STAGE_TITLES[stg]}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white border border-slate-200 text-slate-700 shadow-2xs">
                      {stageApps.length}
                    </span>
                  </div>

                  {/* Cards in column */}
                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {stageApps.map((app) => (
                      <div
                        key={app.id}
                        className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3 hover:border-indigo-300 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-slate-900 text-xs">
                              {app.candidateUser?.name || 'Applicant'}
                            </h4>
                            <p className="text-[11px] text-slate-500 truncate max-w-[140px]">
                              {app.job?.title}
                            </p>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {app.matchPct}%
                          </span>
                        </div>

                        {app.notes && (
                          <p className="text-[10px] text-slate-600 bg-slate-50 p-2 rounded-lg italic">
                            "{app.notes}"
                          </p>
                        )}

                        {/* Move Stage Selector */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-[10px] font-bold text-slate-400">Move:</span>
                          <select
                            value={app.status}
                            onChange={(e) =>
                              updateApplicationStage(app.id, e.target.value as ApplicationStage)
                            }
                            className="bg-slate-100 text-[11px] font-bold text-slate-700 rounded-lg px-2 py-1 border-none focus:outline-none cursor-pointer"
                          >
                            {STAGES.map((s) => (
                              <option key={s} value={s}>
                                {STAGE_TITLES[s]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}

                    {stageApps.length === 0 && (
                      <div className="h-32 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 text-xs">
                        No candidates
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: PREPAID WALLET & PRICING */}
      {activeTab === 'wallet' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Wallet Overview & Policy */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                  Prepaid Wallet Balance
                </span>
                <Wallet className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-3xl sm:text-4xl font-black">
                ₹{((currentCompany?.walletBalancePaise || 0) / 100).toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-indigo-200/80">
                Covers on-demand daily holding fees after your 7-day free window.
              </p>
              <button
                onClick={() => setShowTopupModal(true)}
                className="w-full py-3 rounded-2xl text-xs font-bold text-indigo-950 bg-white hover:bg-indigo-50 shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Recharge Wallet Balance</span>
              </button>
            </div>

            {/* Pricing Policy Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4 text-xs">
              <h3 className="font-black text-slate-900 text-sm">On-Demand Tier Schedule</h3>
              <p className="text-slate-600 leading-relaxed">
                Catchablepro uses an on-demand meter to incentivize fast closure:
              </p>
              <ul className="space-y-2 text-slate-700 font-medium">
                <li className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 text-emerald-900 font-bold">
                  <span>Week 1 (Days 0-6):</span>
                  <span>FREE</span>
                </li>
                <li className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                  <span>Week 2 (Days 7-13):</span>
                  <span className="font-bold">₹50 / day</span>
                </li>
                <li className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                  <span>Week 3 (Days 14-20):</span>
                  <span className="font-bold">₹100 / day</span>
                </li>
                <li className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                  <span>Week 4 (Days 21-27):</span>
                  <span className="font-bold">₹200 / day</span>
                </li>
                <li className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                  <span>Week 5 (Days 28-29):</span>
                  <span className="font-bold">₹400 / day</span>
                </li>
                <li className="flex items-center justify-between p-2 rounded-xl bg-rose-50 text-rose-800 font-bold">
                  <span>Day 30 Hard Cap:</span>
                  <span>Auto-Closed</span>
                </li>
              </ul>
              <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                Pausing or closing a posting stops meter accrual immediately.
              </p>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-slate-900">Wallet Transactions Ledger</h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <select
                  value={txTypeFilter}
                  onChange={(e) => setTxTypeFilter(e.target.value as any)}
                  className="text-xs font-semibold bg-slate-100 rounded-xl px-2.5 py-1.5 border-none cursor-pointer"
                >
                  <option value="all">All</option>
                  <option value="topup">Top-ups</option>
                  <option value="debit">Debits</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Details</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded font-black uppercase text-[10px] ${
                            tx.type === 'topup'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-700">
                        <div className="font-semibold">{tx.note}</div>
                        {tx.razorpayPaymentId && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {tx.razorpayPaymentId}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 font-black text-slate-900">
                        {tx.type === 'topup' ? '+' : '-'}₹
                        {(tx.amountPaise / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3.5 text-slate-400 whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400">
                        No transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: COMPANY PROFILE */}
      {activeTab === 'profile' && (
        <div className="max-w-2xl bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Company Details</h2>
            {profileSaved && (
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Saved!
              </span>
            )}
          </div>

          <form onSubmit={handleSaveCompany} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={currentUser?.company_name || 'Acme'}
                disabled
                className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-bold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Industry
                </label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Cloud Infrastructure, SaaS"
                  className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Company Size
                </label>
                <select
                  value={companySize}
                  onChange={(e) => setCompanySize(e.target.value)}
                  className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="1-10 employees">1-10 employees</option>
                  <option value="11-50 employees">11-50 employees</option>
                  <option value="51-200 employees">51-200 employees</option>
                  <option value="201-500 employees">201-500 employees</option>
                  <option value="500+ employees">500+ employees</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Website URL
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Headquarters Location
              </label>
              <input
                type="text"
                value={hqLocation}
                onChange={(e) => setHqLocation(e.target.value)}
                placeholder="e.g. Bengaluru, India"
                className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                About the Company
              </label>
              <textarea
                rows={3}
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="Write a brief overview shown on job postings..."
                className="w-full text-sm p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all"
              >
                Save Details
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Topup Modal (Simulated Razorpay with realistic UPI/Card/Netbanking tabs) */}
      {showTopupModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base leading-tight">
                    Razorpay Checkout
                  </h3>
                  <p className="text-[11px] text-slate-400">Recharge Employer Wallet</p>
                </div>
              </div>
              <button
                onClick={() => setShowTopupModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {paymentSuccessNotice ? (
              <div className="py-8 text-center space-y-2 animate-in zoom-in-95">
                <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
                <h4 className="text-lg font-black text-slate-900">Payment Verified!</h4>
                <p className="text-xs text-slate-500">
                  ₹{topupAmountINR.toLocaleString('en-IN')} has been added to your company balance.
                </p>
              </div>
            ) : (
              <form onSubmit={handleTopup} className="space-y-4">
                {/* Preset Chips */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Quick Recharge Presets
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[500, 1000, 2500, 5000].map((amt) => (
                      <button
                        type="button"
                        key={amt}
                        onClick={() => setTopupAmountINR(amt)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all text-center ${
                          topupAmountINR === amt
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        ₹{amt.toLocaleString('en-IN')}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Amount (INR ₹)
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="50000"
                    value={topupAmountINR}
                    onChange={(e) => setTopupAmountINR(Number(e.target.value))}
                    className="w-full text-lg font-black px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                {/* Simulated Payment Method Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('upi')}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        paymentMethod === 'upi'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      UPI (GPay/PhonePe)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        paymentMethod === 'card'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Credit / Debit Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('netbanking')}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        paymentMethod === 'netbanking'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Net Banking
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>256-bit encrypted Razorpay Sandbox test environment</span>
                </div>

                <button
                  type="submit"
                  disabled={isProcessingPayment}
                  className="w-full py-3.5 rounded-2xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessingPayment ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying with Razorpay...</span>
                    </div>
                  ) : (
                    <>
                      <span>Pay ₹{topupAmountINR.toLocaleString('en-IN')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Post / Edit Job Modal */}
      {showPostModal && (
        <PostJobModal
          initialJob={editingJob}
          onClose={() => setShowPostModal(false)}
        />
      )}
    </div>
  );
};
