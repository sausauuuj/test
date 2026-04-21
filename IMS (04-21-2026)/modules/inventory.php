<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/_context.php';

?>
<section id="inventory" class="app-view" data-view="inventory">
    <div class="view-scroll section-stack">
        <div class="section-head">
            <h2 class="section-title">Inventory</h2>
        </div>

        <div class="table-meta-bar table-meta-bar--assets">
            <span id="inventoryTableMeta" class="status-pill hidden" aria-hidden="true">0 RECORDS</span>
        </div>

        <div class="view-fill-card workspace-shell">
            <form id="inventoryFilterForm" class="assets-toolbar assets-toolbar--merged assets-toolbar--expanded inventory-toolbar">
                <label class="form-group assets-search-field">
                    <span class="form-label">Search Inventory</span>
                    <div class="assets-search-wrap">
                        <input id="inventorySearchFilter" type="text" name="search" class="form-input assets-search-input" placeholder="Type item name, RIS no., or stock no..." autocomplete="off">
                        <svg class="assets-search-icon h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>
                    </div>
                </label>
                <label class="form-group assets-search-field assets-search-field--narrow">
                    <span class="form-label">Division</span>
                    <select name="division" class="form-input assets-search-input">
                        <option value="">All divisions</option>
                        <?php foreach ($divisions as $code => $label): ?>
                            <option value="<?= escape_html($code); ?>"><?= escape_html($code); ?></option>
                        <?php endforeach; ?>
                    </select>
                </label>
                <label class="form-group assets-search-field assets-search-field--narrow">
                    <span class="form-label">Stock Status</span>
                    <select name="stock_status" class="form-input assets-search-input">
                        <option value="">All stock levels</option>
                        <option value="HIGH">HIGH</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="LOW">LOW</option>
                    </select>
                </label>
                <div class="toolbar-actions toolbar-actions--stacked assets-toolbar__actions">
                    <button type="button" class="action-secondary inventory-toolbar__clear" id="resetInventoryFilters">Clear</button>
                    <button type="button" class="action-primary action-primary--accent inventory-toolbar__add" id="openInventoryModalToolbar">
                        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                        <span>Add Inventory</span>
                    </button>
                </div>
            </form>

            <div class="overflow-hidden rounded-[0.9rem] border border-slate-200 bg-white view-table-shell assets-directory-table-shell">
                <div class="view-table-scroll">
                    <table class="w-full divide-y divide-slate-200 text-sm assets-directory-table inventory-table inventory-table--aligned">
                        <colgroup>
                            <col class="inventory-table__col inventory-table__col--index">
                            <col class="inventory-table__col inventory-table__col--ris">
                            <col class="inventory-table__col inventory-table__col--item">
                            <col class="inventory-table__col inventory-table__col--stock">
                            <col class="inventory-table__col inventory-table__col--qty">
                            <col class="inventory-table__col inventory-table__col--status">
                            <col class="inventory-table__col inventory-table__col--action">
                        </colgroup>
                        <thead class="bg-slate-50 text-left text-slate-500">
                            <tr>
                                <th class="px-4 py-3 font-medium text-center">No.</th>
                                <th class="px-4 py-3 font-medium">RIS No.</th>
                                <th class="px-4 py-3 font-medium">Item</th>
                                <th class="px-4 py-3 font-medium">Stock Number</th>
                                <th class="px-4 py-3 font-medium text-center">Quantity</th>
                                <th class="px-4 py-3 font-medium text-center">Stock Level</th>
                                <th class="px-4 py-3 font-medium text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody id="inventoryTableBody" class="divide-y divide-slate-100 bg-white"></tbody>
                    </table>
                </div>
                <div class="table-pagination">
                    <div class="pagination-info">
                        <span id="inventoryPaginationMeta" class="pagination-meta">0 records</span>
                        <input type="hidden" id="inventoryRowsPerPage" class="pagination-rows-input" value="10" min="1" max="500">
                    </div>
                    <div class="pagination-controls">
                        <button id="inventoryPrevPage" class="pagination-btn pagination-btn--prev" aria-label="Previous page">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"></path></svg>
                        </button>
                        <div id="inventoryPageNumbers" class="pagination-numbers"></div>
                        <button id="inventoryNextPage" class="pagination-btn pagination-btn--next" aria-label="Next page">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 6 6 6-6 6"></path></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<div id="inventoryModal" class="fixed inset-0 z-[1000] hidden items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
    <div class="registration-modal-shell inventory-modal-shell">
        <div class="registration-modal__head">
            <div>
                <p class="panel-eyebrow">Inventory</p>
                <h3 id="inventoryModalTitle" class="registration-modal__title">Add Inventory</h3>
                <p class="registration-modal__copy">Use the guided 3-step form to save a new inventory record.</p>
            </div>
            <button id="closeInventoryModal" type="button" class="asset-entry-close registration-modal__close" aria-label="Close inventory form">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
        </div>

        <form id="inventoryForm" class="registration-modal__form">
            <input type="hidden" name="inventory_item_id" value="">
            <input type="hidden" name="request_type" value="">
            <input type="hidden" name="category" value="">

            <div id="inventoryProgressTracker" class="asset-progress-card">
                <div class="asset-progress">
                    <div class="asset-progress-step" data-inventory-progress-step="step1">
                        <span class="asset-progress-step__circle">
                            <span class="asset-progress-step__number">1</span>
                            <svg class="asset-progress-step__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m5 13 4 4L19 7" /></svg>
                        </span>
                        <span class="asset-progress-step__label">Request &amp; Funding</span>
                    </div>
                    <span class="asset-progress__line inventory-progress__line" aria-hidden="true"></span>
                    <div class="asset-progress-step" data-inventory-progress-step="step2">
                        <span class="asset-progress-step__circle">
                            <span class="asset-progress-step__number">2</span>
                            <svg class="asset-progress-step__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m5 13 4 4L19 7" /></svg>
                        </span>
                        <span class="asset-progress-step__label">Officer</span>
                    </div>
                    <span class="asset-progress__line inventory-progress__line" aria-hidden="true"></span>
                    <div class="asset-progress-step" data-inventory-progress-step="step3">
                        <span class="asset-progress-step__circle">
                            <span class="asset-progress-step__number">3</span>
                            <svg class="asset-progress-step__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m5 13 4 4L19 7" /></svg>
                        </span>
                        <span class="asset-progress-step__label">Inventory Details</span>
                    </div>
                </div>
            </div>

            <section id="inventoryStep1Section" class="wizard-step">
                <div class="wizard-form asset-step-card">
                    <div class="wizard-form__scroll">
                        <div class="wizard-form__content">
                            <div class="registration-step-card__header">
                                <h4 class="asset-step-card__title">Step 1: Choose Request Form & Funding Source</h4>
                                <p class="registration-step-card__copy">Select the request form and funding source before entering inventory details.</p>
                            </div>

                            <div class="registration-form-grid">
                                <div>
                                    <label class="form-label inventory-step-label">Request Form</label>
                                    <div class="inventory-request-picker">
                                        <?php foreach ($inventoryRequestTypes as $type): ?>
                                            <button type="button" class="inventory-request-card" data-request-type="<?= escape_html($type); ?>">
                                                <span class="inventory-request-card__code"><?= escape_html($type); ?></span>
                                                <span class="inventory-request-card__copy">
                                                    <?= $type === 'RSMI'
                                                        ? 'Report of Supplies and Materials Issued'
                                                        : 'Other Supplies and Materials Issued'; ?>
                                                </span>
                                            </button>
                                        <?php endforeach; ?>
                                    </div>
                                    <span class="field-error hidden" data-error-for="request_type"></span>
                                </div>

                                <label class="form-group">
                                    <span class="form-label">Funding Source</span>
                                    <select name="funding_source" class="form-input">
                                        <option value="">Select funding source</option>
                                        <option value="NEDA">NEDA</option>
                                        <option value="DEPDev">DEPDev</option>
                                        <option value="RDC (Regional Development Council)">RDC (Regional Development Council)</option>
                                    </select>
                                    <span class="field-error hidden" data-error-for="funding_source"></span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="asset-step-card__actions">
                        <button id="cancelInventoryModal" type="button" class="action-secondary">Cancel</button>
                        <button id="inventoryStep1Next" type="button" class="asset-step-btn asset-step-btn--primary">
                            <span>Next</span>
                            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 6 6 6-6 6" /></svg>
                        </button>
                    </div>
                </div>
            </section>

            <section id="inventoryStep2Section" class="wizard-step hidden">
                <div class="wizard-form asset-step-card">
                    <div class="wizard-form__scroll">
                        <div class="wizard-form__content">
                            <div class="registration-step-card__header">
                                <h4 class="asset-step-card__title">Step 2: Select Accountable Officer</h4>
                                <p class="registration-step-card__copy">Choose the responsibility center code and officer name for this record.</p>
                            </div>

                            <div class="registration-form-grid">
                                <label class="form-group">
                                    <span class="form-label">Responsibility Center Code</span>
                                    <select name="division" class="form-input">
                                        <option value="">Select responsibility center code</option>
                                        <?php foreach ($divisions as $code => $label): ?>
                                            <option value="<?= escape_html($code); ?>"><?= escape_html($code); ?></option>
                                        <?php endforeach; ?>
                                    </select>
                                    <span class="field-error hidden" data-error-for="division"></span>
                                </label>
                                <label class="form-group">
                                    <span class="form-label">Officer Name</span>
                                    <select name="officer_id" class="form-input" disabled>
                                        <option value="">Select responsibility center code first</option>
                                    </select>
                                    <span class="field-error hidden" data-error-for="officer_id"></span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="asset-step-card__actions registration-modal__actions">
                        <button id="inventoryStep2Back" type="button" class="asset-step-btn asset-step-btn--ghost">
                            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 6-6 6 6 6" /></svg>
                            <span>Back</span>
                        </button>
                        <button id="inventoryStep2Next" type="button" class="asset-step-btn asset-step-btn--primary">
                            <span>Next</span>
                            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 6 6 6-6 6" /></svg>
                        </button>
                    </div>
                </div>
            </section>

            <section id="inventoryStep3Section" class="wizard-step hidden">
                <div class="wizard-form asset-step-card">
                    <div class="wizard-form__scroll">
                        <div class="wizard-form__content">
                            <div class="registration-step-card__header">
                                <h4 class="asset-step-card__title">Step 3: Inventory Details</h4>
                                <p class="registration-step-card__copy">Complete the item details, pricing, and stock controls for this inventory entry.</p>
                            </div>

                            <div class="inventory-identifier-grid">
                                <label class="form-group">
                                    <span class="form-label">RIS No.</span>
                                    <input type="text" name="ris_number" class="form-input" placeholder="Auto-generated from the date" readonly>
                                </label>
                                <label class="form-group">
                                    <span class="form-label">Stock Number</span>
                                    <input type="text" name="stock_number" class="form-input" placeholder="Auto-generated from the item and description" readonly>
                                </label>
                            </div>

                            <div class="registration-form-grid registration-form-grid--inventory inventory-form-grid">
                                <label class="form-group">
                                    <span class="form-label">Category</span>
                                    <select name="category_select" class="form-input">
                                        <option value="">Select category</option>
                                    </select>
                                    <span class="field-error hidden" data-error-for="category"></span>
                                </label>
                                <label id="inventoryCustomCategoryWrap" class="form-group hidden">
                                    <span class="form-label">Custom Category</span>
                                    <input type="text" name="custom_category" class="form-input" placeholder="Enter custom category">
                                </label>
                                <label class="form-group">
                                    <span class="form-label">Item</span>
                                    <input type="text" name="item_name" class="form-input" placeholder="Enter item name">
                                    <span class="field-error hidden" data-error-for="item_name"></span>
                                </label>
                                <label class="form-group">
                                    <span class="form-label">Unit</span>
                                    <select name="unit" class="form-input">
                                        <option value="">Select unit</option>
                                        <?php foreach ($inventoryUnits as $unit): ?>
                                            <option value="<?= escape_html($unit); ?>"><?= escape_html($unit); ?></option>
                                        <?php endforeach; ?>
                                    </select>
                                    <span class="field-error hidden" data-error-for="unit"></span>
                                </label>
                                <label class="form-group">
                                    <span class="form-label">Date</span>
                                    <input type="date" name="issued_at" class="form-input" value="<?= escape_html($today); ?>">
                                    <span class="field-error hidden" data-error-for="issued_at"></span>
                                </label>
                                <label class="form-group registration-form-grid__wide">
                                    <span class="form-label">Description</span>
                                    <textarea name="description" rows="4" class="form-input" placeholder="Describe the item or specification"></textarea>
                                    <span class="field-error hidden" data-error-for="description"></span>
                                </label>

                                <label class="form-group">
                                    <span class="form-label">Quantity</span>
                                    <input type="number" min="1" name="quantity_issued" class="form-input" value="1">
                                    <span class="field-error hidden" data-error-for="quantity_issued"></span>
                                </label>
                                <label class="form-group">
                                    <span class="form-label">Unit Cost</span>
                                    <input type="number" min="0" step="0.01" name="unit_cost" class="form-input" value="0.00">
                                    <span class="field-error hidden" data-error-for="unit_cost"></span>
                                </label>
                                <label class="form-group">
                                    <span class="form-label">Stock Limit</span>
                                    <input type="number" min="1" name="stock_limit" class="form-input" value="1">
                                    <span class="field-error hidden" data-error-for="stock_limit"></span>
                                    <span id="inventoryStockLimitHint" class="form-helper">If current stock reaches half of the total quantity, status becomes medium. If only one-fourth remains, status becomes low.</span>
                                </label>
                                <label class="form-group">
                                    <span class="form-label">Total Amount</span>
                                    <input type="text" name="total_amount" class="form-input" placeholder="Auto-computed" readonly>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="asset-step-card__actions registration-modal__actions">
                        <button id="inventoryStep3Back" type="button" class="asset-step-btn asset-step-btn--ghost">
                            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 6-6 6 6 6" /></svg>
                            <span>Back</span>
                        </button>
                        <button id="saveInventoryButton" type="submit" class="action-primary">Save Inventory Entry</button>
                    </div>
                </div>
            </section>
        </form>
    </div>
