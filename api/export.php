<?php
// api/export.php
require_once 'db.php';

$action = $_GET['action'] ?? '';

try {
    if ($action === 'items') {
        $sql = "SELECT i.name as Item_Name, mc.name as Brand, sc.name as Size, i.weight as Weight_kg, i.stock as Current_Stock 
                FROM items i 
                LEFT JOIN main_categories mc ON i.main_id = mc.id 
                LEFT JOIN sub_categories sc ON i.sub_id = sc.id";
        $stmt = $conn->query($sql);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $filename = "stockflow_items_" . date('Y-m-d') . ".csv";
    } elseif ($action === 'customers') {
        $stmt = $conn->query("SELECT name, mobile, address, unique_id FROM customers");
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $filename = "stockflow_customers_" . date('Y-m-d') . ".csv";
    } else {
        exit('Invalid action');
    }

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');

    $output = fopen('php://output', 'w');
    // Add UTF-8 BOM for Excel compatibility
    fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
    
    if (!empty($data)) {
        fputcsv($output, array_keys($data[0])); // Headers
        foreach ($data as $row) {
            fputcsv($output, $row);
        }
    }
    fclose($output);
    exit;

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
