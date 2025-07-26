# Hero Slider - Estilo Rakuten TV

## Descripción

He implementado un **Hero Slider** al estilo de Rakuten TV que se sitúa en la parte superior de la página, antes del carrusel horizontal existente. Este slider muestra las 5 películas mejor puntuadas de manera destacada con animaciones suaves y funcionalidades avanzadas.

## Características Principales

### ✨ Diseño y Estilo
- **Diseño inspirado en Rakuten TV**: Layout moderno con overlay gradient y tipografía elegante
- **Totalmente responsive**: Se adapta a diferentes tamaños de pantalla
- **Animaciones suaves**: Transiciones fluidas con CSS cubic-bezier
- **Efectos visuales**: Fondo con paralaje y overlays sofisticados

### 🎯 Funcionalidades
- **Autoplay inteligente**: Cambio automático cada 6 segundos con barra de progreso
- **Navegación múltiple**: 
  - Botones prev/next
  - Indicadores de puntos clickeables
  - Navegación por teclado (flechas)
  - Soporte para gestos táctiles (swipe)
- **Pausa en hover**: El autoplay se pausa al hacer hover sobre el slider
- **Integración con modales**: Botones para ver detalles y trailers

### 📊 Lógica de Datos
- **Filtrado inteligente**: Solo muestra películas con:
  - Imágenes de fondo (carteles)
  - Portada
  - Sinopsis completa
- **Ordenamiento**: Las películas se ordenan por puntuación (descendente)
- **Máximo 5 slides**: Para mantener el rendimiento y relevancia

## Estructura de Archivos

```
/
├── index.html                 # HTML actualizado con hero slider
├── public/
│   ├── css/
│   │   └── styles.css        # Estilos del hero slider añadidos
│   └── js/
│       ├── hero-slider.js    # Lógica principal del hero slider
│       └── main.js           # Actualizado para inicializar hero slider
└── HERO_SLIDER_README.md     # Esta documentación
```

## Implementación Técnica

### HTML Estructura
```html
<div class="hero-slider-section">
    <div class="hero-slider-container">
        <!-- Skeleton loader -->
        <div class="hero-skeleton">...</div>
        
        <!-- Hero slider wrapper -->
        <div class="hero-slider-wrapper">
            <div class="hero-slides"></div>
            <div class="hero-nav">...</div>
            <div class="hero-indicators"></div>
            <div class="hero-auto-progress">...</div>
        </div>
    </div>
</div>
```

### CSS Características
- **Variables CSS**: Utiliza las mismas variables del tema existente
- **Flexbox y Grid**: Layout moderno y responsive
- **Animaciones CSS**: Keyframes para efectos suaves
- **Media queries**: Soporte responsive completo

### JavaScript Funcionalidades
```javascript
class HeroSlider {
    // Características principales:
    - Carga de datos desde la misma fuente que el carrusel
    - Filtrado y ordenamiento automático
    - Gestión de eventos para navegación
    - Control de autoplay con progreso visual
    - Integración con modales existentes
}
```

## Configuración y Personalización

### Parámetros Configurables (en hero-slider.js)
```javascript
this.maxSlides = 5;           // Número máximo de slides
this.autoPlayDuration = 6000; // Duración de cada slide (ms)
this.progressDuration = 50;   // Suavidad de barra de progreso
```

### Variables CSS Personalizables
```css
:root {
    --primary-color: #ff003c;     /* Color principal */
    --secondary-color: #2a2a2a;   /* Color secundario */
    --text-color: #ffffff;        /* Color del texto */
    --bg-color: #141414;          /* Color de fondo */
}
```

## Responsive Design

### Breakpoints
- **Desktop (>1024px)**: Hero completo con todas las funcionalidades
- **Tablet (768px-1024px)**: Tamaños adaptados, mantiene funcionalidad
- **Mobile (480px-768px)**: Diseño optimizado para móvil
- **Small Mobile (<480px)**: Layout compacto

### Adaptaciones Móviles
- Texto y botones más pequeños
- Navegación adaptada para touch
- Altura reducida del hero
- Botones apilados verticalmente

## Integración con Sistema Existente

### Compatibilidad
- ✅ **Mantiene carrusel original**: El hero slider no interfiere con el carrusel existente
- ✅ **Reutiliza modales**: Integra con los modales de detalles, video y compartir
- ✅ **Misma fuente de datos**: Usa el mismo data.json que el carrusel
- ✅ **Estilo consistente**: Sigue las mismas variables y patrones de diseño

### Orden de Carga
1. Hero Slider se inicializa primero
2. Luego se carga el carrusel horizontal
3. Finalmente se inicializan los modales

## Funcionalidades Avanzadas

### Control de Estado
- **isTransitioning**: Previene múltiples transiciones simultáneas
- **Autoplay inteligente**: Se adapta al estado de la aplicación
- **Gestión de memoria**: Limpia intervalos y listeners correctamente

### Accesibilidad
- **Navegación por teclado**: Soporte completo para flechas
- **ARIA labels**: Preparado para etiquetas de accesibilidad
- **Focus management**: Gestión correcta del foco del teclado

### SEO y Performance
- **Lazy loading**: Las imágenes se cargan de manera eficiente
- **Skeleton loader**: Mejora la percepción de carga
- **CSS optimizado**: Utiliza transform y opacity para animaciones suaves

## Troubleshooting

### Problemas Comunes

1. **Hero slider no aparece**
   - Verificar que `DATA_URL` esté definido
   - Comprobar que existan películas con imágenes de fondo

2. **Animaciones lentas**
   - Revisar soporte de CSS transforms en el navegador
   - Considerar reducir `autoPlayDuration`

3. **Responsividad incorrecta**
   - Verificar media queries en styles.css
   - Comprobar viewport meta tag en HTML

### Debug Mode
```javascript
// En la consola del navegador:
console.log(window.heroSlider.moviesData); // Ver datos cargados
window.heroSlider.pauseAutoPlay(); // Pausar autoplay para debug
window.heroSlider.startAutoPlay(); // Reanudar autoplay
```

## Próximas Mejoras

### Funcionalidades Futuras
- [ ] Modo de presentación automática
- [ ] Filtros por género en hero slider
- [ ] Integración con API de trailers
- [ ] Soporte para videos de fondo
- [ ] Personalización de temas por usuario

### Optimizaciones
- [ ] Precarga de imágenes siguientes
- [ ] Intersección Observer para autoplay
- [ ] Service Worker para cacheo
- [ ] WebP support con fallback

## Créditos

Implementado siguiendo la lógica del código existente y inspirado en el diseño de Rakuten TV. Compatible con el sistema de carrusel original y todos los modales existentes.

---

**Fecha de implementación**: Enero 2025  
**Versión**: 1.0  
**Compatibilidad**: Todos los navegadores modernos