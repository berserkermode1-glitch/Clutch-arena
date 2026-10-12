<?php
/**
 * Clutch Arena - Centralized Database & Security Configuration
 * PHP 8.2 + MySQL / MariaDB
 * Hardened for Esports Tournament Security, Rate Limiting & Player Protection
 */

// Strict error reporting in development, safe handling in production
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// Mandatory Indian Timezone for Esports Matches & Daily Rewards (Asia/Kolkata)
date_default_timezone_set('Asia/Kolkata');

// Security Response Headers
function send_security_headers() {
    if (!headers_sent()) {
        header("X-Content-Type-Options: nosniff");
        header("X-Frame-Options: SAMEORIGIN");
        header("X-XSS-Protection: 1; mode=block");
        header("Referrer-Policy: strict-origin-when-cross-origin");
        header("Permissions-Policy: geolocation=(), camera=(), microphone=()");
        // CSP tailored for Clutch Arena with Tailwind CDN and FontAwesome
        header("Content-Security-Policy: default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval'; img-src 'self' data: https: blob:; font-src 'self' https: data:;");
    }
}
send_security_headers();

// Database credentials (with environment variable overrides)
define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: 'root');
define('DB_NAME', getenv('DB_NAME') ?: 'clutch_arena');
define('DB_PORT', getenv('DB_PORT') ?: '3306');

// Application settings
define('APP_NAME', 'Clutch Arena');
define('APP_VERSION', 'v2.4.0-esports-secured');
define('APP_CURRENCY', '₹');
define('UPLOAD_DIR', __DIR__ . '/uploads/');
define('MAX_UPLOAD_SIZE', 2 * 1024 * 1024); // 2 MB

