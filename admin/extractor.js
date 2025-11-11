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

const NOTION_RATE_LIMIT = 350;
const TMDB_RATE_LIMIT = 100;

// Variables para contadores
let totalMovies = 0;
let moviesWithMissingFields = 0;
let tmdbCacheHits = 0;
let tmdbApiCalls = 0;
let batchesProcessed = 0;
let startTime = Date.now();

// Manejar señales para una terminación limpia
process.on('SIGINT', () => {
  console.log('Recibida señal SIGINT. Terminando...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Recibida señal SIGTERM. Terminando...');
  process.exit(0);
});

// Función completamente reescrita para manejar progreso
function sendToPanel(type, data, status = null) {
  let logData;
  
  if (type === 'progress') {
    // Mensaje de progreso con estructura especial
    logData = {
      type: 'progress',
      processed: data.processed,
      total: data.total,
      status: status || 'running',
      timestamp: new Date().toISOString()
    };
  } else if (type === 'memory') {
    // Nuevo: Mensaje de memoria
    logData = {
      type: 'memory',
      value: data,
      timestamp: new Date().toISOString()
    };
  } else {
    // Mensaje normal de log
    logData = {
      type,
      message: data,
      status,
      timestamp: new Date().toISOString(),
      counters: {
        batchesProcessed,
        tmdbCacheHits,
        moviesWithMissingFields
      }
    };
  }
  
  console.log(JSON.stringify(logData));
}

const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const now = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

const truncateText = (text, maxLength) => {
  if (!text) return ''.padEnd(maxLength, ' ');
  if (text.length <= maxLength) return text.padEnd(maxLength, ' ');
  return text.substring(0, maxLength - 3) + '...';
};

function getDisplayLength(text) {
  if (!text) return 0;
  const clean = text.replace(/\x1b\[[0-9;]*m/g, '');
  let length = 0;
  for (const char of clean) {
    length += (char.codePointAt(0) > 0x1F600 ? 2 : 1);
  }
  return length;
}

function centerText(text, width) {
  const padding = Math.max(0, width - getDisplayLength(text));
  const leftPadding = Math.floor(padding / 2);
  return ' '.repeat(leftPadding) + text + ' '.repeat(padding - leftPadding);
}

async function withRetry(fn, retries = 3, errorMsg = '') {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      sendToPanel('warning', `Reintentando operación (${retries} intentos restantes): ${errorMsg}`);
      await delay(500);
      return withRetry(fn, retries - 1, errorMsg);
    }
    throw error;
  }
}

function validateEnvironment(env) {
  const missingVars = [];
  
  if (!env.NOTION_API_KEY) missingVars.push('NOTION_API_KEY');
  if (!env.NOTION_DATABASE_ID) missingVars.push('NOTION_DATABASE_ID');
  if (!env.TMDB_API_KEY) missingVars.push('TMDB_API_KEY');
  
  if (missingVars.length > 0) {
    sendToPanel('error', 'Faltan variables de entorno necesarias');
    missingVars.forEach(varName => {
      sendToPanel('error', `Variable faltante: ${varName}`);
    });
    sendToPanel('info', 'Verifica tu archivo .env con las variables: NOTION_API_KEY, NOTION_DATABASE_ID, TMDB_API_KEY');
    process.exit(1);
  }
}

async function fetchTMDBDetails(tmdbId, title, apiKey) {
  const cacheKey = tmdbId || title;
  
  try {
    let endpoint = tmdbId
      ? `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}&language=es-ES&append_to_response=videos,credits`
      : `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(title)}&api_key=${apiKey}&language=es-ES`;

    await delay(TMDB_RATE_LIMIT);
    
    const res = await axios.get(endpoint);
    tmdbApiCalls++;
    
    let movieData = null;
    
    if (tmdbId) {
      movieData = res.data;
    } else {
      const found = res.data.results?.[0];
      if (!found) {
        sendToPanel('warning', `No se encontró información en TMDB para: ${title}`);
        return null;
      }
      
      await delay(TMDB_RATE_LIMIT);
      const detailRes = await axios.get(`https://api.themoviedb.org/3/movie/${found.id}?api_key=${apiKey}&language=es-ES&append_to_response=videos,credits`);
      movieData = detailRes.data;
      tmdbApiCalls++;
    }
    
    return movieData;
  } catch (error) {
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 5;
      sendToPanel('warning', `Límite de velocidad TMDB alcanzado. Esperando ${retryAfter} segundos...`);
      await delay(retryAfter * 1000);
      return fetchTMDBDetails(tmdbId, title, apiKey);
    }
    
    sendToPanel('error', `Error al obtener datos de TMDB para ${cacheKey}: ${error.message}`);
    return null;
  }
}

