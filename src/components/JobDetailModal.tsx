import React, { useState } from 'react';
import { Job, CandidateProfile, CompanyProfile } from '../types';
import { matchDetail } from '../services/matching';
import {
  X,
  MapPin,
  Briefcase,
  DollarSign,
  Calendar,
  Building2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Bookmark,
  Send,
  ExternalLink,
  ShieldCheck,
  Share2,
} from 'lucide-react';

interface JobDetailModalProps {
  job: Job;
  companyProfile?: CompanyProfile;
  candidateProfile: CandidateProfile | null;
  hasApplied: boolean;
  isSaved: boolean;
  onClose: () => void;
  onApply: (jobId: number) => void;
  onToggleSave: (jobId: number) => void;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({
  job,
  companyProfile,
  candidateProfile,
  hasApplied,
  isSaved,
  onClose,
  onApply,
  onToggleSave,
}) => {
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [contactSent, setContactSent] = useState(false);

  const candSkills = candidateProfile?.skills || '';
  const match = matchDetail(candSkills, job.requiredSkills);

  const handleSendContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactMessage.trim()) return;
    setContactSent(true);
    setTimeout(() => {
      setShowContactForm(false);
      setContactSent(false);
      setContactMessage('');
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                  {job.department || 'Technology'}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-medium text-slate-500">{job.employmentType}</span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-medium text-slate-500">{job.workMode}</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">{job.title}</h2>
              <p className="text-sm font-semibold text-indigo-600">{job.companyName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Match compatibility banner */}
          {candSkills && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/80 to-purple-50/80 border border-indigo-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <span className="font-bold text-slate-900 text-sm">
                    Semantic Skill Compatibility: {match.pct}%
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  Based on your profile skills
                </span>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-white/80 p-3 rounded-xl border border-slate-200">
                  <div className="font-semibold text-emerald-700 flex items-center gap-1.5 mb-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Exact Matches ({match.matched.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {match.matched.length > 0 ? (
                      match.matched.map((s) => (
                        <span
                          key={s}
                          className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-medium"
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic">None</span>
                    )}
                  </div>
                </div>

                <div className="bg-white/80 p-3 rounded-xl border border-slate-200">
                  <div className="font-semibold text-indigo-700 flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Partial / Related ({match.partial.length})</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {match.partial.length > 0 ? (
                      match.partial.map((p) => (
                        <span
                          key={p.skill}
                          className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 font-medium text-[11px]"
                          title={`${p.skill} inferred from ${p.via} (${p.pct}%)`}
                        >
                          {p.skill} <span className="opacity-70 text-[10px]">({p.via})</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic">None</span>
                    )}
                  </div>
                </div>

                <div className="bg-white/80 p-3 rounded-xl border border-slate-200">
                  <div className="font-semibold text-slate-600 flex items-center gap-1.5 mb-1.5">
                    <AlertCircle className="w-4 h-4 text-slate-400" />
                    <span>Missing Skills ({match.missing.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {match.missing.length > 0 ? (
                      match.missing.map((s) => (
                        <span
                          key={s}
                          className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium"
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-emerald-600 font-medium">All met!</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Key Job Attributes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Location
              </span>
              <span className="text-sm font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {job.location}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Experience
              </span>
              <span className="text-sm font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                {job.expMin} - {job.expMax} years
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Compensation
              </span>
              <span className="text-sm font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                {job.hideSalary ? 'Confidential' : `₹${job.salaryMin} - ${job.salaryMax} LPA`}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Vacancies
              </span>
              <span className="text-sm font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {job.vacancies} open role{job.vacancies > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Job Description */}
          <div>
            <h4 className="text-base font-bold text-slate-900 mb-2">Job Description</h4>
            <div
              className="prose prose-sm text-slate-700 max-w-none leading-relaxed"
              dangerouslySetInnerHTML={{ __html: job.description }}
            />
          </div>

          {/* Required Skills list */}
          <div>
            <h4 className="text-base font-bold text-slate-900 mb-2">Required Skills</h4>
            <div className="flex flex-wrap gap-2">
              {job.requiredSkills.split(',').map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 rounded-xl bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200"
                >
                  {skill.trim()}
                </span>
              ))}
            </div>
          </div>

          {/* Company About Box */}
          {companyProfile && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-sm">About {job.companyName}</h4>
                {companyProfile.website && (
                  <a
                    href={companyProfile.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <span>Visit website</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <p className="text-xs text-slate-600">{companyProfile.about}</p>
              <div className="flex gap-4 text-[11px] text-slate-500 pt-1">
                <span>Industry: {companyProfile.industry}</span>
                <span>Size: {companyProfile.size}</span>
                <span>HQ: {companyProfile.hqLocation}</span>
              </div>
            </div>
          )}

          {/* Contact Employer Form */}
          {showContactForm && (
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 animate-in fade-in">
              <h4 className="text-sm font-bold text-indigo-950 mb-2 flex items-center gap-1.5">
                <Send className="w-4 h-4 text-indigo-600" />
                <span>Send direct message to hiring team</span>
              </h4>
              {contactSent ? (
                <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200">
                  Message sent successfully! The recruiter will review your profile.
                </div>
              ) : (
                <form onSubmit={handleSendContact} className="space-y-3">
                  <textarea
                    rows={3}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Introduce yourself and highlight relevant experience or project links..."
                    className="w-full text-xs p-3 rounded-xl border border-indigo-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    required
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowContactForm(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                    >
                      Send Inquiry
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="p-4 sm:p-6 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleSave(job.id)}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                isSaved
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              <span>{isSaved ? 'Saved' : 'Save Job'}</span>
            </button>
            <button
              onClick={() => setShowContactForm(!showContactForm)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
            >
              <Send className="w-4 h-4 text-slate-500" />
              <span>Contact Employer</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {hasApplied ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Application Submitted</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  onApply(job.id);
                }}
                className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2"
              >
                <span>Apply with 1-Click</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
