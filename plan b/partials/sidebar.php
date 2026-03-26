<?php
declare(strict_types=1);
?>
<aside id="sidebar" class="screen-only app-sidebar -translate-x-full lg:translate-x-0">
    <div class="flex items-center justify-between lg:hidden">
        <div>
            <p class="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Menu</p>
            <h2 class="mt-2 text-lg font-semibold text-slate-900">Sections</h2>
        </div>
        <button id="closeSidebar" type="button" class="rounded-full border border-slate-200 p-2 text-slate-700">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
    </div>

    <nav class="sidebar-nav">
        <a href="#dashboard" class="nav-anchor sidebar-link active">
            <span class="sidebar-link__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 11.5 12 5l8 6.5"></path>
                    <path d="M6.5 10.5V19h11V10.5"></path>
                </svg>
            </span>
            <span>Dashboard</span>
        </a>
        <a href="#assets" class="nav-anchor sidebar-link">
            <span class="sidebar-link__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4.5 8.5 12 4l7.5 4.5-7.5 4.5z"></path>
                    <path d="M4.5 8.5V16l7.5 4 7.5-4V8.5"></path>
                </svg>
            </span>
            <span>Assets</span>
        </a>
        <a href="#manage" class="nav-anchor sidebar-link">
            <span class="sidebar-link__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 6h16"></path>
                    <path d="M4 12h16"></path>
                    <path d="M4 18h16"></path>
                    <circle cx="9" cy="6" r="1.5"></circle>
                    <circle cx="15" cy="12" r="1.5"></circle>
                    <circle cx="11" cy="18" r="1.5"></circle>
                </svg>
            </span>
            <span>Manage</span>
        </a>
        <a href="#reports" class="nav-anchor sidebar-link">
            <span class="sidebar-link__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 4.5h9l3.5 3.5V19.5H6z"></path>
                    <path d="M15 4.5v4h4"></path>
                    <path d="M8.5 13.5h7"></path>
                    <path d="M8.5 16.5h7"></path>
                </svg>
            </span>
            <span>Reports</span>
        </a>
    </nav>
</aside>
