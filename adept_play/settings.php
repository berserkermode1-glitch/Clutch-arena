<?php
/**
 * Clutch Arena - Complete Settings Hub (PHP 8.2 + Tailwind)
 * Includes Account & Profile, Transaction History, Notifications, Security, Preferences, Support, and Legal.
 */
require_once __DIR__ . '/config.php';

// Authentication
check_user_auth();

$page_title = "Settings";
$user_id = $_SESSION['user_id'];
$success_msg = '';
$error_msg = '';

$section = clean_input($_GET['tab'] ?? 'hub');

// Handle Traditional PHP Form POST Actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    // Action 1: Profile & Free Fire UID Update
    if ($action === 'update_profile') {
        $username = clean_input($_POST['username'] ?? '');
        $email = clean_input($_POST['email'] ?? '');
        $upi_id = clean_input($_POST['upi_id'] ?? '');

        if (empty($username) || empty($email)) {
            $error_msg = "Username and email cannot be blank.";
        } else {
            try {
                $dupCheck = $pdo->prepare("SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?");
                $dupCheck->execute([$username, $email, $user_id]);
                if ($dupCheck->fetch()) {
                    $error_msg = "Username or email is already taken.";
                } else {
                    $upStmt = $pdo->prepare("UPDATE users SET username = ?, email = ?, upi_id = ? WHERE id = ?");
                    $upStmt->execute([$username, $email, $upi_id, $user_id]);
                    $_SESSION['username'] = $username;
                    $success_msg = "Profile updated successfully!";
                }
            } catch (Exception $e) {
                $error_msg = "Error updating profile: " . $e->getMessage();
            }
        }
    }

    // Action 2: Change Password
    elseif ($action === 'change_password') {
        $current_pwd = $_POST['current_password'] ?? '';
        $new_pwd = $_POST['new_password'] ?? '';
        $confirm_pwd = $_POST['confirm_password'] ?? '';

        if (empty($current_pwd) || empty($new_pwd)) {
            $error_msg = "Please fill in all password fields.";
        } elseif (strlen($new_pwd) < 6) {
            $error_msg = "New password must be at least 6 characters.";
        } elseif ($new_pwd !== $confirm_pwd) {
            $error_msg = "Passwords do not match.";
        } else {
            try {
                $stmt = $pdo->prepare("SELECT password FROM users WHERE id = ?");
                $stmt->execute([$user_id]);
                $userRec = $stmt->fetch();
                if (!$userRec || !password_verify($current_pwd, $userRec['password'])) {
                    $error_msg = "Current password is incorrect.";
                } else {
                    $hash = password_hash($new_pwd, PASSWORD_DEFAULT);
                    $upStmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
                    $upStmt->execute([$hash, $user_id]);
                    $success_msg = "Password updated securely across all devices!";
                }
            } catch (Exception $e) {
                $error_msg = "Password update failed: " . $e->getMessage();
            }
        }
    }

    // Action 3: Export User Data (JSON Download)
    elseif ($action === 'export_data') {
        try {
            $uStmt = $pdo->prepare("SELECT id, username, email, wallet_balance, upi_id, created_at FROM users WHERE id = ?");
            $uStmt->execute([$user_id]);
            $userData = $uStmt->fetch();

            $tStmt = $pdo->prepare("SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC");
            $tStmt->execute([$user_id]);
            $txns = $tStmt->fetchAll();

            $dataBundle = [
                'platform' => 'Clutch Arena Esports',
                'exported_at' => date('Y-m-d H:i:s'),
                'account' => $userData,
                'transactions' => $txns,
            ];

            header('Content-Type: application/json');
            header('Content-Disposition: attachment; filename="clutch-arena-data-user-' . $user_id . '.json"');
            echo json_encode($dataBundle, JSON_PRETTY_PRINT);
            exit;
        } catch (Exception $e) {
            $error_msg = "Export failed: " . $e->getMessage();
        }
    }

    // Action 4: Account Deletion
    elseif ($action === 'delete_account') {
        $confirm_text = $_POST['confirm_text'] ?? '';
        $reauth_pass = $_POST['reauth_password'] ?? '';

        if ($confirm_text !== 'DELETE MY ACCOUNT') {
            $error_msg = 'Please type "DELETE MY ACCOUNT" to confirm.';
        } else {
            try {
                $pStmt = $pdo->prepare("SELECT password FROM users WHERE id = ?");
                $pStmt->execute([$user_id]);
                $userPass = $pStmt->fetchColumn();

                if (!password_verify($reauth_pass, $userPass)) {
                    $error_msg = "Incorrect password. Cannot delete account.";
                } else {
                    $pdo->prepare("DELETE FROM transactions WHERE user_id = ?")->execute([$user_id]);
                    $pdo->prepare("DELETE FROM participants WHERE user_id = ?")->execute([$user_id]);
                    $pdo->prepare("DELETE FROM users WHERE id = ?")->execute([$user_id]);

                    session_destroy();
                    header("Location: login.php?deleted=1");
                    exit;
                }
            } catch (Exception $e) {
                $error_msg = "Deletion failed: " . $e->getMessage();
            }
        }
    }
}

