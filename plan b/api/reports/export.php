<?php
declare(strict_types=1);

require_once __DIR__ . '/../../bootstrap.php';

use App\Core\ValidationException;
use App\Services\ReportService;
use App\Support\Logger;

try {
    $service = new ReportService();
    $export = $service->exportCsv(request_data());

    header('Content-Type: text/csv; charset=UTF-8');
    header('Content-Disposition: attachment; filename="' . ($export['filename'] ?? 'PAR_report.csv') . '"');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

    echo $export['content'] ?? '';
    exit;
} catch (ValidationException $exception) {
    http_response_code(422);
    header('Content-Type: text/plain; charset=UTF-8');
    echo $exception->getMessage();
    exit;
} catch (Throwable $exception) {
    Logger::error('Unable to export report CSV.', [
        'exception' => $exception->getMessage(),
    ]);

    http_response_code(500);
    header('Content-Type: text/plain; charset=UTF-8');
    echo 'Unable to export the report right now.';
    exit;
}
