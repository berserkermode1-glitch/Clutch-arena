<?php
/**
 * Clutch Arena - User Wallet (Balance, UPI Deposits, Withdrawals, Transactions)
 */
require_once __DIR__ . '/config.php';

// Authentication
check_user_auth();

$page_title = "Wallet";
$user_id = $_SESSION['user_id'];
$success_msg = '';
$error_msg = '';

// Fetch User and Current Settings
$userStmt = $pdo->prepare("SELECT id, username, email, wallet_balance, upi_id FROM users WHERE id = ?");
$userStmt->execute([$user_id]);
$user = $userStmt->fetch();
$wallet_balance = floatval($user['wallet_balance'] ?? 0);
$user_upi_id = clean_input($user['upi_id'] ?? '');

// Fetch Admin UPI Settings for Deposit
$admin_upi_id = get_setting($pdo, 'admin_upi_id', 'esports@okhdfcbank');
$admin_qr_code = get_setting($pdo, 'admin_qr_code', 'uploads/qr_codes/default_qr.png');

// Handle Form Submissions (Traditional PHP POST)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    // Action 1: Submit UPI Deposit Request
    if ($action === 'deposit_request') {
        $amount = floatval($_POST['amount'] ?? 0);
        $transaction_id = clean_input($_POST['transaction_id'] ?? '');

        if ($amount < 10) {
            $error_msg = "Minimum deposit amount is ₹10.";
        } elseif (empty($transaction_id) || strlen($transaction_id) < 6) {
            $error_msg = "Please enter a valid 12-digit UPI Transaction / UTR ID.";
        } else {
            try {
                // Check if transaction ID already submitted
                $dupCheck = $pdo->prepare("SELECT id FROM deposits WHERE transaction_id = ? AND status IN ('Pending', 'Completed')");
                $dupCheck->execute([$transaction_id]);
                if ($dupCheck->fetch()) {
                    $error_msg = "This UPI Transaction ID has already been submitted.";
                } else {
                    $stmt = $pdo->prepare("INSERT INTO deposits (user_id, amount, transaction_id, status) VALUES (?, ?, ?, 'Pending')");
                    $stmt->execute([$user_id, $amount, $transaction_id]);
                    $success_msg = "Deposit request for ₹" . number_format($amount, 2) . " submitted! Admin will verify and credit your wallet shortly.";
                }
            } catch (Exception $e) {
                $error_msg = "Deposit error: " . $e->getMessage();
            }
        }
    }

    // Action 2: Submit UPI Withdrawal Request
    elseif ($action === 'withdraw_request') {
        $amount = floatval($_POST['amount'] ?? 0);

        if (empty($user_upi_id)) {
            $error_msg = "Please set your UPI ID in Profile before requesting withdrawal.";
        } elseif ($amount < 50) {
            $error_msg = "Minimum withdrawal amount is ₹50.";
        } elseif ($amount > $wallet_balance) {
            $error_msg = "Insufficient balance. Available to withdraw: ₹" . number_format($wallet_balance, 2);
        } else {
            try {
                // Deduct or put balance on hold during withdrawal
                $pdo->beginTransaction();

                // Re-verify balance with row lock
                $balCheck = $pdo->prepare("SELECT wallet_balance FROM users WHERE id = ? FOR UPDATE");
                $balCheck->execute([$user_id]);
                $currentBal = floatval($balCheck->fetchColumn());

                if ($amount > $currentBal) {
                    $error_msg = "Insufficient wallet balance.";
                    $pdo->rollBack();
                } else {
                    // Deduct balance immediately to prevent double spending
                    $new_balance = $currentBal - $amount;
                    $upStmt = $pdo->prepare("UPDATE users SET wallet_balance = ? WHERE id = ?");
                    $upStmt->execute([$new_balance, $user_id]);

                    // Insert withdrawal request
                    $withStmt = $pdo->prepare("INSERT INTO withdrawals (user_id, amount, upi_id, status) VALUES (?, ?, ?, 'Pending')");
                    $withStmt->execute([$user_id, $amount, $user_upi_id]);

                    // Insert hold transaction
                    $txStmt = $pdo->prepare("INSERT INTO transactions (user_id, amount, type, description) VALUES (?, ?, 'debit', ?)");
                    $txStmt->execute([$user_id, $amount, "Withdrawal request to UPI (" . $user_upi_id . ")"]);

                    $pdo->commit();
                    $wallet_balance = $new_balance;
                    $success_msg = "Withdrawal request of ₹" . number_format($amount, 2) . " submitted to " . htmlspecialchars($user_upi_id) . "! Amount will be sent within 2-4 hours.";
                }
            } catch (Exception $e) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                $error_msg = "Withdrawal error: " . $e->getMessage();
            }
        }
    }
}

