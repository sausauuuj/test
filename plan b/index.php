<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$app = app_config('app');
$todayLabel = date('F j, Y g:i A');
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= escape_html($app['name']); ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: { brand: '#1155A5', surface: '#ECEFF1', ink: '#0f172a' },
                    boxShadow: { panel: '0 10px 26px rgba(15, 23, 42, 0.08)' },
                    fontFamily: { sans: ['Outfit', 'sans-serif'] }
                }
            }
        };
    </script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/app.css">
</head>
<body class="bg-surface text-ink antialiased">
    <div id="mobileOverlay" class="screen-only fixed inset-0 z-30 hidden bg-slate-950/45 backdrop-blur-sm lg:hidden"></div>

    <?php require __DIR__ . '/partials/header.php'; ?>

    <div class="app-shell">
        <?php require __DIR__ . '/partials/sidebar.php'; ?>

        <main class="app-main">
            <div id="globalNotice" class="screen-only hidden rounded-[1rem] border px-4 py-3 text-sm font-medium shadow-lg" role="alert" aria-live="polite"></div>
            <div id="moduleContainer" class="module-host">
                <?php require __DIR__ . '/modules/dashboard.php'; ?>
            </div>
        </main>
    </div>

    <div id="detailsModal" class="fixed inset-0 z-50 hidden items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
        <div class="w-full max-w-4xl max-h-[calc(100vh-2rem)] overflow-hidden rounded-[1.2rem] bg-white p-5 shadow-2xl">
            <div class="flex items-start justify-between gap-4">
                <div>
                    <p class="panel-eyebrow">Asset Details</p>
                    <h3 id="detailsAssetName" class="panel-title">Asset</h3>
                    <p id="detailsAssetMeta" class="mt-2 text-sm text-slate-500"></p>
                </div>
                <button id="closeDetailsModal" type="button" class="rounded-full border border-slate-200 p-2 text-slate-600"><svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
            </div>
            <div id="detailsContent" class="mt-5 max-h-[calc(100vh-10rem)] overflow-y-auto space-y-4 pr-1"></div>
            <div class="mt-6 flex justify-end"><button id="closeDetailsButton" type="button" class="action-secondary">Close</button></div>
        </div>
    </div>

    <div id="editModal" class="fixed inset-0 z-50 hidden items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
        <div class="w-full max-w-2xl rounded-[1.2rem] bg-white p-6 shadow-2xl">
            <div class="flex items-start justify-between gap-4">
                <div><p class="panel-eyebrow">Asset Update</p><h3 id="editAssetName" class="panel-title">Asset</h3><p id="editAssetMeta" class="mt-2 text-sm text-slate-500"></p></div>
                <button id="closeEditModal" type="button" class="rounded-full border border-slate-200 p-2 text-slate-600"><svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
            </div>
            <form id="editAssetForm" class="mt-6 space-y-4">
                <input type="hidden" name="id">
                <label class="form-group"><span class="form-label">Current Condition</span><select name="current_condition" class="form-input"><option value="">Select condition</option><option value="Good">Good</option><option value="Serviceable">Serviceable</option><option value="Needs Repair">Needs Repair</option><option value="Unserviceable">Unserviceable</option></select><span class="field-error hidden" data-error-for="current_condition"></span></label>
                <label class="form-group"><span class="form-label">Remarks</span><textarea name="remarks" rows="4" class="form-input" placeholder="Add remarks for this asset"></textarea><span class="field-error hidden" data-error-for="remarks"></span></label>
                <div class="flex flex-wrap items-center justify-end gap-3"><button id="cancelEdit" type="button" class="action-secondary">Cancel</button><button type="submit" class="action-primary">Save Changes</button></div>
            </form>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="assets/js/app.js"></script>
</body>
</html>
