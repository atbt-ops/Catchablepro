import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Job, WorkMode, EmploymentType } from '../types';
import { JobCard } from './JobCard';
import { JobDetailModal } from './JobDetailModal';
import { matchDetail, matchPct, parseSkills } from '../services/matching';
import {
  Search,
  Filter,
  Sparkles,
  Zap,
  UploadCloud,
  FileText,
  CheckCircle2,
  Bookmark,
  Briefcase,
  Layers,
  ArrowUpDown,
  Bell,
  Clock,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface CandidateViewProps {
  activeTab: 'browse' | 'applications' | 'saved' | 'profile';
  setActiveTab: (tab: 'browse' | 'applications' | 'saved' | 'profile') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  locationFilter: string;
  setLocationFilter: (l: string) => void;
}

export const CandidateView: React.FC<CandidateViewProps> = ({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  locationFilter,
  setLocationFilter,
}) => {
  const {
    currentUser,
    jobs,
    applications,
    savedJobs,
    companyProfiles,
    currentCandidateProfile,
    updateCandidateProfile,
    toggleAutoApply,
    handleResumeUpload,
    applyToJob,
    toggleSaveJob,
    isJobSaved,
    hasAppliedToJob,
  } = useApp();

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Filters
  const [workModeFilter, setWorkModeFilter] = useState<string>('All');
  const [expFilter, setExpFilter] = useState<string>('All');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'match' | 'newest'>('match');

  // Profile editing state
  const [headline, setHeadline] = useState(currentCandidateProfile?.headline || '');
  const [skillsText, setSkillsText] = useState(currentCandidateProfile?.skills || '');
  const [resumeTextInput, setResumeTextInput] = useState('');
  const [detectedSkills, setDetectedSkills] = useState<string[]>([]);
  const [profileSavedNotice, setProfileSavedNotice] = useState(false);

  // Sync profile values if user switches
  React.useEffect(() => {
    if (currentCandidateProfile) {
      setHeadline(currentCandidateProfile.headline);
      setSkillsText(currentCandidateProfile.skills);
    }
  }, [currentCandidateProfile]);

  // Filtered & ranked jobs
  const filteredJobs = useMemo(() => {
    const candSkills = currentCandidateProfile?.skills || '';

    return jobs
      .filter((j) => {
        if (j.status !== 'active') return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = j.title.toLowerCase().includes(q);
          const matchCompany = j.companyName.toLowerCase().includes(q);
          const matchSkills = j.requiredSkills.toLowerCase().includes(q);
          if (!matchTitle && !matchCompany && !matchSkills) return false;
        }

        // Location
        if (locationFilter && locationFilter !== 'All India') {
          if (!j.location.toLowerCase().includes(locationFilter.toLowerCase())) return false;
        }

        // Work mode
        if (workModeFilter !== 'All' && j.workMode !== workModeFilter) return false;

        // Department
        if (deptFilter !== 'All' && j.department !== deptFilter) return false;

        // Experience
        if (expFilter === '0-2' && (j.expMin > 2 || j.expMax < 0)) return false;
        if (expFilter === '3-5' && (j.expMin > 5 || j.expMax < 3)) return false;
        if (expFilter === '6+' && j.expMax < 6) return false;

        return true;
      })
      .map((job) => ({
        ...job,
        matchPct: candSkills ? matchPct(candSkills, job.requiredSkills) : 0,
      }))
      .sort((a, b) => {
        if (sortBy === 'match') {
          return b.matchPct - a.matchPct;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [jobs, searchQuery, locationFilter, workModeFilter, deptFilter, expFilter, sortBy, currentCandidateProfile]);

  // Candidate applications
  const myApplications = useMemo(() => {
    if (!currentUser) return [];
    return applications
      .filter((a) => a.candidateId === currentUser.id)
      .map((app) => {
        const job = jobs.find((j) => j.id === app.jobId);
        return {
          ...app,
          job,
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [applications, jobs, currentUser]);

  // Saved jobs list
  const mySavedJobs = useMemo(() => {
    if (!currentUser) return [];
    const savedIds = new Set(
      savedJobs.filter((s) => s.candidateId === currentUser.id).map((s) => s.jobId)
    );
    return jobs.filter((j) => savedIds.has(j.id));
  }, [savedJobs, jobs, currentUser]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateCandidateProfile({
      headline,
      skills: skillsText,
    });
    setProfileSavedNotice(true);
    setTimeout(() => setProfileSavedNotice(false), 3000);
  };

  const handleSimulateResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simulate reading file text
    const sampleText = `Experienced developer proficient in ${skillsText || 'Python, JavaScript, React, Docker, SQL'}. Looking for high impact software engineering challenges.`;
    const skills = handleResumeUpload(file.name, sampleText);
    setDetectedSkills(skills);
  };

  const handleAnalyzePastedResume = () => {
    if (!resumeTextInput.trim()) return;
    const skills = handleResumeUpload('pasted_resume.txt', resumeTextInput);
    setDetectedSkills(skills);
  };

  const addDetectedSkillsToProfile = () => {
    const existing = parseSkills(skillsText);
    for (const s of detectedSkills) {
      existing.add(s);
    }
    const combined = Array.from(existing).join(', ');
    setSkillsText(combined);
    updateCandidateProfile({ skills: combined });
    setDetectedSkills([]);
    setProfileSavedNotice(true);
    setTimeout(() => setProfileSavedNotice(false), 3000);
  };

  const STAGE_COLORS: Record<string, string> = {
    applied: 'bg-blue-50 text-blue-700 border-blue-200',
    shortlisted: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    interview: 'bg-purple-50 text-purple-700 border-purple-200',
    offered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    hired: 'bg-green-100 text-green-800 border-green-300 font-bold',
    rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Hero Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-fuchsia-900 rounded-3xl text-white p-6 sm:p-10 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-indigo-200 text-xs font-semibold mb-4 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>Semantic Skill Matching Engine</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            Jobs ranked by your real skills.
          </h1>
          <p className="text-indigo-100 text-sm sm:text-base leading-relaxed">
            See exactly why you match a role. Full credit for aliases, partial credit for related
            technologies, and zero guesswork.
          </p>

          {/* Auto-Apply Toggle Card inside banner */}
          <div className="mt-6 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  currentCandidateProfile?.autoApply
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                    : 'bg-white/20 text-white'
                }`}
              >
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-white flex items-center gap-2">
                  <span>Auto-Apply Mode</span>
                  {currentCandidateProfile?.autoApply ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-400 text-emerald-950">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white/20 text-indigo-200">
                      Off
                    </span>
                  )}
                </div>
                <p className="text-xs text-indigo-200">
                  Automatically applies to every job where you have ≥1% skill match.
                </p>
              </div>
            </div>

            <button
              onClick={() => toggleAutoApply(!currentCandidateProfile?.autoApply)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                currentCandidateProfile?.autoApply
                  ? 'bg-white text-indigo-900 hover:bg-indigo-50'
                  : 'bg-indigo-500 hover:bg-indigo-400 text-white'
              }`}
            >
              {currentCandidateProfile?.autoApply ? 'Disable Auto-Apply' : 'Turn On Auto-Apply'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('browse')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'browse'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Browse Jobs ({filteredJobs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('applications')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'applications'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>My Applications ({myApplications.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('saved')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'saved'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Saved Jobs ({mySavedJobs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Profile & Resume</span>
        </button>
      </div>

      {/* TAB 1: BROWSE JOBS */}
      {activeTab === 'browse' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Work Mode */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="font-semibold text-slate-500">Mode:</span>
                {['All', 'Remote', 'Hybrid', 'On-site'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setWorkModeFilter(mode)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      workModeFilter === mode
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <div className="h-4 w-px bg-slate-200 hidden sm:block" />

              {/* Experience */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="font-semibold text-slate-500">Exp:</span>
                {[
                  { label: 'All', val: 'All' },
                  { label: '0-2y', val: '0-2' },
                  { label: '3-5y', val: '3-5' },
                  { label: '6y+', val: '6+' },
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => setExpFilter(item.val)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      expFilter === item.val
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="h-4 w-px bg-slate-200 hidden sm:block" />

              {/* Department */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="font-semibold text-slate-500">Dept:</span>
                {['All', 'Engineering', 'Data Science'].map((dept) => (
                  <button
                    key={dept}
                    onClick={() => setDeptFilter(dept)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      deptFilter === dept
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-500">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-100 font-semibold text-slate-800 rounded-lg px-2.5 py-1 border-none focus:outline-none cursor-pointer"
              >
                <option value="match">Highest Match %</option>
                <option value="newest">Recently Posted</option>
              </select>
            </div>
          </div>

          {/* Job Cards Grid */}
          {filteredJobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  candidateProfile={currentCandidateProfile}
                  hasApplied={hasAppliedToJob(job.id)}
                  isSaved={isJobSaved(job.id)}
                  onSelect={(j) => setSelectedJob(j)}
                  onApply={(id) => applyToJob(id, 'manual')}
                  onToggleSave={(id) => toggleSaveJob(id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900 mb-1">No matching jobs found</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
                Try clearing search terms or expanding your filter selections to see more open roles.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setLocationFilter('');
                  setWorkModeFilter('All');
                  setExpFilter('All');
                  setDeptFilter('All');
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY APPLICATIONS */}
      {activeTab === 'applications' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Application Pipeline</h2>
            <span className="text-xs font-semibold text-slate-500">
              Track hiring progress across all roles
            </span>
          </div>

          {myApplications.length > 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm divide-y divide-slate-100">
              {myApplications.map((app) => (
                <div key={app.id} className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold flex items-center justify-center flex-shrink-0 text-base">
                      {app.job?.companyName?.[0] || 'C'}
                    </div>
                    <div>
                      <h3
                        onClick={() => app.job && setSelectedJob(app.job)}
                        className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer text-base"
                      >
                        {app.job?.title || 'Job Posting'}
                      </h3>
                      <p className="text-xs text-slate-600 font-medium">{app.job?.companyName}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                        <span>Applied: {new Date(app.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="font-semibold text-indigo-600">
                          {app.matchPct}% Match
                        </span>
                        <span>•</span>
                        <span className="capitalize">Source: {app.source}</span>
                      </div>
                      {app.notes && (
                        <div className="mt-2 text-xs bg-slate-100 p-2 rounded-lg text-slate-700">
                          <strong>Recruiter Note:</strong> {app.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${
                        STAGE_COLORS[app.status] || 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {app.status}
                    </span>
                    {app.job && (
                      <button
                        onClick={() => setSelectedJob(app.job!)}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        title="View job details"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
              <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900 mb-1">No applications yet</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mb-4">
                Explore recommended jobs matching your skills or turn on Auto-Apply to apply automatically.
              </p>
              <button
                onClick={() => setActiveTab('browse')}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
              >
                Browse Open Roles
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SAVED JOBS */}
      {activeTab === 'saved' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Saved Opportunities</h2>
          {mySavedJobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {mySavedJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  candidateProfile={currentCandidateProfile}
                  hasApplied={hasAppliedToJob(job.id)}
                  isSaved={true}
                  onSelect={(j) => setSelectedJob(j)}
                  onApply={(id) => applyToJob(id, 'manual')}
                  onToggleSave={(id) => toggleSaveJob(id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
              <Bookmark className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900 mb-1">No saved jobs</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mb-4">
                Click the bookmark icon on any job card to save it for later review.
              </p>
              <button
                onClick={() => setActiveTab('browse')}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
              >
                Browse Jobs
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PROFILE & RESUME */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Profile Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Candidate Profile</h2>
                  <p className="text-xs text-slate-500">
                    Your skills power the semantic matching score for all job recommendations.
                  </p>
                </div>
                {profileSavedNotice && (
                  <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Changes saved!
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Professional Headline
                  </label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g. Senior Backend Engineer | Python & Distributed Systems"
                    className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Skills & Tech Stack (comma separated)
                  </label>
                  <textarea
                    rows={4}
                    value={skillsText}
                    onChange={(e) => setSkillsText(e.target.value)}
                    placeholder="e.g. python, fastapi, sql, docker, aws, redis, react"
                    className="w-full text-sm p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Include languages, frameworks, cloud services, and databases.
                  </p>
                </div>

                {/* Parsed Skill Badges Preview */}
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Current Active Skills ({parseSkills(skillsText).size})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(parseSkills(skillsText)).map((skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Job alerts & auto-apply preferences */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentCandidateProfile?.autoApply || false}
                      onChange={(e) => toggleAutoApply(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-sm font-bold text-slate-800">
                        Enable Auto-Apply
                      </span>
                      <p className="text-xs text-slate-500">
                        Submit applications instantly when match score is ≥1%.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentCandidateProfile?.jobAlerts || false}
                      onChange={(e) =>
                        updateCandidateProfile({ jobAlerts: e.target.checked })
                      }
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-sm font-bold text-slate-800">
                        Daily Skill-Matched Job Alerts
                      </span>
                      <p className="text-xs text-slate-500">
                        Receive a daily digest of newly posted roles matching your stack.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all"
                  >
                    Save Profile
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Resume & Skill Extractor */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div>
                <h3 className="font-bold text-slate-900 text-base mb-1">Resume & Skill Extractor</h3>
                <p className="text-xs text-slate-500">
                  Upload a resume or paste text to auto-detect tech skills into your profile.
                </p>
              </div>

              {/* Upload file box */}
              <div className="border-2 border-dashed border-indigo-200 rounded-2xl p-6 text-center hover:bg-indigo-50/30 transition-colors relative cursor-pointer">
                <UploadCloud className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-indigo-900">Upload PDF / DOCX / TXT</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Max 5MB • Instant skill extraction</p>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleSimulateResumeUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>

              {currentCandidateProfile?.resumeFilename && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    <span className="font-medium text-slate-800 truncate">
                      {currentCandidateProfile.resumeFilename}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Uploaded
                  </span>
                </div>
              )}

              {/* Or paste text */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Or Paste Resume Text / Summary:
                </label>
                <textarea
                  rows={3}
                  value={resumeTextInput}
                  onChange={(e) => setResumeTextInput(e.target.value)}
                  placeholder="Paste bio, work history, or bullet points here to extract skills..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <button
                  type="button"
                  onClick={handleAnalyzePastedResume}
                  className="mt-2 w-full py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
                >
                  Analyze Text
                </button>
              </div>

              {/* Detected Skills Box */}
              {detectedSkills.length > 0 && (
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      Detected {detectedSkills.length} Skills
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {detectedSkills.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 rounded bg-white text-indigo-700 font-semibold text-xs border border-indigo-100 shadow-2xs"
                      >
                        +{s}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={addDetectedSkillsToProfile}
                    className="w-full py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    Add Detected Skills to Profile
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selected Job Detail Modal */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          companyProfile={companyProfiles[selectedJob.employerId]}
          candidateProfile={currentCandidateProfile}
          hasApplied={hasAppliedToJob(selectedJob.id)}
          isSaved={isJobSaved(selectedJob.id)}
          onClose={() => setSelectedJob(null)}
          onApply={(id) => applyToJob(id, 'manual')}
          onToggleSave={(id) => toggleSaveJob(id)}
        />
      )}
    </div>
  );
};
