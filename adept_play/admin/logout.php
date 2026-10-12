<?php
/**
 * Clutch Arena - Admin Logout
 */
require_once __DIR__ . '/../config.php';

if (isset($_SESSION['admin_id'])) {
    log_audit_action($pdo, 'admin', $_SESSION['admin_id'], 'admin_logout', 'admin', $_SESSION['admin_id'], 'Admin logged out');
}

unset($_SESSION['admin_id']);
unset($_SESSION['admin_username']);
unset($_SESSION['admin_role']);

header("Location: login.php");
exit;
?>
