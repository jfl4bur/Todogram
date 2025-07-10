# Movie Admin Panel

Panel de administración multiplataforma para gestionar películas en Notion con diseño inspirado en Rakuten.tv.

## 🎬 Características

- **Gestión completa de películas**: Crear, editar, eliminar y organizar películas
- **Integración con Notion**: Sincronización automática con tu base de datos de Notion
- **Películas pendientes**: Sistema automático para categorizar películas sin categoría
- **Subida de imágenes**: Integración con Cloudinary para gestión de pósters
- **Diseño moderno**: Interfaz inspirada en Rakuten.tv con animaciones suaves
- **Multiplataforma**: Compatible con Windows, macOS y Linux
- **Arquitectura modular**: Código organizado en módulos pequeños y mantenibles

## 🚀 Instalación

### Prerrequisitos

- Node.js 16 o superior
- npm o yarn
- Cuenta de Notion con acceso a la API
- Cuenta de Cloudinary (opcional, para subida de imágenes)

### Configuración

1. **Clonar el repositorio**
```bash
git clone https://github.com/tuusuario/movie-admin-panel.git
cd movie-admin-panel
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
Crear un archivo `.env` en la raíz del proyecto:
```env
NOTION_TOKEN=tu_token_de_notion
NOTION_DATABASE_ID=id_de_tu_base_de_datos
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

4. **Configurar base de datos de Notion**
Tu base de datos debe tener las siguientes propiedades:
- `Título` (Título)
- `Descripción` (Texto enriquecido)
- `Categoría` (Selección)
- `Año` (Número)
- `Calificación` (Número)
- `Director` (Texto enriquecido)
- `Reparto` (Texto enriquecido)
- `Póster` (URL)

## 🎮 Uso

### Modo desarrollo
```bash
npm run dev
```

### Compilar para producción
```bash
npm run build
```

### Crear instaladores
```bash
npm run dist
```

## 📁 Estructura del proyecto

```
movie-admin-panel/
├── src/
│   ├── main.js                 # Proceso principal de Electron
│   ├── preload.js             # Script de preload
│   ├── config/
│   │   └── config.js          # Configuración centralizada
│   ├── services/
│   │   ├── notion-service.js   # Servicio de Notion
│   │   └── cloudinary-service.js # Servicio de Cloudinary
│   └── renderer/
│       ├── index.html         # Interfaz principal
│       ├── js/
│       │   └── app.js         # Lógica de la aplicación
│       └── styles/
│           └── main.css       # Estilos principales
├── assets/                    # Recursos estáticos
├── dist/                      # Aplicación compilada
├── package.json
├── .env                       # Variables de entorno
└── README.md
```

## 🔧 Configuración avanzada

### Personalizar categorías
Edita `src/config/config.js` para añadir o modificar categorías:

```javascript
categories: [
  'Acción',
  'Aventura',
  'Comedia',
  // ... más categorías
]
```

### Configurar campos de Notion
Modifica la configuración de campos en `config.js`:

```javascript
fields: {
  title: { type: 'title', required: true },
  description: { type: 'rich_text', required: false },
  // ... más campos
}
```

## 🎨 Personalización del diseño

Los estilos están organizados en variables CSS para fácil personalización:

```css
:root {
  --primary-color: #e50914;
  --secondary-color: #141414;
  --accent-color: #ff6b6b;
  /* ... más variables */
}
```

## 📱 Secciones principales

### 1. Gestión de películas
- Ver todas las películas en una grilla visual
- Editar información de películas existentes
- Eliminar películas
- Búsqueda y filtrado

### 2. Crear nueva película
- Formulario completo para nuevas películas
- Validación de datos
- Subida automática de pósters

### 3. Películas pendientes
- Películas sin categoría asignada
- Dropdown para seleccionar categoría
- Asignación automática a la base de datos

## 🛠️ Desarrollo

### Comandos disponibles

```bash
npm run dev          # Modo desarrollo
npm run build        # Compilar aplicación
npm run dist         # Crear instaladores
npm run lint         # Verificar código
npm run test         # Ejecutar pruebas
```

