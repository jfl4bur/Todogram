import fetch from 'node-fetch';

const DATA_SOURCE_URL = process.env.DATA_SOURCE_URL ?? 'https://raw.githubusercontent.com/jfl4bur/Todogram/main/public/data.json';
const SHARE_BASE_URL = process.env.SHARE_BASE_URL ?? 'https://jfl4bur.github.io/Todogram/share-static';
const SAMPLE_LIMIT = Number.parseInt(process.env.SHARE_SAMPLE_LIMIT ?? '5', 10);
const USER_AGENT = 'TodogramShareVerifier/1.0 (+https://todogram.free.nf)';

function normaliseSlug(value) {
    if (!value) {
        return null;
    }
    return value
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

function selectEntries(dataset, requestedIds) {
    const candidates = [];
    const targetIds = requestedIds.length > 0 ? new Set(requestedIds) : null;
    const seenIds = new Set();

    for (const entry of dataset) {
        if (!entry || typeof entry !== 'object') {
            continue;
        }

        const tmdbId = pickFirstNonEmpty([
            entry['ID TMDB'],
            entry['id'],
            entry['tmdb_id'],
        ], null);

        if (!tmdbId) {
            continue;
        }

        if (targetIds && !targetIds.has(tmdbId)) {
            continue;
        }

        if (seenIds.has(tmdbId)) {
            continue;
        }

        seenIds.add(tmdbId);
        if (targetIds) {
            targetIds.delete(tmdbId);
        }

        candidates.push({
            tmdbId,
            entry,
        });

        if (!targetIds && candidates.length >= SAMPLE_LIMIT) {
            break;
        }
    }

    return candidates;
}

function extractMetaTags(html) {
    const meta = new Map();
    const metaRegex = /<meta\s+([^>]+)>/gi;
    let match;
    while ((match = metaRegex.exec(html)) !== null) {
        const attrs = match[1];
        const attrRegex = /(property|name|content)=["']([^"']*)["']/gi;
        let key = null;
        let content = null;
        let attrMatch;
        while ((attrMatch = attrRegex.exec(attrs)) !== null) {
            const attrName = attrMatch[1].toLowerCase();
            const attrValue = attrMatch[2];
            if (attrName === 'property' || attrName === 'name') {
                key = attrValue;
            } else if (attrName === 'content') {
                content = attrValue;
            }
        }
        if (key && typeof content === 'string') {
            meta.set(key, content);
        }
    }
    return meta;
}

function extractCanonical(html) {
    const canonicalRegex = /<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i;
    const match = canonicalRegex.exec(html);
    if (!match) {
        return null;
    }
    return match[1].replace(/&amp;/g, '&');
}

function buildShareUrl(tmdbId, slug) {
    const base = SHARE_BASE_URL;
    if (/\.php(?:$|\?)/i.test(base) || base.includes('?')) {
        const url = new URL(base);
        url.searchParams.set('id', tmdbId);
        if (slug) {
            url.searchParams.set('slug', slug);
        }
        return url.toString();
    }

    const cleanBase = base.replace(/\/$/, '');
    const safeSlug = slug || `item-${tmdbId}`;
    return `${cleanBase}/${encodeURIComponent(tmdbId)}/${encodeURIComponent(safeSlug)}.html`;
}

function checkDescription(metaDescription, expected) {
    if (!expected) {
        return true;
    }
    if (!metaDescription) {
        return false;
    }
    const baseline = expected.trim().toLowerCase();
    if (!baseline) {
        return true;
    }
    const probe = baseline.slice(0, Math.min(40, baseline.length));
    return metaDescription.toLowerCase().startsWith(probe);
}

async function loadDataset() {
    const response = await fetch(DATA_SOURCE_URL, {
        headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error(`Failed to load dataset: ${response.status} ${response.statusText}`);
    }
    return response.json();
}

async function fetchSharePage(url) {
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'FacebookExternalHit/1.1 (+https://www.facebook.com/externalhit_uatext.php)',
            'Accept': 'text/html',
        },
    });
    if (!response.ok) {
        throw new Error(`Share page request failed (${response.status}) for ${url}`);
    }
    const html = await response.text();
    return { html, finalUrl: response.url };
}

function buildExpected(entry) {
    const title = pickFirstNonEmpty([
        entry['Título'],
        entry['Título original'],
    ], 'Todogram - Series y Películas');

    const description = pickFirstNonEmpty([
        entry['Synopsis'],
        entry['Sinopsis'],
        entry['Descripción'],
    ], 'Descubre las mejores series y películas en Todogram.');

    const image = pickFirstNonEmpty([
        entry['Portada'],
        entry['Carteles'],
        entry['Slider'],
    ], null);

    return { title, description, image };
}

async function main() {
    try {
        const requestedIds = process.argv.slice(2);
        const dataset = await loadDataset();
        const candidates = selectEntries(dataset, requestedIds);

        if (candidates.length === 0) {
            console.error('No suitable entries found to test.');
            process.exit(1);
            return;
        }

        let hasFailure = false;

        for (const { tmdbId, entry } of candidates) {
            const slug = normaliseSlug(entry['Título'] ?? entry['Título original']);
            const shareUrl = buildShareUrl(tmdbId, slug);
            const { html, finalUrl } = await fetchSharePage(shareUrl);
            const meta = extractMetaTags(html);
            const canonical = extractCanonical(html);
            const expected = buildExpected(entry);

            const ogTitle = meta.get('og:title');
            const ogDescription = meta.get('og:description');
            const ogImage = meta.get('og:image');
            const ogUrl = meta.get('og:url');

            const issues = [];

            if (!ogTitle || !ogTitle.includes(expected.title)) {
                issues.push(`og:title mismatch (expected to include "${expected.title}", got "${ogTitle ?? 'missing'}")`);
            }

            if (!checkDescription(ogDescription, expected.description)) {
                issues.push('og:description does not start with dataset synopsis.');
            }

            if (expected.image && ogImage !== expected.image) {
                issues.push(`og:image mismatch (expected ${expected.image}, got ${ogImage ?? 'missing'})`);
            }

            if (!ogUrl || !ogUrl.startsWith(SHARE_BASE_URL)) {
                issues.push(`og:url mismatch (got ${ogUrl ?? 'missing'})`);
            }

            if (canonical && canonical !== finalUrl) {
                issues.push(`canonical href (${canonical}) differs from final URL (${finalUrl}).`);
            }

            if (issues.length > 0) {
                hasFailure = true;
                console.error(`✗ ${shareUrl}`);
                for (const detail of issues) {
                    console.error(`  - ${detail}`);
                }
            } else {
                console.log(`✓ ${shareUrl}`);
            }
        }

        if (hasFailure) {
            process.exit(1);
        }
    } catch (error) {
        console.error(error.message ?? error);
        process.exit(1);
    }
}

await main();
