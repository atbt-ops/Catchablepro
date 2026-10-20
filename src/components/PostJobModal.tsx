import React, { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useApp } from '../context/AppContext';
import { Job, WorkMode, EmploymentType, JobStatus } from '../types';
import {
  X,
  Briefcase,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { colors, spacing, radii, shadows } from '../theme/tokens.stylex';

const styles = stylex.create({
  overlay: {
    position: 'fixed',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    overflowY: 'auto',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    maxWidth: '672px',
    width: '100%',
    maxHeight: '92vh',
    overflow: 'hidden',
    boxShadow: shadows.xl,
    display: 'flex',
    flexDirection: 'column',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
  },
  header: {
    padding: spacing.lg,
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: colors.border,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSubtle,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconBox: {
    width: '40px',
    height: '40px',
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    color: colors.textInverse,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: colors.text,
    margin: 0,
  },
  subtitle: {
    fontSize: '0.75rem',
    color: colors.textSecondary,
    margin: 0,
    marginTop: '2px',
  },
  closeBtn: {
    padding: '8px',
    borderRadius: radii.md,
    color: {
      default: colors.textMuted,
      ':hover': colors.textSecondary,
    },
    backgroundColor: {
      default: 'transparent',
      ':hover': colors.border,
    },
    borderWidth: 0,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  form: {
    padding: spacing.lg,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: spacing.md,
  },
  fullWidth: {
    gridColumn: '1 / -1',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: colors.textSecondary,
    marginBottom: '4px',
  },
  input: {
    width: '100%',
    fontSize: '0.875rem',
    paddingTop: '10px',
    paddingBottom: '10px',
    paddingLeft: '14px',
    paddingRight: '14px',
    borderRadius: radii.md,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    backgroundColor: colors.surface,
    color: colors.text,
  },
  inputMonospace: {
    fontFamily: 'monospace',
    fontSize: '0.8125rem',
  },
  textarea: {
    width: '100%',
    fontSize: '0.8125rem',
    padding: '12px 14px',
    borderRadius: radii.md,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'monospace',
    backgroundColor: colors.surface,
    color: colors.text,
  },
  rangeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rangeText: {
    fontSize: '0.75rem',
    color: colors.textMuted,
  },
  salaryBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
  },
  checkboxText: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: colors.textSecondary,
  },
  vacanciesText: {
    fontSize: '0.75rem',
    color: colors.textSecondary,
  },
  aiHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '6px',
  },
  aiBtn: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: {
      default: colors.primary,
      ':hover': colors.primaryHover,
    },
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'transparent',
    borderWidth: 0,
    cursor: 'pointer',
  },
  aiMsg: {
    marginBottom: spacing.sm,
    padding: '8px 12px',
    borderRadius: radii.sm,
    backgroundColor: colors.successLight,
    color: colors.successText,
    fontSize: '0.75rem',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.successBorder,
  },
  helperText: {
    fontSize: '0.6875rem',
    color: colors.textMuted,
    marginTop: '4px',
    margin: 0,
  },
  statusSection: {
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.primaryLight,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.primaryBorder,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  statusLabel: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: colors.primaryActive,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    display: 'block',
  },
  statusDesc: {
    fontSize: '0.75rem',
    color: colors.primaryHover,
    margin: 0,
    marginTop: '2px',
  },
  statusSelect: {
    backgroundColor: colors.surface,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.primaryBorder,
    fontSize: '0.75rem',
    fontWeight: 700,
    color: colors.primaryActive,
    borderRadius: radii.md,
    padding: '6px 12px',
    outline: 'none',
    cursor: 'pointer',
  },
  actionsRow: {
    paddingTop: spacing.sm,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  cancelBtn: {
    padding: '8px 16px',
    borderRadius: radii.md,
    fontSize: '0.75rem',
    fontWeight: 700,
    color: colors.textSecondary,
    backgroundColor: {
      default: 'transparent',
      ':hover': colors.surfaceSubtle,
    },
    borderWidth: 0,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  submitBtn: {
    padding: '10px 22px',
    borderRadius: radii.md,
    fontSize: '0.75rem',
    fontWeight: 700,
    color: colors.textInverse,
    backgroundColor: {
      default: colors.primary,
      ':hover': colors.primaryHover,
    },
    borderWidth: 0,
    boxShadow: shadows.sm,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
});

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
  const [vacancies] = useState(initialJob?.vacancies ?? 1);
  const [education] = useState(initialJob?.education || 'Graduate');
  const [deadline] = useState(initialJob?.deadline || '2026-12-31');
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
    <div {...stylex.props(styles.overlay)}>
      <div {...stylex.props(styles.modal)}>
        {/* Header */}
        <div {...stylex.props(styles.header)}>
          <div {...stylex.props(styles.headerLeft)}>
            <div {...stylex.props(styles.iconBox)}>
              <Briefcase size={20} />
            </div>
            <div>
              <h2 {...stylex.props(styles.title)}>
                {initialJob ? 'Edit Job Posting' : 'Post a New Job'}
              </h2>
              <p {...stylex.props(styles.subtitle)}>
                On-demand billing starts with 7 days FREE on publication.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            {...stylex.props(styles.closeBtn)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} {...stylex.props(styles.form)}>
          <div {...stylex.props(styles.grid)}>
            <div {...stylex.props(styles.formGroup, styles.fullWidth)}>
              <label {...stylex.props(styles.label)}>
                Job Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Backend Engineer, Data Scientist"
                {...stylex.props(styles.input)}
                required
              />
            </div>

            <div {...stylex.props(styles.formGroup)}>
              <label {...stylex.props(styles.label)}>
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                {...stylex.props(styles.input)}
              >
                <option value="Engineering">Engineering</option>
                <option value="Data Science">Data Science</option>
                <option value="Product">Product</option>
                <option value="Design">Design</option>
                <option value="Operations">Operations</option>
              </select>
            </div>

            <div {...stylex.props(styles.formGroup)}>
              <label {...stylex.props(styles.label)}>
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Bengaluru, Remote, Hyderabad"
                {...stylex.props(styles.input)}
                required
              />
            </div>

            <div {...stylex.props(styles.formGroup)}>
              <label {...stylex.props(styles.label)}>
                Work Mode
              </label>
              <select
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value as WorkMode)}
                {...stylex.props(styles.input)}
              >
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
              </select>
            </div>

            <div {...stylex.props(styles.formGroup)}>
              <label {...stylex.props(styles.label)}>
                Employment Type
              </label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                {...stylex.props(styles.input)}
              >
                <option value="Full-time">Full-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
                <option value="Part-time">Part-time</option>
              </select>
            </div>

            <div {...stylex.props(styles.formGroup)}>
              <label {...stylex.props(styles.label)}>
                Experience Range (Years)
              </label>
              <div {...stylex.props(styles.rangeRow)}>
                <input
                  type="number"
                  min="0"
                  max="25"
                  value={expMin}
                  onChange={(e) => setExpMin(Number(e.target.value))}
                  {...stylex.props(styles.input)}
                />
                <span {...stylex.props(styles.rangeText)}>to</span>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={expMax}
                  onChange={(e) => setExpMax(Number(e.target.value))}
                  {...stylex.props(styles.input)}
                />
              </div>
            </div>

            <div {...stylex.props(styles.formGroup)}>
              <label {...stylex.props(styles.label)}>
                Salary Range (LPA in ₹)
              </label>
              <div {...stylex.props(styles.rangeRow)}>
                <input
                  type="number"
                  min="0"
                  max="150"
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(Number(e.target.value))}
                  {...stylex.props(styles.input)}
                />
                <span {...stylex.props(styles.rangeText)}>to</span>
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(Number(e.target.value))}
                  {...stylex.props(styles.input)}
                />
              </div>
            </div>
          </div>

          <div {...stylex.props(styles.salaryBox)}>
            <label {...stylex.props(styles.checkboxLabel)}>
              <input
                type="checkbox"
                checked={hideSalary}
                onChange={(e) => setHideSalary(e.target.checked)}
              />
              <span {...stylex.props(styles.checkboxText)}>
                Hide salary on public card (show as Confidential)
              </span>
            </label>
            <div {...stylex.props(styles.vacanciesText)}>
              Vacancies: <strong>{vacancies}</strong>
            </div>
          </div>

          {/* Required Skills & AI Assistant */}
          <div {...stylex.props(styles.formGroup)}>
            <div {...stylex.props(styles.aiHeaderRow)}>
              <label {...stylex.props(styles.label)}>
                Required Skills (comma separated) *
              </label>
              <button
                type="button"
                onClick={handleAiExtract}
                disabled={aiAnalyzing}
                {...stylex.props(styles.aiBtn)}
              >
                <Sparkles size={14} />
                <span>{aiAnalyzing ? 'Analyzing...' : 'AI Auto-Extract from Description'}</span>
              </button>
            </div>

            {aiSuggestionMessage && (
              <div {...stylex.props(styles.aiMsg)}>
                <CheckCircle2 size={14} color="#059669" />
                <span>{aiSuggestionMessage}</span>
              </div>
            )}

            <input
              type="text"
              value={requiredSkills}
              onChange={(e) => setRequiredSkills(e.target.value)}
              placeholder="e.g. python, fastapi, sql, docker, aws"
              {...stylex.props(styles.input, styles.inputMonospace)}
              required
            />
            <p {...stylex.props(styles.helperText)}>
              Skills are scored semantically against candidate profiles.
            </p>
          </div>

          {/* Description */}
          <div {...stylex.props(styles.formGroup)}>
            <label {...stylex.props(styles.label)}>
              Job Description (HTML or Plain Text)
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline responsibilities, perks, and qualifications..."
              {...stylex.props(styles.textarea)}
              required
            />
          </div>

          {/* Status selector */}
          <div {...stylex.props(styles.statusSection)}>
            <div>
              <span {...stylex.props(styles.statusLabel)}>
                Publication Status
              </span>
              <p {...stylex.props(styles.statusDesc)}>
                {status === 'active'
                  ? 'Active postings are live to candidates and begin their 7-day free meter spell.'
                  : 'Draft postings are saved privately with no meter running.'}
              </p>
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as JobStatus)}
              {...stylex.props(styles.statusSelect)}
            >
              <option value="active">Publish Live (Active)</option>
              <option value="draft">Save as Draft</option>
              <option value="paused">Paused</option>
            </select>
          </div>

          <div {...stylex.props(styles.actionsRow)}>
            <button
              type="button"
              onClick={onClose}
              {...stylex.props(styles.cancelBtn)}
            >
              Cancel
            </button>
            <button
              type="submit"
              {...stylex.props(styles.submitBtn)}
            >
              {initialJob ? 'Save Changes' : 'Create Job Posting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
