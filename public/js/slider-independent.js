// Slider Independiente - VERSIÓN CORREGIDA CON TOUCH Y POSICIONAMIENTO CORRECTO
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

    // Función para calcular dimensiones responsivas MEJORADA
    function calculateResponsiveDimensions() {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const isMobile = viewportWidth <= 768;
        const isLandscape = viewportWidth > viewportHeight && isMobile;
        
        let slideWidth, slideHeight, slideGap, sideSpace;
        
        if (isMobile) {
            if (isLandscape) {
                // Móvil en landscape - hacer slides más anchos y bajos
                slideWidth = Math.min(viewportWidth * 0.85, 500);
                slideHeight = Math.floor(slideWidth * 0.35); // Más bajo en landscape
                slideGap = 15;
                sideSpace = (viewportWidth - slideWidth) / 2;
            } else {
                // Móvil en portrait - mostrar partes de slides adyacentes
                const adjacentVisible = 30;
                slideWidth = viewportWidth - (adjacentVisible * 2) - 40;
                slideHeight = Math.floor(slideWidth * 0.6);
                slideGap = 12;
                sideSpace = adjacentVisible + 20;
            }
        } else if (viewportWidth <= 1024) {
            // Tablet
            slideWidth = Math.min(viewportWidth * 0.75, 600);
            slideHeight = Math.floor(slideWidth * 0.5);
            slideGap = 20;
            sideSpace = (viewportWidth - slideWidth) / 2;
        } else {
            // Desktop
            slideWidth = Math.min(viewportWidth * 0.6, 800);
            slideHeight = Math.floor(slideWidth * 0.45);
            slideGap = 24;
            sideSpace = (viewportWidth - slideWidth) / 2;
        }
        
        // Límites de seguridad
        slideWidth = Math.max(280, Math.min(slideWidth, 1000));
        slideHeight = Math.max(140, Math.min(slideHeight, 450));
        slideGap = Math.max(8, slideGap);
        sideSpace = Math.max(20, sideSpace);
        
        console.log('Slider: Dimensiones calculadas', {
            viewportWidth,
            viewportHeight,
            isMobile,
            isLandscape,
            slideWidth,
            slideHeight,
            slideGap,
            sideSpace
        });
        
        return { slideWidth, slideHeight, slideGap, sideSpace, isMobile, isLandscape };
    }

    // Detectar dispositivos móviles
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }

    // NUEVA FUNCIÓN: Configurar eventos touch/swipe
    function setupTouchEvents() {
        const wrapper = document.getElementById('slider-wrapper');
        const container = wrapper?.parentElement;
        
        if (!wrapper || !container) return;
        
        // Limpiar eventos previos
        wrapper.removeEventListener('touchstart', handleTouchStart);
        wrapper.removeEventListener('touchmove', handleTouchMove);
        wrapper.removeEventListener('touchend', handleTouchEnd);
        
        // Configurar nuevos eventos
        wrapper.addEventListener('touchstart', handleTouchStart, { passive: false });
        wrapper.addEventListener('touchmove', handleTouchMove, { passive: false });
        wrapper.addEventListener('touchend', handleTouchEnd, { passive: false });
        
        console.log('Slider: Eventos touch configurados');
    }

    // Manejar inicio de touch
    function handleTouchStart(e) {
        if (isTransitioning || totalSlides <= 1) return;
        
        touchStartX = e.touches[0].clientX;
        touchStartTime = Date.now();
        isDragging = true;
        
        const wrapper = document.getElementById('slider-wrapper');
        if (wrapper) {
            // Obtener transform actual
            const transform = wrapper.style.transform;
            const match = transform.match(/translateX\(([^)]+)\)/);
            startTransform = match ? parseFloat(match[1]) : 0;
            currentTransform = startTransform;
            
            // Deshabilitar transición durante el drag
            wrapper.style.transition = 'none';
        }
        
        console.log('Slider: Touch start', { touchStartX, startTransform });
    }

    // Manejar movimiento de touch
    function handleTouchMove(e) {
        if (!isDragging || isTransitioning) return;
        
        e.preventDefault(); // Prevenir scroll
        
        const touchCurrentX = e.touches[0].clientX;
        const deltaX = touchCurrentX - touchStartX;
        const wrapper = document.getElementById('slider-wrapper');
        
        if (wrapper) {
            currentTransform = startTransform + deltaX;
            
            // Aplicar resistencia en los extremos
            let resistance = 1;
            const dimensions = calculateResponsiveDimensions();
            const slideDistance = dimensions.slideWidth + dimensions.slideGap;
            const maxTransform = 0;
            const minTransform = -(slideDistance * (totalSlides - 1));
            
            if (currentTransform > maxTransform) {
                resistance = 0.3;
            } else if (currentTransform < minTransform) {
                resistance = 0.3;
            }
            
            const finalTransform = startTransform + (deltaX * resistance);
            wrapper.style.transform = `translateX(${finalTransform}px)`;
        }
    }

    // Manejar fin de touch
    function handleTouchEnd(e) {
        if (!isDragging) return;
        
        isDragging = false;
        touchEndX = e.changedTouches[0].clientX;
        
        const wrapper = document.getElementById('slider-wrapper');
        if (wrapper) {
            wrapper.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        }
        
        const deltaX = touchEndX - touchStartX;
        const deltaTime = Date.now() - touchStartTime;
        const velocity = Math.abs(deltaX) / deltaTime;
        
        // Determinar si cambiar slide
        const threshold = 50; // píxeles mínimos para cambiar
        const velocityThreshold = 0.3; // velocidad mínima
        
        let shouldChangeSlide = false;
        let direction = 0;
        
        if (Math.abs(deltaX) > threshold || velocity > velocityThreshold) {
            shouldChangeSlide = true;
            direction = deltaX > 0 ? -1 : 1; // Invertido: swipe right = slide anterior
        }
        
        if (shouldChangeSlide) {
            const newIndex = currentIndex + direction;
            goToSlide(newIndex);
        } else {
            // Volver a la posición original
            updateSliderPosition(false);
        }
        
        console.log('Slider: Touch end', { 
            deltaX, 
            deltaTime, 
            velocity, 
            shouldChangeSlide, 
            direction 
        });
    }

    // FUNCIÓN CORREGIDA: Posicionar botones de navegación
    function positionNavigationButtons() {
        const prevBtn = document.getElementById('slider-prev');
        const nextBtn = document.getElementById('slider-next');
        const container = document.getElementById('slider-wrapper')?.parentElement;
        
        if (!prevBtn || !nextBtn || !container) {
            console.warn('Slider: No se encontraron botones de navegación');
            return;
        }
        
        const isMobile = isMobileDevice();
        const containerRect = container.getBoundingClientRect();
        
        // Estilos base para botones
        const buttonStyle = {
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: '1000',
            width: isMobile ? '40px' : '50px',
            height: isMobile ? '40px' : '50px',
            fontSize: isMobile ? '16px' : '20px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        };
        
        // Aplicar estilos
        Object.assign(prevBtn.style, buttonStyle);
        Object.assign(nextBtn.style, buttonStyle);
        
        // POSICIONAMIENTO CORRECTO - siempre a los lados del viewport
        if (isMobile) {
            prevBtn.style.left = '10px';
            nextBtn.style.right = '10px';
        } else {
            prevBtn.style.left = '20px';
            nextBtn.style.right = '20px';
        }
        
        // Asegurar que el contenedor tenga position relative
        container.style.position = 'relative';
        
        console.log('Slider: Botones posicionados correctamente', {
            isMobile,
            containerWidth: containerRect.width,
            leftBtn: prevBtn.style.left,
            rightBtn: nextBtn.style.right
        });
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
        document.documentElement.style.overflowX = 'hidden';
        
        if (dimensions.isMobile) {
            document.body.style.touchAction = 'pan-y pinch-zoom';
        }
        
        console.log('Slider: Variables CSS actualizadas', dimensions);
    }

    // Actualizar posición del slider
    function updateSliderPosition(animate = true) {
        if (isDestroyed) return;
        
        const wrapper = document.getElementById('slider-wrapper');
        if (!wrapper) return;
        
        const dimensions = calculateResponsiveDimensions();
        const slideDistance = dimensions.slideWidth + dimensions.slideGap;
        const translateX = -(slideDistance * currentIndex);
        
        if (animate) {
            wrapper.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            isTransitioning = true;
            setTimeout(() => {
                isTransitioning = false;
            }, 400);
        } else {
            wrapper.style.transition = 'none';
        }
        
        wrapper.style.transform = `translateX(${translateX}px)`;
        
        console.log('Slider: Posición actualizada', {
            index: currentIndex,
            translateX,
            slideDistance,
            animate
        });
    }

    // Manejar resize
    function handleResize() {
        if (isDestroyed) return;
        
        const currentViewportWidth = window.innerWidth;
        const threshold = 50;
        
        if (Math.abs(currentViewportWidth - lastViewportWidth) < threshold) return;
        
        clearTimeout(resizeTimeout);
        
        console.log('Slider: Resize detectado', {
            anterior: lastViewportWidth,
            actual: currentViewportWidth
        });
        
        resizeTimeout = setTimeout(() => {
            updateSliderCSSVariables();
            forceCompleteRecalculation();
            positionNavigationButtons();
        }, 150);
        
        lastViewportWidth = currentViewportWidth;
    }

    // Forzar recálculo completo
    function forceCompleteRecalculation() {
        console.log('Slider: Forzando recálculo completo');
        
        const wrapper = document.getElementById('slider-wrapper');
        const slides = document.querySelectorAll('.slider-slide');
        
        if (!wrapper || slides.length === 0) return;
        
        const dimensions = calculateResponsiveDimensions();
        
        // Configurar wrapper
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'row';
        wrapper.style.flexWrap = 'nowrap';
        wrapper.style.position = 'relative';
        wrapper.style.left = '0px';
        wrapper.style.marginLeft = `${dimensions.sideSpace}px`;
        wrapper.style.width = 'auto';
        wrapper.style.willChange = 'transform';
        
        // Aplicar dimensiones a slides
        slides.forEach((slide, index) => {
            slide.style.width = `${dimensions.slideWidth}px`;
            slide.style.height = `${dimensions.slideHeight}px`;
            slide.style.flexBasis = `${dimensions.slideWidth}px`;
            slide.style.marginRight = index < slides.length - 1 ? `${dimensions.slideGap}px` : '0';
            slide.style.flexShrink = '0';
            slide.style.flexGrow = '0';
        });
        
        updateSliderPosition(false);
        console.log('Slider: Recálculo completo finalizado');
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

    // Renderizar slider CORREGIDO
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
            sliderContainer.style.overflow = 'hidden';
            sliderContainer.style.position = 'relative';
            sliderContainer.style.touchAction = 'pan-y pinch-zoom';
        }
        
        // Limpiar y configurar wrapper
        sliderWrapper.innerHTML = '';
        sliderWrapper.style.display = 'flex';
        sliderWrapper.style.flexDirection = 'row';
        sliderWrapper.style.flexWrap = 'nowrap';
        sliderWrapper.style.transform = 'translateX(0)';
        sliderWrapper.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        sliderWrapper.style.position = 'relative';
        sliderWrapper.style.left = '0px';
        sliderWrapper.style.marginLeft = `${dimensions.sideSpace}px`;
        sliderWrapper.style.width = 'auto';
        sliderWrapper.style.willChange = 'transform';
        sliderWrapper.style.touchAction = 'pan-x';
        
        console.log('Slider: Creando slides con dimensiones:', dimensions);
        
        // Crear slides
        slidesData.forEach((movie, index) => {
            const slideDiv = document.createElement('div');
            slideDiv.className = 'slider-slide';
            slideDiv.dataset.index = index;
            
            slideDiv.style.width = `${dimensions.slideWidth}px`;
            slideDiv.style.height = `${dimensions.slideHeight}px`;
            slideDiv.style.flexBasis = `${dimensions.slideWidth}px`;
            slideDiv.style.marginRight = index < slidesData.length - 1 ? `${dimensions.slideGap}px` : '0';
            slideDiv.style.flexShrink = '0';
            slideDiv.style.flexGrow = '0';
            slideDiv.style.position = 'relative';
            slideDiv.style.borderRadius = '12px';
            slideDiv.style.overflow = 'hidden';
            slideDiv.style.cursor = 'pointer';
            slideDiv.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
            slideDiv.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
            slideDiv.style.touchAction = 'manipulation';
            
            if (dimensions.isMobile) {
                slideDiv.style.webkitTransform = 'translateZ(0)';
                slideDiv.style.backfaceVisibility = 'hidden';
                slideDiv.style.webkitBackfaceVisibility = 'hidden';
            }
            
            const imageUrl = movie.sliderUrl || `https://via.placeholder.com/${dimensions.slideWidth}x${dimensions.slideHeight}/333/fff?text=${encodeURIComponent(movie.title)}`;
            const mainGenre = movie.genre ? movie.genre.split(/[·,]/)[0].trim() : '';
            
            slideDiv.innerHTML = `
                <div class="slider-img-wrapper" style="width: 100%; height: 100%; overflow: hidden; border-radius: 12px;">
                    <img src="${imageUrl}" 
                         alt="${movie.title}" 
                         loading="${index === 0 ? 'eager' : 'lazy'}"
                         style="width: 100%; height: 100%; object-fit: cover; object-position: center; transition: transform 0.3s ease;"
                         onerror="this.src='https://via.placeholder.com/${dimensions.slideWidth}x${dimensions.slideHeight}/333/fff?text=No+Image'">
                </div>
                <div class="slider-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.8)); padding: ${dimensions.isMobile ? '12px' : '16px'}; color: white; border-radius: 0 0 12px 12px;">
                    <div class="slider-title-movie" style="font-size: ${dimensions.isMobile ? 'clamp(0.8rem, 3.5vw, 1.1rem)' : 'clamp(1rem, 2.5vw, 1.4rem)'}; font-weight: bold; margin-bottom: 6px; line-height: 1.2;">${movie.title || 'Sin título'}</div>
                    <div class="slider-meta" style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; font-size: ${dimensions.isMobile ? 'clamp(0.65rem, 2.5vw, 0.75rem)' : 'clamp(0.7rem, 1.8vw, 0.85rem)'}; opacity: 0.9;">
                        ${movie.year ? `<span>${movie.year}</span>` : ''}
                        ${movie.duration ? `<span>${movie.duration}</span>` : ''}
                        ${mainGenre ? `<span>${mainGenre}</span>` : ''}
                        ${movie.rating ? `<span><i class="fas fa-star" style="color: #ffd700; margin-right: 2px;"></i>${movie.rating}</span>` : ''}
                    </div>
                    <div class="slider-description" style="font-size: ${dimensions.isMobile ? 'clamp(0.6rem, 2.2vw, 0.7rem)' : 'clamp(0.65rem, 1.6vw, 0.8rem)'}; line-height: 1.3; opacity: 0.85; display: -webkit-box; -webkit-line-clamp: ${dimensions.isLandscape ? '1' : '2'}; -webkit-box-orient: vertical; overflow: hidden;">${movie.description || movie.synopsis || 'Sin descripción disponible'}</div>
                </div>
            `;

            // Efectos hover solo en desktop
            if (!dimensions.isMobile) {
                slideDiv.addEventListener('mouseenter', () => {
                    if (!isTransitioning && !isDragging) {
                        slideDiv.style.transform = 'scale(1.05)';
                        slideDiv.style.boxShadow = '0 8px 30px rgba(0,0,0,0.4)';
                        const img = slideDiv.querySelector('img');
                        if (img) img.style.transform = 'scale(1.1)';
                    }
                });

                slideDiv.addEventListener('mouseleave', () => {
                    if (!isTransitioning && !isDragging) {
                        slideDiv.style.transform = 'scale(1)';
                        slideDiv.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
                        const img = slideDiv.querySelector('img');
                        if (img) img.style.transform = 'scale(1)';
                    }
                });
            }

            slideDiv.addEventListener('click', (e) => {
                if (!isTransitioning && !isDragging) {
                    e.preventDefault();
                    console.log('Slider: Click en slide:', movie.title);
                    openDetailsModal(movie, slideDiv);
                }
            });

            sliderWrapper.appendChild(slideDiv);
        });

        // Configurar controles y eventos
        setupControls();
        setupTouchEvents();
        currentIndex = 0;
        updateSliderPosition(false);
        updatePagination();
        
        // Posicionar botones después del renderizado
        setTimeout(() => {
            positionNavigationButtons();
        }, 100);
        
        console.log('Slider: Renderizado completado');
    }

    // Configurar controles
    function setupControls() {
        const prevBtn = document.getElementById('slider-prev');
        const nextBtn = document.getElementById('slider-next');
        
        if (prevBtn) {
            const newPrevBtn = prevBtn.cloneNode(true);
            prevBtn.replaceWith(newPrevBtn);
            document.getElementById('slider-prev').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isTransitioning && !isDragging && totalSlides > 0) {
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
                if (!isTransitioning && !isDragging && totalSlides > 0) {
                    goToSlide(currentIndex + 1);
                }
            });
        }

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
                if (!isTransitioning && !isDragging) {
                    goToSlide(i);
                }
            });
            
            pagination.appendChild(dot);
        }
    }

    // Ir a slide
    function goToSlide(index) {
        if (isTransitioning || isDragging || totalSlides === 0 || isDestroyed) return;
        
        if (index < 0) index = totalSlides - 1;
        if (index >= totalSlides) index = 0;
        
        if (index === currentIndex) return;
        
        console.log('Slider: Cambiando a slide', index);
        
        currentIndex = index;
        updateSliderPosition(true);
        updatePagination();
    }

    // Actualizar paginación
    function updatePagination() {
        const dots = document.querySelectorAll('.slider-pagination-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
        });
    }

    // Abrir modal
    function openDetailsModal(movie, element) {
        if (typeof window.openMovieModal === 'function') {
            window.openMovieModal(movie, element);
        } else {
            console.warn('Slider: openMovieModal no está disponible');
        }
    }

    // Manejar cambios de orientación
    function handleOrientationChange() {
        if (!isMobileDevice()) return;
        
        console.log('Slider: Cambio de orientación detectado');
        
        setTimeout(() => {
            if (!isDestroyed) {
                updateSliderCSSVariables();
                forceCompleteRecalculation();
                positionNavigationButtons();
            }
        }, 300);
    }

    // Limpiar slider
    function destroySlider() {
        console.log('Slider: Destruyendo...');
        
        isDestroyed = true;
        isDragging = false;
        clearTimeout(resizeTimeout);
        
        // Remover event listeners
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleOrientationChange);
        
        const wrapper = document.getElementById('slider-wrapper');
        if (wrapper) {
            wrapper.removeEventListener('touchstart', handleTouchStart);
            wrapper.removeEventListener('touchmove', handleTouchMove);
            wrapper.removeEventListener('touchend', handleTouchEnd);
            wrapper.innerHTML = '';
            wrapper.style.transform = 'translateX(0)';
        }
        
        currentIndex = 0;
        totalSlides = 0;
        slidesData = [];
        isTransitioning = false;
        
        console.log('Slider: Destruido completamente');
    }

