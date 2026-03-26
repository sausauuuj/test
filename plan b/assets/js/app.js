const PROPERTY_TYPES = [
    'Computer Software',
    'Fixed Asset',
    'Furniture and Fixtures',
    'ICT Equipment',
    'Medicine Inventory',
    'Motor Vehicle',
    'Office Equipment',
];
const FUNDING_SOURCES = ['NEDA/DEPDev IX', 'RDC'];
const CLASSIFICATIONS = ['PPE', 'Semi'];
const DIVISIONS = ['FAD', 'PDIPBD', 'PFPD', 'PMED', 'DRD'];
const CATEGORY_THRESHOLD = 50000;

const appState = {
    assetDirectory: [],
    assetNameFilter: '',
    manageAssets: [],
    charts: {
        pie: null,
        bar: null,
    },
    moduleCache: {},
    pendingBulkPayload: null,
    activeView: 'dashboard',
    dashboardData: null,
    dashboardFilter: 'monthly',
    assetWizardStage: 'step1',
    assetTypeFilter: '',
    reportType: '',
    reportReady: false,
    reportPreview: [],
    moduleRequest: null,
    highlightedPropertyIds: [],
    highlightedParNumber: '',
    notifications: [],
    unreadNotifications: 0,
    notificationPanelOpen: false,
};

let manageSearchTimer = null;
let reportPreviewTimer = null;
let assetFilterTimer = null;

const currencyFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
});
const numberFormatter = new Intl.NumberFormat('en-PH');

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    }[character]));
}

function apiRequest(url, method = 'GET', data = {}, dataType = 'json', retries = null) {
    const normalizedMethod = String(method || 'GET').toUpperCase();
    const retryCount = retries === null ? (normalizedMethod === 'GET' ? 1 : 0) : retries;

    const runRequest = (remainingRetries) => $.ajax({
        url,
        method: normalizedMethod,
        data,
        dataType,
    }).then(
        (response) => response,
        (xhr, status, error) => {
            const shouldRetry = remainingRetries > 0 && (normalizedMethod === 'GET' || xhr.status === 0 || xhr.status >= 500);

            if (!shouldRetry) {
                return $.Deferred().reject(xhr, status, error).promise();
            }

            return $.Deferred((deferred) => {
                setTimeout(() => {
                    runRequest(remainingRetries - 1).then(deferred.resolve, deferred.reject);
                }, 300);
            }).promise();
        }
    );

    return runRequest(retryCount);
}

function formData($form) {
    const data = {};

    $.each($form.serializeArray(), (_, item) => {
        const key = item.name.endsWith('[]') ? item.name.slice(0, -2) : item.name;

        if (Object.prototype.hasOwnProperty.call(data, key)) {
            if (!Array.isArray(data[key])) {
                data[key] = [data[key]];
            }

            data[key].push(item.value);
            return;
        }

        data[key] = item.value;
    });

    return data;
}

function firstErrorMessage(errors = {}) {
    const values = Object.values(errors);
    return values.length ? String(values[0]) : '';
}

function showNotice(message, type = 'success') {
    const $notice = $('#globalNotice');

    if (!$notice.length) {
        return;
    }

    if (showNotice._timer) {
        window.clearTimeout(showNotice._timer);
    }

    const isError = String(type || '').toLowerCase() === 'error';
    $notice
        .removeClass('hidden notice-success notice-error')
        .addClass(isError ? 'notice-error' : 'notice-success')
        .text(String(message || ''));

    showNotice._timer = window.setTimeout(() => {
        $notice
            .addClass('hidden')
            .removeClass('notice-success notice-error')
            .empty();
    }, 4000);
}

function notifyTransaction(message, type = 'success') {
    showNotice(message, type);
    pushNotification(message, type);
}

