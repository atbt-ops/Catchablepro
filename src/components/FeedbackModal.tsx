import React, { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useApp } from '../context/AppContext';
import { FeedbackCategory } from '../types';
import { X, MessageSquare, Star, CheckCircle2 } from 'lucide-react';
import { colors, spacing, radii, shadows } from '../theme/tokens.stylex';

const styles = stylex.create({
  overlay: {
    position: 'fixed',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
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
    maxWidth: '440px',
    width: '100%',
    padding: spacing.lg,
    boxShadow: shadows.xl,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: colors.text,
    margin: 0,
  },
  closeBtn: {
    padding: '6px',
    color: colors.textMuted,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: radii.sm,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submittedBox: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  thankTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: colors.text,
    margin: 0,
  },
  thankSub: {
    fontSize: '0.75rem',
    color: colors.textSecondary,
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  label: {
    display: 'block',
    fontSize: '0.6875rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: colors.textSecondary,
    marginBottom: '6px',
  },
  catGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '6px',
  },
  catBtn: {
    paddingTop: '6px',
    paddingBottom: '6px',
    borderRadius: radii.md,
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'capitalize',
    borderWidth: '1px',
    borderStyle: 'solid',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  catBtnActive: {
    backgroundColor: colors.primary,
    color: colors.textInverse,
    borderColor: colors.primary,
  },
  catBtnInactive: {
    backgroundColor: colors.surfaceSubtle,
    color: colors.textSecondary,
    borderColor: colors.border,
  },
  starRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  starBtn: {
    padding: '4px',
    background: 'none',
    borderWidth: 0,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textarea: {
    width: '100%',
    fontSize: '0.75rem',
    padding: '12px 14px',
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
});

interface FeedbackModalProps {
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ onClose }) => {
  const { submitFeedback } = useApp();
  const [category, setCategory] = useState<FeedbackCategory>('general');
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    submitFeedback(category, rating, message, window.location.pathname);
    setSubmitted(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div {...stylex.props(styles.overlay)}>
      <div {...stylex.props(styles.modal)}>
        <div {...stylex.props(styles.header)}>
          <div {...stylex.props(styles.headerTitleRow)}>
            <MessageSquare size={20} color="#4f46e5" />
            <h3 {...stylex.props(styles.title)}>Send Feedback</h3>
          </div>
          <button
            onClick={onClose}
            {...stylex.props(styles.closeBtn)}
          >
            <X size={20} />
          </button>
        </div>

        {submitted ? (
          <div {...stylex.props(styles.submittedBox)}>
            <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto' }} />
            <h4 {...stylex.props(styles.thankTitle)}>Thank you!</h4>
            <p {...stylex.props(styles.thankSub)}>
              Your feedback has been recorded and will be analyzed in our next AI Digest.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} {...stylex.props(styles.form)}>
            <div>
              <label {...stylex.props(styles.label)}>
                Category
              </label>
              <div {...stylex.props(styles.catGrid)}>
                {(['general', 'bug', 'feature', 'praise'] as FeedbackCategory[]).map((cat) => (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => setCategory(cat)}
                    {...stylex.props(
                      styles.catBtn,
                      category === cat ? styles.catBtnActive : styles.catBtnInactive
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label {...stylex.props(styles.label)}>
                Rating
              </label>
              <div {...stylex.props(styles.starRow)}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    {...stylex.props(styles.starBtn)}
                  >
                    <Star
                      size={24}
                      color={star <= rating ? '#f59e0b' : '#cbd5e1'}
                      fill={star <= rating ? '#f59e0b' : 'none'}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label {...stylex.props(styles.label)}>
                Your Thoughts
              </label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What did you like or what can we improve?"
                {...stylex.props(styles.textarea)}
                required
              />
            </div>

            <button
              type="submit"
              {...stylex.props(styles.submitBtn)}
            >
              Submit Feedback
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
