<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/_context.php';

?>
<section id="inventory" class="app-view" data-view="inventory">
    <div class="view-scroll section-stack">
        <div class="section-head">
            <h2 class="section-title">Inventory</h2>
            <div class="section-head__actions">
                <button type="button" class="action-primary action-primary--accent" id="openInventoryModal">
                    <svg class="inline -ml-1 h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"></path></svg>
                    <span>Add Supply or Material</span>
                </button>
            </div>
        </div>

        <div class="table-meta-bar">
            <span id="inventoryTableMeta" class="status-pill hidden" aria-hidden="true">0 RECORDS</span>
            <span id="inventorySummaryMeta" class="status-pill">LOW STOCK: 0 | NEAR LOW: 0</span>
        </div>

        <div class="view-fill-card workspace-shell">
            <form id="inventoryFilterForm" class="assets-toolbar assets-toolbar--merged assets-toolbar--expanded">
                <label class="form-group assets-search-field">
                    <span class="form-label">Search Item</span>
                    <div class="assets-search-wrap">
                        <input id="inventorySearchFilter" type="text" name="search" class="form-input assets-search-input" placeholder="Type supply or material name..." autocomplete="off">
                    </div>
                </label>
                <label class="form-group assets-search-field assets-search-field--narrow">
                    <span class="form-label">Type</span>
                    <select name="item_type" class="form-input assets-search-input searchable-select">
                        <option value="">All types</option>
                        <?php foreach ($inventoryItemTypes as $type): ?>
                            <option value="<?= escape_html($type); ?>"><?= escape_html($type); ?></option>
                        <?php endforeach; ?>
                    </select>
                </label>
                <label class="form-group assets-search-field assets-search-field--narrow">
                    <span class="form-label">Stock Status</span>
                    <select name="stock_status" class="form-input assets-search-input searchable-select">
                        <option value="">All stock levels</option>
                        <?php foreach ($inventoryStatuses as $code => $label): ?>
                            <option value="<?= escape_html($code); ?>"><?= escape_html($label); ?></option>
                        <?php endforeach; ?>
                    </select>
                </label>
                <div class="toolbar-actions toolbar-actions--stacked assets-toolbar__actions">
                    <button type="button" class="action-secondary" id="resetInventoryFilters">Clear</button>
                    <button type="button" class="action-primary action-primary--accent" id="openInventoryModalToolbar">
                        <svg class="inline -ml-1 h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"></path></svg>
                        <span>Add Supply or Material</span>
                    </button>
                </div>
            </form>

            <div class="mt-3 overflow-hidden rounded-[0.9rem] border border-slate-200 bg-white view-table-shell">
                <div class="view-table-scroll">
                    <table class="min-w-full divide-y divide-slate-200 text-sm inventory-table">
                        <thead class="bg-slate-50 text-left text-slate-500">
                            <tr>
                                <th class="px-4 py-3 font-medium">Item Code</th>
                                <th class="px-4 py-3 font-medium">Item</th>
                                <th class="px-4 py-3 font-medium">Type</th>
                                <th class="px-4 py-3 font-medium">Unit</th>
                                <th class="px-4 py-3 font-medium">Current Stock</th>
                                <th class="px-4 py-3 font-medium">Stock Limit</th>
                                <th class="px-4 py-3 font-medium">Low Stock No.</th>
                                <th class="px-4 py-3 font-medium">Remarks</th>
                                <th class="px-4 py-3 font-medium">Updated</th>
                                <th class="px-4 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="inventoryTableBody" class="divide-y divide-slate-100 bg-white"></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</section>

<div id="inventoryModal" class="fixed inset-0 z-[1000] hidden items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
    <div class="registration-modal-shell">
        <div class="registration-modal__head">
            <div>
                <p class="panel-eyebrow">Inventory</p>
                <h3 id="inventoryModalTitle" class="registration-modal__title">Add Supply or Material</h3>
                <p class="registration-modal__copy">Create a stock-controlled inventory item and define its low stock threshold.</p>
            </div>
            <button id="closeInventoryModal" type="button" class="asset-entry-close registration-modal__close" aria-label="Close inventory form">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
        </div>

        <form id="inventoryForm" class="registration-modal__form">
            <input type="hidden" name="inventory_item_id" value="">
            <div class="registration-step-card">
                <div class="registration-step-card__header">
                    <h4 class="asset-step-card__title">Inventory Details</h4>
                    <p class="registration-step-card__copy">Add supplies or materials, set a stock limit, and define the low stock trigger.</p>
                </div>

                <div class="registration-form-grid">
                    <label class="form-group registration-form-grid__wide">
                        <span class="form-label">Item Name</span>
                        <input type="text" name="item_name" class="form-input" placeholder="Enter item name">
                        <span class="field-error hidden" data-error-for="item_name"></span>
                    </label>
                    <label class="form-group">
                        <span class="form-label">Type</span>
                        <select name="item_type" class="form-input searchable-select">
                            <option value="">Select type</option>
                            <?php foreach ($inventoryItemTypes as $type): ?>
                                <option value="<?= escape_html($type); ?>"><?= escape_html($type); ?></option>
                            <?php endforeach; ?>
                        </select>
                        <span class="field-error hidden" data-error-for="item_type"></span>
                    </label>
                    <label class="form-group">
                        <span class="form-label">Unit</span>
                        <input type="text" name="unit" class="form-input" placeholder="e.g. pcs, box, ream">
                        <span class="field-error hidden" data-error-for="unit"></span>
                    </label>
                    <label class="form-group">
                        <span class="form-label">Initial Stock</span>
                        <input type="number" min="0" name="current_stock" class="form-input" value="0">
                        <span class="field-error hidden" data-error-for="current_stock"></span>
                    </label>
                    <label class="form-group">
                        <span class="form-label">Stock Limit</span>
                        <input type="number" min="1" name="stock_limit" class="form-input" value="1">
                        <span class="field-error hidden" data-error-for="stock_limit"></span>
                    </label>
                    <label class="form-group">
                        <span class="form-label">Low Stock No.</span>
                        <input type="number" min="0" name="low_stock_threshold" class="form-input" value="0">
                        <span class="field-error hidden" data-error-for="low_stock_threshold"></span>
                    </label>
                    <label class="form-group registration-form-grid__wide">
                        <span class="form-label">Notes</span>
                        <textarea name="description" rows="4" class="form-input" placeholder="Describe the supply or material and any storage notes."></textarea>
                        <span class="field-error hidden" data-error-for="description"></span>
                    </label>
                </div>

                <div class="asset-step-card__actions registration-modal__actions">
                    <button id="cancelInventoryModal" type="button" class="action-secondary">Cancel</button>
                    <button id="saveInventoryButton" type="submit" class="action-primary">Save Inventory Item</button>
                </div>
            </div>
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
                <p class="panel-eyebrow">Inventory Details</p>
                <h3 id="inventoryDetailsName" class="panel-title">Inventory Item</h3>
                <p id="inventoryDetailsMeta" class="mt-2 text-sm text-slate-500"></p>
            </div>
            <button id="closeInventoryDetailsModal" type="button" class="rounded-full border border-slate-200 p-2 text-slate-600"><svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        </div>
        <div id="inventoryDetailsContent" class="mt-5 max-h-[calc(100vh-10rem)] overflow-y-auto space-y-4 pr-1"></div>
        <div class="mt-6 flex justify-end"><button id="closeInventoryDetailsButton" type="button" class="action-secondary">Close</button></div>
    </div>
</div>
