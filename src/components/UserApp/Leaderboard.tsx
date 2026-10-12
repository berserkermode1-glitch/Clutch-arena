import React, { useState, useMemo } from 'react';
import { appStore } from '../../services/store';
import { PlayerLeaderboardEntry, PlayerTier, ThemeConfig } from '../../types/tournament';

interface LeaderboardProps {
  currentTheme: ThemeConfig;
  onJoinMatchClick?: () => void;
  onShowToast: (message: string, type?: 'success' | 'error') => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  currentTheme,
  onJoinMatchClick,
  onShowToast,
}) => {
  const currentUser = appStore.getCurrentUser();
  const [sortBy, setSortBy] = useState<'wins' | 'xp'>('wins');
  const [gameFilter, setGameFilter] = useState<string>('All');
  const [timeFilter, setTimeFilter] = useState<'all' | 'season' | 'weekly'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerLeaderboardEntry | null>(null);

  // Re-sync on store changes
  const [, setTick] = useState(0);
  React.useEffect(() => {
    return appStore.subscribe(() => setTick(t => t + 1));
  }, []);

  // Fetch full leaderboard
  const rawLeaderboard = useMemo(() => {
    return appStore.getPlayerLeaderboard(sortBy, gameFilter, timeFilter);
  }, [sortBy, gameFilter, timeFilter]);

  // Filter by search query
  const filteredLeaderboard = useMemo(() => {
    if (!searchQuery.trim()) return rawLeaderboard;
    const q = searchQuery.toLowerCase().trim();
    return rawLeaderboard.filter(entry => 
      entry.user.username.toLowerCase().includes(q) ||
      (entry.user.free_fire_uid && entry.user.free_fire_uid.toLowerCase().includes(q)) ||
      entry.tier.toLowerCase().includes(q)
    );
  }, [rawLeaderboard, searchQuery]);

  // Top 3 Podium
  const topThree = useMemo(() => {
    return rawLeaderboard.slice(0, 3);
  }, [rawLeaderboard]);

  // Current user standing
  const myStanding = useMemo(() => {
    if (!currentUser) return null;
    return rawLeaderboard.find(e => e.user.id === currentUser.id) || null;
  }, [rawLeaderboard, currentUser]);

  const getTierBadgeStyle = (tier: PlayerTier) => {
    switch (tier) {
      case 'Grandmaster':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-rose-500/20';
      case 'Master':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-purple-500/20';
      case 'Diamond':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-cyan-500/20';
      case 'Platinum':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-emerald-500/20';
      case 'Gold':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-amber-500/20';
      case 'Silver':
        return 'bg-slate-400/20 text-slate-300 border-slate-400/50 shadow-slate-400/20';
      default:
        return 'bg-amber-900/30 text-amber-400 border-amber-700/50';
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 font-black text-xs flex items-center justify-center shadow-lg shadow-amber-400/30">
          <i className="fa-solid fa-crown text-[11px]"></i>
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="w-6 h-6 rounded-lg bg-gradient-to-tr from-slate-200 to-slate-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">
          2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-700 text-white font-black text-xs flex items-center justify-center shadow-md">
          3
        </span>
      );
    }
    return (
      <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-400 font-bold text-xs flex items-center justify-center font-mono">
        {rank}
      </span>
    );
  };

  return (
    <div className="space-y-4 pb-4">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/60 to-purple-950/40 border border-slate-800 p-4 shadow-xl">
        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/10 blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/30">
                Season 6 • Active
              </span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Live
              </span>
            </div>
            <h2 className="text-lg font-black text-white mt-1 tracking-tight flex items-center gap-2">
              <i className="fa-solid fa-ranking-star text-amber-400"></i> Global Leaderboard
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ranked champions across verified esports scrims & tournaments.
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-medium">Contenders</span>
            <span className="text-lg font-black text-white font-mono">{rawLeaderboard.length}</span>
          </div>
        </div>

        {/* Metric Switcher: Wins vs XP */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSortBy('wins')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border ${
              sortBy === 'wins'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/25'
                : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:bg-slate-850'
            }`}
          >
            <i className="fa-solid fa-trophy text-xs"></i>
            <span>Rank by Total Wins</span>
          </button>

          <button
            type="button"
            onClick={() => setSortBy('xp')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border ${
              sortBy === 'xp'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-indigo-400 shadow-lg shadow-purple-500/25'
                : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:bg-slate-850'
            }`}
          >
            <i className="fa-solid fa-bolt text-xs text-yellow-300"></i>
            <span>Rank by Accumulated XP</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs: Game & Timeframe */}
      <div className="space-y-2">
        {/* Timeframe selector */}
        <div className="flex items-center justify-between bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setTimeFilter('all')}
            className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition ${
              timeFilter === 'all'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All-Time
          </button>
          <button
            type="button"
            onClick={() => setTimeFilter('season')}
            className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition ${
              timeFilter === 'season'
                ? 'bg-slate-800 text-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            This Season
          </button>
          <button
            type="button"
            onClick={() => setTimeFilter('weekly')}
            className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition ${
              timeFilter === 'weekly'
                ? 'bg-slate-800 text-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Weekly Scrims
          </button>
        </div>

        {/* Game Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {['All', 'BGMI', 'Free Fire', 'COD Mobile', 'TDM'].map(game => (
            <button
              key={game}
              type="button"
              onClick={() => setGameFilter(game)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition border ${
                gameFilter === game
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-600/30'
                  : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {game === 'All' ? '🎮 All Games' : game}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search gamer tag or Free Fire UID..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
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

      {/* Your Standing Sticky/Highlight Card */}
      {myStanding && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/40 rounded-2xl p-3 shadow-lg shadow-indigo-500/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <i className="fa-solid fa-user-astronaut"></i> Your Global Standing
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getTierBadgeStyle(myStanding.tier)}`}>
              {myStanding.tier} • Lv. {myStanding.level}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-black text-sm flex items-center justify-center shadow-md">
                  {myStanding.user.username.charAt(0).toUpperCase()}
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-600 text-white font-mono text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-slate-900">
                  #{myStanding.rank}
                </span>
              </div>

              <div>
                <div className="font-extrabold text-xs text-white flex items-center gap-1.5">
                  {myStanding.user.username}
                  <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1 py-0.2 rounded font-mono">You</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                  <span>UID: <span className="font-mono text-slate-300">{myStanding.user.free_fire_uid || 'N/A'}</span></span>
                  <span>•</span>
                  <span>{myStanding.win_rate}% Win Rate</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              {sortBy === 'wins' ? (
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Victories</span>
                  <span className="text-sm font-black text-amber-400 font-mono flex items-center justify-end gap-1">
                    <i className="fa-solid fa-trophy text-[11px]"></i> {myStanding.total_wins} Wins
                  </span>
                </div>
              ) : (
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Accumulated XP</span>
                  <span className="text-sm font-black text-purple-300 font-mono flex items-center justify-end gap-1">
                    <i className="fa-solid fa-bolt text-yellow-300 text-[11px]"></i> {myStanding.accumulated_xp.toLocaleString()} XP
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Level Progress bar */}
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span>
              {myStanding.rank > 1 ? (
                <>Next rank is {rawLeaderboard[myStanding.rank - 2]?.user.username} with {sortBy === 'wins' ? `${rawLeaderboard[myStanding.rank - 2]?.total_wins} wins` : `${rawLeaderboard[myStanding.rank - 2]?.accumulated_xp.toLocaleString()} XP`}</>
              ) : (
                <span className="text-amber-400 font-bold">👑 You are currently #1 on the leaderboard!</span>
              )}
            </span>
            {onJoinMatchClick && (
              <button 
                onClick={onJoinMatchClick}
                className="text-cyan-400 hover:text-cyan-300 font-bold text-[10px] flex items-center gap-1"
              >
                Join Next Match &rarr;
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top 3 Podium (Shown if not searching and we have at least 3 players) */}
      {!searchQuery && topThree.length >= 3 && (
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <i className="fa-solid fa-medal text-amber-400"></i> Champions Podium
            </h3>
            <span className="text-[10px] text-slate-500">Tap player to inspect</span>
          </div>

          <div className="grid grid-cols-3 gap-2 items-end pt-2 pb-1">
            
            {/* Rank #2 (Silver) */}
            <div 
              onClick={() => setSelectedPlayer(topThree[1])}
              className="bg-slate-900/90 hover:bg-slate-850 cursor-pointer border border-slate-700/60 rounded-xl p-2.5 text-center flex flex-col items-center transition hover:scale-[1.02] shadow-md relative"
            >
              <div className="w-5 h-5 rounded-full bg-slate-300 text-slate-900 font-black text-[10px] flex items-center justify-center shadow-md mb-1.5 font-mono">
                2
              </div>
              <div className="w-11 h-11 rounded-xl bg-slate-800 border-2 border-slate-400 flex items-center justify-center font-black text-slate-200 text-sm shadow-md">
                {topThree[1].user.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-extrabold text-white mt-1.5 truncate max-w-[85px] block">
                {topThree[1].user.username}
              </span>
              <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full border mt-0.5 ${getTierBadgeStyle(topThree[1].tier)}`}>
                {topThree[1].tier}
              </span>
              <div className="mt-1 text-[11px] font-black font-mono">
                {sortBy === 'wins' ? (
                  <span className="text-amber-400">{topThree[1].total_wins} Wins</span>
                ) : (
                  <span className="text-purple-300">{topThree[1].accumulated_xp.toLocaleString()} XP</span>
                )}
              </div>
            </div>

            {/* Rank #1 (Gold - Taller & Highlighted) */}
            <div 
              onClick={() => setSelectedPlayer(topThree[0])}
              className="bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-900 hover:bg-slate-850 cursor-pointer border-2 border-amber-400/80 rounded-xl p-3 text-center flex flex-col items-center transition hover:scale-[1.03] shadow-xl shadow-amber-500/10 relative -mt-3"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 font-black text-xs flex items-center justify-center shadow-lg shadow-amber-400/30 mb-1">
                <i className="fa-solid fa-crown text-[10px]"></i>
              </div>
              <div className="w-13 h-13 rounded-xl bg-slate-800 border-2 border-amber-400 flex items-center justify-center font-black text-amber-300 text-base shadow-lg shadow-amber-400/20">
                {topThree[0].user.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-black text-amber-300 mt-1.5 truncate max-w-[95px] block">
                {topThree[0].user.username}
              </span>
              <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full border mt-0.5 ${getTierBadgeStyle(topThree[0].tier)}`}>
                {topThree[0].tier}
              </span>
              <div className="mt-1 text-xs font-black font-mono">
                {sortBy === 'wins' ? (
                  <span className="text-amber-400">{topThree[0].total_wins} Wins</span>
                ) : (
                  <span className="text-yellow-300">{topThree[0].accumulated_xp.toLocaleString()} XP</span>
                )}
              </div>
            </div>

            {/* Rank #3 (Bronze) */}
            <div 
              onClick={() => setSelectedPlayer(topThree[2])}
              className="bg-slate-900/90 hover:bg-slate-850 cursor-pointer border border-amber-800/60 rounded-xl p-2.5 text-center flex flex-col items-center transition hover:scale-[1.02] shadow-md relative"
            >
              <div className="w-5 h-5 rounded-full bg-amber-700 text-white font-black text-[10px] flex items-center justify-center shadow-md mb-1.5 font-mono">
                3
              </div>
              <div className="w-11 h-11 rounded-xl bg-slate-800 border-2 border-amber-700 flex items-center justify-center font-black text-amber-200 text-sm shadow-md">
                {topThree[2].user.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-extrabold text-white mt-1.5 truncate max-w-[85px] block">
                {topThree[2].user.username}
              </span>
              <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full border mt-0.5 ${getTierBadgeStyle(topThree[2].tier)}`}>
                {topThree[2].tier}
              </span>
              <div className="mt-1 text-[11px] font-black font-mono">
                {sortBy === 'wins' ? (
                  <span className="text-amber-400">{topThree[2].total_wins} Wins</span>
                ) : (
                  <span className="text-purple-300">{topThree[2].accumulated_xp.toLocaleString()} XP</span>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Main Leaderboard List */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-3.5 shadow-xl space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <i className="fa-solid fa-list-ol text-cyan-400"></i> Standings Table
          </span>
          <span className="text-[10px] text-slate-400">
            {filteredLeaderboard.length} gamers ranked
          </span>
        </div>

        {filteredLeaderboard.length === 0 ? (
          <div className="text-center py-8">
            <i className="fa-solid fa-user-ninja text-3xl text-slate-600 mb-2"></i>
            <p className="text-xs font-bold text-slate-400">No players found matching "{searchQuery}"</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Try searching for a different username or Free Fire UID.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLeaderboard.map((entry) => {
              const isMe = currentUser?.id === entry.user.id;
              return (
                <div
                  key={entry.user.id}
                  onClick={() => setSelectedPlayer(entry)}
                  className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                    isMe
                      ? 'bg-indigo-950/30 border-indigo-500/60 shadow-md ring-1 ring-indigo-500/30'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  {/* Left: Rank & Player info */}
                  <div className="flex items-center gap-2.5">
                    {getRankBadge(entry.rank)}

                    <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-xs shrink-0">
                      {entry.user.username.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <div className="font-extrabold text-xs text-white flex items-center gap-1.5">
                        <span className="truncate max-w-[110px]">{entry.user.username}</span>
                        {isMe && (
                          <span className="text-[8px] bg-indigo-500/30 text-indigo-300 px-1 py-0.2 rounded font-mono font-bold">
                            YOU
                          </span>
                        )}
                        <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full border ${getTierBadgeStyle(entry.tier)}`}>
                          {entry.tier}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <span className="font-mono text-slate-400 truncate max-w-[100px]">
                          {entry.user.free_fire_uid || 'No UID'}
                        </span>
                        <span>•</span>
                        <span className="text-slate-300 font-semibold">{entry.win_rate}% Win</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Primary Metric & Trend */}
                  <div className="text-right shrink-0">
                    {sortBy === 'wins' ? (
                      <div>
                        <div className="text-xs font-black text-amber-400 font-mono flex items-center justify-end gap-1">
                          <i className="fa-solid fa-trophy text-[10px]"></i> {entry.total_wins} Wins
                        </div>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {entry.accumulated_xp.toLocaleString()} XP
                        </span>
                      </div>
                    ) : (
                      <div>
                        <div className="text-xs font-black text-purple-300 font-mono flex items-center justify-end gap-1">
                          <i className="fa-solid fa-bolt text-yellow-300 text-[10px]"></i> {entry.accumulated_xp.toLocaleString()} XP
                        </div>
                        <span className="text-[10px] text-amber-400 block font-mono">
                          {entry.total_wins} Wins ({entry.win_rate}%)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rules & Integrity Note */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 text-[11px] text-slate-400 space-y-1">
        <div className="font-bold text-slate-300 flex items-center gap-1.5">
          <i className="fa-solid fa-shield-halved text-emerald-400"></i> Fair Play Leaderboard Transparency
        </div>
        <p className="text-[10px] leading-relaxed text-slate-400">
          Rankings are calculated solely from verified scrim finishes, admin-confirmed match rooms, and server-side XP ledgers. Unverified claims, duplicate registrations, and disqualified matches are excluded automatically.
        </p>
      </div>

      {/* ================= PLAYER DOSSIER MODAL ================= */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-5 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">
                  #{selectedPlayer.rank}
                </span>
                <h3 className="text-sm font-bold text-white">Gamer Dossier</h3>
              </div>
              <button 
                onClick={() => setSelectedPlayer(null)} 
                className="text-slate-400 hover:text-white p-1"
              >
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>

            {/* Profile Avatar & Title */}
            <div className="flex items-center gap-3.5 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 mb-3">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-black text-lg flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                {selectedPlayer.user.username.charAt(0).toUpperCase()}
              </div>

              <div>
                <div className="text-sm font-black text-white flex items-center gap-1.5">
                  {selectedPlayer.user.username}
                  <i className="fa-solid fa-circle-check text-cyan-400 text-xs"></i>
                </div>
                <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getTierBadgeStyle(selectedPlayer.tier)}`}>
                    {selectedPlayer.tier} Tier
                  </span>
                  <span className="text-slate-300 font-mono text-[11px]">Level {selectedPlayer.level}</span>
                </div>
              </div>
            </div>

            {/* UID Copy Card */}
            <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs mb-3">
              <div>
                <span className="text-[10px] text-slate-500 block">Free Fire UID</span>
                <span className="font-mono text-slate-200 font-bold">
                  {selectedPlayer.user.free_fire_uid || 'Unlinked'}
                </span>
              </div>
              {selectedPlayer.user.free_fire_uid && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedPlayer.user.free_fire_uid);
                    onShowToast('Free Fire UID copied to clipboard!', 'success');
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-slate-700 flex items-center gap-1"
                >
                  <i className="fa-solid fa-copy"></i> Copy
                </button>
              )}
            </div>

            {/* Core Stats Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Total Victories</span>
                <span className="text-base font-black text-amber-400 font-mono flex items-center gap-1">
                  <i className="fa-solid fa-trophy text-xs"></i> {selectedPlayer.total_wins} Wins
                </span>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Accumulated XP</span>
                <span className="text-base font-black text-purple-300 font-mono flex items-center gap-1">
                  <i className="fa-solid fa-bolt text-yellow-300 text-xs"></i> {selectedPlayer.accumulated_xp.toLocaleString()}
                </span>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Win Rate</span>
                <span className="text-sm font-black text-emerald-400 font-mono">
                  {selectedPlayer.win_rate}%
                </span>
                <span className="text-[9px] text-slate-500 block">
                  {selectedPlayer.matches_played} matches played
                </span>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Total Prize Won</span>
                <span className="text-sm font-black text-white font-mono">
                  ₹{selectedPlayer.total_prize_won.toFixed(0)}
                </span>
                <span className="text-[9px] text-slate-500 block">Official payouts</span>
              </div>
            </div>

            {/* Player Badges */}
            <div className="mb-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Earned Esports Badges
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedPlayer.badges.map(b => (
                  <span
                    key={b}
                    className="bg-indigo-950/50 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-xs"
                  >
                    <i className="fa-solid fa-award text-amber-400 text-[9px]"></i> {b}
                  </span>
                ))}
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedPlayer(null)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl text-xs border border-slate-700 transition"
            >
              Close Dossier
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
