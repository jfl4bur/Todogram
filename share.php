<?php
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

$items = fetch_data($DATA_URL);
$item = null;
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

$title = $titleParam;
if (!$title) {
    if ($item && isset($item['Título']) && $item['Título']) $title = $item['Título'];
    elseif ($item && isset($item['Título original']) && $item['Título original']) $title = $item['Título original'];
    else $title = 'Todogram';
}

$description = '';
if ($item) {
    foreach (['Synopsis','Sinopsis','Descripción'] as $k) {
        if (isset($item[$k]) && $item[$k]) { $description = (string)$item[$k]; break; }
    }
}
if (!$description) $description = 'Explora este título en Todogram';
if (mb_strlen($description, 'UTF-8') > 200) {
    $description = mb_substr($description, 0, 197, 'UTF-8') . '…';
}

$image = '';
if ($item) {
    if (!empty($item['Portada'])) $image = (string)$item['Portada'];
    elseif (!empty($item['Imagen'])) $image = (string)$item['Imagen'];
    elseif (!empty($item['Poster'])) $image = (string)$item['Poster'];
    elseif (!empty($item['Carteles'])) {
        $parts = preg_split('/[,\s]+/', (string)$item['Carteles']);
        if ($parts && isset($parts[0])) $image = $parts[0];
    }
}
if (!$image) $image = 'https://via.placeholder.com/1200x630?text=Todogram';

$origin = base_url();
// URL de destino para usuarios (home con hash para abrir details)
$redirect = $origin . '/#id=' . rawurlencode($id) . '&title=' . rawurlencode($title);

// URL canónica de esta página de compartir
$canonical = $origin . $_SERVER['REQUEST_URI'];

?><!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><?php echo escape_html($title); ?> - Todogram</title>
  <meta name="description" content="<?php echo escape_html($description); ?>" />
  <link rel="canonical" href="<?php echo escape_html($canonical); ?>" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="<?php echo escape_html($title); ?>" />
  <meta property="og:description" content="<?php echo escape_html($description); ?>" />
  <meta property="og:image" content="<?php echo escape_html($image); ?>" />
  <meta property="og:url" content="<?php echo escape_html($canonical); ?>" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="<?php echo escape_html($title); ?>" />
  <meta name="twitter:description" content="<?php echo escape_html($description); ?>" />
  <meta name="twitter:image" content="<?php echo escape_html($image); ?>" />
  <meta name="robots" content="noindex" />
  <meta http-equiv="refresh" content="1;url=<?php echo escape_html($redirect); ?>" />
  <script>setTimeout(function(){ location.replace(<?php echo json_encode($redirect); ?>); }, 1000);</script>
</head>
<body>
  <p>Redirigiendo a <a href="<?php echo escape_html($redirect); ?>"><?php echo escape_html($redirect); ?></a>…</p>
</body>
</html>
