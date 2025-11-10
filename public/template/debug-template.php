<?php
// Extraer parámetros de la URL
$title = isset($_GET['title']) ? htmlspecialchars($_GET['title'], ENT_QUOTES, 'UTF-8') : 'Todogram - Películas';
$description = isset($_GET['description']) ? htmlspecialchars($_GET['description'], ENT_QUOTES, 'UTF-8') : 'Explora las mejores películas en Todogram.';
$image = isset($_GET['image']) ? htmlspecialchars($_GET['image'], ENT_QUOTES, 'UTF-8') : 'https://via.placeholder.com/1200x630';
$originalUrl = isset($_GET['originalUrl']) ? htmlspecialchars($_GET['originalUrl'], ENT_QUOTES, 'UTF-8') : 'https://todogram.free.nf';
$hash = isset($_GET['hash']) ? htmlspecialchars($_GET['hash'], ENT_QUOTES, 'UTF-8') : '';

// Construir la URL actual
$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http";
$currentUrl = $protocol . "://" . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];

// Headers para evitar caché
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Todogram">
    <meta property="og:title" content="<?php echo $title; ?>">
    <meta property="og:description" content="<?php echo $description; ?>">
    <meta property="og:image" content="<?php echo $image; ?>">
    <meta property="og:image:secure_url" content="<?php echo $image; ?>">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:url" content="<?php echo $currentUrl; ?>">
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="<?php echo $title; ?>">
    <meta name="twitter:description" content="<?php echo $description; ?>">
    <meta name="twitter:image" content="<?php echo $image; ?>">
    
    <title><?php echo $title; ?> - Todogram</title>
    
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .debug-box {
            background: white;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 { color: #333; }
        h2 { color: #666; margin-top: 20px; }
        pre {
            background: #f8f8f8;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
        }
        .meta-preview {
            border: 2px solid #ddd;
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
        }
        .meta-preview img {
            max-width: 100%;
            height: auto;
        }
    </style>
</head>
<body>
    <div class="debug-box">
        <h1>🔍 Debug - Meta Tags Preview</h1>
        
        <h2>Información recibida:</h2>
        <pre><?php print_r($_GET); ?></pre>
        
        <h2>Preview de Redes Sociales:</h2>
        <div class="meta-preview">
            <h3><?php echo $title; ?></h3>
            <p><?php echo $description; ?></p>
            <img src="<?php echo $image; ?>" alt="Preview image" onerror="this.src='https://via.placeholder.com/1200x630?text=Image+Error'">
        </div>
        
        <h2>Meta Tags generadas:</h2>
        <pre>&lt;meta property="og:title" content="<?php echo $title; ?>"&gt;
&lt;meta property="og:description" content="<?php echo $description; ?>"&gt;
&lt;meta property="og:image" content="<?php echo $image; ?>"&gt;
&lt;meta property="og:url" content="<?php echo $currentUrl; ?>"&gt;</pre>
        
        <h2>URL de la imagen:</h2>
        <p><a href="<?php echo $image; ?>" target="_blank"><?php echo $image; ?></a></p>
        
        <h2>Herramientas de validación:</h2>
        <ul>
            <li><a href="https://developers.facebook.com/tools/debug/?q=<?php echo urlencode($currentUrl); ?>" target="_blank">Facebook Debugger</a></li>
            <li><a href="https://cards-dev.twitter.com/validator?url=<?php echo urlencode($currentUrl); ?>" target="_blank">Twitter Card Validator</a></li>
        </ul>
    </div>
</body>
</html>