// Secure Session Cookie Configuration
if (session_status() === PHP_SESSION_NONE) {
    $is_https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);
    session_set_cookie_params([
        'lifetime' => 86400 * 7, // 7 days
        'path' => '/',
        'domain' => '',
        'secure' => $is_https,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

// Client IP resolver with proxy awareness
function get_client_ip() {
    $headers = ['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR'];
    foreach ($headers as $header) {
        if (!empty($_SERVER[$header])) {
            $ip_list = explode(',', $_SERVER[$header]);
            $ip = trim($ip_list[0]);
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }
    }
    return '127.0.0.1';
}

// CSRF Protection Helpers
function generate_csrf_token() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verify_csrf_token($token) {
    if (empty($_SESSION['csrf_token']) || empty($token)) {
        return false;
    }
    return hash_equals($_SESSION['csrf_token'], $token);
}

// Input Sanitation
function clean_input($data) {
    if (is_array($data)) {
        return array_map('clean_input', $data);
    }
    return htmlspecialchars(trim((string)$data), ENT_QUOTES, 'UTF-8');
}

// Theme Handling
if (isset($_GET['set_theme'])) {
    $allowed_themes = ['emerald', 'crimson', 'cyberpunk', 'cyan', 'amber'];
    $new_theme = clean_input($_GET['set_theme']);
    if (in_array($new_theme, $allowed_themes, true)) {
        $_SESSION['app_theme'] = $new_theme;
        setcookie('app_theme', $new_theme, [
            'expires' => time() + (86400 * 30),
            'path' => '/',
            'httponly' => false,
            'samesite' => 'Lax',
            'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        ]);
        $redirect_to = strtok($_SERVER["REQUEST_URI"], '?');
        header("Location: " . $redirect_to);
        exit;
    }
}

function get_active_theme() {
    $theme = $_SESSION['app_theme'] ?? $_COOKIE['app_theme'] ?? 'emerald';
    $valid = ['emerald', 'crimson', 'cyberpunk', 'cyan', 'amber'];
    return in_array($theme, $valid, true) ? $theme : 'emerald';
}

// Establish PDO connection with error handling
$pdo = null;
$db_error = null;

try {
    $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
} catch (PDOException $e) {
    $db_error = "Database offline or connecting: " . $e->getMessage();
}

// Rate Limiting Helper (Token bucket / window based)
function check_rate_limit($pdo, $action_key, $max_hits = 10, $window_seconds = 60) {
    if (!$pdo) return true; // Fail open gracefully if DB not connected
    $ip = get_client_ip();
    $key = hash('sha256', $ip . ':' . $action_key);
    $now = time();

    try {
        $stmt = $pdo->prepare("SELECT hits, window_start FROM rate_limits WHERE rate_key = ?");
        $stmt->execute([$key]);
        $row = $stmt->fetch();

        if ($row) {
            if ($now - $row['window_start'] > $window_seconds) {
                // Window expired: Reset
                $up = $pdo->prepare("UPDATE rate_limits SET hits = 1, window_start = ? WHERE rate_key = ?");
                $up->execute([$now, $key]);
                return true;
            } elseif ($row['hits'] >= $max_hits) {
                // Limit exceeded
                return false;
            } else {
                // Increment hits
                $up = $pdo->prepare("UPDATE rate_limits SET hits = hits + 1 WHERE rate_key = ?");
                $up->execute([$key]);
                return true;
            }
        } else {
            // New entry
            $ins = $pdo->prepare("INSERT INTO rate_limits (rate_key, hits, window_start) VALUES (?, 1, ?)");
            $ins->execute([$key, $now]);
            return true;
        }
    } catch (Exception $e) {
        return true;
    }
}

// Login Attempt Throttling
function record_login_attempt($pdo, $identifier, $success) {
    if (!$pdo) return;
    $ip = get_client_ip();
    try {
        $stmt = $pdo->prepare("INSERT INTO login_attempts (identifier, ip_address, success, attempt_time) VALUES (?, ?, ?, NOW())");
        $stmt->execute([$identifier, $ip, $success ? 1 : 0]);
    } catch (Exception $e) {}
}

function is_login_locked($pdo, $identifier) {
    if (!$pdo) return false;
    $ip = get_client_ip();
    try {
        // Count failed attempts in the last 15 minutes
        $stmt = $pdo->prepare("
            SELECT COUNT(*) FROM login_attempts 
            WHERE (identifier = ? OR ip_address = ?) 
              AND success = 0 
              AND attempt_time > DATE_SUB(NOW(), INTERVAL 15 MINUTE)
        ");
        $stmt->execute([$identifier, $ip]);
        $failures = (int)$stmt->fetchColumn();
        return $failures >= 5;
    } catch (Exception $e) {
        return false;
    }
}

// Audit Logging (Privacy Conscious: NEVER log passwords, session tokens, or payment details)
function log_audit_action($pdo, $actor_type, $actor_id, $action, $target_type, $target_id, $details = '') {
    if (!$pdo) return;
    $ip = get_client_ip();
    try {
        $stmt = $pdo->prepare("
            INSERT INTO audit_logs (actor_type, actor_id, action, target_type, target_id, details, ip_address, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$actor_type, $actor_id, $action, $target_type, $target_id, $details, $ip]);
    } catch (Exception $e) {}
}

// Security Event Logging
function log_security_event($pdo, $event_type, $severity, $user_id, $details) {
    if (!$pdo) return;
    $ip = get_client_ip();
    try {
        $stmt = $pdo->prepare("
            INSERT INTO security_events (event_type, severity, user_id, ip_address, details, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'New', NOW())
        ");
        $stmt->execute([$event_type, $severity, $user_id, $ip, $details]);
    } catch (Exception $e) {}
}

// Authentication & Role Check Helpers
function check_user_auth() {
    if (!isset($_SESSION['user_id'])) {
        header("Location: login.php?msg=auth_required");
        exit;
    }
}

function check_admin_auth() {
    if (!isset($_SESSION['admin_id'])) {
        header("Location: login.php?msg=admin_auth_required");
        exit;
    }
}

// Application settings accessor
function get_setting($pdo, $key, $default = '') {
    if (!$pdo) return $default;
    try {
        $stmt = $pdo->prepare("SELECT setting_value FROM settings WHERE setting_key = ?");
        $stmt->execute([$key]);
        $row = $stmt->fetch();
        return $row ? $row['setting_value'] : $default;
    } catch (Exception $e) {
        return $default;
    }
}

// Wallet helper
function get_wallet_balance($pdo, $user_id) {
    if (!$pdo) return 0.00;
    try {
        $stmt = $pdo->prepare("SELECT wallet_balance FROM users WHERE id = ?");
        $stmt->execute([$user_id]);
        $res = $stmt->fetch();
        return $res ? floatval($res['wallet_balance']) : 0.00;
    } catch (Exception $e) {
        return 0.00;
    }
}
?>