// Función principal de inicialización
        async function initSlider() {
        if (isDestroyed) {
            console.log('Slider: Intentando inicializar slider destruido');
            isDestroyed = false;
        }
        
        console.log('Slider: Iniciando inicialización...');
        
        // Verificar elementos necesarios
        const wrapper = document.getElementById('slider-wrapper');
        if (!wrapper) {
            console.error('Slider: slider-wrapper no encontrado, reintentando en 500ms...');
            setTimeout(initSlider, 500);
            return;
        }
        
        try {
            // Configurar eventos de ventana
            window.addEventListener('resize', handleResize, { passive: true });
            window.addEventListener('orientationchange', handleOrientationChange, { passive: true });
            
            // Cargar y renderizar datos
            const moviesData = await loadSliderData();
            if (moviesData.length === 0) {
                console.warn('Slider: No hay datos para mostrar');
                return;
            }
            
            renderSlider(moviesData);
            
            console.log('Slider: Inicialización completada exitosamente');
            
        } catch (error) {
            console.error('Slider: Error durante la inicialización:', error);
        }
    }

    // Función para reinicializar slider
    function refreshSlider() {
        console.log('Slider: Refrescando...');
        destroySlider();
        setTimeout(initSlider, 100);
    }

    // API pública
    window.sliderAPI = {
        init: initSlider,
        destroy: destroySlider,
        refresh: refreshSlider,
        goToSlide: goToSlide,
        next: () => goToSlide(currentIndex + 1),
        prev: () => goToSlide(currentIndex - 1),
        getCurrentIndex: () => currentIndex,
        getTotalSlides: () => totalSlides,
        isReady: () => !isDestroyed && totalSlides > 0
    };

    // Auto-inicialización
    console.log('Slider: Script cargado, preparando auto-inicialización...');
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('Slider: DOM listo, iniciando...');
            setTimeout(initSlider, 100);
        });
    } else {
        console.log('Slider: DOM ya listo, iniciando inmediatamente...');
        setTimeout(initSlider, 100);
    }

    // Verificación periódica de integridad
    setInterval(() => {
        if (!isDestroyed && totalSlides > 0) {
            const wrapper = document.getElementById('slider-wrapper');
            if (!wrapper || wrapper.children.length !== totalSlides) {
                console.warn('Slider: Integridad comprometida, refrescando...');
                refreshSlider();
            }
        }
    }, 5000);

})();