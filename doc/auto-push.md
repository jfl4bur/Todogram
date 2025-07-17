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

<div align="center">
  <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white" alt="Git">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white" alt="npm">
</div>

<div align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/status-active-success?style=flat-square" alt="Status">
  <img src="https://img.shields.io/badge/platform-cross--platform-lightgrey?style=flat-square" alt="Platform">
</div>

---

## 📋 Tabla de Contenidos

<details>
<summary>📑 <strong>Navegación del Proyecto</strong></summary>

- [📋 Descripción](#-descripción)
- [✨ Características](#-características)
- [🛠️ Tecnologías Utilizadas](#️-tecnologías-utilizadas)
- [📥 Instalación](#-instalación)
- [🚀 Uso](#-uso)
- [📊 Funcionalidades](#-funcionalidades)
- [🤝 Contribución](#-contribución)
- [📝 Licencia](#-licencia)
- [🔗 Enlaces Útiles](#-enlaces-útiles)
- [🚀 Próximas Funcionalidades](#-próximas-funcionalidades)

</details>

---

## 📋 Descripción

Sistema inteligente de auto-push que monitorea cambios en archivos específicos y los sincroniza automáticamente con repositorios Git remotos. Perfecto para proyectos que requieren sincronización continua de datos, como actualizaciones de JSON, logs, o cualquier archivo que necesite versionado automático.

## ✨ Características

- 🔍 **Monitoreo inteligente de archivos** con detección de cambios reales
- 🚀 **Push automático** con manejo de conflictos
- 📊 **Estadísticas detalladas** en tiempo real
- 🔄 **Reintentos automáticos** con límites configurables
- 🛡️ **Manejo robusto de errores** y conflictos Git
- 📈 **Sistema de logs avanzado** con códigos de colores
- ⚡ **Optimización de rendimiento** con debouncing
- 🔧 **Configuración flexible** y personalizable

## 🛠️ Tecnologías Utilizadas

### 📦 Dependencias Principales

| Paquete | Versión | Descripción |
|---------|---------|-------------|
| `chokidar` | `^3.5.3` | Monitoreo de archivos cross-platform |
| `simple-git` | `^3.19.1` | Interfaz Git para Node.js |
| `chalk` | `^5.3.0` | Colores en terminal |
| `dayjs` | `^1.11.9` | Manipulación de fechas |
| `pretty-bytes` | `^6.1.1` | Formateo de tamaños de archivo |

### 🔧 Herramientas de Desarrollo

- **Node.js** v18+ (ES Modules)
- **npm** o **yarn** como gestor de paquetes
- **Git** para control de versiones
- **Terminal** compatible con TTY para controles interactivos

## 📥 Instalación

### 🚀 Instalación Rápida

#### 1. Clona el repositorio
```bash
git clone https://github.com/tu-usuario/auto-push-system.git
cd auto-push-system
```

#### 2. Instala las dependencias
```bash
npm install
```

#### 3. Configura el sistema
Edita las variables de configuración en `auto-push.js`:

```javascript
const TARGET_FILE = '../public/data.json';    // Archivo a monitorear
const BRANCH = 'main';                        // Rama de trabajo
const COMMIT_MESSAGE = '📚 Auto-commit: Actualización data.json [skip ci]';
const WATCH_INTERVAL = 3000;                  // Intervalo de vigilancia (ms)
const MAX_RETRIES = 3;                        // Máximo de reintentos
```

#### 4. Ejecuta el sistema
```bash
node auto-push.js
```

### 📦 Instalación con npm

```bash
# Instalar dependencias
npm install chokidar simple-git chalk dayjs pretty-bytes

# Hacer el script ejecutable
chmod +x auto-push.js

# Ejecutar
./auto-push.js
```

### 🐳 Instalación con Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

CMD ["node", "auto-push.js"]
```

```bash
# Construir imagen
docker build -t auto-push-system .

# Ejecutar contenedor
docker run -v $(pwd):/app -v ~/.ssh:/root/.ssh auto-push-system
```

## 🚀 Uso

### 💡 Uso Básico

1. **Inicia el sistema:**
   ```bash
   node auto-push.js
   ```

2. **El sistema comenzará a monitorear el archivo configurado**

3. **Controles disponibles:**
   - `X` o `x`: Salir del programa
   - `Ctrl+C`: Salir con resumen final

4. **Modifica el archivo objetivo y observa cómo se sincroniza automáticamente**

### ⚙️ Configuración Avanzada

#### Variables de Entorno

```bash
# Configurar mediante variables de entorno
export AUTO_PUSH_TARGET="../public/data.json"
export AUTO_PUSH_BRANCH="main"
export AUTO_PUSH_INTERVAL=3000
export AUTO_PUSH_MAX_RETRIES=3
```

#### Configuración Git

```bash
# Configurar credenciales Git
git config --global user.name "Auto Push System"
git config --global user.email "autopush@example.com"

# Configurar SSH (recomendado)
ssh-keygen -t ed25519 -C "autopush@example.com"
ssh-add ~/.ssh/id_ed25519
```

### 🔍 Monitoreo y Logs

#### Tipos de Logs

- 📘 **INFO**: Información general del sistema
- ✅ **ÉXITO**: Operaciones completadas exitosamente
- ⚠️ **ADVERTENCIA**: Situaciones que requieren atención
- ❌ **ERROR**: Errores críticos del sistema
- 🔍 **DEBUG**: Información detallada para debugging
- 🔄 **PROCESO**: Estados de procesos en ejecución
- 🌿 **GIT**: Operaciones específicas de Git
- 📄 **ARCHIVO**: Información sobre archivos
- 📊 **ESTADÍSTICAS**: Métricas del sistema
- 👁️ **VIGILANCIA**: Estados de monitoreo

#### Estadísticas en Tiempo Real

El sistema proporciona estadísticas detalladas:
- Total de pushes realizados
- Datos transferidos
- Tiempo promedio de push
- Errores y conflictos resueltos
- Historial de operaciones

## 📊 Funcionalidades

### 🔄 Manejo de Conflictos

#### Estrategia de Resolución

1. **Detección automática** de conflictos durante rebase
2. **Aplicación de versión local** (`--ours`)
3. **Continuación automática** del rebase
4. **Estadísticas de conflictos** resueltos

#### Configuración de Conflictos

```javascript
// El sistema siempre favorece la versión local
await git.checkout(['--ours', TARGET_FILE]);
```

### 📈 Sistema de Estadísticas

#### Métricas Disponibles

- **Pushes totales**: Número de sincronizaciones exitosas
- **Datos transferidos**: Volumen total de datos
- **Tiempo promedio**: Rendimiento del sistema
- **Tasa de éxito**: Porcentaje de operaciones exitosas
- **Conflictos resueltos**: Número de conflictos manejados
- **Historial detallado**: Log de todas las operaciones

#### Ejemplo de Salida

```
📊 ESTADÍSTICAS ═══════════════════════════════════════════════════════════════
📊 ESTADÍSTICAS Total de pushes realizados: 15
📊 ESTADÍSTICAS Datos totales transferidos: 2.3 MB
📊 ESTADÍSTICAS Tiempo promedio de push: 1,245ms
📊 ESTADÍSTICAS Archivo más grande procesado: 156 kB
📊 ESTADÍSTICAS Tiempo activo del sistema: 02:15:30
📊 ESTADÍSTICAS Errores totales: 2
📊 ESTADÍSTICAS Conflictos resueltos: 1
```

### 🛡️ Manejo de Errores

#### Tipos de Errores Manejados

- **Conflictos de merge**: Resolución automática
- **Pushes rechazados**: Reintentos con sincronización
- **Errores de red**: Reintentos con backoff
- **Archivos bloqueados**: Espera y reintento
- **Errores de permisos**: Logs detallados

#### Sistema de Reintentos

```javascript
const MAX_RETRIES = 3;
// Reintentos automáticos con sincronización
// Reset automático después de éxito
```

## 🤝 Contribución

### 👥 Cómo Contribuir

1. **Fork** el repositorio
2. **Crea** una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. **Push** a la rama (`git push origin feature/AmazingFeature`)
5. **Abre** un Pull Request

### 📝 Estándares de Código

- Usar **ES Modules** (import/export)
- Comentarios en **español** para documentación
- Logs detallados con **chalk** para colores
- Manejo robusto de **errores async/await**
- Tests unitarios con **Jest** (próximamente)

### 🐛 Reportar Bugs

Usa el [issue tracker](https://github.com/tu-usuario/auto-push-system/issues) para reportar bugs. Incluye:
- Versión de Node.js
- Sistema operativo
- Logs de error
- Pasos para reproducir

## 📝 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

### MIT License

```
Copyright (c) 2024 Auto-Push System

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 🔗 Enlaces Útiles

### 🌐 Recursos Adicionales

#### Documentación
- [Documentación de Node.js](https://nodejs.org/docs/)
- [Git Documentation](https://git-scm.com/doc)
- [Chokidar API](https://github.com/paulmillr/chokidar)

#### Comunidad
- [Issues](https://github.com/tu-usuario/auto-push-system/issues)
- [Pull Requests](https://github.com/tu-usuario/auto-push-system/pulls)
- [Discussions](https://github.com/tu-usuario/auto-push-system/discussions)

#### Herramientas Relacionadas
- [Simple Git](https://github.com/steveukx/git-js)
- [Chalk](https://github.com/chalk/chalk)
- [Day.js](https://day.js.org/)

## 🚀 Próximas Funcionalidades

### 🔮 Roadmap

#### v1.1.0
- [x] Configuración mediante archivo JSON
- [ ] Soporte para múltiples archivos
- [ ] Webhooks de notificación
- [ ] API REST para control remoto

#### v1.2.0
- [ ] Interfaz web de monitoreo
- [ ] Integración con CI/CD
- [ ] Soporte para Git hooks
- [ ] Compresión de archivos grandes

#### v2.0.0
- [ ] Soporte para múltiples repositorios
- [ ] Sistema de plugins
- [ ] Interfaz gráfica (GUI)
- [ ] Integración con servicios en la nube

---

<div align="center">
  <p>Hecho con ❤️ por <strong>Auto-Push System</strong></p>
  <p>⭐ ¡Dale una estrella si este proyecto te ha sido útil!</p>
</div>

---

<div align="center">
  <sub>Built with 🔥 by developers, for developers</sub>
</div>

<p align="right">(<a href="#-tabla-de-contenidos">volver al inicio</a>)</p>

---