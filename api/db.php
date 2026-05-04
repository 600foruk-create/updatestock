<?php
// api/db.php
$host = 'localhost'; // Usually localhost when running on Hostinger
$db_name = 'u245697138_stock';
$username = 'u245697138_stock';
$password = 'Seastone123@';

try {
    $conn = new PDO("mysql:host=" . $host . ";dbname=" . $db_name, $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    // Setting character set to utf8mb4 for full unicode support
    $conn->exec("set names utf8mb4");
} catch(PDOException $exception) {
    echo "Connection error: " . $exception->getMessage();
    exit;
}
?>
