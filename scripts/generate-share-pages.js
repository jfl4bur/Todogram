import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const DATA_PATH = path.join(ROOT_DIR, 'public', 'data.json');
const OUTPUT_DIR = path.join(ROOT_DIR, 'share-pages');

const SITE_BASE_URL = 'https://todogram.free.nf/';
const SHARE_BASE_URL = 'https://jfl4bur.github.io/Todogram/share-pages';
const DEFAULT_IMAGE_URL = 'https://jfl4bur.github.io/Todogram/public/images/logo.png';
const DEFAULT_DESCRIPTION = 'Descubre las mejores series y películas en Todogram.';
const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 630;

const EPISODE_KEYS = [
    'Título episodio',
    'Título episodio completo',
    'Título episodio 1',
    'Título episodio (completo)'
];

async function main() {
    const raw = await fs.readFile(DATA_PATH, 'utf8');
    const dataset = JSON.parse(raw);
    if (!Array.isArray(dataset) || dataset.length === 0) {
        console.warn('[share-pages] data.json vacío, no se generan páginas');
        return;
    }

    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await cleanPreviousPages();

    const counters = {
        movies: 0,
        series: 0,
        docu: 0,
        anime: 0,
        epSeries: 0,
        epDocu: 0,
        epAnime: 0,
        fallback: 0
    };

    const usedFileNames = new Set();
    const manifest = [];

    for (let index = 0; index < dataset.length; index++) {
        const entry = dataset[index];
        if (!entry || typeof entry !== 'object') {
            continue;
        }

        const category = toStringSafe(entry['Categoría']);
        const episodeTitle = pickFirstNonEmpty(EPISODE_KEYS.map((key) => entry[key]));
        const hasEpisode = episodeTitle !== '';

        const { shareId, kind } = resolveShareId({ category, hasEpisode, index }, counters);

        const baseTitle = pickFirstNonEmpty([
            hasEpisode ? episodeTitle : null,
            entry['Título'] ?? null,
            entry['Título original'] ?? null
        ], 'Contenido de Todogram');

        const description = shorten(pickFirstNonEmpty([
            entry['Synopsis'] ?? null,
            entry['Sinopsis'] ?? null,
            entry['Descripción'] ?? null
        ], DEFAULT_DESCRIPTION));

        const imageUrl = normaliseImageUrl(pickFirstNonEmpty([
            entry['Portada'] ?? null,
            entry['Carteles'] ?? null,
            entry['Slider'] ?? null
        ], DEFAULT_IMAGE_URL));

        const slug = normalizeSlug(baseTitle) || `item-${index}`;
        const hashSlug = slug;
        const redirectUrl = buildRedirectUrl(shareId, hashSlug);

        const safeIdSegment = sanitizeForPath(shareId) || `item-${index}`;
        const safeSlugSegment = sanitizeForPath(hashSlug) || `item-${index}`;
        let fileName = `${safeIdSegment}-${safeSlugSegment}.html`;
        let suffix = 2;
        while (usedFileNames.has(fileName)) {
            fileName = `${safeIdSegment}-${safeSlugSegment}-${suffix}.html`;
            suffix += 1;
        }
        usedFileNames.add(fileName);

        const canonicalUrl = `${SHARE_BASE_URL}/${fileName}`;
        const imageMime = detectImageMime(imageUrl);

        const html = buildHtml({
            title: baseTitle,
            description,
            imageUrl,
            imageMime,
            canonicalUrl,
            redirectUrl,
            shareId,
            slug: hashSlug,
            kind
        });

        await fs.writeFile(path.join(OUTPUT_DIR, fileName), html, 'utf8');

        manifest.push({
            shareId,
            slug,
            fileName,
            canonicalUrl,
            kind,
            title: baseTitle
        });
    }

    await fs.writeFile(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`[share-pages] Generadas ${manifest.length} páginas de compartición`);
}

async function cleanPreviousPages() {
    const entries = await fs.readdir(OUTPUT_DIR).catch(() => []);
    await Promise.all(entries.map((name) => {
        if (!name.endsWith('.html') && name !== 'manifest.json') {
            return Promise.resolve();
        }
        return fs.rm(path.join(OUTPUT_DIR, name), { force: true });
    }));
}

