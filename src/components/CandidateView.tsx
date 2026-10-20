import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Job, ApplicationStage } from '../types';
import { JobCard } from './JobCard';
import { JobDetailModal } from './JobDetailModal';
import { matchPct, parseSkills } from '../services/matching';
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
  Clock,
  ShieldCheck,
  ChevronRight,
  Plus,
  X,
  TrendingUp,
  MapPin,
  Building2,
  RotateCcw,
} from 'lucide-react';

interface CandidateViewProps {
  activeTab: 'browse' | 'applications' | 'saved' | 'profile';
  setActiveTab: (tab: 'browse' | 'applications' | 'saved' | 'profile') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  locationFilter: string;
  setLocationFilter: (l: string) => void;
}

const POPULAR_SKILLS = [
  'React',
  'TypeScript',
  'Python',
  'Node.js',
  'AWS',
  'Docker',
  'PostgreSQL',
  'Next.js',
  'Tailwind',
  'FastAPI',
  'GraphQL',
  'Kubernetes',
  'Redis',
  'SQL',
];

const STAGES: ApplicationStage[] = [
  'applied',
  'shortlisted',
  'interview',
  'offered',
  'hired',
];

const STAGE_LABELS: Record<string, string> = {
  applied: 'Application Sent',
  shortlisted: 'Shortlisted',
  interview: 'Interview Scheduled',
  offered: 'Offer Extended',
  hired: 'Hired 🎉',
  rejected: 'Not Selected',
};

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
    showToast,
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
  const [newSkillInput, setNewSkillInput] = useState('');
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

  // Candidate active skills parsed as set
  const activeSkillsList = useMemo(() => {
    return Array.from(parseSkills(skillsText));
  }, [skillsText]);

  // Profile strength calculation
  const profileStrength = useMemo(() => {
    let score = 0;
    if (headline.trim().length > 10) score += 25;
    if (activeSkillsList.length >= 3) score += 25;
    if (activeSkillsList.length >= 6) score += 15;
    if (currentCandidateProfile?.resumeFilename) score += 20;
    if (currentCandidateProfile?.autoApply) score += 15;
    return Math.min(score, 100);
  }, [headline, activeSkillsList, currentCandidateProfile]);

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

  // Average compatibility score across all active jobs
  const averageMatchPct = useMemo(() => {
    if (filteredJobs.length === 0) return 0;
    const sum = filteredJobs.reduce((acc, j) => acc + (j.matchPct || 0), 0);
    return Math.round(sum / filteredJobs.length);
  }, [filteredJobs]);

  const hasActiveFilters =
    searchQuery ||
    (locationFilter && locationFilter !== 'All India') ||
    workModeFilter !== 'All' ||
    expFilter !== 'All' ||
    deptFilter !== 'All';

  const resetAllFilters = () => {
    setSearchQuery('');
    setLocationFilter('');
    setWorkModeFilter('All');
    setExpFilter('All');
    setDeptFilter('All');
  };

  const handleAddSkill = (skill: string) => {
    const trimmed = skill.trim().toLowerCase();
    if (!trimmed) return;
    const set = parseSkills(skillsText);
    if (!set.has(trimmed)) {
      set.add(trimmed);
      const updated = Array.from(set).join(', ');
      setSkillsText(updated);
      updateCandidateProfile({ skills: updated });
      showToast({
        type: 'success',
        title: 'Skill Added',
        message: `Added ${trimmed} to your profile stack`,
      });
    }
    setNewSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    const set = parseSkills(skillsText);
    set.delete(skillToRemove.toLowerCase());
    const updated = Array.from(set).join(', ');
    setSkillsText(updated);
    updateCandidateProfile({ skills: updated });
    showToast({
      type: 'info',
      title: 'Skill Removed',
      message: `Removed ${skillToRemove} from your profile`,
    });
  };

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

    const sampleText = `Candidate CV proficient in ${skillsText || 'Python, JavaScript, React, Docker, SQL, AWS, TypeScript'}. Seeking engineering challenges.`;
    const skills = handleResumeUpload(file.name, sampleText);
    setDetectedSkills(skills);
    showToast({
      type: 'success',
      title: 'Resume Analyzed! 📄',
      message: `Found ${skills.length} matching tech skills`,
    });
  };

  const handleAnalyzePastedResume = () => {
    if (!resumeTextInput.trim()) return;
    const skills = handleResumeUpload('pasted_resume.txt', resumeTextInput);
    setDetectedSkills(skills);
    showToast({
      type: 'success',
      title: 'Text Processed ✨',
      message: `Identified ${skills.length} technical skills`,
    });
  };

  const addDetectedSkillsToProfile = () => {
    const existing = parseSkills(skillsText);
    for (const s of detectedSkills) {
      existing.add(s.toLowerCase());
    }
    const combined = Array.from(existing).join(', ');
    setSkillsText(combined);
    updateCandidateProfile({ skills: combined });
    setDetectedSkills([]);
    showToast({
      type: 'success',
      title: 'Skills Imported! 🎉',
      message: `Profile updated with new skills`,
    });
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
      <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-fuchsia-950 rounded-3xl text-white p-6 sm:p-10 relative overflow-hidden shadow-2xl border border-indigo-900/50">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-indigo-200 text-xs font-semibold mb-3 border border-white/10 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              <span>Semantic Skill Matching Engine</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white mb-2 leading-tight">
              Roles ranked by what you actually build.
            </h1>
            <p className="text-indigo-100 text-xs sm:text-sm leading-relaxed text-slate-200/90">
              Transparent compatibility scoring with credit for aliases (Postgres → PostgreSQL),
              related technologies, and zero resume black holes.
            </p>

            {/* Quick Skill Search Tags */}
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-indigo-200/80 uppercase tracking-wider mr-1">
                Trending:
              </span>
              {['React', 'Python', 'TypeScript', 'Remote', 'Node.js'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSearchQuery(tag)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors"
                >
                  +{tag}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Metrics & Auto-Apply Card */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 min-w-[280px]">
            {/* Live Stats Row */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200 block">
                  Active Roles
                </span>
                <span className="text-xl font-black text-white mt-0.5 block">
                  {jobs.filter((j) => j.status === 'active').length}
                </span>
                <span className="text-[10px] text-emerald-300 font-semibold">Live in India</span>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200 block">
                  Avg Compatibility
                </span>
                <span className="text-xl font-black text-white mt-0.5 block">
                  {averageMatchPct}%
                </span>
                <span className="text-[10px] text-indigo-200 font-semibold">Across listings</span>
              </div>
            </div>

            {/* Auto-Apply Controller */}
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                    currentCandidateProfile?.autoApply
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                      : 'bg-white/20 text-white'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-white flex items-center gap-1.5">
                    <span>Auto-Apply</span>
                    {currentCandidateProfile?.autoApply && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    )}
                  </div>
                  <p className="text-[10px] text-indigo-200">
                    {currentCandidateProfile?.autoApply ? 'Applying to ≥1% match' : 'Automated apply is off'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => toggleAutoApply(!currentCandidateProfile?.autoApply)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  currentCandidateProfile?.autoApply
                    ? 'bg-white text-indigo-950 hover:bg-indigo-50'
                    : 'bg-indigo-500 hover:bg-indigo-400 text-white'
                }`}
              >
                {currentCandidateProfile?.autoApply ? 'Turn Off' : 'Turn On'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex border-b border-slate-200 gap-4 sm:gap-6 text-sm font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab('browse')}
          className={`pb-3.5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'browse'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Browse Jobs ({filteredJobs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('applications')}
          className={`pb-3.5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'applications'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>My Applications ({myApplications.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('saved')}
          className={`pb-3.5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'saved'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Saved Jobs ({mySavedJobs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3.5 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Profile & Resume</span>
        </button>
      </div>

      {/* TAB 1: BROWSE JOBS */}
      {activeTab === 'browse' && (
        <div className="space-y-6">
          {/* Filter Bar with Active Badges */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Work Mode */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Mode:</span>
                {['All', 'Remote', 'Hybrid', 'On-site'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setWorkModeFilter(mode)}
                    className={`px-3 py-1 rounded-xl font-bold transition-all text-xs ${
                      workModeFilter === mode
                        ? 'bg-indigo-600 text-white shadow-xs'
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
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Exp:</span>
                {[
                  { label: 'All', val: 'All' },
                  { label: '0-2y', val: '0-2' },
                  { label: '3-5y', val: '3-5' },
                  { label: '6y+', val: '6+' },
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => setExpFilter(item.val)}
                    className={`px-3 py-1 rounded-xl font-bold transition-all text-xs ${
                      expFilter === item.val
                        ? 'bg-indigo-600 text-white shadow-xs'
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
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Dept:</span>
                {['All', 'Engineering', 'Data Science'].map((dept) => (
                  <button
                    key={dept}
                    onClick={() => setDeptFilter(dept)}
                    className={`px-3 py-1 rounded-xl font-bold transition-all text-xs ${
                      deptFilter === dept
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort & Reset Actions */}
            <div className="flex items-center gap-3 justify-between md:justify-end text-xs">
              {hasActiveFilters && (
                <button
                  onClick={resetAllFilters}
                  className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 font-semibold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}

              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-100 font-bold text-slate-800 rounded-xl px-3 py-1.5 border-none focus:outline-none cursor-pointer"
                >
                  <option value="match">Match % (High to Low)</option>
                  <option value="newest">Recently Posted</option>
                </select>
              </div>
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
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900 mb-1">No matching roles found</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
                We couldn't find any listings matching your active filters. Try expanding your search or resetting filters.
              </p>
              <button
                onClick={resetAllFilters}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Clear All Filters
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
              Real-time recruiter pipeline tracking
            </span>
          </div>

          {myApplications.length > 0 ? (
            <div className="space-y-4">
              {myApplications.map((app) => {
                const currentStageIndex = STAGES.indexOf(app.status as any);

                return (
                  <div
                    key={app.id}
                    className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:border-slate-300 transition-all space-y-5"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold flex items-center justify-center flex-shrink-0 text-base shadow-xs">
                          {app.job?.companyName?.[0] || 'C'}
                        </div>
                        <div>
                          <h3
                            onClick={() => app.job && setSelectedJob(app.job)}
                            className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer text-base"
                          >
                            {app.job?.title || 'Job Posting'}
                          </h3>
                          <p className="text-xs text-slate-600 font-semibold">{app.job?.companyName}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                            <span>Applied {new Date(app.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className="font-bold text-indigo-600">{app.matchPct}% Match</span>
                            <span>•</span>
                            <span className="capitalize">{app.source === 'auto' ? '⚡ Auto-applied' : 'Direct Apply'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <span
                          className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider border ${
                            STAGE_COLORS[app.status] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {STAGE_LABELS[app.status] || app.status}
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

                    {/* Visual 5-Step Pipeline Progress Indicator */}
                    <div className="pt-3 border-t border-slate-100">
                      <div className="hidden sm:grid grid-cols-5 gap-2 text-center">
                        {STAGES.map((stg, idx) => {
                          const isCompleted = currentStageIndex >= idx;
                          const isCurrent = app.status === stg;

                          return (
                            <div key={stg} className="flex flex-col items-center">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                  isCurrent
                                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-sm'
                                    : isCompleted
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                                }`}
                              >
                                {isCompleted && !isCurrent ? '✓' : idx + 1}
                              </div>
                              <span
                                className={`text-[11px] font-semibold mt-1.5 capitalize ${
                                  isCurrent
                                    ? 'text-indigo-600 font-bold'
                                    : isCompleted
                                    ? 'text-slate-800'
                                    : 'text-slate-400'
                                }`}
                              >
                                {stg}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Recruiter Note if any */}
                      {app.notes && (
                        <div className="mt-4 text-xs bg-indigo-50/60 border border-indigo-100 p-3 rounded-2xl text-slate-700 flex items-start gap-2">
                          <span className="font-bold text-indigo-900">Recruiter Note:</span>
                          <span>{app.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
              <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900 mb-1">No applications yet</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mb-4">
                Explore recommended jobs matching your skills or turn on Auto-Apply to apply automatically.
              </p>
              <button
                onClick={() => setActiveTab('browse')}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm"
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
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Saved Opportunities</h2>
            <span className="text-xs font-semibold text-slate-500">
              Bookmarked roles for later review
            </span>
          </div>

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
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
              <Bookmark className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900 mb-1">No saved jobs</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mb-4">
                Click the bookmark icon on any job card to save it for later review.
              </p>
              <button
                onClick={() => setActiveTab('browse')}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm"
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
          {/* Left Column: Profile Form & Interactive Skills Tag Editor */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Candidate Profile</h2>
                  <p className="text-xs text-slate-500">
                    Your skills power the semantic matching engine for all job listings.
                  </p>
                </div>
                {profileSavedNotice && (
                  <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Changes saved!
                  </span>
                )}
              </div>

              {/* Profile Strength Meter */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/50 border border-indigo-100/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    <span>Profile Completeness: {profileStrength}%</span>
                  </span>
                  <span className="font-semibold text-indigo-700">
                    {profileStrength >= 80 ? 'All-Star ⭐' : 'Intermediate'}
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-all duration-500 rounded-full"
                    style={{ width: `${profileStrength}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  {profileStrength < 80
                    ? 'Tip: Upload a resume and add 5+ skills to unlock higher recruiter match visibility.'
                    : 'Your profile has optimal skill coverage for auto-apply and recruiter searches.'}
                </p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
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

                {/* Interactive Skill Tag Editor */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Your Technical Stack ({activeSkillsList.length} skills)
                    </label>
                    <span className="text-[11px] text-slate-400">Click &times; to remove</span>
                  </div>

                  {/* Active Skill Chips */}
                  <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl min-h-[56px]">
                    {activeSkillsList.length > 0 ? (
                      activeSkillsList.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-white text-indigo-700 border border-indigo-200 shadow-2xs group"
                        >
                          <span>{skill}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill)}
                            className="p-0.5 rounded-full hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 py-1">No skills added yet.</span>
                    )}
                  </div>

                  {/* Add New Skill Input */}
                  <div className="mt-2.5 flex items-center gap-2">
                    <input
                      type="text"
                      value={newSkillInput}
                      onChange={(e) => setNewSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          handleAddSkill(newSkillInput);
                        }
                      }}
                      placeholder="Type a skill and press Enter (e.g. Docker, GraphQL)..."
                      className="flex-1 text-xs px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddSkill(newSkillInput)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>

                  {/* Popular Skills Cloud (Click-to-Add) */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                      Suggested Tech Skills (Click to add)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_SKILLS.map((sk) => {
                        const isAdded = activeSkillsList.includes(sk.toLowerCase());
                        return (
                          <button
                            key={sk}
                            type="button"
                            disabled={isAdded}
                            onClick={() => handleAddSkill(sk)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                              isAdded
                                ? 'bg-slate-100 text-slate-400 cursor-default'
                                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60'
                            }`}
                          >
                            {isAdded ? `✓ ${sk}` : `+ ${sk}`}
                          </button>
                        );
                      })}
                    </div>
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
                        Enable Auto-Apply Mode
                      </span>
                      <p className="text-xs text-slate-500">
                        Automatically submit applications when skill compatibility is ≥ 1%.
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
                        Skill-Matched Daily Alerts
                      </span>
                      <p className="text-xs text-slate-500">
                        Receive instant notifications when new jobs matching your tech stack are posted.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all"
                  >
                    Save Changes
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
              <div className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-3xl p-6 text-center hover:bg-indigo-50/30 transition-all relative cursor-pointer">
                <UploadCloud className="w-9 h-9 text-indigo-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-indigo-900">Upload Resume (PDF / DOCX / TXT)</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Drag & drop or click to browse</p>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleSimulateResumeUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>

              {currentCandidateProfile?.resumeFilename && (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    <span className="font-semibold text-slate-800 truncate">
                      {currentCandidateProfile.resumeFilename}
                    </span>
                  </div>
                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Active CV
                  </span>
                </div>
              )}

              {/* Or paste text */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Or Paste Resume Summary:
                </label>
                <textarea
                  rows={3}
                  value={resumeTextInput}
                  onChange={(e) => setResumeTextInput(e.target.value)}
                  placeholder="Paste bio, work history, or bullet points here to extract skills..."
                  className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <button
                  type="button"
                  onClick={handleAnalyzePastedResume}
                  className="mt-2 w-full py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
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
                  <div className="flex flex-wrap gap-1.5">
                    {detectedSkills.map((s) => (
                      <span
                        key={s}
                        className="px-2.5 py-1 rounded-lg bg-white text-indigo-700 font-bold text-xs border border-indigo-100 shadow-2xs"
                      >
                        +{s}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={addDetectedSkillsToProfile}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    Add Detected Skills to Stack
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
