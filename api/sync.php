<?php
// api/sync.php
ob_start(); // Buffer output to prevent accidental garbage from breaking JSON
require_once 'db.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    if ($method === 'GET') {
        if ($action === 'get_all') {
            // AUTO-REPAIR: Customer Locations Schema
            try {
                $conn->exec("CREATE TABLE IF NOT EXISTS customer_main_categories (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL)");
                $conn->exec("CREATE TABLE IF NOT EXISTS customer_sub_categories (id INT AUTO_INCREMENT PRIMARY KEY, main_id INT NOT NULL, name VARCHAR(255) NOT NULL)");
                
                $cols = $conn->query("SHOW COLUMNS FROM customers")->fetchAll(PDO::FETCH_COLUMN);
                if (!in_array('main_id', $cols)) $conn->exec("ALTER TABLE customers ADD COLUMN main_id INT DEFAULT NULL");
                if (!in_array('sub_id', $cols)) $conn->exec("ALTER TABLE customers ADD COLUMN sub_id INT DEFAULT NULL");
                
                // ARCHIVE TABLE
                $conn->exec("CREATE TABLE IF NOT EXISTS audit_reports_archive (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    date DATETIME NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    data LONGTEXT NOT NULL,
                    report_type VARCHAR(20) DEFAULT 'FG'
                )");

                // NEW: Physical Audit Live Table
                $conn->exec("CREATE TABLE IF NOT EXISTS audit_records (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    item_id INT NOT NULL,
                    system_qty DECIMAL(15,3),
                    godown_qty DECIMAL(15,3),
                    diff_qty DECIMAL(15,3),
                    report_type VARCHAR(20) DEFAULT 'FG',
                    date DATETIME DEFAULT CURRENT_TIMESTAMP
                )");

                // AUTO-REPAIR: Add report_type column if missing
                try {
                    $cols = $conn->query("SHOW COLUMNS FROM audit_reports_archive")->fetchAll(PDO::FETCH_COLUMN);
                    if (!in_array('report_type', $cols)) {
                        $conn->exec("ALTER TABLE audit_reports_archive ADD COLUMN report_type VARCHAR(20) DEFAULT 'FG'");
                    }
                } catch(Exception $e) {}

                // AUTO-REPAIR: Item Low Stock Limit
                $itemCols = $conn->query("SHOW COLUMNS FROM items")->fetchAll(PDO::FETCH_COLUMN);
                if (!in_array('low_stock_limit', $itemCols)) {
                    $conn->exec("ALTER TABLE items ADD COLUMN low_stock_limit INT DEFAULT NULL");
                }

                // NEW: Raw Materials Hierarchy Tables
                $conn->exec("CREATE TABLE IF NOT EXISTS rm_main_categories (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, code VARCHAR(50) NOT NULL)");
                $conn->exec("CREATE TABLE IF NOT EXISTS rm_sub_categories (id INT AUTO_INCREMENT PRIMARY KEY, main_id INT NOT NULL, name VARCHAR(255) NOT NULL, code VARCHAR(50) NOT NULL)");
                $conn->exec("CREATE TABLE IF NOT EXISTS rm_items (id INT AUTO_INCREMENT PRIMARY KEY, sub_id INT NOT NULL, name VARCHAR(255) NOT NULL, code VARCHAR(50) NOT NULL, unit VARCHAR(50), stock DECIMAL(15,3) DEFAULT 0, threshold DECIMAL(15,3) DEFAULT 0)");
                
                // AUTO-REPAIR: Bags & Units for RM
                try {
                    $rmCols = $conn->query("SHOW COLUMNS FROM rm_items")->fetchAll(PDO::FETCH_COLUMN);
                    if (!in_array('kg_per_bag', $rmCols)) $conn->exec("ALTER TABLE rm_items ADD COLUMN kg_per_bag DECIMAL(15,3) DEFAULT 0");
                    if (!in_array('threshold_unit', $rmCols)) $conn->exec("ALTER TABLE rm_items ADD COLUMN threshold_unit VARCHAR(20) DEFAULT 'KG'");
                    if (!in_array('base_price', $rmCols)) $conn->exec("ALTER TABLE rm_items ADD COLUMN base_price DECIMAL(15,3) DEFAULT 0");
                } catch(Exception $e) {}

                $conn->exec("CREATE TABLE IF NOT EXISTS rm_units (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(50) UNIQUE)");
                $conn->exec("CREATE TABLE IF NOT EXISTS rm_formulas (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL)");
                $conn->exec("CREATE TABLE IF NOT EXISTS rm_formula_items (id INT AUTO_INCREMENT PRIMARY KEY, formula_id INT NOT NULL, rm_item_id INT NOT NULL, quantity DECIMAL(15,3) NOT NULL, FOREIGN KEY (formula_id) REFERENCES rm_formulas(id) ON DELETE CASCADE)");
                $conn->exec("CREATE TABLE IF NOT EXISTS rm_transactions (id INT AUTO_INCREMENT PRIMARY KEY, date DATETIME DEFAULT CURRENT_TIMESTAMP, rm_item_id INT NOT NULL, quantity DECIMAL(15,3) NOT NULL, type ENUM('IN', 'OUT') NOT NULL, notes TEXT, FOREIGN KEY (rm_item_id) REFERENCES rm_items(id))");
                // AUTO-REPAIR: Order Stock Subtracted Flag
                try {
                    $orderCols = $conn->query("SHOW COLUMNS FROM orders")->fetchAll(PDO::FETCH_COLUMN);
                    if (!in_array('is_stock_subtracted', $orderCols)) {
                        $conn->exec("ALTER TABLE orders ADD COLUMN is_stock_subtracted INT DEFAULT 0");
                    }
                } catch(Exception $e) {}

                // NEW: Store Module Hierarchy Tables
                $conn->exec("CREATE TABLE IF NOT EXISTS store_main_categories (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, code VARCHAR(50) NOT NULL UNIQUE)");
                $conn->exec("CREATE TABLE IF NOT EXISTS store_sub_categories (id INT AUTO_INCREMENT PRIMARY KEY, main_id INT NOT NULL, name VARCHAR(255) NOT NULL, code VARCHAR(50) NOT NULL UNIQUE, FOREIGN KEY (main_id) REFERENCES store_main_categories(id) ON DELETE CASCADE)");
                $conn->exec("CREATE TABLE IF NOT EXISTS store_items (id INT AUTO_INCREMENT PRIMARY KEY, sub_id INT NOT NULL, name VARCHAR(255) NOT NULL, code VARCHAR(50) NOT NULL UNIQUE, opening_stock DECIMAL(15,3) DEFAULT 0, stock DECIMAL(15,3) DEFAULT 0, low_stock_threshold DECIMAL(15,3) DEFAULT 0, FOREIGN KEY (sub_id) REFERENCES store_sub_categories(id) ON DELETE CASCADE)");
                $conn->exec("CREATE TABLE IF NOT EXISTS store_transactions (
                    id INT AUTO_INCREMENT PRIMARY KEY, 
                    date DATETIME DEFAULT CURRENT_TIMESTAMP, 
                    item_id INT NOT NULL, 
                    quantity DECIMAL(15,3) NOT NULL, 
                    type ENUM('INWARD', 'OUTWARD') NOT NULL, 
                    ref VARCHAR(255), 
                    notes TEXT, 
                    source_or_person VARCHAR(255), 
                    issued_by VARCHAR(255),
                    issued_to VARCHAR(255),
                    purpose VARCHAR(255),
                    FOREIGN KEY (item_id) REFERENCES store_items(id) ON DELETE CASCADE
                )");

                // AUTO-REPAIR: Store Items Schema for hierarchy
                try {
                    $stCols = $conn->query("SHOW COLUMNS FROM store_items")->fetchAll(PDO::FETCH_COLUMN);
                    if (!in_array('sub_id', $stCols)) $conn->exec("ALTER TABLE store_items ADD COLUMN sub_id INT DEFAULT NULL");
                    if (!in_array('code', $stCols)) $conn->exec("ALTER TABLE store_items ADD COLUMN code VARCHAR(50) DEFAULT NULL");
                    if (!in_array('opening_stock', $stCols)) $conn->exec("ALTER TABLE store_items ADD COLUMN opening_stock DECIMAL(15,3) DEFAULT 0");
                    if (!in_array('low_stock_threshold', $stCols)) $conn->exec("ALTER TABLE store_items ADD COLUMN low_stock_threshold DECIMAL(15,3) DEFAULT 0");
                } catch(Exception $e) {}

                // AUTO-REPAIR: Store Transactions Schema for issuance details
                try {
                    $stTransCols = $conn->query("SHOW COLUMNS FROM store_transactions")->fetchAll(PDO::FETCH_COLUMN);
                    if (!in_array('issued_by', $stTransCols)) $conn->exec("ALTER TABLE store_transactions ADD COLUMN issued_by VARCHAR(255) DEFAULT NULL");
                    if (!in_array('issued_to', $stTransCols)) $conn->exec("ALTER TABLE store_transactions ADD COLUMN issued_to VARCHAR(255) DEFAULT NULL");
                    if (!in_array('purpose', $stTransCols)) $conn->exec("ALTER TABLE store_transactions ADD COLUMN purpose VARCHAR(255) DEFAULT NULL");
                    if (!in_array('ref', $stTransCols)) $conn->exec("ALTER TABLE store_transactions ADD COLUMN ref VARCHAR(255) DEFAULT NULL");
                    if (!in_array('source_or_person', $stTransCols)) $conn->exec("ALTER TABLE store_transactions ADD COLUMN source_or_person VARCHAR(255) DEFAULT NULL");
                } catch(Exception $e) {}

                // NEW: Raw Materials Consumption History Table
                $conn->exec("CREATE TABLE IF NOT EXISTS rm_consumption_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    fg_weight DECIMAL(15,3) DEFAULT 0,
                    rm_weight DECIMAL(15,3) DEFAULT 0,
                    in_process DECIMAL(15,3) DEFAULT 0,
                    gap DECIMAL(15,3) DEFAULT 0,
                    notes TEXT
                )");

                // AUTO-REPAIR: Add price/value columns
                try {
                    $clCols = $conn->query("SHOW COLUMNS FROM rm_consumption_logs")->fetchAll(PDO::FETCH_COLUMN);
                    if (!in_array('in_process', $clCols)) {
                        $conn->exec("ALTER TABLE rm_consumption_logs ADD COLUMN in_process DECIMAL(15,3) DEFAULT 0 AFTER rm_weight");
                    }
                    if (!in_array('rm_value', $clCols)) {
                        $conn->exec("ALTER TABLE rm_consumption_logs ADD COLUMN rm_value DECIMAL(15,3) DEFAULT 0 AFTER rm_weight");
                    }
                    if (!in_array('other_expenses', $clCols)) {
                        $conn->exec("ALTER TABLE rm_consumption_logs ADD COLUMN other_expenses DECIMAL(15,3) DEFAULT 0 AFTER rm_value");
                    }
                } catch(Exception $e) {}

                // AUTO-REPAIR: Add price & brand columns to rm_transactions
                try {
                    $rtCols = $conn->query("SHOW COLUMNS FROM rm_transactions")->fetchAll(PDO::FETCH_COLUMN);
                    if (!in_array('price', $rtCols)) $conn->exec("ALTER TABLE rm_transactions ADD COLUMN price DECIMAL(15,3) DEFAULT 0 AFTER quantity");
                    if (!in_array('brand_id', $rtCols)) $conn->exec("ALTER TABLE rm_transactions ADD COLUMN brand_id INT DEFAULT NULL");
                } catch(Exception $e) {}

                // AUTO-REPAIR: Users Table for Permissions
                try {
                    $userCols = $conn->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
                    if (!in_array('permissions', $userCols)) $conn->exec("ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT NULL");
                } catch(Exception $e) {}

                // AUTO-REPAIR: Add main_id to rm_formulas
                try {
                    $rfCols = $conn->query("SHOW COLUMNS FROM rm_formulas")->fetchAll(PDO::FETCH_COLUMN);
                    if (!in_array('main_id', $rfCols)) $conn->exec("ALTER TABLE rm_formulas ADD COLUMN main_id INT DEFAULT NULL");
                } catch(Exception $e) {}

            } catch (Exception $e) {}

            $data = [
                'users' => $conn->query("SELECT id, name, username, password, role, permissions FROM users")->fetchAll(PDO::FETCH_ASSOC),
                'mainCategories' => $conn->query("SELECT id, name, code, color, low_stock_limit AS lowStockLimit FROM main_categories")->fetchAll(PDO::FETCH_ASSOC),
                'subCategories' => $conn->query("SELECT id, main_id AS mainId, name FROM sub_categories")->fetchAll(PDO::FETCH_ASSOC),
                'items' => $conn->query("SELECT id, main_id AS mainId, sub_id AS subId, name, length, weight, stock, low_stock_limit AS lowStockLimit FROM items")->fetchAll(PDO::FETCH_ASSOC),
                'customers' => $conn->query("SELECT id, unique_id AS uniqueId, name, address, mobile, main_id AS mainId, sub_id AS subId FROM customers")->fetchAll(PDO::FETCH_ASSOC),
                'customerProvinces' => $conn->query("SELECT id, name FROM customer_main_categories")->fetchAll(PDO::FETCH_ASSOC),
                'customerDistricts' => $conn->query("SELECT id, main_id AS mainId, name FROM customer_sub_categories")->fetchAll(PDO::FETCH_ASSOC),
                'orders' => $conn->query("SELECT o.id, o.date, o.customer_id AS customerId, o.status, o.total_qty AS totalQty, o.total_kg AS totalKg, o.is_stock_subtracted AS isStockSubtracted, c.name AS customerName FROM orders o LEFT JOIN customers c ON o.customer_id = c.id ORDER BY o.date DESC")->fetchAll(PDO::FETCH_ASSOC),
                'transactions' => $conn->query("SELECT t.id, t.date, t.type, t.main_id AS mainId, t.sub_id AS subId, t.item_id AS itemId, t.quantity, t.customer_id AS customerId, t.notes, mc.name AS mainName, sc.name AS subName, i.name AS itemName, i.weight AS itemWeight, i.length AS itemLength, c.name AS customer FROM transactions t LEFT JOIN main_categories mc ON t.main_id = mc.id LEFT JOIN sub_categories sc ON t.sub_id = sc.id LEFT JOIN items i ON t.item_id = i.id LEFT JOIN customers c ON t.customer_id = c.id ORDER BY t.date DESC")->fetchAll(PDO::FETCH_ASSOC),
                'settings' => $conn->query("SELECT id, category, `key`, value FROM settings")->fetchAll(PDO::FETCH_ASSOC),
                'rawMaterials' => $conn->query("SELECT id, name, category, unit, stock, threshold FROM raw_materials")->fetchAll(PDO::FETCH_ASSOC), // Legacy support
                'rmMainCategories' => $conn->query("SELECT id, name, code FROM rm_main_categories")->fetchAll(PDO::FETCH_ASSOC),
                'rmSubCategories' => $conn->query("SELECT id, main_id AS mainId, name, code FROM rm_sub_categories")->fetchAll(PDO::FETCH_ASSOC),
                'rmItems' => $conn->query("SELECT id, sub_id AS subId, name, code, unit, stock, threshold, kg_per_bag AS kgPerBag, threshold_unit AS thresholdUnit, base_price FROM rm_items")->fetchAll(PDO::FETCH_ASSOC),
                'rmUnits' => $conn->query("SELECT id, name FROM rm_units")->fetchAll(PDO::FETCH_ASSOC),
                'rmFormulas' => $conn->query("SELECT * FROM rm_formulas")->fetchAll(PDO::FETCH_ASSOC),
                'rmFormulaItems' => $conn->query("SELECT * FROM rm_formula_items")->fetchAll(PDO::FETCH_ASSOC),
                'rmTransactions' => $conn->query("SELECT * FROM rm_transactions ORDER BY date DESC")->fetchAll(PDO::FETCH_ASSOC),
                'rmConsumptionLogs' => $conn->query("SELECT * FROM rm_consumption_logs ORDER BY date DESC")->fetchAll(PDO::FETCH_ASSOC),
                'storeMainCategories' => $conn->query("SELECT * FROM store_main_categories")->fetchAll(PDO::FETCH_ASSOC),
                'storeSubCategories' => $conn->query("SELECT * FROM store_sub_categories")->fetchAll(PDO::FETCH_ASSOC),
                'storeItems' => $conn->query("SELECT i.*, sc.main_id AS mainId FROM store_items i LEFT JOIN store_sub_categories sc ON i.sub_id = sc.id")->fetchAll(PDO::FETCH_ASSOC),
                'storeTransactions' => $conn->query("SELECT t.*, i.name AS itemName, i.code AS itemCode FROM store_transactions t LEFT JOIN store_items i ON t.item_id = i.id ORDER BY date DESC")->fetchAll(PDO::FETCH_ASSOC),
                'latestAudit' => $conn->query("SELECT item_id, godown_qty FROM audit_records ar1 WHERE id = (SELECT MAX(id) FROM audit_records ar2 WHERE ar2.item_id = ar1.item_id)")->fetchAll(PDO::FETCH_ASSOC),
                'archivedReports' => $conn->query("SELECT id, date, title, report_type FROM audit_reports_archive ORDER BY date DESC")->fetchAll(PDO::FETCH_ASSOC),
            ];
            
            // Add order items to orders
            foreach ($data['orders'] as &$order) {
                $stmt = $conn->prepare("SELECT id, order_id AS orderId, item_id AS itemId, quantity, length, fulfilled FROM order_items WHERE order_id = ?");
                $stmt->execute([$order['id']]);
                $order['items'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }
            
            echo json_encode(['status' => 'success', 'data' => $data]);
        } elseif ($action === 'get_archived_report') {
            $id = $_GET['id'] ?? null;
            if ($id) {
                $stmt = $conn->prepare("SELECT * FROM audit_reports_archive WHERE id = ?");
                $stmt->execute([$id]);
                $report = $stmt->fetch(PDO::FETCH_ASSOC);
                echo json_encode(['status' => 'success', 'report' => $report]);
            } else { echo json_encode(['status' => 'error', 'message' => 'No ID']); }
        }
    } 
    elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if ($action === 'save_all') {
            // Simplified bulk sync for migration or full update
            // Note: In a production app, individual CRUD endpoints are better.
            // For now, we'll implement specific savers for critical modules.
            echo json_encode(['status' => 'error', 'message' => 'Please use specific save actions.']);
        }
        
        elseif ($action === 'save_item') {
            $item = $input['item'];
            if (isset($item['id']) && !empty($item['id'])) {
                $stmt = $conn->prepare("UPDATE items SET main_id = ?, sub_id = ?, name = ?, length = ?, weight = ?, stock = ?, low_stock_limit = ? WHERE id = ?");
                $stmt->execute([$item['mainId'], $item['subId'], $item['name'] ?? '', $item['length'] ?? 13, $item['weight'] ?? 0, $item['stock'] ?? 0, $item['lowStockLimit'] ?? null, $item['id']]);
            } else {
                $stmt = $conn->prepare("INSERT INTO items (main_id, sub_id, name, length, weight, stock, low_stock_limit) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$item['mainId'], $item['subId'], $item['name'] ?? '', $item['length'] ?? 13, $item['weight'] ?? 0, $item['stock'] ?? 0, $item['lowStockLimit'] ?? null]);
                $item['id'] = $conn->lastInsertId();
            }
            echo json_encode(['status' => 'success', 'id' => $item['id']]);
        }

        elseif ($action === 'save_user') {
            $user = $input['user'];
            if (isset($user['id']) && !empty($user['id'])) {
                $stmt = $conn->prepare("UPDATE users SET name = ?, username = ?, password = ?, role = ?, permissions = ? WHERE id = ?");
                $stmt->execute([$user['name'], $user['username'], $user['password'], $user['role'] ?? 'User', $user['permissions'] ?? null, $user['id']]);
            } else {
                $stmt = $conn->prepare("INSERT INTO users (name, username, password, role, permissions) VALUES (?, ?, ?, ?, ?)");
                $stmt->execute([$user['name'], $user['username'], $user['password'], $user['role'] ?? 'User', $user['permissions'] ?? null]);
                $user['id'] = $conn->lastInsertId();
            }
            echo json_encode(['status' => 'success', 'id' => $user['id']]);
        }
        
        elseif ($action === 'update_rm_item_base_price') {
            $id = $input['id'];
            $price = $input['base_price'];
            $stmt = $conn->prepare("UPDATE rm_items SET base_price = ? WHERE id = ?");
            $stmt->execute([$price, $id]);
            echo json_encode(['status' => 'success']);
        }

        elseif ($action === 'delete_user') {
            $id = $input['id'] ?? $_GET['id'] ?? null;
            if ($id && $id != 1) { // Prevent deleting primary admin
                $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
                $stmt->execute([$id]);
                echo json_encode(['status' => 'success']);
            } else { echo json_encode(['status' => 'error', 'message' => 'Cannot delete this user']); }
        }

        elseif ($action === 'delete_all_rm_transactions_in') {
            $conn->exec("DELETE FROM rm_transactions WHERE type = 'IN'");
            echo json_encode(['status' => 'success']);
        }

        elseif ($action === 'save_rm_transaction') {
            $t = $input['transaction'];
            $conn->beginTransaction();
            try {
                $dateVal = $t['date'] ?? date('Y-m-d H:i:s');
                $dateVal = str_replace('T', ' ', $dateVal);
                $stmt = $conn->prepare("INSERT INTO rm_transactions (rm_item_id, quantity, price, type, notes, brand_id, date) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$t['rm_item_id'], $t['quantity'], $t['price'] ?? 0, $t['type'], $t['notes'] ?? '', $t['brand_id'] ?? null, $dateVal]);
                
                // Update stock
                if ($t['type'] === 'IN') {
                    $stmt = $conn->prepare("UPDATE rm_items SET stock = stock + ? WHERE id = ?");
                } else {
                    $stmt = $conn->prepare("UPDATE rm_items SET stock = stock - ? WHERE id = ?");
                }
                $stmt->execute([$t['quantity'], $t['rm_item_id']]);
                
                $insertId = $conn->lastInsertId();
                $conn->commit();
                echo json_encode(['status' => 'success', 'id' => $insertId]);
            } catch (Exception $e) {
                $conn->rollBack();
                throw $e;
            }
        }

        elseif ($action === 'bulk_save_rm_transactions') {
            $transactions = $input['transactions'];
            $conn->beginTransaction();
            try {
                foreach ($transactions as $t) {
                    $stmt = $conn->prepare("INSERT INTO rm_transactions (rm_item_id, quantity, price, type, notes) VALUES (?, ?, ?, ?, ?)");
                    $stmt->execute([$t['rm_item_id'], $t['quantity'], $t['price'] ?? 0, $t['type'], $t['notes'] ?? '']);
                    
                    if ($t['type'] === 'IN') {
                        $stmt = $conn->prepare("UPDATE rm_items SET stock = stock + ? WHERE id = ?");
                    } else {
                        $stmt = $conn->prepare("UPDATE rm_items SET stock = stock - ? WHERE id = ?");
                    }
                    $stmt->execute([$t['quantity'], $t['rm_item_id']]);
                }
                $conn->commit();
                echo json_encode(['status' => 'success']);
            } catch (Exception $e) {
                $conn->rollBack();
                throw $e;
            }
        }

        elseif ($action === 'save_audit') {
            $auditRecords = $input['records'];
            $conn->beginTransaction();
            foreach ($auditRecords as $rec) {
                // Save audit history
                $stmt = $conn->prepare("INSERT INTO audit_records (item_id, system_qty, godown_qty, diff_qty) VALUES (?, ?, ?, ?)");
                $stmt->execute([$rec['itemId'], $rec['systemQty'], $rec['godownQty'], $rec['diffQty']]);
            }
            $conn->commit();
            echo json_encode(['status' => 'success']);
        }

        elseif ($action === 'archive_report') {
            $title = $input['title'] ?? 'Audit Report';
            $type = $input['report_type'] ?? 'FG';
            $data = json_encode($input['data']);
            $date = date('Y-m-d H:i:s');
            $stmt = $conn->prepare("INSERT INTO audit_reports_archive (date, title, data, report_type) VALUES (?, ?, ?, ?)");
            $stmt->execute([$date, $title, $data, $type]);
            echo json_encode(['status' => 'success', 'id' => $conn->lastInsertId()]);
        }

        elseif ($action === 'delete_archived_report') {
            $id = $input['id'] ?? null;
            if ($id) {
                $stmt = $conn->prepare("DELETE FROM audit_reports_archive WHERE id = ?");
                $stmt->execute([$id]);
                echo json_encode(['status' => 'success']);
            } else { echo json_encode(['status' => 'error', 'message' => 'No ID']); }
        }

        elseif ($action === 'clear_audit') {
            $conn->exec("DELETE FROM audit_records");
            echo json_encode(['status' => 'success']);
        }

        elseif ($action === 'save_rm_consumption_log') {
            $log = $input['log'];
            $stmt = $conn->prepare("INSERT INTO rm_consumption_logs (date, fg_weight, rm_weight, rm_value, other_expenses, in_process, gap, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$log['date'] ?? date('Y-m-d H:i:s'), $log['fg_weight'], $log['rm_weight'], $log['rm_value'] ?? 0, $log['other_expenses'] ?? 0, $log['in_process'] ?? 0, $log['gap'], $log['notes'] ?? '']);
            echo json_encode(['status' => 'success', 'id' => $conn->lastInsertId()]);
        }

        elseif ($action === 'save_rm_consumption_in_process') {
            $id = $input['id'];
            $val = $input['in_process'];
            // Re-calculate gap based on existing record
            $stmt = $conn->prepare("UPDATE rm_consumption_logs SET in_process = ?, gap = rm_weight - fg_weight - ? WHERE id = ?");
            $stmt->execute([$val, $val, $id]);
            
            $log = $conn->query("SELECT gap FROM rm_consumption_logs WHERE id = $id")->fetch(PDO::FETCH_ASSOC);
            echo json_encode(['status' => 'success', 'gap' => $log['gap']]);
        }

        elseif ($action === 'save_rm_consumption_other_expenses') {
            $id = $input['id'];
            $val = $input['other_expenses'];
            $stmt = $conn->prepare("UPDATE rm_consumption_logs SET other_expenses = ? WHERE id = ?");
            $stmt->execute([$val, $id]);
            echo json_encode(['status' => 'success']);
        }

        elseif ($action === 'delete_rm_consumption_log') {
            $id = $input['id'] ?? null;
            if ($id) {
                $stmt = $conn->prepare("DELETE FROM rm_consumption_logs WHERE id = ?");
                $stmt->execute([$id]);
                echo json_encode(['status' => 'success']);
            } else { echo json_encode(['status' => 'error', 'message' => 'No ID']); }
        }

        elseif ($action === 'clear_rm_consumption_history') {
            $conn->exec("DELETE FROM rm_consumption_logs");
            echo json_encode(['status' => 'success']);
        }

        elseif ($action === 'save_category') {
            $cat = $input['category'];
            $type = $input['type']; // 'main' or 'sub'
            
            if ($type === 'main') {
                // AUTO-REPAIR: Ensure 'code' column exists
                try {
                    $res = $conn->query("SHOW COLUMNS FROM main_categories LIKE 'code'")->fetch();
                    if (!$res) {
                        $conn->exec("ALTER TABLE main_categories ADD COLUMN code VARCHAR(50) AFTER name");
                    }
                } catch(Exception $e) { /* ignore already exists error */ }

                if (isset($cat['id']) && !empty($cat['id'])) {
                    $stmt = $conn->prepare("UPDATE main_categories SET name = ?, code = ?, color = ?, low_stock_limit = ? WHERE id = ?");
                    $stmt->execute([$cat['name'], $cat['code'] ?? '', $cat['color'] ?? '#2196f3', $cat['lowStockLimit'] ?? 10, $cat['id']]);
                } else {
                    $stmt = $conn->prepare("INSERT INTO main_categories (name, code, color, low_stock_limit) VALUES (?, ?, ?, ?)");
                    $stmt->execute([$cat['name'], $cat['code'] ?? '', $cat['color'] ?? '#2196f3', $cat['lowStockLimit'] ?? 10]);
                    $cat['id'] = $conn->lastInsertId();
                }
            } else {
                if (isset($cat['id']) && !empty($cat['id'])) {
                    $stmt = $conn->prepare("UPDATE sub_categories SET name = ?, main_id = ? WHERE id = ?");
                    $stmt->execute([$cat['name'], $cat['mainId'], $cat['id']]);
                } else {
                    $stmt = $conn->prepare("INSERT INTO sub_categories (name, main_id) VALUES (?, ?)");
                    $stmt->execute([$cat['name'], $cat['mainId']]);
                    $cat['id'] = $conn->lastInsertId();
                }
            }
            echo json_encode(['status' => 'success', 'id' => $cat['id']]);
        }
        
        elseif ($action === 'save_settings') {
            $settings = $input['settings'];
            $category = $input['category'] ?? 'company';
            foreach ($settings as $key => $val) {
                $stmt = $conn->prepare("INSERT INTO settings (category, `key`, value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)");
                $stmt->execute([$category, $key, $val]);
            }
            echo json_encode(['status' => 'success']);
        }
        
        elseif ($action === 'save_transaction') {
            $t = $input['transaction'];
            $conn->beginTransaction();
            try {
                // Insert transaction
                $stmt = $conn->prepare("INSERT INTO transactions (date, type, main_id, sub_id, item_id, quantity, customer_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                // Frontend uses 'PRODUCTION', 'SALE', 'ADJUSTMENT'
                $type = $t['type'] === 'PRODUCTION' ? 'IN' : ($t['type'] === 'SALE' ? 'OUT' : 'ADJ');
                
                // Normalize date: Remove 'T' from datetime-local/ISO format for MySQL compatibility
                $dateVal = $t['date'] ?? date('Y-m-d H:i:s');
                $dateVal = str_replace('T', ' ', $dateVal);

                $stmt->execute([
                    $dateVal,
                    $type,
                    $t['mainId'],
                    $t['subId'],
                    $t['itemId'],
                    $t['quantity'],
                    $t['customerId'] ?? null,
                    $t['notes'] ?? ''
                ]);
                $tId = $conn->lastInsertId();

                // Update item stock
                if ($type === 'IN') {
                    $stmt = $conn->prepare("UPDATE items SET stock = stock + ? WHERE id = ?");
                } elseif ($type === 'OUT') {
                    $stmt = $conn->prepare("UPDATE items SET stock = stock - ? WHERE id = ?");
                } else { // ADJ
                    // For adjustments, quantity is already signed (e.g., -5 for removal)
                    $stmt = $conn->prepare("UPDATE items SET stock = stock + ? WHERE id = ?");
                }
                $stmt->execute([$t['quantity'], $t['itemId']]);
                
                $conn->commit();
                echo json_encode(['status' => 'success', 'id' => $tId]);
            } catch (Exception $e) {
                $conn->rollBack();
                throw $e;
            }
        }

        elseif ($action === 'save_cust_category') {
            $cat = $input['category'];
            $type = $input['type']; // 'main' or 'sub'
            
            if ($type === 'main') {
                if (isset($cat['id']) && !empty($cat['id'])) {
                    $stmt = $conn->prepare("UPDATE customer_main_categories SET name = ? WHERE id = ?");
                    $stmt->execute([$cat['name'], $cat['id']]);
                } else {
                    $stmt = $conn->prepare("INSERT INTO customer_main_categories (name) VALUES (?)");
                    $stmt->execute([$cat['name']]);
                    $cat['id'] = $conn->lastInsertId();
                }
            } else {
                if (isset($cat['id']) && !empty($cat['id'])) {
                    $stmt = $conn->prepare("UPDATE customer_sub_categories SET name = ?, main_id = ? WHERE id = ?");
                    $stmt->execute([$cat['name'], $cat['mainId'], $cat['id']]);
                } else {
                    $stmt = $conn->prepare("INSERT INTO customer_sub_categories (name, main_id) VALUES (?, ?)");
                    $stmt->execute([$cat['name'], $cat['mainId']]);
                    $cat['id'] = $conn->lastInsertId();
                }
            }
            echo json_encode(['status' => 'success', 'id' => $cat['id']]);
        }

        elseif ($action === 'delete_cust_category') {
            $id = $input['id'] ?? null;
            $type = $input['type'] ?? '';
            
            if ($type === 'main') {
                $count = $conn->prepare("SELECT COUNT(*) FROM customer_sub_categories WHERE main_id = ?");
                $count->execute([$id]);
                if ($count->fetchColumn() > 0) {
                    echo json_encode(['status' => 'error', 'message' => 'Cannot delete Province because it has Districts.']);
                    exit;
                }
                $stmt = $conn->prepare("DELETE FROM customer_main_categories WHERE id = ?");
                $stmt->execute([$id]);
            } else {
                $count = $conn->prepare("SELECT COUNT(*) FROM customers WHERE sub_id = ?");
                $count->execute([$id]);
                if ($count->fetchColumn() > 0) {
                    echo json_encode(['status' => 'error', 'message' => 'Cannot delete District because it has Customers, please delete or move customers first.']);
                    exit;
                }
                $stmt = $conn->prepare("DELETE FROM customer_sub_categories WHERE id = ?");
                $stmt->execute([$id]);
            }
            echo json_encode(['status' => 'success']);
        }

        elseif ($action === 'save_order') {
            $o = $input['order'];
            $conn->beginTransaction();
            try {
                // Database Date Format Fix
                $dateVal = $o['date'] ?? date('Y-m-d H:i:s');
                $dateVal = str_replace('T', ' ', $dateVal); // Change datetime-local format to MySQL format

                if (isset($o['id']) && !empty($o['id'])) {
                    // Update existing order
                    $stmt = $conn->prepare("UPDATE orders SET date = ?, customer_id = ?, status = ?, total_qty = ?, total_kg = ?, is_stock_subtracted = ? WHERE id = ?");
                    $stmt->execute([$dateVal, $o['customerId'], $o['status'], $o['totalQty'] ?? 0, $o['totalKg'] ?? 0, $o['isStockSubtracted'] ?? 0, $o['id']]);
                    $orderId = $o['id'];
                    
                    // Delete existing items for full refresh (simple approach)
                    $conn->prepare("DELETE FROM order_items WHERE order_id = ?")->execute([$orderId]);
                } else {
                    // Insert new order
                    $stmt = $conn->prepare("INSERT INTO orders (date, customer_id, status, total_qty, total_kg, is_stock_subtracted) VALUES (?, ?, ?, ?, ?, ?)");
                    $stmt->execute([$dateVal, $o['customerId'], $o['status'] ?? 'Pending', (int)($o['totalQty'] ?? 0), (float)($o['totalKg'] ?? 0), $o['isStockSubtracted'] ?? 0]);
                    $orderId = $conn->lastInsertId();
                }

                // Insert order items
                foreach ($o['items'] as $item) {
                    $stmt = $conn->prepare("INSERT INTO order_items (order_id, item_id, quantity, length, fulfilled) VALUES (?, ?, ?, ?, ?)");
                    $stmt->execute([$orderId, $item['itemId'], $item['quantity'], $item['length'] ?? 13, $item['fulfilled'] ?? 0]);
                }

                $conn->commit();
                echo json_encode(['status' => 'success', 'id' => $orderId]);
            } catch (Exception $e) {
                $conn->rollBack();
                throw $e;
            }
        }

        elseif ($action === 'save_customer') {
            $c = $input['customer'];
            if (isset($c['id']) && !empty($c['id'])) {
                $stmt = $conn->prepare("UPDATE customers SET unique_id = ?, name = ?, address = ?, mobile = ?, main_id = ?, sub_id = ? WHERE id = ?");
                $stmt->execute([$c['uniqueId'], $c['name'], $c['address'] ?? '', $c['mobile'] ?? '', $c['mainId'] ?? null, $c['subId'] ?? null, $c['id']]);
            } else {
                $stmt = $conn->prepare("INSERT INTO customers (unique_id, name, address, mobile, main_id, sub_id) VALUES (?, ?, ?, ?, ?, ?)");
                $stmt->execute([$c['uniqueId'], $c['name'], $c['address'] ?? '', $c['mobile'] ?? '', $c['mainId'] ?? null, $c['subId'] ?? null]);
                $c['id'] = $conn->lastInsertId();
            }
            echo json_encode(['status' => 'success', 'id' => $c['id']]);
        }

        elseif ($action === 'delete_customer') {
            $id = $_GET['id'] ?? $input['id'] ?? null;
            if ($id) {
                $stmt = $conn->prepare("DELETE FROM customers WHERE id = ?");
                $stmt->execute([$id]);
                echo json_encode(['status' => 'success']);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'No ID provided']);
            }
        }

        elseif ($action === 'delete_order') {
            $id = $input['id'] ?? $_GET['id'] ?? null;
            if ($id) {
                $conn->beginTransaction();
                try {
                    $conn->prepare("DELETE FROM order_items WHERE order_id = ?")->execute([$id]);
                    $conn->prepare("DELETE FROM orders WHERE id = ?")->execute([$id]);
                    $conn->commit();
                    echo json_encode(['status' => 'success']);
                } catch (Exception $e) {
                    $conn->rollBack();
                    throw $e;
                }
            } else {
                echo json_encode(['status' => 'error', 'message' => 'No ID provided']);
            }
        }

        elseif ($action === 'delete_category') {
            $id = $input['id'] ?? $_GET['id'] ?? null;
            $type = $input['type'] ?? $_GET['type'] ?? 'main';
            if ($id) {
                if ($type === 'main') {
                    $stmt = $conn->prepare("DELETE FROM main_categories WHERE id = ?");
                } else {
                    $stmt = $conn->prepare("DELETE FROM sub_categories WHERE id = ?");
                }
                $stmt->execute([$id]);
                echo json_encode(['status' => 'success']);
            } else { echo json_encode(['status' => 'error', 'message' => 'No ID']); }
        }

        elseif ($action === 'delete_item') {
            $id = $input['id'] ?? $_GET['id'] ?? null;
            if ($id) {
                $stmt = $conn->prepare("DELETE FROM items WHERE id = ?");
                $stmt->execute([$id]);
                echo json_encode(['status' => 'success']);
            } else { echo json_encode(['status' => 'error', 'message' => 'No ID']); }
        }

        elseif ($action === 'save_raw_material') {
            $rm = $input['material'];
            if (isset($rm['id']) && !empty($rm['id'])) {
                $stmt = $conn->prepare("UPDATE raw_materials SET name = ?, category = ?, unit = ?, stock = ?, threshold = ? WHERE id = ?");
                $stmt->execute([$rm['name'], $rm['category'] ?? '', $rm['unit'] ?? 'KG', $rm['stock'] ?? 0, $rm['threshold'] ?? 10, $rm['id']]);
            } else {
                $stmt = $conn->prepare("INSERT INTO raw_materials (name, category, unit, stock, threshold) VALUES (?, ?, ?, ?, ?)");
                $stmt->execute([$rm['name'], $rm['category'] ?? '', $rm['unit'] ?? 'KG', $rm['stock'] ?? 0, $rm['threshold'] ?? 10]);
                $rm['id'] = $conn->lastInsertId();
            }
            echo json_encode(['status' => 'success', 'id' => $rm['id']]);
        }

        elseif ($action === 'save_store_item') {
            $si = $input['item'];
            if (isset($si['id']) && !empty($si['id'])) {
                $stmt = $conn->prepare("UPDATE store_items SET sub_id = ?, name = ?, code = ?, opening_stock = ?, stock = ?, low_stock_threshold = ? WHERE id = ?");
                $stmt->execute([$si['sub_id'], $si['name'], $si['code'], $si['opening_stock'] ?? 0, $si['stock'] ?? 0, $si['low_stock_threshold'] ?? 0, $si['id']]);
            } else {
                $stmt = $conn->prepare("INSERT INTO store_items (sub_id, name, code, opening_stock, stock, low_stock_threshold) VALUES (?, ?, ?, ?, ?, ?)");
                $stmt->execute([$si['sub_id'], $si['name'], $si['code'], $si['opening_stock'] ?? 0, $si['opening_stock'] ?? 0, $si['low_stock_threshold'] ?? 0]);
                $si['id'] = $conn->lastInsertId();
            }
            echo json_encode(['status' => 'success', 'id' => $si['id']]);
        }

        elseif ($action === 'save_store_category') {
            $cat = $input['category'];
            $type = $input['type']; // 'main' or 'sub'
            
            if ($type === 'main') {
                if (isset($cat['id']) && !empty($cat['id'])) {
                    $stmt = $conn->prepare("UPDATE store_main_categories SET name = ?, code = ? WHERE id = ?");
                    $stmt->execute([$cat['name'], $cat['code'], $cat['id']]);
                } else {
                    // Check for duplicate code
                    $check = $conn->prepare("SELECT id FROM store_main_categories WHERE code = ?");
                    $check->execute([$cat['code']]);
                    if ($check->fetch()) {
                        echo json_encode(['status' => 'error', 'message' => 'Duplicate code!']);
                        exit;
                    }
                    $stmt = $conn->prepare("INSERT INTO store_main_categories (name, code) VALUES (?, ?)");
                    $stmt->execute([$cat['name'], $cat['code']]);
                    $cat['id'] = $conn->lastInsertId();
                }
            } else {
                if (isset($cat['id']) && !empty($cat['id'])) {
                    $stmt = $conn->prepare("UPDATE store_sub_categories SET name = ?, code = ?, main_id = ? WHERE id = ?");
                    $stmt->execute([$cat['name'], $cat['code'], $cat['main_id'], $cat['id']]);
                } else {
                    $stmt = $conn->prepare("INSERT INTO store_sub_categories (name, code, main_id) VALUES (?, ?, ?)");
                    $stmt->execute([$cat['name'], $cat['code'], $cat['main_id']]);
                    $cat['id'] = $conn->lastInsertId();
                }
            }
            echo json_encode(['status' => 'success', 'id' => $cat['id']]);
        }

        elseif ($action === 'delete_store_category') {
            $id = $input['id'];
            $type = $input['type'];
            if ($type === 'main') {
                $check = $conn->prepare("SELECT id FROM store_sub_categories WHERE main_id = ?");
                $check->execute([$id]);
                if ($check->fetch()) {
                    echo json_encode(['status' => 'error', 'message' => 'Cannot delete: Category has sub-categories!']);
                    exit;
                }
                $conn->prepare("DELETE FROM store_main_categories WHERE id = ?")->execute([$id]);
            } else {
                $check = $conn->prepare("SELECT id FROM store_items WHERE sub_id = ?");
                $check->execute([$id]);
                if ($check->fetch()) {
                    echo json_encode(['status' => 'error', 'message' => 'Cannot delete: Sub-category has items!']);
                    exit;
                }
                $conn->prepare("DELETE FROM store_sub_categories WHERE id = ?")->execute([$id]);
            }
            echo json_encode(['status' => 'success']);
        }

        elseif ($action === 'delete_store_item') {
            $id = $input['id'];
            $conn->prepare("DELETE FROM store_items WHERE id = ?")->execute([$id]);
            echo json_encode(['status' => 'success']);
        }

        elseif ($action === 'save_store_transaction') {
            $t = $input['transaction'];
            $conn->beginTransaction();
            try {
                $dateVal = $t['date'] ?? date('Y-m-d H:i:s');
                $dateVal = str_replace('T', ' ', $dateVal);
                $stmt = $conn->prepare("INSERT INTO store_transactions (item_id, quantity, type, ref, source_or_person, issued_by, issued_to, purpose, notes, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $t['item_id'], 
                    $t['quantity'], 
                    $t['type'], 
                    $t['ref'] ?? '', 
                    $t['source_or_person'] ?? '', 
                    $t['issued_by'] ?? '',
                    $t['issued_to'] ?? '',
                    $t['purpose'] ?? '',
                    $t['notes'] ?? '',
                    $dateVal
                ]);
                
                if ($t['type'] === 'INWARD') {
                    $conn->prepare("UPDATE store_items SET stock = stock + ? WHERE id = ?")->execute([$t['quantity'], $t['item_id']]);
                } else {
                    $conn->prepare("UPDATE store_items SET stock = stock - ? WHERE id = ?")->execute([$t['quantity'], $t['item_id']]);
                }
                $conn->commit();
                echo json_encode(['status' => 'success']);
            } catch (Exception $e) {
                $conn->rollBack();
                throw $e;
            }
        }

        elseif ($action === 'delete_store_transaction') {
            $id = $input['id'];
            $conn->prepare("DELETE FROM store_transactions WHERE id = ?")->execute([$id]);
            echo json_encode(['status' => 'success']);
        }

        elseif ($action === 'adjust_store_stock' || $action === 'bulk_adjust_store_stock') {
            $adjustments = ($action === 'adjust_store_stock') ? [$input['adjustment']] : $input['adjustments'];
            $conn->beginTransaction();
            try {
                foreach ($adjustments as $adj) {
                    $itemId = $adj['itemId'];
                    $targetStock = $adj['targetStock'];
                    $diff = $adj['diff'];
                    $notes = $adj['notes'] ?? 'Audit Adjustment';
                    $type = ($diff >= 0) ? 'INWARD' : 'OUTWARD';
                    $absQty = abs($diff);

                    // 1. Update item stock to target
                    $stmt = $conn->prepare("UPDATE store_items SET stock = ? WHERE id = ?");
                    $stmt->execute([$targetStock, $itemId]);

                    // 2. Log transaction for history
                    $stmt2 = $conn->prepare("INSERT INTO store_transactions (item_id, quantity, type, notes, source_or_person) VALUES (?, ?, ?, ?, ?)");
                    $stmt2->execute([$itemId, $absQty, $type, $notes, 'Audit System']);
                }
                $conn->commit();
                echo json_encode(['status' => 'success']);
            } catch (Exception $e) {
                $conn->rollBack();
                throw $e;
            }
        }

        // --- NEW RAW MATERIALS ACTIONS ---
        elseif ($action === 'save_rm_main') {
            $m = $input['main'];
            if (isset($m['id']) && !empty($m['id'])) {
                $stmt = $conn->prepare("UPDATE rm_main_categories SET name = ?, code = ? WHERE id = ?");
                $stmt->execute([$m['name'], $m['code'], $m['id']]);
            } else {
                $stmt = $conn->prepare("INSERT INTO rm_main_categories (name, code) VALUES (?, ?)");
                $stmt->execute([$m['name'], $m['code']]);
                $m['id'] = $conn->lastInsertId();
            }
            echo json_encode(['status' => 'success', 'id' => $m['id']]);
        }

        elseif ($action === 'delete_rm_main') {
            $id = $input['id'];
            $conn->prepare("DELETE FROM rm_main_categories WHERE id = ?")->execute([$id]);
            // Cascade delete or keep as orphaned? For simplicity, we just delete the parent.
            echo json_encode(['status' => 'success']);
        }

        elseif ($action === 'save_rm_sub') {
            $s = $input['sub'];
            if (isset($s['id']) && !empty($s['id'])) {
                $stmt = $conn->prepare("UPDATE rm_sub_categories SET main_id = ?, name = ?, code = ? WHERE id = ?");
                $stmt->execute([$s['mainId'], $s['name'], $s['code'], $s['id']]);
            } else {
                $stmt = $conn->prepare("INSERT INTO rm_sub_categories (main_id, name, code) VALUES (?, ?, ?)");
                $stmt->execute([$s['mainId'], $s['name'], $s['code']]);
                $s['id'] = $conn->lastInsertId();
            }
            echo json_encode(['status' => 'success', 'id' => $s['id']]);
        }

        elseif ($action === 'delete_rm_sub') {
            $id = $input['id'];
            $conn->prepare("DELETE FROM rm_sub_categories WHERE id = ?")->execute([$id]);
            echo json_encode(['status' => 'success']);
        }

        elseif ($action === 'save_rm_item') {
            $i = $input['item'];
            if (isset($i['id']) && !empty($i['id'])) {
                $stmt = $conn->prepare("UPDATE rm_items SET sub_id = ?, name = ?, code = ?, unit = ?, stock = ?, threshold = ?, kg_per_bag = ?, threshold_unit = ? WHERE id = ?");
                $stmt->execute([$i['subId'], $i['name'], $i['code'], $i['unit'], $i['stock'], $i['threshold'], $i['kg_per_bag'], $i['threshold_unit'], $i['id']]);
            } else {
                $stmt = $conn->prepare("INSERT INTO rm_items (sub_id, name, code, unit, stock, threshold, kg_per_bag, threshold_unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$i['subId'], $i['name'], $i['code'], $i['unit'], $i['stock'], $i['threshold'], $i['kg_per_bag'], $i['threshold_unit']]);
                $i['id'] = $conn->lastInsertId();
            }
            echo json_encode(['status' => 'success', 'id' => $i['id']]);
        }

        elseif ($action === 'delete_rm_item') {
            $id = $input['id'];
            $conn->prepare("DELETE FROM rm_items WHERE id = ?")->execute([$id]);
            echo json_encode(['status' => 'success']);
        }

        elseif ($action === 'save_rm_unit') {
            $u = $input['unit'];
            if (isset($u['id']) && !empty($u['id'])) {
                $stmt = $conn->prepare("UPDATE rm_units SET name = ? WHERE id = ?");
                $stmt->execute([$u['name'], $u['id']]);
            } else {
                $stmt = $conn->prepare("INSERT INTO rm_units (name) VALUES (?)");
                $stmt->execute([$u['name']]);
                $u['id'] = $conn->lastInsertId();
            }
            echo json_encode(['status' => 'success', 'id' => $u['id']]);
        }

        elseif ($action === 'delete_rm_unit') {
            $id = $input['id'];
            $conn->prepare("DELETE FROM rm_units WHERE id = ?")->execute([$id]);
            echo json_encode(['status' => 'success']);
        }

        elseif ($action === 'save_rm_formula') {
            $f = $input['formula'];
            $items = $input['items'] ?? [];
            if (!empty($f['id'])) {
                $stmt = $conn->prepare("UPDATE rm_formulas SET name=?, main_id=? WHERE id=?");
                $stmt->execute([$f['name'], $f['main_id'] ?? null, $f['id']]);
                $formulaId = $f['id'];
                $conn->prepare("DELETE FROM rm_formula_items WHERE formula_id=?")->execute([$formulaId]);
            } else {
                $stmt = $conn->prepare("INSERT INTO rm_formulas (name, main_id) VALUES (?, ?)");
                $stmt->execute([$f['name'], $f['main_id'] ?? null]);
                $formulaId = $conn->lastInsertId();
            }
            foreach ($items as $item) {
                $stmt = $conn->prepare("INSERT INTO rm_formula_items (formula_id, rm_item_id, quantity) VALUES (?, ?, ?)");
                $stmt->execute([$formulaId, $item['rm_item_id'], $item['quantity']]);
            }
            echo json_encode(['status' => 'success', 'id' => $formulaId]);
        }

        elseif ($action === 'delete_rm_formula') {
            $id = $input['id'];
            $conn->prepare("DELETE FROM rm_formulas WHERE id=?")->execute([$id]);
            echo json_encode(['status' => 'success']);
        }

        elseif ($action === 'delete_all_rm_transactions_out') {
            $conn->prepare("DELETE FROM rm_transactions WHERE type='OUT'")->execute();
            echo json_encode(['status' => 'success']);
        }

        elseif ($action === 'delete_all_rm_transactions_in') {
            $conn->prepare("DELETE FROM rm_transactions WHERE type='IN'")->execute();
            echo json_encode(['status' => 'success']);
        }

        elseif ($action === 'revert_rm_transaction') {
            $id = $input['id'] ?? $_GET['id'] ?? null;
            if ($id) {
                $conn->beginTransaction();
                try {
                    $stmt = $conn->prepare("SELECT rm_item_id, quantity, type FROM rm_transactions WHERE id = ?");
                    $stmt->execute([$id]);
                    $t = $stmt->fetch(PDO::FETCH_ASSOC);
                    if ($t) {
                        $diff = ($t['type'] === 'IN') ? -1 * $t['quantity'] : $t['quantity'];
                        $stmt = $conn->prepare("UPDATE rm_items SET stock = stock + ? WHERE id = ?");
                        $stmt->execute([$diff, $t['rm_item_id']]);
                        
                        $stmt = $conn->prepare("DELETE FROM rm_transactions WHERE id = ?");
                        $stmt->execute([$id]);
                        $conn->commit();
                        echo json_encode(['status' => 'success']);
                    } else { throw new Exception("Transaction not found"); }
                } catch (Exception $e) { $conn->rollBack(); echo json_encode(['status' => 'error', 'message' => $e->getMessage()]); }
            } else { echo json_encode(['status' => 'error', 'message' => 'No ID provided']); }
        }

        elseif ($action === 'revert_transaction') {
            $id = $input['id'] ?? $_GET['id'] ?? null;
            if ($id) {
                $conn->beginTransaction();
                try {
                    $stmt = $conn->prepare("SELECT item_id, quantity, type FROM transactions WHERE id = ?");
                    $stmt->execute([$id]);
                    $t = $stmt->fetch(PDO::FETCH_ASSOC);
                    if ($t) {
                        $diff = 0;
                        if ($t['type'] === 'PRODUCTION' || $t['type'] === 'IN' || $t['type'] === 'ADJ_PLUS') {
                            $diff = -1 * $t['quantity'];
                        } elseif ($t['type'] === 'SALE' || $t['type'] === 'OUT' || $t['type'] === 'ADJ_MINUS') {
                            $diff = $t['quantity'];
                        }
                        
                        if ($diff !== 0) {
                            $stmt = $conn->prepare("UPDATE items SET stock = stock + ? WHERE id = ?");
                            $stmt->execute([$diff, $t['item_id']]);
                        }
                        
                        $stmt = $conn->prepare("DELETE FROM transactions WHERE id = ?");
                        $stmt->execute([$id]);
                        $conn->commit();
                        echo json_encode(['status' => 'success']);
                    } else { throw new Exception("Transaction not found"); }
                } catch (Exception $e) { $conn->rollBack(); echo json_encode(['status' => 'error', 'message' => $e->getMessage()]); }
            } else { echo json_encode(['status' => 'error', 'message' => 'No ID provided']); }
        }

        elseif ($action === 'delete_rm_transaction') {
            $id = $input['id'] ?? $_GET['id'] ?? null;
            if ($id) {
                $stmt = $conn->prepare("DELETE FROM rm_transactions WHERE id = ?");
                $stmt->execute([$id]);
                echo json_encode(['status' => 'success']);
            } else { echo json_encode(['status' => 'error', 'message' => 'No ID provided']); }
        }

        elseif ($action === 'delete_transaction') {
            $id = $input['id'] ?? $_GET['id'] ?? null;
            if ($id) {
                // Delete transaction record only (per user request: "delet sy stok per asr na pary")
                $stmt = $conn->prepare("DELETE FROM transactions WHERE id = ?");
                $stmt->execute([$id]);
                echo json_encode(['status' => 'success']);
            } else { echo json_encode(['status' => 'error', 'message' => 'No ID provided']); }
        }

        elseif ($action === 'clear_all_transactions') {
            $conn->exec("DELETE FROM transactions");
            echo json_encode(['status' => 'success']);
        }

        elseif ($action === 'update_transaction') {
            $t = $input['transaction'];
            $conn->beginTransaction();
            try {
                // 1. Get old transaction to calculate diff
                $stmt = $conn->prepare("SELECT item_id, quantity, type FROM transactions WHERE id = ?");
                $stmt->execute([$t['id']]);
                $old = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($old) {
                    $diff = $t['quantity'] - $old['quantity'];
                    
                    // 2. Update transaction
                    $stmt = $conn->prepare("UPDATE transactions SET date = ?, quantity = ?, notes = ? WHERE id = ?");
                    $stmt->execute([$t['date'], $t['quantity'], $t['notes'] ?? '', $t['id']]);

                    // 3. Update stock by difference
                    // modifier: IN increases stock, OUT decreases stock, ADJ is signed already
                    $modifier = ($old['type'] === 'IN') ? 1 : (($old['type'] === 'OUT') ? -1 : 1);
                    $stockChange = $diff * $modifier;

                    $stmt = $conn->prepare("UPDATE items SET stock = stock + ? WHERE id = ?");
                    $stmt->execute([$stockChange, $old['item_id']]);
                }

                $conn->commit();
                echo json_encode(['status' => 'success']);
            } catch (Exception $e) {
                $conn->rollBack();
                throw $e;
            }
        }
        elseif ($action === 'adjust_stock' || $action === 'bulk_adjust_stock') {
            $adjustments = $action === 'adjust_stock' ? [$input['adjustment']] : $input['adjustments'];
            $conn->beginTransaction();
            try {
                foreach ($adjustments as $adj) {
                    $itemId = $adj['itemId'];
                    $diff = $adj['diff']; // The difference to add/subtract
                    $notes = $adj['notes'] ?? 'Audit Adjustment';
                    $date = date('Y-m-d H:i:s');

                    // 1. Update item stock
                    $stmt = $conn->prepare("UPDATE items SET stock = stock + ? WHERE id = ?");
                    $stmt->execute([$diff, $itemId]);

                    // 2. Insert transaction record
                    $stmt = $conn->prepare("INSERT INTO transactions (date, type, main_id, sub_id, item_id, quantity, notes) 
                                           SELECT ?, 'ADJ', main_id, sub_id, id, ?, ? FROM items WHERE id = ?");
                    $stmt->execute([$date, $diff, $notes, $itemId]);
                }
                $conn->commit();
                echo json_encode(['status' => 'success']);
            } catch (Exception $e) {
                $conn->rollBack();
                throw $e;
            }
        }

        elseif ($action === 'save_audit') {
            $records = $input['records']; // Array of {itemId, systemQty, godownQty, diffQty, reportType}
            $type = $input['report_type'] ?? 'FG';
            foreach ($records as $r) {
                if ($r['itemId']) {
                    $conn->prepare("DELETE FROM audit_records WHERE item_id = ? AND report_type = ?")->execute([$r['itemId'], $type]);
                    $stmt = $conn->prepare("INSERT INTO audit_records (item_id, system_qty, godown_qty, diff_qty, report_type) VALUES (?, ?, ?, ?, ?)");
                    $stmt->execute([$r['itemId'], $r['systemQty'], $r['godownQty'], $r['diffQty'], $type]);
                }
            }
            echo json_encode(['status' => 'success']);
        }
        
        elseif ($action === 'clear_audit') {
            $type = $input['report_type'] ?? 'FG';
            $stmt = $conn->prepare("DELETE FROM audit_records WHERE report_type = ?");
            $stmt->execute([$type]);
            echo json_encode(['status' => 'success']);
        }

        elseif ($action === 'get_report') {
            $id = $_GET['id'] ?? null;
            if ($id) {
                $stmt = $conn->prepare("SELECT data FROM audit_reports_archive WHERE id = ?");
                $stmt->execute([$id]);
                $data = $stmt->fetch(PDO::FETCH_ASSOC);
                echo json_encode(['status' => 'success', 'data' => $data]);
            } else { echo json_encode(['status' => 'error', 'message' => 'No ID']); }
        }

        elseif ($action === 'archive_report') {
            $title = $input['title'] ?? 'Audit Report';
            $data_json = json_encode($input['data']);
            $type = $input['report_type'] ?? 'FG';
            $date = date('Y-m-d H:i:s');
            
            $stmt = $conn->prepare("INSERT INTO audit_reports_archive (date, title, data, report_type) VALUES (?, ?, ?, ?)");
            $stmt->execute([$date, $title, $data_json, $type]);
            echo json_encode(['status' => 'success']);
        }

        elseif ($action === 'delete_archived_report') {
            $id = $input['id'] ?? null;
            if ($id) {
                $stmt = $conn->prepare("DELETE FROM audit_reports_archive WHERE id = ?");
                $stmt->execute([$id]);
                echo json_encode(['status' => 'success']);
            } else { echo json_encode(['status' => 'error', 'message' => 'No ID']); }
        }
    }
} catch (Exception $e) {
    if (ob_get_level() > 0) ob_clean();
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
ob_end_flush();
?>
