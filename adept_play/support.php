<?php
/**
 * Clutch Arena - Player Protection & Support Hub
 * Handles Player Reports, Match Disputes, Account Inquiries, and Ticket Tracking.
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/common/header.php';

check_user_auth();

$user_id = $_SESSION['user_id'];
$success_msg = '';
$error_msg = '';

// Handle Ticket Submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $submitted_token = $_POST['csrf_token'] ?? '';

    if (!verify_csrf_token($submitted_token)) {
        $error_msg = "Security session expired. Please refresh the page.";
    } elseif (!check_rate_limit($pdo, 'support_ticket', 4, 3600)) {
        $error_msg = "Too many support requests submitted. Please wait before opening another ticket.";
    } else {
        $category = clean_input($_POST['category'] ?? 'account_issue');
        $subject = clean_input($_POST['subject'] ?? '');
        $description = clean_input($_POST['description'] ?? '');

        if (empty($subject) || empty($description)) {
            $error_msg = "Please provide both a subject and details for your ticket.";
        } else {
            try {
                $ticket_id = 'TKT-' . strtoupper(substr(md5(uniqid() . $user_id), 0, 8));

                $stmt = $pdo->prepare("
                    INSERT INTO support_tickets (id, user_id, category, subject, description, status, created_at) 
                    VALUES (?, ?, ?, ?, ?, 'Open', NOW())
                ");
                $stmt->execute([$ticket_id, $user_id, $category, $subject, $description]);

                log_audit_action($pdo, 'user', $user_id, 'ticket_created', 'support_tickets', 0, "Ticket $ticket_id: $category");

                $success_msg = "Support ticket #$ticket_id submitted successfully! An esports adjudicator will review it shortly.";
            } catch (Exception $e) {
                $error_msg = "Error submitting ticket: " . $e->getMessage();
            }
        }
    }
}

// Fetch user's tickets
$tStmt = $pdo->prepare("SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC LIMIT 15");
$tStmt->execute([$user_id]);
$my_tickets = $tStmt->fetchAll();

$csrf_token = generate_csrf_token();
?>

<div class="space-y-4">

    <!-- Header Card -->
    <div class="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950/60 border border-indigo-500/30 rounded-2xl p-4 shadow-xl">
        <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                <i class="fa-solid fa-headset"></i> Support &amp; Fair Play Disputes
            </span>
            <span class="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full font-bold">
                Player Protection
            </span>
        </div>
        <h2 class="text-base font-black text-white">Esports Support &amp; Ticket Center</h2>
        <p class="text-xs text-slate-400 mt-1">Submit tournament disputes, report suspicious behavior, or appeal account actions.</p>
    </div>

    <!-- Alert Feedback -->
    <?php if (!empty($success_msg)): ?>
        <div class="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2">
            <i class="fa-solid fa-circle-check text-emerald-400"></i>
            <span><?php echo htmlspecialchars($success_msg); ?></span>
        </div>
    <?php endif; ?>

    <?php if (!empty($error_msg)): ?>
        <div class="bg-rose-950/80 border border-rose-500/50 text-rose-300 p-3 rounded-xl text-xs flex items-center gap-2">
            <i class="fa-solid fa-circle-exclamation text-rose-400"></i>
            <span><?php echo htmlspecialchars($error_msg); ?></span>
        </div>
    <?php endif; ?>

    <!-- New Ticket Form -->
    <div class="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-md">
        <h3 class="text-xs font-bold text-white mb-3 flex items-center gap-2 border-b border-slate-800 pb-2">
            <i class="fa-solid fa-pen-to-square text-indigo-400"></i> Submit New Report / Inquiry
        </h3>

        <form method="POST" action="support.php" class="space-y-3">
            <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">

            <div>
                <label class="block text-[11px] font-medium text-slate-300 mb-1">Issue Category</label>
                <select name="category" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
                    <option value="tournament_dispute">Tournament Result Dispute / Scoring Issue</option>
                    <option value="cheating_report">Fair Play / In-Game Teaming / Cheat Report</option>
                    <option value="room_issue">Room ID &amp; Password Access Issue</option>
                    <option value="account_issue">Account Security / Restriction Appeal</option>
                    <option value="feedback">Platform Suggestion / Bug Report</option>
                </select>
            </div>

            <div>
                <label class="block text-[11px] font-medium text-slate-300 mb-1">Subject</label>
                <input type="text" name="subject" required placeholder="Brief summary of the issue" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
            </div>

            <div>
                <label class="block text-[11px] font-medium text-slate-300 mb-1">Detailed Description</label>
                <textarea name="description" rows="3" required placeholder="Provide match title, room number, player UIDs, or specific timeline..." class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"></textarea>
            </div>

            <button type="submit" class="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 text-white font-bold py-2.5 rounded-xl text-xs shadow-md shadow-indigo-500/20 transition flex items-center justify-center gap-1.5">
                <i class="fa-solid fa-paper-plane"></i> Submit Ticket
            </button>
        </form>
    </div>

    <!-- Ticket Tracking List -->
    <div>
        <h3 class="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
            <i class="fa-solid fa-ticket text-slate-400"></i> My Open &amp; Resolved Tickets (<?php echo count($my_tickets); ?>)
        </h3>

        <div class="space-y-2.5">
            <?php if (empty($my_tickets)): ?>
                <div class="text-center py-8 bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-500">
                    No tickets opened. All your matches and account actions are in good standing!
                </div>
            <?php else: ?>
                <?php foreach ($my_tickets as $tk): 
                    $status_class = 'bg-slate-800 text-slate-400';
                    if ($tk['status'] === 'Open') $status_class = 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
                    if ($tk['status'] === 'In Review') $status_class = 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
                    if ($tk['status'] === 'Resolved') $status_class = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
                    if ($tk['status'] === 'Closed') $status_class = 'bg-slate-800 text-slate-400 border border-slate-700';
                ?>
                    <div class="bg-[#111827] border border-slate-800 rounded-xl p-3 text-xs space-y-1.5">
                        <div class="flex items-center justify-between">
                            <span class="font-mono font-bold text-indigo-400 text-[11px]"><?php echo htmlspecialchars($tk['id']); ?></span>
                            <span class="text-[9px] font-bold px-2 py-0.5 rounded-full <?php echo $status_class; ?>">
                                <?php echo $tk['status']; ?>
                            </span>
                        </div>
                        <h4 class="font-bold text-white"><?php echo htmlspecialchars($tk['subject']); ?></h4>
                        <p class="text-[11px] text-slate-400 leading-relaxed"><?php echo nl2br(htmlspecialchars($tk['description'])); ?></p>
                        
                        <?php if (!empty($tk['admin_response'])): ?>
                            <div class="bg-indigo-950/40 border border-indigo-500/30 p-2.5 rounded-lg mt-2 text-[11px] text-indigo-200">
                                <span class="font-bold flex items-center gap-1 text-indigo-300 mb-0.5">
                                    <i class="fa-solid fa-shield-halved text-[10px]"></i> Staff Response:
                                </span>
                                <?php echo nl2br(htmlspecialchars($tk['admin_response'])); ?>
                            </div>
                        <?php endif; ?>

                        <span class="text-[10px] text-slate-500 block pt-1">
                            Submitted: <?php echo date('d M Y, h:i A', strtotime($tk['created_at'])); ?>
                        </span>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>
    </div>

</div>

<?php require_once __DIR__ . '/common/bottom.php'; ?>
