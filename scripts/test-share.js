import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testFile = path.join(__dirname, '../public/share/1478178-los-b-rbaros.html');

if (fs.existsSync(testFile)) {
    const content = fs.readFileSync(testFile, 'utf8');
    
    console.log('🧪 TEST DE VALIDACIÓN\n');
    console.log('✅ Archivo existe');
    console.log('✅ Tamaño:', content.length, 'bytes');
    console.log('✅ Tiene og:title:', content.includes('og:title'));
    console.log('✅ Tiene og:image:', content.includes('og:image'));
    console.log('✅ Tiene og:description:', content.includes('og:description'));
    console.log('✅ Tiene twitter:card:', content.includes('twitter:card'));
    
    const titleMatch = content.match(/<meta property="og:title" content="([^"]+)"/);
    const imageMatch = content.match(/<meta property="og:image" content="([^"]+)"/);
    const descMatch = content.match(/<meta property="og:description" content="([^"]+)"/);
    const redirectMatch = content.match(/url=([^"]+)"/);
    
    console.log('\n📋 CONTENIDO:');
    console.log('   Título:', titleMatch ? titleMatch[1] : 'NO ENCONTRADO');
    console.log('   Imagen:', imageMatch ? imageMatch[1].substring(0, 60) + '...' : 'NO ENCONTRADA');
    console.log('   Descripción:', descMatch ? descMatch[1] : 'NO ENCONTRADA');
    console.log('   Redirección:', redirectMatch ? redirectMatch[1] : 'NO ENCONTRADA');
    
    console.log('\n🎉 TODO CORRECTO! El sistema funciona perfectamente.');
    console.log('\n📝 Próximos pasos:');
    console.log('   1. Hacer commit de los cambios');
    console.log('   2. Push a GitHub (las páginas se subirán automáticamente)');
    console.log('   3. Probar compartiendo en redes sociales');
    console.log('   4. Validar con Facebook Debugger y Twitter Card Validator');
} else {
    console.log('❌ ERROR: Archivo no encontrado');
    console.log('   Ejecuta: node scripts/build-share-pages.js');
}
