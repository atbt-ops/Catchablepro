import React, { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useApp } from '../context/AppContext';
import { Role } from '../types';
import { X, Sparkles, Building2, User } from 'lucide-react';
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    maxWidth: '440px',
    width: '100%',
    padding: spacing.lg,
    boxShadow: shadows.xl,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    marginTop: '2px',
    margin: 0,
  },
  closeBtn: {
    padding: '6px',
    color: {
      default: colors.textMuted,
      ':hover': colors.text,
    },
    backgroundColor: {
      default: 'transparent',
      ':hover': colors.surfaceSubtle,
    },
    borderWidth: 0,
    borderRadius: radii.sm,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.15s ease, background-color 0.15s ease',
  },
  tabs: {
    display: 'flex',
    backgroundColor: colors.surfaceSubtle,
    padding: '4px',
    borderRadius: radii.md,
    gap: '4px',
  },
  tab: {
    flex: 1,
    paddingTop: '6px',
    paddingBottom: '6px',
    borderRadius: radii.sm,
    borderWidth: 0,
    fontSize: '0.75rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  tabActive: {
    backgroundColor: colors.surface,
    color: colors.text,
    boxShadow: shadows.sm,
  },
  tabInactive: {
    backgroundColor: 'transparent',
    color: colors.textSecondary,
  },
  roleGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing.sm,
  },
  roleCard: {
    padding: '12px',
    borderRadius: radii.md,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    textAlign: 'left',
    cursor: 'pointer',
    backgroundColor: {
      default: colors.surface,
      ':hover': colors.surfaceSubtle,
    },
    transition: 'all 0.15s ease',
  },
  roleCardActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryBorder,
    boxShadow: `0 0 0 2px ${colors.primaryBorder}`,
  },
  roleIcon: {
    width: '16px',
    height: '16px',
    marginBottom: '4px',
    color: colors.primary,
  },
  roleCardTitle: {
    fontWeight: 700,
    fontSize: '0.75rem',
    color: colors.text,
  },
  roleCardDesc: {
    fontSize: '0.625rem',
    color: colors.textMuted,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
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
    fontSize: '0.75rem',
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
    color: colors.text,
    backgroundColor: colors.surface,
  },
  submitBtn: {
    width: '100%',
    paddingTop: '10px',
    paddingBottom: '10px',
    borderRadius: radii.md,
    fontSize: '0.75rem',
    fontWeight: 700,
    color: colors.textInverse,
    backgroundColor: {
      default: colors.primary,
      ':hover': colors.primaryHover,
    },
    borderWidth: 0,
    cursor: 'pointer',
    boxShadow: shadows.sm,
    transition: 'background-color 0.15s ease',
  },
  demoSection: {
    paddingTop: '12px',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: colors.border,
  },
  demoHeader: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: colors.textMuted,
    marginBottom: spacing.sm,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  demoIcon: {
    width: '14px',
    height: '14px',
    color: colors.primary,
  },
  demoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '6px',
  },
  demoCard: {
    padding: '8px 10px',
    borderRadius: radii.md,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: {
      default: colors.border,
      ':hover': colors.primaryBorder,
    },
    backgroundColor: {
      default: colors.surfaceSubtle,
      ':hover': colors.primaryLight,
    },
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  demoCardName: {
    fontWeight: 700,
    color: colors.text,
    fontSize: '0.75rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  demoCardRole: {
    fontSize: '0.625rem',
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
});

interface AuthModalProps {
  initialRole?: Role;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ initialRole = 'candidate', onClose }) => {
  const { login, register, switchUser, users } = useApp();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<Role>(initialRole);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    if (mode === 'login') {
      const ok = login(email, role);
      if (ok) onClose();
    } else {
      register({
        email,
        name: name || email.split('@')[0],
        role,
        company_name: companyName,
      });
      onClose();
    }
  };

  return (
    <div {...stylex.props(styles.overlay)}>
      <div {...stylex.props(styles.card)}>
        {/* Header */}
        <div {...stylex.props(styles.header)}>
          <div>
            <h2 {...stylex.props(styles.title)}>
              {mode === 'login' ? 'Sign In to Catchablepro' : 'Create an Account'}
            </h2>
            <p {...stylex.props(styles.subtitle)}>
              India's skill-based tech employment exchange.
            </p>
          </div>
          <button
            onClick={onClose}
            {...stylex.props(styles.closeBtn)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab switch between Login and Register */}
        <div {...stylex.props(styles.tabs)}>
          <button
            onClick={() => setMode('login')}
            {...stylex.props(styles.tab, mode === 'login' ? styles.tabActive : styles.tabInactive)}
          >
            Log In
          </button>
          <button
            onClick={() => setMode('register')}
            {...stylex.props(styles.tab, mode === 'register' ? styles.tabActive : styles.tabInactive)}
          >
            Create Account
          </button>
        </div>

        {/* Role toggle if registering */}
        {mode === 'register' && (
          <div {...stylex.props(styles.roleGrid)}>
            <button
              type="button"
              onClick={() => setRole('candidate')}
              {...stylex.props(styles.roleCard, role === 'candidate' && styles.roleCardActive)}
            >
              <User {...stylex.props(styles.roleIcon)} />
              <div {...stylex.props(styles.roleCardTitle)}>Job Seeker</div>
              <div {...stylex.props(styles.roleCardDesc)}>Match &amp; Auto-Apply</div>
            </button>

            <button
              type="button"
              onClick={() => setRole('employer')}
              {...stylex.props(styles.roleCard, role === 'employer' && styles.roleCardActive)}
            >
              <Building2 {...stylex.props(styles.roleIcon)} />
              <div {...stylex.props(styles.roleCardTitle)}>Employer</div>
              <div {...stylex.props(styles.roleCardDesc)}>Post &amp; Rank Candidates</div>
            </button>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} {...stylex.props(styles.form)}>
          {mode === 'register' && (
            <div {...stylex.props(styles.formGroup)}>
              <label {...stylex.props(styles.label)}>
                Your Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                {...stylex.props(styles.input)}
                required
              />
            </div>
          )}

          {mode === 'register' && role === 'employer' && (
            <div {...stylex.props(styles.formGroup)}>
              <label {...stylex.props(styles.label)}>
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Tech Solutions"
                {...stylex.props(styles.input)}
                required
              />
            </div>
          )}

          <div {...stylex.props(styles.formGroup)}>
            <label {...stylex.props(styles.label)}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. name@example.com"
              {...stylex.props(styles.input)}
              required
            />
          </div>

          <button
            type="submit"
            {...stylex.props(styles.submitBtn)}
          >
            {mode === 'login' ? 'Continue' : 'Create Account'}
          </button>
        </form>

        {/* Quick Demo Logins Section */}
        <div {...stylex.props(styles.demoSection)}>
          <div {...stylex.props(styles.demoHeader)}>
            <Sparkles {...stylex.props(styles.demoIcon)} />
            <span>Instant Demo Logins</span>
          </div>
          <div {...stylex.props(styles.demoGrid)}>
            {users.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  switchUser(u.id);
                  onClose();
                }}
                {...stylex.props(styles.demoCard)}
              >
                <div {...stylex.props(styles.demoCardName)}>{u.name || u.email}</div>
                <div {...stylex.props(styles.demoCardRole)}>
                  {u.role === 'employer' ? u.company_name || 'Employer' : 'Candidate'}
                  {u.is_admin ? ' (Admin)' : ''}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