function formatNotificationTimestamp(date = new Date()) {
    return date.toLocaleString('en-PH', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function renderNotifications() {
    const $list = $('#notificationList');
    const $empty = $('#notificationEmpty');
    const $badge = $('#notificationCount');

    if (!$list.length || !$empty.length || !$badge.length) {
        return;
    }

    const items = Array.isArray(appState.notifications) ? appState.notifications : [];
    const unread = Number(appState.unreadNotifications || 0);

    if (!items.length) {
        $list.empty();
        $empty.removeClass('hidden');
    } else {
        $empty.addClass('hidden');
        $list.html(items.map((item) => `
            <article class="site-notification__item site-notification__item--${escapeHtml(item.type)}">
                <div class="site-notification__item-head">
                    <span class="site-notification__item-badge">${escapeHtml(item.type === 'error' ? 'Alert' : 'Update')}</span>
                    <time class="site-notification__item-time">${escapeHtml(item.timestamp)}</time>
                </div>
                <p class="site-notification__item-copy">${escapeHtml(item.message)}</p>
            </article>
        `).join(''));
    }

    $badge.text(String(Math.min(unread, 99)));
    $badge.toggleClass('hidden', unread <= 0);
}

function setNotificationPanelVisible(visible) {
    const isVisible = Boolean(visible);
    $('#notificationPanel').toggleClass('hidden', !isVisible);
    $('#toggleNotifications').attr('aria-expanded', String(isVisible));
    appState.notificationPanelOpen = isVisible;

    if (isVisible) {
        appState.unreadNotifications = 0;
        renderNotifications();
    }
}

function pushNotification(message, type = 'success') {
    const normalizedMessage = String(message || '').trim();

    if (normalizedMessage === '') {
        return;
    }

    appState.notifications.unshift({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        message: normalizedMessage,
        type: String(type || 'success').toLowerCase() === 'error' ? 'error' : 'success',
        timestamp: formatNotificationTimestamp(),
    });
    appState.notifications = appState.notifications.slice(0, 20);

    if (!appState.notificationPanelOpen) {
        appState.unreadNotifications += 1;
    }

    renderNotifications();
}

function normalizeViewName(viewName) {
    const normalized = String(viewName || 'dashboard').replace('#', '').trim().toLowerCase();

    return ['dashboard', 'assets', 'manage', 'reports'].includes(normalized) ? normalized : 'dashboard';
}

function updateActiveNav(viewName) {
    const normalized = normalizeViewName(viewName);
    $('.nav-anchor').removeClass('active');
    $(`.nav-anchor[href="#${normalized}"]`).addClass('active');
}

function renderModuleLoading(viewName) {
    const label = normalizeViewName(viewName).replace(/^\w/, (character) => character.toUpperCase());
    $('#moduleContainer').html(`
        <section class="app-view active" data-view="${escapeHtml(normalizeViewName(viewName))}">
            <div class="view-scroll section-stack">
                <div class="panel-card">
                    <p class="panel-eyebrow">Loading Module</p>
                    <h2 class="section-title">${escapeHtml(label)}</h2>
                    <p class="section-copy">Fetching the latest view...</p>
                </div>
            </div>
        </section>
    `);
}

function initializeModule(viewName) {
    const normalized = normalizeViewName(viewName);

    if (normalized === 'dashboard') {
        updateDashboardFilterModeUI();
        refreshDashboard(true);
        return;
    }

    if (normalized === 'assets') {
        resetAssetWorkflow(true);
        if ($('#assetForm').length) {
            $('#assetForm').data('default-date', $('#assetForm [name="date_acquired"]').val());
        }
        $('#assetsFilterForm [name="property_name"]').val(appState.assetNameFilter || '');
        $('#assetsFilterForm [name="property_type"]').val(appState.assetTypeFilter || '');
        updateAssetFilterStatus();
        refreshAssetsDirectory(true);
        return;
    }

    if (normalized === 'manage') {
        refreshManagementView(true);
        return;
    }

    if (normalized === 'reports') {
        setReportType(appState.reportType || '', true);
        return;
    }
}

function setReportPlaceholder(message = 'Select a report type to begin.') {
    $('#reportContainer')
        .html(`<div class="report-empty-state">${escapeHtml(message)}</div>`)
        .attr('data-placeholder', 'true');
    $('#reportMeta').text('No report');
    $('#relatedDataMeta').text('0 matched');
    $('#relatedDataSummary').empty();
    $('#relatedDataTableBody').html('<tr><td colspan="4" class="px-4 py-10 text-center text-slate-500">Select a division and accountable officer to preview related PAR records.</td></tr>');
    $('#printReport').prop('disabled', true);
    $('#exportReportCsv').prop('disabled', true);
    appState.reportReady = false;
    appState.reportPreview = [];
}

function setReportWorkspaceVisible(visible) {
    const isVisible = Boolean(visible);
    const $workspace = $('#reportWorkflowArea');

    if (!$workspace.length) {
        return;
    }

    $workspace.toggleClass('hidden', !isVisible);
}

function syncReportOfficer() {
    const division = String($('#reportDivision').val() || '').trim();
    const officerId = String($('#reportOfficerSelect').val() || '').trim();
    const officerName = officerId
        ? String($('#reportOfficerSelect option:selected').text() || '').trim()
        : '';
    $('#selectedOfficerId').val(officerId);
    $('#selectedOfficer').val(officerName);
    $('#selectedDivision').val(division);
    $('#reportForm [name="officer_id"]').val(officerId);
    $('#reportForm [name="officer_name"]').val(officerName);
    $('#reportForm [name="division"]').val(division);
    return {
        officerId: Number(officerId || 0),
        officerName,
        division,
    };
}

function updateDashboardFilterModeUI() {
    const mode = String($('#dashboardFilterMode').val() || 'monthly').toLowerCase();
    $('.dashboard-monthly-picker').toggleClass('hidden', mode !== 'monthly');
    $('.dashboard-yearly-picker').toggleClass('hidden', mode !== 'yearly');
}

function updateAssetFilterStatus() {
    const label = String(appState.assetTypeFilter || '').trim();

    $('#assetFilterStatus').text(
        label
            ? `Current type filter: ${label}`
            : 'All property types are available for the next asset entry.'
    );
}

function populateAssetOfficers(division, officers = []) {
    const normalizedDivision = String(division || '').trim();
    const rows = Array.isArray(officers) ? officers : [];
    const $wrap = $('#assetOfficerField');
    const $select = $('#assetOfficerSelect');

    $wrap.removeClass('hidden');

    if (normalizedDivision === '') {
        $select.prop('disabled', true).html('<option value="">Select division first</option>');
        return;
    }

    if (!rows.length) {
        $select.prop('disabled', true).html('<option value="">No officers found for this division</option>');
        return;
    }

    $select.prop('disabled', false).html(
        ['<option value="">Select accountable officer</option>']
            .concat(rows.map((officer) => `<option value="${escapeHtml(officer.officer_id)}">${escapeHtml(officer.name)}</option>`))
            .join('')
    );
}

function loadAssetOfficers(division, silent = true) {
    const normalizedDivision = String(division || '').trim();

    if (normalizedDivision === '') {
        populateAssetOfficers('', []);
        $('#assetOfficerHint').text('Choose a division to load officers.');
        return $.Deferred().resolve();
    }

    populateAssetOfficers(normalizedDivision, []);
    $('#assetOfficerHint').text(`Loading officers under ${normalizedDivision}...`);

    return apiRequest('api/officers/filter.php', 'GET', { division: normalizedDivision })
        .done((response) => {
            const officers = response.data?.officers || [];
            populateAssetOfficers(normalizedDivision, officers);
            $('#assetOfficerHint').text(
                officers.length
                    ? `Select an accountable officer under ${normalizedDivision}.`
                    : `No officers found under ${normalizedDivision}.`
            );

            if (!silent) {
                showNotice(officers.length ? `${officers.length} officers loaded for ${normalizedDivision}.` : `No officers found under ${normalizedDivision}.`);
            }
        })
        .fail((xhr) => {
            $('#assetOfficerHint').text('Unable to load officers for the selected division.');
            handleRequestError(xhr, 'Unable to load officers for the selected division.');
        });
}

function populateReportOfficers(division, officers = []) {
    const normalizedDivision = String(division || '').trim();
    const rows = Array.isArray(officers) ? officers : [];
    const $wrap = $('#reportOfficerField');
    const $select = $('#reportOfficerSelect');

    if (normalizedDivision === '') {
        $wrap.addClass('hidden');
        $select.prop('disabled', true).html('<option value="">Select division first</option>');
        return;
    }

    $wrap.removeClass('hidden');

    if (!rows.length) {
        $select.prop('disabled', true).html('<option value="">No officers found for this division</option>');
        return;
    }

    $select.prop('disabled', false).html(
        ['<option value="">Select officer</option>']
            .concat(rows.map((officer) => `<option value="${escapeHtml(officer.officer_id)}">${escapeHtml(officer.name)}</option>`))
            .join('')
    );
}

function loadReportOfficers(division, silent = true) {
    const normalizedDivision = String(division || '').trim();

    syncReportOfficer();

    if (normalizedDivision === '') {
        populateReportOfficers('', []);
        $('#reportOfficerHint').text('Choose a division to load officers.');
        setReportPlaceholder('Choose a division and accountable officer to preview related PAR records.');
        return $.Deferred().resolve();
    }

    $('#reportOfficerField').removeClass('hidden');
    $('#reportOfficerSelect').prop('disabled', true).html('<option value="">Loading officers...</option>');
    $('#reportOfficerHint').text(`Loading officers under ${normalizedDivision}...`);

    return apiRequest('api/officers/filter.php', 'GET', { division: normalizedDivision })
        .done((response) => {
            const officers = response.data?.officers || [];
            populateReportOfficers(normalizedDivision, officers);
            $('#reportOfficerHint').text(
                officers.length
                    ? `Select an accountable officer under ${normalizedDivision}.`
                    : `No officers found under ${normalizedDivision}.`
            );

            if (!silent) {
                showNotice(officers.length ? `${officers.length} officers loaded for ${normalizedDivision}.` : `No officers found under ${normalizedDivision}.`);
            }
        })
        .fail((xhr) => {
            $('#reportOfficerHint').text('Unable to load officers for the selected division.');
            handleRequestError(xhr, 'Unable to load officers for the selected division.');
        });
}

function renderRelatedDataPreview(assets, officerName = '') {
    const rows = Array.isArray(assets) ? assets : [];
    const groups = new Map();
    let totalAmount = 0;

    rows.forEach((asset) => {
        const key = String(asset.par_number || 'No PAR');
        const bucket = groups.get(key) || { count: 0, amount: 0 };
        bucket.count += 1;
        bucket.amount += Number(asset.unit_cost || 0);
        groups.set(key, bucket);
        totalAmount += Number(asset.unit_cost || 0);
    });

    const summaryCards = [
        { label: 'Matched PARs', value: groups.size },
        { label: 'Asset Lines', value: rows.length },
        { label: 'Total Value', value: currencyFormatter.format(totalAmount) },
    ];

    $('#relatedDataMeta').text(`${rows.length} matched${officerName ? ` for ${officerName}` : ''}`);
    $('#relatedDataSummary').html(summaryCards.map((item) => `
        <div class="rounded-[0.9rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">${escapeHtml(item.label)}</div>
            <div class="mt-2 text-lg font-semibold text-slate-900">${escapeHtml(item.value)}</div>
        </div>
    `).join(''));

    if (!rows.length) {
        $('#relatedDataTableBody').html('<tr><td colspan="4" class="px-4 py-10 text-center text-slate-500">No related PAR records found for the selected officer.</td></tr>');
        return;
    }

    $('#relatedDataTableBody').html(rows.map((asset) => `
        <tr>
            <td class="px-4 py-4 font-medium text-slate-900">${escapeHtml(asset.par_number)}</td>
            <td class="px-4 py-4 text-slate-700">${escapeHtml(asset.par_date)}</td>
            <td class="px-4 py-4 text-slate-700">${escapeHtml(asset.property_name)}</td>
            <td class="px-4 py-4 text-slate-700">${escapeHtml(asset.property_type)}</td>
        </tr>
    `).join(''));
}

function fetchRelatedParPreview(silent = true) {
    const reportOfficer = syncReportOfficer();

    if (reportOfficer.division === '') {
        setReportPlaceholder('Choose a division and accountable officer to preview related PAR records.');
        return $.Deferred().resolve();
    }

    if (reportOfficer.officerId <= 0) {
        setReportPlaceholder(`Choose an accountable officer under ${reportOfficer.division} to preview related PAR records.`);
        return $.Deferred().resolve();
    }

    return apiRequest('api/assets/filter.php', 'GET', {
        officer_id: reportOfficer.officerId,
        division: reportOfficer.division,
    })
        .done((response) => {
            const assets = response.data?.assets || [];
            appState.reportPreview = assets;
            renderRelatedDataPreview(assets, reportOfficer.officerName);

            if (!silent) {
                showNotice(`Loaded ${assets.length} related asset record${assets.length === 1 ? '' : 's'} for ${reportOfficer.officerName || reportOfficer.division}.`);
            }
        })
        .fail((xhr) => {
            handleRequestError(xhr, 'Unable to load related PAR records.');
        });
}

function setReportType(reportType, silent = true) {
    const normalized = String(reportType || '').trim().toUpperCase();

    appState.reportType = normalized;
    $('.report-type-card').removeClass('is-active').attr('aria-pressed', 'false');
    $('#reportForm [name="report_type"]').val(normalized);

    if (normalized) {
        $(`.report-type-card[data-report-type="${normalized}"]`).addClass('is-active').attr('aria-pressed', 'true');
    }

    if (normalized === 'PAR') {
        setReportWorkspaceVisible(true);
        $('#parReportPanel').removeClass('hidden');
        $('#reportPreviewPanel').removeClass('hidden');
        $('#reportSelectionHint').text('PAR selected. Choose a division, then select an accountable officer.');
        setReportPlaceholder('Choose a division and accountable officer to preview related PAR records.');

        const division = $('#reportDivision').val() || '';
        if (division) {
            loadReportOfficers(division, true);
        } else {
            populateReportOfficers('', []);
            $('#reportOfficerHint').text('Choose a division to load officers.');
        }

        if (!silent) {
            showNotice('PAR report selected.');
            window.requestAnimationFrame(() => {
                $('#reportWorkflowArea')[0]?.scrollIntoView({ block: 'start', behavior: 'smooth' });
            });
        }

        return;
    }

    $('#parReportPanel').addClass('hidden');
    $('#reportPreviewPanel').removeClass('hidden');

    if (normalized === 'SPI' || normalized === 'ICS') {
        setReportWorkspaceVisible(true);
        $('#reportSelectionHint').text(`${normalized} was selected. Its template will follow after PAR.`);
        setReportPlaceholder(`${normalized} report generation is still being configured. Choose PAR to continue right now.`);

        if (!silent) {
            showNotice(`${normalized} reporting is not ready yet. PAR is available first.`, 'error');
            window.requestAnimationFrame(() => {
                $('#reportWorkflowArea')[0]?.scrollIntoView({ block: 'start', behavior: 'smooth' });
            });
        }

        return;
    }

    setReportWorkspaceVisible(false);
    $('#reportSelectionHint').text('Select PAR, SPI, or ICS to begin.');
    $('#reportPreviewPanel').addClass('hidden');
    setReportPlaceholder('Select a report type to begin.');
}

function resetReportWorkflow() {
    $('#reportForm')[0].reset();
    $('#reportForm [name="report_type"]').val('PAR');
    $('#selectedOfficerId').val('');
    $('#selectedOfficer').val('');
    $('#selectedDivision').val('');
    $('#reportDivision').val('');
    populateReportOfficers('', []);
    $('#reportOfficerHint').text('Choose a division to load officers.');
    appState.reportPreview = [];
    setReportPlaceholder('Choose a division and accountable officer to preview related PAR records.');
}

function refreshActiveReport(silent = true) {
    if (appState.activeView === 'reports' && appState.reportType === 'PAR') {
        return generateReport(silent);
    }

    return null;
}

function clearErrors(formSelector) {
    const $form = $(formSelector);
    $form.find('.field-error').addClass('hidden').text('');
    $form.find('[name]').removeClass('border-rose-500 ring-2 ring-rose-200');
}

function applyErrors(formSelector, errors = {}) {
    clearErrors(formSelector);

    Object.entries(errors).forEach(([field, message]) => {
        const $field = $(formSelector).find(`[data-error-for="${field}"]`);
        $field.removeClass('hidden').text(message);

        const fieldName = field.includes('.') ? `${field.split('.')[0]}[]` : field;
        $(formSelector).find(`[name="${fieldName}"]`).addClass('border-rose-500 ring-2 ring-rose-200');
    });
}

function handleRequestError(xhr, fallbackMessage, formSelector = null) {
    const response = xhr.responseJSON || {};
    const errors = response.errors || {};

    if (formSelector) {
        applyErrors(formSelector, errors);
    }

    showNotice(firstErrorMessage(errors) || response.message || fallbackMessage, 'error');
}

function normalizeCurrency(value) {
    return String(value ?? '').replace(/[^0-9.]/g, '');
}

function formatCurrencyInputValue(value) {
    const normalized = normalizeCurrency(value);

    if (normalized === '') {
        return '';
    }

    const numeric = Number(normalized);

    if (Number.isNaN(numeric)) {
        return value;
    }

    return new Intl.NumberFormat('en-PH', {
        minimumFractionDigits: normalized.includes('.') ? 2 : 0,
        maximumFractionDigits: 2,
    }).format(numeric);
}

function animateMetricValue(selector, targetValue, type = 'number') {
    const $element = $(selector);

    if (!$element.length) {
        return;
    }

    const target = Number(targetValue || 0);
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
        $element.text(type === 'currency' ? currencyFormatter.format(target) : numberFormatter.format(target));
        $element.data('value', target);
        return;
    }

    const start = Number($element.data('value') || 0);
    const duration = 700;
    const startTime = performance.now();

    const renderValue = (value) => {
        $element.text(
            type === 'currency'
                ? currencyFormatter.format(value)
                : numberFormatter.format(Math.round(value))
        );
    };

    const tick = (now) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - ((1 - progress) ** 3);
        const value = start + ((target - start) * eased);
        renderValue(value);

        if (progress < 1) {
            window.requestAnimationFrame(tick);
            return;
        }

        $element.data('value', target);
        renderValue(target);
    };

    window.requestAnimationFrame(tick);
}

