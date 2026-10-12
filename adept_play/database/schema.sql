-- ============================================================================
-- CLUTCH ARENA - PRODUCTION DATABASE SCHEMA (MySQL 8.0+ / MariaDB)
-- Hardened for Esports Tournament Operations, Anti-Cheat, & Player Protection
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `clutch_arena` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `clutch_arena`;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `wallet_balance` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `upi_id` VARCHAR(255) NULL,
    `free_fire_uid` VARCHAR(50) NULL,
    `avatar` VARCHAR(50) NOT NULL DEFAULT 'cyber-ninja',
    `level` INT NOT NULL DEFAULT 1,
    `xp` INT NOT NULL DEFAULT 0,
    `referral_code` VARCHAR(20) NOT NULL UNIQUE,
    `referred_by` INT NULL,
    `streak_days` INT NOT NULL DEFAULT 0,
    `last_login_date` DATE NULL,
    `is_blocked` TINYINT(1) NOT NULL DEFAULT 0,
    `block_reason` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_users_username` (`username`),
    INDEX `idx_users_email` (`email`),
    INDEX `idx_users_referral` (`referral_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Admin Table
CREATE TABLE IF NOT EXISTS `admin` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('super_admin', 'tournament_mod', 'support_agent') NOT NULL DEFAULT 'super_admin',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tournaments Table
CREATE TABLE IF NOT EXISTS `tournaments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(120) NOT NULL,
    `game_name` VARCHAR(50) NOT NULL,
    `entry_fee` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `prize_pool` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `prize_description` VARCHAR(255) NOT NULL DEFAULT 'Esports Championship XP & Digital Badge',
    `commission_percent` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `match_time` DATETIME NOT NULL,
    `max_participants` INT NOT NULL DEFAULT 48,
    `rules` TEXT NULL,
    `room_id` VARCHAR(100) NULL DEFAULT '',
    `room_password` VARCHAR(100) NULL DEFAULT '',
    `winner_id` INT NULL,
    `status` ENUM('Upcoming', 'Live', 'Under Review', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Upcoming',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_tournament_status` (`status`),
    INDEX `idx_tournament_match_time` (`match_time`),
    FOREIGN KEY (`winner_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Participants Table
CREATE TABLE IF NOT EXISTS `participants` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `tournament_id` INT NOT NULL,
    `in_game_uid` VARCHAR(50) NULL,
    `placement` INT NULL,
    `kills` INT NOT NULL DEFAULT 0,
    `score` INT NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_participant` (`user_id`, `tournament_id`),
    INDEX `idx_part_user` (`user_id`),
    INDEX `idx_part_tournament` (`tournament_id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Transactions Table
CREATE TABLE IF NOT EXISTS `transactions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `type` ENUM('credit', 'debit') NOT NULL,
    `status` ENUM('Completed', 'Pending', 'Verified', 'Refunded') NOT NULL DEFAULT 'Completed',
    `reference_id` VARCHAR(64) NOT NULL UNIQUE,
    `category` ENUM('entry_fee', 'prize_winnings', 'reward', 'refund', 'deposit_hold', 'bonus') NOT NULL DEFAULT 'entry_fee',
    `description` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_tx_user` (`user_id`),
    INDEX `idx_tx_ref` (`reference_id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Referrals Table (Fraud Protected & Auditable)
CREATE TABLE IF NOT EXISTS `referrals` (
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
    INDEX `idx_ref_status` (`status`),
    FOREIGN KEY (`referrer_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`referee_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Daily Login Rewards Table (Asia/Kolkata Calendar Guarded)
CREATE TABLE IF NOT EXISTS `daily_rewards` (
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
    INDEX `idx_daily_user` (`user_id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Match Result Evidence Submissions Table
CREATE TABLE IF NOT EXISTS `match_results` (
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
    INDEX `idx_res_user` (`user_id`),
    INDEX `idx_res_status` (`status`),
    FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`reviewed_by`) REFERENCES `admin`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Disputes & Player Reports Table
CREATE TABLE IF NOT EXISTS `disputes` (
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
    INDEX `idx_disp_status` (`status`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Support Tickets Table
CREATE TABLE IF NOT EXISTS `support_tickets` (
    `id` VARCHAR(32) PRIMARY KEY,
    `user_id` INT NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `subject` VARCHAR(150) NOT NULL,
    `description` TEXT NOT NULL,
    `status` ENUM('Open', 'In Review', 'Resolved', 'Closed') NOT NULL DEFAULT 'Open',
    `admin_response` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_tick_user` (`user_id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Login Throttling & Security Attempts Table
CREATE TABLE IF NOT EXISTS `login_attempts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `identifier` VARCHAR(100) NOT NULL,
    `ip_address` VARCHAR(45) NOT NULL,
    `success` TINYINT(1) NOT NULL DEFAULT 0,
    `attempt_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_att_ip` (`ip_address`),
    INDEX `idx_att_ident` (`identifier`),
    INDEX `idx_att_time` (`attempt_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Password Resets Table (Expiring Single-Use Tokens)
CREATE TABLE IF NOT EXISTS `password_resets` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `token_hash` VARCHAR(64) NOT NULL UNIQUE,
    `expires_at` DATETIME NOT NULL,
    `used` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_reset_token` (`token_hash`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Rate Limiting Table
CREATE TABLE IF NOT EXISTS `rate_limits` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `rate_key` VARCHAR(100) NOT NULL UNIQUE,
    `hits` INT NOT NULL DEFAULT 1,
    `window_start` INT NOT NULL,
    INDEX `idx_rate_key` (`rate_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Administrative & System Audit Trail (No Sensitive Secrets Logged)
CREATE TABLE IF NOT EXISTS `audit_logs` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Security Events & Anti-Fraud Center
CREATE TABLE IF NOT EXISTS `security_events` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `event_type` VARCHAR(50) NOT NULL,
    `severity` ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL DEFAULT 'Medium',
    `user_id` INT NULL,
    `ip_address` VARCHAR(45) NOT NULL,
    `details` TEXT NOT NULL,
    `status` ENUM('New', 'Investigating', 'Resolved', 'False Alarm') NOT NULL DEFAULT 'New',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_sec_event` (`event_type`),
    INDEX `idx_sec_severity` (`severity`),
    INDEX `idx_sec_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Deposits & Withdrawals (Kept for Compliance Records & Hold Status)
CREATE TABLE IF NOT EXISTS `deposits` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `transaction_id` VARCHAR(100) NOT NULL UNIQUE,
    `status` ENUM('Pending', 'Completed', 'Rejected') NOT NULL DEFAULT 'Pending',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `withdrawals` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `upi_id` VARCHAR(255) NOT NULL,
    `status` ENUM('Pending', 'Completed', 'Rejected') NOT NULL DEFAULT 'Pending',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Application Settings Table
CREATE TABLE IF NOT EXISTS `settings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `setting_key` VARCHAR(50) NOT NULL UNIQUE,
    `setting_value` TEXT NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
