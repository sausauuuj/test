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
            <!-- Dashboard Header -->
            <div class="section-head">
                <h2 class="section-title">Dashboard</h2>
            </div>

            <!-- Top Metrics Row -->
            <div class="dashboard-metrics-box">
                <div class="dashboard-metrics-container">
                    <div class="dashboard-metric-card">
                        <p class="dashboard-metric-card__label">Total Assets</p>
                        <h3 id="metricAssets" class="dashboard-metric-card__value">0</h3>
                    </div>
                    <div class="dashboard-metric-card">
                        <p class="dashboard-metric-card__label">Total Value</p>
                        <h3 id="metricValue" class="dashboard-metric-card__value">PHP 0.00</h3>
                    </div>
                    <div class="dashboard-metric-card">
                        <p class="dashboard-metric-card__label">Total Stocks</p>
                        <h3 id="metricTotalStocks" class="dashboard-metric-card__value">0</h3>
                    </div>
                    <div class="dashboard-metric-card">
                        <p class="dashboard-metric-card__label">Total Amount</p>
                        <h3 id="metricTotalAmount" class="dashboard-metric-card__value">PHP 0.00</h3>
                    </div>
                </div>
            </div>

            <!-- Classification Chart & Inventory Table -->
            <div class="dashboard-content-grid">
                <!-- Classification Chart -->
                <div class="dashboard-chart-section">
                    <h3 id="dashboardCategoryTitle" class="dashboard-section-title">Classification Distribution</h3>
                    <div class="dashboard-chart-container">
                        <canvas id="categoryChart"></canvas>
                    </div>
                </div>

                <!-- Inventory Table with Filters -->
                <div class="dashboard-table-section">
                    <h3 class="dashboard-section-title">Stock Levels</h3>
                    <div class="dashboard-inventory-filters">
                        <button type="button" class="dashboard-filter-btn" data-stock-filter="HIGH">
                            <span class="filter-btn-label">High Stock</span>
                            <span id="dashboardHighStockCount" class="filter-btn-count">0</span>
                        </button>
                        <button type="button" class="dashboard-filter-btn" data-stock-filter="MEDIUM">
                            <span class="filter-btn-label">Medium Stock</span>
                            <span id="dashboardMediumStockCount" class="filter-btn-count">0</span>
                        </button>
                        <button type="button" class="dashboard-filter-btn" data-stock-filter="LOW">
                            <span class="filter-btn-label">Low Stock</span>
                            <span id="dashboardLowStockCount" class="filter-btn-count">0</span>
                        </button>
                    </div>
                    <div class="dashboard-inventory-table-wrapper">
                        <table class="dashboard-inventory-table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Stock #</th>
                                    <th>Quantity</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody id="dashboardInventoryTableBody">
                                <tr>
                                    <td colspan="4" class="text-center text-slate-500 py-4">No inventory data</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>
