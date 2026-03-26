<?php
declare(strict_types=1);

function app_config(string $name): array
{
    static $loaded = [];

    if (!isset($loaded[$name])) {
        $path = APP_ROOT . '/config/' . $name . '.php';

        if (!file_exists($path)) {
            throw new RuntimeException(sprintf('Configuration file [%s] was not found.', $name));
        }

        $loaded[$name] = require $path;
    }

    return $loaded[$name];
}

function request_data(): array
{
    $data = $_SERVER['REQUEST_METHOD'] === 'GET' ? $_GET : $_POST;
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

    if (str_contains($contentType, 'application/json')) {
        $rawBody = file_get_contents('php://input');
        $json = json_decode($rawBody ?: '[]', true);

        if (is_array($json)) {
            $data = array_merge($data, $json);
        }
    }

    return sanitize_array($data);
}

function sanitize_array(array $data): array
{
    $sanitized = [];

    foreach ($data as $key => $value) {
        if (is_array($value)) {
            $sanitized[$key] = sanitize_array($value);
            continue;
        }

        $sanitized[$key] = is_string($value) ? trim($value) : $value;
    }

    return $sanitized;
}

function escape_html(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}
