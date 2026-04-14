<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/_context.php';

$fundingSourceLabels = [
    'NEDA/DEPDev IX' => 'NEDA/DEPDev',
    'RDC' => 'RDC (Regional Development Council)',
];

?>
<section id="assets" class="app-view" data-view="assets">
    <div class="view-scroll section-stack">
        <div class="section-head assets-section-head">
            <h2 class="section-title">Assets</h2>
        </div>

        <div class="table-meta-bar table-meta-bar--assets">
            <span id="assetsDirectoryMeta" class="status-pill hidden" aria-hidden="true">0 RECORDS</span>
        </div>

        <div class="view-fill-card assets-directory-card workspace-shell">
            <div class="assets-directory-head">
                <form id="assetsFilterForm" class="assets-toolbar assets-toolbar--merged assets-toolbar--expanded">
                    <label class="form-group assets-search-field">
                        <span class="form-label">Search</span>
                        <div class="assets-search-wrap">
                            <input
                                id="assetsNameFilter"
                                type="text"
                                name="search"
                                class="form-input assets-search-input"
                                placeholder="Search asset, officer, type, or division..."
                                autocomplete="off"
                            >
                            <svg class="assets-search-icon h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>
                        </div>
                    </label>
                    <label class="form-group assets-search-field assets-search-field--narrow">
                        <span class="form-label">Classification</span>
                        <select id="assetsClassificationFilter" name="classification" class="form-input assets-search-input">
                            <option value="">All classifications</option>
                            <?php foreach ($classifications as $value): ?>
                                <option value="<?= escape_html($value); ?>"><?= escape_html($value); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </label>
                    <label class="form-group assets-search-field assets-search-field--narrow">
                        <span class="form-label">Funding Source</span>
                        <select id="assetsFundingFilter" name="funding_source" class="form-input assets-search-input">
                            <option value="">All funding sources</option>
                            <?php foreach ($fundingSources as $value): ?>
                                <option value="<?= escape_html($value); ?>"><?= escape_html($fundingSourceLabels[$value] ?? $value); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </label>
                    <label class="form-group assets-search-field assets-search-field--narrow">
                        <span class="form-label">Sort by PAR / ICS</span>
                        <select id="assetsSortDirection" name="sort_direction" class="form-input assets-search-input">
                            <option value="DESC">Newest first</option>
                            <option value="ASC">Oldest first</option>
                        </select>
                    </label>
                    <div class="toolbar-actions toolbar-actions--stacked assets-toolbar__actions">
                        <button id="openAssetEntry" type="button" class="action-primary action-primary--accent" data-open-asset-entry="true">
                            <svg class="inline -ml-1 h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"></path></svg>
                            <span>Add Asset</span>
                        </button>
                        <button id="bulkDeleteAssets" type="button" class="action-secondary hidden" title="Delete selected assets">
                            <svg class="inline -ml-1 h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6m-3 0V4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v2M10 11v6M14 11v6"></path></svg>
                            <span>Delete Selected</span>
                        </button>
                        <button id="bulkUpdateAssets" type="button" class="action-secondary hidden" title="Update selected assets">
                            <svg class="inline -ml-1 h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14M3 17l2 2 4-4"></path></svg>
                            <span>Bulk Update</span>
                        </button>
                    </div>
                </form>
            </div>

            <div class="mt-3 overflow-hidden rounded-[0.9rem] border border-slate-200 bg-white view-table-shell assets-directory-table-shell">
                <div class="view-table-scroll overflow-x-auto">
                    <table class="w-full min-w-[1200px] divide-y divide-slate-200 text-sm assets-directory-table assets-directory-table--merged">
                        <colgroup>
                            <col class="assets-directory-table__col assets-directory-table__col--index">
                            <col class="assets-directory-table__col assets-directory-table__col--par">
                            <col class="assets-directory-table__col assets-directory-table__col--property">
                            <col class="assets-directory-table__col assets-directory-table__col--type">
                            <col class="assets-directory-table__col assets-directory-table__col--officer">
                            <col class="assets-directory-table__col assets-directory-table__col--division">
                            <col class="assets-directory-table__col assets-directory-table__col--funding">
                            <col class="assets-directory-table__col assets-directory-table__col--classification">
                            <col class="assets-directory-table__col assets-directory-table__col--action">
                        </colgroup>
                        <thead class="bg-slate-50 text-left text-slate-500">
                            <tr>
                                <th class="px-4 py-3 font-medium text-center">No.</th>
                                <th class="px-4 py-3 font-medium">PAR / ICS No.</th>
                                <th class="px-4 py-3 font-medium">Property</th>
                                <th class="px-4 py-3 font-medium">Type</th>
                                <th class="px-4 py-3 font-medium">Officer</th>
                                <th class="px-4 py-3 font-medium">Division</th>
                                <th class="px-4 py-3 font-medium">Funding</th>
                                <th class="px-4 py-3 font-medium">Classification</th>
                                <th class="px-4 py-3 font-medium text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody id="assetsDirectoryBody" class="divide-y divide-slate-100 bg-white"></tbody>
                    </table>
                </div>
                <div class="table-pagination">
                    <div class="pagination-info">
                        <label class="pagination-rows-label">
                            Show
                            <input type="number" id="assetsRowsPerPage" class="pagination-rows-input" value="10" min="1" max="500">
                            records
                        </label>
                    </div>
                    <div class="pagination-controls">
                        <button id="assetsPrevPage" class="pagination-btn pagination-btn--prev" aria-label="Previous page">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"></path></svg>
                        </button>
                        <div id="assetsPageNumbers" class="pagination-numbers"></div>
                        <button id="assetsNextPage" class="pagination-btn pagination-btn--next" aria-label="Next page">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 6 6 6-6 6"></path></svg>
                        </button>
                    </div>
                    <span id="assetsPaginationMeta" class="pagination-meta">0 records</span>
                </div>
            </div>
        </div>
    </div>
