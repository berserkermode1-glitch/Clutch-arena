<?php
/**
 * Clutch Arena - My Tournaments, Room Credentials, & Match Result Evidence Submissions
 * Enforces room access security, result screenshot uploads with MIME verification,
 * and dispute filing.
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/common/header.php';

check_user_auth();

$user_id = $_SESSION['user_id'];
$active_tab = isset($_GET['tab']) && $_GET['tab'] === 'completed' ? 'completed' : 'upcoming';
$success_msg = '';
$error_msg = '';

// Handle Match Result Screenshot Evidence Upload
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'submit_result') {
    $submitted_token = $_POST['csrf_token'] ?? '';

    if (!verify_csrf_token($submitted_token)) {
        $error_msg = "Security session expired. Please refresh the page.";
    } elseif (!check_rate_limit($pdo, 'result_upload', 5, 3600)) {
        $error_msg = "Too many score uploads. Please wait before uploading another screenshot.";
    } else {
        $tournament_id = intval($_POST['tournament_id'] ?? 0);
        $claimed_placement = intval($_POST['claimed_placement'] ?? 1);
        $claimed_kills = intval($_POST['claimed_kills'] ?? 0);

        // Verify user was a registered participant
        $pCheck = $pdo->prepare("SELECT id FROM participants WHERE tournament_id = ? AND user_id = ?");
        $pCheck->execute([$tournament_id, $user_id]);

        if (!$pCheck->fetch()) {
            $error_msg = "You are not registered in this match.";
        } elseif (!isset($_FILES['screenshot']) || $_FILES['screenshot']['error'] !== UPLOAD_ERR_OK) {
            $error_msg = "Please upload a valid screenshot of your victory / match scorecard.";
        } else {
            $file = $_FILES['screenshot'];
            if ($file['size'] > MAX_UPLOAD_SIZE) {
                $error_msg = "Screenshot size must be under 2MB.";
            } else {
                // Validate MIME type safely
                $finfo = finfo_open(FILEINFO_MIME_TYPE);
                $mime_type = finfo_file($finfo, $file['tmp_name']);
                finfo_close($finfo);

                $allowed_mimes = ['image/jpeg', 'image/png', 'image/webp'];
                $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
                $allowed_exts = ['jpg', 'jpeg', 'png', 'webp'];

                if (!in_array($mime_type, $allowed_mimes, true) || !in_array($ext, $allowed_exts, true)) {
                    $error_msg = "Invalid image file format. Only JPG, PNG, and WebP are accepted.";
                } else {
                    $upload_dir = __DIR__ . '/uploads/results/';
                    if (!is_dir($upload_dir)) {
                        mkdir($upload_dir, 0755, true);
                    }

                    // Cryptographically random filename
                    $safe_filename = 'res_' . bin2hex(random_bytes(16)) . '.' . $ext;
                    $dest_path = $upload_dir . $safe_filename;
                    $relative_path = 'uploads/results/' . $safe_filename;

                    if (move_uploaded_file($file['tmp_name'], $dest_path)) {
                        try {
                            $resStmt = $pdo->prepare("
                                INSERT INTO match_results (tournament_id, user_id, screenshot_path, claimed_placement, claimed_kills, status, created_at)
                                VALUES (?, ?, ?, ?, ?, 'Pending', NOW())
                            ");
                            $resStmt->execute([$tournament_id, $user_id, $relative_path, $claimed_placement, $claimed_kills]);

                            log_audit_action($pdo, 'user', $user_id, 'result_submitted', 'match_results', $pdo->lastInsertId(), "Rank $claimed_placement with $claimed_kills kills");

                            $success_msg = "Match result screenshot uploaded! Adjudicators will verify your placement.";
                        } catch (Exception $e) {
                            $error_msg = "Error recording result: " . $e->getMessage();
                        }
                    } else {
                        $error_msg = "Failed to store uploaded screenshot.";
                    }
                }
            }
        }
    }
}

// Fetch user's registered matches
$myTournaments = [];
try {
    $stmt = $pdo->prepare("
        SELECT t.*, p.placement as user_placement, p.kills as user_kills, p.score as user_score
        FROM tournaments t
        INNER JOIN participants p ON t.id = p.tournament_id
        WHERE p.user_id = ?
        ORDER BY t.match_time DESC
    ");
    $stmt->execute([$user_id]);
    $myTournaments = $stmt->fetchAll();
} catch (Exception $e) {
    $myTournaments = [];
}

$upcomingMatches = array_filter($myTournaments, fn($t) => $t['status'] !== 'Completed');
$completedMatches = array_filter($myTournaments, fn($t) => $t['status'] === 'Completed');

$csrf_token = generate_csrf_token();
?>

<!-- Alert Feedback -->
<?php if (!empty($success_msg)): ?>
    <div class="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 p-3.5 rounded-xl mb-4 text-xs flex items-center gap-2">
        <i class="fa-solid fa-circle-check text-emerald-400"></i>
        <span><?php echo htmlspecialchars($success_msg); ?></span>
    </div>
<?php endif; ?>

<?php if (!empty($error_msg)): ?>
    <div class="bg-rose-950/80 border border-rose-500/50 text-rose-300 p-3.5 rounded-xl mb-4 text-xs flex items-center gap-2">
        <i class="fa-solid fa-circle-exclamation text-rose-400"></i>
        <span><?php echo htmlspecialchars($error_msg); ?></span>
    </div>
<?php endif; ?>

<div class="mb-4">
    <h1 class="text-base font-black text-white flex items-center gap-2">
        <i class="fa-solid fa-trophy text-emerald-400"></i> My Match Schedule
    </h1>
    <p class="text-xs text-slate-400">Custom room credentials and score verification for registered brackets</p>
</div>

<!-- Tabs -->
<div class="grid grid-cols-2 bg-slate-900 p-1 rounded-xl mb-4 border border-slate-800 text-xs font-bold">
    <a href="my_tournaments.php?tab=upcoming" class="text-center py-2 rounded-lg transition <?php echo ($active_tab === 'upcoming') ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'; ?>">
        Upcoming &amp; Live (<?php echo count($upcomingMatches); ?>)
    </a>
    <a href="my_tournaments.php?tab=completed" class="text-center py-2 rounded-lg transition <?php echo ($active_tab === 'completed') ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'; ?>">
        Match History (<?php echo count($completedMatches); ?>)
    </a>
</div>

<!-- Content -->
<div class="space-y-4 mb-8">
    <?php if ($active_tab === 'upcoming'): ?>
        <?php if (empty($upcomingMatches)): ?>
            <div class="text-center py-12 bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                <i class="fa-solid fa-calendar-xmark text-3xl text-slate-600 mb-2"></i>
                <h3 class="text-sm font-bold text-slate-300">No Active Registrations</h3>
                <p class="text-xs text-slate-500 mt-1 mb-4">You haven't registered for any upcoming tournaments yet.</p>
                <a href="index.php" class="bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-md">
                    Explore Tournaments &rarr;
                </a>
            </div>
        <?php else: ?>
            <?php foreach ($upcomingMatches as $t): 
                $isLive = ($t['status'] === 'Live');
            ?>
                <div class="bg-[#111827] border <?php echo $isLive ? 'border-rose-500/50 shadow-rose-950/30' : 'border-slate-800'; ?> rounded-2xl p-4 shadow-lg space-y-3">
                    
                    <div class="flex items-center justify-between">
                        <div>
                            <span class="text-[10px] font-bold text-emerald-400 uppercase"><?php echo htmlspecialchars($t['game_name']); ?></span>
                            <h3 class="text-sm font-bold text-white"><?php echo htmlspecialchars($t['title']); ?></h3>
                            <span class="text-[10px] text-slate-400"><?php echo date('d M Y, h:i A', strtotime($t['match_time'])); ?></span>
                        </div>
                        <span class="text-[9px] px-2 py-0.5 rounded-full font-bold <?php echo $isLive ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse' : 'bg-blue-500/20 text-blue-300'; ?>">
                            <?php echo $t['status']; ?>
                        </span>
                    </div>

                    <!-- ROOM ACCESS RESTRICTION LOGIC -->
                    <?php if ($isLive): ?>
                        <div class="bg-slate-950 border border-emerald-500/40 rounded-xl p-3 space-y-2">
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                    <i class="fa-solid fa-key"></i> Room Access Unlocked
                                </span>
                                <span class="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">MATCH READY</span>
                            </div>

                            <div class="grid grid-cols-2 gap-2 text-xs">
                                <div class="bg-slate-900 p-2 rounded-lg border border-slate-800">
                                    <span class="text-[10px] text-slate-500 block">Room ID</span>
                                    <span class="font-mono font-bold text-white text-sm select-all"><?php echo htmlspecialchars($t['room_id'] ?: 'Pending Admin'); ?></span>
                                </div>
                                <div class="bg-slate-900 p-2 rounded-lg border border-slate-800">
                                    <span class="text-[10px] text-slate-500 block">Room Password</span>
                                    <span class="font-mono font-bold text-amber-300 text-sm select-all"><?php echo htmlspecialchars($t['room_password'] ?: 'Pending Admin'); ?></span>
                                </div>
                            </div>
                        </div>

                        <!-- Result Screenshot Submission Form -->
                        <div class="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                            <h4 class="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                                <i class="fa-solid fa-camera text-cyan-400"></i> Submit Score Screenshot
                            </h4>
                            <form method="POST" action="my_tournaments.php" enctype="multipart/form-data" class="space-y-2">
                                <input type="hidden" name="action" value="submit_result">
                                <input type="hidden" name="tournament_id" value="<?php echo $t['id']; ?>">
                                <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">

                                <div class="grid grid-cols-2 gap-2">
                                    <div>
                                        <label class="block text-[10px] text-slate-400 mb-0.5">Your Placement</label>
                                        <input type="number" min="1" max="100" name="claimed_placement" placeholder="e.g. 1" required class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white">
                                    </div>
                                    <div>
                                        <label class="block text-[10px] text-slate-400 mb-0.5">Kills</label>
                                        <input type="number" min="0" max="99" name="claimed_kills" placeholder="e.g. 7" required class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white">
                                    </div>
                                </div>

                                <div>
                                    <label class="block text-[10px] text-slate-400 mb-0.5">Screenshot (Max 2MB, JPG/PNG)</label>
                                    <input type="file" name="screenshot" accept="image/jpeg,image/png,image/webp" required class="w-full text-[11px] text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:bg-slate-800 file:text-slate-200">
                                </div>

                                <button type="submit" class="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-1.5 rounded-lg text-xs transition">
                                    Upload Score Proof &rarr;
                                </button>
                            </form>
                        </div>
                    <?php else: ?>
                        <div class="bg-slate-900/70 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 flex items-center justify-between">
                            <span class="flex items-center gap-2">
                                <i class="fa-solid fa-lock text-amber-400"></i> Room credentials unlock 15 minutes before match start.
                            </span>
                            <span class="text-[10px] text-slate-500 font-mono">Standby</span>
                        </div>
                    <?php endif; ?>

                    <div class="flex items-center justify-between pt-1">
                        <a href="support.php" class="text-[11px] text-slate-400 hover:text-white flex items-center gap-1">
                            <i class="fa-solid fa-flag text-rose-400"></i> File Dispute
                        </a>
                        <span class="text-[10px] text-slate-500">Fair-Play Guaranteed</span>
                    </div>

                </div>
            <?php endforeach; ?>
        <?php endif; ?>

    <?php else: ?>
        <!-- Match History Tab -->
        <?php if (empty($completedMatches)): ?>
            <div class="text-center py-12 bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                <i class="fa-solid fa-clock-rotate-left text-3xl text-slate-600 mb-2"></i>
                <h3 class="text-sm font-bold text-slate-300">No Past Matches</h3>
                <p class="text-xs text-slate-500 mt-1">Completed tournament results will appear here.</p>
            </div>
        <?php else: ?>
            <?php foreach ($completedMatches as $t): 
                $isWinner = ($t['winner_id'] == $user_id);
            ?>
                <div class="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-md space-y-2">
                    <div class="flex items-center justify-between">
                        <div>
                            <span class="text-[10px] font-bold text-emerald-400 uppercase"><?php echo htmlspecialchars($t['game_name']); ?></span>
                            <h3 class="text-sm font-bold text-white"><?php echo htmlspecialchars($t['title']); ?></h3>
                            <span class="text-[10px] text-slate-400"><?php echo date('d M Y', strtotime($t['match_time'])); ?></span>
                        </div>
                        <span class="text-[10px] px-2 py-0.5 rounded-full font-bold <?php echo $isWinner ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400'; ?>">
                            <?php echo $isWinner ? 'CHAMPION 👑' : 'Completed'; ?>
                        </span>
                    </div>

                    <div class="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-xs">
                        <div>
                            <span class="text-slate-400 block text-[10px]">Your Placement</span>
                            <span class="font-bold text-white"><?php echo $t['user_placement'] ? '#' . $t['user_placement'] : 'Rank Recorded'; ?></span>
                        </div>
                        <div class="text-right">
                            <span class="text-slate-400 block text-[10px]">Reward</span>
                            <span class="font-bold font-mono <?php echo $isWinner ? 'text-amber-400' : 'text-emerald-400'; ?>">
                                <?php echo $isWinner ? 'Winner Trophy + XP' : '+50 Participation XP'; ?>
                            </span>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        <?php endif; ?>
    <?php endif; ?>
</div>

<?php require_once __DIR__ . '/common/bottom.php'; ?>
