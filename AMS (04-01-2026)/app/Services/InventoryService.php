<?php
declare(strict_types=1);

namespace App\Services;

use App\Core\Database;
use App\Core\ValidationException;
use App\Support\Logger;
use PDO;
use Throwable;

final class InventoryService
{
    public const ITEM_TYPES = ['Supply', 'Material'];
    public const STATUS_LABELS = [
        'LOW' => 'Low Stock',
        'NEAR' => 'Near Low',
        'AT_LIMIT' => 'At Limit',
        'NORMAL' => 'In Stock',
    ];

    private PDO $db;

    public function __construct(?PDO $connection = null)
    {
        $this->db = $connection ?? Database::connection();
    }

    public function listItems(array $filters = [], int $limit = 250): array
    {
        $search = trim((string) ($filters['search'] ?? ''));
        $itemType = trim((string) ($filters['item_type'] ?? ''));
        $status = strtoupper(trim((string) ($filters['stock_status'] ?? '')));
        $where = [];
        $params = [];

        if ($search !== '') {
            $where[] = '(item_code LIKE :search OR item_name LIKE :search OR description LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        if ($itemType !== '') {
            $where[] = 'item_type = :item_type';
            $params['item_type'] = $itemType;
        }

        $statement = $this->db->prepare(
            'SELECT
                inventory_item_id,
                item_code,
                item_name,
                item_type,
                unit,
                current_stock,
                stock_limit,
                low_stock_threshold,
                description,
                created_at,
                updated_at
             FROM inventory_items' .
             ($where === [] ? '' : ' WHERE ' . implode(' AND ', $where)) .
             ' ORDER BY updated_at DESC, inventory_item_id DESC
               LIMIT ' . (int) $limit
        );
        $statement->execute($params);

        $items = array_map(fn (array $row): array => $this->hydrateItem($row), $statement->fetchAll());

        if ($status !== '' && isset(self::STATUS_LABELS[$status])) {
            $items = array_values(array_filter(
                $items,
                static fn (array $item): bool => strtoupper((string) ($item['stock_status_code'] ?? '')) === $status
            ));
        }

        return $items;
    }

