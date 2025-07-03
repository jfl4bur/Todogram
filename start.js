// start.js
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { Client } from '@notionhq/client';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import readline from 'readline';
import { execSync } from 'child_process';
import ora from 'ora';
import os from 'os';
import chalk from 'chalk';

// Cargar variables de entorno
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID;
const tmdbApiKey = process.env.TMDB_API_KEY;

// Limites de la API de Notion: 3 requests por segundo (333ms entre requests)
const NOTION_RATE_LIMIT = 350; // Un poco más conservador
// TMDB permite 40 requests por 10 segundos - optimizamos para procesamiento paralelo
const TMDB_RATE_LIMIT = 100; // Reducido para procesamiento paralelo

const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

const color = {
  reset: "\x1b[0m",
  blue: "\x1b[34m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bright: "\x1b[1m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m"
};

let lastNotionInfo = null;

// Función para centrar texto
function centerText(text, width) {
  const padding = Math.max(0, width - getDisplayLength(text));
  const leftPadding = Math.floor(padding / 2);
  return ' '.repeat(leftPadding) + text + ' '.repeat(padding - leftPadding);
}

// Función para imprimir el encabezado con logo
function printHeader() {
  const totalWidth = 80;
  const border = '═'.repeat(totalWidth);
  
  console.log(chalk.cyan(`╔${border}╗`));
  console.log(chalk.cyan(`║${chalk.blue(' '.repeat(totalWidth))}║`));
  console.log(chalk.cyan(`║${chalk.blue('     ████████╗ ██████╗ ██████╗  ██████╗  ██████╗ ██████╗  █████╗ ███╗   ███╗    ')}║`));
  console.log(chalk.cyan(`║${chalk.blue('     ╚══██╔══╝██╔═══██╗██╔══██╗██╔═══██╗██╔════╝ ██╔══██╗██╔══██╗████╗ ████║    ')}║`));
  console.log(chalk.cyan(`║${chalk.blue('        ██║   ██║   ██║██║  ██║██║   ██║██║  ███╗██████╔╝███████║██╔████╔██║    ')}║`));
  console.log(chalk.cyan(`║${chalk.blue('        ██║   ██║   ██║██║  ██║██║   ██║██║   ██║██╔══██╗██╔══██║██║╚██╔╝██║    ')}║`));
  console.log(chalk.cyan(`║${chalk.blue('        ██║   ╚██████╔╝██████╔╝╚██████╔╝╚██████╔╝██║  ██║██║  ██║██║ ╚═╝ ██║    ')}║`));
  console.log(chalk.cyan(`║${chalk.blue('        ╚═╝    ╚═════╝ ╚═════╝  ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝    ')}║`));
  console.log(chalk.cyan(`║${' '.repeat(totalWidth)}║`));
  console.log(chalk.cyan(`║${chalk.yellow(centerText('🔥 SISTEMA DE GESTIÓN TODOGRAM 🔥', totalWidth))}║`));
  console.log(chalk.cyan(`║${' '.repeat(totalWidth)}║`));
  console.log(chalk.cyan(`║${chalk.blue(centerText(`NODE:${process.version} │ RAM:${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)}MB`, totalWidth))}║`));
  console.log(chalk.cyan(`║${' '.repeat(totalWidth)}║`));
  console.log(chalk.cyan(`╚${border}╝`));
}

// Funciones mejoradas para extraer datos de Notion
const getText = (property) => {
  if (!property) return '';
  
  // Rich text
  if (property.rich_text && property.rich_text.length > 0) {
    return property.rich_text.map(text => text.plain_text).join('');
  }
  
  // Title
  if (property.title && property.title.length > 0) {
    return property.title.map(text => text.plain_text).join('');
  }
  
  // Plain text
  if (property.plain_text) {
    return property.plain_text;
  }
  
  // Formula result (para campos calculados)
  if (property.formula && property.formula.string) {
    return property.formula.string;
  }
  
  return '';
};

const getNumber = (property) => {
  if (!property) return '';
  if (property.number !== null && property.number !== undefined) {
    return property.number.toString();
  }
  return '';
};

const getSelect = (property) => {
  if (!property) return '';
  if (property.select && property.select.name) {
    return property.select.name;
  }
  return '';
};

