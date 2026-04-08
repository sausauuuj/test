<?php
declare(strict_types=1);

namespace App\Core;

use PDO;
use PDOException;

final class SchemaManager
{
    public static function ensure(PDO $db): void
    {
        self::ensureDivisionSeeds($db);
        self::ensureOfficerCodes($db);
        self::ensureParDocumentType($db);
        self::ensureAssetUsefulLife($db);
        self::ensureInventoryTables($db);
    }

    private static function ensureDivisionSeeds(PDO $db): void
    {
        $db->exec(
            "INSERT INTO divisions (code, label, sort_order) VALUES
                ('ORD', 'ORD (Office of the Regional Director)', 1),
                ('FAD', 'FAD (Finance and Administrative Division)', 2),
                ('PDIPBD', 'PDIPBD (Project Development, Investment Programming, and Budgeting Division)', 3),
                ('PFPD', 'PFPD (Policy Formulation and Planning Division)', 4),
                ('PMED', 'PMED (Project Monitoring and Evaluation Division)', 5),
                ('DRD', 'DRD (Development Research Division)', 6),
                ('COA', 'COA (Commission on Audit)', 7)
             ON DUPLICATE KEY UPDATE
                label = VALUES(label),
                sort_order = VALUES(sort_order)"
        );
    }

    private static function ensureOfficerCodes(PDO $db): void
    {
        if (!self::columnExists($db, 'accountable_officers', 'officer_code')) {
            $db->exec(
                'ALTER TABLE accountable_officers
                 ADD COLUMN officer_code VARCHAR(40) NULL AFTER officer_id'
            );
        }

        if (!self::indexExists($db, 'accountable_officers', 'uniq_officer_code')) {
            $db->exec(
                'ALTER TABLE accountable_officers
                 ADD UNIQUE KEY uniq_officer_code (officer_code)'
            );
        }

        $statement = $db->query(
            'SELECT
                ao.officer_id,
                ao.officer_code,
                d.code AS division_code
             FROM accountable_officers ao
             INNER JOIN divisions d ON d.division_id = ao.division_id
             ORDER BY d.code ASC, ao.created_at ASC, ao.officer_id ASC'
        );
        $officers = $statement->fetchAll();

        if ($officers === []) {
            return;
        }

        $sequences = [];
        $update = $db->prepare(
            'UPDATE accountable_officers
             SET officer_code = :officer_code
             WHERE officer_id = :officer_id'
        );

        foreach ($officers as $officer) {
            $divisionCode = strtoupper(trim((string) ($officer['division_code'] ?? '')));

            if ($divisionCode === '') {
                continue;
            }

            if (!array_key_exists($divisionCode, $sequences)) {
                $sequences[$divisionCode] = 1;
            }

            $expectedCode = sprintf('AO_%s_%02d', $divisionCode, $sequences[$divisionCode]);
            $currentCode = trim((string) ($officer['officer_code'] ?? ''));

            if ($currentCode !== $expectedCode) {
                $update->execute([
                    'officer_code' => $expectedCode,
                    'officer_id' => (int) ($officer['officer_id'] ?? 0),
                ]);
            }

            $sequences[$divisionCode]++;
        }
    }

    private static function ensureParDocumentType(PDO $db): void
    {
        if (!self::columnExists($db, 'par', 'document_type')) {
            $db->exec(
                "ALTER TABLE par
                 ADD COLUMN document_type VARCHAR(10) NOT NULL DEFAULT 'PAR' AFTER par_date"
            );
        }

        if (!self::indexExists($db, 'par', 'idx_par_accountable_officer')) {
            $db->exec(
                'ALTER TABLE par
                 ADD INDEX idx_par_accountable_officer (accountable_officer_id)'
            );
        }

        if (!self::indexExists($db, 'par', 'uniq_par_officer_date_type')) {
            $db->exec(
                'ALTER TABLE par
                 ADD UNIQUE KEY uniq_par_officer_date_type (accountable_officer_id, par_date, document_type)'
            );
        }

        if (self::indexExists($db, 'par', 'uniq_par_officer_date')) {
            $db->exec('ALTER TABLE par DROP INDEX uniq_par_officer_date');
        }

        self::syncParDocumentTypesFromAssets($db);
        self::normalizeAssetDocumentAssignments($db);
        self::syncParDocumentTypesFromAssets($db);
        self::normalizeParNumbers($db);
        self::cleanupUnusedParRecords($db);
    }

