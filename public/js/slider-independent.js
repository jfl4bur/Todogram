// Slider Independiente - Corrección completa para móviles (iPhone incluido)
(function () {
    let currentIndex = 0;
    let totalSlides = 0;
    let isTransitioning = false;
    let resizeTimeout = null;
    let slidesData = [];
    let isDestroyed = false;
    let lastViewportWidth = 0;

    // Función mejorada para calcular dimensiones responsivas - CORREGIDA PARA MÓVILES
    function calculateResponsiveDimensions() {
        const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
        const actualViewportWidth = Math.min(viewportWidth, window.screen.width); // Usar el menor para móviles
        
        let slideWidth, slideHeight, slideGap, sideSpace;
        
        if (actualViewportWidth <= 480) {
            // Mobile: CORREGIDO - Asegurar que se vean los slides adyacentes
            const totalSideSpace = Math.floor(actualViewportWidth * 0.15); // 15% total para los lados
            sideSpace = Math.floor(totalSideSpace / 2); // Dividir entre ambos lados
            slideWidth = actualViewportWidth - (sideSpace * 2) - 20; // Restar espacios laterales y margen extra
            slideHeight = Math.floor(slideWidth * 0.5); // Proporción móvil
            slideGap = 12;
            
            // Asegurar mínimos para móvil
            if (sideSpace < 25) sideSpace = 25;
            if (slideWidth < 280) slideWidth = 280;
            
            console.log('Mobile calc:', { actualViewportWidth, sideSpace, slideWidth, slideHeight });
        } else if (actualViewportWidth <= 768) {
            // Tablet
            slideWidth = Math.floor(actualViewportWidth * 0.75);
            slideHeight = Math.floor(slideWidth * 0.45);
            slideGap = 15;
            sideSpace = Math.floor((actualViewportWidth - slideWidth) / 2);
        } else if (actualViewportWidth <= 1024) {
            // Desktop pequeño
            slideWidth = Math.floor(actualViewportWidth * 0.85);
            slideHeight = Math.floor(slideWidth * 0.38);
            slideGap = 16;
            sideSpace = Math.floor((actualViewportWidth - slideWidth) / 2);
        } else if (actualViewportWidth <= 1400) {
            // Desktop mediano
            slideWidth = Math.floor(actualViewportWidth * 0.88);
            slideHeight = Math.floor(slideWidth * 0.35);
            slideGap = 20;
            sideSpace = Math.floor((actualViewportWidth - slideWidth) / 2);
        } else {
            // Desktop grande
            slideWidth = Math.floor(actualViewportWidth * 0.90);
            slideHeight = Math.floor(slideWidth * 0.32);
            slideGap = 24;
            sideSpace = Math.floor((actualViewportWidth - slideWidth) / 2);
        }
        
        // Límites finales
        slideWidth = Math.max(280, Math.min(slideWidth, 1600));
        slideHeight = Math.max(140, Math.min(slideHeight, 400));
        slideGap = Math.max(8, slideGap);
        sideSpace = Math.max(20, sideSpace);
        
        console.log('Slider: Dimensiones finales -', {
            viewportWidth: actualViewportWidth,
            slideWidth,
            slideHeight,
            slideGap,
            sideSpace,
            percentage: Math.round((slideWidth / actualViewportWidth) * 100) + '%'
        });
        
        return { slideWidth, slideHeight, slideGap, sideSpace, viewportWidth: actualViewportWidth };
    }

    // Función para detectar dispositivos móviles reales
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (window.innerWidth <= 768 && 'ontouchstart' in window);
    }

    // Función mejorada para manejar el resize
    function handleResize() {
        if (isDestroyed) return;
        
        const currentViewportWidth = document.documentElement.clientWidth || window.innerWidth;
        
        // En móviles, ser más sensible a los cambios
        const threshold = isMobileDevice() ? 10 : 20;
        if (Math.abs(currentViewportWidth - lastViewportWidth) < threshold) {
            return;
        }
        
        clearTimeout(resizeTimeout);
        
        console.log('Slider: Resize detectado -', {
            anterior: lastViewportWidth,
            actual: currentViewportWidth,
            isMobile: isMobileDevice()
        });
        
        // Deshabilitar transiciones durante el resize
        const wrapper = document.getElementById('slider-wrapper');
        if (wrapper) {
            wrapper.style.transition = 'none';
        }
        
        // Aplicar cambios inmediatamente
        updateSliderCSSVariables();
        updateSliderLayout(true);
        
        // Actualización con debounce más rápido en móviles
        const debounceTime = isMobileDevice() ? 100 : 150;
        resizeTimeout = setTimeout(() => {
            if (isDestroyed || totalSlides === 0) return;
            
            console.log('Slider: Aplicando resize definitivo');
            forceCompleteRecalculation();
            
            // Verificar integridad después de un momento
            setTimeout(() => {
                if (!isDestroyed) {
                    verifySliderIntegrity();
                    // Reactivar transiciones
                    if (wrapper) {
                        wrapper.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                    }
                }
            }, 50);
            
        }, debounceTime);
        
        lastViewportWidth = currentViewportWidth;
    }

    // Función mejorada para forzar recálculo completo
    function forceCompleteRecalculation() {
        console.log('Slider: Forzando recálculo completo');
        
        const wrapper = document.getElementById('slider-wrapper');
        const slides = document.querySelectorAll('.slider-slide');
        
        if (!wrapper || slides.length === 0) {
            console.warn('Slider: No se encontraron elementos para recalcular');
            return;
        }
        
        // Obtener nuevas dimensiones responsivas
        const dimensions = calculateResponsiveDimensions();
        
        console.log('Slider: Nuevas dimensiones calculadas -', dimensions);
        
        // Forzar actualización de variables CSS
        const root = document.documentElement;
        root.style.setProperty('--slider-slide-width', `${dimensions.slideWidth}px`);
        root.style.setProperty('--slider-slide-height', `${dimensions.slideHeight}px`);
        root.style.setProperty('--slider-slide-gap', `${dimensions.slideGap}px`);
        root.style.setProperty('--slider-side-space', `${dimensions.sideSpace}px`);
        
        // CORRECCIÓN CRÍTICA: Configurar el contenedor padre correctamente
        const sliderContainer = wrapper.parentElement;
        if (sliderContainer) {
            sliderContainer.style.width = '100%';
            sliderContainer.style.overflow = 'hidden';
            sliderContainer.style.position = 'relative';
        }
        
        // Aplicar nuevas dimensiones a todos los slides
        slides.forEach((slide, index) => {
            // Limpiar estilos previos
            slide.style.width = '';
            slide.style.height = '';
            slide.style.flexBasis = '';
            slide.style.marginRight = '';
            
            // Forzar reflow
            slide.offsetHeight;
            
            // Aplicar nuevas dimensiones
            slide.style.width = `${dimensions.slideWidth}px`;
            slide.style.height = `${dimensions.slideHeight}px`;
            slide.style.flexBasis = `${dimensions.slideWidth}px`;
            slide.style.marginRight = index < slides.length - 1 ? `${dimensions.slideGap}px` : '0';
            slide.style.flexShrink = '0';
            slide.style.flexGrow = '0';
            
            // Ajustar imagen dentro del slide
            const img = slide.querySelector('.slider-img-wrapper img');
            if (img) {
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'fill';
                img.style.objectPosition = 'center';
            }
            
            console.log(`Slider: Slide ${index} redimensionado a ${dimensions.slideWidth}x${dimensions.slideHeight}px`);
        });
        
        // CORRECCIÓN CRÍTICA: Posicionamiento del wrapper
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'row';
        wrapper.style.flexWrap = 'nowrap';
        wrapper.style.position = 'relative';
        wrapper.style.left = '0px';
        wrapper.style.marginLeft = `${dimensions.sideSpace}px`;
        wrapper.style.width = 'auto'; // Importante para móviles
        
        // Actualizar posición del slider
        updateSliderPosition(true);
        
        console.log('Slider: Recálculo completo finalizado');
    }

    // Función mejorada para actualizar variables CSS - CORREGIDA PARA MÓVILES
    function updateSliderCSSVariables() {
        if (isDestroyed) return;
        
        const dimensions = calculateResponsiveDimensions();
        const isMobile = isMobileDevice();
        
        // Calcular offset de botones CORREGIDO para móviles
        let navBtnOffset;
        if (dimensions.viewportWidth <= 480) {
            // En móvil: botones más cerca del slide pero sin solaparse
            navBtnOffset = Math.max(8, Math.floor(dimensions.sideSpace * 0.3));
        } else {
            // En desktop: mantener posición exterior
            navBtnOffset = Math.max(10, Math.floor(dimensions.sideSpace * 0.4));
        }

        // Actualizar variables CSS
        const root = document.documentElement;
        root.style.setProperty('--slider-slide-width', `${dimensions.slideWidth}px`);
        root.style.setProperty('--slider-slide-height', `${dimensions.slideHeight}px`);
        root.style.setProperty('--slider-slide-gap', `${dimensions.slideGap}px`);
        root.style.setProperty('--slider-side-space', `${dimensions.sideSpace}px`);
        root.style.setProperty('--slider-nav-btn-offset', `${navBtnOffset}px`);

        // CORRECCIÓN CRÍTICA: Prevenir scroll horizontal especialmente en móviles
        document.body.style.overflowX = 'hidden';
        document.documentElement.style.overflowX = 'hidden';
        
        // Estilo adicional para móviles
        if (isMobile) {
            document.body.style.touchAction = 'pan-y pinch-zoom';
        }
        
        console.log('Slider: Variables CSS actualizadas -', {
            ...dimensions,
            navBtnOffset,
            isMobile
        });
    }

    // Función mejorada para verificar integridad - ESPECIAL PARA MÓVILES
    function verifySliderIntegrity() {
        if (isDestroyed) return;
        
        const wrapper = document.getElementById('slider-wrapper');
        const slides = document.querySelectorAll('.slider-slide');
        
        if (!wrapper || slides.length === 0) {
            console.warn('Slider: Verificación falló - elementos no encontrados');
            return;
        }
        
        const dimensions = calculateResponsiveDimensions();
        const isMobile = isMobileDevice();
        let needsCorrection = false;
        let issues = [];
        
        // Verificar cada slide con tolerancia mayor en móviles
        const tolerance = isMobile ? 15 : 10;
        slides.forEach((slide, index) => {
            const currentWidth = parseInt(slide.style.width) || 0;
            const currentHeight = parseInt(slide.style.height) || 0;
            const widthDifference = Math.abs(currentWidth - dimensions.slideWidth);
            const heightDifference = Math.abs(currentHeight - dimensions.slideHeight);
            
            if (widthDifference > tolerance || heightDifference > tolerance) {
                needsCorrection = true;
                issues.push(`Slide ${index}: actual ${currentWidth}x${currentHeight}px, esperado ${dimensions.slideWidth}x${dimensions.slideHeight}px`);
            }
        });
        
        // Verificar posición del wrapper
        const currentMarginLeft = parseInt(wrapper.style.marginLeft) || 0;
        const marginDifference = Math.abs(currentMarginLeft - dimensions.sideSpace);
        
        if (marginDifference > tolerance) {
            needsCorrection = true;
            issues.push(`Wrapper marginLeft: actual ${currentMarginLeft}px, esperado ${dimensions.sideSpace}px`);
        }
        
        // Verificación especial para móviles: asegurar que los slides adyacentes son visibles
        if (isMobile && slides.length > 0) {
            const firstSlide = slides[0];
            const slideRect = firstSlide.getBoundingClientRect();
            const containerWidth = dimensions.viewportWidth;
            
            // Verificar que hay espacio para mostrar slides adyacentes
            const leftSpace = slideRect.left;
            const rightSpace = containerWidth - slideRect.right;
            
            if (leftSpace < 20 || rightSpace < 20) {
                needsCorrection = true;
                issues.push(`Espacios adyacentes insuficientes: izq=${leftSpace}px, der=${rightSpace}px`);
            }
        }
        
        if (needsCorrection) {
            console.warn('Slider: Problemas de integridad detectados:', issues);
            console.log('Slider: Aplicando corrección automática');
            forceCompleteRecalculation();
        } else {
            console.log('Slider: Verificación de integridad OK');
        }
    }

    // Función mejorada para actualizar posición
    function updateSliderPosition(forceUpdate = false) {
        if (isDestroyed) return;
        
        const wrapper = document.getElementById('slider-wrapper');
        if (!wrapper) {
            console.warn('Slider: Wrapper no encontrado para actualizar posición');
            return;
        }
        
        if (!forceUpdate) {
            isTransitioning = true;
        }
        
        // Obtener dimensiones actuales
        const dimensions = calculateResponsiveDimensions();
        
        // Calcular posición
        const translateX = -(dimensions.slideWidth + dimensions.slideGap) * currentIndex;
        wrapper.style.transform = `translateX(${translateX}px)`;
        
        console.log('Slider: Posición actualizada -', {
            index: currentIndex,
            translateX,
            slideWidth: dimensions.slideWidth,
            slideGap: dimensions.slideGap,
            forceUpdate
        });
        
        if (!forceUpdate) {
            setTimeout(() => {
                isTransitioning = false;
            }, 600);
        }
    }

    // Cargar datos (sin cambios)
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

    // Función mejorada para renderizar slider - OPTIMIZADA PARA MÓVILES
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
        
        console.log('Slider: Películas seleccionadas:', selectedMovies.length);

        slidesData = selectedMovies;
        totalSlides = slidesData.length;
        
        if (totalSlides === 0) {
            console.error('Slider: No hay slides para renderizar');
            return;
        }

        // Detectar si es móvil
        const isMobile = isMobileDevice();
        console.log('Slider: Dispositivo móvil detectado:', isMobile);

        // Guardar viewport actual
        lastViewportWidth = document.documentElement.clientWidth || window.innerWidth;
        
        // Aplicar variables CSS antes de crear slides
        updateSliderCSSVariables();
        const dimensions = calculateResponsiveDimensions();
        
        // CORRECCIÓN CRÍTICA: Configurar contenedor padre
        const sliderContainer = sliderWrapper.parentElement;
        if (sliderContainer) {
            sliderContainer.style.width = '100%';
            sliderContainer.style.overflow = 'hidden';
            sliderContainer.style.position = 'relative';
            
            if (isMobile) {
                sliderContainer.style.touchAction = 'pan-y pinch-zoom';
            }
        }
        
        // Limpiar wrapper
        sliderWrapper.innerHTML = '';
        
        // CONFIGURACIÓN MEJORADA DEL WRAPPER PARA MÓVILES
        sliderWrapper.style.display = 'flex';
        sliderWrapper.style.flexDirection = 'row';
        sliderWrapper.style.flexWrap = 'nowrap';
        sliderWrapper.style.transform = 'translateX(0)';
        sliderWrapper.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        sliderWrapper.style.position = 'relative';
        sliderWrapper.style.left = '0px';
        sliderWrapper.style.marginLeft = `${dimensions.sideSpace}px`;
        sliderWrapper.style.width = 'auto'; // Crítico para móviles
        sliderWrapper.style.willChange = 'transform'; // Optimización para móviles
        
        console.log('Slider: Creando slides con dimensiones:', dimensions);
        
        // Crear slides con optimizaciones para móviles
        slidesData.forEach((movie, index) => {
            const slideDiv = document.createElement('div');
            slideDiv.className = 'slider-slide';
            slideDiv.dataset.index = index;
            
            // Aplicar estilos con optimizaciones para móviles
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
            
            // Optimizaciones específicas para móviles
            if (isMobile) {
                slideDiv.style.webkitTransform = 'translateZ(0)'; // Activar aceleración por hardware
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
                         style="width: 100%; height: 100%; object-fit: fill; object-position: center; transition: transform 0.3s ease;"
                         onerror="this.src='https://via.placeholder.com/${dimensions.slideWidth}x${dimensions.slideHeight}/333/fff?text=No+Image'">
                </div>
                <div class="slider-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.8)); padding: ${isMobile ? '15px' : '20px'}; color: white; border-radius: 0 0 12px 12px;">
                    <div class="slider-title-movie" style="font-size: ${isMobile ? 'clamp(0.9rem, 4vw, 1.2rem)' : 'clamp(1rem, 2.5vw, 1.5rem)'}; font-weight: bold; margin-bottom: 8px; line-height: 1.2;">${movie.title || 'Sin título'}</div>
                    <div class="slider-meta" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; font-size: ${isMobile ? 'clamp(0.7rem, 3vw, 0.8rem)' : 'clamp(0.75rem, 2vw, 0.9rem)'}; opacity: 0.9;">
                        ${movie.year ? `<span>${movie.year}</span>` : ''}
                        ${movie.duration ? `<span>${movie.duration}</span>` : ''}
                        ${mainGenre ? `<span>${mainGenre}</span>` : ''}
                        ${movie.rating ? `<span><i class="fas fa-star" style="color: #ffd700; margin-right: 4px;"></i>${movie.rating}</span>` : ''}
                    </div>
                    <div class="slider-description" style="font-size: ${isMobile ? 'clamp(0.65rem, 2.5vw, 0.75rem)' : 'clamp(0.7rem, 1.8vw, 0.85rem)'}; line-height: 1.4; opacity: 0.85; display: -webkit-box; -webkit-line-clamp: ${isMobile ? '2' : '2'}; -webkit-box-orient: vertical; overflow: hidden;">${movie.description || movie.synopsis || 'Sin descripción disponible'}</div>
                </div>
            `;

            // Efectos optimizados para móviles
            if (!isMobile) {
                slideDiv.addEventListener('mouseenter', () => {
                    if (!isTransitioning) {
                        slideDiv.style.transform = 'scale(1.05)';
                        slideDiv.style.boxShadow = '0 8px 30px rgba(0,0,0,0.4)';
                        const img = slideDiv.querySelector('img');
                        if (img) img.style.transform = 'scale(1.1)';
                    }
                });

                slideDiv.addEventListener('mouseleave', () => {
                    if (!isTransitioning) {
                        slideDiv.style.transform = 'scale(1)';
                        slideDiv.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
                        const img = slideDiv.querySelector('img');
                        if (img) img.style.transform = 'scale(1)';
                    }
                });
            }

            // Click handler optimizado
            slideDiv.addEventListener('click', (e) => {
                if (!isTransitioning) {
                    e.preventDefault();
                    console.log('Slider: Click en slide:', movie.title);
                    openDetailsModal(movie, slideDiv);
                }
            });

            sliderWrapper.appendChild(slideDiv);
        });

        // Configurar controles
        setupControls();
        
        // Posicionar slider
        currentIndex = 0;
        updateSliderPosition(true);
        updatePagination();
        
        console.log('Slider: Renderizado completado para dispositivo', isMobile ? 'móvil' : 'desktop');
        
        // Verificación final más rápida en móviles
        setTimeout(() => {
            if (!isDestroyed) {
                verifySliderIntegrity();
            }
        }, isMobile ? 100 : 200);
    }

    // Configurar controles (sin cambios significativos)
    function setupControls() {
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

        createPagination();
    }

    // Crear paginación (sin cambios)
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

    // Ir a slide (sin cambios)
    function goToSlide(index) {
        if (isTransitioning || totalSlides === 0 || isDestroyed) return;
        
        if (index < 0) index = totalSlides - 1;
        if (index >= totalSlides) index = 0;
        
        if (index === currentIndex) return;
        
        console.log('Slider: Cambiando a slide', index);
        
        currentIndex = index;
        updateSliderPosition();
        updatePagination();
    }

    // Actualizar paginación (sin cambios)
    function updatePagination() {
        const dots = document.querySelectorAll('.slider-pagination-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
        });
    }

    // Función para abrir modal (sin cambios)
    function openDetailsModal(movie, element) {
        if (typeof window.openMovieModal === 'function') {
            window.openMovieModal(movie, element);
        } else {
            console.warn('Slider: openMovieModal no está disponible');
        }
    }

    // Función mejorada para actualizar layout - CRÍTICA PARA MÓVILES
    function updateSliderLayout(forceRecalculation = false) {
        if (isDestroyed || totalSlides === 0) return;
        
        const wrapper = document.getElementById('slider-wrapper');
        const slides = document.querySelectorAll('.slider-slide');
        
        if (!wrapper || slides.length === 0) return;
        
        const isMobile = isMobileDevice();
        const dimensions = calculateResponsiveDimensions();
        
        console.log('Slider: Actualizando layout -', {
            isMobile,
            dimensions,
            forceRecalculation
        });
        
        // CORRECCIÓN CRÍTICA: Asegurar que los slides adyacentes sean visibles en móviles
        if (isMobile) {
            // Calcular el espacio total disponible
            const totalAvailableWidth = dimensions.viewportWidth;
            const slideWithGap = dimensions.slideWidth + dimensions.slideGap;
            
            // Verificar si el slide actual más partes de los adyacentes caben
            const leftSpace = dimensions.sideSpace;
            const rightSpace = dimensions.sideSpace;
            const centerSlideSpace = dimensions.slideWidth;
            const requiredSpace = leftSpace + centerSlideSpace + rightSpace;
            
            if (requiredSpace > totalAvailableWidth) {
                // Ajustar dimensiones para móvil
                const newSideSpace = Math.floor(totalAvailableWidth * 0.12); // 12% cada lado
                const newSlideWidth = totalAvailableWidth - (newSideSpace * 2) - 10;
                
                console.log('Slider: Ajustando para móvil -', {
                    original: dimensions,
                    nuevo: { sideSpace: newSideSpace, slideWidth: newSlideWidth }
                });
                
                // Actualizar variables CSS
                const root = document.documentElement;
                root.style.setProperty('--slider-slide-width', `${newSlideWidth}px`);
                root.style.setProperty('--slider-side-space', `${newSideSpace}px`);
                
                // Aplicar a wrapper
                wrapper.style.marginLeft = `${newSideSpace}px`;
                
                // Aplicar a slides
                slides.forEach((slide, index) => {
                    slide.style.width = `${newSlideWidth}px`;
                    slide.style.flexBasis = `${newSlideWidth}px`;
                });
            }
        }
        
        // Posicionar correctamente
        updateSliderPosition(true);
    }

    // NUEVA FUNCIÓN: Detectar cambios de orientación en móviles
    function handleOrientationChange() {
        if (!isMobileDevice()) return;
        
        console.log('Slider: Cambio de orientación detectado');
        
        // Esperar a que se complete el cambio de orientación
        setTimeout(() => {
            if (!isDestroyed) {
                lastViewportWidth = 0; // Forzar recálculo
                handleResize();
            }
        }, 500);
    }

    // NUEVA FUNCIÓN: Optimizar navegación táctil
    function setupTouchNavigation() {
        const wrapper = document.getElementById('slider-wrapper');
        if (!wrapper || !isMobileDevice()) return;
        
        let startX = 0;
        let currentX = 0;
        let isMoving = false;
        const threshold = 50; // Mínimo deslizamiento
        
        wrapper.addEventListener('touchstart', (e) => {
            if (isTransitioning) return;
            startX = e.touches[0].clientX;
            isMoving = true;
        });
        
        wrapper.addEventListener('touchmove', (e) => {
            if (!isMoving || isTransitioning) return;
            currentX = e.touches[0].clientX;
            e.preventDefault(); // Prevenir scroll
        });
        
        wrapper.addEventListener('touchend', (e) => {
            if (!isMoving || isTransitioning) return;
            
            const diffX = startX - currentX;
            
            if (Math.abs(diffX) > threshold) {
                if (diffX > 0) {
                    // Deslizar hacia la izquierda - siguiente slide
                    goToSlide(currentIndex + 1);
                } else {
                    // Deslizar hacia la derecha - slide anterior
                    goToSlide(currentIndex - 1);
                }
            }
            
            isMoving = false;
        });
    }

    // NUEVA FUNCIÓN: Ajustar posición de controles para móviles
    function adjustMobileControls() {
        if (!isMobileDevice()) return;
        
        const prevBtn = document.getElementById('slider-prev');
        const nextBtn = document.getElementById('slider-next');
        const pagination = document.getElementById('slider-pagination');
        
        if (prevBtn && nextBtn) {
            // Mover botones hacia abajo en móviles
            prevBtn.style.bottom = '60px';
            nextBtn.style.bottom = '60px';
            prevBtn.style.top = 'auto';
            nextBtn.style.top = 'auto';
            
            // Hacer botones más grandes en móviles
            [prevBtn, nextBtn].forEach(btn => {
                btn.style.width = '50px';
                btn.style.height = '50px';
                btn.style.fontSize = '20px';
            });
        }
        
        if (pagination) {
            // Asegurar que la paginación esté visible
            pagination.style.bottom = '15px';
            pagination.style.zIndex = '1000';
        }
    }

    // Función mejorada de inicialización - VERSIÓN COMPLETA PARA MÓVILES
    async function initializeSlider() {
        if (isDestroyed) return;
        
        console.log('Slider: Inicializando slider independiente...');
        
        try {
            // Cargar datos
            const movies = await loadSliderData();
            if (movies.length === 0) {
                console.warn('Slider: No se encontraron películas para mostrar');
                return;
            }
            
            // Detectar dispositivo
            const isMobile = isMobileDevice();
            console.log('Slider: Dispositivo detectado -', isMobile ? 'Móvil' : 'Desktop');
            
            // Configurar eventos específicos para móviles
            if (isMobile) {
                // Escuchar cambios de orientación
                window.addEventListener('orientationchange', handleOrientationChange);
                
                // Configurar meta viewport si no existe
                let viewportMeta = document.querySelector('meta[name="viewport"]');
                if (!viewportMeta) {
                    viewportMeta = document.createElement('meta');
                    viewportMeta.name = 'viewport';
                    viewportMeta.content = 'width=device-width, initial-scale=1.0, user-scalable=no';
                    document.head.appendChild(viewportMeta);
                }
                
                // Prevenir zoom accidental
                document.addEventListener('gesturestart', (e) => e.preventDefault());
            }
            
            // Renderizar slider
            renderSlider(movies);
            
            // Configurar navegación táctil
            setupTouchNavigation();
            
            // Ajustar controles para móviles
            adjustMobileControls();
            
            // Configurar resize listener
            window.addEventListener('resize', handleResize);
            
            // Verificación inicial
            setTimeout(() => {
                if (!isDestroyed) {
                    verifySliderIntegrity();
                    console.log('Slider: Inicialización completada exitosamente');
                }
            }, 300);
            
        } catch (error) {
            console.error('Slider: Error durante la inicialización:', error);
        }
    }

    // Función de limpieza mejorada
    function destroySlider() {
        console.log('Slider: Destruyendo slider...');
        
        isDestroyed = true;
        
        // Limpiar timers
        if (resizeTimeout) {
            clearTimeout(resizeTimeout);
            resizeTimeout = null;
        }
        
        // Remover event listeners
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleOrientationChange);
        
        // Limpiar datos
        slidesData = [];
        totalSlides = 0;
        currentIndex = 0;
        
        console.log('Slider: Destrucción completada');
    }

    // Auto-inicialización mejorada
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSlider);
    } else {
        // Si el DOM ya está cargado, esperar un momento para asegurar que todos los elementos estén disponibles
        setTimeout(initializeSlider, 100);
    }

    // Exportar funciones públicas
    window.SliderManager = {
        init: initializeSlider,
        destroy: destroySlider,
        goToSlide: goToSlide,
        refresh: () => {
            if (!isDestroyed) {
                forceCompleteRecalculation();
            }
        },
        getCurrentIndex: () => currentIndex,
        getTotalSlides: () => totalSlides,
        isMobile: isMobileDevice
    };

    console.log('Slider: Script independiente cargado y listo');

})();