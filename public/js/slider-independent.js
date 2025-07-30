// Slider Independiente - VERSIÓN COMPLETAMENTE CORREGIDA
(function () {
    let currentIndex = 0;
    let totalSlides = 0;
    let isTransitioning = false;
    let resizeTimeout = null;
    let slidesData = [];
    let isDestroyed = false;
    let lastViewportWidth = 0;
    
    // Variables para touch/swipe
    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartTime = 0;
    let isDragging = false;
    let startTransform = 0;
    let currentTransform = 0;

    // FUNCIÓN COMPLETAMENTE REDISEÑADA: Calcular dimensiones responsivas
    function calculateResponsiveDimensions() {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const isMobile = viewportWidth <= 768;
        const isTablet = viewportWidth > 768 && viewportWidth <= 1024;
        const isLandscape = viewportWidth > viewportHeight && isMobile;
        
        let slideWidth, slideHeight, slideGap, sideSpace, buttonSpace;
        
        if (isMobile) {
            // MÓVIL: Slide ocupa casi todo el ancho, pequeñas partes visibles a los lados
            slideWidth = Math.round(viewportWidth * 0.85); // 85% del viewport
            slideHeight = Math.round(slideWidth * 0.56); // Ratio 16:9
            slideGap = 20;
            sideSpace = Math.round((viewportWidth - slideWidth) / 2); // Centrado
            buttonSpace = 50; // Espacio para botones
        } else if (isTablet) {
            // TABLET: Similar a móvil pero un poco más grande
            slideWidth = Math.round(viewportWidth * 0.75);
            slideHeight = Math.round(slideWidth * 0.56);
            slideGap = 25;
            sideSpace = Math.round((viewportWidth - slideWidth) / 2);
            buttonSpace = 60;
        } else {
            // DESKTOP: Como en la imagen 1 - un slide principal con partes laterales visibles
            slideWidth = Math.min(Math.round(viewportWidth * 0.7), 900); // Máximo 900px
            slideHeight = Math.round(slideWidth * 0.45); // Ratio más panorámico
            slideGap = 30;
            sideSpace = Math.round((viewportWidth - slideWidth) / 2);
            buttonSpace = 80;
        }
        
        console.log('Slider: Dimensiones calculadas', {
            viewportWidth,
            slideWidth,
            slideHeight,
            slideGap,
            sideSpace,
            buttonSpace,
            isMobile,
            isTablet
        });
        
        return { slideWidth, slideHeight, slideGap, sideSpace, buttonSpace, isMobile, isTablet, isLandscape };
    }

    // Detectar dispositivos móviles
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }

    // Detectar dispositivos táctiles
    function isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    // Configurar eventos touch/swipe
    function setupTouchEvents() {
        const wrapper = document.getElementById('slider-wrapper');
        if (!wrapper) return;
        
        // Limpiar eventos previos
        wrapper.removeEventListener('touchstart', handleTouchStart);
        wrapper.removeEventListener('touchmove', handleTouchMove);
        wrapper.removeEventListener('touchend', handleTouchEnd);
        
        // Solo en dispositivos táctiles
        if (isTouchDevice()) {
            wrapper.addEventListener('touchstart', handleTouchStart, { passive: false });
            wrapper.addEventListener('touchmove', handleTouchMove, { passive: false });
            wrapper.addEventListener('touchend', handleTouchEnd, { passive: false });
        }
    }

    function handleTouchStart(e) {
        if (isTransitioning || totalSlides <= 1) return;
        
        touchStartX = e.touches[0].clientX;
        touchStartTime = Date.now();
        isDragging = true;
        
        const wrapper = document.getElementById('slider-wrapper');
        if (wrapper) {
            const transform = wrapper.style.transform;
            const match = transform.match(/translateX\(([^)]+)\)/);
            startTransform = match ? parseFloat(match[1]) : 0;
            currentTransform = startTransform;
            wrapper.style.transition = 'none';
        }
    }

    function handleTouchMove(e) {
        if (!isDragging || isTransitioning) return;
        e.preventDefault();
        
        const touchCurrentX = e.touches[0].clientX;
        const deltaX = touchCurrentX - touchStartX;
        const wrapper = document.getElementById('slider-wrapper');
        
        if (wrapper) {
            currentTransform = startTransform + deltaX;
            wrapper.style.transform = `translateX(${currentTransform}px)`;
        }
    }

    function handleTouchEnd(e) {
        if (!isDragging) return;
        
        isDragging = false;
        touchEndX = e.changedTouches[0].clientX;
        
        const wrapper = document.getElementById('slider-wrapper');
        if (wrapper) {
            wrapper.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        }
        
        const deltaX = touchEndX - touchStartX;
        const threshold = 50;
        
        if (Math.abs(deltaX) > threshold) {
            const direction = deltaX > 0 ? -1 : 1;
            goToSlide(currentIndex + direction);
        } else {
            updateSliderPosition(true);
        }
    }

    // FUNCIÓN COMPLETAMENTE REDISEÑADA: Posicionar botones
    function positionNavigationButtons() {
        const prevBtn = document.getElementById('slider-prev');
        const nextBtn = document.getElementById('slider-next');
        const container = document.getElementById('slider-wrapper')?.parentElement;
        
        if (!prevBtn || !nextBtn || !container) return;
        
        const dimensions = calculateResponsiveDimensions();
        
        // Estilos base para ambos botones
        const baseButtonStyle = {
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: '1000',
            border: 'none',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            borderRadius: '50%',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold'
        };
        
        // Tamaños responsivos
        let buttonSize, fontSize;
        if (dimensions.isMobile) {
            buttonSize = '50px';
            fontSize = '20px';
        } else if (dimensions.isTablet) {
            buttonSize = '60px';
            fontSize = '24px';
        } else {
            buttonSize = '70px';
            fontSize = '28px';
        }
        
        // Aplicar estilos a ambos botones
        Object.assign(prevBtn.style, baseButtonStyle);
        Object.assign(nextBtn.style, baseButtonStyle);
        
        prevBtn.style.width = buttonSize;
        prevBtn.style.height = buttonSize;
        prevBtn.style.fontSize = fontSize;
        prevBtn.style.left = '20px';
        prevBtn.innerHTML = '‹';
        
        nextBtn.style.width = buttonSize;
        nextBtn.style.height = buttonSize;
        nextBtn.style.fontSize = fontSize;
        nextBtn.style.right = '20px';
        nextBtn.innerHTML = '›';
        
        // Efectos hover solo en desktop no táctil
        if (!isTouchDevice()) {
            [prevBtn, nextBtn].forEach(btn => {
                btn.addEventListener('mouseenter', () => {
                    btn.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
                    btn.style.transform = 'translateY(-50%) scale(1.1)';
                });
                
                btn.addEventListener('mouseleave', () => {
                    btn.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                    btn.style.transform = 'translateY(-50%) scale(1)';
                });
            });
        }
        
        // Asegurar posicionamiento del contenedor
        container.style.position = 'relative';
        
        console.log('Slider: Botones posicionados');
    }

    // FUNCIÓN COMPLETAMENTE REDISEÑADA: Crear paginación
    function createAndPositionPagination() {
        const pagination = document.getElementById('slider-pagination');
        if (!pagination) return;
        
        const dimensions = calculateResponsiveDimensions();
        
        // Limpiar paginación
        pagination.innerHTML = '';
        
        // Posicionar paginación
        pagination.style.position = 'absolute';
        pagination.style.bottom = dimensions.isMobile ? '20px' : '30px';
        pagination.style.left = '50%';
        pagination.style.transform = 'translateX(-50%)';
        pagination.style.display = 'flex';
        pagination.style.gap = '8px';
        pagination.style.zIndex = '999';
        pagination.style.justifyContent = 'center';
        pagination.style.alignItems = 'center';
        
        // Crear dots
        for (let i = 0; i < totalSlides; i++) {
            const dot = document.createElement('button');
            dot.className = 'slider-pagination-dot';
            dot.dataset.slide = i;
            
            const dotSize = dimensions.isMobile ? '10px' : '12px';
            dot.style.width = dotSize;
            dot.style.height = dotSize;
            dot.style.borderRadius = '50%';
            dot.style.border = 'none';
            dot.style.backgroundColor = i === currentIndex ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.4)';
            dot.style.cursor = 'pointer';
            dot.style.transition = 'all 0.3s ease';
            dot.style.padding = '0';
            dot.style.margin = '0';
            
            // Evento click en dot
            dot.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isTransitioning && !isDragging) {
                    goToSlide(i);
                }
            });
            
            pagination.appendChild(dot);
        }
        
        console.log('Slider: Paginación creada');
    }

    // Actualizar variables CSS
    function updateSliderCSSVariables() {
        if (isDestroyed) return;
        
        const dimensions = calculateResponsiveDimensions();
        const root = document.documentElement;
        
        root.style.setProperty('--slider-slide-width', `${dimensions.slideWidth}px`);
        root.style.setProperty('--slider-slide-height', `${dimensions.slideHeight}px`);
        root.style.setProperty('--slider-slide-gap', `${dimensions.slideGap}px`);
        root.style.setProperty('--slider-side-space', `${dimensions.sideSpace}px`);
        
        // Prevenir scroll horizontal
        document.body.style.overflowX = 'hidden';
        
        console.log('Slider: Variables CSS actualizadas');
    }

    // FUNCIÓN COMPLETAMENTE REDISEÑADA: Actualizar posición
    function updateSliderPosition(animate = true) {
        if (isDestroyed) return;
        
        const wrapper = document.getElementById('slider-wrapper');
        if (!wrapper) return;
        
        const dimensions = calculateResponsiveDimensions();
        const slideDistance = dimensions.slideWidth + dimensions.slideGap;
        const translateX = -(slideDistance * currentIndex);
        
        if (animate) {
            wrapper.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            isTransitioning = true;
            setTimeout(() => {
                isTransitioning = false;
            }, 500);
        } else {
            wrapper.style.transition = 'none';
        }
        
        wrapper.style.transform = `translateX(${translateX}px)`;
        
        console.log('Slider: Posición actualizada a slide', currentIndex);
    }

    // Cargar datos del slider
    async function loadSliderData() {
        try {
            console.log('Slider: Cargando datos...');
            const response = await fetch(DATA_URL);
            if (!response.ok) throw new Error('No se pudo cargar data.json');
            const data = await response.json();
            
            const movies = data
                .filter(item => item && typeof item === 'object' && item['Categoría'] === 'Películas' && typeof item['Slider'] === 'string' && item['Slider'].trim() !== '')
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
                    subtitlesCount: item['Subtítulos'] ? item['Subtítulos'].split(',').length : 0,
                    sliderUrl: item['Slider'] || ''
                }));

            console.log('Slider: Datos cargados:', movies.length, 'películas');
            return movies;
        } catch (error) {
            console.error('Slider: Error cargando datos:', error);
            return [];
        }
    }

    // FUNCIÓN COMPLETAMENTE REDISEÑADA: Renderizar slider
    function renderSlider(moviesData = []) {
        if (isDestroyed) return;
        
        console.log('Slider: Iniciando renderizado...');
        
        const sliderWrapper = document.getElementById('slider-wrapper');
        if (!sliderWrapper) {
            console.error('Slider: slider-wrapper no encontrado');
            return;
        }

        const movies = moviesData.length > 0 ? moviesData : slidesData;
        const selectedMovies = movies
            .sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0))
            .slice(0, 8);
        
        slidesData = selectedMovies;
        totalSlides = slidesData.length;
        
        if (totalSlides === 0) {
            console.error('Slider: No hay slides para renderizar');
            return;
        }

        const dimensions = calculateResponsiveDimensions();
        lastViewportWidth = window.innerWidth;
        
        // Actualizar variables CSS
        updateSliderCSSVariables();
        
        // Configurar contenedor padre
        const sliderContainer = sliderWrapper.parentElement;
        if (sliderContainer) {
            sliderContainer.style.width = '100%';
            sliderContainer.style.height = `${dimensions.slideHeight + 80}px`; // Altura fija + espacio para paginación
            sliderContainer.style.overflow = 'hidden';
            sliderContainer.style.position = 'relative';
            sliderContainer.style.display = 'flex';
            sliderContainer.style.alignItems = 'center';
            sliderContainer.style.justifyContent = 'center';
        }
        
        // CONFIGURACIÓN CRÍTICA DEL WRAPPER
        sliderWrapper.innerHTML = '';
        sliderWrapper.style.display = 'flex';
        sliderWrapper.style.flexDirection = 'row';
        sliderWrapper.style.alignItems = 'center';
        sliderWrapper.style.justifyContent = 'flex-start';
        sliderWrapper.style.position = 'relative';
        sliderWrapper.style.width = `${(dimensions.slideWidth + dimensions.slideGap) * totalSlides}px`;
        sliderWrapper.style.height = `${dimensions.slideHeight}px`;
        sliderWrapper.style.left = '50%';
        sliderWrapper.style.marginLeft = `-${dimensions.slideWidth / 2}px`; // Centrar el primer slide
        sliderWrapper.style.transform = 'translateX(0px)';
        sliderWrapper.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        sliderWrapper.style.willChange = 'transform';
        
        // Crear slides
        slidesData.forEach((movie, index) => {
            const slideDiv = document.createElement('div');
            slideDiv.className = 'slider-slide';
            slideDiv.dataset.index = index;
            
            // ESTILOS CRÍTICOS DEL SLIDE
            slideDiv.style.width = `${dimensions.slideWidth}px`;
            slideDiv.style.height = `${dimensions.slideHeight}px`;
            slideDiv.style.flexShrink = '0';
            slideDiv.style.marginRight = `${dimensions.slideGap}px`;
            slideDiv.style.position = 'relative';
            slideDiv.style.borderRadius = '15px';
            slideDiv.style.overflow = 'hidden';
            slideDiv.style.cursor = 'pointer';
            slideDiv.style.boxShadow = '0 8px 25px rgba(0,0,0,0.4)';
            slideDiv.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
            slideDiv.style.backgroundColor = '#333';
            
            // REMOVER TODOS LOS EFECTOS HOVER EN DISPOSITIVOS TÁCTILES
            const isTouch = isTouchDevice();
            
            const imageUrl = movie.sliderUrl || `https://via.placeholder.com/${dimensions.slideWidth}x${dimensions.slideHeight}/333/fff?text=${encodeURIComponent(movie.title)}`;
            const mainGenre = movie.genre ? movie.genre.split(/[·,]/)[0].trim() : '';
            
            slideDiv.innerHTML = `
                <div class="slider-img-wrapper" style="width: 100%; height: 100%; overflow: hidden; border-radius: 15px;">
                    <img src="${imageUrl}" 
                         alt="${movie.title}" 
                         loading="${index === 0 ? 'eager' : 'lazy'}"
                         style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;"
                         onerror="this.src='https://via.placeholder.com/${dimensions.slideWidth}x${dimensions.slideHeight}/333/fff?text=No+Image'">
                </div>
                <div class="slider-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.8)); padding: ${dimensions.isMobile ? '15px' : '20px'}; color: white;">
                    <div class="slider-title-movie" style="font-size: ${dimensions.isMobile ? '1.1rem' : '1.4rem'}; font-weight: bold; margin-bottom: 8px; line-height: 1.2;">${movie.title || 'Sin título'}</div>
                    <div class="slider-meta" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; font-size: ${dimensions.isMobile ? '0.8rem' : '0.9rem'}; opacity: 0.9;">
                        ${movie.year ? `<span>${movie.year}</span>` : ''}
                        ${movie.duration ? `<span>${movie.duration}</span>` : ''}
                        ${mainGenre ? `<span>${mainGenre}</span>` : ''}
                        ${movie.rating ? `<span><i class="fas fa-star" style="color: #ffd700; margin-right: 2px;"></i>${movie.rating}</span>` : ''}
                    </div>
                    <div class="slider-description" style="font-size: ${dimensions.isMobile ? '0.75rem' : '0.85rem'}; line-height: 1.3; opacity: 0.85; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${movie.description || movie.synopsis || 'Sin descripción disponible'}</div>
                </div>
            `;

            // SOLO efectos hover en desktop NO táctil
            if (!isTouch) {
                slideDiv.addEventListener('mouseenter', () => {
                    if (!isTransitioning && !isDragging) {
                        slideDiv.style.transform = 'scale(1.05)';
                        slideDiv.style.boxShadow = '0 12px 35px rgba(0,0,0,0.5)';
                    }
                });

                slideDiv.addEventListener('mouseleave', () => {
                    if (!isTransitioning && !isDragging) {
                        slideDiv.style.transform = 'scale(1)';
                        slideDiv.style.boxShadow = '0 8px 25px rgba(0,0,0,0.4)';
                    }
                });
            }

            // EVENTO CLICK CORREGIDO
            slideDiv.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('Slider: Click en slide', movie.title);
                
                if (!isTransitioning && !isDragging) {
                    // Intentar abrir modal
                    if (typeof window.openDetailsModal === 'function') {
                        console.log('Slider: Abriendo modal con openDetailsModal');
                        window.openDetailsModal(movie);
                    } else if (typeof openDetailsModal === 'function') {
                        console.log('Slider: Abriendo modal con openDetailsModal global');
                        openDetailsModal(movie);
                    } else {
                        console.log('Slider: openDetailsModal no encontrado, datos de la película:', movie);
                        // Fallback: disparar evento personalizado
                        const event = new CustomEvent('slideClick', { detail: movie });
                        document.dispatchEvent(event);
                    }
                }
            });

            // Prevenir selección de texto
            slideDiv.style.userSelect = 'none';
            slideDiv.style.webkitUserSelect = 'none';
            slideDiv.style.webkitTapHighlightColor = 'transparent';

            sliderWrapper.appendChild(slideDiv);
        });

        // Configurar eventos
        setupTouchEvents();
        positionNavigationButtons();
        createAndPositionPagination();
        
        // Posición inicial
        currentIndex = 0;
        updateSliderPosition(false);
        
        console.log('Slider: Renderizado completado', {
            totalSlides,
            dimensions,
            wrapperWidth: sliderWrapper.style.width
        });
    }

    // Ir a slide específico
    function goToSlide(index) {
        if (isTransitioning || isDragging || totalSlides === 0) return;
        
        // Límites con bucle
        if (index >= totalSlides) {
            currentIndex = 0;
        } else if (index < 0) {
            currentIndex = totalSlides - 1;
        } else {
            currentIndex = index;
        }
        
        updateSliderPosition(true);
        updatePagination();
        
        console.log('Slider: Navegando a slide', currentIndex);
    }

    // Actualizar paginación
    function updatePagination() {
        const dots = document.querySelectorAll('.slider-pagination-dot');
        dots.forEach((dot, index) => {
            if (index === currentIndex) {
                dot.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                dot.style.transform = 'scale(1.2)';
            } else {
                dot.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
                dot.style.transform = 'scale(1)';
            }
        });
    }

    // Manejar resize
    function handleResize() {
        if (isDestroyed) return;
        
        const currentViewportWidth = window.innerWidth;
        if (Math.abs(currentViewportWidth - lastViewportWidth) < 50) return;
        
        clearTimeout(resizeTimeout);
        
        resizeTimeout = setTimeout(() => {
            console.log('Slider: Redimensionando...');
            renderSlider(slidesData);
        }, 200);
        
        lastViewportWidth = currentViewportWidth;
    }

    // Configurar eventos de navegación
    function setupNavigationEvents() {
        const prevBtn = document.getElementById('slider-prev');
        const nextBtn = document.getElementById('slider-next');
        
        if (prevBtn) {
            // Limpiar eventos previos
            prevBtn.replaceWith(prevBtn.cloneNode(true));
            const newPrevBtn = document.getElementById('slider-prev');
            
            newPrevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Slider: Click botón anterior');
                if (!isTransitioning && !isDragging) {
                    goToSlide(currentIndex - 1);
                }
            });
        }
        
        if (nextBtn) {
            // Limpiar eventos previos
            nextBtn.replaceWith(nextBtn.cloneNode(true));
            const newNextBtn = document.getElementById('slider-next');
            
            newNextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Slider: Click botón siguiente');
                if (!isTransitioning && !isDragging) {
                    goToSlide(currentIndex + 1);
                }
            });
        }
        
        console.log('Slider: Eventos de navegación configurados');
    }

    // Inicializar autoplay
    function setupAutoplay(interval = 6000) {
        if (typeof window.SLIDER_AUTOPLAY !== 'undefined' && !window.SLIDER_AUTOPLAY) {
            return;
        }
        
        let autoplayTimer;
        
        function startAutoplay() {
            if (totalSlides <= 1) return;
            
            autoplayTimer = setInterval(() => {
                if (!isDragging && !isTransitioning) {
                    goToSlide(currentIndex + 1);
                }
            }, interval);
        }
        
        function stopAutoplay() {
            clearInterval(autoplayTimer);
        }
        
        // Pausar en hover solo en desktop
        if (!isTouchDevice()) {
            const container = document.getElementById('slider-wrapper')?.parentElement;
            if (container) {
                container.addEventListener('mouseenter', stopAutoplay);
                container.addEventListener('mouseleave', startAutoplay);
            }
        }
        
        // Pausar cuando no está visible
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                stopAutoplay();
            } else {
                startAutoplay();
            }
        });
        
        startAutoplay();
        console.log('Slider: Autoplay configurado');
    }

    // Inicialización principal
    async function initSlider() {
        if (isDestroyed) return;
        
        console.log('Slider: Iniciando inicialización...');
        
        try {
            // Cargar datos
            const moviesData = await loadSliderData();
            
            if (moviesData.length === 0) {
                console.warn('Slider: No hay datos para mostrar');
                return;
            }
            
            // Renderizar slider
            renderSlider(moviesData);
            
            // Configurar eventos después del renderizado
            setTimeout(() => {
                setupNavigationEvents();
                positionNavigationButtons(); // Re-posicionar después de setup
            }, 100);
            
            // Configurar resize
            window.addEventListener('resize', handleResize);
            
            // Configurar autoplay
            setupAutoplay();
            
            console.log('Slider: Inicialización completada exitosamente');
            
        } catch (error) {
            console.error('Slider: Error durante la inicialización:', error);
        }
    }

    // Destruir slider
    function destroySlider() {
        isDestroyed = true;
        
        clearTimeout(resizeTimeout);
        window.removeEventListener('resize', handleResize);
        
        const wrapper = document.getElementById('slider-wrapper');
        if (wrapper) {
            wrapper.innerHTML = '';
            wrapper.removeAttribute('style');
        }
        
        console.log('Slider: Destruido');
    }

    // Función para reinicializar el slider
    function reinitializeSlider() {
        if (isDestroyed) return;
        
        destroySlider();
        isDestroyed = false;
        
        setTimeout(() => {
            initSlider();
        }, 100);
    }

    // Exponer funciones globales
    window.sliderAPI = {
        init: initSlider,
        destroy: destroySlider,
        reinitialize: reinitializeSlider,
        goToSlide: goToSlide,
        next: () => goToSlide(currentIndex + 1),
        prev: () => goToSlide(currentIndex - 1),
        getCurrentIndex: () => currentIndex,
        getTotalSlides: () => totalSlides,
        isReady: () => !isDestroyed && totalSlides > 0
    };

    // Auto-inicialización cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSlider);
    } else {
        // DOM ya está listo, inicializar inmediatamente
        setTimeout(initSlider, 100);
    }

    console.log('Slider: Script cargado y listo');

})();