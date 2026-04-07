<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/_context.php';

?>
<section id="registration" class="app-view" data-view="registration">
    <div class="view-scroll section-stack">
        <div class="section-head">
            <h2 class="section-title">Registration</h2>
        </div>

        <div class="table-meta-bar">
            <span id="registrationTableMeta" class="status-pill">0 RECORDS</span>
        </div>

        <article class="panel-card view-fill-card registration-card">
            <div class="registration-toolbar">
                <form id="registrationFilterForm" class="registration-toolbar__form">
                    <label class="form-group assets-search-field">
                        <span class="form-label">Name</span>
                        <div class="assets-search-wrap">
                            <input
                                type="text"
                                name="name"
                                class="form-input assets-search-input"
                                placeholder="Search accountable officer"
                                autocomplete="off"
                            >
                        </div>
                    </label>
                    <label class="form-group">
                        <span class="form-label">Division</span>
                        <select name="division" class="form-input">
                            <option value="">All divisions</option>
                            <?php foreach ($divisions as $code => $label): ?>
                                <option value="<?= escape_html($code); ?>"><?= escape_html($code); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </label>
                    <div class="toolbar-actions toolbar-actions--stacked registration-toolbar__actions">
                        <button id="openOfficerRegistration" type="button" class="action-primary action-primary--accent">
                            <svg class="inline -ml-1 h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"></path></svg>
                            <span>Register Officer</span>
                        </button>
                    </div>
                </form>
            </div>

            <div class="mt-5 overflow-hidden rounded-[0.95rem] border border-slate-200 bg-white view-table-shell registration-table-shell">
                <div class="view-table-scroll">
                    <table class="registration-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Division</th>
                                <th>Position</th>
                                <th>Unit</th>
                                <th>Updated</th>
                                <th class="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="registrationTableBody"></tbody>
                    </table>
                </div>
            </div>
        </article>
    </div>
</section>

<div id="officerRegistrationModal" class="fixed inset-0 z-[1000] hidden items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
    <div class="registration-modal-shell">
        <div class="registration-modal__head">
            <div>
                <p class="panel-eyebrow">Accountable Officer</p>
                <h3 id="officerModalTitle" class="registration-modal__title">Add Officer</h3>
                <p id="officerModalCopy" class="registration-modal__copy">Register a new accountable officer in the directory.</p>
            </div>
            <button id="closeOfficerRegistration" type="button" class="asset-entry-close registration-modal__close" aria-label="Close officer registration">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
        </div>

        <form id="officerRegistrationForm" class="registration-modal__form">
            <input type="hidden" name="officer_id" value="">
            <input type="hidden" name="division" value="">
            <div class="registration-step-card">
                <div class="registration-step-card__header">
                    <h4 class="asset-step-card__title">Officer Details</h4>
                    <p class="registration-step-card__copy">Choose a division card first, then complete the officer profile below.</p>
                </div>

                <div class="registration-division-picker">
                    <?php foreach ($divisions as $code => $label): ?>
                        <button type="button" class="registration-division-card" data-division="<?= escape_html($code); ?>">
                            <span class="registration-division-card__code"><?= escape_html($code); ?></span>
                            <span class="registration-division-card__label"><?= escape_html($label); ?></span>
                        </button>
                    <?php endforeach; ?>
                </div>
                <span class="field-error hidden" data-error-for="division"></span>

                <div class="registration-form-grid">
                    <label class="form-group">
                        <span class="form-label">Name</span>
                        <input type="text" name="name" class="form-input" placeholder="Enter accountable officer name" autocomplete="off">
                        <span class="field-error hidden" data-error-for="name"></span>
                    </label>
                    <label class="form-group">
                        <span class="form-label">Position</span>
                        <input type="text" name="position" class="form-input" placeholder="Enter position" autocomplete="off">
                        <span class="field-error hidden" data-error-for="position"></span>
                    </label>
                    <label class="form-group registration-form-grid__wide">
                        <span class="form-label">Unit</span>
                        <input type="text" name="unit" class="form-input" placeholder="Enter unit or office" autocomplete="off">
                        <span class="field-error hidden" data-error-for="unit"></span>
                    </label>
                </div>

                <div class="asset-step-card__actions registration-modal__actions">
                    <button id="cancelOfficerRegistration" type="button" class="action-secondary">Cancel</button>
                    <button id="saveOfficerButton" type="submit" class="action-primary">Save Officer</button>
                </div>
            </div>
        </form>
    </div>
</div>

<div id="officerDetailsModal" class="fixed inset-0 z-[1000] hidden items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
    <div class="w-full max-w-3xl rounded-[1.2rem] bg-white p-6 shadow-2xl">
        <div class="flex items-start justify-between gap-4">
            <div>
                <p class="panel-eyebrow">Accountable Officer</p>
                <h3 id="officerDetailsName" class="panel-title">Officer</h3>
                <p id="officerDetailsMeta" class="mt-2 text-sm text-slate-500"></p>
            </div>
            <button id="closeOfficerDetailsModal" type="button" class="rounded-full border border-slate-200 p-2 text-slate-600">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
        </div>
        <div id="officerDetailsContent" class="mt-6 detail-grid"></div>
        <div class="mt-6 flex justify-end">
            <button id="closeOfficerDetailsButton" type="button" class="action-secondary">Close</button>
        </div>
    </div>
</div>
