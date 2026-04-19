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
const CLASSIFICATIONS = ['PPE', 'SEMI'];
const DIVISIONS = window.APP_LOOKUPS && Array.isArray(window.APP_LOOKUPS.divisions)
    ? window.APP_LOOKUPS.divisions
        .map((value) => String(value || '').trim())
        .filter((value, index, values) => value !== '' && values.indexOf(value) === index)
    : ['ORD', 'FAD', 'PDIPBD', 'PFPD', 'PMED', 'DRD', 'COA'];
const CATEGORY_THRESHOLD = 50000;
const APP_FONT_FAMILY = 'Inter';
const DIVISION_BADGE_THEME_MAP = {
    ORD: 'division-badge--ord',
    FAD: 'division-badge--fad',
    PDIPBD: 'division-badge--pdipbd',
    PFPD: 'division-badge--pfpd',
    PMED: 'division-badge--pmed',
    DRD: 'division-badge--drd',
    COA: 'division-badge--coa',
};

const appState = {
    assetDirectory: [],
    assetNameFilter: '',
    registrationOfficers: [],
    manageAssets: [],
    inventoryItems: [],
    charts: {
        pie: null,
        bar: null,
        inventory: null,
        manage: null,
    },
    moduleCache: {},
    pendingBulkPayload: null,
    activeView: 'dashboard',
    dashboardData: null,
    dashboardFilter: 'monthly',
    assetWizardStage: 'step1',
    assetWizardContext: {
        mode: 'create',
        updateScope: '',
        assetId: 0,
        parId: 0,
        parNumber: '',
        batchAssets: [],
    },
    assetTypeFilter: '',
    reportType: '',
    reportReady: false,
    reportPreview: [],
    moduleRequest: null,
    highlightedOfficerId: 0,
    highlightedManageAssetIds: [],
    highlightedPropertyIds: [],
    highlightedParNumber: '',
    activeParSelectionNumber: '',
    parSelectionAssets: [],
    notifications: [],
    unreadNotifications: 0,
    notificationPanelOpen: false,
    selectedNotificationId: '',
    profileMenuOpen: false,
    officerDirectory: [],
    officerDirectoryLoaded: false,
    officerFormBaseline: '',
    highlightedInventoryIds: [],
    selectedInventoryItemId: 0,
};

let manageSearchTimer = null;
let reportPreviewTimer = null;
let assetFilterTimer = null;
let registrationFilterTimer = null;
let inventoryFilterTimer = null;
let inventoryPreviewTimer = null;
let dashboardRefreshTimer = null;
let dashboardRequestToken = 0;
const SIDEBAR_COLLAPSED_KEY = 'ams.sidebarCollapsed';

const paginationState = {
    registration: { currentPage: 1, rowsPerPage: 10, totalRows: 0 },
    manage: { currentPage: 1, rowsPerPage: 10, totalRows: 0 },
    assets: { currentPage: 1, rowsPerPage: 10, totalRows: 0 },
    inventory: { currentPage: 1, rowsPerPage: 10, totalRows: 0 },
};

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

function pad2(value) {
    return String(value).padStart(2, '0');
}

function parseDateValue(value) {
    const normalized = String(value || '').trim();

    if (!normalized) {
        return null;
    }

    let match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        const [, year, month, day] = match;
        const date = new Date(Number(year), Number(month) - 1, Number(day));
        return Number.isNaN(date.getTime()) ? null : date;
    }

    match = normalized.match(/^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/);
    if (match) {
        const [, month, day, yearPart] = match;
        const fullYear = yearPart.length === 2 ? 2000 + Number(yearPart) : Number(yearPart);
        const date = new Date(fullYear, Number(month) - 1, Number(day));

        if (
            Number.isNaN(date.getTime())
            || date.getFullYear() !== fullYear
            || date.getMonth() !== Number(month) - 1
            || date.getDate() !== Number(day)
        ) {
            return null;
        }

        return date;
    }

    return null;
}

function formatCompactDate(value) {
    const date = value instanceof Date ? value : parseDateValue(value);

    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return String(value || '');
    }

    return `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}/${pad2(date.getFullYear() % 100)}`;
}

function formatStorageDate(value) {
    const date = value instanceof Date ? value : parseDateValue(value);

    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return '';
    }

    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function normalizeCompactDateInput(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 8);

    if (digits.length <= 2) {
        return digits;
    }

    if (digits.length <= 4) {
        return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }

    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function formatRecordCountLabel(count) {
    const numeric = Number(count || 0);
    return `${numeric} ${numeric === 1 ? 'RECORD' : 'RECORDS'}`;
}

function displayPropertyNumber(asset = {}) {
    return String(asset.property_number || '').trim() || 'Pending';
}

function displayAssetReferenceLabel(asset = {}) {
    return String(asset.classification || '').trim().toUpperCase() === 'SEMI' ? 'Stock No.' : 'Property No.';
}

function divisionBadgeThemeClass(division = '') {
    const normalized = String(division || '').trim().toUpperCase();
    return DIVISION_BADGE_THEME_MAP[normalized] || 'division-badge--default';
}

function renderDivisionBadge(division = '', extraClass = '') {
    const normalized = String(division || '').trim().toUpperCase();
    const classes = ['division-badge', divisionBadgeThemeClass(normalized), extraClass].filter(Boolean).join(' ');
    return `<span class="${classes}">${escapeHtml(normalized || 'N/A')}</span>`;
}

function scrollHighlightedRow(selector) {
    const $row = $(selector).first();

    if (!$row.length) {
        return;
    }

    window.requestAnimationFrame(() => {
        const $container = $row.closest('.view-table-scroll');

        if (!$container.length) {
            return;
        }

        const container = $container[0];
        const row = $row[0];
        const containerRect = container.getBoundingClientRect();
        const rowRect = row.getBoundingClientRect();
        const topThreshold = containerRect.top + 28;
        const bottomThreshold = containerRect.bottom - 28;

        if (rowRect.top >= topThreshold && rowRect.bottom <= bottomThreshold) {
            return;
        }

        const targetTop = container.scrollTop + (rowRect.top - containerRect.top) - ((container.clientHeight - rowRect.height) / 2);
        container.scrollTo({
            top: Math.max(0, targetTop),
            behavior: 'smooth',
        });
    });
}

