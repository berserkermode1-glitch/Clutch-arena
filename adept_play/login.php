<?php
/**
 * Clutch Arena - User Login & Sign Up (Hardened & Auditable)
 * Incorporates Login Throttling, CSRF Protection, Session Regeneration,
 * Referral Attribution, and Rate Limiting.
 */
require_once __DIR__ . '/config.php';

// Redirect if already logged in
if (isset($_SESSION['user_id'])) {
    header("Location: index.php");
    exit;
}

$active_tab = isset($_GET['tab']) && $_GET['tab'] === 'signup' ? 'signup' : 'login';
$error_msg = '';
$success_msg = '';

// Capture referral code from URL if present
if (isset($_GET['ref'])) {
    $ref_param = strtoupper(clean_input($_GET['ref']));
    if (preg_match('/^[A-Z0-9_-]{4,20}$/', $ref_param)) {
        $_SESSION['pending_referral_code'] = $ref_param;
        $active_tab = 'signup';
    }
}

if (isset($_GET['installed'])) {
    $success_msg = "Installation complete! Please sign in or create an account.";
} elseif (isset($_GET['reset_success'])) {
    $success_msg = "Password reset successfully! You can now log in with your new password.";
} elseif (isset($_GET['msg']) && $_GET['msg'] === 'auth_required') {
    $error_msg = "Please log in to access this esports section.";
}

