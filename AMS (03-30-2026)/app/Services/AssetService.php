<?php
declare(strict_types=1);

namespace App\Services;

use App\Core\Database;
use App\Core\ValidationException;
use App\Support\Logger;
use PDO;
use Throwable;

final class AssetService
{
    private const CATEGORY_THRESHOLD = 50000.0;

    public const CLASSIFICATIONS = ['PPE', 'SEMI'];
    public const FUNDING_SOURCES = ['NEDA/DEPDev IX', 'RDC'];
    public const PROPERTY_TYPES = [
        'Computer Software',
        'Fixed Asset',
        'Furniture and Fixtures',
        'ICT Equipment',
        'Medicine Inventory',
        'Motor Vehicle',
        'Office Equipment',
    ];
    private const PROPERTY_TYPE_CODES = [
        'Computer Software' => 'CS',
        'Fixed Asset' => 'FA',
        'Furniture and Fixtures' => 'FF',
        'ICT Equipment' => 'ICT',
        'Medicine Inventory' => 'MI',
        'Motor Vehicle' => 'MV',
        'Office Equipment' => 'OE',
    ];
    public const CONDITIONS = ['Good', 'Serviceable', 'Needs Repair', 'Unserviceable'];

    private PDO $db;
    private ParService $parService;
    private OfficerService $officerService;

    public function __construct(?PDO $connection = null)
    {
        $this->db = $connection ?? Database::connection();
        $this->parService = new ParService($this->db);
        $this->officerService = new OfficerService($this->db);
    }

    public function normalizeFilters(array $filters): array
    {
        return [
            'par_number' => trim((string) ($filters['par_number'] ?? '')),
            'officer_name' => trim((string) ($filters['officer_name'] ?? '')),
            'division' => trim((string) ($filters['division'] ?? '')),
            'property_name' => trim((string) ($filters['property_name'] ?? '')),
            'property_type' => trim((string) ($filters['property_type'] ?? '')),
            'funding_source' => trim((string) ($filters['funding_source'] ?? '')),
            'classification' => strtoupper(trim((string) ($filters['classification'] ?? ''))),
            'date_from' => trim((string) ($filters['date_from'] ?? '')),
            'date_to' => trim((string) ($filters['date_to'] ?? '')),
            'officer_id' => (int) ($filters['officer_id'] ?? 0),
        ];
    }

