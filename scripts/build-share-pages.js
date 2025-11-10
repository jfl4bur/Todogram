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
    const id = item['ID TMDB'] || item.id || ''; // Usar ID TMDB
    const titleSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const originalUrl = `https://jfl4bur.github.io/Todogram/#id=${id}&title=${titleSlug}`;
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
    <meta property="og:type" content="video.movie">
    <meta property="og:site_name" content="Todogram">
    <meta property="og:url" content="https://jfl4bur.github.io/Todogram/share/${filename}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${image}">
    <meta property="og:image:secure_url" content="${image}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:type" content="image/jpeg">
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="https://jfl4bur.github.io/Todogram/share/${filename}">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${image}">
    
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
        }
        .card {
            background: white;
            border-radius: 16px;
            overflow: hidden;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        .poster {
            width: 100%;
            height: 300px;
            object-fit: cover;
            display: block;
        }
        .content {
            padding: 24px;
        }
        h1 {
            color: #333;
            font-size: 24px;
            margin-bottom: 12px;
            line-height: 1.3;
        }
        .description {
            color: #666;
            font-size: 14px;
            line-height: 1.6;
            margin-bottom: 24px;
        }
        .btn {
            display: inline-block;
            width: 100%;
            padding: 14px 24px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
        }
        .logo {
            text-align: center;
            color: #999;
            font-size: 12px;
            margin-top: 16px;
        }
    </style>
</head>
<body>
    <div class="card">
        <img class="poster" src="${image}" alt="${title}" onerror="this.src='https://via.placeholder.com/500x300?text=Todogram'">
        <div class="content">
            <h1>${title}</h1>
            <p class="description">${description}</p>
            <a href="${originalUrl}" class="btn">Ver en Todogram</a>
            <div class="logo">TODOGRAM</div>
        </div>
    </div>
</body>
</html>`;
    
    return { filename, html };
}

// Procesar todas las películas
console.log('🚀 Generando páginas de compartir...\n');

if (Array.isArray(data)) {
    data.forEach((item, index) => {
        const id = item['ID TMDB'];
        const title = item['Título'] || item.title;
        const categoria = item['Categoría'];
        
        // Solo procesar películas que tengan ID TMDB
        if (item && id && title && categoria === 'Películas') {
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
