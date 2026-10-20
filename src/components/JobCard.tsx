import React, { useState } from 'react';
import { Job, CandidateProfile } from '../types';
import { matchDetail } from '../services/matching';
import { CompanyAvatar } from './CompanyAvatar';
import { useApp } from '../context/AppContext';
import {
  MapPin,
  Briefcase,
  Clock,
  CheckCircle2,
  Bookmark,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Share2,
  TrendingUp,
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
  const { showToast } = useApp();
  const [copied, setCopied] = useState(false);

  const candSkills = candidateProfile?.skills || '';
  const match = matchDetail(candSkills, job.requiredSkills);

  // Match score visual styling
  const getScoreTheme = (pct: number) => {
    if (pct >= 75) {
      return {
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20',
        bar: 'bg-emerald-500',
        text: 'text-emerald-700 font-bold',
      };
    }
    if (pct >= 40) {
      return {
        badge: 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-indigo-500/20',
        bar: 'bg-indigo-500',
        text: 'text-indigo-700 font-bold',
      };
    }
    return {
      badge: 'bg-slate-50 text-slate-600 border-slate-200 ring-slate-400/10',
      bar: 'bg-slate-400',
      text: 'text-slate-600 font-medium',
    };
  };

  const theme = getScoreTheme(match.pct);

  // Check if job is newly posted (less than 7 days)
  const isNew =
    new Date().getTime() - new Date(job.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/#job-${job.id}`;
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        showToast({
          type: 'success',
          title: 'Link Copied 📋',
          message: `Shareable link for ${job.title} copied to clipboard`,
        });
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div className="group bg-white rounded-3xl border border-slate-200/90 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-200 p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden">
      {/* Top Accent Glow on high match */}
      {candSkills && match.pct >= 75 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-indigo-500" />
      )}

      {/* Main Content */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <CompanyAvatar name={job.companyName} size="md" showVerified={true} />
            <div>
              <div className="flex items-center gap-2">
                <h3
                  onClick={() => onSelect(job)}
                  className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-indigo-600 cursor-pointer transition-colors leading-snug line-clamp-1"
                >
                  {job.title}
                </h3>
                {isNew && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100 flex-shrink-0">
                    New
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-slate-600 flex items-center gap-1.5 mt-0.5">
                <span>{job.companyName}</span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-medium text-slate-400">{job.department}</span>
              </p>
            </div>
          </div>

          {/* Quick Actions (Share & Bookmark) */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleShare}
              className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
              title="Share job link"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onToggleSave(job.id)}
              className={`p-2 rounded-xl border transition-colors ${
                isSaved
                  ? 'bg-amber-50 text-amber-600 border-amber-200'
                  : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-50'
              }`}
              title={isSaved ? 'Remove from saved' : 'Save job'}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Match Compatibility Meter Pill */}
        {candSkills ? (
          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ring-2 ${theme.badge}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{match.pct}% Skill Compatibility</span>
            </div>

            <div className="hidden sm:flex items-center gap-2 flex-1 max-w-[120px]">
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${theme.bar}`}
                  style={{ width: `${Math.min(match.pct, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ) : null}

        {/* Job Metadata Chips */}
        <div className="flex flex-wrap items-center gap-2 mt-3.5 text-xs font-medium text-slate-600">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100/90 text-slate-700">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            {job.location} ({job.workMode})
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100/90 text-slate-700">
            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
            {job.expMin} - {job.expMax} yrs
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 font-bold border border-emerald-100">
            {job.hideSalary
              ? 'Salary Undisclosed'
              : `₹${job.salaryMin} - ${job.salaryMax} LPA`}
          </span>
          <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-bold">
            {job.employmentType}
          </span>
        </div>

        {/* Skills Breakdown Tags */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            <span>Required Skills</span>
            {candSkills && (
              <span className="text-[10px] lowercase font-normal text-slate-400">
                {match.matched.length} matched • {match.missing.length} missing
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {job.requiredSkills.split(',').map((s) => {
              const skill = s.trim();
              const isMatched = match.matched.includes(skill.toLowerCase());
              const partialMatch = match.partial.find(
                (p) => p.skill.toLowerCase() === skill.toLowerCase()
              );

              return (
                <span
                  key={skill}
                  title={
                    isMatched
                      ? 'Exact skill match'
                      : partialMatch
                      ? `Related credit (${partialMatch.pct}%) via ${partialMatch.via}`
                      : 'Missing from your profile'
                  }
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    isMatched
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs'
                      : partialMatch
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200/80 opacity-80'
                  }`}
                >
                  {isMatched && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  {partialMatch && <Sparkles className="w-3.5 h-3.5 text-indigo-500" />}
                  <span>{skill}</span>
                  {partialMatch && (
                    <span className="text-[10px] text-indigo-500 font-bold">
                      {partialMatch.pct}%
                    </span>
                  )}
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
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 group/btn transition-colors focus:outline-none"
        >
          <span>Match Report</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
        </button>

        {hasApplied ? (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
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
