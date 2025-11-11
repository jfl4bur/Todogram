#!/usr/bin/env node
import fs from 'fs';
import chokidar from 'chokidar';
import simpleGit from 'simple-git';
import chalk from 'chalk';
import prettyBytes from 'pretty-bytes';
import dayjs from 'dayjs';
import durationPlugin from 'dayjs/plugin/duration.js';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import path from 'path';

dayjs.extend(durationPlugin);
dayjs.extend(relativeTime);

// 🎨 CONFIGURACIÓN
const TARGET_FILE = '../public/data.json';
const SHARE_DIR = '../public/share';
const COMMIT_MESSAGE = '📚 Auto-commit: Actualización data.json [skip ci]';
const WATCH_INTERVAL = 3000;
const BRANCH = 'main';
const MAX_RETRIES = 3;

// 📊 ESTADÍSTICAS GLOBALES
const stats = {
    pushCount: 0,
    totalBytesPushed: 0,
    startTime: Date.now(),
    lastPushDuration: 0,
    retryCount: 0,
    conflictCount: 0,
    errorCount: 0,
    avgPushTime: 0,
    largestFile: 0,
    pushHistory: []
};

// 🚀 INICIALIZAR GIT
const git = simpleGit({
    baseDir: process.cwd(),
    binary: 'git',
    maxConcurrentProcesses: 1,
    timeout: {
        block: 60000
    }
});

// 🛠️ FUNCIÓN PARA LOGS DETALLADOS
function log(type, message, data = null) {
    let prefix = '';
    let coloredMessage = '';
    
    switch (type) {
        case 'info':
            prefix = '📘 INFO';
            coloredMessage = chalk.cyan(message);
            break;
        case 'success':
            prefix = '✅ ÉXITO';
            coloredMessage = chalk.green(message);
            break;
        case 'warning':
            prefix = '⚠️  ADVERTENCIA';
            coloredMessage = chalk.yellow(message);
            break;
        case 'error':
            prefix = '❌ ERROR';
            coloredMessage = chalk.red(message);
            break;
        case 'debug':
            prefix = '🔍 DEBUG';
            coloredMessage = chalk.gray(message);
            break;
        case 'process':
            prefix = '🔄 PROCESO';
            coloredMessage = chalk.blue(message);
            break;
        case 'git':
            prefix = '🌿 GIT';
            coloredMessage = chalk.magenta(message);
            break;
        case 'file':
            prefix = '📄 ARCHIVO';
            coloredMessage = chalk.yellow(message);
            break;
        case 'stats':
            prefix = '📊 ESTADÍSTICAS';
            coloredMessage = chalk.cyan(message);
            break;
        case 'watch':
            prefix = '👁️  VIGILANCIA';
            coloredMessage = chalk.green(message);
            break;
        case 'system':
            prefix = '🚀 SISTEMA';
            coloredMessage = chalk.bold.blue(message);
            break;
        default:
            prefix = '💬 LOG';
            coloredMessage = message;
    }
    
    console.log(`${chalk.bold(prefix)} ${coloredMessage}`);
    
    // Si hay datos adicionales, mostrarlos de forma detallada
    if (data && typeof data === 'object') {
        Object.entries(data).forEach(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
                console.log(`${chalk.gray('└─')} ${chalk.cyan(key)}: ${JSON.stringify(value, null, 2)}`);
            } else {
                console.log(`${chalk.gray('└─')} ${chalk.cyan(key)}: ${chalk.white(value)}`);
            }
        });
    }
}

// 🔄 FUNCIONES DE SINCRONIZACIÓN
async function resolveConflicts() {
    log('warning', 'Iniciando proceso de resolución de conflictos');
    
    try {
        log('git', 'Analizando conflictos en el repositorio');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        log('git', `Aplicando versión local del archivo: ${TARGET_FILE}`);
        await git.checkout(['--ours', TARGET_FILE]);
        log('git', 'Archivo restaurado con versión local exitosamente');
        
        await git.add(TARGET_FILE);
        log('git', 'Archivo agregado al stage después de resolver conflictos');
        
        log('git', 'Continuando proceso de rebase');
        await git.rebase(['--continue']);
        log('git', 'Rebase continuado exitosamente');
        
        log('success', 'Conflictos resueltos exitosamente');
        stats.conflictCount++;
        log('debug', 'Contador de conflictos actualizado', { conflictCount: stats.conflictCount });
        
        return true;
    } catch (error) {
        log('error', 'Error al resolver conflictos', {
            error: error.message,
            stack: error.stack?.substring(0, 300),
            code: error.code
        });
        return false;
    }
}