const getMultiSelect = (property) => {
  if (!property) return '';
  if (property.multi_select && Array.isArray(property.multi_select)) {
    return property.multi_select.map(item => item.name).join(', ');
  }
  return '';
};

const getDate = (property) => {
  if (!property) return '';
  if (property.date && property.date.start) {
    return property.date.start;
  }
  return '';
};

const getFileUrl = (property) => {
  if (!property || !property.files || !Array.isArray(property.files)) return '';
  const file = property.files.find((f) => f.type === 'external' || f.type === 'file');
  return file?.external?.url || file?.file?.url || '';
};

const getUrl = (property) => {
  if (!property) return '';
  if (property.url) {
    return property.url;
  }
  return '';
};

// Función para truncar texto y mantener ancho fijo
const truncateText = (text, maxLength) => {
  if (!text) return ''.padEnd(maxLength, ' ');
  if (text.length <= maxLength) return text.padEnd(maxLength, ' ');
  return text.substring(0, maxLength - 3) + '...';
};

// Tabla para campos faltantes
const missingFieldsTable = [];

// Función que cuenta caracteres de manera más precisa para terminales
function getDisplayLength(text) {
    // Remover códigos ANSI
    const clean = text.replace(/\x1b\[[0-9;]*m/g, '');
    
    // Contar caracteres, considerando que algunos emojis ocupan 2 espacios
    let length = 0;
    for (const char of clean) {
        // La mayoría de emojis ocupan 2 espacios en terminal
        if (char.codePointAt(0) > 0x1F600) {
            length += 2;
        } else {
            length += 1;
        }
    }
    return length;
}

const logProgress = (count, total, status, missingFields = [], batchSize = 10, notionInfo = null) => {
  if (notionInfo) {
    lastNotionInfo = notionInfo;
  }

  const percent = Math.floor((count / total) * 100);
  const filled = Math.floor(percent / 4);
  const filledBar = '█'.repeat(filled);
  const emptyBar = '░'.repeat(25 - filled);
  const bar = `\x1b[34m${filledBar}\x1b[38;5;75m${emptyBar}\x1b[0m`;
  const movieTitle = status.replace('Procesando: ', '');
  const truncatedTitle = truncateText(movieTitle, 40);
  const percentText = `\x1b[1m\x1b[31m${percent.toString().padStart(3, ' ')}%\x1b[0m`;
  const countText = `\x1b[1m\x1b[33m${count.toString().padStart(3, ' ')}/${total}\x1b[0m`;

  const lines = [];

  lines.push(`\x1b[999F`);
  lines.push(`\x1b[1m\x1b[36m┌──────────────────────────────────────────────────────────────────────────────────────┐\x1b[0m`);
  lines.push(`\x1b[1m\x1b[36m│                              \x1b[33m🎬 PROCESANDO PELÍCULAS 🎬\x1b[36m                               │\x1b[0m`);
  lines.push(`\x1b[1m\x1b[36m├──────────────────────────────────────────────────────────────────────────────────────┤\x1b[0m`);

  if (lastNotionInfo) {
    lines.push(`\x1b[1m\x1b[36m│ \x1b[34m🔰 Extrayendo datos de Notion:\x1b[0m \x1b[32mLote ${lastNotionInfo.currentBatch} (${lastNotionInfo.entriesInBatch} entradas)\x1b[0m${' '.repeat(30)}    \x1b[36m│\x1b[0m`);

    const infoLine =
      `📊 Total extraído: \x1b[1m\x1b[32m${lastNotionInfo.totalExtracted.toString().padStart(3, ' ')}\x1b[0m ` +
      `│ Total lotes: \x1b[1m\x1b[32m${lastNotionInfo.currentBatch.toString().padStart(2, ' ')}\x1b[0m ` +
      `│ Estado: \x1b[32m${lastNotionInfo.status}\x1b[0m`;
    const visibleLength = getDisplayLength(infoLine);
    const padding = Math.max(0, 86 - visibleLength);
    lines.push(`\x1b[1m\x1b[36m│${infoLine}${' '.repeat(padding)}│\x1b[0m`);

    lines.push(`\x1b[1m\x1b[36m├──────────────────────────────────────────────────────────────────────────────────────┤\x1b[0m`);
  }

  lines.push(`\x1b[1m\x1b[36m│ \x1b[33m📚 Total películas: \x1b[1m\x1b[32m${total.toString().padStart(3, ' ')}\x1b[0m \x1b[33m│ Procesamiento paralelo: \x1b[1m\x1b[32m${batchSize.toString().padStart(2, ' ')}\x1b[0m \x1b[33mhilos simultáneos\x1b[0m             \x1b[36m   │\x1b[0m`);
  lines.push(`\x1b[1m\x1b[36m├──────────────────────────────────────────────────────────────────────────────────────┤\x1b[0m`);
  lines.push(`│ ${bar} │ ${percentText} │ ${countText} │ \x1b[1m\x1b[32m${truncatedTitle.padEnd(40)}   │\x1b[0m`);
  lines.push(`\x1b[1m\x1b[36m├──────────────────────────────────────────────────────────────────────────────────────┤\x1b[0m`);
  lines.push(`\x1b[1m\x1b[36m│                              \x1b[31m⚠️  CAMPOS FALTANTES ⚠️\x1b[36m                                  │\x1b[0m`);
  lines.push(`\x1b[1m\x1b[36m├──────────────────────────────────────────────────────────────────────────────────────┤\x1b[0m`);
  lines.push(`\x1b[1m\x1b[36m│ \x1b[1m\x1b[33mTÍTULO                                 \x1b[36m│ \x1b[1m\x1b[31mCAMPOS FALTANTES\x1b[36m                             │\x1b[0m`);
  lines.push(`\x1b[1m\x1b[36m├──────────────────────────────────────────────────────────────────────────────────────┤\x1b[0m`);

  const recentMissing = missingFieldsTable.slice(-12);
  for (let i = 0; i < 12; i++) {
    const entry = recentMissing[i];
    if (entry) {
      const title = truncateText(entry.title, 38);
      const fields = truncateText(entry.fields.join(', '), 44);
      lines.push(`\x1b[1m\x1b[36m│ \x1b[33m${title}\x1b[36m │ \x1b[31m${fields}\x1b[36m`);
    } else {
      lines.push(`\x1b[36m│ ${' '.repeat(86)}│\x1b[0m`);
    }
  }

  if (missingFieldsTable.length > 12) {
    const remaining = missingFieldsTable.length - 12;
    const remainingText = truncateText(`... y ${remaining} más`, 84);
    lines.push(`\x1b[36m│\x1b[2m\x1b[37m ${remainingText}\x1b[0m  │\x1b[0m`);
  } else {
    lines.push(`\x1b[36m│ ${' '.repeat(86)}│\x1b[0m`);
  }

  lines.push(`\x1b[1m\x1b[36m└──────────────────────────────────────────────────────────────────────────────────────┘\x1b[0m`);

  process.stdout.write(lines.join('\n'));
};

// Cache para datos de TMDB para evitar requests duplicados
const tmdbCache = new Map();

async function fetchTMDBDetails(tmdbId, title) {
  const cacheKey = tmdbId || title;
  
  if (tmdbCache.has(cacheKey)) {
    return tmdbCache.get(cacheKey);
  }

  let endpoint = tmdbId
    ? `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${tmdbApiKey}&language=es-ES&append_to_response=videos,credits`
    : `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(title)}&api_key=${tmdbApiKey}&language=es-ES`;

  try {
    await delay(TMDB_RATE_LIMIT); // Rate limiting para TMDB
    
    const res = await axios.get(endpoint);
    let movieData = null;
    
    if (tmdbId) {
      movieData = res.data;
    } else {
      const found = res.data.results?.[0];
      if (!found) {
        tmdbCache.set(cacheKey, null);
        return null;
      }
      
      await delay(TMDB_RATE_LIMIT);
      const detailRes = await axios.get(`https://api.themoviedb.org/3/movie/${found.id}?api_key=${tmdbApiKey}&language=es-ES&append_to_response=videos,credits`);
      movieData = detailRes.data;
    }
    
    tmdbCache.set(cacheKey, movieData);
    return movieData;
  } catch (error) {
    console.error(`Error fetching TMDB data for ${cacheKey}:`, error.message);
    tmdbCache.set(cacheKey, null);
    return null;
  }
}

async function getAllPages() {
  let results = [];
  let cursor;
  let batchCount = 0;
  
  do {
    batchCount++;
    
    // Mostrar información de extracción en la tabla de progreso
    logProgress(0, 1, 'Extrayendo datos de Notion...', [], 10, {
      currentBatch: batchCount,
      entriesInBatch: 100,
      totalExtracted: results.length,
      status: 'Obteniendo lote...'
    });

    const res = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    });
    
    results = [...results, ...res.results];
    cursor = res.has_more ? res.next_cursor : null;
    
    // Actualizar información de extracción completada
    logProgress(0, 1, 'Extrayendo datos de Notion...', [], 10, {
      currentBatch: batchCount,
      entriesInBatch: res.results.length,
      totalExtracted: results.length,
      status: cursor ? 'Lote completado, continuando...' : 'Extracción completada'
    });
    
    await delay(NOTION_RATE_LIMIT);
    
  } while (cursor);
  
  return results;
}

