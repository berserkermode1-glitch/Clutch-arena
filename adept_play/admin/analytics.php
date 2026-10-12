<?php
/**
 * Clutch Arena - Admin Top Player Analytics
 * Displays comprehensive player metrics, win rates, XP totals, and tier distributions.
 */
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/common/header.php';

// Fetch analytics from database
$total_xp = 0;
$avg_win_rate = 0;
$top_winner = null;
$top_xp_gamer = null;
$players = [];

if (isset($pdo)) {
    try {
        $stmt = $pdo->query("
            SELECT 
                u.id, 
                u.username, 
                u.email, 
                u.free_fire_uid, 
                u.is_blocked,
                COALESCE(u.xp, 1500) AS accumulated_xp,
                COALESCE(u.level, 1) AS level,
                (SELECT COUNT(*) FROM tournaments t WHERE t.winner_id = u.id AND t.status = 'Completed') AS total_wins,
                (SELECT COUNT(*) FROM participants p WHERE p.user_id = u.id) AS matches_played,
                (SELECT COALESCE(SUM(t.prize_pool), 0) FROM tournaments t WHERE t.winner_id = u.id AND t.status = 'Completed') AS total_prize_won
            FROM users u
            ORDER BY total_wins DESC, accumulated_xp DESC
        ");
        $players = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Compute metrics
        $total_xp = array_sum(array_column($players, 'accumulated_xp'));
        $win_rates = [];
        foreach ($players as $p) {
            if ($p['matches_played'] > 0) {
                $win_rates[] = round(($p['total_wins'] / $p['matches_played']) * 100);
            }
        }
        $avg_win_rate = count($win_rates) > 0 ? round(array_sum($win_rates) / count($win_rates)) : 0;
        $top_winner = $players[0] ?? null;

        // Top XP gamer
        $by_xp = $players;
        usort($by_xp, fn($a, $b) => $b['accumulated_xp'] <=> $a['accumulated_xp']);
        $top_xp_gamer = $by_xp[0] ?? null;

    } catch (Exception $e) {
        $error_msg = $e->getMessage();
    }
}
?>

<div class="space-y-4 pb-20">
    <div class="flex items-center justify-between">
        <div>
            <h1 class="text-lg font-black text-white flex items-center gap-2">
                <i class="fa-solid fa-chart-line text-indigo-400"></i> Top Player Analytics
            </h1>
            <p class="text-xs text-slate-400">Player performance, XP progression, and win rates</p>
        </div>
        <span class="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2.5 py-1 rounded-full font-bold">
            <?php echo count($players); ?> Gamers
        </span>
    </div>

    <!-- 4 KPI Cards -->
    <div class="grid grid-cols-2 gap-2.5">
        <div class="bg-[#111827] border border-slate-800 rounded-2xl p-3.5 shadow-md">
            <span class="text-[11px] text-slate-400 block font-medium mb-1">Platform XP Pool</span>
            <div class="text-lg font-black text-indigo-300 font-mono"><?php echo number_format($total_xp); ?></div>
            <span class="text-[10px] text-slate-500">Across verified roster</span>
        </div>

        <div class="bg-[#111827] border border-slate-800 rounded-2xl p-3.5 shadow-md">
            <span class="text-[11px] text-slate-400 block font-medium mb-1">Avg Win Rate</span>
            <div class="text-lg font-black text-emerald-400 font-mono"><?php echo $avg_win_rate; ?>%</div>
            <span class="text-[10px] text-slate-500">Active scrim participants</span>
        </div>

        <div class="bg-[#111827] border border-slate-800 rounded-2xl p-3.5 shadow-md">
            <span class="text-[11px] text-slate-400 block font-medium mb-1">MVP Champion</span>
            <div class="text-xs font-black text-amber-300 truncate">
                👑 <?php echo htmlspecialchars($top_winner['username'] ?? 'N/A'); ?>
            </div>
            <span class="text-[10px] text-slate-400 font-mono"><?php echo intval($top_winner['total_wins'] ?? 0); ?> Wins</span>
        </div>

        <div class="bg-[#111827] border border-slate-800 rounded-2xl p-3.5 shadow-md">
            <span class="text-[11px] text-slate-400 block font-medium mb-1">Apex XP Leader</span>
            <div class="text-xs font-black text-purple-300 truncate">
                ⚡ <?php echo htmlspecialchars($top_xp_gamer['username'] ?? 'N/A'); ?>
            </div>
            <span class="text-[10px] text-slate-400 font-mono"><?php echo number_format($top_xp_gamer['accumulated_xp'] ?? 0); ?> XP</span>
        </div>
    </div>

    <!-- Top Players Table -->
    <div class="bg-[#111827] border border-slate-800 rounded-2xl p-3.5 shadow-md space-y-2.5">
        <h3 class="text-xs font-bold text-white border-b border-slate-800 pb-2">
            Top Ranked Contenders
        </h3>

        <div class="space-y-2">
            <?php foreach ($players as $idx => $p): 
                $wr = $p['matches_played'] > 0 ? round(($p['total_wins'] / $p['matches_played']) * 100) : 0;
            ?>
                <div class="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                    <div class="flex items-center gap-2">
                        <span class="w-5 h-5 rounded-md bg-slate-800 text-indigo-400 font-mono font-bold text-[10px] flex items-center justify-center">
                            #<?php echo $idx + 1; ?>
                        </span>
                        <div>
                            <span class="font-bold text-white"><?php echo htmlspecialchars($p['username']); ?></span>
                            <span class="text-[10px] text-slate-400 block font-mono"><?php echo htmlspecialchars($p['email']); ?></span>
                        </div>
                    </div>

                    <div class="text-right">
                        <span class="font-mono text-amber-400 font-bold block"><?php echo $p['total_wins']; ?> Wins (<?php echo $wr; ?>%)</span>
                        <span class="font-mono text-indigo-300 text-[10px]"><?php echo number_format($p['accumulated_xp']); ?> XP</span>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
</div>

<?php
require_once __DIR__ . '/common/bottom.php';
?>
