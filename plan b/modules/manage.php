<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/_context.php';

?>
<section id="manage" class="app-view" data-view="manage">
    <div class="view-scroll section-stack">
        <div class="section-head">
            <h2 class="section-title">Manage</h2>
            <p class="section-copy">Filter, review, inspect, update, and delete asset records.</p>
        </div>

        <article class="panel-card">
            <form id="assetFilterForm" class="toolbar-grid">
                <label class="form-group">
                    <span class="form-label">Asset Name</span>
                    <div class="assets-search-wrap">
                        <input type="text" name="property_name" class="form-input assets-search-input" placeholder="Search asset name" id="assetNameSearch">
                        <svg class="assets-search-icon h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <circle cx="11" cy="11" r="6.5"></circle>
                            <path d="m16 16 4.5 4.5"></path>
                        </svg>
                    </div>
                </label>
                <label class="form-group"><span class="form-label">Funding Source</span><select name="funding_source" class="form-input"><option value="">All funding sources</option><?php foreach ($fundingSources as $value): ?><option value="<?= escape_html($value); ?>"><?= escape_html($value); ?></option><?php endforeach; ?></select></label>
                <label class="form-group"><span class="form-label">Classification</span><select name="classification" class="form-input"><option value="">All classifications</option><?php foreach ($classifications as $value): ?><option value="<?= escape_html($value); ?>"><?= escape_html($value); ?></option><?php endforeach; ?></select></label>
                <div class="toolbar-actions"><button type="submit" class="action-primary">Search</button><button id="resetFilters" type="button" class="action-secondary">Reset</button></div>
            </form>
        </article>

        <article class="panel-card view-fill-card manage-table-card">
            <div class="flex items-center justify-between gap-3">
                <div>
                    <p class="panel-eyebrow">Assets Table</p>
                    <h3 class="panel-title">Filtered inventory records</h3>
                </div>
                <span id="assetTableMeta" class="status-pill">0 records</span>
            </div>
            <div class="mt-6 overflow-hidden rounded-[1rem] border border-slate-200 bg-white view-table-shell manage-table-shell">
                <div class="view-table-scroll">
                    <table class="manage-table">
                        <thead>
                            <tr>
                                <th>Asset Name</th>
                                <th>Type</th>
                                <th>Class.</th>
                                <th>Funding</th>
                                <th>Unit Cost</th>
                                <th>Officer</th>
                                <th>PAR No.</th>
                                <th>Condition</th>
                                <th class="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="assetTableBody"></tbody>
                    </table>
                </div>
            </div>
        </article>
    </div>
</section>
