import React, { useState } from 'react';
import { User, UserSettingsPreferences } from '../../types/tournament';
import { appStore } from '../../services/store';

interface SecurityPrivacyScreenProps {
  user: User;
  onBack: () => void;
  onOpenAccount: () => void;
  onOpenLegal: () => void;
  onToast: (msg: string) => void;
  onAccountDeleted: () => void;
}

export const SecurityPrivacyScreen: React.FC<SecurityPrivacyScreenProps> = ({
  user,
  onBack,
  onOpenAccount,
  onOpenLegal,
  onToast,
  onAccountDeleted,
}) => {
  const currentPrivacy = user.preferences?.privacy || {
    profile_visibility: 'public',
    show_match_history: true,
    show_stats_leaderboard: true,
    allow_direct_challenges: true,
  };

  const [visibility, setVisibility] = useState<UserSettingsPreferences['privacy']['profile_visibility']>(
    currentPrivacy.profile_visibility
  );
  const [showMatchHistory, setShowMatchHistory] = useState(currentPrivacy.show_match_history);
  const [showStatsLeaderboard, setShowStatsLeaderboard] = useState(currentPrivacy.show_stats_leaderboard);
  const [allowChallenges, setAllowChallenges] = useState(currentPrivacy.allow_direct_challenges);

  // Password Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');

  // Delete Account Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleteReauthPassword, setDeleteReauthPassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const handleSavePrivacy = (updates: Partial<UserSettingsPreferences['privacy']>) => {
    const newPrivacy = {
      profile_visibility: visibility,
      show_match_history: showMatchHistory,
      show_stats_leaderboard: showStatsLeaderboard,
      allow_direct_challenges: allowChallenges,
      ...updates,
    };

    if (updates.profile_visibility !== undefined) setVisibility(updates.profile_visibility);
    if (updates.show_match_history !== undefined) setShowMatchHistory(updates.show_match_history);
    if (updates.show_stats_leaderboard !== undefined) setShowStatsLeaderboard(updates.show_stats_leaderboard);
    if (updates.allow_direct_challenges !== undefined) setAllowChallenges(updates.allow_direct_challenges);

    appStore.updatePrivacySettings(user.id, newPrivacy);
    onToast('Privacy settings updated');
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    if (!currentPass) {
      setPassError('Please enter your current password');
      return;
    }
    if (newPass.length < 6) {
      setPassError('New password must be at least 6 characters');
      return;
    }
    if (newPass !== confirmPass) {
      setPassError('New passwords do not match');
      return;
    }

    const res = appStore.changePassword(user.id, currentPass, newPass);
    if (res.success) {
      setShowPasswordModal(false);
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      onToast(res.message);
    } else {
      setPassError(res.message);
    }
  };

  const handleExportData = () => {
    const rawJson = appStore.exportUserData(user.id);
    const blob = new Blob([rawJson], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clutch-arena-user-data-${user.username}.json`;
    link.click();
    URL.revokeObjectURL(url);
    onToast('Your complete account data bundle was downloaded successfully!');
  };

  const handleDeleteAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');
    if (deleteConfirmationText !== 'DELETE MY ACCOUNT') {
      setDeleteError('Please type "DELETE MY ACCOUNT" exactly as shown to confirm.');
      return;
    }
    if (!deleteReauthPassword) {
      setDeleteError('Please enter your password to re-authenticate.');
      return;
    }

    const res = appStore.deleteAccount(user.id);
    if (res.success) {
      setShowDeleteModal(false);
      onToast(res.message);
      onAccountDeleted();
    } else {
      setDeleteError(res.message);
    }
  };

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-200">
      
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 py-1 transition"
        >
          <i className="fa-solid fa-arrow-left text-xs"></i>
          <span>Settings</span>
        </button>
        <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
          Security & Privacy
        </span>
      </div>

      {/* Screen Title */}
      <div>
        <h2 className="text-base font-black text-white flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center text-xs">
            <i className="fa-solid fa-user-shield"></i>
          </span>
          Security & Privacy Controls
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Account credentials, privacy visibility, data export, and session protection.
        </p>
      </div>

      {/* Security Health Status Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-purple-950/40 border border-purple-500/30 rounded-2xl p-4 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center text-lg">
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Security Score: High</span>
              <i className="fa-solid fa-circle-check text-emerald-400 text-[11px]"></i>
            </div>
            <div className="text-[10px] text-slate-400">
              Verified email &bull; Active session protection enabled
            </div>
          </div>
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
          Secure
        </span>
      </div>

      {/* 1. Account Credentials & Password */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        <h3 className="text-xs font-bold text-white border-b border-slate-800 pb-2 flex items-center gap-1.5">
          <i className="fa-solid fa-lock text-purple-400"></i> Password & Authentication
        </h3>

        <div className="flex items-center justify-between py-1">
          <div>
            <span className="text-xs font-semibold text-white block">Password Protection</span>
            <span className="text-[10px] text-slate-400">Last updated recently &bull; Encrypted</span>
          </div>
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl transition"
          >
            Change Password
          </button>
        </div>

        <div className="flex items-center justify-between py-2 border-t border-slate-800/80">
          <div>
            <span className="text-xs font-semibold text-white block">Active Devices & Sessions</span>
            <span className="text-[10px] text-slate-400">
              {user.active_sessions?.length || 1} devices logged into your account
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenAccount}
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1"
          >
            <span>Manage</span>
            <i className="fa-solid fa-arrow-right text-[10px]"></i>
          </button>
        </div>
      </div>

      {/* 2. Profile Visibility & Gaming Privacy */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        <h3 className="text-xs font-bold text-white border-b border-slate-800 pb-2 flex items-center gap-1.5">
          <i className="fa-solid fa-eye text-cyan-400"></i> Profile Visibility & Presence
        </h3>

        {/* Profile Visibility Radios */}
        <div>
          <label className="block text-[11px] font-medium text-slate-300 mb-2">
            Who can see your esports profile and stats?
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'public', label: 'Public', icon: 'fa-globe' },
              { id: 'friends', label: 'Friends', icon: 'fa-user-group' },
              { id: 'private', label: 'Private', icon: 'fa-lock' },
            ].map(v => (
              <button
                key={v.id}
                type="button"
                onClick={() => handleSavePrivacy({ profile_visibility: v.id as any })}
                className={`py-2 px-1.5 rounded-xl border text-center transition ${
                  visibility === v.id
                    ? 'bg-purple-950/70 border-purple-500 text-white font-bold shadow-sm ring-1 ring-purple-400/40'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <i className={`fa-solid ${v.icon} block text-xs mb-1`}></i>
                <span className="text-[11px]">{v.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Granular Privacy Toggles */}
        <div className="space-y-3 pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-white block">
                Show Tournament History
              </span>
              <span className="text-[10px] text-slate-400 block">
                Display participated scrims on your public profile
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleSavePrivacy({ show_match_history: !showMatchHistory })}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${
                showMatchHistory ? 'bg-cyan-500' : 'bg-slate-800'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                  showMatchHistory ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-white block">
                Leaderboard Rankings
              </span>
              <span className="text-[10px] text-slate-400 block">
                Display your gamer tag and win points on leaderboards
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleSavePrivacy({ show_stats_leaderboard: !showStatsLeaderboard })}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${
                showStatsLeaderboard ? 'bg-cyan-500' : 'bg-slate-800'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                  showStatsLeaderboard ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-white block">
                Direct Scrim Invites
              </span>
              <span className="text-[10px] text-slate-400 block">
                Allow other verified players to challenge your squad
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleSavePrivacy({ allow_direct_challenges: !allowChallenges })}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${
                allowChallenges ? 'bg-cyan-500' : 'bg-slate-800'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                  allowChallenges ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Data Rights & Export */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        <h3 className="text-xs font-bold text-white border-b border-slate-800 pb-2 flex items-center gap-1.5">
          <i className="fa-solid fa-file-export text-emerald-400"></i> Your Data & Privacy Rights
        </h3>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          In compliance with digital privacy guidelines, you can export a full copy of your player profile, match history, and genuine transaction ledgers at any time.
        </p>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleExportData}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            <i className="fa-solid fa-download text-cyan-400"></i>
            <span>Download My Data (JSON)</span>
          </button>

          <button
            type="button"
            onClick={onOpenLegal}
            className="text-xs font-semibold text-slate-400 hover:text-white px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 transition"
          >
            Privacy Policy
          </button>
        </div>
      </div>

      {/* 4. Danger Zone: Delete Account */}
      <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span>Danger Zone</span>
        </div>

        <div>
          <span className="text-xs font-semibold text-white block">Delete Clutch Arena Account</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Permanently purges your gamer profile, UID, tournament records, and notifications. This action cannot be undone.
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            setDeleteConfirmationText('');
            setDeleteReauthPassword('');
            setDeleteError('');
            setShowDeleteModal(true);
          }}
          className="w-full bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
        >
          <i className="fa-solid fa-trash-can"></i>
          <span>Request Permanent Account Deletion</span>
        </button>
      </div>

      {/* MODAL: CHANGE PASSWORD */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-purple-500/40 w-full max-w-sm rounded-2xl p-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-lock text-purple-400"></i> Secure Password Change
              </h3>
              <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-white p-1">
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>

            {passError && (
              <div className="bg-rose-950/80 border border-rose-500/50 text-rose-300 p-2.5 rounded-xl text-xs mb-3 flex items-center gap-1.5">
                <i className="fa-solid fa-circle-exclamation text-rose-400"></i>
                <span>{passError}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPass}
                  onChange={e => setCurrentPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 bg-slate-800 text-slate-300 font-semibold py-2 rounded-xl text-xs border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded-xl text-xs shadow-md shadow-purple-600/30"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE ACCOUNT CONFIRMATION */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-rose-500/50 w-full max-w-sm rounded-2xl p-5 shadow-2xl relative space-y-3">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-2 text-xl">
                <i className="fa-solid fa-triangle-exclamation"></i>
              </div>
              <h3 className="text-sm font-bold text-white">Permanently Delete Account?</h3>
              <p className="text-[11px] text-slate-400 mt-1">
                This will immediately erase your profile, Free Fire UID, match history, and records. This action cannot be reversed.
              </p>
            </div>

            {deleteError && (
              <div className="bg-rose-950/80 border border-rose-500/50 text-rose-300 p-2.5 rounded-xl text-xs flex items-center gap-1.5">
                <i className="fa-solid fa-circle-exclamation text-rose-400"></i>
                <span>{deleteError}</span>
              </div>
            )}

            <form onSubmit={handleDeleteAccount} className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">
                  Type <strong className="text-rose-400 font-mono">DELETE MY ACCOUNT</strong> to confirm:
                </label>
                <input
                  type="text"
                  required
                  value={deleteConfirmationText}
                  onChange={e => setDeleteConfirmationText(e.target.value)}
                  placeholder="DELETE MY ACCOUNT"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 mb-1">
                  Confirm Account Password:
                </label>
                <input
                  type="password"
                  required
                  value={deleteReauthPassword}
                  onChange={e => setDeleteReauthPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 bg-slate-800 text-slate-300 font-semibold py-2 rounded-xl text-xs border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 rounded-xl text-xs shadow-lg shadow-rose-600/30"
                >
                  Permanently Delete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
