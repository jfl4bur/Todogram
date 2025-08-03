# Fuentes Slider Sans UI

Este proyecto utiliza las fuentes **Slider Sans UI** (anteriormente Rakuten Sans UI) que están disponibles en diferentes pesos.

## Fuentes Disponibles

### 1. Slider Sans UI Light (300)
- **Archivo**: `RakutenSansUI_W_Lt.747b0811.woff2`
- **Uso**: Para texto secundario, subtítulos y elementos que requieren menos énfasis

### 2. Slider Sans UI Regular (400)
- **Archivo**: `RakutenSansUI_W_Rg.16e85cf1.woff2`
- **Uso**: Para texto principal del cuerpo, párrafos y contenido general

### 3. Slider Sans UI Semi Bold (600)
- **Archivo**: `RakutenSansUI_W_SBd.c256f426.woff2`
- **Uso**: Para títulos de sección, botones importantes y elementos que requieren énfasis medio

### 4. Slider Sans UI Bold (700)
- **Archivo**: `RakutenSansUI_W_Bd.f0ec50fb.woff2`
- **Uso**: Para títulos principales, encabezados y elementos que requieren máximo énfasis

## Cómo Usar las Fuentes

### En CSS

```css
/* Texto principal */
body {
    font-family: 'Slider Sans UI', sans-serif;
    font-weight: 400; /* Regular */
}

/* Títulos principales */
h1, h2, h3 {
    font-family: 'Slider Sans UI', sans-serif;
    font-weight: 700; /* Bold */
}

/* Subtítulos */
h4, h5, h6 {
    font-family: 'Slider Sans UI', sans-serif;
    font-weight: 600; /* Semi Bold */
}

/* Texto secundario */
.caption, .meta {
    font-family: 'Slider Sans UI', sans-serif;
    font-weight: 300; /* Light */
}

/* Botones importantes */
.btn-primary {
    font-family: 'Slider Sans UI', sans-serif;
    font-weight: 600; /* Semi Bold */
}
```

### Clases CSS Utilitarias

Puedes usar estas clases para aplicar rápidamente los diferentes pesos:

```css
.font-light {
    font-weight: 300;
}

.font-regular {
    font-weight: 400;
}

.font-semibold {
    font-weight: 600;
}

.font-bold {
    font-weight: 700;
}
```

### En HTML

```html
<!-- Título principal -->
<h1 style="font-weight: 700;">Título Principal</h1>

<!-- Subtítulo -->
<h2 style="font-weight: 600;">Subtítulo</h2>

<!-- Texto normal -->
<p style="font-weight: 400;">Texto del cuerpo</p>

<!-- Texto secundario -->
<span style="font-weight: 300;">Texto secundario</span>
```

## Configuración Actual

Las fuentes ya están configuradas en el archivo `public/css/styles.css` con:

1. **Definiciones @font-face** al inicio del archivo
2. **Aplicación global** en el selector `body`
3. **Fallbacks** para compatibilidad con navegadores que no soporten las fuentes

## Características Técnicas

- **Formato**: WOFF2 (optimizado para web)
- **Display**: swap (para mejor rendimiento)
- **Fallbacks**: Sistema de fuentes del sistema operativo
- **Compatibilidad**: Todos los navegadores modernos

## Optimización

Las fuentes están optimizadas con:
- `font-display: swap` para mejor rendimiento
- Formato WOFF2 para menor tamaño de archivo
- Rutas relativas para fácil mantenimiento

## Notas Importantes

- Las fuentes se cargan automáticamente en toda la aplicación
- El nombre "Slider Sans UI" se usa en lugar de "Rakuten Sans UI" por preferencia del usuario
- Los archivos están ubicados en `public/fonts/`
- Las definiciones están en `public/css/styles.css` 