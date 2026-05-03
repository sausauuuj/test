<?php
declare(strict_types=1);

require_once __DIR__ . '/../../bootstrap.php';

use App\Core\Response;
use App\Core\ValidationException;
use App\Services\InventoryService;
use App\Support\Logger;

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        Response::error('Method not allowed.', 405);
    }

    $payload = request_data();
    $service = new InventoryService();
    $movement = $service->deleteStockOutMovement((int) ($payload['movement_id'] ?? $payload['id'] ?? 0));

    Response::success([
        'movement' => $movement,
    ], 'Stock out record deleted successfully.');
} catch (ValidationException $exception) {
    Response::error($exception->getMessage(), 422, $exception->errors());
} catch (Throwable $exception) {
    Logger::error('Unable to delete stock out record.', [
        'exception' => $exception->getMessage(),
    ]);

    Response::error('Unable to delete the stock out record right now.', 500);
}