async function syncWithRemote() {
    log('process', 'Iniciando sincronización con repositorio remoto');
    
    try {
        log('git', 'Reseteando cambios locales (hard reset)');
        await git.reset('hard');
        log('git', 'Reset hard completado');
        
        log('git', 'Obteniendo cambios del repositorio remoto');
        const fetchResult = await git.fetch(['--all']);
        log('git', 'Fetch completado exitosamente', { fetchResult });
        
        log('git', `Aplicando rebase con origin/${BRANCH}`);
        
        try {
            await git.rebase([`origin/${BRANCH}`]);
            log('git', 'Rebase aplicado exitosamente');
        } catch (rebaseError) {
            log('warning', `Error en rebase: ${rebaseError.message}`);
            
            if (rebaseError.message.includes('CONFLICT')) {
                log('warning', 'Conflictos detectados durante rebase');
                stats.conflictCount++;
                log('debug', 'Contador de conflictos incrementado', { conflictCount: stats.conflictCount });
                
                const resolved = await resolveConflicts();
                if (!resolved) {
                    log('error', 'No se pudieron resolver los conflictos');
                    throw new Error('Conflictos no resueltos');
                }
                log('success', 'Conflictos resueltos durante sincronización');
            } else {
                log('error', `Error de rebase no relacionado con conflictos: ${rebaseError.message}`);
                throw rebaseError;
            }
        }
        
        log('success', 'Sincronización con remoto completada exitosamente');
        return true;
        
    } catch (error) {
        log('error', 'Error crítico en sincronización', {
            error: error.message,
            stack: error.stack?.substring(0, 300),
            code: error.code
        });
        
        try {
            log('git', 'Intentando abortar rebase');
            await git.rebase(['--abort']);
            log('git', 'Rebase abortado exitosamente');
        } catch (abortError) {
            log('error', `Error al abortar rebase: ${abortError.message}`);
        }
        
        return false;
    }
}

async function safePush() {
    log('git', 'Iniciando push seguro al repositorio remoto');
    
    try {
        log('git', `Ejecutando push a origin/${BRANCH}`);
        const pushResult = await git.push('origin', BRANCH);
        log('success', 'Push ejecutado exitosamente', { pushResult });
        return true;
        
    } catch (pushError) {
        log('warning', `Error en push: ${pushError.message}`);
        
        if (pushError.message.includes('rejected') && stats.retryCount < MAX_RETRIES) {
            log('warning', `Push rechazado, intentando reintento ${stats.retryCount + 1}/${MAX_RETRIES}`);
            
            const syncSuccess = await syncWithRemote();
            
            if (syncSuccess) {
                stats.retryCount++;
                log('debug', 'Contador de reintentos incrementado', { retryCount: stats.retryCount });
                log('process', 'Reintentando push después de sincronización exitosa');
                return safePush();
            } else {
                log('error', 'Sincronización falló, no se puede reintentar push');
            }
        } else {
            log('error', `Push falló definitivamente: ${pushError.message}`);
        }
        
        throw pushError;
    }
}

// 📊 MOSTRAR ESTADÍSTICAS EN FORMATO LOG
function logCurrentStats() {
    const uptime = Date.now() - stats.startTime;
    const uptimeFormatted = dayjs.duration(uptime).format('HH:mm:ss');
    
    log('stats', '═══════════════════════════════════════════════════════════════');
    log('stats', 'ESTADÍSTICAS ACTUALES DEL SISTEMA');
    log('stats', '═══════════════════════════════════════════════════════════════');
    log('stats', `Total de pushes realizados: ${stats.pushCount}`);
    log('stats', `Datos totales transferidos: ${prettyBytes(stats.totalBytesPushed)}`);
    log('stats', `Tiempo promedio de push: ${Math.round(stats.avgPushTime)}ms`);
    log('stats', `Archivo más grande procesado: ${prettyBytes(stats.largestFile)}`);
    log('stats', `Tiempo activo del sistema: ${uptimeFormatted}`);
    log('stats', `Errores totales: ${stats.errorCount}`);
    log('stats', `Conflictos resueltos: ${stats.conflictCount}`);
    log('stats', `Último push duró: ${stats.lastPushDuration}ms`);
    log('stats', '═══════════════════════════════════════════════════════════════');
    
    // Mostrar historial de pushes recientes
    if (stats.pushHistory.length > 0) {
        log('stats', 'HISTORIAL DE PUSHES RECIENTES:');
        stats.pushHistory.slice(-5).forEach((push, index) => {
            log('stats', `${index + 1}. ${push.timestamp} | Hash: ${push.commitHash} | Tamaño: ${prettyBytes(push.fileSize)} | Duración: ${push.duration}ms`);
        });
        log('stats', '═══════════════════════════════════════════════════════════════');
    }
}

