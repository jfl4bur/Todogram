#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { Client } from '@notionhq/client';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuración
const NOTION_DELAY = 350; // ms entre requests
const TMDB_DELAY = 100;   // ms entre requests
const BATCH_SIZE = 15;    // películas por lote

// Contadores globales
let stats = {
  totalMovies: 0,
  processedMovies: 0,
  tmdbCalls: 0,
  tmdbCacheHits: 0,
  missingFields: 0,
  startTime: Date.now()
};

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

// Función para logs con colores
function log(type, message, details = '') {
  const timestamp = new Date().toLocaleString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const icons = {
    info: '📋',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    progress: '🔄',
    movie: '🎬',
    tmdb: '🎭',
    memory: '💾'
  };
  
  const typeColors = {
    info: colors.blue,
    success: colors.green,
    warning: colors.yellow,
    error: colors.red,
    progress: colors.cyan,
    movie: colors.magenta,
    tmdb: colors.yellow,
    memory: colors.gray
  };
  
  const icon = icons[type] || '📌';
  const color = typeColors[type] || colors.white;
  
  console.log(
    `${colors.gray}[${timestamp}]${colors.reset} ${icon} ${color}${message}${colors.reset}${details ? ` ${colors.gray}${details}${colors.reset}` : ''}`
  );
}

// Función para mostrar progreso
function showProgress(current, total, message = '') {
  const percentage = Math.round((current / total) * 100);
  const progressBar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));
  log('progress', `[${progressBar}] ${percentage}% (${current}/${total})`, message);
}

// Función para mostrar memoria
function showMemory() {
  const memoryMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
  log('memory', `Memoria utilizada: ${memoryMB} MB`);
}

// Delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Validar variables de entorno
function validateEnvironment() {
  const required = ['NOTION_API_KEY', 'NOTION_DATABASE_ID', 'TMDB_API_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    log('error', 'Variables de entorno faltantes:');
    missing.forEach(key => log('error', `  - ${key}`));
    log('info', 'Verifica tu archivo .env');
    process.exit(1);
  }
  
  log('success', 'Variables de entorno validadas correctamente');
}

// Obtener todas las páginas de Notion
async function getAllNotionPages(notion, databaseId) {
  log('info', 'Obteniendo películas desde Notion...');
  
  let allPages = [];
  let cursor = undefined;
  let pageCount = 0;
  
  do {
    pageCount++;
    log('info', `Obteniendo página ${pageCount} de Notion...`);
    
    const queryOptions = {
      database_id: databaseId,
      page_size: 100
    };
    
    // Solo incluir start_cursor si no es undefined
    if (cursor !== undefined) {
      queryOptions.start_cursor = cursor;
    }
    
    const response = await notion.databases.query(queryOptions);
    
    allPages = [...allPages, ...response.results];
    cursor = response.has_more ? response.next_cursor : undefined;
    
    log('success', `Página ${pageCount}: ${response.results.length} películas (Total: ${allPages.length})`);
    
    if (cursor) await delay(NOTION_DELAY);
    
  } while (cursor);
  
  stats.totalMovies = allPages.length;
  log('success', `Total de películas obtenidas: ${stats.totalMovies}`);
  
  return allPages;
}

