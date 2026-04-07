<?php
declare(strict_types=1);

use App\Services\AssetService;
use App\Services\OfficerService;

$today = date('Y-m-d');
$todayLabel = date('F j, Y g:i A');

$assetService = new AssetService();
$officerService = new OfficerService();
$filterOptions = $assetService->getFilterOptions();

$propertyTypes = $filterOptions['property_types'] ?? AssetService::PROPERTY_TYPES;
$classifications = $filterOptions['classifications'] ?? AssetService::CLASSIFICATIONS;
$fundingSources = $filterOptions['funding_sources'] ?? AssetService::FUNDING_SOURCES;
$divisions = $officerService->getDivisionLabels();
$conditions = $filterOptions['conditions'] ?? AssetService::CONDITIONS;
