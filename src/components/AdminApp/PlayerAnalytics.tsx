import React, { useState, useMemo } from 'react';
import { appStore } from '../../services/store';
import { PlayerLeaderboardEntry, PlayerTier } from '../../types/tournament';

interface PlayerAnalyticsProps {
  onShowToast: (message: string, type?: 'success' | 'error') => void;
}

export const PlayerAnalytics: React.FC<PlayerAnalyticsProps> = ({ onShowToast }) => {
  const [sortBy, setSortBy] = useState<'wins' | 'xp' | 'win_rate' | 'prizes'>('wins');
  const [gameFilter, setGameFilter] = useState<string>('All');
  const [tierFilter, setTierFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerLeaderboardEntry | null>(null);

  // Award XP modal state
  const [awardModalPlayer, setAwardModalPlayer] = useState<PlayerLeaderboardEntry | null>(null);
  const [awardAmount, setAwardAmount] = useState<string>('500');
  const [awardReason, setAwardReason] = useState<string>('MVP Performance & Fair Play Excellence');

  // Re-sync with store
  const [, setTick] = useState(0);
  React.useEffect(() => {
    return appStore.subscribe(() => setTick(t => t + 1));
  }, []);

  const analyticsSummary = useMemo(() => {
    return appStore.getPlayerAnalytics();
  }, []);

  // Fetch full leaderboard base
  const rawLeaderboard = useMemo(() => {
    // If sorting by xp or wins, fetch directly from store
    const storeSort = sortBy === 'xp' ? 'xp' : 'wins';
    const entries = appStore.getPlayerLeaderboard(storeSort, gameFilter, 'all');

    // Re-sort based on win_rate or prizes if chosen
    if (sortBy === 'win_rate') {
      entries.sort((a, b) => {
        if (b.win_rate !== a.win_rate) return b.win_rate - a.win_rate;
        return b.total_wins - a.total_wins;
      });
      return entries.map((e, idx) => ({ ...e, rank: idx + 1 }));
    }
    if (sortBy === 'prizes') {
      entries.sort((a, b) => {
        if (b.total_prize_won !== a.total_prize_won) return b.total_prize_won - a.total_prize_won;
        return b.total_wins - a.total_wins;
      });
      return entries.map((e, idx) => ({ ...e, rank: idx + 1 }));
    }

    return entries;
  }, [sortBy, gameFilter]);

  // Filter by tier and search
  const filteredPlayers = useMemo(() => {
    return rawLeaderboard.filter(entry => {
      if (tierFilter !== 'All' && entry.tier !== tierFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = entry.user.username.toLowerCase().includes(q);
        const matchEmail = entry.user.email.toLowerCase().includes(q);
        const matchUid = entry.user.free_fire_uid && entry.user.free_fire_uid.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchUid) return false;
      }
      return true;
    });
  }, [rawLeaderboard, tierFilter, searchQuery]);

  const [isAwardingXP, setIsAwardingXP] = useState(false);

  const handleAwardXPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!awardModalPlayer || isAwardingXP) return;
    const amt = parseInt(awardAmount);
    if (isNaN(amt) || amt <= 0) {
      onShowToast('Enter a valid positive XP amount', 'error');
      return;
    }
    setIsAwardingXP(true);
    try {
      await new Promise(r => setTimeout(r, 200));
      const res = appStore.awardUserXP(awardModalPlayer.user.id, amt, awardReason.trim() || 'Admin Fair Play Award');
      if (res.success) {
        onShowToast(res.message, 'success');
        setAwardModalPlayer(null);
        setAwardAmount('500');
      } else {
        onShowToast(res.message, 'error');
      }
    } finally {
      setIsAwardingXP(false);
    }
  };

  const exportAnalyticsCSV = () => {
    const headers = ['Rank', 'Username', 'Email', 'Free Fire UID', 'Level', 'Tier', 'XP', 'Wins', 'Matches Played', 'Win Rate %', 'Prize Won (INR)', 'Status'];
    const rows = rawLeaderboard.map(p => [
      p.rank,
      p.user.username,
      p.user.email,
      p.user.free_fire_uid || 'N/A',
      p.level,
      p.tier,
      p.accumulated_xp,
      p.total_wins,
      p.matches_played,
      `${p.win_rate}%`,
      p.total_prize_won,
      p.user.is_blocked ? 'Suspended' : 'Active'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `clutch_arena_player_analytics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('Player analytics CSV exported successfully!', 'success');
  };

  const getTierBadgeStyle = (tier: PlayerTier) => {
    switch (tier) {
      case 'Grandmaster':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/50';
      case 'Master':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/50';
      case 'Diamond':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50';
      case 'Platinum':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
      case 'Gold':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/50';
    }
  };

  return (
    <div className="space-y-4">
      {/* Title & Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-black text-white flex items-center gap-2">
            <i className="fa-solid fa-chart-line text-indigo-400"></i> Top Player Analytics
          </h1>
          <p className="text-xs text-slate-400">Esports player performance, XP progression, and win rates</p>
        </div>
        <button
          onClick={exportAnalyticsCSV}
          title="Export CSV"
          className="bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
        >
          <i className="fa-solid fa-file-export text-[11px]"></i>
          <span>Export CSV</span>
        </button>
      </div>

      {/* 4 Core Analytics KPI Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        
        {/* Total Platform XP */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-3.5 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Platform XP Pool</span>
            <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs">
              <i className="fa-solid fa-bolt"></i>
            </div>
          </div>
          <div className="text-lg font-black text-indigo-300 font-mono">
            {analyticsSummary.totalXP.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 block">
            Avg {Math.round(analyticsSummary.totalXP / (analyticsSummary.totalGamers || 1)).toLocaleString()} XP / gamer
          </span>
        </div>

        {/* Average Win Rate */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-3.5 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Avg Win Rate</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">
              <i className="fa-solid fa-percent"></i>
            </div>
          </div>
          <div className="text-lg font-black text-emerald-400 font-mono">
            {analyticsSummary.averageWinRate}%
          </div>
          <span className="text-[10px] text-slate-500 block">
            Across active scrims
          </span>
        </div>

        {/* Top Winner */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-3.5 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">MVP Champion</span>
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs">
              <i className="fa-solid fa-crown"></i>
            </div>
          </div>
          <div className="text-xs font-black text-amber-300 truncate">
            {analyticsSummary.topWinner ? analyticsSummary.topWinner.user.username : 'N/A'}
          </div>
          <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
            {analyticsSummary.topWinner ? `${analyticsSummary.topWinner.total_wins} Wins • ₹${analyticsSummary.topWinner.total_prize_won.toFixed(0)}` : '0 wins'}
          </span>
        </div>

        {/* Highest XP Gamer */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-3.5 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Apex XP Leader</span>
            <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs">
              <i className="fa-solid fa-star"></i>
            </div>
          </div>
          <div className="text-xs font-black text-purple-300 truncate">
            {analyticsSummary.topXPGamer ? analyticsSummary.topXPGamer.user.username : 'N/A'}
          </div>
          <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
            {analyticsSummary.topXPGamer ? `${analyticsSummary.topXPGamer.accumulated_xp.toLocaleString()} XP (Lv. ${analyticsSummary.topXPGamer.level})` : '0 XP'}
          </span>
        </div>

      </div>

      {/* Tier & Game Distribution Breakdown */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
            <i className="fa-solid fa-sitemap text-indigo-400"></i> Tier & Game Popularity Analytics
          </h3>
          <span className="text-[10px] text-slate-400 font-mono">
            {analyticsSummary.totalMatchesConcluded} Concluded Matches
          </span>
        </div>

        {/* Tier Distribution Bar */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="text-slate-400 font-medium">Player Tier Distribution</span>
            <span className="text-slate-500 text-[10px]">{rawLeaderboard.length} gamers</span>
          </div>

          <div className="flex h-3 rounded-full overflow-hidden bg-slate-900 border border-slate-800 gap-0.5">
            {analyticsSummary.tierDistribution.filter(t => t.count > 0).map(t => {
              const widthPct = Math.max(8, (t.count / (rawLeaderboard.length || 1)) * 100);
              return (
                <div
                  key={t.tier}
                  style={{ width: `${widthPct}%`, backgroundColor: t.color }}
                  title={`${t.tier}: ${t.count} gamers`}
                  className="h-full transition-all"
                />
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2 mt-2 pt-1 text-[10px]">
            {analyticsSummary.tierDistribution.filter(t => t.count > 0).map(t => (
              <span key={t.tier} className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }}></span>
                <span>{t.tier} ({t.count})</span>
              </span>
            ))}
          </div>
        </div>

        {/* Scrim Games Popularity */}
        <div className="pt-2 border-t border-slate-800/80">
          <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">Scrim Matches by Title</span>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {analyticsSummary.gamePopularity.map(gp => (
              <div key={gp.game} className="bg-slate-900/80 border border-slate-800 p-2 rounded-xl flex items-center justify-between">
                <span className="text-slate-300 font-semibold">{gp.game}</span>
                <span className="font-mono text-indigo-300 font-bold">{gp.count} matches ({gp.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sorting, Filtering & Search Controls */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Player Rankings & Dossiers
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {filteredPlayers.length} of {rawLeaderboard.length}
          </span>
        </div>

        {/* Sort Selector */}
        <div className="grid grid-cols-4 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[10px] font-bold">
          <button
            type="button"
            onClick={() => setSortBy('wins')}
            className={`py-1.5 rounded-lg transition ${
              sortBy === 'wins' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            🏆 Wins
          </button>
          <button
            type="button"
            onClick={() => setSortBy('xp')}
            className={`py-1.5 rounded-lg transition ${
              sortBy === 'xp' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚡ XP
          </button>
          <button
            type="button"
            onClick={() => setSortBy('win_rate')}
            className={`py-1.5 rounded-lg transition ${
              sortBy === 'win_rate' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            📊 Win %
          </button>
          <button
            type="button"
            onClick={() => setSortBy('prizes')}
            className={`py-1.5 rounded-lg transition ${
              sortBy === 'prizes' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            💰 Winnings
          </button>
        </div>

        {/* Filters row: Game & Tier */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <select
            value={gameFilter}
            onChange={e => setGameFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="All">All Games</option>
            <option value="BGMI">BGMI</option>
            <option value="Free Fire">Free Fire</option>
            <option value="COD Mobile">COD Mobile</option>
            <option value="TDM">TDM</option>
          </select>

          <select
            value={tierFilter}
            onChange={e => setTierFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="All">All Tiers</option>
            <option value="Grandmaster">Grandmaster</option>
            <option value="Master">Master</option>
            <option value="Diamond">Diamond</option>
            <option value="Platinum">Platinum</option>
            <option value="Gold">Gold</option>
            <option value="Silver">Silver</option>
          </select>
        </div>

        {/* Search Input */}
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search gamer tag, email, or Free Fire UID..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 text-xs"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          )}
        </div>
      </div>

      {/* Players Analytics List */}
      <div className="space-y-3">
        {filteredPlayers.length === 0 ? (
          <div className="text-center py-8 bg-[#111827] border border-slate-800 rounded-2xl p-6">
            <i className="fa-solid fa-user-xmark text-2xl text-slate-600 mb-2"></i>
            <h4 className="text-xs font-bold text-slate-300">No players match current filter</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Try resetting the game filter or search term.</p>
          </div>
        ) : (
          filteredPlayers.map(player => (
            <div
              key={player.user.id}
              className={`bg-[#111827] border ${player.user.is_blocked ? 'border-rose-900 bg-rose-950/10' : 'border-slate-800'} rounded-2xl p-3.5 shadow-md space-y-2.5`}
            >
              {/* Top row: Rank, User, Tier */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    #{player.rank}
                  </span>

                  <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs shrink-0">
                    {player.user.username.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <div className="font-bold text-xs text-white flex items-center gap-1.5">
                      <span className="truncate max-w-[120px]">{player.user.username}</span>
                      {player.user.is_blocked && (
                        <span className="text-[8px] bg-rose-500/20 text-rose-400 px-1 py-0.2 rounded font-bold">
                          SUSPENDED
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate max-w-[130px]">
                      {player.user.email}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getTierBadgeStyle(player.tier)}`}>
                    {player.tier}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                    Lv. {player.level}
                  </span>
                </div>
              </div>

              {/* 4 Player Stats Badges */}
              <div className="grid grid-cols-4 gap-1.5 bg-slate-900/90 p-2 rounded-xl border border-slate-800/80 text-center">
                <div>
                  <span className="text-[9px] text-slate-500 block">Victories</span>
                  <span className="text-xs font-black text-amber-400 font-mono">
                    {player.total_wins}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block">Matches</span>
                  <span className="text-xs font-black text-slate-200 font-mono">
                    {player.matches_played}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block">Win Rate</span>
                  <span className="text-xs font-black text-emerald-400 font-mono">
                    {player.win_rate}%
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block">Total XP</span>
                  <span className="text-xs font-black text-purple-300 font-mono">
                    {player.accumulated_xp.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Bottom row: UID, Earnings, Admin actions */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
                <div>
                  <span className="text-[9px] text-slate-500">Free Fire UID: </span>
                  <span className="font-mono text-slate-300 font-bold">{player.user.free_fire_uid || 'Unset'}</span>
                  <span className="text-slate-500 mx-1.5">•</span>
                  <span className="text-amber-300 font-mono font-bold">₹{player.total_prize_won.toFixed(0)} Won</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Award XP button */}
                  <button
                    type="button"
                    onClick={() => {
                      setAwardModalPlayer(player);
                      setAwardAmount('500');
                    }}
                    title="Award Bonus XP"
                    className="bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/30 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition"
                  >
                    <i className="fa-solid fa-plus text-[9px]"></i>
                    <span>XP</span>
                  </button>

                  {/* Inspect Details button */}
                  <button
                    type="button"
                    onClick={() => setSelectedPlayer(player)}
                    title="Inspect Player Dossier"
                    className="bg-slate-800 hover:bg-slate-750 text-slate-300 px-2 py-1 rounded-lg text-[10px] font-bold border border-slate-700 transition"
                  >
                    <i className="fa-solid fa-eye text-[9px]"></i>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ================= AWARD XP MODAL ================= */}
      {awardModalPlayer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-bolt text-yellow-400"></i> Award Bonus XP
              </h3>
              <button 
                onClick={() => setAwardModalPlayer(null)} 
                className="text-slate-400 hover:text-white p-1"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mb-3">
              Credit fair play XP to <strong className="text-white">{awardModalPlayer.user.username}</strong>. This updates their level and leaderboard rank.
            </p>

            <form onSubmit={handleAwardXPSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">XP Amount</label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {['250', '500', '1000'].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAwardAmount(amt)}
                      className={`py-1.5 rounded-lg text-xs font-bold font-mono border ${
                        awardAmount === amt
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      +{amt} XP
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={awardAmount}
                  onChange={e => setAwardAmount(e.target.value)}
                  required
                  min="50"
                  step="50"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Reason / Citation</label>
                <input
                  type="text"
                  value={awardReason}
                  onChange={e => setAwardReason(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setAwardModalPlayer(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAwardingXP}
                  className={`flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5 ${
                    isAwardingXP ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {isAwardingXP ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                      <span>Granting...</span>
                    </>
                  ) : (
                    <span>Grant XP</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= INSPECT DOSSIER MODAL ================= */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-user-shield text-indigo-400"></i> Player Analytics Dossier
              </h3>
              <button 
                onClick={() => setSelectedPlayer(null)} 
                className="text-slate-400 hover:text-white p-1"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <div className="flex items-center gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800 mb-3">
              <div className="w-12 h-12 rounded-xl bg-slate-800 text-white font-black text-base flex items-center justify-center">
                {selectedPlayer.user.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-extrabold text-sm text-white flex items-center gap-1.5">
                  {selectedPlayer.user.username}
                  <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full border ${getTierBadgeStyle(selectedPlayer.tier)}`}>
                    {selectedPlayer.tier}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 block font-mono">{selectedPlayer.user.email}</span>
                <span className="text-[10px] text-indigo-400 font-mono">UID: {selectedPlayer.user.free_fire_uid || 'Unset'}</span>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => {
                  const res = appStore.toggleBlockUser(selectedPlayer.user.id);
                  onShowToast(res.message);
                  setSelectedPlayer(null);
                }}
                className={`p-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border ${
                  selectedPlayer.user.is_blocked
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                    : 'bg-rose-950/40 text-rose-300 border-rose-500/40'
                }`}
              >
                <i className={`fa-solid ${selectedPlayer.user.is_blocked ? 'fa-unlock' : 'fa-ban'}`}></i>
                <span>{selectedPlayer.user.is_blocked ? 'Unblock Player' : 'Suspend Player'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAwardModalPlayer(selectedPlayer);
                  setSelectedPlayer(null);
                }}
                className="bg-indigo-950/50 text-indigo-300 border border-indigo-500/40 p-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <i className="fa-solid fa-bolt text-yellow-400"></i>
                <span>Award XP</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSelectedPlayer(null)}
              className="w-full bg-slate-800 text-white font-bold py-2 rounded-xl text-xs border border-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