function extractNotionData(properties) {
  return {
    titulo: getText(properties['Título']),
    tmdbUrl: getUrl(properties['TMDB']),
    synopsis: getText(properties['Synopsis']),
    portada: getFileUrl(properties['Portada']),
    carteles: getFileUrl(properties['Carteles']),
    // Usar los campos de fórmulas txt que ya tienes calculados
    generos: getText(properties['Géneros txt']),
    categoria: getText(properties['Categorías txt']),
    audios: getText(properties['Audios txt']),
    subtitulos: getText(properties['Subtitulos txt']),
    año: getText(properties['Año']) || getDate(properties['Fecha de lanzamiento'])?.split('-')[0],
    duracion: getText(properties['Duración']),
    puntuacion: getText(properties['Puntuación 1-10']) || getNumber(properties['Puntuación 1-10']),
    trailer: getUrl(properties['Trailer']),
    verPelicula: getUrl(properties['Ver Película']),
    tituloOriginal: getText(properties['Título original']),
    productoras: getText(properties['Productora(s)']),
    idiomas: getText(properties['Idioma(s) original(es)']),
    paises: getText(properties['País(es)']),
    directores: getText(properties['Director(es)']),
    escritores: getText(properties['Escritor(es)']),
    reparto: getText(properties['Reparto principal']),
    videoIframe: getUrl(properties['Video iframe']),
    videoIframe1: getUrl(properties['Video iframe 1'])
  };
}