// Fetch Fresh User Data
$stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
$stmt->execute([$user_id]);
$user = $stmt->fetch();

// Fetch genuine transactions
$tStmt = $pdo->prepare("SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC");
$tStmt->execute([$user_id]);
$transactions = $tStmt->fetchAll();

require_once __DIR__ . '/common/header.php';
?>

<!-- Alert Feedback -->
<?php if (!empty($success_msg)): ?>
    <div class="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 p-3.5 rounded-xl mb-4 text-xs flex items-center gap-2">
        <i class="fa-solid fa-circle-check text-emerald-400"></i>
        <span><?php echo $success_msg; ?></span>
    </div>
<?php endif; ?>

<?php if (!empty($error_msg)): ?>
    <div class="bg-rose-950/80 border border-rose-500/50 text-rose-300 p-3.5 rounded-xl mb-4 text-xs flex items-center gap-2">
        <i class="fa-solid fa-circle-exclamation text-rose-400"></i>
        <span><?php echo $error_msg; ?></span>
    </div>
<?php endif; ?>

<!-- Sub-Navigation Bar if in a specific category -->
<?php if ($section !== 'hub'): ?>
    <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
        <a href="settings.php" class="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300">
            <i class="fa-solid fa-arrow-left"></i>
            <span>All Settings</span>
        </a>
        <span class="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
            <?php echo htmlspecialchars($section); ?>
        </span>
    </div>
<?php endif; ?>

