<?php
/**
 * Clutch Arena - Global Esports Leaderboard
 * Ranks players based on total wins or accumulated XP.
 * Features Season 6 standings, podium view, game filters, and player dossiers.
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/common/header.php';

// Inputs & Filters
$sort_by = in_array($_GET['sort'] ?? '', ['wins', 'xp']) ? $_GET['sort'] : 'wins';
$game_filter = clean_input($_GET['game'] ?? 'All');
$search_query = clean_input($_GET['q'] ?? '');

$leaderboard_data = [];

if (isset($pdo)) {
    try {
        // Query player performance aggregating from tournaments and users
        $sql = "
            SELECT 
                u.id, 
                u.username, 
                u.free_fire_uid, 
                u.avatar, 
                COALESCE(u.xp, 1500) AS accumulated_xp,
                COALESCE(u.level, 1) AS level,
                (
                    SELECT COUNT(*) 
                    FROM tournaments t 
                    WHERE t.winner_id = u.id AND t.status = 'Completed'
                    " . ($game_filter !== 'All' ? "AND t.game_name = " . $pdo->quote($game_filter) : "") . "
                ) AS total_wins,
                (
                    SELECT COUNT(*) 
                    FROM participants p 
                    INNER JOIN tournaments t ON p.tournament_id = t.id 
                    WHERE p.user_id = u.id
                    " . ($game_filter !== 'All' ? "AND t.game_name = " . $pdo->quote($game_filter) : "") . "
                ) AS matches_played,
                (
                    SELECT COALESCE(SUM(t.prize_pool), 0) 
                    FROM tournaments t 
                    WHERE t.winner_id = u.id AND t.status = 'Completed'
                    " . ($game_filter !== 'All' ? "AND t.game_name = " . $pdo->quote($game_filter) : "") . "
                ) AS total_prize_won
            FROM users u
            WHERE u.is_blocked = 0
        ";

        if (!empty($search_query)) {
            $sql .= " AND (u.username LIKE :q OR u.free_fire_uid LIKE :q) ";
        }

        if ($sort_by === 'wins') {
            $sql .= " ORDER BY total_wins DESC, accumulated_xp DESC ";
        } else {
            $sql .= " ORDER BY accumulated_xp DESC, total_wins DESC ";
        }

        $stmt = $pdo->prepare($sql);
        if (!empty($search_query)) {
            $stmt->bindValue(':q', "%{$search_query}%");
        }
        $stmt->execute();
        $leaderboard_data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    } catch (Exception $e) {
        $db_error = $e->getMessage();
    }
}

// Helper to determine tier
function get_player_tier($level, $xp) {
    if ($xp >= 25000 || $level >= 40) return 'Grandmaster';
    if ($xp >= 18000 || $level >= 30) return 'Master';
    if ($xp >= 12000 || level >= 20) return 'Diamond';
    if ($xp >= 7000 || $level >= 12) return 'Platinum';
    if ($xp >= 3000 || $level >= 6) return 'Gold';
    if ($xp >= 1000 || $level >= 2) return 'Silver';
    return 'Bronze';
}
?>

<div class="space-y-4 pb-20">

    <!-- Header Banner -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/60 to-purple-950/40 border border-slate-800 p-4 shadow-xl">
        <div class="flex items-center justify-between">
            <div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] uppercase font-black tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/30">
                        Season 6 • Active
                    </span>
                    <span class="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Verified
                    </span>
                </div>
                <h1 class="text-lg font-black text-white mt-1 tracking-tight flex items-center gap-2">
                    <i class="fa-solid fa-ranking-star text-amber-400"></i> Global Leaderboard
                </h1>
                <p class="text-xs text-slate-400 mt-0.5">
                    Official rankings based on verified scrim finishes & XP accumulation.
                </p>
            </div>
            <div class="text-right">
                <span className="text-[10px] text-slate-400 block">Gamers</span>
                <span class="text-lg font-black text-white font-mono"><?php echo count($leaderboard_data); ?></span>
            </div>
        </div>

        <!-- Metric Switcher -->
        <div class="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2">
            <a 
                href="?sort=wins&game=<?php echo urlencode($game_filter); ?>" 
                class="py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border <?php echo ($sort_by === 'wins') ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/25' : 'bg-slate-900/90 text-slate-300 border-slate-800'; ?>"
            >
                <i class="fa-solid fa-trophy text-xs"></i>
                <span>Rank by Total Wins</span>
            </a>

            <a 
                href="?sort=xp&game=<?php echo urlencode($game_filter); ?>" 
                class="py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border <?php echo ($sort_by === 'xp') ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-indigo-400 shadow-lg shadow-purple-500/25' : 'bg-slate-900/90 text-slate-300 border-slate-800'; ?>"
            >
                <i class="fa-solid fa-bolt text-xs text-yellow-300"></i>
                <span>Rank by Accumulated XP</span>
            </a>
        </div>
    </div>

    <!-- Game Filter & Search -->
    <div class="space-y-2">
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1">
            <?php foreach (['All', 'BGMI', 'Free Fire', 'COD Mobile', 'TDM'] as $g): ?>
                <a 
                    href="?sort=<?php echo $sort_by; ?>&game=<?php echo urlencode($g); ?>" 
                    class="px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition border <?php echo ($game_filter === $g) ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm' : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-white'; ?>"
                >
                    <?php echo $g === 'All' ? '🎮 All Games' : htmlspecialchars($g); ?>
                </a>
            <?php endforeach; ?>
        </div>

        <form method="GET" action="leaderboard.php" class="relative">
            <input type="hidden" name="sort" value="<?php echo htmlspecialchars($sort_by); ?>">
            <input type="hidden" name="game" value="<?php echo htmlspecialchars($game_filter); ?>">
            <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
            <input 
                type="text" 
                name="q" 
                value="<?php echo htmlspecialchars($search_query); ?>" 
                placeholder="Search gamer tag or Free Fire UID..." 
                class="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            >
        </form>
    </div>

    <!-- Leaderboard Rankings Table -->
    <div class="bg-[#111827] border border-slate-800 rounded-2xl p-3.5 shadow-xl space-y-2">
        <div class="flex items-center justify-between pb-2 border-b border-slate-800">
            <span class="text-xs font-bold text-white flex items-center gap-1.5">
                <i class="fa-solid fa-list-ol text-cyan-400"></i> Standings
            </span>
            <span class="text-[10px] text-slate-400"><?php echo count($leaderboard_data); ?> contenders</span>
        </div>

        <?php if (empty($leaderboard_data)): ?>
            <div class="text-center py-8">
                <i class="fa-solid fa-user-ninja text-3xl text-slate-600 mb-2"></i>
                <p class="text-xs font-bold text-slate-400">No contenders found matching criteria</p>
            </div>
        <?php else: ?>
            <div class="space-y-2">
                <?php foreach ($leaderboard_data as $index => $row): 
                    $rank = $index + 1;
                    $tier = get_player_tier($row['level'], $row['accumulated_xp']);
                    $win_rate = $row['matches_played'] > 0 ? round(($row['total_wins'] / $row['matches_played']) * 100) : 0;
                    $is_current_user = isset($_SESSION['user_id']) && ($_SESSION['user_id'] == $row['id']);
                ?>
                    <div class="p-3 rounded-xl border flex items-center justify-between <?php echo $is_current_user ? 'bg-indigo-950/30 border-indigo-500/60 ring-1 ring-indigo-500/30' : 'bg-slate-900/80 border-slate-800'; ?>">
                        <div class="flex items-center gap-2.5">
                            <span class="w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center font-mono <?php echo $rank === 1 ? 'bg-amber-400 text-slate-950 font-black' : ($rank === 2 ? 'bg-slate-300 text-slate-950 font-black' : ($rank === 3 ? 'bg-amber-700 text-white font-black' : 'bg-slate-800 text-slate-400')); ?>">
                                <?php echo $rank; ?>
                            </span>

                            <div class="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs">
                                <?php echo strtoupper(substr($row['username'], 0, 1)); ?>
                            </div>

                            <div>
                                <div class="font-extrabold text-xs text-white flex items-center gap-1.5">
                                    <span><?php echo htmlspecialchars($row['username']); ?></span>
                                    <?php if ($is_current_user): ?>
                                        <span class="text-[8px] bg-indigo-500/30 text-indigo-300 px-1 py-0.2 rounded font-mono font-bold">YOU</span>
                                    <?php endif; ?>
                                    <span class="text-[8px] font-bold px-1.5 py-0.2 rounded-full border border-indigo-500/40 text-indigo-300 bg-indigo-500/10">
                                        <?php echo $tier; ?>
                                    </span>
                                </div>
                                <div class="text-[10px] text-slate-400 mt-0.5">
                                    <span>UID: <?php echo htmlspecialchars($row['free_fire_uid'] ?: 'N/A'); ?></span>
                                    <span>•</span>
                                    <span><?php echo $win_rate; ?>% Win</span>
                                </div>
                            </div>
                        </div>

                        <div class="text-right">
                            <?php if ($sort_by === 'wins'): ?>
                                <div class="text-xs font-black text-amber-400 font-mono">
                                    <?php echo intval($row['total_wins']); ?> Wins
                                </div>
                                <span class="text-[10px] text-slate-400 block font-mono">
                                    <?php echo number_format($row['accumulated_xp']); ?> XP
                                </span>
                            <?php else: ?>
                                <div class="text-xs font-black text-purple-300 font-mono">
                                    <?php echo number_format($row['accumulated_xp']); ?> XP
                                </div>
                                <span class="text-[10px] text-amber-400 block font-mono">
                                    <?php echo intval($row['total_wins']); ?> Wins (<?php echo $win_rate; ?>%)
                                </span>
                            <?php endif; ?>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </div>

</div>

<?php
require_once __DIR__ . '/common/bottom.php';
?>
