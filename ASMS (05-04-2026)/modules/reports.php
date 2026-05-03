<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/_context.php';

$inventoryReportItems = $inventoryService->listItems([], 500);
$reportOfficers = $officerService->listAll();
$fundingSourceLabels = [
    'DEPDev' => 'DEPDev IX',
    'DEPDev IX' => 'DEPDev IX',
    'NEDA/DEPDev IX' => 'DEPDev IX',
    'NEDA' => 'DEPDev IX',
    'RDC' => 'RDC IX',
];

?>
<section id="reports" class="app-view" data-view="reports">
    <div class="view-scroll section-stack">
        <div class="section-head">
            <h2 class="section-title">Reports</h2>
        </div>

        <article class="reports-hero-shell">
            <div class="report-type-grid report-type-grid--feature">
                <button type="button" class="report-type-card" data-report-type="PAR_ICS">
                    <span class="report-type-card__icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M8 3.5h6l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5H8Z"></path>
                            <path d="M14 3.5V8h4"></path>
                            <path d="M9 11h6"></path>
                            <path d="M9 15h6"></path>
                        </svg>
                    </span>
                    <span class="report-type-card__code">PAR / ICS</span>
                    <span class="report-type-card__title">Property Acknowledgement / Inventory Custodian Slip</span>
                    <span class="report-type-card__cta">Generate
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="m9 6 6 6-6 6"></path>
                        </svg>
                    </span>
                </button>
                <button type="button" class="report-type-card" data-report-type="INVENTORY">
                    <span class="report-type-card__icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 6.5h16"></path>
                            <path d="M6.5 3.5h11A1.5 1.5 0 0 1 19 5v14a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5Z"></path>
                            <path d="M8 10h8"></path>
                            <path d="M8 14h8"></path>
                            <path d="M8 18h5"></path>
                        </svg>
                    </span>
                    <span class="report-type-card__code">Inventory</span>
                    <span class="report-type-card__title">Inventory and Supplies Issuance</span>
                    <span class="report-type-card__cta">Generate
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="m9 6 6 6-6 6"></path>
                        </svg>
                    </span>
                </button>
            </div>
        </article>

        <div id="reportWorkflowArea" class="report-workspace hidden">
            <div id="reportSelectionHint" class="toolbar-note">Select PAR / ICS or Inventory to begin.</div>

            <article id="parReportPanel" class="workspace-shell report-workspace-panel hidden">
                <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p id="reportPanelEyebrow" class="panel-eyebrow">PAR / ICS Report</p>
                        <h3 id="reportPanelTitle" class="panel-title">PAR / ICS Report Generation</h3>
                    </div>
                </div>

                <form id="reportForm" class="mt-5 space-y-4">
                    <input type="hidden" name="report_type" value="RPCPPE">
                    <input type="hidden" id="selectedOfficerId" name="officer_id" value="">
                    <input type="hidden" id="selectedOfficer" name="officer_name" value="">
                    <input type="hidden" id="selectedDivision" name="division" value="">
                    <div class="form-block report-step">
                        <p class="form-block__label report-step__title">Report Filters</p>
                        <div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                            <label class="form-group">
                                <span class="form-label">Property Type</span>
                                <select name="property_type" class="form-input">
                                    <option value="">All property types</option>
                                    <?php foreach ($propertyTypes as $value): ?>
                                        <option value="<?= escape_html($value); ?>"><?= escape_html($value); ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </label>
                            <label class="form-group">
                                <span class="form-label">Classification</span>
                                <select id="parIcsClassification" name="classification" class="form-input">
                                    <option value="PPE">PPE</option>
                                    <option value="SEMI">SEMI</option>
                                </select>
                            </label>
                            <label class="form-group">
                                <span class="form-label">Funding Source</span>
                                <select name="funding_source" class="form-input">
                                    <option value="">All funding sources</option>
                                    <?php foreach ($fundingSources as $value): ?>
                                        <option value="<?= escape_html($value); ?>"><?= escape_html($fundingSourceLabels[$value] ?? $value); ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </label>
                            <label class="form-group">
                                <span class="form-label">Date From</span>
                                <input type="date" name="date_from" class="form-input">
                            </label>
                            <label class="form-group">
                                <span class="form-label">Date To</span>
                                <input type="date" name="date_to" class="form-input">
                            </label>
                        </div>
                        <div class="report-action-bar mt-4">
                            <button id="applyParIcsReportFilters" type="submit" class="action-primary">Apply Filter</button>
                            <button id="printReport" type="button" class="action-secondary action-excel action-excel--icon" aria-label="Print PAR / ICS report" title="Print PAR / ICS report" disabled>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M7 9V4.5h10V9"></path>
                                    <path d="M6.5 18H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1.5"></path>
                                    <path d="M7 14h10v5.5H7z"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                </form>
            </article>

            <article id="inventoryReportPanel" class="workspace-shell report-workspace-panel hidden">
                <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p class="panel-eyebrow">Inventory Workflow</p>
                        <h3 class="panel-title">Inventory Report Generation</h3>
                    </div>
                </div>

                <form id="inventoryReportForm" class="mt-5 space-y-4">
                    <input type="hidden" name="report_type" value="INVENTORY">

                    <div class="form-block report-step">
                        <p class="form-block__label report-step__title">Step 1: Filter Inventory Records</p>
                        <div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <label class="form-group">
                                <span class="form-label">Date From</span>
                                <input type="date" name="date_from" class="form-input">
                            </label>
                            <label class="form-group">
                                <span class="form-label">Date To</span>
                                <input type="date" name="date_to" class="form-input">
                            </label>
                            <label class="form-group">
                                <span class="form-label">Officer</span>
                                <select name="officer_id" class="form-input searchable-select">
                                    <option value="">All officers</option>
                                    <?php foreach ($reportOfficers as $officer): ?>
                                        <option value="<?= escape_html((string) ($officer['officer_id'] ?? '')); ?>">
                                            <?= escape_html((string) ($officer['name'] ?? '')); ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </label>
                            <label class="form-group">
                                <span class="form-label">Item</span>
                                <select name="inventory_item_id" class="form-input searchable-select">
                                    <option value="">All items</option>
                                    <?php foreach ($inventoryReportItems as $inventoryItem): ?>
                                        <option value="<?= escape_html((string) ($inventoryItem['inventory_item_id'] ?? '')); ?>">
                                            <?= escape_html((string) ($inventoryItem['item_name'] ?? '')); ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </label>
                        </div>
                    </div>

                    <div class="form-block report-step">
                        <p class="form-block__label report-step__title">Step 2: Generate Inventory Report</p>
                        <div class="report-action-bar">
                            <button id="generateInventoryReport" type="submit" class="action-primary">Generate Inventory Report</button>
                            <div class="report-action-group">
                                <button id="printInventoryReport" type="button" class="action-secondary action-excel action-excel--icon" aria-label="Print inventory report" title="Print inventory report" disabled>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M7 9V4.5h10V9"></path>
                                        <path d="M6.5 18H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1.5"></path>
                                        <path d="M7 14h10v5.5H7z"></path>
                                    </svg>
                                </button>
                                <button id="exportInventoryReport" type="button" class="action-secondary action-excel" disabled>Export CSV</button>
                            </div>
                        </div>
                    </div>
                </form>
            </article>

            <article id="reportPreviewPanel" class="view-fill-card print-panel workspace-shell report-workspace-panel hidden">
                <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p class="panel-eyebrow">Generated Output</p>
                        <h3 class="panel-title">Report preview</h3>
                    </div>
                    <div class="flex flex-wrap items-center gap-3"><span id="reportMeta" class="status-pill">No report</span></div>
                </div>
                <div id="reportContainer" class="mt-6"><div class="report-empty-state">Select PAR / ICS or Inventory to begin.</div></div>
            </article>
        </div>
    </div>
</section>