    public function buildWhereClause(array $filters, string $assetAlias = 'a', string $parAlias = 'p'): array
    {
        $filters = $this->normalizeFilters($filters);
        $where = [];
        $params = [];

        if ($filters['par_number'] !== '') {
            $where[] = sprintf('%s.par_number LIKE :par_number', $parAlias);
            $params['par_number'] = '%' . $filters['par_number'] . '%';
        }

        if ($filters['officer_name'] !== '') {
            $where[] = 'ao.name LIKE :officer_name';
            $params['officer_name'] = '%' . $filters['officer_name'] . '%';
        }

        if ($filters['division'] !== '') {
            $where[] = 'ao.division = :division';
            $params['division'] = $filters['division'];
        }

        if ($filters['property_name'] !== '') {
            $where[] = sprintf('%s.property_name LIKE :property_name', $assetAlias);
            $params['property_name'] = '%' . $filters['property_name'] . '%';
        }

        if ($filters['property_type'] !== '') {
            $where[] = sprintf('%s.property_type LIKE :property_type', $assetAlias);
            $params['property_type'] = '%' . $filters['property_type'] . '%';
        }

        if ($filters['funding_source'] !== '') {
            $where[] = sprintf('%s.funding_source = :funding_source', $assetAlias);
            $params['funding_source'] = $filters['funding_source'];
        }

        if ($filters['classification'] !== '') {
            $where[] = sprintf('UPPER(%s.classification) = :classification', $assetAlias);
            $params['classification'] = $filters['classification'];
        }

        if ($filters['date_from'] !== '') {
            $where[] = sprintf('%s.date_acquired >= :date_from', $assetAlias);
            $params['date_from'] = $filters['date_from'];
        }

        if ($filters['date_to'] !== '') {
            $where[] = sprintf('%s.date_acquired <= :date_to', $assetAlias);
            $params['date_to'] = $filters['date_to'];
        }

        if ($filters['officer_id'] > 0) {
            $where[] = sprintf('%s.accountable_officer_id = :officer_id', $parAlias);
            $params['officer_id'] = $filters['officer_id'];
        }

        return [
            $where === [] ? '' : ' WHERE ' . implode(' AND ', $where),
            $params,
        ];
    }
    public function listFiltered(array $filters = [], int $limit = 250): array
    {
        [$whereClause, $params] = $this->buildWhereClause($filters);

        $statement = $this->db->prepare(
            'SELECT
                a.id,
                a.property_id,
                a.property_number,
                a.property_name,
                a.property_type,
                a.unit_cost,
                a.quantity,
                a.description,
                a.date_acquired,
                a.current_condition,
                a.remarks,
                a.funding_source,
                a.classification,
                a.bulk_reference,
                p.par_id,
                p.par_number,
                p.par_date,
                ao.officer_id,
                ao.name AS officer_name,
                ao.position AS officer_position,
                ao.unit AS officer_unit,
                ao.division
             FROM assets a
             INNER JOIN par p ON p.par_id = a.par_id
             INNER JOIN accountable_officers ao ON ao.officer_id = p.accountable_officer_id' .
             $whereClause .
             ' ORDER BY a.date_acquired DESC, a.id DESC
               LIMIT ' . (int) $limit
        );
        $statement->execute($params);

        return $statement->fetchAll();
    }

    public function getFilterOptions(): array
    {
        return [
            'property_types' => self::PROPERTY_TYPES,
            'funding_sources' => self::FUNDING_SOURCES,
            'classifications' => self::CLASSIFICATIONS,
            'conditions' => self::CONDITIONS,
            'divisions' => OfficerService::DIVISIONS,
        ];
    }

