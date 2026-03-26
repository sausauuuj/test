<?php
declare(strict_types=1);

namespace App\Services;

use App\Core\Database;
use App\Core\ValidationException;
use PDO;

final class OfficerService
{
    public const DIVISIONS = [
        'FAD',
        'PDIPBD',
        'PFPD',
        'PMED',
        'DRD',
    ];

    private PDO $db;

    public function __construct(?PDO $connection = null)
    {
        $this->db = $connection ?? Database::connection();
    }

    public function listAll(): array
    {
        $statement = $this->db->query(
            'SELECT officer_id, name, division, created_at
             FROM accountable_officers
             ORDER BY name ASC'
        );

        return $statement->fetchAll();
    }

    public function filterByDivision(string $division): array
    {
        $division = trim($division);

        if ($division === '') {
            throw new ValidationException('Division is required.', [
                'division' => 'Choose a division from the list.',
            ]);
        }

        if (!in_array($division, self::DIVISIONS, true)) {
            throw new ValidationException('Choose a division from the list.', [
                'division' => 'Choose a division from the list.',
            ]);
        }

        $statement = $this->db->prepare(
            'SELECT officer_id, name, division, created_at
             FROM accountable_officers
             WHERE division = :division
             ORDER BY name ASC'
        );
        $statement->execute(['division' => $division]);

        return $statement->fetchAll();
    }

    public function findById(int $officerId): ?array
    {
        $statement = $this->db->prepare(
            'SELECT officer_id, name, division
             FROM accountable_officers
             WHERE officer_id = :officer_id
             LIMIT 1'
        );
        $statement->execute(['officer_id' => $officerId]);

        $officer = $statement->fetch();

        return $officer ?: null;
    }

    public function findByNameAndDivision(string $name, string $division): ?array
    {
        $statement = $this->db->prepare(
            'SELECT officer_id, name, division
             FROM accountable_officers
             WHERE name = :name
               AND division = :division
             LIMIT 1'
        );
        $statement->execute([
            'name' => trim($name),
            'division' => trim($division),
        ]);

        $officer = $statement->fetch();

        return $officer ?: null;
    }

    public function findOrCreate(string $name, string $division): array
    {
        $existing = $this->findByNameAndDivision($name, $division);

        if ($existing !== null) {
            return $existing;
        }

        return $this->create([
            'name' => $name,
            'division' => $division,
        ]);
    }

    public function create(array $payload): array
    {
        $errors = [];
        $name = trim((string) ($payload['name'] ?? ''));
        $division = trim((string) ($payload['division'] ?? ''));

        if ($name === '') {
            $errors['name'] = 'Officer name is required.';
        }

        if ($division === '') {
            $errors['division'] = 'Division is required.';
        } elseif (!in_array($division, self::DIVISIONS, true)) {
            $errors['division'] = 'Choose a division from the list.';
        }

        if ($errors !== []) {
            throw new ValidationException('Please complete the officer form.', $errors);
        }

        $existing = $this->findByNameAndDivision($name, $division);

        if ($existing !== null) {
            return $existing;
        }

        $statement = $this->db->prepare(
            'INSERT INTO accountable_officers (name, division)
             VALUES (:name, :division)'
        );
        $statement->execute([
            'name' => $name,
            'division' => $division,
        ]);

        return $this->findById((int) $this->db->lastInsertId()) ?? [];
    }
}
