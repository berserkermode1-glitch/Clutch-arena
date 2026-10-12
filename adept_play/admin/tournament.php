<?php
/**
 * Clutch Arena - Admin Tournaments (Create, List, Delete)
 * Hardened with CSRF protection, capacity limits, and audit logs.
 */
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/common/header.php';

check_admin_auth();

$success_msg = '';
$error_msg = '';

// Handle Delete Request (PHP POST)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'delete_tournament') {
    $submitted_token = $_POST['csrf_token'] ?? '';
    if (!verify_csrf_token($submitted_token)) {
        $error_msg = "Security session expired. Please refresh the page.";
    } else {
        $del_id = intval($_POST['tournament_id'] ?? 0);
        if ($del_id > 0) {
            try {
                $delStmt = $pdo->prepare("DELETE FROM tournaments WHERE id = ?");
                $delStmt->execute([$del_id]);

                log_audit_action($pdo, 'admin', $_SESSION['admin_id'], 'tournament_deleted', 'tournaments', $del_id, "Tournament #$del_id deleted");
                $success_msg = "Tournament deleted successfully.";
            } catch (Exception $e) {
                $error_msg = "Error deleting tournament: " . $e->getMessage();
            }
        }
    }
}

// Handle Create Tournament (PHP POST)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'create_tournament') {
    $submitted_token = $_POST['csrf_token'] ?? '';
    if (!verify_csrf_token($submitted_token)) {
        $error_msg = "Security session expired. Please refresh the page.";
    } else {
        $title = clean_input($_POST['title'] ?? '');
        $game_name = clean_input($_POST['game_name'] ?? '');
        $entry_fee = floatval($_POST['entry_fee'] ?? 0);
        $prize_pool = floatval($_POST['prize_pool'] ?? 0);
        $max_participants = intval($_POST['max_participants'] ?? 48);
        $match_time = clean_input($_POST['match_time'] ?? '');
        $rules = clean_input($_POST['rules'] ?? 'Standard Esports Fair Play rules apply. No emulators or external scripts.');

        if (empty($title) || empty($game_name) || empty($match_time)) {
            $error_msg = "Please fill in all mandatory tournament details.";
        } elseif ($max_participants < 2 || $max_participants > 100) {
            $error_msg = "Max participants must be between 2 and 100.";
        } else {
            try {
                $stmt = $pdo->prepare("
                    INSERT INTO tournaments (title, game_name, entry_fee, prize_pool, max_participants, rules, match_time, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'Upcoming')
                ");
                $stmt->execute([$title, $game_name, $entry_fee, $prize_pool, $max_participants, $rules, $match_time]);
                $new_id = (int)$pdo->lastInsertId();

                log_audit_action($pdo, 'admin', $_SESSION['admin_id'], 'tournament_created', 'tournaments', $new_id, "Created: $title ($game_name) max $max_participants");

                $success_msg = "New tournament created successfully! (Capacity: $max_participants)";
            } catch (Exception $e) {
                $error_msg = "Creation error: " . $e->getMessage();
            }
        }
    }
}

