import React, { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useApp } from '../context/AppContext';
import {
  X,
  User,
  Shield,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
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
    maxWidth: '576px',
    width: '100%',
    maxHeight: '90vh',
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
    gap: spacing.md,
  },
  headerIcon: {
    width: '40px',
    height: '40px',
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
    color: colors.primary,
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
    margin: '2px 0 0',
  },
  closeBtn: {
    padding: '8px',
    borderRadius: radii.md,
    color: colors.textMuted,
    backgroundColor: 'transparent',
    borderWidth: 0,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: spacing.lg,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  input: {
    width: '100%',
    fontSize: '0.8125rem',
    padding: '10px 14px',
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
  label: {
    display: 'block',
    fontSize: '0.6875rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: colors.textSecondary,
    marginBottom: '4px',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: spacing.md,
  },
  saveBtn: {
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: '16px',
    paddingRight: '16px',
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
  },
  section: {
    paddingTop: spacing.md,
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: colors.border,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  rowBetween: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  statusBadgeActive: {
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '10px',
    paddingRight: '10px',
    borderRadius: radii.full,
    fontSize: '0.75rem',
    fontWeight: 700,
    backgroundColor: colors.successLight,
    color: colors.successText,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.successBorder,
  },
  statusBadgeInactive: {
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '10px',
    paddingRight: '10px',
    borderRadius: radii.full,
    fontSize: '0.75rem',
    fontWeight: 700,
    backgroundColor: colors.surfaceSubtle,
    color: colors.textSecondary,
  },
  totpBox: {
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.primaryLight,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.primaryBorder,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  secretKey: {
    fontFamily: 'monospace',
    fontWeight: 700,
    backgroundColor: colors.surface,
    padding: '8px',
    borderRadius: radii.md,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.primaryBorder,
    color: colors.primary,
    fontSize: '0.8125rem',
    marginTop: '4px',
  },
  totpRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  totpInput: {
    width: '160px',
    fontSize: '0.8125rem',
    padding: '8px 12px',
    backgroundColor: colors.surface,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.primaryBorder,
    borderRadius: radii.md,
    textAlign: 'center',
    fontFamily: 'monospace',
    fontWeight: 700,
  },
  actionSecondaryBtn: {
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: '14px',
    paddingRight: '14px',
    borderRadius: radii.md,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    fontSize: '0.75rem',
    fontWeight: 700,
    color: colors.textSecondary,
    backgroundColor: {
      default: colors.surface,
      ':hover': colors.surfaceSubtle,
    },
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  deleteBtn: {
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: '14px',
    paddingRight: '14px',
    borderRadius: radii.md,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.dangerBorder,
    fontSize: '0.75rem',
    fontWeight: 700,
    color: colors.dangerText,
    backgroundColor: {
      default: colors.dangerLight,
      ':hover': '#fee2e2',
    },
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
});

interface AccountModalProps {
  onClose: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({ onClose }) => {
  const {
    currentUser,
    updateUser,
    deleteAccount,
    candidateProfiles,
    companyProfiles,
    applications,
    jobs,
    auditLogs,
  } = useApp();

  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [designation, setDesignation] = useState(currentUser?.designation || '');
  const [savedNotice, setSavedNotice] = useState(false);

  // 2FA state
  const [totpCode, setTotpCode] = useState('');
  const [totpError, setTotpError] = useState('');
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  if (!currentUser) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser(currentUser.id, {
      name,
      phone,
      designation,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleToggle2FA = () => {
    if (currentUser.totp_enabled) {
      updateUser(currentUser.id, { totp_enabled: false });
      setShowRecoveryCodes(false);
    } else {
      if (totpCode.length !== 6) {
        setTotpError('Enter any 6-digit authenticator code (e.g. 123456)');
        return;
      }
      setTotpError('');
      const generatedCodes = [
        'A89B-4412',
        'C92E-1049',
        'F771-8820',
        'K419-5521',
        'P002-3199',
        'X882-9912',
      ];
      setRecoveryCodes(generatedCodes);
      setShowRecoveryCodes(true);
      updateUser(currentUser.id, { totp_enabled: true });
    }
  };

  const handleExportData = () => {
    const data = {
      user: currentUser,
      candidateProfile: candidateProfiles[currentUser.id] || null,
      companyProfile: companyProfiles[currentUser.id] || null,
      myApplications: applications.filter((a) => a.candidateId === currentUser.id),
      myJobs: jobs.filter((j) => j.employerId === currentUser.id),
      myAuditTrail: auditLogs.filter((l) => l.actorId === currentUser.id),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `catchablepro_export_${currentUser.email}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAccount = () => {
    if (
      window.confirm(
        'Are you sure you want to delete your account? All jobs, applications, and profile data will be permanently wiped.'
      )
    ) {
      deleteAccount(currentUser.id);
      onClose();
    }
  };

  return (
    <div {...stylex.props(styles.overlay)}>
      <div {...stylex.props(styles.modal)}>
        {/* Header */}
        <div {...stylex.props(styles.header)}>
          <div {...stylex.props(styles.headerLeft)}>
            <div {...stylex.props(styles.headerIcon)}>
              <User size={20} />
            </div>
            <div>
              <h2 {...stylex.props(styles.title)}>Account &amp; Security</h2>
              <p {...stylex.props(styles.subtitle)}>{currentUser.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            {...stylex.props(styles.closeBtn)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div {...stylex.props(styles.body)}>
          {/* Profile Details Form */}
          <form onSubmit={handleSaveProfile} {...stylex.props(styles.form)}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Personal Information</h3>
            <div>
              <label {...stylex.props(styles.label)}>
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                {...stylex.props(styles.input)}
              />
            </div>

            <div {...stylex.props(styles.grid2)}>
              <div>
                <label {...stylex.props(styles.label)}>
                  Designation / Role Title
                </label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  {...stylex.props(styles.input)}
                />
              </div>

              <div>
                <label {...stylex.props(styles.label)}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  {...stylex.props(styles.input)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
              {savedNotice && (
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#065f46', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={14} color="#059669" /> Profile updated!
                </span>
              )}
              <div style={{ marginLeft: 'auto' }}>
                <button
                  type="submit"
                  {...stylex.props(styles.saveBtn)}
                >
                  Save Profile
                </button>
              </div>
            </div>
          </form>

          {/* Two-Factor Authentication (TOTP) */}
          <div {...stylex.props(styles.section)}>
            <div {...stylex.props(styles.rowBetween)}>
              <div>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Shield size={16} color="#4f46e5" />
                  <span>Two-Factor Authentication (2FA)</span>
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0' }}>
                  Secure your account using TOTP authenticator apps.
                </p>
              </div>
              <span
                {...stylex.props(
                  currentUser.totp_enabled
                    ? styles.statusBadgeActive
                    : styles.statusBadgeInactive
                )}
              >
                {currentUser.totp_enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            {!currentUser.totp_enabled ? (
              <div {...stylex.props(styles.totpBox)}>
                <div style={{ fontSize: '0.75rem', color: '#1e1b4b', fontWeight: 500 }}>
                  Scan QR with Google Authenticator / 1Password or enter secret key:
                  <div {...stylex.props(styles.secretKey)}>
                    JBSWY3DPEHPK3PXP
                  </div>
                </div>

                <div {...stylex.props(styles.totpRow)}>
                  <input
                    type="text"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    {...stylex.props(styles.totpInput)}
                  />
                  <button
                    onClick={handleToggle2FA}
                    {...stylex.props(styles.saveBtn)}
                  >
                    Enable 2FA
                  </button>
                </div>
                {totpError && <p style={{ fontSize: '0.75rem', color: '#e11d48', margin: 0, fontWeight: 500 }}>{totpError}</p>}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.75rem', color: '#475569' }}>
                  2FA is active on your account.
                </span>
                <button
                  onClick={handleToggle2FA}
                  style={{ padding: '4px 12px', fontSize: '0.75rem', fontWeight: 700, color: '#e11d48', backgroundColor: '#fff', border: '1px solid #fecdd3', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Disable 2FA
                </button>
              </div>
            )}

            {showRecoveryCodes && (
              <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#92400e' }}>
                  <AlertTriangle size={16} color="#d97706" />
                  <span>Save your emergency recovery codes:</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {recoveryCodes.map((c) => (
                    <code key={c} style={{ backgroundColor: '#fff', padding: '4px', borderRadius: '4px', border: '1px solid #fde68a', textAlign: 'center' }}>
                      {c}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Data Export & Account Deletion */}
          <div {...stylex.props(styles.section)}>
            <div {...stylex.props(styles.rowBetween)}>
              <div>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0f172a', margin: 0 }}>
                  Download Account Data
                </h4>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0' }}>
                  Export all your personal profile, jobs, applications, and logs in JSON format.
                </p>
              </div>
              <button
                onClick={handleExportData}
                {...stylex.props(styles.actionSecondaryBtn)}
              >
                <Download size={14} />
                <span>Export JSON</span>
              </button>
            </div>

            <div {...stylex.props(styles.rowBetween)} style={{ paddingTop: '8px' }}>
              <div>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#be123c', margin: 0 }}>
                  Delete Account
                </h4>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0' }}>
                  Permanently delete this account and all linked records.
                </p>
              </div>
              <button
                onClick={handleDeleteAccount}
                {...stylex.props(styles.deleteBtn)}
              >
                <Trash2 size={14} />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
