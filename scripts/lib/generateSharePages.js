import fs from 'fs';
import path from 'path';

export function generateSharePages({ dataPath, shareDir }) {
  const raw = fs.readFileSync(dataPath, 'utf8');
  const data = JSON.parse(raw);
  if (!fs.existsSync(shareDir)) fs.mkdirSync(shareDir, { recursive: true });

  const slug = (t) => (t || 'todogram').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  let count = 0;

  data.forEach(item => {
    if (!item || item['Categoría'] !== 'Películas') return;
    const title = item['Título'] || 'Todogram';
    const description = (item['Synopsis'] || 'Explora esta película en Todogram').substring(0, 160);
    const image = item['Portada'] || 'https://via.placeholder.com/1200x630';
    const id = item['ID TMDB'] || '';
    const s = slug(title);
    const originalUrl = `https://todogram.free.nf/#id=${id}&title=${s}`;
    const filename = `${id}-${s}.html`;
    const filePath = path.join(shareDir, filename);
    const html = `<!DOCTYPE html>\n<html lang=\"es\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"><title>${title} - Todogram</title><meta name=\"title\" content=\"${title}\"><meta name=\"description\" content=\"${description}\"><meta property=\"og:type\" content=\"website\"><meta property=\"og:site_name\" content=\"Todogram\"><meta property=\"og:url\" content=\"https://jfl4bur.github.io/Todogram/public/share/${filename}\"><meta property=\"og:title\" content=\"${title}\"><meta property=\"og:description\" content=\"${description}\"><meta property=\"og:image\" content=\"${image}\"><meta property=\"og:image:secure_url\" content=\"${image}\"><meta property=\"og:image:width\" content=\"1200\"><meta property=\"og:image:height\" content=\"630\"><link rel=\"canonical\" href=\"https://jfl4bur.github.io/Todogram/public/share/${filename}\"><meta name=\"twitter:card\" content=\"summary_large_image\"><meta name=\"twitter:url\" content=\"https://jfl4bur.github.io/Todogram/public/share/${filename}\"><meta name=\"twitter:title\" content=\"${title}\"><meta name=\"twitter:description\" content=\"${description}\"><meta name=\"twitter:image\" content=\"${image}\"><script>try{window.location.replace('${originalUrl}')}catch(e){window.location.href='${originalUrl}'}</script><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff}.container{text-align:center;padding:20px}.spinner{border:4px solid rgba(255,255,255,.3);border-radius:50%;border-top:4px solid #fff;width:50px;height:50px;animation:spin 1s linear infinite;margin:0 auto 20px}@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}h1{margin:0;font-size:24px}p{opacity:.9;margin-top:10px}</style></head><body><div class=\"container\"><div class=\"spinner\"></div><h1>${title}</h1><p>${description}</p><p style=\"margin-top:20px;font-size:14px;opacity:.85\">Página de previsualización para compartir. Redireccionando...</p><p><a href=\"${originalUrl}\" style=\"display:inline-block;padding:10px 18px;background:#fff;color:#333;border-radius:6px;text-decoration:none;font-weight:600\">Ver en Todogram</a></p></div></body></html>`;
    fs.writeFileSync(filePath, html, 'utf8');
    count++;
  });

  const idx = `<!DOCTYPE html>\n<html lang=\"es\"><head><meta charset=\"UTF-8\"><title>Share Pages - Todogram</title></head><body><h1>📄 Páginas de Compartir</h1><p>Total generadas: ${count}</p><p>Formato: https://jfl4bur.github.io/Todogram/public/share/[id]-[slug].html</p></body></html>`;
  fs.writeFileSync(path.join(shareDir,'index.html'), idx, 'utf8');
  return count;
}