### Añadir nuevos módulos

1. **Crear servicio**: Añadir nuevo servicio en `src/services/`
2. **Registrar en main.js**: Añadir handlers IPC en el proceso principal
3. **Exponer en preload.js**: Añadir métodos seguros al contexto
4. **Usar en renderer**: Implementar en `src/renderer/js/app.js`

### Estructura modular

Cada módulo está diseñado para ser independiente:
- **Servicios**: Lógica de negocio separada
- **Configuración**: Centralizada y extensible
- **UI**: Componentes reutilizables
- **Comunicación**: API segura entre procesos

## 🔍 Troubleshooting

### Problemas comunes

**Error de conexión a Notion**
```bash
# Verificar token y database ID
npm run config:check
```

**Problemas de permisos**
```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

**Error de compilación**
```bash
# Limpiar cache
npm run clean
npm run build
```

### Logs de debug

Los logs se guardan en:
- **Windows**: `%USERPROFILE%\.movie-admin-panel\logs`
- **macOS**: `~/movie-admin-panel/logs`
- **Linux**: `~/.movie-admin-panel/logs`

## 🤝 Contribución

1. Fork el repositorio
2. Crear rama para feature (`git checkout -b feature/amazing-feature`)
3. Commit cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver `LICENSE` para más detalles.

## 🙏 Agradecimientos

- Inspirado en el diseño de Rakuten.tv
- Powered by Electron, Notion API y Cloudinary
- Iconos por Lucide Icons

## 📞 Soporte

Si tienes problemas o preguntas:
- Abre un issue en GitHub
- Revisa la documentación
- Consulta los logs de la aplicación

---

**¡Disfruta gestionando tu colección de películas!** 🎬


---
---
## 🚀 Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd movie-admin-panel
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
npm run setup
```
O copia `.env.example` a `.env` y configura manualmente:
```bash
cp .env.example .env
```

4. **Iniciar la aplicación**
```bash
npm start
```

## 🛠️ Scripts disponibles

- `npm start` - Iniciar la aplicación en modo desarrollo
- `npm run setup` - Configuración inicial interactiva
- `npm run build` - Compilar para producción
- `npm run dist` - Crear instaladores para todas las plataformas
- `npm run dist:win` - Crear instalador para Windows
- `npm run dist:mac` - Crear instalador para macOS
- `npm run dist:linux` - Crear instalador para Linux

## 📝 Configuración de Notion

1. **Crear una integración en Notion**
   - Ve a https://www.notion.so/my-integrations
   - Crea una nueva integración
   - Copia el token de integración

2. **Configurar la base de datos**
   - Crea una base de datos en Notion con las siguientes propiedades:
     - `Título` (Título)
     - `Año` (Número)
     - `Duración` (Texto)
     - `Categoría` (Multi-select)
     - `Sinopsis` (Texto)
     - `Poster` (URL)
     - `Director` (Texto)
     - `Reparto` (Texto)
     - `Calificación` (Select)

3. **Compartir la base de datos**
   - Comparte la base de datos con tu integración
   - Copia el ID de la base de datos de la URL

## 🎯 Características principales

- ✅ **Gestión completa de películas** - Crear, editar, eliminar y buscar
- ✅ **Sección de pendientes** - Para películas sin categoría asignada
- ✅ **Sincronización con Notion** - Datos siempre actualizados
- ✅ **Interfaz moderna** - Inspirada en Rakuten.tv
- ✅ **Multiplataforma** - Windows, macOS y Linux
- ✅ **Arquitectura modular** - Fácil de mantener y actualizar

## 🏗️ Arquitectura del proyecto

