<?php
// api/import.php
require_once 'db.php';

header('Content-Type: application/json');
$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    die(json_encode(['status' => 'error', 'message' => 'Only POST requests are allowed']));
}

try {
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        die(json_encode(['status' => 'error', 'message' => 'File upload failed or no file provided']));
    }

    $file = $_FILES['file']['tmp_name'];
    $handle = fopen($file, "r");
    
    // Check for and skip UTF-8 BOM
    $bom = fread($handle, 3);
    if ($bom != "\xEF\xBB\xBF") {
        rewind($handle);
    }

    $headers = fgetcsv($handle);
    if (!$headers) {
        die(json_encode(['status' => 'error', 'message' => 'Empty or invalid CSV file']));
    }

    $count = 0;
    $conn->beginTransaction();

    if ($action === 'items') {
        while (($row = fgetcsv($handle)) !== FALSE) {
            if (count($row) < count($headers)) continue;
            $data = array_combine($headers, $row);
            
            $brandName = trim($data['Item_Name'] ?? $data['Item'] ?? ''); // Compatibility for different headers
            $actualName = trim($data['Item_Name'] ?? '');
            $brand = trim($data['Brand'] ?? '');
            $size = trim($data['Size'] ?? '');
            $weight = floatval($data['Weight_kg'] ?? $data['Weight'] ?? 0);
            $stock = intval($data['Current_Stock'] ?? $data['Stock'] ?? 0);

            if (empty($actualName) || empty($brand)) continue;

            // Resolve Brand
            $stmt = $conn->prepare("SELECT id FROM main_categories WHERE name = ?");
            $stmt->execute([$brand]);
            $mainId = $stmt->fetchColumn();
            if (!$mainId) {
                $ins = $conn->prepare("INSERT INTO main_categories (name, color) VALUES (?, '#2196f3')");
                $ins->execute([$brand]);
                $mainId = $conn->lastInsertId();
            }

            // Resolve Size
            $stmt = $conn->prepare("SELECT id FROM sub_categories WHERE name = ? AND main_id = ?");
            $stmt->execute([$size, $mainId]);
            $subId = $stmt->fetchColumn();
            if (!$subId) {
                $ins = $conn->prepare("INSERT INTO sub_categories (name, main_id) VALUES (?, ?)");
                $ins->execute([$size, $mainId]);
                $subId = $conn->lastInsertId();
            }

            // Check if item exists (Match by Name, Brand and Size)
            $stmt = $conn->prepare("SELECT id FROM items WHERE main_id = ? AND sub_id = ? AND name = ?");
            $stmt->execute([$mainId, $subId, $actualName]);
            $itemId = $stmt->fetchColumn();

            if ($itemId) {
                $stmt = $conn->prepare("UPDATE items SET weight = ?, stock = ? WHERE id = ?");
                $stmt->execute([$weight, $stock, $itemId]);
            } else {
                $stmt = $conn->prepare("INSERT INTO items (main_id, sub_id, name, weight, stock) VALUES (?, ?, ?, ?, ?)");
                $stmt->execute([$mainId, $subId, $actualName, $weight, $stock]);
            }
            $count++;
        }
    } elseif ($action === 'customers') {
        while (($row = fgetcsv($handle)) !== FALSE) {
            if (count($row) < count($headers)) continue;
            $data = array_combine($headers, $row);
            
            $name = trim($data['name'] ?? '');
            $mobile = trim($data['mobile'] ?? '');
            $address = trim($data['address'] ?? '');
            $uniqueId = trim($data['unique_id'] ?? '');

            if (empty($name)) continue;

            $stmt = $conn->prepare("INSERT INTO customers (name, mobile, address, unique_id) VALUES (?, ?, ?, ?) 
                                   ON DUPLICATE KEY UPDATE name=VALUES(name), mobile=VALUES(mobile), address=VALUES(address)");
            $stmt->execute([$name, $mobile, $address, $uniqueId]);
            $count++;
        }
    }

    $conn->commit();
    fclose($handle);
    echo json_encode(['status' => 'success', 'message' => "Successfully imported $count records"]);

} catch (Exception $e) {
    if (isset($conn)) $conn->rollBack();
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
