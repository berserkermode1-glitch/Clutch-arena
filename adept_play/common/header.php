<?php
/**
 * Clutch Arena - User Common Header (Responsive Emerald Neon Theme)
 * Includes Level, XP, CSRF token meta, and mobile header controls.
 */
require_once __DIR__ . '/../config.php';

$current_balance = 0.00;
$user_info = null;
if (isset($_SESSION['user_id']) && isset($pdo)) {
    try {
        $stmt = $pdo->prepare("SELECT id, username, email, wallet_balance, free_fire_uid, level, xp, avatar FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $user_info = $stmt->fetch();
        if ($user_info) {
            $current_balance = floatval($user_info['wallet_balance']);
        }
    } catch (Exception $e) {
        $current_balance = 0.00;
    }
}
$csrf_token = generate_csrf_token();
$active_theme = get_active_theme();
?>
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <meta name="theme-color" content="#0b0f19">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="csrf-token" content="<?php echo htmlspecialchars($csrf_token); ?>">
    <title><?php echo isset($page_title) ? htmlspecialchars($page_title) . ' - Clutch Arena' : 'Clutch Arena - Mobile Esports Platform'; ?></title>
    
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        emeraldNeon: {
                            400: '#34d399',
                            500: '#10b981',
                            600: '#059669',
                        }
                    }
                }
            }
        }
    </script>
    <!-- Font Awesome 6 Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

    <style>
        * {
            -webkit-tap-highlight-color: transparent;
            -webkit-touch-callout: none;
            box-sizing: border-box;
        }
        body {
            background-color: #0b0f19;
            color: #f1f5f9;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            touch-action: pan-y;
            overflow-x: hidden;
            min-height: 100vh;
        }
        /* Mobile safe padding */
        .safe-bottom {
            padding-bottom: calc(5rem + env(safe-area-inset-bottom, 0px));
        }
        .no-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
    </style>
</head>
<body class="bg-[#0b0f19] text-slate-100 flex flex-col min-h-screen safe-bottom select-none">
    
    <!-- Fixed Top Esports Header -->
    <header class="sticky top-0 z-40 bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 flex items-center justify-between">
        <a href="index.php" class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-black">
                <i class="fa-solid fa-gamepad text-sm"></i>
            </div>
            <div>
                <span class="font-black text-sm tracking-tight text-white block leading-none">CLUTCH<span class="text-emerald-400">ARENA</span></span>
                <span class="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Esports India</span>
            </div>
        </a>

        <!-- User Progression & Quick Action Bar -->
        <div class="flex items-center gap-2">
            <?php if ($user_info): ?>
                <!-- Level & XP Badge -->
                <div class="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl flex items-center gap-1.5 text-xs">
                    <span class="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[9px] font-black">
                        L<?php echo $user_info['level']; ?>
                    </span>
                    <span class="font-mono text-[11px] font-bold text-emerald-400">
                        <?php echo $user_info['xp']; ?> XP
                    </span>
                </div>

                <!-- Daily Rewards Shortcut -->
                <a href="rewards.php" title="Daily Streak Check-In" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-400 flex items-center justify-center text-xs transition">
                    <i class="fa-solid fa-gift"></i>
                </a>

                <!-- Support Shortcut -->
                <a href="support.php" title="Fair-Play Support &amp; Disputes" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center justify-center text-xs transition">
                    <i class="fa-solid fa-headset"></i>
                </a>
            <?php else: ?>
                <a href="login.php" class="text-xs font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 px-3 py-1.5 rounded-lg shadow-md">
                    Sign In
                </a>
            <?php endif; ?>
        </div>
    </header>

    <!-- Main Mobile Content Viewport -->
    <main class="flex-1 w-full max-w-md mx-auto px-4 py-3">
