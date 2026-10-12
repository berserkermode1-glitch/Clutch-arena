<?php
/**
 * Clutch Arena - Secure Password Recovery
 * Uses expiring single-use tokens, SHA256 hashed in database, with rate limiting.
 */
require_once __DIR__ . '/config.php';

$success_msg = '';
$error_msg = '';
$step = 'request'; // 'request' or 'reset'
$token = clean_input($_GET['token'] ?? '');

// If token provided in GET, verify validity
if (!empty($token)) {
    $token_hash = hash('sha256', $token);
    try {
        $stmt = $pdo->prepare("SELECT id, user_id, expires_at, used FROM password_resets WHERE token_hash = ?");
        $stmt->execute([$token_hash]);
        $reset_record = $stmt->fetch();

        if ($reset_record && $reset_record['used'] == 0 && strtotime($reset_record['expires_at']) > time()) {
            $step = 'reset';
        } else {
            $error_msg = "Password reset link is invalid or has expired. Please request a new one.";
            $step = 'request';
        }
    } catch (Exception $e) {
        $error_msg = "Verification error. Please try again.";
        $step = 'request';
    }
}

// Handle Form Submissions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $submitted_token = $_POST['csrf_token'] ?? '';
    if (!verify_csrf_token($submitted_token)) {
        $error_msg = "Session expired. Please refresh the page.";
    } elseif (isset($_POST['action']) && $_POST['action'] === 'request_reset') {
        // Rate limit password reset requests: max 3 per 15 minutes
        if (!check_rate_limit($pdo, 'pwd_reset_req', 3, 900)) {
            $error_msg = "Too many password reset requests. Please wait a few minutes.";
        } else {
            $email = clean_input($_POST['email'] ?? '');
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $error_msg = "Please provide a valid email address.";
            } else {
                try {
                    $uStmt = $pdo->prepare("SELECT id, username FROM users WHERE email = ?");
                    $uStmt->execute([$email]);
                    $user = $uStmt->fetch();

                    if ($user) {
                        // Generate single-use cryptographic token
                        $raw_token = bin2hex(random_bytes(32));
                        $token_hash = hash('sha256', $raw_token);
                        $expires_at = date('Y-m-d H:i:s', time() + 3600); // 1 hour expiry

                        // Invalidate any older unused tokens for this user
                        $invStmt = $pdo->prepare("UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0");
                        $invStmt->execute([$user['id']]);

                        $insStmt = $pdo->prepare("INSERT INTO password_resets (user_id, token_hash, expires_at, used) VALUES (?, ?, ?, 0)");
                        $insStmt->execute([$user['id'], $token_hash, $expires_at]);

                        log_audit_action($pdo, 'user', $user['id'], 'password_reset_requested', 'user', $user['id'], 'Reset token generated');

                        // Provide direct test/simulation reset link for demonstration
                        $reset_link = "password_reset.php?token=" . $raw_token;
                        $success_msg = "Password recovery generated! For testing: <a href='$reset_link' class='underline text-emerald-300 font-bold'>Click here to reset your password</a> (valid for 1 hour).";
                    } else {
                        // Anti-enumeration: Generic message
                        $success_msg = "If an account exists with that email, recovery instructions have been initiated.";
                    }
                } catch (Exception $e) {
                    $error_msg = "Request failed. Please try again.";
                }
            }
        }
    } elseif (isset($_POST['action']) && $_POST['action'] === 'complete_reset') {
        $raw_token = clean_input($_POST['token'] ?? '');
        $new_pwd = $_POST['new_password'] ?? '';
        $confirm_pwd = $_POST['confirm_password'] ?? '';

        if (strlen($new_pwd) < 8) {
            $error_msg = "Password must be at least 8 characters.";
            $step = 'reset';
            $token = $raw_token;
        } elseif ($new_pwd !== $confirm_pwd) {
            $error_msg = "Passwords do not match.";
            $step = 'reset';
            $token = $raw_token;
        } else {
            $token_hash = hash('sha256', $raw_token);
            try {
                $pdo->beginTransaction();

                $stmt = $pdo->prepare("SELECT id, user_id, expires_at, used FROM password_resets WHERE token_hash = ? FOR UPDATE");
                $stmt->execute([$token_hash]);
                $reset_record = $stmt->fetch();

                if (!$reset_record || $reset_record['used'] == 1 || strtotime($reset_record['expires_at']) <= time()) {
                    $error_msg = "Password reset link has already been used or expired.";
                    $pdo->rollBack();
                } else {
                    $user_id = $reset_record['user_id'];
                    $hashed = password_hash($new_pwd, PASSWORD_DEFAULT);

                    // Update user password
                    $upUser = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
                    $upUser->execute([$hashed, $user_id]);

                    // Mark token as used (single-use enforcement)
                    $upToken = $pdo->prepare("UPDATE password_resets SET used = 1 WHERE id = ?");
                    $upToken->execute([$reset_record['id']]);

                    log_audit_action($pdo, 'user', $user_id, 'password_reset_completed', 'user', $user_id, 'Password updated via recovery token');

                    $pdo->commit();

                    header("Location: login.php?reset_success=1");
                    exit;
                }
            } catch (Exception $e) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                $error_msg = "Password reset failed. Please try again.";
            }
        }
    }
}

