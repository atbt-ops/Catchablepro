import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Job, ApplicationStage, JobStatus } from '../types';
import { computeCostState, CURRENCY } from '../services/pricing';
import { matchDetail, matchPct } from '../services/matching';
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
} from 'lucide-react';

interface EmployerDashboardProps {
  activeTab: 'jobs' | 'matches' | 'pipeline' | 'wallet' | 'profile';
  setActiveTab: (tab: 'jobs' | 'matches' | 'pipeline' | 'wallet' | 'profile') => void;
}

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
  } = useApp();

  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedJobIdForMatches, setSelectedJobIdForMatches] = useState<number | null>(null);
  const [selectedJobIdForPipeline, setSelectedJobIdForPipeline] = useState<number | null>(null);

  // Wallet topup modal
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmountINR, setTopupAmountINR] = useState(1000);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccessNotice, setPaymentSuccessNotice] = useState(false);

  // Company Profile form
  const currentCompany = currentUser ? companyProfiles[currentUser.id] : null;
  const [companyName, setCompanyName] = useState(currentUser?.company_name || '');
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
      .filter((item) => item.match.pct >= 1) // employer threshold
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
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const STAGES: ApplicationStage[] = [
    'applied',
    'shortlisted',
    'interview',
    'offered',
    'hired',
    'rejected',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Employer Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white font-bold flex items-center justify-center text-xl shadow-md shadow-indigo-600/20">
            {currentUser?.company_name?.[0] || 'C'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">
                {currentUser?.company_name || 'Employer Portal'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                Employer Verified
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Logged in as {currentUser?.name} ({currentUser?.designation || 'Recruiting Lead'})
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTopupModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-2"
          >
            <Wallet className="w-4 h-4 text-emerald-600" />
            <span>Balance: ₹{((currentCompany?.walletBalancePaise || 0) / 100).toLocaleString('en-IN')}</span>
          </button>

          <button
            onClick={() => {
              setEditingJob(null);
              setShowPostModal(true);
            }}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Post New Job</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'jobs'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>My Jobs & Meter ({myJobs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('matches')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'matches'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Ranked Candidates ({rankedCandidates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pipeline')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'pipeline'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Hiring Pipeline ({pipelineApplications.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('wallet')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'wallet'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Prepaid Wallet & Pricing</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
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
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Active Job Postings
              </span>
              <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
                {activeJobCount}
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold">Live in search</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Total Applicants
              </span>
              <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
                {pipelineApplications.length}
              </span>
              <span className="text-[11px] text-indigo-600 font-semibold">Across all stages</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Prepaid Wallet
              </span>
              <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
                ₹{((currentCompany?.walletBalancePaise || 0) / 100).toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Ready for on-demand meter</span>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 shadow-sm">
              <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider block">
                Free Week Policy
              </span>
              <span className="text-sm font-bold text-indigo-950 mt-1 block">
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
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-slate-300 transition-colors"
                >
                  {/* Left Column: Job Meta */}
                  <div className="space-y-2 max-w-xl">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                          job.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : job.status === 'paused'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {job.status}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-semibold text-slate-600">{job.department}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-600">{job.workMode}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-600">{job.location}</span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900">{job.title}</h3>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {job.requiredSkills.split(',').map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700"
                        >
                          {skill.trim()}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                      <span>Posted: {new Date(job.createdAt).toLocaleDateString()}</span>
                      <span>Applicants: <strong>{jobApps.length}</strong></span>
                      <span>
                        Salary: {job.hideSalary ? 'Confidential' : `₹${job.salaryMin}-${job.salaryMax} LPA`}
                      </span>
                    </div>
                  </div>

                  {/* Middle Column: Pricing Meter */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 min-w-[280px] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        <span>On-Demand Meter</span>
                      </span>
                      {job.status === 'active' ? (
                        <span className="font-semibold text-emerald-700 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Running
                        </span>
                      ) : (
                        <span className="font-medium text-slate-400">Stopped</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div>
                        <span className="text-[11px] text-slate-400 block">Active Time</span>
                        <span className="font-bold text-slate-800">
                          {cost.daysActive.toFixed(1)} days
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block">Current Daily Rate</span>
                        <span className="font-bold text-indigo-600">
                          {cost.dailyRate === 0 ? 'FREE (Week 1)' : `₹${cost.dailyRate} / day`}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block">Accrued Cost</span>
                        <span className="font-bold text-slate-900">
                          {cost.accruedDisplay}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block">Next Milestone</span>
                        <span className="font-medium text-slate-600 text-[11px]">
                          {cost.daysToNext
                            ? `+₹${cost.nextRate}/d in ${cost.daysToNext.toFixed(1)}d`
                            : `Cap in ${cost.daysToCap.toFixed(1)}d`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex lg:flex-col items-center gap-2 justify-end">
                    <div className="flex items-center gap-2 w-full">
                      {job.status === 'active' ? (
                        <button
                          onClick={() => setJobStatus(job.id, 'paused')}
                          className="flex-1 px-3 py-2 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Pause className="w-3.5 h-3.5" />
                          <span>Pause Meter</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setJobStatus(job.id, 'active')}
                          className="flex-1 px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center justify-center gap-1.5"
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
                        className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors"
                        title="Edit posting"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setJobStatus(job.id, 'closed')}
                        className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors"
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
                        className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors text-center"
                      >
                        Matches
                      </button>
                      <button
                        onClick={() => {
                          setSelectedJobIdForPipeline(job.id);
                          setActiveTab('pipeline');
                        }}
                        className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors text-center"
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
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
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
              Required skills: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-800">{targetJobForMatches?.requiredSkills}</code>
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
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{user.name}</h3>
                        <p className="text-xs font-medium text-slate-500">{user.email}</p>
                        <p className="text-xs font-semibold text-indigo-700 mt-1">
                          {profile?.headline || 'Candidate Profile'}
                        </p>
                      </div>
                      <div className="px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{match.pct}% Match</span>
                      </div>
                    </div>

                    {/* Skill Breakdown */}
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Candidate Skills
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {profile?.skills.split(',').map((s) => {
                          const skill = s.trim();
                          const isReq = match.matched.includes(skill.toLowerCase());
                          return (
                            <span
                              key={skill}
                              className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                                isReq
                                  ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {skill}
                            </span>
                          );
                        })}
                      </div>

                      {profile?.resumeFilename && (
                        <p className="text-[11px] text-slate-500 italic pt-1">
                          Resume on file: {profile.resumeFilename}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-400">
                      {profile?.autoApply ? 'Auto-Apply Enabled' : 'Manual Apply'}
                    </span>
                    <button
                      onClick={() =>
                        alert(`Sent direct invitation to ${user.name} (${user.email}) for ${targetJobForMatches?.title}`)
                      }
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Contact / Invite</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900 mb-1">No candidate matches</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                No registered candidates currently meet the 1% skill threshold for this posting.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: HIRING PIPELINE */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          {/* Job Filter */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Filter by Role:
              </span>
              <select
                value={selectedJobIdForPipeline || ''}
                onChange={(e) =>
                  setSelectedJobIdForPipeline(e.target.value ? Number(e.target.value) : null)
                }
                className="bg-slate-100 text-sm font-bold text-slate-900 rounded-xl px-3 py-1.5 border-none focus:outline-none cursor-pointer"
              >
                <option value="">All Jobs ({myJobs.length})</option>
                {myJobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs font-semibold text-slate-500">
              {pipelineApplications.length} candidate applications in pipeline
            </div>
          </div>

          {/* Kanban Board */}
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {STAGES.map((stage) => {
              const stageApps = pipelineApplications.filter((a) => a.status === stage);

              return (
                <div key={stage} className="bg-slate-50/70 rounded-2xl border border-slate-200 p-3 space-y-3 flex flex-col">
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider capitalize">
                      {stage}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                      {stageApps.length}
                    </span>
                  </div>

                  {/* Stage Cards */}
                  <div className="space-y-2.5 flex-1">
                    {stageApps.map((app) => (
                      <div
                        key={app.id}
                        className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                              {app.candidateUser?.name || 'Applicant'}
                            </h4>
                            <p className="text-[11px] text-slate-500 line-clamp-1">
                              {app.job?.title}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {app.matchPct}%
                          </span>
                        </div>

                        {/* Stage Selector Dropdown */}
                        <div className="pt-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                            Move Stage
                          </label>
                          <select
                            value={app.status}
                            onChange={(e) =>
                              updateApplicationStage(app.id, e.target.value as ApplicationStage)
                            }
                            className="w-full text-[11px] font-medium bg-slate-50 border border-slate-200 rounded-lg p-1 text-slate-700 cursor-pointer"
                          >
                            {STAGES.map((s) => (
                              <option key={s} value={s}>
                                {s.toUpperCase()}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Recruiter Notes input */}
                        <div>
                          <input
                            type="text"
                            defaultValue={app.notes}
                            placeholder="Add private note..."
                            onBlur={(e) => updateApplicationStage(app.id, app.status, e.target.value)}
                            className="w-full text-[11px] px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:bg-white focus:outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: PREPAID WALLET */}
      {activeTab === 'wallet' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            {/* Wallet Balance Card */}
            <div className="bg-gradient-to-tr from-indigo-900 to-indigo-800 rounded-3xl p-6 text-white shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  Prepaid Balance
                </span>
                <Wallet className="w-5 h-5 text-indigo-300" />
              </div>

              <div>
                <div className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                  ₹{((currentCompany?.walletBalancePaise || 0) / 100).toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-indigo-200 mt-1">
                  ({(currentCompany?.walletBalancePaise || 0).toLocaleString()} Paise)
                </div>
              </div>

              <button
                onClick={() => setShowTopupModal(true)}
                className="w-full py-2.5 rounded-xl bg-white text-indigo-900 font-bold text-xs hover:bg-indigo-50 shadow-md transition-colors"
              >
                Top-up Wallet (Simulate Razorpay)
              </button>
            </div>

            {/* Meter Mechanics Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3 text-xs">
              <h3 className="font-bold text-slate-900 text-sm">How Job Pricing Works</h3>
              <p className="text-slate-600 leading-relaxed">
                Catchablepro uses an on-demand holding cost model to encourage closing filled positions:
              </p>
              <ul className="space-y-1.5 text-slate-700 font-medium list-disc list-inside">
                <li><strong>Week 1 (Days 0-6):</strong> FREE — most hires happen fast</li>
                <li><strong>Week 2 (Days 7-13):</strong> ₹50 / day</li>
                <li><strong>Week 3 (Days 14-20):</strong> ₹100 / day</li>
                <li><strong>Week 4 (Days 21-27):</strong> ₹200 / day</li>
                <li><strong>Week 5 (Days 28-29):</strong> ₹400 / day</li>
                <li><strong>Day 30:</strong> Auto-closed (hard cap)</li>
              </ul>
              <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                Pausing or closing a posting stops meter accrual immediately.
              </p>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Wallet Transactions Ledger</h3>
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
                  {walletTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50">
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                            tx.type === 'topup'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-700">
                        <div>{tx.note}</div>
                        {tx.razorpayPaymentId && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {tx.razorpayPaymentId}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">
                        {tx.type === 'topup' ? '+' : '-'}₹
                        {(tx.amountPaise / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3.5 text-slate-500 whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
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
                value={companyName}
                disabled
                className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500"
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

      {/* Topup Modal (Simulated Razorpay) */}
      {showTopupModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-lg">Top Up Prepaid Wallet</h3>
              </div>
              <button
                onClick={() => setShowTopupModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {paymentSuccessNotice ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="text-base font-bold text-slate-900">Payment Successful!</h4>
                <p className="text-xs text-slate-500">
                  ₹{topupAmountINR.toLocaleString('en-IN')} added to your wallet.
                </p>
              </div>
            ) : (
              <form onSubmit={handleTopup} className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {[500, 1000, 2000, 5000].map((amt) => (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => setTopupAmountINR(amt)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                        topupAmountINR === amt
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      ₹{amt.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Custom Amount (INR ₹)
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="50000"
                    value={topupAmountINR}
                    onChange={(e) => setTopupAmountINR(Number(e.target.value))}
                    className="w-full text-base font-bold px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Min ₹100 • Max ₹50,000</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                  Razorpay Checkout demo mode. No actual debit occurs.
                </div>

                <button
                  type="submit"
                  disabled={isProcessingPayment}
                  className="w-full py-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessingPayment ? (
                    <span>Processing payment...</span>
                  ) : (
                    <>
                      <span>Pay ₹{topupAmountINR.toLocaleString('en-IN')} via Razorpay</span>
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
