// Slider Independiente - No depende del carousel
(function () {
    let currentIndex = 0;
    let totalSlides = 0;
    let isTransitioning = false;
    let resizeTimeout = null;
    let slidesData = [];

    // Función para actualizar las variables CSS dinámicamente
    function updateSliderCSSVariables() {
        const viewportWidth = window.innerWidth;
        const slideWidth = Math.floor(viewportWidth * 0.87); // 87vw
        const slideGap = Math.floor(viewportWidth * 0.02); // 2vw gap
        const sideSpace = Math.floor((viewportWidth - slideWidth) / 2); // Espacio a los lados
        const navBtnOffset = Math.floor(sideSpace / 2 - 30);

        // Actualizar variables CSS
        document.documentElement.style.setProperty('--slider-slide-width', `${slideWidth}px`);
        document.documentElement.style.setProperty('--slider-slide-gap', `${slideGap}px`);
        document.documentElement.style.setProperty('--slider-side-space', `${sideSpace}px`);
        document.documentElement.style.setProperty('--slider-nav-btn-offset', `${navBtnOffset}px`);

        console.log('Slider Independiente: Variables CSS actualizadas - Ancho slide:', slideWidth, 'Gap:', slideGap, 'Espacio lateral:', sideSpace);
        
        // Verificar que las variables se aplicaron correctamente
        const appliedWidth = getComputedStyle(document.documentElement).getPropertyValue('--slider-slide-width');
        console.log('Slider Independiente: Variable aplicada:', appliedWidth);
        
        // Forzar reflow para asegurar que los cambios se apliquen
        document.documentElement.offsetHeight;
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
                if (selectedMovies.length >= 8) break;
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

        // Asignar las películas seleccionadas al array global
        slidesData = selectedMovies;
        totalSlides = slidesData.length;
        console.log('Slider Independiente: Renderizando', totalSlides, 'slides');
        
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
                        const slideWidth = getComputedStyle(document.documentElement).getPropertyValue('--slider-slide-width');
                        const slideGap = getComputedStyle(document.documentElement).getPropertyValue('--slider-slide-gap');
                        
                        if (slideWidth && slideWidth !== '') {
                            slide.style.flexBasis = slideWidth;
                            slide.style.width = slideWidth;
                        } else {
                            const viewportWidth = window.innerWidth;
                            const calculatedWidth = Math.floor(viewportWidth * 0.87);
                            slide.style.flexBasis = `${calculatedWidth}px`;
                            slide.style.width = `${calculatedWidth}px`;
                        }
                        
                        slide.style.marginRight = index < slides.length - 1 ? (slideGap || '16px') : '0';
                    });
                    
                    console.log('Slider Independiente: Estilos forzados aplicados');
                }
            }
        }, 100);

        // Limpiar y crear slides
        sliderWrapper.innerHTML = '';
        
        slidesData.forEach((movie, index) => {
            const slideDiv = document.createElement('div');
            slideDiv.className = 'slider-slide';
            slideDiv.dataset.index = index;
            
            // Asegurar que el slide use las variables CSS correctas
            const slideWidth = getComputedStyle(document.documentElement).getPropertyValue('--slider-slide-width');
            const slideGap = getComputedStyle(document.documentElement).getPropertyValue('--slider-slide-gap');
            
            // Aplicar valores directamente si las variables CSS están disponibles
            if (slideWidth && slideWidth !== '') {
                slideDiv.style.flexBasis = slideWidth;
                slideDiv.style.width = slideWidth;
            } else {
                // Fallback: calcular valores directamente
                const viewportWidth = window.innerWidth;
                const calculatedWidth = Math.floor(viewportWidth * 0.87);
                slideDiv.style.flexBasis = `${calculatedWidth}px`;
                slideDiv.style.width = `${calculatedWidth}px`;
            }
            
            slideDiv.style.marginRight = index < slidesData.length - 1 ? (slideGap || '16px') : '0';
            
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
        
        console.log('Slider Independiente: Renderizado completado con', totalSlides, 'slides');
    }

    // Configurar controles
    function setupControls() {
        // Navegación
        const prevBtn = document.getElementById('slider-prev');
        const nextBtn = document.getElementById('slider-next');
        
        if (prevBtn) {
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

        // Paginación
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
                if (!isTransitioning) {
                    goToSlide(i);
                }
            });
            
            pagination.appendChild(dot);
        }
    }

    // Ir a slide
    function goToSlide(index) {
        if (isTransitioning || totalSlides === 0) return;
        
        // Navegación circular
        if (index < 0) index = totalSlides - 1;
        if (index >= totalSlides) index = 0;
        
        if (index === currentIndex) return;
        
        console.log('Slider Independiente: Cambiando a slide', index);
        
        currentIndex = index;
        updateSliderPosition();
        updatePagination();
    }

    // Actualizar posición usando variables CSS
    function updateSliderPosition() {
        const wrapper = document.getElementById('slider-wrapper');
        if (!wrapper) return;
        
        isTransitioning = true;
        
        // Obtener valores de las variables CSS
        const slideWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--slider-slide-width')) || Math.floor(window.innerWidth * 0.87);
        const slideGap = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--slider-slide-gap')) || Math.floor(window.innerWidth * 0.02);
        
        const translateX = -(slideWidth + slideGap) * currentIndex;
        wrapper.style.transform = `translateX(${translateX}px)`;
        
        setTimeout(() => {
            isTransitioning = false;
        }, 600);
    }

    // Actualizar paginación
    function updatePagination() {
        const dots = document.querySelectorAll('.slider-pagination-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
        });
    }

    // Manejar resize con actualización en tiempo real
    function handleResize() {
        clearTimeout(resizeTimeout);
        
        // Actualización inmediata para mejor respuesta
        if (totalSlides > 0) {
            updateSliderCSSVariables();
            updateSliderPosition();
        }
        
        // Actualización adicional después de un breve delay para asegurar estabilidad
        resizeTimeout = setTimeout(() => {
            if (totalSlides > 0) {
                updateSliderCSSVariables();
                updateSliderPosition();
            }
        }, 100);
    }

    // Inicializar
    async function init() {
        console.log('Slider Independiente: Inicializando...');
        
        // Inicializar variables CSS
        updateSliderCSSVariables();
        
        // Cargar datos independientemente
        const movies = await loadSliderData();
        if (movies && movies.length > 0) {
            slidesData = movies;
            renderSlider(movies);
            window.addEventListener('resize', handleResize);
            
            // Verificación adicional después de renderizar
            setTimeout(() => {
                updateSliderCSSVariables();
                const slides = document.querySelectorAll('.slider-slide');
                if (slides.length > 0) {
                    const firstSlide = slides[0];
                    const computedStyle = getComputedStyle(firstSlide);
                    console.log('Slider Independiente: Verificación final - Width:', computedStyle.width, 'Flex-basis:', computedStyle.flexBasis);
                    
                    // Si el tamaño sigue siendo incorrecto, forzar actualización
                    if (computedStyle.width === 'auto' || computedStyle.width === '0px') {
                        console.log('Slider Independiente: Tamaño incorrecto detectado, forzando corrección...');
                        slides.forEach((slide, index) => {
                            const viewportWidth = window.innerWidth;
                            const calculatedWidth = Math.floor(viewportWidth * 0.87);
                            slide.style.flexBasis = `${calculatedWidth}px`;
                            slide.style.width = `${calculatedWidth}px`;
                            slide.style.marginRight = index < slides.length - 1 ? '16px' : '0';
                        });
                    }
                }
            }, 300);
        } else {
            console.error('Slider Independiente: No se pudieron cargar datos');
        }
    }

    // Cleanup
    window.addEventListener('beforeunload', () => {
        window.removeEventListener('resize', handleResize);
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
        init,image.png
        renderSlider,
        updateSliderCSSVariables,
        openDetailsModal
    };

})(); 