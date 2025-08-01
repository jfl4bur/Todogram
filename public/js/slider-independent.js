// Slider Independiente - Con detección automática de viewport mejorada (estilo Rakuten.tv)
(function () {
    let currentIndex = 0;
    let totalSlides = 0;
    let isTransitioning = false;
    let resizeTimeout = null;
    let slidesData = [];
    let isDestroyed = false;
    let lastViewportWidth = 0;
    let touchStartX = 0;
    let touchEndX = 0;
    let isDragging = false;
    let autoPlayInterval = null;

    // Función mejorada para calcular dimensiones responsivas (estilo Rakuten.tv)
    function calculateResponsiveDimensions() {
        const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
        
        // Detectar Safari para aplicar correcciones específicas
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || 
                        (navigator.userAgent.includes('Mac') && navigator.userAgent.includes('Safari'));
        
        // Calcular el ancho del slide para ocupar la mayor parte de la pantalla
        // dejando espacio para ver elementos adyacentes
        let slideWidth, slideHeight, slideGap, sideSpace;
        
        if (viewportWidth <= 480) {
            // Mobile: más estrecho para mejor visibilidad de adyacentes
            slideWidth = Math.floor(viewportWidth * 0.87);
            slideHeight = Math.floor(slideWidth * 0.18);
            slideGap = 8;
            sideSpace = Math.floor((viewportWidth - slideWidth) / 2);
        } else if (viewportWidth <= 768) {
            // Tablet: más estrecho para elementos adyacentes visibles
            slideWidth = Math.floor(viewportWidth * 0.87);
            slideHeight = Math.floor(slideWidth * 0.20);
            slideGap = 12;
            sideSpace = Math.floor((viewportWidth - slideWidth) / 2);
        } else if (viewportWidth <= 1024) {
            // Desktop pequeño: mayor visibilidad de elementos adyacentes
            slideWidth = Math.floor(viewportWidth * 0.87);
            slideHeight = Math.floor(slideWidth * 0.22);
            slideGap = 16;
            sideSpace = Math.floor((viewportWidth - slideWidth) / 2);
        } else if (viewportWidth <= 1400) {
            // Desktop mediano: muy ancho como Rakuten.tv
            slideWidth = Math.floor(viewportWidth * 0.87);
            slideHeight = Math.floor(slideWidth * 0.40);
            slideGap = 20;
            sideSpace = Math.floor((viewportWidth - slideWidth) / 2);
        } else {
            // Desktop grande: máximo ancho con elementos adyacentes
            slideWidth = Math.floor(viewportWidth * 0.92);
            slideHeight = Math.floor(slideWidth * 0.42);
            slideGap = 24;
            sideSpace = Math.floor((viewportWidth - slideWidth) / 2);
        }
        
        // Límites mínimos y máximos
        slideWidth = Math.max(300, Math.min(slideWidth, 1600));
        slideHeight = Math.max(120, Math.min(slideHeight, 400)); // Máximo 400px para desktop
        slideGap = Math.max(8, slideGap);
        sideSpace = Math.max(20, sideSpace);
        
        // Correcciones específicas para Safari
        if (isSafari) {
            // Safari tiene problemas con el cálculo de porcentajes, usar valores más conservadores
            slideWidth = Math.floor(slideWidth * 0.88); // Reducir ligeramente el ancho
            slideHeight = Math.floor(slideHeight * 0.99); // Reducir ligeramente la altura
            // Asegurar que el gap sea consistente
            slideGap = Math.max(slideGap, 10);
        }
        
        console.log('Slider: Dimensiones calculadas -', {
            viewportWidth,
            slideWidth,
            slideHeight,
            slideGap,
            sideSpace,
            percentage: Math.round((slideWidth / viewportWidth) * 100) + '%',
            isSafari
        });
        
        return { slideWidth, slideHeight, slideGap, sideSpace, viewportWidth, isSafari };
    }

    // Función mejorada para manejar el resize (optimizada)
    function handleResize() {
        if (isDestroyed) return;
        
        const currentViewportWidth = document.documentElement.clientWidth || window.innerWidth;
        
        // Solo proceder si hay un cambio significativo en el ancho
        if (Math.abs(currentViewportWidth - lastViewportWidth) < 20) {
            return;
        }
        
        clearTimeout(resizeTimeout);
        
        console.log('Slider: Resize detectado -', {
            anterior: lastViewportWidth,
            actual: currentViewportWidth
        });
        
        // Deshabilitar transiciones durante el resize
        const wrapper = document.getElementById('slider-wrapper');
        if (wrapper) {
            wrapper.style.transition = 'none';
        }
        
        // Aplicar cambios inmediatamente
        updateSliderCSSVariables();
        updateSliderLayout(true);
        
        // Actualización con debounce
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
            }, 100);
            
        }, 150);
        
        lastViewportWidth = currentViewportWidth;
    }

    // Nueva función para forzar recálculo completo
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
                img.style.objectFit = 'cover';
                img.style.objectPosition = 'center';
            }
            
            console.log(`Slider: Slide ${index} redimensionado a ${dimensions.slideWidth}x${dimensions.slideHeight}px`);
        });
        
        // Reposicionar el wrapper correctamente
        wrapper.style.marginLeft = `${dimensions.sideSpace}px`;
        wrapper.style.left = '0px';
        
        // Correcciones específicas para Safari
        if (dimensions.isSafari) {
            console.log('Slider: Aplicando correcciones específicas para Safari');
            
            // Aplicar correcciones específicas para Safari sin interferir con otros navegadores
            slides.forEach((slide, index) => {
                // Aplicar transformaciones 3D básicas
                slide.style.webkitTransform = 'translate3d(0,0,0)';
                slide.style.transform = 'translate3d(0,0,0)';
                
                // Ajustar dimensiones específicamente para Safari
                const currentWidth = parseInt(slide.style.width) || 0;
                const currentHeight = parseInt(slide.style.height) || 0;
                
                // Solo ajustar si las dimensiones son significativamente diferentes
                if (Math.abs(currentWidth - dimensions.slideWidth) > 20 || Math.abs(currentHeight - dimensions.slideHeight) > 20) {
                    slide.style.width = `${dimensions.slideWidth}px`;
                    slide.style.height = `${dimensions.slideHeight}px`;
                    slide.style.flexBasis = `${dimensions.slideWidth}px`;
                }
                
                const img = slide.querySelector('.slider-img-wrapper img');
                if (img) {
                    img.style.webkitTransform = 'translate3d(0,0,0)';
                    img.style.transform = 'translate3d(0,0,0)';
                    img.style.width = '100%';
                    img.style.height = '100%';
                }
            });
            
            // Ajustar posición del wrapper solo si es necesario
            const currentMarginLeft = parseInt(wrapper.style.marginLeft) || 0;
            if (Math.abs(currentMarginLeft - dimensions.sideSpace) > 20) {
                wrapper.style.marginLeft = `${dimensions.sideSpace}px`;
            }
            
            // Forzar reflow mínimo
            wrapper.offsetHeight;
        }
        
        // Actualizar posición del slider
        updateSliderPosition(true);
        
        console.log('Slider: Recálculo completo finalizado');
    }

    // Función mejorada para actualizar layout
    function updateSliderLayout(forceUpdate = false) {
        const wrapper = document.getElementById('slider-wrapper');
        const slides = document.querySelectorAll('.slider-slide');
        
        if (!wrapper || slides.length === 0) {
            console.warn('Slider: No se encontró wrapper o slides');
            return;
        }
        
        const dimensions = calculateResponsiveDimensions();
        
        console.log('Slider: Actualizando layout -', {
            forceUpdate,
            ...dimensions,
            slidesCount: slides.length
        });
        
        // Si es una actualización forzada o hay diferencias significativas
        const currentSlideWidth = parseInt(slides[0]?.style.width) || 0;
        const needsUpdate = forceUpdate || Math.abs(currentSlideWidth - dimensions.slideWidth) > 10;
        
        if (needsUpdate) {
            // Aplicar nuevos estilos a todos los slides
            slides.forEach((slide, index) => {
                slide.style.width = `${dimensions.slideWidth}px`;
                slide.style.height = `${dimensions.slideHeight}px`;
                slide.style.flexBasis = `${dimensions.slideWidth}px`;
                slide.style.marginRight = index < slides.length - 1 ? `${dimensions.slideGap}px` : '0';
                slide.style.flexShrink = '0';
                slide.style.flexGrow = '0';
                
                // Asegurar que la imagen llene el contenedor correctamente
                const imgWrapper = slide.querySelector('.slider-img-wrapper');
                const img = slide.querySelector('.slider-img-wrapper img');
                
                if (imgWrapper) {
                    imgWrapper.style.width = '100%';
                    imgWrapper.style.height = '100%';
                    imgWrapper.style.overflow = 'hidden';
                    imgWrapper.style.borderRadius = '12px';
                }
                
                if (img) {
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'cover';
                    img.style.objectPosition = 'center';
                    img.style.transition = 'transform 0.3s ease';
                }
            });
            
            // Actualizar posición del wrapper
            wrapper.style.marginLeft = `${dimensions.sideSpace}px`;
            wrapper.style.left = '0px';
            
            console.log('Slider: Layout actualizado para', slides.length, 'slides');
        }
    }

    // Función actualizada para variables CSS
    function updateSliderCSSVariables() {
        if (isDestroyed) return;
        
        const dimensions = calculateResponsiveDimensions();
        
        // Calcular offset de botones de navegación (centrados verticalmente)
        const navBtnOffset = Math.max(10, Math.floor(dimensions.sideSpace * 0.3));

        // Actualizar variables CSS de forma forzada
        const root = document.documentElement;
        root.style.setProperty('--slider-slide-width', `${dimensions.slideWidth}px`);
        root.style.setProperty('--slider-slide-height', `${dimensions.slideHeight}px`);
        root.style.setProperty('--slider-slide-gap', `${dimensions.slideGap}px`);
        root.style.setProperty('--slider-side-space', `${dimensions.sideSpace}px`);
        root.style.setProperty('--slider-nav-btn-offset', `${navBtnOffset}px`);

        // Prevenir scroll horizontal
        document.body.style.overflowX = 'hidden';
        document.documentElement.style.overflowX = 'hidden';
        
        // Aplicar correcciones mínimas para Safari
        if (dimensions.isSafari) {
            console.log('Slider: Aplicando correcciones mínimas para Safari');
            
            // Solo aplicar transformaciones 3D básicas sin forzar dimensiones
            const slides = document.querySelectorAll('.slider-slide');
            slides.forEach((slide, index) => {
                slide.style.webkitTransform = 'translate3d(0,0,0)';
                slide.style.transform = 'translate3d(0,0,0)';
                
                const img = slide.querySelector('.slider-img-wrapper img');
                if (img) {
                    img.style.webkitTransform = 'translate3d(0,0,0)';
                    img.style.transform = 'translate3d(0,0,0)';
                }
            });
        }
        
        console.log('Slider: Variables CSS actualizadas -', {
            ...dimensions,
            navBtnOffset
        });
    }

    // Función mejorada para verificar integridad
    function verifySliderIntegrity() {
        if (isDestroyed) return;
        
        const wrapper = document.getElementById('slider-wrapper');
        const slides = document.querySelectorAll('.slider-slide');
        
        if (!wrapper || slides.length === 0) {
            console.warn('Slider: Verificación falló - elementos no encontrados');
            return;
        }
        
        const dimensions = calculateResponsiveDimensions();
        let needsCorrection = false;
        let issues = [];
        
        // Verificar cada slide
        slides.forEach((slide, index) => {
            const currentWidth = parseInt(slide.style.width) || 0;
            const currentHeight = parseInt(slide.style.height) || 0;
            const widthDifference = Math.abs(currentWidth - dimensions.slideWidth);
            const heightDifference = Math.abs(currentHeight - dimensions.slideHeight);
            
            if (widthDifference > 10 || heightDifference > 10) {
                needsCorrection = true;
                issues.push(`Slide ${index}: actual ${currentWidth}x${currentHeight}px, esperado ${dimensions.slideWidth}x${dimensions.slideHeight}px`);
            }
        });
        
        // Verificar posición del wrapper
        const currentMarginLeft = parseInt(wrapper.style.marginLeft) || 0;
        const marginDifference = Math.abs(currentMarginLeft - dimensions.sideSpace);
        
        if (marginDifference > 10) {
            needsCorrection = true;
            issues.push(`Wrapper marginLeft: actual ${currentMarginLeft}px, esperado ${dimensions.sideSpace}px`);
        }
        
        // Verificación específica para Safari
        if (dimensions.isSafari) {
            console.log('Slider: Verificando integridad específica para Safari');
            
            // Verificar que las transformaciones 3D estén aplicadas
            slides.forEach((slide, index) => {
                const img = slide.querySelector('.slider-img-wrapper img');
                if (img && (!img.style.webkitTransform || !img.style.transform)) {
                    needsCorrection = true;
                    issues.push(`Slide ${index}: faltan transformaciones 3D para Safari`);
                }
            });
            
            // Verificar que el wrapper tenga las transformaciones correctas
            if (!wrapper.style.webkitTransform || !wrapper.style.transform) {
                needsCorrection = true;
                issues.push('Wrapper: faltan transformaciones 3D para Safari');
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

    // Funciones para manejo de touch/swipe (comentadas - ahora se manejan en setupTouchCompatibility)
    /*
    function handleTouchStart(e) {
        if (isTransitioning) return;
        touchStartX = e.touches[0].clientX;
        isDragging = true;
        console.log('Slider: Touch start en', touchStartX);
    }

    function handleTouchMove(e) {
        if (!isDragging || isTransitioning) return;
        e.preventDefault();
        touchEndX = e.touches[0].clientX;
    }

    function handleTouchEnd(e) {
        if (!isDragging || isTransitioning) return;
        
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        console.log('Slider: Touch end - diff:', diff);
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swipe izquierda - siguiente slide
                goToSlide(currentIndex + 1);
            } else {
                // Swipe derecha - slide anterior
                goToSlide(currentIndex - 1);
            }
        }
        
        isDragging = false;
        touchStartX = 0;
        touchEndX = 0;
    }
    */

    // Función para mejorar la compatibilidad con touch en dispositivos móviles
    function setupTouchCompatibility() {
        const wrapper = document.getElementById('slider-wrapper');
        if (!wrapper) return;
        
        // Detectar si es un dispositivo móvil
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            console.log('Slider: Configurando compatibilidad touch para móvil');
            
            // Variables para detectar swipe real
            let touchStartTime = 0;
            let touchDistance = 0;
            let hasMoved = false;
            
            // Asegurar que los eventos touch funcionen correctamente
            wrapper.addEventListener('touchstart', (e) => {
                if (isTransitioning) return;
                touchStartX = e.touches[0].clientX;
                touchStartTime = Date.now();
                touchDistance = 0;
                hasMoved = false;
                isDragging = true;
                console.log('Slider: Touch start en', touchStartX);
            }, { passive: false });
            
            wrapper.addEventListener('touchmove', (e) => {
                if (!isDragging || isTransitioning) return;
                e.preventDefault();
                touchEndX = e.touches[0].clientX;
                touchDistance = Math.abs(touchStartX - touchEndX);
                hasMoved = touchDistance > 10; // Umbral mínimo para considerar movimiento
            }, { passive: false });
            
            wrapper.addEventListener('touchend', (e) => {
                if (!isDragging || isTransitioning) return;
                
                const touchEndTime = Date.now();
                const touchDuration = touchEndTime - touchStartTime;
                const swipeThreshold = 50;
                
                console.log('Slider: Touch end - diff:', touchDistance, 'duration:', touchDuration, 'moved:', hasMoved);
                
                // Solo considerar como swipe si hay movimiento significativo y tiempo razonable
                if (hasMoved && touchDistance > swipeThreshold && touchDuration < 500) {
                    if (touchStartX > touchEndX) {
                        // Swipe izquierda - siguiente slide
                        goToSlide(currentIndex + 1);
                    } else {
                        // Swipe derecha - slide anterior
                        goToSlide(currentIndex - 1);
                    }
                }
                
                // Resetear variables
                isDragging = false;
                touchStartX = 0;
                touchEndX = 0;
                touchStartTime = 0;
                touchDistance = 0;
                hasMoved = false;
            }, { passive: false });
            
            // Agregar eventos de click mejorados para móvil
            const slides = document.querySelectorAll('.slider-slide');
            slides.forEach((slide, index) => {
                slide.addEventListener('click', (e) => {
                    // Solo prevenir click si realmente hubo un swipe significativo
                    if (isDragging && hasMoved && touchDistance > 30) {
                        console.log('Slider: Previniendo click durante swipe activo');
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                    }
                    
                    // Permitir el click normal
                    console.log('Slider: Permitiendo click en slide');
                    const movie = slidesData[index];
                    if (movie) {
                        handleSlideClick(e, movie, slide);
                    }
                });
            });
        }
    }

    // Función para manejar click en slide (separada del touch)
    function handleSlideClick(e, movie, slideDiv) {
        if (isTransitioning) return;
        
        // La prevención de swipe ya se maneja en setupTouchCompatibility
        // Esta función solo se llama cuando el click es legítimo
        
        e.preventDefault();
        e.stopPropagation();
        console.log('Slider: Click en slide:', movie.title);
        openDetailsModal(movie, slideDiv);
    }

    // Función para iniciar autoplay
    function startAutoPlay() {
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
        }
        
        autoPlayInterval = setInterval(() => {
            if (!isTransitioning && !isDragging && totalSlides > 0) {
                goToSlide(currentIndex + 1);
            }
        }, 7000); // 7 segundos
        
        console.log('Slider: Autoplay iniciado cada 7 segundos');
    }

    // Función para detener autoplay
    function stopAutoPlay() {
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = null;
            console.log('Slider: Autoplay detenido');
        }
    }

    // Función para pausar autoplay temporalmente
    function pauseAutoPlay() {
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = null;
        }
    }

    // Función para reanudar autoplay
    function resumeAutoPlay() {
        if (!autoPlayInterval && totalSlides > 0) {
            startAutoPlay();
        }
    }

    // Cargar datos
    async function loadSliderData() {
        try {
            console.log('Slider: Cargando datos...');
            const response = await fetch(DATA_URL);
            if (!response.ok) throw new Error('No se pudo cargar data.json');
            const data = await response.json();
            
            // Filtrar solo películas que tengan imagen en 'Slider'
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

    // Renderizar slider
    function renderSlider(moviesData = []) {
        if (isDestroyed) return;
        
        console.log('Slider: Iniciando renderizado...');
        
        const sliderWrapper = document.getElementById('slider-wrapper');
        if (!sliderWrapper) {
            console.error('Slider: slider-wrapper no encontrado');
            return;
        }

        // Usar los datos proporcionados o los datos cargados
        const movies = moviesData.length > 0 ? moviesData : slidesData;

        // Seleccionar películas para el slider
        const selectedMovies = movies
            .sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0))
            .slice(0, 8);
        
        console.log('Slider: Películas seleccionadas:', selectedMovies.length);

        // Asignar datos globales
        slidesData = selectedMovies;
        totalSlides = slidesData.length;
        
        if (totalSlides === 0) {
            console.error('Slider: No hay slides para renderizar');
            return;
        }

        // Guardar viewport actual
        lastViewportWidth = document.documentElement.clientWidth || window.innerWidth;
        
        // Aplicar variables CSS antes de crear slides
        updateSliderCSSVariables();

        // Obtener dimensiones responsivas
        const dimensions = calculateResponsiveDimensions();
        
        // Limpiar wrapper
        sliderWrapper.innerHTML = '';
        
        // Configurar wrapper con centrado correcto
        sliderWrapper.style.display = 'flex';
        sliderWrapper.style.flexDirection = 'row';
        sliderWrapper.style.flexWrap = 'nowrap';
        sliderWrapper.style.transform = 'translateX(0)';
        sliderWrapper.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        sliderWrapper.style.position = 'relative';
        sliderWrapper.style.left = '0px';
        sliderWrapper.style.marginLeft = `${dimensions.sideSpace}px`;
        sliderWrapper.style.width = 'fit-content';
        sliderWrapper.style.minWidth = '100%';
        
        // Configurar compatibilidad touch
        setupTouchCompatibility();
        
        console.log('Slider: Creando slides con dimensiones:', dimensions);
        
        // Crear slides
        slidesData.forEach((movie, index) => {
            const slideDiv = document.createElement('div');
            slideDiv.className = 'slider-slide';
            slideDiv.dataset.index = index;
            
            // Aplicar estilos directamente con valores calculados
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
            
            // Usar solo la imagen del campo 'Slider' como principal
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
                <div class="slider-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.8)); padding: 20px; color: white; border-radius: 0 0 12px 12px;">
                    <div class="slider-title-movie" style="font-size: clamp(1rem, 2.5vw, 1.5rem); font-weight: bold; margin-bottom: 8px; line-height: 1.2;">${movie.title || 'Sin título'}</div>
                    <div class="slider-meta" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; font-size: clamp(0.75rem, 2vw, 0.9rem); opacity: 0.9;">
                        ${movie.year ? `<span>${movie.year}</span>` : ''}
                        ${movie.duration ? `<span>${movie.duration}</span>` : ''}
                        ${mainGenre ? `<span>${mainGenre}</span>` : ''}
                        ${movie.rating ? `<span><i class="fas fa-star" style="color: #ffd700; margin-right: 4px;"></i>${movie.rating}</span>` : ''}
                    </div>
                    <div class="slider-description" style="font-size: clamp(0.7rem, 1.8vw, 0.85rem); line-height: 1.4; opacity: 0.85; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${movie.description || movie.synopsis || 'Sin descripción disponible'}</div>
                </div>
            `;

            // Efectos hover mejorados (estilo Rakuten.tv)
            slideDiv.addEventListener('mouseenter', () => {
                if (!isTransitioning) {
                    slideDiv.style.transform = 'translateY(-5px)';
                    slideDiv.style.boxShadow = '0 8px 25px rgba(255, 255, 255, 0.15)';
                }
            });

            slideDiv.addEventListener('mouseleave', () => {
                if (!isTransitioning) {
                    slideDiv.style.transform = 'translateY(0)';
                    slideDiv.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
                }
            });

            // Click handler
            slideDiv.addEventListener('click', (e) => {
                handleSlideClick(e, movie, slideDiv);
            });

            sliderWrapper.appendChild(slideDiv);
        });

        // Configurar controles
        setupControls();
        
        // Posicionar slider
        currentIndex = 0;
        updateSliderPosition(true);
        updatePagination();
        
        console.log('Slider: Renderizado completado');
        
        // Verificación final
        setTimeout(() => {
            if (!isDestroyed) {
                verifySliderIntegrity();
                
                // Corrección mínima para Safari
                const dimensions = calculateResponsiveDimensions();
                if (dimensions.isSafari) {
                    console.log('Slider: Aplicando corrección mínima post-renderizado para Safari');
                    
                    // Solo aplicar transformaciones 3D básicas
                    const slides = document.querySelectorAll('.slider-slide');
                    slides.forEach((slide, index) => {
                        slide.style.webkitTransform = 'translate3d(0,0,0)';
                        slide.style.transform = 'translate3d(0,0,0)';
                        
                        const img = slide.querySelector('.slider-img-wrapper img');
                        if (img) {
                            img.style.webkitTransform = 'translate3d(0,0,0)';
                            img.style.transform = 'translate3d(0,0,0)';
                        }
                    });
                }
            }
        }, 200);
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
                    // Pausar autoplay temporalmente
                    pauseAutoPlay();
                    goToSlide(currentIndex - 1);
                    // Reanudar autoplay después de un momento
                    setTimeout(resumeAutoPlay, 3000);
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
                    // Pausar autoplay temporalmente
                    pauseAutoPlay();
                    goToSlide(currentIndex + 1);
                    // Reanudar autoplay después de un momento
                    setTimeout(resumeAutoPlay, 3000);
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
                    // Pausar autoplay temporalmente
                    pauseAutoPlay();
                    goToSlide(i);
                    // Reanudar autoplay después de un momento
                    setTimeout(resumeAutoPlay, 3000);
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
        
        console.log('Slider: Cambiando a slide', index);
        
        currentIndex = index;
        updateSliderPosition();
        updatePagination();
        
        // Reiniciar autoplay después de navegación manual
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
            startAutoPlay();
        }
    }

    // Actualizar paginación
    function updatePagination() {
        const dots = document.querySelectorAll('.slider-pagination-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
        });
        
        // Ajustar posición de paginación basada en el ancho del slider
        const pagination = document.getElementById('slider-pagination');
        const wrapper = document.getElementById('slider-wrapper');
        if (pagination && wrapper) {
            const wrapperWidth = wrapper.scrollWidth;
            const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
            
            // Si el wrapper es más ancho que el viewport, centrar la paginación
            if (wrapperWidth > viewportWidth) {
                pagination.style.maxWidth = `${viewportWidth - 40}px`;
                pagination.style.margin = '15px auto 30px auto';
            } else {
                pagination.style.maxWidth = 'none';
                pagination.style.margin = '15px auto 30px auto';
            }
        }
    }

    // Función para abrir modal
    function openDetailsModal(movie, element) {
        console.log('Slider: Abriendo modal para:', movie.title);
        
        // Pausar autoplay cuando se abre el modal
        pauseAutoPlay();
        
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
                    console.error('Slider: No se pudo abrir el modal');
                    clearInterval(retryInterval);
                }
            }, 200 * attempts);
        }
    }

    // Función de limpieza
    function destroy() {
        console.log('Slider: Destruyendo...');
        isDestroyed = true;
        
        clearTimeout(resizeTimeout);
        stopAutoPlay();
        window.removeEventListener('resize', handleResize);
        
        // Limpiar event listeners adicionales
        const prevBtn = document.getElementById('slider-prev');
        const nextBtn = document.getElementById('slider-next');
        const dots = document.querySelectorAll('.slider-pagination-dot');
        const wrapper = document.getElementById('slider-wrapper');
        
        if (prevBtn) prevBtn.replaceWith(prevBtn.cloneNode(true));
        if (nextBtn) nextBtn.replaceWith(nextBtn.cloneNode(true));
        dots.forEach(dot => dot.replaceWith(dot.cloneNode(true)));
        
        if (wrapper) {
            // Los event listeners de touch ahora se manejan en setupTouchCompatibility
            // y se limpian automáticamente al reemplazar el wrapper
            wrapper.replaceWith(wrapper.cloneNode(true));
        }
        
        // Limpiar datos
        slidesData = [];
        totalSlides = 0;
        currentIndex = 0;
        lastViewportWidth = 0;
    }

    // Inicialización
    async function init() {
        if (isDestroyed) return;
        
        console.log('Slider: Inicializando...');
        
        // Prevenir scroll horizontal
        document.body.style.overflowX = 'hidden';
        document.documentElement.style.overflowX = 'hidden';
        
        // Guardar viewport inicial
        lastViewportWidth = document.documentElement.clientWidth || window.innerWidth;
        
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
            
            // Iniciar autoplay
            startAutoPlay();
            
            console.log('Slider: Inicialización completada');
        } else {
            console.error('Slider: No se pudieron cargar datos');
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

    // Exponer API pública
    window.sliderIndependent = {
        goToSlide,
        next: () => goToSlide(currentIndex + 1),
        prev: () => goToSlide(currentIndex - 1),
        getCurrentIndex: () => currentIndex,
        getTotalSlides: () => totalSlides,
        getSlidesData: () => slidesData,
        getLastViewportWidth: () => lastViewportWidth,
        calculateResponsiveDimensions,
        startAutoPlay,
        stopAutoPlay,
        pauseAutoPlay,
        resumeAutoPlay,
        init,
        renderSlider,
        updateSliderCSSVariables,
        updateSliderLayout,
        forceCompleteRecalculation,
        verifySliderIntegrity,
        openDetailsModal,
        destroy
    };

})();