```
movie-admin-panel/
├── src/
│   ├── main.js                    # Proceso principal de Electron
│   ├── preload.js                 # Puente de comunicación seguro
│   ├── config/
│   │   └── config.js             # Configuración de la aplicación
│   ├── services/
│   │   ├── notion-service.js     # Servicio para API de Notion
│   │   └── cloudinary-service.js # Servicio para gestión de imágenes
│   └── renderer/
│       ├── index.html            # Interfaz principal
│       ├── styles/
│       │   └── main.css          # Estilos principales
│       └── js/
│           ├── app.js            # Controlador principal
│           └── components/
│               ├── movie-card.js  # Componente de tarjeta
│               └── movie-form.js  # Componente de formulario
├── scripts/
│   └── setup.js                  # Script de configuración inicial
├── assets/
│   └── icons/                    # Iconos de la aplicación
├── package.json                  # Configuración del proyecto
├── electron-builder.json         # Configuración de empaquetado
├── .env.example                  # Ejemplo de variables de entorno
├── .gitignore                    # Archivos a ignorar
└── README.md                     # Documentación
```

## 🔧 Desarrollo

### Estructura de módulos

La aplicación está diseñada con una arquitectura modular:

- **Servicios**: Lógica de negocio y comunicación con APIs
- **Componentes**: Elementos reutilizables de la interfaz
- **Controladores**: Gestión de estado y eventos
- **Configuración**: Variables y configuraciones centralizadas

### Añadir nuevas funcionalidades

1. **Nuevo servicio**: Crear archivo en `src/services/`
2. **Nuevo componente**: Crear archivo en `src/renderer/js/components/`
3. **Nuevos estilos**: Añadir a `src/renderer/styles/main.css`
4. **Nueva configuración**: Actualizar `src/config/config.js`

### Buenas prácticas

- Mantener los módulos pequeños y enfocados
- Usar nombres descriptivos para variables y funciones
- Documentar funciones complejas
- Manejar errores apropiadamente
- Validar datos de entrada

## 📱 Uso de la aplicación

### Pantalla principal
- **Lista de películas**: Muestra todas las películas con sus datos
- **Barra de búsqueda**: Filtra películas por título
- **Botón "Nueva película"**: Abre el formulario de creación

### Gestión de películas
- **Crear**: Completa el formulario con los datos de la película
- **Editar**: Haz clic en el botón "Editar" de cualquier película
- **Eliminar**: Confirma la eliminación con el botón "Eliminar"

### Sección de pendientes
- **Películas sin categoría**: Se muestran automáticamente aquí
- **Asignar categoría**: Usa el dropdown para seleccionar
- **Sincronización**: Los cambios se guardan automáticamente

## 🐛 Solución de problemas

### Problemas comunes

1. **Error de conexión con Notion**
   - Verifica que el token sea válido
   - Confirma que la base de datos esté compartida con la integración
   - Revisa el ID de la base de datos

2. **La aplicación no inicia**
   - Ejecuta `npm install` para reinstalar dependencias
   - Verifica que el archivo `.env` exista y esté configurado
   - Comprueba que Node.js esté instalado (versión 14+)

3. **Problemas de rendimiento**
   - Verifica la conexión a internet
   - Reduce el número de películas mostradas
   - Reinicia la aplicación

### Logs y depuración

- Los logs se muestran en la consola de desarrollo (F12)
- Los errores de Notion se registran en el archivo de log
- Usa `npm start` para modo desarrollo con más información

## 🔒 Seguridad

- **Variables de entorno**: Nunca compartas tu archivo `.env`
- **Tokens**: Mantén los tokens de Notion seguros
- **Permisos**: La aplicación solo accede a la base de datos configurada
- **Datos locales**: No se almacenan datos sensibles localmente

## 📈 Roadmap

### Próximas funcionalidades
- [ ] Importación masiva de películas
- [ ] Exportación de datos a CSV/JSON
- [ ] Temas personalizables
- [ ] Soporte para múltiples idiomas
- [ ] Integración con más servicios de streaming
- [ ] Sistema de respaldo automático

### Mejoras técnicas
- [ ] Tests unitarios
- [ ] Integración continua
- [ ] Optimización de rendimiento
- [ ] Modo offline
- [ ] Actualización automática

## 🤝 Contribución

1. Fork el repositorio
2. Crea una rama para tu funcionalidad (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Añade nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

Para soporte técnico o preguntas:
- Abre un issue en el repositorio
- Revisa la documentación de Notion API
- Consulta los logs de la aplicación

---

**¡Gracias por usar Movie Admin Panel! 🎬**