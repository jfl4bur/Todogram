// Genera páginas estáticas de compartir con metatags OG/Twitter
// Lee public/data.json y crea archivos en public/share/<id>.html

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const dataPath = path.join(root, 'public', 'data.json');
const outDir = path.join(root, 'public', 'share');

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function escapeHtml(str){
  try { return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;'); } catch(e){ return ''; }
}

function pick(obj, keys){ const o={}; keys.forEach(k=>o[k]=obj?.[k]); return o; }

function buildHtml({ id, title, description, image }){
  const safeTitle = escapeHtml(title || 'Todogram');
  const descRaw = description || 'Explora este título en Todogram';
  const safeDesc = escapeHtml(descRaw.length > 200 ? (descRaw.substring(0,197)+'…') : descRaw);
  const safeImg = escapeHtml(image || 'https://via.placeholder.com/1200x630?text=Todogram');
  const redirect = `/#id=${encodeURIComponent(id)}&title=${encodeURIComponent(title||'')}`;
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle} - Todogram</title>
  <meta name="description" content="${safeDesc}" />
  <link rel="canonical" href="${redirect}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:image" content="${safeImg}" />
  <meta property="og:url" content="/share/${encodeURIComponent(id)}.html" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image" content="${safeImg}" />
  <meta name="robots" content="noindex" />
  <script>setTimeout(function(){ window.location.replace(${JSON.stringify(redirect)}); }, 1000);</script>
</head>
<body>
  <p>Redirigiendo a <a href="${redirect}">${redirect}</a>…</p>
</body>
</html>`;
}

function getFirstPoster(raw){
  if(!raw) return '';
  const keys = ['Portada','Imagen','Poster','Carteles'];
  for(const k of keys){
    if(raw[k]){
      if(k==='Carteles'){
        try{ const first = String(raw[k]).split(/,|\s+/).filter(Boolean)[0]; if(first) return first; }catch(e){}
      } else { return raw[k]; }
    }
  }
  return '';
}

function run(){
  console.log('[share] leyendo', dataPath);
  let items = [];
  try{
    const raw = fs.readFileSync(dataPath, 'utf-8');
    const parsed = JSON.parse(raw);
    items = Array.isArray(parsed) ? parsed : (parsed.items || parsed.data || []);
  }catch(e){
    console.error('No se pudo leer/parsear data.json:', e.message);
    process.exit(1);
  }

  ensureDir(outDir);
  let count = 0;
  items.forEach((d, idx)=>{
    const id = String(d['ID TMDB'] || d['ID'] || d['id'] || `i_${idx}`);
    if(!id || id==='undefined' || id==='null') return; // ignorar sin id
    const title = d['Título'] || d['Título original'] || d['Title'] || 'Sin título';
    const description = d['Synopsis'] || d['Sinopsis'] || d['Descripción'] || '';
    const image = getFirstPoster(d);
    const html = buildHtml({ id, title, description, image });
    const outPath = path.join(outDir, `${id}.html`);
    fs.writeFileSync(outPath, html, 'utf-8');
    count++;
  });
  console.log(`[share] generadas ${count} páginas en ${outDir}`);
}

run();
