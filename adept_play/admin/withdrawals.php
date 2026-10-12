<?php
/**
 * Clutch Arena - Admin Withdrawals Review (Kept for Record Auditing)
 */
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/common/header.php';

check_admin_auth();

$success_msg = '';
$error_msg = '';

// Handle Withdrawal Actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $submitted_token = $_POST['csrf_token'] ?? '';
    if (!verify_csrf_token($submitted_token)) {
        $error_msg = "Security session expired. Please refresh the page.";
    } else {
        $action = $_POST['action'] ?? '';
        $withdrawal_id = intval($_POST['withdrawal_id'] ?? 0);

        if ($withdrawal_id <= 0) {
            $error_msg = "Invalid withdrawal request selected.";
        } elseif ($action === 'approve') {
            try {
                $stmt = $pdo->prepare("UPDATE withdrawals SET status = 'Completed' WHERE id = ? AND status = 'Pending'");
                $stmt->execute([$withdrawal_id]);
                log_audit_action($pdo, 'admin', $_SESSION['admin_id'], 'withdrawal_approved', 'withdrawals', $withdrawal_id, "Approved");
                $success_msg = "Withdrawal marked as completed.";
            } catch (Exception $e) {
                $error_msg = "Approval failed: " . $e->getMessage();
            }
        } elseif ($action === 'reject') {
            try {
                $pdo->beginTransaction();
                $wStmt = $pdo->prepare("SELECT user_id, amount, status FROM withdrawals WHERE id = ? FOR UPDATE");
                $wStmt->execute([$withdrawal_id]);
                $w = $wStmt->fetch();

                if ($w && $w['status'] === 'Pending') {
                    // Refund balance to user
                    $upUser = $pdo->prepare("UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?");
                    $upUser->execute([$w['amount'], $w['user_id']]);

                    $upW = $pdo->prepare("UPDATE withdrawals SET status = 'Rejected' WHERE id = ?");
                    $upW->execute([$withdrawal_id]);

                    log_audit_action($pdo, 'admin', $_SESSION['admin_id'], 'withdrawal_rejected', 'withdrawals', $withdrawal_id, "Rejected and refunded ₹{$w['amount']}");
                    $pdo->commit();
                    $success_msg = "Withdrawal rejected and amount refunded to player balance.";
                } else {
                    $pdo->rollBack();
                }
            } catch (Exception $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                $error_msg = "Rejection error: " . $e->getMessage();
            }
        }
    }
}

// Fetch Pending Withdrawals
$pending_withdrawals = [];
try {
    $stmt = $pdo->query("
        SELECT w.*, u.username, u.email 
        FROM withdrawals w 
        INNER JOIN users u ON w.user_id = u.id 
        WHERE w.status = 'Pending' 
        ORDER BY w.created_at ASC
    ");
    $pending_withdrawals = $stmt->fetchAll();
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
        <i class="fa-solid fa-arrow-up-from-bracket text-rose-400"></i> Withdrawal Payout Ledger
    </h1>
    <p class="text-xs text-slate-400">Audit payout requests against player UPI IDs</p>
</div>

<!-- Compliance Notice -->
<div class="bg-amber-950/40 border border-amber-500/30 rounded-xl p-3 text-[11px] text-amber-200 mb-4">
    <i class="fa-solid fa-shield-halved mr-1 text-amber-400"></i>
    <strong>Compliance Hold:</strong> Real-money withdrawals remain paused pending payment gateway regulatory approvals.
</div>

<div class="space-y-3">
    <?php if (empty($pending_withdrawals)): ?>
        <div class="text-center py-8 bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-500">
            <i class="fa-solid fa-circle-check text-2xl text-emerald-500/40 mb-1 block"></i>
            No pending withdrawal requests.
        </div>
    <?php else: ?>
        <?php foreach ($pending_withdrawals as $w): ?>
            <div class="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-md space-y-2.5 text-xs">
                <div class="flex items-center justify-between">
                    <span class="font-bold text-white"><?php echo htmlspecialchars($w['username']); ?></span>
                    <span class="font-mono font-bold text-rose-400 text-sm">₹<?php echo number_format($w['amount'], 2); ?></span>
                </div>
                <div class="bg-slate-900 p-2 rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-400">
                    UPI: <?php echo htmlspecialchars($w['upi_id']); ?>
                </div>

                <div class="grid grid-cols-2 gap-2 pt-1">
                    <form method="POST" action="withdrawals.php">
                        <input type="hidden" name="action" value="approve">
                        <input type="hidden" name="withdrawal_id" value="<?php echo $w['id']; ?>">
                        <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
                        <button type="submit" class="w-full bg-emerald-500 text-slate-950 font-bold py-1.5 rounded-lg text-xs">
                            Mark Paid
                        </button>
                    </form>
                    <form method="POST" action="withdrawals.php">
                        <input type="hidden" name="action" value="reject">
                        <input type="hidden" name="withdrawal_id" value="<?php echo $w['id']; ?>">
                        <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
                        <button type="submit" class="w-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold py-1.5 rounded-lg text-xs">
                            Reject &amp; Refund
                        </button>
                    </form>
                </div>
            </div>
        <?php endforeach; ?>
    <?php endif; ?>
</div>

<?php require_once __DIR__ . '/common/bottom.php'; ?>
