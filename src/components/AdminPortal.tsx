import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Shield,
  Users,
  Briefcase,
  FileCheck,
  MessageSquare,
  Sparkles,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  Star,
  RefreshCw,
} from 'lucide-react';

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Platform Administration</h1>
            <p className="text-xs text-slate-400">
              Moderation, security audit trails, and feedback insights.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Total Users
          </span>
          <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{users.length}</span>
          <span className="text-[11px] text-slate-500">
            {users.filter((u) => u.role === 'employer').length} employers, {users.filter((u) => u.role === 'candidate').length} candidates
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Active Jobs
          </span>
          <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{activeJobs.length}</span>
          <span className="text-[11px] text-emerald-600 font-medium">On-demand meters running</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Applications
          </span>
          <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{applications.length}</span>
          <span className="text-[11px] text-indigo-600 font-medium">Through platform match</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Feedback Items
          </span>
          <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{feedbacks.length}</span>
          <span className="text-[11px] text-slate-500">
            {feedbacks.filter((f) => f.status === 'new').length} new
          </span>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveAdminTab('users')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeAdminTab === 'users'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Management</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('jobs')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeAdminTab === 'jobs'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Job Moderation</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('feedback')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeAdminTab === 'feedback'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Feedback & AI Digest</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('audit')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeAdminTab === 'audit'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Security Audit Trail</span>
        </button>
      </div>

      {/* USERS TAB */}
      {activeAdminTab === 'users' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm space-y-4 p-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-bold text-slate-900 text-base">Registered Accounts</h3>
            <div className="flex items-center bg-slate-100 rounded-xl px-3 py-1.5 text-xs max-w-xs w-full">
              <Search className="w-4 h-4 text-slate-400 mr-2" />
              <input
                type="text"
                placeholder="Search user by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="bg-transparent focus:outline-none w-full"
              />
            </div>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px]">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Role</th>
                <th className="p-3">Email Status</th>
                <th className="p-3">Moderation</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50">
                  <td className="p-3">
                    <div className="font-bold text-slate-900">{u.name || 'Anonymous'}</div>
                    <div className="text-slate-500 text-[11px]">{u.email}</div>
                  </td>
                  <td className="p-3">
                    <span className="capitalize font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {u.role}
                    </span>
                    {u.is_admin && (
                      <span className="ml-1 text-[10px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                        Admin
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {u.email_verified ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                      </span>
                    ) : (
                      <span className="text-amber-600 font-semibold">Unverified</span>
                    )}
                  </td>
                  <td className="p-3">
                    {u.is_suspended ? (
                      <span className="text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        Suspended ({u.suspended_reason || 'Policy'})
                      </span>
                    ) : (
                      <span className="text-slate-600">Active</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => toggleUserSuspension(u.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                        u.is_suspended
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                      }`}
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
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-900 text-base">All Posted Roles</h3>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px]">
              <tr>
                <th className="p-3">Title & Company</th>
                <th className="p-3">Location</th>
                <th className="p-3">Status</th>
                <th className="p-3">Skills</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.map((j) => (
                <tr key={j.id} className="hover:bg-slate-50/50">
                  <td className="p-3">
                    <div className="font-bold text-slate-900">{j.title}</div>
                    <div className="text-slate-500 text-[11px]">{j.companyName}</div>
                  </td>
                  <td className="p-3 text-slate-600">{j.location}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                        j.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {j.status}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-[11px] text-slate-600 truncate max-w-xs">
                    {j.requiredSkills}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => deleteJobAdmin(j.id)}
                      className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">User Feedback & AI Analysis</h3>
              <p className="text-xs text-slate-500">
                Clusters user submissions into actionable thematic digests.
              </p>
            </div>

            <button
              onClick={handleGenerateDigest}
              disabled={isGeneratingDigest}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isGeneratingDigest ? 'Generating AI Digest...' : 'Generate AI Digest'}</span>
            </button>
          </div>

          {digestGeneratedNotice && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-2 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              AI feedback digest generated successfully!
            </div>
          )}

          {/* AI Digests Cards */}
          {aiDigests.length > 0 && (
            <div className="bg-indigo-50/60 rounded-3xl border border-indigo-200 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h4 className="font-bold text-indigo-950 text-sm">Latest AI Digest</h4>
              </div>
              <pre className="p-4 rounded-2xl bg-white border border-indigo-100 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed shadow-inner">
                {aiDigests[0].content}
              </pre>
            </div>
          )}

          {/* Feedback Items Table */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm p-6 space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">Feedback Submissions</h4>
            <div className="divide-y divide-slate-100">
              {feedbacks.map((f) => (
                <div key={f.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {f.category}
                      </span>
                      {f.rating && (
                        <span className="text-amber-500 font-bold text-xs flex items-center">
                          {f.rating} <Star className="w-3 h-3 fill-current inline ml-0.5" />
                        </span>
                      )}
                      <span className="text-xs text-slate-400">from {f.email}</span>
                    </div>
                    <p className="text-xs text-slate-800">{f.message}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={f.status}
                      onChange={(e) => updateFeedbackStatus(f.id, e.target.value as any)}
                      className="text-xs font-semibold bg-slate-100 rounded-lg px-2 py-1 border-none focus:outline-none"
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
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-900 text-base">Security & Audit Event Log</h3>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px]">
              <tr>
                <th className="p-3">Action</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Target</th>
                <th className="p-3">Detail</th>
                <th className="p-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50">
                  <td className="p-3 font-bold text-indigo-700">{log.action}</td>
                  <td className="p-3 text-slate-700">{log.actorEmail}</td>
                  <td className="p-3 text-slate-600">
                    {log.targetType}:{log.targetLabel || log.targetId || ''}
                  </td>
                  <td className="p-3 text-slate-500 max-w-xs truncate">{log.detail}</td>
                  <td className="p-3 text-slate-400 whitespace-nowrap">
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
