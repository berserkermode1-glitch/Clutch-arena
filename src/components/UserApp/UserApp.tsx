import React, { useState } from 'react';
import { appStore, AVAILABLE_THEMES } from '../../services/store';
import { Tournament, ThemeId } from '../../types/tournament';
import { SettingsHub, SettingsSection } from '../Settings/SettingsHub';
import { Leaderboard } from './Leaderboard';

interface UserAppProps {
  onSwitchToAdmin: () => void;
}

export const UserApp: React.FC<UserAppProps> = ({ onSwitchToAdmin }) => {
  const [currentUser, setCurrentUser] = useState(appStore.getCurrentUser());
  const [activeNav, setActiveNav] = useState<'home' | 'matches' | 'leaderboard' | 'wallet' | 'settings'>('home');
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('hub');
  const [matchesTab, setMatchesTab] = useState<'upcoming' | 'completed'>('upcoming');
  const [gameFilter, setGameFilter] = useState<string>('All');

  // Modals & Forms
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');

  // Form States
  const [depositAmount, setDepositAmount] = useState('100');
  const [depositTxnId, setDepositTxnId] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('50');

  // Anti-duplicate & rapid-tap state guards
  const [joiningTournamentId, setJoiningTournamentId] = useState<number | null>(null);
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterTransitioning, setFilterTransitioning] = useState(false);

  // Auth Inputs
  const [authUsername, setAuthUsername] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  // Notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Re-sync with store
  React.useEffect(() => {
    return appStore.subscribe(() => {
      setCurrentUser(appStore.getCurrentUser());
    });
  }, []);

  const tournaments = appStore.getTournaments();
  const settings = appStore.getSettings();
  const transactions = currentUser ? appStore.getTransactions(currentUser.id) : [];
  const deposits = currentUser ? appStore.getDeposits().filter(d => d.user_id === currentUser.id) : [];
  const withdrawals = currentUser ? appStore.getWithdrawals().filter(w => w.user_id === currentUser.id) : [];

  // Filtered Tournaments
  const filteredTournaments = tournaments.filter(t => {
    if (t.status === 'Completed') return false;
    if (gameFilter !== 'All' && t.game_name !== gameFilter) return false;
    return true;
  });

  const joinedTournaments = tournaments.filter(t => currentUser && t.participant_ids.includes(currentUser.id));
  const myUpcoming = joinedTournaments.filter(t => t.status !== 'Completed');
  const myCompleted = joinedTournaments.filter(t => t.status === 'Completed');

  const handleRefreshTournaments = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Tournaments & match data up to date');
    }, 400);
  };

  const handleSetGameFilter = (newGame: string) => {
    if (newGame === gameFilter || filterTransitioning) return;
    setFilterTransitioning(true);
    setGameFilter(newGame);
    setTimeout(() => {
      setFilterTransitioning(false);
    }, 220);
  };

  const handleJoin = async (tournament: Tournament) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    // Prevent duplicate rapid taps
    if (joiningTournamentId !== null) return;
    setJoiningTournamentId(tournament.id);

    try {
      await new Promise(r => setTimeout(r, 200));
      const res = appStore.joinTournament(currentUser.id, tournament.id);
      if (res.success) {
        showToast(res.message, 'success');
      } else {
        showToast(res.message, 'error');
      }
    } finally {
      setJoiningTournamentId(null);
    }
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || isSubmittingDeposit) return;
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt < 10) {
      showToast('Minimum deposit is ₹10', 'error');
      return;
    }
    if (!depositTxnId || depositTxnId.trim().length < 6) {
      showToast('Please enter a valid 12-digit UTR/Txn ID', 'error');
      return;
    }
    setIsSubmittingDeposit(true);
    try {
      await new Promise(r => setTimeout(r, 300));
      const res = appStore.submitDeposit(currentUser.id, amt, depositTxnId.trim());
      if (res.success) {
        showToast(res.message, 'success');
        setShowDepositModal(false);
        setDepositTxnId('');
      } else {
        showToast(res.message, 'error');
      }
    } finally {
      setIsSubmittingDeposit(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || isSubmittingWithdraw) return;
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt < 50) {
      showToast('Minimum withdrawal is ₹50', 'error');
      return;
    }
    setIsSubmittingWithdraw(true);
    try {
      await new Promise(r => setTimeout(r, 300));
      const res = appStore.submitWithdrawal(currentUser.id, amt);
      if (res.success) {
        showToast(res.message, 'success');
        setShowWithdrawModal(false);
      } else {
        showToast(res.message, 'error');
      }
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingAuth) return;
    setIsSubmittingAuth(true);

    try {
      await new Promise(r => setTimeout(r, 300));
      if (authTab === 'login') {
        const res = appStore.loginUser(authUsername);
        if (res.success) {
          showToast(res.message, 'success');
          setShowAuthModal(false);
        } else {
          showToast(res.message, 'error');
        }
      } else {
        const res = appStore.signupUser(authUsername, authEmail);
        if (res.success) {
          showToast(res.message, 'success');
          setShowAuthModal(false);
        } else {
          showToast(res.message, 'error');
        }
      }
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const currentTheme = appStore.getTheme();

  return (
    <div className={`w-full max-w-md mx-auto ${currentTheme.bgDark} min-h-screen text-slate-100 flex flex-col relative select-none shadow-2xl border-x border-slate-800`}>
      
      {/* Toast Notification Banner */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-2xl flex items-center gap-2 max-w-sm w-[90%] ${toast.type === 'success' ? 'bg-emerald-950/90 text-emerald-200 border border-emerald-500/50' : 'bg-rose-950/90 text-rose-200 border border-rose-500/50'}`}>
          <i className={`fa-solid ${toast.type === 'success' ? 'fa-circle-check text-emerald-400' : 'fa-circle-exclamation text-rose-400'}`}></i>
          <span className="flex-1">{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${currentTheme.gradient} flex items-center justify-center shadow-lg text-slate-950 font-black`}>
            <i className="fa-solid fa-gamepad text-base"></i>
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight text-white block leading-none">
              CLUTCH<span className={currentTheme.textColor}>ARENA</span>
            </span>
            <span className="text-[9px] text-slate-400 font-medium tracking-widest uppercase">Esports Hub</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {currentUser ? (
            <button 
              onClick={() => setActiveNav('wallet')}
              className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-700/80 border border-slate-700/80 px-2.5 py-1.5 rounded-full transition active:scale-95"
            >
              <div className={`w-4 h-4 rounded-full bg-slate-900 ${currentTheme.textColor} flex items-center justify-center text-[10px] font-bold`}>
                ₹
              </div>
              <span className={`text-xs font-bold ${currentTheme.textColor} font-mono`}>
                ₹{currentUser.wallet_balance.toFixed(2)}
              </span>
              <i className={`fa-solid fa-plus text-[9px] ${currentTheme.textColor}`}></i>
            </button>
          ) : (
            <button 
              onClick={() => setShowAuthModal(true)}
              className={`text-xs font-bold bg-gradient-to-r ${currentTheme.gradient} text-slate-950 px-3 py-1.5 rounded-lg`}
            >
              Sign In
            </button>
          )}

          {/* Notifications Shortcut */}
          {currentUser && (
            <button
              onClick={() => {
                setActiveNav('settings');
                setSettingsSection('notifications');
              }}
              title="Notifications & Match Alerts"
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs relative transition active:scale-95"
            >
              <i className="fa-solid fa-bell"></i>
              {appStore.getNotifications(currentUser.id).some(n => !n.read) && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 ring-2 ring-[#0f172a] animate-pulse"></span>
              )}
            </button>
          )}

          {/* Quick Theme Change Button */}
          <button
            onClick={() => setShowThemeModal(true)}
            title={`Current Theme: ${currentTheme.name} (Click to change)`}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 flex items-center justify-center text-xs transition active:scale-95"
          >
            <i className={`fa-solid ${currentTheme.icon}`}></i>
          </button>

          <button 
            onClick={onSwitchToAdmin}
            title="Open Admin Portal"
            className="w-8 h-8 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 hover:text-white flex items-center justify-center text-xs transition active:scale-95"
          >
            <i className="fa-solid fa-shield-halved"></i>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-4 py-4 pb-24 overflow-y-auto">

        {/* ================= VIEW: HOME ================= */}
        {activeNav === 'home' && (
          <div className="space-y-4">
            {/* Banner with Refresh Control */}
            <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950/60 border border-slate-800 rounded-2xl p-4 overflow-hidden shadow-lg">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                    <i className="fa-solid fa-fire animate-pulse text-[11px]"></i> Live Tournaments
                  </div>
                  <button
                    onClick={handleRefreshTournaments}
                    title="Refresh Live Tournaments"
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800 transition active:scale-95"
                  >
                    <i className={`fa-solid fa-arrows-rotate text-[10px] ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`}></i>
                    <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
                  </button>
                </div>
                <h2 className="text-base font-black text-white">Daily Esports Battles</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Instant UPI payouts for winning matches</p>
              </div>
              <div className="absolute -right-2 -bottom-2 text-6xl text-slate-700/20 pointer-events-none">
                <i className="fa-solid fa-trophy"></i>
              </div>
            </div>

            {/* Global Leaderboard Highlight Card */}
            <div 
              onClick={() => setActiveNav('leaderboard')}
              className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-purple-950/60 border border-indigo-500/30 hover:border-indigo-500/60 rounded-2xl p-3 shadow-lg flex items-center justify-between cursor-pointer transition active:scale-[0.99] group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-slate-950 font-black flex items-center justify-center shadow-md shadow-amber-400/20 group-hover:scale-105 transition-transform shrink-0">
                  <i className="fa-solid fa-ranking-star text-sm"></i>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white">Global Scrim Leaderboard</span>
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-bold border border-amber-500/40">
                      Season 6
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Rank by Total Wins &bull; Accumulated XP &bull; View standings &rarr;
                  </p>
                </div>
              </div>

              <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center text-xs group-hover:translate-x-0.5 transition-transform shrink-0">
                <i className="fa-solid fa-chevron-right text-[10px]"></i>
              </div>
            </div>

            {/* Game Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
              {['All', 'BGMI', 'Free Fire', 'COD Mobile', 'TDM'].map(g => (
                <button
                  key={g}
                  onClick={() => handleSetGameFilter(g)}
                  className={`px-3 py-1.5 rounded-xl font-semibold shrink-0 transition active:scale-95 min-h-[36px] ${gameFilter === g ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'}`}
                >
                  {g === 'All' ? 'All Games' : g}
                </button>
              ))}
            </div>

            {/* Tournament Cards / Skeleton States */}
            <div className="space-y-3.5">
              {(isRefreshing || filterTransitioning) ? (
                /* Skeleton Loading Shimmer */
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-[#111827] border border-slate-800/80 rounded-2xl p-4 space-y-3 shadow-md">
                      <div className="flex justify-between items-center">
                        <div className="h-4 w-20 skeleton-shimmer rounded-md"></div>
                        <div className="h-4 w-24 skeleton-shimmer rounded-md"></div>
                      </div>
                      <div className="h-5 w-3/4 skeleton-shimmer rounded-md"></div>
                      <div className="h-12 w-full skeleton-shimmer rounded-xl"></div>
                      <div className="h-10 w-full skeleton-shimmer rounded-xl"></div>
                    </div>
                  ))}
                </div>
              ) : filteredTournaments.length === 0 ? (
                <div className="text-center py-12 bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                  <i className="fa-solid fa-calendar-xmark text-3xl text-slate-600 mb-2"></i>
                  <h3 className="text-sm font-bold text-slate-300">No tournaments in this category</h3>
                  <p className="text-xs text-slate-500 mt-1 mb-4">Switch filter or browse all esports titles.</p>
                  <button
                    onClick={() => handleSetGameFilter('All')}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition active:scale-95 shadow-md shadow-emerald-500/20"
                  >
                    View All Games ({tournaments.filter(t => t.status !== 'Completed').length} matches)
                  </button>
                </div>
              ) : (
                filteredTournaments.map(t => {
                  const isJoined = currentUser && t.participant_ids.includes(currentUser.id);
                  const isLive = t.status === 'Live';
                  const isJoiningThis = joiningTournamentId === t.id;

                  return (
                    <div key={t.id} className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg hover:border-slate-700 transition">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                          <i className="fa-solid fa-gamepad text-slate-400"></i>
                          {t.game_name}
                        </span>

                        {isLive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> MATCH LIVE
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <i className="fa-regular fa-clock text-slate-500"></i>
                            {new Date(t.match_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-white mb-2.5">{t.title}</h3>

                      <div className="grid grid-cols-3 gap-2 bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 mb-3 text-center">
                        <div>
                          <span className="block text-[10px] text-slate-500 font-medium">Prize Pool</span>
                          <span className="text-xs font-black text-amber-400 font-mono">₹{t.prize_pool.toFixed(0)}</span>
                        </div>
                        <div className="border-x border-slate-800">
                          <span className="block text-[10px] text-slate-500 font-medium">Entry Fee</span>
                          <span className="text-xs font-black text-emerald-400 font-mono">
                            {t.entry_fee > 0 ? `₹${t.entry_fee.toFixed(0)}` : 'FREE'}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-500 font-medium">Joined</span>
                          <span className="text-xs font-bold text-slate-300 font-mono">{t.participant_ids.length} Players</span>
                        </div>
                      </div>

                      {isJoined ? (
                        <div className="flex items-center justify-between bg-emerald-950/40 border border-emerald-500/30 rounded-xl px-3 py-2 text-xs">
                          <span className="text-emerald-400 font-semibold flex items-center gap-1.5 text-xs">
                            <i className="fa-solid fa-circle-check"></i> Registered
                          </span>
                          <button 
                            onClick={() => { setActiveNav('matches'); setMatchesTab('upcoming'); }}
                            className="text-slate-300 hover:text-white font-bold text-[11px] underline min-h-[36px] flex items-center"
                          >
                            View Room Info &rarr;
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleJoin(t)}
                          disabled={isJoiningThis}
                          className={`w-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-98 transition min-h-[44px] ${
                            isJoiningThis ? 'opacity-70 cursor-not-allowed' : ''
                          }`}
                        >
                          {isJoiningThis ? (
                            <>
                              <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                              <span>Registering Player...</span>
                            </>
                          ) : (
                            <>
                              <i className="fa-solid fa-trophy text-[11px]"></i>
                              <span>Join Now (₹{t.entry_fee.toFixed(0)})</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ================= VIEW: MATCHES ================= */}
        {activeNav === 'matches' && (
          <div className="space-y-4">
            <div>
              <h1 className="text-base font-black text-white flex items-center gap-2">
                <i className="fa-solid fa-trophy text-emerald-400"></i> My Matches
              </h1>
              <p className="text-xs text-slate-400">Joined matches and live custom room credentials</p>
            </div>

            <div className="grid grid-cols-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button 
                onClick={() => setMatchesTab('upcoming')}
                className={`py-2 text-center text-xs font-bold rounded-lg transition ${matchesTab === 'upcoming' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                <i className="fa-solid fa-hourglass-half mr-1"></i> Live & Joined ({myUpcoming.length})
              </button>
              <button 
                onClick={() => setMatchesTab('completed')}
                className={`py-2 text-center text-xs font-bold rounded-lg transition ${matchesTab === 'completed' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                <i className="fa-solid fa-flag-checkered mr-1"></i> Completed ({myCompleted.length})
              </button>
            </div>

            {matchesTab === 'upcoming' ? (
              <div className="space-y-3.5">
                {myUpcoming.length === 0 ? (
                  <div className="text-center py-12 bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                    <i className="fa-solid fa-gamepad text-3xl text-slate-600 mb-2"></i>
                    <h3 className="text-sm font-bold text-slate-300">No active joined tournaments</h3>
                    <p className="text-xs text-slate-500 mt-1 mb-4">You have not registered for any upcoming matches.</p>
                    <button 
                      onClick={() => setActiveNav('home')}
                      className="bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs"
                    >
                      Browse Matches
                    </button>
                  </div>
                ) : (
                  myUpcoming.map(t => {
                    const isLive = t.status === 'Live';
                    return (
                      <div key={t.id} className={`bg-[#111827] border ${isLive ? 'border-rose-500/60 shadow-lg shadow-rose-950/20' : 'border-slate-800'} rounded-2xl p-4`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase">{t.game_name}</span>
                          {isLive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> MATCH LIVE
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              <i className="fa-regular fa-clock mr-1"></i>
                              {new Date(t.match_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-white mb-2">{t.title}</h3>

                        <div className="flex items-center gap-4 text-xs text-slate-400 mb-3 border-b border-slate-800 pb-2">
                          <div>Prize: <strong className="text-amber-400 font-mono">₹{t.prize_pool.toFixed(0)}</strong></div>
                          <div>Fee: <strong className="text-emerald-400 font-mono">₹{t.entry_fee.toFixed(0)}</strong></div>
                        </div>

                        {/* Room Credentials Section */}
                        {isLive || t.room_id ? (
                          <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400 flex items-center gap-1.5">
                                <i className="fa-solid fa-key text-amber-400"></i> Room ID:
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-white bg-slate-800 px-2.5 py-1 rounded text-xs select-all">
                                  {t.room_id || 'Generating...'}
                                </span>
                                {t.room_id && (
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard?.writeText(t.room_id);
                                      showToast('Room ID copied to clipboard');
                                    }}
                                    className="text-slate-400 hover:text-emerald-400 text-xs p-1"
                                  >
                                    <i className="fa-solid fa-copy"></i>
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400 flex items-center gap-1.5">
                                <i className="fa-solid fa-lock text-amber-400"></i> Room Password:
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-emerald-400 bg-slate-800 px-2.5 py-1 rounded text-xs select-all">
                                  {t.room_password || 'Pending'}
                                </span>
                                {t.room_password && (
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard?.writeText(t.room_password);
                                      showToast('Password copied');
                                    }}
                                    className="text-slate-400 hover:text-emerald-400 text-xs p-1"
                                  >
                                    <i className="fa-solid fa-copy"></i>
                                  </button>
                                )}
                              </div>
                            </div>

                            <p className="text-[10px] text-slate-500 pt-1 text-center border-t border-slate-800">
                              Open game app and enter custom room 10 minutes prior to match.
                            </p>
                          </div>
                        ) : (
                          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2.5 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                            <i className="fa-solid fa-circle-info text-cyan-400"></i>
                            <span>Room ID and Password will unlock once match is marked Live.</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="space-y-3.5">
                {myCompleted.length === 0 ? (
                  <div className="text-center py-12 bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                    <i className="fa-solid fa-clock-rotate-left text-3xl text-slate-600 mb-2"></i>
                    <h3 className="text-sm font-bold text-slate-300">No match history yet</h3>
                    <p className="text-xs text-slate-500 mt-1">Concluded matches and winning prizes will appear here.</p>
                  </div>
                ) : (
                  myCompleted.map(t => {
                    const isWinner = currentUser && t.winner_id === currentUser.id;
                    return (
                      <div key={t.id} className={`bg-[#111827] border ${isWinner ? 'border-amber-500/40 bg-amber-950/10' : 'border-slate-800'} rounded-2xl p-4`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{t.game_name}</span>
                          {isWinner ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              <i className="fa-solid fa-crown text-amber-400"></i> WINNER
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400">
                              Participated
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-white mb-2">{t.title}</h3>

                        <div className="flex items-center justify-between text-xs bg-slate-900/80 p-2.5 rounded-xl">
                          <div>
                            <span className="block text-[10px] text-slate-500">Prize Pool</span>
                            <span className="font-bold text-slate-300 font-mono">₹{t.prize_pool.toFixed(0)}</span>
                          </div>
                          <div className="text-right">
                            <span className="block text-[10px] text-slate-500">Result</span>
                            {isWinner ? (
                              <span className="font-black text-emerald-400 font-mono">+₹{t.prize_pool.toFixed(2)} Credited</span>
                            ) : (
                              <span className="text-slate-400">Match Concluded</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= VIEW: WALLET ================= */}
        {activeNav === 'wallet' && (
          <div className="space-y-4">
            {/* Big Wallet Card */}
            <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 border border-slate-700/80 rounded-2xl p-5 shadow-2xl overflow-hidden">
              <div className="absolute -right-4 -bottom-6 text-7xl text-emerald-500/10 pointer-events-none font-mono font-black">
                ₹
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <i className="fa-solid fa-wallet text-emerald-400"></i> Total Wallet Balance
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                  Active
                </span>
              </div>

              <div className="text-3xl font-black text-white font-mono tracking-tight my-2">
                ₹{currentUser ? currentUser.wallet_balance.toFixed(2) : '0.00'}
              </div>

              <div className="text-[11px] text-slate-400 mb-5">
                Linked UPI:{' '}
                <span className="font-mono text-emerald-400 font-semibold">
                  {currentUser?.upi_id ? currentUser.upi_id : 'Not linked (Tap profile)'}
                </span>
              </div>

              <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-2.5 text-[11px] text-amber-200 mb-3 flex items-start gap-2">
                <i className="fa-solid fa-shield-halved text-amber-400 mt-0.5"></i>
                <span>Notice: Cash deposits & bank withdrawals are paused pending payment gateway regulatory clearance. Free scrims & verified prizes remain accessible.</span>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(true)}
                  className="bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition"
                  title="Fiat deposits paused pending clearance"
                >
                  <i className="fa-solid fa-lock text-[10px] text-amber-400"></i> Add Money (Paused)
                </button>
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(true)}
                  className="bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition"
                  title="Cash withdrawals paused pending clearance"
                >
                  <i className="fa-solid fa-lock text-[10px] text-amber-400"></i> Withdraw (Paused)
                </button>
              </div>
            </div>

            {/* Pending Requests */}
            {(deposits.some(d => d.status === 'Pending') || withdrawals.some(w => w.status === 'Pending')) && (
              <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-3 text-xs space-y-2">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <i className="fa-solid fa-clock-rotate-left"></i> Pending Verifications
                </div>
                {deposits.filter(d => d.status === 'Pending').map(d => (
                  <div key={d.id} className="flex justify-between items-center text-slate-300 bg-slate-900/60 p-2 rounded-lg text-[11px]">
                    <div>
                      <span className="text-emerald-400 font-semibold">Deposit:</span> ₹{d.amount.toFixed(2)}
                      <span className="block text-[10px] text-slate-400 font-mono">UTR: {d.transaction_id}</span>
                    </div>
                    <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-[10px] font-bold">Verifying</span>
                  </div>
                ))}
                {withdrawals.filter(w => w.status === 'Pending').map(w => (
                  <div key={w.id} className="flex justify-between items-center text-slate-300 bg-slate-900/60 p-2 rounded-lg text-[11px]">
                    <div>
                      <span className="text-rose-400 font-semibold">Withdrawal:</span> ₹{w.amount.toFixed(2)}
                      <span className="block text-[10px] text-slate-400 font-mono">UPI: {w.upi_id}</span>
                    </div>
                    <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-[10px] font-bold">Processing</span>
                  </div>
                ))}
              </div>
            )}

            {/* Transaction History */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <i className="fa-solid fa-list-check text-slate-400"></i> Genuine Ledger
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setActiveNav('settings');
                    setSettingsSection('transactions');
                  }}
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1"
                >
                  <span>Full Ledger &amp; Receipts</span>
                  <i className="fa-solid fa-arrow-right text-[10px]"></i>
                </button>
              </div>

              <div className="space-y-2">
                {transactions.length === 0 ? (
                  <div className="text-center py-8 bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-500">
                    No transactions recorded yet.
                  </div>
                ) : (
                  transactions.map(tx => {
                    const isCredit = tx.type === 'credit';
                    return (
                      <div key={tx.id} className="bg-[#111827] border border-slate-800/90 rounded-xl p-3 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg ${isCredit ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'} flex items-center justify-center text-xs font-bold`}>
                            <i className={`fa-solid ${isCredit ? 'fa-arrow-down-left' : 'fa-arrow-up-right'}`}></i>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white leading-tight">{tx.description}</p>
                            <span className="text-[10px] text-slate-500">
                              {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        <div className={`text-right font-mono font-bold text-xs ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isCredit ? '+' : '-'}₹{tx.amount.toFixed(2)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= VIEW: LEADERBOARD ================= */}
        {activeNav === 'leaderboard' && (
          <Leaderboard
            currentTheme={currentTheme}
            onJoinMatchClick={() => setActiveNav('matches')}
            onShowToast={(msg, type) => showToast(msg, type)}
          />
        )}

        {/* ================= VIEW: SETTINGS ================= */}
        {activeNav === 'settings' && (
          <div>
            {currentUser ? (
              <SettingsHub
                user={currentUser}
                initialSection={settingsSection}
                onNavigateTab={(tab) => {
                  if (tab === 'profile') setActiveNav('settings');
                  else setActiveNav(tab);
                }}
                onLogout={() => {
                  appStore.setCurrentUser(null);
                  showToast('Logged out of Clutch Arena');
                  setActiveNav('home');
                }}
                onToast={(msg) => showToast(msg)}
              />
            ) : (
              <div className="text-center py-12 bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                <i className="fa-solid fa-user-lock text-3xl text-slate-600 mb-2"></i>
                <h3 className="text-sm font-bold text-slate-300">Sign In Required</h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">Log in to view and customize your esports settings, Free Fire UID, and transaction ledgers.</p>
                <button 
                  onClick={() => setShowAuthModal(true)}
                  className="bg-gradient-to-r from-purple-600 to-cyan-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-md shadow-purple-500/20"
                >
                  Sign In / Sign Up
                </button>
              </div>
            )}
          </div>
        )}

      </main>

      {/* ================= FIXED BOTTOM NAV ================= */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0f172a]/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 max-w-md mx-auto">
        <div className="flex items-center justify-around">
          
          <button 
            onClick={() => setActiveNav('home')} 
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition ${activeNav === 'home' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <i className={`fa-solid fa-house text-base mb-0.5 ${activeNav === 'home' ? 'scale-110 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]' : ''}`}></i>
            <span className="text-[9px]">Home</span>
          </button>

          <button 
            onClick={() => setActiveNav('matches')} 
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition ${activeNav === 'matches' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <i className={`fa-solid fa-trophy text-base mb-0.5 ${activeNav === 'matches' ? 'scale-110 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]' : ''}`}></i>
            <span className="text-[9px]">Matches</span>
          </button>

          <button 
            onClick={() => setActiveNav('leaderboard')} 
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition ${activeNav === 'leaderboard' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <i className={`fa-solid fa-ranking-star text-base mb-0.5 ${activeNav === 'leaderboard' ? 'scale-110 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] text-amber-400' : ''}`}></i>
            <span className="text-[9px]">Rankings</span>
          </button>

          <button 
            onClick={() => setActiveNav('wallet')} 
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition ${activeNav === 'wallet' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <i className={`fa-solid fa-wallet text-base mb-0.5 ${activeNav === 'wallet' ? 'scale-110 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]' : ''}`}></i>
            <span className="text-[9px]">Wallet</span>
          </button>

          <button 
            onClick={() => {
              setActiveNav('settings');
              setSettingsSection('hub');
            }} 
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl relative transition ${activeNav === 'settings' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <i className={`fa-solid fa-gear text-base mb-0.5 ${activeNav === 'settings' ? 'scale-110 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)] rotate-12 transition-transform' : ''}`}></i>
            <span className="text-[9px]">Settings</span>
            {currentUser && appStore.getNotifications(currentUser.id).some(n => !n.read) && (
              <span className="absolute top-0.5 right-2 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-[#0f172a] animate-pulse"></span>
            )}
          </button>

        </div>
      </nav>

      {/* ================= MODAL: ADD MONEY (UPI DEPOSIT) ================= */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-qrcode text-emerald-400"></i> Add Money via UPI
              </h3>
              <button onClick={() => setShowDepositModal(false)} className="text-slate-400 hover:text-white p-1">
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mb-3 text-center">
              Scan QR or copy Admin UPI ID, pay via GPay/PhonePe/Paytm, then paste your 12-digit UTR ID.
            </p>

            {/* Admin QR Code display */}
            <div className="bg-white p-2.5 rounded-xl mx-auto w-44 h-44 flex items-center justify-center shadow-md mb-3">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=upi://pay?pa=${encodeURIComponent(settings.admin_upi_id)}%26pn=AdeptPlay%26cu=INR`} 
                alt="Adept Play Admin UPI QR" 
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {/* Admin UPI ID Box */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 mb-3 flex items-center justify-between text-xs">
              <div>
                <span className="block text-[10px] text-slate-500">Admin UPI ID:</span>
                <span className="font-mono font-bold text-emerald-400 select-all">{settings.admin_upi_id}</span>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  navigator.clipboard?.writeText(settings.admin_upi_id);
                  showToast('Admin UPI ID copied');
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-[10px] font-semibold"
              >
                <i className="fa-solid fa-copy mr-1"></i> Copy
              </button>
            </div>

            {/* Deposit Request Form */}
            <form onSubmit={handleDepositSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Amount Paid (₹)</label>
                <input 
                  type="number" 
                  min="10" 
                  value={depositAmount} 
                  onChange={e => setDepositAmount(e.target.value)} 
                  required 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500" 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">UPI Transaction ID / UTR</label>
                <input 
                  type="text" 
                  value={depositTxnId} 
                  onChange={e => setDepositTxnId(e.target.value)} 
                  placeholder="12-digit Ref / UTR number" 
                  required 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500" 
                />
                <span className="text-[10px] text-slate-500">e.g. 428192038194 from PhonePe / Google Pay</span>
              </div>

              <div className="bg-amber-950/40 border border-amber-500/30 p-2.5 rounded-xl text-[10px] text-amber-200 text-center">
                <i className="fa-solid fa-shield-halved mr-1"></i> Cash deposits paused pending payment aggregator clearance.
              </div>
              <button 
                type="button" 
                disabled
                className="w-full bg-slate-800 text-slate-400 font-bold py-2.5 rounded-xl text-xs border border-slate-700 cursor-not-allowed opacity-70"
                title="Deposits paused pending clearance"
              >
                Deposits Paused (Pending Clearance)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: WITHDRAW MONEY ================= */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-money-bill-transfer text-emerald-400"></i> Withdraw to UPI
              </h3>
              <button onClick={() => setShowWithdrawModal(false)} className="text-slate-400 hover:text-white p-1">
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>

            {!currentUser?.upi_id ? (
              <div className="bg-amber-950/40 border border-amber-500/40 text-amber-300 p-3 rounded-xl mb-4 text-xs">
                <p className="font-bold">No UPI ID saved!</p>
                <p className="text-[11px] mt-1 text-amber-200/80">Please enter your UPI ID in Profile first before requesting withdrawal.</p>
                <button 
                  onClick={() => { setShowWithdrawModal(false); setActiveNav('settings'); setSettingsSection('account'); }}
                  className="mt-2 bg-cyan-500 text-slate-950 font-bold px-3 py-1 rounded-lg text-[10px]"
                >
                  Go to Account Settings &rarr;
                </button>
              </div>
            ) : (
              <form onSubmit={handleWithdrawSubmit} className="space-y-3">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs">
                  <span className="block text-[10px] text-slate-500 mb-0.5">Target UPI ID for Payout:</span>
                  <span className="font-mono font-bold text-emerald-400 select-all">{currentUser.upi_id}</span>
                  <span className="block text-[10px] text-slate-500 mt-1">Available: ₹{currentUser.wallet_balance.toFixed(2)}</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Amount to Withdraw (₹)</label>
                  <input 
                    type="number" 
                    min="50" 
                    max={currentUser.wallet_balance} 
                    value={withdrawAmount} 
                    onChange={e => setWithdrawAmount(e.target.value)} 
                    required 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500" 
                  />
                  <span className="text-[10px] text-slate-500">Min ₹50 &bull; Processed manually within 2-4 hours</span>
                </div>

                <div className="bg-amber-950/40 border border-amber-500/30 p-2.5 rounded-xl text-[10px] text-amber-200 text-center">
                  <i className="fa-solid fa-shield-halved mr-1"></i> Cash withdrawals paused pending regulatory compliance.
                </div>

                <button 
                  type="button" 
                  disabled
                  className="w-full bg-slate-800 text-slate-400 font-bold py-2.5 rounded-xl text-xs border border-slate-700 cursor-not-allowed opacity-70"
                  title="Withdrawals paused pending clearance"
                >
                  Withdrawals Paused (Pending Clearance)
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: AUTHENTICATION ================= */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 w-full max-w-sm rounded-2xl p-5 shadow-2xl relative">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <i className="fa-solid fa-xmark text-base"></i>
            </button>

            <div className="text-center mb-4">
              <h2 className="text-base font-black text-white">CLUTCH<span className={currentTheme.textColor}>ARENA</span></h2>
              <p className="text-xs text-slate-400">Mobile Esports Platform</p>
            </div>

            <div className="grid grid-cols-2 bg-slate-900 p-1 rounded-xl mb-4 border border-slate-800">
              <button 
                type="button" 
                onClick={() => setAuthTab('login')}
                className={`py-2 text-xs font-bold rounded-lg transition ${authTab === 'login' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}
              >
                Sign In
              </button>
              <button 
                type="button" 
                onClick={() => setAuthTab('signup')}
                className={`py-2 text-xs font-bold rounded-lg transition ${authTab === 'signup' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}
              >
                Sign Up (+₹50 Bonus)
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Username</label>
                <input 
                  type="text" 
                  required 
                  value={authUsername} 
                  onChange={e => setAuthUsername(e.target.value)} 
                  placeholder="e.g. gamer_akash" 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500" 
                />
              </div>

              {authTab === 'signup' && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">Email</label>
                  <input 
                    type="email" 
                    required 
                    value={authEmail} 
                    onChange={e => setAuthEmail(e.target.value)} 
                    placeholder="name@domain.com" 
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500" 
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Password</label>
                <input 
                  type="password" 
                  required 
                  value={authPassword} 
                  onChange={e => setAuthPassword(e.target.value)} 
                  placeholder="••••••••" 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500" 
                />
              </div>

              <button 
                type="submit" 
                disabled={isSubmittingAuth}
                className={`w-full bg-gradient-to-r ${currentTheme.gradient} hover:opacity-90 text-slate-950 font-bold py-2.5 rounded-xl text-xs shadow-md shadow-emerald-500/25 transition mt-2 flex items-center justify-center gap-1.5 min-h-[44px] ${isSubmittingAuth ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSubmittingAuth ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <span>{authTab === 'login' ? 'Sign In to Arena' : 'Register Free (+₹50 Bonus)'}</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: THEME SELECTION ================= */}
      {showThemeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-700 w-full max-w-sm rounded-2xl p-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-palette text-amber-400"></i> Select Arena Theme
              </h3>
              <button onClick={() => setShowThemeModal(false)} className="text-slate-400 hover:text-white p-1">
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mb-4">
              Customize the look and feel of Clutch Arena. All buttons, badges, and accents adapt instantly.
            </p>

            <div className="space-y-2 mb-4">
              {AVAILABLE_THEMES.map(th => {
                const isSelected = th.id === currentTheme.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => {
                      appStore.setTheme(th.id);
                      showToast(`Applied ${th.name} theme!`);
                      setShowThemeModal(false);
                    }}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition ${isSelected ? 'bg-slate-800 border-white/40 ring-1 ring-white/20' : 'bg-slate-900 border-slate-800 hover:bg-slate-800/60'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${th.gradient} flex items-center justify-center text-slate-950 font-bold text-xs`}>
                        <i className={`fa-solid ${th.icon}`}></i>
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-bold text-white block">{th.name}</span>
                        <span className={`text-[10px] ${th.textColor}`}>Live Accent</span>
                      </div>
                    </div>

                    {isSelected ? (
                      <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                        <i className="fa-solid fa-circle-check"></i> Active
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">Select &rarr;</span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowThemeModal(false)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2 rounded-xl text-xs border border-slate-700"
            >
              Done
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
