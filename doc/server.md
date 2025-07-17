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

# 🎬 Notion Movie Database API

> Una API REST completa para gestionar una base de datos de películas, series, animes y documentales integrada con Notion y Cloudinary.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![Notion API](https://img.shields.io/badge/Notion-API-000000?style=flat-square&logo=notion&logoColor=white)](https://developers.notion.com/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Cloud%20Storage-3448C5?style=flat-square&logo=cloudinary&logoColor=white)](https://cloudinary.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

## 📋 Tabla de Contenido

<details>
<summary>🔽 Expandir menú</summary>

- [🎬 Notion Movie Database API](#-notion-movie-database-api)
  - [📋 Tabla de Contenido](#-tabla-de-contenido)
  - [✨ Características](#-características)
  - [🛠️ Tecnologías Utilizadas](#️-tecnologías-utilizadas)
  - [📋 Requisitos Previos](#-requisitos-previos)
  - [🚀 Instalación](#-instalación)
    - [1. Clonar el repositorio](#1-clonar-el-repositorio)
    - [2. Instalar dependencias](#2-instalar-dependencias)
    - [3. Crear directorio de uploads](#3-crear-directorio-de-uploads)
  - [⚙️ Configuración](#️-configuración)
    - [1. Configurar Notion](#1-configurar-notion)
    - [2. Configurar Cloudinary](#2-configurar-cloudinary)
    - [3. Configurar variables de entorno](#3-configurar-variables-de-entorno)
  - [🔧 Uso](#-uso)
    - [Iniciar el servidor](#iniciar-el-servidor)
    - [Estructura de archivos estáticos](#estructura-de-archivos-estáticos)
  - [📚 Documentación de la API](#-documentación-de-la-api)
    - [Endpoints principales](#endpoints-principales)
    - [Ejemplo de uso](#ejemplo-de-uso)
      - [Crear una película](#crear-una-película)
      - [Obtener estadísticas](#obtener-estadísticas)
  - [🗂️ Estructura del Proyecto](#️-estructura-del-proyecto)
  - [🎯 Características Avanzadas](#-características-avanzadas)
    - [Sistema de Logging](#sistema-de-logging)
    - [Gestión de Relaciones](#gestión-de-relaciones)
    - [Subida de Archivos](#subida-de-archivos)
  - [🤝 Contribución](#-contribución)
    - [Guías de contribución](#guías-de-contribución)
  - [📄 Licencia](#-licencia)
  - [🆘 Soporte](#-soporte)
    - [Problemas comunes](#problemas-comunes)
    - [Contacto](#contacto)

</details>

## ✨ Características

- **🎭 Gestión completa de contenido multimedia**: Películas, series, animes y documentales
- **🖼️ Almacenamiento en la nube**: Integración con Cloudinary para imágenes
- **🗄️ Base de datos Notion**: Aprovecha la flexibilidad de Notion como base de datos
- **🌐 API RESTful**: Endpoints completos para CRUD operations
- **📊 Estadísticas en tiempo real**: Dashboard con métricas de contenido
- **🔍 Búsqueda avanzada**: Filtros por categoría, género, idioma y más
- **📱 Responsive**: Interfaz web adaptable a diferentes dispositivos
- **🎨 Logging colorido**: Sistema de logs con colores y timestamps
- **📤 Subida de archivos**: Soporte para múltiples formatos de imagen

## 🛠️ Tecnologías Utilizadas

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| ![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white) | 18+ | Runtime de JavaScript |
| ![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?style=flat-square&logo=express&logoColor=white) | 4.x | Framework web |
| ![Notion API](https://img.shields.io/badge/Notion-API-000000?style=flat-square&logo=notion&logoColor=white) | Latest | Base de datos |
| ![Cloudinary](https://img.shields.io/badge/Cloudinary-Cloud%20Storage-3448C5?style=flat-square&logo=cloudinary&logoColor=white) | Latest | Almacenamiento de imágenes |
| ![Multer](https://img.shields.io/badge/Multer-File%20Upload-FF6B6B?style=flat-square) | Latest | Subida de archivos |
| ![CORS](https://img.shields.io/badge/CORS-Enabled-4ECDC4?style=flat-square) | Latest | Cross-Origin Resource Sharing |

## 📋 Requisitos Previos

- **Node.js** (v18 o superior)
- **npm** o **yarn**
- Cuenta en **Notion** con acceso a la API
- Cuenta en **Cloudinary**

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/notion-movie-database.git
cd notion-movie-database
```

### 2. Instalar dependencias

```bash
npm install
# o
yarn install
```

### 3. Crear directorio de uploads

```bash
mkdir uploads
```

## ⚙️ Configuración

### 1. Configurar Notion

1. Crear una integración en [Notion Developers](https://developers.notion.com/)
2. Obtener el token de integración
3. Crear las siguientes bases de datos en Notion:
   - **Películas** (principal)
   - **Categorías**
   - **Géneros**
   - **Audios**
   - **Subtítulos**

### 2. Configurar Cloudinary

1. Crear cuenta en [Cloudinary](https://cloudinary.com/)
2. Obtener las credenciales del dashboard

### 3. Configurar variables de entorno

Editar las siguientes variables en el archivo `server.js`:

```javascript
// Configuración de Cloudinary
cloudinary.v2.config({
  cloud_name: 'tu-cloud-name',
  api_key: 'tu-api-key',
  api_secret: 'tu-api-secret'
});

// Configuración de Notion
const notion = new Client({
  auth: 'tu-notion-token'
});

// IDs de las bases de datos
const databaseId = 'tu-database-id-principal';
const RELATION_DATABASES = {
  categoria: 'tu-categoria-database-id',
  generos: 'tu-generos-database-id',
  audios: 'tu-audios-database-id',
  subtitulos: 'tu-subtitulos-database-id'
};
```

## 🔧 Uso

### Iniciar el servidor

```bash
npm start
# o
node server.js
```

El servidor estará disponible en `http://localhost:3000`

### Estructura de archivos estáticos

```
public/
├── index.html          # Página principal
├── css/
│   └── styles.css      # Estilos personalizados
├── js/
│   └── app.js          # Lógica del frontend
└── assets/
    └── images/         # Imágenes estáticas
```

## 📚 Documentación de la API

### Endpoints principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/notion` | Listar todas las películas |
| `GET` | `/api/notion/:id` | Obtener película específica |
| `POST` | `/api/notion` | Crear nueva película |
| `PUT` | `/api/notion/:id` | Actualizar película |
| `DELETE` | `/api/notion/:id` | Eliminar película |
| `GET` | `/api/notion-stats` | Obtener estadísticas |
| `GET` | `/api/selector-data` | Obtener datos para selectores |

### Ejemplo de uso

#### Crear una película

```bash
curl -X POST http://localhost:3000/api/notion \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "El Padrino",
    "ano": 1972,
    "categoria": "Películas",
    "generos": ["Drama", "Crimen"],
    "synopsis": "La historia de una familia de la mafia...",
    "puntuacion": 9.2
  }'
```

#### Obtener estadísticas

```bash
curl http://localhost:3000/api/notion-stats
```

Respuesta:
```json
{
  "movies": 150,
  "series": 45,
  "animes": 30,
  "documentaries": 12
}
```

## 🗂️ Estructura del Proyecto

```
notion-movie-database/
├── server.js              # Servidor principal
├── package.json           # Dependencias y scripts
├── uploads/               # Directorio temporal para archivos
├── public/                # Archivos estáticos
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── assets/
└── README.md             # Este archivo
```

## 🎯 Características Avanzadas

### Sistema de Logging

El servidor incluye un sistema de logging avanzado con:
- **Colores automáticos** según el tipo de mensaje
- **Timestamps** precisos
- **Detección de terminal** para compatibilidad
- **Emojis** como alternativa visual

### Gestión de Relaciones

- **Búsqueda automática** de páginas relacionadas
- **Creación automática** de nuevas relaciones
- **Formateo de IDs** de Notion
- **Caché de relaciones** para optimización

### Subida de Archivos

- **Límite de tamaño**: 10MB por archivo
- **Formatos soportados**: JPG, PNG, WebP, GIF
- **Almacenamiento en Cloudinary**
- **Eliminación automática** de archivos temporales

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Guías de contribución

- Mantén el estilo de código consistente
- Incluye tests para nuevas funcionalidades
- Actualiza la documentación si es necesario
- Utiliza mensajes de commit descriptivos

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

## 🆘 Soporte

### Problemas comunes

**Error de conexión con Notion**
```bash
Error: Notion token inválido
```
- Verificar que el token de Notion sea correcto
- Asegurarse de que la integración tenga permisos

**Error de subida a Cloudinary**
```bash
Error: Cloudinary configuration error
```
- Verificar credenciales de Cloudinary
- Comprobar límites de almacenamiento

### Contacto

- **Issues**: [GitHub Issues](https://github.com/tu-usuario/notion-movie-database/issues)
- **Discusiones**: [GitHub Discussions](https://github.com/tu-usuario/notion-movie-database/discussions)
- **Email**: tu-email@ejemplo.com

---

<div align="center">
  <p>Hecho con ❤️ por <a href="https://github.com/tu-usuario">Tu Nombre</a></p>
  <p>⭐ ¡Dale una estrella si te fue útil!</p>
</div>