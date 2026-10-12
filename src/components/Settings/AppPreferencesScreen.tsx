import React, { useState } from 'react';
import { User, ThemeId } from '../../types/tournament';
import { appStore, AVAILABLE_THEMES } from '../../services/store';

interface AppPreferencesScreenProps {
  user: User;
  onBack: () => void;
  onToast: (msg: string) => void;
}

export const AppPreferencesScreen: React.FC<AppPreferencesScreenProps> = ({
  user,
  onBack,
  onToast,
}) => {
  const currentTheme = appStore.getTheme();

  const userPrefs = user.preferences || {
    theme_mode: 'dark',
    color_theme: 'cyberpunk',
    language: 'en',
    sound_enabled: true,
    vibration_enabled: true,
    reduce_motion: false,
    high_contrast: false,
    notifications: {
      match_reminders: true,
      registration_confirmation: true,
      announcements: true,
      results_rewards: true,
      email_digest: false,
    },
    privacy: {
      profile_visibility: 'public',
      show_match_history: true,
      show_stats_leaderboard: true,
      allow_direct_challenges: true,
    },
  };

  const [themeMode, setThemeMode] = useState<'dark' | 'light' | 'system'>(userPrefs.theme_mode || 'dark');
  const [language, setLanguage] = useState<'en' | 'hi' | 'es' | 'id'>(userPrefs.language || 'en');
  const [soundEnabled, setSoundEnabled] = useState(userPrefs.sound_enabled ?? true);
  const [vibrationEnabled, setVibrationEnabled] = useState(userPrefs.vibration_enabled ?? true);
  const [reduceMotion, setReduceMotion] = useState(userPrefs.reduce_motion ?? false);
  const [highContrast, setHighContrast] = useState(userPrefs.high_contrast ?? false);

  const playTestChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.warn('AudioContext not available', e);
    }
  };

  const testVibration = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([100, 50, 100]);
      } catch (e) {}
    }
    onToast('Haptic pulse sent to device!');
  };

  const updatePreference = (key: string, val: any) => {
    appStore.updateAppPreferences(user.id, { [key]: val });
  };

  const handleThemeModeChange = (mode: 'dark' | 'light' | 'system') => {
    setThemeMode(mode);
    updatePreference('theme_mode', mode);
    onToast(`Theme set to ${mode.toUpperCase()}`);
  };

  const handleColorThemeChange = (thId: ThemeId) => {
    appStore.setTheme(thId);
    updatePreference('color_theme', thId);
    if (soundEnabled) playTestChime();
    onToast(`Applied ${thId.toUpperCase()} theme`);
  };

  const handleLanguageChange = (lang: 'en' | 'hi' | 'es' | 'id') => {
    setLanguage(lang);
    updatePreference('language', lang);
    onToast(`Language changed to ${lang.toUpperCase()}`);
  };

  const handleSoundToggle = (val: boolean) => {
    setSoundEnabled(val);
    updatePreference('sound_enabled', val);
    if (val) playTestChime();
    onToast(`Sound FX ${val ? 'Enabled' : 'Disabled'}`);
  };

  const handleVibrationToggle = (val: boolean) => {
    setVibrationEnabled(val);
    updatePreference('vibration_enabled', val);
    if (val) testVibration();
    onToast(`Vibration ${val ? 'Enabled' : 'Disabled'}`);
  };

  const handleReduceMotionToggle = (val: boolean) => {
    setReduceMotion(val);
    updatePreference('reduce_motion', val);
    onToast(`Reduced Motion ${val ? 'Enabled' : 'Disabled'}`);
  };

  const handleHighContrastToggle = (val: boolean) => {
    setHighContrast(val);
    updatePreference('high_contrast', val);
    onToast(`High Contrast ${val ? 'Enabled' : 'Disabled'}`);
  };

  const languages = [
    { code: 'en', name: 'English (US)', sub: 'Default language', flag: 'EN' },
    { code: 'hi', name: 'हिन्दी (Hindi)', sub: 'भारतीय भाषा', flag: 'HI' },
    { code: 'es', name: 'Español (ES)', sub: 'Comunidad hispanohablante', flag: 'ES' },
    { code: 'id', name: 'Bahasa Indonesia', sub: 'Komunitas Asia Tenggara', flag: 'ID' },
  ];

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
          Preferences & Appearance
        </span>
      </div>

      {/* Screen Title */}
      <div>
        <h2 className="text-base font-black text-white flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center text-xs">
            <i className="fa-solid fa-palette"></i>
          </span>
          App Preferences & Appearance
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Themes, battle accent colors, languages, sound effects, and accessibility.
        </p>
      </div>

      {/* 1. Theme Mode: Dark / Light / System */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        <h3 className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-slate-800 pb-2">
          <i className="fa-solid fa-circle-half-stroke text-cyan-400"></i> Theme Mode
        </h3>

        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'dark', label: 'Dark Mode', icon: 'fa-moon', sub: 'Esports Midnight' },
            { id: 'light', label: 'Light Mode', icon: 'fa-sun', sub: 'Clean Minimal' },
            { id: 'system', label: 'System', icon: 'fa-desktop', sub: 'Sync Device' },
          ].map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => handleThemeModeChange(m.id as any)}
              className={`p-2.5 rounded-xl border text-center transition ${
                themeMode === m.id
                  ? 'bg-purple-950/70 border-purple-500 text-white font-bold shadow-sm ring-1 ring-purple-400/50'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <i className={`fa-solid ${m.icon} block text-sm mb-1`}></i>
              <span className="text-xs font-bold block">{m.label}</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">{m.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Battle Accent Color Themes */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <i className="fa-solid fa-wand-magic-sparkles text-purple-400"></i> Battle Accent Themes
          </h3>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${currentTheme.badgeBg}`}>
            Active: {currentTheme.name}
          </span>
        </div>

        <p className="text-[11px] text-slate-400">
          Adapts buttons, badges, glows, and bottom nav to your signature esports vibe.
        </p>

        <div className="space-y-2">
          {AVAILABLE_THEMES.map(th => {
            const isCur = th.id === currentTheme.id;
            return (
              <button
                key={th.id}
                type="button"
                onClick={() => handleColorThemeChange(th.id)}
                className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition ${
                  isCur
                    ? 'bg-slate-800/90 border-cyan-400/60 shadow-md ring-1 ring-cyan-400/30'
                    : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${th.gradient} flex items-center justify-center text-slate-950 font-black text-xs shadow-sm`}
                  >
                    <i className={`fa-solid ${th.icon}`}></i>
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-white block">{th.name}</span>
                    <span className={`text-[10px] ${th.textColor}`}>Signature Palette</span>
                  </div>
                </div>

                {isCur ? (
                  <span className="text-xs text-cyan-400 font-bold flex items-center gap-1">
                    <i className="fa-solid fa-circle-check"></i>
                    Applied
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-medium">Select &rarr;</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Available Languages */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        <h3 className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-slate-800 pb-2">
          <i className="fa-solid fa-language text-cyan-400"></i> Platform Language
        </h3>

        <div className="space-y-2">
          {languages.map(l => {
            const isSel = language === l.code;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => handleLanguageChange(l.code as any)}
                className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition ${
                  isSel
                    ? 'bg-slate-800/90 border-purple-500 shadow-sm'
                    : 'bg-slate-900/50 border-slate-800 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px] font-bold flex items-center justify-center">
                    {l.flag}
                  </span>
                  <div className="text-left">
                    <span className="text-xs font-bold text-white block">{l.name}</span>
                    <span className="text-[10px] text-slate-400 block">{l.sub}</span>
                  </div>
                </div>

                {isSel && (
                  <i className="fa-solid fa-check text-purple-400 text-sm"></i>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Audio & Haptics */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        <h3 className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-slate-800 pb-2">
          <i className="fa-solid fa-volume-high text-purple-400"></i> Sound & Haptics
        </h3>

        <div className="space-y-3">
          {/* Sound toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-white block">In-App Match Audio FX</span>
              <span className="text-[10px] text-slate-400 block">
                Audible sound feedback on tournament countdowns
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={playTestChime}
                title="Play test audio"
                className="text-[10px] font-semibold text-cyan-400 hover:text-white bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 transition"
              >
                <i className="fa-solid fa-play mr-1 text-[9px]"></i> Test
              </button>

              <button
                type="button"
                onClick={() => handleSoundToggle(!soundEnabled)}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${
                  soundEnabled ? 'bg-cyan-500' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                    soundEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Vibration toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <div>
              <span className="text-xs font-semibold text-white block">Vibration & Haptics</span>
              <span className="text-[10px] text-slate-400 block">
                Haptic pulse feedback when custom room unlocks
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={testVibration}
                title="Send vibration pulse"
                className="text-[10px] font-semibold text-cyan-400 hover:text-white bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 transition"
              >
                <i className="fa-solid fa-mobile mr-1 text-[9px]"></i> Test
              </button>

              <button
                type="button"
                onClick={() => handleVibrationToggle(!vibrationEnabled)}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${
                  vibrationEnabled ? 'bg-cyan-500' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                    vibrationEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Accessibility & Motion */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        <h3 className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-slate-800 pb-2">
          <i className="fa-solid fa-universal-access text-cyan-400"></i> Accessibility & Motion
        </h3>

        <div className="space-y-3">
          {/* Reduce Motion */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-white block">Reduce Motion</span>
              <span className="text-[10px] text-slate-400 block">
                Disables animated pulses and transition effects
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleReduceMotionToggle(!reduceMotion)}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${
                reduceMotion ? 'bg-purple-600' : 'bg-slate-800'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                  reduceMotion ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* High Contrast */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <div>
              <span className="text-xs font-semibold text-white block">High Contrast Mode</span>
              <span className="text-[10px] text-slate-400 block">
                Sharp borders and higher text contrast for outdoor play
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleHighContrastToggle(!highContrast)}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${
                highContrast ? 'bg-purple-600' : 'bg-slate-800'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                  highContrast ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
