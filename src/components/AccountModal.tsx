import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  User,
  Shield,
  Key,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

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
      // Simulate verifying 6 digit code
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Account & Security</h2>
              <p className="text-xs text-slate-500">{currentUser.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Profile Details Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Personal Information</h3>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Designation / Role Title
                </label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              {savedNotice && (
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Profile updated!
                </span>
              )}
              <div className="ml-auto">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                >
                  Save Profile
                </button>
              </div>
            </div>
          </form>

          {/* Two-Factor Authentication (TOTP) */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  <span>Two-Factor Authentication (2FA)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Secure your account using TOTP authenticator apps.
                </p>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                  currentUser.totp_enabled
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {currentUser.totp_enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            {!currentUser.totp_enabled ? (
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-3">
                <div className="text-xs text-indigo-950 font-medium">
                  Scan QR with Google Authenticator / 1Password or enter secret key:
                  <div className="mt-1 font-mono font-bold bg-white p-2 rounded-lg border border-indigo-200 text-indigo-700 select-all">
                    JBSWY3DPEHPK3PXP
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-40 text-xs px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-center font-mono font-bold"
                  />
                  <button
                    onClick={handleToggle2FA}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                  >
                    Enable 2FA
                  </button>
                </div>
                {totpError && <p className="text-xs text-rose-600 font-medium">{totpError}</p>}
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-600">
                  2FA is active on your account.
                </span>
                <button
                  onClick={handleToggle2FA}
                  className="px-3 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200"
                >
                  Disable 2FA
                </button>
              </div>
            )}

            {showRecoveryCodes && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Save your emergency recovery codes:</span>
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs text-slate-800">
                  {recoveryCodes.map((c) => (
                    <code key={c} className="bg-white p-1 rounded border border-amber-200 text-center">
                      {c}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Data Export & Account Deletion */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Download Account Data
                </h4>
                <p className="text-xs text-slate-500">
                  Export all your personal profile, jobs, applications, and logs in JSON format.
                </p>
              </div>
              <button
                onClick={handleExportData}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <h4 className="font-bold text-rose-700 text-xs uppercase tracking-wider">
                  Delete Account
                </h4>
                <p className="text-xs text-slate-500">
                  Permanently delete this account and all linked records.
                </p>
              </div>
              <button
                onClick={handleDeleteAccount}
                className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
