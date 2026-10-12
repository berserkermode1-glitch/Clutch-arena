<?php
/**
 * Clutch Arena - Database Installation Script
 * Creates the database, tables, and inserts initial default admin credentials.
 */

// Basic connection parameters without specifying database yet
$host = '127.0.0.1';
$user = 'root';
$pass = 'root';
$dbname = 'clutch_arena';
$port = '3306';

$message = '';
$error = '';
$installed = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST' || isset($_GET['auto'])) {
    try {
        // Step 1: Connect to MySQL server
        $pdo = new PDO("mysql:host=$host;port=$port", $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ]);

        // Step 2: Create database
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbname` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $pdo->exec("USE `$dbname`");

        // Step 3: Create 'users' table
        $pdo->exec("CREATE TABLE IF NOT EXISTS `users` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `username` VARCHAR(50) NOT NULL UNIQUE,
            `email` VARCHAR(100) NOT NULL UNIQUE,
            `password` VARCHAR(255) NOT NULL,
            `wallet_balance` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            `upi_id` VARCHAR(255) NULL,
            `is_blocked` TINYINT(1) NOT NULL DEFAULT 0,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        // Step 4: Create 'admin' table
        $pdo->exec("CREATE TABLE IF NOT EXISTS `admin` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `username` VARCHAR(50) NOT NULL UNIQUE,
            `password` VARCHAR(255) NOT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        // Step 5: Create 'tournaments' table
        $pdo->exec("CREATE TABLE IF NOT EXISTS `tournaments` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `title` VARCHAR(100) NOT NULL,
            `game_name` VARCHAR(50) NOT NULL,
            `entry_fee` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            `prize_pool` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            `commission_percent` DECIMAL(5, 2) NOT NULL DEFAULT 20.00,
            `match_time` DATETIME NOT NULL,
            `room_id` VARCHAR(100) NULL DEFAULT '',
            `room_password` VARCHAR(100) NULL DEFAULT '',
            `winner_id` INT NULL,
            `status` ENUM('Upcoming', 'Live', 'Completed') NOT NULL DEFAULT 'Upcoming',
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        // Step 6: Create 'participants' table
        $pdo->exec("CREATE TABLE IF NOT EXISTS `participants` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `user_id` INT NOT NULL,
            `tournament_id` INT NOT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY `unique_participant` (`user_id`, `tournament_id`),
            FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
            FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        // Step 7: Create 'transactions' table
        $pdo->exec("CREATE TABLE IF NOT EXISTS `transactions` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `user_id` INT NOT NULL,
            `amount` DECIMAL(10, 2) NOT NULL,
            `type` ENUM('credit', 'debit') NOT NULL,
            `description` VARCHAR(255) NOT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        // Step 8: Create 'deposits' table (UPI Add Money)
        $pdo->exec("CREATE TABLE IF NOT EXISTS `deposits` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `user_id` INT NOT NULL,
            `amount` DECIMAL(10, 2) NOT NULL,
            `transaction_id` VARCHAR(100) NOT NULL,
            `status` ENUM('Pending', 'Completed', 'Rejected') NOT NULL DEFAULT 'Pending',
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        // Step 9: Create 'withdrawals' table (UPI Withdraw)
        $pdo->exec("CREATE TABLE IF NOT EXISTS `withdrawals` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `user_id` INT NOT NULL,
            `amount` DECIMAL(10, 2) NOT NULL,
            `upi_id` VARCHAR(255) NOT NULL,
            `status` ENUM('Pending', 'Completed', 'Rejected') NOT NULL DEFAULT 'Pending',
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        // Step 10: Create 'settings' table (Admin UPI ID & QR Code)
        $pdo->exec("CREATE TABLE IF NOT EXISTS `settings` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `setting_key` VARCHAR(50) NOT NULL UNIQUE,
            `setting_value` TEXT NULL,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        // Step 11: Insert default admin credentials (admin / admin123)
        $adminCheck = $pdo->query("SELECT COUNT(*) FROM `admin` WHERE `username` = 'admin'")->fetchColumn();
        if ($adminCheck == 0) {
            $hashedPassword = password_hash('admin123', PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("INSERT INTO `admin` (`username`, `password`) VALUES ('admin', ?)");
            $stmt->execute([$hashedPassword]);
        }

        // Step 12: Insert default settings
        $settingsDefaults = [
            'admin_upi_id' => 'esports@okhdfcbank',
            'admin_qr_code' => 'uploads/qr_codes/default_qr.png',
            'app_name' => 'Clutch Arena'
        ];
        foreach ($settingsDefaults as $key => $val) {
            $stmt = $pdo->prepare("INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`) VALUES (?, ?)");
            $stmt->execute([$key, $val]);
        }

        // Create upload directory if it does not exist
        if (!is_dir(__DIR__ . '/uploads/qr_codes/')) {
            mkdir(__DIR__ . '/uploads/qr_codes/', 0777, true);
        }

        $installed = true;
        $message = "Database & all tables created successfully! Default admin created (admin / admin123).";

        // Auto-redirect to login.php if requested
        if (isset($_POST['redirect']) || isset($_GET['auto'])) {
            header("Location: login.php?installed=1");
            exit;
        }

    } catch (PDOException $e) {
        $error = "Installation Error: " . $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Install Clutch Arena</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        body { background-color: #0b0f19; font-family: system-ui, -apple-system, sans-serif; }
    </style>
</head>
<body class="text-slate-100 flex items-center justify-center min-h-screen p-4 select-none">
    <div class="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div class="text-center mb-6">
            <div class="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-3">
                <i class="fa-solid fa-gamepad text-2xl text-slate-950"></i>
            </div>
            <h1 class="text-2xl font-bold text-white tracking-wide">Clutch Arena</h1>
            <p class="text-xs text-slate-400 mt-1">Esports Tournament Platform Installer</p>
        </div>

        <?php if (!empty($message)): ?>
            <div class="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 p-4 rounded-xl mb-6 text-sm flex items-start gap-3">
                <i class="fa-solid fa-circle-check text-emerald-400 mt-0.5"></i>
                <div>
                    <p class="font-semibold text-emerald-200">Installation Completed!</p>
                    <p class="text-xs text-emerald-300/80 mt-1"><?php echo htmlspecialchars($message); ?></p>
                </div>
            </div>
            <a href="login.php" class="block w-full text-center bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-500/25 transition">
                Proceed to User Login <i class="fa-solid fa-arrow-right ml-1"></i>
            </a>
            <a href="admin/login.php" class="block w-full text-center bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 px-4 rounded-xl mt-3 transition text-sm">
                Open Admin Panel (admin / admin123)
            </a>
        <?php else: ?>
            <?php if (!empty($error)): ?>
                <div class="bg-rose-950/80 border border-rose-500/50 text-rose-300 p-4 rounded-xl mb-6 text-sm flex items-start gap-3">
                    <i class="fa-solid fa-triangle-exclamation text-rose-400 mt-0.5"></i>
                    <div>
                        <p class="font-semibold text-rose-200">Connection Failed</p>
                        <p class="text-xs text-rose-300/80 mt-1"><?php echo htmlspecialchars($error); ?></p>
                        <p class="text-[11px] text-slate-400 mt-2">Ensure MySQL is running on 127.0.0.1:3306 with user 'root' and pass 'root' (configured in config.php).</p>
                    </div>
                </div>
            <?php endif; ?>

            <div class="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 mb-6 text-xs text-slate-300 space-y-2">
                <div class="flex justify-between py-1 border-b border-slate-700/50">
                    <span class="text-slate-400">Database Host</span>
                    <span class="font-mono text-emerald-400"><?php echo $host . ':' . $port; ?></span>
                </div>
                <div class="flex justify-between py-1 border-b border-slate-700/50">
                    <span class="text-slate-400">Target Database</span>
                    <span class="font-mono text-cyan-400"><?php echo $dbname; ?></span>
                </div>
                <div class="flex justify-between py-1 border-b border-slate-700/50">
                    <span class="text-slate-400">Default Admin</span>
                    <span class="font-mono text-amber-400">admin / admin123</span>
                </div>
                <div class="flex justify-between py-1">
                    <span class="text-slate-400">Currency</span>
                    <span class="font-mono text-emerald-400">₹ (INR)</span>
                </div>
            </div>

            <form method="POST" action="install.php">
                <input type="hidden" name="redirect" value="1">
                <button type="submit" class="w-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-500/25 transition">
                    <i class="fa-solid fa-bolt mr-2"></i> Run Automated Installation
                </button>
            </form>
        <?php endif; ?>
    </div>
</body>
</html>
