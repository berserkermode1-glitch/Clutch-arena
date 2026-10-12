import React, { useState } from 'react';
import { User, AppNotification } from '../../types/tournament';
import { appStore } from '../../services/store';

interface NotificationsScreenProps {
  user: User;
  onBack: () => void;
  onNavigateTab: (tab: 'home' | 'matches' | 'wallet' | 'profile') => void;
  onToast: (msg: string) => void;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  user,
  onBack,
  onNavigateTab,
  onToast,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'preferences'>('all');

  // Notifications from store
  const notifications: AppNotification[] = appStore.getNotifications(user.id);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Preferences from user
  const userPrefs = user.preferences?.notifications || {
    match_reminders: true,
    registration_confirmation: true,
    announcements: true,
    results_rewards: true,
    email_digest: false,
  };

  const [matchReminders, setMatchReminders] = useState(userPrefs.match_reminders);
  const [registrationConfirm, setRegistrationConfirm] = useState(userPrefs.registration_confirmation);
  const [announcements, setAnnouncements] = useState(userPrefs.announcements);
  const [resultsRewards, setResultsRewards] = useState(userPrefs.results_rewards);
  const [emailDigest, setEmailDigest] = useState(userPrefs.email_digest);

  const handleMarkAllRead = () => {
    const res = appStore.markAllNotificationsRead(user.id);
    if (res.success) {
      onToast(res.message);
    }
  };

  const handleTogglePref = (
    key: 'match_reminders' | 'registration_confirmation' | 'announcements' | 'results_rewards' | 'email_digest',
    value: boolean
  ) => {
    if (key === 'match_reminders') setMatchReminders(value);
    if (key === 'registration_confirmation') setRegistrationConfirm(value);
    if (key === 'announcements') setAnnouncements(value);
    if (key === 'results_rewards') setResultsRewards(value);
    if (key === 'email_digest') setEmailDigest(value);

    const updated = {
      ...userPrefs,
      [key]: value,
    };

    appStore.updateAppPreferences(user.id, {
      notifications: updated,
    });
    onToast(`Notification preference saved`);
  };

  const handleItemClick = (notif: AppNotification) => {
    if (!notif.read) {
      appStore.markNotificationRead(notif.id);
    }
    if (notif.link_tab === 'matches') {
      onNavigateTab('matches');
    } else if (notif.link_tab === 'wallet') {
      onNavigateTab('wallet');
    }
  };

  const handleDismiss = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    appStore.clearNotification(id);
    onToast('Notification dismissed');
  };

  const filteredNotifs = notifications.filter(n => {
    if (activeFilter === 'unread') return !n.read;
    return true;
  });

  const getNotifIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'reminder':
        return { icon: 'fa-stopwatch', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };
      case 'confirmation':
        return { icon: 'fa-circle-check', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
      case 'reward':
        return { icon: 'fa-trophy', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'result':
        return { icon: 'fa-chart-simple', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' };
      case 'announcement':
      default:
        return { icon: 'fa-bullhorn', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
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
          Alerts & Reminders
        </span>
      </div>

      {/* Screen Title & Quick Actions */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center text-xs">
              <i className="fa-solid fa-bell"></i>
            </span>
            Notifications
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Match room unlocks, scrim confirmations, and channel announcements.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="text-[11px] font-bold text-cyan-300 hover:text-cyan-200 bg-cyan-950/60 border border-cyan-500/40 px-2.5 py-1.5 rounded-xl whitespace-nowrap transition"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="grid grid-cols-3 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`py-1.5 rounded-lg transition ${
            activeFilter === 'all'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          All ({notifications.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('unread')}
          className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
            activeFilter === 'unread'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>Unread</span>
          {unreadCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-cyan-400 text-slate-950 text-[10px] font-black flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('preferences')}
          className={`py-1.5 rounded-lg transition ${
            activeFilter === 'preferences'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <i className="fa-solid fa-sliders mr-1 text-[10px]"></i>
          Alert Rules
        </button>
      </div>

      {/* VIEW: NOTIFICATIONS LIST */}
      {activeFilter !== 'preferences' && (
        <div className="space-y-2.5">
          {filteredNotifs.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto mb-2 text-xl">
                <i className="fa-solid fa-bell-slash"></i>
              </div>
              <h3 className="text-xs font-bold text-slate-300">
                {activeFilter === 'unread' ? 'No unread notifications' : 'Notification inbox empty'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                {activeFilter === 'unread'
                  ? 'All notifications have been read. Match countdowns and results will appear here.'
                  : 'You will receive notifications here when you join scrims or custom rooms go live.'}
              </p>
            </div>
          ) : (
            filteredNotifs.map(notif => {
              const meta = getNotifIcon(notif.type);
              return (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer relative shadow-sm ${
                    !notif.read
                      ? 'bg-slate-900/90 border-purple-500/50 shadow-purple-500/10'
                      : 'bg-[#111827] border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {!notif.read && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-cyan-400 ring-4 ring-cyan-400/20"></span>
                  )}

                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xs font-bold shrink-0 ${meta.color}`}
                    >
                      <i className={`fa-solid ${meta.icon}`}></i>
                    </div>

                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white leading-tight">
                          {notif.title}
                        </h4>
                      </div>

                      <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                        {notif.message}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800/60">
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(notif.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>

                        <div className="flex items-center gap-2">
                          {notif.link_tab && (
                            <span className="text-[10px] font-bold text-cyan-400 flex items-center gap-1 hover:underline">
                              <span>Open {notif.link_tab}</span>
                              <i className="fa-solid fa-arrow-right text-[8px]"></i>
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={e => handleDismiss(e, notif.id)}
                            title="Dismiss notification"
                            className="text-slate-500 hover:text-rose-400 text-[10px] p-0.5"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW: NOTIFICATION PREFERENCES */}
      {activeFilter === 'preferences' && (
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg space-y-4">
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <i className="fa-solid fa-sliders text-cyan-400"></i> Notification Preferences
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Control which esports events push alerts to your device.
            </p>
          </div>

          <div className="space-y-3 divide-y divide-slate-800/80">
            {/* Match Reminders */}
            <div className="pt-2 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block">
                  Match Starting Reminders
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Push alerts 20 mins before room lobby opens
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleTogglePref('match_reminders', !matchReminders)}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${
                  matchReminders ? 'bg-cyan-500' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                    matchReminders ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Registration Confirmation */}
            <div className="pt-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block">
                  Slot Confirmations
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Confirmations when joining a scrim bracket
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleTogglePref('registration_confirmation', !registrationConfirm)}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${
                  registrationConfirm ? 'bg-cyan-500' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                    registrationConfirm ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Announcements */}
            <div className="pt-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block">
                  Platform Announcements
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Rules updates, new games, and seasonal championships
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleTogglePref('announcements', !announcements)}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${
                  announcements ? 'bg-cyan-500' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                    announcements ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Results & Rewards */}
            <div className="pt-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block">
                  Results & Prize Rewards
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Official tournament standings and winnings credit
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleTogglePref('results_rewards', !resultsRewards)}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${
                  resultsRewards ? 'bg-cyan-500' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                    resultsRewards ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Email Digest */}
            <div className="pt-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block">
                  Weekly Scrim Digest (Email)
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Summary of your weekly stats and top brackets
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleTogglePref('email_digest', !emailDigest)}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${
                  emailDigest ? 'bg-cyan-500' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                    emailDigest ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