// Fetch Transaction History
$txStmt = $pdo->prepare("SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 25");
$txStmt->execute([$user_id]);
$transactions = $txStmt->fetchAll();

// Fetch Pending Requests
$pendingDeposits = $pdo->prepare("SELECT * FROM deposits WHERE user_id = ? AND status = 'Pending' ORDER BY created_at DESC");
$pendingDeposits->execute([$user_id]);
$userPendingDeposits = $pendingDeposits->fetchAll();

$pendingWithdrawals = $pdo->prepare("SELECT * FROM withdrawals WHERE user_id = ? AND status = 'Pending' ORDER BY created_at DESC");
$pendingWithdrawals->execute([$user_id]);
$userPendingWithdrawals = $pendingWithdrawals->fetchAll();

require_once __DIR__ . '/common/header.php';
?>

<!-- Alert Feedback -->
<?php if (!empty($success_msg)): ?>
    <div class="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 p-3.5 rounded-xl mb-4 text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40">
        <i class="fa-solid fa-circle-check text-emerald-400 text-sm"></i>
        <span><?php echo $success_msg; ?></span>
    </div>
<?php endif; ?>

<?php if (!empty($error_msg)): ?>
    <div class="bg-rose-950/80 border border-rose-500/50 text-rose-300 p-3.5 rounded-xl mb-4 text-xs flex items-center gap-2 shadow-lg shadow-rose-950/40">
        <i class="fa-solid fa-circle-exclamation text-rose-400 text-sm"></i>
        <span><?php echo $error_msg; ?></span>
    </div>
<?php endif; ?>

<!-- Large Prominent Wallet Card -->
<div class="relative bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 border border-slate-700/80 rounded-2xl p-5 mb-5 shadow-2xl overflow-hidden">
    <!-- Background Watermark -->
    <div class="absolute -right-4 -bottom-6 text-7xl text-emerald-500/10 pointer-events-none font-mono font-black">
        ₹
    </div>

    <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <i class="fa-solid fa-wallet text-emerald-400"></i> Total Wallet Balance
        </span>
        <span class="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
            Active
        </span>
    </div>

    <div class="text-3xl font-black text-white font-mono tracking-tight my-2">
        ₹<?php echo number_format($wallet_balance, 2); ?>
    </div>

    <div class="text-[11px] text-slate-400 mb-5">
        Linked UPI: <span class="font-mono text-emerald-400 font-semibold"><?php echo !empty($user_upi_id) ? htmlspecialchars($user_upi_id) : 'Not linked (Tap profile)'; ?></span>
    </div>

    <!-- Quick Action Buttons: Add Money & Withdraw -->
    <div class="grid grid-cols-2 gap-3">
        <button type="button" onclick="openModal('deposit-modal')" class="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition">
            <i class="fa-solid fa-plus-circle"></i> Add Money
        </button>
        <button type="button" onclick="openModal('withdraw-modal')" class="bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 active:scale-95 transition">
            <i class="fa-solid fa-arrow-up-from-bracket"></i> Withdraw
        </button>
    </div>
</div>

