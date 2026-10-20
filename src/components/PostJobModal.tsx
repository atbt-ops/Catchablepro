import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Job, WorkMode, EmploymentType, JobStatus } from '../types';
import {
  X,
  Briefcase,
  Sparkles,
  MapPin,
  DollarSign,
  Calendar,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';

interface PostJobModalProps {
  initialJob?: Job | null;
  onClose: () => void;
}

export const PostJobModal: React.FC<PostJobModalProps> = ({ initialJob, onClose }) => {
  const { postJob, updateJob, extractSkillsFromJd } = useApp();

  const [title, setTitle] = useState(initialJob?.title || '');
  const [department, setDepartment] = useState(initialJob?.department || 'Engineering');
  const [location, setLocation] = useState(initialJob?.location || 'Bengaluru');
  const [workMode, setWorkMode] = useState<WorkMode>(initialJob?.workMode || 'Hybrid');
  const [employmentType, setEmploymentType] = useState<EmploymentType>(
    initialJob?.employmentType || 'Full-time'
  );
  const [expMin, setExpMin] = useState(initialJob?.expMin ?? 2);
  const [expMax, setExpMax] = useState(initialJob?.expMax ?? 5);
  const [salaryMin, setSalaryMin] = useState(initialJob?.salaryMin ?? 15);
  const [salaryMax, setSalaryMax] = useState(initialJob?.salaryMax ?? 28);
  const [hideSalary, setHideSalary] = useState(initialJob?.hideSalary ?? false);
  const [vacancies, setVacancies] = useState(initialJob?.vacancies ?? 1);
  const [education, setEducation] = useState(initialJob?.education || 'Graduate');
  const [deadline, setDeadline] = useState(initialJob?.deadline || '2026-12-31');
  const [requiredSkills, setRequiredSkills] = useState(
    initialJob?.requiredSkills || 'python, sql, docker'
  );
  const [description, setDescription] = useState(
    initialJob?.description ||
      '<p>We are seeking a talented engineer to join our high-growth platform team.</p><h4>Responsibilities:</h4><ul><li>Design and maintain cloud services</li><li>Collaborate with product and design</li></ul>'
  );
  const [status, setStatus] = useState<JobStatus>(initialJob?.status || 'active');

  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiSuggestionMessage, setAiSuggestionMessage] = useState('');

  const handleAiExtract = () => {
    setAiAnalyzing(true);
    setTimeout(() => {
      const skills = extractSkillsFromJd(description + ' ' + title);
      if (skills.length > 0) {
        setRequiredSkills(skills.join(', '));
        setAiSuggestionMessage(`Extracted ${skills.length} skills from job description!`);
      } else {
        setAiSuggestionMessage('No new skills recognized in description.');
      }
      setAiAnalyzing(false);
      setTimeout(() => setAiSuggestionMessage(''), 3500);
    }, 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !requiredSkills.trim()) return;

    if (initialJob) {
      updateJob(initialJob.id, {
        title,
        department,
        location,
        workMode,
        employmentType,
        expMin,
        expMax,
        salaryMin,
        salaryMax,
        hideSalary,
        vacancies,
        education,
        deadline,
        requiredSkills,
        description,
        status,
      });
    } else {
      postJob({
        title,
        department,
        location,
        workMode,
        employmentType,
        expMin,
        expMax,
        salaryMin,
        salaryMax,
        hideSalary,
        vacancies,
        education,
        deadline,
        requiredSkills,
        description,
        status,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {initialJob ? 'Edit Job Posting' : 'Post a New Job'}
              </h2>
              <p className="text-xs text-slate-500">
                On-demand billing starts with 7 days FREE on publication.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Job Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Backend Engineer, Data Scientist"
                className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Engineering">Engineering</option>
                <option value="Data Science">Data Science</option>
                <option value="Product">Product</option>
                <option value="Design">Design</option>
                <option value="Operations">Operations</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Bengaluru, Remote, Hyderabad"
                className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Work Mode
              </label>
              <select
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value as WorkMode)}
                className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Employment Type
              </label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Full-time">Full-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
                <option value="Part-time">Part-time</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Experience Range (Years)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="25"
                  value={expMin}
                  onChange={(e) => setExpMin(Number(e.target.value))}
                  className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={expMax}
                  onChange={(e) => setExpMax(Number(e.target.value))}
                  className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Salary Range (LPA in ₹)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="150"
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(Number(e.target.value))}
                  className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(Number(e.target.value))}
                  className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={hideSalary}
                onChange={(e) => setHideSalary(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <span className="text-xs font-semibold text-slate-700">
                Hide salary on public card (show as Confidential)
              </span>
            </label>
            <div className="text-xs text-slate-500">
              Vacancies: <strong>{vacancies}</strong>
            </div>
          </div>

          {/* Required Skills & AI Assistant */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Required Skills (comma separated) *
              </label>
              <button
                type="button"
                onClick={handleAiExtract}
                disabled={aiAnalyzing}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{aiAnalyzing ? 'Analyzing...' : 'AI Auto-Extract from Description'}</span>
              </button>
            </div>

            {aiSuggestionMessage && (
              <div className="mb-2 p-2 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-medium flex items-center gap-1.5 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {aiSuggestionMessage}
              </div>
            )}

            <input
              type="text"
              value={requiredSkills}
              onChange={(e) => setRequiredSkills(e.target.value)}
              placeholder="e.g. python, fastapi, sql, docker, aws"
              className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Skills are scored semantically against candidate profiles.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Job Description (HTML or Plain Text)
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline responsibilities, perks, and qualifications..."
              className="w-full text-sm p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
              required
            />
          </div>

          {/* Status selector */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider block">
                Publication Status
              </span>
              <p className="text-xs text-indigo-700">
                {status === 'active'
                  ? 'Active postings are live to candidates and begin their 7-day free meter spell.'
                  : 'Draft postings are saved privately with no meter running.'}
              </p>
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as JobStatus)}
              className="bg-white border border-indigo-200 text-xs font-bold text-indigo-900 rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="active">Publish Live (Active)</option>
              <option value="draft">Save as Draft</option>
              <option value="paused">Paused</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all"
            >
              {initialJob ? 'Save Changes' : 'Create Job Posting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
