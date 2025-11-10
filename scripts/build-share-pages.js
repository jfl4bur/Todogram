import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import fetch from 'node-fetch';

const DATA_SOURCE_URL = process.env.DATA_SOURCE_URL ?? 'https://raw.githubusercontent.com/jfl4bur/Todogram/main/public/data.json';
const SITE_BASE_URL = process.env.SITE_BASE_URL ?? 'https://todogram.free.nf/';
const STATIC_BASE_URL = process.env.STATIC_SHARE_BASE_URL ?? 'https://jfl4bur.github.io/Todogram/share';
const DEFAULT_IMAGE_URL = process.env.DEFAULT_IMAGE_URL ?? 'https://jfl4bur.github.io/Todogram/public/images/logo.png';
const DEFAULT_DESCRIPTION = process.env.DEFAULT_DESCRIPTION ?? 'Descubre las mejores series y películas en Todogram.';
const DESCRIPTION_LIMIT = Number.parseInt(process.env.DESCRIPTION_LIMIT ?? '180', 10);

const args = process.argv.slice(2);
let outputRoot = 'share-static';
for (const arg of args) {
    if (arg.startsWith('--dest=')) {
        outputRoot = arg.slice('--dest='.length);
    } else if (arg === '--dest' || arg === '-d') {
        const value = args[args.indexOf(arg) + 1];
        if (!value) {
            console.error('Error: --dest requiere una ruta');
            process.exit(1);
        }
        outputRoot = value;
    }
}

const OUTPUT_ROOT = path.resolve(process.cwd(), outputRoot);
const SHARE_DIR = path.resolve(process.cwd(), 'share');

function normaliseSlug(value) {
    if (!value) {
        return null;
    }
    return String(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || null;
}

function pickFirstNonEmpty(candidates, fallback = '') {
    for (const candidate of candidates) {
        if (typeof candidate === 'string') {
            const trimmed = candidate.trim();
            if (trimmed) {
                return trimmed;
            }
        }
    }
    return fallback;
}

function shorten(text, limit) {
    const safe = text.trim();
    if (safe.length <= limit) {
        return safe;
    }
    return `${safe.slice(0, limit - 3).trimEnd()}...`;
}

function escapeAttr(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function buildRedirectUrl(itemId, slug) {
    if (!itemId) {
        return SITE_BASE_URL;
    }
    const hashParams = new URLSearchParams();
    hashParams.set('id', itemId);
    if (slug) {
        hashParams.set('title', slug);
    }
    const base = SITE_BASE_URL.replace(/[#?/]+$/, '');
    return `${base}/#${hashParams.toString()}`;
}

function buildHtml({
    title,
    description,
    imageUrl,
    canonicalUrl,
    redirectUrl,
}) {
    const escapedTitle = escapeAttr(title);
    const escapedDescription = escapeAttr(description);
    const escapedImageUrl = escapeAttr(imageUrl);
    const escapedCanonical = escapeAttr(canonicalUrl);
    const escapedRedirect = escapeAttr(redirectUrl);

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapedTitle}</title>
    <meta name="description" content="${escapedDescription}">

    <meta property="og:title" content="${escapedTitle}">
    <meta property="og:description" content="${escapedDescription}">
    <meta property="og:image" content="${escapedImageUrl}">
    <meta property="og:url" content="${escapedCanonical}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Todogram">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapedTitle}">
    <meta name="twitter:description" content="${escapedDescription}">
    <meta name="twitter:image" content="${escapedImageUrl}">

    <link rel="canonical" href="${escapedCanonical}">

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
        <img src="${escapedImageUrl}" alt="${escapedTitle}">
        <h1>${escapedTitle}</h1>
        <p>${escapedDescription}</p>
        <p class="status">Te redirigiremos automáticamente. Si no sucede en unos segundos, toca el botón.</p>
        <a class="button" href="${escapedRedirect}">Ir a Todogram</a>
    </main>
    <script>
    (function(){
        const redirectUrl = ${JSON.stringify(redirectUrl)};
        setTimeout(function(){ window.location.replace(redirectUrl); }, 150);
    })();
    </script>
</body>
</html>
`;
}

async function ensureDir(dirPath) {
    await fs.mkdir(dirPath, { recursive: true });
}

async function cleanOutputRoot(root) {
    try {
        await fs.rm(root, { recursive: true, force: true });
    } catch (error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }
    await ensureDir(root);
}

async function loadDataset() {
    const response = await fetch(DATA_SOURCE_URL, {
        headers: {
            'User-Agent': 'TodogramShareStaticBuilder/1.0 (+https://todogram.free.nf)',
            'Accept': 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error(`No se pudo descargar data.json (${response.status} ${response.statusText})`);
    }
    const json = await response.json();
    if (!Array.isArray(json)) {
        throw new Error('El dataset no es un array');
    }
    return json;
}

async function main() {
    try {
        if (OUTPUT_ROOT === SHARE_DIR) {
            throw new Error('El destino "share" contiene archivos del servidor. Usa otra carpeta (por ejemplo, share-static) y sube solo el contenido generado a GitHub Pages.');
        }

        console.log(`Generando páginas estáticas en ${OUTPUT_ROOT}...`);
        await cleanOutputRoot(OUTPUT_ROOT);

        const dataset = await loadDataset();
        const seenIds = new Set();
        let generated = 0;

        for (const entry of dataset) {
            if (!entry || typeof entry !== 'object') {
                continue;
            }

            const tmdbId = pickFirstNonEmpty([
                entry['ID TMDB'],
                entry['id'],
                entry['tmdb_id'],
            ], '').trim();

            if (!tmdbId) {
                continue;
            }

            if (seenIds.has(tmdbId)) {
                continue;
            }
            seenIds.add(tmdbId);

            const title = pickFirstNonEmpty([
                entry['Título'],
                entry['Título original'],
            ], 'Todogram - Series y Películas');

            const descriptionRaw = pickFirstNonEmpty([
                entry['Synopsis'],
                entry['Sinopsis'],
                entry['Descripción'],
            ], DEFAULT_DESCRIPTION);
            const description = shorten(descriptionRaw, DESCRIPTION_LIMIT);

            const imageUrl = pickFirstNonEmpty([
                entry['Portada'],
                entry['Carteles'],
                entry['Slider'],
            ], DEFAULT_IMAGE_URL);

            const slug = normaliseSlug(title) ?? `item-${tmdbId}`;

            const redirectUrl = buildRedirectUrl(tmdbId, slug);
            const canonicalUrl = `${STATIC_BASE_URL.replace(/\/$/, '')}/${encodeURIComponent(tmdbId)}/${encodeURIComponent(slug)}.html`;

            const html = buildHtml({
                title,
                description,
                imageUrl,
                canonicalUrl,
                redirectUrl,
            });

            const destDir = path.join(OUTPUT_ROOT, tmdbId);
            await ensureDir(destDir);
            const destFile = path.join(destDir, `${slug}.html`);
            await fs.writeFile(destFile, html, 'utf8');
            generated += 1;
        }

        console.log(`Páginas generadas: ${generated}`);
        console.log('Listo. Sube el contenido de la carpeta generada a GitHub Pages.');
    } catch (error) {
        console.error('Error generando páginas estáticas:', error.message ?? error);
        process.exit(1);
    }
}

await main();
