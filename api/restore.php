<?php
// api/restore.php
require_once 'db.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    die(json_encode(['status' => 'error', 'message' => 'Only POST requests are allowed']));
}

try {
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        die(json_encode(['status' => 'error', 'message' => 'File upload failed or no file provided']));
    }

    $sql = file_get_contents($_FILES['file']['tmp_name']);
    if (empty($sql)) {
        die(json_encode(['status' => 'error', 'message' => 'The uploaded file is empty']));
    }

    $conn->beginTransaction();
    
    // Disable foreign key checks to allow dropping/recreating tables
    $conn->exec("SET FOREIGN_KEY_CHECKS=0;");

    // Split SQL into individual statements
    // We use a regex to split by semicolon at the end of a line to avoid splitting inside strings
    $queries = preg_split("/;[\r\n]+/", $sql);

    $successCount = 0;
    foreach ($queries as $query) {
        $query = trim($query);
        if (!empty($query)) {
            $conn->exec($query);
            $successCount++;
        }
    }

    $conn->exec("SET FOREIGN_KEY_CHECKS=1;");
    $conn->commit();

    echo json_encode(['status' => 'success', 'message' => "Database restored successfully! Processed $successCount statements."]);

} catch (Exception $e) {
    if (isset($conn)) $conn->rollBack();
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
exit;
?>
