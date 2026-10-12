import React, { useState } from 'react';
import { appStore, AVAILABLE_THEMES } from '../../services/store';
import { PlayerAnalytics } from './PlayerAnalytics';

interface AdminAppProps {
  onSwitchToUser: () => void;
}

export const AdminApp: React.FC<AdminAppProps> = ({ onSwitchToUser }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tournaments' | 'manage' | 'deposits' | 'withdrawals' | 'users' | 'analytics' | 'settings'>('dashboard');
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(null);

  // Re-sync with store
  const [, setTick] = useState(0);
  React.useEffect(() => {
    return appStore.subscribe(() => setTick(t => t + 1));
  }, []);

  const users = appStore.getUsers();
  const tournaments = appStore.getTournaments();
  const deposits = appStore.getDeposits();
  const withdrawals = appStore.getWithdrawals();
  const settings = appStore.getSettings();
  const currentTheme = appStore.getTheme();

  const pendingDeposits = deposits.filter(d => d.status === 'Pending');
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'Pending');

  // Stats
  const totalPrizeDistributed = tournaments
    .filter(t => t.status === 'Completed' && t.winner_id)
    .reduce((sum, t) => sum + t.prize_pool, 0);

  const totalRevenue = tournaments
    .filter(t => t.status === 'Completed')
    .reduce((sum, t) => sum + (t.entry_fee * t.participant_ids.length * (t.commission_percent / 100)), 0);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Create Tournament Form
  const [newTitle, setNewTitle] = useState('');
  const [newGame, setNewGame] = useState('BGMI');
  const [newEntryFee, setNewEntryFee] = useState('20');
  const [newPrizePool, setNewPrizePool] = useState('400');
  const [newCommission, setNewCommission] = useState('20');
  const [newMatchTime, setNewMatchTime] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 16));

  // Manage Tournament Form
  const selectedTournament = tournaments.find(t => t.id === selectedTournamentId);
  const [editRoomId, setEditRoomId] = useState('');
  const [editRoomPass, setEditRoomPass] = useState('');
  const [editStatus, setEditStatus] = useState<'Upcoming' | 'Live' | 'Completed'>('Upcoming');
  const [winnerParticipantId, setWinnerParticipantId] = useState<string>('');

  // When opening manage
  const openManageTournament = (id: number) => {
    const tour = tournaments.find(t => t.id === id);
    if (tour) {
      setSelectedTournamentId(id);
      setEditRoomId(tour.room_id || '');
      setEditRoomPass(tour.room_password || '');
      setEditStatus(tour.status);
      setWinnerParticipantId(tour.winner_id ? String(tour.winner_id) : '');
      setActiveTab('manage');
    }
  };

  // Settings State
  const [adminUpiInput, setAdminUpiInput] = useState(settings.admin_upi_id);
  const [adminQrInput, setAdminQrInput] = useState(settings.admin_qr_code);

  const handleCreateTournament = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showToast('Tournament title cannot be empty', 'error');
      return;
    }
    const res = appStore.createTournament({
      title: newTitle.trim(),
      game_name: newGame,
      entry_fee: parseFloat(newEntryFee) || 0,
      prize_pool: parseFloat(newPrizePool) || 0,
      commission_percent: parseFloat(newCommission) || 20,
      match_time: newMatchTime,
    });
    showToast(res.message, 'success');
    setNewTitle('');
    setActiveTab('tournaments');
  };

  const handleUpdateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournamentId) return;
    const res = appStore.updateRoom(selectedTournamentId, editRoomId, editRoomPass, editStatus);
    showToast(res.message, 'success');
  };

  const handleDeclareWinner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournamentId) return;
    const winnerId = parseInt(winnerParticipantId);
    if (!winnerId) {
      showToast('Please select a participant winner', 'error');
      return;
    }
    const res = appStore.declareWinner(selectedTournamentId, winnerId);
    if (res.success) {
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
  };

  return (
    <div className={`w-full max-w-md mx-auto ${currentTheme.bgDark} min-h-screen text-slate-100 flex flex-col relative select-none shadow-2xl border-x border-slate-800`}>
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-2xl flex items-center gap-2 max-w-sm w-[90%] ${toast.type === 'success' ? 'bg-indigo-950/90 text-indigo-200 border border-indigo-500/50' : 'bg-rose-950/90 text-rose-200 border border-rose-500/50'}`}>
          <i className={`fa-solid ${toast.type === 'success' ? 'fa-circle-check text-indigo-400' : 'fa-circle-exclamation text-rose-400'}`}></i>
          <span className="flex-1">{toast.message}</span>
        </div>
      )}

      {/* Admin Top Header */}
      <header className="sticky top-0 z-40 bg-[#0f172a]/95 backdrop-blur-md border-b border-indigo-950/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-black">
            <i className="fa-solid fa-shield-halved text-base"></i>
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight text-white block leading-none">CLUTCH<span className="text-indigo-400">ADMIN</span></span>
            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Control Center</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={onSwitchToUser}
            className="text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5"
          >
            <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i> User App
          </button>
        </div>
      </header>

      {/* Admin Main Body */}
      <main className="flex-1 px-4 py-4 pb-24 overflow-y-auto">

        {/* ================= ADMIN VIEW: DASHBOARD ================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-base font-black text-white">System Dashboard</h1>
                <p className="text-xs text-slate-400">Esports Platform Overview</p>
              </div>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full font-bold">
                Online
              </span>
            </div>

            {/* 4 Quick Stat Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-3.5 shadow-md">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] font-medium">Total Gamers</span>
                  <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs">
                    <i className="fa-solid fa-users"></i>
                  </div>
                </div>
                <div className="text-xl font-black text-white font-mono">{users.length}</div>
                <button onClick={() => setActiveTab('users')} className="text-[10px] text-indigo-400 font-semibold hover:underline mt-1">
                  Manage gamers &rarr;
                </button>
              </div>

              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-3.5 shadow-md">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] font-medium">Tournaments</span>
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs">
                    <i className="fa-solid fa-trophy"></i>
                  </div>
                </div>
                <div className="text-xl font-black text-white font-mono">{tournaments.length}</div>
                <button onClick={() => setActiveTab('tournaments')} className="text-[10px] text-amber-400 font-semibold hover:underline mt-1">
                  View matches &rarr;
                </button>
              </div>

              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-3.5 shadow-md">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] font-medium">Prize Distributed</span>
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">
                    <i className="fa-solid fa-sack-dollar"></i>
                  </div>
                </div>
                <div className="text-lg font-black text-emerald-400 font-mono">₹{totalPrizeDistributed.toFixed(0)}</div>
                <span className="text-[10px] text-slate-500">Credited to winners</span>
              </div>

              <div className="bg-[#111827] border border-slate-800 rounded-2xl p-3.5 shadow-md">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] font-medium">Platform Revenue</span>
                  <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs">
                    <i className="fa-solid fa-chart-line"></i>
                  </div>
                </div>
                <div className="text-lg font-black text-purple-300 font-mono">₹{totalRevenue.toFixed(2)}</div>
                <span className="text-[10px] text-slate-500">From match fees</span>
              </div>
            </div>

            {/* Top Player Analytics Widget on Dashboard */}
            <div className="bg-[#111827] border border-indigo-500/30 rounded-2xl p-3.5 shadow-md space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs">
                    <i className="fa-solid fa-chart-line"></i>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Top Player Analytics</h3>
                    <p className="text-[9px] text-slate-400">Performance rankings & XP intelligence</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className="text-[11px] text-indigo-400 font-bold hover:underline flex items-center gap-1"
                >
                  Full View &rarr;
                </button>
              </div>

              {(() => {
                const summary = appStore.getPlayerAnalytics();
                return (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-500 block">MVP Champion</span>
                        <span className="font-bold text-amber-400 block text-xs truncate">
                          👑 {summary.topWinner?.user.username || 'N/A'}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {summary.topWinner ? `${summary.topWinner.total_wins} Wins • ${summary.topWinner.win_rate}% Win` : '0 wins'}
                        </span>
                      </div>

                      <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-500 block">Apex XP Leader</span>
                        <span className="font-bold text-purple-300 block text-xs truncate">
                          ⚡ {summary.topXPGamer?.user.username || 'N/A'}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {summary.topXPGamer ? `${summary.topXPGamer.accumulated_xp.toLocaleString()} XP (Lv. ${summary.topXPGamer.level})` : '0 XP'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-indigo-950/30 px-2.5 py-1.5 rounded-xl border border-indigo-500/20 text-[10px]">
                      <span className="text-slate-300">
                        Total XP: <strong className="text-indigo-300 font-mono">{summary.totalXP.toLocaleString()}</strong>
                      </span>
                      <span className="text-slate-300">
                        Avg Win Rate: <strong className="text-emerald-400 font-mono">{summary.averageWinRate}%</strong>
                      </span>
                    </div>

                    {/* Top 3 Player Snippet */}
                    <div className="space-y-1 pt-0.5">
                      {summary.topPlayers.slice(0, 3).map((tp, idx) => (
                        <div key={tp.user.id} className="flex items-center justify-between text-[10px] bg-slate-900/60 px-2 py-1.5 rounded-lg border border-slate-800/80">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-indigo-400 text-[10px]">#{idx + 1}</span>
                            <span className="text-white font-semibold truncate max-w-[110px]">{tp.user.username}</span>
                            <span className="text-[8px] px-1 py-0.2 rounded bg-slate-800 text-slate-300">{tp.tier}</span>
                          </div>
                          <span className="font-mono text-amber-400 font-bold">{tp.total_wins} wins &bull; {tp.accumulated_xp.toLocaleString()} XP</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Quick Action Buttons */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Operations</div>

              <div className="grid grid-cols-2 gap-2.5">
                <button 
                  onClick={() => setActiveTab('tournaments')}
                  className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold p-3 rounded-xl text-xs flex items-center gap-2.5 shadow-lg shadow-indigo-600/20"
                >
                  <i className="fa-solid fa-circle-plus text-base"></i>
                  <span>Create Tournament</span>
                </button>

                <button 
                  onClick={() => setActiveTab('settings')}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold p-3 rounded-xl text-xs flex items-center gap-2.5 border border-slate-700"
                >
                  <i className="fa-solid fa-qrcode text-base text-emerald-400"></i>
                  <span>UPI & QR Settings</span>
                </button>
              </div>

              {/* Player Analytics Operations Bar */}
              <button 
                onClick={() => setActiveTab('analytics')}
                className="w-full bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/60 hover:from-indigo-900/80 hover:to-purple-900/60 border border-indigo-500/40 text-indigo-200 font-semibold p-2.5 rounded-xl text-xs flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs">
                    <i className="fa-solid fa-chart-line"></i>
                  </div>
                  <div className="text-left">
                    <span className="block font-bold text-white text-xs">Top Player Analytics Command</span>
                    <span className="text-[10px] text-slate-400">Rankings, tier distribution, CSV reports & bonus XP</span>
                  </div>
                </div>
                <i className="fa-solid fa-chevron-right text-xs text-indigo-400 group-hover:translate-x-0.5 transition-transform"></i>
              </button>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button 
                  onClick={() => setActiveTab('deposits')}
                  className="bg-[#111827] border border-slate-800 hover:border-emerald-500/40 p-2.5 rounded-xl text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 text-slate-300">
                    <i className="fa-solid fa-arrow-down-to-bracket text-emerald-400"></i>
                    <span>Deposit Requests</span>
                  </div>
                  <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold text-[10px]">
                    {pendingDeposits.length}
                  </span>
                </button>

                <button 
                  onClick={() => setActiveTab('withdrawals')}
                  className="bg-[#111827] border border-slate-800 hover:border-rose-500/40 p-2.5 rounded-xl text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 text-slate-300">
                    <i className="fa-solid fa-arrow-up-from-bracket text-rose-400"></i>
                    <span>Withdrawals</span>
                  </div>
                  <span className="bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded font-mono font-bold text-[10px]">
                    {pendingWithdrawals.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Tournaments List in Dashboard */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <i className="fa-solid fa-gamepad text-indigo-400"></i> Active Tournaments
                </h3>
                <button onClick={() => setActiveTab('tournaments')} className="text-[11px] text-indigo-400 hover:underline">
                  View All &rarr;
                </button>
              </div>

              <div className="space-y-2">
                {tournaments.slice(0, 4).map(t => (
                  <div key={t.id} className="bg-[#111827] border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase">{t.game_name}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${t.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-300' : (t.status === 'Live' ? 'bg-rose-500/20 text-rose-300' : 'bg-blue-500/20 text-blue-300')}`}>
                          {t.status}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white leading-tight">{t.title}</h4>
                      <span className="text-[10px] text-slate-400">Joined: {t.participant_ids.length} &bull; Prize: ₹{t.prize_pool.toFixed(0)}</span>
                    </div>

                    <button 
                      onClick={() => openManageTournament(t.id)}
                      className="bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition"
                    >
                      Manage
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= ADMIN VIEW: TOURNAMENTS ================= */}
        {activeTab === 'tournaments' && (
          <div className="space-y-4">
            {/* Create Tournament Form */}
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-xl">
              <h2 className="text-xs font-bold text-white mb-3 flex items-center gap-2 border-b border-slate-800 pb-2">
                <i className="fa-solid fa-plus-circle text-indigo-400"></i> Create New Tournament
              </h2>

              <form onSubmit={handleCreateTournament} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">Tournament Title</label>
                  <input 
                    type="text" 
                    value={newTitle} 
                    onChange={e => setNewTitle(e.target.value)} 
                    required 
                    placeholder="e.g. Free Fire Bermuda Squad Rush" 
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">Game Name</label>
                    <select 
                      value={newGame} 
                      onChange={e => setNewGame(e.target.value)} 
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="BGMI">BGMI</option>
                      <option value="Free Fire">Free Fire</option>
                      <option value="COD Mobile">COD Mobile</option>
                      <option value="TDM">4v4 TDM</option>
                      <option value="Valorant Mobile">Valorant Mobile</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">Schedule Time</label>
                    <input 
                      type="datetime-local" 
                      value={newMatchTime} 
                      onChange={e => setNewMatchTime(e.target.value)} 
                      required 
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-300 mb-1">Entry Fee (₹)</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={newEntryFee} 
                      onChange={e => setNewEntryFee(e.target.value)} 
                      required 
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-slate-300 mb-1">Prize Pool (₹)</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={newPrizePool} 
                      onChange={e => setNewPrizePool(e.target.value)} 
                      required 
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-slate-300 mb-1">Comm. %</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      value={newCommission} 
                      onChange={e => setNewCommission(e.target.value)} 
                      required 
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500" 
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-md shadow-indigo-600/25 transition"
                >
                  Publish Tournament
                </button>
              </form>
            </div>

            {/* List of Tournaments */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 mb-2">All Tournaments ({tournaments.length})</h3>
              <div className="space-y-2.5">
                {tournaments.map(t => (
                  <div key={t.id} className="bg-[#111827] border border-slate-800 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase">{t.game_name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-300' : (t.status === 'Live' ? 'bg-rose-500/20 text-rose-300' : 'bg-blue-500/20 text-blue-300')}`}>
                        {t.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-white">{t.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        <i className="fa-regular fa-clock mr-1"></i>{new Date(t.match_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs bg-slate-900/80 p-2 rounded-lg font-mono">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Entry / Prize</span>
                        <span className="text-emerald-400 font-bold">₹{t.entry_fee.toFixed(0)}</span> / <span className="text-amber-400 font-bold">₹{t.prize_pool.toFixed(0)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Players</span>
                        <span className="text-slate-300 font-bold">{t.participant_ids.length} joined</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button 
                        onClick={() => openManageTournament(t.id)}
                        className="bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1"
                      >
                        <i className="fa-solid fa-sliders text-[10px]"></i> Manage & Winner
                      </button>

                      <button 
                        onClick={() => {
                          if (confirm(`Delete tournament "${t.title}"?`)) {
                            appStore.deleteTournament(t.id);
                            showToast('Tournament deleted');
                          }
                        }}
                        className="bg-rose-950/60 hover:bg-rose-900 text-rose-400 px-2.5 py-1.5 rounded-lg text-xs transition"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= ADMIN VIEW: MANAGE TOURNAMENT ================= */}
        {activeTab === 'manage' && selectedTournament && (
          <div className="space-y-4">
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-1.5">
                <button onClick={() => setActiveTab('tournaments')} className="text-xs text-indigo-400 hover:underline flex items-center gap-1 font-semibold">
                  <i className="fa-solid fa-arrow-left"></i> All Matches
                </button>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                  {selectedTournament.status}
                </span>
              </div>
              <h2 className="text-base font-bold text-white">{selectedTournament.title}</h2>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                <span>Prize: <strong className="text-amber-400">₹{selectedTournament.prize_pool.toFixed(0)}</strong></span>
                <span>Fee: <strong className="text-emerald-400">₹{selectedTournament.entry_fee.toFixed(0)}</strong></span>
                <span>Joined: <strong className="text-slate-300">{selectedTournament.participant_ids.length}</strong></span>
              </div>
            </div>

            {/* Room Credentials Form */}
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-md">
              <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2 border-b border-slate-800 pb-2">
                <i className="fa-solid fa-key text-amber-400"></i> Custom Room Credentials & Status
              </h3>

              <form onSubmit={handleUpdateRoom} className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">Room ID</label>
                    <input 
                      type="text" 
                      value={editRoomId} 
                      onChange={e => setEditRoomId(e.target.value)} 
                      placeholder="e.g. 5839201" 
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500" 
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">Room Password</label>
                    <input 
                      type="text" 
                      value={editRoomPass} 
                      onChange={e => setEditRoomPass(e.target.value)} 
                      placeholder="e.g. 1234" 
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">Match Status</label>
                  <select 
                    value={editStatus} 
                    onChange={e => setEditStatus(e.target.value as any)} 
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Upcoming">Upcoming (Registration open)</option>
                    <option value="Live">Live (Room credentials visible to players)</option>
                    <option value="Completed">Completed (Concluded)</option>
                  </select>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-xl text-xs border border-slate-700 transition"
                >
                  Save Room Details & Status
                </button>
              </form>
            </div>

            {/* Declare Winner Form */}
            <div className="bg-[#111827] border border-amber-950/60 rounded-2xl p-4 shadow-md">
              <h3 className="text-xs font-bold text-amber-300 mb-3 flex items-center gap-2 border-b border-slate-800 pb-2">
                <i className="fa-solid fa-crown text-amber-400"></i> Declare Winner & Distribute Prize
              </h3>

              {selectedTournament.status === 'Completed' && selectedTournament.winner_id ? (
                <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3 text-xs text-emerald-300">
                  <p className="font-bold flex items-center gap-1.5 text-emerald-200">
                    <i className="fa-solid fa-trophy text-amber-400"></i> Winner Declared:{' '}
                    {users.find(u => u.id === selectedTournament.winner_id)?.username || `ID #${selectedTournament.winner_id}`}
                  </p>
                  <p className="text-[11px] text-emerald-300/80 mt-1">
                    Prize of ₹{selectedTournament.prize_pool.toFixed(2)} credited to winner's wallet.
                  </p>
                </div>
              ) : selectedTournament.participant_ids.length === 0 ? (
                <p className="text-xs text-slate-500">No participants have joined this match yet.</p>
              ) : (
                <form onSubmit={handleDeclareWinner} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">Select Winning Participant</label>
                    <select 
                      value={winnerParticipantId} 
                      onChange={e => setWinnerParticipantId(e.target.value)} 
                      required 
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="">-- Choose Participant --</option>
                      {selectedTournament.participant_ids.map(uid => {
                        const u = users.find(usr => usr.id === uid);
                        return (
                          <option key={uid} value={uid}>
                            {u ? u.username : `User #${uid}`}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="bg-amber-950/30 p-2.5 rounded-xl border border-amber-500/20 text-[11px] text-amber-300/90">
                    Distributes <strong className="text-white">₹{selectedTournament.prize_pool.toFixed(2)}</strong> immediately to winner wallet.
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black py-2.5 rounded-xl text-xs shadow-lg shadow-amber-500/20 transition"
                  >
                    <i className="fa-solid fa-crown mr-1"></i> Declare Winner & Distribute Prize
                  </button>
                </form>
              )}
            </div>

            {/* Participants list */}
            <div>
              <h3 className="text-xs font-bold text-white mb-2">Registered Players ({selectedTournament.participant_ids.length})</h3>
              <div className="space-y-2">
                {selectedTournament.participant_ids.map((uid, index) => {
                  const u = users.find(usr => usr.id === uid);
                  const isWinner = selectedTournament.winner_id === uid;
                  return (
                    <div key={uid} className={`bg-[#111827] border ${isWinner ? 'border-amber-500 bg-amber-950/20' : 'border-slate-800'} rounded-xl p-3 flex items-center justify-between text-xs`}>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-[10px]">
                          #{index + 1}
                        </span>
                        <div>
                          <span className="font-bold text-white">{u?.username || `Player #${uid}`}</span>
                          <span className="text-[10px] text-slate-500 block font-mono">UPI: {u?.upi_id || 'Not set'}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] font-mono text-emerald-400 font-bold">
                          ₹{u ? u.wallet_balance.toFixed(2) : '0.00'}
                        </span>
                        {isWinner && <span className="block text-[9px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded mt-0.5">WINNER</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= ADMIN VIEW: DEPOSIT REQUESTS (FOLLOW-UP 1) ================= */}
        {activeTab === 'deposits' && (
          <div className="space-y-4">
            <div>
              <h1 className="text-base font-black text-white flex items-center gap-2">
                <i className="fa-solid fa-arrow-down-to-bracket text-emerald-400"></i> UPI Deposit Requests
              </h1>
              <p className="text-xs text-slate-400">Verify 12-digit UTR in bank statement, then approve to credit wallet</p>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-300">Pending Requests ({pendingDeposits.length})</div>

              {pendingDeposits.length === 0 ? (
                <div className="text-center py-8 bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-500">
                  <i className="fa-solid fa-circle-check text-2xl text-emerald-500/40 mb-1.5 block"></i>
                  All deposit requests have been processed!
                </div>
              ) : (
                pendingDeposits.map(d => (
                  <div key={d.id} className="bg-[#111827] border border-emerald-500/30 rounded-2xl p-4 shadow-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <i className="fa-solid fa-user text-slate-400 text-[10px]"></i> {d.username}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(d.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-emerald-400 font-mono">₹{d.amount.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs">
                      <span className="block text-[10px] text-slate-500 mb-0.5">Player Provided UTR / Transaction ID:</span>
                      <span className="font-mono font-bold text-amber-300 select-all tracking-wider text-sm">{d.transaction_id}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => {
                          const res = appStore.approveDeposit(d.id);
                          showToast(res.message, 'success');
                        }}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2 rounded-xl text-xs shadow-md shadow-emerald-500/20 transition flex items-center justify-center gap-1.5"
                      >
                        <i className="fa-solid fa-check"></i> Approve & Credit
                      </button>

                      <button
                        onClick={() => {
                          const res = appStore.rejectDeposit(d.id);
                          showToast(res.message, 'error');
                        }}
                        className="bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-300 font-semibold py-2 rounded-xl text-xs border border-slate-700 transition flex items-center justify-center gap-1.5"
                      >
                        <i className="fa-solid fa-xmark"></i> Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* History */}
            <div className="border-t border-slate-800 pt-3">
              <h3 className="text-xs font-bold text-slate-400 mb-2">History</h3>
              <div className="space-y-2">
                {deposits.filter(d => d.status !== 'Pending').map(d => (
                  <div key={d.id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white">{d.username}</span>
                      <span className="block text-[10px] text-slate-500 font-mono">UTR: {d.transaction_id}</span>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold font-mono text-xs block ${d.status === 'Completed' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ₹{d.amount.toFixed(2)}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${d.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {d.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= ADMIN VIEW: WITHDRAWAL REQUESTS (FOLLOW-UP 1) ================= */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-4">
            <div>
              <h1 className="text-base font-black text-white flex items-center gap-2">
                <i className="fa-solid fa-arrow-up-from-bracket text-rose-400"></i> Withdrawal Payout Requests
              </h1>
              <p className="text-xs text-slate-400">Send money via your UPI app to user's UPI address, then mark Completed</p>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-300">Pending Payouts ({pendingWithdrawals.length})</div>

              {pendingWithdrawals.length === 0 ? (
                <div className="text-center py-8 bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-500">
                  <i className="fa-solid fa-circle-check text-2xl text-emerald-500/40 mb-1.5 block"></i>
                  No pending withdrawal requests.
                </div>
              ) : (
                pendingWithdrawals.map(w => (
                  <div key={w.id} className="bg-[#111827] border border-rose-500/30 rounded-2xl p-4 shadow-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <i className="fa-solid fa-user text-slate-400 text-[10px]"></i> {w.username}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(w.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-rose-400 font-mono">₹{w.amount.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs flex items-center justify-between">
                      <div>
                        <span className="block text-[10px] text-slate-500 mb-0.5">Player's Target UPI ID:</span>
                        <span className="font-mono font-bold text-emerald-400 select-all tracking-wider text-sm">{w.upi_id}</span>
                      </div>
                      <button 
                        onClick={() => {
                          navigator.clipboard?.writeText(w.upi_id);
                          showToast('Player UPI ID copied');
                        }}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded text-[10px] font-semibold"
                      >
                        Copy UPI
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => {
                          const res = appStore.completeWithdrawal(w.id);
                          showToast(res.message, 'success');
                        }}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2 rounded-xl text-xs shadow-md shadow-emerald-500/20 transition flex items-center justify-center gap-1.5"
                      >
                        <i className="fa-solid fa-check-double"></i> Mark Paid & Done
                      </button>

                      <button
                        onClick={() => {
                          const res = appStore.rejectWithdrawal(w.id);
                          showToast(res.message, 'error');
                        }}
                        className="bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-300 font-semibold py-2 rounded-xl text-xs border border-slate-700 transition flex items-center justify-center gap-1.5"
                      >
                        <i className="fa-solid fa-rotate-left"></i> Reject & Refund
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================= ADMIN VIEW: USERS ================= */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-base font-black text-white flex items-center gap-2">
                  <i className="fa-solid fa-users text-indigo-400"></i> Registered Gamers ({users.length})
                </h1>
                <p className="text-xs text-slate-400">Player accounts, wallet balances, and status controls</p>
              </div>
              <button
                onClick={() => setActiveTab('analytics')}
                className="bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/30 text-indigo-300 px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <i className="fa-solid fa-chart-line text-[11px]"></i>
                <span>Analytics &rarr;</span>
              </button>
            </div>

            <div className="space-y-3">
              {users.map(u => (
                <div key={u.id} className={`bg-[#111827] border ${u.is_blocked ? 'border-rose-900 bg-rose-950/10' : 'border-slate-800'} rounded-2xl p-4 shadow-md space-y-3`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-sm">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs flex items-center gap-2">
                          {u.username}
                          {u.is_blocked && <span className="text-[9px] bg-rose-500/20 text-rose-400 px-1.5 py-0.2 rounded font-bold">BLOCKED</span>}
                        </div>
                        <span className="text-[10px] text-slate-400 block">{u.email}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">Balance</span>
                      <span className="text-xs font-bold text-emerald-400 font-mono">₹{u.wallet_balance.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Saved UPI ID:</span>
                      <span className="font-mono text-slate-300 font-semibold truncate block">
                        {u.upi_id || 'Not set'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Tournaments:</span>
                      <span className="text-slate-300 font-bold">
                        {tournaments.filter(t => t.participant_ids.includes(u.id)).length} joined
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => {
                        const res = appStore.toggleBlockUser(u.id);
                        showToast(res.message);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${u.is_blocked ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30' : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'}`}
                    >
                      <i className={`fa-solid ${u.is_blocked ? 'fa-unlock' : 'fa-ban'} text-[10px]`}></i>
                      <span>{u.is_blocked ? 'Unblock Player' : 'Block Player'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= ADMIN VIEW: PLAYER ANALYTICS ================= */}
        {activeTab === 'analytics' && (
          <PlayerAnalytics onShowToast={showToast} />
        )}

        {/* ================= ADMIN VIEW: SETTINGS (FOLLOW-UP 2) ================= */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div>
              <h1 className="text-base font-black text-white flex items-center gap-2">
                <i className="fa-solid fa-gear text-indigo-400"></i> Admin UPI Settings
              </h1>
              <p className="text-xs text-slate-400">Configure receiving UPI address & QR code for user deposits</p>
            </div>

            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
              <h3 className="text-xs font-bold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
                <i className="fa-solid fa-qrcode text-emerald-400"></i> UPI Deposit Gateway Configuration
              </h3>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Admin Receiving UPI ID <span className="text-emerald-400">*</span>
                </label>
                <input 
                  type="text" 
                  value={adminUpiInput} 
                  onChange={e => setAdminUpiInput(e.target.value)} 
                  required 
                  placeholder="e.g. yourbank@upi" 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500" 
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Displayed to gamers in their Add Money modal.</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Payment QR Code Preview
                </label>
                <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
                  <div className="w-16 h-16 bg-white rounded-lg p-1 flex items-center justify-center shrink-0">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=upi://pay?pa=${encodeURIComponent(adminUpiInput)}%26pn=ClutchArena`} 
                      alt="Generated Admin QR" 
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="text-[11px] text-slate-400">
                    <span className="text-white font-semibold block">Live Auto-Generated UPI QR</span>
                    <span>Updates dynamically based on your receiving UPI address.</span>
                  </div>
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => {
                  const res = appStore.updateAdminSettings(adminUpiInput, adminQrInput);
                  showToast(res.message, 'success');
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-md shadow-indigo-600/25 transition"
              >
                Save UPI Gateway Settings
              </button>
            </div>

            {/* GLOBAL THEME SELECTION SECTION */}
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <i className="fa-solid fa-palette text-amber-400"></i> Global App Theme
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${currentTheme.badgeBg}`}>
                  {currentTheme.name}
                </span>
              </div>

              <p className="text-[11px] text-slate-400">
                Select the active visual aesthetic for players and control panel.
              </p>

              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_THEMES.map(th => {
                  const isSelected = th.id === currentTheme.id;
                  return (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => {
                        appStore.setTheme(th.id);
                        showToast(`Theme switched to ${th.name}!`);
                      }}
                      className={`p-2 rounded-xl border flex items-center gap-2 text-left transition ${isSelected ? 'bg-slate-800 border-white/40 ring-1 ring-white/20' : 'bg-slate-900 border-slate-800 hover:bg-slate-800/50'}`}
                    >
                      <div className={`w-6 h-6 rounded-lg bg-gradient-to-tr ${th.gradient} flex items-center justify-center text-slate-950 font-bold text-[10px] shrink-0`}>
                        <i className={`fa-solid ${th.icon}`}></i>
                      </div>
                      <div className="truncate">
                        <span className="text-xs font-bold text-white block truncate">{th.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Reset Demo State */}
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-300 block">Reset Simulator Data</span>
                <span className="text-[10px] text-slate-500">Restore default tournaments, users and transactions</span>
              </div>
              <button 
                onClick={() => {
                  if (confirm('Reset all demo state to fresh default?')) {
                    appStore.resetToDefault();
                    showToast('Demo store reset to defaults');
                  }
                }}
                className="bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-300 px-3 py-1.5 rounded-xl text-xs font-semibold"
              >
                Reset Demo
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Admin Fixed Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0f172a]/95 backdrop-blur-md border-t border-slate-800 px-1 py-1.5 max-w-md mx-auto">
        <div className="flex items-center justify-around">
          
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`flex flex-col items-center justify-center py-1 flex-1 rounded-xl transition ${activeTab === 'dashboard' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <i className="fa-solid fa-gauge-high text-sm mb-0.5"></i>
            <span className="text-[9px]">Home</span>
          </button>

          <button 
            onClick={() => setActiveTab('tournaments')} 
            className={`flex flex-col items-center justify-center py-1 flex-1 rounded-xl transition ${activeTab === 'tournaments' || activeTab === 'manage' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <i className="fa-solid fa-trophy text-sm mb-0.5"></i>
            <span className="text-[9px]">Matches</span>
          </button>

          <button 
            onClick={() => setActiveTab('analytics')} 
            className={`flex flex-col items-center justify-center py-1 flex-1 rounded-xl transition ${activeTab === 'analytics' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <i className="fa-solid fa-chart-line text-sm mb-0.5"></i>
            <span className="text-[9px]">Analytics</span>
          </button>

          <button 
            onClick={() => setActiveTab('deposits')} 
            className={`flex flex-col items-center justify-center py-1 flex-1 rounded-xl relative transition ${activeTab === 'deposits' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <i className="fa-solid fa-arrow-down-to-bracket text-sm mb-0.5"></i>
            <span className="text-[9px]">Deposits</span>
            {pendingDeposits.length > 0 && (
              <span className="absolute top-0 right-2 w-3.5 h-3.5 bg-emerald-500 text-slate-950 font-black rounded-full text-[8px] flex items-center justify-center">
                {pendingDeposits.length}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('withdrawals')} 
            className={`flex flex-col items-center justify-center py-1 flex-1 rounded-xl relative transition ${activeTab === 'withdrawals' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <i className="fa-solid fa-arrow-up-from-bracket text-sm mb-0.5"></i>
            <span className="text-[9px]">Payouts</span>
            {pendingWithdrawals.length > 0 && (
              <span className="absolute top-0 right-2 w-3.5 h-3.5 bg-rose-500 text-white font-black rounded-full text-[8px] flex items-center justify-center">
                {pendingWithdrawals.length}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('users')} 
            className={`flex flex-col items-center justify-center py-1 flex-1 rounded-xl transition ${activeTab === 'users' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <i className="fa-solid fa-users text-sm mb-0.5"></i>
            <span className="text-[9px]">Users</span>
          </button>

          <button 
            onClick={() => setActiveTab('settings')} 
            className={`flex flex-col items-center justify-center py-1 flex-1 rounded-xl transition ${activeTab === 'settings' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <i className="fa-solid fa-gear text-sm mb-0.5"></i>
            <span className="text-[9px]">Settings</span>
          </button>

        </div>
      </nav>

    </div>
  );
};
