<?php
declare(strict_types=1);

const DATA_SOURCE_URL = 'https://raw.githubusercontent.com/jfl4bur/Todogram/main/public/data.json';
const SITE_BASE_URL = 'https://todogram.free.nf/';
const DEFAULT_IMAGE_URL = 'https://jfl4bur.github.io/Todogram/public/images/logo.png';
const LOCAL_DATA_PATHS = [
    __DIR__ . '/../public/data.json',
    __DIR__ . '/../public/data/data.json',
];
const DEFAULT_DESCRIPTION = 'Descubre las mejores series y películas en Todogram.';
const USER_AGENT = 'TodogramShareBot/1.0 (+https://todogram.free.nf)';
const DEFAULT_IMAGE_WIDTH = 1200;
const DEFAULT_IMAGE_HEIGHT = 630;

header('Content-Type: text/html; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

function readQueryParam(string $key): ?string {
    if (!isset($_GET[$key])) {
        return null;
    }
    $value = trim((string)$_GET[$key]);
    return $value === '' ? null : $value;
}

function buildRedirectUrl(?string $itemId, ?string $slug): string {
    if (!$itemId) {
        return SITE_BASE_URL;
    }

    $hash = 'id=' . rawurlencode($itemId);
    if ($slug) {
        $hash .= '&title=' . rawurlencode($slug);
    }

    return rtrim(SITE_BASE_URL, '#?/') . '/#' . $hash;
}

function fetchRemote(string $url): ?string {
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 6,
            'header' => "User-Agent: " . USER_AGENT . "\r\nAccept: application/json\r\n"
        ],
        'https' => [
            'method' => 'GET',
            'timeout' => 6,
            'header' => "User-Agent: " . USER_AGENT . "\r\nAccept: application/json\r\n"
        ]
    ]);

    $raw = @file_get_contents($url, false, $context);
    if ($raw !== false && $raw !== '') {
        return $raw;
    }

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 6,
            CURLOPT_USERAGENT => USER_AGENT,
            CURLOPT_HTTPHEADER => ['Accept: application/json']
        ]);
        $response = curl_exec($ch);
        curl_close($ch);
        if ($response !== false && $response !== '') {
            return $response;
        }
    }

    return null;
}

function fetchDataSet(): array {
    $raw = fetchRemote(DATA_SOURCE_URL);
    if ($raw === null) {
        foreach (LOCAL_DATA_PATHS as $path) {
            if (is_readable($path)) {
                $raw = @file_get_contents($path);
                if ($raw !== false && $raw !== '') {
                    break;
                }
            }
        }
    }

    if ($raw === null || $raw === false || $raw === '') {
        return [];
    }

    $data = json_decode($raw, true, flags: JSON_BIGINT_AS_STRING);
    return is_array($data) ? $data : [];
}

function normaliseSlug(?string $value): ?string {
    if (!$value) {
        return null;
    }
    $converted = iconv('UTF-8', 'ASCII//TRANSLIT', $value);
    if ($converted === false || $converted === null) {
        $converted = $value;
    }
    $value = strtolower((string)$converted);
    $value = preg_replace('/[^a-z0-9]+/', '-', $value);
    $value = trim((string)$value, '-');
    return $value === '' ? null : $value;
}

function pickFirstNonEmpty(array $candidates, string $default = ''): string {
    foreach ($candidates as $candidate) {
        if (is_string($candidate)) {
            $candidate = trim($candidate);
            if ($candidate !== '') {
                return $candidate;
            }
        }
    }
    return $default;
}

function shorten(string $text, int $max = 180): string {
    $safe = trim($text);
    $lengthFn = function_exists('mb_strlen') ? 'mb_strlen' : 'strlen';
    $substrFn = function_exists('mb_substr') ? 'mb_substr' : 'substr';

    if ($lengthFn($safe) <= $max) {
        return $safe;
    }
    return rtrim($substrFn($safe, 0, $max - 1)) . '…';
}

