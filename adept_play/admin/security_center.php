<?php
/**
 * Clutch Arena - Protected Admin Security Center
 * Monitors suspicious logins, brute-force attempts, referral fraud,
 * duplicate claims, and administrative audit history.
 */
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/common/header.php';

check_admin_auth();

$success_msg = '';
$error_msg = '';

// Handle Status Updates on Security Events
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'update_event_status') {
    $submitted_token = $_POST['csrf_token'] ?? '';
    if (!verify_csrf_token($submitted_token)) {
        $error_msg = "Security session expired. Please refresh the page.";
    } else {
        $event_id = intval($_POST['event_id'] ?? 0);
        $new_status = clean_input($_POST['new_status'] ?? 'Investigating');
        $valid_statuses = ['New', 'Investigating', 'Resolved', 'False Alarm'];

        if (in_array($new_status, $valid_statuses, true)) {
            try {
                $upStmt = $pdo->prepare("UPDATE security_events SET status = ? WHERE id = ?");
                $upStmt->execute([$new_status, $event_id]);

                log_audit_action($pdo, 'admin', $_SESSION['admin_id'], 'security_event_updated', 'security_events', $event_id, "Status changed to $new_status");
                $success_msg = "Security event #$event_id marked as $new_status.";
            } catch (Exception $e) {
                $error_msg = "Update error: " . $e->getMessage();
            }
        }
    }
}

// Fetch Security Events
$events = [];
$audit_trail = [];
$stats = [
    'critical_count' => 0,
    'high_count' => 0,
    'new_count' => 0,
    'total_events' => 0
];

if (isset($pdo) && $pdo) {
    try {
        $eStmt = $pdo->query("SELECT * FROM security_events ORDER BY created_at DESC LIMIT 30");
        $events = $eStmt->fetchAll();

        $stats['total_events'] = count($events);
        foreach ($events as $ev) {
            if ($ev['severity'] === 'Critical') $stats['critical_count']++;
            if ($ev['severity'] === 'High') $stats['high_count']++;
            if ($ev['status'] === 'New') $stats['new_count']++;
        }

        $aStmt = $pdo->query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 25");
        $audit_trail = $aStmt->fetchAll();
    } catch (Exception $e) {}
}

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

<div class="mb-4 flex items-center justify-between">
    <div>
        <h1 class="text-base font-black text-white flex items-center gap-2">
            <i class="fa-solid fa-shield-halved text-amber-400"></i> Security &amp; Anti-Fraud Center
        </h1>
        <p class="text-xs text-slate-400">Real-time threat monitoring, audit logs, and fraud prevention</p>
    </div>
    <span class="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full font-mono">
        ACTIVE SENTINEL
    </span>
</div>

<!-- Overview Stats Grid -->
<div class="grid grid-cols-4 gap-2 mb-4 text-xs text-center font-mono">
    <div class="bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
        <span class="text-[10px] text-slate-400 block font-sans">Unresolved</span>
        <span class="text-base font-black text-amber-400"><?php echo $stats['new_count']; ?></span>
    </div>
    <div class="bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
        <span class="text-[10px] text-slate-400 block font-sans">Critical</span>
        <span class="text-base font-black text-rose-400"><?php echo $stats['critical_count']; ?></span>
    </div>
    <div class="bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
        <span class="text-[10px] text-slate-400 block font-sans">High Risk</span>
        <span class="text-base font-black text-purple-400"><?php echo $stats['high_count']; ?></span>
    </div>
    <div class="bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
        <span class="text-[10px] text-slate-400 block font-sans">Total Tracked</span>
        <span class="text-base font-black text-white"><?php echo $stats['total_events']; ?></span>
    </div>
</div>

