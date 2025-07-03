import { execSync } from 'child_process';
import fs from 'fs';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

const DATA_FILE = 'public/data.json';
const CHECK_INTERVAL = 5000;
let isProcessing = false;
let stats = { 
  pushes: 0, 
  commits: 0, 
  pulls: 0, 
  conflictos: 0, 
  errores: 0,
  warnings: 0,
  sesionInicio: new Date(),
  ultimoCommit: null,
  ultimoPush: null,
  ultimoPull: null
};
let exitListenerAttached = false;

const color = {
  reset: "\x1b[0m",
  blue: "\x1b[34m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bright: "\x1b[1m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
  white: "\x1b[37m"
};

function drawBox(title, content = [], addSpacing = true) {
  const width = 80;
  const border = '═'.repeat(width - 2);
  const lines = [
    `╔${border}╗`,
    `║ ${title.padEnd(width - 4)} ║`,
    `╠${border}╣`,
    ...content.map(line => `║ ${line.padEnd(width - 4)} ║`),
    `╚${border}╝`
  ];
  
  if (addSpacing) console.log('\n' + lines.join('\n') + '\n\n\n');
  else console.log('\n' + lines.join('\n'));
}

function showAsciiLogo() {
  drawBox('🔥 SISTEMA DE GESTIÓN TODOGRAM', [
    `${color.cyan}   ████████╗ ██████╗ ██████╗  ██████╗  ██████╗ ██████╗  █████╗ ███╗   ███╗     ${color.reset}`,
    `${color.cyan}   ╚══██╔══╝██╔═══██╗██╔══██╗██╔═══██╗██╔════╝ ██╔══██╗██╔══██╗████╗ ████║     ${color.reset}`,
    `${color.cyan}      ██║   ██║   ██║██║  ██║██║   ██║██║  ███╗██████╔╝███████║██╔████╔██║     ${color.reset}`,
    `${color.cyan}      ██║   ██║   ██║██║  ██║██║   ██║██║   ██║██╔══██╗██╔══██║██║╚██╔╝██║     ${color.reset}`,
    `${color.cyan}      ██║   ╚██████╔╝██████╔╝╚██████╔╝╚██████╔╝██║  ██║██║  ██║██║ ╚═╝ ██║     ${color.reset}`,
    `${color.cyan}      ╚═╝    ╚═════╝ ╚═════╝  ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝     ${color.reset}`
  ]);
}

function exec(cmd, silent = false) {
  try {
    const output = execSync(cmd, { stdio: silent ? 'pipe' : 'inherit' });
    return { success: true, output: output?.toString().trim() || '' };
  } catch (err) {
    stats.errores++;
    return { 
      success: false, 
      output: err.stdout?.toString().trim() || err.message,
      stderr: err.stderr?.toString().trim() || ''
    };
  }
}

function createProgressBar(percentage) {
  const len = 20;
  const filled = Math.floor((percentage / 100) * len);
  return `${color.blue}🚀 Subiendo |${'█'.repeat(filled)}${' '.repeat(len - filled)}| ${percentage}%${color.reset}`;
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

async function promptCountdown() {
  const width = 80;
  const border = '═'.repeat(width - 2);
  
  console.log(`\n╔${border}╗`);
  console.log(`║ ¿Deseas continuar escuchando o salir?                                        ║`);
  console.log(`╠${border}╣`);
  console.log(`║ [S]eguir escuchando  |  [N] Salir  |  Cualquier tecla para continuar esperando ║`);
  console.log(`╚${border}╝`);
  
  let countdown = 60;
  let resolved = false;

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  const interval = setInterval(() => {
    process.stdout.write(`\n⏳ ${color.cyan}Continuando en ${countdown}s... Presiona S/N/Esc para decidir${color.reset} `);
    if (--countdown < 0 && !resolved) {
      clearInterval(interval);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      
      drawBox('⏱️  Tiempo agotado', ['🟢  Continuando en modo escucha.']);
      resolved = true;
    }
  }, 1000);

  return new Promise((resolve) => {
    process.stdin.on('data', (key) => {
      if (resolved) return;
      clearInterval(interval);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      
      // Limpiar la línea del countdown
      process.stdout.write('\r' + ' '.repeat(80) + '\r');
      
      if (key === '\u0003' || key.toLowerCase() === 'n' || key === '\x1B') {
        drawBox('🛑 Cerrando el script por decisión del usuario.');
        process.exit(0);
      } else if (key.toLowerCase() === 's') {
        drawBox('⏱️  Elección de usuario', ['🟢  Continuando en modo escucha.']);
      } else {
        drawBox('⏱️  Elección de usuario', ['🟢  Continuando en modo escucha.']);
      }
      
      resolve();
      resolved = true;
    });
  });
}

function showStats() {
  const duracion = formatDuration(Date.now() - stats.sesionInicio.getTime());
  const eficiencia = stats.commits > 0 ? Math.round((stats.pushes / stats.commits) * 100) : 0;
  
  drawBox('📊 RESUMEN DETALLADO DE ESTADÍSTICAS', [
    `${color.bright}🕐 Sesión iniciada     :${color.reset} ${stats.sesionInicio.toLocaleString()}`,
    `${color.bright}⏱️  Duración total     :${color.reset} ${duracion}`,
    `${color.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${color.reset}`,
    `${color.green}✅ Commits realizados  :${color.reset} ${stats.commits}`,
    `${color.blue}📤 Pushes exitosos     :${color.reset} ${stats.pushes}`,
    `${color.cyan}📥 Pulls realizados    :${color.reset} ${stats.pulls}`,
    `${color.yellow}⚠️  Warnings detectados:${color.reset} ${stats.warnings}`,
    `${color.magenta}🔀 Conflictos          :${color.reset} ${stats.conflictos}`,
    `${color.red}❌ Errores detectados  :${color.reset} ${stats.errores}`,
    `${color.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${color.reset}`,
    `${color.white}📈 Eficiencia de Push  :${color.reset} ${eficiencia}%`,
    stats.ultimoCommit ? `${color.gray}🕒 Último commit       :${color.reset} ${stats.ultimoCommit}` : '',
    stats.ultimoPush ? `${color.gray}🕒 Último push         :${color.reset} ${stats.ultimoPush}` : '',
    stats.ultimoPull ? `${color.gray}🕒 Último pull         :${color.reset} ${stats.ultimoPull}` : ''
  ].filter(line => line !== ''), false);
}

function colorizeGitOutput(line) {
  const trimmed = line.trim();
  const lower = trimmed.toLowerCase();
  
  if (lower.includes('warning:') || lower.includes('warn')) {
    stats.warnings++;
    return `${color.yellow}⚠️  ${trimmed}${color.reset}`;
  } else if (lower.includes('error:') || lower.includes('failed:') || lower.includes('aborting') || lower.includes('fatal:')) {
    return `${color.red}❌ ${trimmed}${color.reset}`;
  } else if (lower.includes('conflict') || lower.includes('merge conflict')) {
    return `${color.magenta}🔀 ${trimmed}${color.reset}`;
  } else if (lower.includes('success') || lower.includes('done') || lower.includes('ok')) {
    return `${color.green}✅ ${trimmed}${color.reset}`;
  } else if (lower.includes('up-to-date') || lower.includes('already up to date')) {
    return `${color.cyan}ℹ️  ${trimmed}${color.reset}`;
  }
  return `${color.gray}📋 ${trimmed}${color.reset}`;
}

function logProcessStep(step, details = []) {
  const width = 80;
  console.log(`║ ${step.padEnd(width - 4)} ║`);
  if (details.length > 0) {
    console.log(`║ ${'─'.repeat(width - 4)} ║`);
    details.forEach(detail => {
      const coloredDetail = colorizeGitOutput(detail);
      // Truncar líneas muy largas
      const truncated = coloredDetail.length > 72 ? coloredDetail.substring(0, 69) + '...' : coloredDetail;
      console.log(`║ ${truncated.padEnd(width - 4)} ║`);
    });
    console.log(`║ ${'─'.repeat(width - 4)} ║`);
  }
}

async function autoPush() {
  if (isProcessing) return;
  const statusResult = exec('git status --porcelain', true);
  if (!statusResult.output.includes('data.json')) return;
  isProcessing = true;

  const time = new Date().toLocaleTimeString();
  const title = `🔄 Cambio detectado en data.json [${time}]`;
  
  // Mostrar caja inicial
  const width = 80;
  const border = '═'.repeat(width - 2);
  console.log(`\n╔${border}╗`);
  console.log(`║ ${title.padEnd(width - 4)} ║`);
  console.log(`╠${border}╣`);
  
  // Proceso de Add
  logProcessStep('➕ Añadiendo archivos...');
  const addResult = exec('git add public/data.json', true);
  if (addResult.output) {
    logProcessStep('', addResult.output.split('\n').filter(line => line.trim()));
  }
  
  // Proceso de Commit
  logProcessStep('💾 Creando commit...');
  const commitResult = exec(`git commit -m "Auto push [${new Date().toISOString()}]"`, true);
  if (commitResult.output.includes('nothing to commit')) {
    logProcessStep('⚠️  Nada que commitear.');
    console.log(`╚${border}╝`);
    isProcessing = false;
    return;
  }
  
  if (commitResult.output) {
    logProcessStep('', commitResult.output.split('\n').filter(line => line.trim()));
  }
  stats.commits++;
  stats.ultimoCommit = new Date().toLocaleString();

  // Proceso de Pull
  logProcessStep('📥 Ejecutando Pull...');
  const pullResult = exec('git pull', true);
  
  if (pullResult.output) {
    logProcessStep('', pullResult.output.split('\n').filter(line => line.trim()));
  }
  
  if (pullResult.stderr) {
    logProcessStep('', pullResult.stderr.split('\n').filter(line => line.trim()));
  }
  
  if (!pullResult.success || pullResult.output.includes('error') || pullResult.output.includes('conflict')) {
    logProcessStep(`${color.red}❌ Error en pull detectado${color.reset}`);
    console.log(`╚${border}╝`);
    stats.conflictos++;
    isProcessing = false;
    return;
  }
  stats.pulls++;
  stats.ultimoPull = new Date().toLocaleString();

  // Proceso de Push
  logProcessStep('📤 Ejecutando Push...');
  
  // Mostrar progreso
  for (let i = 0; i <= 100; i += 25) {
    const progressLine = createProgressBar(i);
    console.log(`║ ${progressLine.padEnd(90)} ║`);
    if (i < 100) {
      process.stdout.write('\x1B[1A');
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  try {
    const pushResult = exec('git push', true);
    
    // Mostrar detalles del push
    if (pushResult.output) {
      logProcessStep('', pushResult.output.split('\n').filter(line => line.trim()));
    }
    
    if (pushResult.stderr) {
      logProcessStep('', pushResult.stderr.split('\n').filter(line => line.trim()));
    }
    
    // Verificar resultado
    if (!pushResult.success || pushResult.output.includes('rejected') || pushResult.output.includes('error')) {
      logProcessStep(`${color.red}❌ Push falló - revisar conflictos${color.reset}`);
      stats.errores++;
    } else {
      logProcessStep(`${color.green}✅ Push completado exitosamente${color.reset}`);
      stats.pushes++;
      stats.ultimoPush = new Date().toLocaleString();
    }
    
    console.log(`║ ${' '.repeat(width - 4)} ║`);
    console.log(`╚${border}╝`);
    
    showStats();
    await promptCountdown();
    
  } catch (e) {
    logProcessStep(`${color.red}❌ Excepción durante push${color.reset}`);
    if (e.message) {
      logProcessStep('', e.message.split('\n').filter(line => line.trim()));
    }
    console.log(`╚${border}╝`);
    stats.errores++;
  }
  isProcessing = false;
}

async function startWatcher() {
  drawBox('🚀 Git Auto-Push Iniciado', [
    `${color.cyan}📂 Vigilando archivo   :${color.reset} ${DATA_FILE}`,
    `${color.cyan}⏰ Intervalo de chequeo:${color.reset} ${CHECK_INTERVAL / 1000} segundos`,
    `${color.cyan}🔄 Modo automático     :${color.reset} add/commit/pull/push`,
    `${color.cyan}⌨️  Control manual     :${color.reset} Presiona [x] o [ESC] para salir`,
    `${color.gray}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${color.reset}`,
    `${color.green}✅ Sistema iniciado correctamente${color.reset}`
  ]);
  
  if (!fs.existsSync(DATA_FILE)) {
    drawBox('⚠️ Advertencia', [
      `${color.yellow}El archivo ${DATA_FILE} no existe.${color.reset}`,
      `${color.yellow}Se monitoreará cuando sea creado.${color.reset}`
    ]);
  }

  if (!exitListenerAttached) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (key) => {
      if (key.toLowerCase() === 'x' || key === '\x1B') {
        drawBox('🛑 Finalizando script por orden del usuario.');
        showStats();
        process.exit(0);
      }
    });
    exitListenerAttached = true;
  }

  setInterval(() => autoPush(), CHECK_INTERVAL);
}

process.on('SIGINT', () => {
  drawBox('🛑 Interrupción manual (Ctrl+C)');
  showStats();
  process.exit(0);
});

process.on('SIGTERM', () => {
  drawBox('🛑 Terminación del sistema');
  showStats();
  process.exit(0);
});

startWatcher().catch(console.error);