function resetActiveViewScroll() {
    const $viewScroll = $('#moduleContainer .view-scroll').first();

    if ($viewScroll.length) {
        $viewScroll.scrollTop(0);
    }

    // Remove row highlights when navigating away
    $('.registration-table__row--highlight, .manage-table__row--highlight, .assets-directory-row--highlight').removeClass('registration-table__row--highlight manage-table__row--highlight assets-directory-row--highlight');
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
            if (xhr && xhr.status === 401) {
                const redirectTarget = xhr.getResponseHeader('X-Auth-Redirect') || 'login.php';
                window.location.href = redirectTarget;
                return $.Deferred().reject(xhr, status, error).promise();
            }

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

function notifyTransaction(message, type = 'success', options = {}) {
    showNotice(message, type);
    pushNotification(message, type, options);
}

function formatNotificationTimestamp(date = new Date()) {
    return date.toLocaleString('en-PH', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function normalizeNotificationType(type = 'info') {
    const normalized = String(type || 'info').trim().toLowerCase();
    return ['success', 'error', 'warning', 'info'].includes(normalized) ? normalized : 'info';
}

function notificationStatusLabel(type = 'info') {
    const normalized = normalizeNotificationType(type);

    if (normalized === 'error') {
        return 'Error';
    }

    if (normalized === 'warning') {
        return 'Warning';
    }

    if (normalized === 'success') {
        return 'Success';
    }

    return 'Info';
}

function inferNotificationCategory(message = '', category = '') {
    const explicitCategory = String(category || '').trim();

    if (explicitCategory !== '') {
        return explicitCategory;
    }

    const normalizedMessage = String(message || '').trim().toLowerCase();

    if (normalizedMessage.includes('officer')) {
        return 'Registration';
    }

    if (normalizedMessage.includes('report') || normalizedMessage.includes('export') || normalizedMessage.includes('par')) {
        return 'Reports';
    }

    if (normalizedMessage.includes('inventory') || normalizedMessage.includes('supply') || normalizedMessage.includes('material')) {
        return 'Inventory';
    }

    if (normalizedMessage.includes('asset') || normalizedMessage.includes('property') || normalizedMessage.includes('stock')) {
        return 'Assets';
    }

    return 'System';
}

function buildNotificationDetails(message = '', category = '', options = {}) {
    const explicitDetails = String(options.details || '').trim();

    if (explicitDetails !== '') {
        return explicitDetails;
    }

    const normalizedMessage = String(message || '').trim();
    const normalizedCategory = String(category || 'System').trim();
    const detailSuffix = {
        Assets: 'The asset directory, management table, and related reports now reflect this activity.',
        Inventory: 'The inventory table, stock limits, and movement records now reflect this activity.',
        Registration: 'The accountable officers directory and division-based officer selectors now reflect this activity.',
        Reports: 'The reports module now reflects this activity, including previews and export actions.',
        System: 'This activity was logged by the system for your reference.',
    };

    return `${normalizedMessage} ${detailSuffix[normalizedCategory] || detailSuffix.System}`.trim();
}

function officerNotificationPayload(action, officer = {}, previousOfficer = null) {
    const current = officer || {};
    const previous = previousOfficer && typeof previousOfficer === 'object' ? previousOfficer : null;
    const normalizedAction = String(action || '').trim().toLowerCase();
    const labels = {
        officer_code: 'Officer ID',
        name: 'Name',
        division: 'Division',
        position: 'Position',
        unit: 'Unit',
    };

    const fieldKeys = Object.keys(labels);
    const changedFields = previous
        ? fieldKeys.filter((key) => {
            if (key === 'unit') {
                return normalizeOfficerUnitValue(previous.division, previous[key] || '') !== normalizeOfficerUnitValue(current.division, current[key] || '');
            }

            return String(previous[key] || '').trim() !== String(current[key] || '').trim();
        })
        : [];

    const fields = fieldKeys.map((key) => ({
        key,
        label: labels[key],
        value: key === 'unit'
            ? (normalizeOfficerUnitValue(current.division, current[key] || '') || 'Not applicable')
            : (String(current[key] || '').trim() || 'Not provided'),
        previousValue: previous
            ? (key === 'unit'
                ? (normalizeOfficerUnitValue(previous.division, previous[key] || '') || 'Not applicable')
                : (String(previous[key] || '').trim() || 'Not provided'))
            : '',
        updated: normalizedAction === 'updated' && changedFields.includes(key),
    }));

    return {
        entity: 'Officer',
        action: normalizedAction,
        fields,
    };
}

function notificationHeadline(item = {}) {
    const category = inferNotificationCategory(item.message, item.category);
    const severity = normalizeNotificationType(item.type);

    if (severity === 'error') {
        return `${category} Alert`;
    }

    if (severity === 'warning') {
        return `${category} Notice`;
    }

    return `${category} Update`;
}

function syncUnreadNotificationCount() {
    const items = Array.isArray(appState.notifications) ? appState.notifications : [];
    appState.unreadNotifications = items.filter((item) => !item.read).length;
}

function currentNotification(notificationId) {
    const items = Array.isArray(appState.notifications) ? appState.notifications : [];
    const targetId = String(notificationId || '').trim();
    return items.find((item) => item.id === targetId) || null;
}

function renderNotificationModal(item = null) {
    const $title = $('#notificationDetailsTitle');
    const $meta = $('#notificationDetailsMeta');
    const $content = $('#notificationDetailsContent');

    if (!$title.length || !$meta.length || !$content.length) {
        return;
    }

    if (!item) {
        $title.text('Notification');
        $meta.empty();
        $content.empty();
        return;
    }

    const category = inferNotificationCategory(item.message, item.category);
    const severity = normalizeNotificationType(item.type);
    const statusLabel = notificationStatusLabel(severity);
    const detailMessage = String(item.details || '').trim();
    const detailPayload = item.detailPayload && typeof item.detailPayload === 'object' ? item.detailPayload : null;

    if (detailPayload && detailPayload.entity === 'Officer') {
        const fields = Array.isArray(detailPayload.fields) ? detailPayload.fields : [];
        const actionLabelMap = {
            registered: 'Officer registered successfully.',
            updated: 'Officer updated successfully.',
            deleted: 'Officer deleted successfully.',
        };
        const actionLabel = actionLabelMap[String(detailPayload.action || '').trim().toLowerCase()] || item.message;

        $title.text('Officer');
        $meta.text(`Officer details | ${statusLabel}`);
        $content.html(`
            <section class="notification-detail-section">
                <div class="detail-section__head">
                    <p class="panel-eyebrow">Action Summary</p>
                    <h4 class="panel-title">${escapeHtml(actionLabel)}</h4>
                    <p class="notification-detail-section__copy">Date & time of the action: ${escapeHtml(item.timestamp)}</p>
                </div>
                <div class="notification-audit-grid">
                    <div class="notification-detail-card">
                        <div class="notification-detail-card__label">Type</div>
                        <div class="notification-detail-card__value">Officer</div>
                    </div>
                    <div class="notification-detail-card">
                        <div class="notification-detail-card__label">Status</div>
                        <div class="notification-detail-card__value">${escapeHtml(statusLabel)}</div>
                    </div>
                    <div class="notification-detail-card">
                        <div class="notification-detail-card__label">Summary</div>
                        <div class="notification-detail-card__value">${escapeHtml(item.message)}</div>
                    </div>
                </div>
            </section>
            <section class="notification-detail-section">
                <div class="detail-section__head">
                    <p class="panel-eyebrow">Officer Details</p>
                    <h4 class="panel-title">Updated fields are highlighted</h4>
                </div>
                <div class="notification-detail-grid">
                    ${fields.map((field) => `
                        <div class="notification-detail-card${field.updated ? ' notification-detail-card--updated' : ''}">
                            <div class="notification-detail-card__label">${escapeHtml(field.label)}</div>
                            <div class="notification-detail-card__value">${escapeHtml(field.value || 'Not provided')}</div>
                            ${field.updated ? `<div class="notification-detail-card__note">Updated from: ${escapeHtml(field.previousValue || 'Not provided')}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </section>
        `);
        return;
    }

    const items = [
        ['Type', category],
        ['Severity', statusLabel],
        ['Status', item.read ? 'Read' : 'Unread'],
        ['Logged At', item.timestamp],
        ['Summary', item.message],
        ['Details', detailMessage || item.message],
    ];

    $title.text(notificationHeadline(item));
    $meta.text(`${category} | ${statusLabel} | ${item.read ? 'Read' : 'Unread'}`);
    $content.html(items.map(([label, value]) => `
        <div class="detail-item">
            <div class="detail-label">${escapeHtml(label)}</div>
            <div class="detail-value">${escapeHtml(value || 'Not available')}</div>
        </div>
    `).join(''));
}

function openNotificationDetailsModal(notificationId) {
    const targetId = String(notificationId || '').trim();

    if (targetId === '') {
        return;
    }

    const notification = currentNotification(targetId);

    if (!notification) {
        showNotice('Unable to load the selected notification.', 'error');
        return;
    }

    appState.selectedNotificationId = targetId;
    let changed = false;

    appState.notifications = (Array.isArray(appState.notifications) ? appState.notifications : []).map((item) => {
        if (item.id !== targetId || item.read) {
            return item;
        }

        changed = true;
        return {
            ...item,
            read: true,
        };
    });

    if (changed) {
        syncUnreadNotificationCount();
    }

    renderNotifications();
    renderNotificationModal(currentNotification(targetId) || notification);
    $('#notificationDetailsModal').removeClass('hidden').addClass('flex');
    $('body').addClass('overflow-hidden');
}

function closeNotificationDetailsModal() {
    renderNotificationModal(null);
    $('#notificationDetailsModal').addClass('hidden').removeClass('flex');

    if (!$('#assetEntryPanel.flex, #editModal.flex, #detailsModal.flex, #officerRegistrationModal.flex, #officerDetailsModal.flex').length) {
        $('body').removeClass('overflow-hidden');
    }
}

function markAllNotificationsRead() {
    const items = Array.isArray(appState.notifications) ? appState.notifications : [];

    if (!items.length) {
        return;
    }

    appState.notifications = items.map((item) => ({
        ...item,
        read: true,
    }));
    syncUnreadNotificationCount();
    renderNotifications();
}

function renderNotifications() {
    const $list = $('#notificationList');
    const $empty = $('#notificationEmpty');
    const $badge = $('#notificationCount');
    const $markRead = $('#markNotificationsRead');
    const $clear = $('#clearNotifications');

    if (!$list.length || !$empty.length || !$badge.length) {
        return;
    }

    const items = Array.isArray(appState.notifications) ? appState.notifications : [];
    syncUnreadNotificationCount();
    const unread = Number(appState.unreadNotifications || 0);

    if (!items.length) {
        appState.selectedNotificationId = '';
        $list.empty();
        $empty.removeClass('hidden');
    } else {
        $empty.addClass('hidden');
        $list.html(items.map((item) => `
            <button
                type="button"
                class="site-notification__item site-notification__item--${escapeHtml(normalizeNotificationType(item.type))}${item.id === appState.selectedNotificationId ? ' is-selected' : ''}${item.read ? '' : ' is-unread'}"
                data-id="${escapeHtml(item.id)}"
            >
                <div class="site-notification__item-top">
                    <span class="site-notification__item-badge">${escapeHtml(inferNotificationCategory(item.message, item.category))}</span>
                    <span class="site-notification__item-state">${escapeHtml(item.read ? 'Read' : 'New')}</span>
                </div>
                <div class="site-notification__item-head">
                    <p class="site-notification__item-title">${escapeHtml(notificationHeadline(item))}</p>
                    <time class="site-notification__item-time">${escapeHtml(item.timestamp)}</time>
                </div>
                <p class="site-notification__item-copy">${escapeHtml(item.message)}</p>
            </button>
        `).join(''));
    }

    $badge.text(unread > 99 ? '99+' : String(unread));
    $badge.toggleClass('hidden', unread <= 0);
    $markRead.prop('disabled', unread <= 0);
    $clear.prop('disabled', items.length === 0);
}

function setNotificationPanelVisible(visible) {
    const isVisible = Boolean(visible);
    $('#notificationPanel').toggleClass('hidden', !isVisible);
    $('#toggleNotifications').attr('aria-expanded', String(isVisible));
    appState.notificationPanelOpen = isVisible;

    if (!isVisible) {
        closeNotificationDetailsModal();
    }

    if (isVisible) {
        renderNotifications();
    }
}

function setProfileMenuVisible(visible) {
    const isVisible = Boolean(visible);
    $('#profileMenu').toggleClass('hidden', !isVisible);
    $('#toggleProfileMenu').attr('aria-expanded', String(isVisible));
    appState.profileMenuOpen = isVisible;
}

function pushNotification(message, type = 'success', options = {}) {
    const normalizedMessage = String(message || '').trim();

    if (normalizedMessage === '') {
        return;
    }

    const normalizedType = normalizeNotificationType(type);
    const category = inferNotificationCategory(normalizedMessage, options.category);

    appState.notifications.unshift({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        message: normalizedMessage,
        type: normalizedType,
        category,
        details: buildNotificationDetails(normalizedMessage, category, options),
        detailPayload: options.detailPayload && typeof options.detailPayload === 'object' ? options.detailPayload : null,
        timestamp: formatNotificationTimestamp(),
        read: false,
    });
    appState.notifications = appState.notifications.slice(0, 30);
    appState.selectedNotificationId = appState.notifications[0]?.id || '';
    syncUnreadNotificationCount();

    renderNotifications();
}

function normalizeViewName(viewName) {
    const normalized = String(viewName || 'dashboard').replace('#', '').trim().toLowerCase();

    if (normalized === 'manage') {
        return 'assets';
    }

    return ['dashboard', 'registration', 'assets', 'inventory', 'reports'].includes(normalized) ? normalized : 'dashboard';
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
                </div>
            </div>
        </section>
    `);
}

function initializeModule(viewName) {
    const normalized = normalizeViewName(viewName);

    if (normalized === 'dashboard') {
        if (appState.dashboardData) {
            updateMetrics(appState.dashboardData.metrics || {});
            renderCharts(appState.dashboardData);
        }
        updateDashboardFilterModeUI();
        refreshDashboard(true);
        return;
    }

    if (normalized === 'registration') {
        initializeSearchableSelects('#moduleContainer');
        refreshRegistrationView(true, true);
        return;
    }

    if (normalized === 'assets') {
        resetAssetWorkflow(true);
        if ($('#assetForm').length) {
            $('#assetForm').data('default-date', $('#assetForm [name="date_acquired"]').val());
            setAssetDateDisplay($('#assetForm [name="date_acquired"]').val());
            loadAssetOfficers(String($('#assetForm [name="division"]').val() || '').trim(), true);
        }
        if ($('#assetsFilterForm').length) {
            $('#assetsFilterForm [name="search"]').val(appState.assetNameFilter || '');
            initializeSearchableSelects('#moduleContainer');
            updateAssetFilterStatus();
            refreshAssetsDirectory(true, true);
        } else {
            refreshAssetsDirectory(true, true);
        }
        return;
    }

    if (normalized === 'inventory') {
        initializeSearchableSelects('#moduleContainer');
        refreshInventoryView(true, true);
        return;
    }

    if (normalized === 'reports') {
        initializeSearchableSelects('#moduleContainer');
        setReportType(appState.reportType || '', true);
        return;
    }
}

function setReportPlaceholder(message = 'Select a report type to begin.') {
    setReportPrintMode(false);
    const documentLabel = String(appState.reportType || 'PAR').trim().toUpperCase() === 'ICS' ? 'ICS' : 'PAR';
    $('#reportContainer')
        .html(`<div class="report-empty-state">${escapeHtml(message)}</div>`)
        .attr('data-placeholder', 'true');
    $('#reportMeta').text('No report');
    $('#relatedDataMeta').text('0 matched');
    $('#relatedDataSummary').empty();
    $('#relatedDataTableBody').html(`<tr><td colspan="4" class="px-4 py-10 text-center text-slate-500">Select a division and accountable officer to preview related ${escapeHtml(documentLabel)} records.</td></tr>`);
    $('#printReport').prop('disabled', true);
    $('#exportReportCsv').prop('disabled', true);
    $('#printInventoryReport').prop('disabled', true);
    $('#exportInventoryReport').prop('disabled', true);
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

function setReportPrintMode(enabled) {
    $('body').toggleClass('print-report-only', Boolean(enabled));
}

function triggerReportPrint() {
    if (!['PAR', 'ICS', 'INVENTORY'].includes(appState.reportType) || !appState.reportReady) {
        return;
    }

    $.when(activateView('reports')).done(() => {
        setReportPrintMode(true);
        window.print();
    });
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
    const mode = String($('#dashboardFilterMode').val() || 'overview').toLowerCase();
    $('.dashboard-monthly-picker').toggleClass('hidden', mode !== 'monthly');
    $('.dashboard-yearly-picker').toggleClass('hidden', !['monthly', 'yearly'].includes(mode));
}

function updateAssetFilterStatus() {
    const label = String(appState.assetTypeFilter || '').trim();

    $('#assetFilterStatus').text(
        label
            ? `Current type filter: ${label}`
            : 'All property types are available for the next asset entry.'
    );
}

function normalizeOfficerUnitValue(division, unit) {
    return String(division || '').trim().toUpperCase() === 'FAD'
        ? String(unit || '').trim()
        : '';
}

function normalizeOfficerFormState(source = {}) {
    const division = String(source.division || '').trim().toUpperCase();
    return {
        name: String(source.name || '').trim(),
        division,
        position: String(source.position || '').trim(),
        unit: normalizeOfficerUnitValue(division, source.unit || ''),
    };
}

function serializeOfficerFormState(source = {}) {
    return JSON.stringify(normalizeOfficerFormState(source));
}

function rememberOfficerDirectory(rows = [], replace = false) {
    const incoming = Array.isArray(rows) ? rows : [];
    const registry = new Map();

    if (!replace) {
        (Array.isArray(appState.officerDirectory) ? appState.officerDirectory : []).forEach((officer) => {
            const id = Number(officer.officer_id || 0);
            if (id > 0) {
                registry.set(id, officer);
            }
        });
    }

    incoming.forEach((officer) => {
        const id = Number(officer.officer_id || 0);
        if (id > 0) {
            registry.set(id, officer);
        }
    });

    appState.officerDirectory = Array.from(registry.values()).sort((left, right) => {
        const leftName = String(left.name || '').trim();
        const rightName = String(right.name || '').trim();
        return leftName.localeCompare(rightName, undefined, { sensitivity: 'base' });
    });

    return appState.officerDirectory;
}

function removeOfficerFromDirectory(officerId) {
    const normalizedId = Number(officerId || 0);
    appState.officerDirectory = (Array.isArray(appState.officerDirectory) ? appState.officerDirectory : []).filter(
        (officer) => Number(officer.officer_id || 0) !== normalizedId
    );
}

function currentKnownOfficer(officerId) {
    const normalizedId = Number(officerId || 0);
    return (Array.isArray(appState.officerDirectory) ? appState.officerDirectory : []).find(
        (officer) => Number(officer.officer_id || 0) === normalizedId
    ) || currentOfficer(normalizedId);
}

function loadOfficerDirectory(force = false, silent = true) {
    if (!force && appState.officerDirectoryLoaded && Array.isArray(appState.officerDirectory) && appState.officerDirectory.length) {
        return $.Deferred().resolve(appState.officerDirectory).promise();
    }

    return apiRequest('api/officers/list.php', 'GET', {})
        .then((response) => {
            const officers = response.data?.officers || [];
            appState.officerDirectoryLoaded = true;
            rememberOfficerDirectory(officers, true);
            return officers;
        }, (xhr, status, error) => {
            if (!silent) {
                handleRequestError(xhr, 'Unable to load accountable officers.');
            }

            return $.Deferred().reject(xhr, status, error).promise();
        });
}

function buildOfficerOptions(rows, emptyLabel = 'Select accountable officer', includeDivision = false) {
    return ['<option value="">' + escapeHtml(emptyLabel) + '</option>']
        .concat(rows.map((officer) => {
            const division = String(officer.division || '').trim();
            const officerCode = String(officer.officer_code || '').trim();
            const label = includeDivision && division
                ? `${String(officer.name || '').trim()} | ${division}`
                : String(officer.name || '').trim();
            return `<option value="${escapeHtml(officer.officer_id)}">${escapeHtml(label || officerCode || 'Officer')}</option>`;
        }))
        .join('');
}

function searchableSelectListId($select) {
    const base = String($select.attr('id') || $select.attr('name') || `select-${Math.random().toString(16).slice(2)}`)
        .replace(/[^A-Za-z0-9_-]+/g, '-')
        .toLowerCase();
    return `searchable-${base}`;
}

function refreshSearchableSelect($select) {
    const $native = $select instanceof jQuery ? $select : $($select);

    if (!$native.length || !$native.hasClass('searchable-select')) {
        return;
    }

    let $wrapper = $native.next('.searchable-select-wrapper');

    if (!$wrapper.length) {
        initializeSearchableSelects($native.parent());
        $wrapper = $native.next('.searchable-select-wrapper');

        if (!$wrapper.length) {
            return;
        }
    }

    const $input = $wrapper.find('.searchable-select-wrapper__input');
    const $list = $wrapper.find('datalist');
    const options = $native.find('option').toArray().map((option) => ({
        value: String(option.value || ''),
        label: String($(option).text() || '').trim(),
        disabled: Boolean(option.disabled),
    }));

    $list.html(options
        .filter((option) => option.label !== '' && !option.disabled)
        .map((option) => `<option value="${escapeHtml(option.label)}"></option>`)
        .join(''));

    const selectedValue = String($native.val() || '').trim();
    const selectedOption = options.find((option) => option.value === selectedValue);
    const placeholder = (options.find((option) => option.value === '') || {}).label || 'Select an option';

    $input
        .attr('placeholder', placeholder)
        .prop('disabled', $native.prop('disabled'))
        .val(selectedOption ? selectedOption.label : '');
}

function initializeSearchableSelects(context = document) {
    $(context).find('select.searchable-select').each(function () {
        const $select = $(this);
        const listId = searchableSelectListId($select);
        let $wrapper = $select.next('.searchable-select-wrapper');

        if (!$wrapper.length) {
            $wrapper = $(`
                <div class="searchable-select-wrapper">
                    <input type="text" class="form-input searchable-select-wrapper__input" autocomplete="off">
                    <datalist id="${escapeHtml(listId)}"></datalist>
                </div>
            `);

            $select
                .addClass('searchable-select__native')
                .after($wrapper);

            const $input = $wrapper.find('.searchable-select-wrapper__input');
            $input.attr('list', listId);

            $input.on('input.searchableSelect', function () {
                const rawValue = String($(this).val() || '').trim().toLowerCase();
                const $options = $select.find('option');
                let matchedValue = null;

                $options.each(function () {
                    const optionValue = String(this.value || '');
                    const optionLabel = String($(this).text() || '').trim();

                    if (rawValue !== '' && (optionLabel.toLowerCase() === rawValue || optionValue.toLowerCase() === rawValue)) {
                        matchedValue = optionValue;
                        return false;
                    }

                    return true;
                });

                if (matchedValue !== null) {
                    $select.val(matchedValue).trigger('change');
                }
            });

            $input.on('change.searchableSelect blur.searchableSelect', function () {
                const rawValue = String($(this).val() || '').trim().toLowerCase();
                const $options = $select.find('option');
                let matchedValue = '';

                $options.each(function () {
                    const optionValue = String(this.value || '');
                    const optionLabel = String($(this).text() || '').trim();

                    if (rawValue !== '' && (optionLabel.toLowerCase() === rawValue || optionValue.toLowerCase() === rawValue)) {
                        matchedValue = optionValue;
                        return false;
                    }

                    return true;
                });

                $select.val(matchedValue).trigger('change');
            });

            $select.on('change.searchableSelect', function () {
                refreshSearchableSelect($select);
            });
        }

        refreshSearchableSelect($select);
    });
}

function syncAssetOfficerName() {
    const officerId = Number($('#assetOfficerSelect').val() || 0);
    const officer = currentKnownOfficer(officerId);
    const currentDivision = String($('#assetForm [name="division"]').val() || '').trim();

    $('#assetOfficerName').val(officer ? String(officer.name || '').trim() : '');

    if (officer && String(officer.division || '').trim() && String(officer.division || '').trim() !== currentDivision) {
        $('#assetForm [name="division"]').val(String(officer.division || '').trim());
        loadAssetOfficers(String(officer.division || '').trim(), true).done(() => {
            $('#assetOfficerSelect').val(String(officer.officer_id || ''));
            refreshSearchableSelect($('#assetOfficerSelect'));
            $('#assetOfficerName').val(String(officer.name || '').trim());
        });
    }
}

function populateAssetOfficers(division, officers = []) {
    const normalizedDivision = String(division || '').trim();
    const rows = Array.isArray(officers) ? officers : [];
    const $select = $('#assetOfficerSelect');
    const selectedOfficerId = String($select.val() || '').trim();
    $('#assetOfficerName').val('');

    if (!rows.length) {
        const emptyLabel = normalizedDivision === '' ? 'No officers available yet' : 'No officers found for this division';
        $select.prop('disabled', true).html(`<option value="">${escapeHtml(emptyLabel)}</option>`);
        refreshSearchableSelect($select);
        return;
    }

    $select.prop('disabled', false).html(buildOfficerOptions(
        rows,
        normalizedDivision === '' ? 'Select accountable officer' : 'Select accountable officer',
        normalizedDivision === ''
    ));
    if (selectedOfficerId && rows.some((officer) => String(officer.officer_id || '') === selectedOfficerId)) {
        $select.val(selectedOfficerId);
    }
    refreshSearchableSelect($select);
    syncAssetOfficerName();
}

function loadAssetOfficers(division, silent = true) {
    const normalizedDivision = String(division || '').trim();

    if (normalizedDivision === '') {
        $('#assetOfficerSelect').prop('disabled', true).html('<option value="">Loading officers...</option>');
        $('#assetOfficerName').val('');
        $('#assetOfficerHint').text('Loading accountable officers...');
        return loadOfficerDirectory(false, silent)
            .done((officers) => {
                populateAssetOfficers('', officers);
                $('#assetOfficerHint').text(
                    officers.length
                        ? 'Select an accountable officer, or choose a division to narrow the list.'
                        : 'No registered officers found yet. Register an officer first.'
                );
            })
            .fail((xhr) => {
                $('#assetOfficerHint').text('Unable to load accountable officers right now.');
                if (!silent) {
                    handleRequestError(xhr, 'Unable to load accountable officers.');
                }
            });
    }

    $('#assetOfficerSelect').prop('disabled', true).html('<option value="">Loading officers...</option>');
    $('#assetOfficerName').val('');
    $('#assetOfficerHint').text(`Loading registered officers under ${normalizedDivision}...`);

    return apiRequest('api/officers/filter.php', 'GET', { division: normalizedDivision })
        .done((response) => {
            const officers = response.data?.officers || [];
            rememberOfficerDirectory(officers);
            populateAssetOfficers(normalizedDivision, officers);
            $('#assetOfficerHint').text(
                officers.length
                    ? `Select an accountable officer under ${normalizedDivision}.`
                    : `No registered officers found under ${normalizedDivision}.`
            );

            if (!silent) {
                showNotice(officers.length ? `${officers.length} officers loaded for ${normalizedDivision}.` : `No registered officers found under ${normalizedDivision}.`);
            }
        })
        .fail((xhr) => {
            $('#assetOfficerHint').text('Unable to load officers for the selected division.');
            handleRequestError(xhr, 'Unable to load officers for the selected division.');
        });
}

function populateAssetsFilterOfficers(division, officers = []) {
    const normalizedDivision = String(division || '').trim();
    const rows = Array.isArray(officers) ? officers : [];
    const $select = $('#assetsOfficerSelect');

    if (!$select.length) {
        return;
    }

    const selectedOfficerId = String($select.val() || '').trim();

    if (!rows.length) {
        const emptyLabel = normalizedDivision === '' ? 'No officers available yet' : 'No officers found for this division';
        $select.prop('disabled', true).html(`<option value="">${escapeHtml(emptyLabel)}</option>`);
        refreshSearchableSelect($select);
        return;
    }

    $select.prop('disabled', false).html(buildOfficerOptions(
        rows,
        normalizedDivision === '' ? 'All accountable officers' : 'All accountable officers',
        normalizedDivision === ''
    ));
    if (selectedOfficerId && rows.some((officer) => String(officer.officer_id || '') === selectedOfficerId)) {
        $select.val(selectedOfficerId);
    }
    refreshSearchableSelect($select);
}

function loadAssetsFilterOfficers(division, silent = true) {
    const normalizedDivision = String(division || '').trim();
    const $select = $('#assetsOfficerSelect');

    if (!$select.length) {
        return $.Deferred().resolve([]).promise();
    }

    if (normalizedDivision === '') {
        $select.prop('disabled', true).html('<option value="">Loading officers...</option>');
        return loadOfficerDirectory(false, silent)
            .done((officers) => {
                populateAssetsFilterOfficers('', officers);
            })
            .fail((xhr) => {
                if (!silent) {
                    handleRequestError(xhr, 'Unable to load accountable officers.');
                }
            });
    }

    $select.prop('disabled', true).html('<option value="">Loading officers...</option>');

    return apiRequest('api/officers/filter.php', 'GET', { division: normalizedDivision })
        .done((response) => {
            const officers = response.data?.officers || [];
            rememberOfficerDirectory(officers);
            populateAssetsFilterOfficers(normalizedDivision, officers);

            if (!silent) {
                showNotice(officers.length ? `${officers.length} officers loaded for ${normalizedDivision}.` : `No registered officers found under ${normalizedDivision}.`);
            }
        })
        .fail((xhr) => {
            handleRequestError(xhr, 'Unable to load officers for the selected division.');
        });
}

function populateManageOfficers(division, officers = []) {
    populateAssetsFilterOfficers(division, officers);
}

function loadManageOfficers(division, silent = true) {
    return loadAssetsFilterOfficers(division, silent);
}

function populateReportOfficers(division, officers = []) {
    const normalizedDivision = String(division || '').trim();
    const rows = Array.isArray(officers) ? officers : [];
    const $wrap = $('#reportOfficerField');
    const $select = $('#reportOfficerSelect');

    if (normalizedDivision === '') {
        $wrap.addClass('hidden');
        $select.prop('disabled', true).html('<option value="">Select division first</option>');
        refreshSearchableSelect($select);
        return;
    }

    $wrap.removeClass('hidden');

    if (!rows.length) {
        $select.prop('disabled', true).html('<option value="">No officers found for this division</option>');
        refreshSearchableSelect($select);
        return;
    }

    $select.prop('disabled', false).html(buildOfficerOptions(rows, 'Select officer'));
    refreshSearchableSelect($select);
}

function loadReportOfficers(division, silent = true) {
    const normalizedDivision = String(division || '').trim();

    syncReportOfficer();

    if (normalizedDivision === '') {
        populateReportOfficers('', []);
        $('#reportOfficerHint').text('Choose a division to load officers.');
        setReportPlaceholder(`Choose a division and accountable officer to preview related ${(String(appState.reportType || 'PAR').trim().toUpperCase() === 'ICS' ? 'ICS' : 'PAR')} records.`);
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
    const documentLabel = String(appState.reportType || 'PAR').trim().toUpperCase() === 'ICS' ? 'ICS' : 'PAR';
    let totalAmount = 0;

    rows.forEach((asset) => {
        const key = String(asset.par_date || 'No Date');
        const bucket = groups.get(key) || { count: 0, amount: 0 };
        bucket.count += 1;
        bucket.amount += Number(asset.unit_cost || 0);
        groups.set(key, bucket);
        totalAmount += Number(asset.unit_cost || 0);
    });

    const summaryCards = [
        { label: 'Matched Report Dates', value: groups.size },
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
        $('#relatedDataTableBody').html(`<tr><td colspan="4" class="px-4 py-10 text-center text-slate-500">No related ${escapeHtml(documentLabel)} records found for the selected officer.</td></tr>`);
        return;
    }

    $('#relatedDataTableBody').html(rows.map((asset) => `
        <tr>
            <td class="px-4 py-4 font-medium text-slate-900">${escapeHtml(asset.par_number)}</td>
            <td class="px-4 py-4 text-slate-700">${escapeHtml(formatCompactDate(asset.par_date))}</td>
            <td class="px-4 py-4 text-slate-700">${escapeHtml(asset.property_name)}</td>
            <td class="px-4 py-4 text-slate-700">${escapeHtml(asset.property_type)}</td>
        </tr>
    `).join(''));
}

function fetchRelatedParPreview(silent = true) {
    const reportOfficer = syncReportOfficer();
    const documentLabel = String(appState.reportType || 'PAR').trim().toUpperCase() === 'ICS' ? 'ICS' : 'PAR';

    if (reportOfficer.division === '') {
        setReportPlaceholder(`Choose a division and accountable officer to preview related ${documentLabel} records.`);
        return $.Deferred().resolve();
    }

    if (reportOfficer.officerId <= 0) {
        setReportPlaceholder(`Choose an accountable officer under ${reportOfficer.division} to preview related ${documentLabel} records.`);
        return $.Deferred().resolve();
    }

    return apiRequest('api/assets/filter.php', 'GET', {
        officer_id: reportOfficer.officerId,
        division: reportOfficer.division,
        document_type: documentLabel,
        classification: documentLabel === 'ICS' ? 'SEMI' : 'PPE',
    })
        .done((response) => {
            const assets = response.data?.assets || [];
            appState.reportPreview = assets;
            renderRelatedDataPreview(assets, reportOfficer.officerName);

            if (!silent) {
                showNotice(`Loaded ${assets.length} related ${documentLabel} asset record${assets.length === 1 ? '' : 's'} for ${reportOfficer.officerName || reportOfficer.division}.`);
            }
        })
        .fail((xhr) => {
            handleRequestError(xhr, `Unable to load related ${documentLabel} records.`);
        });
}

function setReportType(reportType, silent = true) {
    const normalized = String(reportType || '').trim().toUpperCase();

    appState.reportType = normalized;
    $('.report-type-card').removeClass('is-active').attr('aria-pressed', 'false');
    $('#reportForm [name="report_type"]').val(normalized);
    $('#inventoryReportForm [name="report_type"]').val('INVENTORY');

    if (normalized) {
        $(`.report-type-card[data-report-type="${normalized}"]`).addClass('is-active').attr('aria-pressed', 'true');
        // Add compact class to all cards when a type is selected
        $('.report-type-card').addClass('report-type-card--compact');
    } else {
        $('.report-type-card').removeClass('report-type-card--compact');
    }

    $('#parReportPanel').addClass('hidden');
    $('#inventoryReportPanel').addClass('hidden');
    $('#reportPreviewPanel').removeClass('hidden');

    if (normalized === 'PAR' || normalized === 'ICS') {
        const documentLabel = normalized === 'ICS' ? 'ICS' : 'PAR';
        setReportWorkspaceVisible(true);
        $('#parReportPanel').removeClass('hidden');
        $('#reportPanelEyebrow').text(`${documentLabel} Workflow`);
        $('#reportPanelTitle').text(`${documentLabel} Generation`);
        $('#generateDocumentReport').text(`Generate ${documentLabel} Report`);
        $('#reportSelectionHint').text(`${documentLabel} selected. Choose a division, then select an accountable officer.`);
        setReportPlaceholder(`Choose a division and accountable officer to preview related ${documentLabel} records.`);

        const division = $('#reportDivision').val() || '';
        if (division) {
            loadReportOfficers(division, true);
        } else {
            populateReportOfficers('', []);
            $('#reportOfficerHint').text('Choose a division to load officers.');
        }

        if (!silent) {
            showNotice(`${documentLabel} report selected.`);
            window.requestAnimationFrame(() => {
                $('#reportWorkflowArea')[0]?.scrollIntoView({ block: 'start', behavior: 'smooth' });
            });
        }

        return;
    }

    if (normalized === 'INVENTORY') {
        setReportWorkspaceVisible(true);
        $('#inventoryReportPanel').removeClass('hidden');
        $('#reportSelectionHint').text('Inventory selected. Filter by date, officer, or item, then generate the issuance report.');
        setReportPlaceholder('Choose a date range, officer, or item to preview inventory issuance records.');

        if (!silent) {
            showNotice('Inventory report selected.');
            window.requestAnimationFrame(() => {
                $('#reportWorkflowArea')[0]?.scrollIntoView({ block: 'start', behavior: 'smooth' });
            });
        }

        return;
    }

    if (normalized === 'SPI' || normalized === 'RPCPPE' || normalized === 'REGSPI') {
        setReportWorkspaceVisible(true);
        $('#reportSelectionHint').text('SPI uses a separate report template and is not part of the PAR / ICS officer workflow.');
        setReportPlaceholder('SPI reporting is not shown in this PAR / ICS workflow area.');

        if (!silent) {
            showNotice('SPI reporting is separate from the PAR / ICS officer workflow.', 'error');
            window.requestAnimationFrame(() => {
                $('#reportWorkflowArea')[0]?.scrollIntoView({ block: 'start', behavior: 'smooth' });
            });
        }

        return;
    }

    setReportWorkspaceVisible(false);
    $('#reportSelectionHint').text('Select PAR, SPI, ICS, or Inventory to begin.');
    $('#reportPreviewPanel').addClass('hidden');
    setReportPlaceholder('Select a report type to begin.');
}

function resetReportWorkflow() {
    $('#reportForm')[0].reset();
    $('#inventoryReportForm')[0]?.reset();
    $('#reportForm [name="report_type"]').val('PAR');
    $('#inventoryReportForm [name="report_type"]').val('INVENTORY');
    $('#selectedOfficerId').val('');
    $('#selectedOfficer').val('');
    $('#selectedDivision').val('');
    $('#reportDivision').val('');
    populateReportOfficers('', []);
    $('#reportOfficerHint').text('Choose a division to load officers.');
    appState.reportPreview = [];
    setReportPlaceholder(`Choose a division and accountable officer to preview related ${(String(appState.reportType || 'PAR').trim().toUpperCase() === 'ICS' ? 'ICS' : 'PAR')} records.`);
}

function refreshActiveReport(silent = true) {
    if (appState.activeView === 'reports' && ['PAR', 'ICS'].includes(appState.reportType)) {
        return generateReport(silent);
    }

    if (appState.activeView === 'reports' && appState.reportType === 'INVENTORY') {
        return generateInventoryReport(silent);
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

function formatDateTimeLabel(value) {
    const stamp = String(value || '').trim();

    if (!stamp) {
        return 'Not available';
    }

    const date = new Date(stamp.replace(' ', 'T'));

    if (Number.isNaN(date.getTime())) {
        return stamp;
    }

    return date.toLocaleString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function syncAssetDateFields(formatDisplay = false) {
    const $storage = $('#assetForm [name="date_acquired"]');
    const $display = $('#assetForm [name="date_acquired_display"]');

    if (!$storage.length || !$display.length) {
        return;
    }

    const displayValue = String($display.val() || '').trim();
    const storageValue = formatStorageDate(displayValue);

    $storage.val(storageValue);

    if (formatDisplay && storageValue) {
        $display.val(formatCompactDate(storageValue));
    }
}

function setAssetDateDisplay(value) {
    const storageValue = formatStorageDate(value);
    $('#assetForm [name="date_acquired"]').val(storageValue);
    $('#assetForm [name="date_acquired_display"]').val(storageValue ? formatCompactDate(storageValue) : '');
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

function inventoryStatusModifier(statusCode) {
    const normalized = String(statusCode || 'NORMAL').trim().toLowerCase();
    return ['low', 'near', 'at_limit'].includes(normalized) ? normalized : 'normal';
}

function renderDashboardSurface(chartData = {}) {
    const modeLabel = String(chartData.mode || 'Overview').trim() || 'Overview';
    const inventorySummary = chartData.inventory && typeof chartData.inventory === 'object' ? chartData.inventory : {};
    const watchlist = Array.isArray(inventorySummary.watchlist) ? inventorySummary.watchlist : [];
    const lead = watchlist[0] || null;
    const heroCopyMap = {
        Overview: 'Monitor asset distribution, funding exposure, and stock health from one control center.',
        Monthly: 'Review the selected month for asset movement, current values, and stock pressure in one view.',
        Yearly: 'Track the full-year asset picture while keeping inventory thresholds and funding exposure visible.',
        'By Division': 'See which divisions carry the highest asset concentration while inventory watch items stay in focus.',
        'By Funding': 'Compare fund clusters, value concentration, and the inventory watchlist in one monitoring board.',
        'By Classification': 'Contrast PPE and SEMI activity while keeping live inventory alerts close at hand.',
    };
    const categoryTitleMap = {
        Overview: 'Classification Distribution',
        Monthly: 'Asset Count for Selected Month',
        Yearly: 'Yearly Asset Count Mix',
        'By Division': 'Division Asset Mix',
        'By Funding': 'Funding Mix by Asset Count',
        'By Classification': 'Classification Distribution',
    };
    const categoryCopyMap = {
        Overview: 'Current asset count grouped by major asset category.',
        Monthly: 'Asset count grouped for the currently selected month.',
        Yearly: 'Asset count grouped across the selected year.',
        'By Division': 'Asset count grouped by accountable division.',
        'By Funding': 'Asset count grouped by funding source.',
        'By Classification': 'A focused look at PPE and SEMI distribution.',
    };
    const fundingTitleMap = {
        Overview: 'Asset Value by Division',
        Monthly: 'Monthly Asset Value Snapshot',
        Yearly: 'Yearly Asset Value by Division',
        'By Division': 'Asset Value by Division',
        'By Funding': 'Funding Allocation',
        'By Classification': 'Asset Value by Classification',
    };
    const fundingCopyMap = {
        Overview: 'Compare asset value concentration across divisions in the active dataset.',
        Monthly: 'Compare value concentration for the currently selected month.',
        Yearly: 'Compare value concentration across the selected year.',
        'By Division': 'Compare asset value concentration per division.',
        'By Funding': 'Compare the asset value concentration of each funding source.',
        'By Classification': 'Compare asset value between PPE and SEMI classifications.',
    };
    const leadStatusCode = lead ? inventoryStatusModifier(lead.stock_status_code || 'NORMAL') : 'normal';
    const leadMeta = lead
        ? [lead.stock_number || lead.item_code || '', lead.request_type || '', lead.unit || ''].filter(Boolean).join(' | ')
        : 'Inventory alerts will appear here as soon as stock thresholds need attention.';

    $('#dashboardModeBadge').text(modeLabel);
    $('#dashboardHeroCopy').text(heroCopyMap[modeLabel] || heroCopyMap.Overview);
    $('#dashboardCategoryTitle').text(categoryTitleMap[modeLabel] || categoryTitleMap.Overview);
    $('#dashboardCategoryCopy').text(categoryCopyMap[modeLabel] || categoryCopyMap.Overview);
    $('#dashboardFundingTitle').text(fundingTitleMap[modeLabel] || fundingTitleMap.Overview);
    $('#dashboardFundingCopy').text(fundingCopyMap[modeLabel] || fundingCopyMap.Overview);
    animateMetricValue('#dashboardInventoryTotal', inventorySummary.total_items || 0);
    animateMetricValue('#dashboardInventoryLow', inventorySummary.low_stock_count || 0);
    animateMetricValue('#dashboardInventoryNear', inventorySummary.near_low_count || 0);
    animateMetricValue('#dashboardInventoryAtLimit', inventorySummary.at_limit_count || inventorySummary.high_stock_count || 0);
    $('#dashboardWatchlistCount').text(`${watchlist.length} Item${watchlist.length === 1 ? '' : 's'}`);
    $('#dashboardWatchLeadName').text(lead ? String(lead.item_name || 'Inventory item').trim() : 'No watchlist items yet');
    $('#dashboardWatchLeadMeta').text(leadMeta || 'Needs attention soon.');
    $('#dashboardWatchLeadStatus')
        .attr('class', `inventory-status-chip inventory-status-chip--${leadStatusCode}`)
        .text(lead ? String(lead.stock_status_label || 'Watch').trim() : 'Stable');
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

function currentOfficer(officerId) {
    return appState.registrationOfficers.find((officer) => Number(officer.officer_id) === Number(officerId)) || null;
}

function currentInventoryItem(itemId) {
    return appState.inventoryItems.find((item) => Number(item.inventory_item_id) === Number(itemId)) || null;
}

function syncInventoryRowSelection() {
    const selectedId = Number(appState.selectedInventoryItemId || 0);

    $('#inventoryTableBody tr').each(function () {
        $(this).toggleClass('inventory-table__row--selected', Number($(this).data('id') || 0) === selectedId);
    });
}

function setSelectedInventoryItem(itemId) {
    appState.selectedInventoryItemId = Number(itemId || 0);
    syncInventoryRowSelection();
}

function renderRowViewAction(buttonClass, itemId, label = 'View') {
    return `
        <div class="manage-actions">
            <button type="button" class="manage-action-btn manage-action-btn--info ${buttonClass}" data-id="${escapeHtml(itemId || '')}" title="View details" aria-label="View details">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M2.5 12s3.6-6 9.5-6 9.5 6 9.5 6-3.6 6-9.5 6-9.5-6-9.5-6Z"></path>
                    <circle cx="12" cy="12" r="2.6"></circle>
                </svg>
            </button>
        </div>
    `;
}

function setActiveParSelection(parNumber = '') {
    const normalizedParNumber = String(parNumber || '').trim();
    appState.activeParSelectionNumber = normalizedParNumber;
    $('.asset-par-cell, .manage-par-cell').removeClass('par-cell--active');

    if (normalizedParNumber === '') {
        return;
    }

    $('#assetsDirectoryBody tr, #assetTableBody tr').each(function () {
        const rowParNumber = String($(this).data('par-number') || '').trim();

        if (rowParNumber === normalizedParNumber) {
            $(this).find('.asset-par-cell, .manage-par-cell').addClass('par-cell--active');
        }
    });
}

function defaultAssetWizardContext() {
    return {
        mode: 'create',
        updateScope: '',
        assetId: 0,
        parId: 0,
        parNumber: '',
        batchAssets: [],
    };
}

function isAssetWizardEditMode() {
    return String(appState.assetWizardContext?.mode || '').trim().toLowerCase() === 'edit';
}

function syncDashboardAutoRefresh() {
    if (dashboardRefreshTimer) {
        window.clearInterval(dashboardRefreshTimer);
        dashboardRefreshTimer = null;
    }

    if (appState.activeView !== 'dashboard') {
        return;
    }

    dashboardRefreshTimer = window.setInterval(() => {
        if (document.hidden || appState.activeView !== 'dashboard') {
            return;
        }

        refreshDashboard(true);
    }, 15000);
}

function closeSidebar() {
    $('#sidebar').addClass('-translate-x-full');
    $('#mobileOverlay').addClass('hidden');
}

function openSidebar() {
    $('#sidebar').removeClass('-translate-x-full');
    $('#mobileOverlay').removeClass('hidden');
}

function applySidebarCollapsedState(collapsed) {
    $('body').toggleClass('sidebar-collapsed', Boolean(collapsed));
}

function isDesktopViewport() {
    return window.matchMedia('(min-width: 1024px)').matches;
}

function loadSidebarCollapsedState() {
    try {
        return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
    } catch (error) {
        return false;
    }
}

function setSidebarCollapsedState(collapsed) {
    applySidebarCollapsedState(collapsed);

    try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
    } catch (error) {
        // Ignore storage failures in restricted browsers.
    }
}

function toggleSidebarCollapsedState() {
    if (!isDesktopViewport()) {
        return;
    }

    setSidebarCollapsedState(!$('body').hasClass('sidebar-collapsed'));
}

function renderCharts(chartData) {
    if (!chartData) {
        return;
    }

    renderDashboardSurface(chartData);

    const pieLabels = chartData.pie?.labels || [];
    const pieValues = chartData.pie?.values || [];
    const barLabels = chartData.bar?.labels || [];
    const barValues = chartData.bar?.values || [];
    const inventoryGraph = chartData.inventory?.graph || {};
    const inventoryLabels = inventoryGraph.labels || [];
    const inventoryStocks = inventoryGraph.stocks || [];
    const inventoryLimits = inventoryGraph.limits || [];
    const inventoryStatuses = inventoryGraph.status_codes || [];
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

    if ($('#categoryChart').length && appState.charts.pie) {
        appState.charts.pie.destroy();
    }

    if ($('#fundingChart').length && appState.charts.bar) {
        appState.charts.bar.destroy();
    }

    if ($('#categoryChart').length) {
        appState.charts.pie = new Chart(document.getElementById('categoryChart'), {
            type: 'doughnut',
            data: {
                labels: pieLabels,
                datasets: [{
                    data: pieValues,
                    backgroundColor: piePalette,
                    borderColor: '#ffffff',
                    borderWidth: 3,
                    hoverOffset: 6,
                }],
            },
            options: {
                maintainAspectRatio: false,
                cutout: '62%',
                animation: {
                    duration: 900,
                    easing: 'easeOutQuart',
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            boxWidth: 12,
                            color: '#334155',
                            font: {
                                family: APP_FONT_FAMILY,
                                size: 12,
                                weight: '600',
                            },
                        },
                    },
                },
            },
        });
    }

    if ($('#fundingChart').length) {
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
                                family: APP_FONT_FAMILY,
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
                            family: APP_FONT_FAMILY,
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
                            family: APP_FONT_FAMILY,
                            size: 11,
                        },
                    },
                },
                },
            },
        });
    }

    if ($('#inventoryStockChart').length) {
        if (appState.charts.inventory) {
            appState.charts.inventory.destroy();
        }

        appState.charts.inventory = new Chart(document.getElementById('inventoryStockChart'), {
            type: 'bar',
            data: {
                labels: inventoryLabels,
                datasets: [{
                    type: 'bar',
                    label: 'Current Stock',
                    data: inventoryStocks,
                    backgroundColor: inventoryStatuses.map((statusCode) => {
                        const normalized = String(statusCode || '').toUpperCase();

                        if (normalized === 'LOW') {
                            return '#f87171';
                        }

                        if (normalized === 'NEAR') {
                            return '#facc15';
                        }

                        if (normalized === 'AT_LIMIT') {
                            return '#0f766e';
                        }

                        return '#1155A5';
                    }),
                    borderRadius: 8,
                    borderSkipped: false,
                }, {
                    type: 'line',
                    label: 'Stock Limit',
                    data: inventoryLimits,
                    borderColor: '#1f2937',
                    backgroundColor: '#1f2937',
                    pointBackgroundColor: '#1f2937',
                    pointRadius: 3,
                    tension: 0.24,
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
                            boxWidth: 16,
                            color: '#1155A5',
                            font: {
                                family: APP_FONT_FAMILY,
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
                            color: '#64748b',
                            font: {
                                family: APP_FONT_FAMILY,
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
                                family: APP_FONT_FAMILY,
                                size: 11,
                            },
                        },
                    },
                },
            },
        });
    }
}

function renderInventoryAlerts(summary = {}) {
    const $meta = $('#inventoryAlertMeta');
    const $list = $('#inventoryAlertList');

    if (!$meta.length || !$list.length) {
        return;
    }

    const lowCount = Number(summary.low_stock_count || 0);
    const nearCount = Number(summary.near_low_count || 0);
    const highCount = Number(summary.high_stock_count || summary.at_limit_count || 0);
    const watchlist = Array.isArray(summary.watchlist) ? summary.watchlist : [];

    $meta.text(`LOW: ${lowCount} | NEAR LOW: ${nearCount} | HIGH STOCK: ${highCount}`);

    if (!watchlist.length) {
        $list.html('<div class="inventory-alert-empty">No low stock materials to monitor right now.</div>');
        return;
    }

    $list.html(
        watchlist.map((item) => `
            <article class="inventory-alert-item inventory-alert-item--${escapeHtml(String(item.stock_status_code || '').toLowerCase())}">
                <div class="inventory-alert-item__main">
                    <div class="inventory-alert-item__title-row">
                        <h4 class="inventory-alert-item__title">${escapeHtml(item.item_name)}</h4>
                        <span class="inventory-status-chip inventory-status-chip--${escapeHtml(String(item.stock_status_code || '').toLowerCase())}">${escapeHtml(item.stock_status_label || 'In Stock')}</span>
                    </div>
                    <p class="inventory-alert-item__meta">${escapeHtml(item.stock_number || item.item_code || '')} | ${escapeHtml(item.request_type || '')} | ${escapeHtml(item.unit || '')}</p>
                </div>
                <div class="inventory-alert-item__stats">
                    <strong>${escapeHtml(String(item.current_stock || 0))}</strong>
                    <span>Current / Limit ${escapeHtml(String(item.stock_limit || item.low_stock_threshold || 0))}</span>
                </div>
            </article>
        `).join('')
    );
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
                            family: APP_FONT_FAMILY,
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
                            family: APP_FONT_FAMILY,
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
                            family: APP_FONT_FAMILY,
                            size: 11,
                        },
                    },
                },
            },
        },
    });
}

function renderCharts(chartData) {
    if (!chartData) {
        return;
    }

    renderDashboardSurface(chartData);

    const pieLabels = chartData.pie?.labels || [];
    const pieValues = chartData.pie?.values || [];
    const barLabels = chartData.bar?.labels || [];
    const barValues = chartData.bar?.values || [];
    const inventoryGraph = chartData.inventory?.graph || {};
    const inventoryLabels = inventoryGraph.labels || [];
    const inventoryStocks = inventoryGraph.stocks || [];
    const inventoryLimits = inventoryGraph.limits || [];
    const inventoryStatuses = inventoryGraph.status_codes || [];
    const piePalette = pieLabels.map((label, index) => {
        const normalized = String(label || '').toLowerCase();

        if (normalized.includes('semi')) {
            return '#2ec4b6';
        }

        if (normalized.includes('ppe')) {
            return '#1f5fb4';
        }

        return ['#1f5fb4', '#2ec4b6', '#f59e0b', '#ef4444', '#8b5cf6', '#38bdf8'][index % 6];
    });

    if ($('#categoryChart').length && appState.charts.pie) {
        appState.charts.pie.destroy();
    }

    if ($('#fundingChart').length && appState.charts.bar) {
        appState.charts.bar.destroy();
    }

    if ($('#inventoryStockChart').length && appState.charts.inventory) {
        appState.charts.inventory.destroy();
    }

    if ($('#categoryChart').length) {
        appState.charts.pie = new Chart(document.getElementById('categoryChart'), {
            type: 'doughnut',
            data: {
                labels: pieLabels,
                datasets: [{
                    data: pieValues,
                    backgroundColor: piePalette,
                    borderColor: '#ffffff',
                    borderWidth: 3,
                    hoverOffset: 6,
                }],
            },
            options: {
                maintainAspectRatio: false,
                cutout: '62%',
                animation: {
                    duration: 900,
                    easing: 'easeOutQuart',
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            boxWidth: 12,
                            color: '#334155',
                            font: {
                                family: APP_FONT_FAMILY,
                                size: 12,
                                weight: '600',
                            },
                        },
                    },
                },
            },
        });
    }

    if ($('#fundingChart').length) {
        appState.charts.bar = new Chart(document.getElementById('fundingChart'), {
            type: 'bar',
            data: {
                labels: barLabels,
                datasets: [{
                    label: 'Amount (PHP)',
                    data: barValues,
                    backgroundColor: barLabels.map((_, index) => ['#1f5fb4', '#2ec4b6', '#f59e0b', '#ef4444', '#8b5cf6', '#38bdf8'][index % 6]),
                    borderRadius: 10,
                    borderSkipped: false,
                    maxBarThickness: 38,
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
                            usePointStyle: true,
                            pointStyle: 'circle',
                            boxWidth: 16,
                            color: '#334155',
                            font: {
                                family: APP_FONT_FAMILY,
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
                                return `PHP ${numberFormatter.format(Math.round(numeric / 1000))}k`;
                            },
                            color: '#64748b',
                            font: {
                                family: APP_FONT_FAMILY,
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
                                family: APP_FONT_FAMILY,
                                size: 11,
                            },
                        },
                    },
                },
            },
        });
    }

    if ($('#inventoryStockChart').length) {
        appState.charts.inventory = new Chart(document.getElementById('inventoryStockChart'), {
            type: 'bar',
            data: {
                labels: inventoryLabels,
                datasets: [{
                    type: 'bar',
                    label: 'Current Stock',
                    data: inventoryStocks,
                    backgroundColor: inventoryStatuses.map((statusCode) => {
                        const normalized = String(statusCode || '').toUpperCase();

                        if (normalized === 'LOW') {
                            return '#ef4444';
                        }

                        if (normalized === 'NEAR') {
                            return '#f59e0b';
                        }

                        if (normalized === 'AT_LIMIT') {
                            return '#2ec4b6';
                        }

                        return '#1f5fb4';
                    }),
                    borderRadius: 10,
                    borderSkipped: false,
                }, {
                    type: 'line',
                    label: 'Stock Limit',
                    data: inventoryLimits,
                    borderColor: '#0f172a',
                    backgroundColor: '#0f172a',
                    pointBackgroundColor: '#0f172a',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 5,
                    tension: 0.32,
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
                            pointStyle: 'circle',
                            boxWidth: 16,
                            color: '#334155',
                            font: {
                                family: APP_FONT_FAMILY,
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
                            color: '#64748b',
                            font: {
                                family: APP_FONT_FAMILY,
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
                                family: APP_FONT_FAMILY,
                                size: 11,
                            },
                        },
                    },
                },
            },
        });
    }
}

function renderInventoryAlerts(summary = {}) {
    const $meta = $('#inventoryAlertMeta');
    const $list = $('#inventoryAlertList');
    const $count = $('#dashboardWatchlistCount');

    if (!$meta.length || !$list.length) {
        return;
    }

    const lowCount = Number(summary.low_stock_count || 0);
    const nearCount = Number(summary.near_low_count || 0);
    const highCount = Number(summary.high_stock_count || summary.at_limit_count || 0);
    const watchlist = Array.isArray(summary.watchlist) ? summary.watchlist : [];

    $meta.text(`LOW: ${lowCount} | NEAR LOW: ${nearCount} | HIGH STOCK: ${highCount}`);
    $count.text(`${watchlist.length} Item${watchlist.length === 1 ? '' : 's'}`);

    if (!watchlist.length) {
        $list.html('<div class="inventory-alert-empty">No low stock materials to monitor right now.</div>');
        return;
    }

    $list.html(
        watchlist.map((item) => `
            <article class="inventory-alert-item inventory-alert-item--${escapeHtml(inventoryStatusModifier(item.stock_status_code || 'NORMAL'))}">
                <div class="inventory-alert-item__main">
                    <div class="inventory-alert-item__title-row">
                        <h4 class="inventory-alert-item__title">${escapeHtml(item.item_name)}</h4>
                        <span class="inventory-status-chip inventory-status-chip--${escapeHtml(inventoryStatusModifier(item.stock_status_code || 'NORMAL'))}">${escapeHtml(item.stock_status_label || 'In Stock')}</span>
                    </div>
                    <p class="inventory-alert-item__meta">${escapeHtml([item.stock_number || item.item_code || '', item.request_type || '', item.unit || ''].filter(Boolean).join(' | '))}</p>
                </div>
                <div class="inventory-alert-item__stats">
                    <strong>${escapeHtml(String(item.current_stock || 0))}</strong>
                    <span>Current / Limit ${escapeHtml(String(item.stock_limit || item.low_stock_threshold || 0))}</span>
                </div>
            </article>
        `).join('')
    );
}

function activateView(viewName, updateHash = true) {
    const finalView = normalizeViewName(viewName);
    const currentView = normalizeViewName(appState.activeView);
    const hasCurrentModule = $('#moduleContainer [data-view]').length > 0;
    const $targetModule = $('#moduleContainer .app-view[data-view="' + finalView + '"]');
    const $currentModule = $('#moduleContainer .app-view.active[data-view="' + currentView + '"]');

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

        if ($currentModule.length) {
            appState.moduleCache[currentView] = $currentModule.prop('outerHTML');
        }
    }

    if (currentView === finalView && $targetModule.length) {
        updateActiveNav(finalView);
        appState.activeView = finalView;
        syncDashboardAutoRefresh();
        resetActiveViewScroll();

        if (updateHash) {
            history.replaceState(null, '', `#${finalView}`);
        }

        return $.Deferred().resolve();
    }

    appState.activeView = finalView;
    updateActiveNav(finalView);
    syncDashboardAutoRefresh();

    if (updateHash) {
        history.replaceState(null, '', `#${finalView}`);
    }

    if ($targetModule.length) {
        $('#moduleContainer .app-view').removeClass('active');
        $targetModule.addClass('active');
        resetActiveViewScroll();
        initializeModule(finalView);
        return $.Deferred().resolve();
    }

    if (appState.moduleCache[finalView]) {
        $('#moduleContainer .app-view').removeClass('active');
        $('#moduleContainer').append(appState.moduleCache[finalView]);
        $('#moduleContainer .app-view[data-view="' + finalView + '"]').addClass('active');
        resetActiveViewScroll();
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
            $('#moduleContainer .app-view').removeClass('active');
            $('#moduleContainer').append(html);
            $('#moduleContainer .app-view[data-view="' + finalView + '"]').addClass('active');
            resetActiveViewScroll();
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
                            <div class="toolbar-note">${escapeHtml(message)}</div>
                        </div>
                    </div>
                </section>
            `);
            showNotice(`Unable to load the ${finalView} module.`, 'error');
        });
}

function updateAssetSubmitButton() {
    const quantity = Number($('#assetForm [name="quantity"]').val() || 1);
    if (isAssetWizardEditMode()) {
        $('#assetSubmitButton span').text('Save PAR Updates');
        return;
    }

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
        $rule.text('(PHP 50,000 and above each)');
        return;
    }

    if (classification === 'SEMI') {
        $rule.text('(Below PHP 50,000 each)');
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
    const classification = String(payload.classification || '').trim().toUpperCase();
    const propertyNumberMessage = classification === 'SEMI'
        ? 'This SEMI batch will share one property number.'
        : 'Each PPE item will receive its own property number.';
    $('#assetSerialSubtitle').text(
        `Assign a unique serial number for each of the ${quantity || 0} item${quantity === 1 ? '' : 's'}. ${propertyNumberMessage}`
    );
}

function updateAssetWizardChrome(stage) {
    const normalized = String(stage || 'step1').toLowerCase();
    const context = appState.assetWizardContext || defaultAssetWizardContext();
    const isEditMode = isAssetWizardEditMode();
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
    $('#assetParUpdateBack')
        .toggleClass('hidden', !isEditMode || normalized !== 'step1');
    $('#assetStep1Section .asset-step-card__actions')
        .toggleClass('asset-step-card__actions--end', !isEditMode || normalized !== 'step1');

    if (normalized === 'serial') {
        const classification = String($('#assetForm [name="classification"]').val() || '').trim().toUpperCase();
        const serialSubtitle = classification === 'SEMI'
            ? 'Assign a unique serial number for each saved asset. The SEMI batch will share one property number.'
            : 'Assign a unique serial number for each saved asset. Each PPE item will receive its own property number.';
        $('#assetWizardMainTitle').text('Enter Serial Numbers');
        $('#assetWizardMainSubtitle').text(serialSubtitle);
        return;
    }

    if (isEditMode) {
        const batchCount = Array.isArray(context.batchAssets) ? context.batchAssets.length : 0;
        $('#assetWizardMainTitle').text('Update PAR Assets');
        $('#assetWizardMainSubtitle').text('Review the selected PAR asset details from Step 1 to Step 3, then save the update for the whole PAR batch.');
        $('#assetWizardModeBanner')
            .removeClass('hidden')
            .text(`${context.parNumber || 'Selected PAR'} | Updating ${batchCount || 0} asset${batchCount === 1 ? '' : 's'} under this document. Serial numbers will stay unchanged.`);
        return;
    }

    $('#assetWizardMainTitle').text('Add Assets');
    $('#assetWizardMainSubtitle').text('Register a new asset in the inventory');
    $('#assetWizardModeBanner').addClass('hidden').text('');
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

    if (!String(payload.officer_id || '').trim()) {
        errors.officer_id = 'Choose an accountable officer.';
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

    if (!String(payload.officer_id || '').trim()) {
        errors.officer_id = 'Choose an accountable officer.';
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
        errors.unit_cost = 'PPE assets must be valued at PHP 50,000 or above per item.';
    }

    if ((payload.classification || '') === 'SEMI' && unitCost >= CATEGORY_THRESHOLD) {
        errors.unit_cost = 'SEMI assets must be valued below PHP 50,000 per item.';
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

    const usefulLife = String(payload.estimated_useful_life || '').trim();
    if (usefulLife === '') {
        errors.estimated_useful_life = 'Estimated useful life is required.';
    } else if (!/^\d+(\.\d+)?$/.test(usefulLife)) {
        errors.estimated_useful_life = 'Estimated useful life must be a valid number.';
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

function configureAssetWizardForMode() {
    const context = appState.assetWizardContext || defaultAssetWizardContext();
    const batchAssets = Array.isArray(context.batchAssets) ? context.batchAssets : [];
    const batchCount = batchAssets.length || 1;
    const $quantity = $('#assetForm [name="quantity"]');
    $('.asset-entry-shell').toggleClass('asset-entry-shell--edit', isAssetWizardEditMode());

    if (isAssetWizardEditMode()) {
        $quantity.val(batchCount).prop('readonly', true).attr('aria-readonly', 'true');
        $('#bulkSerialPanel').addClass('hidden');
    } else {
        const currentQuantity = Number($quantity.val() || 0);
        $quantity.val(currentQuantity > 0 ? currentQuantity : 1).prop('readonly', false).removeAttr('aria-readonly');
    }
}

function fillAssetWizardForBatchEdit(asset, batchAssets = []) {
    const contextBatch = Array.isArray(batchAssets) && batchAssets.length ? batchAssets : [asset].filter(Boolean);

    appState.assetWizardContext = {
        mode: 'edit',
        updateScope: 'par',
        assetId: Number(asset?.id || 0),
        parId: Number(asset?.par_id || 0),
        parNumber: String(asset?.par_number || '').trim(),
        batchAssets: contextBatch,
    };

    $('#assetForm [name="id"]').val(asset?.id || '');
    $('#assetForm [name="par_id"]').val(asset?.par_id || '');
    $('#assetForm [name="update_scope"]').val('par');
    $('#assetForm [name="classification"]').val(asset?.classification || '');
    $('#assetForm [name="funding_source"]').val(asset?.funding_source || '');
    $('#assetForm [name="division"]').val(asset?.division || '');
    $('#assetForm [name="officer_id"]').val(asset?.officer_id || '');
    $('#assetForm [name="officer_name"]').val(asset?.officer_name || '');
    $('#assetForm [name="property_name"]').val(asset?.property_name || '');
    $('#assetForm [name="property_type"]').val(asset?.property_type || '');
    $('#assetForm [name="unit_cost"]').val(formatCurrencyInputValue(asset?.unit_cost || ''));
    $('#assetForm [name="quantity"]').val(contextBatch.length || 1);
    $('#assetForm [name="date_acquired"]').val(asset?.date_acquired || '');
    $('#assetForm [name="estimated_useful_life"]').val(asset?.estimated_useful_life || '');
    $('#assetForm [name="description"]').val(asset?.description || '');
    $('#assetForm [name="current_condition"]').val(asset?.current_condition || '');
    $('#assetForm [name="remarks"]').val(asset?.remarks || '');
    setAssetDateDisplay(asset?.date_acquired || '');

    configureAssetWizardForMode();
    updateAssetChoiceButtons();
    updateAssetUnitCostRule();
    refreshSearchableSelect($('#assetForm [name="division"]'));
    refreshSearchableSelect($('#assetForm [name="property_type"]'));

    loadAssetOfficers(String(asset?.division || '').trim(), true).always(() => {
        $('#assetOfficerSelect').val(String(asset?.officer_id || ''));
        refreshSearchableSelect($('#assetOfficerSelect'));
        syncAssetOfficerName();
        $('#assetOfficerHint').text('This PAR batch is loaded from the database. Review the shared details, then save the update for the entire document.');
    });
}

function resetAssetWorkflow(hideResult = false) {
    if ($('#assetForm').length) {
        $('#assetForm')[0].reset();
        const defaultDate = $('#assetForm').data('default-date')
            || $('#assetForm [name="date_acquired"]').val()
            || new Date().toISOString().slice(0, 10);
        setAssetDateDisplay(defaultDate);
        $('#assetForm [name="id"]').val('');
        $('#assetForm [name="par_id"]').val('');
        $('#assetForm [name="update_scope"]').val('');
        $('#assetForm [name="property_type"]').val(appState.assetTypeFilter || '');
        $('#assetForm [name="officer_name"]').val('');
        $('#assetForm [name="officer_id"]').val('');
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
    appState.assetWizardContext = defaultAssetWizardContext();
    $('#assetForm').data('stage', 'step1');

    if (hideResult) {
        $('#assetResult').addClass('hidden');
    }

    renderAssetSerialSummary({});
    updateAssetChoiceButtons();
    updateAssetUnitCostRule();
    populateAssetOfficers('', []);
    $('#assetOfficerHint').text('Choose a division to load registered accountable officers. Register an officer first if the list is empty.');
    configureAssetWizardForMode();
    showAssetWizardStep('step1');

    updateAssetSubmitButton();
}

function setOfficerRegistrationVisible(visible) {
    const $modal = $('#officerRegistrationModal');

    if (!$modal.length) {
        return;
    }

    if (visible) {
        closeSidebar();
        setNotificationPanelVisible(false);
        setProfileMenuVisible(false);
    }

    $modal.toggleClass('hidden', !visible).toggleClass('flex', visible);
    const keepLocked = visible || $('#assetEntryPanel.flex, #editModal.flex, #detailsModal.flex, #officerDetailsModal.flex, #notificationDetailsModal.flex').length > 0;
    $('body').toggleClass('overflow-hidden', keepLocked);
}

function updateRegistrationDivisionCards() {
    const selectedDivision = String($('#officerRegistrationForm [name="division"]').val() || '').trim();

    $('.registration-division-card').each(function () {
        const isSelected = String($(this).data('division') || '').trim() === selectedDivision;
        $(this).toggleClass('is-selected', isSelected).attr('aria-pressed', String(isSelected));
    });
}

function updateOfficerUnitField() {
    const $field = $('#officerUnitField');
    const $grid = $('#officerRegistrationForm .registration-form-grid');

    if (!$field.length) {
        return;
    }

    const division = String($('#officerRegistrationForm [name="division"]').val() || '').trim().toUpperCase();
    const isFad = division === 'FAD';
    $field.toggleClass('hidden', !isFad);
    $grid.toggleClass('registration-form-grid--stacked', isFad);

    if (!isFad) {
        $('#officerRegistrationForm [name="unit"]').val('');
        $('[data-error-for="unit"]').addClass('hidden').text('');
    }
}

function updateOfficerSaveState() {
    const $form = $('#officerRegistrationForm');
    const $button = $('#saveOfficerButton');

    if (!$form.length || !$button.length) {
        return;
    }

    const officerId = Number($form.find('[name="officer_id"]').val() || 0);

    if (officerId <= 0) {
        $button.prop('disabled', false).removeClass('is-disabled');
        return;
    }

    const baseline = String(appState.officerFormBaseline || '');
    const currentState = serializeOfficerFormState(formData($form));
    const hasChanges = baseline !== '' && currentState !== baseline;
    $button.prop('disabled', !hasChanges).toggleClass('is-disabled', !hasChanges);
}

function resetOfficerRegistrationForm() {
    if (!$('#officerRegistrationForm').length) {
        return;
    }

    $('#officerRegistrationForm')[0].reset();
    $('#officerRegistrationForm [name="officer_id"]').val('');
    $('#officerRegistrationForm [name="division"]').val('');
    $('#officerRegistrationForm [name="unit"]').val('');
    $('#officerModalTitle').text('Register Officer');
    $('#officerModalCopy').text('Choose a division card first, then complete the officer profile.');
    $('#saveOfficerButton').text('Save Officer');
    appState.officerFormBaseline = '';
    clearErrors('#officerRegistrationForm');
    updateRegistrationDivisionCards();
    updateOfficerUnitField();
    updateOfficerSaveState();
}

function populateOfficerForm(officer) {
    if (!officer) {
        return;
    }

    $('#officerRegistrationForm [name="officer_id"]').val(officer.officer_id || '');
    $('#officerRegistrationForm [name="division"]').val(officer.division || '');
    $('#officerRegistrationForm [name="name"]').val(officer.name || '');
    $('#officerRegistrationForm [name="position"]').val(officer.position || '');
    $('#officerRegistrationForm [name="unit"]').val(officer.unit || '');
    $('#officerModalTitle').text('Update Officer');
    $('#officerModalCopy').text('Review the officer profile and save your changes.');
    $('#saveOfficerButton').text('Save Changes');
    appState.officerFormBaseline = serializeOfficerFormState({
        name: officer.name || '',
        division: officer.division || '',
        position: officer.position || '',
        unit: officer.unit || '',
    });
    updateRegistrationDivisionCards();
    updateOfficerUnitField();
    updateOfficerSaveState();
}

function renderOfficerDetails(officer) {
    const items = [
        ['Officer ID', officer.officer_code || 'Not assigned'],
        ['Name', officer.name],
        ['Division', officer.division],
        ['Position', officer.position || 'Not provided'],
        ...(String(officer.division || '').trim().toUpperCase() === 'FAD'
            ? [['Unit', officer.unit || 'Not provided']]
            : []),
        ['Created', formatDateTimeLabel(officer.created_at)],
        ['Updated', formatDateTimeLabel(officer.updated_at)],
    ];

    $('#officerDetailsName').text(officer.name || 'Officer');
    $('#officerDetailsMeta').text([officer.officer_code || 'No Officer ID', officer.division || 'No Division', officer.position || 'No Position'].join(' | '));
    $('#officerDetailsContent').html(items.map(([label, value]) => `
        <div class="detail-item">
            <div class="detail-label">${escapeHtml(label)}</div>
            <div class="detail-value">${escapeHtml(value || 'Not available')}</div>
        </div>
    `).join(''));
}

function openOfficerDetailsModal(officer) {
    if (!officer) {
        showNotice('Unable to load the selected officer.', 'error');
        return;
    }

    closeSidebar();
    setNotificationPanelVisible(false);
    setProfileMenuVisible(false);
    renderOfficerDetails(officer);
    $('#officerDetailsModal').data('officer-id', Number(officer.officer_id || 0));
    $('#officerDetailsModal').removeClass('hidden').addClass('flex');
    $('body').addClass('overflow-hidden');
}

function closeOfficerDetailsModal() {
    $('#officerDetailsModal').removeData('officer-id');
    $('#officerDetailsModal').addClass('hidden').removeClass('flex');
    if (!$('#assetEntryPanel.flex, #editModal.flex, #detailsModal.flex, #officerRegistrationModal.flex, #notificationDetailsModal.flex').length) {
        $('body').removeClass('overflow-hidden');
    }
}

function syncDivisionDrivenOfficerLists(division) {
    const activeAssetDivision = String($('#assetForm [name="division"]').val() || '').trim();
    loadAssetOfficers(activeAssetDivision, true);

    const reportDivision = String($('#reportDivision').val() || '').trim();
    if (reportDivision !== '' || String(division || '').trim() !== '') {
        loadReportOfficers(reportDivision, true);
    }
}

function registrationShowsUnitColumn() {
    return String($('#registrationFilterForm [name="division"]').val() || '').trim().toUpperCase() === 'FAD';
}

function renderRegistrationTable(rows = appState.registrationOfficers) {
    const officers = (Array.isArray(rows) ? rows : []).slice().sort((left, right) => {
        const leftName = String(left?.name || '').trim();
        const rightName = String(right?.name || '').trim();
        return leftName.localeCompare(rightName, undefined, { sensitivity: 'base' });
    });
    const showUnitColumn = registrationShowsUnitColumn();
    $('#registrationUnitHeading').toggleClass('hidden', !showUnitColumn);
    $('.registration-table').toggleClass('registration-table--with-unit', showUnitColumn).toggleClass('registration-table--default', !showUnitColumn);
    $('#registrationTableMeta').text(formatRecordCountLabel(officers.length));

    // Update pagination state
    paginationState.registration.totalRows = officers.length;
    normalizePaginationPage('registration');

    if (!$('#registrationTableBody').length) {
        return officers;
    }

    if (!officers.length) {
        $('#registrationTableBody').html(`<tr><td colspan="${showUnitColumn ? 7 : 6}" class="px-4 py-10 text-center text-slate-500">No accountable officers found for the current filters.</td></tr>`);
        renderPaginationControls('registration');
        return officers;
    }

    // Get paginated rows
    const paginatedOfficers = getPaginatedRows(officers, 'registration');
    const startIndex = (paginationState.registration.currentPage - 1) * paginationState.registration.rowsPerPage + 1;

    $('#registrationTableBody').html(
        paginatedOfficers.map((officer, index) => `
            <tr class="registration-table__row ${Number(officer.officer_id || 0) === Number(appState.highlightedOfficerId || 0) ? 'registration-table__row--highlight' : ''}" data-id="${escapeHtml(officer.officer_id || '')}" title="Double click to view officer details">
                <td class="registration-table__cell registration-table__cell--index text-center">${startIndex + index}</td>
                <td class="registration-table__cell registration-table__cell--name" title="${escapeHtml(officer.name || '')}">
                    <div class="manage-officer-name">${escapeHtml(officer.name)}</div>
                </td>
                <td class="registration-table__cell registration-table__cell--division" title="${escapeHtml(officer.division || '')}">
                    ${renderDivisionBadge(officer.division, 'registration-division-badge')}
                </td>
                <td class="registration-table__cell registration-table__cell--position" title="${escapeHtml(officer.position || '')}">${escapeHtml(officer.position || '')}</td>
                ${showUnitColumn ? `<td class="registration-table__cell registration-table__cell--unit" title="${escapeHtml(officer.unit || '')}">${escapeHtml(officer.unit || '')}</td>` : ''}
                <td class="registration-table__cell registration-table__cell--updated" title="${escapeHtml(formatDateTimeLabel(officer.updated_at || officer.created_at))}">${escapeHtml(formatDateTimeLabel(officer.updated_at || officer.created_at))}</td>
                <td class="registration-table__cell registration-table__cell--actions">${renderRowViewAction('officer-details', officer.officer_id)}</td>
            </tr>
        `).join('')
    );

    renderPaginationControls('registration');

    return officers;
}

function renderAssetsDirectoryTable(rows = appState.assetDirectory) {
    if (!$('#assetsDirectoryMeta').length || !$('#assetsDirectoryBody').length) {
        return [];
    }

    const assets = Array.isArray(rows) ? rows : [];
    const highlightedIds = new Set((appState.highlightedPropertyIds || []).map((propertyId) => String(propertyId || '').trim()).filter(Boolean));
    const highlightedParNumber = String(appState.highlightedParNumber || '').trim();
    $('#assetsDirectoryMeta').text(formatRecordCountLabel(assets.length));

    // Update pagination state
    paginationState.assets.totalRows = assets.length;
    normalizePaginationPage('assets');

    if (!assets.length) {
        $('#assetsDirectoryBody').html('<tr><td colspan="8" class="px-4 py-10 text-center text-slate-500">No assets found for the selected filters.</td></tr>');
        renderPaginationControls('assets');
        return assets;
    }

    // Get paginated rows
    const paginatedAssets = getPaginatedRows(assets, 'assets');
    const startIndex = (paginationState.assets.currentPage - 1) * paginationState.assets.rowsPerPage + 1;

    $('#assetsDirectoryBody').html(
        paginatedAssets.map((asset, index) => `
            <tr class="${highlightedIds.has(String(asset.property_id || '').trim()) || (highlightedParNumber && String(asset.par_number || '').trim() === highlightedParNumber) ? 'assets-directory-row--highlight' : ''}" data-id="${escapeHtml(asset.id || '')}" data-property-id="${escapeHtml(asset.property_id || '')}" data-par-number="${escapeHtml(asset.par_number || '')}">
                <td class="px-4 py-4 text-center text-slate-600 text-sm" style="width: 3rem;">${startIndex + index}</td>
                <td class="px-4 py-4 text-slate-700 asset-par-cell cursor-pointer ${appState.activeParSelectionNumber && String(asset.par_number || '').trim() === appState.activeParSelectionNumber ? 'par-cell--active' : ''}" data-par-id="${escapeHtml(asset.par_id || '')}" title="Click to highlight. Double click to edit this PAR batch.">
                    <div class="manage-par-number">${escapeHtml(asset.par_number)}</div>
                </td>
                <td class="px-4 py-4 text-slate-700">
                    <div class="manage-officer-name">${escapeHtml(asset.officer_name)}</div>
                </td>
                <td class="px-4 py-4 text-slate-700">
                    <div class="manage-asset-name">${escapeHtml(asset.property_name)}</div>
                </td>
                <td class="px-4 py-4 text-slate-700">
                    <div class="manage-par-number">${escapeHtml(asset.property_type)}</div>
                </td>
                <td class="px-4 py-4 text-slate-700 text-center"><span class="classification-chip classification-chip--${escapeHtml(String(asset.classification || '').trim().toLowerCase())}">${escapeHtml(asset.classification || 'N/A')}</span></td>
                <td class="px-4 py-4 text-slate-700 text-center">${escapeHtml(asset.funding_source)}</td>
                <td class="px-4 py-4 text-center">${renderRowViewAction('details-asset', asset.id)}</td>
            </tr>
        `).join('')
    );

    renderPaginationControls('assets');

    return assets;
}

function formatInventoryTimestamp(value) {
    const date = new Date(String(value || '').replace(' ', 'T'));

    if (Number.isNaN(date.getTime())) {
        return String(value || '');
    }

    return date.toLocaleString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function formatInventoryDate(value) {
    const date = parseDateValue(value);

    if (!date) {
        return String(value || '');
    }

    return date.toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function formatInventoryMoney(value) {
    const numeric = Number(value || 0);
    return Number.isFinite(numeric) ? currencyFormatter.format(numeric) : currencyFormatter.format(0);
}

function setInventoryRequestType(requestType) {
    const normalized = String(requestType || '').trim().toUpperCase();
    $('#inventoryForm [name="request_type"]').val(normalized);
    $('.inventory-request-card').removeClass('is-selected');

    if (normalized) {
        $(`.inventory-request-card[data-request-type="${normalized}"]`).addClass('is-selected');
    }
}

function setInventoryFormStage(stage) {
    const normalized = String(stage || 'step1').toLowerCase();
    $('#inventoryForm').data('stage', normalized);
    $('#inventoryStep1Section').toggleClass('hidden', normalized !== 'step1');
    $('#inventoryStep2Section').toggleClass('hidden', normalized !== 'step2');
}

function validateInventoryStepOne() {
    const requestType = String($('#inventoryForm [name="request_type"]').val() || '').trim().toUpperCase();

    if (!requestType) {
        applyErrors('#inventoryForm', { request_type: 'Choose a request form first.' });
        return false;
    }

    return true;
}

function loadInventoryOfficers(division, selectedOfficerId = '') {
    const normalizedDivision = String(division || '').trim().toUpperCase();
    const $select = $('#inventoryForm [name="officer_id"]');

    if (!$select.length) {
        return $.Deferred().resolve([]).promise();
    }

    if (!normalizedDivision) {
        $select.prop('disabled', true).html('<option value="">Select division first</option>');
        refreshSearchableSelect($select);
        return $.Deferred().resolve([]).promise();
    }

    $select.prop('disabled', true).html('<option value="">Loading officers...</option>');
    refreshSearchableSelect($select);

    return apiRequest('api/officers/filter.php', 'GET', { division: normalizedDivision })
        .done((response) => {
            const officers = response.data?.officers || [];
            $select.prop('disabled', !officers.length).html(buildOfficerOptions(officers));

            if (selectedOfficerId) {
                $select.val(String(selectedOfficerId));
            }

            refreshSearchableSelect($select);
        })
        .fail((xhr) => {
            $select.prop('disabled', true).html('<option value="">Unable to load officers</option>');
            refreshSearchableSelect($select);
            handleRequestError(xhr, 'Unable to load officers for the selected division.');
        });
}

function refreshInventoryPreview() {
    const $form = $('#inventoryForm');

    if (!$form.length) {
        return;
    }

    const payload = formData($form);
    const fallbackTotal = Number(payload.quantity_issued || 0) * Number(payload.unit_cost || 0);
    $form.find('[name="total_amount"]').val(fallbackTotal ? fallbackTotal.toFixed(2) : '0.00');

    apiRequest('api/inventory/preview.php', 'POST', payload)
        .done((response) => {
            const preview = response.data?.preview || {};
            $form.find('[name="ris_number"]').val(preview.ris_number || '');
            $form.find('[name="stock_number"]').val(preview.stock_number || '');
            $form.find('[name="total_amount"]').val(Number(preview.total_amount || 0).toFixed(2));
        })
        .fail(() => {
            // Keep the local total amount preview even if the identifier preview request fails.
        });
}

function renderInventoryTable(rows = appState.inventoryItems) {
    if (!$('#inventoryTableMeta').length || !$('#inventoryTableBody').length) {
        return [];
    }

    const items = Array.isArray(rows) ? rows : [];
    const highlightedIds = new Set((appState.highlightedInventoryIds || []).map((id) => Number(id || 0)).filter(Boolean));
    const selectedId = Number(appState.selectedInventoryItemId || 0);

    if (selectedId > 0 && !items.some((item) => Number(item.inventory_item_id || 0) === selectedId)) {
        appState.selectedInventoryItemId = 0;
    }

    $('#inventoryTableMeta').text(formatRecordCountLabel(items.length));
    paginationState.inventory.totalRows = items.length;
    normalizePaginationPage('inventory');

    if (!items.length) {
        $('#inventoryTableBody').html('<tr><td colspan="7" class="px-4 py-10 text-center text-slate-500">No inventory records found for the selected filters.</td></tr>');
        renderPaginationControls('inventory');
        return items;
    }

    const paginatedItems = getPaginatedRows(items, 'inventory');
    const startIndex = (paginationState.inventory.currentPage - 1) * paginationState.inventory.rowsPerPage + 1;

    $('#inventoryTableBody').html(`
        ${paginatedItems.map((item, index) => `
            <tr class="${[
                highlightedIds.has(Number(item.inventory_item_id || 0)) ? 'inventory-table__row--highlight' : '',
                Number(item.inventory_item_id || 0) === Number(appState.selectedInventoryItemId || 0) ? 'inventory-table__row--selected' : '',
                'cursor-pointer',
            ].filter(Boolean).join(' ')}" data-id="${escapeHtml(item.inventory_item_id || '')}" title="Click to select this inventory row. Double click to view details.">
                <td class="px-4 py-4 text-center text-slate-600 text-sm" style="width: 3rem;">${startIndex + index}</td>
                <td class="px-4 py-4 text-slate-700"><div class="manage-par-number">${escapeHtml(item.ris_number || 'Pending')}</div></td>
                <td class="px-4 py-4 text-slate-700" title="${escapeHtml(item.item_name || '')}"><div class="manage-asset-name inventory-table__truncate">${escapeHtml(item.item_name || '')}</div></td>
                <td class="px-4 py-4 text-slate-700"><div class="manage-par-number inventory-table__truncate">${escapeHtml(item.stock_number || 'Pending')}</div></td>
                <td class="px-4 py-4 text-slate-700 text-center">${escapeHtml(`${item.current_stock || 0}/${item.quantity_issued || 0}`)}</td>
                <td class="px-4 py-4 text-slate-700 text-center"><span class="inventory-status-chip inventory-status-chip--${escapeHtml(String(item.stock_status_alias || '').toLowerCase())}">${escapeHtml(item.stock_status_label || 'MEDIUM')}</span></td>
                <td class="px-4 py-4 text-center text-slate-700 inventory-table__actions-cell">
                    <div class="inventory-table__actions inventory-table__actions--icons">
                        <button type="button" class="manage-action-icon manage-action-icon--success add-inventory-stock" data-id="${escapeHtml(item.inventory_item_id || '')}" title="Stock In" aria-label="Stock In"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14"/></svg></button>
                        <button type="button" class="manage-action-icon manage-action-icon--warning deduct-inventory-stock" data-id="${escapeHtml(item.inventory_item_id || '')}" title="Stock Out" aria-label="Stock Out"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12h14"/></svg></button>
                        <button type="button" class="manage-action-icon manage-action-icon--info view-inventory-history" data-id="${escapeHtml(item.inventory_item_id || '')}" title="View Details" aria-label="View Details"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2.5 12s3.6-6 9.5-6 9.5 6 9.5 6-3.6 6-9.5 6-9.5-6-9.5-6Z"></path><circle cx="12" cy="12" r="2.6"></circle></svg></button>
                    </div>
                </td>
            </tr>
        `).join('')}`);

    syncInventoryRowSelection();
    renderPaginationControls('inventory');

    return items;
}

function resetInventoryForm() {
    const $form = $('#inventoryForm');

    if (!$form.length) {
        return;
    }

    $form[0].reset();
    const today = new Date();
    const todayValue = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;
    $form.find('[name="inventory_item_id"]').val('');
    $form.find('[name="ris_number"]').val('');
    $form.find('[name="stock_number"]').val('');
    $form.find('[name="total_amount"]').val('0.00');
    $form.find('[name="issued_at"]').val(todayValue);
    loadInventoryOfficers('');
    setInventoryRequestType('');
    clearErrors('#inventoryForm');
    $('#inventoryModalTitle').text('Add Inventory Issuance');
    initializeSearchableSelects('#inventoryModal');
}

function setInventoryModalVisible(visible) {
    $('#inventoryModal').toggleClass('hidden', !visible).toggleClass('flex', visible);
}

function setInventoryStockMenuVisible(visible) {
    $('#stockSubmenu').toggleClass('hidden', !visible);
    $('#stockButton').attr('aria-expanded', visible ? 'true' : 'false');
}

function openInventoryModal(item = null) {
    resetInventoryForm();

    if (item) {
        $('#inventoryModalTitle').text('Update Inventory Issuance');
        $('#inventoryForm [name="inventory_item_id"]').val(item.inventory_item_id || '');
        setInventoryRequestType(item.request_type || '');
        $('#inventoryForm [name="ris_number"]').val(item.ris_number || '');
        $('#inventoryForm [name="stock_number"]').val(item.stock_number || '');
        $('#inventoryForm [name="total_amount"]').val(Number(item.total_amount || 0).toFixed(2));
        $('#inventoryForm [name="division"]').val(item.division || '');
        $('#inventoryForm [name="issued_at"]').val(item.issued_at || '');
        $('#inventoryForm [name="item_name"]').val(item.item_name || '');
        $('#inventoryForm [name="unit"]').val(item.unit || '');
        $('#inventoryForm [name="quantity_issued"]').val(item.quantity_issued || 0);
        $('#inventoryForm [name="unit_cost"]').val(Number(item.unit_cost || 0).toFixed(2));
        $('#inventoryForm [name="stock_limit"]').val(item.stock_limit || 0);
        $('#inventoryForm [name="description"]').val(item.description || '');
        loadInventoryOfficers(item.division || '', item.officer_id || '');
    } else {
        refreshInventoryPreview();
    }

    initializeSearchableSelects('#inventoryModal');
    setInventoryModalVisible(true);
    refreshInventoryPreview();
}

function closeInventoryModal() {
    setInventoryModalVisible(false);
    resetInventoryForm();
}

function setInventoryMovementModalVisible(visible) {
    $('#inventoryMovementModal').toggleClass('hidden', !visible).toggleClass('flex', visible);
}

function openInventoryMovementModal(item, movementType) {
    if (!item) {
        return;
    }

    const normalizedType = String(movementType || 'ADD').trim().toUpperCase() === 'DEDUCT' ? 'DEDUCT' : 'ADD';
    const title = normalizedType === 'DEDUCT' ? 'Deduct Stock' : 'Add Stock';

    $('#inventoryMovementTitle').text(title);
    $('#inventoryMovementCopy').text(
        normalizedType === 'DEDUCT'
            ? 'Record the issued or used quantity and preserve the stock history.'
            : 'Record the replenished quantity and preserve the stock history.'
    );
    $('#inventoryMovementForm')[0].reset();
    $('#inventoryMovementForm [name="inventory_item_id"]').val(item.inventory_item_id || '');
    $('#inventoryMovementForm [name="movement_type"]').val(normalizedType);
    $('#inventoryMovementForm [name="quantity"]').val(1);
    $('#inventoryMovementSummary').html(`
        <div class="inventory-summary-card__item">
            <span class="inventory-summary-card__label">Item</span>
            <strong class="inventory-summary-card__value">${escapeHtml(item.item_name)}</strong>
        </div>
        <div class="inventory-summary-card__item">
            <span class="inventory-summary-card__label">RIS No.</span>
            <strong class="inventory-summary-card__value">${escapeHtml(item.ris_number || '')}</strong>
        </div>
        <div class="inventory-summary-card__item">
            <span class="inventory-summary-card__label">Current Stock</span>
            <strong class="inventory-summary-card__value">${escapeHtml(String(item.current_stock || 0))}</strong>
        </div>
        <div class="inventory-summary-card__item">
            <span class="inventory-summary-card__label">Stock Limit</span>
            <strong class="inventory-summary-card__value">${escapeHtml(String(item.stock_limit || 0))}</strong>
        </div>
    `);
    clearErrors('#inventoryMovementForm');
    setInventoryMovementModalVisible(true);
}

function closeInventoryMovementModal() {
    setInventoryMovementModalVisible(false);
    clearErrors('#inventoryMovementForm');
}

function renderInventoryDetails(details = {}) {
    const item = details.item || {};
    const movements = Array.isArray(details.movements) ? details.movements : [];

    $('#inventoryDetailsName').text(item.item_name || 'Inventory Item');
    $('#inventoryDetailsMeta').text(`${item.ris_number || ''} | ${item.stock_number || ''} | ${item.request_type || ''}`.replace(/^\s+\|\s+|\s+\|\s+$/g, '').trim());
    $('#inventoryDetailsContent').html(`
        <section class="detail-section">
            <div class="detail-section__head">
                <p class="panel-eyebrow">Issuance Summary</p>
                <h4 class="panel-title">Issued inventory details</h4>
            </div>
            <div class="detail-grid mt-4">
                <div class="detail-item"><div class="detail-label">RIS No.</div><div class="detail-value">${escapeHtml(item.ris_number || '')}</div></div>
                <div class="detail-item"><div class="detail-label">Stock Number</div><div class="detail-value">${escapeHtml(item.stock_number || '')}</div></div>
                <div class="detail-item"><div class="detail-label">Request Form</div><div class="detail-value">${escapeHtml(item.request_type || '')}</div></div>
                <div class="detail-item"><div class="detail-label">Responsibility Center</div><div class="detail-value">${escapeHtml(item.division || '')}</div></div>
                <div class="detail-item"><div class="detail-label">Officer</div><div class="detail-value">${escapeHtml(item.officer_name || '')}</div></div>
                <div class="detail-item"><div class="detail-label">Date</div><div class="detail-value">${escapeHtml(formatInventoryDate(item.issued_at || ''))}</div></div>
                <div class="detail-item"><div class="detail-label">Unit</div><div class="detail-value">${escapeHtml(item.unit || '')}</div></div>
                <div class="detail-item"><div class="detail-label">Quantity Issued</div><div class="detail-value">${escapeHtml(String(item.quantity_issued || 0))}</div></div>
                <div class="detail-item"><div class="detail-label">Unit Cost</div><div class="detail-value">${escapeHtml(formatInventoryMoney(item.unit_cost || 0))}</div></div>
                <div class="detail-item"><div class="detail-label">Total Amount</div><div class="detail-value">${escapeHtml(formatInventoryMoney(item.total_amount || 0))}</div></div>
                <div class="detail-item"><div class="detail-label">Current Stock</div><div class="detail-value">${escapeHtml(String(item.current_stock || 0))}</div></div>
                <div class="detail-item"><div class="detail-label">Stock Limit</div><div class="detail-value">${escapeHtml(String(item.stock_limit || 0))}</div></div>
                <div class="detail-item"><div class="detail-label">Status</div><div class="detail-value">${escapeHtml(item.stock_status_label || 'In Stock')}</div></div>
                <div class="detail-item"><div class="detail-label">Remarks</div><div class="detail-value">${escapeHtml(item.stock_remark || 'Stock level is healthy.')}</div></div>
            </div>
        </section>
        <section class="detail-section">
            <div class="detail-section__head">
                <p class="panel-eyebrow">Movement Records</p>
                <h4 class="panel-title">Stock additions and deductions</h4>
            </div>
            <div class="mt-4 overflow-hidden rounded-[1rem] border border-slate-200 bg-white">
                <div class="view-table-scroll">
                    <table class="min-w-full divide-y divide-slate-200 text-sm">
                        <thead class="bg-slate-50 text-left text-slate-500">
                            <tr>
                                <th class="px-4 py-3 font-medium">Action</th>
                                <th class="px-4 py-3 font-medium">Quantity</th>
                                <th class="px-4 py-3 font-medium">Before</th>
                                <th class="px-4 py-3 font-medium">After</th>
                                <th class="px-4 py-3 font-medium">Notes</th>
                                <th class="px-4 py-3 font-medium">Date</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 bg-white">
                            ${movements.length ? movements.map((movement) => `
                                <tr>
                                    <td class="px-4 py-3">${escapeHtml(movement.movement_type)}</td>
                                    <td class="px-4 py-3">${escapeHtml(String(movement.quantity || 0))}</td>
                                    <td class="px-4 py-3">${escapeHtml(String(movement.previous_stock || 0))}</td>
                                    <td class="px-4 py-3">${escapeHtml(String(movement.current_stock || 0))}</td>
                                    <td class="px-4 py-3">${escapeHtml(movement.notes || 'No notes')}</td>
                                    <td class="px-4 py-3">${escapeHtml(formatInventoryTimestamp(movement.created_at))}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="6" class="px-4 py-10 text-center text-slate-500">No stock records yet.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    `);
}

function openInventoryDetailsModal(itemId) {
    apiRequest('api/inventory/details.php', 'GET', { inventory_item_id: itemId })
        .done((response) => {
            renderInventoryDetails(response.data || {});
            $('#inventoryDetailsModal').data('inventory-item-id', Number(response.data?.item?.inventory_item_id || itemId || 0));
            $('#inventoryDetailsModal').removeClass('hidden').addClass('flex');
        })
        .fail((xhr) => {
            handleRequestError(xhr, 'Unable to load the inventory details.');
        });
}

function closeInventoryDetailsModal() {
    $('#inventoryDetailsModal').removeData('inventory-item-id');
    $('#inventoryDetailsModal').removeClass('flex').addClass('hidden');
    $('#inventoryDetailsContent').empty();
}

function deleteInventoryItemRecord(itemId, onDone = null) {
    const normalizedId = Number(itemId || 0);
    const item = currentInventoryItem(normalizedId);

    if (!item || !window.confirm(`Delete ${item.item_name} (${item.ris_number || item.item_code || 'No RIS No.'})?`)) {
        return;
    }

    apiRequest('api/inventory/delete.php', 'POST', { inventory_item_id: normalizedId })
        .done((response) => {
            notifyTransaction(response.message || 'Inventory entry deleted successfully.', 'success', {
                category: 'Inventory',
                details: 'The selected inventory issuance was removed and the inventory table was refreshed.',
            });
            $.when(refreshInventoryView(true), refreshDashboard(true)).always(() => {
                renderInventoryAlerts(appState.dashboardData?.inventory || {});

                if (typeof onDone === 'function') {
                    onDone();
                }
            });
        })
        .fail((xhr) => {
            handleRequestError(xhr, 'Unable to delete the inventory entry.');
        });
}

function refreshInventoryView(silent = true, resetPage = false) {
    const filters = $('#inventoryFilterForm').length ? formData($('#inventoryFilterForm')) : {};
    const hasFilters = Object.values(filters).some((value) => String(value || '').trim() !== '');

    if (resetPage) {
        paginationState.inventory.currentPage = 1;
    }

    return apiRequest('api/inventory/list.php', 'GET', filters)
        .done((response) => {
            appState.inventoryItems = response.data?.items || [];
            renderInventoryTable(appState.inventoryItems);

            if (!silent) {
                showNotice(hasFilters ? 'Inventory filters applied.' : 'Showing all inventory issuance records.');
            }
        })
        .fail((xhr) => {
            handleRequestError(xhr, 'Unable to load the inventory records.');
        });
}

function renderManageAssetsTable() {
    $('#assetTableMeta').text(formatRecordCountLabel(appState.manageAssets.length));
    renderManageTypeChart();

    // Update pagination state
    paginationState.manage.totalRows = appState.manageAssets.length;
    normalizePaginationPage('manage');

    if (!appState.manageAssets.length) {
        $('#assetTableBody').html('<tr><td colspan="8" class="px-4 py-10 text-center text-slate-500">No assets found for the selected filters.</td></tr>');
        renderPaginationControls('manage');
        return;
    }

    // Get paginated rows
    const paginatedAssets = getPaginatedRows(appState.manageAssets, 'manage');
    const startIndex = (paginationState.manage.currentPage - 1) * paginationState.manage.rowsPerPage + 1;

    $('#assetTableBody').html(
        paginatedAssets.map((asset, index) => `
            <tr class="manage-table__row ${appState.highlightedManageAssetIds.includes(Number(asset.id || 0)) ? 'manage-table__row--highlight' : ''}" data-id="${escapeHtml(asset.id || '')}" data-par-number="${escapeHtml(asset.par_number || '')}">
                <td class="manage-table__cell" style="width: 3rem; text-align: center;">
                    <span class="text-slate-600 text-sm">${startIndex + index}</span>
                </td>
                <td class="manage-table__cell manage-table__cell--name">
                    <div class="manage-asset-name">${escapeHtml(asset.property_name)}</div>
                    <div class="manage-asset-meta">${escapeHtml(displayAssetReferenceLabel(asset))}: ${escapeHtml(displayPropertyNumber(asset))}</div>
                    <div class="manage-asset-meta">Serial No.: ${escapeHtml(asset.property_id || 'Not provided')} | ${escapeHtml(asset.classification)}</div>
                </td>
                <td class="manage-table__cell">
                    <div class="manage-par-number">${escapeHtml(asset.property_type)}</div>
                    <div class="manage-par-meta">${escapeHtml(asset.funding_source)}</div>
                </td>
                <td class="manage-table__cell">${renderDivisionBadge(asset.division)}</td>
                <td class="manage-table__cell">
                    <div class="manage-officer-name">${escapeHtml(asset.officer_name)}</div>
                    <div class="manage-officer-meta">${escapeHtml([asset.officer_position, asset.officer_unit].filter(Boolean).join(' | ') || 'Registered Officer')}</div>
                </td>
                <td class="manage-table__cell manage-par-cell cursor-pointer ${appState.activeParSelectionNumber && String(asset.par_number || '').trim() === appState.activeParSelectionNumber ? 'par-cell--active' : ''}" title="Double click to edit this PAR batch">
                    <div class="manage-par-number">${escapeHtml(asset.par_number)}</div>
                    <div class="manage-par-meta">${escapeHtml(formatCompactDate(asset.par_date))} | ${currencyFormatter.format(Number(asset.unit_cost || 0))}</div>
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

    renderPaginationControls('manage');
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
        ['Position', asset.officer_position || 'Not provided'],
        ['Unit', asset.officer_unit || 'Not provided'],
        ['Division', asset.division],
        [`${String(asset.document_type || 'PAR').toUpperCase()} Number`, asset.par_number],
        ['Document Date', formatCompactDate(asset.par_date)],
    ];

    const propertyDetails = [
        ['Property Name', asset.property_name],
        ['Property Type', asset.property_type],
        [displayAssetReferenceLabel(asset), displayPropertyNumber(asset)],
        ['Serial Number', asset.property_id],
        ['Quantity', asset.quantity],
        ['Unit Cost', currencyFormatter.format(Number(asset.unit_cost || 0))],
        ['Funding Source', asset.funding_source],
        ['Classification', asset.classification],
        ['Estimated Useful Life', asset.estimated_useful_life || 'Not provided'],
        ['Date Acquired', formatCompactDate(asset.date_acquired)],
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

            appState.highlightedManageAssetIds = createdAssets.map((asset) => Number(asset.id || 0)).filter(Boolean);
            appState.highlightedPropertyIds = propertyIds.map((propertyId) => String(propertyId).trim()).filter(Boolean);
            appState.highlightedParNumber = String(response.data?.par?.par_number || firstAsset.par_number || '').trim();

            $('#assetsFilterForm')[0]?.reset();
            populateAssetsFilterOfficers('', []);
            appState.assetNameFilter = '';
            appState.assetTypeFilter = '';
            updateAssetFilterStatus();

            notifyTransaction(response.message || `Saved ${count} asset record${count === 1 ? '' : 's'} successfully.`, 'success', {
                category: 'Assets',
                details: `Saved ${count} asset record${count === 1 ? '' : 's'} and refreshed the related asset tables.`,
            });
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

function refreshRegistrationView(silent = true, resetPage = false) {
    const filters = formData($('#registrationFilterForm'));
    const hasFilters = Object.values(filters).some((value) => String(value || '').trim() !== '');

    if (resetPage) {
        paginationState.registration.currentPage = 1;
    }

    return apiRequest('api/officers/list.php', 'GET', filters)
        .done((response) => {
            appState.registrationOfficers = response.data?.officers || [];
            if (hasFilters) {
                rememberOfficerDirectory(appState.registrationOfficers);
            } else {
                appState.officerDirectoryLoaded = true;
                rememberOfficerDirectory(appState.registrationOfficers, true);
            }
            renderRegistrationTable();

            if (!silent) {
                showNotice(hasFilters ? 'Officer filters applied.' : 'Showing all registered accountable officers.');
            }
        })
        .fail((xhr) => {
            handleRequestError(xhr, 'Unable to load accountable officers.');
        });
}

function refreshDashboard(silent = true) {
    const requestToken = ++dashboardRequestToken;
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
            if (requestToken !== dashboardRequestToken) {
                return;
            }

            appState.dashboardData = response.data || {};
            updateMetrics(response.data?.metrics || {});
            renderInventoryAlerts(response.data?.inventory || {});
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

function refreshAssetsDirectory(silent = true, resetPage = false) {
    const filters = $('#assetsFilterForm').length ? formData($('#assetsFilterForm')) : {};
    const selectedSearch = String(filters.search || appState.assetNameFilter || '').trim();
    const hasDirectoryTable = $('#assetsDirectoryMeta').length && $('#assetsDirectoryBody').length;

    appState.assetNameFilter = selectedSearch;
    appState.assetTypeFilter = '';
    appState.manageAssets = [];
    updateAssetFilterStatus();

    if (resetPage) {
        paginationState.assets.currentPage = 1;
        paginationState.manage.currentPage = 1;
    }

    return apiRequest('api/assets/filter.php', 'GET', filters)
        .done((response) => {
            appState.assetDirectory = response.data?.assets || [];
            appState.manageAssets = appState.assetDirectory;
            if (hasDirectoryTable) {
                renderAssetsDirectoryTable(appState.assetDirectory);
            }

            if (!silent) {
                const hasFilters = Object.values(filters).some((value) => String(value || '').trim() !== '');
                showNotice(hasFilters ? 'Asset filters applied.' : 'Showing all asset records.');
            }
        })
        .fail((xhr) => {
            handleRequestError(xhr, 'Unable to load the asset directory.');
        });
}

function refreshManagementView(silent = true, resetPage = false) {
    return refreshAssetsDirectory(silent, resetPage);
}

function generateReport(silent = true) {
    const documentLabel = String(appState.reportType || '').trim().toUpperCase();

    if (!['PAR', 'ICS'].includes(documentLabel)) {
        setReportPlaceholder('Select PAR or ICS to generate the printable document report.');

        if (!silent) {
            showNotice('Select PAR or ICS first before generating a report.', 'error');
        }

        return null;
    }

    const reportOfficer = syncReportOfficer();

    if (reportOfficer.division === '' || reportOfficer.officerId <= 0) {
        setReportPlaceholder(`Choose a division and accountable officer to preview related ${documentLabel} records.`);

        if (!silent) {
            showNotice(`Choose a division and accountable officer before generating the ${documentLabel} report.`, 'error');
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
                showNotice(`${documentLabel} report generated successfully.`);
            }
        })
        .fail((xhr) => {
            appState.reportReady = false;
            handleRequestError(xhr, 'Unable to generate the report.');
        });
}

function generateInventoryReport(silent = true) {
    return apiRequest('api/reports/generate.php', 'POST', formData($('#inventoryReportForm')))
        .done((response) => {
            $('#reportContainer')
                .html(response.data?.html || '')
                .attr('data-placeholder', 'false');
            $('#reportMeta').text(response.data?.meta_label || `${response.data?.record_count || 0} rows`);
            appState.reportReady = true;
            $('#printInventoryReport').prop('disabled', false);
            $('#exportInventoryReport').prop('disabled', false);

            if (!silent) {
                showNotice('Inventory report generated successfully.');
            }
        })
        .fail((xhr) => {
            appState.reportReady = false;
            handleRequestError(xhr, 'Unable to generate the inventory report.');
        });
}

function generateSpiReport() {
    const spiForm = $('#spiReportForm');

    // Format dates from YYYY-MM-DD to MM/DD/YY
    const formatDateToMMDDYY = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr + 'T00:00:00');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        return `${month}/${day}/${year}`;
    };

    const formPayload = {
        report_type: $('#spiReportTypeField').val() || 'RPCPPE',
        classification: $('#spiClassification').val() || '',
        funding_source: $('#spiFundingSource').val() || '',
        asset_type: $('#spiAssetType').val() || '',
        date_from: formatDateToMMDDYY($('#spiDateFrom').val()) || '',
        date_to: formatDateToMMDDYY($('#spiDateTo').val()) || '',
    };

    return apiRequest('api/reports/generate.php', 'POST', formPayload)
        .done((response) => {
            $('#reportContainer')
                .html(response.data?.html || '')
                .attr('data-placeholder', 'false');
            $('#reportMeta').text(response.data?.meta_label || `${response.data?.record_count || 0} lines`);
            appState.reportReady = true;
            $('#spiPrintReport').prop('disabled', false);

            showNotice('SPI report generated successfully.');
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
    openParAssetSelection(asset);
}

function deleteAssetRecord(assetId, asset, onDone = null) {
    const normalizedId = Number(assetId || 0);
    const selectedAsset = asset || currentAsset(normalizedId);

    if (!selectedAsset || !window.confirm(`Delete ${selectedAsset.property_name} (${selectedAsset.property_id || 'No Property ID'})?`)) {
        return;
    }

    apiRequest('api/assets/delete.php', 'POST', { id: normalizedId })
        .done((response) => {
            notifyTransaction(response.message || 'Asset deleted successfully.', 'success', {
                category: 'Assets',
                details: 'The selected asset was removed and the related asset tables were refreshed.',
            });
            $.when(refreshDashboard(true), refreshAssetsDirectory(true), refreshManagementView(true)).always(() => {
                refreshActiveReport(true);

                if (typeof onDone === 'function') {
                    onDone();
                }
            });
        })
        .fail((xhr) => {
            handleRequestError(xhr, 'Unable to delete the asset.');
        });
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
    $('#detailsAssetMeta').text(`${displayPropertyNumber(asset)} | ${asset.property_id || 'No Serial No.'} | ${asset.par_number} | ${asset.officer_name}`);
    renderDetailsBody(asset);
    $('#detailsModal').data('asset-id', Number(asset.id || 0));
    $('#detailsModal').removeClass('hidden').addClass('flex');
    $('body').addClass('overflow-hidden');
}

function closeDetailsModal() {
    $('#detailsModal').removeData('asset-id');
    $('#detailsModal').addClass('hidden').removeClass('flex');
    $('body').removeClass('overflow-hidden');
}

function renderParAssetSelection(rows = [], sourceAsset = null) {
    const assets = Array.isArray(rows) ? rows : [];
    const sourceParNumber = String(sourceAsset?.par_number || assets[0]?.par_number || '').trim();
    const officerName = String(sourceAsset?.officer_name || assets[0]?.officer_name || '').trim();
    $('#assetParSelectionTitle').text(
        sourceParNumber
            ? `Assets under ${sourceParNumber}${officerName ? ` | ${officerName.toUpperCase()}` : ''}`
            : 'Assets Under Selected PAR'
    );

    if (!assets.length) {
        $('#assetParSelectionBody').html('<tr><td colspan="5" class="px-4 py-10 text-center text-slate-500">No saved assets were found under this PAR.</td></tr>');
        return;
    }

    $('#assetParSelectionBody').html(
        assets.map((asset) => `
            <tr class="cursor-pointer transition hover:bg-blue-50/70" data-id="${escapeHtml(asset.id || '')}">
                <td class="px-4 py-4 text-slate-700" title="${escapeHtml(displayPropertyNumber(asset))}">${escapeHtml(displayPropertyNumber(asset))}</td>
                <td class="px-4 py-4 text-slate-700" title="${escapeHtml(asset.property_name || '')}">
                    <div class="manage-asset-name">${escapeHtml(asset.property_name)}</div>
                </td>
                <td class="px-4 py-4 text-slate-700" title="${escapeHtml(asset.property_type || '')}">${escapeHtml(asset.property_type || '')}</td>
                <td class="px-4 py-4 text-slate-700" title="${escapeHtml(asset.property_id || '')}">${escapeHtml(asset.property_id || '')}</td>
                <td class="px-4 py-4 text-right">
                    <div class="manage-actions manage-actions--selection">
                        <button type="button" class="manage-action-icon manage-action-icon--info select-par-asset" data-id="${asset.id}" title="Update asset batch" aria-label="Update asset batch">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l10-10a1.8 1.8 0 0 0-4-4L4 16v4z"></path><path d="m13.5 6.5 4 4"></path></svg>
                        </button>
                        <button type="button" class="manage-action-icon manage-action-icon--danger delete-par-asset" data-id="${asset.id}" title="Delete asset" aria-label="Delete asset">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7h14"></path><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7"></path><path d="M8 7l1 12h6l1-12"></path><path d="M10.5 11v5"></path><path d="M13.5 11v5"></path></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('')
    );
}

function setParAssetSelectionVisible(visible) {
    $('#assetParSelectionModal').toggleClass('hidden', !visible).toggleClass('flex', visible);
    $('body').toggleClass('overflow-hidden', visible || $('#assetEntryPanel').hasClass('flex') || $('#detailsModal').hasClass('flex') || $('#editModal').hasClass('flex'));
}

function openParAssetSelection(asset) {
    if (!asset) {
        showNotice('Unable to load the selected PAR.', 'error');
        return;
    }

    setActiveParSelection(asset.par_number || '');

    apiRequest('api/assets/filter.php', 'GET', { par_id: asset.par_id })
        .done((response) => {
            const assets = response.data?.assets || [];
            appState.parSelectionAssets = assets;
            renderParAssetSelection(assets, asset);
            setParAssetSelectionVisible(true);
        })
        .fail((xhr) => {
            setActiveParSelection('');
            handleRequestError(xhr, 'Unable to load the assets under the selected PAR.');
        });
}

function closeParAssetSelection() {
    $('#assetParSelectionBody').html('<tr><td colspan="5" class="px-4 py-10 text-center text-slate-500">Select a PAR number from the asset table first.</td></tr>');
    appState.parSelectionAssets = [];
    setActiveParSelection('');
    setParAssetSelectionVisible(false);
}

function openAssetBatchEditWizard(asset, batchAssets = []) {
    if (!asset) {
        showNotice('Unable to load the selected asset.', 'error');
        return;
    }

    resetAssetWorkflow(true);
    initializeSearchableSelects('#assetEntryPanel');
    fillAssetWizardForBatchEdit(asset, batchAssets);
    setParAssetSelectionVisible(false);
    setAssetEntryVisible(true);
    showAssetWizardStep('step1');
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

function getPaginatedRows(allRows, section) {
    const state = paginationState[section];
    if (!state) return allRows;

    const start = (state.currentPage - 1) * state.rowsPerPage;
    const end = start + state.rowsPerPage;
    return allRows.slice(start, end);
}

function getTotalPages(section) {
    const state = paginationState[section];
    if (!state) return 1;
    return Math.ceil(state.totalRows / state.rowsPerPage);
}

function normalizePaginationPage(section) {
    const state = paginationState[section];
    if (!state) return;

    const totalPages = Math.max(1, getTotalPages(section));
    if (state.currentPage > totalPages) {
        state.currentPage = totalPages;
    }
    if (state.currentPage < 1) {
        state.currentPage = 1;
    }
}

function renderPaginationControls(section) {
    const state = paginationState[section];
    if (!state) return;

    const totalPages = getTotalPages(section);
    const start = (state.currentPage - 1) * state.rowsPerPage + 1;
    const end = Math.min(state.currentPage * state.rowsPerPage, state.totalRows);

    // Update meta
    $(`#${section}PaginationMeta`).text(
        state.totalRows > 0
            ? `Showing ${start}-${end} of ${state.totalRows} records`
            : 'Showing 0 records'
    );

    // Update prev/next buttons
    $(`#${section}PrevPage`).prop('disabled', state.currentPage === 1);
    $(`#${section}NextPage`).prop('disabled', state.currentPage === totalPages);

    // Render page numbers
    const $pageNumbers = $(`#${section}PageNumbers`);
    $pageNumbers.empty();

    if (totalPages <= 1) {
        $pageNumbers.append('<button class="pagination-number is-active" data-page="1">1</button>');
        return;
    }

    const maxVisible = 5;
    let startPage = Math.max(1, state.currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
        $pageNumbers.append(`<button class="pagination-number" data-page="1">1</button>`);
        if (startPage > 2) {
            $pageNumbers.append(`<span class="pagination-ellipsis">...</span>`);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === state.currentPage;
        $pageNumbers.append(
            `<button class="pagination-number ${isActive ? 'is-active' : ''}" data-page="${i}">${i}</button>`
        );
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            $pageNumbers.append(`<span class="pagination-ellipsis">...</span>`);
        }
        $pageNumbers.append(`<button class="pagination-number" data-page="${totalPages}">${totalPages}</button>`);
    }
}

function changePage(section, newPage) {
    const state = paginationState[section];
    if (!state) return;

    const totalPages = getTotalPages(section);
    if (newPage < 1 || newPage > totalPages) return;

    state.currentPage = newPage;

    // Trigger re-render based on section
    if (section === 'registration') {
        renderRegistrationTable(appState.registrationOfficers);
    } else if (section === 'manage') {
        renderManageTable(appState.manageAssets);
    } else if (section === 'assets') {
        renderAssetsDirectoryTable(appState.assetDirectory);
    } else if (section === 'inventory') {
        renderInventoryTable(appState.inventoryItems);
    }
}

function setRowsPerPage(section, rowsPerPage) {
    const state = paginationState[section];
    if (!state) return;

    state.rowsPerPage = Number(rowsPerPage);
    state.currentPage = 1; // Reset to first page

    // Trigger re-render based on section
    if (section === 'registration') {
        renderRegistrationTable(appState.registrationOfficers);
    } else if (section === 'manage') {
        renderManageTable(appState.manageAssets);
    } else if (section === 'assets') {
        renderAssetsDirectoryTable(appState.assetDirectory);
    } else if (section === 'inventory') {
        renderInventoryTable(appState.inventoryItems);
    }
}

$(function () {
    const $doc = $(document);
    const $win = $(window);

    $('#moduleContainer').data('default-view', 'dashboard');
    appState.moduleCache = {};
    $('#moduleContainer .app-view').each(function () {
        const view = normalizeViewName($(this).data('view'));
        appState.moduleCache[view] = $(this).prop('outerHTML');
    });
    $('#assetForm').data('default-date', $('#assetForm [name="date_acquired"]').val());
    setAssetDateDisplay($('#assetForm [name="date_acquired"]').val());
    initializeSearchableSelects(document);
    applySidebarCollapsedState(isDesktopViewport() && loadSidebarCollapsedState());

    updateAssetSubmitButton();
    updateLiveClock();
    renderNotifications();
    setInterval(updateLiveClock, 1000);
    $('body').removeClass('is-tabbing');

    // Initialize edit form selects from asset form
    $('#editAssetForm [name="property_type"]').html($('#assetForm [name="property_type"]').html());
    $('#editAssetForm [name="division"]').html($('#assetForm [name="division"]').html());

    $doc.off('.app');
    $win.off('.app');

    $doc.on('click.app', '#openSidebar', function () {
        openSidebar();
    });

    $doc.on('click.app', '#closeSidebar, #mobileOverlay', function () {
        closeSidebar();
    });

    $doc.on('click.app', '#toggleSidebarCompact', function () {
        toggleSidebarCollapsedState();
    });

    $doc.on('click.app', '#toggleNotifications', function (event) {
        event.stopPropagation();
        setProfileMenuVisible(false);
        setNotificationPanelVisible(!appState.notificationPanelOpen);
    });

    $doc.on('click.app', '#toggleProfileMenu', function (event) {
        event.stopPropagation();
        setNotificationPanelVisible(false);
        setProfileMenuVisible(!appState.profileMenuOpen);
    });

    $doc.on('click.app', '#notificationPanel', function (event) {
        event.stopPropagation();
    });

    $doc.on('click.app', '#profileMenu', function (event) {
        event.stopPropagation();
    });

    $doc.on('click.app', '#markNotificationsRead', function () {
        markAllNotificationsRead();
    });

    $doc.on('click.app', '#clearNotifications', function () {
        appState.notifications = [];
        appState.selectedNotificationId = '';
        closeNotificationDetailsModal();
        syncUnreadNotificationCount();
        renderNotifications();
    });

    $doc.on('click.app', '.site-notification__item', function () {
        openNotificationDetailsModal($(this).data('id'));
    });

    $doc.on('click.app', '#closeNotificationDetailsModal, #closeNotificationDetailsButton', function () {
        closeNotificationDetailsModal();
    });

    $doc.on('click.app', '#notificationDetailsModal', function (event) {
        if (event.target === this) {
            closeNotificationDetailsModal();
        }
    });

    $doc.on('click.app', '.nav-anchor', function (event) {
        event.preventDefault();
        activateView($(this).attr('href'));
        closeSidebar();
    });

    $win.on('hashchange.app', function () {
        activateView(window.location.hash || '#dashboard', false);
    });

    $win.on('resize.app', function () {
        if (isDesktopViewport()) {
            applySidebarCollapsedState(loadSidebarCollapsedState());
        } else {
            applySidebarCollapsedState(false);
        }
    });

    $doc.on('keydown.app', function (event) {
        if (event.key === 'Tab') {
            $('body').addClass('is-tabbing');
        }
    });

    $doc.on('mousedown.app pointerdown.app touchstart.app', function () {
        $('body').removeClass('is-tabbing');
    });

    $doc.on('visibilitychange.app', function () {
        if (!document.hidden && appState.activeView === 'dashboard') {
            refreshDashboard(true);
        }
    });

    $win.on('focus.app', function () {
        if (appState.activeView === 'dashboard') {
            refreshDashboard(true);
        }
    });

    $doc.on('input.app change.app', '#registrationFilterForm [name="name"], #registrationFilterForm [name="division"]', function () {
        clearTimeout(registrationFilterTimer);
        registrationFilterTimer = setTimeout(() => {
            refreshRegistrationView(true, true);
        }, 180);
    });

    $doc.on('submit.app', '#registrationFilterForm', function (event) {
        event.preventDefault();
        clearTimeout(registrationFilterTimer);
        refreshRegistrationView(false, true);
    });

    $doc.on('click.app', '#clearOfficerFilters', function () {
        const $form = $('#registrationFilterForm');
        $form.trigger('reset');
        clearTimeout(registrationFilterTimer);
        refreshRegistrationView(false, true);
    });

    $doc.on('click.app', '#openOfficerRegistration', function () {
        resetOfficerRegistrationForm();
        setOfficerRegistrationVisible(true);
    });

    $doc.on('click.app', '#closeOfficerRegistration, #cancelOfficerRegistration', function () {
        resetOfficerRegistrationForm();
        setOfficerRegistrationVisible(false);
    });

    $doc.on('click.app', '.registration-division-card', function () {
        $('#officerRegistrationForm [name="division"]').val($(this).data('division'));
        updateRegistrationDivisionCards();
        updateOfficerUnitField();
        updateOfficerSaveState();
        clearErrors('#officerRegistrationForm');
    });

    $doc.on('input.app change.app', '#officerRegistrationForm [name="name"], #officerRegistrationForm [name="position"], #officerRegistrationForm [name="unit"]', function () {
        updateOfficerSaveState();
    });

    $doc.on('submit.app', '#officerRegistrationForm', function (event) {
        event.preventDefault();
        clearErrors('#officerRegistrationForm');

        const payload = formData($('#officerRegistrationForm'));
        const officerId = Number(payload.officer_id || 0);
        const endpoint = officerId > 0 ? 'api/officers/update.php' : 'api/officers/add.php';

        if (officerId > 0 && serializeOfficerFormState(payload) === String(appState.officerFormBaseline || '')) {
            showNotice('Update at least one field before saving this officer.', 'error');
            return;
        }

        apiRequest(endpoint, 'POST', payload)
            .done((response) => {
                appState.highlightedOfficerId = Number(response.data?.officer?.officer_id || 0);
                const officer = response.data?.officer || {};
                const previousOfficer = officerId > 0 ? currentOfficer(officerId) : null;
                appState.officerDirectoryLoaded = false;
                rememberOfficerDirectory([officer]);
                notifyTransaction(officerId > 0 ? 'Officer updated successfully.' : 'Officer registered successfully.', 'success', {
                    category: 'Registration',
                    detailPayload: officerNotificationPayload(officerId > 0 ? 'updated' : 'registered', officer, previousOfficer),
                });
                setOfficerRegistrationVisible(false);
                resetOfficerRegistrationForm();
                refreshRegistrationView(true, true);
                loadOfficerDirectory(true, true);
                syncDivisionDrivenOfficerLists(payload.division);
            })
            .fail((xhr) => {
                handleRequestError(xhr, officerId > 0 ? 'Unable to update the accountable officer.' : 'Unable to register the accountable officer.', '#officerRegistrationForm');
            });
    });

    $doc.on('click.app', '#registrationTableBody .officer-details', function () {
        openOfficerDetailsModal(currentOfficer($(this).data('id')));
    });

    $doc.on('dblclick.app', '#registrationTableBody tr', function (event) {
        if ($(event.target).closest('button').length) {
            return;
        }

        openOfficerDetailsModal(currentOfficer($(this).data('id')));
    });

    $doc.on('click.app', '#officerDetailsUpdateButton', function () {
        const officerId = Number($('#officerDetailsModal').data('officer-id') || 0);
        const officer = currentOfficer(officerId);

        if (!officer) {
            showNotice('Unable to load the selected officer.', 'error');
            return;
        }

        closeOfficerDetailsModal();
        resetOfficerRegistrationForm();
        populateOfficerForm(officer);
        setOfficerRegistrationVisible(true);
    });

    $doc.on('click.app', '#officerDetailsDeleteButton', function () {
        const officerId = Number($('#officerDetailsModal').data('officer-id') || 0);
        const officer = currentOfficer(officerId);

        if (!officer || !window.confirm(`Delete ${officer.name} from ${officer.division}?`)) {
            return;
        }

        apiRequest('api/officers/delete.php', 'POST', { officer_id: officer.officer_id })
            .done((response) => {
                if (Number(appState.highlightedOfficerId || 0) === Number(officer.officer_id || 0)) {
                    appState.highlightedOfficerId = 0;
                }

                removeOfficerFromDirectory(officer.officer_id);
                appState.officerDirectoryLoaded = false;
                notifyTransaction('Officer deleted successfully.', 'success', {
                    category: 'Registration',
                    detailPayload: officerNotificationPayload('deleted', officer),
                });
                closeOfficerDetailsModal();
                refreshRegistrationView(true, true);
                loadOfficerDirectory(true, true);
                syncDivisionDrivenOfficerLists(officer.division);
            })
            .fail((xhr) => {
                handleRequestError(xhr, 'Unable to delete the officer.');
            });
    });

    $doc.on('click.app', '[data-open-asset-entry="true"]', function () {
        $.when(activateView('assets')).done(() => {
            resetAssetWorkflow(true);
            appState.assetTypeFilter = '';
            $('#assetForm [name="property_type"]').val('');
            updateAssetFilterStatus();
            loadAssetOfficers(String($('#assetForm [name="division"]').val() || '').trim(), true);
            setAssetEntryVisible(true);
        });
    });

    $doc.on('click.app', '#closeAssetEntry', function () {
        resetAssetWorkflow(true);
        setAssetEntryVisible(false);
    });

    $doc.on('click.app', '#closeAssetParSelectionModal, #closeAssetParSelectionButton', function () {
        closeParAssetSelection();
    });

    $doc.on('click.app', '#assetParUpdateBack', function () {
        setAssetEntryVisible(false);
        setParAssetSelectionVisible(true);
        showAssetWizardStep('step1');
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

    $doc.on('input.app change.app', '#assetsFilterForm [name="search"], #assetsFilterForm [name="funding_source"], #assetsFilterForm [name="classification"], #assetsFilterForm [name="sort_direction"]', function () {
        clearTimeout(assetFilterTimer);
        assetFilterTimer = setTimeout(() => {
            refreshAssetsDirectory(true, true);
        }, 180);
    });

    $doc.on('submit.app', '#assetsFilterForm', function (event) {
        event.preventDefault();
        clearTimeout(assetFilterTimer);
        refreshAssetsDirectory(true, true);
    });

    $doc.on('click.app', '#resetAssetsFilters', function () {
        $('#assetsFilterForm')[0].reset();
        appState.assetNameFilter = '';
        appState.assetTypeFilter = '';
        $('#assetsFilterForm').find('select.searchable-select').each(function () {
            refreshSearchableSelect($(this));
        });
        refreshAssetsDirectory(false, true);
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

    $doc.on('input.app', '#assetForm [name="date_acquired_display"]', function () {
        $(this).val(normalizeCompactDateInput($(this).val()));
        syncAssetDateFields(false);
        clearErrors('#assetForm');
    });

    $doc.on('blur.app', '#assetForm [name="date_acquired_display"]', function () {
        syncAssetDateFields(true);
    });

    $doc.on('change.app', '#assetForm [name="division"]', function () {
        $('#assetForm [name="officer_id"]').val('');
        $('#assetForm [name="officer_name"]').val('');
        clearErrors('#assetForm');
        loadAssetOfficers($(this).val(), true);
    });

    $doc.on('change.app', '#assetOfficerSelect', function () {
        syncAssetOfficerName();
        clearErrors('#assetForm');
    });

    $doc.on('submit.app', '#assetForm', function (event) {
        event.preventDefault();
        syncAssetDateFields(true);
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

            if (isAssetWizardEditMode()) {
                const requestPayload = {
                    ...payload,
                    unit_cost: normalizeCurrency(payload.unit_cost),
                    id: appState.assetWizardContext?.assetId || payload.id,
                    par_id: appState.assetWizardContext?.parId || payload.par_id,
                    update_scope: 'par',
                    property_id: String(payload.property_id || '').trim(),
                };

                apiRequest('api/assets/update.php', 'POST', requestPayload)
                    .done((response) => {
                        const updatedAssets = Array.isArray(response.data?.assets) ? response.data.assets : [];
                        const updatedAsset = response.data?.asset || updatedAssets[0] || {};
                        appState.highlightedManageAssetIds = updatedAssets.map((asset) => Number(asset.id || 0)).filter(Boolean);
                        appState.highlightedPropertyIds = updatedAssets.map((asset) => String(asset.property_id || '').trim()).filter(Boolean);
                        appState.highlightedParNumber = String(response.data?.par?.par_number || updatedAsset.par_number || '').trim();

                        notifyTransaction(response.message || 'PAR assets updated successfully.', 'success', {
                            category: 'Assets',
                            details: `Updated ${response.data?.updated_count || updatedAssets.length || 0} asset record${(response.data?.updated_count || updatedAssets.length || 0) === 1 ? '' : 's'} under the selected PAR, including the selected serial number when changed.`,
                        });
                        resetAssetWorkflow(true);
                        setAssetEntryVisible(false);

                        $.when(refreshDashboard(true), refreshAssetsDirectory(true), refreshManagementView(true)).always(() => {
                            refreshActiveReport(true);
                        });
                    })
                    .fail((xhr) => {
                        handleRequestError(xhr, 'Unable to update the PAR assets.', '#assetForm');
                    });
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

    $doc.on('click.app', '#assetsDirectoryBody .details-asset', function () {
        openDetailsModal(currentAsset($(this).data('id')));
    });

    $doc.on('click.app', '#assetsDirectoryBody .edit-asset', function () {
        openEditModal(currentAsset($(this).data('id')));
    });

    $doc.on('click.app', '#assetsDirectoryBody .asset-par-cell', function (event) {
        event.stopPropagation();
        const asset = currentAsset($(this).closest('tr').data('id'));

        if (asset) {
            setActiveParSelection(asset.par_number || '');
        }
    });

    $doc.on('dblclick.app', '#assetsDirectoryBody .asset-par-cell', function (event) {
        event.stopPropagation();
        const asset = currentAsset($(this).closest('tr').data('id'));
        openParAssetSelection(asset);
    });

    $doc.on('dblclick.app', '#assetsDirectoryBody tr', function (event) {
        if ($(event.target).closest('button').length) {
            return;
        }

        openDetailsModal(currentAsset($(this).data('id')));
    });

    $doc.on('click.app', '#assetParSelectionBody .select-par-asset', function () {
        const assetId = Number($(this).data('id') || 0);
        const selectedAsset = (Array.isArray(appState.parSelectionAssets) ? appState.parSelectionAssets : []).find(
            (asset) => Number(asset.id || 0) === assetId
        ) || currentAsset(assetId);

        openAssetBatchEditWizard(selectedAsset, appState.parSelectionAssets);
    });

    $doc.on('click.app', '#assetParSelectionBody .details-par-asset', function (event) {
        event.stopPropagation();
        const assetId = Number($(this).data('id') || 0);
        const selectedAsset = (Array.isArray(appState.parSelectionAssets) ? appState.parSelectionAssets : []).find(
            (asset) => Number(asset.id || 0) === assetId
        ) || currentAsset(assetId);

        openDetailsModal(selectedAsset);
    });

    $doc.on('click.app', '#assetParSelectionBody .delete-par-asset', function (event) {
        event.stopPropagation();
        const assetId = Number($(this).data('id') || 0);
        const selectedAsset = (Array.isArray(appState.parSelectionAssets) ? appState.parSelectionAssets : []).find(
            (asset) => Number(asset.id || 0) === assetId
        ) || currentAsset(assetId);

        if (!selectedAsset || !window.confirm(`Delete ${selectedAsset.property_name} (${selectedAsset.property_id || 'No Serial No.'})?`)) {
            return;
        }

        const sourceParId = Number(selectedAsset.par_id || 0);
        const sourceParNumber = String(selectedAsset.par_number || '').trim();

        apiRequest('api/assets/delete.php', 'POST', { id: assetId })
            .done((response) => {
                notifyTransaction(response.message || 'Asset deleted successfully.', 'success', {
                    category: 'Assets',
                    details: 'The selected asset was removed and the related asset tables were refreshed.',
                });

                $.when(refreshDashboard(true), refreshAssetsDirectory(true), refreshManagementView(true)).always(() => {
                    refreshActiveReport(true);

                    if (sourceParId <= 0) {
                        closeParAssetSelection();
                        return;
                    }

                    apiRequest('api/assets/filter.php', 'GET', { par_id: sourceParId })
                        .done((filterResponse) => {
                            const assets = filterResponse.data?.assets || [];

                            if (!assets.length) {
                                closeParAssetSelection();
                                return;
                            }

                            appState.parSelectionAssets = assets;
                            renderParAssetSelection(assets, {
                                par_id: sourceParId,
                                par_number: sourceParNumber,
                                officer_name: assets[0]?.officer_name || selectedAsset.officer_name || '',
                            });
                            setParAssetSelectionVisible(true);
                        })
                        .fail(() => {
                            closeParAssetSelection();
                        });
                });
            })
            .fail((xhr) => {
                handleRequestError(xhr, 'Unable to delete the asset.');
            });
    });

    $doc.on('click.app', '#assetParSelectionBody tr', function (event) {
        if ($(event.target).closest('button').length) {
            return;
        }

        const assetId = Number($(this).data('id') || 0);
        const selectedAsset = (Array.isArray(appState.parSelectionAssets) ? appState.parSelectionAssets : []).find(
            (asset) => Number(asset.id || 0) === assetId
        ) || currentAsset(assetId);

        openAssetBatchEditWizard(selectedAsset, appState.parSelectionAssets);
    });

    $doc.on('click.app', '#assetsDirectoryBody .delete-asset', function () {
        const assetId = $(this).data('id');
        const asset = currentAsset(assetId);
        deleteAssetRecord(assetId, asset);
    });

    $doc.on('submit.app', '#assetFilterForm', function (event) {
        event.preventDefault();
        refreshManagementView(false);
    });

    $doc.on('input.app', '#assetNameSearch', function () {
        clearTimeout(manageSearchTimer);
        manageSearchTimer = setTimeout(() => {
            refreshManagementView(true);
        }, 250);
    });

    $doc.on('change.app', '#assetFilterForm [name="property_type"], #manageOfficerSelect', function () {
        refreshManagementView(true);
    });

    $doc.on('change.app', '#manageDivisionFilter', function () {
        const division = String($(this).val() || '').trim();
        $('#manageOfficerSelect').val('');

        loadManageOfficers(division, true).always(() => {
            refreshManagementView(true);
        });
    });

    $doc.on('click.app', '#resetFilters', function () {
        $('#assetFilterForm')[0].reset();
        populateManageOfficers('', []);
        refreshManagementView(false);
    });

    $doc.on('dblclick.app', '#assetTableBody .manage-par-cell', function (event) {
        event.stopPropagation();
        const asset = currentAsset($(this).closest('tr').data('id'));
        openParAssetSelection(asset);
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
        deleteAssetRecord(assetId, asset);
    });

    $doc.on('click.app', '#openInventoryModal, #openInventoryModalToolbar', function () {
        $.when(activateView('inventory')).done(() => {
            openInventoryModal();
        });
    });

    $doc.on('click.app', '#closeInventoryModal, #cancelInventoryModal', function () {
        closeInventoryModal();
    });

    $doc.on('submit.app', '#inventoryForm', function (event) {
        event.preventDefault();
        clearErrors('#inventoryForm');

        const payload = formData($('#inventoryForm'));
        const hasId = Number(payload.inventory_item_id || 0) > 0;
        const endpoint = hasId ? 'api/inventory/update.php' : 'api/inventory/add.php';
        const successMessage = hasId ? 'Inventory entry updated successfully.' : 'Inventory entry saved successfully.';

        apiRequest(endpoint, 'POST', payload)
            .done((response) => {
                const item = response.data?.item || {};
                appState.highlightedInventoryIds = [Number(item.inventory_item_id || 0)].filter(Boolean);
                appState.selectedInventoryItemId = Number(item.inventory_item_id || 0);
                notifyTransaction(response.message || successMessage, 'success', {
                    category: 'Inventory',
                    details: hasId
                        ? 'The selected inventory issuance was updated and the stock controls were refreshed.'
                        : 'A new inventory issuance was added and placed at the top of the inventory table.',
                });
                closeInventoryModal();
                $.when(refreshInventoryView(true), refreshDashboard(true)).always(() => {
                    renderInventoryAlerts(appState.dashboardData?.inventory || {});
                });
            })
            .fail((xhr) => {
                handleRequestError(xhr, hasId ? 'Unable to update the inventory entry.' : 'Unable to save the inventory entry.', '#inventoryForm');
            });
    });

    $doc.on('click.app', '.inventory-request-card', function () {
        setInventoryRequestType($(this).data('requestType'));
        clearTimeout(inventoryPreviewTimer);
        inventoryPreviewTimer = setTimeout(() => {
            refreshInventoryPreview();
        }, 120);
    });

    $doc.on('change.app', '#inventoryForm [name="division"]', function () {
        const division = String($(this).val() || '').trim();
        loadInventoryOfficers(division);
    });

    $doc.on('input.app change.app', '#inventoryForm [name="item_name"], #inventoryForm [name="description"], #inventoryForm [name="quantity_issued"], #inventoryForm [name="unit_cost"], #inventoryForm [name="issued_at"]', function () {
        clearTimeout(inventoryPreviewTimer);
        inventoryPreviewTimer = setTimeout(() => {
            refreshInventoryPreview();
        }, 180);
    });

    $doc.on('input.app change.app', '#inventoryFilterForm [name="search"], #inventoryFilterForm [name="stock_status"]', function () {
        clearTimeout(inventoryFilterTimer);
        inventoryFilterTimer = setTimeout(() => {
            refreshInventoryView(true, true);
        }, 180);
    });

    $doc.on('submit.app', '#inventoryFilterForm', function (event) {
        event.preventDefault();
        clearTimeout(inventoryFilterTimer);
        refreshInventoryView(true, true);
    });

    $doc.on('click.app', '#resetInventoryFilters', function () {
        $('#inventoryFilterForm')[0]?.reset();
        $('#inventoryFilterForm').find('select.searchable-select').each(function () {
            refreshSearchableSelect($(this));
        });
        refreshInventoryView(false, true);
    });



    $doc.on('click.app', '#inventoryTableBody tr', function (event) {
        if ($(event.target).closest('button, a, input, select, textarea').length) {
            return;
        }

        setSelectedInventoryItem($(this).data('id'));
    });

    $doc.on('dblclick.app', '#inventoryTableBody tr', function (event) {
        if ($(event.target).closest('button').length) {
            return;
        }

        setSelectedInventoryItem($(this).data('id'));
        openInventoryDetailsModal($(this).data('id'));
    });

    $doc.on('click.app', '#inventoryTableBody .edit-inventory', function () {
        openInventoryModal(currentInventoryItem($(this).data('id')));
    });

    $doc.on('click.app', '#inventoryTableBody .add-inventory-stock', function () {
        openInventoryMovementModal(currentInventoryItem($(this).data('id')), 'ADD');
    });

    $doc.on('click.app', '#inventoryTableBody .deduct-inventory-stock', function () {
        openInventoryMovementModal(currentInventoryItem($(this).data('id')), 'DEDUCT');
    });

    $doc.on('click.app', '#closeInventoryMovementModal, #cancelInventoryMovement', function () {
        closeInventoryMovementModal();
    });

    $doc.on('submit.app', '#inventoryMovementForm', function (event) {
        event.preventDefault();
        clearErrors('#inventoryMovementForm');

        apiRequest('api/inventory/adjust.php', 'POST', formData($('#inventoryMovementForm')))
            .done((response) => {
                const item = response.data?.item || {};
                const actionLabel = String($('#inventoryMovementForm [name="movement_type"]').val() || 'ADD').toUpperCase() === 'DEDUCT'
                    ? 'Inventory stock deducted successfully.'
                    : 'Inventory stock added successfully.';

                appState.highlightedInventoryIds = [Number(item.inventory_item_id || 0)].filter(Boolean);
                appState.selectedInventoryItemId = Number(item.inventory_item_id || 0);
                notifyTransaction(response.message || actionLabel, 'success', {
                    category: 'Inventory',
                    details: 'The stock count and movement ledger were updated successfully.',
                });
                closeInventoryMovementModal();
                $.when(refreshInventoryView(true), refreshDashboard(true)).always(() => {
                    renderInventoryAlerts(appState.dashboardData?.inventory || {});
                });
            })
            .fail((xhr) => {
                handleRequestError(xhr, 'Unable to update the stock movement.', '#inventoryMovementForm');
            });
    });

    $doc.on('click.app', '#closeInventoryDetailsModal, #closeInventoryDetailsButton', function () {
        closeInventoryDetailsModal();
    });

    $doc.on('click.app', '#detailsUpdateButton', function () {
        const assetId = Number($('#detailsModal').data('asset-id') || 0);
        const asset = currentAsset(assetId);

        if (!asset) {
            showNotice('Unable to load the selected asset.', 'error');
            return;
        }

        closeDetailsModal();
        openEditModal(asset);
    });

    $doc.on('click.app', '#detailsDeleteButton', function () {
        const assetId = Number($('#detailsModal').data('asset-id') || 0);
        const asset = currentAsset(assetId);

        if (!asset) {
            showNotice('Unable to load the selected asset.', 'error');
            return;
        }

        deleteAssetRecord(assetId, asset, () => {
            closeDetailsModal();
        });
    });

    $doc.on('click.app', '#inventoryDetailsUpdateButton', function () {
        const itemId = Number($('#inventoryDetailsModal').data('inventory-item-id') || 0);
        const item = currentInventoryItem(itemId);

        if (!item) {
            showNotice('Unable to load the selected inventory item.', 'error');
            return;
        }

        closeInventoryDetailsModal();
        openInventoryModal(item);
    });

    $doc.on('click.app', '#inventoryDetailsAddStockButton', function () {
        const itemId = Number($('#inventoryDetailsModal').data('inventory-item-id') || 0);
        const item = currentInventoryItem(itemId);

        if (!item) {
            showNotice('Unable to load the selected inventory item.', 'error');
            return;
        }

        closeInventoryDetailsModal();
        openInventoryMovementModal(item, 'ADD');
    });

    $doc.on('click.app', '#inventoryDetailsDeductStockButton', function () {
        const itemId = Number($('#inventoryDetailsModal').data('inventory-item-id') || 0);
        const item = currentInventoryItem(itemId);

        if (!item) {
            showNotice('Unable to load the selected inventory item.', 'error');
            return;
        }

        closeInventoryDetailsModal();
        openInventoryMovementModal(item, 'DEDUCT');
    });

    $doc.on('click.app', '#inventoryDetailsDeleteButton', function () {
        const itemId = Number($('#inventoryDetailsModal').data('inventory-item-id') || 0);

        deleteInventoryItemRecord(itemId, () => {
            closeInventoryDetailsModal();
        });
    });

    $doc.on('submit.app', '#editAssetForm', function (event) {
        event.preventDefault();
        clearErrors('#editAssetForm');

        apiRequest('api/assets/update.php', 'POST', formData($('#editAssetForm')))
            .done((response) => {
                const updatedAsset = response.data?.asset || {};
                appState.highlightedManageAssetIds = [Number(updatedAsset.id || 0)].filter(Boolean);
                appState.highlightedPropertyIds = [String(updatedAsset.property_id || '').trim()].filter(Boolean);
                appState.highlightedParNumber = String(updatedAsset.par_number || '').trim();
                notifyTransaction(response.message || 'Asset updated successfully.', 'success', {
                    category: 'Assets',
                    details: 'The selected asset record was updated and the related asset tables were refreshed.',
                });
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

    $doc.on('change.app', '#editAssetForm [name="division"]', function () {
        const division = String($(this).val() || '').trim();
        const $officerSelect = $('#editAssetForm [name="officer_id"]');
        $officerSelect.val('');

        if (!division) {
            $officerSelect.prop('disabled', true).html('<option value="">Select division first</option>');
            refreshSearchableSelect($officerSelect);
            return;
        }

        $officerSelect.prop('disabled', true).html('<option value="">Loading officers...</option>');
        refreshSearchableSelect($officerSelect);

        apiRequest('api/officers/filter.php', 'GET', { division })
            .done((response) => {
                const officers = response.data?.officers || [];
                $officerSelect.prop('disabled', !officers.length).html(buildOfficerOptions(officers));
                refreshSearchableSelect($officerSelect);
            })
            .fail((xhr) => {
                $officerSelect.prop('disabled', true).html('<option value="">Unable to load officers</option>');
                refreshSearchableSelect($officerSelect);
                handleRequestError(xhr, 'Unable to load officers for the selected division.');
            });
    });

    $doc.on('click.app', '#closeDetailsModal, #closeDetailsButton', function () {
        closeDetailsModal();
    });

    $doc.on('click.app', '#closeOfficerDetailsModal', function () {
        closeOfficerDetailsModal();
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

    $doc.on('change.app', '#spiClassification', function () {
        const classification = $(this).val();
        const reportType = classification === 'PPE' ? 'RPCPPE' : (classification === 'SEMI' ? 'REGSPI' : 'RPCPPE');
        $('#spiReportTypeField').val(reportType);
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
            // Auto-scroll to Step 2 after officer is selected
            window.requestAnimationFrame(() => {
                const step2 = $('#parReportPanel').find('.report-step:nth-of-type(2)')[0];
                if (step2) {
                    step2.scrollIntoView({ block: 'start', behavior: 'smooth' });
                }
            });
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

    $doc.on('submit.app', '#inventoryReportForm', function (event) {
        event.preventDefault();
        generateInventoryReport(false);
    });

    $doc.on('submit.app', '#spiReportForm', function (event) {
        event.preventDefault();
        generateSpiReport();
    });

    $doc.on('click.app', '#spiPrintReport', function () {
        if (!appState.reportReady) {
            showNotice('Generate the SPI report before printing.', 'error');
            return;
        }

        triggerReportPrint();
    });

    $doc.on('click.app', '#printReport', function () {
        if (!['PAR', 'ICS'].includes(appState.reportType)) {
            showNotice('Select PAR or ICS first before printing.', 'error');
            return;
        }

        if (!appState.reportReady) {
            showNotice(`Generate the ${appState.reportType || 'document'} report before printing.`, 'error');
            return;
        }

        triggerReportPrint();
    });

    $doc.on('click.app', '#printInventoryReport', function () {
        if (appState.reportType !== 'INVENTORY') {
            showNotice('Select Inventory first before printing.', 'error');
            return;
        }

        if (!appState.reportReady) {
            showNotice('Generate the Inventory report before printing.', 'error');
            return;
        }

        triggerReportPrint();
    });

    $doc.on('click.app', '#exportReportCsv', function () {
        if (!['PAR', 'ICS'].includes(appState.reportType)) {
            showNotice('Select PAR or ICS first before exporting.', 'error');
            return;
        }

        if (!appState.reportReady) {
            showNotice(`Generate the ${appState.reportType || 'document'} report before exporting.`, 'error');
            return;
        }

        syncReportOfficer();
        const query = $.param(formData($('#reportForm')));
        notifyTransaction(`${appState.reportType} Excel export started.`, 'success', {
            category: 'Reports',
            details: `The ${appState.reportType} workbook export is opening in a new browser tab for download or printing.`,
        });
        window.open(`api/reports/export.php?${query}`, '_blank', 'noopener');
    });

    $doc.on('click.app', '#exportInventoryReport', function () {
        if (appState.reportType !== 'INVENTORY') {
            showNotice('Select Inventory first before exporting.', 'error');
            return;
        }

        if (!appState.reportReady) {
            showNotice('Generate the Inventory report before exporting.', 'error');
            return;
        }

        const query = $.param(formData($('#inventoryReportForm')));
        notifyTransaction('Inventory CSV export started.', 'success', {
            category: 'Reports',
            details: 'The inventory report export is opening in a new browser tab for download.',
        });
        window.open(`api/reports/export.php?${query}`, '_blank', 'noopener');
    });

    // Pagination handlers for all tables
    $.each(['registration', 'manage', 'assets', 'inventory'], (_, section) => {
        // Page number clicks
        $doc.on('click.app', `#${section}PageNumbers .pagination-number`, function () {
            const page = $(this).data('page');
            if (page) changePage(section, page);
        });

        // Previous page
        $doc.on('click.app', `#${section}PrevPage`, function () {
            const state = paginationState[section];
            if (state && state.currentPage > 1) changePage(section, state.currentPage - 1);
        });

        // Next page
        $doc.on('click.app', `#${section}NextPage`, function () {
            const state = paginationState[section];
            const totalPages = getTotalPages(section);
            if (state && state.currentPage < totalPages) changePage(section, state.currentPage + 1);
        });

        // Rows per page input
        $doc.on('change.app', `#${section}RowsPerPage`, function () {
            let rowsPerPage = parseInt($(this).val()) || 10;
            if (rowsPerPage < 1) rowsPerPage = 1;
            if (rowsPerPage > 500) rowsPerPage = 500;
            $(this).val(rowsPerPage);
            setRowsPerPage(section, rowsPerPage);
        });
    });

    $doc.on('click.app', function (event) {
        if (!$(event.target).closest('#notificationPanel, #toggleNotifications, #notificationDetailsModal').length) {
            setNotificationPanelVisible(false);
        }

        if (!$(event.target).closest('#profileMenu, #toggleProfileMenu').length) {
            setProfileMenuVisible(false);
        }

        if (!$(event.target).closest('#stockButton, #stockSubmenu').length) {
            setInventoryStockMenuVisible(false);
        }
    });

    $doc.on('keydown.app', function (event) {
        if ((event.ctrlKey || event.metaKey) && String(event.key || '').toLowerCase() === 'p') {
            if (appState.activeView === 'reports' && ['PAR', 'ICS', 'INVENTORY'].includes(appState.reportType) && appState.reportReady) {
                event.preventDefault();
                triggerReportPrint();
                return;
            }
        }

        if (event.key === 'Escape') {
            if ($('#notificationDetailsModal').hasClass('flex')) {
                closeNotificationDetailsModal();
                return;
            }

            closeEditModal();
            closeDetailsModal();
            closeOfficerDetailsModal();
            closeInventoryModal();
            closeInventoryMovementModal();
            closeInventoryDetailsModal();
            closeSidebar();
            setOfficerRegistrationVisible(false);
            setNotificationPanelVisible(false);
            setProfileMenuVisible(false);
            setInventoryStockMenuVisible(false);
        }
    });

    window.addEventListener('beforeprint', () => {
        if (appState.activeView === 'reports' && ['PAR', 'ICS', 'INVENTORY'].includes(appState.reportType) && appState.reportReady) {
            setReportPrintMode(true);
        }
    });

    window.addEventListener('afterprint', () => {
        setReportPrintMode(false);
    });

    const initialView = normalizeViewName(window.location.hash || '#dashboard');
    setReportType('', true);

    activateView(initialView, false);
});





















$(document).on('click.app', '#assetBulkUpdateButton', function () {
    $('#assetForm').trigger('submit');
});

$(document).on('click.app', '#assetDeleteBatchButton', function () {
    $('#bulkDeleteAssets').trigger('click');
});