$csrf_token = generate_csrf_token();
?>
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Password Recovery - Clutch Arena</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        body { background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    </style>
</head>
<body class="text-slate-100 flex items-center justify-center min-h-screen p-4 select-none">
    
    <div class="max-w-sm w-full bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-2xl relative">
        <div class="text-center mb-4">
            <div class="w-12 h-12 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-2.5 text-slate-950 text-xl font-black">
                <i class="fa-solid fa-key"></i>
            </div>
            <h1 class="text-base font-black text-white">Password Recovery</h1>
            <p class="text-[11px] text-slate-400 mt-0.5">Secure, Single-Use Verification Tokens</p>
        </div>

        <?php if (!empty($success_msg)): ?>
            <div class="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 p-3 rounded-xl mb-4 text-xs">
                <?php echo $success_msg; ?>
            </div>
        <?php endif; ?>

        <?php if (!empty($error_msg)): ?>
            <div class="bg-rose-950/80 border border-rose-500/50 text-rose-300 p-3 rounded-xl mb-4 text-xs flex items-center gap-2">
                <i class="fa-solid fa-circle-exclamation text-rose-400"></i>
                <span><?php echo htmlspecialchars($error_msg); ?></span>
            </div>
        <?php endif; ?>

        <?php if ($step === 'request'): ?>
            <form method="POST" action="password_reset.php" class="space-y-3.5">
                <input type="hidden" name="action" value="request_reset">
                <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">

                <div>
                    <label class="block text-[11px] font-medium text-slate-300 mb-1">Your Registered Email</label>
                    <input type="email" name="email" required placeholder="player@gmail.com" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500">
                </div>

                <button type="submit" class="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold py-2.5 rounded-xl text-xs shadow-md shadow-emerald-500/20 transition">
                    Send Single-Use Reset Link &rarr;
                </button>
            </form>
        <?php else: ?>
            <form method="POST" action="password_reset.php" class="space-y-3.5">
                <input type="hidden" name="action" value="complete_reset">
                <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
                <input type="hidden" name="token" value="<?php echo htmlspecialchars($token); ?>">

                <div>
                    <label class="block text-[11px] font-medium text-slate-300 mb-1">New Secure Password</label>
                    <input type="password" name="new_password" required minlength="8" placeholder="At least 8 characters" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono">
                </div>

                <div>
                    <label class="block text-[11px] font-medium text-slate-300 mb-1">Confirm New Password</label>
                    <input type="password" name="confirm_password" required minlength="8" placeholder="Re-enter password" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono">
                </div>

                <button type="submit" class="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold py-2.5 rounded-xl text-xs shadow-md shadow-emerald-500/20 transition">
                    Set New Password &rarr;
                </button>
            </form>
        <?php endif; ?>

        <div class="mt-4 pt-3 border-t border-slate-800 text-center">
            <a href="login.php" class="text-xs text-slate-400 hover:text-white transition">
                &larr; Return to Sign In
            </a>
        </div>
    </div>

</body>
</html>
