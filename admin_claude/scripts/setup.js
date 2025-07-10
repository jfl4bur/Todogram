#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Colores para la consola
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Función para mostrar texto con color
function colorText(text, color) {
    return `${colors[color]}${text}${colors.reset}`;
}

// Función para mostrar banner
function showBanner() {
    console.log(colorText('\n╔══════════════════════════════════════════════════════════════╗', 'cyan'));
    console.log(colorText('║                    MOVIE ADMIN PANEL                        ║', 'cyan'));
    console.log(colorText('║                   Configuración Inicial                      ║', 'cyan'));
    console.log(colorText('╚══════════════════════════════════════════════════════════════╝', 'cyan'));
    console.log();
}

// Función para crear interfaz de readline
function createReadlineInterface() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

// Función para hacer preguntas
function askQuestion(rl, question) {
    return new Promise((resolve) => {
        rl.question(colorText(question, 'yellow'), (answer) => {
            resolve(answer.trim());
        });
    });
}

// Función para verificar estructura de directorios
function checkDirectoryStructure() {
    console.log(colorText('\n📁 Verificando estructura de directorios...', 'blue'));
    
    const requiredDirs = [
        'src',
        'src/config',
        'src/services',
        'src/renderer',
        'src/renderer/styles',
        'src/renderer/js',
        'src/renderer/js/components',
        'scripts',
        'assets'
    ];
    
    const missingDirs = [];
    
    requiredDirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            missingDirs.push(dir);
        }
    });
    
    if (missingDirs.length > 0) {
        console.log(colorText('❌ Directorios faltantes:', 'red'));
        missingDirs.forEach(dir => console.log(colorText(`   - ${dir}`, 'red')));
        
        console.log(colorText('\n📂 Creando directorios faltantes...', 'yellow'));
        missingDirs.forEach(dir => {
            fs.mkdirSync(dir, { recursive: true });
            console.log(colorText(`✅ Creado: ${dir}`, 'green'));
        });
    } else {
        console.log(colorText('✅ Estructura de directorios correcta', 'green'));
    }
}

// Función para verificar dependencias
function checkDependencies() {
    console.log(colorText('\n📦 Verificando dependencias...', 'blue'));
    
    if (!fs.existsSync('package.json')) {
        console.log(colorText('❌ package.json no encontrado', 'red'));
        return false;
    }
    
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = ['electron', 'dotenv'];
    const requiredDevDeps = ['electron-builder'];
    
    const missingDeps = [];
    const missingDevDeps = [];
    
    requiredDeps.forEach(dep => {
        if (!packageJson.dependencies || !packageJson.dependencies[dep]) {
            missingDeps.push(dep);
        }
    });
    
    requiredDevDeps.forEach(dep => {
        if (!packageJson.devDependencies || !packageJson.devDependencies[dep]) {
            missingDevDeps.push(dep);
        }
    });
    
    if (missingDeps.length > 0 || missingDevDeps.length > 0) {
        console.log(colorText('❌ Dependencias faltantes:', 'red'));
        if (missingDeps.length > 0) {
            console.log(colorText('   Dependencias:', 'red'));
            missingDeps.forEach(dep => console.log(colorText(`     - ${dep}`, 'red')));
        }
        if (missingDevDeps.length > 0) {
            console.log(colorText('   Dev Dependencies:', 'red'));
            missingDevDeps.forEach(dep => console.log(colorText(`     - ${dep}`, 'red')));
        }
        
        console.log(colorText('\n💡 Ejecuta: npm install', 'yellow'));
        return false;
    }
    
    console.log(colorText('✅ Dependencias correctas', 'green'));
    return true;
}

