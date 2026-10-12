<?php
/**
 * Clutch Arena - Safe User Logout
 * Clears session variables, invalidates session cookie, and regenerates ID.
 */
require_once __DIR__ . '/config.php';

if (isset($_SESSION['user_id'])) {
    log_audit_action($pdo, 'user', $_SESSION['user_id'], 'user_logout', 'user', $_SESSION['user_id'], 'User signed out safely');
}

// Unset all session variables
$_SESSION = [];

// Delete the session cookie if present
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

// Destroy session
session_destroy();

header("Location: login.php?msg=logged_out");
exit;
?>
