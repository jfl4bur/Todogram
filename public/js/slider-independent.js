// Slider Independiente - VERSIÓN FINAL CORREGIDA
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

    // FUNCIÓN CORREGIDA: Calcular dimensiones responsivas
    function calculateResponsiveDimensions() {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const isMobile = viewportWidth <= 768;
        const isTablet = viewportWidth > 768 && viewportWidth <= 1024;
        
        let slideWidth, slideHeight, slideGap, containerPadding;
        
        if (isMobile) {
            // MÓVIL: Slide principal + peek lateral
            slideWidth = Math.round(viewportWidth * 0.75); // 75% del viewport
            slideHeight = Math.round(slideWidth * 0.6); // Ratio más cuadrado para móvil
            slideGap = 15;
            containerPadding = Math.round(viewportWidth * 0.08); // 8% padding lateral
        } else if (isTablet) {
            // TABLET: Similar pero más grande
            slideWidth = Math.round(viewportWidth * 0.65);
            slideHeight = Math.round(slideWidth * 0.55);
            slideGap = 20;
            containerPadding = Math.round(viewportWidth * 0.1);
        } else {
            // DESKTOP: Como imagen 1 - slide principal grande + peek lateral
            slideWidth = Math.min(Math.round(viewportWidth * 0.6), 800); // Máximo 800px
            slideHeight = Math.round(slideWidth * 0.4); // Ratio panorámico
            slideGap = 25;
            containerPadding = Math.round(viewportWidth * 0.15); // 15% padding lateral
        }
        
        console.log('Slider: Dimensiones calculadas', {
            viewportWidth,
            slideWidth,
            slideHeight,
            slideGap,
            containerPadding,
            isMobile,
            isTablet
        });
        
        return { slideWidth, slideHeight, slideGap, containerPadding, isMobile, isTablet };
    }

    // Detectar dispositivos móviles y táctiles
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }

    function isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    // FUNCIÓN CORREGIDA: Configurar eventos touch/swipe
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

    // FUNCIÓN COMPLETAMENTE CORREGIDA: Posicionar botones
    function positionNavigationButtons() {
        const prevBtn = document.getElementById('slider-prev');
        const nextBtn = document.getElementById('slider-next');
        const container = document.getElementById('slider-wrapper')?.parentElement;
        
        if (!prevBtn || !nextBtn || !container) return;
        
        const dimensions = calculateResponsiveDimensions();
        
        // CORREGIR: Asegurar posicionamiento del contenedor
        container.style.position = 'relative';
        
        // Estilos base para ambos botones
        const baseButtonStyle = {
            position: 'absolute',
            top: '0',
            bottom: '0',
            zIndex: '1000',
            border: 'none',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold',
            width: dimensions.isMobile ? '60px' : '80px'
        };
        
        // Aplicar estilos a ambos botones
        Object.assign(prevBtn.style, baseButtonStyle);
        Object.assign(nextBtn.style, baseButtonStyle);
        
        // Posicionamiento específico
        prevBtn.style.left = '0';
        prevBtn.style.fontSize = dimensions.isMobile ? '24px' : '32px';
        prevBtn.innerHTML = '‹';
        
        nextBtn.style.right = '0';
        nextBtn.style.fontSize = dimensions.isMobile ? '24px' : '32px';
        nextBtn.innerHTML = '›';
        
        // SOLO efectos hover en desktop NO táctil
        if (!isTouchDevice()) {
            [prevBtn, nextBtn].forEach(btn => {
                btn.addEventListener('mouseenter', () => {
                    btn.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
                });
                
                btn.addEventListener('mouseleave', () => {
                    btn.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                });
            });
        }
        
        console.log('Slider: Botones posicionados correctamente');
    }

    // FUNCIÓN CORREGIDA: Crear paginación
    function createAndPositionPagination() {
        const pagination = document.getElementById('slider-pagination');
        if (!pagination) return;
        
        const dimensions = calculateResponsiveDimensions();
        
        // Limpiar paginación
        pagination.innerHTML = '';
        
        // CORREGIR: Posicionamiento de paginación
        pagination.style.position = 'absolute';
        pagination.style.bottom = dimensions.isMobile ? '15px' : '25px';
        pagination.style.left = '50%';
        pagination.style.transform = 'translateX(-50%)';
        pagination.style.display = 'flex';
        pagination.style.gap = '6px';
        pagination.style.zIndex = '999';
        pagination.style.justifyContent = 'center';
        pagination.style.alignItems = 'center';
        
        // Crear dots
        for (let i = 0; i < totalSlides; i++) {
            const dot = document.createElement('button');
            dot.className = 'slider-pagination-dot';
            dot.dataset.slide = i;
            
            const dotSize = dimensions.isMobile ? '8px' : '10px';
            dot.style.width = dotSize;
            dot.style.height = dotSize;
            dot.style.borderRadius = '50%';
            dot.style.border = 'none';
            dot.style.backgroundColor = i === currentIndex ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.5)';
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
        
        console.log('Slider: Paginación creada y posicionada');
    }

    // FUNCIÓN CORREGIDA: Actualizar variables CSS
    function updateSliderCSSVariables() {
        if (isDestroyed) return;
        
        const dimensions = calculateResponsiveDimensions();
        const root = document.documentElement;
        
        root.style.setProperty('--slider-slide-width', `${dimensions.slideWidth}px`);
        root.style.setProperty('--slider-slide-height', `${dimensions.slideHeight}px`);
        root.style.setProperty('--slider-slide-gap', `${dimensions.slideGap}px`);
        root.style.setProperty('--slider-container-padding', `${dimensions.containerPadding}px`);
        
        // Prevenir scroll horizontal
        document.body.style.overflowX = 'hidden';
        
        console.log('Slider: Variables CSS actualizadas');
    }

    // FUNCIÓN COMPLETAMENTE CORREGIDA: Actualizar posición
    function updateSliderPosition(animate = true) {
        if (isDestroyed) return;
        
        const wrapper = document.getElementById('slider-wrapper');
        if (!wrapper) return;
        
        const dimensions = calculateResponsiveDimensions();
        const slideDistance = dimensions.slideWidth + dimensions.slideGap;
        
        // CORREGIR: Centrar el slide activo
        const containerWidth = wrapper.parentElement.offsetWidth;
        const centerOffset = (containerWidth - dimensions.slideWidth) / 2;
        const translateX = centerOffset - (slideDistance * currentIndex);
        
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

    // FUNCIÓN COMPLETAMENTE CORREGIDA: Renderizar slider
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
        
        // CORREGIR: Configurar contenedor padre
        const sliderContainer = sliderWrapper.parentElement;
        if (sliderContainer) {
            sliderContainer.style.width = '100%';
            sliderContainer.style.height = `${dimensions.slideHeight + 60}px`; // Altura del slide + espacio para paginación
            sliderContainer.style.overflow = 'hidden';
            sliderContainer.style.position = 'relative';
            sliderContainer.style.display = 'flex';
            sliderContainer.style.alignItems = 'center';
            sliderContainer.style.justifyContent = 'center';
            sliderContainer.style.padding = `0 ${dimensions.containerPadding}px`;
        }
        
        // CORREGIR: Configuración del wrapper
        sliderWrapper.innerHTML = '';
        sliderWrapper.style.display = 'flex';
        sliderWrapper.style.flexDirection = 'row';
        sliderWrapper.style.alignItems = 'center';
        sliderWrapper.style.justifyContent = 'flex-start';
        sliderWrapper.style.position = 'relative';
        sliderWrapper.style.width = `${(dimensions.slideWidth + dimensions.slideGap) * totalSlides}px`;
        sliderWrapper.style.height = `${dimensions.slideHeight}px`;
        sliderWrapper.style.transform = 'translateX(0px)';
        sliderWrapper.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        sliderWrapper.style.willChange = 'transform';
        
        // Crear slides
        slidesData.forEach((movie, index) => {
            const slideDiv = document.createElement('div');
            slideDiv.className = 'slider-slide';
            slideDiv.dataset.index = index;
            
            // CORREGIR: Estilos del slide
            slideDiv.style.width = `${dimensions.slideWidth}px`;
            slideDiv.style.height = `${dimensions.slideHeight}px`;
            slideDiv.style.flexShrink = '0';
            slideDiv.style.marginRight = `${dimensions.slideGap}px`;
            slideDiv.style.position = 'relative';
            slideDiv.style.borderRadius = '12px';
            slideDiv.style.overflow = 'hidden';
            slideDiv.style.cursor = 'pointer';
            slideDiv.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
            slideDiv.style.backgroundColor = '#333';
            slideDiv.style.userSelect = 'none';
            slideDiv.style.webkitUserSelect = 'none';
            slideDiv.style.webkitTapHighlightColor = 'transparent';
            
            // ELIMINAR COMPLETAMENTE hover en dispositivos táctiles
            const isTouch = isTouchDevice();
            if (!isTouch) {
                slideDiv.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
            }
            
            const imageUrl = movie.sliderUrl || `https://via.placeholder.com/${dimensions.slideWidth}x${dimensions.slideHeight}/333/fff?text=${encodeURIComponent(movie.title)}`;
            const mainGenre = movie.genre ? movie.genre.split(/[·,]/)[0].trim() : '';
            
            slideDiv.innerHTML = `
                <div class="slider-img-wrapper" style="width: 100%; height: 100%; overflow: hidden; border-radius: 12px;">
                    <img src="${imageUrl}" 
                         alt="${movie.title}" 
                         loading="${index === 0 ? 'eager' : 'lazy'}"
                         style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;"
                         onerror="this.src='https://via.placeholder.com/${dimensions.slideWidth}x${dimensions.slideHeight}/333/fff?text=No+Image'">
                </div>
                <div class="slider-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.85)); padding: ${dimensions.isMobile ? '12px' : '16px'}; color: white;">
                    <div class="slider-title-movie" style="font-size: ${dimensions.isMobile ? '1rem' : '1.2rem'}; font-weight: bold; margin-bottom: 6px; line-height: 1.2;">${movie.title || 'Sin título'}</div>
                    <div class="slider-meta" style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; font-size: ${dimensions.isMobile ? '0.75rem' : '0.8rem'}; opacity: 0.9;">
                        ${movie.year ? `<span>${movie.year}</span>` : ''}
                        ${movie.duration ? `<span>${movie.duration}</span>` : ''}
                        ${mainGenre ? `<span>${mainGenre}</span>` : ''}
                        ${movie.rating ? `<span><i class="fas fa-star" style="color: #ffd700; margin-right: 2px;"></i>${movie.rating}</span>` : ''}
                    </div>
                    <div class="slider-description" style="font-size: ${dimensions.isMobile ? '0.7rem' : '0.75rem'}; line-height: 1.3; opacity: 0.85; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${movie.description || movie.synopsis || 'Sin descripción disponible'}</div>
                </div>
            `;

            // SOLO efectos hover en desktop NO táctil
            if (!isTouch) {
                slideDiv.addEventListener('mouseenter', () => {
                    if (!isTransitioning && !isDragging) {
                        slideDiv.style.transform = 'scale(1.03)';
                        slideDiv.style.boxShadow = '0 8px 30px rgba(0,0,0,0.4)';
                    }
                });

                slideDiv.addEventListener('mouseleave', () => {
                    if (!isTransitioning && !isDragging) {
                        slideDiv.style.transform = 'scale(1)';
                        slideDiv.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
                    }
                });
            }

            // CORREGIR: Evento click
            slideDiv.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('Slider: Click en slide', movie.title);
                
                if (!isTransitioning && !isDragging) {
                    // Buscar función de modal en diferentes contextos
                    if (typeof window.openDetailsModal === 'function') {
                        console.log('Slider: Abriendo modal con window.openDetailsModal');
                        window.openDetailsModal(movie);
                    } else if (typeof openDetailsModal === 'function') {
                        console.log('Slider: Abriendo modal con openDetailsModal global');
                        openDetailsModal(movie);
                    } else if (window.parent && typeof window.parent.openDetailsModal === 'function') {
                        console.log('Slider: Abriendo modal con parent.openDetailsModal');
                        window.parent.openDetailsModal(movie);
                    } else {
                        console.log('Slider: openDetailsModal no encontrado, disparando evento personalizado');
                        // Disparar múltiples eventos para máxima compatibilidad
                        const events = [
                            new CustomEvent('slideClick', { detail: movie, bubbles: true }),
                            new CustomEvent('openModal', { detail: movie, bubbles: true }),
                            new CustomEvent('movieClick', { detail: movie, bubbles: true })
                        ];
                        
                        events.forEach(event => {
                            document.dispatchEvent(event);
                            window.dispatchEvent(event);
                            if (window.parent !== window) {
                                window.parent.document.dispatchEvent(event);
                            }
                        });
                        
                        // Log para debugging
                        console.log('Slider: Eventos disparados, datos de la película:', movie);
                    }
                }
            });

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
                dot.style.backgroundColor = 'rgba(255, 255, 255, 1)';
                dot.style.transform = 'scale(1.2)';
            } else {
                dot.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
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
        
        // Pausar en hover solo en desktop NO táctil
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
                positionNavigationButtons();
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
        
        console.log('Slider: Destruido completamente');
    }

    // FUNCIÓN COMPLETAMENTE CORREGIDA: Dimensiones responsivas
    function calculateResponsiveDimensions() {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const isMobile = viewportWidth <= 768;
        const isTablet = viewportWidth > 768 && viewportWidth <= 1024;
        
        let slideWidth, slideHeight, slideGap, containerPadding;
        
        if (isMobile) {
            // MÓVIL: 85% del viewport para mostrar peek lateral
            slideWidth = Math.round(viewportWidth * 0.85);
            slideHeight = Math.round(slideWidth * 0.6);
            slideGap = 12;
            containerPadding = Math.round(viewportWidth * 0.05); // Menor padding
        } else if (isTablet) {
            // TABLET: 70% del viewport
            slideWidth = Math.round(viewportWidth * 0.7);
            slideHeight = Math.round(slideWidth * 0.55);
            slideGap = 15;
            containerPadding = Math.round(viewportWidth * 0.08);
        } else {
            // DESKTOP: Como imagen 1 - slide grande centrado con peek lateral
            slideWidth = Math.min(Math.round(viewportWidth * 0.75), 900); // Más grande
            slideHeight = Math.round(slideWidth * 0.42);
            slideGap = 20;
            containerPadding = Math.round(viewportWidth * 0.08); // Menos padding
        }
        
        return { slideWidth, slideHeight, slideGap, containerPadding, isMobile, isTablet };
    }

    // FUNCIÓN COMPLETAMENTE CORREGIDA: Posicionar botones
    function positionNavigationButtons() {
        const prevBtn = document.getElementById('slider-prev');
        const nextBtn = document.getElementById('slider-next');
        const container = document.getElementById('slider-wrapper')?.parentElement;
        
        if (!prevBtn || !nextBtn || !container) return;
        
        const dimensions = calculateResponsiveDimensions();
        
        // Posicionamiento del contenedor padre
        container.style.position = 'relative';
        
        // Calcular altura exacta del slide
        const slideHeight = dimensions.slideHeight;
        
        // Estilos base CORREGIDOS
        const baseButtonStyle = {
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: '1001',
            border: 'none',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold',
            borderRadius: '0',
            outline: 'none',
            userSelect: 'none',
            webkitUserSelect: 'none',
            webkitTapHighlightColor: 'transparent',
            width: dimensions.isMobile ? '50px' : '70px',
            height: `${slideHeight}px` // ALTURA EXACTA DEL SLIDE
        };
        
        // Aplicar estilos
        Object.assign(prevBtn.style, baseButtonStyle);
        Object.assign(nextBtn.style, baseButtonStyle);
        
        // Posicionamiento específico
        prevBtn.style.left = `${dimensions.containerPadding}px`;
        prevBtn.style.fontSize = dimensions.isMobile ? '22px' : '28px';
        prevBtn.innerHTML = '‹';
        
        nextBtn.style.right = `${dimensions.containerPadding}px`;
        nextBtn.style.fontSize = dimensions.isMobile ? '22px' : '28px';
        nextBtn.innerHTML = '›';
        
        // ELIMINAR completamente hover en táctiles
        if (!isTouchDevice()) {
            prevBtn.style.transition = 'background-color 0.3s ease';
            nextBtn.style.transition = 'background-color 0.3s ease';
            
            prevBtn.onmouseenter = () => prevBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
            prevBtn.onmouseleave = () => prevBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            nextBtn.onmouseenter = () => nextBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
            nextBtn.onmouseleave = () => nextBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        }
        
        console.log('Slider: Botones reposicionados con altura completa');
    }

    // FUNCIÓN COMPLETAMENTE CORREGIDA: Paginación
    function createAndPositionPagination() {
        const pagination = document.getElementById('slider-pagination');
        if (!pagination) return;
        
        const dimensions = calculateResponsiveDimensions();
        
        pagination.innerHTML = '';
        
        // Posicionamiento CORREGIDO
        pagination.style.position = 'absolute';
        pagination.style.bottom = dimensions.isMobile ? '10px' : '15px'; // Más cerca del slide
        pagination.style.left = '50%';
        pagination.style.transform = 'translateX(-50%)';
        pagination.style.display = 'flex';
        pagination.style.gap = dimensions.isMobile ? '8px' : '10px';
        pagination.style.zIndex = '999';
        pagination.style.justifyContent = 'center';
        pagination.style.alignItems = 'center';
        pagination.style.pointerEvents = 'auto';
        
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
            dot.style.backgroundColor = i === currentIndex ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.6)';
            dot.style.cursor = 'pointer';
            dot.style.transition = 'all 0.3s ease';
            dot.style.padding = '0';
            dot.style.margin = '0';
            dot.style.outline = 'none';
            dot.style.userSelect = 'none';
            dot.style.webkitUserSelect = 'none';
            dot.style.webkitTapHighlightColor = 'transparent';
            
            // CLICK sin preventDefault
            dot.onclick = (e) => {
                e.stopPropagation();
                if (!isTransitioning && !isDragging) {
                    goToSlide(i);
                }
            };
            
            pagination.appendChild(dot);
        }
        
        console.log('Slider: Paginación reposicionada');
    }

    // FUNCIÓN COMPLETAMENTE CORREGIDA: Renderizar slider
    function renderSlider(moviesData = []) {
        if (isDestroyed) return;
        
        const sliderWrapper = document.getElementById('slider-wrapper');
        if (!sliderWrapper) return;

        const movies = moviesData.length > 0 ? moviesData : slidesData;
        const selectedMovies = movies
            .sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0))
            .slice(0, 8);
        
        slidesData = selectedMovies;
        totalSlides = slidesData.length;
        
        if (totalSlides === 0) return;

        const dimensions = calculateResponsiveDimensions();
        lastViewportWidth = window.innerWidth;
        
        updateSliderCSSVariables();
        
        // CONFIGURACIÓN CORREGIDA del contenedor padre
        const sliderContainer = sliderWrapper.parentElement;
        if (sliderContainer) {
            sliderContainer.style.width = '100%';
            sliderContainer.style.height = `${dimensions.slideHeight + 40}px`; // Altura exacta
            sliderContainer.style.overflow = 'hidden';
            sliderContainer.style.position = 'relative';
            sliderContainer.style.display = 'flex';
            sliderContainer.style.alignItems = 'center';
            sliderContainer.style.justifyContent = 'center';
            sliderContainer.style.padding = '0';
            sliderContainer.style.margin = '0 auto';
        }
        
        // CONFIGURACIÓN CORREGIDA del wrapper
        sliderWrapper.innerHTML = '';
        sliderWrapper.style.display = 'flex';
        sliderWrapper.style.flexDirection = 'row';
        sliderWrapper.style.alignItems = 'center';
        sliderWrapper.style.position = 'relative';
        sliderWrapper.style.width = `${(dimensions.slideWidth + dimensions.slideGap) * totalSlides}px`;
        sliderWrapper.style.height = `${dimensions.slideHeight}px`;
        sliderWrapper.style.transform = 'translateX(0px)';
        sliderWrapper.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        sliderWrapper.style.willChange = 'transform';
        
        // Crear slides
        slidesData.forEach((movie, index) => {
            const slideDiv = document.createElement('div');
            slideDiv.className = 'slider-slide';
            slideDiv.dataset.index = index;
            
            // Estilos CORREGIDOS del slide
            slideDiv.style.width = `${dimensions.slideWidth}px`;
            slideDiv.style.height = `${dimensions.slideHeight}px`;
            slideDiv.style.flexShrink = '0';
            slideDiv.style.marginRight = `${dimensions.slideGap}px`;
            slideDiv.style.position = 'relative';
            slideDiv.style.borderRadius = '12px';
            slideDiv.style.overflow = 'hidden';
            slideDiv.style.cursor = 'pointer';
            slideDiv.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
            slideDiv.style.backgroundColor = '#333';
            slideDiv.style.userSelect = 'none';
            slideDiv.style.webkitUserSelect = 'none';
            slideDiv.style.webkitTapHighlightColor = 'transparent';
            
            // ELIMINAR completamente hover en táctiles
            const isTouch = isTouchDevice();
            if (!isTouch) {
                slideDiv.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
            }
            
            const imageUrl = movie.sliderUrl || `https://via.placeholder.com/${dimensions.slideWidth}x${dimensions.slideHeight}/333/fff?text=${encodeURIComponent(movie.title)}`;
            const mainGenre = movie.genre ? movie.genre.split(/[·,]/)[0].trim() : '';
            
            slideDiv.innerHTML = `
                <div class="slider-img-wrapper" style="width: 100%; height: 100%; overflow: hidden; border-radius: 12px;">
                    <img src="${imageUrl}" 
                         alt="${movie.title}" 
                         loading="${index === 0 ? 'eager' : 'lazy'}"
                         style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;"
                         onerror="this.src='https://via.placeholder.com/${dimensions.slideWidth}x${dimensions.slideHeight}/333/fff?text=No+Image'">
                </div>
                <div class="slider-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.85)); padding: ${dimensions.isMobile ? '12px' : '16px'}; color: white;">
                    <div class="slider-title-movie" style="font-size: ${dimensions.isMobile ? '1rem' : '1.2rem'}; font-weight: bold; margin-bottom: 6px; line-height: 1.2;">${movie.title || 'Sin título'}</div>
                    <div class="slider-meta" style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; font-size: ${dimensions.isMobile ? '0.75rem' : '0.8rem'}; opacity: 0.9;">
                        ${movie.year ? `<span>${movie.year}</span>` : ''}
                        ${movie.duration ? `<span>${movie.duration}</span>` : ''}
                        ${mainGenre ? `<span>${mainGenre}</span>` : ''}
                        ${movie.rating ? `<span><i class="fas fa-star" style="color: #ffd700; margin-right: 2px;"></i>${movie.rating}</span>` : ''}
                    </div>
                    <div class="slider-description" style="font-size: ${dimensions.isMobile ? '0.7rem' : '0.75rem'}; line-height: 1.3; opacity: 0.85; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${movie.description || movie.synopsis || 'Sin descripción disponible'}</div>
                </div>
            `;

            // SOLO hover en desktop NO táctil
            if (!isTouch) {
                slideDiv.onmouseenter = () => {
                    if (!isTransitioning && !isDragging) {
                        slideDiv.style.transform = 'scale(1.03)';
                        slideDiv.style.boxShadow = '0 8px 30px rgba(0,0,0,0.4)';
                    }
                };

                slideDiv.onmouseleave = () => {
                    if (!isTransitioning && !isDragging) {
                        slideDiv.style.transform = 'scale(1)';
                        slideDiv.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
                    }
                };
            }

            // CLICK CORREGIDO
            slideDiv.onclick = (e) => {
                e.stopPropagation();
                
                if (!isTransitioning && !isDragging) {
                    console.log('Slider: Click en slide', movie.title);
                    
                    // Múltiples intentos de abrir modal
                    const modalOpeners = [
                        () => window.openDetailsModal && window.openDetailsModal(movie),
                        () => window.parent.openDetailsModal && window.parent.openDetailsModal(movie),
                        () => {
                            const event = new CustomEvent('openModal', { 
                                detail: movie, 
                                bubbles: true,
                                cancelable: true
                            });
                            document.dispatchEvent(event);
                            window.dispatchEvent(event);
                        }
                    ];
                    
                    for (const opener of modalOpeners) {
                        try {
                            opener();
                            break;
                        } catch (e) {
                            continue;
                        }
                    }
                }
            };

            sliderWrapper.appendChild(slideDiv);
        });

        // Configurar todo después del renderizado
        setupTouchEvents();
        positionNavigationButtons();
        createAndPositionPagination();
        
        currentIndex = 0;
        updateSliderPosition(false);
        
        console.log('Slider: Renderizado completado correctamente');
    }

    // FUNCIÓN CORREGIDA: Actualizar posición centrada
    function updateSliderPosition(animate = true) {
        if (isDestroyed) return;
        
        const wrapper = document.getElementById('slider-wrapper');
        if (!wrapper) return;
        
        const dimensions = calculateResponsiveDimensions();
        const slideDistance = dimensions.slideWidth + dimensions.slideGap;
        
        // Centrar el slide activo perfectamente
        const containerWidth = wrapper.parentElement.offsetWidth;
        const centerOffset = (containerWidth - dimensions.slideWidth) / 2;
        const translateX = centerOffset - (slideDistance * currentIndex);
        
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
    }

    // EVENTOS DE NAVEGACIÓN CORREGIDOS
    function setupNavigationEvents() {
        const prevBtn = document.getElementById('slider-prev');
        const nextBtn = document.getElementById('slider-next');
        
        if (prevBtn) {
            prevBtn.onclick = (e) => {
                e.stopPropagation();
                if (!isTransitioning && !isDragging) {
                    goToSlide(currentIndex - 1);
                }
            };
        }
        
        if (nextBtn) {
            nextBtn.onclick = (e) => {
                e.stopPropagation();
                if (!isTransitioning && !isDragging) {
                    goToSlide(currentIndex + 1);
                }
            };
        }
    }

    // Exponer funciones públicas
    window.SliderController = {
        init: initSlider,
        destroy: destroySlider,
        goToSlide: goToSlide,
        refresh: () => renderSlider(slidesData)
    };

    // Auto-inicializar si el DOM está listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSlider);
    } else {
        initSlider();
    }

    console.log('Slider: Script cargado y listo para inicializar');

})();