// Función para validar y limpiar datos - SI NO HAY DATOS EN NOTION NI TMDB = CAMPO VACÍO
function cleanFieldData(notionValue, tmdbValue) {
  // Si hay datos en Notion, usar Notion (prioridad)
  if (notionValue && notionValue.trim() !== '') {
    return notionValue.trim();
  }
  
  // Si no hay datos en Notion pero sí en TMDB, usar TMDB como fallback
  if (tmdbValue && tmdbValue.trim() !== '') {
    return tmdbValue.trim();
  }
  
  // Si no hay datos en ninguno, retornar cadena vacía
  return '';
}

function mergeTMDBData(notionData, tmdbData) {
  // Extraer datos útiles de TMDB como fallback
  const tmdbGenres = tmdbData?.genres?.map(g => g.name).join(', ') || '';
  const tmdbDirectors = tmdbData?.credits?.crew?.filter(c => c.job === 'Director').map(d => d.name).join(', ') || '';
  const tmdbWriters = tmdbData?.credits?.crew?.filter(c => c.job === 'Screenplay' || c.job === 'Writer').map(w => w.name).join(', ') || '';
  const tmdbCast = tmdbData?.credits?.cast?.slice(0, 5).map(c => c.name).join(', ') || '';
  const tmdbProductionCompanies = tmdbData?.production_companies?.map(pc => pc.name).join(', ') || '';
  const tmdbCountries = tmdbData?.production_countries?.map(pc => pc.name).join(', ') || '';
  const tmdbTrailer = tmdbData?.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer')?.key;
  
  // USAR FUNCIÓN cleanFieldData PARA TODOS LOS CAMPOS
  return {
    titulo: cleanFieldData(notionData.titulo, tmdbData?.title),
    tmdbId: notionData.tmdbUrl?.match(/\/movie\/(\d+)/)?.[1] || tmdbData?.id?.toString() || '',
    tmdbUrl: cleanFieldData(notionData.tmdbUrl, tmdbData?.id ? `https://www.themoviedb.org/movie/${tmdbData.id}` : ''),
    synopsis: cleanFieldData(notionData.synopsis, tmdbData?.overview),
    portada: cleanFieldData(notionData.portada, tmdbData?.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}` : ''),
    carteles: cleanFieldData(notionData.carteles, tmdbData?.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tmdbData.backdrop_path}` : ''),
    generos: cleanFieldData(notionData.generos, tmdbGenres),
    categoria: notionData.categoria || '', // Solo Notion
    audios: notionData.audios || '', // Solo Notion
    subtitulos: notionData.subtitulos || '', // Solo Notion
    año: cleanFieldData(notionData.año, tmdbData?.release_date?.split('-')[0]),
    duracion: cleanFieldData(notionData.duracion, tmdbData?.runtime ? `${Math.floor(tmdbData.runtime / 60)}h ${tmdbData.runtime % 60}m` : ''),
    puntuacion: cleanFieldData(notionData.puntuacion, tmdbData?.vote_average ? Math.round(tmdbData.vote_average).toString() : ''),
    trailer: cleanFieldData(notionData.trailer, tmdbTrailer ? `https://www.youtube.com/watch?v=${tmdbTrailer}` : ''),
    verPelicula: notionData.verPelicula || '', // Solo Notion
    tituloOriginal: cleanFieldData(notionData.tituloOriginal, tmdbData?.original_title),
    productoras: cleanFieldData(notionData.productoras, tmdbProductionCompanies),
    idiomas: cleanFieldData(notionData.idiomas, tmdbData?.original_language),
    paises: cleanFieldData(notionData.paises, tmdbCountries),
    directores: cleanFieldData(notionData.directores, tmdbDirectors),
    escritores: cleanFieldData(notionData.escritores, tmdbWriters),
    reparto: cleanFieldData(notionData.reparto, tmdbCast),
    videoIframe: notionData.videoIframe || '', // Solo Notion
    videoIframe1: notionData.videoIframe1 || '' // Solo Notion
  };
}

