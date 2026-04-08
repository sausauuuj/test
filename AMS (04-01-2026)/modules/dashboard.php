<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';

?>
<section id="dashboard" class="app-view active" data-view="dashboard">
    <div class="view-scroll section-stack">
        <div class="section-head">
            <h2 class="section-title">Dashboard</h2>
        </div>

        <div class="dashboard-metric-grid">
            <article class="dashboard-metric dashboard-metric--delay-1">
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
                </div>
            </article>
            <article class="dashboard-metric dashboard-metric--delay-2">
                <span class="dashboard-metric__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 3v18"></path>
                        <path d="M16.5 7.5c0-1.9-1.7-3.5-4.5-3.5S7.5 5.6 7.5 7.5 9 10.4 12 10.4s4.5 1.5 4.5 3.4-1.7 3.7-4.5 3.7-4.5-1.6-4.5-3.7"></path>
                    </svg>
                </span>
                <div class="dashboard-metric__content">
                    <p class="dashboard-metric__label">Total Value</p>
                    <h3 id="metricValue" class="dashboard-metric__value">PHP 0.00</h3>
                </div>
            </article>
            <article class="dashboard-metric dashboard-metric--delay-3">
                <span class="dashboard-metric__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 21s7-4.5 7-10.5V5.9L12 3 5 5.9v4.6C5 16.5 12 21 12 21Z"></path>
                        <path d="m9.2 11.9 1.8 1.9 3.8-4.3"></path>
                    </svg>
                </span>
                <div class="dashboard-metric__content">
                    <p class="dashboard-metric__label">PPE Items</p>
                    <h3 id="metricPpe" class="dashboard-metric__value">0</h3>
                </div>
            </article>
            <article class="dashboard-metric dashboard-metric--delay-4">
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
                </div>
            </article>
        </div>

        <div class="dashboard-chart-grid">
            <article class="chart-card dashboard-chart-card dashboard-chart-surface dashboard-chart-card--delay-1">
                <h3 class="dashboard-chart-card__title">Category Distribution</h3>
                <div class="dashboard-chart-card__canvas"><canvas id="categoryChart"></canvas></div>
            </article>
            <article class="chart-card dashboard-chart-card dashboard-chart-surface dashboard-chart-card--delay-2">
                <h3 class="dashboard-chart-card__title">Funding Allocation</h3>
                <div class="dashboard-chart-card__canvas"><canvas id="fundingChart"></canvas></div>
            </article>
        </div>

        <div class="dashboard-watch-grid">
            <article class="dashboard-watch-card dashboard-watch-surface">
                <div class="dashboard-watch-card__head">
                    <div>
                        <p class="panel-eyebrow">Inventory Watch</p>
                        <h3 class="dashboard-chart-card__title">Low Stock Materials and Supplies</h3>
                    </div>
                    <span id="inventoryAlertMeta" class="status-pill">LOW: 0 | NEAR LOW: 0</span>
                </div>
                <div id="inventoryAlertList" class="inventory-alert-list">
                    <div class="inventory-alert-empty">No low stock materials to monitor right now.</div>
                </div>
            </article>
        </div>
    </div>
</section>