</section>

<div id="assetEntryPanel" class="fixed inset-0 z-[1000] hidden flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
    <div class="registration-modal-shell asset-entry-shell">
        <div class="registration-modal__head asset-entry-head">
            <div>
                <p class="panel-eyebrow">Assets</p>
                <h3 id="assetWizardMainTitle" class="registration-modal__title asset-entry-title">Add Assets</h3>
                <p id="assetWizardMainSubtitle" class="registration-modal__copy asset-entry-subtitle">Register a new asset in the inventory.</p>
                <div id="assetWizardModeBanner" class="mt-3 hidden rounded-[0.9rem] border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800"></div>
            </div>
            <button id="closeAssetEntry" type="button" class="asset-entry-close registration-modal__close" aria-label="Close add asset wizard">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
        </div>

        <form id="assetForm" class="registration-modal__form asset-entry-form w-full">
            <input type="hidden" name="id" value="">
            <input type="hidden" name="par_id" value="">
            <input type="hidden" name="update_scope" value="">
            <div id="assetProgressTracker" class="asset-progress-card">
                <div class="asset-progress">
                    <div class="asset-progress-step" data-progress-step="step1">
                        <span class="asset-progress-step__circle">
                            <span class="asset-progress-step__number">1</span>
                            <svg class="asset-progress-step__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m5 13 4 4L19 7" /></svg>
                        </span>
                        <span class="asset-progress-step__label">Classification &amp; Funding</span>
                    </div>
                    <span class="asset-progress__line" aria-hidden="true"></span>
                    <div class="asset-progress-step" data-progress-step="step2">
                        <span class="asset-progress-step__circle">
                            <span class="asset-progress-step__number">2</span>
                            <svg class="asset-progress-step__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m5 13 4 4L19 7" /></svg>
                        </span>
                        <span class="asset-progress-step__label">Accountable Officer</span>
                    </div>
                    <span class="asset-progress__line" aria-hidden="true"></span>
                    <div class="asset-progress-step" data-progress-step="step3">
                        <span class="asset-progress-step__circle">
                            <span class="asset-progress-step__number">3</span>
                            <svg class="asset-progress-step__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m5 13 4 4L19 7" /></svg>
                        </span>
                        <span class="asset-progress-step__label">Asset Details</span>
                    </div>
                </div>
            </div>

            <div class="asset-wizard-body">
                <section id="assetStep1Section" class="wizard-step">
                    <div class="wizard-form asset-step-card">
                        <div class="wizard-form__scroll">
                            <div class="wizard-form__content">
                                <div class="asset-step-card__header">
                                    <h4 class="asset-step-card__title">Step 1: Classification &amp; Funding Source</h4>
                                </div>

                                <div class="asset-step-grid asset-step-grid--choices">
                                    <div class="asset-choice-group">
                                        <div class="asset-choice-group__label">Property Classification <span class="asset-required">*</span></div>
                                        <input type="hidden" name="classification" value="">
                                        <div class="asset-option-grid asset-option-grid--two">
                                            <button type="button" class="asset-option-card asset-choice-btn" data-target="classification" data-value="PPE">
                                                <span class="asset-option-card__title">PPE</span>
                                                <span class="asset-option-card__meta">Property, Plant, and Equipment</span>
                                            </button>
                                            <button type="button" class="asset-option-card asset-choice-btn" data-target="classification" data-value="SEMI">
                                                <span class="asset-option-card__title">SEMI</span>
                                                <span class="asset-option-card__meta">Semi-Expandable</span>
                                            </button>
                                        </div>
                                        <span class="field-error hidden" data-error-for="classification"></span>
                                    </div>

                                    <div class="asset-choice-group">
                                        <div class="asset-choice-group__label">Funding Source <span class="asset-required">*</span></div>
                                        <input type="hidden" name="funding_source" value="">
                                        <div class="asset-option-grid asset-option-grid--two">
                                            <?php foreach ($fundingSources as $value): ?>
                                                <button type="button" class="asset-option-card asset-option-card--wide asset-choice-btn" data-target="funding_source" data-value="<?= escape_html($value); ?>">
                                                    <span class="asset-option-card__title"><?= escape_html($fundingSourceLabels[$value] ?? $value); ?></span>
                                                </button>
                                            <?php endforeach; ?>
                                        </div>
                                        <span class="field-error hidden" data-error-for="funding_source"></span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="asset-step-card__actions asset-step-card__actions--end">
                            <button type="button" class="asset-step-btn asset-step-btn--ghost hidden" id="assetParUpdateBack">
                                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 6-6 6 6 6" /></svg>
                                <span>Back to PAR Assets</span>
                            </button>
                            <button type="button" class="asset-step-btn asset-step-btn--danger hidden" id="bulkDeleteAssets" title="Delete all assets in this batch">
                                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6m-3 0V4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v2M10 11v6M14 11v6"></path></svg>
                                <span>Delete Batch</span>
                            </button>
                            <button type="submit" class="asset-step-btn asset-step-btn--primary">
                                <span>Next</span>
                                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 6 6 6-6 6" /></svg>
                            </button>
                        </div>
                    </div>
                </section>

                <section id="assetStep2Section" class="wizard-step hidden">
                    <div class="wizard-form asset-step-card">
                        <div class="wizard-form__scroll">
                            <div class="wizard-form__content">
                                <div class="asset-step-card__header">
                                    <h4 class="asset-step-card__title">Step 2: Accountable Officer</h4>
                                </div>

                                <div class="asset-step-grid asset-step-grid--two">
                                    <label class="form-group asset-form-group">
                                        <span class="asset-form-label">Division <span class="asset-required">*</span></span>
                                        <select name="division" class="form-input asset-form-input searchable-select">
                                            <option value="">Select division</option>
                                            <?php foreach ($divisions as $code => $label): ?>
                                                <option value="<?= escape_html($code); ?>"><?= escape_html($code); ?></option>
                                            <?php endforeach; ?>
                                        </select>
                                        <span class="field-error hidden" data-error-for="division"></span>
                                    </label>

                                    <label id="assetOfficerField" class="form-group asset-form-group">
                                        <span class="asset-form-label">Accountable Officer <span class="asset-required">*</span></span>
                                        <select name="officer_id" id="assetOfficerSelect" class="form-input asset-form-input searchable-select" disabled>
                                            <option value="">Loading officers...</option>
                                        </select>
                                        <input type="hidden" name="officer_name" id="assetOfficerName" value="">
                                        <span class="field-error hidden" data-error-for="officer_id"></span>
                                    </label>
                                </div>
                                <p id="assetOfficerHint" class="asset-step-helper">Accountable officers load automatically. Choose a division to narrow the list, or select an officer first and the division will be filled in for you.</p>
                            </div>
                        </div>

                        <div class="asset-step-card__actions">
                            <button type="button" class="asset-step-btn asset-step-btn--ghost" id="assetStep2Back">
                                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 6-6 6 6 6" /></svg>
                                <span>Back</span>
                            </button>
                            <button type="submit" class="asset-step-btn asset-step-btn--primary">
                                <span>Next</span>
                                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 6 6 6-6 6" /></svg>
                            </button>
                        </div>
                    </div>
                </section>

                <section id="assetStep3Section" class="wizard-step hidden">
                    <div class="wizard-form asset-step-card">
                        <div class="wizard-form__scroll">
                            <div class="wizard-form__content">
                                <div class="asset-step-card__header">
                                    <h4 class="asset-step-card__title">Step 3: Asset Details</h4>
                                </div>

                                <div class="asset-step-grid asset-step-grid--details">
                                    <label class="form-group asset-form-group asset-step-grid__wide">
                                        <span class="asset-form-label">Property Name <span class="asset-required">*</span></span>
                                        <input type="text" name="property_name" class="form-input asset-form-input" placeholder="Enter property name">
                                        <span class="field-error hidden" data-error-for="property_name"></span>
                                    </label>

                                    <label class="form-group asset-form-group">
                                        <span class="asset-form-label">Property Type <span class="asset-required">*</span></span>
                                        <select name="property_type" class="form-input asset-form-input searchable-select">
                                            <option value="">Select type</option>
                                            <?php foreach ($propertyTypes as $value): ?>
                                                <option value="<?= escape_html($value); ?>"><?= escape_html($value); ?></option>
                                            <?php endforeach; ?>
                                        </select>
                                        <span class="field-error hidden" data-error-for="property_type"></span>
                                    </label>

                                    <label class="form-group asset-form-group">
                                        <span class="asset-form-label">Unit Cost <span class="asset-required">*</span> <span id="assetUnitCostRule" class="asset-form-note"></span></span>
                                        <input type="text" name="unit_cost" inputmode="decimal" class="form-input asset-form-input" placeholder="&#8369; 0">
                                        <span class="field-error hidden" data-error-for="unit_cost"></span>
                                    </label>

                                    <label class="form-group asset-form-group">
                                        <span class="asset-form-label">Quantity <span class="asset-required">*</span></span>
                                        <input type="number" min="1" name="quantity" class="form-input asset-form-input" value="1">
                                        <span class="field-error hidden" data-error-for="quantity"></span>
                                    </label>

                                    <label class="form-group asset-form-group">
                                        <span class="asset-form-label">Date Acquired <span class="asset-required">*</span></span>
                                        <input type="hidden" name="date_acquired" value="<?= escape_html($today); ?>">
                                        <div class="asset-input-icon-wrap">
                                            <input
                                                type="text"
                                                name="date_acquired_display"
                                                id="assetDateAcquiredDisplay"
                                                class="form-input asset-form-input asset-form-input--with-icon"
                                                value="<?= escape_html(date('m/d/y')); ?>"
                                                placeholder="MM/DD/YY"
                                                inputmode="numeric"
                                                autocomplete="off"
                                            >
                                        </div>
                                        <span class="field-error hidden" data-error-for="date_acquired"></span>
                                    </label>

                                    <label class="form-group asset-form-group asset-step-grid__wide">
                                        <span class="asset-form-label">Description <span class="asset-required">*</span></span>
                                        <textarea name="description" rows="1" class="form-input asset-form-input asset-form-input--textarea" placeholder="Enter description"></textarea>
                                        <span class="field-error hidden" data-error-for="description"></span>
                                    </label>

                                    <label class="form-group asset-form-group">
                                        <span class="asset-form-label">Estimated Useful Life <span class="asset-required">*</span></span>
                                        <input type="text" name="estimated_useful_life" class="form-input asset-form-input" placeholder="e.g. 3 years">
                                        <span class="field-error hidden" data-error-for="estimated_useful_life"></span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div class="asset-step-card__actions">
                            <button type="button" class="asset-step-btn asset-step-btn--ghost" id="assetStep3Back">
                                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 6-6 6 6 6" /></svg>
                                <span>Back</span>
                            </button>
                            <button id="assetSubmitButton" type="submit" class="asset-step-btn asset-step-btn--primary">
                                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 13 4 4L19 7" /></svg>
                                <span>Save &amp; Enter Serial No.</span>
                            </button>
                        </div>
                    </div>
                </section>

                <section id="bulkSerialPanel" class="wizard-step hidden">
                    <div class="wizard-form asset-step-card asset-step-card--serial">
                        <div class="wizard-form__scroll">
                            <div class="wizard-form__content">
                                <div class="asset-step-card__header">
                                    <h4 class="asset-step-card__title">Enter Serial Numbers</h4>
                                    <p id="assetSerialSubtitle" class="asset-step-copy">Assign a unique serial number for each asset in this batch. SEMI batches share one property number, while PPE items receive one property number each.</p>
                                </div>

                                <div id="assetSerialSummary" class="asset-serial-summary">
                                    <div class="asset-serial-summary__item">
                                        <span class="asset-serial-summary__label">Property Name</span>
                                        <strong id="serialSummaryName" class="asset-serial-summary__value">-</strong>
                                    </div>
                                    <div class="asset-serial-summary__item">
                                        <span class="asset-serial-summary__label">Type</span>
                                        <strong id="serialSummaryType" class="asset-serial-summary__value">-</strong>
                                    </div>
                                    <div class="asset-serial-summary__item">
                                        <span class="asset-serial-summary__label">Classification</span>
                                        <strong id="serialSummaryClassification" class="asset-serial-summary__value">-</strong>
                                    </div>
                                    <div class="asset-serial-summary__item">
                                        <span class="asset-serial-summary__label">Unit Cost</span>
                                        <strong id="serialSummaryCost" class="asset-serial-summary__value">-</strong>
                                    </div>
                                </div>

                                <div id="serialNumberFields" class="asset-serial-fields"></div>
                            </div>
                        </div>

                        <div class="asset-step-card__actions">
                            <button type="button" class="asset-step-btn asset-step-btn--ghost" id="assetSerialBack">
                                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 6-6 6 6 6" /></svg>
                                <span>Back</span>
                            </button>
                            <button type="submit" class="asset-step-btn asset-step-btn--primary asset-step-btn--wide">
                                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 13 4 4L19 7" /></svg>
                                <span>Save Asset</span>
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </form>
    </div>