</div>

<div id="inventoryMovementModal" class="fixed inset-0 z-[1000] hidden items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
    <div class="registration-modal-shell">
        <div class="registration-modal__head">
            <div>
                <p class="panel-eyebrow">Stock Movement</p>
                <h3 id="inventoryMovementTitle" class="registration-modal__title">Update Stock</h3>
                <p id="inventoryMovementCopy" class="registration-modal__copy">Record a stock addition or deduction and keep the movement history complete.</p>
            </div>
            <button id="closeInventoryMovementModal" type="button" class="asset-entry-close registration-modal__close" aria-label="Close stock movement">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
        </div>

        <form id="inventoryMovementForm" class="registration-modal__form">
            <input type="hidden" name="inventory_item_id" value="">
            <input type="hidden" name="movement_type" value="ADD">
            <div class="registration-step-card">
                <div id="inventoryMovementSummary" class="inventory-summary-card"></div>
                <div class="registration-form-grid">
                    <label class="form-group">
                        <span class="form-label">Quantity</span>
                        <input type="number" min="1" name="quantity" class="form-input" value="1">
                        <span class="field-error hidden" data-error-for="quantity"></span>
                    </label>
                    <label class="form-group registration-form-grid__wide">
                        <span class="form-label">Notes</span>
                        <textarea name="notes" rows="4" class="form-input" placeholder="State the reason for this stock movement."></textarea>
                        <span class="field-error hidden" data-error-for="notes"></span>
                    </label>
                </div>

                <div class="asset-step-card__actions registration-modal__actions">
                    <button id="cancelInventoryMovement" type="button" class="action-secondary">Cancel</button>
                    <button id="saveInventoryMovementButton" type="submit" class="action-primary">Save Stock Movement</button>
                </div>
            </div>
        </form>
    </div>
