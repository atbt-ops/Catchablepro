import React, { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useApp } from '../context/AppContext';
import {
  Shield,
  Users,
  Briefcase,
  MessageSquare,
  Sparkles,
  Search,
  CheckCircle2,
  History,
  Star,
} from 'lucide-react';
import { colors, spacing, radii, shadows } from '../theme/tokens.stylex';

const styles = stylex.create({
  container: {
    maxWidth: '1280px',
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
  },
  banner: {
    backgroundColor: '#0f172a',
    backgroundImage: 'linear-gradient(135deg, #0f172a, #1e1b4b)',
    borderRadius: radii.xl,
    padding: spacing.xl,
    color: colors.textInverse,
    boxShadow: shadows.lg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
  },
  bannerIcon: {
    width: '48px',
    height: '48px',
    borderRadius: radii.lg,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    color: '#a5b4fc',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'rgba(165, 180, 252, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    letterSpacing: '-0.025em',
    color: colors.textInverse,
    margin: 0,
  },
  bannerSub: {
    fontSize: '0.75rem',
    color: colors.textMuted,
    margin: '4px 0 0',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: spacing.md,
  },
  statCard: {
    padding: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    boxShadow: shadows.sm,
  },
  statLabel: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    display: 'block',
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: 900,
    color: colors.text,
    display: 'block',
    marginTop: '4px',
  },
  statSub: {
    fontSize: '0.6875rem',
    color: colors.textSecondary,
    marginTop: '2px',
    display: 'block',
  },
  tabNav: {
    display: 'flex',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: colors.border,
    gap: spacing.lg,
    fontSize: '0.875rem',
    fontWeight: 600,
    overflowX: 'auto',
  },
  tabItem: {
    paddingBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    cursor: 'pointer',
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderBottomWidth: '2px',
    borderBottomStyle: 'solid',
    transition: 'all 0.15s ease',
  },
  tabItemActive: {
    borderBottomColor: colors.primary,
    color: colors.primary,
  },
  tabItemInactive: {
    borderBottomColor: 'transparent',
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.border,
    overflow: 'hidden',
    boxShadow: shadows.sm,
    padding: spacing.lg,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardTitle: {
    fontWeight: 700,
    color: colors.text,
    fontSize: '1rem',
    margin: 0,
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    padding: '6px 12px',
    fontSize: '0.75rem',
    maxWidth: '300px',
    width: '100%',
  },
  searchInput: {
    backgroundColor: 'transparent',
    outline: 'none',
    borderWidth: 0,
    width: '100%',
    fontFamily: 'inherit',
    fontSize: '0.75rem',
  },
  table: {
    width: '100%',
    textAlign: 'left',
    fontSize: '0.75rem',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '12px',
    backgroundColor: colors.surfaceSubtle,
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: colors.border,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: 700,
    fontSize: '10px',
  },
  td: {
    padding: '12px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: colors.surfaceSubtle,
  },
  digestBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.xl,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.primaryBorder,
    padding: spacing.lg,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  digestPre: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.primaryBorder,
    fontSize: '0.75rem',
    fontFamily: 'monospace',
    color: colors.text,
    whiteSpace: 'pre-wrap',
    lineHeight: 1.6,
  },
  digestBtn: {
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
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: shadows.sm,
  },
});

