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

    $errors = [];

    // 1. Truncate Tables
    $tables = [
        'main_categories', 'sub_categories', 'items', 'customers',
        'transactions', 'orders', 'order_items', 'audit_records',
        'audit_reports_archive', 'raw_materials', 
        'rm_main_categories', 'rm_sub_categories', 'rm_items',
        'rm_units', 'rm_formulas', 'rm_formula_items', 'rm_transactions', 
        'rm_brand_consumption_logs',
        'customer_main_categories', 'customer_sub_categories',
        'store_main_categories', 'store_sub_categories', 'store_items',
        'store_transactions'
    ];
    foreach ($tables as $table) {
        try { $conn->exec("TRUNCATE TABLE `$table`"); } catch (Exception $e) {}
    }

    // Reset Users (Keep admin, add demo users)
    try {
        $conn->exec("DELETE FROM `users` WHERE `username` != 'admin'");
        $conn->exec("UPDATE `users` SET `password` = 'admin123' WHERE `username` = 'admin'");
        $conn->exec("INSERT INTO `users` (`name`, `username`, `password`, `role`) VALUES 
            ('Manager Ali', 'manager1', 'manager123', 'Manager'),
            ('Staff Usman', 'staff1', 'staff123', 'User')
        ");
    } catch (Exception $e) {}

    // 2. Settings (Update Company Profile)
    try {
        $conn->exec("INSERT INTO `settings` (`category`, `key`, `value`) VALUES ('company', 'name', 'Softifyx') ON DUPLICATE KEY UPDATE `value`='Softifyx'");
        $conn->exec("INSERT INTO `settings` (`category`, `key`, `value`) VALUES ('company', 'logo', 'Softifyx') ON DUPLICATE KEY UPDATE `value`='Softifyx'");
    } catch (Exception $e) { $errors[] = "Settings: " . $e->getMessage(); }

    // 3. Insert Finished Goods Brands & Sizes
    try {
        $conn->exec("INSERT INTO `main_categories` (`id`, `name`, `color`, `low_stock_limit`) VALUES 
            (1, 'Master', '#3b82f6', 50), (2, 'Popular', '#ef4444', 50), (3, 'GM', '#10b981', 50)
        ");
        $conn->exec("INSERT INTO `sub_categories` (`id`, `main_id`, `name`) VALUES 
            (1, 1, '1/2\"'), (2, 1, '3/4\"'), (3, 1, '1\"'),
            (4, 2, '1/2\"'), (5, 2, '3/4\"'),
            (6, 3, '1\"'), (7, 3, '2\"')
        ");
    } catch (Exception $e) { $errors[] = "FG Brands: " . $e->getMessage(); }

    // 4. Insert Items (Pipes)
    try {
        $conn->exec("INSERT INTO `items` (`id`, `main_id`, `sub_id`, `name`, `length`, `weight`, `stock`, `low_stock_limit`) VALUES 
            (1, 1, 1, 'Master 1/2\" PVC Pipe', 13.00, 0.45, 1200, 100),
            (2, 1, 2, 'Master 3/4\" PVC Pipe', 13.00, 0.75, 850, 100),
            (3, 1, 3, 'Master 1\" PVC Pipe', 13.00, 1.10, 500, 50),
            (4, 2, 4, 'Popular 1/2\" UPVC Pipe', 13.00, 0.50, 600, 100),
            (5, 2, 5, 'Popular 3/4\" UPVC Pipe', 13.00, 0.80, 450, 100),
            (6, 3, 6, 'GM 1\" PPRC Pipe', 13.00, 1.25, 300, 50),
            (7, 3, 7, 'GM 2\" PPRC Pipe', 13.00, 3.50, 120, 20)
        ");
    } catch (Exception $e) { $errors[] = "Items: " . $e->getMessage(); }

    // 5. Insert Customers & Locations
    try {
        $conn->exec("INSERT INTO `customer_main_categories` (`id`, `name`) VALUES (1, 'North Zone'), (2, 'South Zone')");
        $conn->exec("INSERT INTO `customer_sub_categories` (`id`, `main_id`, `name`) VALUES (1, 1, 'City Center'), (2, 2, 'Industrial Area')");
        $conn->exec("INSERT INTO `customers` (`id`, `unique_id`, `name`, `mobile`, `address`, `main_id`, `sub_id`) VALUES 
            (1, 'CUST-001', 'Ali Hardware', '03001234567', 'Main Market', 1, 1),
            (2, 'CUST-002', 'Bismillah Traders', '03339876543', 'Plot 4, Industrial Est', 2, 2),
            (3, 'CUST-003', 'Zaman Sanitaries', '03451122334', 'Ring Road', 1, 1)
        ");
    } catch (Exception $e) { $errors[] = "Customers: " . $e->getMessage(); }

    // 6. Insert Raw Materials Hierarchy & Items
    try {
        $conn->exec("INSERT INTO `rm_main_categories` (`id`, `name`, `code`) VALUES (1, 'Chemicals', 'CHM'), (2, 'Fillers & Additives', 'FLR')");
        $conn->exec("INSERT INTO `rm_sub_categories` (`id`, `main_id`, `name`, `code`) VALUES (1, 1, 'Resins', 'RSN'), (2, 2, 'Calcium', 'CAL'), (3, 2, 'Colors', 'CLR')");
        $conn->exec("INSERT INTO `rm_items` (`id`, `sub_id`, `name`, `code`, `unit`, `stock`, `threshold`, `base_price`, `kg_per_bag`) VALUES 
            (1, 1, 'PVC Resin (K-67)', 'PVC-K67', 'KG', 5000, 500, 280, 25),
            (2, 2, 'Calcium Carbonate', 'CAL-C', 'KG', 8000, 1000, 45, 25),
            (3, 3, 'Titanium Dioxide', 'TITAN-D', 'KG', 200, 50, 850, 25),
            (4, 1, 'Stabilizer', 'STAB-1', 'KG', 450, 100, 620, 25)
        ");
    } catch (Exception $e) { $errors[] = "RM Items: " . $e->getMessage(); }

    // 7. Insert RM Formulas
    try {
        $conn->exec("INSERT INTO `rm_formulas` (`id`, `name`) VALUES (1, 'Master Standard Mix'), (2, 'Popular Heavy Duty')");
        $conn->exec("INSERT INTO `rm_formula_items` (`formula_id`, `rm_item_id`, `quantity`) VALUES 
            (1, 1, 100), (1, 2, 75), (1, 3, 2), (1, 4, 3.5),
            (2, 1, 100), (2, 2, 50), (2, 3, 1.5), (2, 4, 4)
        ");
    } catch (Exception $e) { $errors[] = "RM Formulas: " . $e->getMessage(); }

    // 8. Insert RM Transactions (Stock IN & OUT)
    $today = date('Y-m-d');
    $yesterday = date('Y-m-d', strtotime('-1 day'));
    try {
        $conn->exec("INSERT INTO `rm_transactions` (`date`, `type`, `rm_item_id`, `quantity`, `notes`) VALUES 
            ('$yesterday 09:00:00', 'IN', 1, 5000, 'Initial Stock'),
            ('$yesterday 09:00:00', 'IN', 2, 8000, 'Initial Stock'),
            ('$yesterday 09:00:00', 'IN', 3, 200, 'Initial Stock'),
            ('$yesterday 09:00:00', 'IN', 4, 450, 'Initial Stock'),
            
            ('$today 10:15:00', 'OUT', 1, 100, '[Formula: Master Standard Mix]'),
            ('$today 10:15:00', 'OUT', 2, 75, '[Formula: Master Standard Mix]'),
            ('$today 10:15:00', 'OUT', 3, 2, '[Formula: Master Standard Mix]'),
            ('$today 10:15:00', 'OUT', 4, 3.5, '[Formula: Master Standard Mix]')
        ");
    } catch (Exception $e) { $errors[] = "RM Trans: " . $e->getMessage(); }

    // 9. Insert FG Production (Stock IN)
    try {
        $conn->exec("INSERT INTO `transactions` (`date`, `type`, `main_id`, `sub_id`, `item_id`, `quantity`, `notes`) VALUES 
            ('$today 14:30:00', 'IN', 1, 1, 1, 250, 'Batch #1'),
            ('$today 16:00:00', 'IN', 1, 2, 2, 120, 'Batch #2')
        ");
    } catch (Exception $e) { $errors[] = "FG Trans: " . $e->getMessage(); }

    // 10. Insert Orders (Sales)
    try {
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
    } catch (Exception $e) { $errors[] = "Orders: " . $e->getMessage(); }

    // 11. Insert Store Module Mock Data
    try {
        // Main Categories (Must include unique 'code')
        $conn->exec("INSERT INTO `store_main_categories` (`id`, `name`, `code`) VALUES 
            (1, 'Main Store (Machine Parts)', 'MS-01'), 
            (2, 'Stationery Store', 'ST-01'),
            (3, 'Nut Bolts & Hardware', 'NB-01')
        ");
        
        // Sub Categories
        $conn->exec("INSERT INTO `store_sub_categories` (`id`, `main_id`, `name`, `code`) VALUES 
            (1, 1, 'PVC Extruder Parts', 'MS-EXT'), 
            (2, 1, 'Mixer Machine Parts', 'MS-MIX'),
            (3, 2, 'Office Supplies', 'ST-OFS'),
            (4, 3, 'Fasteners', 'NB-FST')
        ");
        
        // Store Items
        $conn->exec("INSERT INTO `store_items` (`id`, `sub_id`, `name`, `code`, `opening_stock`, `stock`, `low_stock_threshold`) VALUES 
            (1, 1, 'Heater Band (120mm)', 'HT-120', 10, 8, 2),
            (2, 1, 'Thermocouple Sensor', 'TC-SNSR', 15, 12, 5),
            (3, 2, 'Mixer Blade Set', 'BLD-MIX', 4, 4, 1),
            (4, 2, 'Gear Oil (Liter)', 'OIL-G', 50, 42, 10),
            (5, 3, 'Writing Pads (A4)', 'PAD-A4', 100, 85, 20),
            (6, 3, 'Blue Ballpoints (Box)', 'PEN-BLU', 30, 25, 5),
            (7, 4, 'Nut Bolt 1/2\" x 2\"', 'NB-12-2', 500, 450, 100),
            (8, 4, 'Washer 1/2\"', 'WSH-12', 1000, 800, 200)
        ");
        
        // Store Transactions (History)
        $conn->exec("INSERT INTO `store_transactions` (`date`, `item_id`, `quantity`, `type`, `ref`, `notes`, `issued_to`, `purpose`) VALUES 
            ('$yesterday 10:00:00', 1, 10, 'INWARD', 'INV-001', 'Initial Purchase', '', ''),
            ('$today 11:30:00', 1, 2, 'OUTWARD', 'REQ-01', 'Replaced on Extruder 1', 'Operator Ali', 'Machine Repair'),
            ('$yesterday 10:00:00', 5, 100, 'INWARD', 'INV-002', 'Monthly Stationery', '', ''),
            ('$today 09:15:00', 5, 15, 'OUTWARD', 'REQ-02', 'Office Use', 'Accounts Dept', 'Daily Reporting'),
            ('$yesterday 10:00:00', 7, 500, 'INWARD', 'INV-003', 'Hardware Stock', '', ''),
            ('$today 14:00:00', 7, 50, 'OUTWARD', 'REQ-03', 'Maintenance', 'Workshop', 'General Fixes')
        ");
    } catch (Exception $e) { $errors[] = "Store: " . $e->getMessage(); }

    // Enable foreign key checks
    $conn->exec("SET FOREIGN_KEY_CHECKS = 1");

    ob_end_clean();
    
    if (count($errors) > 0) {
        // If there were any non-critical errors, still say success but include warnings
        echo json_encode(['status' => 'success', 'message' => 'Demo data restored with some warnings: ' . implode(" | ", $errors)]);
    } else {
        echo json_encode(['status' => 'success', 'message' => 'Demo data restored successfully.']);
    }
} catch (PDOException $e) {
    ob_end_clean();
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
}
?>