// Función para crear archivo .env
async function createEnvFile(rl) {
    console.log(colorText('\n🔑 Configuración de variables de entorno', 'blue'));
    
    if (fs.existsSync('.env')) {
        const overwrite = await askQuestion(rl, '⚠️  El archivo .env ya existe. ¿Sobrescribir? (y/N): ');
        if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
            console.log(colorText('✅ Manteniendo archivo .env existente', 'green'));
            return;
        }
    }
    
    console.log(colorText('\n📝 Configurando credenciales...', 'yellow'));
    console.log(colorText('💡 Puedes dejar en blanco y configurar después', 'cyan'));
    
    const notionToken = await askQuestion(rl, '\n🔹 Notion Integration Token: ');
    const notionDbId = await askQuestion(rl, '🔹 Notion Database ID: ');
    const cloudinaryName = await askQuestion(rl, '🔹 Cloudinary Cloud Name: ');
    const cloudinaryKey = await askQuestion(rl, '🔹 Cloudinary API Key: ');
    const cloudinarySecret = await askQuestion(rl, '🔹 Cloudinary API Secret: ');
    
    const envContent = `# Notion Configuration
NOTION_TOKEN=${notionToken}
NOTION_DATABASE_ID=${notionDbId}

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=${cloudinaryName}
CLOUDINARY_API_KEY=${cloudinaryKey}
CLOUDINARY_API_SECRET=${cloudinarySecret}

# App Configuration
NODE_ENV=development
DEBUG=true
`;
    
    fs.writeFileSync('.env', envContent);
    console.log(colorText('✅ Archivo .env creado correctamente', 'green'));
}

// Función para crear archivo .env.example
function createEnvExample() {
    console.log(colorText('\n📄 Creando archivo .env.example...', 'blue'));
    
    const envExampleContent = `# Notion Configuration
NOTION_TOKEN=your_notion_integration_token_here
NOTION_DATABASE_ID=your_notion_database_id_here

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name_here
CLOUDINARY_API_KEY=your_cloudinary_api_key_here
CLOUDINARY_API_SECRET=your_cloudinary_api_secret_here

# App Configuration
NODE_ENV=development
DEBUG=true
`;
    
    fs.writeFileSync('.env.example', envExampleContent);
    console.log(colorText('✅ Archivo .env.example creado', 'green'));
}