function updateMetrics(metrics) {
    animateMetricValue('#metricAssets', metrics.total_assets || 0);
    animateMetricValue('#metricValue', metrics.total_value || 0, 'currency');
    animateMetricValue('#metricPpe', metrics.ppe_items || 0);
    animateMetricValue('#metricSemi', metrics.semi_items || 0);
}

function setResultPanel(result) {
    $('#assetResult').removeClass('hidden');
    $('#resultParNumber').text(result.par?.par_number || 'Not available');
    $('#resultPropertyIds').html(
        (result.property_ids || []).map((propertyId) => `<span class="property-chip">${escapeHtml(propertyId)}</span>`).join('')
    );
}

function currentAsset(assetId) {
    return appState.manageAssets.find((asset) => Number(asset.id) === Number(assetId))
        || appState.assetDirectory.find((asset) => Number(asset.id) === Number(assetId));
}

function closeSidebar() {
    $('#sidebar').addClass('-translate-x-full');
    $('#mobileOverlay').addClass('hidden');
}

function openSidebar() {
    $('#sidebar').removeClass('-translate-x-full');
    $('#mobileOverlay').removeClass('hidden');
}

function renderCharts(chartData) {
    if (!chartData || !$('#categoryChart').length || !$('#fundingChart').length) {
        return;
    }

    const pieLabels = chartData.pie?.labels || [];
    const pieValues = chartData.pie?.values || [];
    const barLabels = chartData.bar?.labels || [];
    const barValues = chartData.bar?.values || [];
    const piePalette = pieLabels.map((label, index) => {
        const normalized = String(label || '').toLowerCase();

        if (normalized.includes('semi')) {
            return '#4FC7C0';
        }

        if (normalized.includes('ppe')) {
            return '#1155A5';
        }

        return ['#1155A5', '#2C74B3', '#4A90E2', '#7BA7D9', '#A4C2F4', '#7DD3FC'][index % 6];
    });

    if (appState.charts.pie) {
        appState.charts.pie.destroy();
    }

    if (appState.charts.bar) {
        appState.charts.bar.destroy();
    }

    appState.charts.pie = new Chart(document.getElementById('categoryChart'), {
        type: 'pie',
        data: {
            labels: pieLabels,
            datasets: [{
                data: pieValues,
                backgroundColor: piePalette,
                borderColor: '#ffffff',
                borderWidth: 2,
                hoverOffset: 6,
            }],
        },
        options: {
            maintainAspectRatio: false,
            animation: {
                duration: 900,
                easing: 'easeOutQuart',
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'rect',
                        boxWidth: 12,
                        color: '#1155A5',
                        font: {
                            family: 'Inter',
                            size: 12,
                            weight: '600',
                        },
                    },
                },
            },
        },
    });

    appState.charts.bar = new Chart(document.getElementById('fundingChart'), {
        type: 'bar',
        data: {
            labels: barLabels,
            datasets: [{
                label: 'Amount (₱)',
                data: barValues,
                backgroundColor: '#1155A5',
                borderRadius: 6,
                borderSkipped: false,
                maxBarThickness: 216,
            }],
        },
        options: {
            maintainAspectRatio: false,
            animation: {
                duration: 900,
                easing: 'easeOutQuart',
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        boxWidth: 16,
                        color: '#1155A5',
                        font: {
                            family: 'Inter',
                            size: 12,
                            weight: '600',
                        },
                    },
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(148, 163, 184, 0.18)',
                        borderDash: [4, 4],
                    },
                    ticks: {
                        callback(value) {
                            const numeric = Number(value || 0);
                            return `₱${numberFormatter.format(Math.round(numeric / 1000))}k`;
                        },
                        color: '#64748b',
                        font: {
                            family: 'Inter',
                            size: 11,
                        },
                    },
                },
                x: {
                    grid: {
                        display: false,
                    },
                    ticks: {
                        color: '#64748b',
                        font: {
                            family: 'Inter',
                            size: 11,
                        },
                    },
                },
            },
        },
    });
}

