<?php
/**
 * Clutch Arena - User Homepage & Tournament Directory
 * Enforces server-side capacity checks, eligibility, CSRF validation,
 * free-entry tournaments, and room access restrictions.
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/common/header.php';

// Authentication check
check_user_auth();

$user_id = $_SESSION['user_id'];
$success_msg = '';
$error_msg = '';

if (isset($_GET['welcome'])) {
    $success_msg = "Welcome to Clutch Arena! Your account is active with 100 Starter Esports XP.";
}

// Handle Tournament Join Action
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'join_tournament') {
    $submitted_token = $_POST['csrf_token'] ?? '';

    if (!verify_csrf_token($submitted_token)) {
        $error_msg = "Security session expired. Please refresh the page.";
    } else {
        $tournament_id = intval($_POST['tournament_id'] ?? 0);

        if ($tournament_id <= 0) {
            $error_msg = "Invalid tournament selected.";
        } else {
            try {
                $pdo->beginTransaction();

                // 1. Fetch tournament details with lock
                $stmt = $pdo->prepare("SELECT id, title, entry_fee, max_participants, status FROM tournaments WHERE id = ? FOR UPDATE");
                $stmt->execute([$tournament_id]);
                $tournament = $stmt->fetch();

                if (!$tournament) {
                    $error_msg = "Tournament not found.";
                    $pdo->rollBack();
                } elseif ($tournament['status'] !== 'Upcoming') {
                    $error_msg = "Registration is closed. Tournament is " . $tournament['status'] . ".";
                    $pdo->rollBack();
                } else {
                    // 2. Capacity Check (Server-Side Enforced)
                    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM participants WHERE tournament_id = ?");
                    $countStmt->execute([$tournament_id]);
                    $current_participants = (int)$countStmt->fetchColumn();
                    $max_cap = intval($tournament['max_participants'] ?: 48);

                    if ($current_participants >= $max_cap) {
                        $error_msg = "Tournament roster is completely full ($current_participants / $max_cap players). Registration closed.";
                        $pdo->rollBack();
                    } else {
                        // 3. Duplicate Registration Check
                        $checkStmt = $pdo->prepare("SELECT id FROM participants WHERE user_id = ? AND tournament_id = ?");
                        $checkStmt->execute([$user_id, $tournament_id]);
                        if ($checkStmt->fetch()) {
                            $error_msg = "You are already registered for this tournament! View room credentials in My Matches.";
                            $pdo->rollBack();
                        } else {
                            // 4. Fetch user details
                            $userStmt = $pdo->prepare("SELECT id, free_fire_uid, wallet_balance FROM users WHERE id = ? FOR UPDATE");
                            $userStmt->execute([$user_id]);
                            $user = $userStmt->fetch();

                            $entry_fee = floatval($tournament['entry_fee']);
                            $balance = floatval($user['wallet_balance']);

                            // Free-entry or balance validation
                            if ($entry_fee > 0 && $balance < $entry_fee) {
                                $error_msg = "Paid tournaments remain disabled pending regulatory clearance. Please join our verified Free Scrim tournaments.";
                                $pdo->rollBack();
                            } else {
                                if ($entry_fee > 0) {
                                    $new_balance = $balance - $entry_fee;
                                    $updateUserStmt = $pdo->prepare("UPDATE users SET wallet_balance = ? WHERE id = ?");
                                    $updateUserStmt->execute([$new_balance, $user_id]);

                                    $ref_id = 'TX-ENTRY-' . strtoupper(substr(md5(uniqid()), 0, 8));
                                    $txStmt = $pdo->prepare("
                                        INSERT INTO transactions (user_id, amount, type, status, reference_id, category, description) 
                                        VALUES (?, ?, 'debit', 'Completed', ?, 'entry_fee', ?)
                                    ");
                                    $txStmt->execute([$user_id, $entry_fee, $ref_id, "Entry fee: " . $tournament['title']]);
                                }

                                // 5. Register participant
                                $in_game_uid = $user['free_fire_uid'] ?? '';
                                $joinStmt = $pdo->prepare("INSERT INTO participants (user_id, tournament_id, in_game_uid) VALUES (?, ?, ?)");
                                $joinStmt->execute([$user_id, $tournament_id, $in_game_uid]);

                                log_audit_action($pdo, 'user', $user_id, 'tournament_joined', 'tournaments', $tournament_id, "Registered for: " . $tournament['title']);

                                $pdo->commit();
                                $success_msg = "Successfully registered for " . htmlspecialchars($tournament['title']) . "! Check 'Matches' tab when live for Room credentials.";
                            }
                        }
                    }
                }
            } catch (Exception $e) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                $error_msg = "Registration error: " . $e->getMessage();
            }
        }
    }
}

// Fetch All Joined Tournaments for this user
$joined_tournament_ids = [];
if (isset($pdo)) {
    $stmtJoined = $pdo->prepare("SELECT tournament_id FROM participants WHERE user_id = ?");
    $stmtJoined->execute([$user_id]);
    $joined_tournament_ids = $stmtJoined->fetchAll(PDO::FETCH_COLUMN);
}

// Fetch Upcoming & Live Tournaments
$filter_game = clean_input($_GET['game'] ?? '');
$query = "SELECT t.*, COUNT(p.id) AS participant_count 
          FROM tournaments t 
          LEFT JOIN participants p ON t.id = p.tournament_id 
          WHERE t.status IN ('Upcoming', 'Live')";
$params = [];

if (!empty($filter_game) && $filter_game !== 'All') {
    $query .= " AND t.game_name = ?";
    $params[] = $filter_game;
}

$query .= " GROUP BY t.id ORDER BY t.match_time ASC";

$tournaments = [];
try {
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $tournaments = $stmt->fetchAll();
} catch (Exception $e) {
    $tournaments = [];
}

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

<!-- Live Esports Scrims Banner -->
<div class="relative bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950/70 border border-emerald-500/30 rounded-2xl p-4 overflow-hidden shadow-xl mb-4">
    <div class="relative z-10">
        <div class="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold mb-1">
            <i class="fa-solid fa-fire animate-pulse text-[11px]"></i> Free Scrims &amp; Official Tournaments
        </div>
        <h2 class="text-base font-black text-white leading-tight">Clutch Arena Season 2</h2>
        <p class="text-xs text-slate-400 mt-1">Verified esports brackets for BGMI, Free Fire MAX, and COD Mobile. Fair-Play protected.</p>
        
        <div class="mt-3 flex items-center gap-2">
            <a href="rewards.php" class="bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20">
                <i class="fa-solid fa-gift"></i> Daily Rewards
            </a>
            <a href="referrals.php" class="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5">
                <i class="fa-solid fa-users"></i> Squad Invites
            </a>
        </div>
    </div>
</div>

<!-- Filter Pills -->
<div class="flex items-center gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar text-xs">
    <?php
    $games = ['All', 'BGMI', 'Free Fire MAX', 'Call of Duty Mobile'];
    foreach ($games as $g):
        $isActive = ($filter_game === $g) || (empty($filter_game) && $g === 'All');
    ?>
        <a href="index.php<?php echo ($g === 'All') ? '' : '?game=' . urlencode($g); ?>" 
           class="px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition <?php echo $isActive ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'; ?>">
            <?php echo htmlspecialchars($g); ?>
        </a>
    <?php endforeach; ?>
</div>

<!-- Tournament Cards Grid -->
<div class="space-y-3.5 mb-6">
    <div class="flex items-center justify-between text-xs">
        <span class="font-bold text-slate-300">Open Esports Matches</span>
        <span class="text-slate-500 text-[11px]"><?php echo count($tournaments); ?> Scheduled</span>
    </div>

    <?php if (empty($tournaments)): ?>
        <div class="text-center py-12 bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <i class="fa-solid fa-gamepad text-3xl text-slate-600 mb-2"></i>
            <h3 class="text-sm font-bold text-slate-300">No Tournaments Found</h3>
            <p class="text-xs text-slate-500 mt-1">Check back soon for new scrim announcements!</p>
        </div>
    <?php else: ?>
        <?php foreach ($tournaments as $t): 
            $isJoined = in_array($t['id'], $joined_tournament_ids);
            $max_cap = intval($t['max_participants'] ?: 48);
            $current_p = intval($t['participant_count']);
            $is_full = ($current_p >= $max_cap);
            $is_live = ($t['status'] === 'Live');
        ?>
            <div class="bg-[#111827] border <?php echo $is_live ? 'border-rose-500/40 ring-1 ring-rose-500/20' : 'border-slate-800/90'; ?> rounded-2xl p-4 shadow-lg relative overflow-hidden">
                
                <div class="flex items-start justify-between gap-2 mb-2">
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                <?php echo htmlspecialchars($t['game_name']); ?>
                            </span>
                            <?php if ($is_live): ?>
                                <span class="text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
                                    <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> LIVE
                                </span>
                            <?php endif; ?>
                        </div>
                        <h3 class="text-sm font-bold text-white leading-tight"><?php echo htmlspecialchars($t['title']); ?></h3>
                    </div>

                    <div class="text-right">
                        <span class="text-[10px] text-slate-500 uppercase font-bold block">Prize Pool</span>
                        <span class="text-sm font-black text-amber-400 font-mono">
                            <?php echo ($t['prize_pool'] > 0) ? '₹' . number_format($t['prize_pool'], 0) : 'Esports XP & Trophy'; ?>
                        </span>
                    </div>
                </div>

                <!-- Match Details Pill -->
                <div class="grid grid-cols-3 gap-2 bg-slate-900/90 rounded-xl p-2.5 my-3 text-center text-xs border border-slate-800">
                    <div>
                        <span class="text-[10px] text-slate-500 block">Entry</span>
                        <span class="font-bold text-emerald-400">
                            <?php echo ($t['entry_fee'] == 0) ? 'FREE' : '₹' . number_format($t['entry_fee'], 0); ?>
                        </span>
                    </div>
                    <div>
                        <span class="text-[10px] text-slate-500 block">Schedule</span>
                        <span class="font-bold text-slate-300 text-[11px]">
                            <?php echo date('d M, h:i A', strtotime($t['match_time'])); ?>
                        </span>
                    </div>
                    <div>
                        <span class="text-[10px] text-slate-500 block">Capacity</span>
                        <span class="font-bold <?php echo $is_full ? 'text-rose-400' : 'text-slate-300'; ?> font-mono">
                            <?php echo $current_p; ?> / <?php echo $max_cap; ?>
                        </span>
                    </div>
                </div>

                <!-- Action Button -->
                <?php if ($isJoined): ?>
                    <a href="my_tournaments.php" class="w-full bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold py-2.5 rounded-xl text-xs border border-cyan-500/30 flex items-center justify-center gap-2 transition">
                        <i class="fa-solid fa-circle-check text-cyan-400"></i> Registered &bull; View Room in Matches &rarr;
                    </a>
                <?php elseif ($is_full): ?>
                    <button disabled class="w-full bg-slate-900 text-slate-500 font-bold py-2.5 rounded-xl text-xs border border-slate-800 cursor-not-allowed">
                        Roster Full (<?php echo $max_cap; ?> Players)
                    </button>
                <?php else: ?>
                    <form method="POST" action="index.php" onsubmit="return confirm('Register for <?php echo htmlspecialchars($t['title']); ?>? Free scrim participation.');">
                        <input type="hidden" name="action" value="join_tournament">
                        <input type="hidden" name="tournament_id" value="<?php echo $t['id']; ?>">
                        <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
                        <button type="submit" class="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black py-2.5 rounded-xl text-xs shadow-md shadow-emerald-500/20 transition active:scale-95 flex items-center justify-center gap-1.5">
                            <i class="fa-solid fa-right-to-bracket"></i> Register Now (Free Entry)
                        </button>
                    </form>
                <?php endif; ?>

            </div>
        <?php endforeach; ?>
    <?php endif; ?>
</div>

<?php require_once __DIR__ . '/common/bottom.php'; ?>
