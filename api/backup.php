<?php
// api/backup.php
require_once 'db.php';

try {
    $tables = [];
    $result = $conn->query("SHOW TABLES");
    while ($row = $result->fetch(PDO::FETCH_NUM)) {
        $tables[] = $row[0];
    }

    $sqlDump = "-- StockFlow Database Backup\n";
    $sqlDump .= "-- Date: " . date('Y-m-d H:i:s') . "\n\n";
    $sqlDump .= "SET FOREIGN_KEY_CHECKS=0;\n\n";

    foreach ($tables as $table) {
        // Drop table if exists
        $sqlDump .= "DROP TABLE IF EXISTS `$table`;\n";
        
        // Create table
        $res = $conn->query("SHOW CREATE TABLE `$table`")->fetch(PDO::FETCH_NUM);
        $sqlDump .= $res[1] . ";\n\n";

        // Insert data
        $res = $conn->query("SELECT * FROM `$table` ");
        while ($row = $res->fetch(PDO::FETCH_ASSOC)) {
            $keys = array_keys($row);
            $values = array_values($row);
            $sqlDump .= "INSERT INTO `$table` (`" . implode("`, `", $keys) . "`) VALUES (";
            $valArr = [];
            foreach ($values as $val) {
                if ($val === null) $valArr[] = "NULL";
                else $valArr[] = $conn->quote($val);
            }
            $sqlDump .= implode(", ", $valArr) . ");\n";
        }
        $sqlDump .= "\n";
    }

    $sqlDump .= "SET FOREIGN_KEY_CHECKS=1;\n";

    header('Content-Type: application/sql');
    header('Content-Disposition: attachment; filename="stockflow_backup_' . date('Y-m-d') . '.sql"');
    echo $sqlDump;

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
exit;
?>
