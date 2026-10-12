<?php
/**
 * Clutch Arena - Hardened Admin Authentication
 * Enforces Rate Limiting, Brute-Force Throttling, Password Verification, and CSRF Guards.
 */
require_once __DIR__ . '/../config.php';

// Redirect if already logged in as admin
if (isset($_SESSION['admin_id'])) {
    header("Location: index.php");
    exit;
}

$error_msg = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $submitted_token = $_POST['csrf_token'] ?? '';

    if (!verify_csrf_token($submitted_token)) {
        $error_msg = "Security session expired. Please refresh the page.";
    } else {
        $username = clean_input($_POST['username'] ?? '');
        $password = $_POST['password'] ?? '';

        if (is_login_locked($pdo, 'admin:' . $username)) {
            $error_msg = "Too many failed attempts. Admin portal locked for 15 minutes.";
            log_security_event($pdo, 'admin_brute_force', 'Critical', null, "Admin login locked for: $username");
        } elseif (empty($username) || empty($password)) {
            $error_msg = "Please enter admin username and password.";
        } else {
            try {
                $stmt = $pdo->prepare("SELECT id, username, password, role FROM admin WHERE username = ?");
                $stmt->execute([$username]);
                $admin = $stmt->fetch();

                if ($admin && password_verify($password, $admin['password'])) {
                    record_login_attempt($pdo, 'admin:' . $username, true);
                    session_regenerate_id(true);

                    $_SESSION['admin_id'] = $admin['id'];
                    $_SESSION['admin_username'] = $admin['username'];
                    $_SESSION['admin_role'] = $admin['role'] ?? 'super_admin';
                    generate_csrf_token();

                    log_audit_action($pdo, 'admin', $admin['id'], 'admin_login', 'admin', $admin['id'], 'Successful admin login');

                    header("Location: index.php");
                    exit;
                } else {
                    record_login_attempt($pdo, 'admin:' . $username, false);
                    $error_msg = "Invalid admin credentials. Please try again.";
                }
            } catch (Exception $e) {
                $error_msg = "Admin authentication service unavailable.";
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
    <title>Admin Portal - Clutch Arena</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        body { background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    </style>
</head>
<body class="text-slate-100 flex items-center justify-center min-h-screen p-4 select-none">
    
    <div class="max-w-sm w-full bg-[#111827] border border-indigo-950/80 rounded-2xl p-6 shadow-2xl relative">
        <div class="text-center mb-6">
            <div class="w-14 h-14 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/25 mb-3 text-white text-2xl">
                <i class="fa-solid fa-shield-halved"></i>
            </div>
            <h1 class="text-xl font-black text-white">CLUTCH<span class="text-indigo-400">ADMIN</span></h1>
            <p class="text-xs text-slate-400 mt-1">Management &amp; Security Portal</p>
        </div>

        <?php if (!empty($error_msg)): ?>
            <div class="bg-rose-950/80 border border-rose-500/50 text-rose-300 p-3 rounded-xl mb-4 text-xs flex items-center gap-2">
                <i class="fa-solid fa-circle-exclamation text-rose-400"></i>
                <span><?php echo htmlspecialchars($error_msg); ?></span>
            </div>
        <?php endif; ?>

        <form method="POST" action="login.php" class="space-y-4">
            <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">

            <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Admin Username</label>
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs">
                        <i class="fa-solid fa-user-shield"></i>
                    </span>
                    <input type="text" name="username" required placeholder="admin" value="admin" class="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono">
                </div>
            </div>

            <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Admin Password</label>
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-xs">
                        <i class="fa-solid fa-lock"></i>
                    </span>
                    <input type="password" name="password" required placeholder="••••••••" value="admin123" class="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono">
                </div>
            </div>

            <div class="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                Default Credentials: <strong class="text-indigo-400 font-mono">admin</strong> / <strong class="text-indigo-400 font-mono">admin123</strong>
            </div>

            <button type="submit" class="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-lg shadow-indigo-500/25 transition">
                Authenticate Admin &rarr;
            </button>
        </form>

        <div class="mt-5 pt-3 border-t border-slate-800 text-center">
            <a href="../login.php" class="text-xs text-slate-400 hover:text-white transition">
                &larr; Return to Player App
            </a>
        </div>
    </div>

</body>
</html>
