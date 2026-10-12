<?php
/**
 * Clutch Arena - User Profile (Edit Profile, Save UPI ID, Change Password, Logout)
 */
require_once __DIR__ . '/config.php';

// Authentication
check_user_auth();

$page_title = "My Profile";
$user_id = $_SESSION['user_id'];
$success_msg = '';
$error_msg = '';

// Handle Profile Updates (Traditional PHP Form POST)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    // Action 1: Update Profile & UPI ID
    if ($action === 'update_profile') {
        $username = clean_input($_POST['username'] ?? '');
        $email = clean_input($_POST['email'] ?? '');
        $upi_id = clean_input($_POST['upi_id'] ?? '');

        if (empty($username) || empty($email)) {
            $error_msg = "Username and Email cannot be blank.";
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $error_msg = "Invalid email format.";
        } else {
            try {
                // Check if username/email taken by another user
                $dupCheck = $pdo->prepare("SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?");
                $dupCheck->execute([$username, $email, $user_id]);
                if ($dupCheck->fetch()) {
                    $error_msg = "Username or Email is already in use by another gamer.";
                } else {
                    $updateStmt = $pdo->prepare("UPDATE users SET username = ?, email = ?, upi_id = ? WHERE id = ?");
                    $updateStmt->execute([$username, $email, $upi_id, $user_id]);

                    $_SESSION['username'] = $username;
                    $success_msg = "Profile and UPI details updated successfully!";
                }
            } catch (Exception $e) {
                $error_msg = "Update error: " . $e->getMessage();
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
            $error_msg = "New password and confirmation do not match.";
        } else {
            try {
                $stmt = $pdo->prepare("SELECT password FROM users WHERE id = ?");
                $stmt->execute([$user_id]);
                $user = $stmt->fetch();

                if (!password_verify($current_pwd, $user['password'])) {
                    $error_msg = "Current password is incorrect.";
                } else {
                    $hashed = password_hash($new_pwd, PASSWORD_DEFAULT);
                    $upStmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
                    $upStmt->execute([$hashed, $user_id]);
                    $success_msg = "Password changed successfully!";
                }
            } catch (Exception $e) {
                $error_msg = "Password update error: " . $e->getMessage();
            }
        }
    }
}

// Fetch Fresh User Data
$stmt = $pdo->prepare("SELECT id, username, email, wallet_balance, upi_id, created_at FROM users WHERE id = ?");
$stmt->execute([$user_id]);
$user = $stmt->fetch();

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

<!-- User Profile Card -->
<div class="bg-[#111827] border border-slate-800 rounded-2xl p-5 mb-5 shadow-lg flex items-center gap-4">
    <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-slate-950 text-2xl font-black shadow-lg shadow-emerald-500/25">
        <?php echo strtoupper(substr($user['username'], 0, 1)); ?>
    </div>
    <div class="flex-1">
        <h2 class="text-base font-bold text-white"><?php echo htmlspecialchars($user['username']); ?></h2>
        <p class="text-xs text-slate-400"><?php echo htmlspecialchars($user['email']); ?></p>
        <span class="inline-block mt-1 text-[10px] text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md">
            Gamer ID #<?php echo $user['id']; ?>
        </span>
    </div>
</div>

<!-- SECTION 1: EDIT PROFILE & UPI ID -->
<div class="bg-[#111827] border border-slate-800 rounded-2xl p-5 mb-5 shadow-lg">
    <h3 class="text-sm font-bold text-white mb-4 flex items-center gap-2 border-b border-slate-800 pb-3">
        <i class="fa-solid fa-user-pen text-emerald-400"></i> Account & Payout Details
    </h3>

    <form method="POST" action="profile.php" class="space-y-3.5">
        <input type="hidden" name="action" value="update_profile">

        <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Gamer Username</label>
            <input type="text" name="username" value="<?php echo htmlspecialchars($user['username']); ?>" required class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500">
        </div>

        <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
            <input type="email" name="email" value="<?php echo htmlspecialchars($user['email']); ?>" required class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500">
        </div>

        <!-- NEW FIELD: USER UPI ID -->
        <div>
            <div class="flex items-center justify-between mb-1">
                <label class="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <i class="fa-solid fa-qrcode text-emerald-400"></i> My UPI ID (For Withdrawals)
                </label>
                <span class="text-[10px] text-emerald-400 font-semibold">Important</span>
            </div>
            <input type="text" name="upi_id" value="<?php echo htmlspecialchars($user['upi_id'] ?? ''); ?>" placeholder="e.g. yourname@okhdfcbank or 9876543210@paytm" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500">
            <span class="text-[10px] text-slate-400 mt-1 block">Your tournament prize withdrawals will be sent directly to this UPI address.</span>
        </div>

        <button type="submit" class="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs shadow-md shadow-emerald-500/20 transition">
            Save Profile & UPI Details
        </button>
    </form>
</div>

<!-- SECTION 2: CHANGE PASSWORD -->
<div class="bg-[#111827] border border-slate-800 rounded-2xl p-5 mb-5 shadow-lg">
    <h3 class="text-sm font-bold text-white mb-4 flex items-center gap-2 border-b border-slate-800 pb-3">
        <i class="fa-solid fa-lock text-amber-400"></i> Change Password
    </h3>

    <form method="POST" action="profile.php" class="space-y-3.5">
        <input type="hidden" name="action" value="change_password">

        <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Current Password</label>
            <input type="password" name="current_password" required placeholder="Enter current password" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500">
        </div>

        <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">New Password</label>
            <input type="password" name="new_password" minlength="6" required placeholder="Minimum 6 characters" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500">
        </div>

        <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Confirm New Password</label>
            <input type="password" name="confirm_password" minlength="6" required placeholder="Re-type new password" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500">
        </div>

        <button type="submit" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold py-2.5 rounded-xl text-xs border border-slate-700 transition">
            Update Password
        </button>
    </form>
</div>

<!-- LOGOUT BUTTON -->
<div class="pt-2">
    <a href="logout.php" class="block w-full text-center bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/40 text-rose-300 font-bold py-3 rounded-xl text-xs transition">
        <i class="fa-solid fa-arrow-right-from-bracket mr-2"></i> Log Out of Clutch Arena
    </a>
</div>

<?php
require_once __DIR__ . '/common/bottom.php';
?>