    public function add(array $payload): array
    {
        $data = $this->validateItemPayload($payload);

        try {
            $this->db->beginTransaction();

            $statement = $this->db->prepare(
                'INSERT INTO inventory_items (
                    item_code,
                    item_name,
                    item_type,
                    unit,
                    current_stock,
                    stock_limit,
                    low_stock_threshold,
                    description
                 ) VALUES (
                    :item_code,
                    :item_name,
                    :item_type,
                    :unit,
                    :current_stock,
                    :stock_limit,
                    :low_stock_threshold,
                    :description
                 )'
            );
            $statement->execute([
                'item_code' => $this->nextItemCode(),
                'item_name' => $data['item_name'],
                'item_type' => $data['item_type'],
                'unit' => $data['unit'],
                'current_stock' => $data['current_stock'],
                'stock_limit' => $data['stock_limit'],
                'low_stock_threshold' => $data['low_stock_threshold'],
                'description' => $data['description'],
            ]);

            $itemId = (int) $this->db->lastInsertId();
            $item = $this->findById($itemId);

            if ($item === null) {
                throw new ValidationException('Unable to load the saved inventory item.');
            }

            $this->recordMovement(
                $itemId,
                'INITIAL',
                $data['current_stock'],
                0,
                $data['current_stock'],
                $data['movement_note'] !== '' ? $data['movement_note'] : 'Initial stock entry'
            );

            $this->db->commit();

            return $this->findById($itemId) ?? $item;
        } catch (Throwable $throwable) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }

            Logger::error('Unable to save inventory item.', [
                'exception' => $throwable->getMessage(),
                'payload' => $payload,
            ]);

            throw $throwable;
        }
    }

    public function update(int $itemId, array $payload): array
    {
        $existing = $this->findById($itemId);

        if ($existing === null) {
            throw new ValidationException('The selected inventory item could not be found.', [
                'inventory_item_id' => 'Choose a valid inventory item.',
            ]);
        }

        $data = $this->validateItemPayload($payload, false);

        if (!$this->hasItemChanges($existing, $data)) {
            throw new ValidationException('No changes were made to this inventory item.', [
                'inventory_item_id' => 'Update at least one field before saving.',
            ]);
        }

        $statement = $this->db->prepare(
            'UPDATE inventory_items
             SET item_name = :item_name,
                 item_type = :item_type,
                 unit = :unit,
                 stock_limit = :stock_limit,
                 low_stock_threshold = :low_stock_threshold,
                 description = :description
             WHERE inventory_item_id = :inventory_item_id'
        );
        $statement->execute([
            'item_name' => $data['item_name'],
            'item_type' => $data['item_type'],
            'unit' => $data['unit'],
            'stock_limit' => $data['stock_limit'],
            'low_stock_threshold' => $data['low_stock_threshold'],
            'description' => $data['description'],
            'inventory_item_id' => $itemId,
        ]);

        return $this->findById($itemId) ?? $existing;
    }

    public function adjustStock(int $itemId, array $payload): array
    {
        $item = $this->findById($itemId);

        if ($item === null) {
            throw new ValidationException('The selected inventory item could not be found.', [
                'inventory_item_id' => 'Choose a valid inventory item.',
            ]);
        }

        $movementType = strtoupper(trim((string) ($payload['movement_type'] ?? '')));
        $quantity = (int) ($payload['quantity'] ?? 0);
        $notes = trim((string) ($payload['notes'] ?? ''));
        $errors = [];

        if (!in_array($movementType, ['ADD', 'DEDUCT'], true)) {
            $errors['movement_type'] = 'Choose a valid stock action.';
        }

        if ($quantity <= 0) {
            $errors['quantity'] = 'Quantity must be at least 1.';
        }

        $currentStock = (int) ($item['current_stock'] ?? 0);
        $newStock = $movementType === 'DEDUCT'
            ? $currentStock - $quantity
            : $currentStock + $quantity;

        if ($movementType === 'DEDUCT' && $newStock < 0) {
            $errors['quantity'] = 'Stock deduction cannot reduce the balance below zero.';
        }

        if ($errors !== []) {
            throw new ValidationException('Please review the stock movement.', $errors);
        }

        try {
            $this->db->beginTransaction();

            $update = $this->db->prepare(
                'UPDATE inventory_items
                 SET current_stock = :current_stock
                 WHERE inventory_item_id = :inventory_item_id'
            );
            $update->execute([
                'current_stock' => $newStock,
                'inventory_item_id' => $itemId,
            ]);

            $this->recordMovement(
                $itemId,
                $movementType,
                $quantity,
                $currentStock,
                $newStock,
                $notes
            );

            $this->db->commit();

            return $this->findById($itemId) ?? $item;
        } catch (Throwable $throwable) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }

            Logger::error('Unable to adjust inventory stock.', [
                'inventory_item_id' => $itemId,
                'exception' => $throwable->getMessage(),
                'payload' => $payload,
            ]);

            throw $throwable;
        }
    }

    public function findById(int $itemId): ?array
    {
        $statement = $this->db->prepare(
            'SELECT
                inventory_item_id,
                item_code,
                item_name,
                item_type,
                unit,
                current_stock,
                stock_limit,
                low_stock_threshold,
                description,
                created_at,
                updated_at
             FROM inventory_items
             WHERE inventory_item_id = :inventory_item_id
             LIMIT 1'
        );
        $statement->execute([
            'inventory_item_id' => $itemId,
        ]);

        $item = $statement->fetch();

        return $item ? $this->hydrateItem($item) : null;
    }

    public function details(int $itemId): array
    {
        $item = $this->findById($itemId);

        if ($item === null) {
            throw new ValidationException('The selected inventory item could not be found.', [
                'inventory_item_id' => 'Choose a valid inventory item.',
            ]);
        }

        return [
            'item' => $item,
            'movements' => $this->listMovements($itemId),
        ];
    }

    public function listMovements(int $itemId, int $limit = 40): array
    {
        $statement = $this->db->prepare(
            'SELECT
                movement_id,
                inventory_item_id,
                movement_type,
                quantity,
                previous_stock,
                current_stock,
                notes,
                created_at
             FROM inventory_movements
             WHERE inventory_item_id = :inventory_item_id
             ORDER BY created_at DESC, movement_id DESC
             LIMIT ' . (int) $limit
        );
        $statement->execute([
            'inventory_item_id' => $itemId,
        ]);

        return $statement->fetchAll();
    }

    public function dashboardSummary(int $limit = 6): array
    {
        $items = $this->listItems([], 500);
        $watchlist = array_values(array_filter(
            $items,
            static fn (array $item): bool => in_array((string) ($item['stock_status_code'] ?? ''), ['LOW', 'NEAR'], true)
        ));

        usort($watchlist, static function (array $left, array $right): int {
            $priority = ['LOW' => 0, 'NEAR' => 1, 'AT_LIMIT' => 2, 'NORMAL' => 3];
            $leftPriority = $priority[(string) ($left['stock_status_code'] ?? 'NORMAL')] ?? 9;
            $rightPriority = $priority[(string) ($right['stock_status_code'] ?? 'NORMAL')] ?? 9;

            if ($leftPriority !== $rightPriority) {
                return $leftPriority <=> $rightPriority;
            }

            return ((int) ($left['current_stock'] ?? 0)) <=> ((int) ($right['current_stock'] ?? 0));
        });

        return [
            'total_items' => count($items),
            'low_stock_count' => count(array_filter($items, static fn (array $item): bool => ($item['stock_status_code'] ?? '') === 'LOW')),
            'near_low_count' => count(array_filter($items, static fn (array $item): bool => ($item['stock_status_code'] ?? '') === 'NEAR')),
            'at_limit_count' => count(array_filter($items, static fn (array $item): bool => ($item['stock_status_code'] ?? '') === 'AT_LIMIT')),
            'watchlist' => array_slice($watchlist, 0, $limit),
        ];
    }

    public function getFilterOptions(): array
    {
        return [
            'item_types' => self::ITEM_TYPES,
            'stock_statuses' => self::STATUS_LABELS,
        ];
    }

    private function validateItemPayload(array $payload, bool $allowCurrentStock = true): array
    {
        $data = [
            'item_name' => trim((string) ($payload['item_name'] ?? '')),
            'item_type' => trim((string) ($payload['item_type'] ?? '')),
            'unit' => trim((string) ($payload['unit'] ?? '')),
            'current_stock' => $allowCurrentStock ? (int) ($payload['current_stock'] ?? 0) : 0,
            'stock_limit' => (int) ($payload['stock_limit'] ?? 0),
            'low_stock_threshold' => (int) ($payload['low_stock_threshold'] ?? 0),
            'description' => trim((string) ($payload['description'] ?? '')),
            'movement_note' => trim((string) ($payload['movement_note'] ?? '')),
        ];
        $errors = [];

        if ($data['item_name'] === '') {
            $errors['item_name'] = 'Item name is required.';
        }

        if (!in_array($data['item_type'], self::ITEM_TYPES, true)) {
            $errors['item_type'] = 'Choose Supply or Material.';
        }

        if ($data['unit'] === '') {
            $errors['unit'] = 'Unit is required.';
        }

        if ($allowCurrentStock && $data['current_stock'] < 0) {
            $errors['current_stock'] = 'Current stock cannot be negative.';
        }

        if ($data['stock_limit'] <= 0) {
            $errors['stock_limit'] = 'Set a stock limit greater than zero.';
        }

        if ($data['low_stock_threshold'] < 0) {
            $errors['low_stock_threshold'] = 'Low stock threshold cannot be negative.';
        }

        if ($data['stock_limit'] > 0 && $data['low_stock_threshold'] >= $data['stock_limit']) {
            $errors['low_stock_threshold'] = 'Low stock threshold must stay below the stock limit.';
        }

        if ($allowCurrentStock && $data['current_stock'] > 0 && $data['stock_limit'] > 0 && $data['current_stock'] > $data['stock_limit']) {
            $errors['current_stock'] = 'Initial stock cannot exceed the stock limit.';
        }

        if ($errors !== []) {
            throw new ValidationException('Please review the inventory form.', $errors);
        }

        return $data;
    }

    private function hasItemChanges(array $existing, array $data): bool
    {
        return trim((string) ($existing['item_name'] ?? '')) !== $data['item_name']
            || trim((string) ($existing['item_type'] ?? '')) !== $data['item_type']
            || trim((string) ($existing['unit'] ?? '')) !== $data['unit']
            || (int) ($existing['stock_limit'] ?? 0) !== (int) $data['stock_limit']
            || (int) ($existing['low_stock_threshold'] ?? 0) !== (int) $data['low_stock_threshold']
            || trim((string) ($existing['description'] ?? '')) !== $data['description'];
    }

    private function nextItemCode(): string
    {
        $year = date('Y');
        $prefix = 'INV-' . $year . '-';
        $statement = $this->db->prepare(
            'SELECT item_code
             FROM inventory_items
             WHERE item_code LIKE :prefix
             ORDER BY item_code DESC
             LIMIT 1'
        );
        $statement->execute([
            'prefix' => $prefix . '%',
        ]);

        $lastCode = (string) $statement->fetchColumn();
        $sequence = 1;

        if (preg_match('/-(\d{3})$/', $lastCode, $matches) === 1) {
            $sequence = ((int) $matches[1]) + 1;
        }

        return sprintf('%s%03d', $prefix, $sequence);
    }

    private function recordMovement(
        int $itemId,
        string $movementType,
        int $quantity,
        int $previousStock,
        int $currentStock,
        string $notes
    ): void {
        $statement = $this->db->prepare(
            'INSERT INTO inventory_movements (
                inventory_item_id,
                movement_type,
                quantity,
                previous_stock,
                current_stock,
                notes
             ) VALUES (
                :inventory_item_id,
                :movement_type,
                :quantity,
                :previous_stock,
                :current_stock,
                :notes
             )'
        );
        $statement->execute([
            'inventory_item_id' => $itemId,
            'movement_type' => $movementType,
            'quantity' => $quantity,
            'previous_stock' => $previousStock,
            'current_stock' => $currentStock,
            'notes' => $notes,
        ]);
    }

    private function hydrateItem(array $item): array
    {
        $currentStock = (int) ($item['current_stock'] ?? 0);
        $stockLimit = (int) ($item['stock_limit'] ?? 0);
        $lowThreshold = (int) ($item['low_stock_threshold'] ?? 0);
        $statusCode = $this->statusCode($currentStock, $lowThreshold, $stockLimit);
        $statusLabel = self::STATUS_LABELS[$statusCode] ?? self::STATUS_LABELS['NORMAL'];

        $item['current_stock'] = $currentStock;
        $item['stock_limit'] = $stockLimit;
        $item['low_stock_threshold'] = $lowThreshold;
        $item['stock_status_code'] = $statusCode;
        $item['stock_status_label'] = $statusLabel;
        $item['stock_remark'] = match ($statusCode) {
            'LOW' => 'Stock is already at or below the low threshold.',
            'NEAR' => 'Stock is approaching the low threshold.',
            'AT_LIMIT' => 'Stock has reached the set count or limit.',
            default => 'Stock level is within the safe range.',
        };

        return $item;
    }

    private function statusCode(int $currentStock, int $lowThreshold, int $stockLimit): string
    {
        if ($stockLimit > 0 && $currentStock >= $stockLimit) {
            return 'AT_LIMIT';
        }

        if ($currentStock <= $lowThreshold) {
            return 'LOW';
        }

        $nearThreshold = $lowThreshold + max(2, (int) ceil(max($lowThreshold, 4) * 0.25));

        if ($currentStock <= $nearThreshold) {
            return 'NEAR';
        }

        return 'NORMAL';
    }
}
