// Slider Independiente - Con resize corregido
(function () {
    let currentIndex = 0;
    let totalSlides = 0;
    let isTransitioning = false;
    let resizeTimeout = null;
    let slidesData = [];
    let isDestroyed = false;

    // Función mejorada para manejar el resize
    function handleResize() {
        if (isDestroyed) return;
        
        clearTimeout(resizeTimeout);
        
        console.log('Slider Independiente: Resize detectado');
        
        // Aplicar cambios inmediatamente para mejor respuesta
        updateSliderCSSVariables();
        
        // Actualización con debounce para evitar múltiples ejecuciones
        resizeTimeout = setTimeout(() => {
            if (isDestroyed || totalSlides === 0) return;
            
            console.log('Slider Independiente: Aplicando resize definitivo');
            
            // Recalcular todo
            updateSliderCSSVariables();
            updateSliderLayout();
            updateSliderPosition();
            
            // Verificar y corregir cualquier problema
            setTimeout(() => {
                if (!isDestroyed) {
                    verifySliderIntegrity();
                }
            }, 100);
            
        }, 200); // Debounce de 200ms
    }

    // Nueva función para actualizar el layout completo
    function updateSliderLayout() {
        const wrapper = document.getElementById('slider-wrapper');
        const slides = document.querySelectorAll('.slider-slide');
        
        if (!wrapper || slides.length === 0) {
            console.warn('Slider Independiente: No se encontró wrapper o slides');
            return;
        }
        
        // Obtener nuevos valores calculados
        const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
        const slideWidth = Math.floor(viewportWidth * 0.87);
        const slideGap = Math.floor(viewportWidth * 0.02);
        
        console.log('Slider Independiente: Actualizando layout - Width:', slideWidth, 'Gap:', slideGap);
        
        // Aplicar nuevos estilos a todos los slides
        slides.forEach((slide, index) => {
            slide.style.width = `${slideWidth}px`;
            slide.style.flexBasis = `${slideWidth}px`;
            slide.style.marginRight = index < slides.length - 1 ? `${slideGap}px` : '0';
            slide.style.flexShrink = '0';
            slide.style.flexGrow = '0';
        });
        
        // Actualizar el wrapper
        const sideSpace = Math.floor((viewportWidth - slideWidth) / 2);
        wrapper.style.left = `${sideSpace}px`;
        
        console.log('Slider Independiente: Layout actualizado para', slides.length, 'slides');
    }

    // Función mejorada para actualizar variables CSS
    function updateSliderCSSVariables() {
        if (isDestroyed) return;
        
        const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
        
        // Calcular anchos de forma más robusta
        const slideWidth = Math.max(300, Math.floor(viewportWidth * 0.87)); // Mínimo 300px
        const slideGap = Math.max(10, Math.floor(viewportWidth * 0.02)); // Mínimo 10px
        const sideSpace = Math.floor((viewportWidth - slideWidth) / 2);
        const navBtnOffset = Math.max(10, Math.floor(sideSpace / 2 - 30));

        // Actualizar variables CSS
        document.documentElement.style.setProperty('--slider-slide-width', `${slideWidth}px`);
        document.documentElement.style.setProperty('--slider-slide-gap', `${slideGap}px`);
        document.documentElement.style.setProperty('--slider-side-space', `${sideSpace}px`);
        document.documentElement.style.setProperty('--slider-nav-btn-offset', `${navBtnOffset}px`);

        // Prevenir scroll horizontal
        document.body.style.overflowX = 'hidden';
        document.documentElement.style.overflowX = 'hidden';
        
        console.log('Slider Independiente: Variables actualizadas -', {
            viewport: viewportWidth,
            slideWidth,
            slideGap,
            sideSpace
        });
    }

    // Nueva función para verificar la integridad del slider
    function verifySliderIntegrity() {
        if (isDestroyed) return;
        
        const wrapper = document.getElementById('slider-wrapper');
        const slides = document.querySelectorAll('.slider-slide');
        
        if (!wrapper || slides.length === 0) {
            console.warn('Slider Independiente: Verificación falló - elementos no encontrados');
            return;
        }
        
        // Verificar que todos los slides tengan el tamaño correcto
        const expectedWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--slider-slide-width'));
        let needsUpdate = false;
        
        slides.forEach((slide, index) => {
            const currentWidth = parseInt(slide.style.width) || 0;
            if (currentWidth !== expectedWidth) {
                console.log(`Slider Independiente: Slide ${index} necesita corrección - Actual: ${currentWidth}, Esperado: ${expectedWidth}`);
                needsUpdate = true;
            }
        });
        
        if (needsUpdate) {
            console.log('Slider Independiente: Aplicando corrección de integridad');
            updateSliderLayout();
        }
        
        // Verificar posición actual
        const transform = wrapper.style.transform;
        console.log('Slider Independiente: Verificación completa - Transform:', transform);
    }

    // Función mejorada para actualizar posición
    function updateSliderPosition() {
        if (isDestroyed) return;
        
        const wrapper = document.getElementById('slider-wrapper');
        if (!wrapper) return;
        
        isTransitioning = true;
        
        // Obtener valores actuales
        const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
        const slideWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--slider-slide-width')) || Math.floor(viewportWidth * 0.87);
        const slideGap = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--slider-slide-gap')) || Math.floor(viewportWidth * 0.02);
        
        // Calcular posición
        const translateX = -(slideWidth + slideGap) * currentIndex;
        wrapper.style.transform = `translateX(${translateX}px)`;
        
        console.log('Slider Independiente: Posición actualizada -', {
            index: currentIndex,
            translateX,
            slideWidth,
            slideGap
        });
        
        setTimeout(() => {
            isTransitioning = false;
        }, 600);
    }

    // Cargar datos
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

            console.log('Slider Independiente: Datos cargados:', movies.length, 'películas');
            return movies;
        } catch (error) {
            console.error('Slider Independiente: Error cargando datos:', error);
            return [];
        }
    }

    // Renderizar slider
    function renderSlider(moviesData = []) {
        if (isDestroyed) return;
        
        console.log('Slider Independiente: Iniciando renderizado...');
        
        const sliderWrapper = document.getElementById('slider-wrapper');
        if (!sliderWrapper) {
            console.error('Slider Independiente: slider-wrapper no encontrado');
            return;
        }

        // Usar los datos proporcionados o los datos cargados
        const movies = moviesData.length > 0 ? moviesData : slidesData;

        // Seleccionar películas para el slider (lógica simplificada)
        const selectedMovies = movies
            .sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0))
            .slice(0, 8);
        
        console.log('Slider Independiente: Películas seleccionadas:', selectedMovies.length);

        // Asignar datos globales
        slidesData = selectedMovies;
        totalSlides = slidesData.length;
        
        if (totalSlides === 0) {
            console.error('Slider Independiente: No hay slides para renderizar');
            return;
        }

        // Aplicar variables CSS antes de crear slides
        updateSliderCSSVariables();
        
        // Limpiar wrapper
        sliderWrapper.innerHTML = '';
        
        // Configurar wrapper
        sliderWrapper.style.display = 'flex';
        sliderWrapper.style.flexDirection = 'row';
        sliderWrapper.style.flexWrap = 'nowrap';
        sliderWrapper.style.transform = 'translateX(0)';
        sliderWrapper.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        sliderWrapper.style.position = 'relative';
        
        // Obtener valores para crear slides
        const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
        const slideWidth = Math.floor(viewportWidth * 0.87);
        const slideGap = Math.floor(viewportWidth * 0.02);
        
        console.log('Slider Independiente: Creando slides con dimensiones:', { slideWidth, slideGap });
        
        // Crear slides
        slidesData.forEach((movie, index) => {
            const slideDiv = document.createElement('div');
            slideDiv.className = 'slider-slide';
            slideDiv.dataset.index = index;
            
            // Aplicar estilos directamente
            slideDiv.style.width = `${slideWidth}px`;
            slideDiv.style.flexBasis = `${slideWidth}px`;
            slideDiv.style.marginRight = index < slidesData.length - 1 ? `${slideGap}px` : '0';
            slideDiv.style.flexShrink = '0';
            slideDiv.style.flexGrow = '0';
            slideDiv.style.position = 'relative';
            
            // Usar la imagen correcta
            const imageUrl = movie.postersUrl || movie.posterUrl || 
                           `https://via.placeholder.com/800x450/333/fff?text=${encodeURIComponent(movie.title)}`;
            
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
        
        // Posicionar slider
        currentIndex = 0;
        updateSliderPosition();
        updatePagination();
        
        console.log('Slider Independiente: Renderizado completado');
        
        // Verificación final
        setTimeout(() => {
            if (!isDestroyed) {
                verifySliderIntegrity();
            }
        }, 300);
    }

    // Configurar controles
    function setupControls() {
        // Navegación
        const prevBtn = document.getElementById('slider-prev');
        const nextBtn = document.getElementById('slider-next');
        
        if (prevBtn) {
            const newPrevBtn = prevBtn.cloneNode(true);
            prevBtn.replaceWith(newPrevBtn);
            document.getElementById('slider-prev').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isTransitioning && totalSlides > 0) {
                    goToSlide(currentIndex - 1);
                }
            });
        }
        
        if (nextBtn) {
            const newNextBtn = nextBtn.cloneNode(true);
            nextBtn.replaceWith(newNextBtn);
            document.getElementById('slider-next').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isTransitioning && totalSlides > 0) {
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
        if (isTransitioning || totalSlides === 0 || isDestroyed) return;
        
        // Navegación circular
        if (index < 0) index = totalSlides - 1;
        if (index >= totalSlides) index = 0;
        
        if (index === currentIndex) return;
        
        console.log('Slider Independiente: Cambiando a slide', index);
        
        currentIndex = index;
        updateSliderPosition();
        updatePagination();
    }

    // Actualizar paginación
    function updatePagination() {
        const dots = document.querySelectorAll('.slider-pagination-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
        });
    }

    // Función para abrir modal
    function openDetailsModal(movie, element) {
        console.log('Slider Independiente: Abriendo modal para:', movie.title);
        
        function tryOpenModal() {
            if (window.detailsModal && typeof window.detailsModal.show === 'function') {
                window.detailsModal.show(movie, element);
                window.activeItem = movie;
                return true;
            }
            return false;
        }
        
        if (!tryOpenModal()) {
            let attempts = 0;
            const maxAttempts = 5;
            const retryInterval = setInterval(() => {
                attempts++;
                if (tryOpenModal()) {
                    clearInterval(retryInterval);
                } else if (attempts >= maxAttempts) {
                    console.error('Slider Independiente: No se pudo abrir el modal');
                    clearInterval(retryInterval);
                }
            }, 200 * attempts);
        }
    }

    // Función de limpieza
    function destroy() {
        console.log('Slider Independiente: Destruyendo...');
        isDestroyed = true;
        
        clearTimeout(resizeTimeout);
        window.removeEventListener('resize', handleResize);
        
        // Limpiar event listeners adicionales si los hay
        const prevBtn = document.getElementById('slider-prev');
        const nextBtn = document.getElementById('slider-next');
        const dots = document.querySelectorAll('.slider-pagination-dot');
        
        if (prevBtn) prevBtn.replaceWith(prevBtn.cloneNode(true));
        if (nextBtn) nextBtn.replaceWith(nextBtn.cloneNode(true));
        dots.forEach(dot => dot.replaceWith(dot.cloneNode(true)));
    }

    // Inicialización mejorada
    async function init() {
        if (isDestroyed) return;
        
        console.log('Slider Independiente: Inicializando...');
        
        // Prevenir scroll horizontal
        document.body.style.overflowX = 'hidden';
        document.documentElement.style.overflowX = 'hidden';
        
        // Inicializar variables CSS
        updateSliderCSSVariables();
        
        // Cargar datos
        const movies = await loadSliderData();
        if (movies && movies.length > 0) {
            slidesData = movies;
            totalSlides = movies.length;
            
            // Renderizar
            renderSlider(movies);
            
            // Agregar listener de resize mejorado
            window.addEventListener('resize', handleResize, { passive: true });
            
            console.log('Slider Independiente: Inicialización completada');
        } else {
            console.error('Slider Independiente: No se pudieron cargar datos');
        }
    }

    // Cleanup al cerrar
    window.addEventListener('beforeunload', destroy);
    
    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
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
        updateSliderLayout,
        verifySliderIntegrity,
        openDetailsModal,
        destroy
    };

})();