<?php if ($section === 'hub'): ?>
    <!-- ================= SETTINGS HUB ================= -->
    <div class="space-y-4">
        
        <!-- User Profile Banner -->
        <div class="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-3" style="display:flex;align-items:center;gap:12px;">
                <div class="w-13 h-13 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-400 flex items-center justify-center text-slate-950 text-xl font-black shadow-lg">
                    <?php echo strtoupper(substr($user['username'] ?? 'G', 0, 1)); ?>
                </div>
                <div>
                    <h2 class="text-sm font-black text-white"><?php echo htmlspecialchars($user['username']); ?></h2>
                    <p class="text-xs text-slate-400"><?php echo htmlspecialchars($user['email']); ?></p>
                    <span class="inline-block mt-1 text-[10px] text-purple-400 font-mono bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded">
                        Gamer ID #<?php echo $user['id']; ?>
                    </span>
                </div>
            </div>
            <a href="settings.php?tab=account" class="text-xs font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-3 py-1.5 rounded-xl hover:bg-cyan-900 transition">
                Edit
            </a>
        </div>

        <!-- Compliance Banner -->
        <div class="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-3 text-xs text-amber-200">
            <div class="font-bold text-amber-300 flex items-center gap-1.5 mb-1">
                <i class="fa-solid fa-shield-halved"></i> Clearance & Compliance Mode
            </div>
            <p class="text-[11px] text-amber-200/80">
                Cash deposits & bank withdrawals are paused pending regulatory gateway clearance. Free tournaments and genuine verified records remain active.
            </p>
        </div>

        <!-- 7 Category Cards -->
        <div class="space-y-2">
            <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">Settings Categories</div>

            <!-- 1. Account & Profile -->
            <a href="settings.php?tab=account" class="block bg-[#111827] border border-slate-800 hover:border-slate-700 p-3.5 rounded-2xl transition">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center text-base">
                            <i class="fa-solid fa-user-gear"></i>
                        </div>
                        <div>
                            <h3 class="text-xs font-bold text-white">Account & Profile</h3>
                            <p class="text-[10px] text-slate-400">Username, Free Fire UID, verified contacts & sessions</p>
                        </div>
                    </div>
                    <i class="fa-solid fa-chevron-right text-slate-600 text-xs"></i>
                </div>
            </a>

            <!-- 2. Transaction & Prize History -->
            <a href="settings.php?tab=transactions" class="block bg-[#111827] border border-slate-800 hover:border-slate-700 p-3.5 rounded-2xl transition">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center text-base">
                            <i class="fa-solid fa-receipt"></i>
                        </div>
                        <div>
                            <h3 class="text-xs font-bold text-white">Transaction & Prize History</h3>
                            <p class="text-[10px] text-slate-400">Genuine match ledger, prize distributions & receipts</p>
                        </div>
                    </div>
                    <i class="fa-solid fa-chevron-right text-slate-600 text-xs"></i>
                </div>
            </a>

            <!-- 3. Notifications -->
            <a href="settings.php?tab=notifications" class="block bg-[#111827] border border-slate-800 hover:border-slate-700 p-3.5 rounded-2xl transition">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-fuchsia-600/20 text-fuchsia-400 flex items-center justify-center text-base">
                            <i class="fa-solid fa-bell"></i>
                        </div>
                        <div>
                            <h3 class="text-xs font-bold text-white">Notifications & Alerts</h3>
                            <p class="text-[10px] text-slate-400">Match countdowns, room alerts & preference rules</p>
                        </div>
                    </div>
                    <i class="fa-solid fa-chevron-right text-slate-600 text-xs"></i>
                </div>
            </a>

            <!-- 4. Security & Privacy -->
            <a href="settings.php?tab=security" class="block bg-[#111827] border border-slate-800 hover:border-slate-700 p-3.5 rounded-2xl transition">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center text-base">
                            <i class="fa-solid fa-shield-halved"></i>
                        </div>
                        <div>
                            <h3 class="text-xs font-bold text-white">Security & Privacy</h3>
                            <p class="text-[10px] text-slate-400">Password change, privacy visibility & data export</p>
                        </div>
                    </div>
                    <i class="fa-solid fa-chevron-right text-slate-600 text-xs"></i>
                </div>
            </a>

            <!-- 5. App Preferences -->
            <a href="settings.php?tab=preferences" class="block bg-[#111827] border border-slate-800 hover:border-slate-700 p-3.5 rounded-2xl transition">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center text-base">
                            <i class="fa-solid fa-palette"></i>
                        </div>
                        <div>
                            <h3 class="text-xs font-bold text-white">App Preferences</h3>
                            <p class="text-[10px] text-slate-400">Dark/light theme, battle colors & accessibility</p>
                        </div>
                    </div>
                    <i class="fa-solid fa-chevron-right text-slate-600 text-xs"></i>
                </div>
            </a>

            <!-- 6. Help & Support -->
            <a href="settings.php?tab=support" class="block bg-[#111827] border border-slate-800 hover:border-slate-700 p-3.5 rounded-2xl transition">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center text-base">
                            <i class="fa-solid fa-headset"></i>
                        </div>
                        <div>
                            <h3 class="text-xs font-bold text-white">Help & Support</h3>
                            <p class="text-[10px] text-slate-400">FAQs, tournament disputes & player reports</p>
                        </div>
                    </div>
                    <i class="fa-solid fa-chevron-right text-slate-600 text-xs"></i>
                </div>
            </a>

            <!-- 7. About & Legal -->
            <a href="settings.php?tab=about" class="block bg-[#111827] border border-slate-800 hover:border-slate-700 p-3.5 rounded-2xl transition">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center text-base">
                            <i class="fa-solid fa-scale-balanced"></i>
                        </div>
                        <div>
                            <h3 class="text-xs font-bold text-white">About & Legal</h3>
                            <p class="text-[10px] text-slate-400">Version 2.4.0, terms of service & community rules</p>
                        </div>
                    </div>
                    <i class="fa-solid fa-chevron-right text-slate-600 text-xs"></i>
                </div>
            </a>
        </div>

        <a href="logout.php" class="block w-full text-center bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-bold py-2.5 rounded-xl text-xs transition">
            <i class="fa-solid fa-power-off mr-1"></i> Log Out
        </a>
    </div>

<?php elseif ($section === 'account'): ?>
    <!-- ================= 1. ACCOUNT & PROFILE ================= -->
    <div class="space-y-4">
        <h2 class="text-base font-black text-white">Gamer Account &amp; Profile</h2>

        <div class="bg-[#111827] border border-slate-800 rounded-2xl p-4 space-y-3">
            <form method="POST" action="settings.php?tab=account" class="space-y-3">
                <input type="hidden" name="action" value="update_profile">

                <div>
                    <label class="block text-[11px] font-medium text-slate-300 mb-1">Username</label>
                    <input type="text" name="username" value="<?php echo htmlspecialchars($user['username']); ?>" required class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400">
                </div>

                <div>
                    <label class="block text-[11px] font-medium text-slate-300 mb-1">Email</label>
                    <input type="email" name="email" value="<?php echo htmlspecialchars($user['email']); ?>" required class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400">
                </div>

                <div>
                    <label class="block text-[11px] font-medium text-slate-300 mb-1">Payout UPI ID (Record)</label>
                    <input type="text" name="upi_id" value="<?php echo htmlspecialchars($user['upi_id'] ?? ''); ?>" placeholder="e.g. name@okhdfcbank" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-400">
                    <span class="text-[10px] text-slate-500">Withdrawals currently paused pending gateway clearance.</span>
                </div>

                <button type="submit" class="w-full bg-gradient-to-r from-purple-600 to-cyan-500 text-slate-950 font-bold py-2.5 rounded-xl text-xs shadow-md">
                    Save Profile Changes
                </button>
            </form>
        </div>

        <!-- Change Password -->
        <div class="bg-[#111827] border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 class="text-xs font-bold text-white border-b border-slate-800 pb-2">Change Password</h3>
            <form method="POST" action="settings.php?tab=account" class="space-y-3">
                <input type="hidden" name="action" value="change_password">

                <div>
                    <label class="block text-[11px] font-medium text-slate-300 mb-1">Current Password</label>
                    <input type="password" name="current_password" required class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                </div>

                <div>
                    <label class="block text-[11px] font-medium text-slate-300 mb-1">New Password</label>
                    <input type="password" name="new_password" required minlength="6" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                </div>

                <div>
                    <label class="block text-[11px] font-medium text-slate-300 mb-1">Confirm New Password</label>
                    <input type="password" name="confirm_password" required class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                </div>

                <button type="submit" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-xl text-xs border border-slate-700">
                    Update Password
                </button>
            </form>
        </div>
    </div>

