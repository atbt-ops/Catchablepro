import React, { useState } from 'react';
import { Job, CandidateProfile, CompanyProfile } from '../types';
import { matchDetail } from '../services/matching';
import { CompanyAvatar } from './CompanyAvatar';
import { useApp } from '../context/AppContext';
import {
  X,
  MapPin,
  Briefcase,
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
  Users,
  Globe,
  Clock,
  Layers,
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
  const { showToast } = useApp();
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [contactSent, setContactSent] = useState(false);

  const candSkills = candidateProfile?.skills || '';
  const match = matchDetail(candSkills, job.requiredSkills);

  const handleShare = () => {
    const url = `${window.location.origin}/#job-${job.id}`;
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        showToast({
          type: 'success',
          title: 'Link Copied! 📋',
          message: `Shareable link for ${job.title} copied`,
        });
      });
    }
  };

  const handleSendContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactMessage.trim()) return;
    setContactSent(true);
    showToast({
      type: 'success',
      title: 'Inquiry Sent 📨',
      message: `Your message was delivered to ${job.companyName}'s recruiting team`,
    });
    setTimeout(() => {
      setShowContactForm(false);
      setContactSent(false);
      setContactMessage('');
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/70">
          <div className="flex items-start gap-4">
            <CompanyAvatar name={job.companyName} size="lg" showVerified={true} />
            <div>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="px-2.5 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-700">
                  {job.department || 'Technology'}
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-semibold text-slate-600">{job.employmentType}</span>
                <span className="text-slate-300">•</span>
                <span className="font-semibold text-slate-600">{job.workMode}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 leading-tight">
                {job.title}
              </h2>
              <p className="text-sm font-bold text-indigo-600 mt-0.5">{job.companyName}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleShare}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              title="Share job"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Match compatibility banner */}
          {candSkills && (
            <div className="p-5 rounded-3xl bg-gradient-to-r from-indigo-50/90 via-purple-50/70 to-indigo-50/90 border border-indigo-100/90 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">
                      Semantic Skill Compatibility: {match.pct}%
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Calculated from your profile tech stack vs job requirements
                    </p>
                  </div>
                </div>

                <span
                  className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                    match.pct >= 75
                      ? 'bg-emerald-100 text-emerald-800'
                      : match.pct >= 40
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {match.pct >= 75 ? 'Strong Match' : match.pct >= 40 ? 'Moderate Match' : 'Low Match'}
                </span>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Exact Matches */}
                <div className="bg-white/90 p-3.5 rounded-2xl border border-emerald-100 shadow-2xs">
                  <div className="font-bold text-emerald-800 flex items-center gap-1.5 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Exact Matches ({match.matched.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {match.matched.length > 0 ? (
                      match.matched.map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold text-[11px] border border-emerald-100"
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">No exact matches</span>
                    )}
                  </div>
                </div>

                {/* Partial Matches */}
                <div className="bg-white/90 p-3.5 rounded-2xl border border-indigo-100 shadow-2xs">
                  <div className="font-bold text-indigo-800 flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Related Credit ({match.partial.length})</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {match.partial.length > 0 ? (
                      match.partial.map((p) => (
                        <span
                          key={p.skill}
                          className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 font-semibold text-[11px] border border-indigo-100 flex items-center justify-between"
                        >
                          <span>{p.skill}</span>
                          <span className="text-[10px] text-indigo-500 font-bold">
                            via {p.via} ({p.pct}%)
                          </span>
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">No related overlaps</span>
                    )}
                  </div>
                </div>

                {/* Missing Skills */}
                <div className="bg-white/90 p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="font-bold text-slate-600 flex items-center gap-1.5 mb-2">
                    <AlertCircle className="w-4 h-4 text-slate-400" />
                    <span>Missing Skills ({match.missing.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {match.missing.length > 0 ? (
                      match.missing.map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 font-medium text-[11px] border border-slate-200"
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-emerald-600 font-bold text-[11px]">None! Full coverage.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Snapshot Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Compensation
              </span>
              <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">
                {job.hideSalary ? 'Undisclosed' : `₹${job.salaryMin} - ${job.salaryMax} LPA`}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Experience
              </span>
              <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">
                {job.expMin} - {job.expMax} Years
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Location
              </span>
              <span className="text-sm font-extrabold text-slate-900 mt-0.5 block truncate">
                {job.location}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Vacancies
              </span>
              <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">
                {job.vacancies} {job.vacancies === 1 ? 'Opening' : 'Openings'}
              </span>
            </div>
          </div>

          {/* Job Description */}
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-2">
              Role Overview & Responsibilities
            </h3>
            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              {job.description}
            </div>
          </div>

          {/* Company Profile Details */}
          {companyProfile && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>About {job.companyName}</span>
              </h4>
              <p className="text-slate-600 leading-relaxed">{companyProfile.about}</p>
              <div className="flex flex-wrap items-center gap-4 text-slate-500 pt-1">
                <span>HQ: <strong>{companyProfile.hqLocation}</strong></span>
                <span>Size: <strong>{companyProfile.size}</strong></span>
                {companyProfile.website && (
                  <a
                    href={companyProfile.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>Website</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* In-Modal Recruiter Contact Form */}
          {showContactForm ? (
            <form onSubmit={handleSendContact} className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-950">
                  Ask Recruiter a Question
                </span>
                <button
                  type="button"
                  onClick={() => setShowContactForm(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>
              <textarea
                rows={3}
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Ask about team structure, tech stack, or visa/relocation requirements..."
                className="w-full text-xs p-3 rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                required
              />
              <button
                type="submit"
                disabled={contactSent}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{contactSent ? 'Message Sent!' : 'Send Message'}</span>
              </button>
            </form>
          ) : (
            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => setShowContactForm(true)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Have a question? Inquire with hiring team →
              </button>
            </div>
          )}
        </div>

        {/* Modal Sticky Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
          <button
            onClick={() => onToggleSave(job.id)}
            className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
              isSaved
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            <span>{isSaved ? 'Saved in Bookmarks' : 'Save for Later'}</span>
          </button>

          <div className="flex items-center gap-2">
            {hasApplied ? (
              <span className="px-5 py-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Application Submitted</span>
              </span>
            ) : (
              <button
                onClick={() => onApply(job.id)}
                className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-2"
              >
                <span>Apply to Role</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
