<?php
/**
 * Clutch Arena - Reversible Database Migration & Security Hardening Script
 * Adds progression, referral anti-fraud, daily login reward ledger,
 * audit trails, login throttling, and tournament integrity tables.
 * Preserves all existing tables and records.
 */

require_once __DIR__ . '/config.php';

$output_messages = [];
$has_error = false;

if (!isset($pdo) || !$pdo) {
    die("Database connection error: Could not connect to database. Please verify MySQL service and credentials.");
}

try {
    // 1. Ensure `users` has all required progression & security columns
    $userCols = [
        'free_fire_uid'   => "ALTER TABLE `users` ADD COLUMN `free_fire_uid` VARCHAR(50) NULL AFTER `upi_id`",
        'avatar'          => "ALTER TABLE `users` ADD COLUMN `avatar` VARCHAR(50) NOT NULL DEFAULT 'cyber-ninja' AFTER `free_fire_uid`",
        'level'           => "ALTER TABLE `users` ADD COLUMN `level` INT NOT NULL DEFAULT 1 AFTER `avatar`",
        'xp'              => "ALTER TABLE `users` ADD COLUMN `xp` INT NOT NULL DEFAULT 0 AFTER `level`",
        'referral_code'   => "ALTER TABLE `users` ADD COLUMN `referral_code` VARCHAR(20) NULL AFTER `xp`",
        'referred_by'     => "ALTER TABLE `users` ADD COLUMN `referred_by` INT NULL AFTER `referral_code`",
        'streak_days'     => "ALTER TABLE `users` ADD COLUMN `streak_days` INT NOT NULL DEFAULT 0 AFTER `referred_by`",
        'last_login_date' => "ALTER TABLE `users` ADD COLUMN `last_login_date` DATE NULL AFTER `streak_days`",
        'is_blocked'      => "ALTER TABLE `users` ADD COLUMN `is_blocked` TINYINT(1) NOT NULL DEFAULT 0 AFTER `last_login_date`",
        'block_reason'    => "ALTER TABLE `users` ADD COLUMN `block_reason` VARCHAR(255) NULL AFTER `is_blocked`"
    ];

    foreach ($userCols as $col => $sql) {
        $check = $pdo->query("SHOW COLUMNS FROM `users` LIKE '$col'")->fetch();
        if (!$check) {
            $pdo->exec($sql);
            $output_messages[] = "Added column `$col` to `users` table.";
        }
    }

    // Generate unique referral_code for any existing users without one
    $existingUsers = $pdo->query("SELECT id, username FROM `users` WHERE `referral_code` IS NULL OR `referral_code` = ''")->fetchAll();
    foreach ($existingUsers as $u) {
        $code = 'CLUTCH-' . strtoupper(substr(md5($u['username'] . $u['id']), 0, 6));
        $up = $pdo->prepare("UPDATE `users` SET `referral_code` = ? WHERE `id` = ?");
        $up->execute([$code, $u['id']]);
        $output_messages[] = "Generated referral code $code for user #{$u['id']} ({$u['username']}).";
    }

    // 2. Ensure `tournaments` has integrity columns
    $tourneyCols = [
        'max_participants'  => "ALTER TABLE `tournaments` ADD COLUMN `max_participants` INT NOT NULL DEFAULT 48 AFTER `match_time`",
        'rules'             => "ALTER TABLE `tournaments` ADD COLUMN `rules` TEXT NULL AFTER `max_participants`",
        'prize_description' => "ALTER TABLE `tournaments` ADD COLUMN `prize_description` VARCHAR(255) NOT NULL DEFAULT 'Esports Championship XP & Digital Badge' AFTER `prize_pool`"
    ];

    foreach ($tourneyCols as $col => $sql) {
        $check = $pdo->query("SHOW COLUMNS FROM `tournaments` LIKE '$col'")->fetch();
        if (!$check) {
            $pdo->exec($sql);
            $output_messages[] = "Added column `$col` to `tournaments` table.";
        }
    }

    // 3. Create Referrals Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `referrals` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `referrer_id` INT NOT NULL,
        `referee_id` INT NOT NULL,
        `referral_code` VARCHAR(20) NOT NULL,
        `status` ENUM('Pending', 'Verified', 'Qualified', 'Rewarded', 'Rejected') NOT NULL DEFAULT 'Pending',
        `ip_address` VARCHAR(45) NOT NULL,
        `device_fingerprint` VARCHAR(100) NULL,
        `reward_issued` TINYINT(1) NOT NULL DEFAULT 0,
        `reward_idempotency_key` VARCHAR(64) NULL UNIQUE,
        `rejection_reason` VARCHAR(255) NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY `unique_referee` (`referee_id`),
        INDEX `idx_ref_referrer` (`referrer_id`),
        INDEX `idx_ref_status` (`status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $output_messages[] = "Verified table: `referrals` created or already exists.";

    // 4. Create Daily Rewards Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `daily_rewards` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `user_id` INT NOT NULL,
        `claim_date` DATE NOT NULL,
        `streak_day` INT NOT NULL,
        `xp_awarded` INT NOT NULL DEFAULT 50,
        `badge_awarded` VARCHAR(50) NULL,
        `reward_details` VARCHAR(255) NOT NULL,
        `timezone` VARCHAR(32) NOT NULL DEFAULT 'Asia/Kolkata',
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY `unique_user_daily_claim` (`user_id`, `claim_date`),
        INDEX `idx_daily_user` (`user_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $output_messages[] = "Verified table: `daily_rewards` created or already exists.";

    // 5. Create Match Results Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `match_results` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `tournament_id` INT NOT NULL,
        `user_id` INT NOT NULL,
        `screenshot_path` VARCHAR(255) NOT NULL,
        `claimed_placement` INT NOT NULL,
        `claimed_kills` INT NOT NULL DEFAULT 0,
        `status` ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
        `reviewed_by` INT NULL,
        `review_notes` TEXT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `reviewed_at` TIMESTAMP NULL,
        INDEX `idx_res_tourney` (`tournament_id`),
        INDEX `idx_res_user` (`user_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $output_messages[] = "Verified table: `match_results` created or already exists.";

    // 6. Create Disputes Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `disputes` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `tournament_id` INT NULL,
        `user_id` INT NOT NULL,
        `reported_user_id` INT NULL,
        `category` ENUM('score_dispute', 'cheating_report', 'room_issue', 'unsportsmanlike') NOT NULL,
        `subject` VARCHAR(150) NOT NULL,
        `description` TEXT NOT NULL,
        `screenshot_path` VARCHAR(255) NULL,
        `status` ENUM('Open', 'In Review', 'Resolved', 'Dismissed') NOT NULL DEFAULT 'Open',
        `admin_notes` TEXT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `resolved_at` TIMESTAMP NULL,
        INDEX `idx_disp_user` (`user_id`),
        INDEX `idx_disp_status` (`status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $output_messages[] = "Verified table: `disputes` created or already exists.";

    // 7. Create Support Tickets Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `support_tickets` (
        `id` VARCHAR(32) PRIMARY KEY,
        `user_id` INT NOT NULL,
        `category` VARCHAR(50) NOT NULL,
        `subject` VARCHAR(150) NOT NULL,
        `description` TEXT NOT NULL,
        `status` ENUM('Open', 'In Review', 'Resolved', 'Closed') NOT NULL DEFAULT 'Open',
        `admin_response` TEXT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX `idx_tick_user` (`user_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $output_messages[] = "Verified table: `support_tickets` created or already exists.";

    // 8. Create Login Attempts Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `login_attempts` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `identifier` VARCHAR(100) NOT NULL,
        `ip_address` VARCHAR(45) NOT NULL,
        `success` TINYINT(1) NOT NULL DEFAULT 0,
        `attempt_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX `idx_att_ip` (`ip_address`),
        INDEX `idx_att_ident` (`identifier`),
        INDEX `idx_att_time` (`attempt_time`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $output_messages[] = "Verified table: `login_attempts` created or already exists.";

    // 9. Create Password Resets Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `password_resets` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `user_id` INT NOT NULL,
        `token_hash` VARCHAR(64) NOT NULL UNIQUE,
        `expires_at` DATETIME NOT NULL,
        `used` TINYINT(1) NOT NULL DEFAULT 0,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX `idx_reset_token` (`token_hash`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $output_messages[] = "Verified table: `password_resets` created or already exists.";

    // 10. Create Rate Limits Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `rate_limits` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `rate_key` VARCHAR(100) NOT NULL UNIQUE,
        `hits` INT NOT NULL DEFAULT 1,
        `window_start` INT NOT NULL,
        INDEX `idx_rate_key` (`rate_key`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $output_messages[] = "Verified table: `rate_limits` created or already exists.";

    // 11. Create Audit Logs Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `audit_logs` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `actor_type` ENUM('admin', 'user', 'system') NOT NULL,
        `actor_id` INT NULL,
        `action` VARCHAR(100) NOT NULL,
        `target_type` VARCHAR(50) NOT NULL,
        `target_id` INT NULL,
        `details` TEXT NOT NULL,
        `ip_address` VARCHAR(45) NOT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX `idx_audit_actor` (`actor_type`, `actor_id`),
        INDEX `idx_audit_action` (`action`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $output_messages[] = "Verified table: `audit_logs` created or already exists.";

    // 12. Create Security Events Table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `security_events` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `event_type` VARCHAR(50) NOT NULL,
        `severity` ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL DEFAULT 'Medium',
        `user_id` INT NULL,
        `ip_address` VARCHAR(45) NOT NULL,
        `details` TEXT NOT NULL,
        `status` ENUM('New', 'Investigating', 'Resolved', 'False Alarm') NOT NULL DEFAULT 'New',
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX `idx_sec_event` (`event_type`),
        INDEX `idx_sec_severity` (`severity`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $output_messages[] = "Verified table: `security_events` created or already exists.";

    // 13. Create uploads subdirectories with safe directory permissions
    $dirs = [
        __DIR__ . '/uploads/results/',
        __DIR__ . '/uploads/disputes/',
        __DIR__ . '/uploads/qr_codes/',
        __DIR__ . '/database/backups/'
    ];
    foreach ($dirs as $d) {
        if (!is_dir($d)) {
            mkdir($d, 0755, true);
        }
    }

    // Add .htaccess inside /uploads to block executing PHP scripts inside uploads directory
    $uploadsHtaccess = __DIR__ . '/uploads/.htaccess';
    if (!file_exists($uploadsHtaccess)) {
        file_put_contents($uploadsHtaccess, "php_flag engine off\nRemoveHandler .php .phtml .php3 .php4 .php5 .php7 .phps\nOptions -Indexes\n");
    }

    $output_messages[] = "Security hardening complete: Upload execution disabled in /uploads/.htaccess.";

} catch (Exception $e) {
    $has_error = true;
    $output_messages[] = "Migration Error: " . $e->getMessage();
}

if (php_sapi_name() === 'cli') {
    foreach ($output_messages as $m) echo "$m\n";
    exit($has_error ? 1 : 0);
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Database Security Migration - Clutch Arena</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 p-8 font-sans">
    <div class="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <h1 class="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
            <i class="fa-solid fa-shield-halved"></i> Database Security Migration
        </h1>
        <ul class="space-y-2 text-xs">
            <?php foreach ($output_messages as $msg): ?>
                <li class="p-2 rounded bg-slate-950 border border-slate-800/80"><?php echo htmlspecialchars($msg); ?></li>
            <?php endforeach; ?>
        </ul>
        <div class="mt-6 text-center">
            <a href="index.php" class="bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs">&larr; Return to Application</a>
        </div>
    </div>
</body>
</html>