function renderManageTypeChart() {
    const canvas = document.getElementById('manageTypeChart');

    if (!canvas) {
        return;
    }

    const counts = new Map();
    PROPERTY_TYPES.forEach((type) => counts.set(type, 0));

    (appState.manageAssets || []).forEach((asset) => {
        const propertyType = String(asset.property_type || '').trim();

        if (counts.has(propertyType)) {
            counts.set(propertyType, Number(counts.get(propertyType) || 0) + 1);
            return;
        }

        if (propertyType !== '') {
            counts.set(propertyType, 1);
        }
    });

    const entries = Array.from(counts.entries()).filter(([, value]) => Number(value) > 0);
    const labels = entries.map(([label]) => label);
    const values = entries.map(([, value]) => value);
    const colors = ['#1155A5', '#53C3C1', '#FF6767', '#FFA074', '#90D0C3', '#F8DF74', '#AD83C5'];

    if (appState.charts.manage) {
        appState.charts.manage.destroy();
        appState.charts.manage = null;
    }

    if (!labels.length) {
        const context = canvas.getContext('2d');
        if (context) {
            context.clearRect(0, 0, canvas.width, canvas.height);
        }
        return;
    }

    appState.charts.manage = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Count',
                data: values,
                backgroundColor: labels.map((_, index) => colors[index % colors.length]),
                borderRadius: 4,
                borderSkipped: false,
            }],
        },
        options: {
            maintainAspectRatio: false,
            animation: {
                duration: 900,
                easing: 'easeOutQuart',
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        boxWidth: 14,
                        color: '#111827',
                        font: {
                            family: 'Inter',
                            size: 12,
                            weight: '600',
                        },
                    },
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                        stepSize: 1,
                        color: '#64748b',
                        font: {
                            family: 'Inter',
                            size: 11,
                        },
                    },
                    grid: {
                        color: 'rgba(148, 163, 184, 0.18)',
                        borderDash: [4, 4],
                    },
                },
                x: {
                    grid: {
                        color: 'rgba(148, 163, 184, 0.12)',
                        borderDash: [4, 4],
                    },
                    ticks: {
                        minRotation: 35,
                        maxRotation: 35,
                        color: '#64748b',
                        font: {
                            family: 'Inter',
                            size: 11,
                        },
                    },
                },
            },
        },
    });
}

function activateView(viewName, updateHash = true) {
    const finalView = normalizeViewName(viewName);
    const currentView = normalizeViewName(appState.activeView);
    const hasCurrentModule = $('#moduleContainer [data-view]').length > 0;

    if (appState.moduleRequest && appState.moduleRequest.readyState !== 4) {
        appState.moduleRequest.abort();
        appState.moduleRequest = null;
    }

    if (hasCurrentModule && currentView !== finalView) {
        if (currentView === 'dashboard') {
            if (appState.charts.pie) {
                appState.charts.pie.destroy();
                appState.charts.pie = null;
            }

            if (appState.charts.bar) {
                appState.charts.bar.destroy();
                appState.charts.bar = null;
            }
        }

        if (currentView === 'manage' && appState.charts.manage) {
            appState.charts.manage.destroy();
            appState.charts.manage = null;
        }

        appState.moduleCache[currentView] = $('#moduleContainer').html();
    }

    if (currentView === finalView && $('#moduleContainer [data-view="' + finalView + '"]').length) {
        updateActiveNav(finalView);

        if (updateHash) {
            history.replaceState(null, '', `#${finalView}`);
        }

        return $.Deferred().resolve();
    }

    appState.activeView = finalView;
    updateActiveNav(finalView);

    if (updateHash) {
        history.replaceState(null, '', `#${finalView}`);
    }

    if (appState.moduleCache[finalView]) {
        $('#moduleContainer').html(appState.moduleCache[finalView]);
        $('#moduleContainer .app-view').addClass('active');
        initializeModule(finalView);
        return $.Deferred().resolve();
    }

    renderModuleLoading(finalView);

    if (appState.moduleRequest && appState.moduleRequest.readyState !== 4) {
        appState.moduleRequest.abort();
    }

    appState.moduleRequest = apiRequest('module.php', 'GET', { view: finalView }, 'html');

    return appState.moduleRequest
        .done((html) => {
            appState.moduleRequest = null;
            appState.moduleCache[finalView] = html;
            $('#moduleContainer').html(html);
            $('#moduleContainer .app-view').addClass('active');
            initializeModule(finalView);
        })
        .fail((xhr) => {
            if (xhr && xhr.statusText === 'abort') {
                return;
            }

            appState.moduleRequest = null;
            const message = xhr.responseText || `Unable to load the ${finalView} module.`;
            $('#moduleContainer').html(`
                <section class="app-view active" data-view="${escapeHtml(finalView)}">
                    <div class="view-scroll section-stack">
                        <div class="panel-card">
                            <p class="panel-eyebrow">Module Error</p>
                            <h2 class="section-title">Unable to load ${escapeHtml(finalView)}</h2>
                            <p class="section-copy">${escapeHtml(message)}</p>
                        </div>
                    </div>
                </section>
            `);
            showNotice(`Unable to load the ${finalView} module.`, 'error');
        });
}

function updateAssetSubmitButton() {
    const quantity = Number($('#assetForm [name="quantity"]').val() || 1);
    $('#assetSubmitButton span').text(quantity > 1 ? 'Save & Enter Serial Nos.' : 'Save & Enter Serial No.');
}

function setAssetEntryVisible(visible) {
    $('#assetEntryPanel').toggleClass('hidden', !visible).toggleClass('flex', visible);
    $('body').toggleClass('overflow-hidden', visible);
}

function updateAssetChoiceButtons() {
    ['classification', 'funding_source'].forEach((target) => {
        const selectedValue = String($(`#assetForm [name="${target}"]`).val() || '').trim();
        $(`.asset-choice-btn[data-target="${target}"]`).each(function () {
            const isSelected = String($(this).data('value') || '').trim() === selectedValue;
            $(this).toggleClass('is-selected', isSelected).attr('aria-pressed', String(isSelected));
        });
    });
}

function updateAssetUnitCostRule() {
    const classification = String($('#assetForm [name="classification"]').val() || '').trim();
    const $rule = $('#assetUnitCostRule');

    if (!$rule.length) {
        return;
    }

    if (classification === 'PPE') {
        $rule.text('(>= PHP 50,000)');
        return;
    }

    if (classification === 'Semi') {
        $rule.text('(< PHP 50,000)');
        return;
    }

    $rule.text('');
}

function renderAssetSerialSummary(payload = {}) {
    $('#serialSummaryName').text(String(payload.property_name || '-'));
    $('#serialSummaryType').text(String(payload.property_type || '-'));
    $('#serialSummaryClassification').text(String(payload.classification || '-'));

    const unitCost = Number(normalizeCurrency(payload.unit_cost || 0));
    $('#serialSummaryCost').text(unitCost > 0 ? currencyFormatter.format(unitCost) : '-');

    const quantity = Number(payload.quantity || 0);
    $('#assetSerialSubtitle').text(
        `Assign a unique Property ID / serial number for each of the ${quantity || 0} item${quantity === 1 ? '' : 's'}`
    );
}

