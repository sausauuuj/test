<?php
declare(strict_types=1);

use App\Services\AssetService;
use App\Services\InventoryService;
use App\Services\OfficerService;

$today = date('Y-m-d');
$todayLabel = date('F j, Y g:i A');

$assetService = new AssetService();
$inventoryService = new InventoryService();
$officerService = new OfficerService();
$filterOptions = $assetService->getFilterOptions();
$inventoryFilterOptions = $inventoryService->getFilterOptions();

$propertyTypes = $filterOptions['property_types'] ?? AssetService::PROPERTY_TYPES;
$classifications = $filterOptions['classifications'] ?? AssetService::CLASSIFICATIONS;
$fundingSources = $filterOptions['funding_sources'] ?? AssetService::FUNDING_SOURCES;
$divisions = $officerService->getDivisionLabels();
$editableDivisions = $officerService->getEditableDivisionLabels();
$editableDivisionDescriptions = $officerService->getEditableDivisionDescriptions();
$conditions = $filterOptions['conditions'] ?? AssetService::CONDITIONS;
$inventoryRequestTypes = $inventoryFilterOptions['request_types'] ?? InventoryService::REQUEST_TYPES;
$inventoryUnits = $inventoryFilterOptions['units'] ?? InventoryService::UNITS;
$inventoryStatuses = $inventoryFilterOptions['stock_statuses'] ?? InventoryService::STATUS_LABELS;
