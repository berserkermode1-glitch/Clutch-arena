<?php
/**
 * Clutch Arena - Referrals & Anti-Fraud Rewards Hub
 * Displays unique referral code, 5-stage referral lifecycle,
 * anti-fraud rules, and non-cash esports rewards ledger.
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/common/header.php';

check_user_auth();

$user_id = $_SESSION['user_id'];

// Fetch current user's referral code and stats
$stmt = $pdo->prepare("SELECT id, username, referral_code, level, xp FROM users WHERE id = ?");
$stmt->execute([$user_id]);
$user = $stmt->fetch();

$referral_code = $user['referral_code'] ?? 'CLUTCH-' . strtoupper(substr(md5($user['username'] . $user['id']), 0, 6));

// If referral code was missing, persist it
if (empty($user['referral_code'])) {
    $upCode = $pdo->prepare("UPDATE users SET referral_code = ? WHERE id = ?");
    $upCode->execute([$referral_code, $user_id]);
}

// Fetch referrals where current user is referrer
$refStmt = $pdo->prepare("
    SELECT r.*, u.username as referee_username, u.created_at as joined_at, u.level as referee_level
    FROM referrals r
    INNER JOIN users u ON r.referee_id = u.id
    WHERE r.referrer_id = ?
    ORDER BY r.created_at DESC
");
$refStmt->execute([$user_id]);
$referrals_list = $refStmt->fetchAll();

// Calculate counts per status
$status_counts = [
    'Pending' => 0,
    'Verified' => 0,
    'Qualified' => 0,
    'Rewarded' => 0,
    'Rejected' => 0
];
foreach ($referrals_list as $r) {
    if (isset($status_counts[$r['status']])) {
        $status_counts[$r['status']]++;
    }
}

// Build shareable link
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$share_link = $scheme . '://' . $host . '/login.php?ref=' . urlencode($referral_code);
?>

<div class="space-y-4">

    <!-- Header Card -->
    <div class="relative bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950/60 border border-emerald-500/30 rounded-2xl p-4 shadow-xl overflow-hidden">
        <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <i class="fa-solid fa-user-plus"></i> Referral &amp; Esports Squads
            </span>
            <span class="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                Anti-Fraud Guarded
            </span>
        </div>
        <h2 class="text-base font-black text-white">Invite Teammates, Earn Esports XP</h2>
        <p class="text-xs text-slate-400 mt-1">Share your unique code. When friends join and play their first free scrim, unlock progression badges.</p>

        <!-- Unique Referral Code Box -->
        <div class="mt-4 bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div>
                <span class="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Your Referral Code</span>
                <span class="text-base font-black text-emerald-400 font-mono select-all tracking-wider"><?php echo htmlspecialchars($referral_code); ?></span>
            </div>
            <button 
                type="button" 
                onclick="navigator.clipboard?.writeText('<?php echo htmlspecialchars($referral_code); ?>'); alert('Referral code copied to clipboard!');"
                class="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs shadow-md transition flex items-center gap-1.5"
            >
                <i class="fa-solid fa-copy"></i> Copy Code
            </button>
        </div>

        <!-- Shareable Link Copy -->
        <div class="mt-2 flex items-center gap-2">
            <input 
                type="text" 
                readonly 
                value="<?php echo htmlspecialchars($share_link); ?>" 
                class="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-[11px] text-slate-300 font-mono select-all focus:outline-none"
            >
            <button 
                type="button" 
                onclick="navigator.clipboard?.writeText('<?php echo htmlspecialchars($share_link); ?>'); alert('Referral link copied!');"
                class="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1.5 rounded-xl text-xs font-semibold"
            >
                Copy Link
            </button>
        </div>
    </div>

    <!-- Compliance & Anti-Fraud Notice -->
    <div class="bg-amber-950/40 border border-amber-500/30 rounded-xl p-3 text-[11px] text-amber-200 space-y-1">
        <div class="font-bold flex items-center gap-1.5 text-amber-300">
            <i class="fa-solid fa-shield-halved"></i> Fair-Play Referral Policy
        </div>
        <p class="leading-relaxed">
            Monetary cash referral rewards are disabled pending legal, age, and payment aggregator clearance. 
            All referral perks are 100% free non-cash rewards (Esports XP, Profile Avatar Frames, Scrim Passes). 
            Self-referrals, emulator bots, or multi-accounting from identical device fingerprints are automatically flagged and rejected.
        </p>
    </div>

    <!-- 5-Stage Status Grid -->
    <div>
        <h3 class="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
            <i class="fa-solid fa-list-check text-cyan-400"></i> Referral Lifecycle (<?php echo count($referrals_list); ?> Total)
        </h3>

        <div class="grid grid-cols-5 gap-1.5 text-center text-[10px]">
            <div class="bg-slate-900 border border-slate-800 p-2 rounded-xl">
                <span class="block text-slate-400 font-medium">Pending</span>
                <span class="font-mono font-bold text-amber-400 text-xs"><?php echo $status_counts['Pending']; ?></span>
            </div>
            <div class="bg-slate-900 border border-slate-800 p-2 rounded-xl">
                <span class="block text-slate-400 font-medium">Verified</span>
                <span class="font-mono font-bold text-blue-400 text-xs"><?php echo $status_counts['Verified']; ?></span>
            </div>
            <div class="bg-slate-900 border border-slate-800 p-2 rounded-xl">
                <span class="block text-slate-400 font-medium">Qualified</span>
                <span class="font-mono font-bold text-purple-400 text-xs"><?php echo $status_counts['Qualified']; ?></span>
            </div>
            <div class="bg-slate-900 border border-slate-800 p-2 rounded-xl">
                <span class="block text-slate-400 font-medium">Rewarded</span>
                <span class="font-mono font-bold text-emerald-400 text-xs"><?php echo $status_counts['Rewarded']; ?></span>
            </div>
            <div class="bg-slate-900 border border-slate-800 p-2 rounded-xl">
                <span class="block text-slate-400 font-medium">Rejected</span>
                <span class="font-mono font-bold text-rose-400 text-xs"><?php echo $status_counts['Rejected']; ?></span>
            </div>
        </div>
    </div>

    <!-- Referrals Ledger List -->
    <div class="space-y-2">
        <h3 class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <i class="fa-solid fa-clock-rotate-left text-slate-400"></i> Invited Players Ledger
        </h3>

        <?php if (empty($referrals_list)): ?>
            <div class="text-center py-8 bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-500">
                <i class="fa-solid fa-users text-2xl text-slate-600 mb-2 block"></i>
                No invites recorded yet. Share your code with fellow squad members to build your roster!
            </div>
        <?php else: ?>
            <?php foreach ($referrals_list as $ref): 
                $badge_class = 'bg-slate-800 text-slate-400';
                if ($ref['status'] === 'Pending') $badge_class = 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
                if ($ref['status'] === 'Verified') $badge_class = 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
                if ($ref['status'] === 'Qualified') $badge_class = 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
                if ($ref['status'] === 'Rewarded') $badge_class = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
                if ($ref['status'] === 'Rejected') $badge_class = 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
            ?>
                <div class="bg-[#111827] border border-slate-800/90 rounded-xl p-3 flex items-center justify-between text-xs shadow-sm">
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-white"><?php echo htmlspecialchars($ref['referee_username']); ?></span>
                            <span class="text-[9px] px-1.5 py-0.2 rounded-full font-bold <?php echo $badge_class; ?>">
                                <?php echo $ref['status']; ?>
                            </span>
                        </div>
                        <span class="text-[10px] text-slate-500 block mt-0.5">
                            Joined: <?php echo date('d M Y, h:i A', strtotime($ref['created_at'])); ?>
                        </span>
                        <?php if ($ref['status'] === 'Rejected' && !empty($ref['rejection_reason'])): ?>
                            <span class="text-[10px] text-rose-400 block">Reason: <?php echo htmlspecialchars($ref['rejection_reason']); ?></span>
                        <?php endif; ?>
                    </div>

                    <div class="text-right">
                        <span class="text-[11px] font-bold font-mono text-emerald-400">
                            <?php echo ($ref['reward_issued'] == 1) ? '+200 XP Credited' : 'Pending Verification'; ?>
                        </span>
                    </div>
                </div>
            <?php endforeach; ?>
        <?php endif; ?>
    </div>

</div>

<?php require_once __DIR__ . '/common/bottom.php'; ?>
