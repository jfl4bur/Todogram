<?php
// Extraer parámetros de la URL
$title = isset($_GET['title']) ? htmlspecialchars($_GET['title'], ENT_QUOTES, 'UTF-8') : 'Todogram - Películas';
$description = isset($_GET['description']) ? htmlspecialchars($_GET['description'], ENT_QUOTES, 'UTF-8') : 'Explora las mejores películas en Todogram.';
$image = isset($_GET['image']) ? htmlspecialchars($_GET['image'], ENT_QUOTES, 'UTF-8') : 'https://via.placeholder.com/194x271';
$originalUrl = isset($_GET['originalUrl']) ? htmlspecialchars($_GET['originalUrl'], ENT_QUOTES, 'UTF-8') : 'https://todogram.free.nf';
$hash = isset($_GET['hash']) ? htmlspecialchars($_GET['hash'], ENT_QUOTES, 'UTF-8') : '';

// Construir la URL actual
$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http";
$currentUrl = $protocol . "://" . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];

// Construir URL de redirección
$redirectUrl = $originalUrl;
if (!empty($hash)) {
    // Asegurarse de que el hash comience con #
    $redirectUrl .= (strpos($hash, '#') === 0) ? $hash : '#' . $hash;
}

// Headers para evitar caché en bots de redes sociales
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
    <meta name="twitter:site" content="@Todogram">
    <meta name="twitter:title" content="<?php echo $title; ?>">
    <meta name="twitter:description" content="<?php echo $description; ?>">
    <meta name="twitter:image" content="<?php echo $image; ?>">
    
    <!-- Título de la página -->
    <title><?php echo $title; ?> - Todogram</title>
    
    <!-- Redirección automática -->
    <meta http-equiv="refresh" content="1;url=<?php echo $redirectUrl; ?>">
    
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .loading-container {
            text-align: center;
        }
        .spinner {
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top: 4px solid white;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        h1 {
            font-size: 24px;
            margin: 0;
        }
        p {
            font-size: 14px;
            opacity: 0.8;
            margin-top: 10px;
        }
    </style>
    
    <!-- Fallback con JavaScript por si meta refresh falla -->
    <script>
        setTimeout(function() {
            window.location.href = "<?php echo $redirectUrl; ?>";
        }, 1000);
    </script>
</head>
<body>
    <div class="loading-container">
        <div class="spinner"></div>
        <h1>Cargando...</h1>
        <p>Redirigiendo a Todogram</p>
    </div>
</body>
</html>
