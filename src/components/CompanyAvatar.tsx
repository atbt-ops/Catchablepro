import React from 'react';
import * as stylex from '@stylexjs/stylex';
import { radii, shadows } from '../theme/tokens.stylex';

interface CompanyAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showVerified?: boolean;
}

const GRADIENT_BACKGROUNDS = [
  'linear-gradient(135deg, #6366f1, #9333ea)',
  'linear-gradient(135deg, #2563eb, #06b6d4)',
  'linear-gradient(135deg, #7c3aed, #c026d3)',
  'linear-gradient(135deg, #10b981, #0f766e)',
  'linear-gradient(135deg, #f43f5e, #db2777)',
  'linear-gradient(135deg, #f59e0b, #ea580c)',
  'linear-gradient(135deg, #0d9488, #059669)',
  'linear-gradient(135deg, #9333ea, #4338ca)',
];

const styles = stylex.create({
  container: {
    position: 'relative',
    display: 'inline-flex',
    flexShrink: 0,
  },
  baseAvatar: {
    color: '#ffffff',
    fontWeight: 900,
    letterSpacing: '0.05em',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: shadows.sm,
    userSelect: 'none',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  sm: {
    width: 32,
    height: 32,
    fontSize: 12,
    borderRadius: radii.sm,
  },
  md: {
    width: 44,
    height: 44,
    fontSize: 14,
    borderRadius: radii.md,
  },
  lg: {
    width: 56,
    height: 56,
    fontSize: 18,
    borderRadius: radii.lg,
  },
  xl: {
    width: 64,
    height: 64,
    fontSize: 20,
    borderRadius: radii.xl,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 16,
    height: 16,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: '#ffffff',
    borderRadius: radii.full,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 9,
    color: '#ffffff',
    fontWeight: 900,
    boxShadow: shadows.sm,
  },
});

export const CompanyAvatar: React.FC<CompanyAvatarProps> = ({
  name,
  size = 'md',
  showVerified = false,
}) => {
  const cleanName = (name || 'Company').trim();

  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = (hash << 5) - hash + cleanName.charCodeAt(i);
    hash |= 0;
  }
  const bgGradient = GRADIENT_BACKGROUNDS[Math.abs(hash) % GRADIENT_BACKGROUNDS.length];

  const parts = cleanName.split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : cleanName.slice(0, 2).toUpperCase();

  return (
    <div {...stylex.props(styles.container)}>
      <div
        {...stylex.props(styles.baseAvatar, styles[size])}
        style={{ backgroundImage: bgGradient }}
      >
        <span>{initials}</span>
      </div>
      {showVerified && (
        <span
          {...stylex.props(styles.verifiedBadge)}
          title="Verified Employer"
        >
          ✓
        </span>
      )}
    </div>
  );
};
