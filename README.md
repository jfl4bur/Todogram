<a id="readme-top"></a>


<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/jfl4bur/Todogram">
    <img src="./images/logo.png" alt="Logo" width="180" height="180">
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


# Todogram TV

  [![Contributors][contributors-shield]][contributors-url]
  [![Forks][forks-shield]][forks-url]
  [![Stargazers][stars-shield]][stars-url]
  [![Issues][issues-shield]][issues-url]
  [![License][license-shield]][license-url]
  [![Telegram][telegram-shield]][telegram-url]



---

## 📚 Tabla de Contenidos

- 📌 [Descripción general](#descripción-general)
- 🧰 [Requisitos](#requisitos)
- 💻 [Instalación local](#instalación-local)
- 🚀 [Uso con GitHub Actions](#uso-con-github-actions)
- 📁 [Estructura de archivos](#estructura-de-archivos)
- 🔍 [Explicación técnica](#explicación-técnica)
- 🧭 [Diagrama del flujo de datos](#diagrama-del-flujo-de-datos)
- 🧯 [Errores comunes y soluciones](#errores-y-soluciones)
- ❓ [Preguntas frecuentes (FAQ)](#faq)
- 🌐 [Despliegue en Vercel y Netlify](#despliegue-en-vercel-y-netlify)
- 📊 [Datos de interés](#datos-de-interés)
- 🙌 [Agradecimientos](#agradecimientos)
- 👤 [Autor](#autor)

---

## 📌 Descripción general

Este proyecto permite sincronizar una base de datos de películas y series desde **Notion**, enriquecerla automáticamente usando la **API de TMDb**, generar un archivo `data.json` final con los resultados combinados, y desplegarlo fácilmente en una web tipo **Rakuten.tv** con **Softr** o cualquier frontend conectado.

El flujo de trabajo automatiza la extracción, sincronización, formateo y despliegue de los datos, haciendo uso de scripts en Node.js y GitHub Actions.

---

## 🧰 Requisitos

Antes de instalar, asegúrate de tener:

- ✅ [Node.js][Node-url]
- ✅ [npm][Node-url] (incluido con Node)
- ✅ [Git](https://git-scm.com)
- ✅ Cuenta en [GitHub](https://github.com)
- ✅ API Key de [TMDb][TMDb-API-url]
- ✅ Base de datos estructurada en [Notion][Notion-API-url]

---

## 💻 Instalación local

### 1. Clona el repositorio
```bash
git clone https://github.com/jfl4bur/Todogram.git
cd Todogram
```

### 2. Instala las dependencias
```bash
npm install
```
Esto ejecutará automáticamente el `postinstall` y descargará:
- `inquirer`
- `chalk`
- `figlet`
- `gradient-string`
- `cli-progress`
- `boxen`

### 3. Añade tus variables de entorno
Crea un archivo `.env` con:
```
NOTION_TOKEN=tu_token_secreto
NOTION_DATABASE_ID=tu_database_id
TMDB_API_KEY=tu_clave_tmdb
```

### 4. Ejecuta el script principal
```bash
npm start
```
Esto abrirá el menú visual de **Todogram TV**, que te permitirá:
- Obtener datos
- Lanzar auto-push
- Ver logs
- Hacer push seguro
- Instalar dependencias

---

## 🚀 Uso con GitHub Actions

El proyecto incluye un workflow llamado `sync.yml` en `.github/workflows/` que:
- Se ejecuta manualmente o cada hora (CRON)
- Extrae datos desde Notion
- Consulta TMDb si faltan campos
- Genera `public/data.json`
- Hace push automáticamente si hubo cambios

### Ejecutar manualmente:
Desde GitHub > Actions > `Sync Notion y TMDB` > Run workflow

---

## 📁 Estructura de archivos

```
├── Todogram.js            # Menú visual interactivo (principal)
├── start.js               # Extrae datos desde Notion y TMDb
├── auto-push.js           # Realiza git add, commit y push interactivo
├── .env                   # Variables de entorno (no subir al repo)
├── /public/data.json      # Archivo generado con los datos
├── /github/workflows/     # Workflow de sincronización automática
└── package.json           # Scripts, postinstall y dependencias
```

---

## 🔍 Explicación técnica

- `start.js` extrae primero los datos locales de Notion
  - Usa propiedades de texto como `Géneros txt` y `Categorías txt` para evitar consumir API extra
  - Si falta información, consulta TMDb por ID o título
  - Fusiona los datos, priorizando Notion
  - Genera un `data.json` público

- `auto-push.js` automatiza el control de Git (add, commit, push) y puede forzar workflows con commits vacíos

- `Todogram.js` es el controlador visual, mostrando todas las opciones posibles con menús amigables, color y animaciones

---

## 🧭 Diagrama del flujo de datos

![Flujo de datos Notion > TMDb > JSON > Web](./A_flowchart_in_the_image_illustrates_the_integrati.png)

1. **Notion** → extraemos los datos manuales
2. **TMDb API** → completamos campos vacíos automáticamente
3. **JSON** → se genera un archivo `data.json`
4. **Softr Web** → la web visualiza el JSON actualizado
<p align="right">(<a href="#-tabla-de-contenidos">volver al inicio</a>)</p>

---

## 🧯 Errores y soluciones

| Error | Causa | Solución |
|------|-------|----------|
| `Missing Notion token` | No creaste `.env` | Crea `.env` con tus claves |
| `Cannot find start.js` | Falta archivo | Verifica que esté en la carpeta principal |
| `gh auth status` falla | GitHub CLI no instalado o no logueado | Ejecuta `gh auth login` |
| API rate limit | Muchas llamadas a Notion/TMDB | Usa campos `txt` ya procesados en Notion |

---

## ❓ FAQ

**¿Necesito conocimientos técnicos avanzados?**
> No. El menú de Todogram es para principiantes y automatiza todo el flujo.

**¿Cómo sé si tengo todo instalado?**
> Usa la opción `[6] Verificar dependencias` y verás ✅ o ❌ según tu sistema.

**¿Se puede modificar el diseño visual?**
> Sí. Puedes editar `Todogram.js` y usar más colores, bordes, o animaciones con `chalk`, `boxen`, etc.

**¿Puedo usarlo sin Softr?**
> Sí. El JSON generado (`public/data.json`) puede ser usado con cualquier frontend: React, Vue, Next, etc.

---

## 🌐 Despliegue en Vercel y Netlify

### Vercel
- Crea un nuevo proyecto desde el repositorio
- En settings, define las variables del entorno (`.env`)
- Apunta a un script build vacío (`build: ""`) si solo sirves JSON/static

### Netlify
- Usa el repo como origen
- Añade tus variables de entorno
- Puedes usar `netlify.toml` si quieres definir rutas

Ambas plataformas sirven `public/data.json` directamente para usarlo desde Softr u otro cliente web.

---

## 📊 Datos de interés

- Automatización completa Notion + TMDb + JSON + Web
- Control visual para Git sin escribir comandos complejos
- Optimización para evitar sobrecargar la API de Notion
- Listo para principiantes totales

---

## 🙌 Agradecimientos

Gracias a:
* [![Node.js][Node.js]][Node-url]
* [![JavaScript][JavaScript.com]][JavaScript-url]
* [![GitHub Actions][GitHub-Actions]][GitHub-Actions-url]
* [![Notion API][Notion-API]][Notion-API-url]
* [![TMDb API][TMDb-API]][TMDb-API-url]

---

## 👤 Autor

| [<img src="https://avatars.githubusercontent.com/u/74684004?v=4" width=115><br><sub>@Todogram</sub>](https://github.com/jfl4bur) |
|:---:|


---

## 🧱 Construido con

* [![Node.js][Node.js]][Node-url]
* [![JavaScript][JavaScript.com]][JavaScript-url]
* [![GitHub Actions][GitHub-Actions]][GitHub-Actions-url]
* [![Notion API][Notion-API]][Notion-API-url]
* [![TMDb API][TMDb-API]][TMDb-API-url]


<!-- Referencias -->
[Node.js]: https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white
[Node-url]: https://nodejs.org/
[JavaScript.com]: https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black
[JavaScript-url]: https://developer.mozilla.org/en-US/docs/Web/JavaScript
[GitHub-Actions]: https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white
[GitHub-Actions-url]: https://github.com/features/actions
[Notion-API]: https://img.shields.io/badge/Notion-000000?style=for-the-badge&logo=notion&logoColor=white
[Notion-API-url]: https://developers.notion.com/
[TMDb-API]: https://img.shields.io/badge/TMDb-01D277?style=for-the-badge&logo=themoviedatabase&logoColor=white
[TMDb-API-url]: https://www.themoviedb.org/documentation/api

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/jfl4bur/Todogram.svg?style=for-the-badge
[contributors-url]: https://github.com/jfl4bur/Todogram/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/jfl4bur/Todogram.svg?style=for-the-badge
[forks-url]: https://github.com/jfl4bur/Todogram/network/members
[stars-shield]: https://img.shields.io/github/stars/jfl4bur/Todogram.svg?style=for-the-badge
[stars-url]: https://github.com/jfl4bur/Todogram/stargazers
[issues-shield]: https://img.shields.io/github/issues/jfl4bur/Todogram.svg?style=for-the-badge
[issues-url]: https://github.com/jfl4bur/Todogram/issues
[license-shield]: https://img.shields.io/github/license/jfl4bur/Todogram.svg?style=for-the-badge
[license-url]: https://github.com/jfl4bur/Todogram/blob/main/LICENSE.txt
[telegram-shield]: https://img.shields.io/badge/Telegram-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white
[telegram-url]: https://t.me/Todogram
