<?php
declare(strict_types=1);

use App\Services\OfficerService;

$today = date('Y-m-d');
$todayLabel = date('F j, Y g:i A');
$propertyTypes = [
    'Computer Software',
    'Fixed Asset',
    'Furniture and Fixtures',
    'ICT Equipment',
    'Medicine Inventory',
    'Motor Vehicle',
    'Office Equipment',
];
$classifications = ['PPE', 'SEMI'];
$fundingSources = ['NEDA/DEPDev IX', 'RDC'];
$divisions = OfficerService::DIVISION_LABELS;
$conditions = ['Good', 'Serviceable', 'Needs Repair', 'Unserviceable'];
