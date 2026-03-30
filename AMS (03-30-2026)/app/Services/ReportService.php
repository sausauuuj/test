<?php
declare(strict_types=1);

namespace App\Services;

use App\Core\ValidationException;

final class ReportService
{
    private const ENTITY_NAME = 'Department of Economy, Planning, and Development IX';
    private const PAR_ISSUED_BY_NAME = 'Kristy R. Mante';

    private AssetService $assetService;
    private OfficerService $officerService;
    private ?array $issuedByProfile = null;

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

    public function exportSpreadsheet(array $filters = []): array
    {
        $filters = $this->prepareParFilters($filters);
        $assets = $this->assetService->listFiltered($filters, 3000);
        $sheets = $this->groupAssetsByPar($assets);

        return [
            'filename' => $this->buildSpreadsheetFilename($sheets),
            'content' => $this->renderParSpreadsheetWorkbook($sheets),
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
            $parDate = (string) ($asset['par_date'] ?? '');
            $groupKey = implode('|', [
                trim((string) ($asset['officer_name'] ?? '')),
                $parDate,
            ]);

            if (!isset($groups[$groupKey])) {
                $groups[$groupKey] = [
                    'par_number' => (string) ($asset['par_number'] ?? 'PAR'),
                    'par_date' => $parDate,
                    'officer_name' => (string) ($asset['officer_name'] ?? ''),
                    'officer_position' => (string) ($asset['officer_position'] ?? ''),
                    'officer_unit' => (string) ($asset['officer_unit'] ?? ''),
                    'division' => (string) ($asset['division'] ?? ''),
                    'funding_source' => (string) ($asset['funding_source'] ?? ''),
                    'has_ppe' => false,
                    'has_semi' => false,
                    'items' => [],
                    'total_amount' => 0.0,
                ];
            }

            $classification = strtoupper(trim((string) ($asset['classification'] ?? '')));
            $groups[$groupKey]['items'][] = $asset;
            $groups[$groupKey]['total_amount'] += (float) ($asset['unit_cost'] ?? 0);
            $groups[$groupKey]['has_ppe'] = $groups[$groupKey]['has_ppe'] || $classification === 'PPE';
            $groups[$groupKey]['has_semi'] = $groups[$groupKey]['has_semi'] || $classification === 'SEMI';
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
        $html .= '<td class="par-sheet-table__meta-label">PAR Date :</td>';
        $html .= '<td class="par-sheet-table__meta-value">' . escape_html($this->formatLongDate((string) ($sheet['par_date'] ?? ''))) . '</td>';
        $html .= '</tr>';
        $html .= '<tr>';
        $html .= '<th class="par-sheet-table__head">Quantity</th>';
        $html .= '<th class="par-sheet-table__head">Unit</th>';
        $html .= '<th class="par-sheet-table__head">Description</th>';
        $html .= '<th class="par-sheet-table__head">' . $this->buildSheetReferenceHeadingHtml($sheet) . '</th>';
        $html .= '<th class="par-sheet-table__head">Date<br>Acquired</th>';
        $html .= '<th class="par-sheet-table__head">Amount</th>';
        $html .= '</tr>';

        foreach ($sheet['items'] as $asset) {
            $html .= '<tr>';
            $html .= '<td class="par-sheet-table__cell par-sheet-table__cell--center">' . escape_html((string) ((int) ($asset['quantity'] ?? 1) ?: 1)) . '</td>';
            $html .= '<td class="par-sheet-table__cell par-sheet-table__cell--center">unit</td>';
            $html .= '<td class="par-sheet-table__cell"><div class="par-sheet-table__description">' . nl2br(escape_html($this->buildAssetDescription($asset))) . '</div></td>';
            $html .= '<td class="par-sheet-table__cell par-sheet-table__cell--center">' . escape_html((string) ($asset['property_number'] ?? '')) . '</td>';
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
        $profile = $this->resolveSignatureProfile($sheet, $mode);
        $date = $this->formatLongDate((string) ($sheet['par_date'] ?? ''));
        $caption = $mode === 'issued'
            ? 'Signature over Printed Name of Issuing Officer'
            : 'Signature over Printed Name of Accountable Officer';

        $html = '<div class="par-sheet-signature">';
        $html .= '<div class="par-sheet-signature__line"></div>';
        $html .= '<div class="par-sheet-signature__name">' . escape_html($profile['name']) . '</div>';
        $html .= '<div class="par-sheet-signature__caption">' . escape_html($caption) . '</div>';
        $html .= '<div class="par-sheet-signature__role">' . nl2br(escape_html($profile['role'])) . '</div>';
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
            $receivedProfile = $this->resolveSignatureProfile($sheet, 'received');
            $issuedProfile = $this->resolveSignatureProfile($sheet, 'issued');
            fputcsv($stream, ['', '', 'PROPERTY ACKNOWLEDGMENT RECEIPT', '', '', ''], ',', '"', '\\');
            fputcsv($stream, [], ',', '"', '\\');
            fputcsv($stream, ['Entity Name :', self::ENTITY_NAME, '', '', 'PAR No. :', $this->formatParNumberForSheet((string) $sheet['par_number'])], ',', '"', '\\');
            fputcsv($stream, ['Fund Cluster:', (string) ($sheet['funding_source'] ?? ''), '', '', 'PAR Date :', $this->formatLongDate((string) ($sheet['par_date'] ?? ''))], ',', '"', '\\');
            fputcsv($stream, ['Quantity', 'Unit', 'Description', $this->buildSheetReferenceHeadingCsv($sheet), 'Date Acquired', 'Amount'], ',', '"', '\\');

            foreach ($sheet['items'] as $asset) {
                fputcsv($stream, [
                    (string) ((int) ($asset['quantity'] ?? 1) ?: 1),
                    'unit',
                    $this->buildAssetDescription($asset),
                    (string) ($asset['property_number'] ?? ''),
                    $this->formatAcquiredStamp($asset),
                    number_format((float) ($asset['unit_cost'] ?? 0), 2),
                ], ',', '"', '\\');
            }

            fputcsv($stream, ['Received by:', '', '', 'Issued by:', '', ''], ',', '"', '\\');
            fputcsv($stream, ['', $receivedProfile['name'], '', '', $issuedProfile['name'], ''], ',', '"', '\\');
            fputcsv($stream, ['', 'Signature over Printed Name of Accountable Officer', '', '', 'Signature over Printed Name of Issuing Officer', ''], ',', '"', '\\');
            fputcsv($stream, ['', $receivedProfile['role'], '', '', $issuedProfile['role'], ''], ',', '"', '\\');
            fputcsv($stream, ['', 'Position/Office', '', '', 'Position/Office', ''], ',', '"', '\\');
            fputcsv($stream, ['', $this->formatLongDate((string) ($sheet['par_date'] ?? '')), '', '', $this->formatLongDate((string) ($sheet['par_date'] ?? '')), ''], ',', '"', '\\');
            fputcsv($stream, ['', 'Date', '', '', 'Date', ''], ',', '"', '\\');

            if ($index < count($sheets) - 1) {
                fputcsv($stream, [], ',', '"', '\\');
                fputcsv($stream, [], ',', '"', '\\');
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
            trim((string) ($asset['property_id'] ?? '')) !== ''
                ? 'Serial No.: ' . trim((string) ($asset['property_id'] ?? ''))
                : '',
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

    private function buildSpreadsheetFilename(array $sheets): string
    {
        if ($sheets !== []) {
            $firstPar = $this->formatParNumberForSheet((string) ($sheets[0]['par_number'] ?? 'PAR'));
            return 'PAR_' . preg_replace('/[^A-Za-z0-9_-]+/', '_', $firstPar) . '.xls';
        }

        return 'PAR_report_' . date('Ymd_His') . '.xls';
    }

    private function renderParSpreadsheetWorkbook(array $sheets): string
    {
        $xml = [];
        $xml[] = '<?xml version="1.0" encoding="UTF-8"?>';
        $xml[] = '<?mso-application progid="Excel.Sheet"?>';
        $xml[] = '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"';
        $xml[] = ' xmlns:o="urn:schemas-microsoft-com:office:office"';
        $xml[] = ' xmlns:x="urn:schemas-microsoft-com:office:excel"';
        $xml[] = ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"';
        $xml[] = ' xmlns:html="http://www.w3.org/TR/REC-html40">';
        $xml[] = '<DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">';
        $xml[] = '<Author>Asset Management System</Author>';
        $xml[] = '<Created>' . gmdate('Y-m-d\TH:i:s\Z') . '</Created>';
        $xml[] = '</DocumentProperties>';
        $xml[] = '<ExcelWorkbook xmlns="urn:schemas-microsoft-com:office:excel">';
        $xml[] = '<ProtectStructure>False</ProtectStructure>';
        $xml[] = '<ProtectWindows>False</ProtectWindows>';
        $xml[] = '</ExcelWorkbook>';
        $xml[] = $this->renderSpreadsheetStylesXml();

        if ($sheets === []) {
            $xml[] = $this->renderEmptySpreadsheetWorksheetXml();
        } else {
            foreach ($sheets as $index => $sheet) {
                $xml[] = $this->renderSpreadsheetWorksheetXml($sheet, $index + 1);
            }
        }

        $xml[] = '</Workbook>';

        return implode('', $xml);
    }

    private function renderSpreadsheetStylesXml(): string
    {
        return '<Styles>'
            . '<Style ss:ID="Default" ss:Name="Normal">'
            . '<Alignment ss:Vertical="Center"/>'
            . '<Font ss:FontName="Tahoma" x:Family="Swiss" ss:Size="11"/>'
            . '</Style>'
            . '<Style ss:ID="Title">'
            . '<Alignment ss:Horizontal="Center" ss:Vertical="Center"/>'
            . '<Font ss:FontName="Tahoma" x:Family="Swiss" ss:Size="16" ss:Bold="1"/>'
            . '</Style>'
            . '<Style ss:ID="MetaText">'
            . '<Alignment ss:Vertical="Center" ss:WrapText="1"/>'
            . '<Font ss:FontName="Tahoma" x:Family="Swiss" ss:Size="11" ss:Bold="1"/>'
            . '</Style>'
            . '<Style ss:ID="MetaLabelCenter">'
            . '<Alignment ss:Horizontal="Center" ss:Vertical="Center"/>'
            . '<Font ss:FontName="Tahoma" x:Family="Swiss" ss:Size="11" ss:Bold="1"/>'
            . '</Style>'
            . '<Style ss:ID="MetaValueCenter">'
            . '<Alignment ss:Horizontal="Center" ss:Vertical="Center"/>'
            . '<Font ss:FontName="Tahoma" x:Family="Swiss" ss:Size="11" ss:Bold="1"/>'
            . '</Style>'
            . '<Style ss:ID="Header">'
            . '<Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>'
            . '<Borders>' . $this->spreadsheetAllBordersXml() . '</Borders>'
            . '<Font ss:FontName="Tahoma" x:Family="Swiss" ss:Size="11" ss:Bold="1"/>'
            . '<Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/>'
            . '</Style>'
            . '<Style ss:ID="CellCenter">'
            . '<Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>'
            . '<Borders>' . $this->spreadsheetAllBordersXml() . '</Borders>'
            . '<Font ss:FontName="Tahoma" x:Family="Swiss" ss:Size="11"/>'
            . '</Style>'
            . '<Style ss:ID="CellText">'
            . '<Alignment ss:Horizontal="Left" ss:Vertical="Top" ss:WrapText="1"/>'
            . '<Borders>' . $this->spreadsheetAllBordersXml() . '</Borders>'
            . '<Font ss:FontName="Tahoma" x:Family="Swiss" ss:Size="11"/>'
            . '</Style>'
            . '<Style ss:ID="CellAmount">'
            . '<Alignment ss:Horizontal="Right" ss:Vertical="Center"/>'
            . '<Borders>' . $this->spreadsheetAllBordersXml() . '</Borders>'
            . '<NumberFormat ss:Format="#,##0.00"/>'
            . '<Font ss:FontName="Tahoma" x:Family="Swiss" ss:Size="11"/>'
            . '</Style>'
            . '<Style ss:ID="SignatureLabel">'
            . '<Alignment ss:Horizontal="Left" ss:Vertical="Center"/>'
            . '<Font ss:FontName="Tahoma" x:Family="Swiss" ss:Size="11" ss:Bold="1"/>'
            . '</Style>'
            . '<Style ss:ID="SignatureLine">'
            . '<Borders>' . $this->spreadsheetBottomBorderXml() . '</Borders>'
            . '</Style>'
            . '<Style ss:ID="SignatureName">'
            . '<Alignment ss:Horizontal="Center" ss:Vertical="Center"/>'
            . '<Font ss:FontName="Tahoma" x:Family="Swiss" ss:Size="11" ss:Bold="1"/>'
            . '</Style>'
            . '<Style ss:ID="SignatureCaption">'
            . '<Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>'
            . '<Font ss:FontName="Tahoma" x:Family="Swiss" ss:Size="10" ss:Italic="1"/>'
            . '</Style>'
            . '<Style ss:ID="SignatureRole">'
            . '<Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>'
            . '<Font ss:FontName="Tahoma" x:Family="Swiss" ss:Size="11"/>'
            . '</Style>'
            . '<Style ss:ID="SignatureDate">'
            . '<Alignment ss:Horizontal="Center" ss:Vertical="Center"/>'
            . '<Font ss:FontName="Tahoma" x:Family="Swiss" ss:Size="11"/>'
            . '</Style>'
            . '<Style ss:ID="Note">'
            . '<Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>'
            . '<Font ss:FontName="Tahoma" x:Family="Swiss" ss:Size="12" ss:Bold="1"/>'
            . '</Style>'
            . '</Styles>';
    }

    private function renderEmptySpreadsheetWorksheetXml(): string
    {
        $rows = [
            $this->spreadsheetRowXml([
                $this->spreadsheetCellXml('PROPERTY ACKNOWLEDGMENT RECEIPT', 'Title', 'String', 5),
            ], 28),
            $this->spreadsheetRowXml([
                $this->spreadsheetCellXml('No PAR records matched the selected filters.', 'Note', 'String', 5),
            ], 24),
        ];

        return '<Worksheet ss:Name="PAR">'
            . '<Names><NamedRange ss:Name="Print_Area" ss:RefersTo="=\'PAR\'!R1C1:R2C6"/></Names>'
            . '<Table ss:ExpandedColumnCount="6" ss:ExpandedRowCount="2" x:FullColumns="1" x:FullRows="1" ss:DefaultRowHeight="18">'
            . $this->renderSpreadsheetColumnsXml()
            . implode('', $rows)
            . '</Table>'
            . $this->renderSpreadsheetWorksheetOptionsXml()
            . '</Worksheet>';
    }

    private function renderSpreadsheetWorksheetXml(array $sheet, int $sheetIndex): string
    {
        $sheetName = str_pad((string) $sheetIndex, 3, '0', STR_PAD_LEFT);
        $receivedProfile = $this->resolveSignatureProfile($sheet, 'received');
        $issuedProfile = $this->resolveSignatureProfile($sheet, 'issued');
        $rows = [];

        $rows[] = $this->spreadsheetRowXml([
            $this->spreadsheetCellXml('PROPERTY ACKNOWLEDGMENT RECEIPT', 'Title', 'String', 5),
        ], 30);
        $rows[] = $this->spreadsheetRowXml([
            $this->spreadsheetCellXml('Entity Name : ' . self::ENTITY_NAME, 'MetaText', 'String', 3),
            $this->spreadsheetCellXml('PAR No. :', 'MetaLabelCenter'),
            $this->spreadsheetCellXml($this->formatParNumberForSheet((string) ($sheet['par_number'] ?? 'PAR')), 'MetaValueCenter'),
        ], 20);
        $rows[] = $this->spreadsheetRowXml([
            $this->spreadsheetCellXml('Fund Cluster: ' . (string) ($sheet['funding_source'] ?? ''), 'MetaText', 'String', 3),
            $this->spreadsheetCellXml('PAR Date :', 'MetaLabelCenter'),
            $this->spreadsheetCellXml($this->formatLongDate((string) ($sheet['par_date'] ?? '')), 'MetaValueCenter'),
        ], 20);
        $rows[] = $this->spreadsheetRowXml([
            $this->spreadsheetCellXml('Quantity', 'Header'),
            $this->spreadsheetCellXml('Unit', 'Header'),
            $this->spreadsheetCellXml('Description', 'Header'),
            $this->spreadsheetCellXml($this->buildSheetReferenceHeadingCsv($sheet), 'Header'),
            $this->spreadsheetCellXml("Date\nAcquired", 'Header'),
            $this->spreadsheetCellXml('Amount', 'Header'),
        ], 28);

        foreach ($sheet['items'] as $asset) {
            $rows[] = $this->spreadsheetRowXml([
                $this->spreadsheetCellXml((string) ((int) ($asset['quantity'] ?? 1) ?: 1), 'CellCenter', 'Number'),
                $this->spreadsheetCellXml('unit', 'CellCenter'),
                $this->spreadsheetCellXml($this->buildAssetDescription($asset), 'CellText'),
                $this->spreadsheetCellXml((string) ($asset['property_number'] ?? ''), 'CellCenter'),
                $this->spreadsheetCellXml($this->formatAcquiredStamp($asset), 'CellCenter'),
                $this->spreadsheetCellXml(number_format((float) ($asset['unit_cost'] ?? 0), 2, '.', ''), 'CellAmount', 'Number'),
            ]);
        }

        $rows[] = $this->spreadsheetRowXml([
            $this->spreadsheetCellXml('Received by:', 'SignatureLabel', 'String', 2),
            $this->spreadsheetCellXml('Issued by:', 'SignatureLabel', 'String', 2),
        ], 20);
        $rows[] = $this->spreadsheetRowXml([
            $this->spreadsheetCellXml('', 'SignatureLine', 'String', 2),
            $this->spreadsheetCellXml('', 'SignatureLine', 'String', 2),
        ], 18);
        $rows[] = $this->spreadsheetRowXml([
            $this->spreadsheetCellXml($receivedProfile['name'], 'SignatureName', 'String', 2),
            $this->spreadsheetCellXml($issuedProfile['name'], 'SignatureName', 'String', 2),
        ], 20);
        $rows[] = $this->spreadsheetRowXml([
            $this->spreadsheetCellXml('Signature over Printed Name of Accountable Officer', 'SignatureCaption', 'String', 2),
            $this->spreadsheetCellXml('Signature over Printed Name of Issuing Officer', 'SignatureCaption', 'String', 2),
        ], 18);
        $rows[] = $this->spreadsheetRowXml([
            $this->spreadsheetCellXml($receivedProfile['role'], 'SignatureRole', 'String', 2),
            $this->spreadsheetCellXml($issuedProfile['role'], 'SignatureRole', 'String', 2),
        ]);
        $rows[] = $this->spreadsheetRowXml([
            $this->spreadsheetCellXml('Position/Office', 'SignatureCaption', 'String', 2),
            $this->spreadsheetCellXml('Position/Office', 'SignatureCaption', 'String', 2),
        ], 18);
        $rows[] = $this->spreadsheetRowXml([
            $this->spreadsheetCellXml($this->formatLongDate((string) ($sheet['par_date'] ?? '')), 'SignatureDate', 'String', 2),
            $this->spreadsheetCellXml($this->formatLongDate((string) ($sheet['par_date'] ?? '')), 'SignatureDate', 'String', 2),
        ], 18);
        $rows[] = $this->spreadsheetRowXml([
            $this->spreadsheetCellXml('Date', 'SignatureCaption', 'String', 2),
            $this->spreadsheetCellXml('Date', 'SignatureCaption', 'String', 2),
        ], 18);

        $rowCount = count($rows);

        return '<Worksheet ss:Name="' . $this->spreadsheetXmlEscape($sheetName) . '">'
            . '<Names><NamedRange ss:Name="Print_Area" ss:RefersTo="=\'' . $this->spreadsheetXmlEscape($sheetName) . '\'!R1C1:R' . $rowCount . 'C6"/></Names>'
            . '<Table ss:ExpandedColumnCount="6" ss:ExpandedRowCount="' . $rowCount . '" x:FullColumns="1" x:FullRows="1" ss:DefaultRowHeight="18">'
            . $this->renderSpreadsheetColumnsXml()
            . implode('', $rows)
            . '</Table>'
            . $this->renderSpreadsheetWorksheetOptionsXml()
            . '</Worksheet>';
    }

    private function renderSpreadsheetColumnsXml(): string
    {
        return '<Column ss:AutoFitWidth="0" ss:Width="58"/>'
            . '<Column ss:AutoFitWidth="0" ss:Width="52"/>'
            . '<Column ss:AutoFitWidth="0" ss:Width="420"/>'
            . '<Column ss:AutoFitWidth="0" ss:Width="128"/>'
            . '<Column ss:AutoFitWidth="0" ss:Width="112"/>'
            . '<Column ss:AutoFitWidth="0" ss:Width="110"/>';
    }

    private function renderSpreadsheetWorksheetOptionsXml(): string
    {
        return '<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">'
            . '<PageSetup>'
            . '<Layout x:Orientation="Landscape"/>'
            . '<Header x:Margin="0.15"/>'
            . '<Footer x:Margin="0.15"/>'
            . '<PageMargins x:Bottom="0.3" x:Left="0.25" x:Right="0.25" x:Top="0.3"/>'
            . '</PageSetup>'
            . '<FitToPage/>'
            . '<Print>'
            . '<ValidPrinterInfo/>'
            . '<PaperSizeIndex>9</PaperSizeIndex>'
            . '<FitWidth>1</FitWidth>'
            . '<FitHeight>0</FitHeight>'
            . '<HorizontalResolution>600</HorizontalResolution>'
            . '<VerticalResolution>600</VerticalResolution>'
            . '</Print>'
            . '<Zoom>90</Zoom>'
            . '<ProtectObjects>False</ProtectObjects>'
            . '<ProtectScenarios>False</ProtectScenarios>'
            . '</WorksheetOptions>';
    }

    private function spreadsheetRowXml(array $cells, ?float $height = null): string
    {
        $attributes = ' ss:AutoFitHeight="' . ($height === null ? '1' : '0') . '"';

        if ($height !== null) {
            $attributes .= ' ss:Height="' . rtrim(rtrim(sprintf('%.2F', $height), '0'), '.') . '"';
        }

        return '<Row' . $attributes . '>' . implode('', $cells) . '</Row>';
    }

    private function spreadsheetCellXml(
        string $value,
        string $styleId,
        string $type = 'String',
        int $mergeAcross = 0
    ): string {
        $attributes = ' ss:StyleID="' . $this->spreadsheetXmlEscape($styleId) . '"';

        if ($mergeAcross > 0) {
            $attributes .= ' ss:MergeAcross="' . $mergeAcross . '"';
        }

        if ($value === '') {
            return '<Cell' . $attributes . '/>';
        }

        return '<Cell' . $attributes . '><Data ss:Type="' . $this->spreadsheetXmlEscape($type) . '">'
            . $this->spreadsheetXmlEscape($value)
            . '</Data></Cell>';
    }

    private function spreadsheetAllBordersXml(): string
    {
        return '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>'
            . '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>'
            . '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>'
            . '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>';
    }

    private function spreadsheetBottomBorderXml(): string
    {
        return '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>';
    }

    private function spreadsheetXmlEscape(string $value): string
    {
        return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
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

    private function buildOfficerOfficeLabel(array $sheet): string
    {
        $parts = array_values(array_filter([
            $this->normalizeOfficerProfilePart($sheet['officer_position'] ?? ''),
            $this->normalizeOfficerProfilePart($sheet['officer_unit'] ?? ''),
            $this->normalizeOfficerProfilePart($sheet['division'] ?? ''),
        ], static fn (string $value): bool => $value !== ''));

        if ($parts === []) {
            return '';
        }

        if (count($parts) === 1) {
            return $parts[0];
        }

        return $parts[0] . "\n" . implode(' | ', array_slice($parts, 1));
    }

    private function resolveSignatureProfile(array $sheet, string $mode): array
    {
        if ($mode === 'issued') {
            return $this->resolveIssuedByProfile();
        }

        return [
            'name' => (string) ($sheet['officer_name'] ?? ''),
            'role' => $this->buildOfficerOfficeLabel($sheet),
        ];
    }

    private function resolveIssuedByProfile(): array
    {
        if ($this->issuedByProfile !== null) {
            return $this->issuedByProfile;
        }

        $officer = $this->officerService->findByName(self::PAR_ISSUED_BY_NAME);

        if ($officer === null) {
            $this->issuedByProfile = [
                'name' => self::PAR_ISSUED_BY_NAME,
                'role' => '',
            ];

            return $this->issuedByProfile;
        }

        $this->issuedByProfile = [
            'name' => (string) ($officer['name'] ?? self::PAR_ISSUED_BY_NAME),
            'role' => $this->buildOfficerOfficeLabel([
                'officer_position' => (string) ($officer['position'] ?? ''),
                'officer_unit' => (string) ($officer['unit'] ?? ''),
                'division' => (string) ($officer['division'] ?? ''),
            ]),
        ];

        return $this->issuedByProfile;
    }

    private function buildSheetReferenceHeadingHtml(array $sheet): string
    {
        if (!empty($sheet['has_semi']) && empty($sheet['has_ppe'])) {
            return 'Stock<br>No.';
        }

        if (!empty($sheet['has_semi']) && !empty($sheet['has_ppe'])) {
            return 'Property /<br>Stock No.';
        }

        return 'Property<br>Number';
    }

    private function buildSheetReferenceHeadingCsv(array $sheet): string
    {
        if (!empty($sheet['has_semi']) && empty($sheet['has_ppe'])) {
            return 'Stock No.';
        }

        if (!empty($sheet['has_semi']) && !empty($sheet['has_ppe'])) {
            return 'Property / Stock No.';
        }

        return 'Property Number';
    }

    private function normalizeOfficerProfilePart(mixed $value): string
    {
        $normalized = trim((string) $value);

        if (in_array($normalized, ['', '-', '--', '---', 'N/A', 'NA'], true)) {
            return '';
        }

        return $normalized;
    }
}
