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

        <div class="table-meta-bar">
            <span id="inventoryTableMeta" class="status-pill hidden" aria-hidden="true">0 RECORDS</span>
        </div>

        <div class="view-fill-card workspace-shell">
            <form id="inventoryFilterForm" class="assets-toolbar assets-toolbar--merged inventory-toolbar">
                <label class="form-group assets-search-field">
                    <span class="form-label">Search Inventory</span>
                    <div class="assets-search-wrap">
                        <input id="inventorySearchFilter" type="text" name="search" class="form-input assets-search-input" placeholder="Type item name, RIS no., or stock no..." autocomplete="off">
                    </div>
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
                <button type="button" class="action-secondary inventory-toolbar__clear" id="resetInventoryFilters">Clear</button>
                <button type="button" class="action-primary action-primary--accent inventory-toolbar__add" id="openInventoryModalToolbar">
                    <svg class="inline -ml-1 h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                    <span>Add Inventory</span>
                </button>
            </form>

            <div class="overflow-hidden rounded-[0.9rem] border border-slate-200 bg-white view-table-shell">
                <div class="view-table-scroll">
                    <table class="min-w-full divide-y divide-slate-200 text-sm inventory-table">
                        <thead class="bg-slate-50 text-left text-slate-500">
                            <tr>
                                <th class="px-4 py-3 font-medium text-center" style="width: 3rem;">No.</th>
                                <th class="px-4 py-3 font-medium">RIS No.</th>
                                <th class="px-4 py-3 font-medium">Item</th>
                                <th class="px-4 py-3 font-medium">Stock No.</th>
                                <th class="px-4 py-3 font-medium">Quantity</th>
                                <th class="px-4 py-3 font-medium">Stock Level</th>
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
                <p class="registration-modal__copy">Use the step-by-step form to save a new inventory record.</p>
            </div>
            <button id="closeInventoryModal" type="button" class="asset-entry-close registration-modal__close" aria-label="Close inventory form">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
        </div>

        <form id="inventoryForm" class="registration-modal__form">
            <input type="hidden" name="inventory_item_id" value="">
            <input type="hidden" name="request_type" value="">

            <section id="inventoryStep1Section" class="wizard-step">
                <div class="wizard-form asset-step-card">
                    <div class="wizard-form__scroll">
                        <div class="wizard-form__content">
                            <div class="registration-step-card__header">
                                <h4 class="asset-step-card__title">Step 1: Choose Request Form</h4>
                                <p class="registration-step-card__copy">Pick the form type first before entering the stock record.</p>
                            </div>

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
                    </div>
                    <div class="asset-step-card__actions">
                        <button id="cancelInventoryModal" type="button" class="action-secondary">Cancel</button>
                        <button id="inventoryStep1Next" type="submit" class="asset-step-btn asset-step-btn--primary">
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
                                <h4 class="asset-step-card__title">Step 2: Inventory Details</h4>
                                <p class="registration-step-card__copy">Complete the inventory record and set the stock target.</p>
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
                                <label class="form-group">
                                    <span class="form-label">Total Amount</span>
                                    <input type="text" name="total_amount" class="form-input" placeholder="Auto-computed" readonly>
                                </label>
                            </div>

                            <div class="registration-form-grid registration-form-grid--inventory inventory-form-grid">
                                <label class="form-group">
                                    <span class="form-label">Responsibility Center Code</span>
                                    <select name="division" class="form-input">
                                        <option value="">Select division</option>
                                        <?php foreach ($divisions as $code => $label): ?>
                                            <option value="<?= escape_html($code); ?>"><?= escape_html($code); ?></option>
                                        <?php endforeach; ?>
                                    </select>
                                    <span class="field-error hidden" data-error-for="division"></span>
                                </label>
                                <label class="form-group">
                                    <span class="form-label">Officer</span>
                                    <select name="officer_id" class="form-input" disabled>
                                        <option value="">Select division first</option>
                                    </select>
                                    <span class="field-error hidden" data-error-for="officer_id"></span>
                                </label>
                                <label class="form-group">
                                    <span class="form-label">Date</span>
                                    <input type="date" name="issued_at" class="form-input" value="<?= escape_html($today); ?>">
                                    <span class="field-error hidden" data-error-for="issued_at"></span>
                                </label>
                                <label class="form-group registration-form-grid__wide">
                                    <span class="form-label">Item</span>
                                    <input type="text" name="item_name" class="form-input" placeholder="Enter the issued supply or material">
                                    <span class="field-error hidden" data-error-for="item_name"></span>
                                </label>
                                <label class="form-group registration-form-grid__wide">
                                    <span class="form-label">Description / Specification</span>
                                    <textarea name="description" rows="4" class="form-input" placeholder="Describe the item. Same item and same description will reuse the same stock number."></textarea>
                                    <span class="field-error hidden" data-error-for="description"></span>
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
                                    <span class="form-label">Total Count</span>
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
                                    <select name="stock_limit" class="form-input">
                                        <option value="">Select level</option>
                                        <option value="10">LOW</option>
                                        <option value="25">MEDIUM</option>
                                        <option value="50">HIGH</option>
                                    </select>
                                    <span class="field-error hidden" data-error-for="stock_limit"></span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="asset-step-card__actions registration-modal__actions">
                        <button id="inventoryStep2Back" type="button" class="asset-step-btn asset-step-btn--ghost">
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
    <div class="w-full max-w-5xl max-h-[calc(100vh-2rem)] overflow-hidden rounded-[1.2rem] bg-white p-5 shadow-2xl">
        <div class="flex items-start justify-between gap-4">
            <div>
                <p class="panel-eyebrow">Inventory History</p>
                <h3 id="inventoryDetailsName" class="panel-title">Inventory Item</h3>
                <p id="inventoryDetailsMeta" class="mt-2 text-sm text-slate-500"></p>
            </div>
            <button id="closeInventoryDetailsModal" type="button" class="rounded-full border border-slate-200 p-2 text-slate-600"><svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        </div>
        <div id="inventoryDetailsContent" class="mt-5 max-h-[calc(100vh-10rem)] overflow-y-auto space-y-4 pr-1"></div>
        <div class="mt-6 flex flex-wrap justify-end gap-3">
            <button id="inventoryDetailsAddStockButton" type="button" class="action-secondary">Add Stock</button>
            <button id="inventoryDetailsDeductStockButton" type="button" class="action-secondary">Deduct Stock</button>
            <button id="inventoryDetailsUpdateButton" type="button" class="action-primary">Update Item</button>
            <button id="inventoryDetailsDeleteButton" type="button" class="action-secondary">Delete Item</button>
            <button id="closeInventoryDetailsButton" type="button" class="action-secondary">Close</button>
        </div>
    </div>
</div>
