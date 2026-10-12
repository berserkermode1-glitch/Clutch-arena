<?php
/**
 * Clutch Arena - Admin Dashboard
 */
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/common/header.php';

// Fetch Statistics
$total_users = 0;
$total_tournaments = 0;
$total_prize_distributed = 0.00;
$pending_results = 0;
$security_alerts = 0;

try {
    $total_users = (int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    $total_tournaments = (int)$pdo->query("SELECT COUNT(*) FROM tournaments")->fetchColumn();
    $pending_results = (int)$pdo->query("SELECT COUNT(*) FROM match_results WHERE status = 'Pending'")->fetchColumn();
    $security_alerts = (int)$pdo->query("SELECT COUNT(*) FROM security_events WHERE status = 'New'")->fetchColumn();

    $recentTournaments = $pdo->query("
        SELECT t.*, COUNT(p.id) AS participant_count 
        FROM tournaments t 
        LEFT JOIN participants p ON t.id = p.tournament_id 
        GROUP BY t.id 
        ORDER BY t.created_at DESC 
        LIMIT 5
    ")->fetchAll();
} catch (Exception $e) {
    $stat_error = $e->getMessage();
}
?>

<div class="mb-4 flex items-center justify-between">
    <div>
        <h1 class="text-base font-black text-white">System Dashboard</h1>
        <p class="text-xs text-slate-400">Welcome, <?php echo htmlspecialchars($admin_username); ?></p>
    </div>
    <span class="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full font-bold">
        Live Security Active
    </span>
</div>

<!-- 4 Quick Stats Grid Cards -->
<div class="grid grid-cols-2 gap-3 mb-5">
    
    <!-- Total Users -->
    <div class="bg-[#111827] border border-slate-800 rounded-2xl p-3.5 shadow-md">
        <div class="flex items-center justify-between text-slate-400 mb-1.5">
            <span class="text-[11px] font-medium">Total Gamers</span>
            <div class="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs">
                <i class="fa-solid fa-users"></i>
            </div>
        </div>
        <div class="text-xl font-black text-white font-mono"><?php echo number_format($total_users); ?></div>
        <a href="user.php" class="text-[10px] text-indigo-400 font-semibold hover:underline mt-1 block">Manage players &rarr;</a>
    </div>

    <!-- Total Tournaments -->
    <div class="bg-[#111827] border border-slate-800 rounded-2xl p-3.5 shadow-md">
        <div class="flex items-center justify-between text-slate-400 mb-1.5">
            <span class="text-[11px] font-medium">Tournaments</span>
            <div class="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs">
                <i class="fa-solid fa-trophy"></i>
            </div>
        </div>
        <div class="text-xl font-black text-white font-mono"><?php echo number_format($total_tournaments); ?></div>
        <a href="tournament.php" class="text-[10px] text-amber-400 font-semibold hover:underline mt-1 block">View all brackets &rarr;</a>
    </div>

    <!-- Pending Results Evidence -->
    <div class="bg-[#111827] border border-slate-800 rounded-2xl p-3.5 shadow-md">
        <div class="flex items-center justify-between text-slate-400 mb-1.5">
            <span class="text-[11px] font-medium">Pending Proofs</span>
            <div class="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs">
                <i class="fa-solid fa-camera"></i>
            </div>
        </div>
        <div class="text-lg font-black text-cyan-300 font-mono"><?php echo $pending_results; ?></div>
        <a href="disputes.php" class="text-[10px] text-cyan-400 font-semibold hover:underline mt-1 block">Verify scorecards &rarr;</a>
    </div>

    <!-- Security Alerts -->
    <div class="bg-[#111827] border border-slate-800 rounded-2xl p-3.5 shadow-md">
        <div class="flex items-center justify-between text-slate-400 mb-1.5">
            <span class="text-[11px] font-medium">Security Alerts</span>
            <div class="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs">
                <i class="fa-solid fa-shield-virus"></i>
            </div>
        </div>
        <div class="text-lg font-black text-rose-400 font-mono"><?php echo $security_alerts; ?></div>
        <a href="security_center.php" class="text-[10px] text-rose-400 font-semibold hover:underline mt-1 block">Security center &rarr;</a>
    </div>

</div>

<!-- Quick Action Shortcuts -->
<div class="mb-5 space-y-2">
    <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Operations</div>
    
    <div class="grid grid-cols-2 gap-2.5">
        <a href="tournament.php" class="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold p-3 rounded-xl text-xs flex items-center gap-2.5 shadow-lg shadow-indigo-600/20 transition active:scale-95">
            <i class="fa-solid fa-circle-plus text-base"></i>
            <span>Create Tournament</span>
        </a>

        <a href="disputes.php" class="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold p-3 rounded-xl text-xs flex items-center gap-2.5 border border-slate-700 transition active:scale-95">
            <i class="fa-solid fa-scale-balanced text-base text-cyan-400"></i>
            <span>Review Proofs</span>
        </a>
    </div>

    <div class="grid grid-cols-2 gap-2.5 pt-1">
        <a href="security_center.php" class="bg-[#111827] border border-slate-800 hover:border-amber-500/40 p-2.5 rounded-xl text-xs flex items-center justify-between transition">
            <div class="flex items-center gap-2 text-slate-300">
                <i class="fa-solid fa-shield-halved text-amber-400"></i>
                <span>Anti-Fraud Sentinel</span>
            </div>
            <span class="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-mono font-bold text-[10px]">
                <?php echo $security_alerts; ?>
            </span>
        </a>

        <a href="settings.php" class="bg-[#111827] border border-slate-800 hover:border-indigo-500/40 p-2.5 rounded-xl text-xs flex items-center justify-between transition">
            <div class="flex items-center gap-2 text-slate-300">
                <i class="fa-solid fa-gear text-indigo-400"></i>
                <span>System Config</span>
            </div>
            <i class="fa-solid fa-chevron-right text-slate-500 text-[10px]"></i>
        </a>
    </div>
</div>

<!-- Recent Tournaments Overview -->
<div class="mb-4 flex items-center justify-between">
    <h3 class="text-sm font-bold text-white flex items-center gap-2">
        <i class="fa-solid fa-gamepad text-indigo-400"></i> Active Tournaments
    </h3>
    <a href="tournament.php" class="text-xs text-indigo-400 hover:underline">View All &rarr;</a>
</div>

<div class="space-y-2.5">
    <?php if (empty($recentTournaments)): ?>
        <div class="text-center py-6 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-500">
            No tournaments created yet.
        </div>
    <?php else: ?>
        <?php foreach ($recentTournaments as $rt): 
            $status_color = 'bg-slate-800 text-slate-400';
            if ($rt['status'] === 'Upcoming') $status_color = 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
            if ($rt['status'] === 'Live') $status_color = 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
            if ($rt['status'] === 'Completed') $status_color = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
        ?>
            <div class="bg-[#111827] border border-slate-800/90 rounded-xl p-3 flex items-center justify-between">
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-[10px] font-bold text-indigo-400 uppercase"><?php echo htmlspecialchars($rt['game_name']); ?></span>
                        <span class="text-[9px] px-1.5 py-0.5 rounded-full font-bold <?php echo $status_color; ?>"><?php echo $rt['status']; ?></span>
                    </div>
                    <h4 class="text-xs font-bold text-white leading-tight"><?php echo htmlspecialchars($rt['title']); ?></h4>
                    <span class="text-[10px] text-slate-400">Players: <?php echo intval($rt['participant_count']); ?> / <?php echo intval($rt['max_participants'] ?: 48); ?></span>
                </div>

                <a href="manage_tournament.php?id=<?php echo $rt['id']; ?>" class="bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 px-3 py-1.5 rounded-lg text-xs font-bold transition">
                    Manage
                </a>
            </div>
        <?php endforeach; ?>
    <?php endif; ?>
</div>

<?php require_once __DIR__ . '/common/bottom.php'; ?>