// PROCESAMIENTO PARALELO Y OPTIMIZADO
async function processMoviesInBatches(pages, batchSize = 10) {
  const total = pages.length;
  const items = [];
  let processed = 0;

  // Procesar en lotes paralelos
  for (let i = 0; i < pages.length; i += batchSize) {
    const batch = pages.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (page, index) => {
      const currentIndex = i + index + 1;
      
      // Extraer datos de Notion PRIMERO (PRIORIDAD NOTION)
      const notionData = extractNotionData(page.properties);
      
      // Detectar campos faltantes IMPORTANTES
      const missingFields = [];
      const fieldsToCheck = {};
      if (!notionData.videoIframe || notionData.videoIframe.trim() === '') {
        fieldsToCheck['Video iframe'] = '';
      }
      if (!notionData.videoIframe1 || notionData.videoIframe1.trim() === '') {
        fieldsToCheck['Video iframe 1'] = '';
      }

      
      Object.entries(fieldsToCheck).forEach(([field, value]) => {
        if (!value || value.trim() === '') {
          missingFields.push(field);
        }
      });
      
      if (missingFields.length > 0) {
        missingFieldsTable.push({
          title: notionData.titulo || 'Sin título',
          fields: missingFields
        });
      }
      
      logProgress(currentIndex, total, `Procesando: ${notionData.titulo}`, missingFields, batchSize);

      // Obtener ID de TMDB si existe
      const tmdbId = notionData.tmdbUrl?.match(/\/movie\/(\d+)/)?.[1];
      let tmdbData = null;
      
      // Solo hacer request a TMDB si faltan datos importantes Y no están en Notion
      const needsTMDB = (!notionData.synopsis || !notionData.portada || !notionData.generos ||
                        !notionData.año || !notionData.tituloOriginal || !notionData.directores) && 
                        (tmdbId || notionData.titulo);
      
      if (needsTMDB) {
        tmdbData = await fetchTMDBDetails(tmdbId, notionData.titulo);
      }

      // Combinar datos con PRIORIDAD DE NOTION
      const finalData = mergeTMDBData(notionData, tmdbData);

      return {
        'Título': finalData.titulo,
        'ID TMDB': finalData.tmdbId,
        'TMDB': finalData.tmdbUrl,
        'Synopsis': finalData.synopsis,
        'Portada': finalData.portada,
        'Carteles': finalData.carteles,
        'Géneros': finalData.generos,
        'Año': finalData.año,
        'Duración': finalData.duracion,
        'Puntuación 1-10': finalData.puntuacion,
        'Trailer': finalData.trailer,
        'Ver Película': finalData.verPelicula,
        'Audios': finalData.audios,
        'Subtítulos': finalData.subtitulos,
        'Título original': finalData.tituloOriginal,
        'Productora(s)': finalData.productoras,
        'Idioma(s) original(es)': finalData.idiomas,
        'País(es)': finalData.paises,
        'Director(es)': finalData.directores,
        'Escritor(es)': finalData.escritores,
        'Reparto principal': finalData.reparto,
        'Categoría': finalData.categoria,
        'Video iframe': finalData.videoIframe,
        'Video iframe 1': finalData.videoIframe1
      };
    });
    
    // Esperar a que se complete el lote
    const batchResults = await Promise.all(batchPromises);
    items.push(...batchResults);
    
    processed += batch.length;
    
    // Pequeña pausa entre lotes para no saturar las APIs
    if (i + batchSize < pages.length) {
      await delay(100); // Pausa muy pequeña
    }
  }

  return items;
}

