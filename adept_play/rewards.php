<?php
/**
 * Clutch Arena - Daily Login Rewards & 7-Day Streak
 * Calibrated for Asia/Kolkata timezone with anti-duplicate claim locks,
 * streak reset rules, XP progression, and esports badges.
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/common/header.php';

check_user_auth();

$user_id = $_SESSION['user_id'];
$success_msg = '';
$error_msg = '';

// Strict Asia/Kolkata date
$today = date('Y-m-d');
$yesterday = date('Y-m-d', strtotime('-1 day'));

// Streak Reward Configuration
$streak_rewards = [
    1 => ['xp' => 50,  'title' => 'Rookie Check-In', 'badge' => 'Badge: Daily Scout', 'desc' => '50 Esports XP'],
    2 => ['xp' => 100, 'title' => 'Combat Focus',    'badge' => 'Badge: Combatant',   'desc' => '100 Esports XP'],
    3 => ['xp' => 150, 'title' => 'Squad Pass',       'badge' => 'Pass: Scrim Ticket', 'desc' => '150 XP + Scrim Pass'],
    4 => ['xp' => 200, 'title' => 'Warmup Veteran',  'badge' => 'Badge: Dedicated',   'desc' => '200 Esports XP'],
    5 => ['xp' => 250, 'title' => 'Sharpshooter',    'badge' => 'Badge: Bronze Aim',  'desc' => '250 XP + Bronze Badge'],
    6 => ['xp' => 300, 'title' => 'Elite Strategist', 'badge' => 'Badge: Strategist',  'desc' => '300 Esports XP'],
    7 => ['xp' => 500, 'title' => 'Grandmaster Day', 'badge' => 'Frame: Cyber Elite', 'desc' => '500 XP + Cyber Frame']
];

// Fetch user's current streak and last login date
$uStmt = $pdo->prepare("SELECT id, username, level, xp, streak_days, last_login_date FROM users WHERE id = ?");
$uStmt->execute([$user_id]);
$user = $uStmt->fetch();

$current_streak = intval($user['streak_days'] ?? 0);
$last_login = $user['last_login_date'] ?? null;

// Check if user already claimed today
$claimCheck = $pdo->prepare("SELECT id FROM daily_rewards WHERE user_id = ? AND claim_date = ?");
$claimCheck->execute([$user_id, $today]);
$already_claimed_today = (bool)$claimCheck->fetch();

// Determine next day in streak
$next_streak_day = 1;
if ($last_login === $yesterday) {
    $next_streak_day = ($current_streak % 7) + 1;
} elseif ($last_login === $today) {
    $next_streak_day = max(1, ($current_streak % 7));
} else {
    // Missed one or more days: Reset back to day 1
    $next_streak_day = 1;
}

// Handle Claim POST Submission
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'claim_reward') {
    $submitted_token = $_POST['csrf_token'] ?? '';

    if (!verify_csrf_token($submitted_token)) {
        $error_msg = "Security session expired. Please refresh and try again.";
    } elseif ($already_claimed_today) {
        $error_msg = "You have already claimed today's login reward. Come back tomorrow after 00:00 IST!";
    } else {
        try {
            $pdo->beginTransaction();

            // Lock daily rewards check to avoid race condition
            $lockStmt = $pdo->prepare("SELECT id FROM daily_rewards WHERE user_id = ? AND claim_date = ? FOR UPDATE");
            $lockStmt->execute([$user_id, $today]);
            if ($lockStmt->fetch()) {
                $error_msg = "Duplicate claim detected. Reward already issued for today.";
                $pdo->rollBack();
            } else {
                $claim_day = 1;
                if ($last_login === $yesterday) {
                    $claim_day = ($current_streak % 7) + 1;
                } else {
                    $claim_day = 1; // reset streak if missed
                }

                $reward_info = $streak_rewards[$claim_day] ?? $streak_rewards[1];
                $xp_to_add = $reward_info['xp'];
                $reward_details = $reward_info['desc'];
                $badge_awarded = $reward_info['badge'];

                // 1. Insert into daily_rewards ledger
                $insDaily = $pdo->prepare("
                    INSERT INTO daily_rewards (user_id, claim_date, streak_day, xp_awarded, badge_awarded, reward_details, timezone) 
                    VALUES (?, ?, ?, ?, ?, ?, 'Asia/Kolkata')
                ");
                $insDaily->execute([$user_id, $today, $claim_day, $xp_to_add, $badge_awarded, $reward_details]);

                // 2. Update user streak, last login date, and XP
                $new_xp = intval($user['xp']) + $xp_to_add;
                $new_level = intval(floor($new_xp / 500)) + 1; // Level up every 500 XP
                $new_streak = $claim_day;

                $upUser = $pdo->prepare("
                    UPDATE users 
                    SET streak_days = ?, last_login_date = ?, xp = ?, level = ? 
                    WHERE id = ?
                ");
                $upUser->execute([$new_streak, $today, $new_xp, $new_level, $user_id]);

                // 3. Log audit action
                log_audit_action($pdo, 'user', $user_id, 'daily_reward_claim', 'daily_rewards', $pdo->lastInsertId(), "Day $claim_day (+{$xp_to_add} XP)");

                $pdo->commit();

                $success_msg = "Day $claim_day reward claimed! +$xp_to_add Esports XP credited to your profile.";
                $already_claimed_today = true;
                $current_streak = $new_streak;
            }
        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $error_msg = "Claim failed: " . $e->getMessage();
        }
    }
}

// Fetch user's claim history
$historyStmt = $pdo->prepare("SELECT * FROM daily_rewards WHERE user_id = ? ORDER BY claim_date DESC LIMIT 10");
$historyStmt->execute([$user_id]);
$claim_history = $historyStmt->fetchAll();

$csrf_token = generate_csrf_token();
?>

<div class="space-y-4">

    <!-- Top Card -->
    <div class="relative bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-950/60 border border-cyan-500/30 rounded-2xl p-4 shadow-xl overflow-hidden">
        <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                <i class="fa-solid fa-calendar-check"></i> Daily Esports Check-In
            </span>
            <span class="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full font-bold font-mono">
                IST (Asia/Kolkata)
            </span>
        </div>
        <h2 class="text-base font-black text-white">7-Day Login Streak</h2>
        <p class="text-xs text-slate-400 mt-1">Check in daily to build your streak. Reach Day 7 for the exclusive Cyber Elite badge and +500 XP!</p>

        <!-- Current Streak Status -->
        <div class="mt-3 flex items-center justify-between bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <div>
                <span class="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Active Streak</span>
                <span class="text-xl font-black text-cyan-400 font-mono"><?php echo $current_streak; ?> <span class="text-xs font-bold text-slate-400">Days</span></span>
            </div>
            <div class="text-right">
                <span class="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Today's Status</span>
                <?php if ($already_claimed_today): ?>
                    <span class="text-xs font-bold text-emerald-400 flex items-center gap-1 justify-end">
                        <i class="fa-solid fa-circle-check"></i> Claimed
                    </span>
                <?php else: ?>
                    <span class="text-xs font-bold text-amber-400 flex items-center gap-1 justify-end animate-pulse">
                        <i class="fa-solid fa-gift"></i> Ready to Claim
                    </span>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <!-- Feedback messages -->
    <?php if (!empty($success_msg)): ?>
        <div class="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2">
            <i class="fa-solid fa-circle-check text-emerald-400"></i>
            <span><?php echo htmlspecialchars($success_msg); ?></span>
        </div>
    <?php endif; ?>

    <?php if (!empty($error_msg)): ?>
        <div class="bg-rose-950/80 border border-rose-500/50 text-rose-300 p-3 rounded-xl text-xs flex items-center gap-2">
            <i class="fa-solid fa-circle-exclamation text-rose-400"></i>
            <span><?php echo htmlspecialchars($error_msg); ?></span>
        </div>
    <?php endif; ?>

    <!-- 7 Days Grid Cards -->
    <div class="grid grid-cols-7 gap-1.5">
        <?php for ($d = 1; $d <= 7; $d++): 
            $is_completed = ($current_streak >= $d && $already_claimed_today) || ($current_streak > $d);
            $is_active_today = (!$already_claimed_today && $d === $next_streak_day);
            $r_info = $streak_rewards[$d];
        ?>
            <div class="p-2 rounded-xl border text-center transition flex flex-col justify-between h-24 <?php echo $is_completed ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : ($is_active_today ? 'bg-cyan-950/60 border-cyan-400 ring-2 ring-cyan-500/30 text-white' : 'bg-slate-900/60 border-slate-800 text-slate-500'); ?>">
                <span class="text-[9px] font-bold block">Day <?php echo $d; ?></span>
                <div class="my-1">
                    <i class="fa-solid <?php echo ($d === 7) ? 'fa-crown text-amber-400 text-sm' : (($d === 3 || $d === 5) ? 'fa-medal text-cyan-400 text-xs' : 'fa-bolt text-emerald-400 text-xs'); ?>"></i>
                </div>
                <span class="text-[9px] font-mono font-bold block leading-tight">+<?php echo $r_info['xp']; ?> XP</span>
            </div>
        <?php endfor; ?>
    </div>

    <!-- Claim Action Button -->
    <?php if (!$already_claimed_today): ?>
        <form method="POST" action="rewards.php">
            <input type="hidden" name="action" value="claim_reward">
            <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
            <button type="submit" class="w-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black py-3 rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition active:scale-95 flex items-center justify-center gap-2">
                <i class="fa-solid fa-gift"></i> Claim Day <?php echo $next_streak_day; ?> Daily Reward (+<?php echo $streak_rewards[$next_streak_day]['xp']; ?> XP)
            </button>
        </form>
    <?php else: ?>
        <div class="bg-slate-900 border border-slate-800 text-slate-400 text-xs p-3 rounded-xl text-center">
            <i class="fa-solid fa-clock mr-1 text-cyan-400"></i> Next check-in unlocks tomorrow at midnight (00:00 IST).
        </div>
    <?php endif; ?>

    <!-- Rules & Reset Disclosure -->
    <div class="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 space-y-1">
        <span class="font-bold text-slate-300 block"><i class="fa-solid fa-circle-info text-cyan-400 mr-1"></i> Streak Rules:</span>
        <ul class="list-disc pl-4 space-y-0.5">
            <li>Check-ins are recorded based on Indian Standard Time (IST).</li>
            <li>If you miss a day, the streak automatically resets back to Day 1.</li>
            <li>All rewards are free esports progression items (XP, titles, badges, and digital frames). No cash wagering or gambling.</li>
        </ul>
    </div>

    <!-- History Ledger -->
    <div>
        <h3 class="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
            <i class="fa-solid fa-clock-rotate-left text-slate-500"></i> Recent Check-In History
        </h3>

        <div class="space-y-2">
            <?php if (empty($claim_history)): ?>
                <div class="text-center py-6 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-500">
                    No login claims recorded yet. Hit the claim button above!
                </div>
            <?php else: ?>
                <?php foreach ($claim_history as $ch): ?>
                    <div class="bg-[#111827] border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-xs">
                        <div class="flex items-center gap-2">
                            <span class="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-[10px] font-mono">
                                D<?php echo $ch['streak_day']; ?>
                            </span>
                            <div>
                                <span class="font-bold text-white"><?php echo htmlspecialchars($ch['reward_details']); ?></span>
                                <span class="text-[10px] text-slate-500 block"><?php echo date('d M Y', strtotime($ch['claim_date'])); ?> (IST)</span>
                            </div>
                        </div>
                        <span class="font-bold font-mono text-emerald-400 text-xs">+<?php echo $ch['xp_awarded']; ?> XP</span>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>
    </div>

</div>

<?php require_once __DIR__ . '/common/bottom.php'; ?>
