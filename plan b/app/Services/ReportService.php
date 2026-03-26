<?php
declare(strict_types=1);

namespace App\Services;

use App\Core\ValidationException;

final class ReportService
{
    private const ENTITY_NAME = 'Department of Economy, Planning, and Development IX';

    private AssetService $assetService;
    private OfficerService $officerService;

    public function __construct(?AssetService $assetService = null)
    {
        $this->assetService = $assetService ?? new AssetService();
        $this->officerService = new OfficerService();
    }

    public function generate(array $filters = []): array
    {
        $filters = $this->prepareParFilters($filters);
        return $this->generateParReport($filters);
    }

    public function exportCsv(array $filters = []): array
    {
        $filters = $this->prepareParFilters($filters);
        $assets = $this->assetService->listFiltered($filters, 3000);
        $sheets = $this->groupAssetsByPar($assets);

        return [
            'filename' => $this->buildCsvFilename($sheets),
            'content' => $this->renderParCsv($sheets),
        ];
    }

    private function generateParReport(array $filters): array
    {
        $assets = $this->assetService->listFiltered($filters, 3000);
        $sheets = $this->groupAssetsByPar($assets);
        $sheetCount = count($sheets);
        $recordCount = count($assets);

        return [
            'count' => $sheetCount,
            'record_count' => $recordCount,
            'meta_label' => sprintf(
                '%d PAR sheet%s | %d asset line%s',
                $sheetCount,
                $sheetCount === 1 ? '' : 's',
                $recordCount,
                $recordCount === 1 ? '' : 's'
            ),
            'html' => $this->renderParHtml($sheets, $filters),
        ];
    }

    private function groupAssetsByPar(array $assets): array
    {
        $groups = [];

        foreach ($assets as $asset) {
            $parNumber = (string) ($asset['par_number'] ?? 'PAR');

            if (!isset($groups[$parNumber])) {
                $groups[$parNumber] = [
                    'par_number' => $parNumber,
                    'par_date' => (string) ($asset['par_date'] ?? ''),
                    'officer_name' => (string) ($asset['officer_name'] ?? ''),
                    'division' => (string) ($asset['division'] ?? ''),
                    'funding_source' => (string) ($asset['funding_source'] ?? ''),
                    'classification' => (string) ($asset['classification'] ?? ''),
                    'items' => [],
                    'total_amount' => 0.0,
                ];
            }

            $groups[$parNumber]['items'][] = $asset;
            $groups[$parNumber]['total_amount'] += (float) ($asset['unit_cost'] ?? 0);
        }

        return array_values($groups);
    }

    private function renderParHtml(array $sheets, array $filters): string
    {
        if ($sheets === []) {
            return '<div class="report-empty-state">No PAR records matched the selected filters.</div>';
        }

        $html = '<div class="par-report-stack">';

        foreach ($sheets as $sheet) {
            $html .= $this->renderParSheet($sheet);
        }

        $html .= '</div>';
        return $html;
    }

