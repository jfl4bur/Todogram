// Slider Independiente - VERSIÓN COMPLETAMENTE CORREGIDA Y FUNCIONAL
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

    // SISTEMA DE DIMENSIONES COMPLETAMENTE NUEVO
    function getSliderDimensions() {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const isMobile = vw <= 768;
        const isTablet = vw > 768 && vw <= 1024;
        
        if (isMobile) {
            // MÓVIL: Como Netflix mobile - slide principal + peek de laterales
            return {
                slideWidth: Math.round(vw * 0.82),
                slideHeight: Math.round(vw * 0.82 * 0.56), // 16:9
                gap: 12,
                containerPadding: Math.round(vw * 0.09), // 9% cada lado
                isMobile: true,
                isTablet: false
            };
        } else if (isTablet) {
            // TABLET: Intermedio
            return {
                slideWidth: Math.round(vw * 0.7),
                slideHeight: Math.round(vw * 0.7 * 0.5),
                gap: 16,
                containerPadding: Math.round(vw * 0.15),
                isMobile: false,
                isTablet: true
            };
        } else {
            // DESKTOP: Como tu imagen - slide MUY grande + pequeños peeks
            return {
                slideWidth: Math.round(vw * 0.76), // 76% del viewport
                slideHeight: Math.round(vw * 0.76 * 0.42), // Ratio panorámico
                gap: 20,
                containerPadding: Math.round(vw * 0.12), // 12% cada lado
                isMobile: false,
                isTablet: false
            };
        }
    }

    // Detectar dispositivos táctiles
    function isTouchDevice() {
        return 'ontouchstart' in window || 
               navigator.maxTouchPoints > 0 || 
               /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // Configurar eventos touch/swipe
    function setupTouchEvents() {
        const container = document.getElementById('slider-wrapper')?.parentElement;
        if (!container) return;
        
        // Limpiar eventos previos
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
        
        if (isTouchDevice()) {
            container.addEventListener('touchstart', handleTouchStart, { passive: false });
            container.addEventListener('touchmove', handleTouchMove, { passive: false });
            container.addEventListener('touchend', handleTouchEnd, { passive: false });
        }
    }

    function handleTouchStart(e) {
        if (isTransitioning || totalSlides <= 1) return;
        
        touchStartX = e.touches[0].clientX;
        touchStartTime = Date.now();
        isDragging = true;
        
        const wrapper = document.getElementById('slider-wrapper');
        if (wrapper) {
            const currentTransformMatch = wrapper.style.transform.match(/translateX\(([^)]+)\)/);
            startTransform = currentTransformMatch ? parseFloat(currentTransformMatch[1]) : 0;
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
        const threshold = 60;
        
        if (Math.abs(deltaX) > threshold) {
            const direction = deltaX > 0 ? -1 : 1;
            goToSlide(currentIndex + direction);
        } else {
            updateSliderPosition(true);
        }
    }

    // CREAR Y POSICIONAR BOTONES DE NAVEGACIÓN
    function setupNavigationButtons() {
        const prevBtn = document.getElementById('slider-prev');
        const nextBtn = document.getElementById('slider-next');
        const container = document.getElementById('slider-wrapper')?.parentElement;
        
        if (!prevBtn || !nextBtn || !container) return;
        
        const dims = getSliderDimensions();
        
        // Limpiar estilos completamente
        prevBtn.removeAttribute('style');
        nextBtn.removeAttribute('style');
        
        // Estilo base para botones
        const buttonStyles = {
            position: 'absolute',
            zIndex: '1002',
            border: 'none',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold',
            fontSize: dims.isMobile ? '22px' : '28px',
            width: dims.isMobile ? '45px' : '55px',
            height: `${dims.slideHeight}px`,
            top: dims.isMobile ? '15px' : '25px'
        };
        
        // Aplicar estilos
        Object.assign(prevBtn.style, buttonStyles);
        Object.assign(nextBtn.style, buttonStyles);
        
        // Posicionamiento
        prevBtn.style.left = `${dims.containerPadding}px`;
        prevBtn.style.borderRadius = '8px 0 0 8px';
        prevBtn.innerHTML = '‹';
        
        nextBtn.style.right = `${dims.containerPadding}px`;
        nextBtn.style.borderRadius = '0 8px 8px 0';
        nextBtn.innerHTML = '›';
        
        // Solo hover en desktop no táctil
        if (!isTouchDevice() && !dims.isMobile && !dims.isTablet) {
            [prevBtn, nextBtn].forEach(btn => {
                btn.onmouseenter = () => btn.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
                btn.onmouseleave = () => btn.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            });
        }
        
        console.log('✅ Botones configurados');
    }

    // CREAR PAGINACIÓN
    function setupPagination() {
        const pagination = document.getElementById('slider-pagination');
        if (!pagination) return;
        
        const dims = getSliderDimensions();
        
        pagination.innerHTML = '';
        pagination.style.cssText = `
            position: absolute;
            bottom: ${dims.isMobile ? '12px' : '20px};
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 10px;
            z-index: 1001;
        `;
        
        for (let i = 0; i < totalSlides; i++) {
            const dot = document.createElement('button');
            dot.className = 'slider-dot';
            dot.dataset.index = i;
            
            dot.style.cssText = `
                width: ${dims.isMobile ? '10px' : '12px'};
                height: ${dims.isMobile ? '10px' : '12px'};
                border-radius: 50%;
                border: none;
                background: ${i === currentIndex ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)'};
                cursor: pointer;
                transition: all 0.3s ease;
                padding: 0;
                margin: 0;
            `;
            
            dot.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isTransitioning && !isDragging) {
                    goToSlide(i);
                }
            };
            
            pagination.appendChild(dot);
        }
        
        console.log('✅ Paginación configurada');
    }

    // ACTUALIZAR POSICIÓN DEL SLIDER
    function updateSliderPosition(animate = true) {
        if (isDestroyed) return;
        
        const wrapper = document.getElementById('slider-wrapper');
        if (!wrapper) return;
        
        const dims = getSliderDimensions();
        const slideStep = dims.slideWidth + dims.gap;
        const translateX = -(slideStep * currentIndex);
        
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
        
        console.log(`🎯 Slider posición: slide ${currentIndex}, translateX: ${translateX}px`);
    }

    // CARGAR DATOS DEL SLIDER
    async function loadSliderData() {
        try {
            console.log('📡 Cargando datos del slider...');
            const response = await fetch(DATA_URL);
            if (!response.ok) throw new Error('Error al cargar data.json');
            const data = await response.json();
            
            const movies = data
                .filter(item => item && typeof item === 'object' && item['Categoría'] === 'Películas' && item['Slider'])
                .map((item, index) => ({
                    id: index.toString(),
                    title: item['Título'] || 'Sin título',
                    description: item['Synopsis'] || 'Sin descripción',
                    posterUrl: item['Portada'] || '',
                    sliderUrl: item['Slider'] || '',
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
                    audioList: item['Audios'] ? item['Audios'].split(',').map(a => a.trim()) : [],
                    subtitleList: item['Subtítulos'] ? item['Subtítulos'].split(',').map(s => s.trim()) : [],
                    audiosCount: item['Audios'] ? item['Audios'].split(',').length : 0,
                    subtitlesCount: item['Subtítulos'] ? item['Subtítulos'].split(',').length : 0
                }));

            console.log(`📚 Datos cargados: ${movies.length} películas`);
            return movies;
        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            return [];
        }
    }

    // RENDERIZAR SLIDER COMPLETO
    function renderSlider(moviesData = []) {
        if (isDestroyed) return;
        
        console.log('🎬 Iniciando renderizado del slider...');
        
        const sliderWrapper = document.getElementById('slider-wrapper');
        if (!sliderWrapper) {
            console.error('❌ slider-wrapper no encontrado');
            return;
        }

        const movies = moviesData.length > 0 ? moviesData : slidesData;
        const selectedMovies = movies
            .sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0))
            .slice(0, 8);
        
        slidesData = selectedMovies;
        totalSlides = slidesData.length;
        
        if (totalSlides === 0) {
            console.error('❌ No hay slides para renderizar');
            return;
        }

        const dims = getSliderDimensions();
        
        // CONFIGURAR CONTENEDOR PRINCIPAL
        const container = sliderWrapper.parentElement;
        if (container) {
            container.style.cssText = `
                position: relative;
                width: 100vw;
                height: ${dims.slideHeight + (dims.isMobile ? 40 : 60)}px;
                overflow: hidden;
                margin: 0;
                padding: 0;
                display: block;
            `;
        }
        
        // CONFIGURAR WRAPPER DEL SLIDER
        const totalWidth = (dims.slideWidth + dims.gap) * totalSlides;
        sliderWrapper.style.cssText = `
            display: flex;
            position: relative;
            width: ${totalWidth}px;
            height: ${dims.slideHeight}px;
            padding-left: ${dims.containerPadding}px;
            margin-top: ${dims.isMobile ? '15px' : '25px'};
            transform: translateX(0px);
            transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            will-change: transform;
        `;
        
        // LIMPIAR Y CREAR SLIDES
        sliderWrapper.innerHTML = '';
        
        slidesData.forEach((movie, index) => {
            const slide = document.createElement('div');
            slide.className = 'slider-slide';
            slide.dataset.index = index;
            
            const imageUrl = movie.sliderUrl || `https://via.placeholder.com/${dims.slideWidth}x${dims.slideHeight}/333/fff?text=${encodeURIComponent(movie.title)}`;
            const mainGenre = movie.genre ? movie.genre.split(/[·,]/)[0].trim() : '';
            
            slide.style.cssText = `
                width: ${dims.slideWidth}px;
                height: ${dims.slideHeight}px;
                margin-right: ${dims.gap}px;
                position: relative;
                border-radius: 12px;
                overflow: hidden;
                cursor: pointer;
                box-shadow: 0 8px 25px rgba(0,0,0,0.4);
                transition: all 0.3s ease;
                flex-shrink: 0;
                background: #222;
                user-select: none;
                -webkit-user-select: none;
                -webkit-tap-highlight-color: transparent;
            `;
            
            slide.innerHTML = `
                <div style="width: 100%; height: 100%; overflow: hidden; border-radius: 12px;">
                    <img src="${imageUrl}" 
                         alt="${movie.title}" 
                         loading="${index === 0 ? 'eager' : 'lazy'}"
                         style="width: 100%; height: 100%; object-fit: cover; display: block;"
                         onerror="this.src='https://via.placeholder.com/${dims.slideWidth}x${dims.slideHeight}/333/fff?text=Error+Imagen'">
                </div>
                <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.85)); padding: ${dims.isMobile ? '12px' : '18px'}; color: white;">
                    <div style="font-size: ${dims.isMobile ? '1.1rem' : '1.3rem'}; font-weight: bold; margin-bottom: 6px; line-height: 1.2;">${movie.title}</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 6px; font-size: ${dims.isMobile ? '0.8rem' : '0.85rem'}; opacity: 0.9;">
                        ${movie.year ? `<span>${movie.year}</span>` : ''}
                        ${movie.duration ? `<span>${movie.duration}</span>` : ''}
                        ${mainGenre ? `<span>${mainGenre}</span>` : ''}
                        ${movie.rating ? `<span>⭐ ${movie.rating}</span>` : ''}
                    </div>
                    <div style="font-size: ${dims.isMobile ? '0.75rem' : '0.8rem'}; line-height: 1.3; opacity: 0.8; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${movie.description || 'Sin descripción disponible'}</div>
                </div>
            `;

            // SOLO HOVER EN DESKTOP NO TÁCTIL
            if (!isTouchDevice() && !dims.isMobile && !dims.isTablet) {
                slide.onmouseenter = () => {
                    if (!isTransitioning && !isDragging) {
                        slide.style.transform = 'scale(1.04)';
                        slide.style.boxShadow = '0 15px 40px rgba(0,0,0,0.6)';
                    }
                };
                slide.onmouseleave = () => {
                    if (!isTransitioning && !isDragging) {
                        slide.style.transform = 'scale(1)';
                        slide.style.boxShadow = '0 8px 25px rgba(0,0,0,0.4)';
                    }
                };
            }

            // EVENTO CLICK PARA ABRIR MODAL
            slide.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('🎬 Click en:', movie.title);
                
                if (!isTransitioning && !isDragging) {
                    let modalOpened = false;
                    
                    // Intentar abrir modal de múltiples formas
                    const modalMethods = [
                        () => window.openDetailsModal && window.openDetailsModal(movie),
                        () => openDetailsModal && openDetailsModal(movie),
                        () => window.parent?.openDetailsModal && window.parent.openDetailsModal(movie)
                    ];
                    
                    for (const method of modalMethods) {
                        try {
                            if (method()) {
                                modalOpened = true;
                                console.log('✅ Modal abierto');
                                break;
                            }
                        } catch (error) {
                            console.log('⚠️ Método de modal falló:', error);
                        }
                    }
                    
                    // Fallback con eventos personalizados
                    if (!modalOpened) {
                        console.log('📡 Enviando eventos personalizados...');
                        
                        ['movieClick', 'slideClick', 'openModal'].forEach(eventName => {
                            const event = new CustomEvent(eventName, { 
                                detail: movie, 
                                bubbles: true,
                                cancelable: true
                            });
                            document.dispatchEvent(event);
                        });
                        
                        // Último recurso: mostrar info
                        setTimeout(() => {
                            const info = `🎬 ${movie.title}\n📅 ${movie.year}\n⭐ ${movie.rating}\n🎭 ${movie.genre}\n\n📝 ${movie.description}`;
                            alert(info);
                        }, 100);
                    }
                }
            };

            sliderWrapper.appendChild(slide);
        });

        // CONFIGURAR COMPONENTES
        setupNavigationButtons();
        setupPagination();
        setupTouchEvents();
        
        // POSICIÓN INICIAL
        currentIndex = 0;
        updateSliderPosition(false);
        
        console.log('✅ Slider renderizado completo:', { totalSlides, dims });
    }

    // NAVEGACIÓN
    function goToSlide(index) {
        if (isTransitioning || isDragging || totalSlides === 0) return;
        
        // Navegación circular
        if (index >= totalSlides) {
            currentIndex = 0;
        } else if (index < 0) {
            currentIndex = totalSlides - 1;
        } else {
            currentIndex = index;
        }
        
        updateSliderPosition(true);
        updatePagination();
        
        console.log(`🎯 Navegando a slide ${currentIndex}`);
    }

    // ACTUALIZAR PAGINACIÓN
    function updatePagination() {
        const dots = document.querySelectorAll('.slider-dot');
        dots.forEach((dot, index) => {
            dot.style.background = index === currentIndex 
                ? 'rgba(255, 255, 255, 0.9)' 
                : 'rgba(255, 255, 255, 0.4)';
        });
    }

    // MANEJAR RESIZE
    function handleResize() {
        if (isDestroyed) return;
        
        const currentWidth = window.innerWidth;
        if (Math.abs(currentWidth - lastViewportWidth) < 100) return;
        
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            console.log('🔄 Redimensionando slider...');
            renderSlider(slidesData);
        }, 250);
        
        lastViewportWidth = currentWidth;
    }

    // EVENTOS DE NAVEGACIÓN
    function setupNavigationEvents() {
        const prevBtn = document.getElementById('slider-prev');
        const nextBtn = document.getElementById('slider-next');
        
        if (prevBtn) {
            prevBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isTransitioning && !isDragging) {
                    goToSlide(currentIndex - 1);
                }
            };
        }
        
        if (nextBtn) {
            nextBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isTransitioning && !isDragging) {
                    goToSlide(currentIndex + 1);
                }
            };
        }
        
        console.log('✅ Eventos de navegación configurados');
    }

    // AUTOPLAY
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
                container.onmouseenter = stopAutoplay;
                container.onmouseleave = startAutoplay;
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
        console.log('⏯️ Autoplay configurado');
    }

    // INICIALIZACIÓN PRINCIPAL
    async function initSlider() {
        if (isDestroyed) return;
        
        console.log('🚀 Inicializando slider...');
        
        try {
            const moviesData = await loadSliderData();
            
            if (moviesData.length === 0) {
                console.warn('⚠️ No hay datos para mostrar');
                return;
            }
            
            renderSlider(moviesData);
            
            setTimeout(() => {
                setupNavigationEvents();
            }, 100);
            
            window.addEventListener('resize', handleResize);
            setupAutoplay();
            
            console.log('✅ Slider inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error durante inicialización:', error);
        }
    }

    // DESTRUIR SLIDER
    function destroySlider() {
        isDestroyed = true;
        
        clearTimeout(resizeTimeout);
        window.removeEventListener('resize', handleResize);
        
        const wrapper = document.getElementById('slider-wrapper');
        if (wrapper) {
            wrapper.innerHTML = '';
            wrapper.removeAttribute('style');
        }
        
        console.log('🗑️ Slider destruido');
    }

    // API PÚBLICA
    window.sliderAPI = {
        init: initSlider,
        destroy: destroySlider,
        goToSlide: goToSlide,
        next: () => goToSlide(currentIndex + 1),
        prev: () => goToSlide(currentIndex - 1),
        getCurrentIndex: () => currentIndex,
        getTotalSlides: () => totalSlides,
        isReady: () => !isDestroyed && totalSlides > 0
    };

    // AUTO-INICIALIZACIÓN
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSlider);
    } else {
        setTimeout(initSlider, 100);
    }

    console.log('📦 Slider script cargado');

})();