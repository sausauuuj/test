<?php
declare(strict_types=1);

$logoCandidates = [
    'assets/images/DEPDev_Logo_High-res.svg.png',
    'assets/images/DEPDev_Logo_High-res.svg',
];

$siteLogo = null;
$authProfile = authenticated_user() ?? [];
$profileName = (string) ($authProfile['name'] ?? 'Kristy Mante');
$profileRole = (string) ($authProfile['role'] ?? 'ADAS III');
$profileAvatar = strtoupper(substr((string) ($authProfile['avatar'] ?? 'KM'), 0, 2));

foreach ($logoCandidates as $candidate) {
    if (is_file(__DIR__ . '/../' . $candidate)) {
        $siteLogo = $candidate;
        break;
    }
}
?>
<header class="screen-only site-header">
    <div class="site-header__inner">
        <div class="site-header__brand-block lg:hidden">
            <button id="openSidebar" type="button" class="rounded-xl border border-white/20 bg-white/10 p-2 text-white lg:hidden">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </button>
            <div class="site-header__brand-copy">
                <div class="site-mark">
                    <?php if ($siteLogo !== null): ?>
                        <img src="<?= escape_html($siteLogo); ?>" alt="DEPDev IX logo" class="site-mark__image">
                    <?php else: ?>
                        <span>IX</span>
                    <?php endif; ?>
                </div>
                <div>
                    <h1 class="site-title">DEPDev IX</h1>
                    <p class="site-subtitle">Inventory Management System</p>
                </div>
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
                <div class="site-profile__menu-wrap">
                    <button id="toggleProfileMenu" type="button" class="site-profile__avatar site-profile__avatar-button" aria-label="Open profile menu" aria-expanded="false">
                        <?= escape_html($profileAvatar); ?>
                    </button>
                    <div id="profileMenu" class="site-profile__menu hidden">
                        <a href="logout.php" class="site-profile__logout">
                            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <path d="m16 17 5-5-5-5"></path>
                                <path d="M21 12H9"></path>
                            </svg>
                            <span>Sign out</span>
                        </a>
                    </div>
                </div>
                <div class="site-profile__meta">
                    <span class="site-profile__name"><?= escape_html($profileName); ?></span>
                    <span class="site-profile__role"><?= escape_html($profileRole); ?></span>
                </div>
            </div>
        </div>
    </div>
    <div id="notificationPanel" class="site-notification hidden" aria-live="polite">
        <div class="site-notification__head">
            <div>
                <p class="site-notification__eyebrow">Notifications</p>
                <h2 class="site-notification__title">Transaction updates</h2>
            </div>
            <div class="site-notification__actions">
                <button id="markNotificationsRead" type="button" class="site-notification__action" aria-label="Mark all notifications as read">
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m5 12 4 4L19 6"></path>
                        <path d="m3 12 4 4"></path>
                    </svg>
                    <span>Mark as read</span>
                </button>
                <button id="clearNotifications" type="button" class="site-notification__action site-notification__action--clear" aria-label="Clear notifications">
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6h18"></path>
                        <path d="M8 6V4.8A1.8 1.8 0 0 1 9.8 3h4.4A1.8 1.8 0 0 1 16 4.8V6"></path>
                        <path d="M18 6v12.2A1.8 1.8 0 0 1 16.2 20H7.8A1.8 1.8 0 0 1 6 18.2V6"></path>
                        <path d="M10 10v6"></path>
                        <path d="M14 10v6"></path>
                    </svg>
                    <span>Clear</span>
                </button>
            </div>
        </div>
        <div class="site-notification__body">
            <div id="notificationList" class="site-notification__list"></div>
            <div id="notificationEmpty" class="site-notification__empty">No transaction notifications yet.</div>
        </div>
    </div>
</header>
<div id="notificationDetailsModal" class="fixed inset-0 z-[80] hidden items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
    <div class="officer-details-shell w-full max-w-[720px] max-h-[calc(100vh-2rem)] overflow-hidden rounded-[1.2rem] bg-white shadow-2xl">
        <div class="officer-details-head registration-modal__head" style="background: #1f5fb4;">
            <div>
                <p class="panel-eyebrow">NOTIFICATION DETAILS</p>
                <h3 id="notificationDetailsTitle" class="registration-modal__title">Notification</h3>
                <p id="notificationDetailsMeta" class="registration-modal__copy"></p>
            </div>
            <button id="closeNotificationDetailsModal" type="button" class="asset-entry-close registration-modal__close" aria-label="Close notification details">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
        </div>
        <div id="notificationDetailsContent" class="p-5 max-h-[calc(100vh-10rem)] overflow-y-auto space-y-4 pr-2"></div>
        <div class="officer-details-actions flex justify-end gap-2 border-t border-slate-200 bg-slate-50 p-3">
            <button id="closeNotificationDetailsButton" type="button" class="action-secondary">Close</button>
        </div>
    </div>
</div>
