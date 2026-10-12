import React, { useState } from 'react';
import { User, SessionRecord } from '../../types/tournament';
import { appStore } from '../../services/store';

interface AccountProfileScreenProps {
  user: User;
  onBack: () => void;
  onUpdateSuccess: (message: string) => void;
  onLogout: () => void;
}

const AVATAR_OPTIONS = [
  { id: 'cyber-ninja', name: 'Cyber Ninja', icon: 'fa-user-ninja', color: 'from-purple-500 to-cyan-500' },
  { id: 'skull-warrior', name: 'Skull Raider', icon: 'fa-skull', color: 'from-rose-500 to-purple-600' },
  { id: 'shadow-assassin', name: 'Shadow Assassin', icon: 'fa-mask', color: 'from-indigo-600 to-violet-800' },
  { id: 'valkyrie', name: 'Valkyrie', icon: 'fa-shield-halved', color: 'from-cyan-400 to-blue-600' },
  { id: 'neon-ronin', name: 'Neon Ronin', icon: 'fa-bolt', color: 'from-fuchsia-500 to-purple-600' },
  { id: 'mecha-wolf', name: 'Mecha Wolf', icon: 'fa-paw', color: 'from-emerald-400 to-cyan-500' },
  { id: 'titan-apex', name: 'Apex Titan', icon: 'fa-crown', color: 'from-amber-400 to-yellow-600' },
  { id: 'phantom-ghost', name: 'Phantom', icon: 'fa-ghost', color: 'from-violet-500 to-indigo-500' },
];