    public function dashboardMetrics(array $filters = []): array
    {
        [$whereClause, $params] = $this->buildWhereClause($filters);

        $statement = $this->db->prepare(
            'SELECT
                COUNT(*) AS total_assets,
                COALESCE(SUM(a.unit_cost), 0) AS total_value,
                COUNT(DISTINCT a.par_id) AS total_pars,
                COUNT(DISTINCT p.accountable_officer_id) AS total_officers,
                SUM(CASE WHEN a.classification = \'PPE\' THEN 1 ELSE 0 END) AS ppe_items,
                SUM(CASE WHEN UPPER(a.classification) = \'SEMI\' THEN 1 ELSE 0 END) AS semi_items
             FROM assets a
             INNER JOIN par p ON p.par_id = a.par_id
             INNER JOIN accountable_officers ao ON ao.officer_id = p.accountable_officer_id' .
             $whereClause
        );
        $statement->execute($params);

        $metrics = $statement->fetch() ?: [
            'total_assets' => 0,
            'total_value' => 0,
            'total_pars' => 0,
            'total_officers' => 0,
            'ppe_items' => 0,
            'semi_items' => 0,
        ];

        return [
            'total_assets' => (int) $metrics['total_assets'],
            'total_value' => (float) $metrics['total_value'],
            'total_pars' => (int) $metrics['total_pars'],
            'total_officers' => (int) $metrics['total_officers'],
            'ppe_items' => (int) $metrics['ppe_items'],
            'semi_items' => (int) $metrics['semi_items'],
        ];
    }

    public function addBulk(array $payload): array
    {
        $payload = $this->validateAssetPayload($payload);
        $createdAssets = [];
        $bulkReference = 'BULK-' . date('YmdHis') . '-' . random_int(100, 999);

        try {
            $this->db->beginTransaction();

            $officer = $this->resolveOfficer($payload);
            $par = $this->parService->getOrCreate(
                (int) $officer['officer_id'],
                $payload['par_date'],
                null,
                $this->db
            );

            $insertStatement = $this->db->prepare(
                'INSERT INTO assets (
                    property_id,
                    property_number,
                    property_name,
                    property_type,
                    unit_cost,
                    quantity,
                    description,
                    date_acquired,
                    current_condition,
                    remarks,
                    par_id,
                    funding_source,
                    classification,
                    bulk_reference
                 ) VALUES (
                    :property_id,
                    :property_number,
                    :property_name,
                    :property_type,
                    :unit_cost,
                    :quantity,
                    :description,
                    :date_acquired,
                    :current_condition,
                    :remarks,
                    :par_id,
                    :funding_source,
                    :classification,
                    :bulk_reference
                 )'
            );

            $propertyNumberPrefix = $this->buildPropertyNumberPrefix(
                $payload['classification'],
                $payload['property_type'],
                $payload['property_name']
            );
            $nextPropertyNumberSequence = $this->nextPropertyNumberSequence($propertyNumberPrefix);
            $sharedSemiPropertyNumber = $payload['classification'] === 'SEMI'
                ? $this->buildPropertyNumber($propertyNumberPrefix, $nextPropertyNumberSequence)
                : null;

            foreach ($payload['property_ids'] as $index => $propertyId) {
                $insertStatement->execute([
                    'property_id' => $propertyId,
                    'property_number' => $sharedSemiPropertyNumber
                        ?? $this->buildPropertyNumber($propertyNumberPrefix, $nextPropertyNumberSequence + $index),
                    'property_name' => $payload['property_name'],
                    'property_type' => $payload['property_type'],
                    'unit_cost' => $payload['unit_cost'],
                    'quantity' => 1,
                    'description' => $payload['description'],
                    'date_acquired' => $payload['date_acquired'],
                    'current_condition' => $payload['current_condition'],
                    'remarks' => $payload['remarks'],
                    'par_id' => $par['par_id'],
                    'funding_source' => $payload['funding_source'],
                    'classification' => $payload['classification'],
                    'bulk_reference' => $bulkReference,
                ]);

                $asset = $this->findById((int) $this->db->lastInsertId());

                if ($asset !== null) {
                    $createdAssets[] = $asset;
                }
            }

            $this->db->commit();

            return [
                'par' => $par,
                'bulk_reference' => $bulkReference,
                'property_ids' => $payload['property_ids'],
                'assets' => $createdAssets,
            ];
        } catch (Throwable $throwable) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }

            Logger::error('Asset bulk creation failed.', [
                'exception' => $throwable->getMessage(),
                'payload' => $payload,
            ]);

            throw $throwable;
        }
    }

    public function update(int $assetId, array $payload): array
    {
        return $this->updateStatus($assetId, $payload);
    }

    public function updateStatus(int $assetId, array $payload): array
    {
        $existingAsset = $this->findById($assetId);

        if ($existingAsset === null) {
            throw new ValidationException('The selected asset could not be found.', [
                'id' => 'Pick a valid asset record.',
            ]);
        }

        $condition = trim((string) ($payload['current_condition'] ?? ''));
        $remarks = trim((string) ($payload['remarks'] ?? ''));
        $errors = [];

        if ($condition === '') {
            $errors['current_condition'] = 'Current condition is required.';
        } elseif (!in_array($condition, self::CONDITIONS, true)) {
            $errors['current_condition'] = 'Choose a valid condition.';
        }

        if ($errors !== []) {
            throw new ValidationException('Please review the asset update.', $errors);
        }

        $statement = $this->db->prepare(
            'UPDATE assets
             SET current_condition = :current_condition,
                 remarks = :remarks
             WHERE id = :id'
        );
        $statement->execute([
            'id' => $assetId,
            'current_condition' => $condition,
            'remarks' => $remarks,
        ]);

        return $this->findById($assetId) ?? [];
    }

    public function delete(int $assetId): void
    {
        $existingAsset = $this->findById($assetId);

        if ($existingAsset === null) {
            throw new ValidationException('The selected asset could not be found.', [
                'id' => 'Pick a valid asset record.',
            ]);
        }

        try {
            $this->db->beginTransaction();

            $statement = $this->db->prepare('DELETE FROM assets WHERE id = :id');
            $statement->execute(['id' => $assetId]);

            $this->parService->cleanupIfUnused((int) $existingAsset['par_id'], $this->db);

            $this->db->commit();
        } catch (Throwable $throwable) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }

            Logger::error('Asset deletion failed.', [
                'asset_id' => $assetId,
                'exception' => $throwable->getMessage(),
            ]);

            throw $throwable;
        }
    }

    public function findById(int $assetId): ?array
    {
        $statement = $this->db->prepare(
            'SELECT
                a.id,
                a.property_id,
                a.property_number,
                a.property_name,
                a.property_type,
                a.unit_cost,
                a.quantity,
                a.description,
                a.date_acquired,
                a.current_condition,
                a.remarks,
                a.funding_source,
                a.classification,
                a.bulk_reference,
                p.par_id,
                p.par_number,
                p.par_date,
                ao.officer_id,
                ao.name AS officer_name,
                ao.position AS officer_position,
                ao.unit AS officer_unit,
                ao.division
             FROM assets a
             INNER JOIN par p ON p.par_id = a.par_id
             INNER JOIN accountable_officers ao ON ao.officer_id = p.accountable_officer_id
             WHERE a.id = :id
             LIMIT 1'
        );
        $statement->execute(['id' => $assetId]);

        $asset = $statement->fetch();

        return $asset ?: null;
    }

    private function resolveOfficer(array $payload): array
    {
        if ((int) $payload['officer_id'] > 0) {
            $officer = $this->officerService->findById((int) $payload['officer_id']);

            if ($officer === null) {
                throw new ValidationException('The selected accountable officer does not exist.', [
                    'officer_name' => 'Choose or enter a valid accountable officer.',
                ]);
            }

            $selectedDivision = trim((string) ($payload['division'] ?? ''));

            if ($selectedDivision !== '' && $selectedDivision !== (string) ($officer['division'] ?? '')) {
                throw new ValidationException('The selected accountable officer does not match the chosen division.', [
                    'division' => 'Choose an accountable officer under the selected division.',
                    'officer_id' => 'Choose an accountable officer under the selected division.',
                ]);
            }

            return $officer;
        }

        return $this->officerService->findOrCreate(
            $payload['officer_name'],
            $payload['division'],
            trim((string) ($payload['officer_position'] ?? '')),
            trim((string) ($payload['officer_unit'] ?? ''))
        );
    }

    private function validateAssetPayload(array $payload, bool $isUpdate = false): array
    {
        $rawPropertyIds = $payload['property_ids'] ?? [];

        if (!is_array($rawPropertyIds)) {
            $rawPropertyIds = [$rawPropertyIds];
        }

        $normalizedPropertyIds = array_values(array_map(
            static fn ($value): string => trim((string) $value),
            $rawPropertyIds
        ));

        $data = [
            'officer_id' => (int) ($payload['officer_id'] ?? 0),
            'officer_name' => trim((string) ($payload['officer_name'] ?? '')),
            'division' => trim((string) ($payload['division'] ?? '')),
            'par_date' => trim((string) ($payload['par_date'] ?? ($payload['date_acquired'] ?? ''))),
            'property_id' => trim((string) ($payload['property_id'] ?? '')),
            'property_ids' => $normalizedPropertyIds,
            'property_name' => trim((string) ($payload['property_name'] ?? '')),
            'property_type' => trim((string) ($payload['property_type'] ?? '')),
            'unit_cost' => $this->normalizeCurrency($payload['unit_cost'] ?? 0),
            'quantity' => $isUpdate ? 1 : (int) ($payload['quantity'] ?? 0),
            'description' => trim((string) ($payload['description'] ?? '')),
            'date_acquired' => trim((string) ($payload['date_acquired'] ?? '')),
            'current_condition' => trim((string) ($payload['current_condition'] ?? 'Good')),
            'remarks' => trim((string) ($payload['remarks'] ?? '')),
            'funding_source' => trim((string) ($payload['funding_source'] ?? '')),
            'classification' => strtoupper(trim((string) ($payload['classification'] ?? ''))),
        ];

        if (!$isUpdate && $data['quantity'] === 1 && $data['property_id'] !== '' && $data['property_ids'] === []) {
            $data['property_ids'] = [$data['property_id']];
        }

        $errors = [];

        if ($data['officer_id'] <= 0 && $data['officer_name'] === '') {
            $errors['officer_id'] = 'Choose an accountable officer registered under the selected division.';
        }

        if ($data['division'] !== '' && !in_array($data['division'], OfficerService::DIVISIONS, true)) {
            $errors['division'] = 'Choose a division from the list.';
        } elseif ($data['officer_id'] <= 0 && $data['division'] === '') {
            $errors['division'] = 'Division is required.';
        }

        if ($data['par_date'] === '' || strtotime($data['par_date']) === false) {
            $errors['date_acquired'] = 'A valid date acquired is required.';
        }

        if ($data['property_name'] === '') {
            $errors['property_name'] = 'Property name is required.';
        }

        if (!in_array($data['property_type'], self::PROPERTY_TYPES, true)) {
            $errors['property_type'] = 'Choose a valid property type.';
        }

        if ($data['unit_cost'] <= 0) {
            $errors['unit_cost'] = 'Unit cost must be greater than zero.';
        }

        if ($data['unit_cost'] > 0) {
            $derivedClassification = $this->deriveClassificationFromUnitCost($data['unit_cost']);

            if ($data['classification'] === '') {
                $data['classification'] = $derivedClassification;
            } elseif ($data['classification'] !== $derivedClassification) {
                $errors['classification'] = sprintf(
                    'Classification follows the individual unit cost. This item should be %s.',
                    $derivedClassification
                );
            }
        }

        if ($data['classification'] === 'PPE' && $data['unit_cost'] < self::CATEGORY_THRESHOLD) {
            $errors['unit_cost'] = 'PPE assets must be valued at PHP 50,000 or above per individual item.';
        }

        if ($data['classification'] === 'SEMI' && $data['unit_cost'] >= self::CATEGORY_THRESHOLD) {
            $errors['unit_cost'] = 'SEMI assets must be valued below PHP 50,000 per individual item.';
        }
        if (!$isUpdate && $data['quantity'] <= 0) {
            $errors['quantity'] = 'Quantity must be at least one.';
        }

        if ($data['description'] === '') {
            $errors['description'] = 'Description is required.';
        }

        if ($data['date_acquired'] === '' || strtotime($data['date_acquired']) === false) {
            $errors['date_acquired'] = 'A valid date acquired is required.';
        }

        if (!in_array($data['funding_source'], self::FUNDING_SOURCES, true)) {
            $errors['funding_source'] = 'Choose a valid funding source.';
        }

        if (!in_array($data['classification'], self::CLASSIFICATIONS, true)) {
            $errors['classification'] = 'Choose a valid classification.';
        }

        if (!in_array($data['current_condition'], self::CONDITIONS, true)) {
            $errors['current_condition'] = 'Choose a valid current condition.';
        }

        if (!$isUpdate) {
            $errors += $this->validatePropertyIds($data['property_ids'], $data['quantity']);
        }

        if ($errors !== []) {
            throw new ValidationException('Please review the asset form.', $errors);
        }

        return $data;
    }

    private function validatePropertyIds(array $propertyIds, int $quantity): array
    {
        $errors = [];

        if (count($propertyIds) !== $quantity) {
            $errors['property_ids'] = sprintf('Enter %d unique serial number%s.', $quantity, $quantity === 1 ? '' : 's');
            return $errors;
        }

        $seen = [];

        foreach ($propertyIds as $index => $propertyId) {
            $fieldKey = sprintf('property_ids.%d', $index);

            if ($propertyId === '') {
                $errors[$fieldKey] = 'Serial number is required.';
                continue;
            }

            if (isset($seen[$propertyId])) {
                $errors[$fieldKey] = 'Duplicate serial number entered. Each item must have a unique Property ID.';
                continue;
            }

            if ($this->propertyIdExists($propertyId)) {
                $errors[$fieldKey] = 'Serial number already exists in the inventory.';
                continue;
            }

            $seen[$propertyId] = true;
        }

        return $errors;
    }

    private function propertyIdExists(string $propertyId): bool
    {
        $statement = $this->db->prepare(
            'SELECT COUNT(*)
             FROM assets
             WHERE property_id = :property_id'
        );
        $statement->execute(['property_id' => $propertyId]);

        return (int) $statement->fetchColumn() > 0;
    }

    private function normalizeCurrency(mixed $value): float
    {
        if (is_string($value)) {
            $value = str_replace([',', ' '], '', $value);
        }

        return (float) $value;
    }

    private function deriveClassificationFromUnitCost(float $unitCost): string
    {
        return $unitCost >= self::CATEGORY_THRESHOLD ? 'PPE' : 'SEMI';
    }

    private function buildPropertyNumberPrefix(string $classification, string $propertyType, string $propertyName): string
    {
        $typeCode = $this->buildPropertyTypeCode($propertyType);

        if ($classification === 'PPE') {
            return $typeCode . '-' . $this->buildPropertyNameCode($propertyName);
        }

        return 'SEMI-' . $typeCode;
    }

    private function buildPropertyTypeCode(string $propertyType): string
    {
        if (isset(self::PROPERTY_TYPE_CODES[$propertyType])) {
            return self::PROPERTY_TYPE_CODES[$propertyType];
        }

        $words = preg_split('/[^A-Z0-9]+/', strtoupper($propertyType), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $acronym = implode('', array_map(static fn (string $word): string => substr($word, 0, 1), array_slice($words, 0, 3)));

        return $acronym !== '' ? $acronym : 'GEN';
    }

    private function buildPropertyNameCode(string $propertyName): string
    {
        $words = preg_split('/[^A-Z0-9]+/', strtoupper($propertyName), -1, PREG_SPLIT_NO_EMPTY) ?: [];

        if (count($words) >= 2) {
            return substr($words[0], 0, 1) . substr($words[1], 0, 1);
        }

        if ($words !== []) {
            return $this->buildSingleWordPropertyNameCode($words[0]);
        }

        return 'IT';
    }

    private function buildSingleWordPropertyNameCode(string $word): string
    {
        $characters = str_split(preg_replace('/[^A-Z0-9]/', '', strtoupper($word)) ?: '');

        if ($characters === []) {
            return 'IT';
        }

        $code = array_shift($characters);

        foreach ($characters as $character) {
            if (!in_array($character, ['A', 'E', 'I', 'O', 'U'], true)) {
                $code .= $character;
                break;
            }
        }

        if (strlen($code) < 2 && isset($characters[0])) {
            $code .= $characters[0];
        }

        return str_pad(substr($code, 0, 2), 2, 'X');
    }

    private function nextPropertyNumberSequence(string $prefix): int
    {
        $statement = $this->db->prepare(
            'SELECT property_number
             FROM assets
             WHERE property_number LIKE :pattern'
        );
        $statement->execute([
            'pattern' => $prefix . '-%'
        ]);

        $maxSequence = 0;

        foreach ($statement->fetchAll(PDO::FETCH_COLUMN) as $propertyNumber) {
            if (preg_match('/-(\d+)$/', (string) $propertyNumber, $matches) !== 1) {
                continue;
            }

            $maxSequence = max($maxSequence, (int) $matches[1]);
        }

        return $maxSequence + 1;
    }

    private function buildPropertyNumber(string $prefix, int $sequence): string
    {
        return sprintf('%s-%03d', $prefix, $sequence);
    }
}
