<?php
/**
 * Clutch Arena - Admin Common Header
 * Protected with role verification, CSRF token, and Security Center alerts.
 */
require_once __DIR__ . '/../config.php';

// Verify admin authentication
if (basename($_SERVER['PHP_SELF'] ?? '') !== 'login.php') {
    check_admin_auth();
}

$admin_username = $_SESSION['admin_username'] ?? 'Admin';
$pending_results_count = 0;
$pending_disputes_count = 0;
$security_alerts_count = 0;

if (isset($pdo) && $pdo) {
    try {
        $pending_results_count = (int)$pdo->query("SELECT COUNT(*) FROM match_results WHERE status = 'Pending'")->fetchColumn();
        $pending_disputes_count = (int)$pdo->query("SELECT COUNT(*) FROM disputes WHERE status = 'Open'")->fetchColumn();
        $security_alerts_count = (int)$pdo->query("SELECT COUNT(*) FROM security_events WHERE status = 'New'")->fetchColumn();
    } catch (Exception $e) {}
}

$csrf_token = generate_csrf_token();
?>
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#0b0f19">
    <meta name="csrf-token" content="<?php echo htmlspecialchars($csrf_token); ?>">
    <title><?php echo isset($page_title) ? htmlspecialchars($page_title) . ' - Clutch Admin' : 'Admin Security Portal - Clutch Arena'; ?></title>
    
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Font Awesome 6 Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

    <style>
        body {
            background-color: #0b0f19;
            color: #f1f5f9;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            touch-action: pan-y;
            min-height: 100vh;
        }
        .safe-bottom {
            padding-bottom: calc(5rem + env(safe-area-inset-bottom, 0px));
        }
    </style>
</head>
<body class="bg-[#0b0f19] text-slate-100 flex flex-col min-h-screen safe-bottom select-none">
    
    <!-- Admin Top Navbar -->
    <header class="sticky top-0 z-40 bg-[#0f172a]/95 backdrop-blur-md border-b border-indigo-950/60 px-4 py-3 flex items-center justify-between">
        <a href="index.php" class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-black">
                <i class="fa-solid fa-shield-halved text-sm"></i>
            </div>
            <div>
                <span class="font-extrabold text-sm tracking-tight text-white block leading-none">CLUTCH<span class="text-indigo-400">ADMIN</span></span>
                <span class="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Security &amp; Adjudication</span>
            </div>
        </a>

        <!-- Right Quick Actions -->
        <div class="flex items-center gap-2">
            <!-- Security Center Alert Badge -->
            <a href="security_center.php" title="Security &amp; Anti-Fraud Center" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs relative transition">
                <i class="fa-solid fa-triangle-exclamation text-amber-400"></i>
                <?php if ($security_alerts_count > 0): ?>
                    <span class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                <?php endif; ?>
            </a>

            <!-- User App link -->
            <a href="../index.php" target="_blank" class="text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg transition flex items-center gap-1">
                <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i> User App
            </a>

            <!-- Logout -->
            <a href="logout.php" title="Sign out" class="text-[11px] font-semibold bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-300 px-2.5 py-1.5 rounded-lg transition">
                <i class="fa-solid fa-power-off"></i>
            </a>
        </div>
    </header>

    <!-- Main Container -->
    <main class="flex-1 w-full max-w-lg mx-auto px-4 py-4">
