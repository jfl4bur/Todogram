// Slider Independiente Mejorado - Completamente independiente del carousel
(function () {
    let currentIndex = 0;
    let totalSlides = 0;
    let isTransitioning = false;
    let resizeTimeout = null;
    let slidesData = [];
    let isInitialized = false;
    let retryCount = 0;
    const MAX_RETRIES = 5;

    // Configuración del slider
    const SLIDER_CONFIG = {
        slideWidthPercent: 0.87, // 87vw
        slideGapPercent: 0.02,   // 2vw
        transitionDuration: 600, // ms
        retryDelay: 100         // ms
    };

    // Función para forzar reflow y asegurar que los estilos se apliquen
    function forceReflow() {
        document.documentElement.offsetHeight;
        return true;
    }

    // Función para obtener dimensiones reales del viewport
    function getViewportDimensions() {
        return {
            width: window.innerWidth || document.documentElement.clientWidth,
            height: window.innerHeight || document.documentElement.clientHeight
        };
    }

    // Función para calcular dimensiones del slider de forma más robusta
    function calculateSliderDimensions() {
        const viewport = getViewportDimensions();
        const slideWidth = Math.floor(viewport.width * SLIDER_CONFIG.slideWidthPercent);
        const slideGap = Math.floor(viewport.width * SLIDER_CONFIG.slideGapPercent);
        const sideSpace = Math.floor((viewport.width - slideWidth) / 2);
        const navBtnOffset = Math.max(Math.floor(sideSpace / 2 - 30), 10); // Mínimo 10px

        return {
            slideWidth,
            slideGap,
            sideSpace,
            navBtnOffset,
            viewportWidth: viewport.width
        };
    }

    // Función para aplicar dimensiones directamente a los elementos
    function applySliderDimensions(dimensions, forceUpdate = false) {
        const { slideWidth, slideGap, sideSpace, navBtnOffset } = dimensions;
        
        console.log('Slider Independiente: Aplicando dimensiones:', {
            slideWidth,
            slideGap,
            sideSpace,
            navBtnOffset
        });

        // Actualizar variables CSS
        const root = document.documentElement;
        root.style.setProperty('--slider-slide-width', `${slideWidth}px`);
        root.style.setProperty('--slider-slide-gap', `${slideGap}px`);
        root.style.setProperty('--slider-side-space', `${sideSpace}px`);
        root.style.setProperty('--slider-nav-btn-offset', `${navBtnOffset}px`);

        // Forzar reflow
        forceReflow();

        // Aplicar dimensiones directamente a los slides existentes
        const slides = document.querySelectorAll('.slider-slide');
        slides.forEach((slide, index) => {
            // Aplicar tanto CSS custom properties como estilos inline para mayor compatibilidad
            slide.style.width = `${slideWidth}px`;
            slide.style.flexBasis = `${slideWidth}px`;
            slide.style.minWidth = `${slideWidth}px`;
            slide.style.maxWidth = `${slideWidth}px`;
            slide.style.marginRight = index < slides.length - 1 ? `${slideGap}px` : '0';
            
            // Asegurar que los estilos se apliquen
            slide.style.flexShrink = '0';
            slide.style.flexGrow = '0';
        });

        // Actualizar posición del slider si está inicializado
        if (isInitialized && slides.length > 0) {
            updateSliderPosition(dimensions);
        }

        return true;
    }

    // Función mejorada para actualizar variables CSS
    function updateSliderCSSVariables(forceUpdate = false) {
        const dimensions = calculateSliderDimensions();
        return applySliderDimensions(dimensions, forceUpdate);
    }

    // Cargar datos de forma más robusta
    async function loadSliderData() {
        try {
            console.log('Slider Independiente: Cargando datos...');
            
            // Verificar que DATA_URL esté disponible
            if (typeof DATA_URL === 'undefined') {
                console.error('Slider Independiente: DATA_URL no está definida');
                return [];
            }

            const response = await fetch(DATA_URL);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!Array.isArray(data)) {
                console.error('Slider Independiente: Los datos no son un array válido');
                return [];
            }

            // Filtrar y procesar películas
            const movies = data
                .filter(item => {
                    return item && 
                           typeof item === 'object' && 
                           item['Categoría'] === 'Películas' &&
                           item['Título']; // Asegurar que tenga título
                })
                .map((item, index) => ({
                    id: `movie-${index}`,
                    title: item['Título'] || 'Sin título',
                    description: item['Synopsis'] || 'Descripción no disponible',
                    posterUrl: item['Portada'] || '',
                    postersUrl: item['Carteles'] || '',
                    backgroundUrl: item['Fondo'] || '',
                    year: item['Año'] ? item['Año'].toString() : '',
                    duration: item['Duración'] || '',
                    genre: item['Géneros'] || '',
                    rating: item['Puntuación 1-10'] || '',
                    director: item['Director(es)'] || '',
                    cast: item['Reparto principal'] || '',
                    synopsis: item['Synopsis'] || '',
                    tmdbUrl: item['TMDB'] || '',
                    tmdbId: item['ID TMDB'] || '',
                    trailerUrl: item['Trailer'] || '',
                    videoUrl: item['Video iframe'] || item['Video iframe 1'] || item['Ver Película'] || '',
                    originalTitle: item['Título original'] || '',
                    productionCompanies: item['Productora(s)'] || '',
                    productionCountries: item['País(es)'] || '',
                    spokenLanguages: item['Idioma(s) original(es)'] || '',
                    writers: item['Escritor(es)'] || '',
                    audios: item['Audios'] || '',
                    subtitles: item['Subtítulos'] || '',
                    audioList: item['Audios'] ? item['Audios'].split(',').map(audio => audio.trim()) : [],
                    subtitleList: item['Subtítulos'] ? item['Subtítulos'].split(',').map(sub => sub.trim()) : [],
                    audiosCount: item['Audios'] ? item['Audios'].split(',').length : 0,
                    subtitlesCount: item['Subtítulos'] ? item['Subtítulos'].split(',').length : 0
                }));

            console.log('Slider Independiente: Datos procesados:', movies.length, 'películas válidas');
            return movies;
            
        } catch (error) {
            console.error('Slider Independiente: Error cargando datos:', error);
            return [];
        }
    }

    // Función para seleccionar películas para el slider
    function selectMoviesForSlider(movies) {
        if (!movies || movies.length === 0) return [];

        const usedGenres = new Set();
        const selectedMovies = [];
        const targetCount = Math.min(8, movies.length);

        // Ordenar por rating
        const sortedMovies = [...movies].sort((a, b) => {
            const ratingA = parseFloat(a.rating) || 0;
            const ratingB = parseFloat(b.rating) || 0;
            return ratingB - ratingA;
        });

        // Seleccionar películas de diferentes géneros
        for (const movie of sortedMovies) {
            if (selectedMovies.length >= targetCount) break;
            
            if (movie.genre) {
                const mainGenre = movie.genre.split(/[·,]/)[0].trim();
                if (!usedGenres.has(mainGenre)) {
                    selectedMovies.push(movie);
                    usedGenres.add(mainGenre);
                }
            }
        }

        // Completar con películas restantes si es necesario
        for (const movie of sortedMovies) {
            if (selectedMovies.length >= targetCount) break;
            if (!selectedMovies.find(m => m.id === movie.id)) {
                selectedMovies.push(movie);
            }
        }

        return selectedMovies.slice(0, targetCount);
    }

    // Función para crear un slide
    function createSlide(movie, index, dimensions) {
        const slideDiv = document.createElement('div');
        slideDiv.className = 'slider-slide';
        slideDiv.dataset.index = index;
        slideDiv.dataset.movieId = movie.id;

        // Aplicar dimensiones directamente
        const { slideWidth, slideGap } = dimensions;
        slideDiv.style.width = `${slideWidth}px`;
        slideDiv.style.flexBasis = `${slideWidth}px`;
        slideDiv.style.minWidth = `${slideWidth}px`;
        slideDiv.style.maxWidth = `${slideWidth}px`;
        slideDiv.style.marginRight = index < totalSlides - 1 ? `${slideGap}px` : '0';
        slideDiv.style.flexShrink = '0';
        slideDiv.style.flexGrow = '0';

        // Determinar la imagen a usar
        const imageUrl = movie.postersUrl || movie.posterUrl || movie.backgroundUrl ||
                        `https://via.placeholder.com/800x450/333/fff?text=${encodeURIComponent(movie.title)}`;

        // Obtener género principal
        const mainGenre = movie.genre ? movie.genre.split(/[·,]/)[0].trim() : '';

        // Crear contenido del slide
        slideDiv.innerHTML = `
            <div class="slider-img-wrapper">
                <img src="${imageUrl}" 
                     alt="${movie.title}" 
                     loading="${index === 0 ? 'eager' : 'lazy'}"
                     onerror="this.src='https://via.placeholder.com/800x450/333/fff?text=Error+de+Imagen'">
            </div>
            <div class="slider-overlay">
                <div class="slider-title-movie">${movie.title}</div>
                <div class="slider-meta">
                    ${movie.year ? `<span>${movie.year}</span>` : ''}
                    ${movie.duration ? `<span>${movie.duration}</span>` : ''}
                    ${mainGenre ? `<span>${mainGenre}</span>` : ''}
                    ${movie.rating ? `<span><i class="fas fa-star"></i> ${movie.rating}</span>` : ''}
                </div>
                <div class="slider-description">${(movie.description || movie.synopsis || 'Sin descripción disponible').substring(0, 200)}${(movie.description || movie.synopsis || '').length > 200 ? '...' : ''}</div>
            </div>
        `;

        // Event listener para click
        slideDiv.addEventListener('click', (e) => {
            if (!isTransitioning) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Slider Independiente: Click en slide:', movie.title);
                openDetailsModal(movie, slideDiv);
            }
        });

        return slideDiv;
    }

    // Renderizar slider de forma más robusta
    function renderSlider(moviesData = []) {
        console.log('Slider Independiente: Iniciando renderizado...');
        
        const sliderWrapper = document.getElementById('slider-wrapper');
        if (!sliderWrapper) {
            console.error('Slider Independiente: slider-wrapper no encontrado');
            return false;
        }

        // Usar datos proporcionados o datos cargados
        const movies = moviesData.length > 0 ? moviesData : slidesData;
        if (movies.length === 0) {
            console.warn('Slider Independiente: No hay películas para mostrar');
            return false;
        }

        // Seleccionar películas para el slider
        const selectedMovies = selectMoviesForSlider(movies);
        slidesData = selectedMovies;
        totalSlides = slidesData.length;

        console.log('Slider Independiente: Renderizando', totalSlides, 'slides');

        // Calcular dimensiones
        const dimensions = calculateSliderDimensions();
        
        // Limpiar contenido anterior
        sliderWrapper.innerHTML = '';

        // Crear slides
        slidesData.forEach((movie, index) => {
            const slide = createSlide(movie, index, dimensions);
            sliderWrapper.appendChild(slide);
        });

        // Aplicar dimensiones y estilos
        applySliderDimensions(dimensions, true);

        // Configurar controles
        setupControls();
        
        // Ir al primer slide
        currentIndex = 0;
        updateSliderPosition(dimensions);
        
        // Marcar como inicializado
        isInitialized = true;

        // Verificación post-renderizado
        setTimeout(() => {
            verifySliderDimensions();
        }, 100);

        console.log('Slider Independiente: Renderizado completado exitosamente');
        return true;
    }

    // Función para verificar que las dimensiones se aplicaron correctamente
    function verifySliderDimensions() {
        const slides = document.querySelectorAll('.slider-slide');
        if (slides.length === 0) return;

        const firstSlide = slides[0];
        const computedStyle = getComputedStyle(firstSlide);
        const actualWidth = parseFloat(computedStyle.width);
        const expectedWidth = Math.floor(getViewportDimensions().width * SLIDER_CONFIG.slideWidthPercent);

        console.log('Slider Independiente: Verificación de dimensiones:', {
            actualWidth,
            expectedWidth,
            difference: Math.abs(actualWidth - expectedWidth)
        });

        // Si la diferencia es significativa, forzar corrección
        if (Math.abs(actualWidth - expectedWidth) > 10) {
            console.warn('Slider Independiente: Dimensiones incorrectas detectadas, aplicando corrección...');
            const dimensions = calculateSliderDimensions();
            applySliderDimensions(dimensions, true);
            
            // Segunda verificación
            setTimeout(() => {
                const newActualWidth = parseFloat(getComputedStyle(firstSlide).width);
                console.log('Slider Independiente: Dimensiones después de corrección:', newActualWidth);
            }, 50);
        }
    }

    // Configurar controles de navegación
    function setupControls() {
        // Botones de navegación
        const prevBtn = document.getElementById('slider-prev');
        const nextBtn = document.getElementById('slider-next');
        
        if (prevBtn) {
            // Remover eventos anteriores
            prevBtn.replaceWith(prevBtn.cloneNode(true));
            const newPrevBtn = document.getElementById('slider-prev');
            newPrevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isTransitioning) {
                    goToSlide(currentIndex - 1);
                }
            });
        }
        
        if (nextBtn) {
            // Remover eventos anteriores
            nextBtn.replaceWith(nextBtn.cloneNode(true));
            const newNextBtn = document.getElementById('slider-next');
            newNextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isTransitioning) {
                    goToSlide(currentIndex + 1);
                }
            });
        }

        // Crear paginación
        createPagination();
    }

    // Crear paginación
    function createPagination() {
        const pagination = document.getElementById('slider-pagination');
        if (!pagination) return;
        
        pagination.innerHTML = '';
        
        for (let i = 0; i < totalSlides; i++) {
            const dot = document.createElement('button');
            dot.className = 'slider-pagination-dot';
            dot.dataset.slide = i;
            if (i === 0) dot.classList.add('active');
            
            dot.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isTransitioning && i !== currentIndex) {
                    goToSlide(i);
                }
            });
            
            pagination.appendChild(dot);
        }
    }

    // Ir a un slide específico
    function goToSlide(index) {
        if (isTransitioning || totalSlides === 0) return;
        
        // Navegación circular
        if (index < 0) index = totalSlides - 1;
        if (index >= totalSlides) index = 0;
        
        if (index === currentIndex) return;
        
        console.log('Slider Independiente: Cambiando a slide', index);
        
        currentIndex = index;
        const dimensions = calculateSliderDimensions();
        updateSliderPosition(dimensions);
        updatePagination();
    }

    // Actualizar posición del slider
    function updateSliderPosition(dimensions = null) {
        const wrapper = document.getElementById('slider-wrapper');
        if (!wrapper) return;
        
        if (!dimensions) {
            dimensions = calculateSliderDimensions();
        }
        
        isTransitioning = true;
        
        const { slideWidth, slideGap } = dimensions;
        const translateX = -(slideWidth + slideGap) * currentIndex;
        
        wrapper.style.transform = `translateX(${translateX}px)`;
        wrapper.style.transition = `transform ${SLIDER_CONFIG.transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
        
        setTimeout(() => {
            isTransitioning = false;
        }, SLIDER_CONFIG.transitionDuration);
    }

    // Actualizar paginación
    function updatePagination() {
        const dots = document.querySelectorAll('.slider-pagination-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
        });
    }

    // Manejar resize de ventana
    function handleResize() {
        clearTimeout(resizeTimeout);
        
        if (!isInitialized) return;
        
        // Actualización inmediata para mejor respuesta
        const dimensions = calculateSliderDimensions();
        applySliderDimensions(dimensions, true);
        updateSliderPosition(dimensions);
        
        // Verificación adicional
        resizeTimeout = setTimeout(() => {
            if (isInitialized) {
                verifySliderDimensions();
            }
        }, 150);
    }

    // Función para abrir modal de detalles
    function openDetailsModal(movie, element) {
        console.log('Slider Independiente: Intentando abrir modal para:', movie.title);
        
        function tryOpenModal() {
            if (window.detailsModal && typeof window.detailsModal.show === 'function') {
                window.detailsModal.show(movie, element);
                if (window.activeItem !== undefined) {
                    window.activeItem = movie;
                }
                console.log('Slider Independiente: Modal abierto exitosamente');
                return true;
            }
            return false;
        }
        
        // Intentar abrir inmediatamente
        if (!tryOpenModal()) {
            console.warn('Slider Independiente: Modal no disponible, reintentando...');
            
            let attempts = 0;
            const maxAttempts = 10;
            const retryInterval = setInterval(() => {
                attempts++;
                if (tryOpenModal()) {
                    clearInterval(retryInterval);
                } else if (attempts >= maxAttempts) {
                    console.error('Slider Independiente: No se pudo abrir el modal después de', maxAttempts, 'intentos');
                    clearInterval(retryInterval);
                    
                    // Fallback: mostrar alerta con información básica
                    alert(`${movie.title}\n${movie.year ? movie.year + ' • ' : ''}${movie.duration || ''}\n\n${movie.description || movie.synopsis || 'Sin descripción disponible'}`);
                }
            }, 100);
        }
    }

    // Función de inicialización mejorada con reintentos
    async function init() {
        console.log('Slider Independiente: Inicializando... (Intento', retryCount + 1, ')');
        
        try {
            // Verificar elementos requeridos
            const sliderWrapper = document.getElementById('slider-wrapper');
            if (!sliderWrapper) {
                throw new Error('slider-wrapper no encontrado');
            }

            // Inicializar dimensiones
            updateSliderCSSVariables(true);
            
            // Cargar datos
            const movies = await loadSliderData();
            
            if (!movies || movies.length === 0) {
                throw new Error('No se pudieron cargar las películas');
            }

            // Renderizar slider
            const renderSuccess = renderSlider(movies);
            
            if (!renderSuccess) {
                throw new Error('Error en el renderizado del slider');
            }

            // Configurar event listeners
            window.addEventListener('resize', handleResize);
            
            console.log('Slider Independiente: Inicialización completada exitosamente');
            retryCount = 0; // Reset retry count on success
            
        } catch (error) {
            console.error('Slider Independiente: Error en inicialización:', error);
            
            retryCount++;
            if (retryCount < MAX_RETRIES) {
                console.log('Slider Independiente: Reintentando inicialización en', SLIDER_CONFIG.retryDelay * retryCount, 'ms');
                setTimeout(init, SLIDER_CONFIG.retryDelay * retryCount);
            } else {
                console.error('Slider Independiente: Máximo número de reintentos alcanzado');
            }
        }
    }

    // Función de limpieza
    function cleanup() {
        window.removeEventListener('resize', handleResize);
        clearTimeout(resizeTimeout);
        isInitialized = false;
        currentIndex = 0;
        totalSlides = 0;
        slidesData = [];
    }

    // Event listener para cleanup
    window.addEventListener('beforeunload', cleanup);

    // Auto-inicialización
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // Si el DOM ya está cargado, inicializar con un pequeño delay
        setTimeout(init, 50);
    }

    // API pública
    window.sliderIndependent = {
        // Navegación
        goToSlide,
        next: () => goToSlide(currentIndex + 1),
        prev: () => goToSlide(currentIndex - 1),
        
        // Estado
        getCurrentIndex: () => currentIndex,
        getTotalSlides: () => totalSlides,
        getSlidesData: () => [...slidesData], // Copia para evitar mutaciones
        isInitialized: () => isInitialized,
        
        // Control
        init,
        cleanup,
        renderSlider,
        
        // Utilidades
        updateSliderCSSVariables,
        verifySliderDimensions,
        openDetailsModal,
        
        // Configuración
        config: SLIDER_CONFIG
    };

    console.log('Slider Independiente: Módulo cargado');

})();