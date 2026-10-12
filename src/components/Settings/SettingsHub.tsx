import React, { useState } from 'react';
import { User } from '../../types/tournament';
import { appStore } from '../../services/store';
import { AccountProfileScreen } from './AccountProfileScreen';
import { TransactionHistoryScreen } from './TransactionHistoryScreen';
import { NotificationsScreen } from './NotificationsScreen';
import { SecurityPrivacyScreen } from './SecurityPrivacyScreen';
import { AppPreferencesScreen } from './AppPreferencesScreen';
import { HelpSupportScreen } from './HelpSupportScreen';
import { AboutLegalScreen } from './AboutLegalScreen';

export type SettingsSection = 
  | 'hub'
  | 'account'
  | 'transactions'
  | 'notifications'
  | 'security'
  | 'preferences'
  | 'support'
  | 'about';

interface SettingsHubProps {
  user: User;
  initialSection?: SettingsSection;
  onNavigateTab: (tab: 'home' | 'matches' | 'wallet' | 'profile') => void;
  onLogout: () => void;
  onToast: (msg: string) => void;
}

export const SettingsHub: React.FC<SettingsHubProps> = ({
  user,
  initialSection = 'hub',
  onNavigateTab,
  onLogout,
  onToast,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);

  const currentTheme = appStore.getTheme();
  const unreadNotifs = appStore.getNotifications(user.id).filter(n => !n.read).length;
  const userTickets = appStore.getSupportTickets(user.id);

  // If in sub-screen, render that screen
  if (activeSection === 'account') {
    return (
      <AccountProfileScreen
        user={user}
        onBack={() => setActiveSection('hub')}
        onUpdateSuccess={msg => onToast(msg)}
        onLogout={onLogout}
      />
    );
  }

  if (activeSection === 'transactions') {
    return (
      <TransactionHistoryScreen
        user={user}
        onBack={() => setActiveSection('hub')}
        onToast={onToast}
      />
    );
  }

  if (activeSection === 'notifications') {
    return (
      <NotificationsScreen
        user={user}
        onBack={() => setActiveSection('hub')}
        onNavigateTab={onNavigateTab}
        onToast={onToast}
      />
    );
  }

  if (activeSection === 'security') {
    return (
      <SecurityPrivacyScreen
        user={user}
        onBack={() => setActiveSection('hub')}
        onOpenAccount={() => setActiveSection('account')}
        onOpenLegal={() => setActiveSection('about')}
        onToast={onToast}
        onAccountDeleted={onLogout}
      />
    );
  }

  if (activeSection === 'preferences') {
    return (
      <AppPreferencesScreen
        user={user}
        onBack={() => setActiveSection('hub')}
        onToast={onToast}
      />
    );
  }

  if (activeSection === 'support') {
    return (
      <HelpSupportScreen
        user={user}
        onBack={() => setActiveSection('hub')}
        onToast={onToast}
      />
    );
  }

  if (activeSection === 'about') {
    return (
      <AboutLegalScreen
        onBack={() => setActiveSection('hub')}
        onToast={onToast}
      />
    );
  }

  // ================= MAIN SETTINGS HUB =================
  const categories = [
    {
      id: 'account' as SettingsSection,
      title: 'Account & Profile',
      subtitle: 'Avatar, gamer tag, Free Fire UID, verified contacts & sessions',
      icon: 'fa-user-gear',
      iconColor: 'from-purple-500 to-indigo-600',
      badge: user.free_fire_uid ? 'UID Verified' : 'Set UID',
      badgeColor: user.free_fire_uid ? 'text-cyan-400 bg-cyan-950/60 border-cyan-500/30' : 'text-amber-400 bg-amber-950/60 border-amber-500/30',
    },
    {
      id: 'transactions' as SettingsSection,
      title: 'Transaction & Prize History',
      subtitle: 'Genuine match prize ledger, entries, refunds & digital receipts',
      icon: 'fa-receipt',
      iconColor: 'from-cyan-500 to-blue-600',
      badge: 'Official Ledger',
      badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30',
    },
    {
      id: 'notifications' as SettingsSection,
      title: 'Notifications & Alerts',
      subtitle: 'Match room unlocks, scrim confirmations & notification rules',
      icon: 'fa-bell',
      iconColor: 'from-fuchsia-500 to-purple-600',
      badge: unreadNotifs > 0 ? `${unreadNotifs} New` : 'All Read',
      badgeColor: unreadNotifs > 0 ? 'text-cyan-300 bg-cyan-950/80 border-cyan-500/50 animate-pulse' : 'text-slate-400 bg-slate-900 border-slate-800',
    },
    {
      id: 'security' as SettingsSection,
      title: 'Security & Privacy',
      subtitle: 'Password change, profile visibility, data export & account deletion',
      icon: 'fa-shield-halved',
      iconColor: 'from-emerald-500 to-teal-600',
      badge: 'High Security',
      badgeColor: 'text-purple-300 bg-purple-950/60 border-purple-500/30',
    },
    {
      id: 'preferences' as SettingsSection,
      title: 'App Preferences',
      subtitle: 'Dark/light mode, battle accent colors, languages & sound FX',
      icon: 'fa-palette',
      iconColor: 'from-amber-500 to-orange-600',
      badge: currentTheme.name,
      badgeColor: `${currentTheme.badgeBg}`,
    },
    {
      id: 'support' as SettingsSection,
      title: 'Help & Support',
      subtitle: 'FAQs, tournament dispute forms, player reports & ticket status',
      icon: 'fa-headset',
      iconColor: 'from-blue-500 to-cyan-500',
      badge: userTickets.length > 0 ? `${userTickets.length} Tickets` : 'FAQs Ready',
      badgeColor: 'text-blue-300 bg-blue-950/60 border-blue-500/30',
    },
    {
      id: 'about' as SettingsSection,
      title: 'About & Legal',
      subtitle: 'App version, competition terms, privacy policy & guidelines',
      icon: 'fa-scale-balanced',
      iconColor: 'from-violet-500 to-purple-700',
      badge: 'v2.4.0',
      badgeColor: 'text-slate-300 bg-slate-900 border-slate-700',
    },
  ];

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-200">
      
      {/* User Header Summary Card */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-slate-950 text-xl font-black shadow-lg shadow-purple-500/20 ring-2 ring-purple-400/30">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-black text-white">{user.username}</h2>
              <i className="fa-solid fa-circle-check text-cyan-400 text-xs" title="Verified Gamer"></i>
            </div>
            <p className="text-[11px] text-slate-400">{user.email}</p>
            <div className="flex items-center gap-2 mt-1 text-[10px] font-mono">
              <span className="text-purple-400">ID #{user.id}</span>
              <span className="text-slate-600">&bull;</span>
              <span className="text-cyan-300">{user.free_fire_uid || 'No UID'}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActiveSection('account')}
          className="text-xs font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-950/80 border border-cyan-500/30 px-3 py-1.5 rounded-xl transition active:scale-95 flex items-center gap-1"
        >
          <span>Edit</span>
          <i className="fa-solid fa-angle-right text-[10px]"></i>
        </button>
      </div>

      {/* Quick Theme Switcher Shortcut */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950/30 to-slate-900 border border-purple-500/30 rounded-2xl p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${currentTheme.gradient} flex items-center justify-center text-slate-950 text-xs font-bold`}>
            <i className={`fa-solid ${currentTheme.icon}`}></i>
          </div>
          <div>
            <span className="text-xs font-bold text-white block">Battle Accent</span>
            <span className="text-[10px] text-purple-300">Theme: {currentTheme.name}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActiveSection('preferences')}
          className="text-[11px] font-bold text-purple-300 bg-purple-950/60 border border-purple-500/40 hover:bg-purple-900 px-2.5 py-1 rounded-xl transition"
        >
          Change Mode
        </button>
      </div>

      {/* Category Navigation List */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 flex items-center justify-between">
          <span>Settings Categories</span>
          <span className="font-mono text-[10px] text-slate-500">7 Sections</span>
        </div>

        {categories.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveSection(cat.id)}
            className="w-full bg-[#111827] border border-slate-800 hover:border-slate-700/90 rounded-2xl p-3.5 text-left flex items-center justify-between gap-3 transition shadow-sm hover:shadow-md active:scale-99 group"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${cat.iconColor} flex items-center justify-center text-white text-base shadow-sm shrink-0 group-hover:scale-105 transition-transform`}
              >
                <i className={`fa-solid ${cat.icon}`}></i>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {cat.title}
                  </h3>
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                  {cat.subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {cat.badge && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cat.badgeColor}`}
                >
                  {cat.badge}
                </span>
              )}
              <i className="fa-solid fa-chevron-right text-slate-600 group-hover:text-cyan-400 text-xs transition-colors"></i>
            </div>
          </button>
        ))}
      </div>

      {/* Log Out Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onLogout}
          className="w-full bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-arrow-right-from-bracket"></i>
          <span>Log Out of Clutch Arena</span>
        </button>
      </div>

    </div>
  );
};
