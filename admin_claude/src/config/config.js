// Configuración de la aplicación
const config = {
    // Configuración de Notion
    notion: {
        apiKey: process.env.NOTION_API_KEY || 'tu_notion_api_key_aqui',
        databaseId: process.env.NOTION_DATABASE_ID || 'tu_database_id_aqui',
        version: '2022-06-28'
    },

    // Configuración de Cloudinary
    cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'tu_cloud_name',
        apiKey: process.env.CLOUDINARY_API_KEY || 'tu_api_key',
        apiSecret: process.env.CLOUDINARY_API_SECRET || 'tu_api_secret'
    },

    // Configuración de la aplicación
    app: {
        name: 'Movie Admin Panel',
        version: '1.0.0',
        window: {
            width: 1200,
            height: 800,
            minWidth: 800,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js')
            }
        }
    },

    // Configuración de categorías
    categories: [
        'Acción',
        'Aventura',
        'Ciencia Ficción',
        'Comedia',
        'Drama',
        'Fantasía',
        'Horror',
        'Misterio',
        'Romance',
        'Thriller',
        'Documental',
        'Animación',
        'Crimen',
        'Familia',
        'Historia',
        'Música',
        'Guerra',
        'Western'
    ],

    // Configuración de campos de película
    movieFields: {
        title: 'Título',
        director: 'Director',
        year: 'Año',
        genre: 'Género',
        category: 'Categoría',
        rating: 'Calificación',
        description: 'Descripción',
        poster: 'Póster',
        trailer: 'Trailer',
        duration: 'Duración',
        cast: 'Reparto',
        country: 'País',
        language: 'Idioma',
        budget: 'Presupuesto',
        boxOffice: 'Recaudación',
        awards: 'Premios',
        status: 'Estado'
    },

    // Configuración de validaciones
    validation: {
        title: {
            required: true,
            minLength: 1,
            maxLength: 200
        },
        director: {
            required: true,
            minLength: 1,
            maxLength: 100
        },
        year: {
            required: true,
            min: 1888,
            max: new Date().getFullYear() + 5
        },
        rating: {
            required: false,
            min: 0,
            max: 10,
            step: 0.1
        },
        description: {
            required: false,
            maxLength: 1000
        },
        duration: {
            required: false,
            min: 1,
            max: 1000
        }
    },

    // Configuración de UI
    ui: {
        itemsPerPage: 12,
        animationDuration: 300,
        colors: {
            primary: '#e50914',
            secondary: '#221f1f',
            accent: '#f5f5f1',
            background: '#000000',
            surface: '#1a1a1a',
            text: '#ffffff',
            textSecondary: '#999999',
            success: '#46d369',
            warning: '#ffa500',
            error: '#ff6b6b',
            info: '#17a2b8'
        },
        breakpoints: {
            mobile: 768,
            tablet: 1024,
            desktop: 1200
        }
    },

    // Configuración de mensajes
    messages: {
        success: {
            created: 'Película creada exitosamente',
            updated: 'Película actualizada exitosamente',
            deleted: 'Película eliminada exitosamente',
            categorized: 'Categoría asignada exitosamente'
        },
        error: {
            generic: 'Ha ocurrido un error inesperado',
            network: 'Error de conexión',
            validation: 'Por favor, verifica los datos ingresados',
            notFound: 'Película no encontrada',
            unauthorized: 'No tienes permisos para realizar esta acción'
        },
        confirm: {
            delete: '¿Estás seguro de que quieres eliminar esta película?',
            update: '¿Estás seguro de que quieres actualizar esta película?',
            categorize: '¿Estás seguro de que quieres asignar esta categoría?'
        }
    },

    // Configuración de API
    api: {
        timeout: 30000,
        retries: 3,
        retryDelay: 1000,
        endpoints: {
            notion: 'https://api.notion.com/v1',
            cloudinary: 'https://api.cloudinary.com/v1_1'
        }
    },

    // Configuración de desarrollo
    development: {
        debug: process.env.NODE_ENV === 'development',
        mockData: process.env.NODE_ENV === 'development',
        hotReload: process.env.NODE_ENV === 'development'
    },

    // Configuración de archivos
    files: {
        allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        maxImageSize: 10 * 1024 * 1024, // 10MB
        uploadPath: process.env.UPLOAD_PATH || './uploads'
    }
};

// Función para validar configuración
function validateConfig() {
    const required = ['NOTION_API_KEY', 'NOTION_DATABASE_ID'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        console.warn(`⚠️  Variables de entorno faltantes: ${missing.join(', ')}`);
        console.warn('La aplicación funcionará con valores por defecto, pero es recomendable configurarlas.');
    }
}

// Función para obtener configuración por entorno
function getEnvironmentConfig() {
    const env = process.env.NODE_ENV || 'development';
    
    switch (env) {
        case 'production':
            return {
                ...config,
                development: {
                    debug: false,
                    mockData: false,
                    hotReload: false
                }
            };
        case 'test':
            return {
                ...config,
                development: {
                    debug: true,
                    mockData: true,
                    hotReload: false
                }
            };
        default:
            return config;
    }
}

// Validar configuración al cargar
validateConfig();

module.exports = {
    config: getEnvironmentConfig(),
    validateConfig
};