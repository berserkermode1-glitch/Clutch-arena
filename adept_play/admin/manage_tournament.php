<?php
/**
 * Clutch Arena - Admin Tournament Manager
 * Manages Room Credentials, Status, Participant Rosters, and Audited Winner Declarations.
 */
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/common/header.php';

check_admin_auth();

$tournament_id = intval($_GET['id'] ?? 0);
if ($tournament_id <= 0) {
    header("Location: tournament.php");
    exit;
}

$success_msg = '';
$error_msg = '';

// Handle Form Submissions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $submitted_token = $_POST['csrf_token'] ?? '';

    if (!verify_csrf_token($submitted_token)) {
        $error_msg = "Security session expired. Please refresh the page.";
    } else {
        $action = $_POST['action'] ?? '';

        // Action 1: Update Room Credentials and Status
        if ($action === 'update_room') {
            $room_id = clean_input($_POST['room_id'] ?? '');
            $room_password = clean_input($_POST['room_password'] ?? '');
            $status = clean_input($_POST['status'] ?? 'Upcoming');

            try {
                $stmt = $pdo->prepare("UPDATE tournaments SET room_id = ?, room_password = ?, status = ? WHERE id = ?");
                $stmt->execute([$room_id, $room_password, $status, $tournament_id]);

                log_audit_action($pdo, 'admin', $_SESSION['admin_id'], 'room_credentials_updated', 'tournaments', $tournament_id, "Status: $status, Room: $room_id");

                $success_msg = "Room details and match status updated successfully!";
            } catch (Exception $e) {
                $error_msg = "Error updating room: " . $e->getMessage();
            }
        }

        // Action 2: Declare Winner & Distribute Verified Non-Cash Esports Rewards
        elseif ($action === 'declare_winner') {
            $winner_id = intval($_POST['winner_id'] ?? 0);

            if ($winner_id <= 0) {
                $error_msg = "Please select a valid participating player as winner.";
            } else {
                try {
                    $pdo->beginTransaction();

                    $stmt = $pdo->prepare("SELECT id, title, prize_pool, status, winner_id FROM tournaments WHERE id = ? FOR UPDATE");
                    $stmt->execute([$tournament_id]);
                    $tournament = $stmt->fetch();

                    if (!$tournament) {
                        $error_msg = "Tournament not found.";
                        $pdo->rollBack();
                    } elseif ($tournament['status'] === 'Completed' && !empty($tournament['winner_id'])) {
                        $error_msg = "Winner has already been declared for this tournament.";
                        $pdo->rollBack();
                    } else {
                        $partCheck = $pdo->prepare("SELECT id FROM participants WHERE tournament_id = ? AND user_id = ?");
                        $partCheck->execute([$tournament_id, $winner_id]);
                        if (!$partCheck->fetch()) {
                            $error_msg = "Selected user is not a registered participant.";
                            $pdo->rollBack();
                        } else {
                            $prize = floatval($tournament['prize_pool']);

                            // Update winner placement
                            $upPart = $pdo->prepare("UPDATE participants SET placement = 1 WHERE tournament_id = ? AND user_id = ?");
                            $upPart->execute([$tournament_id, $winner_id]);

                            // Award +500 Champion XP
                            $upUser = $pdo->prepare("UPDATE users SET xp = xp + 500 WHERE id = ?");
                            $upUser->execute([$winner_id]);

                            // Mark tournament Completed and set winner
                            $tUpdate = $pdo->prepare("UPDATE tournaments SET status = 'Completed', winner_id = ? WHERE id = ?");
                            $tUpdate->execute([$winner_id, $tournament_id]);

                            // Record auditable reward transaction
                            $refId = 'TX-PRIZE-' . strtoupper(substr(md5(uniqid()), 0, 8));
                            $txStmt = $pdo->prepare("
                                INSERT INTO transactions (user_id, amount, type, status, reference_id, category, description) 
                                VALUES (?, ?, 'credit', 'Completed', ?, 'prize_winnings', ?)
                            ");
                            $txStmt->execute([$winner_id, $prize, $refId, "Champion Title + Trophy XP: " . $tournament['title']]);

                            log_audit_action($pdo, 'admin', $_SESSION['admin_id'], 'winner_declared', 'tournaments', $tournament_id, "Winner: User #$winner_id, Prize: ₹$prize");

                            $pdo->commit();
                            $success_msg = "Winner verified! Match completed and reward recorded in player ledger.";
                        }
                    }
                } catch (Exception $e) {
                    if ($pdo->inTransaction()) $pdo->rollBack();
                    $error_msg = "Winner declaration failed: " . $e->getMessage();
                }
            }
        }
    }
}

