<?php
/**
 * Clutch Arena - Admin User Management
 * Handles Player Profiles, Account Restrictions with Verified Reasons, and Audit Trail.
 */
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/common/header.php';

check_admin_auth();

$success_msg = '';
$error_msg = '';

// Handle Block / Unblock Toggle with Mandatory Reason
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'toggle_block') {
    $submitted_token = $_POST['csrf_token'] ?? '';

    if (!verify_csrf_token($submitted_token)) {
        $error_msg = "Security session expired. Please refresh the page.";
    } else {
        $uid = intval($_POST['user_id'] ?? 0);
        $status = intval($_POST['status'] ?? 0);
        $reason = clean_input($_POST['block_reason'] ?? ($status ? 'Fair Play Review / Suspicious Activity' : ''));

        try {
            $stmt = $pdo->prepare("UPDATE users SET is_blocked = ?, block_reason = ? WHERE id = ?");
            $stmt->execute([$status, $reason, $uid]);

            log_audit_action($pdo, 'admin', $_SESSION['admin_id'], $status ? 'user_restricted' : 'user_unrestricted', 'users', $uid, "Status: $status. Reason: $reason");

            $success_msg = $status ? "Player account restricted (Reason: $reason)." : "Player account activated.";
        } catch (Exception $e) {
            $error_msg = "Error updating user: " . $e->getMessage();
        }
    }
}

// Fetch All Users
$users = [];
try {
    $users = $pdo->query("
        SELECT u.*, COUNT(p.id) AS match_count 
        FROM users u 
        LEFT JOIN participants p ON u.id = p.user_id 
        GROUP BY u.id 
        ORDER BY u.created_at DESC
    ")->fetchAll();
} catch (Exception $e) {}

$csrf_token = generate_csrf_token();
?>

<!-- Alert Feedback -->
<?php if (!empty($success_msg)): ?>
    <div class="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 p-3.5 rounded-xl mb-4 text-xs flex items-center gap-2">
        <i class="fa-solid fa-circle-check text-emerald-400"></i>
        <span><?php echo htmlspecialchars($success_msg); ?></span>
    </div>
<?php endif; ?>

<?php if (!empty($error_msg)): ?>
    <div class="bg-rose-950/80 border border-rose-500/50 text-rose-300 p-3.5 rounded-xl mb-4 text-xs flex items-center gap-2">
        <i class="fa-solid fa-circle-exclamation text-rose-400"></i>
        <span><?php echo htmlspecialchars($error_msg); ?></span>
    </div>
<?php endif; ?>

<div class="mb-4 flex items-center justify-between">
    <div>
        <h1 class="text-base font-black text-white flex items-center gap-2">
            <i class="fa-solid fa-users text-indigo-400"></i> Registered Gamers
        </h1>
        <p class="text-xs text-slate-400">Player roster, progression tiers, and fair-play status</p>
    </div>
    <span class="text-xs text-slate-400 font-mono bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
        <?php echo count($users); ?> players
    </span>
</div>

<div class="space-y-3">
    <?php foreach ($users as $u): 
        $is_blocked = ($u['is_blocked'] == 1);
    ?>
        <div class="bg-[#111827] border <?php echo $is_blocked ? 'border-rose-500/40' : 'border-slate-800'; ?> rounded-2xl p-3.5 text-xs shadow-md space-y-2">
            <div class="flex items-center justify-between">
                <div>
                    <div class="flex items-center gap-1.5">
                        <span class="font-bold text-white"><?php echo htmlspecialchars($u['username']); ?></span>
                        <span class="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-mono">ID #<?php echo $u['id']; ?></span>
                        <?php if ($is_blocked): ?>
                            <span class="text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.2 rounded font-bold">RESTRICTED</span>
                        <?php endif; ?>
                    </div>
                    <span class="text-[10px] text-slate-500 block"><?php echo htmlspecialchars($u['email']); ?> &bull; Joined: <?php echo date('d M Y', strtotime($u['created_at'])); ?></span>
                </div>

                <div class="text-right font-mono">
                    <span class="text-[11px] font-bold text-emerald-400 block">Level <?php echo $u['level'] ?? 1; ?> (<?php echo $u['xp'] ?? 0; ?> XP)</span>
                    <span class="text-[10px] text-slate-400"><?php echo $u['match_count']; ?> matches</span>
                </div>
            </div>

            <div class="bg-slate-900 border border-slate-800 p-2 rounded-xl flex items-center justify-between text-[11px]">
                <span class="text-slate-400 font-mono">FF UID: <strong class="text-white"><?php echo htmlspecialchars($u['free_fire_uid'] ?: 'Not configured'); ?></strong></span>
                <span class="text-slate-400 font-mono">Ref Code: <strong class="text-cyan-400"><?php echo htmlspecialchars($u['referral_code'] ?: 'N/A'); ?></strong></span>
            </div>

            <?php if ($is_blocked && !empty($u['block_reason'])): ?>
                <div class="bg-rose-950/40 border border-rose-500/30 text-rose-300 p-2 rounded-lg text-[10px]">
                    <i class="fa-solid fa-triangle-exclamation mr-1"></i> Restriction Reason: <?php echo htmlspecialchars($u['block_reason']); ?>
                </div>
            <?php endif; ?>

            <!-- Restriction Toggle Form -->
            <form method="POST" action="user.php" class="flex gap-2 pt-1">
                <input type="hidden" name="action" value="toggle_block">
                <input type="hidden" name="user_id" value="<?php echo $u['id']; ?>">
                <input type="hidden" name="status" value="<?php echo $is_blocked ? 0 : 1; ?>">
                <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">

                <?php if (!$is_blocked): ?>
                    <input type="text" name="block_reason" placeholder="Reason for restriction (e.g. In-game toxicity, teaming)" class="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-white">
                    <button type="submit" class="bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/30 px-3 py-1 rounded-lg text-[11px] font-bold transition">
                        Restrict
                    </button>
                <?php else: ?>
                    <button type="submit" class="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 py-1.5 rounded-lg text-[11px] font-bold transition">
                        Restore Full Access
                    </button>
                <?php endif; ?>
            </form>
        </div>
    <?php endforeach; ?>
</div>

<?php require_once __DIR__ . '/common/bottom.php'; ?>