async function validateEnvironment() {
  const missingVars = [];
  
  if (!process.env.NOTION_API_KEY) missingVars.push('NOTION_API_KEY');
  if (!process.env.NOTION_DATABASE_ID) missingVars.push('NOTION_DATABASE_ID');
  if (!process.env.TMDB_API_KEY) missingVars.push('TMDB_API_KEY');
  
  if (missingVars.length > 0) {
    console.error('\x1b[31m✖ Faltan variables de entorno:\x1b[0m');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\n\x1b[33m🔰 Asegúrate de tener un archivo .env con:\x1b[0m');
    console.error('   NOTION_API_KEY=tu_token_notion');
    console.error('   NOTION_DATABASE_ID=tu_database_id');
    console.error('   TMDB_API_KEY=tu_tmdb_key');
    process.exit(1);
  }
}

// Funciones para el auto-push
function exec(cmd, silent = false) {
  try {
    const output = execSync(cmd, { stdio: silent ? 'pipe' : 'inherit' });
    return output?.toString().trim() || '';
  } catch (err) {
    return err.message;
  }
}

async function autoPush() {
  const spinner = ora({
    text: '🔰 Iniciando auto-push a GitHub...',
    color: 'yellow'
  }).start();

  try {
    // Ejecutar el archivo auto-push.js desde la raíz del repositorio
    const repoRoot = process.cwd(); // Usa el directorio actual de trabajo
    const autoPushScript = path.join(repoRoot, 'auto-push.js');
    
    if (!fs.existsSync(autoPushScript)) {
      spinner.fail('✖ No se encontró el archivo auto-push.js en la raíz del repositorio');
      return;
    }
    
    spinner.text = '📦 Ejecutando script de auto-push...';
    
    const result = execSync(`node ${autoPushScript}`, { stdio: 'pipe' }).toString();
    
    if (result.includes('error') || result.includes('fatal')) {
      spinner.fail('✖ Error durante la ejecución del auto-push');
      console.log(result);
      return;
    }
    
    spinner.succeed('✓ Auto-push completado con éxito');
    console.log(result);

  } catch (error) {
    spinner.fail('✖ Error durante el auto-push');
    console.error(error.message);
  }
}

async function askForAutoPush() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
  });

  // Configurar modo raw para detectar teclas inmediatamente
  process.stdin.setRawMode(true);
  process.stdin.resume();

  let timeLeft = 60;
  let answer = null;
  let timer;

  // Función para dibujar la tabla con el contador
  const drawTable = () => {
    const lines = [];
    const timeColor = '\x1b[38;5;208m'; // Naranja
    const resetColor = '\x1b[0m';
    
    lines.push('\x1b[1m\x1b[36m┌──────────────────────────────────────────────────────────────────────────────────────┐\x1b[0m');
    lines.push('\x1b[1m\x1b[36m│ \x1b[33m🔰 AUTO-PUSH A GITHUB - CONFIRMACIÓN \x1b[36m                                      │\x1b[0m');
    lines.push('\x1b[1m\x1b[36m├──────────────────────────────────────────────────────────────────────────────────────┤\x1b[0m');
    lines.push(`\x1b[1m\x1b[36m│ \x1b[37m¿Deseas ejecutar el auto-push a GitHub? (Presiona cualquier tecla para confirmar) \x1b[36m│\x1b[0m`);
    lines.push(`\x1b[1m\x1b[36m│ \x1b[31mPresiona \x1b[1mN\x1b[0m\x1b[31m o \x1b[1mESC\x1b[0m\x1b[31m para cancelar \x1b[36m                                                 │\x1b[0m`);
    lines.push('\x1b[1m\x1b[36m├──────────────────────────────────────────────────────────────────────────────────────┤\x1b[0m');
    lines.push(`\x1b[1m\x1b[36m│ \x1b[33mTiempo restante: ${timeColor}${timeLeft.toString().padStart(2, '0')}s${resetColor} \x1b[36m                                                  │\x1b[0m`);
    lines.push('\x1b[1m\x1b[36m└──────────────────────────────────────────────────────────────────────────────────────┘\x1b[0m');
    
    // Mover cursor arriba para sobreescribir
    process.stdout.write('\x1b[7F');
    process.stdout.write(lines.join('\n'));
  };

  // Dibujar tabla inicial
  drawTable();

  // Iniciar contador regresivo
  timer = setInterval(() => {
    timeLeft--;
    drawTable();

    if (timeLeft <= 0) {
      clearInterval(timer);
      answer = 'TIMEOUT';
      rl.close();
    }
  }, 1000);

  try {
    const key = await new Promise((resolve) => {
      process.stdin.on('data', (chunk) => {
        const key = chunk.toString();
        
        // Si es ESC (27) o 'N/n', cancelar
        if (key === '\x1B' || key.toLowerCase() === 'n') {
          answer = 'CANCEL';
          clearInterval(timer);
          resolve(key);
        } else {
          // Cualquier otra tecla confirma
          answer = 'CONFIRM';
          clearInterval(timer);
          resolve(key);
        }
      });
    });

    // Limpiar eventos y restaurar terminal
    process.stdin.removeAllListeners('data');
    process.stdin.setRawMode(false);
    process.stdin.pause();
    rl.close();

    // Limpiar la tabla
    process.stdout.write('\x1b[7F\x1b[0J');

    if (answer === 'CANCEL') {
      console.log('\x1b[1m\x1b[31m✖ Auto-push cancelado\x1b[0m');
      return false;
    } else if (answer === 'TIMEOUT') {
      console.log('\x1b[1m\x1b[33m⌛ Tiempo agotado. Ejecutando auto-push...\x1b[0m');
      return true;
    } else {
      console.log('\x1b[1m\x1b[32m✓ Confirmado. Ejecutando auto-push...\x1b[0m');
      return true;
    }

  } catch (error) {
    clearInterval(timer);
    process.stdin.removeAllListeners('data');
    process.stdin.setRawMode(false);
    process.stdin.pause();
    rl.close();
    console.log('\x1b[1m\x1b[31m✖ Error al leer la respuesta:\x1b[0m', error.message);
    return false;
  }
}

