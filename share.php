<?php
header('Content-Type: text/html; charset=UTF-8');
// Evitar cachés agresivas de proxies/bots
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');
header('X-Robots-Tag: all');
// share.php: Genera metatags OG/Twitter para compartir un ítem por ID sin ejecutar JS
// Uso: /share.php?id=123

// Config: URL pública del data.json (hosteado en GitHub Pages u otro CDN)
$DATA_URL = 'https://jfl4bur.github.io/Todogram/public/data.json';

function is_https() {
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') return true;
    if (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') return true;
    return false;
}

function base_url() {
    $scheme = is_https() ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    return $scheme . '://' . $host;
}

function get_param($name, $default = '') {
    return isset($_GET[$name]) ? trim((string)$_GET[$name]) : $default;
}

function escape_html($str) {
    return htmlspecialchars((string)$str, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

// Detectar bots de redes sociales para evitar redirecciones
function is_bot() {
    $ua = strtolower($_SERVER['HTTP_USER_AGENT'] ?? '');
    if ($ua === '') return false;
    $bots = [
        'facebookexternalhit', 'facebot', 'twitterbot', 'slackbot', 'discordbot',
        'linkedinbot', 'whatsapp', 'telegrambot', 'pinterest', 'skypeuripreview',
        'googlebot', 'bingbot', 'yandex', 'baiduspider', 'bot', 'preview'
    ];
    foreach ($bots as $b) {
        if (strpos($ua, $b) !== false) return true;
    }
    return false;
}

// Utilidades para URLs de imagen
function make_absolute_url($url) {
    if (!$url) return '';
    if (preg_match('#^https?://#i', $url)) return $url; // ya es absoluta
    if (strpos($url, '//') === 0) return (is_https() ? 'https:' : 'http:') . $url;
    $origin = base_url();
    if ($url[0] !== '/') $url = '/' . $url;
    return $origin . $url;
}

function enforce_https($url) {
    if (strpos($url, 'http://') === 0) return 'https://' . substr($url, 7);
    if (strpos($url, '//') === 0) return 'https:' . $url;
    return $url;
}

function guess_mime($url) {
    $path = parse_url($url, PHP_URL_PATH) ?? '';
    $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    switch ($ext) {
        case 'jpg':
        case 'jpeg': return 'image/jpeg';
        case 'png': return 'image/png';
        case 'webp': return 'image/webp';
        case 'gif': return 'image/gif';
        default: return 'image/jpeg';
    }
}

function fetch_data($url) {
    // Intentar con file_get_contents; fallback a cURL si está deshabilitado allow_url_fopen
    $context = stream_context_create([
        'http' => ['timeout' => 5],
        'https' => ['timeout' => 5]
    ]);
    $json = @file_get_contents($url, false, $context);
    if ($json === false) {
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            $json = curl_exec($ch);
            curl_close($ch);
        }
    }
    if (!$json) return [];
    $data = json_decode($json, true);
    if (json_last_error() !== JSON_ERROR_NONE) return [];
    if (is_array($data)) {
        if (isset($data['items']) && is_array($data['items'])) return $data['items'];
        if (isset($data['data']) && is_array($data['data'])) return $data['data'];
        return $data; // ya es array de items
    }
    return [];
}

$id = get_param('id');
$titleParam = get_param('title');
$descParam = get_param('description');
$imgParam = get_param('image');

$items = [];
$item = null;
if ($id !== '') {
    $items = fetch_data($DATA_URL);
    foreach ($items as $row) {
        $candidates = [
            isset($row['ID TMDB']) ? (string)$row['ID TMDB'] : null,
            isset($row['ID']) ? (string)$row['ID'] : null,
            isset($row['id']) ? (string)$row['id'] : null,
        ];
        foreach ($candidates as $cand) {
            if ($cand !== null && (string)$cand === (string)$id) { $item = $row; break 2; }
        }
    }
}

$title = $titleParam;
if (!$title) {
    if ($item && isset($item['Título']) && $item['Título']) $title = $item['Título'];
    elseif ($item && isset($item['Título original']) && $item['Título original']) $title = $item['Título original'];
    else $title = 'Todogram';
}

$description = '';
if ($descParam) {
    $description = $descParam;
} elseif ($item) {
    foreach (['Synopsis','Sinopsis','Descripción'] as $k) {
        if (isset($item[$k]) && $item[$k]) { $description = (string)$item[$k]; break; }
    }
}
if (!$description) $description = 'Explora este título en Todogram';
if (mb_strlen($description, 'UTF-8') > 200) {
    $description = mb_substr($description, 0, 197, 'UTF-8') . '…';
}

$image = '';
if ($imgParam) {
    $image = $imgParam;
} elseif ($item) {
    if (!empty($item['Portada'])) $image = (string)$item['Portada'];
    elseif (!empty($item['Imagen'])) $image = (string)$item['Imagen'];
    elseif (!empty($item['Poster'])) $image = (string)$item['Poster'];
    elseif (!empty($item['Carteles'])) {
        $parts = preg_split('/[,\s]+/', (string)$item['Carteles']);
        if ($parts && isset($parts[0])) $image = $parts[0];
    }
}
// Fallback estable en el mismo dominio
if (!$image) $image = '/images/logo.png';

$imageAbs = make_absolute_url($image);
$imageSecure = enforce_https($imageAbs);
$imageMime = guess_mime($imageAbs);

$origin = base_url();
// URL de destino para usuarios (home con hash para abrir details)
$redirect = $origin . '/#id=' . rawurlencode($id) . '&title=' . rawurlencode($title);

// URL canónica de esta página de compartir
$canonical = $origin . $_SERVER['REQUEST_URI'];

// Importante: no redirigimos con 302 para evitar que algunos scrapers pierdan las metatags.
// La redirección para usuarios se hará con JS en el cliente (los bots no ejecutan JS).

?><!DOCTYPE html>
<html lang="es" prefix="og: http://ogp.me/ns#">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><?php echo escape_html($title); ?> - Todogram</title>
    <meta name="description" content="<?php echo escape_html($description); ?>" />
  <link rel="canonical" href="<?php echo escape_html($canonical); ?>" />
    <meta property="og:site_name" content="Todogram" />
    <meta property="og:locale" content="es_ES" />
    <meta property="og:type" content="website" />
  <meta property="og:title" content="<?php echo escape_html($title); ?>" />
  <meta property="og:description" content="<?php echo escape_html($description); ?>" />
    <meta property="og:image" content="<?php echo escape_html($imageAbs); ?>" />
    <meta property="og:image:secure_url" content="<?php echo escape_html($imageSecure); ?>" />
    <meta property="og:image:type" content="<?php echo escape_html($imageMime); ?>" />
    <meta property="og:image:alt" content="<?php echo escape_html($title); ?>" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:updated_time" content="<?php echo time(); ?>" />
  <meta property="og:url" content="<?php echo escape_html($canonical); ?>" />
  <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@todogram" />
  <meta name="twitter:title" content="<?php echo escape_html($title); ?>" />
  <meta name="twitter:description" content="<?php echo escape_html($description); ?>" />
    <meta name="twitter:image" content="<?php echo escape_html($imageAbs); ?>" />
    <meta name="twitter:image:alt" content="<?php echo escape_html($title); ?>" />
</head>
<body>
        <p>Vista previa para compartir. Abre el contenido en: <a href="<?php echo escape_html($redirect); ?>"><?php echo escape_html($redirect); ?></a>.</p>
</body>
</html>
