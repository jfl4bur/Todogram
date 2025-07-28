// Slider Independiente - No depende del carousel
(function () {
    let currentIndex = 0;
    let totalSlides = 0;
    let isTransitioning = false;
    let resizeTimeout = null;
function handleResize() {
    clearTimeout(resizeTimeout);
    
    console.log('Slider Independiente: Resize detectado (función principal)');
    
    // Actualización inmediata para mejor respuesta
    if (totalSlides > 0) {
        updateSliderCSSVariables();
        updateSliderPosition();
    }
    
    // Actualización adicional después de un breve delay
    resizeTimeout = setTimeout(() => {
        if (totalSlides > 0) {
            updateSliderCSSVariables();
            updateSliderPosition();
            
            // Verificar y corregir cualquier overflow horizontal
            const sliderSection = document.querySelector('.slider-section');
            if (sliderSection) {
                const hasHorizontalScroll = document.body.scrollWidth > document.body.clientWidth;
                if (hasHorizontalScroll) {
                    console.warn('Detectado scroll horizontal, aplicando corrección...');
                    // Reducir ligeramente el ancho del slide si hay scroll horizontal
                    const currentWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--slider-slide-width'));
                    const correctedWidth = Math.floor(currentWidth * 0.98);
                    document.documentElement.style.setProperty('--slider-slide-width', `${correctedWidth}px`);
                    
                    // Aplicar también a los slides existentes
                    const slides = document.querySelectorAll('.slider-slide');
                    slides.forEach((slide, index) => {
                        slide.style.flexBasis = `${correctedWidth}px`;
                        slide.style.width = `${correctedWidth}px`;
                    });
                }
            }
        }
    }, 150);
}

// Función para verificar y prevenir scroll horizontal
function preventHorizontalScroll() {
    // Verificar si hay scroll horizontal
    const hasHorizontalScroll = document.body.scrollWidth > document.body.clientWidth;
    
    if (hasHorizontalScroll) {
        console.warn('Scroll horizontal detectado, aplicando correcciones...');
        
        // Aplicar estilos preventivos
        document.body.style.overflowX = 'hidden';
        document.documentElement.style.overflowX = 'hidden';
        
        // Reducir el ancho de los slides si es necesario
        const currentWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--slider-slide-width'));
        if (currentWidth > 0) {
            const correctedWidth = Math.floor(currentWidth * 0.95);
            document.documentElement.style.setProperty('--slider-slide-width', `${correctedWidth}px`);
            console.log('Ancho de slide corregido a:', correctedWidth + 'px');
            
            // Aplicar también a los slides existentes
            const slides = document.querySelectorAll('.slider-slide');
            slides.forEach((slide, index) => {
                slide.style.flexBasis = `${correctedWidth}px`;
                slide.style.width = `${correctedWidth}px`;
            });
        }
    }
}

// Función mejorada para actualizar posición del slider
function updateSliderPosition() {
    const wrapper = document.getElementById('slider-wrapper');
    if (!wrapper) return;
    
    isTransitioning = true;
    
    // Obtener valores de las variables CSS de forma segura
    const slideWidthStr = getComputedStyle(document.documentElement).getPropertyValue('--slider-slide-width');
    const slideGapStr = getComputedStyle(document.documentElement).getPropertyValue('--slider-slide-gap');
    
    // Usar valores por defecto si las variables CSS no están disponibles
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const slideWidth = parseInt(slideWidthStr) || Math.floor(viewportWidth * 0.87);
    const slideGap = parseInt(slideGapStr) || Math.floor(viewportWidth * 0.02);
    
    console.log('Slider Independiente: Actualizando posición - Index:', currentIndex, 'Width:', slideWidth, 'Gap:', slideGap);
    
    const translateX = -(slideWidth + slideGap) * currentIndex;
    
    // Aplicar transformación de forma segura
    wrapper.style.transform = `translateX(${translateX}px)`;
    
    // Verificar que no se cause scroll horizontal
    setTimeout(() => {
        preventHorizontalScroll();
        isTransitioning = false;
    }, 100);
}



    let slidesData = [];

    function updateSliderCSSVariables() {
        // Usar document.documentElement.clientWidth en lugar de window.innerWidth
        // para evitar incluir la barra de scroll
        const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
        
        // Calcular anchos usando el viewport real (sin barra de scroll)
        const slideWidth = Math.floor(viewportWidth * 0.87); // 87% del viewport real
        const slideGap = Math.floor(viewportWidth * 0.02); // 2% gap
        const sideSpace = Math.floor((viewportWidth - slideWidth) / 2); // Espacio a los lados
        const navBtnOffset = Math.max(10, Math.floor(sideSpace / 2 - 30)); // Mínimo 10px
    
        // Actualizar variables CSS con valores seguros
        document.documentElement.style.setProperty('--slider-slide-width', `${slideWidth}px`);
        document.documentElement.style.setProperty('--slider-slide-gap', `${slideGap}px`);
        document.documentElement.style.setProperty('--slider-side-space', `${sideSpace}px`);
        document.documentElement.style.setProperty('--slider-nav-btn-offset', `${navBtnOffset}px`);
    
        console.log('Slider Independiente: Variables CSS actualizadas - Viewport:', viewportWidth, 'Ancho slide:', slideWidth, 'Gap:', slideGap, 'Espacio lateral:', sideSpace);
        
        // Verificar que las variables se aplicaron correctamente
        const appliedWidth = getComputedStyle(document.documentElement).getPropertyValue('--slider-slide-width');
        console.log('Slider Independiente: Variable aplicada:', appliedWidth);
        
        // Forzar reflow para asegurar que los cambios se apliquen
        document.documentElement.offsetHeight;
        
        // Prevenir scroll horizontal
        document.body.style.overflowX = 'hidden';
        document.documentElement.style.overflowX = 'hidden';
        
        // Aplicar estilos directamente a los slides existentes si los hay
        const slides = document.querySelectorAll('.slider-slide');
        if (slides.length > 0) {
            slides.forEach((slide, index) => {
                slide.style.flexBasis = `${slideWidth}px`;
                slide.style.width = `${slideWidth}px`;
                slide.style.marginRight = index < slides.length - 1 ? `${slideGap}px` : '0';
            });
            console.log('Slider Independiente: Estilos aplicados directamente a', slides.length, 'slides');
        }
    }

    // Cargar datos independientemente
    async function loadSliderData() {
        try {
            console.log('Slider Independiente: Cargando datos...');
            const response = await fetch(DATA_URL);
            if (!response.ok) throw new Error('No se pudo cargar data.json');
            const data = await response.json();
            
            // Filtrar solo películas
            const movies = data
                .filter(item => item && typeof item === 'object' && item['Categoría'] === 'Películas')
                .map((item, index) => ({
                    id: index.toString(),
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
                    // Campos adicionales para el modal
                    tmdbUrl: item['TMDB'] || '',
                    tmdbId: item['ID TMDB'] || '',
                    trailerUrl: item['Trailer'] || '',
                    videoUrl: item['Video iframe'] || item['Video iframe 1'] || item['Ver Película'] || '',
                    originalTitle: item['Título original'] || '',
                    productionCompanies: item['Productora(s)'] || '',
                    productionCountries: item['País(es)'] || '',
                    spokenLanguages: item['Idioma(s) original(es)'] || '',
                    writers: item['Escritor(es)'] || '',
                    // Campos de audio y subtítulos
                    audios: item['Audios'] || '',
                    subtitles: item['Subtítulos'] || '',
                    // Procesar audios y subtítulos como arrays
                    audioList: item['Audios'] ? item['Audios'].split(',').map(audio => audio.trim()) : [],
                    subtitleList: item['Subtítulos'] ? item['Subtítulos'].split(',').map(sub => sub.trim()) : [],
                    audiosCount: item['Audios'] ? item['Audios'].split(',').length : 0,
                    subtitlesCount: item['Subtítulos'] ? item['Subtítulos'].split(',').length : 0
                }));

            console.log('Slider Independiente: Datos cargados:', movies.length, 'películas');
            
            // Verificar algunos datos de ejemplo
            if (movies.length > 0) {
                const sampleMovie = movies[0];
                console.log('Slider Independiente: Película de ejemplo:', {
                    title: sampleMovie.title,
                    videoUrl: sampleMovie.videoUrl,
                    trailerUrl: sampleMovie.trailerUrl
                });
                
                // Verificar que las películas tengan imágenes
                const moviesWithImages = movies.filter(movie => movie.postersUrl || movie.posterUrl);
                console.log('Slider Independiente: Películas con imágenes:', moviesWithImages.length);
            }
            
            return movies;
        } catch (error) {
            console.error('Slider Independiente: Error cargando datos:', error);
            return [];
        }
    }

    // Renderizar slider
    function renderSlider(moviesData = []) {
        console.log('Slider Independiente: Iniciando renderizado...');
        
        const sliderWrapper = document.getElementById('slider-wrapper');
        if (!sliderWrapper) {
            console.error('Slider Independiente: slider-wrapper no encontrado');
            return;
        }

        // Aplicar variables CSS
        updateSliderCSSVariables();
        
        // Usar los datos proporcionados o los datos cargados
        const movies = moviesData.length > 0 ? moviesData : slidesData;

        // Seleccionar películas para el slider
        const usedGenres = new Set();
        
        // Ordenar por rating primero
        const sortedMovies = [...movies].sort((a, b) => {
            const ratingA = parseFloat(a.rating) || 0;
            const ratingB = parseFloat(b.rating) || 0;
            return ratingB - ratingA;
        });

        // Crear array temporal para las películas seleccionadas
        const selectedMovies = [];

        // Seleccionar películas de diferentes géneros
        for (const movie of sortedMovies) {
            if (movie.genre) {
                const mainGenre = movie.genre.split(/[·,]/)[0].trim();
                if (!usedGenres.has(mainGenre)) {
                    selectedMovies.push(movie);
                    usedGenres.add(mainGenre);
                    if (selectedMovies.length >= 8) break;
                }
            }
        }

        // Completar si hace falta
        if (selectedMovies.length < 6) {
            for (const movie of sortedMovies) {
                if (!selectedMovies.find(m => m.id === movie.id)) {
                    selectedMovies.push(movie);
                    if (selectedMovies.length >= 8) break;
                }
            }
        }

        // Si aún no hay suficientes, tomar las primeras películas
        if (selectedMovies.length < 6) {
            for (const movie of sortedMovies) {
                if (!selectedMovies.find(m => m.id === movie.id)) {
                    selectedMovies.push(movie);
                    if (selectedMovies.length >= 8) break;
                }
            }
        }
        
        console.log('Slider Independiente: Películas seleccionadas:', selectedMovies.length);

        // Asignar las películas seleccionadas al array global
        slidesData = selectedMovies;
        totalSlides = slidesData.length;
        console.log('Slider Independiente: Renderizando', totalSlides, 'slides');
        
        // Verificar que tenemos datos válidos
        if (totalSlides === 0) {
            console.error('Slider Independiente: No hay slides para renderizar');
            return;
        }
        
        // Verificar el tamaño de los slides después del renderizado
        setTimeout(() => {
            const slides = document.querySelectorAll('.slider-slide');
            if (slides.length > 0) {
                const firstSlide = slides[0];
                const computedStyle = getComputedStyle(firstSlide);
                console.log('Slider Independiente: Tamaño del primer slide - Width:', computedStyle.width, 'Flex-basis:', computedStyle.flexBasis);
                
                // Forzar actualización de estilos si es necesario
                if (computedStyle.width === 'auto' || computedStyle.width === '0px') {
                    console.log('Slider Independiente: Detectado tamaño incorrecto, forzando actualización...');
                    updateSliderCSSVariables();
                    
                    // Re-aplicar estilos a todos los slides
                    slides.forEach((slide, index) => {
                        const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
                        const calculatedWidth = Math.floor(viewportWidth * 0.87);
                        const calculatedGap = Math.floor(viewportWidth * 0.02);
                        
                        slide.style.flexBasis = `${calculatedWidth}px`;
                        slide.style.width = `${calculatedWidth}px`;
                        slide.style.marginRight = index < slides.length - 1 ? `${calculatedGap}px` : '0';
                    });
                    
                    console.log('Slider Independiente: Estilos forzados aplicados');
                }
            }
        }, 100);

        // Limpiar y crear slides
        sliderWrapper.innerHTML = '';
        
        // Obtener valores de ancho antes de crear los slides
        const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
        const slideWidth = Math.floor(viewportWidth * 0.87);
        const slideGap = Math.floor(viewportWidth * 0.02);
        
        console.log('Slider Independiente: Creando slides con ancho:', slideWidth, 'gap:', slideGap);
        
        slidesData.forEach((movie, index) => {
            const slideDiv = document.createElement('div');
            slideDiv.className = 'slider-slide';
            slideDiv.dataset.index = index;
            
            // Aplicar estilos directamente para asegurar que funcionen
            slideDiv.style.flexBasis = `${slideWidth}px`;
            slideDiv.style.width = `${slideWidth}px`;
            slideDiv.style.marginRight = index < slidesData.length - 1 ? `${slideGap}px` : '0';
            slideDiv.style.flexShrink = '0';
            slideDiv.style.flexGrow = '0';
            
            // Usar la imagen correcta según los datos disponibles
            const imageUrl = movie.postersUrl || movie.posterUrl || movie.imageUrl || 
                           `https://via.placeholder.com/800x450/333/fff?text=${encodeURIComponent(movie.title)}`;
            
            // Obtener el género principal
            const mainGenre = movie.genre ? movie.genre.split(/[·,]/)[0].trim() : '';
            
            slideDiv.innerHTML = `
                <div class="slider-img-wrapper">
                    <img src="${imageUrl}" 
                         alt="${movie.title}" 
                         loading="${index === 0 ? 'eager' : 'lazy'}"
                         onerror="this.src='https://via.placeholder.com/800x450/333/fff?text=No+Image'">
                </div>
                <div class="slider-overlay">
                    <div class="slider-title-movie">${movie.title || 'Sin título'}</div>
                    <div class="slider-meta">
                        ${movie.year ? `<span>${movie.year}</span>` : ''}
                        ${movie.duration ? `<span>${movie.duration}</span>` : ''}
                        ${mainGenre ? `<span>${mainGenre}</span>` : ''}
                        ${movie.rating ? `<span><i class="fas fa-star"></i> ${movie.rating}</span>` : ''}
                    </div>
                    <div class="slider-description">${movie.description || movie.synopsis || 'Sin descripción disponible'}</div>
                </div>
            `;

            // Click handler
            slideDiv.addEventListener('click', (e) => {
                if (!isTransitioning) {
                    e.preventDefault();
                    console.log('Slider Independiente: Click en slide:', movie.title);
                    openDetailsModal(movie, slideDiv);
                }
            });

            sliderWrapper.appendChild(slideDiv);
        });

        // Configurar controles
        setupControls();
        
        // Ir al primer slide
        currentIndex = 0;
        updateSliderPosition();
        updatePagination();
        
        console.log('Slider Independiente: Renderizado completado con', totalSlides, 'slides');
        
        // Verificación final de que todo esté correcto
        setTimeout(() => {
            const slides = document.querySelectorAll('.slider-slide');
            const wrapper = document.getElementById('slider-wrapper');
            console.log('Slider Independiente: Verificación final - Slides:', slides.length, 'Wrapper transform:', wrapper?.style.transform);
            
            // Verificar que el wrapper tenga el contenido correcto
            if (wrapper && slides.length > 0) {
                console.log('Slider Independiente: Wrapper tiene', wrapper.children.length, 'hijos');
                console.log('Slider Independiente: Primer slide:', wrapper.firstElementChild?.className);
            }
        }, 100);
    }

    // Configurar controles
    function setupControls() {
        // Navegación
        const prevBtn = document.getElementById('slider-prev');
        const nextBtn = document.getElementById('slider-next');
        
        if (prevBtn) {
            // Limpiar event listeners existentes
            const newPrevBtn = prevBtn.cloneNode(true);
            prevBtn.replaceWith(newPrevBtn);
            document.getElementById('slider-prev').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isTransitioning && totalSlides > 0) {
                    console.log('Slider Independiente: Botón prev clickeado');
                    goToSlide(currentIndex - 1);
                }
            });
        }
        
        if (nextBtn) {
            // Limpiar event listeners existentes
            const newNextBtn = nextBtn.cloneNode(true);
            nextBtn.replaceWith(newNextBtn);
            document.getElementById('slider-next').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isTransitioning && totalSlides > 0) {
                    console.log('Slider Independiente: Botón next clickeado');
                    goToSlide(currentIndex + 1);
                }
            });
        }

        // Paginación
        createPagination();
        
        console.log('Slider Independiente: Controles configurados');
    }

    // Crear paginación
    function createPagination() {
        const pagination = document.getElementById('slider-pagination');
        if (!pagination) {
            console.error('Slider Independiente: Elemento pagination no encontrado');
            return;
        }
        
        pagination.innerHTML = '';
        
        console.log('Slider Independiente: Creando paginación para', totalSlides, 'slides');
        
        for (let i = 0; i < totalSlides; i++) {
            const dot = document.createElement('button');
            dot.className = 'slider-pagination-dot';
            dot.dataset.slide = i;
            if (i === 0) dot.classList.add('active');
            
            dot.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isTransitioning) {
                    console.log('Slider Independiente: Dot clickeado, slide:', i);
                    goToSlide(i);
                }
            });
            
            pagination.appendChild(dot);
        }
        
        console.log('Slider Independiente: Paginación creada con', totalSlides, 'dots');
    }

    // Ir a slide
    function goToSlide(index) {
        if (isTransitioning || totalSlides === 0) return;
        
        // Navegación circular
        if (index < 0) index = totalSlides - 1;
        if (index >= totalSlides) index = 0;
        
        if (index === currentIndex) return;
        
        console.log('Slider Independiente: Cambiando a slide', index, 'de', totalSlides, 'total');
        
        currentIndex = index;
        updateSliderPosition();
        updatePagination();
        
        // Verificar que la posición se aplicó correctamente
        setTimeout(() => {
            const wrapper = document.getElementById('slider-wrapper');
            if (wrapper) {
                const transform = wrapper.style.transform;
                console.log('Slider Independiente: Transformación aplicada:', transform);
            }
        }, 100);
    }

    // Actualizar posición usando variables CSS
    function updateSliderPosition() {
        const wrapper = document.getElementById('slider-wrapper');
        if (!wrapper) return;
        
        isTransitioning = true;
        
        // Obtener valores de las variables CSS o calcular directamente
        const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
        const slideWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--slider-slide-width')) || Math.floor(viewportWidth * 0.87);
        const slideGap = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--slider-slide-gap')) || Math.floor(viewportWidth * 0.02);
        
        const translateX = -(slideWidth + slideGap) * currentIndex;
        wrapper.style.transform = `translateX(${translateX}px)`;
        
        console.log('Slider Independiente: Posición actualizada - Index:', currentIndex, 'TranslateX:', translateX);
        
        setTimeout(() => {
            isTransitioning = false;
        }, 600);
    }

    // Actualizar paginación
    function updatePagination() {
        const dots = document.querySelectorAll('.slider-pagination-dot');
        console.log('Slider Independiente: Actualizando paginación - Dots encontrados:', dots.length, 'Current index:', currentIndex);
        
        dots.forEach((dot, index) => {
            const isActive = index === currentIndex;
            dot.classList.toggle('active', isActive);
            if (isActive) {
                console.log('Slider Independiente: Dot activo:', index);
            }
        });
    }



    // Inicializar
    // Función de inicialización mejorada