// 📝 FUNCIÓN PRINCIPAL DE PUSH
async function handleFileChange() {
    const startTime = Date.now();
    const startTimeFormatted = dayjs().format('HH:mm:ss.SSS');
    
    log('system', '════════════════════════════════════════════════════════════════════════════════');
    log('system', 'INICIANDO PROCESAMIENTO DE CAMBIO DE ARCHIVO');
    log('system', '════════════════════════════════════════════════════════════════════════════════');
    log('file', `Archivo detectado: ${TARGET_FILE}`);
    log('debug', `Hora de inicio: ${startTimeFormatted}`);
    
    try {
        // Verificar cambios reales con git diff
        log('git', 'Verificando cambios reales con git diff');
        const diff = await git.diff([TARGET_FILE]);
        
        if (!diff || diff.trim() === '') {
            log('warning', 'No se detectaron cambios reales en el archivo (diff vacío)');
            log('system', 'Volviendo al modo vigilancia...');
            return;
        }
        
        log('success', 'Cambios reales detectados en el archivo');

        // Obtener información del archivo
        log('file', 'Obteniendo información del archivo');
        const fileStats = fs.statSync(TARGET_FILE);
        log('file', 'Estadísticas del archivo obtenidas', {
            size: fileStats.size,
            sizeFormatted: prettyBytes(fileStats.size),
            modified: fileStats.mtime.toISOString(),
            created: fileStats.birthtime.toISOString()
        });

        // Fase 1: Agregar cambios
        log('process', 'FASE 1: Agregando cambios al stage');
    log('git', 'Agregando archivos al área de stage (data.json + share/)');
    await git.add([TARGET_FILE, SHARE_DIR]);
    log('git', 'Archivos agregados al stage exitosamente');
        
        // Fase 2: Crear commit
        log('process', 'FASE 2: Creando commit');
    log('git', `Creando commit con mensaje: ${COMMIT_MESSAGE}`);
    const commitResult = await git.commit(COMMIT_MESSAGE, [TARGET_FILE, SHARE_DIR]);
        log('git', 'Commit creado exitosamente', {
            hash: commitResult.commit,
            branch: commitResult.branch,
            summary: commitResult.summary
        });
        
        // Fase 3: Verificar estado remoto
        log('process', 'FASE 3: Verificando estado remoto');
        log('git', 'Verificando estado del repositorio remoto');
        await git.fetch(['--prune']);
        log('git', 'Fetch con prune completado');
        
        // Fase 4: Push seguro
        log('process', 'FASE 4: Enviando cambios al repositorio remoto');
        log('git', 'Iniciando push seguro');
        await safePush();
        log('git', 'Push seguro completado exitosamente');
        
        // Fase 5: Finalizar y actualizar estadísticas
        log('process', 'FASE 5: Finalizando y actualizando estadísticas');
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        log('debug', 'Actualizando estadísticas del sistema');
        stats.pushCount++;
        stats.lastPushDuration = duration;
        stats.totalBytesPushed += fileStats.size;
        stats.avgPushTime = stats.avgPushTime === 0 ? duration : (stats.avgPushTime + duration) / 2;
        stats.largestFile = Math.max(stats.largestFile, fileStats.size);
        const previousRetryCount = stats.retryCount;
        stats.retryCount = 0;
        
        log('debug', 'Estadísticas actualizadas', {
            pushCount: stats.pushCount,
            lastPushDuration: duration,
            totalBytesPushed: stats.totalBytesPushed,
            avgPushTime: stats.avgPushTime,
            largestFile: stats.largestFile,
            retryCountReset: previousRetryCount
        });
        
        // Guardar en historial
        const historyEntry = {
            timestamp: startTimeFormatted,
            duration: duration,
            fileSize: fileStats.size,
            commitHash: commitResult.commit.substring(0, 7)
        };
        
        stats.pushHistory.push(historyEntry);
        log('debug', 'Entrada agregada al historial', historyEntry);

        // Mostrar resumen del push
        log('success', '────────────────────────────────────────────────────────────────');
        log('success', 'RESUMEN DEL PUSH EXITOSO');
        log('success', '────────────────────────────────────────────────────────────────');
        log('success', `Hora de procesamiento: ${startTimeFormatted}`);
        log('success', `Hash del commit: ${commitResult.commit.substring(0, 7)}`);
    log('success', `Archivos procesados: ${TARGET_FILE} y ${SHARE_DIR}`);
        log('success', `Tamaño del archivo: ${prettyBytes(fileStats.size)}`);
        log('success', `Duración total: ${duration}ms`);
        log('success', `Push número: ${stats.pushCount}`);
        log('success', `Reintentos necesarios: ${previousRetryCount}`);
        log('success', `Conflictos resueltos: ${stats.conflictCount}`);
        log('success', '────────────────────────────────────────────────────────────────');
        
        // Mostrar estadísticas actuales
        logCurrentStats();
        
        log('system', 'PROCESAMIENTO COMPLETADO EXITOSAMENTE');
        log('system', `Push #${stats.pushCount} completado en ${duration}ms`);
        log('system', '════════════════════════════════════════════════════════════════════════════════');

    } catch (error) {
        log('error', '════════════════════════════════════════════════════════════════════════════════');
        log('error', 'ERROR CRÍTICO EN PROCESAMIENTO');
        log('error', '════════════════════════════════════════════════════════════════════════════════');
        log('error', `Mensaje de error: ${error.message}`);
        log('error', `Stack trace: ${error.stack?.substring(0, 500)}`);
        log('error', `Hora del error: ${startTimeFormatted}`);
        log('error', `Reintentos realizados: ${stats.retryCount}/${MAX_RETRIES}`);
        
        stats.errorCount++;
        log('debug', `Contador de errores incrementado: ${stats.errorCount}`);
        
        if (stats.retryCount >= MAX_RETRIES) {
            log('error', 'MÁXIMO DE REINTENTOS ALCANZADO - Se requiere intervención manual');
            log('error', 'El sistema continuará vigilando pero puede requerir revisión');
            stats.retryCount = 0;
            log('debug', 'Contador de reintentos reseteado');
        }
        
        // Mostrar estadísticas actuales después del error
        logCurrentStats();
        
        log('error', 'FIN DE MANEJO DE ERROR');
        log('error', '════════════════════════════════════════════════════════════════════════════════');
    }
    
    // Siempre volver al modo vigilancia
    log('watch', 'Volviendo al modo vigilancia...');
    log('watch', `Vigilando cambios en: ${TARGET_FILE}`);
    log('watch', 'Presiona X para salir del programa');
}