</div>

<div id="assetParSelectionModal" class="fixed inset-0 z-[1000] hidden items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
    <div class="w-full max-w-5xl max-h-[calc(100vh-2rem)] overflow-hidden rounded-[1.2rem] bg-white p-5 shadow-2xl">
        <div class="asset-par-selection-modal__head">
            <div>
                <p class="panel-eyebrow">PAR Asset Selection</p>
                <h3 id="assetParSelectionTitle" class="panel-title">Assets Under PAR</h3>
                <p id="assetParSelectionCopy" class="asset-par-selection-modal__copy">Select one row as the basis for the PAR-wide update. The updated Step 1 to Step 3 details will apply to all assets under this PAR, while serial numbers stay unchanged.</p>
            </div>
            <button id="closeAssetParSelectionModal" type="button" class="asset-entry-close" aria-label="Close PAR asset selection">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
        </div>

        <div class="mt-5 overflow-hidden rounded-[1rem] border border-slate-200 bg-white">
            <div class="view-table-scroll asset-par-selection-scroll">
                <table class="min-w-full divide-y divide-slate-200 text-sm">
                    <thead class="bg-slate-50 text-left text-slate-500">
                        <tr>\n                            <th class="px-4 py-3 font-medium border-r border-slate-200">Property No.</th>\n                            <th class="px-4 py-3 font-medium border-r border-slate-200">Property</th>\n                            <th class="px-4 py-3 font-medium border-r border-slate-200">Type</th>\n                            <th class="px-4 py-3 font-medium border-r border-slate-200">Serial Number</th>\n                            <th class="px-4 py-3 font-medium text-right">Action</th>\n                        </tr>
                    </thead>
                    <tbody id="assetParSelectionBody" class="divide-y divide-slate-100 bg-white">
                        <tr>
                            <td colspan="5" class="px-4 py-10 text-center text-slate-500">Select a PAR number from the asset table first.</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div class="mt-6 flex justify-end">
            <button id="closeAssetParSelectionButton" type="button" class="action-secondary">Close</button>
        </div>
    </div>
</div>
