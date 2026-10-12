<?php
/**
 * Clutch Arena - Admin Bottom Navigation Bar
 */
$current_page = basename($_SERVER['PHP_SELF'] ?? '');
?>
    </main>

    <!-- Fixed Mobile Admin Bottom Navigation Bar -->
    <nav class="fixed bottom-0 left-0 right-0 z-50 bg-[#0f172a]/95 backdrop-blur-md border-t border-slate-800/80 px-2 py-1.5 max-w-lg mx-auto">
        <div class="flex items-center justify-around">
            
            <!-- Dashboard -->
            <a href="index.php" class="flex flex-col items-center justify-center py-1 w-12 rounded-xl transition <?php echo ($current_page == 'index.php') ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'; ?>">
                <i class="fa-solid fa-gauge-high text-base mb-0.5"></i>
                <span class="text-[9px]">Home</span>
            </a>

            <!-- Tournaments -->
            <a href="tournament.php" class="flex flex-col items-center justify-center py-1 w-12 rounded-xl transition <?php echo ($current_page == 'tournament.php' || $current_page == 'manage_tournament.php') ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'; ?>">
                <i class="fa-solid fa-trophy text-base mb-0.5"></i>
                <span class="text-[9px]">Matches</span>
            </a>

            <!-- Analytics -->
            <a href="analytics.php" class="flex flex-col items-center justify-center py-1 w-12 rounded-xl transition <?php echo ($current_page == 'analytics.php') ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'; ?>">
                <i class="fa-solid fa-chart-line text-base mb-0.5"></i>
                <span class="text-[9px]">Analytics</span>
            </a>

            <!-- Result Verification & Disputes -->
            <a href="disputes.php" class="flex flex-col items-center justify-center py-1 w-12 rounded-xl relative transition <?php echo ($current_page == 'disputes.php') ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'; ?>">
                <i class="fa-solid fa-scale-balanced text-base mb-0.5"></i>
                <span class="text-[9px]">Disputes</span>
                <?php if (isset($pending_results_count) && $pending_results_count > 0): ?>
                    <span class="absolute top-0 right-1 w-3.5 h-3.5 bg-amber-500 text-slate-950 font-black rounded-full text-[8px] flex items-center justify-center">
                        <?php echo $pending_results_count; ?>
                    </span>
                <?php endif; ?>
            </a>

            <!-- Security Center -->
            <a href="security_center.php" class="flex flex-col items-center justify-center py-1 w-12 rounded-xl relative transition <?php echo ($current_page == 'security_center.php') ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'; ?>">
                <i class="fa-solid fa-shield-virus text-base mb-0.5"></i>
                <span class="text-[9px]">Security</span>
                <?php if (isset($security_alerts_count) && $security_alerts_count > 0): ?>
                    <span class="absolute top-0 right-1 w-3.5 h-3.5 bg-rose-500 text-white font-black rounded-full text-[8px] flex items-center justify-center">
                        <?php echo $security_alerts_count; ?>
                    </span>
                <?php endif; ?>
            </a>

            <!-- Users -->
            <a href="user.php" class="flex flex-col items-center justify-center py-1 w-12 rounded-xl transition <?php echo ($current_page == 'user.php') ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'; ?>">
                <i class="fa-solid fa-users text-base mb-0.5"></i>
                <span class="text-[9px]">Users</span>
            </a>

            <!-- Settings -->
            <a href="settings.php" class="flex flex-col items-center justify-center py-1 w-12 rounded-xl transition <?php echo ($current_page == 'settings.php' || $current_page == 'setting.php') ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'; ?>">
                <i class="fa-solid fa-gear text-base mb-0.5"></i>
                <span class="text-[9px]">Settings</span>
            </a>

        </div>
    </nav>
</body>
</html>