function updateAssetWizardChrome(stage) {
    const normalized = String(stage || 'step1').toLowerCase();
    const progressStateMap = {
        step1: ['active', 'pending', 'pending'],
        step2: ['complete', 'active', 'pending'],
        step3: ['complete', 'complete', 'active'],
        serial: ['complete', 'complete', 'complete'],
    };
    const states = progressStateMap[normalized] || progressStateMap.step1;
    const keys = ['step1', 'step2', 'step3'];
    const completeLineCount = normalized === 'step1' ? 0 : normalized === 'step2' ? 1 : 2;

    keys.forEach((key, index) => {
        const state = states[index];
        const $step = $(`.asset-progress-step[data-progress-step="${key}"]`);
        $step.removeClass('is-active is-complete is-pending');
        $step.addClass(`is-${state}`);
    });

    $('.asset-progress__line').each(function (index) {
        $(this).toggleClass('is-complete', index < completeLineCount);
    });

    $('#assetProgressTracker').toggleClass('hidden', normalized === 'serial');

    if (normalized === 'serial') {
        $('#assetWizardMainTitle').text('Enter Serial Numbers');
        $('#assetWizardMainSubtitle').text('Assign a unique Property ID / serial number for each saved asset.');
        return;
    }

    $('#assetWizardMainTitle').text('Add Assets');
    $('#assetWizardMainSubtitle').text('Register a new asset in the inventory');
}

function showAssetWizardStep(step) {
    const normalized = String(step || 'step1').toLowerCase();
    const isStep1 = normalized === 'step1';
    const isStep2 = normalized === 'step2';
    const isStep3 = normalized === 'step3';
    const isSerial = normalized === 'serial';

    appState.assetWizardStage = normalized;
    $('#assetForm').data('stage', normalized);

    $('#assetStep1Section').toggleClass('hidden', !isStep1);
    $('#assetStep2Section').toggleClass('hidden', !isStep2);
    $('#assetStep3Section').toggleClass('hidden', !isStep3);
    $('#bulkSerialPanel').toggleClass('hidden', !isSerial);

    if (isStep3 && !String($('#assetForm [name="property_type"]').val() || '').trim()) {
        $('#assetForm [name="property_type"]').val(appState.assetTypeFilter || '');
    }

    updateAssetChoiceButtons();
    updateAssetUnitCostRule();
    updateAssetWizardChrome(normalized);
    updateAssetSubmitButton();
}

function validateAssetStepOne(payload) {
    const errors = {};

    if (!CLASSIFICATIONS.includes(payload.classification || '')) {
        errors.classification = 'Select a valid classification.';
    }

    if (!FUNDING_SOURCES.includes(payload.funding_source || '')) {
        errors.funding_source = 'Select a valid funding source.';
    }

    return errors;
}

function validateAssetStepTwo(payload) {
    const errors = {};

    if (!DIVISIONS.includes(payload.division || '')) {
        errors.division = 'Choose a division from the list.';
    }

    if (String(payload.officer_name || '').trim() === '') {
        errors.officer_name = 'Enter the accountable officer name.';
    }

    return errors;
}

function validateAssetDraft(payload) {
    const errors = {};
    const quantity = Number(payload.quantity || 0);
    const unitCost = Number(normalizeCurrency(payload.unit_cost));

    if (!CLASSIFICATIONS.includes(payload.classification || '')) {
        errors.classification = 'Select a valid property classification.';
    }

    if (!FUNDING_SOURCES.includes(payload.funding_source || '')) {
        errors.funding_source = 'Select a valid funding source.';
    }

    if (String(payload.officer_name || '').trim() === '') {
        errors.officer_name = 'Enter the accountable officer name.';
    }

    if (!DIVISIONS.includes(payload.division || '')) {
        errors.division = 'Choose a division from the list.';
    }

    if ((payload.property_name || '').trim() === '') {
        errors.property_name = 'Property name is required.';
    }

    if (!PROPERTY_TYPES.includes(payload.property_type || '')) {
        errors.property_type = 'Select a valid property type.';
    }

    if (!unitCost || unitCost <= 0) {
        errors.unit_cost = 'Enter a valid unit cost.';
    }

    if ((payload.classification || '') === 'PPE' && unitCost < CATEGORY_THRESHOLD) {
        errors.unit_cost = 'PPE assets must be valued at PHP 50,000 or above.';
    }

    if ((payload.classification || '') === 'Semi' && unitCost >= CATEGORY_THRESHOLD) {
        errors.unit_cost = 'Semi-expendable assets must be valued below PHP 50,000.';
    }

    if (!quantity || quantity <= 0) {
        errors.quantity = 'Quantity must be at least 1.';
    }

    if ((payload.date_acquired || '').trim() === '') {
        errors.date_acquired = 'Date acquired is required.';
    }

    if ((payload.description || '').trim() === '') {
        errors.description = 'Description is required.';
    }

    return errors;
}

function renderSerialFields(quantity) {
    const fields = [];

    for (let index = 0; index < quantity; index += 1) {
        fields.push(`
            <div class="asset-serial-field">
                <div class="asset-serial-field__index">${index + 1}</div>
                <label class="form-group asset-serial-field__input">
                    <input type="text" name="property_ids[]" class="form-input asset-form-input" placeholder="Serial number for item ${index + 1}" autocomplete="off">
                    <span class="field-error hidden" data-error-for="property_ids.${index}"></span>
                </label>
            </div>
        `);
    }

    $('#serialNumberFields').html(fields.join(''));
}

function prepareBulkSerialStep(payload) {
    const quantity = Number(payload.quantity || 0);

    appState.pendingBulkPayload = {
        ...payload,
        unit_cost: normalizeCurrency(payload.unit_cost),
    };

    renderAssetSerialSummary(appState.pendingBulkPayload);
    renderSerialFields(quantity);
    showAssetWizardStep('serial');
    showNotice(`Base details checked. Enter ${quantity} serial number${quantity > 1 ? 's' : ''} to finish saving.`);
}

function resetAssetWorkflow(hideResult = false) {
    if ($('#assetForm').length) {
        $('#assetForm')[0].reset();
        const defaultDate = $('#assetForm').data('default-date')
            || $('#assetForm [name="date_acquired"]').val()
            || new Date().toISOString().slice(0, 10);
        $('#assetForm [name="date_acquired"]').val(defaultDate);
        $('#assetForm [name="property_type"]').val(appState.assetTypeFilter || '');
        $('#assetForm [name="officer_name"]').val('');
        $('#assetForm [name="classification"]').val('');
        $('#assetForm [name="funding_source"]').val('');
    }
    $('#serialNumberFields').empty();
    $('#assetStep1Section').removeClass('hidden');
    $('#assetStep2Section').addClass('hidden');
    $('#assetStep3Section').addClass('hidden');
    $('#bulkSerialPanel').addClass('hidden');
    clearErrors('#assetForm');
    appState.pendingBulkPayload = null;
    appState.assetWizardStage = 'step1';
    $('#assetForm').data('stage', 'step1');

    if (hideResult) {
        $('#assetResult').addClass('hidden');
    }

    renderAssetSerialSummary({});
    updateAssetChoiceButtons();
    updateAssetUnitCostRule();
    showAssetWizardStep('step1');

    updateAssetSubmitButton();
}

