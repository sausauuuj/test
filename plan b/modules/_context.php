<?php
declare(strict_types=1);

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
$classifications = ['PPE', 'Semi'];
$fundingSources = ['NEDA/DEPDev IX', 'RDC'];
$divisions = [
    'FAD' => 'FAD (Finance and Administrative Division)',
    'PDIPBD' => 'PDIPBD (Project Development, Investment Programming, and Budgeting Division)',
    'PFPD' => 'PFPD (Policy Formulation and Planning Division)',
    'PMED' => 'PMED (Project Monitoring and Evaluation Division)',
    'DRD' => 'DRD (Development Research Division)',
];
$conditions = ['Good', 'Serviceable', 'Needs Repair', 'Unserviceable'];
