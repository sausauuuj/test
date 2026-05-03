<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/_context.php';

?>
<section id="dashboard" class="app-view active" data-view="dashboard">
    <div class="view-scroll section-stack dashboard-view">
        <div class="section-head">
            <h2 class="section-title">Dashboard</h2>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div class="rounded-[1rem] border border-slate-200 bg-white p-5 shadow-sm">
                <p class="text-sm font-semibold text-slate-500">Total Registered Officers</p>
                <p id="metricOfficers" class="mt-3 text-3xl font-bold text-slate-800">0</p>
            </div>
            <div class="rounded-[1rem] border border-slate-200 bg-white p-5 shadow-sm">
                <p class="text-sm font-semibold text-slate-500">Total Assets</p>
                <p id="metricAssets" class="mt-3 text-3xl font-bold text-slate-800">0</p>
            </div>
            <div class="rounded-[1rem] border border-slate-200 bg-white p-5 shadow-sm">
                <p class="text-sm font-semibold text-slate-500">Total Number of Supplies</p>
                <p id="metricTotalSupplies" class="mt-3 text-3xl font-bold text-slate-800">0</p>
            </div>
            <div class="rounded-[1rem] border border-slate-200 bg-white p-5 shadow-sm">
                <p class="text-sm font-semibold text-slate-500">Available Stock Count</p>
                <p id="metricAvailableStocks" class="mt-3 text-3xl font-bold text-slate-800">0</p>
            </div>
        </div>

        <div class="grid grid-cols-1 gap-4 xl:grid-cols-4">
            <div class="w-full overflow-hidden rounded-[1rem] border border-slate-200 bg-white shadow-sm xl:col-span-2">
                <div class="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                    <div>
                        <h3 class="text-sm font-semibold text-slate-800">Assets by Type</h3>
                        <p class="text-[11px] text-slate-500">Total number of assets</p>
                    </div>
                    <label class="min-w-0">
                        <span class="sr-only">Division filter</span>
                        <select id="dashboardDivisionFilter" class="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-600">
                            <option value="">All divisions</option>
                            <?php foreach ($divisions as $code => $label): ?>
                                <option value="<?= escape_html($code); ?>"><?= escape_html($code); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </label>
                </div>
                    <div class="p-4">
                        <div class="dashboard-chart-container">
                            <canvas id="categoryChart" aria-label="Asset type chart"></canvas>
                        </div>
                    </div>
                </div>

            <div class="w-full overflow-hidden rounded-[1rem] border border-slate-200 bg-white shadow-sm xl:col-span-1">
                <div class="border-b border-slate-200 px-5 py-4">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h3 class="text-base font-semibold text-slate-800">Supply Alerts</h3>
                        </div>
                        <label class="min-w-0">
                            <span class="sr-only">Supply status filter</span>
                            <select id="dashboardSupplyAlertFilter" class="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-600">
                                <option value="">All supplies</option>
                                <option value="HIGH">High</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="LOW">Low</option>
                            </select>
                        </label>
                    </div>
                </div>
                <div class="dashboard-inventory-table-wrapper">
                    <table class="dashboard-inventory-table">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Category</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody id="dashboardInventoryTableBody">
                            <tr>
                                <td colspan="3" class="px-4 py-10 text-center text-slate-500">Loading supply alerts...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="w-full overflow-hidden rounded-[1rem] border border-slate-200 bg-white shadow-sm xl:col-span-1 xl:col-start-4">
                <div class="border-b border-slate-200 px-5 py-4">
                    <h3 class="text-base font-semibold text-slate-800">Recent Supplies Activities</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-slate-200 text-sm">
                        <thead class="bg-slate-50 text-left text-slate-500">
                            <tr>
                                <th class="px-4 py-3 font-medium">Name</th>
                                <th class="px-4 py-3 font-medium">Item</th>
                                <th class="px-4 py-3 font-medium">Action</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 bg-white">
                            <tr>
                                <td colspan="3" class="px-4 py-10 text-center text-slate-500">No recent stock in or stock out activities yet.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</section>