function renderAssetsDirectoryTable(rows = appState.assetDirectory) {
    if (!$('#assetsDirectoryMeta').length || !$('#assetsDirectoryBody').length) {
        return [];
    }

    const assets = Array.isArray(rows) ? rows : [];
    const highlightedIds = new Set((appState.highlightedPropertyIds || []).map((propertyId) => String(propertyId || '').trim()).filter(Boolean));
    const highlightedParNumber = String(appState.highlightedParNumber || '').trim();
    $('#assetsDirectoryMeta').text(`${assets.length} records`);

    if (!assets.length) {
        $('#assetsDirectoryBody').html('<tr><td colspan="5" class="px-4 py-10 text-center text-slate-500">No assets found for the current search.</td></tr>');
        return assets;
    }

    $('#assetsDirectoryBody').html(
        assets.map((asset) => `
            <tr class="${highlightedIds.has(String(asset.property_id || '').trim()) || (highlightedParNumber && String(asset.par_number || '').trim() === highlightedParNumber) ? 'assets-directory-row--highlight' : ''}" data-property-id="${escapeHtml(asset.property_id || '')}" data-par-number="${escapeHtml(asset.par_number || '')}">
                <td class="px-4 py-4 font-medium text-slate-900">${escapeHtml(asset.par_number)}</td>
                <td class="px-4 py-4 text-slate-700">${escapeHtml(asset.par_date)}</td>
                <td class="px-4 py-4 text-slate-700">${escapeHtml(asset.officer_name)}</td>
                <td class="px-4 py-4 text-slate-700">${escapeHtml(asset.property_name)}</td>
                <td class="px-4 py-4 text-slate-700">${escapeHtml(asset.property_type)}</td>
            </tr>
        `).join('')
    );

    const $highlightedRow = $('#assetsDirectoryBody .assets-directory-row--highlight').first();
    if ($highlightedRow.length) {
        window.requestAnimationFrame(() => {
            $highlightedRow[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
        });
    }

    return assets;
}

function renderManageAssetsTable() {
    $('#assetTableMeta').text(`${appState.manageAssets.length} records`);
    renderManageTypeChart();

    if (!appState.manageAssets.length) {
        $('#assetTableBody').html('<tr><td colspan="9" class="px-4 py-10 text-center text-slate-500">No assets found for the selected filters.</td></tr>');
        return;
    }

    $('#assetTableBody').html(
        appState.manageAssets.map((asset) => `
            <tr class="manage-table__row">
                <td class="manage-table__cell manage-table__cell--name">
                    <div class="manage-asset-name">${escapeHtml(asset.property_name)}</div>
                    <div class="manage-asset-meta">${escapeHtml(asset.property_id || 'No Property ID')}</div>
                </td>
                <td class="manage-table__cell">${escapeHtml(asset.property_type)}</td>
                <td class="manage-table__cell">
                    <span class="manage-class-badge manage-class-badge--${String(asset.classification || '').toLowerCase()}">${escapeHtml(asset.classification)}</span>
                </td>
                <td class="manage-table__cell">${escapeHtml(asset.funding_source)}</td>
                <td class="manage-table__cell manage-table__cell--cost">${currencyFormatter.format(Number(asset.unit_cost || 0))}</td>
                <td class="manage-table__cell">
                    <div class="manage-officer-name">${escapeHtml(asset.officer_name)}</div>
                    <div class="manage-officer-meta">${escapeHtml(asset.division)}</div>
                </td>
                <td class="manage-table__cell">
                    <div class="manage-par-number">${escapeHtml(asset.par_number)}</div>
                    <div class="manage-par-meta">${escapeHtml(asset.par_date)}</div>
                </td>
                <td class="manage-table__cell">${escapeHtml(asset.current_condition || 'Not set')}</td>
                <td class="manage-table__cell manage-table__cell--actions">
                    <div class="manage-actions">
                        <button type="button" class="manage-action-icon manage-action-icon--info details-asset" data-id="${asset.id}" title="View details" aria-label="View details">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="M2.5 12s3.6-6 9.5-6 9.5 6 9.5 6-3.6 6-9.5 6-9.5-6-9.5-6Z"></path>
                                <circle cx="12" cy="12" r="2.6"></circle>
                            </svg>
                            <span class="sr-only">Details</span>
                        </button>
                        <button type="button" class="manage-action-icon manage-action-icon--info edit-asset" data-id="${asset.id}" title="Update asset" aria-label="Update asset">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="M4 20h4l10-10a1.8 1.8 0 0 0-4-4L4 16v4z"></path>
                                <path d="m13.5 6.5 4 4"></path>
                            </svg>
                            <span class="sr-only">Update</span>
                        </button>
                        <button type="button" class="manage-action-icon manage-action-icon--danger delete-asset" data-id="${asset.id}" title="Delete asset" aria-label="Delete asset">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="M5 7h14"></path>
                                <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7"></path>
                                <path d="M8 7l1 12h6l1-12"></path>
                                <path d="M10.5 11v5"></path>
                                <path d="M13.5 11v5"></path>
                            </svg>
                            <span class="sr-only">Delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('')
    );
}

function renderDetailsBody(asset) {
    const renderItems = (items) => items.map(([label, value]) => `
        <div class="detail-item">
            <div class="detail-label">${escapeHtml(label)}</div>
            <div class="detail-value">${escapeHtml(value || 'Not available')}</div>
        </div>
    `).join('');

    const officerDetails = [
        ['Name', asset.officer_name],
        ['Division', asset.division],
        ['PAR Number', asset.par_number],
        ['PAR Date', asset.par_date],
    ];

    const propertyDetails = [
        ['Property Name', asset.property_name],
        ['Property Type', asset.property_type],
        ['Property ID', asset.property_id],
        ['Quantity', asset.quantity],
        ['Unit Cost', currencyFormatter.format(Number(asset.unit_cost || 0))],
        ['Funding Source', asset.funding_source],
        ['Classification', asset.classification],
        ['Date Acquired', asset.date_acquired],
        ['Current Condition', asset.current_condition],
        ['Remarks', asset.remarks || 'No remarks'],
        ['Description', asset.description || 'No description'],
    ];

    $('#detailsContent').html(`
        <section class="detail-section">
            <div class="detail-section__head">
                <p class="panel-eyebrow">Accountable Officer Details</p>
                <h4 class="panel-title">Assignment context</h4>
            </div>
            <div class="detail-grid mt-4">${renderItems(officerDetails)}</div>
        </section>
        <section class="detail-section">
            <div class="detail-section__head">
                <p class="panel-eyebrow">Property Details</p>
                <h4 class="panel-title">Asset information</h4>
            </div>
            <div class="detail-grid mt-4">${renderItems(propertyDetails)}</div>
        </section>
    `);
}

function saveAssetBatch(payload, errorFormSelector) {
    const requestPayload = {
        ...payload,
        unit_cost: normalizeCurrency(payload.unit_cost),
    };

    return apiRequest('api/assets/add.php', 'POST', requestPayload)
        .done((response) => {
            const count = (response.data?.property_ids || []).length;
            const createdAssets = Array.isArray(response.data?.assets) ? response.data.assets : [];
            const firstAsset = createdAssets[0] || {};
            const propertyIds = (response.data?.property_ids || createdAssets.map((asset) => asset.property_id)).filter(Boolean);

            appState.highlightedPropertyIds = propertyIds.map((propertyId) => String(propertyId).trim()).filter(Boolean);
            appState.highlightedParNumber = String(response.data?.par?.par_number || firstAsset.par_number || '').trim();

            $('#assetsFilterForm')[0]?.reset();
            appState.assetNameFilter = '';
            appState.assetTypeFilter = '';
            updateAssetFilterStatus();

            notifyTransaction(response.message || `Saved ${count} asset record${count === 1 ? '' : 's'} successfully.`);
            resetAssetWorkflow(true);
            setAssetEntryVisible(false);

            $.when(refreshDashboard(true), refreshAssetsDirectory(true), refreshManagementView(true)).always(() => {
                refreshActiveReport(true);
            });
        })
        .fail((xhr) => {
            handleRequestError(xhr, 'Unable to save the asset batch.', errorFormSelector);
        });
}

function refreshDashboard(silent = true) {
    const period = $('#dashboardFilterMode').length
        ? String($('#dashboardFilterMode').val() || 'overview').trim().toLowerCase()
        : 'overview';
    const year = $('#dashboardYear').length ? ($('#dashboardYear').val() || new Date().getFullYear()) : new Date().getFullYear();
    const month = $('#dashboardMonth').length ? ($('#dashboardMonth').val() || (new Date().getMonth() + 1)) : (new Date().getMonth() + 1);

    const params = {
        dashboard_filter: period,
        year: year,
        month: period === 'monthly' ? month : null,
    };

    return apiRequest('api/charts/data.php', 'GET', params)
        .done((response) => {
            appState.dashboardData = response.data || {};
            updateMetrics(response.data?.metrics || {});
            if (appState.activeView === 'dashboard') {
                renderCharts(appState.dashboardData);
            }

            if (!silent) {
                showNotice(`Dashboard refreshed for ${period} view.`);
            }
        })
        .fail((xhr) => {
            handleRequestError(xhr, 'Unable to refresh the dashboard.');
        });
}

function refreshAssetsDirectory(silent = true) {
    const hasFilterForm = $('#assetsFilterForm').length > 0;
    const selectedName = hasFilterForm
        ? String($('#assetsFilterForm [name="property_name"]').val() || '').trim()
        : String(appState.assetNameFilter || '').trim();
    const selectedType = hasFilterForm
        ? String($('#assetsFilterForm [name="property_type"]').val() || '').trim()
        : String(appState.assetTypeFilter || '').trim();
    const hasDirectoryTable = $('#assetsDirectoryMeta').length && $('#assetsDirectoryBody').length;

    appState.assetNameFilter = selectedName;
    appState.assetTypeFilter = selectedType;
    updateAssetFilterStatus();

    return apiRequest('api/assets/filter.php', 'GET', {
        property_name: selectedName,
        property_type: selectedType,
    })
        .done((response) => {
            appState.assetDirectory = response.data?.assets || [];
            if (hasDirectoryTable) {
                renderAssetsDirectoryTable(appState.assetDirectory);
            }

            if (!silent) {
                showNotice(selectedName || selectedType ? 'Asset filters applied.' : 'Showing all asset records.');
            }
        })
        .fail((xhr) => {
            handleRequestError(xhr, 'Unable to load the asset directory.');
        });
}

function refreshManagementView(silent = true) {
    const filters = formData($('#assetFilterForm'));

    return apiRequest('api/assets/filter.php', 'GET', filters)
        .done((response) => {
            appState.manageAssets = response.data?.assets || [];
            renderManageAssetsTable();

            if (!silent) {
                const hasFilters = Object.values(filters).some((value) => String(value || '').trim() !== '');
                showNotice(hasFilters ? 'Asset filters applied.' : 'Showing all asset records.');
            }
        })
        .fail((xhr) => {
            handleRequestError(xhr, 'Unable to load asset records.');
        });
}

function generateReport(silent = true) {
    if (appState.reportType !== 'PAR') {
        setReportPlaceholder('Select PAR to generate the printable Property Acknowledgment Receipt.');

        if (!silent) {
            showNotice('Select PAR first before generating a report.', 'error');
        }

        return null;
    }

    const reportOfficer = syncReportOfficer();

    if (reportOfficer.division === '' || reportOfficer.officerId <= 0) {
        setReportPlaceholder('Choose a division and accountable officer to preview related PAR records.');

        if (!silent) {
            showNotice('Choose a division and accountable officer before generating the PAR report.', 'error');
        }

        return null;
    }

    return apiRequest('api/reports/generate.php', 'POST', formData($('#reportForm')))
        .done((response) => {
            $('#reportContainer')
                .html(response.data?.html || '')
                .attr('data-placeholder', 'false');
            $('#reportMeta').text(response.data?.meta_label || `${response.data?.count || 0} rows`);
            appState.reportReady = true;
            $('#printReport').prop('disabled', false);
            $('#exportReportCsv').prop('disabled', false);

            if (!silent) {
                showNotice('PAR report generated successfully.');
            }
        })
        .fail((xhr) => {
            appState.reportReady = false;
            handleRequestError(xhr, 'Unable to generate the report.');
        });
}

function openEditModal(asset) {
    if (!asset) {
        showNotice('Unable to load the selected asset.', 'error');
        return;
    }

    clearErrors('#editAssetForm');
    $('#editAssetForm [name="id"]').val(asset.id);
    $('#editAssetForm [name="current_condition"]').val(asset.current_condition || '');
    $('#editAssetForm [name="remarks"]').val(asset.remarks || '');
    $('#editAssetName').text(asset.property_name || 'Asset');
    $('#editAssetMeta').text(`${asset.property_id || 'No Property ID'} - ${asset.par_number} - ${asset.officer_name}`);
    $('#editModal').removeClass('hidden').addClass('flex');
    $('body').addClass('overflow-hidden');
}

function closeEditModal() {
    $('#editModal').addClass('hidden').removeClass('flex');
    $('body').removeClass('overflow-hidden');
}

function openDetailsModal(asset) {
    if (!asset) {
        showNotice('Unable to load the selected asset.', 'error');
        return;
    }

    $('#detailsAssetName').text(asset.property_name || 'Asset');
    $('#detailsAssetMeta').text(`${asset.property_id || 'No Property ID'} - ${asset.par_number} - ${asset.officer_name}`);
    renderDetailsBody(asset);
    $('#detailsModal').removeClass('hidden').addClass('flex');
    $('body').addClass('overflow-hidden');
}

function closeDetailsModal() {
    $('#detailsModal').addClass('hidden').removeClass('flex');
    $('body').removeClass('overflow-hidden');
}

function updateLiveClock() {
    if (!$('#liveClock').length) {
        return;
    }

    const now = new Date();
    const dateLabel = now.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
    const timeLabel = now.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
    $('#liveClock').text(`${dateLabel} ${timeLabel}`);
}

$(function () {
    const $doc = $(document);
    const $win = $(window);

    $('#moduleContainer').data('default-view', 'dashboard');
    appState.moduleCache.dashboard = $('#moduleContainer').html();
    $('#assetForm').data('default-date', $('#assetForm [name="date_acquired"]').val());

    updateAssetSubmitButton();
    updateLiveClock();
    renderNotifications();
    setInterval(updateLiveClock, 1000);

    $doc.off('.app');
    $win.off('.app');

    $doc.on('click.app', '#openSidebar', function () {
        openSidebar();
    });

    $doc.on('click.app', '#closeSidebar, #mobileOverlay', function () {
        closeSidebar();
    });

    $doc.on('click.app', '#toggleNotifications', function (event) {
        event.stopPropagation();
        setNotificationPanelVisible(!appState.notificationPanelOpen);
    });

    $doc.on('click.app', '#notificationPanel', function (event) {
        event.stopPropagation();
    });

    $doc.on('click.app', '#clearNotifications', function () {
        appState.notifications = [];
        appState.unreadNotifications = 0;
        renderNotifications();
    });

    $doc.on('click.app', '.nav-anchor', function (event) {
        event.preventDefault();
        activateView($(this).attr('href'));
        closeSidebar();
    });

    $win.on('hashchange.app', function () {
        activateView(window.location.hash || '#dashboard', false);
    });

    $doc.on('click.app', '#openAssetEntry', function () {
        $.when(activateView('assets')).done(() => {
            resetAssetWorkflow(true);
            const selectedType = String($('#assetsFilterForm [name="property_type"]').val() || appState.assetTypeFilter || '').trim();
            appState.assetTypeFilter = selectedType;
            $('#assetForm [name="property_type"]').val(selectedType);
            updateAssetFilterStatus();
            setAssetEntryVisible(true);
        });
    });

    $doc.on('click.app', '#closeAssetEntry', function () {
        resetAssetWorkflow(true);
        setAssetEntryVisible(false);
    });

    $doc.on('click.app', '#cancelAssetWizard', function () {
        resetAssetWorkflow(true);
        setAssetEntryVisible(false);
        showNotice('Asset entry cancelled.', 'error');
    });

    $doc.on('click.app', '#assetStep2Back', function () {
        clearErrors('#assetForm');
        showAssetWizardStep('step1');
    });

    $doc.on('click.app', '#assetStep3Back', function () {
        clearErrors('#assetForm');
        showAssetWizardStep('step2');
    });

    $doc.on('click.app', '#assetSerialBack', function () {
        clearErrors('#assetForm');
        appState.pendingBulkPayload = null;
        $('#serialNumberFields').empty();
        showAssetWizardStep('step3');
    });

    $doc.on('input.app change.app', '#assetsFilterForm [name="property_name"], #assetsFilterForm [name="property_type"]', function () {
        clearTimeout(assetFilterTimer);
        assetFilterTimer = setTimeout(() => {
            refreshAssetsDirectory(true);
        }, 180);
    });

    $doc.on('submit.app', '#assetsFilterForm', function (event) {
        event.preventDefault();
        clearTimeout(assetFilterTimer);
        refreshAssetsDirectory(true);
    });

    $doc.on('input.app change.app', '#assetForm [name="quantity"]', function () {
        updateAssetSubmitButton();
    });

    $doc.on('click.app', '#assetForm .asset-choice-btn', function () {
        const $button = $(this);
        const target = String($button.data('target') || '').trim();
        const value = String($button.data('value') || '').trim();

        if (!target) {
            return;
        }

        $(`#assetForm [name="${target}"]`).val(value);
        updateAssetChoiceButtons();
        updateAssetUnitCostRule();
        clearErrors('#assetForm');
    });

    $doc.on('blur.app', '#assetForm [name="unit_cost"]', function () {
        $(this).val(formatCurrencyInputValue($(this).val()));
    });

    $doc.on('change.app input.app', '#assetForm [name="division"], #assetForm [name="officer_name"]', function () {
        clearErrors('#assetForm');
    });

    $doc.on('submit.app', '#assetForm', function (event) {
        event.preventDefault();
        const payload = formData($('#assetForm'));
        const stage = String(appState.assetWizardStage || 'step1').toLowerCase();

        if (stage === 'step1') {
            const stepErrors = validateAssetStepOne(payload);

            if (Object.keys(stepErrors).length) {
                applyErrors('#assetForm', stepErrors);
                return;
            }

            showAssetWizardStep('step2');
            return;
        }

        if (stage === 'step2') {
            const stepErrors = validateAssetStepTwo(payload);

            if (Object.keys(stepErrors).length) {
                applyErrors('#assetForm', stepErrors);
                return;
            }

            showAssetWizardStep('step3');
            return;
        }

        if (stage === 'step3') {
            const draftErrors = validateAssetDraft(payload);

            if (Object.keys(draftErrors).length) {
                applyErrors('#assetForm', draftErrors);
                return;
            }

            prepareBulkSerialStep(payload);
            return;
        }

        if (stage === 'serial') {
            if (!appState.pendingBulkPayload) {
                return;
            }

            const serialPayload = formData($('#assetForm'));
            const propertyIds = Array.isArray(serialPayload.property_ids)
                ? serialPayload.property_ids
                : [serialPayload.property_ids].filter(Boolean);

            saveAssetBatch({
                ...appState.pendingBulkPayload,
                property_ids: propertyIds,
            }, '#assetForm');
        }
    });

    $doc.on('click.app', '#cancelBulkSerial', function () {
        resetAssetWorkflow(true);
        setAssetEntryVisible(false);
        showNotice('Serial number entry cancelled.', 'error');
    });

    $doc.on('submit.app', '#assetFilterForm', function (event) {
        event.preventDefault();
        refreshManagementView(false);
    });

    $doc.on('input.app', '#assetNameSearch', function () {
        clearTimeout(manageSearchTimer);
        manageSearchTimer = setTimeout(() => {
            const searchTerm = $(this).val();
            apiRequest('api/assets/filter.php', 'GET', { property_name: searchTerm })
                .done((response) => {
                    appState.manageAssets = response.data?.assets || [];
                    renderManageAssetsTable();
                });
        }, 250);
    });

    $doc.on('click.app', '#resetFilters', function () {
        $('#assetFilterForm')[0].reset();
        refreshManagementView(false);
    });

    $doc.on('click.app', '#assetTableBody .details-asset', function () {
        openDetailsModal(currentAsset($(this).data('id')));
    });

    $doc.on('click.app', '#assetTableBody .edit-asset', function () {
        openEditModal(currentAsset($(this).data('id')));
    });

    $doc.on('click.app', '#assetTableBody .delete-asset', function () {
        const assetId = $(this).data('id');
        const asset = currentAsset(assetId);

        if (!asset || !window.confirm(`Delete ${asset.property_name} (${asset.property_id || 'No Property ID'})?`)) {
            return;
        }

        apiRequest('api/assets/delete.php', 'POST', { id: assetId })
            .done((response) => {
                notifyTransaction(response.message || 'Asset deleted successfully.');
                $.when(refreshDashboard(true), refreshAssetsDirectory(true), refreshManagementView(true)).always(() => {
                    refreshActiveReport(true);
                });
            })
            .fail((xhr) => {
                handleRequestError(xhr, 'Unable to delete the asset.');
            });
    });

    $doc.on('submit.app', '#editAssetForm', function (event) {
        event.preventDefault();
        clearErrors('#editAssetForm');

        apiRequest('api/assets/update.php', 'POST', formData($('#editAssetForm')))
            .done((response) => {
                notifyTransaction(response.message || 'Asset updated successfully.');
                closeEditModal();
                $.when(refreshDashboard(true), refreshAssetsDirectory(true), refreshManagementView(true)).always(() => {
                    refreshActiveReport(true);
                });
            })
            .fail((xhr) => {
                handleRequestError(xhr, 'Unable to update the asset.', '#editAssetForm');
            });
    });

    $doc.on('click.app', '#closeEditModal, #cancelEdit', function () {
        closeEditModal();
    });

    $doc.on('click.app', '#closeDetailsModal, #closeDetailsButton', function () {
        closeDetailsModal();
    });

    $doc.on('change.app', '#dashboardFilterMode', function () {
        updateDashboardFilterModeUI();
        refreshDashboard(false);
    });

    $doc.on('change.app input.app', '#dashboardYear, #dashboardMonth', function () {
        refreshDashboard(false);
    });

    $doc.on('click.app', '.report-type-card', function () {
        setReportType($(this).data('reportType'), false);
    });

    $doc.on('click.app', '#clearReportType', function () {
        resetReportWorkflow();
        setReportType('', true);
        showNotice('Report type selection cleared.');
    });

    $doc.on('change.app', '#reportDivision', function () {
        const division = $(this).val();
        $('#selectedDivision').val(division);
        $('#selectedOfficerId').val('');
        $('#selectedOfficer').val('');
        loadReportOfficers(division, false).always(() => {
            syncReportOfficer();
            fetchRelatedParPreview(true);
        });
    });

    $doc.on('change.app', '#reportOfficerSelect', function () {
        syncReportOfficer();
        clearTimeout(reportPreviewTimer);
        reportPreviewTimer = setTimeout(() => {
            fetchRelatedParPreview(false);
        }, 250);
    });

    $doc.on('click.app', '#clearOfficerSelection', function () {
        $('#reportOfficerSelect').val('');
        syncReportOfficer();
        const division = String($('#reportDivision').val() || '').trim();
        $('#reportOfficerHint').text(division ? `Select an accountable officer under ${division}.` : 'Choose a division to load officers.');
        fetchRelatedParPreview(true);
        showNotice('Accountable officer cleared.');
    });

    $doc.on('submit.app', '#reportForm', function (event) {
        event.preventDefault();
        syncReportOfficer();
        generateReport(false);
    });

    $doc.on('click.app', '#resetReportFilters', function () {
        resetReportWorkflow();
        setReportType('PAR', true);
        showNotice('Report workflow reset.');
    });

    $doc.on('click.app', '#printReport', function () {
        if (appState.reportType !== 'PAR') {
            showNotice('Select PAR first before printing.', 'error');
            return;
        }

        if (!appState.reportReady) {
            showNotice('Generate the PAR report before printing.', 'error');
            return;
        }

        $.when(activateView('reports')).done(() => {
            window.print();
        });
    });

    $doc.on('click.app', '#exportReportCsv', function () {
        if (appState.reportType !== 'PAR') {
            showNotice('Select PAR first before exporting.', 'error');
            return;
        }

        if (!appState.reportReady) {
            showNotice('Generate the PAR report before exporting.', 'error');
            return;
        }

        syncReportOfficer();
        const query = $.param(formData($('#reportForm')));
        showNotice('PAR CSV export started.');
        window.open(`api/reports/export.php?${query}`, '_blank', 'noopener');
    });

    $doc.on('click.app', function (event) {
        if (!$(event.target).closest('#notificationPanel, #toggleNotifications').length) {
            setNotificationPanelVisible(false);
        }
    });

    $doc.on('keydown.app', function (event) {
        if (event.key === 'Escape') {
            closeEditModal();
            closeDetailsModal();
            closeSidebar();
            setNotificationPanelVisible(false);
        }
    });

    const initialView = normalizeViewName(window.location.hash || '#dashboard');
    setReportType('', true);

    if (initialView === 'dashboard') {
        updateActiveNav('dashboard');
        initializeModule('dashboard');
    } else {
        activateView(initialView, false);
    }
});
