import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateSharePages } from './lib/generateSharePages.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Leer el archivo data.json
const dataPath = path.join(__dirname, '../public/data.json');
const shareDir = path.join(__dirname, '../public/share');

// Crear directorio share si no existe
if (!fs.existsSync(shareDir)) {
    fs.mkdirSync(shareDir, { recursive: true });
}

console.log('🚀 Generando páginas de compartir...');
const generatedCount = generateSharePages({ dataPath, shareDir });
console.log(`✨ Completado! ${generatedCount} páginas generadas en public/share/`);
console.log('📝 Ver índice: public/share/index.html\n');
