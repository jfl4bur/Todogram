<div align="center">
  <img src="../images/logo.png" alt="Todogram Logo" width="200" height="200">
 <h1>🎬 Panel de Administración - Todogram</h1>
 <p align="center">
  <strong>🚀 Extracción optimizada de datos de Notion para gestión de películas y series</strong>
  <br>
</p>
 
  [![Version](https://img.shields.io/badge/version-3.2-red.svg)](https://github.com/jfl4bur/Todogram/releases)  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)  [![Node.js](https://img.shields.io/badge/node.js-16+-green.svg)](https://nodejs.org/)  [![Notion API](https://img.shields.io/badge/Notion%20API-2022--06--28-black.svg)](https://developers.notion.com/)  [![Status](https://img.shields.io/badge/status-active-brightgreen.svg)]()  [![Contributions](https://img.shields.io/badge/contributions-welcome-orange.svg)](CONTRIBUTING.md)
</div>

<p align="center">
  Panel de administración web completo para gestionar tu base de datos de películas en Notion
</p>

<p align="center">
  <a href="#-tabla-de-contenido">Tabla de Contenido</a> •
  <a href="#-instalación">Instalación</a> •
  <a href="#-uso">Uso</a> •
  <a href="#-contribuir">Contribuir</a> •
  <a href="#-licencia">Licencia</a>
</p>

---

## 📋 Tabla de Contenido

<details>
<summary><strong>📂 Contenido Principal</strong></summary>

- [📋 Tabla de Contenido](#-tabla-de-contenido)
- [✨ Características](#-características)
  - [🎯 Funcionalidades Principales](#-funcionalidades-principales)
- [🔧 Tecnologías](#-tecnologías)
  - [📚 Librerías y Servicios](#-librerías-y-servicios)
- [📦 Instalación](#-instalación)
  - [📋 Requisitos Previos](#-requisitos-previos)
  - [🔧 Instalación Paso a Paso](#-instalación-paso-a-paso)
- [🚀 Uso](#-uso)
  - [🎬 Gestión de Películas](#-gestión-de-películas)
  - [📊 Estadísticas](#-estadísticas)
  - [🔍 Búsqueda](#-búsqueda)
- [🎯 Características Principales](#-características-principales)
  - [🎨 Interfaz de Usuario](#-interfaz-de-usuario)
  - [🔧 Funcionalidades Técnicas](#-funcionalidades-técnicas)
- [📱 Interfaz](#-interfaz)
  - [🖥️ Pantalla Principal](#️-pantalla-principal)
  - [📱 Responsive Design](#-responsive-design)
- [🔄 API Endpoints](#-api-endpoints)
  - [📡 Endpoints Principales](#-endpoints-principales)
  - [📊 Estructura de Datos](#-estructura-de-datos)
- [📊 Estadísticas](#-estadísticas-1)
  - [📈 Métricas Disponibles](#-métricas-disponibles)
  - [📊 Visualización](#-visualización)
- [🎨 Personalización](#-personalización)
  - [🎨 Temas](#-temas)
  - [🔧 Configuración de Estilos](#-configuración-de-estilos)
- [📝 Configuración](#-configuración)
  - [🔧 Variables de Entorno](#-variables-de-entorno)
  - [📚 Estructura de Base de Datos Notion](#-estructura-de-base-de-datos-notion)
- [🔧 Desarrollo](#-desarrollo)
  - [🛠️ Configuración del Entorno de Desarrollo](#️-configuración-del-entorno-de-desarrollo)
  - [📁 Estructura del Proyecto](#-estructura-del-proyecto)
  - [🔄 Scripts Disponibles](#-scripts-disponibles)
- [📈 Versionado](#-versionado)
  - [🚀 Historial de Versiones](#-historial-de-versiones)
- [🤝 Contribuir](#-contribuir)
  - [📋 Guías de Contribución](#-guías-de-contribución)
- [📄 Licencia](#-licencia)
- [👨‍💻 Autor](#-autor)
- [🙏 Agradecimientos](#-agradecimientos)
</details>

---

## ✨ Características

<div align="center">
  <table>
    <tr>
      <td align="center" width="200">
        <img src="https://img.shields.io/badge/🎬-Gestión%20de%20Películas-red?style=for-the-badge" alt="Gestión de Películas">
        <br><em>Administra tu colección completa</em>
      </td>
      <td align="center" width="200">
        <img src="https://img.shields.io/badge/📊-Estadísticas-blue?style=for-the-badge" alt="Estadísticas">
        <br><em>Visualiza métricas en tiempo real</em>
      </td>
      <td align="center" width="200">
        <img src="https://img.shields.io/badge/🔍-Búsqueda-green?style=for-the-badge" alt="Búsqueda">
        <br><em>Encuentra contenido al instante</em>
      </td>
    </tr>
    <tr>
      <td align="center" width="200">
        <img src="https://img.shields.io/badge/📱-Responsive-orange?style=for-the-badge" alt="Responsive">
        <br><em>Funciona en todos los dispositivos</em>
      </td>
      <td align="center" width="200">
        <img src="https://img.shields.io/badge/🎨-Interfaz%20Moderna-purple?style=for-the-badge" alt="Interfaz Moderna">
        <br><em>Diseño elegante y funcional</em>
      </td>
      <td align="center" width="200">
        <img src="https://img.shields.io/badge/⚡-Tiempo%20Real-yellow?style=for-the-badge" alt="Tiempo Real">
        <br><em>Sincronización instantánea</em>
      </td>
    </tr>
  </table>
</div>

### 🎯 Funcionalidades Principales

- **🎬 Gestión Completa de Películas y Series**
  - Crear, editar y eliminar entradas
  - Categorización automática (Películas, Series, Animes, Documentales)
  - Gestión de géneros, audios y subtítulos
  - Subida de imágenes (portadas y carteles)

- **📊 Panel de Estadísticas**
  - Contador total de entradas
  - Desglose por categorías
  - Conteo de episodios
  - Métricas en tiempo real

- **🔍 Búsqueda Avanzada**
  - Búsqueda en tiempo real
  - Filtros por categoría
  - Resultados instantáneos

- **📱 Diseño Responsive**
  - Interfaz adaptable a móviles y tablets
  - Experiencia de usuario optimizada
  - Animaciones suaves

## 🔧 Tecnologías

<div align="center">
  <table>
    <tr>
      <td align="center" width="96">
        <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" width="48" height="48" alt="Node.js">
        <br>Node.js
      </td>
      <td align="center" width="96">
        <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/express/express-original.svg" width="48" height="48" alt="Express">
        <br>Express
      </td>
      <td align="center" width="96">
        <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" width="48" height="48" alt="JavaScript">
        <br>JavaScript
      </td>
      <td align="center" width="96">
        <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg" width="48" height="48" alt="HTML5">
        <br>HTML5
      </td>
      <td align="center" width="96">
        <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg" width="48" height="48" alt="CSS3">
        <br>CSS3
      </td>
    </tr>
  </table>
</div>

### 📚 Librerías y Servicios

- **[@notionhq/client](https://github.com/makenotion/notion-sdk-js)** - SDK oficial de Notion
- **[Cloudinary](https://cloudinary.com/)** - Gestión de imágenes en la nube
- **[Multer](https://github.com/expressjs/multer)** - Manejo de archivos multipart
- **[CORS](https://github.com/expressjs/cors)** - Cross-Origin Resource Sharing
- **[Font Awesome](https://fontawesome.com/)** - Iconos vectoriales

## 📦 Instalación

### 📋 Requisitos Previos

- **Node.js** 16.0.0 o superior
- **npm** 7.0.0 o superior
- Una cuenta en **Notion** con API habilitada
- Una cuenta en **Cloudinary** (opcional, para imágenes)

### 🔧 Instalación Paso a Paso

1. **Clona el repositorio**
   ```bash
   git clone https://github.com/jfl4bur/Todogram.git
   cd Todogram
   ```

2. **Instala las dependencias**
   ```bash
   npm install
   ```

3. **Configura las variables de entorno**
   ```bash
   cp .env.example .env
   ```
   
   Edita el archivo `.env` con tus credenciales:
   ```env
   NOTION_TOKEN=tu_token_de_notion
   NOTION_DATABASE_ID=tu_database_id
   CLOUDINARY_CLOUD_NAME=tu_cloud_name
   CLOUDINARY_API_KEY=tu_api_key
   CLOUDINARY_API_SECRET=tu_api_secret
   PORT=3000
   ```

4. **Inicia el servidor**
   ```bash
   npm start
   ```

5. **Accede a la aplicación**
   Abre tu navegador y ve a `http://localhost:3000`

## 🚀 Uso

### 🎬 Gestión de Películas

1. **Crear Nueva Película**
   - Haz clic en "Nueva Película"
   - Completa el formulario
   - Sube imágenes de portada
   - Selecciona géneros, audios y subtítulos
   - Guarda los cambios

2. **Editar Película Existente**
   - Haz clic en el botón de editar (✏️)
   - Modifica los campos necesarios
   - Guarda los cambios

3. **Eliminar Película**
   - Haz clic en el botón de eliminar (🗑️)
   - Confirma la acción

### 📊 Estadísticas

El panel muestra automáticamente:
- Total de entradas
- Desglose por categorías (Películas, Series, Animes, Documentales)
- Conteo de episodios
- Elementos pendientes

### 🔍 Búsqueda

- Utiliza la barra de búsqueda para encontrar contenido
- La búsqueda funciona en tiempo real
- Busca por título, año, o cualquier campo

## 🎯 Características Principales

### 🎨 Interfaz de Usuario

- **Diseño Moderno**: Esquema de colores premium con tonos oscuros y acentos rojos
- **Navegación Intuitiva**: Pestañas organizadas para diferentes funcionalidades
- **Animaciones Suaves**: Transiciones elegantes entre estados
- **Feedback Visual**: Indicadores de carga y mensajes de estado

### 🔧 Funcionalidades Técnicas

- **Paginación Inteligente**: Carga progresiva de contenido
- **Sincronización en Tiempo Real**: Actualización automática de estadísticas
- **Gestión de Errores**: Manejo robusto de errores y recuperación
- **Validación de Formularios**: Validación del lado cliente y servidor

## 📱 Interfaz

### 🖥️ Pantalla Principal

<div align="center">
  <img src="https://img.shields.io/badge/Vista-Principal-brightgreen?style=for-the-badge" alt="Vista Principal">
</div>

La interfaz principal incluye:
- **Header**: Navegación principal con logo y pestañas
- **Estadísticas**: Panel de métricas en tiempo real
- **Pendientes**: Elementos sin categorizar
- **Lista de Películas**: Vista de cuadrícula con todas las películas
- **Paginación**: Navegación entre páginas de resultados

### 📱 Responsive Design

- **Móviles**: Diseño optimizado para pantallas pequeñas
- **Tablets**: Adaptación automática del layout
- **Desktop**: Experiencia completa de escritorio

## 🔄 API Endpoints

### 📡 Endpoints Principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/notion` | Obtiene lista de películas |
| `POST` | `/api/notion` | Crea nueva película |
| `GET` | `/api/notion/:id` | Obtiene película específica |
| `PUT` | `/api/notion/:id` | Actualiza película |
| `DELETE` | `/api/notion/:id` | Elimina película |
| `GET` | `/api/notion-stats` | Obtiene estadísticas |
| `GET` | `/api/notion-search` | Busca películas |
| `POST` | `/api/notion/:id/duplicate` | Duplica película |

### 📊 Estructura de Datos

```json
{
  "id": "página_id",
  "properties": {
    "Título": "Nombre de la película",
    "Año": 2023,
    "Categoría": ["Película"],
    "Géneros": ["Acción", "Drama"],
    "Audios": ["Español", "Inglés"],
    "Subtítulos": ["Español"],
    "Sinopsis": "Descripción de la película...",
    "Portada": "url_imagen",
    "Carteles": ["url_imagen_1", "url_imagen_2"]
  }
}
```

## 📊 Estadísticas

### 📈 Métricas Disponibles

- **Total de Entradas**: Suma de todas las películas, series y episodios
- **Películas**: Conteo de películas individuales
- **Series**: Conteo de series (sin episodios)
- **Animes**: Conteo de animes
- **Documentales**: Conteo de documentales
- **Episodios**: Conteo de episodios de series
- **Episodios DOC**: Conteo de episodios de documentales

### 📊 Visualización

Las estadísticas se muestran en:
- **Tarjetas individuales** para cada categoría
- **Contador total** prominente
- **Actualización automática** en tiempo real

## 🎨 Personalización

### 🎨 Temas

El panel utiliza un esquema de colores personalizable:
- **Colores Primarios**: Rojo vino (#8B0000)
- **Fondos**: Tonos oscuros (#1a1a1a, #2a2a2a)
- **Texto**: Blanco y grises claros
- **Acentos**: Rojos brillantes para elementos interactivos

### 🔧 Configuración de Estilos

```css
:root {
  --primary-color: #8B0000;
  --secondary-color: #A52A2A;
  --background-dark: #1a1a1a;
  --background-light: #2a2a2a;
  --text-primary: #ffffff;
  --text-secondary: #cccccc;
}
```

## 📝 Configuración

### 🔧 Variables de Entorno

```env
# Notion Configuration
NOTION_TOKEN=secret_tu_token_aquí
NOTION_DATABASE_ID=tu_database_id_aquí

# Cloudinary Configuration (Opcional)
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 📚 Estructura de Base de Datos Notion

Tu base de datos de Notion debe tener las siguientes propiedades:

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| Título | Title | Nombre de la película/serie |
| Año | Number | Año de lanzamiento |
| Categoría | Relation | Relación con base de categorías |
| Géneros | Relation | Relación con base de géneros |
| Audios | Relation | Relación con base de audios |
| Subtítulos | Relation | Relación con base de subtítulos |
| Sinopsis | Rich Text | Descripción de la película |
| Portada | Files | Imagen de portada |
| Carteles | Files | Imágenes adicionales |

## 🔧 Desarrollo

### 🛠️ Configuración del Entorno de Desarrollo

1. **Instala las dependencias de desarrollo**
   ```bash
   npm install --include=dev
   ```

2. **Inicia el servidor en modo desarrollo**
   ```bash
   npm run dev
   ```

3. **Ejecuta las pruebas**
   ```bash
   npm test
   ```

### 📁 Estructura del Proyecto

```
Todogram/
├── public/
│   ├── index.html          # Interfaz principal
│   └── assets/
├── src/
│   ├── server.js           # Servidor Express
│   ├── routes/             # Rutas de la API
│   └── utils/              # Utilidades
├── docs/
│   ├── server.md           # Documentación del servidor
│   ├── extractor.md        # Documentación del extractor
│   └── auto-push.md        # Documentación de auto-push
├── images/
│   └── logo.png            # Logo del proyecto
├── .env.example            # Variables de entorno ejemplo
├── package.json
└── README.md
```

### 🔄 Scripts Disponibles

- `npm start` - Inicia el servidor en producción
- `npm run dev` - Inicia el servidor en desarrollo
- `npm test` - Ejecuta las pruebas
- `npm run lint` - Ejecuta el linter
- `npm run build` - Construye el proyecto para producción

## 📈 Versionado

Este proyecto utiliza [Semantic Versioning](https://semver.org/) para el versionado. Para ver las versiones disponibles, consulta las [etiquetas en este repositorio](https://github.com/jfl4bur/Todogram/tags).

### 🚀 Historial de Versiones

<details>
<summary><strong>📋 Versión 3.2 - Actual</strong></summary>

> **Fecha**: En desarrollo
> **Estado**: 🚧 En progreso

**Características principales:**
- Mejoras en el rendimiento general
- Optimizaciones de la interfaz de usuario
- Correcciones de errores menores
</details>

<details>
<summary><strong>📋 Versión 3.1 - Correcciones Frontend</strong></summary>

> **Fecha**: Reciente
> **Estado**: ✅ Completada

**Cambios realizados:**
- ✅ **Botón de editar en pendientes**: Agregado botón de editar con icono en tarjetas pendientes
- ✅ **Contador total corregido**: Modificado endpoint de estadísticas para incluir `totalEntries`
- ✅ **Búsqueda mejorada**: Corregida función `searchMovies` para manejar respuestas del endpoint
- ✅ **Detección de cambios**: Mejorada la detección en formularios para prevenir pérdida de datos

**Mejoras técnicas:**
- Reorganización de botones: Editar, Guardar, Duplicar, Eliminar
- Manejo de errores mejorado en búsqueda
- Actualización del frontend para usar nuevo contador
- Código ajustado para respuestas del servidor
</details>

<details>
<summary><strong>📋 Versión 3.0 - Mejoras Mayores</strong></summary>

> **Fecha**: Anterior
> **Estado**: ✅ Completada

**Cambios principales:**
- ✅ **Sección de Pendientes**: Botón "Guardar" con ícono en elementos pendientes
- ✅ **Estadísticas mejoradas**: Contador total movido a estadísticas como primer elemento
- ✅ **Diseño de tarjetas**: Mejoras en series y documentales con formato "12 / 112"
- ✅ **Búsqueda corregida**: Problemas del servidor solucionados
- ✅ **Simplificación**: Lógica de búsqueda simplificada para mejor fiabilidad

**Mejoras visuales:**
- Contadores muestran "Series / Episodios" con estilos diferenciados
- Episodios con colores más suaves
- Ajustes de estilo para mejor presentación
- Lógica del frontend mejorada para nuevos contadores
</details>

<details>
<summary><strong>📋 Versión 2.9 - Funcionalidades Avanzadas</strong></summary>

> **Fecha**: Anterior
> **Estado**: ✅ Completada

**Nuevas funcionalidades:**
- ✅ **Botón de envío a Notion**: Reemplazado editar por guardar en pendientes
- ✅ **Función assignCategory**: Implementada para envío directo de categorías
- ✅ **Edición de campos vacíos**: Endpoint PUT modificado para campos vacíos
- ✅ **Búsqueda corregida**: Solucionado error en función `searchMovies`
- ✅ **Diseño de contadores**: Series y documentales con diseño de dos líneas

**Mejoras adicionales:**
- Toggle para mostrar/ocultar lista de pendientes
- Problema de campos vacíos corregido en edición
- Gestión de imágenes mejorada al editar
- Código optimizado en cliente y servidor
</details>

<details>
<summary><strong>📋 Versión 2.8 - Búsqueda y Documentales</strong></summary>

> **Fecha**: Anterior
> **Estado**: ✅ Completada

**Características implementadas:**
- ✅ **Búsqueda robusta**: Nuevo endpoint `/api/notion-search` para búsqueda completa
- ✅ **Contadores para Documentales**: Nuevos contadores "Documentales" y "Episodios DOC"
- ✅ **Bloque de pendientes**: Botón expandir/contraer, expandido por defecto
- ✅ **Filtrar pendientes**: Toggle para mostrar/ocultar entradas sin categoría
- ✅ **Efecto de búsqueda**: Conservado efecto de ocultar al enfocar búsqueda

**Optimizaciones:**
- Carga inicial paginada (100 elementos)
- Búsqueda eficiente con nuevo endpoint
- Experiencia de usuario mejorada
- Manejo eficiente de grandes volúmenes de datos
</details>

<details>
<summary><strong>📋 Versión 2.7 - Contadores y Episodios</strong></summary>

> **Fecha**: Anterior
> **Estado**: ✅ Completada

**Cambios en server.js:**
- ✅ **Endpoint `/api/notion-stats`**: Nuevo contador `episodios` para entradas con "Título episodio"
- ✅ **Lógica mejorada**: Series cuentan solo cuando no tienen episodios
- ✅ **Suma total**: Todos los contadores sumados para total

**Cambios en index.html:**
- ✅ **Contador "Episodios"**: Añadido en grid de estadísticas
- ✅ **Grid modificado**: Estadísticas en 5 columnas
- ✅ **Badge total**: Suma de todas las entradas
- ✅ **Función duplicateMovie**: Mejorada con spinner y sin copiar imágenes

**Notas técnicas:**
- Imágenes en duplicación como referencia visual
- Series solo cuenta entradas sin episodios
- Episodios cuenta entradas con "Título episodio"
</details>

<details>
<summary><strong>📋 Versión 2.6 - Contador Total y Duplicación</strong></summary>

> **Fecha**: Anterior
> **Estado**: ✅ Completada

**Nuevas características:**
- ✅ **Contador de entradas totales**: Badge en sección de Estadísticas
- ✅ **Campos vacíos con estilo**: CSS para campos con placeholder visible
- ✅ **Confirmación al salir**: Sistema para detectar cambios con modal
- ✅ **Botones de duplicar**: En pendientes y películas con icono de copia
- ✅ **Endpoint para duplicar**: POST `/api/notion/:id/duplicate`

**Mejoras visuales:**
- Campos no rellenados con fondo más oscuro
- Nuevo modal de confirmación
- Guardado de estado original para comparar
- Estilo distintivo para botones de duplicar
</details>

<details>
<summary><strong>📋 Versión 2.5 - Contador y Confirmaciones</strong></summary>

> **Fecha**: Anterior
> **Estado**: ✅ Completada

**Modificaciones incluidas:**
- ✅ **Contador total**: Agregado en panel de Estadísticas
- ✅ **Campos vacíos destacados**: Nuevos estilos CSS para campos con placeholder
- ✅ **Confirmación al salir**: Modal para salir sin guardar
- ✅ **Botón de duplicar**: En Pendientes y Todas las Películas
- ✅ **Endpoint modificado**: Estadísticas incluyen contador total

**Características técnicas:**
- Cálculo sumando todas las categorías
- Servidor actualizado para incluir total
- Sistema de detección de cambios
- Función para duplicar con todos los datos
</details>

<details>
<summary><strong>📋 Versión 2.4 - Animaciones y UX</strong></summary>

> **Fecha**: Anterior
> **Estado**: ✅ Completada

**Mejoras de interfaz:**
- ✅ **Animaciones de paneles**: Ocultar/mostrar al enfocar búsqueda
- ✅ **Tarjetas mejoradas**: Sinopsis con altura máxima y ellipsis
- ✅ **Spinner mejorado**: Más grande (60px) y centrado
- ✅ **Limpieza de modal**: Función `resetModal()` para limpiar campos
- ✅ **Footer básico**: Pie de página con copyright

**Ajustes técnicos:**
- Texto más claro para mejor legibilidad (#e0e0e0)
- Contenedor de información ajustado
- Transiciones suaves mejoradas
- Refactorización del código JavaScript
</details>

<details>
<summary><strong>📋 Versión 2.3 - URLs y Reorganización</strong></summary>

> **Fecha**: Anterior
> **Estado**: ✅ Completada

**Nuevas funcionalidades:**
- ✅ **URLs amigables**: Hash en URL al cambiar pestañas
- ✅ **Reorganización**: Estadísticas > Pendientes > Todas las Películas
- ✅ **Diseño de dos columnas**: Películas por fila en grid
- ✅ **Panel de pendientes**: Imagen pequeña y botón eliminar
- ✅ **Spinner al editar**: Indicador de carga en modal

**Mejoras de estilo:**
- Tamaño de fuente en pestañas aumentado (16px)
- Peso de fuente reducido (font-weight: 500)
- Diseño responsive mejorado
- Verificación de hash al cargar página
</details>

<details>
<summary><strong>📋 Versión 2.2 - Sistema de Pestañas</strong></summary>

> **Fecha**: Anterior
> **Estado**: ✅ Completada

**Características implementadas:**
- ✅ **Cuatro pestañas**: Inicio, Web, Extractor, Auto Push
- ✅ **Diseño consistente**: Tema oscuro con borde rojo activo
- ✅ **Ventanas separadas**: Botón para abrir pestañas en nueva ventana
- ✅ **Contenido de muestra**: Mensajes "Próximamente" con iconos
- ✅ **Responsividad**: Adaptación a móviles y tablets

**Mejoras técnicas:**
- Animaciones suaves entre pestañas
- Funcionalidad no intrusiva
- Diseño flexible para diferentes pantallas
- Mantenimiento de funcionalidades originales
</details>

<details>
<summary><strong>📋 Versión 2.1 - Corrección de Relaciones</strong></summary>

> **Fecha**: Anterior
> **Estado**: ✅ Completada

**Correcciones clave:**
- ✅ **Función getRelationNames()**: Obtener nombres de relaciones implementada
- ✅ **Endpoint GET modificado**: Devuelve nombres en lugar de IDs
- ✅ **Frontend corregido**: Carga correcta de relaciones múltiples
- ✅ **Llamada a fetchStats()**: Explícita en carga inicial
- ✅ **Manejo de imágenes**: Mejorado con opción de eliminación

**Flujo de relaciones:**
- Carga y muestra correcta de géneros, audios y subtítulos
- Preservación de relaciones existentes al editar
- Envío correcto al backend al guardar
</details>

<details>
<summary><strong>📋 Versión 2.0 - Correcciones Mayores</strong></summary>

> **Fecha**: Anterior
> **Estado**: ✅ Completada

**Problemas solucionados:**
- ✅ **Estadísticas**: No se mostraban al inicio - `fetchStats()` corregida
- ✅ **Relaciones**: No se cargaban - backend no devolvía nombres
- ✅ **Campos de relaciones**: Se perdían al guardar - mapeo corregido

**Soluciones implementadas:**
- Función `getRelationNames()` para obtener nombres de relaciones
- Endpoint GET modificado para incluir nombres de relaciones
- Frontend corregido para procesar relaciones múltiples
- Llamada explícita a `fetchStats()` en carga inicial
</details>

<details>
<summary><strong>📋 Versión 1.9 - Relaciones y Optimizaciones</strong></summary>

> **Fecha**: Anterior
> **Estado**: ✅ Completada

**Correcciones implementadas:**
- ✅ **Función formatDatabaseId()**: Convertir IDs a formato UUID válido
- ✅ **Estadísticas optimizadas**: Sistema de conteo usando mapa de categorías
- ✅ **Manejo de imágenes**: Eliminación real al marcar checkbox
- ✅ **Paginación mejorada**: Carga por lotes de 100 registros
- ✅ **Manejo de errores**: Logs detallados y mensajes claros

**Mejoras técnicas:**
- Todos los IDs formateados automáticamente
- Consulta eficiente a la base de datos de categorías
- Recuperación elegante de fallos de API
</details>

<details>
<summary><strong>📋 Versión 1.8 - Paginación y Gestión de Imágenes</strong></summary>

> **Fecha**: Anterior
> **Estado**: ✅ Completada

**Cambios principales implementados:**
- ✅ **Paginación optimizada**: Carga inicial de 100 entradas con botón "Cargar más"
- ✅ **Gestión de imágenes completa**: Eliminación real de imágenes en Notion
- ✅ **Relaciones robustas**: Misma lógica para categorías, géneros, audios y subtítulos
- ✅ **Estadísticas optimizadas**: Consulta más eficiente a Notion
- ✅ **Scrollbars personalizados**: Barras rojas y estrechas

**Mejoras de rendimiento:**
- Carga progresiva de datos
- Menos solicitudes a la API
- Manejo eficiente de grandes volúmenes
- Sincronización entre vista previa y base de datos
</details>

<details>
<summary><strong>📋 Versión 1.7 - Carga Completa y Correcciones</strong></summary>

> **Fecha**: Anterior
> **Estado**: ✅ Completada

**Cambios principales realizados:**
- ✅ **Carga completa de películas**: Todas las entradas con paginación en segundo plano
- ✅ **Estadísticas corregidas**: Endpoint obtiene correctamente nombres de categoría
- ✅ **Edición mejorada**: Muestra imágenes de "Carteles" además de "Portada"
- ✅ **Experiencia de usuario**: Indicadores de carga y mensajes mejorados
- ✅ **Correcciones menores**: Sincronización de nombres de propiedades

**Mejoras de funcionalidad:**
- Botones (×) para eliminar imágenes en vista previa
- Relaciones se cargan y guardan correctamente
- Paginación optimizada para grandes conjuntos de datos
- Manejo mejorado de errores en la API
</details>

<details>
<summary><strong>📋 Versión 1.6 - Servidor Simplificado</strong></summary>

> **Fecha**: Anterior
> **Estado**: ✅ Completada

**Cambios clave realizados:**
- ✅ **Servidor simplificado**: Devuelve propiedades directamente desde Notion
- ✅ **Extracción robusta**: Funciones helper (getTitle, getRichText, etc.)
- ✅ **Relaciones mejoradas**: Búsqueda flexible de nombres de propiedades
- ✅ **Imágenes confiables**: Compatibilidad con diferentes estructuras
- ✅ **Depuración**: Logs detallados para inspección

**Soluciones técnicas:**
- Manejo de propiedades alternativas ('Title' además de 'Título')
- Operador opcional (?.) para evitar errores
- Compatibilidad con múltiples nombres de campos
- Mensajes de error más detallados
</details>

<details>
<summary><strong>📋 Versión 1.5 - Relaciones Mejoradas</strong></summary>

> **Fecha**: Anterior
> **Estado**: ✅ Completada

**Cambios clave:**
- ✅ **Función findOrCreateRelatedPage mejorada**: Devuelve objeto con id y name
- ✅ **Procesamiento de relaciones modificado**: Manejo correcto de relaciones únicas
- ✅ **Campos multi-select corregidos**: Convierte correctamente datos en array
- ✅ **Frontend actualizado**: Campos de selectores optimizados

**Mejoras técnicas:**
- Mapeo correcto de relaciones para categorías
- Diferenciación entre select único y múltiple
- Integración completa con formularios
- Corrección de envío de datos a Notion
</details>

<details>
<summary><strong>📋 Versión 1.4 - Diseño y Funcionalidad</strong></summary>

> **Fecha**: Anterior
> **Estado**: ✅ Completada

**Cambios clave:**
- ✅ **Diseño del panel corregido**: Altura calculada y overflow para scroll
- ✅ **Formato de lista para películas**: Reemplazado grid por lista flexible
- ✅ **Búsqueda en tiempo real**: Búsqueda mientras se escribe
- ✅ **Estadísticas mejoradas**: Animes y Documentales añadidos
- ✅ **Pendientes reales**: Filtrado de películas sin categoría

**Mejoras visuales:**
- Diseño flex con imagen a la izquierda
- Sinopsis completa visible
- Botones de acción más visibles
- Mejores indicadores de carga
</details>

<details>
<summary><strong>📋 Versión 1.3 - Funcionalidad Completa</strong></summary>

> **Fecha**: Anterior
> **Estado**: ✅ Completada

**Cambios clave realizados:**
- ✅ **Funcionalidad completa para cargar películas**: fetchMovies() y renderMovies()
- ✅ **Sistema de carga y manejo de errores**: Spinner y mensajes claros
- ✅ **Funcionalidad de búsqueda**: searchMovies() para filtrar resultados
- ✅ **Estadísticas actualizadas**: Conteo de películas y series
- ✅ **Panel de pendientes**: Elementos pendientes simulados

**Características implementadas:**
- Paginación con renderPagination()
- Integración con formulario funcional
- Función para editar películas
- Sistema robusto de verificación
</details>

<details>
<summary><strong>📋 Versión 1.2 - Correcciones del Servidor</strong></summary>

> **Fecha**: Anterior
> **Estado**: ✅ Completada

**Principales correcciones realizadas:**
- ✅ **Endpoint /api/notion corregido**: Estructura de respuesta compatible
- ✅ **Formateo de datos**: Mapeo de propiedades con nombres alternativos
- ✅ **Manejo de imágenes**: Soporte para diferentes nombres de propiedades
- ✅ **Ordenamiento mejorado**: Por fecha de creación descendente
- ✅ **Tamaño de página**: Aumentado a 100 resultados

**Mejoras técnicas:**
- Inclusión de todas las propiedades necesarias
- Manejo de relaciones para evitar errores
- Flexibilidad en nombres de propiedades
- Mejor compatibilidad con frontend
</details>

<details>
<summary><strong>📋 Versión 1.1 - Integración Backend</strong></summary>

> **Fecha**: Anterior
> **Estado**: ✅ Completada

**Características implementadas:**
- ✅ **Integración completa con backend**: CRUD completo para películas
- ✅ **Interfaz mejorada**: Formulario interactivo con selección múltiple
- ✅ **Funcionalidades avanzadas**: Búsqueda, paginación, estadísticas
- ✅ **Mejoras de UX**: Animaciones, feedback visual, validación

**Funcionalidades principales:**
- Listado, creación, edición y eliminación de películas
- Vista previa de portada antes de subir
- Manejo de pendientes automático
- Diseño completamente responsive
</details>

<details>
<summary><strong>📋 Versión 1.0 - Versión Inicial</strong></summary>

> **Fecha**: Lanzamiento inicial
> **Estado**: ✅ Completada

**Características del panel inicial:**
- ✅ **Diseño premium**: Esquema de colores rojo vino y fondos oscuros
- ✅ **Sección principal**: Vista de cuadrícula con imágenes de portada
- ✅ **Sección de Pendientes**: Lista de películas sin categoría
- ✅ **Estadísticas rápidas**: Resumen de películas, series y pendientes
- ✅ **Sistema de modales**: Para crear y editar películas
- ✅ **Responsive design**: Adaptación a móviles y tablets

**Elementos visuales:**
- Iconos de Font Awesome para mejor usabilidad
- Efectos hover en tarjetas y botones
- Indicadores visuales claros
- Animaciones y transiciones elegantes
</details>

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Para contribuir:

1. **Fork** el repositorio
2. **Crea** una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. **Push** a la rama (`git push origin feature/AmazingFeature`)
5. **Abre** un Pull Request

### 📋 Guías de Contribución

- Mantén el estilo de código consistente
- Añade tests para nuevas funcionalidades
- Actualiza la documentación cuando sea necesario
- Respeta el esquema de colores y diseño existente

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.

---

## 👨‍💻 Autor

**jfl4bur** - [GitHub](https://github.com/jfl4bur)

---

## 🙏 Agradecimientos

- [Notion](https://notion.so) por su fantástica API
- [Cloudinary](https://cloudinary.com) por la gestión de imágenes
- [Font Awesome](https://fontawesome.com) por los iconos
- Comunidad de desarrolladores por el feedback y sugerencias

---

<div align="center">
  <p><strong>¡Gracias por usar Todogram!</strong></p>
  <p>Si te ha sido útil, considera darle una ⭐ al repositorio</p>
  
  [![GitHub stars](https://img.shields.io/github/stars/jfl4bur/Todogram.svg?style=social&label=Star)](https://github.com/jfl4bur/Todogram)
  [![GitHub forks](https://img.shields.io/github/forks/jfl4bur/Todogram.svg?style=social&label=Fork)](https://github.com/jfl4bur/Todogram/fork)
</div>