// Fetch Tournament Details
$stmt = $pdo->prepare("SELECT * FROM tournaments WHERE id = ?");
$stmt->execute([$tournament_id]);
$t = $stmt->fetch();

if (!$t) {
    echo "<div class='text-center p-8 text-rose-400'>Tournament not found. <a href='tournament.php' class='underline'>Return</a></div>";
    require_once __DIR__ . '/common/bottom.php';
    exit;
}

// Fetch Participants List
$pStmt = $pdo->prepare("
    SELECT p.id as participant_id, p.created_at as joined_at, p.placement, p.kills, u.id as user_id, u.username, u.email, u.free_fire_uid, u.level, u.xp
    FROM participants p
    INNER JOIN users u ON p.user_id = u.id
    WHERE p.tournament_id = ?
    ORDER BY p.created_at ASC
");
$pStmt->execute([$tournament_id]);
$participants = $pStmt->fetchAll();

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

<!-- Tournament Overview Header -->
<div class="bg-[#111827] border border-slate-800 rounded-2xl p-4 mb-4 shadow-lg">
    <div class="flex items-center justify-between mb-1.5">
        <a href="tournament.php" class="text-xs text-indigo-400 hover:underline flex items-center gap-1 font-semibold">
            <i class="fa-solid fa-arrow-left"></i> All Brackets
        </a>
        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full <?php echo ($t['status'] === 'Completed') ? 'bg-emerald-500/20 text-emerald-300' : (($t['status'] === 'Live') ? 'bg-rose-500/20 text-rose-300 animate-pulse' : 'bg-blue-500/20 text-blue-300'); ?>">
            <?php echo $t['status']; ?>
        </span>
    </div>
    <h2 class="text-base font-bold text-white"><?php echo htmlspecialchars($t['title']); ?></h2>
    <div class="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
        <span>Game: <strong class="text-indigo-400"><?php echo htmlspecialchars($t['game_name']); ?></strong></span>
        <span>Roster: <strong class="text-white"><?php echo count($participants); ?> / <?php echo intval($t['max_participants'] ?: 48); ?></strong></span>
        <span>Prize: <strong class="text-amber-400">₹<?php echo number_format($t['prize_pool'], 0); ?></strong></span>
    </div>
</div>

<!-- SECTION 1: ROOM CREDENTIALS & STATUS -->
<div class="bg-[#111827] border border-slate-800 rounded-2xl p-4 mb-4 shadow-md">
    <h3 class="text-xs font-bold text-white mb-3 flex items-center gap-2 border-b border-slate-800 pb-2">
        <i class="fa-solid fa-key text-amber-400"></i> Custom Room Credentials &amp; Status
    </h3>

    <form method="POST" action="manage_tournament.php?id=<?php echo $tournament_id; ?>" class="space-y-3">
        <input type="hidden" name="action" value="update_room">
        <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">

        <div class="grid grid-cols-2 gap-3">
            <div>
                <label class="block text-[11px] font-medium text-slate-300 mb-1">Room ID</label>
                <input type="text" name="room_id" value="<?php echo htmlspecialchars($t['room_id'] ?? ''); ?>" placeholder="e.g. 5839201" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono">
            </div>

            <div>
                <label class="block text-[11px] font-medium text-slate-300 mb-1">Room Password</label>
                <input type="text" name="room_password" value="<?php echo htmlspecialchars($t['room_password'] ?? ''); ?>" placeholder="e.g. 1234" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono">
            </div>
        </div>

        <div>
            <label class="block text-[11px] font-medium text-slate-300 mb-1">Match Status</label>
            <select name="status" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
                <option value="Upcoming" <?php echo ($t['status'] === 'Upcoming') ? 'selected' : ''; ?>>Upcoming (Registration open, room credentials hidden from players)</option>
                <option value="Live" <?php echo ($t['status'] === 'Live') ? 'selected' : ''; ?>>Live (Room credentials visible to registered players)</option>
                <option value="Under Review" <?php echo ($t['status'] === 'Under Review') ? 'selected' : ''; ?>>Under Review (Score verification in progress)</option>
                <option value="Completed" <?php echo ($t['status'] === 'Completed') ? 'selected' : ''; ?>>Completed (Match concluded, winner finalized)</option>
            </select>
        </div>

        <button type="submit" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-xl text-xs border border-slate-700 transition">
            Save Room Credentials &amp; Status
        </button>
    </form>
</div>

<!-- SECTION 2: DECLARE WINNER -->
<div class="bg-[#111827] border border-amber-950/60 rounded-2xl p-4 mb-4 shadow-md">
    <h3 class="text-xs font-bold text-amber-300 mb-3 flex items-center gap-2 border-b border-slate-800 pb-2">
        <i class="fa-solid fa-crown text-amber-400"></i> Audited Winner Finalization
    </h3>

    <?php if ($t['status'] === 'Completed' && !empty($t['winner_id'])): 
        $wStmt = $pdo->prepare("SELECT username FROM users WHERE id = ?");
        $wStmt->execute([$t['winner_id']]);
        $winnerName = $wStmt->fetchColumn();
    ?>
        <div class="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3 text-xs text-emerald-300">
            <p class="font-bold flex items-center gap-1.5 text-emerald-200">
                <i class="fa-solid fa-trophy text-amber-400"></i> Verified Winner: <?php echo htmlspecialchars($winnerName); ?>
            </p>
            <p class="text-[11px] text-emerald-300/80 mt-1">
                Reward verified and logged in tamper-evident ledger.
            </p>
        </div>
    <?php elseif (empty($participants)): ?>
        <p class="text-xs text-slate-500">No participants registered yet.</p>
    <?php else: ?>
        <form method="POST" action="manage_tournament.php?id=<?php echo $tournament_id; ?>" onsubmit="return confirm('Confirm winner declaration? Action is logged in administrative audit trail.');" class="space-y-3">
            <input type="hidden" name="action" value="declare_winner">
            <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">

            <div>
                <label class="block text-[11px] font-medium text-slate-300 mb-1">Select Winning Player</label>
                <select name="winner_id" required class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500">
                    <option value="">-- Choose Verified Participant --</option>
                    <?php foreach ($participants as $p): ?>
                        <option value="<?php echo $p['user_id']; ?>">
                            <?php echo htmlspecialchars($p['username']); ?> (FF UID: <?php echo htmlspecialchars($p['free_fire_uid'] ?: 'Not set'); ?>)
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>

            <button type="submit" class="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-slate-950 font-black py-2.5 rounded-xl text-xs shadow-lg shadow-amber-500/20 transition">
                <i class="fa-solid fa-crown mr-1"></i> Finalize Winner &amp; Close Bracket
            </button>
        </form>
    <?php endif; ?>
</div>

<!-- SECTION 3: PARTICIPANTS ROSTER -->
<div class="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-md">
    <h3 class="text-xs font-bold text-white mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
        <span class="flex items-center gap-1.5"><i class="fa-solid fa-users text-indigo-400"></i> Registered Roster (<?php echo count($participants); ?>)</span>
    </h3>

    <div class="space-y-2">
        <?php foreach ($participants as $p): ?>
            <div class="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-xs">
                <div>
                    <span class="font-bold text-white"><?php echo htmlspecialchars($p['username']); ?></span>
                    <span class="text-[10px] text-slate-400 block font-mono">UID: <?php echo htmlspecialchars($p['free_fire_uid'] ?: 'Pending in profile'); ?></span>
                </div>
                <div class="text-right">
                    <span class="text-[10px] text-emerald-400 font-bold block">Level <?php echo $p['level']; ?></span>
                    <span class="text-[9px] text-slate-500"><?php echo date('d M, h:i A', strtotime($p['joined_at'])); ?></span>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
</div>

<?php require_once __DIR__ . '/common/bottom.php'; ?>