export const AdminPortal: React.FC = () => {
  const {
    users,
    jobs,
    applications,
    feedbacks,
    auditLogs,
    aiDigests,
    toggleUserSuspension,
    deleteJobAdmin,
    updateFeedbackStatus,
    generateFeedbackDigest,
  } = useApp();

  const [activeAdminTab, setActiveAdminTab] = useState<'users' | 'jobs' | 'feedback' | 'audit'>('users');
  const [userSearch, setUserSearch] = useState('');
  const [isGeneratingDigest, setIsGeneratingDigest] = useState(false);
  const [digestGeneratedNotice, setDigestGeneratedNotice] = useState(false);

  const activeJobs = jobs.filter((j) => j.status === 'active');
  const filteredUsers = users.filter((u) =>
    (u.name + ' ' + u.email + ' ' + u.role).toLowerCase().includes(userSearch.toLowerCase())
  );

  const handleGenerateDigest = () => {
    setIsGeneratingDigest(true);
    setTimeout(() => {
      generateFeedbackDigest();
      setIsGeneratingDigest(false);
      setDigestGeneratedNotice(true);
      setTimeout(() => setDigestGeneratedNotice(false), 3000);
    }, 1000);
  };

  return (
    <div {...stylex.props(styles.container)}>
      {/* Top Banner */}
      <div {...stylex.props(styles.banner)}>
        <div {...stylex.props(styles.bannerLeft)}>
          <div {...stylex.props(styles.bannerIcon)}>
            <Shield size={24} />
          </div>
          <div>
            <h1 {...stylex.props(styles.bannerTitle)}>Platform Administration</h1>
            <p {...stylex.props(styles.bannerSub)}>
              Moderation, security audit trails, and feedback insights.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div {...stylex.props(styles.statsGrid)}>
        <div {...stylex.props(styles.statCard)}>
          <span {...stylex.props(styles.statLabel)}>Total Users</span>
          <span {...stylex.props(styles.statValue)}>{users.length}</span>
          <span {...stylex.props(styles.statSub)}>
            {users.filter((u) => u.role === 'employer').length} employers, {users.filter((u) => u.role === 'candidate').length} candidates
          </span>
        </div>

        <div {...stylex.props(styles.statCard)}>
          <span {...stylex.props(styles.statLabel)}>Active Jobs</span>
          <span {...stylex.props(styles.statValue)}>{activeJobs.length}</span>
          <span {...stylex.props(styles.statSub)} style={{ color: '#059669' }}>On-demand meters running</span>
        </div>

        <div {...stylex.props(styles.statCard)}>
          <span {...stylex.props(styles.statLabel)}>Applications</span>
          <span {...stylex.props(styles.statValue)}>{applications.length}</span>
          <span {...stylex.props(styles.statSub)} style={{ color: '#4f46e5' }}>Through platform match</span>
        </div>

        <div {...stylex.props(styles.statCard)}>
          <span {...stylex.props(styles.statLabel)}>Feedback Items</span>
          <span {...stylex.props(styles.statValue)}>{feedbacks.length}</span>
          <span {...stylex.props(styles.statSub)}>
            {feedbacks.filter((f) => f.status === 'new').length} new
          </span>
        </div>
      </div>

      {/* Admin Tabs */}
      <div {...stylex.props(styles.tabNav)}>
        <button
          onClick={() => setActiveAdminTab('users')}
          {...stylex.props(styles.tabItem, activeAdminTab === 'users' ? styles.tabItemActive : styles.tabItemInactive)}
        >
          <Users size={16} />
          <span>User Management</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('jobs')}
          {...stylex.props(styles.tabItem, activeAdminTab === 'jobs' ? styles.tabItemActive : styles.tabItemInactive)}
        >
          <Briefcase size={16} />
          <span>Job Moderation</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('feedback')}
          {...stylex.props(styles.tabItem, activeAdminTab === 'feedback' ? styles.tabItemActive : styles.tabItemInactive)}
        >
          <MessageSquare size={16} />
          <span>Feedback &amp; AI Digest</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('audit')}
          {...stylex.props(styles.tabItem, activeAdminTab === 'audit' ? styles.tabItemActive : styles.tabItemInactive)}
        >
          <History size={16} />
          <span>Security Audit Trail</span>
        </button>
      </div>

      {/* USERS TAB */}
      {activeAdminTab === 'users' && (
        <div {...stylex.props(styles.card)}>
          <div {...stylex.props(styles.cardHeader)}>
            <h3 {...stylex.props(styles.cardTitle)}>Registered Accounts</h3>
            <div {...stylex.props(styles.searchBar)}>
              <Search size={16} color="#94a3b8" style={{ marginRight: '8px', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search user by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                {...stylex.props(styles.searchInput)}
              />
            </div>
          </div>

          <table {...stylex.props(styles.table)}>
            <thead>
              <tr>
                <th {...stylex.props(styles.th)}>User</th>
                <th {...stylex.props(styles.th)}>Role</th>
                <th {...stylex.props(styles.th)}>Email Status</th>
                <th {...stylex.props(styles.th)}>Moderation</th>
                <th {...stylex.props(styles.th)} style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td {...stylex.props(styles.td)}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{u.name || 'Anonymous'}</div>
                    <div style={{ color: '#64748b', fontSize: '11px' }}>{u.email}</div>
                  </td>
                  <td {...stylex.props(styles.td)}>
                    <span style={{ textTransform: 'capitalize', fontWeight: 600, color: '#334155', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                      {u.role}
                    </span>
                    {u.is_admin && (
                      <span style={{ marginLeft: '4px', fontSize: '10px', fontWeight: 700, backgroundColor: '#f3e8ff', color: '#6b21a8', padding: '2px 6px', borderRadius: '4px' }}>
                        Admin
                      </span>
                    )}
                  </td>
                  <td {...stylex.props(styles.td)}>
                    {u.email_verified ? (
                      <span style={{ color: '#065f46', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={14} color="#059669" /> Verified
                      </span>
                    ) : (
                      <span style={{ color: '#d97706', fontWeight: 600 }}>Unverified</span>
                    )}
                  </td>
                  <td {...stylex.props(styles.td)}>
                    {u.is_suspended ? (
                      <span style={{ color: '#9f1239', fontWeight: 600, backgroundColor: '#fff1f2', padding: '2px 8px', borderRadius: '4px', border: '1px solid #fecdd3' }}>
                        Suspended ({u.suspended_reason || 'Policy'})
                      </span>
                    ) : (
                      <span style={{ color: '#475569' }}>Active</span>
                    )}
                  </td>
                  <td {...stylex.props(styles.td)} style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => toggleUserSuspension(u.id)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        backgroundColor: u.is_suspended ? '#ecfdf5' : '#fff1f2',
                        color: u.is_suspended ? '#065f46' : '#9f1239',
                        border: `1px solid ${u.is_suspended ? '#a7f3d0' : '#fecdd3'}`,
                      }}
                    >
                      {u.is_suspended ? 'Reactivate' : 'Suspend Account'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* JOBS TAB */}
      {activeAdminTab === 'jobs' && (
        <div {...stylex.props(styles.card)}>
          <h3 {...stylex.props(styles.cardTitle)}>All Posted Roles</h3>
          <table {...stylex.props(styles.table)}>
            <thead>
              <tr>
                <th {...stylex.props(styles.th)}>Title &amp; Company</th>
                <th {...stylex.props(styles.th)}>Location</th>
                <th {...stylex.props(styles.th)}>Status</th>
                <th {...stylex.props(styles.th)}>Skills</th>
                <th {...stylex.props(styles.th)} style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td {...stylex.props(styles.td)}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{j.title}</div>
                    <div style={{ color: '#64748b', fontSize: '11px' }}>{j.companyName}</div>
                  </td>
                  <td {...stylex.props(styles.td)} style={{ color: '#475569' }}>{j.location}</td>
                  <td {...stylex.props(styles.td)}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      fontSize: '10px',
                      backgroundColor: j.status === 'active' ? '#ecfdf5' : '#f1f5f9',
                      color: j.status === 'active' ? '#065f46' : '#475569',
                    }}>
                      {j.status}
                    </span>
                  </td>
                  <td {...stylex.props(styles.td)} style={{ fontFamily: 'monospace', fontSize: '11px', color: '#475569', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {j.requiredSkills}
                  </td>
                  <td {...stylex.props(styles.td)} style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => deleteJobAdmin(j.id)}
                      style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700, color: '#e11d48', backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* FEEDBACK & AI DIGEST TAB */}
      {activeAdminTab === 'feedback' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>User Feedback &amp; AI Analysis</h3>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0' }}>
                Clusters user submissions into actionable thematic digests.
              </p>
            </div>

            <button
              onClick={handleGenerateDigest}
              disabled={isGeneratingDigest}
              {...stylex.props(styles.digestBtn)}
            >
              <Sparkles size={14} />
              <span>{isGeneratingDigest ? 'Generating AI Digest...' : 'Generate AI Digest'}</span>
            </button>
          </div>

          {digestGeneratedNotice && (
            <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#ecfdf5', color: '#065f46', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #a7f3d0' }}>
              <CheckCircle2 size={16} color="#059669" />
              AI feedback digest generated successfully!
            </div>
          )}

          {/* AI Digests Cards */}
          {aiDigests.length > 0 && (
            <div {...stylex.props(styles.digestBox)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#4f46e5" />
                <h4 style={{ fontWeight: 700, color: '#1e1b4b', fontSize: '0.875rem', margin: 0 }}>Latest AI Digest</h4>
              </div>
              <pre {...stylex.props(styles.digestPre)}>
                {aiDigests[0].content}
              </pre>
            </div>
          )}

          {/* Feedback Items Table */}
          <div {...stylex.props(styles.card)}>
            <h4 {...stylex.props(styles.cardTitle)}>Feedback Submissions</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {feedbacks.map((f) => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#334155' }}>
                        {f.category}
                      </span>
                      {f.rating && (
                        <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>
                          {f.rating} <Star size={12} fill="currentColor" style={{ marginLeft: '2px' }} />
                        </span>
                      )}
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>from {f.email}</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#1e293b', margin: 0 }}>{f.message}</p>
                  </div>

                  <div>
                    <select
                      value={f.status}
                      onChange={(e) => updateFeedbackStatus(f.id, e.target.value as any)}
                      style={{ fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#f1f5f9', borderRadius: '6px', padding: '4px 8px', border: 0, outline: 'none' }}
                    >
                      <option value="new">New</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="actioned">Actioned</option>
                      <option value="dismissed">Dismissed</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AUDIT LOG TAB */}
      {activeAdminTab === 'audit' && (
        <div {...stylex.props(styles.card)}>
          <h3 {...stylex.props(styles.cardTitle)}>Security &amp; Audit Event Log</h3>
          <table {...stylex.props(styles.table)}>
            <thead>
              <tr>
                <th {...stylex.props(styles.th)}>Action</th>
                <th {...stylex.props(styles.th)}>Actor</th>
                <th {...stylex.props(styles.th)}>Target</th>
                <th {...stylex.props(styles.th)}>Detail</th>
                <th {...stylex.props(styles.th)}>Time</th>
              </tr>
            </thead>
            <tbody style={{ fontFamily: 'monospace', fontSize: '11px' }}>
              {auditLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td {...stylex.props(styles.td)} style={{ fontWeight: 700, color: '#4f46e5' }}>{log.action}</td>
                  <td {...stylex.props(styles.td)} style={{ color: '#334155' }}>{log.actorEmail}</td>
                  <td {...stylex.props(styles.td)} style={{ color: '#475569' }}>
                    {log.targetType}:{log.targetLabel || log.targetId || ''}
                  </td>
                  <td {...stylex.props(styles.td)} style={{ color: '#64748b', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.detail}
                  </td>
                  <td {...stylex.props(styles.td)} style={{ color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