// Obtener datos de TMDB
async function getTMDBData(tmdbId, title, apiKey, cache) {
  const cacheKey = tmdbId || title;
  
  // Verificar caché
  if (cache.has(cacheKey)) {
    stats.tmdbCacheHits++;
    log('tmdb', `Datos obtenidos del caché para: ${title}`);
    return cache.get(cacheKey);
  }
  
  try {
    let movieData = null;
    
    if (tmdbId) {
      // Buscar por ID
      const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}&language=es-ES&append_to_response=credits,videos`;
      await delay(TMDB_DELAY);
      const response = await axios.get(url);
      movieData = response.data;
      stats.tmdbCalls++;
    } else if (title) {
      // Buscar por título
      const searchUrl = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(title)}&api_key=${apiKey}&language=es-ES`;
      await delay(TMDB_DELAY);
      const searchResponse = await axios.get(searchUrl);
      stats.tmdbCalls++;
      
      if (searchResponse.data.results?.[0]) {
        const movieId = searchResponse.data.results[0].id;
        const detailUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${apiKey}&language=es-ES&append_to_response=credits,videos`;
        await delay(TMDB_DELAY);
        const detailResponse = await axios.get(detailUrl);
        movieData = detailResponse.data;
        stats.tmdbCalls++;
      }
    }
    
    if (movieData) {
      cache.set(cacheKey, movieData);
      log('tmdb', `Datos obtenidos de TMDB para: ${title}`);
    } else {
      log('warning', `No se encontraron datos en TMDB para: ${title}`);
    }
    
    return movieData;
    
  } catch (error) {
    log('error', `Error al obtener datos de TMDB para ${title}: ${error.message}`);
    return null;
  }
}

// Extraer datos de propiedades de Notion
function extractNotionData(properties) {
  const getText = (prop) => {
    if (!prop) return '';
    if (prop.rich_text?.[0]?.plain_text) return prop.rich_text[0].plain_text;
    if (prop.title?.[0]?.plain_text) return prop.title[0].plain_text;
    if (prop.formula?.string) return prop.formula.string;
    return '';
  };
  
  const getUrl = (prop) => prop?.url || '';
  const getFiles = (prop) => prop?.files?.[0]?.external?.url || prop?.files?.[0]?.file?.url || '';
  
  return {
    nId: getText(properties['Nº ID']),
    titulo: getText(properties['Título']),
    tmdbUrl: getUrl(properties['TMDB']),
    synopsis: getText(properties['Synopsis']),
    portada: getFiles(properties['Portada']),
    generos: getText(properties['Géneros txt']),
    año: getText(properties['Año']),
    duracion: getText(properties['Duración']),
    puntuacion: getText(properties['Puntuación 1-10']),
    trailer: getUrl(properties['Trailer']),
    verPelicula: getUrl(properties['Ver Película']),
    tituloOriginal: getText(properties['Título original']),
    directores: getText(properties['Director(es)']),
    reparto: getText(properties['Reparto principal']),
    videoIframe: getUrl(properties['Video iframe']),
    videoIframe1: getUrl(properties['Video iframe 1'])
  };
}

// Combinar datos de Notion y TMDB
function combineData(notionData, tmdbData) {
  const cleanValue = (notionValue, tmdbValue) => {
    if (notionValue && notionValue.trim()) return notionValue.trim();
    if (tmdbValue && tmdbValue.toString().trim()) return tmdbValue.toString().trim();
    return '';
  };
  
  // Extraer datos de TMDB
  const tmdbGenres = tmdbData?.genres?.map(g => g.name).join(', ') || '';
  const tmdbDirectors = tmdbData?.credits?.crew?.filter(c => c.job === 'Director').map(d => d.name).join(', ') || '';
  const tmdbCast = tmdbData?.credits?.cast?.slice(0, 5).map(c => c.name).join(', ') || '';
  const tmdbTrailer = tmdbData?.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
  
  return {
    'Nº ID': notionData.nId,
    'Título': cleanValue(notionData.titulo, tmdbData?.title),
    'TMDB': cleanValue(notionData.tmdbUrl, tmdbData?.id ? `https://www.themoviedb.org/movie/${tmdbData.id}` : ''),
    'Synopsis': cleanValue(notionData.synopsis, tmdbData?.overview),
    'Portada': cleanValue(notionData.portada, tmdbData?.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}` : ''),
    'Géneros': cleanValue(notionData.generos, tmdbGenres),
    'Año': cleanValue(notionData.año, tmdbData?.release_date?.split('-')[0]),
    'Duración': cleanValue(notionData.duracion, tmdbData?.runtime ? `${Math.floor(tmdbData.runtime / 60)}h ${tmdbData.runtime % 60}m` : ''),
    'Puntuación 1-10': cleanValue(notionData.puntuacion, tmdbData?.vote_average ? Math.round(tmdbData.vote_average).toString() : ''),
    'Trailer': cleanValue(notionData.trailer, tmdbTrailer ? `https://www.youtube.com/watch?v=${tmdbTrailer.key}` : ''),
    'Ver Película': notionData.verPelicula,
    'Título original': cleanValue(notionData.tituloOriginal, tmdbData?.original_title),
    'Director(es)': cleanValue(notionData.directores, tmdbDirectors),
    'Reparto principal': cleanValue(notionData.reparto, tmdbCast),
    'Video iframe': notionData.videoIframe,
    'Video iframe 1': notionData.videoIframe1
  };
}

// Procesar películas en lotes
async function processMovies(pages, tmdbApiKey) {
  log('info', `Iniciando procesamiento de ${pages.length} películas en lotes de ${BATCH_SIZE}`);
  
  const tmdbCache = new Map();
  const processedMovies = [];
  const moviesWithMissingFields = [];
  
  for (let i = 0; i < pages.length; i += BATCH_SIZE) {
    const batch = pages.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(pages.length / BATCH_SIZE);
    
    log('info', `Procesando lote ${batchNumber}/${totalBatches} (${batch.length} películas)`);
    
    // Procesar lote en paralelo
    const batchPromises = batch.map(async (page, index) => {
      const movieIndex = i + index + 1;
      const notionData = extractNotionData(page.properties);
      const title = notionData.titulo || `Película ${movieIndex}`;
      
      log('movie', `[${movieIndex}/${pages.length}] Procesando: ${title}`);
      
      // Verificar campos faltantes
      const missingFields = [];
      if (!notionData.videoIframe?.trim()) missingFields.push('Video iframe');
      if (!notionData.videoIframe1?.trim()) missingFields.push('Video iframe 1');
      
      if (missingFields.length > 0) {
        stats.missingFields++;
        moviesWithMissingFields.push({ title, fields: missingFields });
        log('warning', `"${title}" - Campos faltantes: ${missingFields.join(', ')}`);
      }
      
      // Obtener datos de TMDB si es necesario
      let tmdbData = null;
      const tmdbId = notionData.tmdbUrl?.match(/\/movie\/(\d+)/)?.[1];
      const needsTMDB = !notionData.synopsis || !notionData.portada || !notionData.generos || !notionData.directores;
      
      if (needsTMDB && (tmdbId || notionData.titulo)) {
        tmdbData = await getTMDBData(tmdbId, notionData.titulo, tmdbApiKey, tmdbCache);
      }
      
      // Combinar datos
      const finalData = combineData(notionData, tmdbData);
      
      stats.processedMovies++;
      showProgress(stats.processedMovies, stats.totalMovies, `Completada: ${title}`);
      
      return finalData;
    });
    
    // Esperar a que termine el lote
    const batchResults = await Promise.all(batchPromises);
    processedMovies.push(...batchResults);
    
    log('success', `Lote ${batchNumber} completado - ${batchResults.length} películas procesadas`);
    
    // Mostrar memoria cada 3 lotes
    if (batchNumber % 3 === 0) {
      showMemory();
    }
  }
  
  return { processedMovies, moviesWithMissingFields };
}

// Mostrar resumen final
function showFinalSummary(processedMovies, moviesWithMissingFields) {
  const executionTime = Math.round((Date.now() - stats.startTime) / 1000);
  const minutes = Math.floor(executionTime / 60);
  const seconds = executionTime % 60;
  const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  
  console.log('\n' + '='.repeat(60));
  log('success', `${colors.bright}🎉 PROCESAMIENTO COMPLETADO 🎉${colors.reset}`);
  console.log('='.repeat(60));
  
  log('info', `📊 Películas procesadas: ${colors.bright}${processedMovies.length}${colors.reset}`);
  log('info', `🎭 Consultas TMDB: ${colors.bright}${stats.tmdbCalls}${colors.reset}`);
  log('info', `💾 Datos desde caché: ${colors.bright}${stats.tmdbCacheHits}${colors.reset}`);
  log('info', `⚠️  Campos faltantes: ${colors.bright}${stats.missingFields}${colors.reset}`);
  log('info', `⏱️  Tiempo total: ${colors.bright}${timeStr}${colors.reset}`);
  
  if (moviesWithMissingFields.length > 0) {
    console.log('\n' + '⚠️  PELÍCULAS CON CAMPOS FALTANTES:'.padEnd(60, '-'));
    moviesWithMissingFields.forEach((movie, index) => {
      log('warning', `${index + 1}. "${movie.title}" - Faltan: ${movie.fields.join(', ')}`);
    });
  }
  
  console.log('\n');
}

// Función principal
async function main() {
  try {
    console.clear();
    console.log(`${colors.bright}${colors.cyan}🎬 EXTRACTOR DE PELÍCULAS NOTION → TMDB 🎬${colors.reset}\n`);
    
    // Validar entorno
    validateEnvironment();
    
    // Inicializar cliente de Notion
    const notion = new Client({ auth: process.env.NOTION_API_KEY });
    const databaseId = process.env.NOTION_DATABASE_ID;
    
    log('info', 'Iniciando extracción de datos...');
    showMemory();
    
    // Obtener páginas de Notion
    const pages = await getAllNotionPages(notion, databaseId);
    
    // Procesar películas
    const { processedMovies, moviesWithMissingFields } = await processMovies(pages, process.env.TMDB_API_KEY);
    
    // Crear directorio de salida
    const outputDir = path.join(__dirname, '../public');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      log('info', `Directorio creado: ${outputDir}`);
    }
    
    // Guardar archivo JSON
    const outputFile = path.join(outputDir, 'data.json');
    fs.writeFileSync(outputFile, JSON.stringify(processedMovies, null, 2));
    
    log('success', `Archivo guardado: ${outputFile}`);
    log('success', `Tamaño del archivo: ${(fs.statSync(outputFile).size / 1024).toFixed(1)} KB`);
    
    // Mostrar resumen
    showFinalSummary(processedMovies, moviesWithMissingFields);
    
    log('success', '¡Proceso completado exitosamente!');
    
  } catch (error) {
    log('error', `Error crítico: ${error.message}`);
    
    if (error.code === 'unauthorized') {
      log('error', 'Problema de autorización - verifica tus credenciales');
      log('info', 'Soluciones posibles:');
      log('info', '1. Verifica NOTION_API_KEY en .env');
      log('info', '2. Verifica NOTION_DATABASE_ID en .env');
      log('info', '3. Asegúrate de que la integración tenga permisos');
    }
    
    process.exit(1);
  }
}

// Manejar señales de terminación
process.on('SIGINT', () => {
  log('warning', 'Proceso interrumpido por el usuario');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('warning', 'Proceso terminado por el sistema');
  process.exit(0);
});

// Ejecutar
main();