// 📊 FUNCIÓN PARA MOSTRAR RESUMEN FINAL
function showFinalSummary() {
    const endTime = Date.now();
    const totalUptime = endTime - stats.startTime;
    const uptimeFormatted = dayjs.duration(totalUptime).format('HH:mm:ss');
    const endDateTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
    
    console.log(chalk.cyan('═══════════════════════════════════════════════════'));
    console.log(chalk.cyan.bold('                RESUMEN FINAL DE SESIÓN'));
    console.log(chalk.cyan('═══════════════════════════════════════════════════'));
    console.log(chalk.cyan(`Fecha y hora de finalización: ${endDateTime}`));
    console.log(chalk.cyan(`Tiempo total de ejecución: ${uptimeFormatted}`));
    console.log(chalk.cyan(`Total de pushes realizados: ${stats.pushCount}`));
    console.log(chalk.cyan(`Datos totales transferidos: ${prettyBytes(stats.totalBytesPushed)}`));
    console.log(chalk.cyan(`Tiempo promedio por push: ${Math.round(stats.avgPushTime)}ms`));
    console.log(chalk.cyan(`Archivo más grande procesado: ${prettyBytes(stats.largestFile)}`));
    console.log(chalk.cyan(`Errores totales encontrados: ${stats.errorCount}`));
    console.log(chalk.cyan(`Conflictos resueltos: ${stats.conflictCount}`));
    console.log(chalk.cyan(`Archivo vigilado: ${TARGET_FILE}`));
    console.log(chalk.cyan(`Rama de trabajo: ${BRANCH}`));
    
    if (stats.pushHistory.length > 0) {
        console.log(chalk.cyan(''));
        console.log(chalk.cyan('HISTORIAL DE PUSHES DE LA SESIÓN:'));
        stats.pushHistory.forEach((push, index) => {
            console.log(chalk.cyan(`${index + 1}. ${push.timestamp} | Hash: ${push.commitHash} | Tamaño: ${prettyBytes(push.fileSize)} | Duración: ${push.duration}ms`));
        });
    }
    
    console.log(chalk.cyan(''));
    console.log(chalk.cyan('ESTADÍSTICAS DE RENDIMIENTO:'));
    console.log(chalk.cyan(`- Push más rápido: ${stats.pushHistory.length > 0 ? Math.min(...stats.pushHistory.map(p => p.duration)) : 0}ms`));
    console.log(chalk.cyan(`- Push más lento: ${stats.pushHistory.length > 0 ? Math.max(...stats.pushHistory.map(p => p.duration)) : 0}ms`));
    console.log(chalk.cyan(`- Promedio de tamaño de archivo: ${stats.pushCount > 0 ? prettyBytes(stats.totalBytesPushed / stats.pushCount) : '0 B'}`));
    console.log(chalk.cyan(`- Tasa de éxito: ${stats.pushCount > 0 ? ((stats.pushCount / (stats.pushCount + stats.errorCount)) * 100).toFixed(2) : 100}%`));
    
    console.log(chalk.cyan('═══════════════════════════════════════════════════'));
}