<?php elseif ($section === 'transactions'): ?>
    <!-- ================= 2. TRANSACTIONS & PRIZES ================= -->
    <div class="space-y-4">
        <h2 class="text-base font-black text-white">Genuine Ledger &amp; Prize History</h2>
        
        <div class="space-y-2">
            <?php if (empty($transactions)): ?>
                <div class="text-center py-8 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-500">
                    No transactions recorded yet.
                </div>
            <?php else: ?>
                <?php foreach ($transactions as $tx): 
                    $isCredit = ($tx['type'] === 'credit');
                ?>
                    <div class="bg-[#111827] border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                        <div>
                            <h4 class="text-xs font-bold text-white"><?php echo htmlspecialchars($tx['description']); ?></h4>
                            <span class="text-[10px] text-slate-400 font-mono"><?php echo date('d M Y, h:i A', strtotime($tx['created_at'])); ?></span>
                        </div>
                        <div class="text-right font-mono font-bold text-xs <?php echo $isCredit ? 'text-emerald-400' : 'text-rose-400'; ?>">
                            <?php echo $isCredit ? '+' : '-'; ?>₹<?php echo number_format($tx['amount'], 2); ?>
                        </div>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>
    </div>

<?php elseif ($section === 'security'): ?>
    <!-- ================= 4. SECURITY & PRIVACY ================= -->
    <div class="space-y-4">
        <h2 class="text-base font-black text-white">Security &amp; Data Rights</h2>

        <!-- Data Export -->
        <div class="bg-[#111827] border border-slate-800 rounded-2xl p-4 space-y-2">
            <h3 class="text-xs font-bold text-white">Export My Data</h3>
            <p class="text-[11px] text-slate-400">Download a full machine-readable JSON archive of your account and ledger.</p>
            <form method="POST" action="settings.php?tab=security">
                <input type="hidden" name="action" value="export_data">
                <button type="submit" class="bg-cyan-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs">
                    Download Archive (JSON)
                </button>
            </form>
        </div>

        <!-- Account Deletion -->
        <div class="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-4 space-y-3">
            <h3 class="text-xs font-bold text-rose-400">Danger Zone: Delete Account</h3>
            <form method="POST" action="settings.php?tab=security" onsubmit="return confirm('Permanently erase account?');" class="space-y-3">
                <input type="hidden" name="action" value="delete_account">
                <div>
                    <label class="block text-[11px] text-slate-300 mb-1">Type <strong>DELETE MY ACCOUNT</strong></label>
                    <input type="text" name="confirm_text" required class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                </div>
                <div>
                    <label class="block text-[11px] text-slate-300 mb-1">Account Password</label>
                    <input type="password" name="reauth_password" required class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                </div>
                <button type="submit" class="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-4 rounded-xl text-xs">
                    Permanently Delete
                </button>
            </form>
        </div>
    </div>

<?php else: ?>
    <!-- Other Sections Overview -->
    <div class="bg-[#111827] border border-slate-800 rounded-2xl p-5 text-center space-y-3">
        <div class="w-12 h-12 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center mx-auto text-xl">
            <i class="fa-solid fa-circle-info"></i>
        </div>
        <h3 class="text-sm font-bold text-white capitalize"><?php echo htmlspecialchars($section); ?> Section</h3>
        <p class="text-xs text-slate-400 max-w-sm mx-auto">
            All esports preferences and tournament controls are accessible above or through the Clutch Arena web applet.
        </p>
        <a href="settings.php" class="inline-block bg-slate-800 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold">
            &larr; Return to Settings Hub
        </a>
    </div>
<?php endif; ?>

<?php
require_once __DIR__ . '/common/bottom.php';
?>
