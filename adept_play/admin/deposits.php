<?php
/**
 * Clutch Arena - Admin Deposits Review (Kept for Record Auditing)
 */
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/common/header.php';

check_admin_auth();

$success_msg = '';
$error_msg = '';

// Handle Deposit Actions (Approve / Reject) with CSRF protection
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $submitted_token = $_POST['csrf_token'] ?? '';
    if (!verify_csrf_token($submitted_token)) {
        $error_msg = "Security session expired. Please refresh the page.";
    } else {
        $action = $_POST['action'] ?? '';
        $deposit_id = intval($_POST['deposit_id'] ?? 0);

        if ($deposit_id <= 0) {
            $error_msg = "Invalid deposit request selected.";
        } elseif ($action === 'approve') {
            try {
                $pdo->beginTransaction();

                $stmt = $pdo->prepare("SELECT id, user_id, amount, transaction_id, status FROM deposits WHERE id = ? FOR UPDATE");
                $stmt->execute([$deposit_id]);
                $deposit = $stmt->fetch();

                if (!$deposit || $deposit['status'] !== 'Pending') {
                    $error_msg = "Deposit request already processed or not found.";
                    $pdo->rollBack();
                } else {
                    $amount = floatval($deposit['amount']);
                    $user_id = intval($deposit['user_id']);

                    $upStmt = $pdo->prepare("UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?");
                    $upStmt->execute([$amount, $user_id]);

                    $depUpStmt = $pdo->prepare("UPDATE deposits SET status = 'Completed' WHERE id = ?");
                    $depUpStmt->execute([$deposit_id]);

                    $refId = 'TX-DEP-' . strtoupper(substr(md5(uniqid()), 0, 8));
                    $txStmt = $pdo->prepare("
                        INSERT INTO transactions (user_id, amount, type, status, reference_id, category, description) 
                        VALUES (?, ?, 'credit', 'Completed', ?, 'bonus', ?)
                    ");
                    $txStmt->execute([$user_id, $amount, $refId, "UPI Deposit Approved (Ref: " . $deposit['transaction_id'] . ")"]);

                    log_audit_action($pdo, 'admin', $_SESSION['admin_id'], 'deposit_approved', 'deposits', $deposit_id, "Approved ₹$amount");

                    $pdo->commit();
                    $success_msg = "Deposit of ₹" . number_format($amount, 2) . " approved.";
                }
            } catch (Exception $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                $error_msg = "Approval failed: " . $e->getMessage();
            }
        } elseif ($action === 'reject') {
            try {
                $stmt = $pdo->prepare("UPDATE deposits SET status = 'Rejected' WHERE id = ? AND status = 'Pending'");
                $stmt->execute([$deposit_id]);
                log_audit_action($pdo, 'admin', $_SESSION['admin_id'], 'deposit_rejected', 'deposits', $deposit_id, "Deposit rejected");
                $success_msg = "Deposit request rejected.";
            } catch (Exception $e) {
                $error_msg = "Rejection error: " . $e->getMessage();
            }
        }
    }
}

// Fetch Pending Deposits
$pending_deposits = [];
try {
    $pendingStmt = $pdo->query("
        SELECT d.*, u.username, u.email 
        FROM deposits d 
        INNER JOIN users u ON d.user_id = u.id 
        WHERE d.status = 'Pending' 
        ORDER BY d.created_at ASC
    ");
    $pending_deposits = $pendingStmt->fetchAll();
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
        <i class="fa-solid fa-arrow-down-to-bracket text-emerald-400"></i> Deposit Verification Ledger
    </h1>
    <p class="text-xs text-slate-400">Match UTR against bank statement for legacy deposit requests</p>
</div>

<!-- Compliance Notice -->
<div class="bg-amber-950/40 border border-amber-500/30 rounded-xl p-3 text-[11px] text-amber-200 mb-4">
    <i class="fa-solid fa-shield-halved mr-1 text-amber-400"></i>
    <strong>Regulatory Compliance Notice:</strong> Direct cash deposits remain disabled in player client pending payment provider clearance.
</div>

<div class="space-y-3">
    <?php if (empty($pending_deposits)): ?>
        <div class="text-center py-8 bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-500">
            <i class="fa-solid fa-circle-check text-2xl text-emerald-500/40 mb-1 block"></i>
            No pending deposit requests.
        </div>
    <?php else: ?>
        <?php foreach ($pending_deposits as $d): ?>
            <div class="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-md space-y-2.5 text-xs">
                <div class="flex items-center justify-between">
                    <span class="font-bold text-white"><?php echo htmlspecialchars($d['username']); ?></span>
                    <span class="font-mono font-bold text-emerald-400 text-sm">₹<?php echo number_format($d['amount'], 2); ?></span>
                </div>
                <div class="bg-slate-900 p-2 rounded-xl border border-slate-800 font-mono text-[11px] text-amber-300">
                    UTR: <?php echo htmlspecialchars($d['transaction_id']); ?>
                </div>

                <div class="grid grid-cols-2 gap-2 pt-1">
                    <form method="POST" action="deposits.php">
                        <input type="hidden" name="action" value="approve">
                        <input type="hidden" name="deposit_id" value="<?php echo $d['id']; ?>">
                        <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
                        <button type="submit" class="w-full bg-emerald-500 text-slate-950 font-bold py-1.5 rounded-lg text-xs">
                            Approve
                        </button>
                    </form>
                    <form method="POST" action="deposits.php">
                        <input type="hidden" name="action" value="reject">
                        <input type="hidden" name="deposit_id" value="<?php echo $d['id']; ?>">
                        <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
                        <button type="submit" class="w-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold py-1.5 rounded-lg text-xs">
                            Reject
                        </button>
                    </form>
                </div>
            </div>
        <?php endforeach; ?>
    <?php endif; ?>
</div>

<?php require_once __DIR__ . '/common/bottom.php'; ?>