async function init() {
    console.log('Slider Independiente: Inicializando...');
    
    // Prevenir scroll horizontal desde el inicio
    document.body.style.overflowX = 'hidden';
    document.documentElement.style.overflowX = 'hidden';
    
    // Inicializar variables CSS
    updateSliderCSSVariables();
    
    // Cargar datos independientemente
    const movies = await loadSliderData();
    if (movies && movies.length > 0) {
        slidesData = movies;
        totalSlides = movies.length;
        console.log('Slider Independiente: Datos cargados, total slides:', totalSlides);
        
        renderSlider(movies);
        
        // Agregar listener de resize mejorado
        window.addEventListener('resize', handleResize, { passive: true });
        
        // Verificación adicional después de renderizar
        setTimeout(() => {
            updateSliderCSSVariables();
            preventHorizontalScroll();
            
            const slides = document.querySelectorAll('.slider-slide');
            if (slides.length > 0) {
                console.log('Slider Independiente: Verificación final completada, slides encontrados:', slides.length);
                
                // Verificar que todos los slides tengan el tamaño correcto
                slides.forEach((slide, index) => {
                    const computedStyle = getComputedStyle(slide);
                    console.log(`Slider Independiente: Slide ${index} - Width:`, computedStyle.width, 'Flex-basis:', computedStyle.flexBasis);
                });
                
                // Verificación final de scroll horizontal
                const hasScroll = document.body.scrollWidth > document.body.clientWidth;
                if (hasScroll) {
                    console.warn('Scroll horizontal final detectado, aplicando corrección definitiva...');
                    slides.forEach((slide, index) => {
                        const viewportWidth = document.documentElement.clientWidth;
                        const safeWidth = Math.floor(viewportWidth * 0.85); // Usar 85% como valor seguro
                        slide.style.flexBasis = `${safeWidth}px`;
                        slide.style.width = `${safeWidth}px`;
                        slide.style.marginRight = index < slides.length - 1 ? '16px' : '0';
                    });
                }
                
                // Ir al primer slide y actualizar posición
                currentIndex = 0;
                updateSliderPosition();
                updatePagination();
                
                console.log('Slider Independiente: Inicialización completada exitosamente');
            } else {
                console.error('Slider Independiente: No se encontraron slides después del renderizado');
            }
        }, 300);
    } else {
        console.error('Slider Independiente: No se pudieron cargar datos');
    }
}

   // Observer para detectar cambios en el DOM que puedan causar scroll horizontal
