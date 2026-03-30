<?php
declare(strict_types=1);

$logoCandidates = [
    'DEPDev_Logo_High-res.svg.png',
    'DEPDev_Logo_High-res.svg',
];

$sidebarLogo = null;

foreach ($logoCandidates as $candidate) {
    if (is_file(__DIR__ . '/../' . $candidate)) {
        $sidebarLogo = $candidate;
        break;
    }
}
?>
<aside id="sidebar" class="screen-only app-sidebar -translate-x-full lg:translate-x-0">
    <div class="app-sidebar__panel">
        <div class="app-sidebar__head">
            <button id="closeSidebar" type="button" class="app-sidebar__close lg:hidden" aria-label="Close menu">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
        </div>
        <nav class="sidebar-nav">
            <a href="#dashboard" class="nav-anchor sidebar-link active">
                <span class="sidebar-link__label">Dashboard</span>
            </a>
            <a href="#registration" class="nav-anchor sidebar-link">
                <span class="sidebar-link__label">Accountable Officers</span>
            </a>
            <a href="#assets" class="nav-anchor sidebar-link">
                <span class="sidebar-link__label">Assets</span>
            </a>
            <a href="#manage" class="nav-anchor sidebar-link">
                <span class="sidebar-link__label">Management</span>
            </a>
            <a href="#reports" class="nav-anchor sidebar-link">
                <span class="sidebar-link__label">Reports</span>
            </a>
        </nav>
    </div>
</aside>