function escapeAttr(string $value): string {
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function normaliseImageUrl(?string $url): string {
    if (!is_string($url)) {
        return DEFAULT_IMAGE_URL;
    }

    $url = trim($url);
    if ($url === '') {
        return DEFAULT_IMAGE_URL;
    }

    if (!preg_match('#^https?://#i', $url)) {
        return DEFAULT_IMAGE_URL;
    }

    // Prefer JPEG for wider social sharing support
    if (stripos($url, 'res.cloudinary.com') !== false && stripos($url, '/image/upload/') !== false) {
        $parsed = parse_url($url);
        if ($parsed && isset($parsed['path'])) {
            $path = $parsed['path'];
            $query = isset($parsed['query']) ? '?' . $parsed['query'] : '';
            $fragment = isset($parsed['fragment']) ? '#' . $parsed['fragment'] : '';

            $segments = explode('/image/upload/', $path, 2);
            if (count($segments) === 2) {
                [$prefixPath, $rest] = $segments;
                $restSegments = explode('/', $rest, 2);
                $firstSegment = $restSegments[0] ?? '';
                $remaining = $restSegments[1] ?? '';

                $jpegDirective = 'f_jpg,q_auto:best';
                $hasTransformation = $firstSegment !== '' && stripos($firstSegment, 'v') !== 0;

                if ($hasTransformation) {
                    if (stripos($firstSegment, 'f_jpg') === false && stripos($firstSegment, 'f_auto') === false) {
                        $firstSegment .= ',' . $jpegDirective;
                    }
                } else {
                    $remaining = $firstSegment . ($remaining !== '' ? '/' . $remaining : '');
                    $firstSegment = $jpegDirective;
                }

                $newPath = $segments[0] . '/image/upload/' . $firstSegment;
                if ($remaining !== '') {
                    $newPath .= '/' . ltrim($remaining, '/');
                }

                $url = (isset($parsed['scheme']) ? $parsed['scheme'] : 'https') . '://' . ($parsed['host'] ?? '') . $newPath . $query . $fragment;
            }
        }
    }

    // Force HTTPS for consistency
    $url = preg_replace('#^http://#i', 'https://', $url);

    return $url !== '' ? $url : DEFAULT_IMAGE_URL;
}

function detectImageMime(string $url): string {
    $lower = strtolower($url);
    if (strpos($lower, 'f_jpg') !== false || strpos($lower, '.jpg') !== false || strpos($lower, '.jpeg') !== false) {
        return 'image/jpeg';
    }
    if (strpos($lower, '.png') !== false) {
        return 'image/png';
    }
    if (strpos($lower, '.gif') !== false) {
        return 'image/gif';
    }
    if (strpos($lower, '.webp') !== false) {
        return 'image/webp';
    }
    return 'image/jpeg';
}

$idParam = readQueryParam('id');
$slugParam = readQueryParam('slug');
$titleParam = readQueryParam('title');
$redirectParam = null;

$dataset = fetchDataSet();
$matched = null;

foreach ($dataset as $entry) {
    if (!is_array($entry)) {
        continue;
    }

    $entryId = isset($entry['ID TMDB']) ? trim((string)$entry['ID TMDB']) : '';
    if ($entryId !== '') {
        if ($idParam && strcasecmp($entryId, $idParam) === 0) {
            $matched = $entry;
            break;
        }
    }

    if ($matched) {
        break;
    }

    $entryTitle = isset($entry['Título']) ? (string)$entry['Título'] : '';
    $entryOriginal = isset($entry['Título original']) ? (string)$entry['Título original'] : '';
    $entrySlug = normaliseSlug($entryTitle) ?? normaliseSlug($entryOriginal);

    if ($slugParam && $entrySlug && strcasecmp($entrySlug, $slugParam) === 0) {
        $matched = $entry;
        break;
    }

    if ($titleParam && $entryTitle && strcasecmp($entryTitle, $titleParam) === 0) {
        $matched = $entry;
        break;
    }
}

$title = 'Todogram - Series y Películas';
$description = DEFAULT_DESCRIPTION;
$imageUrl = DEFAULT_IMAGE_URL;
$itemId = $idParam;

if ($matched) {
    $title = pickFirstNonEmpty([
        $matched['Título'] ?? null,
        $matched['Título original'] ?? null
    ], $title);

    $description = pickFirstNonEmpty([
        $matched['Synopsis'] ?? null,
        $matched['Sinopsis'] ?? null,
        $matched['Descripción'] ?? null
    ], $description);

    $imageUrl = normaliseImageUrl(pickFirstNonEmpty([
        $matched['Portada'] ?? null,
        $matched['Carteles'] ?? null,
        $matched['Slider'] ?? null
    ], $imageUrl));

    $description = shorten($description);

    if (!$itemId) {
        $itemId = isset($matched['ID TMDB']) ? trim((string)$matched['ID TMDB']) : null;
    }

    if (!$slugParam) {
        $slugParam = normaliseSlug($title);
    }
} else {
    $imageUrl = normaliseImageUrl($imageUrl);
}

$redirectUrl = buildRedirectUrl($itemId, $slugParam);

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? parse_url(SITE_BASE_URL, PHP_URL_HOST) ?? 'localhost';
$requestUri = $_SERVER['REQUEST_URI'] ?? '/share/index.php';
$sharePageUrl = $scheme . '://' . $host . $requestUri;

$canonicalUrl = $sharePageUrl;
$imageMime = detectImageMime($imageUrl);

if (!$matched) {
    http_response_code(404);
}

?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= escapeAttr($title) ?></title>
    <meta name="description" content="<?= escapeAttr($description) ?>">

    <meta property="og:title" content="<?= escapeAttr($title) ?>">
    <meta property="og:description" content="<?= escapeAttr($description) ?>">
    <meta property="og:image" content="<?= escapeAttr($imageUrl) ?>">
    <meta property="og:image:secure_url" content="<?= escapeAttr($imageUrl) ?>">
    <meta property="og:image:type" content="<?= escapeAttr($imageMime) ?>">
    <meta property="og:image:width" content="<?= DEFAULT_IMAGE_WIDTH ?>">
    <meta property="og:image:height" content="<?= DEFAULT_IMAGE_HEIGHT ?>">
    <meta property="og:url" content="<?= escapeAttr($canonicalUrl) ?>">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Todogram">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="<?= escapeAttr($title) ?>">
    <meta name="twitter:description" content="<?= escapeAttr($description) ?>">
    <meta name="twitter:url" content="<?= escapeAttr($canonicalUrl) ?>">
    <meta name="twitter:image" content="<?= escapeAttr($imageUrl) ?>">
    <meta name="twitter:image:src" content="<?= escapeAttr($imageUrl) ?>">

    <link rel="canonical" href="<?= escapeAttr($canonicalUrl) ?>">
    <style>
        :root { color-scheme: dark light; }
        body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            margin: 0;
            padding: 0;
            background: #02040a;
            color: #f5f7ff;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            text-align: center;
        }
        main {
            max-width: 480px;
            padding: 32px 24px;
            border-radius: 16px;
            background: rgba(12, 18, 36, 0.9);
            box-shadow: 0 24px 60px rgba(0,0,0,0.45);
            backdrop-filter: blur(18px);
        }
        h1 { font-size: 1.8rem; margin-bottom: 1rem; }
        p { line-height: 1.5; margin-bottom: 1.2rem; }
        img {
            max-width: 320px;
            width: 100%;
            border-radius: 12px;
            margin-bottom: 1.5rem;
            box-shadow: 0 18px 45px rgba(0,0,0,0.4);
        }
        a.button {
            display: inline-block;
            padding: 0.75rem 1.75rem;
            border-radius: 999px;
            background: #ff105f;
            color: #fff;
            text-decoration: none;
            font-weight: 600;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        a.button:hover {
            transform: translateY(-2px);
            box-shadow: 0 18px 38px rgba(255, 16, 95, 0.35);
        }
        .status { opacity: 0.8; font-size: 0.9rem; }
    </style>
</head>
<body>
    <main>
        <img src="<?= escapeAttr($imageUrl) ?>" alt="<?= escapeAttr($title) ?>">
        <h1><?= escapeAttr($title) ?></h1>
        <p><?= escapeAttr($description) ?></p>
        <p class="status">Te redirigiremos automáticamente. Si no sucede en unos segundos, toca el botón.</p>
    <a class="button" href="<?= escapeAttr($redirectUrl) ?>">Ir a Todogram</a>
    </main>
    <script>
    (function(){
        const redirectUrl = <?= json_encode($redirectUrl, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); ?>;
        setTimeout(function(){ window.location.replace(redirectUrl); }, 200);
    })();
    </script>
</body>
</html>
