<?php
/**
 * Clutch Arena - Admin Match Result Adjudication & Disputes
 * Verifies player match screenshot evidence, confirms kills & placements,
 * and resolves player reports without trusting client-side scores.
 */
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/common/header.php';

check_admin_auth();

$success_msg = '';
$error_msg = '';

// Handle Adjudication Actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $submitted_token = $_POST['csrf_token'] ?? '';

    if (!verify_csrf_token($submitted_token)) {
        $error_msg = "Security session expired. Please refresh the page.";
    } else {
        $action = $_POST['action'] ?? '';

        // 1. Approve / Reject Match Result Evidence
        if ($action === 'adjudicate_result') {
            $result_id = intval($_POST['result_id'] ?? 0);
            $decision = clean_input($_POST['decision'] ?? ''); // 'Approved' or 'Rejected'
            $notes = clean_input($_POST['review_notes'] ?? '');

            if ($result_id > 0 && in_array($decision, ['Approved', 'Rejected'], true)) {
                try {
                    $pdo->beginTransaction();

                    $rStmt = $pdo->prepare("SELECT * FROM match_results WHERE id = ? FOR UPDATE");
                    $rStmt->execute([$result_id]);
                    $res = $rStmt->fetch();

                    if (!$res) {
                        $error_msg = "Result record not found.";
                        $pdo->rollBack();
                    } else {
                        // Update match_results status
                        $upStmt = $pdo->prepare("
                            UPDATE match_results 
                            SET status = ?, reviewed_by = ?, review_notes = ?, reviewed_at = NOW() 
                            WHERE id = ?
                        ");
                        $upStmt->execute([$decision, $_SESSION['admin_id'], $notes, $result_id]);

                        // If approved, update participant's placement and kills
                        if ($decision === 'Approved') {
                            $partUp = $pdo->prepare("
                                UPDATE participants 
                                SET placement = ?, kills = ? 
                                WHERE tournament_id = ? AND user_id = ?
                            ");
                            $partUp->execute([$res['claimed_placement'], $res['claimed_kills'], $res['tournament_id'], $res['user_id']]);

                            // Award XP to user for verified finish
                            $xpAwarded = max(50, 200 - ($res['claimed_placement'] * 10)) + ($res['claimed_kills'] * 15);
                            $userUp = $pdo->prepare("UPDATE users SET xp = xp + ? WHERE id = ?");
                            $userUp->execute([$xpAwarded, $res['user_id']]);
                        }

                        log_audit_action($pdo, 'admin', $_SESSION['admin_id'], 'result_adjudicated', 'match_results', $result_id, "$decision by Admin: $notes");

                        $pdo->commit();
                        $success_msg = "Match result #$result_id marked as $decision.";
                    }
                } catch (Exception $e) {
                    if ($pdo->inTransaction()) $pdo->rollBack();
                    $error_msg = "Adjudication failed: " . $e->getMessage();
                }
            }
        }

        // 2. Resolve Dispute Ticket
        elseif ($action === 'resolve_dispute') {
            $dispute_id = intval($_POST['dispute_id'] ?? 0);
            $resolution = clean_input($_POST['resolution'] ?? '');
            $admin_notes = clean_input($_POST['admin_notes'] ?? '');

            try {
                $upDisp = $pdo->prepare("UPDATE disputes SET status = ?, admin_notes = ?, resolved_at = NOW() WHERE id = ?");
                $upDisp->execute([$resolution, $admin_notes, $dispute_id]);

                log_audit_action($pdo, 'admin', $_SESSION['admin_id'], 'dispute_resolved', 'disputes', $dispute_id, "Dispute resolved as $resolution");
                $success_msg = "Dispute #$dispute_id marked as $resolution.";
            } catch (Exception $e) {
                $error_msg = "Dispute resolution failed: " . $e->getMessage();
            }
        }
    }
}

// Fetch Pending Results Evidence
$pendingResults = [];
$openDisputes = [];
try {
    $prStmt = $pdo->query("
        SELECT r.*, u.username, t.title as tournament_title, t.game_name
        FROM match_results r
        INNER JOIN users u ON r.user_id = u.id
        INNER JOIN tournaments t ON r.tournament_id = t.id
        WHERE r.status = 'Pending'
        ORDER BY r.created_at ASC
    ");
    $pendingResults = $prStmt->fetchAll();

    $dpStmt = $pdo->query("
        SELECT d.*, u.username 
        FROM disputes d
        INNER JOIN users u ON d.user_id = u.id
        WHERE d.status IN ('Open', 'In Review')
        ORDER BY d.created_at ASC
    ");
    $openDisputes = $dpStmt->fetchAll();
} catch (Exception $e) {}

$csrf_token = generate_csrf_token();
?>

<!-- Alert Feedback -->
<?php if (!empty($success_msg)): ?>
    <div class="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 p-3 rounded-xl mb-4 text-xs flex items-center gap-2">
        <i class="fa-solid fa-circle-check text-emerald-400"></i>
        <span><?php echo htmlspecialchars($success_msg); ?></span>
    </div>
<?php endif; ?>

<?php if (!empty($error_msg)): ?>
    <div class="bg-rose-950/80 border border-rose-500/50 text-rose-300 p-3 rounded-xl mb-4 text-xs flex items-center gap-2">
        <i class="fa-solid fa-circle-exclamation text-rose-400"></i>
        <span><?php echo htmlspecialchars($error_msg); ?></span>
    </div>
<?php endif; ?>

<div class="mb-4">
    <h1 class="text-base font-black text-white flex items-center gap-2">
        <i class="fa-solid fa-scale-balanced text-indigo-400"></i> Score Adjudication &amp; Disputes
    </h1>
    <p class="text-xs text-slate-400">Inspect player screenshot evidence before confirming tournament results</p>
</div>

<!-- SECTION 1: RESULT EVIDENCE VERIFICATION QUEUE -->
<div class="space-y-3 mb-6">
    <div class="flex items-center justify-between text-xs">
        <span class="font-bold text-slate-300">Pending Result Screenshot Evidence (<?php echo count($pendingResults); ?>)</span>
        <span class="text-[10px] text-amber-400 font-semibold"><i class="fa-solid fa-clock"></i> Manual Verification</span>
    </div>

    <?php if (empty($pendingResults)): ?>
        <div class="text-center py-6 bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-500">
            <i class="fa-solid fa-circle-check text-2xl text-emerald-500/40 mb-1 block"></i>
            All match scorecards are verified! No pending evidence.
        </div>
    <?php else: ?>
        <?php foreach ($pendingResults as $pr): ?>
            <div class="bg-[#111827] border border-amber-500/30 rounded-2xl p-4 shadow-lg space-y-3 text-xs">
                <div class="flex items-center justify-between">
                    <div>
                        <span class="font-bold text-white"><?php echo htmlspecialchars($pr['username']); ?></span>
                        <span class="text-[10px] text-slate-400 block"><?php echo htmlspecialchars($pr['tournament_title']); ?> (<?php echo htmlspecialchars($pr['game_name']); ?>)</span>
                    </div>
                    <div class="text-right font-mono">
                        <span class="text-amber-400 font-bold block">Claim: Rank #<?php echo $pr['claimed_placement']; ?></span>
                        <span class="text-slate-400 text-[10px]"><?php echo $pr['claimed_kills']; ?> Kills</span>
                    </div>
                </div>

                <!-- Screenshot Preview Link -->
                <div class="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
                    <span class="text-[10px] text-slate-400 font-mono">Evidence File: <?php echo htmlspecialchars(basename($pr['screenshot_path'])); ?></span>
                    <a href="../<?php echo htmlspecialchars($pr['screenshot_path']); ?>" target="_blank" class="bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-2 py-1 rounded text-[10px] font-bold hover:bg-indigo-600/50">
                        <i class="fa-solid fa-eye mr-1"></i> View Screenshot
                    </a>
                </div>

                <!-- Adjudication Form -->
                <form method="POST" action="disputes.php" class="space-y-2 pt-1">
                    <input type="hidden" name="action" value="adjudicate_result">
                    <input type="hidden" name="result_id" value="<?php echo $pr['id']; ?>">
                    <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">

                    <input type="text" name="review_notes" placeholder="Adjudicator notes (e.g. Verified scorecard in FF lobby)" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white">

                    <div class="grid grid-cols-2 gap-2">
                        <button type="submit" name="decision" value="Approved" class="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-1.5 rounded-lg text-xs shadow-md transition">
                            <i class="fa-solid fa-check"></i> Approve &amp; Award XP
                        </button>
                        <button type="submit" name="decision" value="Rejected" class="bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/40 py-1.5 rounded-lg text-xs font-semibold transition">
                            <i class="fa-solid fa-xmark"></i> Reject Score
                        </button>
                    </div>
                </form>
            </div>
        <?php endforeach; ?>
    <?php endif; ?>
</div>

<!-- SECTION 2: OPEN DISPUTES QUEUE -->
<div class="border-t border-slate-800 pt-4">
    <h3 class="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
        <i class="fa-solid fa-triangle-exclamation text-rose-400"></i> Open Match Disputes &amp; Player Reports (<?php echo count($openDisputes); ?>)
    </h3>

    <div class="space-y-2.5">
        <?php if (empty($openDisputes)): ?>
            <p class="text-[11px] text-slate-500">No active disputes or fair-play reports filed.</p>
        <?php else: ?>
            <?php foreach ($openDisputes as $dp): ?>
                <div class="bg-[#111827] border border-slate-800 rounded-xl p-3 text-xs space-y-1.5">
                    <div class="flex items-center justify-between">
                        <span class="font-bold text-white"><?php echo htmlspecialchars($dp['subject']); ?></span>
                        <span class="text-[9px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <?php echo $dp['category']; ?>
                        </span>
                    </div>
                    <p class="text-[11px] text-slate-400 leading-relaxed"><?php echo nl2br(htmlspecialchars($dp['description'])); ?></p>
                    <span class="text-[10px] text-slate-500 block">Reported by: <?php echo htmlspecialchars($dp['username']); ?> &bull; <?php echo date('d M, h:i A', strtotime($dp['created_at'])); ?></span>

                    <form method="POST" action="disputes.php" class="flex gap-2 pt-1">
                        <input type="hidden" name="action" value="resolve_dispute">
                        <input type="hidden" name="dispute_id" value="<?php echo $dp['id']; ?>">
                        <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">

                        <input type="text" name="admin_notes" placeholder="Resolution notes" required class="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white">
                        <button type="submit" name="resolution" value="Resolved" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1 rounded-lg text-xs">
                            Resolve
                        </button>
                    </form>
                </div>
            <?php endforeach; ?>
        <?php endif; ?>
    </div>
</div>

<?php require_once __DIR__ . '/common/bottom.php'; ?>
