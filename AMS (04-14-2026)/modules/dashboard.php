<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

$currentYear = (int) date('Y');
$currentMonth = (int) date('n');
$dashboardYears = range($currentYear - 4, $currentYear + 1);
$dashboardMonths = [
    1 => 'January',
    2 => 'February',
    3 => 'March',
    4 => 'April',
    5 => 'May',
    6 => 'June',
    7 => 'July',
    8 => 'August',
    9 => 'September',
    10 => 'October',
    11 => 'November',
    12 => 'December',
];

?>
<section id="dashboard" class="app-view active" data-view="dashboard">
    <div class="view-scroll section-stack dashboard-view">
        <div class="dashboard-studio">
            <section class="dashboard-hero-panel">
                <div class="dashboard-hero-panel__intro">
                    <p class="panel-eyebrow">Inventory And Asset Monitoring</p>
                    <h2 class="dashboard-hero-panel__title">Dashboard</h2>
                    <p id="dashboardHeroCopy" class="dashboard-hero-panel__copy">Monitor asset distribution, funding exposure, and stock health from one control center.</p>
                    <div class="dashboard-hero-panel__chips">
                        <span id="dashboardModeBadge" class="dashboard-chip">Overview</span>
                        <span class="dashboard-chip dashboard-chip--ghost">Live Metrics</span>
                    </div>
                </div>
                <div class="dashboard-hero-panel__aside">
                    <form class="dashboard-filter-bar" autocomplete="off">
                        <label class="form-group dashboard-filter-bar__mode">
                            <span class="form-label">View</span>
                            <select id="dashboardFilterMode" class="form-input">
                                <option value="overview" selected>Overview</option>
                                <option value="monthly">Monthly</option>
                                <option value="yearly">Yearly</option>
                                <option value="by-division">By Division</option>
                                <option value="by-funding">By Funding</option>
                                <option value="by-classification">By Classification</option>
                            </select>
                        </label>
                        <label class="form-group dashboard-filter-bar__picker dashboard-yearly-picker hidden">
                            <span class="form-label">Year</span>
                            <select id="dashboardYear" class="form-input">
                                <?php foreach ($dashboardYears as $year): ?>
                                    <option value="<?= escape_html((string) $year); ?>"<?= $year === $currentYear ? ' selected' : ''; ?>><?= escape_html((string) $year); ?></option>
                                <?php endforeach; ?>
                            </select>
                        </label>
                        <label class="form-group dashboard-filter-bar__picker dashboard-monthly-picker hidden">
                            <span class="form-label">Month</span>
                            <select id="dashboardMonth" class="form-input">
                                <?php foreach ($dashboardMonths as $monthValue => $monthLabel): ?>
                                    <option value="<?= escape_html((string) $monthValue); ?>"<?= $monthValue === $currentMonth ? ' selected' : ''; ?>><?= escape_html($monthLabel); ?></option>
                                <?php endforeach; ?>
                            </select>
                        </label>
                    </form>

                    <article class="dashboard-signal-card">
                        <div class="dashboard-signal-card__grid">
                            <div class="dashboard-signal-stat">
                                <span class="dashboard-signal-stat__label">Inventory Items</span>
                                <strong id="dashboardInventoryTotal" class="dashboard-signal-stat__value">0</strong>
                            </div>
                            <div class="dashboard-signal-stat">
                                <span class="dashboard-signal-stat__label">Low Stock</span>
                                <strong id="dashboardInventoryLow" class="dashboard-signal-stat__value">0</strong>
                            </div>
                            <div class="dashboard-signal-stat">
                                <span class="dashboard-signal-stat__label">Near Low</span>
                                <strong id="dashboardInventoryNear" class="dashboard-signal-stat__value">0</strong>
                            </div>
                            <div class="dashboard-signal-stat">
                                <span class="dashboard-signal-stat__label">At Limit</span>
                                <strong id="dashboardInventoryAtLimit" class="dashboard-signal-stat__value">0</strong>
                            </div>
                        </div>

                        <div class="dashboard-watch-spotlight">
                            <span class="dashboard-watch-spotlight__eyebrow">Watchlist Lead</span>
                            <strong id="dashboardWatchLeadName" class="dashboard-watch-spotlight__title">No watchlist items yet</strong>
                            <p id="dashboardWatchLeadMeta" class="dashboard-watch-spotlight__meta">Inventory alerts will appear here as soon as stock thresholds need attention.</p>
                            <span id="dashboardWatchLeadStatus" class="inventory-status-chip inventory-status-chip--normal">Stable</span>
                        </div>
                    </article>
                </div>
            </section>

            <div class="dashboard-metric-grid">
                <article class="dashboard-metric dashboard-metric--assets dashboard-metric--delay-1">
                    <span class="dashboard-metric__icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 3 4.5 7.2v9.6L12 21l7.5-4.2V7.2L12 3Z"></path>
                            <path d="M12 12 4.5 7.2"></path>
                            <path d="M12 12l7.5-4.8"></path>
                            <path d="M12 12v9"></path>
                        </svg>
                    </span>
                    <div class="dashboard-metric__content">
                        <p class="dashboard-metric__label">Total Assets</p>
                        <h3 id="metricAssets" class="dashboard-metric__value">0</h3>
                        <p class="dashboard-metric__note">All registered asset records in the ledger.</p>
                    </div>
                </article>
                <article class="dashboard-metric dashboard-metric--value dashboard-metric--delay-2">
                    <span class="dashboard-metric__icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 3v18"></path>
                            <path d="M16.5 7.5c0-1.9-1.7-3.5-4.5-3.5S7.5 5.6 7.5 7.5 9 10.4 12 10.4s4.5 1.5 4.5 3.4-1.7 3.7-4.5 3.7-4.5-1.6-4.5-3.7"></path>
                        </svg>
                    </span>
                    <div class="dashboard-metric__content">
                        <p class="dashboard-metric__label">Total Value</p>
                        <h3 id="metricValue" class="dashboard-metric__value">PHP 0.00</h3>
                        <p class="dashboard-metric__note">Combined acquisition value across monitored assets.</p>
                    </div>
                </article>
                <article class="dashboard-metric dashboard-metric--ppe dashboard-metric--delay-3">
                    <span class="dashboard-metric__icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 21s7-4.5 7-10.5V5.9L12 3 5 5.9v4.6C5 16.5 12 21 12 21Z"></path>
                            <path d="m9.2 11.9 1.8 1.9 3.8-4.3"></path>
                        </svg>
                    </span>
                    <div class="dashboard-metric__content">
                        <p class="dashboard-metric__label">PPE Items</p>
                        <h3 id="metricPpe" class="dashboard-metric__value">0</h3>
                        <p class="dashboard-metric__note">Property, plant, and equipment under tracking.</p>
                    </div>
                </article>
                <article class="dashboard-metric dashboard-metric--semi dashboard-metric--delay-4">
                    <span class="dashboard-metric__icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 4 5 8l7 4 7-4-7-4Z"></path>
                            <path d="m5 12 7 4 7-4"></path>
                            <path d="m5 16 7 4 7-4"></path>
                        </svg>
                    </span>
                    <div class="dashboard-metric__content">
                        <p class="dashboard-metric__label">SEMI Items</p>
                        <h3 id="metricSemi" class="dashboard-metric__value">0</h3>
                        <p class="dashboard-metric__note">Semi-expandable inventory and support assets.</p>
                    </div>
                </article>
            </div>

            <div class="dashboard-analytics-grid">
                <article class="dashboard-panel dashboard-panel--classification">
                    <div class="dashboard-panel__head">
                        <div>
                            <p class="panel-eyebrow">Asset Mix</p>
                            <h3 id="dashboardCategoryTitle" class="dashboard-panel__title">Classification Distribution</h3>
                            <p id="dashboardCategoryCopy" class="dashboard-panel__copy">Current asset count grouped by major asset category.</p>
                        </div>
                        <span class="dashboard-panel__badge">Count View</span>
                    </div>
                    <div class="dashboard-panel__canvas dashboard-panel__canvas--donut">
                        <canvas id="categoryChart"></canvas>
                    </div>
                </article>

                <article class="dashboard-panel dashboard-panel--inventory">
                    <div class="dashboard-panel__head">
                        <div>
                            <p class="panel-eyebrow">Inventory Monitoring</p>
                            <h3 class="dashboard-panel__title">Stock Levels Versus Limits</h3>
                            <p class="dashboard-panel__copy">Track current stock against thresholds to spot materials that need replenishment.</p>
                        </div>
                        <span id="inventoryAlertMeta" class="dashboard-panel__badge dashboard-panel__badge--alert">LOW: 0 | NEAR LOW: 0 | HIGH STOCK: 0</span>
                    </div>
                    <div class="dashboard-panel__canvas dashboard-panel__canvas--inventory">
                        <canvas id="inventoryStockChart"></canvas>
                    </div>
                </article>

                <article class="dashboard-panel dashboard-panel--funding">
                    <div class="dashboard-panel__head">
                        <div>
                            <p class="panel-eyebrow">Funding Exposure</p>
                            <h3 id="dashboardFundingTitle" class="dashboard-panel__title">Funding Allocation</h3>
                            <p id="dashboardFundingCopy" class="dashboard-panel__copy">Compare the value concentration of assets across the active funding view.</p>
                        </div>
                        <span class="dashboard-panel__badge">Value View</span>
                    </div>
                    <div class="dashboard-panel__canvas">
                        <canvas id="fundingChart"></canvas>
                    </div>
                </article>

                <article class="dashboard-panel dashboard-panel--watchlist">
                    <div class="dashboard-panel__head">
                        <div>
                            <p class="panel-eyebrow">Action Queue</p>
                            <h3 class="dashboard-panel__title">Inventory Watchlist</h3>
                            <p class="dashboard-panel__copy">Items with low stock or threshold pressure appear here for quick review.</p>
                        </div>
                        <span id="dashboardWatchlistCount" class="dashboard-panel__badge dashboard-panel__badge--ghost">0 Items</span>
                    </div>
                    <div id="inventoryAlertList" class="inventory-alert-list">
                        <div class="inventory-alert-empty">No low stock materials to monitor right now.</div>
                    </div>
                </article>
            </div>
        </div>
    </div>
</section>
