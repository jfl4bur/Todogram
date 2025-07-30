// Slider Independiente - Corrección COMPLETA para móviles (iPhone incluido)
(function () {
    let currentIndex = 0;
    let totalSlides = 0;
    let isTransitioning = false;
    let resizeTimeout = null;
    let slidesData = [];
    let isDestroyed = false;
    let lastViewportWidth = 0;

    // Función CORREGIDA para calcular dimensiones responsivas
    function calculateResponsiveDimensions() {
        const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
        const actualViewportWidth = Math.min(viewportWidth, window.screen.width);
        
        let slideWidth, slideHeight, slideGap, sideSpace, adjacentVisible;
        
        if (actualViewportWidth <= 480) {
            // Mobile: Mostrar ~40px de items adyacentes
            adjacentVisible = 40;
            const totalAdjacent = adjacentVisible * 2; // Ambos lados
            const availableForSlide = actualViewportWidth - totalAdjacent - 40; // Margen extra
            slideWidth = Math.max(280, availableForSlide);
            slideHeight = Math.floor(slideWidth * 0.56); // Proporción móvil
            slideGap = 12;
            sideSpace = adjacentVisible + 10; // Espacio para mostrar adyacentes + padding
            
            console.log('Mobile calc:', { 
                actualViewportWidth, 
                adjacentVisible, 
                slideWidth, 
                slideHeight, 
                sideSpace 
            });
        } else if (actualViewportWidth <= 768) {
            // Tablet: Mostrar ~50px de items adyacentes
            adjacentVisible = 50;
            const totalAdjacent = adjacentVisible * 2;
            const availableForSlide = actualViewportWidth - totalAdjacent - 50;
            slideWidth = Math.max(320, availableForSlide);
            slideHeight = Math.floor(slideWidth * 0.5);
            slideGap = 15;
            sideSpace = adjacentVisible + 15;
        } else if (actualViewportWidth <= 1024) {
            // Desktop pequeño: Mostrar ~55px de items adyacentes
            adjacentVisible = 55;
            const totalAdjacent = adjacentVisible * 2;
            const availableForSlide = actualViewportWidth - totalAdjacent - 60;
            slideWidth = Math.max(400, availableForSlide);
            slideHeight = Math.floor(slideWidth * 0.45);
            slideGap = 16;
            sideSpace = adjacentVisible + 20;
        } else if (actualViewportWidth <= 1400) {
            // Desktop mediano: Mostrar ~55px de items adyacentes
            adjacentVisible = 55;
            const totalAdjacent = adjacentVisible * 2;
            const availableForSlide = actualViewportWidth - totalAdjacent - 80;
            slideWidth = Math.max(500, availableForSlide);
            slideHeight = Math.floor(slideWidth * 0.4);
            slideGap = 20;
            sideSpace = adjacentVisible + 25;
        } else {
            // Desktop grande: Mostrar ~55px de items adyacentes
            adjacentVisible = 55;
            const totalAdjacent = adjacentVisible * 2;
            const availableForSlide = actualViewportWidth - totalAdjacent - 100;
            slideWidth = Math.max(600, availableForSlide);
            slideHeight = Math.floor(slideWidth * 0.38);
            slideGap = 24;
            sideSpace = adjacentVisible + 30;
        }
        
        // Límites de seguridad
        slideWidth = Math.max(280, Math.min(slideWidth, 1200));
        slideHeight = Math.max(140, Math.min(slideHeight, 380));
        slideGap = Math.max(8, slideGap);
        sideSpace = Math.max(30, sideSpace);
        
        console.log('Slider: Dimensiones calculadas -', {
            viewportWidth: actualViewportWidth,
            slideWidth,
            slideHeight,
            slideGap,
            sideSpace,
            adjacentVisible,
            totalUsed: (sideSpace * 2) + slideWidth
        });
        
        return { slideWidth, slideHeight, slideGap, sideSpace, viewportWidth: actualViewportWidth };
    }

    // Función para detectar dispositivos móviles
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (window.innerWidth <= 768 && 'ontouchstart' in window);
    }

    // Función para manejar el resize
    function handleResize() {
        if (isDestroyed) return;
        
        const currentViewportWidth = document.documentElement.clientWidth || window.innerWidth;
        const threshold = isMobileDevice() ? 15 : 20;
        
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
        
        updateSliderCSSVariables();
        
        const debounceTime = isMobileDevice() ? 120 : 150;
        resizeTimeout = setTimeout(() => {
            if (isDestroyed || totalSlides === 0) return;
            
            console.log('Slider: Aplicando resize definitivo');
            forceCompleteRecalculation();
            
            setTimeout(() => {
                if (!isDestroyed && wrapper) {
                    wrapper.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                    verifySliderIntegrity();
                }
            }, 50);
            
        }, debounceTime);
        
        lastViewportWidth = currentViewportWidth;
    }

    // Función para forzar recálculo completo
    function forceCompleteRecalculation() {
        console.log('Slider: Forzando recálculo completo');
        
        const wrapper = document.getElementById('slider-wrapper');
        const slides = document.querySelectorAll('.slider-slide');
        
        if (!wrapper || slides.length === 0) {
            console.warn('Slider: No se encontraron elementos para recalcular');
            return;
        }
        
        const dimensions = calculateResponsiveDimensions();
        
        // Actualizar variables CSS
        const root = document.documentElement;
        root.style.setProperty('--slider-slide-width', `${dimensions.slideWidth}px`);
        root.style.setProperty('--slider-slide-height', `${dimensions.slideHeight}px`);
        root.style.setProperty('--slider-slide-gap', `${dimensions.slideGap}px`);
        root.style.setProperty('--slider-side-space', `${dimensions.sideSpace}px`);
        
        // Configurar contenedor padre
        const sliderContainer = wrapper.parentElement;
        if (sliderContainer) {
            sliderContainer.style.width = '100%';
            sliderContainer.style.overflow = 'hidden';
            sliderContainer.style.position = 'relative';
        }
        
        // Configurar wrapper
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'row';
        wrapper.style.flexWrap = 'nowrap';
        wrapper.style.position = 'relative';
        wrapper.style.left = '0px';
        wrapper.style.marginLeft = `${dimensions.sideSpace}px`;
        wrapper.style.width = 'auto';
        
        // Aplicar dimensiones a slides
        slides.forEach((slide, index) => {
            slide.style.width = `${dimensions.slideWidth}px`;
            slide.style.height = `${dimensions.slideHeight}px`;
            slide.style.flexBasis = `${dimensions.slideWidth}px`;
            slide.style.marginRight = index < slides.length - 1 ? `${dimensions.slideGap}px` : '0';
            slide.style.flexShrink = '0';
            slide.style.flexGrow = '0';
            
            // Ajustar imagen
            const img = slide.querySelector('.slider-img-wrapper img');
            if (img) {
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'fill';
            }
        });
        
        // Actualizar posición
        updateSliderPosition(true);
        
        console.log('Slider: Recálculo completo finalizado');
    }

    // Función CORREGIDA para actualizar variables CSS
    function updateSliderCSSVariables() {
        if (isDestroyed) return;
        
        const dimensions = calculateResponsiveDimensions();
        const isMobile = isMobileDevice();
        
        // CORRECCIÓN: Calcular offset de botones para que SIEMPRE estén a los lados
        let navBtnOffset;
        if (dimensions.viewportWidth <= 480) {
            // En móvil: botones pegados al borde de la pantalla
            navBtnOffset = 10;
        } else if (dimensions.viewportWidth <= 768) {
            navBtnOffset = 15;
        } else {
            navBtnOffset = 20;
        }

        const root = document.documentElement;
        root.style.setProperty('--slider-slide-width', `${dimensions.slideWidth}px`);
        root.style.setProperty('--slider-slide-height', `${dimensions.slideHeight}px`);
        root.style.setProperty('--slider-slide-gap', `${dimensions.slideGap}px`);
        root.style.setProperty('--slider-side-space', `${dimensions.sideSpace}px`);
        root.style.setProperty('--slider-nav-btn-offset', `${navBtnOffset}px`);

        // Prevenir scroll horizontal
        document.body.style.overflowX = 'hidden';
        document.documentElement.style.overflowX = 'hidden';
        
        if (isMobile) {
            document.body.style.touchAction = 'pan-y pinch-zoom';
        }
        
        console.log('Slider: Variables CSS actualizadas -', {
            ...dimensions,
            navBtnOffset,
            isMobile
        });
    }

    // Función para verificar integridad
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
        
        const tolerance = isMobile ? 20 : 15;
        
        slides.forEach((slide, index) => {
            const currentWidth = parseInt(slide.style.width) || 0;
            const currentHeight = parseInt(slide.style.height) || 0;
            const widthDifference = Math.abs(currentWidth - dimensions.slideWidth);
            const heightDifference = Math.abs(currentHeight - dimensions.slideHeight);
            
            if (widthDifference > tolerance || heightDifference > tolerance) {
                needsCorrection = true;
                issues.push(`Slide ${index}: ${currentWidth}x${currentHeight}px vs ${dimensions.slideWidth}x${dimensions.slideHeight}px`);
            }
        });
        
        const currentMarginLeft = parseInt(wrapper.style.marginLeft) || 0;
        const marginDifference = Math.abs(currentMarginLeft - dimensions.sideSpace);
        
        if (marginDifference > tolerance) {
            needsCorrection = true;
            issues.push(`Wrapper marginLeft: ${currentMarginLeft}px vs ${dimensions.sideSpace}px`);
        }
        
        if (needsCorrection) {
            console.warn('Slider: Problemas detectados:', issues);
            console.log('Slider: Aplicando corrección');
            forceCompleteRecalculation();
        } else {
            console.log('Slider: Verificación OK');
        }
    }

    // Función para actualizar posición
    function updateSliderPosition(forceUpdate = false) {
        if (isDestroyed) return;
        
        const wrapper = document.getElementById('slider-wrapper');
        if (!wrapper) return;
        
        if (!forceUpdate) {
            isTransitioning = true;
        }
        
        const dimensions = calculateResponsiveDimensions();
        const translateX = -(dimensions.slideWidth + dimensions.slideGap) * currentIndex;
        wrapper.style.transform = `translateX(${translateX}px)`;
        
        console.log('Slider: Posición actualizada -', {
            index: currentIndex,
            translateX,
            slideWidth: dimensions.slideWidth,
            slideGap: dimensions.slideGap
        });
        
        if (!forceUpdate) {
            setTimeout(() => {
                isTransitioning = false;
            }, 600);
        }
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

    // Función CORREGIDA para renderizar slider
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

        const isMobile = isMobileDevice();
        lastViewportWidth = document.documentElement.clientWidth || window.innerWidth;
        
        // Actualizar variables CSS primero
        updateSliderCSSVariables();
        const dimensions = calculateResponsiveDimensions();
        
        // Configurar contenedor padre
        const sliderContainer = sliderWrapper.parentElement;
        if (sliderContainer) {
            sliderContainer.style.width = '100%';
            sliderContainer.style.overflow = 'hidden';
            sliderContainer.style.position = 'relative';
            
            if (isMobile) {
                sliderContainer.style.touchAction = 'pan-y pinch-zoom';
            }
        }
        
        // Limpiar y configurar wrapper
        sliderWrapper.innerHTML = '';
        sliderWrapper.style.display = 'flex';
        sliderWrapper.style.flexDirection = 'row';
        sliderWrapper.style.flexWrap = 'nowrap';
        sliderWrapper.style.transform = 'translateX(0)';
        sliderWrapper.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        sliderWrapper.style.position = 'relative';
        sliderWrapper.style.left = '0px';
        sliderWrapper.style.marginLeft = `${dimensions.sideSpace}px`;
        sliderWrapper.style.width = 'auto';
        sliderWrapper.style.willChange = 'transform';
        
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
            
            if (isMobile) {
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
                    <div class="slider-description" style="font-size: ${isMobile ? 'clamp(0.65rem, 2.5vw, 0.75rem)' : 'clamp(0.7rem, 1.8vw, 0.85rem)'}; line-height: 1.4; opacity: 0.85; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${movie.description || movie.synopsis || 'Sin descripción disponible'}</div>
                </div>
            `;

            // Efectos hover solo en desktop
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

            slideDiv.addEventListener('click', (e) => {
                if (!isTransitioning) {
                    e.preventDefault();
                    console.log('Slider: Click en slide:', movie.title);
                    openDetailsModal(movie, slideDiv);
                }
            });

            sliderWrapper.appendChild(slideDiv);
        });

        setupControls();
        currentIndex = 0;
        updateSliderPosition(true);
        updatePagination();
        
        console.log('Slider: Renderizado completado');
        
        setTimeout(() => {
            if (!isDestroyed) {
                verifySliderIntegrity();
            }
        }, isMobile ? 150 : 200);
    }

    // NUEVA FUNCIÓN: Posicionar botones SIEMPRE a los lados
    function positionNavigationButtons() {
        const prevBtn = document.getElementById('slider-prev');
        const nextBtn = document.getElementById('slider-next');
        
        if (!prevBtn || !nextBtn) return;
        
        const isMobile = isMobileDevice();
        const dimensions = calculateResponsiveDimensions();
        
        // FORZAR posición a los lados SIEMPRE
        const buttonStyle = {
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: '1000',
            width: isMobile ? '45px' : '50px',
            height: isMobile ? '45px' : '50px',
            fontSize: isMobile ? '18px' : '20px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        };
        
        // Aplicar estilos base
        Object.assign(prevBtn.style, buttonStyle);
        Object.assign(nextBtn.style, buttonStyle);
        
        // Posicionar específicamente
        if (isMobile) {
            prevBtn.style.left = '15px';  // Pegado al borde izquierdo
            nextBtn.style.right = '15px'; // Pegado al borde derecho
        } else {
            prevBtn.style.left = '20px';
            nextBtn.style.right = '20px';
        }
        
        // Remover bottom para que no interfiera
        prevBtn.style.bottom = 'auto';
        nextBtn.style.bottom = 'auto';
        
        console.log('Slider: Botones posicionados a los lados -', {
            isMobile,
            leftPos: prevBtn.style.left,
            rightPos: nextBtn.style.right
        });
    }

    // Configurar controles con posicionamiento correcto
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

        // POSICIONAR BOTONES CORRECTAMENTE
        positionNavigationButtons();
        
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
        
        if (index < 0) index = totalSlides - 1;
        if (index >= totalSlides) index = 0;
        
        if (index === currentIndex) return;
        
        console.log('Slider: Cambiando a slide', index);
        
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

    // Abrir modal
    function openDetailsModal(movie, element) {
        if (typeof window.openMovieModal === 'function') {
            window.openMovieModal(movie, element);
        } else {
            console.warn('Slider: openMovieModal no está disponible');
        }
    }

// Detectar cambios de orientación
    function handleOrientationChange() {
        if (!isMobileDevice()) return;
        
        console.log('Slider: Cambio de orientación detectado');
        
        setTimeout(() => {
            if (!isDestroyed) {
                updateSliderCSSVariables();
                forceCompleteRecalculation();
            }
        }, 300);
    }

    // Limpiar slider
    function destroySlider() {
        console.log('Slider: Destruyendo...');
        
        isDestroyed = true;
        clearTimeout(resizeTimeout);
        
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleOrientationChange);
        
        const wrapper = document.getElementById('slider-wrapper');
        if (wrapper) {
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
            console.log('Slider: Reinicializando después de destrucción');
            isDestroyed = false;
        }
        
        console.log('Slider: Inicializando...');
        
        try {
            // Cargar datos
            const moviesData = await loadSliderData();
            if (moviesData.length === 0) {
                console.error('Slider: No se pudieron cargar los datos');
                return;
            }
            
            // Configurar event listeners
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleOrientationChange);
            
            window.addEventListener('resize', handleResize, { passive: true });
            window.addEventListener('orientationchange', handleOrientationChange, { passive: true });
            
            // Renderizar slider
            renderSlider(moviesData);
            
            // Verificación inicial
            setTimeout(() => {
                if (!isDestroyed) {
                    verifySliderIntegrity();
                    positionNavigationButtons();
                }
            }, 500);
            
            console.log('Slider: Inicialización completa');
            
        } catch (error) {
            console.error('Slider: Error en inicialización:', error);
        }
    }

    // Auto-inicialización cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSlider);
    } else {
        initSlider();
    }

    // Exponer funciones públicas
    window.sliderAPI = {
        init: initSlider,
        destroy: destroySlider,
        goToSlide: goToSlide,
        next: () => goToSlide(currentIndex + 1),
        prev: () => goToSlide(currentIndex - 1),
        getCurrentIndex: () => currentIndex,
        getTotalSlides: () => totalSlides,
        refresh: () => {
            updateSliderCSSVariables();
            forceCompleteRecalculation();
        }
    };

    console.log('Slider: Script cargado y listo');

})();