// Función para crear .gitignore
function createGitignore() {
    console.log(colorText('\n📄 Creando archivo .gitignore...', 'blue'));
    
    const gitignoreContent = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
dist/
build/
out/

# Electron
*.log
crash.log

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Temporary files
*.tmp
*.temp

# Coverage
coverage/
.coverage
.nyc_output

# Cache
.cache/
`;
    
    fs.writeFileSync('.gitignore', gitignoreContent);
    console.log(colorText('✅ Archivo .gitignore creado', 'green'));
}

// Función para crear electron-builder.json
function createElectronBuilder() {
    console.log(colorText('\n📄 Creando archivo electron-builder.json...', 'blue'));
    
    const builderConfig = {
        "appId": "com.movieadmin.app",
        "productName": "Movie Admin Panel",
        "directories": {
            "output": "dist"
        },
        "files": [
            "src/**/*",
            "node_modules/**/*",
            "package.json"
        ],
        "extraFiles": [
            {
                "from": "assets",
                "to": "assets",
                "filter": ["**/*"]
            }
        ],
        "win": {
            "target": "nsis",
            "icon": "assets/icon.ico"
        },
        "mac": {
            "target": "dmg",
            "icon": "assets/icon.icns"
        },
        "linux": {
            "target": "AppImage",
            "icon": "assets/icon.png"
        },
        "nsis": {
            "oneClick": false,
            "allowToChangeInstallationDirectory": true
        }
    };
    
    fs.writeFileSync('electron-builder.json', JSON.stringify(builderConfig, null, 2));
    console.log(colorText('✅ Archivo electron-builder.json creado', 'green'));
}

// Función para crear assets básicos
function createAssets() {
    console.log(colorText('\n🎨 Creando estructura de assets...', 'blue'));
    
    const assetsDir = 'assets';
    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
    }
    
    // Crear README para assets
    const assetsReadme = `# Assets

Esta carpeta contiene los recursos estáticos de la aplicación:

- **icon.png** - Icono principal de la aplicación (256x256px)
- **icon.ico** - Icono para Windows
- **icon.icns** - Icono para macOS
- **images/** - Imágenes adicionales de la aplicación

## Notas

- Los iconos deben ser cuadrados y en alta resolución
- Se recomienda usar PNG con transparencia
- Para generar iconos multi-formato, puedes usar herramientas como electron-icon-maker
`;
    
    fs.writeFileSync(path.join(assetsDir, 'README.md'), assetsReadme);
    console.log(colorText('✅ Estructura de assets creada', 'green'));
}

// Función para verificar archivos del proyecto
function checkProjectFiles() {
    console.log(colorText('\n📋 Verificando archivos del proyecto...', 'blue'));
    
    const files = [
        'src/main.js',
        'src/preload.js',
        'src/config/config.js',
        'src/services/notion-service.js',
        'src/services/cloudinary-service.js',
        'src/renderer/index.html',
        'src/renderer/styles/main.css',
        'src/renderer/js/app.js',
        'src/renderer/js/components/movie-card.js',
        'src/renderer/js/components/movie-form.js'
    ];
    
    const missingFiles = [];
    const incompleteFiles = [];
    
    files.forEach(file => {
        if (!fs.existsSync(file)) {
            missingFiles.push(file);
        } else {
            // Verificar si el archivo está vacío o muy pequeño
            const stats = fs.statSync(file);
            if (stats.size < 100) { // Archivos menores a 100 bytes probablemente están incompletos
                incompleteFiles.push(file);
            }
        }
    });
    
    if (missingFiles.length > 0) {
        console.log(colorText('❌ Archivos faltantes:', 'red'));
        missingFiles.forEach(file => console.log(colorText(`   - ${file}`, 'red')));
    }
    
    if (incompleteFiles.length > 0) {
        console.log(colorText('⚠️  Archivos posiblemente incompletos:', 'yellow'));
        incompleteFiles.forEach(file => console.log(colorText(`   - ${file}`, 'yellow')));
    }
    
    if (missingFiles.length === 0 && incompleteFiles.length === 0) {
        console.log(colorText('✅ Todos los archivos del proyecto están presentes', 'green'));
    }
    
    return { missingFiles, incompleteFiles };
}

// Función para mostrar resumen final
function showSummary() {
    console.log(colorText('\n╔══════════════════════════════════════════════════════════════╗', 'cyan'));
    console.log(colorText('║                        RESUMEN                               ║', 'cyan'));
    console.log(colorText('╚══════════════════════════════════════════════════════════════╝', 'cyan'));
    
    console.log(colorText('\n✅ Configuración completada exitosamente', 'green'));
    console.log(colorText('\n📝 Próximos pasos:', 'blue'));
    console.log(colorText('   1. Configura las variables de entorno en .env', 'yellow'));
    console.log(colorText('   2. Ejecuta: npm install', 'yellow'));
    console.log(colorText('   3. Ejecuta: npm start', 'yellow'));
    console.log(colorText('   4. Añade tus iconos en la carpeta assets/', 'yellow'));
    
    console.log(colorText('\n💡 Comandos útiles:', 'blue'));
    console.log(colorText('   - npm start          # Ejecutar en modo desarrollo', 'cyan'));
    console.log(colorText('   - npm run build      # Construir para producción', 'cyan'));
    console.log(colorText('   - npm run dist       # Crear ejecutable', 'cyan'));
    
    console.log(colorText('\n🎉 ¡Listo para desarrollar!', 'green'));
}

// Función principal
async function main() {
    showBanner();
    
    const rl = createReadlineInterface();
    
    try {
        // Verificar estructura de directorios
        checkDirectoryStructure();
        
        // Verificar dependencias
        checkDependencies();
        
        // Crear archivos de configuración
        createEnvExample();
        createGitignore();
        createElectronBuilder();
        createAssets();
        
        // Configurar variables de entorno
        await createEnvFile(rl);
        
        // Verificar archivos del proyecto
        const { missingFiles, incompleteFiles } = checkProjectFiles();
        
        if (missingFiles.length > 0 || incompleteFiles.length > 0) {
            console.log(colorText('\n⚠️  Algunos archivos del proyecto necesitan atención', 'yellow'));
            console.log(colorText('   Revisa los archivos marcados arriba', 'yellow'));
        }
        
        // Mostrar resumen
        showSummary();
        
    } catch (error) {
        console.error(colorText(`\n❌ Error durante la configuración: ${error.message}`, 'red'));
        process.exit(1);
    } finally {
        rl.close();
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    main();
}

module.exports = {
    main,
    checkDirectoryStructure,
    checkDependencies,
    createEnvFile,
    createEnvExample,
    createGitignore,
    createElectronBuilder,
    createAssets,
    checkProjectFiles
};