// Fetch All Tournaments
$tournaments = [];
try {
    $tournaments = $pdo->query("
        SELECT t.*, COUNT(p.id) AS participant_count 
        FROM tournaments t 
        LEFT JOIN participants p ON t.id = p.tournament_id 
        GROUP BY t.id 
        ORDER BY t.created_at DESC
    ")->fetchAll();
} catch (Exception $e) {}

$csrf_token = generate_csrf_token();
?>

<!-- Feedback Messages -->
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

<div class="mb-4">
    <h1 class="text-base font-black text-white flex items-center gap-2">
        <i class="fa-solid fa-trophy text-amber-400"></i> Tournament Management
    </h1>
    <p class="text-xs text-slate-400">Schedule brackets, manage rosters, and enforce capacities</p>
</div>

<!-- SECTION 1: CREATE TOURNAMENT FORM -->
<div class="bg-[#111827] border border-slate-800 rounded-2xl p-4 mb-5 shadow-lg">
    <h2 class="text-xs font-bold text-white mb-3 flex items-center gap-2 border-b border-slate-800 pb-2">
        <i class="fa-solid fa-circle-plus text-indigo-400"></i> Create New Bracket
    </h2>

    <form method="POST" action="tournament.php" class="space-y-3">
        <input type="hidden" name="action" value="create_tournament">
        <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">

        <div>
            <label class="block text-[11px] font-medium text-slate-300 mb-1">Tournament Title</label>
            <input type="text" name="title" required placeholder="e.g. Free Fire MAX Duo Championship #4" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans">
        </div>

        <div class="grid grid-cols-2 gap-3">
            <div>
                <label class="block text-[11px] font-medium text-slate-300 mb-1">Esports Game</label>
                <select name="game_name" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
                    <option value="BGMI">BGMI (Battlegrounds Mobile)</option>
                    <option value="Free Fire MAX">Free Fire MAX</option>
                    <option value="Call of Duty Mobile">Call of Duty Mobile</option>
                </select>
            </div>

            <div>
                <label class="block text-[11px] font-medium text-slate-300 mb-1">Max Capacity (Players)</label>
                <input type="number" name="max_participants" min="2" max="100" value="48" required class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500">
            </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
            <div>
                <label class="block text-[11px] font-medium text-slate-300 mb-1">Entry Fee (₹)</label>
                <input type="number" step="0.01" name="entry_fee" value="0.00" required class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500">
                <span class="text-[9px] text-emerald-400">0.00 = Free Scrim</span>
            </div>

            <div>
                <label class="block text-[11px] font-medium text-slate-300 mb-1">Prize Pool / Reward (₹)</label>
                <input type="number" step="0.01" name="prize_pool" value="500.00" required class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500">
            </div>
        </div>

        <div>
            <label class="block text-[11px] font-medium text-slate-300 mb-1">Match Date &amp; Time (IST)</label>
            <input type="datetime-local" name="match_time" required class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono">
        </div>

        <button type="submit" class="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 text-white font-bold py-2.5 rounded-xl text-xs shadow-md shadow-indigo-500/20 transition active:scale-95">
            Publish Tournament &rarr;
        </button>
    </form>
</div>

<!-- SECTION 2: LIST ALL TOURNAMENTS -->
<div>
    <h3 class="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
        <i class="fa-solid fa-list text-slate-400"></i> All Tournaments (<?php echo count($tournaments); ?>)
    </h3>

    <div class="space-y-3">
        <?php foreach ($tournaments as $t): ?>
            <div class="bg-[#111827] border border-slate-800 rounded-2xl p-3.5 text-xs shadow-md space-y-2">
                <div class="flex items-center justify-between">
                    <div>
                        <span class="text-[10px] font-bold text-indigo-400 uppercase"><?php echo htmlspecialchars($t['game_name']); ?></span>
                        <h4 class="font-bold text-white"><?php echo htmlspecialchars($t['title']); ?></h4>
                    </div>
                    <span class="text-[9px] px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        <?php echo $t['status']; ?>
                    </span>
                </div>

                <div class="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Players: <strong class="text-white"><?php echo $t['participant_count']; ?> / <?php echo intval($t['max_participants'] ?: 48); ?></strong></span>
                    <span>Prize: <strong class="text-amber-400">₹<?php echo number_format($t['prize_pool'], 0); ?></strong></span>
                </div>

                <div class="flex items-center gap-2 pt-1">
                    <a href="manage_tournament.php?id=<?php echo $t['id']; ?>" class="flex-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 py-1.5 rounded-lg text-center font-bold text-[11px] transition">
                        Manage &amp; Room Details &rarr;
                    </a>

                    <form method="POST" action="tournament.php" onsubmit="return confirm('Delete tournament: <?php echo htmlspecialchars($t['title']); ?>?');">
                        <input type="hidden" name="action" value="delete_tournament">
                        <input type="hidden" name="tournament_id" value="<?php echo $t['id']; ?>">
                        <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">
                        <button type="submit" class="bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/30 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </form>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
</div>

<?php require_once __DIR__ . '/common/bottom.php'; ?>
