import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Leer el archivo data.json
const dataPath = path.join(__dirname, '../public/data.json');
const shareDir = path.join(__dirname, '../public/share');

// Crear directorio share si no existe
if (!fs.existsSync(shareDir)) {
    fs.mkdirSync(shareDir, { recursive: true });
}

// Leer datos
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
let generatedCount = 0;

// Template HTML
function generateSharePage(item) {
    const title = item['Título'] || item.title || 'Todogram';
    const description = (item['Synopsis'] || item.description || 'Explora esta película en Todogram').substring(0, 160);
    const image = item['Portada'] || item.posterUrl || 'https://via.placeholder.com/1200x630';
    const id = item['ID TMDB'] || item.id || '';
    const titleSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const originalUrl = `https://todogram.free.nf/#id=${id}&title=${titleSlug}`;
    const filename = `${id}-${titleSlug}.html`;
    
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Primary Meta Tags -->
    <title>${title} - Todogram</title>
    <meta name="title" content="${title}">
    <meta name="description" content="${description}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Todogram">
    <meta property="og:url" content="https://jfl4bur.github.io/Todogram/public/share/${filename}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${image}">
    <meta property="og:image:secure_url" content="${image}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="https://jfl4bur.github.io/Todogram/public/share/${filename}">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${image}">
    
    <!-- Redirección -->
    <meta http-equiv="refresh" content="0;url=${originalUrl}">
    
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            text-align: center;
            padding: 20px;
        }
        .spinner {
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top: 4px solid white;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        h1 { margin: 0; font-size: 24px; }
        p { opacity: 0.9; margin-top: 10px; }
    </style>
    
    <script>
        // Redirección inmediata
        window.location.href = "${originalUrl}";
    </script>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <h1>${title}</h1>
        <p>Redirigiendo a Todogram...</p>
    </div>
</body>
</html>`;
    
    return { filename, html };
}

// Procesar todas las películas
console.log('🚀 Generando páginas de compartir...\n');

if (Array.isArray(data)) {
    data.forEach(item => {
        const id = item['ID TMDB'] || item.id;
        const title = item['Título'] || item.title;
        if (item && id && title) {
            const { filename, html } = generateSharePage(item);
            const filePath = path.join(shareDir, filename);
            fs.writeFileSync(filePath, html, 'utf8');
            generatedCount++;
            console.log(`✅ ${filename}`);
        }
    });
} else if (data.peliculas && Array.isArray(data.peliculas)) {
    data.peliculas.forEach(item => {
        if (item && item.id && item.title) {
            const { filename, html } = generateSharePage(item);
            const filePath = path.join(shareDir, filename);
            fs.writeFileSync(filePath, html, 'utf8');
            generatedCount++;
            console.log(`✅ ${filename}`);
        }
    });
}

// Generar página de índice
const indexHtml = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Share Pages - Todogram</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 { color: #333; }
        .stats {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stats h2 { margin-top: 0; color: #667eea; }
        code {
            background: #f0f0f0;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
        pre {
            background: #2d2d2d;
            color: #f8f8f2;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    <h1>📄 Share Pages Generadas</h1>
    <div class="stats">
        <h2>Estadísticas</h2>
        <p><strong>Total de páginas generadas:</strong> ${generatedCount}</p>
        <p><strong>Fecha de generación:</strong> ${new Date().toLocaleString('es-ES')}</p>
        
        <h3>Cómo usar:</h3>
        <p>Cada película tiene su propia página con meta tags optimizadas para redes sociales.</p>
        <p>Formato de URL: <code>https://jfl4bur.github.io/Todogram/public/share/[id]-[titulo].html</code></p>
        
        <h3>Ejemplo de uso en JavaScript:</h3>
        <pre>// En share-modal.js
const shareUrl = \`https://jfl4bur.github.io/Todogram/public/share/\${item.id}-\${titleSlug}.html\`;</pre>
    </div>
</body>
</html>`;

fs.writeFileSync(path.join(shareDir, 'index.html'), indexHtml, 'utf8');

console.log(`\n✨ Completado! ${generatedCount} páginas generadas en public/share/`);
console.log('📝 Ver índice: public/share/index.html\n');