const horizontalScrollObserver = new MutationObserver((mutations) => {
    let shouldCheck = false;
    mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
            shouldCheck = true;
        }
    });
    
    if (shouldCheck) {
        setTimeout(preventHorizontalScroll, 100);
    }
});

// Iniciar observación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    horizontalScrollObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
    });
});

// Cleanup mejorado
window.addEventListener('beforeunload', () => {
    window.removeEventListener('resize', handleResize);
    horizontalScrollObserver.disconnect();
    clearTimeout(resizeTimeout);
});

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Función para abrir modal de detalles de forma segura
    function openDetailsModal(movie, element) {
        console.log('Slider Independiente: Intentando abrir modal para:', movie.title);
        
        // Función interna para intentar abrir el modal
        function tryOpenModal() {
            if (window.detailsModal && typeof window.detailsModal.show === 'function') {
                window.detailsModal.show(movie, element);
                window.activeItem = movie;
                console.log('Slider Independiente: Modal abierto exitosamente');
                return true;
            }
            return false;
        }
        
        // Intentar abrir inmediatamente
        if (!tryOpenModal()) {
            console.warn('Slider Independiente: Modal no disponible, reintentando...');
            
            // Reintentar varias veces con intervalos crecientes
            let attempts = 0;
            const maxAttempts = 5;
            const retryInterval = setInterval(() => {
                attempts++;
                if (tryOpenModal()) {
                    clearInterval(retryInterval);
                } else if (attempts >= maxAttempts) {
                    console.error('Slider Independiente: No se pudo abrir el modal después de', maxAttempts, 'intentos');
                    clearInterval(retryInterval);
                }
            }, 200 * attempts); // Intervalo creciente: 200ms, 400ms, 600ms, etc.
        }
    }

    // Exponer API
    window.sliderIndependent = {
        goToSlide,
        next: () => goToSlide(currentIndex + 1),
        prev: () => goToSlide(currentIndex - 1),
        getCurrentIndex: () => currentIndex,
        getTotalSlides: () => totalSlides,
        getSlidesData: () => slidesData,
        init,
        renderSlider,
        updateSliderCSSVariables,
        openDetailsModal
    };

})(); 