    private static function ensureAssetUsefulLife(PDO $db): void
    {
        if (self::columnExists($db, 'assets', 'estimated_useful_life')) {
            return;
        }

        $db->exec(
            'ALTER TABLE assets
             ADD COLUMN estimated_useful_life VARCHAR(60) NULL AFTER date_acquired'
        );
    }

    private static function ensureInventoryTables(PDO $db): void
    {
        $db->exec(
            'CREATE TABLE IF NOT EXISTS inventory_items (
                inventory_item_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                item_code VARCHAR(40) NOT NULL UNIQUE,
                item_name VARCHAR(180) NOT NULL,
                item_type VARCHAR(30) NOT NULL,
                unit VARCHAR(60) NOT NULL,
                current_stock INT UNSIGNED NOT NULL DEFAULT 0,
                stock_limit INT UNSIGNED NOT NULL DEFAULT 0,
                low_stock_threshold INT UNSIGNED NOT NULL DEFAULT 0,
                description TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_inventory_items_name (item_name),
                INDEX idx_inventory_items_type (item_type),
                INDEX idx_inventory_items_stock (current_stock)
            ) ENGINE=InnoDB'
        );

        $db->exec(
            'CREATE TABLE IF NOT EXISTS inventory_movements (
                movement_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                inventory_item_id INT UNSIGNED NOT NULL,
                movement_type VARCHAR(20) NOT NULL,
                quantity INT UNSIGNED NOT NULL,
                previous_stock INT UNSIGNED NOT NULL DEFAULT 0,
                current_stock INT UNSIGNED NOT NULL DEFAULT 0,
                notes TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_inventory_movements_item (inventory_item_id),
                INDEX idx_inventory_movements_type (movement_type),
                CONSTRAINT fk_inventory_movements_item
                    FOREIGN KEY (inventory_item_id)
                    REFERENCES inventory_items(inventory_item_id)
                    ON UPDATE CASCADE
                    ON DELETE CASCADE
            ) ENGINE=InnoDB'
        );
    }

    private static function syncParDocumentTypesFromAssets(PDO $db): void
    {
        $db->exec(
            "UPDATE par p
             INNER JOIN (
                SELECT
                    a.par_id,
                    SUM(CASE WHEN UPPER(c.code) = 'PPE' THEN 1 ELSE 0 END) AS ppe_count,
                    SUM(CASE WHEN UPPER(c.code) = 'SEMI' THEN 1 ELSE 0 END) AS semi_count
                FROM assets a
                INNER JOIN classifications c ON c.classification_id = a.classification_id
                GROUP BY a.par_id
             ) usage_summary ON usage_summary.par_id = p.par_id
             SET p.document_type = CASE
                 WHEN usage_summary.ppe_count = 0 AND usage_summary.semi_count > 0 THEN 'ICS'
                 ELSE 'PAR'
             END"
        );
    }

    private static function normalizeAssetDocumentAssignments(PDO $db): void
    {
        $statement = $db->query(
            "SELECT
                a.id,
                a.par_id,
                p.accountable_officer_id,
                p.par_date,
                p.document_type,
                UPPER(c.code) AS classification
             FROM assets a
             INNER JOIN par p ON p.par_id = a.par_id
             INNER JOIN classifications c ON c.classification_id = a.classification_id
             ORDER BY a.id ASC"
        );

        $assets = $statement->fetchAll();

        if ($assets === []) {
            return;
        }

        $updateStatement = $db->prepare(
            'UPDATE assets
             SET par_id = :par_id
             WHERE id = :asset_id'
        );

        foreach ($assets as $asset) {
            $desiredType = strtoupper((string) ($asset['classification'] ?? '')) === 'SEMI' ? 'ICS' : 'PAR';
            $currentType = strtoupper(trim((string) ($asset['document_type'] ?? 'PAR')));

            if ($currentType === $desiredType) {
                continue;
            }

            $targetParId = self::findOrCreateDocumentRecord(
                $db,
                (int) ($asset['accountable_officer_id'] ?? 0),
                (string) ($asset['par_date'] ?? ''),
                $desiredType
            );

            if ($targetParId === (int) ($asset['par_id'] ?? 0)) {
                continue;
            }

            $updateStatement->execute([
                'par_id' => $targetParId,
                'asset_id' => (int) ($asset['id'] ?? 0),
            ]);
        }
    }

    private static function findOrCreateDocumentRecord(PDO $db, int $officerId, string $parDate, string $documentType): int
    {
        $lookup = $db->prepare(
            'SELECT par_id
             FROM par
             WHERE accountable_officer_id = :accountable_officer_id
               AND par_date = :par_date
               AND document_type = :document_type
             LIMIT 1'
        );
        $lookup->execute([
            'accountable_officer_id' => $officerId,
            'par_date' => $parDate,
            'document_type' => $documentType,
        ]);

        $existingId = (int) $lookup->fetchColumn();

        if ($existingId > 0) {
            return $existingId;
        }

        $insert = $db->prepare(
            'INSERT INTO par (par_number, accountable_officer_id, par_date, document_type, remarks)
             VALUES (:par_number, :accountable_officer_id, :par_date, :document_type, NULL)'
        );
        $insert->execute([
            'par_number' => self::nextDocumentNumber($db, $parDate, $documentType),
            'accountable_officer_id' => $officerId,
            'par_date' => $parDate,
            'document_type' => $documentType,
        ]);

        return (int) $db->lastInsertId();
    }

    private static function nextDocumentNumber(PDO $db, string $parDate, string $documentType): string
    {
        $year = date('Y', strtotime($parDate));
        $prefix = $documentType . '-' . $year . '-';
        $statement = $db->prepare(
            'SELECT par_number
             FROM par
             WHERE document_type = :document_type
               AND par_number LIKE :prefix
             ORDER BY par_number DESC
             LIMIT 1'
        );
        $statement->execute([
            'document_type' => $documentType,
            'prefix' => $prefix . '%',
        ]);

        $lastNumber = (string) $statement->fetchColumn();
        $sequence = 1;

        if (preg_match('/-(\d{3})$/', $lastNumber, $matches) === 1) {
            $sequence = ((int) $matches[1]) + 1;
        }

        return sprintf('%s%03d', $prefix, $sequence);
    }

    private static function normalizeParNumbers(PDO $db): void
    {
        $statement = $db->query(
            'SELECT par_id, par_number, par_date, document_type
             FROM par
             ORDER BY par_date ASC, par_id ASC'
        );
        $rows = $statement->fetchAll();

        if ($rows === []) {
            return;
        }

        $usedNumbers = [];
        foreach ($rows as $row) {
            $number = trim((string) ($row['par_number'] ?? ''));
            if ($number !== '') {
                $usedNumbers[$number] = (int) ($row['par_id'] ?? 0);
            }
        }

        $update = $db->prepare(
            'UPDATE par
             SET par_number = :par_number
             WHERE par_id = :par_id'
        );

        foreach ($rows as $row) {
            $parId = (int) ($row['par_id'] ?? 0);
            $currentNumber = trim((string) ($row['par_number'] ?? ''));
            $documentType = strtoupper(trim((string) ($row['document_type'] ?? 'PAR')));
            $year = date('Y', strtotime((string) ($row['par_date'] ?? 'now')));
            $prefix = $documentType . '-' . $year . '-';

            if ($currentNumber !== '' && str_starts_with($currentNumber, $prefix)) {
                continue;
            }

            $sequence = 1;
            if (preg_match('/-(\d{3})$/', $currentNumber, $matches) === 1) {
                $sequence = max(1, (int) $matches[1]);
            }

            $candidate = sprintf('%s%03d', $prefix, $sequence);
            while (isset($usedNumbers[$candidate]) && $usedNumbers[$candidate] !== $parId) {
                $sequence++;
                $candidate = sprintf('%s%03d', $prefix, $sequence);
            }

            if ($currentNumber !== '' && isset($usedNumbers[$currentNumber]) && $usedNumbers[$currentNumber] === $parId) {
                unset($usedNumbers[$currentNumber]);
            }

            $update->execute([
                'par_number' => $candidate,
                'par_id' => $parId,
            ]);
            $usedNumbers[$candidate] = $parId;
        }
    }

    private static function cleanupUnusedParRecords(PDO $db): void
    {
        $db->exec(
            'DELETE p
             FROM par p
             LEFT JOIN assets a ON a.par_id = p.par_id
             WHERE a.id IS NULL'
        );
    }

    private static function columnExists(PDO $db, string $table, string $column): bool
    {
        $statement = $db->prepare(
            'SELECT COUNT(*)
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = :table_name
               AND COLUMN_NAME = :column_name'
        );
        $statement->execute([
            'table_name' => $table,
            'column_name' => $column,
        ]);

        return (int) $statement->fetchColumn() > 0;
    }

    private static function indexExists(PDO $db, string $table, string $index): bool
    {
        $statement = $db->prepare(
            'SELECT COUNT(*)
             FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = :table_name
               AND INDEX_NAME = :index_name'
        );
        $statement->execute([
            'table_name' => $table,
            'index_name' => $index,
        ]);

        return (int) $statement->fetchColumn() > 0;
    }
}
