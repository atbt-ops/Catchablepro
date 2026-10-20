import React from 'react';
import { Job, CandidateProfile } from '../types';
import { matchDetail } from '../services/matching';
import {
  MapPin,
  Briefcase,
  Clock,
  CheckCircle2,
  Bookmark,
  Building2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface JobCardProps {
  job: Job;
  candidateProfile: CandidateProfile | null;
  hasApplied: boolean;
  isSaved: boolean;
  onSelect: (job: Job) => void;
  onApply: (jobId: number) => void;
  onToggleSave: (jobId: number) => void;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  candidateProfile,
  hasApplied,
  isSaved,
  onSelect,
  onApply,
  onToggleSave,
}) => {
  const candSkills = candidateProfile?.skills || '';
  const match = matchDetail(candSkills, job.requiredSkills);

  // Match score color styling
  const getScoreColor = (pct: number) => {
    if (pct >= 75) return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20';
    if (pct >= 40) return 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-indigo-500/20';
    return 'bg-slate-50 text-slate-600 border-slate-200 ring-slate-400/10';
  };

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden">
      {/* Top Banner & Header */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300/60 flex items-center justify-center font-bold text-slate-700 text-lg shadow-sm flex-shrink-0 group-hover:from-indigo-50 group-hover:to-indigo-100 group-hover:text-indigo-700 transition-colors">
              <Building2 className="w-6 h-6 text-slate-500 group-hover:text-indigo-600 transition-colors" />
            </div>
            <div>
              <h3
                onClick={() => onSelect(job)}
                className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-indigo-600 cursor-pointer transition-colors leading-snug line-clamp-1"
              >
                {job.title}
              </h3>
              <p className="text-sm font-medium text-slate-600">{job.companyName}</p>
            </div>
          </div>

          {/* Match Score Badge */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {candSkills ? (
              <div
                title={`${match.pct}% Skill Compatibility`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ring-2 ${getScoreColor(
                  match.pct
                )}`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{match.pct}% Match</span>
              </div>
            ) : null}
            <button
              onClick={() => onToggleSave(job.id)}
              className={`p-2 rounded-xl border transition-colors ${
                isSaved
                  ? 'bg-amber-50 text-amber-600 border-amber-200'
                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-100'
              }`}
              title={isSaved ? 'Remove from saved' : 'Save job'}
            >
              <Bookmark className="w-4 h-4 fill-current" />
            </button>
          </div>
        </div>

        {/* Job Metadata Chips */}
        <div className="flex flex-wrap items-center gap-2 mt-4 text-xs font-medium text-slate-600">
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            {job.location} ({job.workMode})
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100">
            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
            {job.expMin} - {job.expMax} yrs exp
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 font-semibold text-slate-800">
            {job.hideSalary
              ? 'Salary Undisclosed'
              : `₹${job.salaryMin} - ${job.salaryMax} LPA`}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-semibold">
            {job.employmentType}
          </span>
        </div>

        {/* Skills Overlap Preview */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Required Skills
          </div>
          <div className="flex flex-wrap gap-1.5">
            {job.requiredSkills.split(',').map((s) => {
              const skill = s.trim();
              const isMatched = match.matched.includes(skill.toLowerCase());
              const isPartial = match.partial.some(
                (p) => p.skill.toLowerCase() === skill.toLowerCase()
              );

              return (
                <span
                  key={skill}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${
                    isMatched
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : isPartial
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  {isMatched && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                  {isPartial && <Sparkles className="w-3 h-3 text-indigo-500" />}
                  {skill}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
        <button
          onClick={() => onSelect(job)}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 group/btn"
        >
          <span>View Details & Match Report</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
        </button>

        {hasApplied ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Applied
          </span>
        ) : (
          <button
            onClick={() => onApply(job.id)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-sm shadow-indigo-600/20 transition-all flex items-center gap-1.5"
          >
            Apply Now
          </button>
        )}
      </div>
    </div>
  );
};