// Función principal
(async () => {
  const startTime = Date.now();
  
  try {
    // Mostrar el encabezado con logo
    printHeader();
    
    await validateEnvironment();
    
    // Obtener todas las páginas de Notion (optimizado sin delays innecesarios)
    const pages = await getAllPages();

    // Procesar películas con procesamiento paralelo optimizado
    const items = await processMoviesInBatches(pages, 15); // Procesar 15 en paralelo

    console.log('\n');
    
    const output = path.join(__dirname, 'public', 'data.json');
    
    const publicDir = path.join(__dirname, 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    // Preguntar si se desea hacer auto-push
    const doAutoPush = await askForAutoPush();
    
    // Guardar el archivo
    fs.writeFileSync(output, JSON.stringify(items, null, 2));
    
    const endTime = Date.now();
    const executionTime = Math.round((endTime - startTime) / 1000);
    const minutes = Math.floor(executionTime / 60);
    const seconds = executionTime % 60;
    const timeString = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
    
    function createLine(content, targetWidth = 82) {
        const contentLength = getDisplayLength(content);
        const spaces = Math.max(0, targetWidth - contentLength);
        return `\x1b[1m\x1b[36m │  ${content}${' '.repeat(spaces)}\x1b[1m\x1b[36m│\x1b[0m`;
    }

    console.log('\n');
    console.log('\x1b[1m\x1b[36m ┌──────────────────────────────────────────────────────────────────────────────────────┐\x1b[0m');
    console.log('\x1b[1m\x1b[36m │                             \x1b[1m\x1b[33m🎬 PROCESO COMPLETADO 🎬\x1b[1m\x1b[36m                                 │\x1b[0m');
    console.log('\x1b[1m\x1b[36m ├──────────────────────────────────────────────────────────────────────────────────────┤\x1b[0m');
    console.log('\x1b[1m\x1b[36m │                                                                                      │\x1b[0m');

    console.log(createLine(`\x1b[32m✓ Archivo actualizado:\x1b[0m \x1b[1m\x1b[37mdata.json\x1b[0m`));
    console.log('\x1b[1m\x1b[36m │                                                                                      │\x1b[0m');

    console.log(createLine(`\x1b[35m📁 Ubicación:\x1b[0m`));
    console.log(createLine(`  \x1b[2m\x1b[37m${truncateText(output, 70)}\x1b[0m`));
    console.log('\x1b[1m\x1b[36m │                                                                                      │\x1b[0m');

    console.log(createLine(`\x1b[33m📚 Total procesadas:\x1b[0m \x1b[1m\x1b[32m${items.length.toString().padStart(3, ' ')}\x1b[0m \x1b[33mpelículas\x1b[0m`));
    console.log('\x1b[1m\x1b[36m │                                                                                      │\x1b[0m');
    console.log(createLine(`\x1b[35m📊 Extracción Notion:\x1b[0m \x1b[32m${lastNotionInfo.totalExtracted} películas en ${lastNotionInfo.currentBatch} lotes\x1b[0m`));
    console.log('\x1b[1m\x1b[36m │                                                                                      │\x1b[0m');

    console.log(createLine(`\x1b[31m⚠️  Campos faltantes:\x1b[0m \x1b[1m\x1b[31m${missingFieldsTable.length.toString().padStart(3, ' ')}\x1b[0m \x1b[31mentradas con datos incompletos\x1b[0m`));
    console.log('\x1b[1m\x1b[36m │                                                                                      │\x1b[0m');

    console.log(createLine(`\x1b[35m⏱️  Tiempo ejecución:\x1b[0m \x1b[1m\x1b[36m${timeString.padStart(8, ' ')}\x1b[0m`));
    console.log('\x1b[1m\x1b[36m │                                                                                      │\x1b[0m');

    console.log(createLine(`\x1b[37m🕒 Completado:\x1b[0m \x1b[2m\x1b[37m${now()}\x1b[0m`));
    console.log('\x1b[1m\x1b[36m │                                                                                      │\x1b[0m');

    console.log(createLine(`\x1b[36m🔰 Cache TMDB:\x1b[0m \x1b[1m\x1b[35m${tmdbCache.size.toString().padStart(3, ' ')}\x1b[0m \x1b[35mrequests guardados\x1b[0m`));
    console.log('\x1b[1m\x1b[36m │                                                                                      │\x1b[0m');

    console.log(createLine(`\x1b[33m🎯 PRIORIDAD NOTION:\x1b[0m \x1b[32mDatos de Notion primero\x1b[0m`));
    console.log('\x1b[1m\x1b[36m │                                                                                      │\x1b[0m');

    console.log(createLine(`\x1b[35m⚡ Procesamiento:\x1b[0m \x1b[32mParalelo (15 simultáneos)\x1b[0m`));
    console.log('\x1b[1m\x1b[36m │                                                                                      │\x1b[0m');

    console.log('\x1b[1m\x1b[36m └──────────────────────────────────────────────────────────────────────────────────────┘\x1b[0m');
    console.log('\n');
    
    // Ejecutar auto-push si se seleccionó
    if (doAutoPush) {
      await autoPush();
    }
    
  } catch (error) {
    console.error('\n\x1b[31m✖ Error durante la ejecución:\x1b[0m');
    console.error(error.message);
    
    if (error.code === 'unauthorized') {
      console.error('\n\x1b[33m🔰 Posibles soluciones:\x1b[0m');
      console.error('   1. Verifica tu NOTION_API_KEY en el archivo .env');
      console.error('   2. Asegúrate de que la integración esté conectada a la base de datos');
      console.error('   3. Verifica que el NOTION_DATABASE_ID sea correcto');
    }
    
    process.exit(1);
  }
})();