<!-- Pending Requests Alert (If Any) -->
<?php if (!empty($userPendingDeposits) || !empty($userPendingWithdrawals)): ?>
    <div class="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-3 mb-5 text-xs space-y-2">
        <div class="font-bold text-amber-300 flex items-center gap-1.5">
            <i class="fa-solid fa-clock-rotate-left"></i> Pending Verifications
        </div>
        <?php foreach ($userPendingDeposits as $pd): ?>
            <div class="flex justify-between items-center text-slate-300 bg-slate-900/60 p-2 rounded-lg text-[11px]">
                <div>
                    <span class="text-emerald-400 font-semibold">Deposit Request:</span> ₹<?php echo number_format($pd['amount'], 2); ?>
                    <span class="block text-[10px] text-slate-400 font-mono">UTR: <?php echo htmlspecialchars($pd['transaction_id']); ?></span>
                </div>
                <span class="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-[10px] font-bold">Verifying</span>
            </div>
        <?php endforeach; ?>
        <?php foreach ($userPendingWithdrawals as $pw): ?>
            <div class="flex justify-between items-center text-slate-300 bg-slate-900/60 p-2 rounded-lg text-[11px]">
                <div>
                    <span class="text-rose-400 font-semibold">Withdrawal Request:</span> ₹<?php echo number_format($pw['amount'], 2); ?>
                    <span class="block text-[10px] text-slate-400 font-mono">UPI: <?php echo htmlspecialchars($pw['upi_id']); ?></span>
                </div>
                <span class="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-[10px] font-bold">Processing</span>
            </div>
        <?php endforeach; ?>
    </div>
<?php endif; ?>

<!-- Transaction History Section -->
<div class="mb-4 flex items-center justify-between">
    <h3 class="text-sm font-bold text-white flex items-center gap-2">
        <i class="fa-solid fa-list-check text-slate-400"></i> Transaction History
    </h3>
    <span class="text-[11px] text-slate-500 font-mono"><?php echo count($transactions); ?> records</span>
</div>

<div class="space-y-2.5">
    <?php if (empty($transactions)): ?>
        <div class="text-center py-8 bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <p class="text-xs text-slate-500">No transactions recorded yet.</p>
        </div>
    <?php else: ?>
        <?php foreach ($transactions as $tx): 
            $is_credit = ($tx['type'] === 'credit');
            $tx_date = date('d M, h:i A', strtotime($tx['created_at']));
        ?>
            <div class="bg-[#111827] border border-slate-800/90 rounded-xl p-3 flex items-center justify-between shadow-sm">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg <?php echo $is_credit ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'; ?> flex items-center justify-center text-xs font-bold">
                        <i class="fa-solid <?php echo $is_credit ? 'fa-arrow-down-left' : 'fa-arrow-up-right'; ?>"></i>
                    </div>
                    <div>
                        <p class="text-xs font-semibold text-white leading-tight">
                            <?php echo htmlspecialchars($tx['description']); ?>
                        </p>
                        <span class="text-[10px] text-slate-500"><?php echo $tx_date; ?></span>
                    </div>
                </div>

                <div class="text-right font-mono font-bold text-xs <?php echo $is_credit ? 'text-emerald-400' : 'text-rose-400'; ?>">
                    <?php echo $is_credit ? '+' : '-'; ?>₹<?php echo number_format($tx['amount'], 2); ?>
                </div>
            </div>
        <?php endforeach; ?>
    <?php endif; ?>
</div>

<!-- ================= MODAL 1: ADD MONEY (UPI DEPOSIT) ================= -->
<div id="deposit-modal" class="hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4">
    <div class="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        
        <div class="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <i class="fa-solid fa-qrcode text-emerald-400"></i> Manual UPI Deposit
            </h3>
            <button type="button" onclick="closeModal('deposit-modal')" class="text-slate-400 hover:text-white p-1">
                <i class="fa-solid fa-xmark text-base"></i>
            </button>
        </div>

        <!-- Instructions -->
        <p class="text-[11px] text-slate-400 mb-3 text-center">
            Scan QR or copy UPI ID, complete payment in GPay/PhonePe/Paytm, then paste the 12-digit UTR/Txn ID below.
        </p>

        <!-- Admin QR Code Box -->
        <div class="bg-white p-3 rounded-xl mx-auto w-44 h-44 flex items-center justify-center shadow-md mb-3">
            <?php if (!empty($admin_qr_code) && file_exists(__DIR__ . '/' . $admin_qr_code)): ?>
                <img src="<?php echo htmlspecialchars($admin_qr_code); ?>" alt="Admin UPI QR Code" class="max-w-full max-h-full object-contain">
            <?php else: ?>
                <!-- Fallback simulated dynamic UPI QR Code -->
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=upi://pay?pa=<?php echo urlencode($admin_upi_id); ?>%26pn=ClutchArena%26cu=INR" alt="Clutch Arena UPI QR" class="max-w-full max-h-full object-contain">
            <?php endif; ?>
        </div>

        <!-- Admin UPI ID Box with One-Click Copy -->
        <div class="bg-slate-950 border border-slate-800 rounded-xl p-2.5 mb-4 flex items-center justify-between text-xs">
            <div>
                <span class="block text-[10px] text-slate-500">Official UPI ID:</span>
                <span class="font-mono font-bold text-emerald-400 select-all" id="admin-upi-text"><?php echo htmlspecialchars($admin_upi_id); ?></span>
            </div>
            <button type="button" onclick="copyUpiId()" class="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition">
                <i class="fa-solid fa-copy mr-1"></i> Copy
            </button>
        </div>

        <!-- Deposit Request Form (Traditional PHP POST) -->
        <form method="POST" action="wallet.php" class="space-y-3">
            <input type="hidden" name="action" value="deposit_request">

            <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Amount Paid (₹)</label>
                <input type="number" name="amount" min="10" step="1" required placeholder="e.g. 100" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500">
            </div>

            <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">UPI Transaction ID / UTR</label>
                <input type="text" name="transaction_id" required placeholder="12-digit Ref / UTR number" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono">
                <span class="text-[10px] text-slate-500">Found in PhonePe / Google Pay payment details</span>
            </div>

            <button type="submit" class="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-500/25 transition">
                Submit Deposit for Approval
            </button>
        </form>
    </div>
