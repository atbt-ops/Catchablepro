import React from 'react';
import * as stylex from '@stylexjs/stylex';
import { colors, radii, shadows, spacing } from '../theme/tokens.stylex';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';
import { ToastItem } from '../types';

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const styles = stylex.create({
  container: {
    position: 'fixed',
    bottom: 20,
    right: 20,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    maxWidth: 380,
    width: 'calc(100% - 40px)',
    pointerEvents: 'none',
  },
  toast: {
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: 'solid',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(8px)',
    boxShadow: shadows.xl,
    transition: 'all 0.2s ease-in-out',
  },
  success: {
    borderColor: colors.successBorder,
  },
  info: {
    borderColor: colors.primaryBorder,
  },
  warning: {
    borderColor: colors.warningBorder,
  },
  error: {
    borderColor: colors.dangerBorder,
  },
  iconWrapper: {
    paddingTop: 2,
    flexShrink: 0,
  },
  body: {
    flexGrow: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 13,
    fontWeight: 700,
    color: colors.text,
    lineHeight: 1.2,
    margin: 0,
  },
  message: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 1.3,
    margin: 0,
  },
  dismissBtn: {
    padding: 4,
    borderRadius: radii.sm,
    color: colors.textMuted,
    backgroundColor: 'transparent',
    borderWidth: 0,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ':hover': {
      backgroundColor: colors.surfaceSubtle,
      color: colors.text,
    },
  },
});

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  const ICONS = {
    success: <CheckCircle2 size={18} color="#10b981" />,
    info: <Info size={18} color="#4f46e5" />,
    warning: <AlertCircle size={18} color="#f59e0b" />,
    error: <XCircle size={18} color="#ef4444" />,
  };

  return (
    <div {...stylex.props(styles.container)}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          {...stylex.props(styles.toast, styles[toast.type])}
        >
          <div {...stylex.props(styles.iconWrapper)}>{ICONS[toast.type]}</div>
          <div {...stylex.props(styles.body)}>
            <h4 {...stylex.props(styles.title)}>{toast.title}</h4>
            {toast.message && <p {...stylex.props(styles.message)}>{toast.message}</p>}
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            {...stylex.props(styles.dismissBtn)}
            title="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