    private function renderParSheet(array $sheet): string
    {
        $html = '<article class="par-report-page par-report-page--sheet">';
        $html .= '<table class="par-sheet-table">';
        $html .= '<colgroup>';
        $html .= '<col style="width:7%">';
        $html .= '<col style="width:6%">';
        $html .= '<col style="width:41%">';
        $html .= '<col style="width:15%">';
        $html .= '<col style="width:15%">';
        $html .= '<col style="width:16%">';
        $html .= '</colgroup>';
        $html .= '<tbody>';
        $html .= '<tr><td colspan="6" class="par-sheet-table__title">PROPERTY ACKNOWLEDGMENT RECEIPT</td></tr>';
        $html .= '<tr class="par-sheet-table__blank-row"><td></td><td></td><td></td><td></td><td></td><td></td></tr>';
        $html .= '<tr>';
        $html .= '<td colspan="4" class="par-sheet-table__meta"><strong>Entity Name :</strong> ' . escape_html(self::ENTITY_NAME) . '</td>';
        $html .= '<td class="par-sheet-table__meta-label">PAR No. :</td>';
        $html .= '<td class="par-sheet-table__meta-value">' . escape_html($this->formatParNumberForSheet((string) $sheet['par_number'])) . '</td>';
        $html .= '</tr>';
        $html .= '<tr>';
        $html .= '<td colspan="4" class="par-sheet-table__meta"><strong>Fund Cluster:</strong> <span class="par-sheet-table__line">' . escape_html((string) ($sheet['funding_source'] ?? '')) . '</span></td>';
        $html .= '<td></td>';
        $html .= '<td></td>';
        $html .= '</tr>';
        $html .= '<tr>';
        $html .= '<th class="par-sheet-table__head">Quantity</th>';
        $html .= '<th class="par-sheet-table__head">Unit</th>';
        $html .= '<th class="par-sheet-table__head">Description</th>';
        $html .= '<th class="par-sheet-table__head">Property<br>Number</th>';
        $html .= '<th class="par-sheet-table__head">Date<br>Acquired</th>';
        $html .= '<th class="par-sheet-table__head">Amount</th>';
        $html .= '</tr>';

        foreach ($sheet['items'] as $asset) {
            $html .= '<tr>';
            $html .= '<td class="par-sheet-table__cell par-sheet-table__cell--center">' . escape_html((string) ((int) ($asset['quantity'] ?? 1) ?: 1)) . '</td>';
            $html .= '<td class="par-sheet-table__cell par-sheet-table__cell--center">unit</td>';
            $html .= '<td class="par-sheet-table__cell"><div class="par-sheet-table__description">' . nl2br(escape_html($this->buildAssetDescription($asset))) . '</div></td>';
            $html .= '<td class="par-sheet-table__cell par-sheet-table__cell--center">' . escape_html((string) ($asset['property_id'] ?? '')) . '</td>';
            $html .= '<td class="par-sheet-table__cell par-sheet-table__cell--center">' . escape_html($this->formatAcquiredStamp($asset)) . '</td>';
            $html .= '<td class="par-sheet-table__cell par-sheet-table__cell--amount">' . escape_html(number_format((float) ($asset['unit_cost'] ?? 0), 2)) . '</td>';
            $html .= '</tr>';
        }

        $html .= '<tr>';
        $html .= '<td colspan="3" class="par-sheet-table__sign-label">Received by:</td>';
        $html .= '<td colspan="3" class="par-sheet-table__sign-label">Issued by:</td>';
        $html .= '</tr>';
        $html .= '<tr>';
        $html .= '<td colspan="3" class="par-sheet-table__signature-cell">' . $this->renderSignatureBlock($sheet, 'received') . '</td>';
        $html .= '<td colspan="3" class="par-sheet-table__signature-cell">' . $this->renderSignatureBlock($sheet, 'issued') . '</td>';
        $html .= '</tr>';
        $html .= '</tbody></table>';
        $html .= '</article>';

        return $html;
    }

    private function renderSignatureBlock(array $sheet, string $mode): string
    {
        $officerName = (string) ($sheet['officer_name'] ?? '');
        $division = (string) ($sheet['division'] ?? '');
        $date = $this->formatLongDate((string) ($sheet['par_date'] ?? ''));
        $caption = $mode === 'issued'
            ? 'Signature over Printed Name of Accountable Officer'
            : 'Signature over Printed Name of End User';

        $html = '<div class="par-sheet-signature">';
        $html .= '<div class="par-sheet-signature__line"></div>';
        $html .= '<div class="par-sheet-signature__name">' . escape_html($officerName) . '</div>';
        $html .= '<div class="par-sheet-signature__caption">' . escape_html($caption) . '</div>';
        $html .= '<div class="par-sheet-signature__role">' . escape_html($division) . '</div>';
        $html .= '<div class="par-sheet-signature__caption">Position/Office</div>';
        $html .= '<div class="par-sheet-signature__date">' . escape_html($date) . '</div>';
        $html .= '<div class="par-sheet-signature__caption">Date</div>';
        $html .= '</div>';

        return $html;
    }