// Process Form Submissions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? 'login';
    $submitted_token = $_POST['csrf_token'] ?? '';

    // Verify CSRF Token
    if (!verify_csrf_token($submitted_token)) {
        $error_msg = "Security session expired. Please refresh the page and try again.";
    } elseif (!isset($pdo) || !$pdo) {
        $error_msg = "Database connection error. Please verify database setup.";
    } elseif ($action === 'login') {
        $active_tab = 'login';
        $username = clean_input($_POST['username'] ?? '');
        $password = $_POST['password'] ?? '';

        // Check if user/IP is temporarily throttled after 5 failed attempts
        if (is_login_locked($pdo, $username)) {
            $error_msg = "Too many failed login attempts. Account temporarily locked for 15 minutes to prevent brute force.";
            log_security_event($pdo, 'brute_force_throttled', 'High', null, "Throttled login attempt for identifier: $username");
        } elseif (empty($username) || empty($password)) {
            $error_msg = "Please enter both username and password.";
        } else {
            try {
                $stmt = $pdo->prepare("SELECT id, username, email, password, is_blocked, block_reason, wallet_balance FROM users WHERE username = ? OR email = ?");
                $stmt->execute([$username, $username]);
                $user = $stmt->fetch();

                if ($user && password_verify($password, $user['password'])) {
                    if ($user['is_blocked'] == 1) {
                        $reason = $user['block_reason'] ? htmlspecialchars($user['block_reason']) : 'Violation of Fair Play Guidelines';
                        $error_msg = "Account restricted: " . $reason . ". Please submit a support ticket to appeal.";
                        record_login_attempt($pdo, $username, false);
                    } else {
                        // Success: Record successful attempt, regenerate session ID to prevent session fixation
                        record_login_attempt($pdo, $username, true);
                        session_regenerate_id(true);

                        $_SESSION['user_id'] = $user['id'];
                        $_SESSION['username'] = $user['username'];
                        generate_csrf_token(); // Refresh CSRF token for authenticated session

                        log_audit_action($pdo, 'user', $user['id'], 'user_login', 'user', $user['id'], 'Successful authentication');

                        header("Location: index.php");
                        exit;
                    }
                } else {
                    record_login_attempt($pdo, $username, false);
                    $error_msg = "Invalid username or password. Please try again.";
                }
            } catch (PDOException $e) {
                $error_msg = "Authentication system error. Please try again.";
            }
        }
    } elseif ($action === 'signup') {
        $active_tab = 'signup';

        // Rate limit signups: max 5 per hour per IP
        if (!check_rate_limit($pdo, 'signup', 5, 3600)) {
            $error_msg = "Too many signups from your network. Please wait a while before creating another account.";
        } else {
            $username = clean_input($_POST['username'] ?? '');
            $email = clean_input($_POST['email'] ?? '');
            $password = $_POST['password'] ?? '';
            $referral_code = strtoupper(clean_input($_POST['referral_code'] ?? ($_SESSION['pending_referral_code'] ?? '')));

            if (empty($username) || empty($email) || empty($password)) {
                $error_msg = "All fields are required.";
            } elseif (!preg_match('/^[a-zA-Z0-9_]{3,20}$/', $username)) {
                $error_msg = "Username must be 3-20 characters with letters, numbers, and underscores only.";
            } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $error_msg = "Please enter a valid email address.";
            } elseif (strlen($password) < 8) {
                $error_msg = "Password must be at least 8 characters.";
            } else {
                try {
                    // Check if username or email already exists
                    $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE username = ? OR email = ?");
                    $stmt->execute([$username, $email]);
                    if ($stmt->fetchColumn() > 0) {
                        $error_msg = "Username or Email already registered. Please sign in.";
                    } else {
                        $pdo->beginTransaction();

                        // Resolve referral code if provided
                        $referrer_id = null;
                        if (!empty($referral_code)) {
                            $refStmt = $pdo->prepare("SELECT id, username FROM users WHERE referral_code = ?");
                            $refStmt->execute([$referral_code]);
                            $refUser = $refStmt->fetch();
                            if ($refUser) {
                                $referrer_id = $refUser['id'];
                            }
                        }

                        // Generate unique referral code for the new user
                        $new_ref_code = 'CLUTCH-' . strtoupper(substr(md5($username . time()), 0, 6));

                        $hashed_password = password_hash($password, PASSWORD_DEFAULT);
                        $insertStmt = $pdo->prepare("
                            INSERT INTO users (username, email, password, wallet_balance, upi_id, referral_code, referred_by, level, xp) 
                            VALUES (?, ?, ?, 0.00, '', ?, ?, 1, 100)
                        ");
                        $insertStmt->execute([$username, $email, $hashed_password, $new_ref_code, $referrer_id]);
                        $new_user_id = (int)$pdo->lastInsertId();

                        // Record starter welcome bonus XP transaction
                        $txRef = 'TX-WELCOME-' . strtoupper(substr(md5(uniqid()), 0, 8));
                        $txStmt = $pdo->prepare("
                            INSERT INTO transactions (user_id, amount, type, status, reference_id, category, description) 
                            VALUES (?, 0.00, 'credit', 'Completed', ?, 'bonus', 'Welcome Starter Bonus + 100 Esports XP')
                        ");
                        $txStmt->execute([$new_user_id, $txRef]);

                        // Handle referral anti-fraud attribution
                        if ($referrer_id && $referrer_id !== $new_user_id) {
                            $client_ip = get_client_ip();
                            // Record referral in 'Pending' status awaiting fair-play verification
                            $refRecordStmt = $pdo->prepare("
                                INSERT INTO referrals (referrer_id, referee_id, referral_code, status, ip_address, reward_issued) 
                                VALUES (?, ?, ?, 'Pending', ?, 0)
                            ");
                            $refRecordStmt->execute([$referrer_id, $new_user_id, $referral_code, $client_ip]);

                            log_audit_action($pdo, 'user', $new_user_id, 'referral_registered', 'referral', $referrer_id, "Referred via code $referral_code");
                        }

                        $pdo->commit();

                        session_regenerate_id(true);
                        $_SESSION['user_id'] = $new_user_id;
                        $_SESSION['username'] = $username;
                        generate_csrf_token();
                        unset($_SESSION['pending_referral_code']);

                        log_audit_action($pdo, 'user', $new_user_id, 'user_signup', 'user', $new_user_id, 'Account created');

                        header("Location: index.php?welcome=1");
                        exit;
                    }
                } catch (Exception $e) {
                    if ($pdo->inTransaction()) {
                        $pdo->rollBack();
                    }
                    $error_msg = "Registration failed. Please try again.";
                }
            }
        }
    }
}

$csrf_token = generate_csrf_token();
$active_theme = get_active_theme();
?>
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#0b0f19">
    <title>Sign In / Register - Clutch Arena</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        body { background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    </style>
</head>
<body class="text-slate-100 flex items-center justify-center min-h-screen p-4 select-none">
    
    <div class="max-w-sm w-full bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-2xl relative">
        
        <!-- Platform Branding -->
        <div class="text-center mb-5">
            <div class="w-12 h-12 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-2.5 text-slate-950 text-xl font-black">
                <i class="fa-solid fa-gamepad"></i>
            </div>
            <h1 class="text-xl font-black text-white tracking-tight">CLUTCH<span class="text-emerald-400">ARENA</span></h1>
            <p class="text-[11px] text-slate-400 mt-0.5">Premier Esports Tournaments for Indian Gamers</p>
        </div>

        <!-- Alert Feedbacks -->
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

        <!-- Two Tabs (Login / Sign Up) -->
        <div class="grid grid-cols-2 bg-slate-900 p-1 rounded-xl mb-4 border border-slate-800 text-xs font-bold">
            <a href="login.php?tab=login" class="text-center py-2 rounded-lg transition <?php echo ($active_tab === 'login') ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'; ?>">
                Sign In
            </a>
            <a href="login.php?tab=signup" class="text-center py-2 rounded-lg transition <?php echo ($active_tab === 'signup') ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'; ?>">
                Register (+XP)
            </a>
        </div>

        <!-- TAB 1: LOGIN FORM -->
        <?php if ($active_tab === 'login'): ?>
            <form method="POST" action="login.php" class="space-y-3.5">
                <input type="hidden" name="action" value="login">
                <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">

                <div>
                    <label class="block text-[11px] font-medium text-slate-300 mb-1">Gamer Username or Email</label>
                    <div class="relative">
                        <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs">
                            <i class="fa-solid fa-user"></i>
                        </span>
                        <input type="text" name="username" required placeholder="gamer_akash or email" class="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans">
                    </div>
                </div>

                <div>
                    <div class="flex items-center justify-between mb-1">
                        <label class="text-[11px] font-medium text-slate-300">Password</label>
                        <a href="password_reset.php" class="text-[10px] text-emerald-400 hover:underline">Forgot?</a>
                    </div>
                    <div class="relative">
                        <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs">
                            <i class="fa-solid fa-lock"></i>
                        </span>
                        <input type="password" name="password" required placeholder="••••••••" class="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono">
                    </div>
                </div>

                <button type="submit" class="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition active:scale-95">
                    Sign In to Arena &rarr;
                </button>
            </form>

        <!-- TAB 2: SIGN UP FORM -->
        <?php else: ?>
            <form method="POST" action="login.php?tab=signup" class="space-y-3">
                <input type="hidden" name="action" value="signup">
                <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">

                <div>
                    <label class="block text-[11px] font-medium text-slate-300 mb-1">Esports Gamertag (Username)</label>
                    <div class="relative">
                        <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs">
                            <i class="fa-solid fa-gamepad"></i>
                        </span>
                        <input type="text" name="username" required placeholder="e.g. shadow_strike" class="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans">
                    </div>
                    <span class="text-[9px] text-slate-500">3-20 letters, numbers, or underscores</span>
                </div>

                <div>
                    <label class="block text-[11px] font-medium text-slate-300 mb-1">Email Address</label>
                    <div class="relative">
                        <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs">
                            <i class="fa-solid fa-envelope"></i>
                        </span>
                        <input type="email" name="email" required placeholder="player@gmail.com" class="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500">
                    </div>
                </div>

                <div>
                    <label class="block text-[11px] font-medium text-slate-300 mb-1">Password</label>
                    <div class="relative">
                        <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs">
                            <i class="fa-solid fa-lock"></i>
                        </span>
                        <input type="password" name="password" required minlength="8" placeholder="At least 8 characters" class="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono">
                    </div>
                </div>

                <div>
                    <label class="block text-[11px] font-medium text-slate-300 mb-1">Referral Code <span class="text-slate-500">(Optional)</span></label>
                    <input type="text" name="referral_code" value="<?php echo htmlspecialchars($_SESSION['pending_referral_code'] ?? ''); ?>" placeholder="CLUTCH-XXXXXX" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500 uppercase">
                </div>

                <div class="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 text-[10px] text-slate-400">
                    <i class="fa-solid fa-shield-halved text-emerald-400 mr-1"></i> By registering, you agree to our Fair-Play Anti-Cheat rules. Verified free scrims and esports rankings.
                </div>

                <button type="submit" class="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition active:scale-95">
                    Create Account & Claim 100 XP &rarr;
                </button>
            </form>
        <?php endif; ?>

        <!-- Footer Notice -->
        <div class="mt-4 pt-3 border-t border-slate-800 text-center">
            <span class="text-[10px] text-slate-500">
                Clutch Arena &bull; Protected with Rate Limiting &amp; CSRF Guards
            </span>
        </div>

    </div>

</body>
</html>