<!-- Security Events Feed -->
<div class="space-y-3 mb-6">
    <div class="flex items-center justify-between text-xs">
        <span class="font-bold text-slate-300">Security Events &amp; Anomalies</span>
        <span class="text-slate-500 text-[10px]">Auto-Flagged (No auto-bans)</span>
    </div>

    <?php if (empty($events)): ?>
        <div class="text-center py-8 bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-500">
            <i class="fa-solid fa-circle-check text-2xl text-emerald-500/40 mb-1.5 block"></i>
            No suspicious activities detected. All systems operating within security baselines.
        </div>
    <?php else: ?>
        <?php foreach ($events as $ev): 
            $sev_class = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
            if ($ev['severity'] === 'Medium') $sev_class = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
            if ($ev['severity'] === 'High') $sev_class = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
            if ($ev['severity'] === 'Critical') $sev_class = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
        ?>
            <div class="bg-[#111827] border border-slate-800 rounded-2xl p-3.5 space-y-2 text-xs shadow-md">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-1.5">
                        <span class="text-[9px] font-bold px-2 py-0.5 rounded-full border <?php echo $sev_class; ?>">
                            <?php echo $ev['severity']; ?>
                        </span>
                        <span class="font-bold text-white font-mono"><?php echo htmlspecialchars($ev['event_type']); ?></span>
                    </div>
                    <span class="text-[10px] text-slate-400 font-mono"><?php echo date('d M, h:i A', strtotime($ev['created_at'])); ?></span>
                </div>

                <p class="text-slate-300 text-[11px] leading-relaxed"><?php echo htmlspecialchars($ev['details']); ?></p>

                <div class="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] text-slate-500">
                    <span>IP: <strong class="font-mono text-slate-400"><?php echo htmlspecialchars($ev['ip_address']); ?></strong></span>
                    <span>Status: <strong class="text-amber-400"><?php echo $ev['status']; ?></strong></span>
                </div>

                <!-- Adjudication actions -->
                <?php if ($ev['status'] !== 'Resolved'): ?>
                    <form method="POST" action="security_center.php" class="flex gap-2 pt-1">
                        <input type="hidden" name="action" value="update_event_status">
                        <input type="hidden" name="event_id" value="<?php echo $ev['id']; ?>">
                        <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">

                        <button type="submit" name="new_status" value="Resolved" class="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 py-1 rounded-lg font-bold text-[10px] transition">
                            <i class="fa-solid fa-check"></i> Mark Resolved
                        </button>
                        <button type="submit" name="new_status" value="False Alarm" class="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 py-1 rounded-lg font-semibold text-[10px] transition">
                            False Alarm
                        </button>
                    </form>
                <?php endif; ?>
            </div>
        <?php endforeach; ?>
    <?php endif; ?>
</div>

<!-- Administrative Audit Trail -->
<div class="border-t border-slate-800 pt-4">
    <h3 class="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
        <i class="fa-solid fa-book text-indigo-400"></i> Administrative Audit Log (Privacy Hardened)
    </h3>

    <div class="space-y-1.5 max-h-72 overflow-y-auto">
        <?php if (empty($audit_trail)): ?>
            <p class="text-[11px] text-slate-500">No administrative actions logged yet.</p>
        <?php else: ?>
            <?php foreach ($audit_trail as $at): ?>
                <div class="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2.5 text-[11px] flex items-center justify-between">
                    <div>
                        <div class="flex items-center gap-1.5">
                            <span class="font-bold text-indigo-300">[<?php echo strtoupper($at['actor_type']); ?>]</span>
                            <span class="font-mono text-white"><?php echo htmlspecialchars($at['action']); ?></span>
                        </div>
                        <span class="text-slate-400 text-[10px] block mt-0.5"><?php echo htmlspecialchars($at['details']); ?></span>
                    </div>
                    <span class="text-[9px] text-slate-500 font-mono"><?php echo date('H:i:s, d M', strtotime($at['created_at'])); ?></span>
                </div>
            <?php endforeach; ?>
        <?php endif; ?>
    </div>
</div>

<?php require_once __DIR__ . '/common/bottom.php'; ?>
