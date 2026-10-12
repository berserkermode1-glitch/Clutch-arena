<?php
/**
 * Clutch Arena - Admin Settings & Platform Configuration
 * Hardened with safe MIME file uploads, CSRF protection, and audit logs.
 */
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/common/header.php';

check_admin_auth();

$success_msg = '';
$error_msg = '';

// Handle Form Submissions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $submitted_token = $_POST['csrf_token'] ?? '';

    if (!verify_csrf_token($submitted_token)) {
        $error_msg = "Security session expired. Please refresh the page.";
    } else {
        $action = $_POST['action'] ?? '';

        // Action 1: Update Platform Settings
        if ($action === 'update_upi_settings') {
            $admin_upi_id = clean_input($_POST['admin_upi_id'] ?? '');

            if (empty($admin_upi_id)) {
                $error_msg = "Admin UPI ID cannot be empty.";
            } else {
                try {
                    $stmt = $pdo->prepare("
                        INSERT INTO settings (setting_key, setting_value) 
                        VALUES ('admin_upi_id', ?) 
                        ON DUPLICATE KEY UPDATE setting_value = ?
                    ");
                    $stmt->execute([$admin_upi_id, $admin_upi_id]);

                    // Safe File Upload Validation (MIME + Extension + Random Name)
                    if (isset($_FILES['qr_code_image']) && $_FILES['qr_code_image']['error'] === UPLOAD_ERR_OK) {
                        $file = $_FILES['qr_code_image'];

                        if ($file['size'] > MAX_UPLOAD_SIZE) {
                            $error_msg = "QR code image exceeds 2MB limit.";
                        } else {
                            $finfo = finfo_open(FILEINFO_MIME_TYPE);
                            $mime = finfo_file($finfo, $file['tmp_name']);
                            finfo_close($finfo);

                            $allowed_mimes = ['image/jpeg', 'image/png', 'image/webp'];
                            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
                            $allowed_exts = ['jpg', 'jpeg', 'png', 'webp'];

                            if (!in_array($mime, $allowed_mimes, true) || !in_array($ext, $allowed_exts, true)) {
                                $error_msg = "Invalid file type. Only JPG, PNG, or WebP allowed.";
                            } else {
                                $uploadDir = __DIR__ . '/../uploads/qr_codes/';
                                if (!is_dir($uploadDir)) {
                                    mkdir($uploadDir, 0755, true);
                                }

                                $safeName = 'qr_' . bin2hex(random_bytes(12)) . '.' . $ext;
                                $destination = $uploadDir . $safeName;
                                $relativePath = 'uploads/qr_codes/' . $safeName;

                                if (move_uploaded_file($file['tmp_name'], $destination)) {
                                    $qrStmt = $pdo->prepare("
                                        INSERT INTO settings (setting_key, setting_value) 
                                        VALUES ('admin_qr_code', ?) 
                                        ON DUPLICATE KEY UPDATE setting_value = ?
                                    ");
                                    $qrStmt->execute([$relativePath, $relativePath]);
                                } else {
                                    $error_msg = "Failed to store uploaded QR code.";
                                }
                            }
                        }
                    }

                    if (empty($error_msg)) {
                        log_audit_action($pdo, 'admin', $_SESSION['admin_id'], 'settings_updated', 'settings', 0, "UPI ID updated to $admin_upi_id");
                        $success_msg = "Platform settings saved securely!";
                    }
                } catch (Exception $e) {
                    $error_msg = "Settings error: " . $e->getMessage();
                }
            }
        }

        // Action 2: Change Admin Password
        elseif ($action === 'change_admin_password') {
            $current_pwd = $_POST['current_password'] ?? '';
            $new_pwd = $_POST['new_password'] ?? '';
            $confirm_pwd = $_POST['confirm_password'] ?? '';

            if (empty($current_pwd) || empty($new_pwd)) {
                $error_msg = "Please fill in all password fields.";
            } elseif (strlen($new_pwd) < 8) {
                $error_msg = "New password must be at least 8 characters.";
            } elseif ($new_pwd !== $confirm_pwd) {
                $error_msg = "Passwords do not match.";
            } else {
                try {
                    $aStmt = $pdo->prepare("SELECT password FROM admin WHERE id = ?");
                    $aStmt->execute([$_SESSION['admin_id']]);
                    $adm = $aStmt->fetch();

                    if (!$adm || !password_verify($current_pwd, $adm['password'])) {
                        $error_msg = "Current admin password is incorrect.";
                    } else {
                        $hashed = password_hash($new_pwd, PASSWORD_DEFAULT);
                        $upAdmin = $pdo->prepare("UPDATE admin SET password = ? WHERE id = ?");
                        $upAdmin->execute([$hashed, $_SESSION['admin_id']]);

                        log_audit_action($pdo, 'admin', $_SESSION['admin_id'], 'admin_password_changed', 'admin', $_SESSION['admin_id'], 'Admin credentials rotated');

                        $success_msg = "Admin password updated successfully!";
                    }
                } catch (Exception $e) {
                    $error_msg = "Password update failed: " . $e->getMessage();
                }
            }
        }
    }
}

// Fetch Current Settings
$current_upi_id = get_setting($pdo, 'admin_upi_id', 'esports@okhdfcbank');
$current_qr_code = get_setting($pdo, 'admin_qr_code', 'uploads/qr_codes/default_qr.png');

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
        <i class="fa-solid fa-gear text-indigo-400"></i> System Configuration
    </h1>
    <p class="text-xs text-slate-400">Manage payment gateway placeholders, upload verification, and admin security</p>
</div>

<!-- SECTION 1: ADMIN UPI & QR CODE SETTINGS -->
<div class="bg-[#111827] border border-slate-800 rounded-2xl p-4 mb-4 shadow-lg space-y-4">
    <h2 class="text-xs font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
        <i class="fa-solid fa-qrcode text-emerald-400"></i> Platform UPI Gateway Configuration
    </h2>

    <form method="POST" action="settings.php" enctype="multipart/form-data" class="space-y-3">
        <input type="hidden" name="action" value="update_upi_settings">
        <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">

        <div>
            <label class="block text-[11px] font-medium text-slate-300 mb-1">Admin UPI ID</label>
            <input type="text" name="admin_upi_id" value="<?php echo htmlspecialchars($current_upi_id); ?>" required class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono">
        </div>

        <div>
            <label class="block text-[11px] font-medium text-slate-300 mb-1">Upload Admin QR Code Image (Max 2MB, JPG/PNG)</label>
            <input type="file" name="qr_code_image" accept="image/jpeg,image/png,image/webp" class="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:bg-slate-800 file:text-slate-200">
        </div>

        <button type="submit" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-xl text-xs border border-slate-700 transition">
            Save Gateway Settings
        </button>
    </form>
</div>

<!-- SECTION 2: ADMIN CREDENTIALS ROTATION -->
<div class="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
    <h2 class="text-xs font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
        <i class="fa-solid fa-lock text-indigo-400"></i> Rotate Admin Password
    </h2>

    <form method="POST" action="settings.php" class="space-y-3">
        <input type="hidden" name="action" value="change_admin_password">
        <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrf_token); ?>">

        <div>
            <label class="block text-[11px] font-medium text-slate-300 mb-1">Current Password</label>
            <input type="password" name="current_password" required placeholder="••••••••" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono">
        </div>

        <div>
            <label class="block text-[11px] font-medium text-slate-300 mb-1">New Password (Min 8 characters)</label>
            <input type="password" name="new_password" required minlength="8" placeholder="••••••••" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono">
        </div>

        <div>
            <label class="block text-[11px] font-medium text-slate-300 mb-1">Confirm New Password</label>
            <input type="password" name="confirm_password" required minlength="8" placeholder="••••••••" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono">
        </div>

        <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition">
            Update Admin Password
        </button>
    </form>
</div>

<?php require_once __DIR__ . '/common/bottom.php'; ?>
