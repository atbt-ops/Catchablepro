import * as stylex from '@stylexjs/stylex';

export const colors = stylex.defineVars({
  primary: '#4f46e5',
  primaryHover: '#4338ca',
  primaryActive: '#3730a3',
  primaryLight: '#eef2ff',
  primaryBorder: '#c7d2fe',

  background: '#f8fafc',
  surface: '#ffffff',
  surfaceSubtle: '#f1f5f9',
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',

  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  textInverse: '#ffffff',

  success: '#10b981',
  successLight: '#ecfdf5',
  successText: '#065f46',
  successBorder: '#a7f3d0',

  warning: '#f59e0b',
  warningLight: '#fffbeb',
  warningText: '#92400e',
  warningBorder: '#fde68a',

  danger: '#ef4444',
  dangerLight: '#fef2f2',
  dangerText: '#991b1b',
  dangerBorder: '#fecaca',

  purple: '#9333ea',
  purpleLight: '#faf5ff',
  purpleText: '#6b21a8',
  purpleBorder: '#e9d5ff',
});

export const spacing = stylex.defineVars({
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
});

export const radii = stylex.defineVars({
  sm: '6px',
  md: '10px',
  lg: '16px',
  xl: '24px',
  full: '9999px',
});

export const shadows = stylex.defineVars({
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
});