    private function renderParCsv(array $sheets): string
    {
        $stream = fopen('php://temp', 'r+');

        if ($stream === false) {
            return '';
        }

        foreach ($sheets as $index => $sheet) {
            fputcsv($stream, ['', '', 'PROPERTY ACKNOWLEDGMENT RECEIPT', '', '', '']);
            fputcsv($stream, []);
            fputcsv($stream, ['Entity Name :', self::ENTITY_NAME, '', '', 'PAR No. :', $this->formatParNumberForSheet((string) $sheet['par_number'])]);
            fputcsv($stream, ['Fund Cluster:', (string) ($sheet['funding_source'] ?? ''), '', '', '', '']);
            fputcsv($stream, ['Quantity', 'Unit', 'Description', 'Property Number', 'Date Acquired', 'Amount']);

            foreach ($sheet['items'] as $asset) {
                fputcsv($stream, [
                    (string) ((int) ($asset['quantity'] ?? 1) ?: 1),
                    'unit',
                    $this->buildAssetDescription($asset),
                    (string) ($asset['property_id'] ?? ''),
                    $this->formatAcquiredStamp($asset),
                    number_format((float) ($asset['unit_cost'] ?? 0), 2),
                ]);
            }

            fputcsv($stream, ['Received by:', '', '', 'Issued by:', '', '']);
            fputcsv($stream, ['', (string) ($sheet['officer_name'] ?? ''), '', '', (string) ($sheet['officer_name'] ?? ''), '']);
            fputcsv($stream, ['', 'Signature over Printed Name of End User', '', '', 'Signature over Printed Name of Accountable Officer', '']);
            fputcsv($stream, ['', (string) ($sheet['division'] ?? ''), '', '', (string) ($sheet['division'] ?? ''), '']);
            fputcsv($stream, ['', 'Position/Office', '', '', 'Position/Office', '']);
            fputcsv($stream, ['', $this->formatLongDate((string) ($sheet['par_date'] ?? '')), '', '', $this->formatLongDate((string) ($sheet['par_date'] ?? '')), '']);
            fputcsv($stream, ['', 'Date', '', '', 'Date', '']);

            if ($index < count($sheets) - 1) {
                fputcsv($stream, []);
                fputcsv($stream, []);
            }
        }

        rewind($stream);
        $content = stream_get_contents($stream);
        fclose($stream);

        return $content === false ? '' : $content;
    }

    private function prepareParFilters(array $filters): array
    {
        $reportType = strtoupper(trim((string) ($filters['report_type'] ?? '')));
        $officerName = trim((string) ($filters['officer_name'] ?? ''));
        $officerId = (int) ($filters['officer_id'] ?? 0);

        if ($reportType === '') {
            throw new ValidationException('Select a report type first.', [
                'report_type' => 'Choose PAR, SPI, or ICS before generating a report.',
            ]);
        }

        if ($reportType !== 'PAR') {
            throw new ValidationException($reportType . ' report generation is not available yet.', [
                'report_type' => 'PAR is ready first. SPI and ICS will follow the same flow next.',
            ]);
        }

        if ($officerId <= 0 && $officerName === '') {
            throw new ValidationException('Select an accountable officer first.', [
                'officer_name' => 'Choose an accountable officer before generating the PAR report.',
            ]);
        }

        if ($officerName === '' && $officerId > 0) {
            $officer = $this->officerService->findById($officerId);

            if ($officer !== null) {
                $filters['officer_name'] = (string) ($officer['name'] ?? '');
                if (trim((string) ($filters['division'] ?? '')) === '') {
                    $filters['division'] = (string) ($officer['division'] ?? '');
                }
            }
        }

        return $filters;
    }

    private function buildAssetDescription(array $asset): string
    {
        $parts = array_filter([
            trim((string) ($asset['property_name'] ?? '')),
            trim((string) ($asset['description'] ?? '')),
        ], static fn (string $value): bool => $value !== '');

        return implode("\n", $parts);
    }

    private function formatParNumberForSheet(string $parNumber): string
    {
        return preg_replace('/^PAR-/', '', $parNumber) ?: $parNumber;
    }

    private function formatAcquiredStamp(array $asset): string
    {
        $fundingSource = strtoupper(trim((string) ($asset['funding_source'] ?? '')));
        $prefix = str_contains($fundingSource, 'RDC') ? 'RDC' : 'DEPDev';

        return trim($prefix . ' ' . $this->formatDate((string) ($asset['date_acquired'] ?? '')));
    }

    private function buildCsvFilename(array $sheets): string
    {
        if ($sheets !== []) {
            $firstPar = $this->formatParNumberForSheet((string) ($sheets[0]['par_number'] ?? 'PAR'));
            return 'PAR_' . preg_replace('/[^A-Za-z0-9_-]+/', '_', $firstPar) . '.csv';
        }

        return 'PAR_report_' . date('Ymd_His') . '.csv';
    }

    private function formatDate(string $value): string
    {
        if ($value === '' || strtotime($value) === false) {
            return $value;
        }

        return date('n/j/Y', strtotime($value));
    }

    private function formatLongDate(string $value): string
    {
        if ($value === '' || strtotime($value) === false) {
            return $value;
        }

        return date('F j, Y', strtotime($value));
    }
}
