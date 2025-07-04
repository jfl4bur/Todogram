<!-- SHIELDS -->
[![HTML5 Badge](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](#)
[![CSS3 Badge](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](#)
[![JavaScript Badge](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](#)

<p align="center">
  <img src="https://img.shields.io/github/languages/code-size/jfl4bur/CinePlus?color=lightblue" />
  <img src="https://img.shields.io/github/last-commit/jfl4bur/CinePlus" />
</p>

---

<div align="center">
  <h1><strong>CinePlus 🎬 | Carrusel Multimedia + Modales Interactivos</strong></h1>
  <p>
    Interfaz cinematográfica avanzada con carruseles, modales detallados, galerías, video trailers, y múltiples opciones para compartir contenido de forma social y viral.
  </p>
</div>

---

## 🔍 Tabla de Contenidos
<details>
  <summary>Explorar secciones</summary>
  <ol>
    <li><a href="#✨-sobre-el-proyecto">✨ Sobre el Proyecto</a></li>
    <li><a href="#🌟-características-principales">🌟 Características Principales</a></li>
    <li><a href="#🛠️-arquitectura-e-infraestructura">🛠️ Arquitectura e Infraestructura</a></li>
    <li><a href="#📖-instalación-y-uso">📖 Instalación y Uso</a></li>
    <li><a href="#🚀-tecnologías-utilizadas">🚀 Tecnologías Utilizadas</a></li>
    <li><a href="#📷-capturas-de-pantalla">📷 Capturas de Pantalla</a></li>
    <li><a href="#🙏-agradecimientos">🙏 Agradecimientos</a></li>
  </ol>
</details>

---

## ✨ Sobre el Proyecto

**CinePlus** es un componente HTML/CSS/JS completo que permite mostrar películas o series con:

- Carruseles horizontales responsivos.
- Skeleton loader con animaciones.
- Modales informativos detallados (tipo Netflix/Rakuten).
- Galerías de posters y fondos.
- Integración con la API de **TMDB**.
- Trailer embebido desde YouTube o UPN.
- Botones sociales de compartir (Facebook, Twitter, WhatsApp, Telegram, Copiar link).

Diseñado para ser **totalmente autónomo**, ligero y sin dependencias externas (excepto FontAwesome y TMDB).

---

## 🌟 Características Principales

<details>
<summary><strong>🎥 Carrusel Responsivo</strong></summary>

- Scroll horizontal suave  
- Botones de navegación  
- Skeleton loaders  

</details>

<details>
<summary><strong>📺 Modal Detallado</strong></summary>

- Título, tagline, descripción, duración  
- Galería de imágenes (fondos y posters)  
- Trailer embebido  
- Reparto y ficha técnica  

</details>

<details>
<summary><strong>🔗 Compartir Socialmente</strong></summary>

- Facebook, Twitter, WhatsApp, Telegram  
- Copiar enlace directo  
- Metadatos dinámicos con OpenGraph/Twitter  

</details>

---

## 🛠️ Arquitectura e Infraestructura

### Estructura General

```
📁 Todogram/
├── bloque-softr.txt         # Archivo HTML+CSS+JS completo
├── data.json                # Datos de películas
└── public/assets/          # Recursos visuales
```

### Diagrama de Flujo (Mermaid)

```mermaid
flowchart TD
    A[Inicio] --> B[fetch data.json]
    B --> C[Renderiza Skeleton]
    C --> D[Renderiza Carousel]
    D --> E[Click/Hover: Modal]
    E --> F[Galería | Reparto | Trailer]
```

---

## 📖 Instalación y Uso

1. Copia el archivo `bloque-softr.txt` como `index.html`
2. Crea el archivo `data.json` con estructura como esta:

```json
{
  "movies": [
    {
      "id": "1",
      "title": "Matrix",
      "description": "Película de ciencia ficción revolucionaria",
      "tmdb": "https://www.themoviedb.org/movie/603-matrix"
    }
  ]
}
```

3. Abre `index.html` en tu navegador o publícalo en GitHub Pages/Netlify.
4. ¡Disfruta!

---

## 🚀 Tecnologías Utilizadas

- ✅ HTML5 + CSS3 Custom Variables
- ✅ JavaScript Vanilla (ES6+)
- ✅ FontAwesome 6
- ✅ [TMDB API](https://www.themoviedb.org/documentation/api)

---

## 📷 Capturas de Pantalla

> *(Agrega aquí tus propias capturas desde `/public/assets/` o Imgur)*

| Carrusel de Películas | Modal Detallado |
|------------------------|------------------|
| ![Carrusel](#)         | ![Modal](#)      |

---

## 🙏 Agradecimientos

- [TMDB](https://www.themoviedb.org/)
- [FontAwesome](https://fontawesome.com/)
- Diseño inspirado en plataformas como Netflix, HBO Max, Rakuten

---

## ✉️ Contacto

**Autor:** [@jfl4bur](https://github.com/jfl4bur)  
**Live:** https://jfl4bur.github.io/Todogram/

<p align="center">
  🎉 Hecho con pasión por cinéfilos y para cinéfilos 🎬
</p>
