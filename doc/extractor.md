<a id="readme-top"></a>


<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/jfl4bur/Todogram">
    <img src="../images/logo.png" alt="Logo" width="180" height="180">
  </a>

  <h1 align="center">🚀 Auto-Push System Todogram</h1>

  <p align="center">
       <a href="https://github.com/jfl4bur/Todogram">Ver Demostración</a>
    &middot;
    <a href="https://github.com/jfl4bur/Todogram/issues/new?labels=bug&template=bug-report---.md">Reportar Errores</a>
    &middot;
    <a href="https://github.com/jfl4bur/Todogram/issues/new?labels=enhancement&template=feature-request---.md">Solicitud de Funciones</a>
  </p>

  <p align="center">
    Extracción optimizada de datos de Notion !
    <br />
    <a href="./README.md"><strong>Explora la  documentación »</strong></a>
    <br />
    <br />
    <a href="./doc/server.md">Server Web</a>
    &middot;
    <a href="./doc/extractor.md">Extractor</a>
    &middot;
    <a href="./doc/auto-push.md">Auto Push</a>
  </p>
</div>

</br>

# 🎬 Control Extractor

[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)](https://expressjs.com/)
[![WebSocket](https://img.shields.io/badge/WebSocket-010101?style=for-the-badge&logo=websocket&logoColor=white)](https://developer.mozilla.org/docs/Web/API/WebSockets_API)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/docs/Web/JavaScript)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/docs/Web/CSS)

Un sistema de control web en tiempo real para gestionar procesos de extracción de datos de películas con interfaz WebSocket y monitoreo avanzado.

## 📋 Tabla de Contenido

<details>
<summary>📖 Menú Principal</summary>

- [🎬 Control Extractor](#-control-extractor)
  - [📋 Tabla de Contenido](#-tabla-de-contenido)
  - [🚀 Características](#-características)
  - [🛠️ Tecnologías Utilizadas](#️-tecnologías-utilizadas)
  - [📋 Requisitos Previos](#-requisitos-previos)
  - [⚡ Instalación](#-instalación)
    - [Instalación Rápida](#instalación-rápida)
    - [Instalación Manual](#instalación-manual)
  - [🎯 Uso](#-uso)
    - [Iniciar el Servidor](#iniciar-el-servidor)
    - [Acceder a la Interfaz Web](#acceder-a-la-interfaz-web)
    - [Comandos Disponibles](#comandos-disponibles)
  - [🔧 Configuración](#-configuración)
    - [Puertos](#puertos)
    - [Buffer de Logs](#buffer-de-logs)
    - [Throttling de Progreso](#throttling-de-progreso)
  - [📁 Estructura del Proyecto](#-estructura-del-proyecto)
  - [🌐 API WebSocket](#-api-websocket)
    - [Conexión](#conexión)
    - [Mensajes del Cliente](#mensajes-del-cliente)
    - [Mensajes del Servidor](#mensajes-del-servidor)
  - [🔍 Monitoreo](#-monitoreo)
    - [Métricas Disponibles](#métricas-disponibles)
    - [Logs Estructurados](#logs-estructurados)
  - [🛡️ Manejo de Errores](#️-manejo-de-errores)
    - [Limpieza de Procesos](#limpieza-de-procesos)
    - [Señales del Sistema](#señales-del-sistema)
  - [📊 Logging](#-logging)
    - [Filtrado ANSI](#filtrado-ansi)
    - [Niveles de Log](#niveles-de-log)
  - [🤝 Contribuir](#-contribuir)
    - [Estándares de Código](#estándares-de-código)
  - [📄 Licencia](#-licencia)

</details>

## 🚀 Características

- **🔄 Control en Tiempo Real**: Iniciar, detener y reiniciar procesos de extracción
- **📊 Monitoreo Avanzado**: Seguimiento de progreso, memoria y estadísticas
- **🌐 Interfaz Web**: Dashboard intuitivo con actualizaciones en tiempo real
- **📈 Contadores Dinámicos**: Batches procesados, hits de caché y archivos faltantes
- **🔍 Sistema de Logs**: Logging estructurado con diferentes niveles de prioridad
- **💾 Buffer de Logs**: Almacenamiento temporal con límite configurable
- **⚡ WebSocket**: Comunicación bidireccional eficiente
- **🎯 Throttling**: Control de actualizaciones de progreso para optimizar rendimiento

## 🛠️ Tecnologías Utilizadas

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| ![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat-square&logo=node.js&logoColor=white) | >=14.0.0 | Runtime de JavaScript |
| ![Express](https://img.shields.io/badge/Express-404D59?style=flat-square) | ^4.18.0 | Framework web |
| ![WebSocket](https://img.shields.io/badge/WebSocket-010101?style=flat-square) | ^8.0.0 | Comunicación tiempo real |
| ![Child Process](https://img.shields.io/badge/Child_Process-Node.js-green?style=flat-square) | Built-in | Gestión de procesos |
| ![File System](https://img.shields.io/badge/File_System-Node.js-blue?style=flat-square) | Built-in | Operaciones de archivos |

## 📋 Requisitos Previos

- **Node.js** >= 14.0.0
- **npm** >= 6.0.0 o **yarn** >= 1.22.0
- **extractor.js** en el directorio raíz
- **extractor_control.html** en el directorio `public/`

## ⚡ Instalación

### Instalación Rápida

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/control-extractor.git

# Navegar al directorio
cd control-extractor

# Instalar dependencias
npm install

# Iniciar la aplicación
npm start
```

### Instalación Manual

```bash
# Instalar dependencias específicas
npm install ws express

# Verificar que extractor.js existe
ls -la extractor.js

# Crear directorio public si no existe
mkdir -p public

# Ejecutar el servidor
node control_extractor.js
```

## 🎯 Uso

### Iniciar el Servidor

```bash
node control_extractor.js
```

El servidor se ejecutará en `http://localhost:3004`

### Acceder a la Interfaz Web

1. Abrir navegador web
2. Navegar a `http://localhost:3004`
3. Utilizar los controles para gestionar el extractor

### Comandos Disponibles

| Acción | Descripción |
|--------|-------------|
| **▶️ Start** | Iniciar proceso de extracción |
| **⏹️ Stop** | Detener proceso actual |
| **🔄 Restart** | Reiniciar proceso |
| **🗑️ Clear** | Limpiar logs |
| **📁 Open Output** | Abrir directorio de salida |

## 🔧 Configuración

### Puertos

```javascript
const PORT_EXT = 3004;           // Puerto del servidor HTTP
const WEBSOCKET_PORT = 8080;     // Puerto WebSocket
```

### Buffer de Logs

```javascript
const logBuffer_EXT = {
  maxSize: 1000,                 // Máximo número de logs
  logs: []
};
```

### Throttling de Progreso

```javascript
const PROGRESS_THROTTLE = 100;   // Milisegundos entre actualizaciones
```

## 📁 Estructura del Proyecto

```
control-extractor/
├── 📄 control_extractor.js     # Servidor principal
├── 📄 extractor.js             # Proceso de extracción
├── 📁 public/                  # Archivos estáticos
│   ├── 📄 extractor_control.html
│   ├── 📄 styles.css
│   └── 📄 script.js
├── 📄 package.json
├── 📄 README.md
└── 📄 .gitignore
```

## 🌐 API WebSocket

### Conexión

```javascript
const ws = new WebSocket('ws://localhost:8080');
```

### Mensajes del Cliente

```javascript
// Iniciar extractor
ws.send(JSON.stringify({ action: 'start' }));

// Detener extractor
ws.send(JSON.stringify({ action: 'stop' }));

// Reiniciar extractor
ws.send(JSON.stringify({ action: 'restart' }));

// Limpiar logs
ws.send(JSON.stringify({ action: 'clear' }));

// Abrir directorio de salida
ws.send(JSON.stringify({ action: 'openOutput' }));

// Obtener estado
ws.send(JSON.stringify({ action: 'status' }));
```

### Mensajes del Servidor

```javascript
// Estado del proceso
{
  type: 'status',
  status: 'running' | 'stopped',
  message: string
}

// Progreso
{
  type: 'progress',
  processed: number,
  total: number,
  time: timestamp
}

// Contadores
{
  type: 'counters',
  batchesCompleted: number,
  cacheHits: number,
  missingFiles: number
}

// Logs por lotes
{
  type: 'batch',
  logs: Array<LogEntry>
}

// Uso de memoria
{
  type: 'memory',
  value: number
}
```

## 🔍 Monitoreo

### Métricas Disponibles

- **📊 Progreso**: Archivos procesados vs total
- **💾 Memoria**: Uso actual del proceso
- **🔄 Batches**: Lotes completados
- **💰 Caché**: Hits de consultas TMDB
- **⚠️ Archivos Faltantes**: Películas con campos incompletos

### Logs Estructurados

```javascript
{
  type: 'info' | 'warning' | 'error' | 'success',
  message: string,
  timestamp: number
}
```

## 🛡️ Manejo de Errores

### Limpieza de Procesos

```javascript
function cleanupExtractorProcess_EXT() {
  if (extractorProcess_EXT) {
    extractorProcess_EXT.stdout.removeAllListeners();
    extractorProcess_EXT.stderr.removeAllListeners();
    extractorProcess_EXT.kill('SIGKILL');
    extractorProcess_EXT = null;
  }
}
```

### Señales del Sistema

```javascript
process.on('SIGINT', cleanupExtractorProcess_EXT);
process.on('SIGTERM', cleanupExtractorProcess_EXT);
```

## 📊 Logging

### Filtrado ANSI

```javascript
const ansiRegex_EXT = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
```

### Niveles de Log

- **🔵 Info**: Información general
- **🟡 Warning**: Advertencias
- **🔴 Error**: Errores críticos
- **🟢 Success**: Operaciones exitosas

## 🤝 Contribuir

1. **Fork** el proyecto
2. **Crear** una rama para tu feature (`git checkout -b feature/nueva-caracteristica`)
3. **Commit** tus cambios (`git commit -m 'Añadir nueva característica'`)
4. **Push** a la rama (`git push origin feature/nueva-caracteristica`)
5. **Abrir** un Pull Request

### Estándares de Código

- Usar **ESLint** para linting
- Seguir **convenciones de nombrado** con sufijo `_EXT`
- **Documentar** funciones complejas
- **Incluir** manejo de errores

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

---

<div align="center">

**¿Encontraste útil este proyecto?** ⭐ ¡Dale una estrella en GitHub!

[🐛 Reportar Bug](https://github.com/tu-usuario/control-extractor/issues) | [💡 Solicitar Feature](https://github.com/tu-usuario/control-extractor/issues) | [📖 Documentación](https://github.com/tu-usuario/control-extractor/wiki)

</div>