function resolveShareId({ category, hasEpisode, index }, counters) {
    switch (category) {
        case 'Películas':
            return { shareId: String(counters.movies++), kind: 'movie' };
        case 'Series':
            if (hasEpisode) {
                return { shareId: `ep_${counters.epSeries++}`, kind: 'seriesEpisode' };
            }
            return { shareId: `series_${counters.series++}`, kind: 'series' };
        case 'Documentales':
            if (hasEpisode) {
                return { shareId: `ep_docu_${counters.epDocu++}`, kind: 'docEpisode' };
            }
            return { shareId: `docu_${counters.docu++}`, kind: 'doc' };
        case 'Animes':
            if (hasEpisode) {
                return { shareId: `ep_anime_${counters.epAnime++}`, kind: 'animeEpisode' };
            }
            return { shareId: `anime_${counters.anime++}`, kind: 'anime' };
        default:
            return { shareId: `item_${counters.fallback++}_${index}`, kind: 'other' };
    }
}

function buildRedirectUrl(shareId, slug) {
    const base = SITE_BASE_URL.replace(/#.*$/, '').replace(/\/+$|$/, '/');
    const hashParts = [`id=${encodeURIComponent(shareId)}`];
    if (slug) {
        hashParts.push(`title=${encodeURIComponent(slug)}`);
    }
    return `${base}#${hashParts.join('&')}`;
}

function buildHtml({ title, description, imageUrl, imageMime, canonicalUrl, redirectUrl, shareId, slug, kind }) {
    const safeTitle = escapeHtml(title);
    const safeDescription = escapeHtml(description);
    const safeImage = escapeHtml(imageUrl);
    const safeCanonical = escapeHtml(canonicalUrl);
    const safeRedirect = escapeHtml(redirectUrl);
    const safeId = escapeHtml(shareId);
    const safeSlug = escapeHtml(slug);
    const subtitle = makeSubtitle(kind, title);

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDescription}">
    <meta name="robots" content="index,follow">
    <meta name="theme-color" content="#02040a">
    <meta property="og:locale" content="es_ES">

    <meta property="og:title" content="${safeTitle}">
    <meta property="og:description" content="${safeDescription}">
    <meta property="og:image" content="${safeImage}">
    <meta property="og:image:secure_url" content="${safeImage}">
    <meta property="og:image:type" content="${escapeHtml(imageMime)}">
    <meta property="og:image:width" content="${IMAGE_WIDTH}">
    <meta property="og:image:height" content="${IMAGE_HEIGHT}">
    <meta property="og:url" content="${safeCanonical}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Todogram">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${safeTitle}">
    <meta name="twitter:description" content="${safeDescription}">
    <meta name="twitter:url" content="${safeCanonical}">
    <meta name="twitter:image" content="${safeImage}">

    <link rel="canonical" href="${safeCanonical}">
    <style>
        :root { color-scheme: dark light; }
        body {
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: radial-gradient(circle at 20% 20%, rgba(78, 84, 200, 0.55), transparent 60%),
                        radial-gradient(circle at 80% 0%, rgba(255, 16, 95, 0.35), transparent 55%),
                        #02040a;
            color: #f5f7ff;
            text-align: center;
        }
        main {
            max-width: 480px;
            padding: 32px 24px;
            margin: 24px;
            border-radius: 18px;
            background: rgba(7, 12, 28, 0.85);
            box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55);
            backdrop-filter: blur(18px);
        }
        h1 { font-size: 1.9rem; margin: 0 0 0.35rem; }
        h2 { font-size: 1rem; font-weight: 500; margin: 0 0 1.4rem; opacity: 0.82; }
        p { line-height: 1.55; margin: 0 0 1.2rem; }
        img {
            max-width: 320px;
            width: 100%;
            border-radius: 14px;
            margin-bottom: 1.6rem;
            box-shadow: 0 22px 46px rgba(0, 0, 0, 0.45);
        }
        a.button {
            display: inline-block;
            padding: 0.85rem 1.95rem;
            border-radius: 999px;
            background: linear-gradient(135deg, #ff105f 0%, #fb7b6b 100%);
            color: #fff;
            text-decoration: none;
            font-weight: 600;
            letter-spacing: 0.02em;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        a.button:hover {
            transform: translateY(-2px);
            box-shadow: 0 18px 42px rgba(255, 16, 95, 0.35);
        }
        .status { opacity: 0.78; font-size: 0.92rem; }
        .meta { display: none; }
    </style>
</head>
<body>
    <main>
        <img src="${safeImage}" alt="${safeTitle}">
        <h1>${safeTitle}</h1>
        <h2>${escapeHtml(subtitle)}</h2>
        <p>${safeDescription}</p>
        <p class="status">Te redirigiremos automáticamente en un instante. Si no sucede, usa el botón.</p>
        <a class="button" href="${safeRedirect}">Ver en Todogram</a>
    </main>
    <script>
    (function(){
        var redirectUrl = ${JSON.stringify(redirectUrl)};
        var shareId = ${JSON.stringify(shareId)};
        var slug = ${JSON.stringify(slug)};
        if (typeof window !== 'undefined') {
            window.__todogramShare = { id: shareId, slug: slug };
            setTimeout(function(){ window.location.replace(redirectUrl); }, 200);
        }
    })();
    </script>
</body>
</html>`;
}

function makeSubtitle(kind, title) {
    switch (kind) {
        case 'movie':
            return 'Película disponible en Todogram';
        case 'series':
            return 'Serie disponible en Todogram';
        case 'doc':
            return 'Documental disponible en Todogram';
        case 'anime':
            return 'Anime disponible en Todogram';
        case 'seriesEpisode':
            return `Episodio especial de "${title}"`;
        case 'docEpisode':
            return 'Episodio de documental disponible en Todogram';
        case 'animeEpisode':
            return 'Episodio de anime disponible en Todogram';
        default:
            return 'Contenido disponible en Todogram';
    }
}

function normalizeSlug(value) {
    if (!value) return '';
    try {
        return value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    } catch (err) {
        return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }
}

function sanitizeForPath(value) {
    if (value == null) return '';
    return String(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();
}

function pickFirstNonEmpty(candidates, fallback = '') {
    for (const candidate of candidates) {
        if (candidate == null) continue;
        const value = toStringSafe(candidate);
        if (value !== '') return value;
    }
    return fallback;
}

function shorten(text, max = 180) {
    const safe = text.trim();
    if (safe.length <= max) {
        return safe;
    }
    return `${safe.slice(0, max - 1).trim()}…`;
}

function normaliseImageUrl(url) {
    if (!url || typeof url !== 'string') {
        return DEFAULT_IMAGE_URL;
    }
    let trimmed = url.trim();
    if (trimmed === '') {
        return DEFAULT_IMAGE_URL;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
        return DEFAULT_IMAGE_URL;
    }

    if (trimmed.includes('res.cloudinary.com') && trimmed.includes('/image/upload/')) {
        try {
            const parsed = new URL(trimmed);
            const parts = parsed.pathname.split('/image/upload/');
            if (parts.length === 2) {
                const [prefix, rest] = parts;
                const restParts = rest.split('/');
                const transformation = restParts[0] || '';
                let remaining = restParts.slice(1).join('/');
                const jpegDirective = 'f_jpg,q_auto:best';
                if (transformation && !/^v\d+/.test(transformation)) {
                    const hasExplicitFormat = /f_(jpg|auto)/.test(transformation);
                    const newTransform = hasExplicitFormat ? transformation : `${transformation},${jpegDirective}`;
                    restParts[0] = newTransform;
                } else {
                    remaining = transformation ? `${transformation}/${remaining}` : remaining;
                    restParts[0] = jpegDirective;
                }
                const newPath = `${prefix}/image/upload/${restParts.filter(Boolean).join('/')}`;
                parsed.pathname = newPath;
                trimmed = parsed.toString();
            }
        } catch (err) {}
    }

    return trimmed.replace(/^http:\/\//i, 'https://');
}

function detectImageMime(url) {
    const lower = (url || '').toLowerCase();
    if (lower.includes('f_jpg') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
        return 'image/jpeg';
    }
    if (lower.endsWith('.png')) {
        return 'image/png';
    }
    if (lower.endsWith('.gif')) {
        return 'image/gif';
    }
    if (lower.endsWith('.webp')) {
        return 'image/webp';
    }
    return 'image/jpeg';
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function toStringSafe(value) {
    if (value == null) return '';
    return String(value).trim();
}

main().catch((err) => {
    console.error('[share-pages] Error generando páginas de compartición:', err);
    process.exitCode = 1;
});
