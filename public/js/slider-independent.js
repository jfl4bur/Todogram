// Slider Independiente - VERSIÓN MEJORADA CON BOTONES LATERALES Y DISEÑO RESPONSIVO
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
        const isTablet = viewportWidth > 768 && viewportWidth <= 1024;
        const isLandscape = viewportWidth > viewportHeight && isMobile;
        
        let slideWidth, slideHeight, slideGap, sideSpace, buttonSpace;
        
        // Espacio para botones laterales (siempre reservado)
        buttonSpace = isMobile ? 60 : 80; // Espacio para botones a cada lado
        const availableWidth = viewportWidth - (buttonSpace * 2);
        
        if (isMobile) {
            if (isLandscape) {
                // Móvil en landscape - slides más anchos y bajos
                const adjacentVisible = 40; // Mostrar más de los slides adyacentes
                slideWidth = availableWidth - (adjacentVisible * 2);
                slideHeight = Math.floor(slideWidth * 0.35);
                slideGap = 15;
                sideSpace = adjacentVisible + buttonSpace;
            } else {
                // Móvil en portrait - mostrar partes de slides adyacentes
                const adjacentVisible = 35; // Espacio visible de slides adyacentes
                slideWidth = availableWidth - (adjacentVisible * 2);
                slideHeight = Math.floor(slideWidth * 0.6);
                slideGap = 12;
                sideSpace = adjacentVisible + buttonSpace;
            }
        } else if (isTablet) {
            // Tablet - mostrar más de los slides adyacentes
            const adjacentVisible = 60;
            slideWidth = availableWidth - (adjacentVisible * 2);
            slideHeight = Math.floor(slideWidth * 0.5);
            slideGap = 20;
            sideSpace = adjacentVisible + buttonSpace;
        } else {
            // Desktop - mostrar partes significativas de slides adyacentes
            const adjacentVisible = 80;
            slideWidth = Math.min(availableWidth - (adjacentVisible * 2), 700);
            slideHeight = Math.floor(slideWidth * 0.45);
            slideGap = 24;
            sideSpace = adjacentVisible + buttonSpace;
        }
        
        // Límites de seguridad
        slideWidth = Math.max(250, Math.min(slideWidth, 800));
        slideHeight = Math.max(120, Math.min(slideHeight, 400));
        slideGap = Math.max(8, slideGap);
        sideSpace = Math.max(buttonSpace + 20, sideSpace);
        
        console.log('Slider: Dimensiones calculadas', {
            viewportWidth,
            viewportHeight,
            isMobile,
            isTablet,
            isLandscape,
            slideWidth,
            slideHeight,
            slideGap,
            sideSpace,
            buttonSpace,
            availableWidth
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

    // FUNCIÓN MEJORADA: Configurar eventos touch/swipe
    function setupTouchEvents() {
        const wrapper = document.getElementById('slider-wrapper');
        const container = wrapper?.parentElement;
        
        if (!wrapper || !container) return;
        
        // Limpiar eventos previos
        wrapper.removeEventListener('touchstart', handleTouchStart);
        wrapper.removeEventListener('touchmove', handleTouchMove);
        wrapper.removeEventListener('touchend', handleTouchEnd);
        
        // Configurar nuevos eventos solo en dispositivos táctiles
        if (isTouchDevice()) {
            wrapper.addEventListener('touchstart', handleTouchStart, { passive: false });
            wrapper.addEventListener('touchmove', handleTouchMove, { passive: false });
            wrapper.addEventListener('touchend', handleTouchEnd, { passive: false });
            
            console.log('Slider: Eventos touch configurados');
        }
    }

    // Manejar inicio de touch
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

    // Manejar movimiento de touch
    function handleTouchMove(e) {
        if (!isDragging || isTransitioning) return;
        
        e.preventDefault();
        
        const touchCurrentX = e.touches[0].clientX;
        const deltaX = touchCurrentX - touchStartX;
        const wrapper = document.getElementById('slider-wrapper');
        
        if (wrapper) {
            currentTransform = startTransform + deltaX;
            
            let resistance = 1;
            const dimensions = calculateResponsiveDimensions();
            const slideDistance = dimensions.slideWidth + dimensions.slideGap;
            const maxTransform = 0;
            const minTransform = -(slideDistance * (totalSlides - 1));
            
            if (currentTransform > maxTransform || currentTransform < minTransform) {
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
        
        const threshold = 50;
        const velocityThreshold = 0.3;
        
        let shouldChangeSlide = false;
        let direction = 0;
        
        if (Math.abs(deltaX) > threshold || velocity > velocityThreshold) {
            shouldChangeSlide = true;
            direction = deltaX > 0 ? -1 : 1;
        }
        
        if (shouldChangeSlide) {
            const newIndex = currentIndex + direction;
            goToSlide(newIndex);
        } else {
            updateSliderPosition(false);
        }
    }

    // FUNCIÓN COMPLETAMENTE REDISEÑADA: Posicionar botones de navegación
    function positionNavigationButtons() {
        const prevBtn = document.getElementById('slider-prev');
        const nextBtn = document.getElementById('slider-next');
        const container = document.getElementById('slider-wrapper')?.parentElement;
        
        if (!prevBtn || !nextBtn || !container) {
            console.warn('Slider: No se encontraron botones de navegación');
            return;
        }
        
        const dimensions = calculateResponsiveDimensions();
        const containerRect = container.getBoundingClientRect();
        
        // Tamaños responsivos para botones
        let buttonWidth, buttonHeight, fontSize, borderRadius;
        
        if (dimensions.isMobile) {
            if (dimensions.isLandscape) {
                buttonWidth = '45px';
                buttonHeight = `${Math.min(dimensions.slideHeight, 140)}px`; // Altura del slide en landscape
                fontSize = '18px';
                borderRadius = '8px';
            } else {
                buttonWidth = '40px';
                buttonHeight = `${Math.min(dimensions.slideHeight, 200)}px`; // Altura del slide
                fontSize = '16px';
                borderRadius = '8px';
            }
        } else if (dimensions.isTablet) {
            buttonWidth = '55px';
            buttonHeight = `${dimensions.slideHeight}px`;
            fontSize = '22px';
            borderRadius = '12px';
        } else {
            buttonWidth = '60px';
            buttonHeight = `${dimensions.slideHeight}px`;
            fontSize = '24px';
            borderRadius = '15px';
        }
        
        // Estilos base para botones - ALTURA COMPLETA DEL SLIDE
        const buttonStyle = {
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: '1000',
            width: buttonWidth,
            height: buttonHeight, // Altura igual al slide
            fontSize: fontSize,
            borderRadius: borderRadius,
            border: 'none',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(5px)',
            webkitBackdropFilter: 'blur(5px)'
        };
        
        // Aplicar estilos
        Object.assign(prevBtn.style, buttonStyle);
        Object.assign(nextBtn.style, buttonStyle);
        
        // POSICIONAMIENTO EXACTO - A LOS LADOS DEL VIEWPORT
        const buttonOffset = dimensions.isMobile ? '10px' : '15px';
        prevBtn.style.left = buttonOffset;
        nextBtn.style.right = buttonOffset;
        
        // Efectos hover solo en desktop no táctil
        if (!isTouchDevice()) {
            prevBtn.addEventListener('mouseenter', () => {
                prevBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
                prevBtn.style.transform = 'translateY(-50%) scale(1.05)';
            });
            
            prevBtn.addEventListener('mouseleave', () => {
                prevBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
                prevBtn.style.transform = 'translateY(-50%) scale(1)';
            });
            
            nextBtn.addEventListener('mouseenter', () => {
                nextBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
                nextBtn.style.transform = 'translateY(-50%) scale(1.05)';
            });
            
            nextBtn.addEventListener('mouseleave', () => {
                nextBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
                nextBtn.style.transform = 'translateY(-50%) scale(1)';
            });
        }
        
        // Asegurar posicionamiento del contenedor
        container.style.position = 'relative';
        
        console.log('Slider: Botones posicionados correctamente', {
            dimensions,
            buttonWidth,
            buttonHeight,
            containerWidth: containerRect.width
        });
    }

    // FUNCIÓN MEJORADA: Crear y posicionar paginación
    function createAndPositionPagination() {
        const pagination = document.getElementById('slider-pagination');
        if (!pagination) return;
        
        const dimensions = calculateResponsiveDimensions();
        const container = document.getElementById('slider-wrapper')?.parentElement;
        
        // Limpiar paginación existente
        pagination.innerHTML = '';
        
        // Posicionar paginación correctamente
        pagination.style.position = 'absolute';
        pagination.style.bottom = dimensions.isMobile ? '10px' : '15px';
        pagination.style.left = '50%';
        pagination.style.transform = 'translateX(-50%)';
        pagination.style.display = 'flex';
        pagination.style.gap = dimensions.isMobile ? '6px' : '8px';
        pagination.style.zIndex = '999';
        
        // Crear dots
        for (let i = 0; i < totalSlides; i++) {
            const dot = document.createElement('button');
            dot.className = 'slider-pagination-dot';
            dot.dataset.slide = i;
            
            // Estilos para dots
            const dotSize = dimensions.isMobile ? '8px' : '10px';
            dot.style.width = dotSize;
            dot.style.height = dotSize;
            dot.style.borderRadius = '50%';
            dot.style.border = 'none';
            dot.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
            dot.style.cursor = 'pointer';
            dot.style.transition = 'all 0.3s ease';
            dot.style.padding = '0';
            dot.style.margin = '0';
            
            if (i === currentIndex) {
                dot.classList.add('active');
                dot.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                dot.style.transform = 'scale(1.2)';
            }
            
            dot.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isTransitioning && !isDragging) {
                    goToSlide(i);
                }
            });
            
            pagination.appendChild(dot);
        }
        
        // Asegurar que el contenedor tenga position relative
        if (container) {
            container.style.position = 'relative';
        }
        
        console.log('Slider: Paginación creada y posicionada');
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
        root.style.setProperty('--slider-button-space', `${dimensions.buttonSpace}px`);
        
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
            createAndPositionPagination();
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

    // Renderizar slider COMPLETAMENTE REDISEÑADO
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
            sliderContainer.style.paddingBottom = '40px'; // Espacio para paginación
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
            
            // Optimizaciones para móvil
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

            // NO efectos hover en dispositivos táctiles
            if (!isTouchDevice()) {
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

            // Evento click para abrir modal directamente
            slideDiv.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (!isTransitioning && !isDragging) {
                    // Abrir modal directamente
                    if (typeof window.openDetailsModal === 'function') {
                        window.openDetailsModal(movie);
                    } else {
                        console.log('Abrir modal para:', movie.title);
                    }
                }
            });

            // Prevenir eventos de doble tap en móvil
            if (isTouchDevice()) {
                slideDiv.style.webkitTapHighlightColor = 'transparent';
                slideDiv.style.tapHighlightColor = 'transparent';
            }

            sliderWrapper.appendChild(slideDiv);
        });

        // Configurar eventos touch/swipe
        setupTouchEvents();
        
        // Posicionar elementos
        positionNavigationButtons();
        createAndPositionPagination();
        
        // Posición inicial
        currentIndex = 0;
        updateSliderPosition(false);
        
        console.log('Slider: Renderizado completado', {
            totalSlides,
            dimensions,
            slidesCreated: slidesData.length
        });
    }

    // Ir a slide específico
    function goToSlide(index) {
        if (isTransitioning || isDragging || totalSlides === 0) return;
        
        // Límites del slider con bucle
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
                dot.classList.add('active');
                dot.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                dot.style.transform = 'scale(1.2)';
            } else {
                dot.classList.remove('active');
                dot.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                dot.style.transform = 'scale(1)';
            }
        });
    }

    // Configurar eventos de navegación
    function setupNavigationEvents() {
        const prevBtn = document.getElementById('slider-prev');
        const nextBtn = document.getElementById('slider-next');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isTransitioning && !isDragging) {
                    goToSlide(currentIndex - 1);
                }
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isTransitioning && !isDragging) {
                    goToSlide(currentIndex + 1);
                }
            });
        }
        
        console.log('Slider: Eventos de navegación configurados');
    }

    // Inicializar slider automático (opcional)
    function setupAutoplay(interval = 5000) {
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
        
        // Pausar autoplay en hover (solo desktop)
        if (!isTouchDevice()) {
            const container = document.getElementById('slider-wrapper')?.parentElement;
            if (container) {
                container.addEventListener('mouseenter', stopAutoplay);
                container.addEventListener('mouseleave', startAutoplay);
            }
        }
        
        // Pausar autoplay cuando la ventana no está activa
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
        
        console.log('Slider: Iniciando...');
        
        try {
            // Cargar datos
            const moviesData = await loadSliderData();
            
            if (moviesData.length === 0) {
                console.warn('Slider: No hay datos para mostrar');
                return;
            }
            
            // Renderizar slider
            renderSlider(moviesData);
            
            // Configurar eventos
            setupNavigationEvents();
            
            // Configurar resize
            window.addEventListener('resize', handleResize);
            
            // Configurar autoplay si está habilitado
            setupAutoplay();
            
            console.log('Slider: Inicialización completada exitosamente');
            
        } catch (error) {
            console.error('Slider: Error durante la inicialización:', error);
        }
    }

    // Destruir slider
    function destroySlider() {
        isDestroyed = true;
        
        // Limpiar timeouts
        clearTimeout(resizeTimeout);
        
        // Remover event listeners
        window.removeEventListener('resize', handleResize);
        
        // Limpiar wrapper
        const wrapper = document.getElementById('slider-wrapper');
        if (wrapper) {
            wrapper.innerHTML = '';
            wrapper.removeEventListener('touchstart', handleTouchStart);
            wrapper.removeEventListener('touchmove', handleTouchMove);
            wrapper.removeEventListener('touchend', handleTouchEnd);
        }
        
        // Limpiar paginación
        const pagination = document.getElementById('slider-pagination');
        if (pagination) {
            pagination.innerHTML = '';
        }
        
        // Reset variables
        currentIndex = 0;
        totalSlides = 0;
        slidesData = [];
        isTransitioning = false;
        isDragging = false;
        
        console.log('Slider: Destruido correctamente');
    }

    // Función pública para reinicializar
    function reinitSlider() {
        destroySlider();
        setTimeout(() => {
            isDestroyed = false;
            initSlider();
        }, 100);
    }

    // Función pública para actualizar datos
    function updateSliderData(newData) {
        if (newData && Array.isArray(newData)) {
            renderSlider(newData);
        }
    }

    // Función pública para ir a slide específico
    function navigateToSlide(index) {
        goToSlide(index);
    }

    // Funciones públicas globales
    window.SliderController = {
        init: initSlider,
        destroy: destroySlider,
        reinit: reinitSlider,
        updateData: updateSliderData,
        goToSlide: navigateToSlide,
        getCurrentIndex: () => currentIndex,
        getTotalSlides: () => totalSlides
    };

    // Auto-inicialización si DOM está listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSlider);
    } else {
        // DOM ya está cargado, inicializar inmediatamente
        setTimeout(initSlider, 100);
    }

    // Prevenir doble inicialización
    if (window.sliderInitialized) {
        console.warn('Slider: Ya está inicializado, destruyendo instancia anterior');
        destroySlider();
    }
    window.sliderInitialized = true;

})();

