<?php
declare(strict_types=1);

$logoCandidates = [
    'DEPDev_Logo_High-res.svg.png',
    'DEPDev_Logo_High-res.svg',
];

$siteLogo = null;

foreach ($logoCandidates as $candidate) {
    if (is_file(__DIR__ . '/../' . $candidate)) {
        $siteLogo = $candidate;
        break;
    }
}
?>
<header class="screen-only site-header">
    <div class="site-header__inner">
        <div class="flex items-center gap-3">
            <button id="openSidebar" type="button" class="rounded-xl border border-white/20 bg-white/10 p-2 text-white lg:hidden">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </button>
            <div class="site-mark">
                <?php if ($siteLogo !== null): ?>
                    <img src="<?= escape_html($siteLogo); ?>" alt="DEPDev IX logo" class="site-mark__image">
                <?php else: ?>
                    <span>IX</span>
                <?php endif; ?>
            </div>
            <div>
                <h1 class="site-title">DEPDev IX</h1>
                <p class="site-subtitle">Asset Management System</p>
            </div>
        </div>
        <div class="site-header__tools">
            <div class="site-clock site-clock--subtle">
                <span class="site-clock__label">Updated</span>
                <span id="liveClock"><?= escape_html($todayLabel); ?></span>
            </div>
            <button id="toggleNotifications" type="button" class="site-icon-button" aria-label="Open notifications" aria-expanded="false">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M15 17H5.5A1.5 1.5 0 0 1 4 15.5V14l1.5-1.5V9a6.5 6.5 0 1 1 13 0v3.5L20 14v1.5a1.5 1.5 0 0 1-1.5 1.5H15"></path>
                    <path d="M10 20a2 2 0 0 0 4 0"></path>
                </svg>
                <span id="notificationCount" class="site-icon-button__badge hidden">0</span>
            </button>
            <div class="site-profile">
                <div class="site-profile__avatar">KM</div>
                <div class="site-profile__meta">
                    <span class="site-profile__name">Krystal Mante</span>
                    <span class="site-profile__role">ADAS III</span>
                </div>
            </div>
        </div>
    </div>
    <div id="notificationPanel" class="site-notification hidden">
        <div class="site-notification__head">
            <div>
                <p class="site-notification__eyebrow">Notifications</p>
                <h2 class="site-notification__title">Transaction updates</h2>
            </div>
            <button id="clearNotifications" type="button" class="site-notification__clear">Clear</button>
        </div>
        <div id="notificationList" class="site-notification__list"></div>
        <div id="notificationEmpty" class="site-notification__empty">No transaction notifications yet.</div>
    </div>
</header>