async function getAllPages(notion, databaseId) {
  let results = [];
  let cursor;
  let batchCount = 0;
  
  sendToPanel('info', '🎬 Iniciando extracción de películas desde Notion...', 'running');
  
  do {
    batchCount++;
    batchesProcessed++;
    
    sendToPanel('step', `Obteniendo lote #${batchCount} desde Notion...`);
    
    const res = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    });
    
    results = [...results, ...res.results];
    cursor = res.has_more ? res.next_cursor : null;
    
    sendToPanel('success', `Lote #${batchCount} obtenido: ${res.results.length} películas (Total acumulado: ${results.length})`);
    
    await delay(NOTION_RATE_LIMIT);
    
  } while (cursor);
  
  totalMovies = results.length;
  
  // Enviar progreso inicial
  sendToPanel('progress', {
    processed: 0,
    total: totalMovies
  }, 'running');
  
  sendToPanel('success', `Extracción de Notion completada: ${totalMovies} películas en ${batchCount} lotes`);
  return results;
}

const getText = (property) => {
  if (!property) return '';
  
  if (property.rich_text?.length > 0) {
    return property.rich_text.map(text => text.plain_text).join('');
  }
  
  if (property.title?.length > 0) {
    return property.title.map(text => text.plain_text).join('');
  }
  
  if (property.plain_text) {
    return property.plain_text;
  }
  
  if (property.formula?.string) {
    return property.formula.string;
  }
  
  return '';
};

const getNumber = (property) => {
  return property?.number?.toString() || '';
};

const getSelect = (property) => {
  return property?.select?.name || '';
};

const getMultiSelect = (property) => {
  return property?.multi_select?.map(item => item.name).join(', ') || '';
};

const getDate = (property) => {
  return property?.date?.start || '';
};

const getFileUrl = (property) => {
  if (!property?.files || !Array.isArray(property.files)) return '';
  const file = property.files.find((f) => f.type === 'external' || f.type === 'file');
  return file?.external?.url || file?.file?.url || '';
};

const getUrl = (property) => {
  return property?.url || '';
};

