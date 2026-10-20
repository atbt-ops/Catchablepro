import React, { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useApp } from '../context/AppContext';
import { Mail, CheckCircle, AlertTriangle } from 'lucide-react';
import { colors, spacing, radii } from '../theme/tokens.stylex';

const styles = stylex.create({
  banner: {
    backgroundColor: colors.warningLight,
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: colors.warningBorder,
    color: colors.warningText,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    paddingTop: '10px',
    paddingBottom: '10px',
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
  },
  container: {
    maxWidth: '1280px',
    marginLeft: 'auto',
    marginRight: 'auto',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  leftGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  alertIcon: {
    width: '16px',
    height: '16px',
    color: colors.warning,
    flexShrink: 0,
  },
  code: {
    backgroundColor: '#fef3c7',
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '6px',
    paddingRight: '6px',
    borderRadius: radii.sm,
    fontFamily: 'monospace',
    fontSize: '0.75rem',
  },
  rightGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  successBadge: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: colors.successText,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  badgeIcon: {
    width: '14px',
    height: '14px',
  },
  resendBtn: {
    paddingTop: '4px',
    paddingBottom: '4px',
    paddingLeft: '10px',
    paddingRight: '10px',
    fontSize: '0.75rem',
    fontWeight: 500,
    color: colors.warningText,
    backgroundColor: {
      default: '#fef3c7',
      ':hover': '#fde68a',
    },
    borderRadius: radii.sm,
    borderWidth: 0,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  verifyBtn: {
    paddingTop: '4px',
    paddingBottom: '4px',
    paddingLeft: '12px',
    paddingRight: '12px',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: colors.textInverse,
    backgroundColor: {
      default: colors.primary,
      ':hover': colors.primaryHover,
    },
    borderRadius: radii.sm,
    borderWidth: 0,
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
});

export const EmailVerifyBanner: React.FC = () => {
  const { currentUser, verifyEmail } = useApp();
  const [sentNotice, setSentNotice] = useState(false);

  if (!currentUser || currentUser.email_verified) {
    return null;
  }

  const handleSimulateVerify = () => {
    verifyEmail(currentUser.id);
  };

  const handleResend = () => {
    setSentNotice(true);
    setTimeout(() => setSentNotice(false), 4000);
  };

  return (
    <div {...stylex.props(styles.banner)}>
      <div {...stylex.props(styles.container)}>
        <div {...stylex.props(styles.leftGroup)}>
          <AlertTriangle {...stylex.props(styles.alertIcon)} />
          <span>
            <strong>Confirm your email address:</strong> We sent a verification link to{' '}
            <code {...stylex.props(styles.code)}>{currentUser.email}</code>.
            {currentUser.role === 'employer'
              ? ' Publishing active jobs and contacting candidates remain locked until confirmed.'
              : ' Auto-Apply and job applications remain locked until confirmed.'}
          </span>
        </div>
        <div {...stylex.props(styles.rightGroup)}>
          {sentNotice && (
            <span {...stylex.props(styles.successBadge)}>
              <CheckCircle {...stylex.props(styles.badgeIcon)} /> Link resent!
            </span>
          )}
          <button
            onClick={handleResend}
            {...stylex.props(styles.resendBtn)}
          >
            Resend Email
          </button>
          <button
            onClick={handleSimulateVerify}
            {...stylex.props(styles.verifyBtn)}
          >
            <Mail {...stylex.props(styles.badgeIcon)} />
            <span>Verify Now (1-Click)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