</div>

<!-- ================= MODAL 2: WITHDRAW MONEY ================= -->
<div id="withdraw-modal" class="hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4">
    <div class="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-5 shadow-2xl relative">
        
        <div class="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <i class="fa-solid fa-money-bill-transfer text-emerald-400"></i> Withdraw to UPI
            </h3>
            <button type="button" onclick="closeModal('withdraw-modal')" class="text-slate-400 hover:text-white p-1">
                <i class="fa-solid fa-xmark text-base"></i>
            </button>
        </div>

        <?php if (empty($user_upi_id)): ?>
            <div class="bg-amber-950/40 border border-amber-500/40 text-amber-300 p-3 rounded-xl mb-4 text-xs">
                <p class="font-bold">No UPI ID saved!</p>
                <p class="text-[11px] mt-1 text-amber-200/80">Please enter your UPI ID in your Profile page before requesting withdrawal.</p>
                <a href="profile.php" class="inline-block mt-2 bg-amber-500 text-slate-950 font-bold px-3 py-1 rounded-lg text-[10px]">
                    Go to Profile &rarr;
                </a>
            </div>
        <?php else: ?>
            <div class="bg-slate-950 border border-slate-800 rounded-xl p-3 mb-4 text-xs">
                <span class="block text-[10px] text-slate-500 mb-0.5">Payout Target UPI ID:</span>
                <span class="font-mono font-bold text-emerald-400 select-all"><?php echo htmlspecialchars($user_upi_id); ?></span>
                <span class="block text-[10px] text-slate-500 mt-1">Available balance: ₹<?php echo number_format($wallet_balance, 2); ?></span>
            </div>

            <!-- Withdraw Request Form -->
            <form method="POST" action="wallet.php" class="space-y-3">
                <input type="hidden" name="action" value="withdraw_request">

                <div>
                    <label class="block text-xs font-medium text-slate-300 mb-1">Amount to Withdraw (₹)</label>
                    <input type="number" name="amount" min="50" max="<?php echo floor($wallet_balance); ?>" step="1" required placeholder="Min ₹50" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500">
                </div>

                <p class="text-[10px] text-slate-400">
                    Withdrawal requests are processed via UPI manually within 2 to 4 hours.
                </p>

                <button type="submit" class="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-500/25 transition">
                    Confirm Withdrawal Request
                </button>
            </form>
        <?php endif; ?>
    </div>
</div>

<script>
    function openModal(id) {
        document.getElementById(id).classList.remove('hidden');
    }
    function closeModal(id) {
        document.getElementById(id).classList.add('hidden');
    }
    function copyUpiId() {
        const upi = document.getElementById('admin-upi-text').innerText;
        navigator.clipboard.writeText(upi).then(() => {
            alert('Admin UPI ID copied to clipboard: ' + upi);
        });
    }
</script>

<?php
require_once __DIR__ . '/common/bottom.php';
?>