function extractNotionData(properties) {
  return {
    titulo: getText(properties['Título']),
    tituloEpisodio: getText(properties['Título episodio']),
    temporada: getText(properties['Temporada']),
    episodios: getText(properties['Episodios']),
    tmdbUrl: getUrl(properties['TMDB']),
    synopsis: getText(properties['Synopsis']),
    portada: getFileUrl(properties['Portada']),
    carteles: getFileUrl(properties['Carteles']),
    slider: getFileUrl(properties['Slider']),
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

function cleanFieldData(notionValue, tmdbValue) {
  const isValid = (val) => 
    (typeof val === 'string' && val.trim() !== '') || 
    (typeof val === 'number');
  
  if (isValid(notionValue)) return notionValue.toString().trim();
  if (isValid(tmdbValue)) return tmdbValue.toString().trim();
  return '';
}

function mergeTMDBData(notionData, tmdbData) {
  const tmdbGenres = tmdbData?.genres?.map(g => g.name).join(', ') || '';
  const tmdbDirectors = tmdbData?.credits?.crew?.filter(c => c.job === 'Director').map(d => d.name).join(', ') || '';
  const tmdbWriters = tmdbData?.credits?.crew?.filter(c => c.job === 'Screenplay' || c.job === 'Writer').map(w => w.name).join(', ') || '';
  const tmdbCast = tmdbData?.credits?.cast?.slice(0, 5).map(c => c.name).join(', ') || '';
  const tmdbProductionCompanies = tmdbData?.production_companies?.map(pc => pc.name).join(', ') || '';
  const tmdbCountries = tmdbData?.production_countries?.map(pc => pc.name).join(', ') || '';
  const tmdbTrailer = tmdbData?.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer')?.key;
  
  return {
    tituloEpisodio: notionData.tituloEpisodio,
    temporada: notionData.temporada,
    episodios: notionData.episodios,
    titulo: cleanFieldData(notionData.titulo, tmdbData?.title),
    tmdbId: notionData.tmdbUrl?.match(/\/movie\/(\d+)/)?.[1] || tmdbData?.id?.toString() || '',
    tmdbUrl: cleanFieldData(notionData.tmdbUrl, tmdbData?.id ? `https://www.themoviedb.org/movie/${tmdbData.id}` : ''),
    synopsis: cleanFieldData(notionData.synopsis, tmdbData?.overview),
    portada: cleanFieldData(notionData.portada, tmdbData?.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}` : ''),
    carteles: cleanFieldData(notionData.carteles, tmdbData?.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tmdbData.backdrop_path}` : ''),
    slider: notionData.slider || '',
    generos: cleanFieldData(notionData.generos, tmdbGenres),
    categoria: notionData.categoria || '',
    audios: notionData.audios || '',
    subtitulos: notionData.subtitulos || '',
    año: cleanFieldData(notionData.año, tmdbData?.release_date?.split('-')[0]),
    duracion: cleanFieldData(notionData.duracion, tmdbData?.runtime ? `${Math.floor(tmdbData.runtime / 60)}h ${tmdbData.runtime % 60}m` : ''),
    puntuacion: cleanFieldData(notionData.puntuacion, tmdbData?.vote_average ? tmdbData.vote_average.toFixed(1) : ''),
    trailer: cleanFieldData(notionData.trailer, tmdbTrailer ? `https://www.youtube.com/watch?v=${tmdbTrailer}` : ''),
    verPelicula: notionData.verPelicula || '',
    tituloOriginal: cleanFieldData(notionData.tituloOriginal, tmdbData?.original_title),
    productoras: cleanFieldData(notionData.productoras, tmdbProductionCompanies),
    idiomas: cleanFieldData(notionData.idiomas, tmdbData?.original_language),
    paises: cleanFieldData(notionData.paises, tmdbCountries),
    directores: cleanFieldData(notionData.directores, tmdbDirectors),
    escritores: cleanFieldData(notionData.escritores, tmdbWriters),
    reparto: cleanFieldData(notionData.reparto, tmdbCast),
    videoIframe: notionData.videoIframe || '',
    videoIframe1: notionData.videoIframe1 || ''
  };
}

async function processMoviesInBatches(pages, batchSize = 10) {
  const items = [];
  const missingFieldsList = [];
  const tmdbCache = new Map();
  
  sendToPanel('info', `Iniciando procesamiento detallado de ${pages.length} películas`);
  
  // Reset de contadores específicos para procesamiento
  moviesWithMissingFields = 0;
  tmdbCacheHits = 0;
  tmdbApiCalls = 0;
  batchesProcessed = 0;
  
  for (let i = 0; i < pages.length; i += batchSize) {
    const batch = pages.slice(i, i + batchSize);
    batchesProcessed++;
    
    sendToPanel('step', `Procesando lote ${batchesProcessed}: películas ${i + 1} a ${Math.min(i + batchSize, pages.length)}`);
    
    const batchPromises = batch.map(async (page, index) => {
      const currentIndex = i + index + 1;
      const notionData = extractNotionData(page.properties);
      const movieTitle = notionData.titulo || 'Sin título';
      
      return withRetry(async () => {
        sendToPanel('movie', `[${currentIndex}/${pages.length}] Procesando: ${movieTitle}`);
        
        const missingFields = [];
        if (!notionData.videoIframe || notionData.videoIframe.trim() === '') {
          missingFields.push('Video iframe');
        }
        if (!notionData.videoIframe1 || notionData.videoIframe1.trim() === '') {
          missingFields.push('Video iframe 1');
        }
        
        if (missingFields.length > 0) {
          sendToPanel('warning', `"${movieTitle}" - Campos opcionales faltantes: ${missingFields.join(', ')}`);
          moviesWithMissingFields++;
          missingFieldsList.push({
            título: movieTitle,
            campos: missingFields
          });
        }
        
        const tmdbId = notionData.tmdbUrl?.match(/\/movie\/(\d+)/)?.[1];
        let tmdbData = null;
        
        const needsTMDB = (!notionData.synopsis || !notionData.portada || !notionData.generos ||
                          !notionData.año || !notionData.tituloOriginal || !notionData.directores) && 
                          (tmdbId || notionData.titulo);
        
        if (needsTMDB) {
          const cacheKey = `${tmdbId || ''}-${notionData.titulo}`;
          if (tmdbCache.has(cacheKey)) {
            tmdbData = tmdbCache.get(cacheKey);
            tmdbCacheHits++;
            sendToPanel('field', `Datos TMDB obtenidos desde caché para "${movieTitle}"`);
          } else {
            sendToPanel('field', `Consultando datos TMDB para "${movieTitle}"...`);
            tmdbData = await fetchTMDBDetails(tmdbId, notionData.titulo, process.env.TMDB_API_KEY);
            if (tmdbData) {
              tmdbCache.set(cacheKey, tmdbData);
              sendToPanel('field', `Datos TMDB almacenados en caché para "${movieTitle}"`);
            }
          }
        } else {
          sendToPanel('field', `"${movieTitle}" - Datos completos en Notion, no requiere TMDB`);
        }

        const finalData = mergeTMDBData(notionData, tmdbData);
        
        const dataInfo = [];
        if (finalData.año) dataInfo.push(`Año: ${finalData.año}`);
        if (finalData.duracion) dataInfo.push(`Duración: ${finalData.duracion}`);
        if (finalData.directores) dataInfo.push(`Director: ${finalData.directores.split(',')[0]}`);
        if (finalData.generos) dataInfo.push(`Géneros: ${finalData.generos.split(',').slice(0, 2).join(', ')}`);
        
        if (dataInfo.length > 0) {
          sendToPanel('field', `"${movieTitle}" - ${dataInfo.join(' | ')}`);
        }
        
        sendToPanel('success', `"${movieTitle}" procesada correctamente`);
        
        // Enviar progreso después de cada película procesada
        sendToPanel('progress', {
          processed: currentIndex,
          total: pages.length
        });
        
        // Enviar actualización de memoria cada 10 películas
        if (currentIndex % 10 === 0) {
          const memory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
          sendToPanel('memory', memory);
        }
        
        return {
          'Título': finalData.titulo,
          'Título original': finalData.tituloOriginal,
          'ID TMDB': finalData.tmdbId,
          'TMDB': finalData.tmdbUrl,
          'Synopsis': finalData.synopsis,
          'Portada': finalData.portada,
          'Carteles': finalData.carteles,
          'Slider': finalData.slider,
          'Géneros': finalData.generos,
          'Año': finalData.año,
          'Duración': finalData.duracion,
          'Puntuación 1-10': finalData.puntuacion,
          'Trailer': finalData.trailer,
          'Audios': finalData.audios,
          'Subtítulos': finalData.subtitulos,
          'Productora(s)': finalData.productoras,
          'Idioma(s) original(es)': finalData.idiomas,
          'País(es)': finalData.paises,
          'Director(es)': finalData.directores,
          'Escritor(es)': finalData.escritores,
          'Reparto principal': finalData.reparto,
          'Categoría': finalData.categoria,
          'Título episodio': finalData.tituloEpisodio,
          'Temporada': finalData.temporada,
          'Episodios': finalData.episodios,
          'Ver Película': finalData.verPelicula,
          'Video iframe': finalData.videoIframe,
          'Video iframe 1': finalData.videoIframe1
        };
      }, 3, `Procesando película "${movieTitle}"`).catch(error => {
        sendToPanel('error', `Error procesando película "${movieTitle}": ${error.message}`);
        return null;
      });
    });
    
    const batchResults = await Promise.all(batchPromises);
    const validResults = batchResults.filter(item => item !== null);
    items.push(...validResults);
    
    sendToPanel('success', `Lote ${batchesProcessed} completado: ${validResults.length} películas procesadas`);
    
    // Delay más corto entre lotes para mejorar rendimiento
    if (i + batchSize < pages.length) await delay(50);
  }
  
  // Enviar progreso final
  sendToPanel('progress', {
    processed: pages.length,
    total: pages.length
  }, 'completed');
  
  return { items, missingFieldsList };
}

function printSummaryTable(items, missingFieldsList) {
  const endTime = Date.now();
  const executionTime = Math.round((endTime - startTime) / 1000);
  const minutes = Math.floor(executionTime / 60);
  const seconds = executionTime % 60;
  const timeString = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  const completedTime = now();

  const outputPath = path.join(__dirname, '../public', 'data.json');

  // Formatear cada línea con colores
  const formatSummaryLine = (label, value) => {
    return `${label}: \x1b[90m${value}\x1b[0m`;
  };

  sendToPanel('success', `🎉 PROCESO COMPLETADO EXITOSAMENTE 🎉`);
  sendToPanel('info', formatSummaryLine('📁 Archivo generado', 'data.json'));
  sendToPanel('info', formatSummaryLine('📍 Ubicación', outputPath));
  sendToPanel('info', formatSummaryLine('📊 Total procesadas', `${items.length} películas`));
  sendToPanel('info', formatSummaryLine('🔄 Lotes completados', batchesProcessed));
  sendToPanel('info', formatSummaryLine('💾 Consultas en caché', tmdbCacheHits));
  sendToPanel('info', formatSummaryLine('⏱️ Tiempo total de ejecución', timeString));
  sendToPanel('info', formatSummaryLine('🕒 Finalizado el', completedTime));
  sendToPanel('info', formatSummaryLine('🌐 Consultas API TMDB', `${tmdbApiCalls} realizadas`));
  sendToPanel('info', formatSummaryLine('🎯 Estrategia', 'Datos de Notion prioritarios'));
  sendToPanel('info', formatSummaryLine('🚀 Procesamiento', 'Paralelo con 15 hilos simultáneos'));
  sendToPanel('info', formatSummaryLine('📝 Logs registrados', totalMovies + batchesProcessed + tmdbCacheHits + tmdbApiCalls + 15));
  
  // Nueva línea para películas con campos faltantes
  sendToPanel('info', formatSummaryLine('⚠ Películas con campos faltantes', missingFieldsList.length));
  
  if (missingFieldsList.length > 0) {
    sendToPanel('warning', `📋 Detalle de campos faltantes:`);
    missingFieldsList.forEach((item, index) => {
      sendToPanel('warning', `${index + 1}. "${item.título}" - Faltan: ${item.campos.join(', ')}`);
    });
  } else {
    sendToPanel('success', `✅ Todas las películas tienen datos completos`);
  }
}

(async () => {
  try {
    startTime = Date.now();
    console.clear();
    
    // Reset counters
    totalMovies = 0;
    moviesWithMissingFields = 0;
    tmdbCacheHits = 0;
    tmdbApiCalls = 0;
    batchesProcessed = 0;
    
    sendToPanel('info', '🎬 INICIANDO EXTRACTOR DE PELÍCULAS 🎬', 'running');
    
    validateEnvironment(process.env);
    
    const notion = new Client({ auth: process.env.NOTION_API_KEY });
    const databaseId = process.env.NOTION_DATABASE_ID;
    
    sendToPanel('info', `Sistema iniciado correctamente`);
    sendToPanel('info', `Hora de inicio: ${now()}`);
    sendToPanel('info', `Versión Node.js: ${process.version}`);
    
    // Enviar memoria inicial
    const initialMemory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    sendToPanel('info', `Memoria inicial: ${initialMemory} MB`);
    sendToPanel('memory', initialMemory);
    
    const pages = await getAllPages(notion, databaseId);
    // Ordenar por fecha de creación (descendente) para que el data.json tenga los más recientes primero
    try {
      pages.sort((a, b) => new Date(b.created_time) - new Date(a.created_time));
      sendToPanel('info', `Ordenadas ${pages.length} páginas por fecha de creación (descendente)`);
    } catch (err) {
      sendToPanel('warning', `No se pudo ordenar páginas por fecha de creación: ${err.message}`);
    }

    const { items, missingFieldsList } = await processMoviesInBatches(pages, 15);
    
    const publicDir = path.join(__dirname, '../public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
      sendToPanel('info', `Directorio de salida creado: ${publicDir}`);
    }
    
    const output = path.join(publicDir, 'data.json');
  // Guardar en el orden actual (ya ordenado por fecha de creación)
  fs.writeFileSync(output, JSON.stringify(items, null, 2));
    sendToPanel('success', `Archivo JSON guardado exitosamente: ${output}`);
    
    // ==========================================================
    // GENERACIÓN AUTOMÁTICA DE PÁGINAS SHARE (INTEGRADO AQUÍ)
    // ==========================================================
    try {
      const shareDir = path.join(publicDir, 'share');
      if (!fs.existsSync(shareDir)) {
        fs.mkdirSync(shareDir, { recursive: true });
        sendToPanel('info', `Directorio share creado: ${shareDir}`);
      }

      const generateSlug = (title) => {
        if (!title) return 'todogram';
        return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      };

      let generatedSharePages = 0;
      const startShareTime = Date.now();
      sendToPanel('info', '🛠️ Iniciando generación de páginas estáticas para compartir');

      items.forEach(item => {
        if (!item || item['Categoría'] !== 'Películas') return; // Solo películas
        const title = item['Título'] || 'Todogram';
        const description = (item['Synopsis'] || 'Explora esta película en Todogram').substring(0, 160);
        const image = item['Portada'] || 'https://via.placeholder.com/1200x630';
        const id = item['ID TMDB'] || '';
        const titleSlug = generateSlug(title);
        const originalUrl = `https://todogram.free.nf/#id=${id}&title=${titleSlug}`;
        const filename = `${id}-${titleSlug}.html`;
        const filePath = path.join(shareDir, filename);
        // HTML con redirección inmediata
        const html = `<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>${title} - Todogram</title>\n<meta name="title" content="${title}">\n<meta name="description" content="${description}">\n<meta property="og:type" content="website">\n<meta property="og:site_name" content="Todogram">\n<meta property="og:url" content="https://jfl4bur.github.io/Todogram/public/share/${filename}">\n<meta property="og:title" content="${title}">\n<meta property="og:description" content="${description}">\n<meta property="og:image" content="${image}">\n<meta property="og:image:secure_url" content="${image}">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<link rel="canonical" href="https://jfl4bur.github.io/Todogram/public/share/${filename}">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:url" content="https://jfl4bur.github.io/Todogram/public/share/${filename}">\n<meta name="twitter:title" content="${title}">\n<meta name="twitter:description" content="${description}">\n<meta name="twitter:image" content="${image}">\n<script>try{window.location.replace('${originalUrl}')}catch(e){window.location.href='${originalUrl}'}</script>\n<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff}.container{text-align:center;padding:20px}.spinner{border:4px solid rgba(255,255,255,.3);border-radius:50%;border-top:4px solid #fff;width:50px;height:50px;animation:spin 1s linear infinite;margin:0 auto 20px}@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}h1{margin:0;font-size:24px}p{opacity:.9;margin-top:10px}</style>\n</head>\n<body><div class="container"><div class="spinner"></div><h1>${title}</h1><p>${description}</p><p style="margin-top:20px;font-size:14px;opacity:.85">Página de previsualización para compartir. Redireccionando...</p><p><a href="${originalUrl}" style="display:inline-block;padding:10px 18px;background:#fff;color:#333;border-radius:6px;text-decoration:none;font-weight:600">Ver en Todogram</a></p></div></body></html>`;
        fs.writeFileSync(filePath, html, 'utf8');
        generatedSharePages++;
        if (generatedSharePages % 50 === 0) {
          sendToPanel('progress', { processed: generatedSharePages, total: items.length }, 'share');
        }
      });

      // Página índice
      const indexHtml = `<!DOCTYPE html>\n<html lang=\"es\"><head><meta charset=\"UTF-8\"><title>Share Pages - Todogram</title></head><body><h1>📄 Páginas de Compartir</h1><p>Total generadas: ${generatedSharePages}</p><p>Generadas en ${(Date.now()-startShareTime)/1000}s</p><p>Formato: https://jfl4bur.github.io/Todogram/public/share/[id]-[slug].html</p></body></html>`;
      fs.writeFileSync(path.join(shareDir,'index.html'), indexHtml, 'utf8');
      sendToPanel('success', `Generación de páginas share completada: ${generatedSharePages} archivos`);
    } catch (shareErr) {
      sendToPanel('error', `Fallo al generar páginas share: ${shareErr.message}`);
    }

    printSummaryTable(items, missingFieldsList);
    
    // Enviar estado final
    sendToPanel('info', 'Extractor terminado correctamente', 'stopped');
    
    // Pequeña espera para asegurar envío de mensajes
    await delay(100);
    
  } catch (error) {
    sendToPanel('error', `Error crítico durante la ejecución: ${error.message}`);
    
    if (error.code === 'unauthorized') {
      sendToPanel('error', 'Error de autorización - verifica tus credenciales');
      sendToPanel('info', 'Posibles soluciones:');
      sendToPanel('info', '1. Verifica tu NOTION_API_KEY en el archivo .env');
      sendToPanel('info', '2. Asegúrate de que la integración esté conectada a la base de datos');
      sendToPanel('info', '3. Verifica que el NOTION_DATABASE_ID sea correcto');
    }
    
    sendToPanel('error', 'Proceso terminado con errores', 'stopped');
    process.exit(1);
  }
})();