// Estilos CSS adicionales (opcional - insertar en el head si no existen)
if (!document.getElementById('slider-styles')) {
    const styles = document.createElement('style');
    styles.id = 'slider-styles';
    styles.textContent = `
        /* Prevenir selección de texto en el slider */
        .slider-slide {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
            -webkit-touch-callout: none;
        }
        
        /* Optimizaciones de rendimiento */
        .slider-slide img {
            -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
            -webkit-transform: translateZ(0);
            transform: translateZ(0);
        }
        
        /* Animaciones suaves para paginación */
        .slider-pagination-dot {
            will-change: transform, background-color;
        }
        
        /* Estilos para botones de navegación */
        #slider-prev,
        #slider-next {
            will-change: transform, background-color;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
        }
        
        /* Prevenir scroll durante touch en el slider */
        #slider-wrapper {
            touch-action: pan-x;
            -webkit-overflow-scrolling: touch;
        }
        
        /* Estilos responsivos adicionales */
        @media (max-width: 768px) {
            .slider-slide .slider-overlay {
                backdrop-filter: blur(3px);
                -webkit-backdrop-filter: blur(3px);
            }
        }
        
        /* Modo landscape en móviles */
        @media (max-width: 768px) and (orientation: landscape) {
            .slider-slide .slider-description {
                -webkit-line-clamp: 1 !important;
            }
        }
        
        /* Optimización para dispositivos de alta densidad */
        @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
            .slider-slide {
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }
        }
    `;
    document.head.appendChild(styles);
}