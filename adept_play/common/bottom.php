<?php
/**
 * Clutch Arena - Responsive Mobile Bottom Navigation Bar
 * Optimized for mobile viewport without text clipping or horizontal overflow.
 */
$current_page = basename($_SERVER['PHP_SELF'] ?? '');
?>
    </main>

    <!-- Fixed Mobile Bottom Navigation Bar -->
    <nav class="fixed bottom-0 left-0 right-0 z-50 bg-[#0f172a]/95 backdrop-blur-md border-t border-slate-800/90 px-1 py-1.5 max-w-md mx-auto">
        <div class="flex items-center justify-around">
            
            <!-- Home -->
            <a href="index.php" class="flex flex-col items-center justify-center py-1 w-14 rounded-xl transition <?php echo ($current_page == 'index.php' || $current_page == '') ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'; ?>">
                <i class="fa-solid fa-house text-base mb-0.5 <?php echo ($current_page == 'index.php') ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]' : ''; ?>"></i>
                <span class="text-[10px] tracking-tight">Home</span>
            </a>

            <!-- Matches -->
            <a href="my_tournaments.php" class="flex flex-col items-center justify-center py-1 w-14 rounded-xl transition <?php echo ($current_page == 'my_tournaments.php') ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'; ?>">
                <i class="fa-solid fa-trophy text-base mb-0.5 <?php echo ($current_page == 'my_tournaments.php') ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]' : ''; ?>"></i>
                <span class="text-[10px] tracking-tight">Matches</span>
            </a>

            <!-- Leaderboard -->
            <a href="leaderboard.php" class="flex flex-col items-center justify-center py-1 w-12 rounded-xl transition <?php echo ($current_page == 'leaderboard.php') ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'; ?>">
                <i class="fa-solid fa-ranking-star text-base mb-0.5 <?php echo ($current_page == 'leaderboard.php') ? 'drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]' : ''; ?>"></i>
                <span class="text-[9px] tracking-tight">Ranks</span>
            </a>

            <!-- Daily Rewards -->
            <a href="rewards.php" class="flex flex-col items-center justify-center py-1 w-12 rounded-xl transition <?php echo ($current_page == 'rewards.php') ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'; ?>">
                <i class="fa-solid fa-gift text-base mb-0.5 <?php echo ($current_page == 'rewards.php') ? 'drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : ''; ?>"></i>
                <span class="text-[9px] tracking-tight">Rewards</span>
            </a>

            <!-- Referrals -->
            <a href="referrals.php" class="flex flex-col items-center justify-center py-1 w-14 rounded-xl transition <?php echo ($current_page == 'referrals.php') ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'; ?>">
                <i class="fa-solid fa-users text-base mb-0.5 <?php echo ($current_page == 'referrals.php') ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]' : ''; ?>"></i>
                <span class="text-[10px] tracking-tight">Squads</span>
            </a>

            <!-- Settings -->
            <a href="settings.php" class="flex flex-col items-center justify-center py-1 w-14 rounded-xl transition <?php echo ($current_page == 'settings.php' || $current_page == 'profile.php') ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'; ?>">
                <i class="fa-solid fa-gear text-base mb-0.5 <?php echo ($current_page == 'settings.php' || $current_page == 'profile.php') ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]' : ''; ?>"></i>
                <span class="text-[10px] tracking-tight">Settings</span>
            </a>

        </div>
    </nav>

    <!-- Client-Side UX Guard Script -->
    <script>
        (function() {
            // Disable right click for native app feel
            document.addEventListener('contextmenu', function(e) {
                if (['INPUT', 'TEXTAREA'].indexOf(e.target.tagName) === -1) {
                    e.preventDefault();
                }
            });
            // Disable pinch-to-zoom gestures
            document.addEventListener('touchstart', function(e) {
                if (e.touches.length > 1) {
                    e.preventDefault();
                }
            }, { passive: false });
        })();
    </script>
</body>
</html>
