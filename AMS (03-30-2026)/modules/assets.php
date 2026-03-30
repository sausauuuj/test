<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/_context.php';

?>
<section id="assets" class="app-view" data-view="assets">
    <div class="view-scroll section-stack">
        <div class="section-head assets-section-head">
            <h2 class="section-title">Assets</h2>
        </div>

        <div class="table-meta-bar">
            <span id="assetsDirectoryMeta" class="status-pill">0 RECORDS</span>
        </div>

        <article class="panel-card view-fill-card assets-directory-card">
            <div class="assets-directory-head">
                <form id="assetsFilterForm" class="assets-toolbar assets-toolbar--merged">
                    <label class="form-group assets-search-field">
                        <span class="form-label">Search Asset Name</span>
                        <div class="assets-search-wrap">
                            <input
                                id="assetsNameFilter"
                                type="text"
                                name="property_name"
                                class="form-input assets-search-input"
                                placeholder="Type an asset name..."
                                autocomplete="off"
                            >
                        </div>
                    </label>
                    <label class="form-group assets-search-field assets-search-field--narrow">
                        <span class="form-label">Filter by Type</span>
                        <select id="assetsTypeFilter" name="property_type" class="form-input assets-search-input">
                            <option value="">All property types</option>
                            <?php foreach ($propertyTypes as $value): ?>
                                <option value="<?= escape_html($value); ?>"><?= escape_html($value); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </label>
                    <div class="toolbar-actions toolbar-actions--stacked assets-toolbar__actions">
                        <button id="openAssetEntry" type="button" class="action-primary action-primary--accent">
                            <svg class="inline -ml-1 h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"></path></svg>
                            <span>Add Asset</span>
                        </button>
                    </div>
                </form>
            </div>

            <div class="mt-5 overflow-hidden rounded-[0.9rem] border border-slate-200 bg-white view-table-shell assets-directory-table-shell">
                <div class="view-table-scroll">
                    <table class="min-w-full divide-y divide-slate-200 text-sm assets-directory-table">
                        <thead class="bg-slate-50 text-left text-slate-500">
                            <tr>
                                <th class="px-4 py-3 font-medium">PAR No.</th>
                                <th class="px-4 py-3 font-medium">PAR Date</th>
                                <th class="px-4 py-3 font-medium">Accountable Officer</th>
                                <th class="px-4 py-3 font-medium">Division</th>
                                <th class="px-4 py-3 font-medium">Property / Stock No.</th>
                                <th class="px-4 py-3 font-medium">Property</th>
                                <th class="px-4 py-3 font-medium">Type</th>
                            </tr>
                        </thead>
                        <tbody id="assetsDirectoryBody" class="divide-y divide-slate-100 bg-white"></tbody>
                    </table>
                </div>
            </div>
        </article>
    </div>
</section>

<div id="assetEntryPanel" class="fixed inset-0 z-50 hidden flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
    <div class="asset-entry-shell">
        <div class="asset-entry-head">
            <div>
                <h3 id="assetWizardMainTitle" class="asset-entry-title">Add Assets</h3>
                <p id="assetWizardMainSubtitle" class="asset-entry-subtitle">Register a new asset in the inventory</p>
            </div>
            <button id="closeAssetEntry" type="button" class="asset-entry-close" aria-label="Close add asset wizard">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
        </div>

        <form id="assetForm" class="w-full">
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
                                                <span class="asset-option-card__meta">&#8369;50,000 and above each</span>
                                            </button>
                                            <button type="button" class="asset-option-card asset-choice-btn" data-target="classification" data-value="SEMI">
                                                <span class="asset-option-card__title">SEMI</span>
                                                <span class="asset-option-card__meta">Below &#8369;50,000 each</span>
                                            </button>
                                        </div>
                                        <span class="field-error hidden" data-error-for="classification"></span>
                                    </div>

                                    <div class="asset-choice-group">
                                        <div class="asset-choice-group__label">Funding Source <span class="asset-required">*</span></div>
                                        <input type="hidden" name="funding_source" value="">
                                        <div class="asset-option-grid">
                                            <?php foreach ($fundingSources as $value): ?>
                                                <button type="button" class="asset-option-card asset-option-card--wide asset-choice-btn" data-target="funding_source" data-value="<?= escape_html($value); ?>">
                                                    <span class="asset-option-card__title"><?= escape_html($value); ?></span>
                                                </button>
                                            <?php endforeach; ?>
                                        </div>
                                        <span class="field-error hidden" data-error-for="funding_source"></span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="asset-step-card__actions asset-step-card__actions--end">
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
                                        <select name="division" class="form-input asset-form-input">
                                            <option value="">Select division</option>
                                            <?php foreach ($divisions as $code => $label): ?>
                                                <option value="<?= escape_html($code); ?>"><?= escape_html($code); ?></option>
                                            <?php endforeach; ?>
                                        </select>
                                        <span class="field-error hidden" data-error-for="division"></span>
                                    </label>

                                    <label id="assetOfficerField" class="form-group asset-form-group">
                                        <span class="asset-form-label">Accountable Officer <span class="asset-required">*</span></span>
                                        <select name="officer_id" id="assetOfficerSelect" class="form-input asset-form-input" disabled>
                                            <option value="">Select division first</option>
                                        </select>
                                        <input type="hidden" name="officer_name" id="assetOfficerName" value="">
                                        <span class="field-error hidden" data-error-for="officer_id"></span>
                                    </label>
                                </div>
                                <p id="assetOfficerHint" class="asset-step-helper">Choose a division to load registered accountable officers. Register an officer first if the list is empty.</p>
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
                                    <p class="asset-step-copy">SEMI batches share one property number per batch, while PPE items receive their own property number after serial numbers are entered.</p>
                                </div>

                                <div class="asset-step-grid asset-step-grid--details">
                                    <label class="form-group asset-form-group asset-step-grid__wide">
                                        <span class="asset-form-label">Property Name <span class="asset-required">*</span></span>
                                        <input type="text" name="property_name" class="form-input asset-form-input" placeholder="Enter property name">
                                        <span class="field-error hidden" data-error-for="property_name"></span>
                                    </label>

                                    <label class="form-group asset-form-group">
                                        <span class="asset-form-label">Property Type <span class="asset-required">*</span></span>
                                        <select name="property_type" class="form-input asset-form-input">
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
                                        <input
                                            type="text"
                                            name="date_acquired_display"
                                            id="assetDateAcquiredDisplay"
                                            class="form-input asset-form-input"
                                            value="<?= escape_html(date('m/d/y')); ?>"
                                            placeholder="MM/DD/YY"
                                            inputmode="numeric"
                                            autocomplete="off"
                                        >
                                        <span class="field-error hidden" data-error-for="date_acquired"></span>
                                    </label>

                                    <label class="form-group asset-form-group asset-step-grid__full">
                                        <span class="asset-form-label">Description <span class="asset-required">*</span></span>
                                        <textarea name="description" rows="5" class="form-input asset-form-input asset-form-input--textarea" placeholder="Enter description"></textarea>
                                        <span class="field-error hidden" data-error-for="description"></span>
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