</div>

<div id="inventoryDetailsModal" class="fixed inset-0 z-[1000] hidden items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
    <div class="w-full max-w-4xl max-h-[calc(100vh-2rem)] overflow-hidden rounded-[1.2rem] bg-white shadow-2xl">
        <div class="inventory-details-header">
            <div class="inventory-details-header__content">
                <p class="inventory-details-eyebrow">Inventory</p>
                <h3 id="inventoryDetailsName" class="inventory-details-title">Inventory Item</h3>
                <p id="inventoryDetailsMeta" class="inventory-details-meta"></p>
            </div>
            <div class="inventory-details-header__actions">
                <div class="action-dropdown-wrapper">
                    <button id="inventoryDetailsActionBtn" type="button" class="inventory-details-action-btn" aria-label="More actions">
                        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                    </button>
                    <div id="inventoryDetailsActionMenu" class="action-dropdown-menu hidden">
                        <button id="inventoryDetailsUpdateButton" type="button" class="action-dropdown-item">
                            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            <span>Edit Item</span>
                        </button>
                        <button id="inventoryDetailsDeleteButton" type="button" class="action-dropdown-item action-dropdown-item--danger">
                            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                            <span>Delete Item</span>
                        </button>
                    </div>
                </div>
                <button id="closeInventoryDetailsModal" type="button" class="inventory-details-close-btn" aria-label="Close">
                    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
            </div>
        </div>
        <div id="inventoryDetailsContent" class="inventory-details-content"></div>
        <div class="inventory-details-footer">
            <button id="inventoryDetailsAddStockButton" type="button" class="action-secondary">Add Stock</button>
            <button id="inventoryDetailsDeductStockButton" type="button" class="action-secondary">Deduct Stock</button>
            <button id="closeInventoryDetailsButton" type="button" class="action-secondary">Close</button>
        </div>
    </div>
</div>