// ⌨️ MANEJO DE TECLAS
function setupKeyListener() {
    // Verificar si estamos en un entorno con TTY antes de configurar el listener
    if (!process.stdin.isTTY) {
        log('system', 'Entorno sin TTY, omitiendo configuración de teclas');
        return;
    }
    
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', (key) => {
        if (key.toString() === 'x' || key.toString() === 'X') {
            log('system', 'Saliendo del programa por comando del usuario (tecla X)');
            showFinalSummary();
            process.exit(0);
        }
    });
}

// 🚀 PROGRAMA PRINCIPAL
(async () => {
    log('system', '════════════════════════════════════════════════════════════════════════════════');
    log('system', 'INICIANDO SISTEMA DE AUTO-PUSH INTELIGENTE');
    log('system', '════════════════════════════════════════════════════════════════════════════════');
    log('system', `Archivo objetivo: ${TARGET_FILE}`);
    log('system', `Rama de trabajo: ${BRANCH}`);
    log('system', `Estrategia de conflictos: Forzar versión local`);
    log('system', `Intervalo de vigilancia: ${WATCH_INTERVAL}ms`);
    log('system', `Máximo de reintentos: ${MAX_RETRIES}`);
    log('system', '════════════════════════════════════════════════════════════════════════════════');
    
    // Configurar listener de teclas (solo en entornos con TTY)
    setupKeyListener();
    log('system', 'Listener de teclas configurado (presiona X para salir)');
    
    // Sincronización inicial
    log('process', 'Realizando sincronización inicial con el repositorio remoto');
    const initialSync = await syncWithRemote();
    
    if (initialSync) {
        log('success', 'Sincronización inicial completada exitosamente');
    } else {
        log('warning', 'Sincronización inicial falló, pero el sistema continuará');
    }
    
    let watching = true;
    const watcher = chokidar.watch(TARGET_FILE, {
        persistent: true,
        interval: WATCH_INTERVAL,
        ignoreInitial: true,
        atomic: 1500,
        awaitWriteFinish: {
            stabilityThreshold: 2000,
            pollInterval: 100
        }
    });

    watcher.on('change', async () => {
        if (watching) {
            watching = false;
            log('watch', 'Cambio detectado en el archivo objetivo');
            
            await handleFileChange();
            
            // Volver automáticamente al modo vigilancia
            watching = true;
            log('watch', 'Sistema listo para detectar nuevos cambios');
        }
    });

    watcher.on('error', error => {
        log('error', `Error en el observador de archivos: ${error.message}`, {
            error: error.message,
            stack: error.stack?.substring(0, 300)
        });
        stats.errorCount++;
        log('debug', `Contador de errores incrementado: ${stats.errorCount}`);
    });

    log('success', 'SISTEMA INICIADO EXITOSAMENTE');
    log('watch', `Vigilando cambios en: ${TARGET_FILE}`);
    log('watch', 'Presiona X para salir del programa');
    log('watch', 'El sistema está listo para procesar cambios automáticamente');
    log('system', '════════════════════════════════════════════════════════════════════════════════');
    
    // Manejo de señales del sistema para mostrar resumen al salir
    process.on('SIGINT', () => {
        log('system', 'Saliendo del programa por señal SIGINT (Ctrl+C)');
        showFinalSummary();
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        log('system', 'Saliendo del programa por señal SIGTERM');
        showFinalSummary();
        process.exit(0);
    });
})();