<?php
// api/demo_data.php
ob_start();
require_once 'db.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$code = $data['code'] ?? '';

if ($code !== 'SOFTIFYX-DEMO') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid authorization code.']);
    exit;
}

try {
    // Disable foreign key checks for truncation
    $conn->exec("SET FOREIGN_KEY_CHECKS = 0");

    // 1. Truncate Tables
    $tables = [
        'main_categories', 'sub_categories', 'items', 'customers',
        'transactions', 'orders', 'order_items', 'raw_materials',
        'rm_formulas', 'rm_formula_items', 'rm_transactions', 
        'customer_main_categories', 'customer_sub_categories',
        'rm_brand_consumption_logs'
    ];
    foreach ($tables as $table) {
        $conn->exec("TRUNCATE TABLE `$table`");
    }

    // 2. Settings (Update Company Profile)
    $conn->exec("INSERT INTO `settings` (`category`, `key`, `value`) VALUES ('company', 'name', 'Softifyx') ON DUPLICATE KEY UPDATE `value`='Softifyx'");
    $conn->exec("INSERT INTO `settings` (`category`, `key`, `value`) VALUES ('company', 'logo', 'Softifyx') ON DUPLICATE KEY UPDATE `value`='Softifyx'");

    // 3. Insert Finished Goods Brands & Sizes
    $conn->exec("INSERT INTO `main_categories` (`id`, `name`, `color`, `low_stock_limit`) VALUES 
        (1, 'Master', '#3b82f6', 50),
        (2, 'Popular', '#ef4444', 50),
        (3, 'GM', '#10b981', 50)
    ");
    $conn->exec("INSERT INTO `sub_categories` (`id`, `main_id`, `name`) VALUES 
        (1, 1, '1/2\"'), (2, 1, '3/4\"'), (3, 1, '1\"'),
        (4, 2, '1/2\"'), (5, 2, '3/4\"'),
        (6, 3, '1\"'), (7, 3, '2\"')
    ");

    // 4. Insert Items (Pipes)
    $conn->exec("INSERT INTO `items` (`id`, `main_id`, `sub_id`, `name`, `length`, `weight`, `stock`, `low_stock_limit`) VALUES 
        (1, 1, 1, 'Master 1/2\" PVC Pipe', 13.00, 0.45, 1200, 100),
        (2, 1, 2, 'Master 3/4\" PVC Pipe', 13.00, 0.75, 850, 100),
        (3, 1, 3, 'Master 1\" PVC Pipe', 13.00, 1.10, 500, 50),
        (4, 2, 4, 'Popular 1/2\" UPVC Pipe', 13.00, 0.50, 600, 100),
        (5, 2, 5, 'Popular 3/4\" UPVC Pipe', 13.00, 0.80, 450, 100),
        (6, 3, 6, 'GM 1\" PPRC Pipe', 13.00, 1.25, 300, 50),
        (7, 3, 7, 'GM 2\" PPRC Pipe', 13.00, 3.50, 120, 20)
    ");

    // 5. Insert Customers & Locations
    $conn->exec("INSERT INTO `customer_main_categories` (`id`, `name`) VALUES (1, 'North Zone'), (2, 'South Zone')");
    $conn->exec("INSERT INTO `customer_sub_categories` (`id`, `main_id`, `name`) VALUES (1, 1, 'City Center'), (2, 2, 'Industrial Area')");
    $conn->exec("INSERT INTO `customers` (`id`, `unique_id`, `name`, `mobile`, `address`, `main_id`, `sub_id`) VALUES 
        (1, 'CUST-001', 'Ali Hardware', '03001234567', 'Main Market', 1, 1),
        (2, 'CUST-002', 'Bismillah Traders', '03339876543', 'Plot 4, Industrial Est', 2, 2),
        (3, 'CUST-003', 'Zaman Sanitaries', '03451122334', 'Ring Road', 1, 1)
    ");

    // 6. Insert Raw Materials
    $conn->exec("INSERT INTO `raw_materials` (`id`, `name`, `category`, `unit`, `stock`, `threshold`, `base_price`) VALUES 
        (1, 'PVC Resin (K-67)', 'Chemical', 'KG', 5000, 500, 280),
        (2, 'Calcium Carbonate', 'Filler', 'KG', 8000, 1000, 45),
        (3, 'Titanium Dioxide', 'Colorant', 'KG', 200, 50, 850),
        (4, 'Stabilizer', 'Chemical', 'KG', 450, 100, 620)
    ");

    // 7. Insert RM Formulas
    $conn->exec("INSERT INTO `rm_formulas` (`id`, `name`, `category`, `notes`) VALUES 
        (1, 'Master Standard Mix', 'Pipe Production', 'Standard mix for 13ft Master pipes'),
        (2, 'Popular Heavy Duty', 'Pipe Production', 'High thickness mix')
    ");
    $conn->exec("INSERT INTO `rm_formula_items` (`formula_id`, `rm_item_id`, `quantity`) VALUES 
        (1, 1, 100), (1, 2, 75), (1, 3, 2), (1, 4, 3.5),
        (2, 1, 100), (2, 2, 50), (2, 3, 1.5), (2, 4, 4)
    ");

    // 8. Insert RM Transactions (Stock IN & OUT)
    $today = date('Y-m-d');
    $yesterday = date('Y-m-d', strtotime('-1 day'));
    $conn->exec("INSERT INTO `rm_transactions` (`date`, `type`, `rm_item_id`, `quantity`, `price`, `notes`, `brand_id`) VALUES 
        ('$yesterday 09:00:00', 'IN', 1, 5000, 275, 'Initial Stock', NULL),
        ('$yesterday 09:00:00', 'IN', 2, 8000, 42, 'Initial Stock', NULL),
        ('$yesterday 09:00:00', 'IN', 3, 200, 840, 'Initial Stock', NULL),
        ('$yesterday 09:00:00', 'IN', 4, 450, 610, 'Initial Stock', NULL),
        
        ('$today 10:15:00', 'OUT', 1, 100, 275, '[Formula: Master Standard Mix]', 1),
        ('$today 10:15:00', 'OUT', 2, 75, 42, '[Formula: Master Standard Mix]', 1),
        ('$today 10:15:00', 'OUT', 3, 2, 840, '[Formula: Master Standard Mix]', 1),
        ('$today 10:15:00', 'OUT', 4, 3.5, 610, '[Formula: Master Standard Mix]', 1)
    ");

    // 9. Insert FG Production (Stock IN)
    $conn->exec("INSERT INTO `transactions` (`date`, `type`, `main_id`, `sub_id`, `item_id`, `quantity`, `itemWeight`, `notes`) VALUES 
        ('$today 14:30:00', 'IN', 1, 1, 1, 250, 0.45, 'Batch #1'),
        ('$today 16:00:00', 'IN', 1, 2, 2, 120, 0.75, 'Batch #2')
    ");

    // 10. Insert Orders (Sales)
    $conn->exec("INSERT INTO `orders` (`id`, `date`, `customer_id`, `status`, `total_qty`, `total_kg`) VALUES 
        (1, '$yesterday 11:00:00', 1, 'Completed', 150, 67.5),
        (2, '$today 09:30:00', 2, 'Processing', 200, 150.0)
    ");
    $conn->exec("INSERT INTO `order_items` (`order_id`, `item_id`, `quantity`, `length`, `fulfilled`) VALUES 
        (1, 1, 150, 13.00, 150),
        (2, 2, 200, 13.00, 50)
    ");
    $conn->exec("INSERT INTO `transactions` (`date`, `type`, `main_id`, `sub_id`, `item_id`, `quantity`, `customer_id`, `order_id`, `notes`) VALUES 
        ('$yesterday 11:30:00', 'OUT', 1, 1, 1, 150, 1, 1, 'Delivered')
    ");

    // Enable foreign key checks
    $conn->exec("SET FOREIGN_KEY_CHECKS = 1");

    ob_end_clean();
    echo json_encode(['status' => 'success', 'message' => 'Demo data restored successfully.']);
} catch (PDOException $e) {
    ob_end_clean();
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
}
?>