export const AccountProfileScreen: React.FC<AccountProfileScreenProps> = ({
  user,
  onBack,
  onUpdateSuccess,
  onLogout,
}) => {
  const [username, setUsername] = useState(user.username);
  const [avatar, setAvatar] = useState(user.avatar || 'cyber-ninja');
  const [freeFireUid, setFreeFireUid] = useState(user.free_fire_uid || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [upiId, setUpiId] = useState(user.upi_id || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password Change
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Phone Verification Modal
  const [showPhoneVerifyModal, setShowPhoneVerifyModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Logout confirm modal
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Active Sessions
  const sessions: SessionRecord[] = user.active_sessions || [];

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setPasswordError('Username cannot be empty');
      return;
    }
    setIsSavingProfile(true);
    const res = appStore.updateUserProfile(user.id, {
      username,
      avatar,
      free_fire_uid: freeFireUid,
      phone,
      upi_id: upiId,
    });
    setIsSavingProfile(false);
    if (res.success) {
      onUpdateSuccess(res.message);
    } else {
      setPasswordError(res.message);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (!currentPassword) {
      setPasswordError('Please enter your current password');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    const res = appStore.changePassword(user.id, currentPassword, newPassword);
    if (res.success) {
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onUpdateSuccess(res.message);
    } else {
      setPasswordError(res.message);
    }
  };

  const handleTerminateSession = (sessionId: string) => {
    const res = appStore.terminateSession(user.id, sessionId);
    if (res.success) {
      onUpdateSuccess(res.message);
    }
  };

  const handleTerminateAllOther = () => {
    const res = appStore.terminateOtherSessions(user.id);
    if (res.success) {
      onUpdateSuccess(res.message);
    }
  };

  const handleVerifyPhone = () => {
    if (otpCode.length === 6 || otpCode === '123456') {
      user.phone_verified = true;
      setShowPhoneVerifyModal(false);
      setOtpCode('');
      setOtpSent(false);
      onUpdateSuccess('Phone number verified successfully with OTP!');
    } else {
      setPasswordError('Invalid OTP code. Please enter 6-digit code or test code 123456');
    }
  };

  const selectedAvatarObj = AVATAR_OPTIONS.find(a => a.id === avatar) || AVATAR_OPTIONS[0];

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
          Account & Profile
        </span>
      </div>

      {/* Screen Title */}
      <div>
        <h2 className="text-base font-black text-white flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center text-xs">
            <i className="fa-solid fa-user-gear"></i>
          </span>
          Gamer Profile & Credentials
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Manage your tournament identity, Free Fire UID, security, and active sessions.
        </p>
      </div>

      {/* Error Banner */}
      {passwordError && (
        <div className="bg-rose-950/80 border border-rose-500/50 text-rose-300 p-3 rounded-xl text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <i className="fa-solid fa-circle-exclamation text-rose-400"></i>
            {passwordError}
          </span>
          <button onClick={() => setPasswordError('')} className="text-rose-400 hover:text-white text-xs">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* Form: Profile Details */}
      <form onSubmit={handleProfileSubmit} className="space-y-4">

        {/* 1. Avatar Picker */}
        <div className="bg-[#111827] border border-slate-800/90 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold text-white flex items-center gap-1.5">
              <i className="fa-solid fa-id-badge text-cyan-400"></i> Esports Avatar
            </label>
            <span className="text-[10px] text-purple-400 font-semibold">{selectedAvatarObj.name}</span>
          </div>

          <div className="flex items-center gap-3 mb-3 p-3 bg-slate-900/80 rounded-xl border border-slate-800">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${selectedAvatarObj.color} flex items-center justify-center text-slate-950 text-2xl font-black shadow-lg shadow-purple-500/20 ring-2 ring-purple-400/50`}>
              <i className={`fa-solid ${selectedAvatarObj.icon}`}></i>
            </div>
            <div>
              <div className="text-xs font-bold text-white">{username}</div>
              <div className="text-[10px] text-slate-400 font-mono">Gamer ID #{user.id}</div>
              <div className="text-[10px] text-cyan-400 font-medium mt-0.5">
                UID: {freeFireUid || 'Not set'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {AVATAR_OPTIONS.map(opt => {
              const isSelected = avatar === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAvatar(opt.id)}
                  className={`p-2 rounded-xl flex flex-col items-center gap-1 transition ${
                    isSelected
                      ? 'bg-purple-950/60 border border-purple-500 shadow-md ring-1 ring-purple-400/50'
                      : 'bg-slate-900/60 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${opt.color} flex items-center justify-center text-slate-950 text-xs shadow-sm`}>
                    <i className={`fa-solid ${opt.icon}`}></i>
                  </div>
                  <span className="text-[9px] font-medium text-slate-300 truncate max-w-[60px]">
                    {opt.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Username & Free Fire UID */}
        <div className="bg-[#111827] border border-slate-800/90 rounded-2xl p-4 shadow-lg space-y-3">
          <h3 className="text-xs font-bold text-white border-b border-slate-800 pb-2 flex items-center gap-1.5">
            <i className="fa-solid fa-gamepad text-purple-400"></i> Gamer Identity
          </h3>

          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">
              Gamer Username <span className="text-purple-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 text-xs">
                <i className="fa-solid fa-at"></i>
              </span>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Visible on match lobbies, brackets, and kill leaderboards.
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
                <i className="fa-solid fa-crosshairs text-cyan-400"></i> Free Fire UID
              </label>
              <span className="text-[10px] text-cyan-400 font-semibold">Tournament Verification</span>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 text-xs font-mono">
                FF
              </span>
              <input
                type="text"
                value={freeFireUid}
                onChange={e => setFreeFireUid(e.target.value)}
                placeholder="e.g. 99482104 or FF-99482104"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Required by custom room hosts to invite you to tournament lobbies.
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">
              Payout UPI ID (Record)
            </label>
            <input
              type="text"
              value={upiId}
              onChange={e => setUpiId(e.target.value)}
              placeholder="e.g. gamer@okhdfcbank"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-400"
            />
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Cash payouts currently paused pending gateway clearance.
            </span>
          </div>

          <button
            type="submit"
            disabled={isSavingProfile}
            className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs shadow-lg shadow-purple-600/20 active:scale-98 transition flex items-center justify-center gap-1.5"
          >
            <i className="fa-solid fa-floppy-disk"></i>
            <span>{isSavingProfile ? 'Saving Changes...' : 'Save Profile Details'}</span>
          </button>
        </div>

      </form>

      {/* 3. Verified Contacts */}
      <div className="bg-[#111827] border border-slate-800/90 rounded-2xl p-4 shadow-lg space-y-3">
        <h3 className="text-xs font-bold text-white border-b border-slate-800 pb-2 flex items-center gap-1.5">
          <i className="fa-solid fa-shield-check text-cyan-400"></i> Verified Contacts
        </h3>

        {/* Email */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 block">Registered Email</span>
            <span className="text-xs font-semibold text-white">{user.email}</span>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">
            <i className="fa-solid fa-circle-check"></i> Verified
          </span>
        </div>

        {/* Phone */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 block">Mobile SMS Match Alerts</span>
            <span className="text-xs font-semibold text-white font-mono">
              {phone || user.phone || '+91 Not Linked'}
            </span>
          </div>
          {user.phone_verified ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">
              <i className="fa-solid fa-circle-check"></i> Verified
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                setOtpSent(true);
                setShowPhoneVerifyModal(true);
              }}
              className="text-[10px] font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/40 hover:bg-cyan-900 px-2 py-1 rounded-lg transition"
            >
              Verify OTP &rarr;
            </button>
          )}
        </div>
      </div>

      {/* 4. Password & Authentication Methods */}
      <div className="bg-[#111827] border border-slate-800/90 rounded-2xl p-4 shadow-lg space-y-3">
        <h3 className="text-xs font-bold text-white border-b border-slate-800 pb-2 flex items-center gap-1.5">
          <i className="fa-solid fa-key text-purple-400"></i> Password & Login Methods
        </h3>

        <div className="flex items-center justify-between py-1">
          <div>
            <span className="text-xs font-semibold text-white block">Arena Password</span>
            <span className="text-[10px] text-slate-400">Last updated recently</span>
          </div>
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl transition"
          >
            Change Password
          </button>
        </div>

        {/* Connected Login Methods */}
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <span className="text-[11px] font-bold text-slate-300 block">Connected Login Providers</span>
          
          <div className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center gap-2.5">
              <i className="fa-solid fa-envelope text-slate-400"></i>
              <span className="text-slate-200">Email & Password</span>
            </div>
            <span className="text-[10px] text-purple-400 font-bold bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded">
              Primary
            </span>
          </div>

          <div className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center gap-2.5">
              <i className="fa-brands fa-google text-red-400"></i>
              <span className="text-slate-200">Google OAuth</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
              <i className="fa-solid fa-check"></i> Linked
            </span>
          </div>

          <div className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center gap-2.5">
              <i className="fa-brands fa-discord text-indigo-400"></i>
              <span className="text-slate-200">Discord Scrims ID</span>
            </div>
            <button
              type="button"
              onClick={() => onUpdateSuccess('Discord gaming account linked successfully!')}
              className="text-[10px] font-bold text-indigo-300 hover:text-white bg-indigo-950/60 border border-indigo-500/40 px-2 py-0.5 rounded transition"
            >
              Link Discord
            </button>
          </div>
        </div>
      </div>

      {/* 5. Active Sessions & Device Security */}
      <div className="bg-[#111827] border border-slate-800/90 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <i className="fa-solid fa-laptop-mobile text-cyan-400"></i> Active Device Sessions
          </h3>
          <span className="text-[10px] text-slate-400 font-mono">{sessions.length} Active</span>
        </div>

        <div className="space-y-2">
          {sessions.map(sess => (
            <div
              key={sess.id}
              className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                sess.is_current
                  ? 'bg-slate-900/90 border-cyan-500/40 shadow-sm'
                  : 'bg-slate-900/50 border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{sess.device}</span>
                  {sess.is_current && (
                    <span className="text-[9px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-1.5 py-0.2 rounded-full">
                      This Device
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                  {sess.browser} &bull; {sess.ip} &bull; {sess.location}
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5">{sess.last_active}</div>
              </div>

              {!sess.is_current && (
                <button
                  type="button"
                  onClick={() => handleTerminateSession(sess.id)}
                  className="text-[10px] font-semibold text-rose-400 hover:text-rose-300 bg-rose-950/40 border border-rose-500/30 px-2 py-1 rounded-lg transition"
                >
                  Log Out
                </button>
              )}
            </div>
          ))}
        </div>

        {sessions.length > 1 && (
          <button
            type="button"
            onClick={handleTerminateAllOther}
            className="w-full text-center bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold py-2 rounded-xl text-xs transition"
          >
            <i className="fa-solid fa-arrow-right-from-bracket mr-1.5 text-rose-400"></i>
            Log Out All Other Devices
          </button>
        )}
      </div>

      {/* 6. Logout & Session End */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full bg-rose-950/50 hover:bg-rose-900/80 border border-rose-500/40 text-rose-300 font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-power-off"></i>
          <span>Log Out of Clutch Arena</span>
        </button>
      </div>

      {/* MODAL: CHANGE PASSWORD */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-purple-500/40 w-full max-w-sm rounded-2xl p-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-lock text-purple-400"></i> Change Account Password
              </h3>
              <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-white p-1">
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
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
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
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
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VERIFY PHONE OTP */}
      {showPhoneVerifyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-cyan-500/40 w-full max-w-sm rounded-2xl p-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-mobile-screen-button text-cyan-400"></i> Verify Phone Number
              </h3>
              <button onClick={() => setShowPhoneVerifyModal(false)} className="text-slate-400 hover:text-white p-1">
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-3">
              We simulated sending a 6-digit verification code to <span className="text-cyan-300 font-mono">{phone || user.phone || '+91 98765 43210'}</span>.
            </p>

            <div className="bg-cyan-950/40 border border-cyan-500/30 p-2.5 rounded-xl text-[11px] text-cyan-200 mb-3 font-mono">
              <i className="fa-solid fa-key mr-1"></i> Demo OTP: <strong>123456</strong>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={e => setOtpCode(e.target.value)}
                placeholder="Enter 6-digit OTP"
                className="w-full text-center tracking-widest text-base font-black bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400"
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPhoneVerifyModal(false)}
                  className="flex-1 bg-slate-800 text-slate-300 font-semibold py-2 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleVerifyPhone}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-2 rounded-xl text-xs shadow-md shadow-cyan-500/25"
                >
                  Confirm & Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM LOGOUT */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 w-full max-w-sm rounded-2xl p-5 shadow-2xl text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto text-xl">
              <i className="fa-solid fa-right-from-bracket"></i>
            </div>
            <h3 className="text-sm font-bold text-white">Log out of Clutch Arena?</h3>
            <p className="text-xs text-slate-400">
              You will need your username and password to log back in.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 bg-slate-800 text-slate-300 font-semibold py-2 rounded-xl text-xs"
              >
                Stay Logged In
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 rounded-xl text-xs shadow-lg shadow-rose-600/30"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
