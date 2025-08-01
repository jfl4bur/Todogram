// Slider Independiente - Optimizado para Safari/iPhone
(function () {
    let currentIndex = 0;
    let totalSlides = 0;
    let isTransitioning = false;
    let resizeTimeout = null;
    let slidesData = [];
    let isDestroyed = false;
    let touchStartX = 0;
    let touchEndX = 0;
    let isDragging = false;
    let autoPlayInterval = null;

    // Función simplificada para calcular dimensiones responsivas
    function calculateResponsiveDimensions() {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Detectar Safari/iOS
        const isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        
        let slideWidth, slideHeight, slideGap, sideSpace;
        
        // Breakpoints más simples y precisos
        if (viewportWidth <= 480) {
            // Mobile pequeño (iPhone 11, etc.)
            slideWidth = Math.floor(viewportWidth * 0.85);
            slideHeight = 160;
            slideGap = 12;
            sideSpace = Math.floor((viewportWidth - slideWidth) / 2);
        } else if (viewportWidth <= 768) {
            // Mobile/Tablet
            slideWidth = Math.floor(viewportWidth * 0.80);
            slideHeight = 180;
            slideGap = 16;
            sideSpace = Math.floor((viewportWidth - slideWidth) / 2);
        } else if (viewportWidth <= 1024) {
            // Tablet grande
            slideWidth = Math.floor(viewportWidth * 0.75);
            slideHeight = 220;
            slideGap = 20;
            sideSpace = Math.floor((viewportWidth - slideWidth) / 2);
        } else if (viewportWidth <= 1400) {
            // Desktop
            slideWidth = Math.floor(viewportWidth * 0.70);
            slideHeight = 300;
            slideGap = 24;
            sideSpace = Math.floor((viewportWidth - slideWidth) / 2);
        } else {
            // Desktop grande
            slideWidth = Math.floor(viewportWidth * 0.65);
            slideHeight = 320;
            slideGap = 28;
            sideSpace = Math.floor((viewportWidth - slideWidth) / 2);
        }
        
        // Asegurar valores mínimos
        slideWidth = Math.max(1600, slideWidth);
        slideHeight = Math.max(140, slideHeight);
        slideGap = Math.max(8, slideGap);
        sideSpace = Math.max(10, sideSpace);
        
        console.log('Slider: Dimensiones calculadas:', {
            viewportWidth,
            slideWidth,
            slideHeight,
            slideGap,
            sideSpace,
            isSafari,
            isIOS
        });
        
        return { slideWidth, slideHeight, slideGap, sideSpace, viewportWidth, isSafari, isIOS };
    }

    // Función simplificada para manejar resize
    function handleResize() {
        if (isDestroyed) return;
        
        clearTimeout(resizeTimeout);
        
        // Deshabilitar transiciones durante resize
        const wrapper = document.getElementById('slider-wrapper');
        if (wrapper) {
            wrapper.style.transition = 'none';
        }
        
        resizeTimeout = setTimeout(() => {
            if (isDestroyed) return;
            
            console.log('Slider: Aplicando resize');
            updateSliderLayout(true);
            updateSliderPosition(true);
            
            // Reactivar transiciones
            setTimeout(() => {
                if (wrapper && !isDestroyed) {
                    wrapper.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                }
            }, 100);
        }, 200);
    }

    // Función simplificada para actualizar layout
    function updateSliderLayout(forceUpdate = false) {
        const wrapper = document.getElementById('slider-wrapper');
        const slides = document.querySelectorAll('.slider-slide');
        const sliderSection = document.querySelector('.slider-section');
        
        if (!wrapper || slides.length === 0) return;
        
        const dimensions = calculateResponsiveDimensions();
        
        // Actualizar altura de la sección
        if (sliderSection) {
            sliderSection.style.height = `${dimensions.slideHeight + 80}px`;
        }
        
        // Configurar wrapper
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.height = `${dimensions.slideHeight}px`;
        wrapper.style.paddingLeft = `${dimensions.sideSpace}px`;
        wrapper.style.paddingRight = `${dimensions.sideSpace}px`;
        wrapper.style.boxSizing = 'border-box';
        
        // Aplicar estilos a slides
        slides.forEach((slide, index) => {
            // Limpiar estilos previos
            slide.style.cssText = '';
            
            // Aplicar nuevos estilos
            slide.style.width = `${dimensions.slideWidth}px`;
            slide.style.height = `${dimensions.slideHeight}px`;
            slide.style.flexShrink = '0';
            slide.style.marginRight = index < slides.length - 1 ? `${dimensions.slideGap}px` : '0';
            slide.style.borderRadius = '12px';
            slide.style.overflow = 'hidden';
            slide.style.position = 'relative';
            slide.style.cursor = 'pointer';
            slide.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
            slide.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
            
            // Configurar imagen
            const imgWrapper = slide.querySelector('.slider-img-wrapper');
            const img = slide.querySelector('.slider-img-wrapper img');
            
            if (imgWrapper) {
                imgWrapper.style.width = '100%';
                imgWrapper.style.height = '100%';
                imgWrapper.style.overflow = 'hidden';
                imgWrapper.style.borderRadius = '12px';
                imgWrapper.style.display = 'block';
            }
            
            if (img) {
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                img.style.objectPosition = 'center';
                img.style.display = 'block';
                
                // Fix específico para Safari/iOS
                if (dimensions.isSafari || dimensions.isIOS) {
                    img.style.webkitTransform = 'translate3d(0,0,0)';
                    img.style.transform = 'translate3d(0,0,0)';
                }
            }
            
            // Fix específico para Safari/iOS en el slide
            if (dimensions.isSafari || dimensions.isIOS) {
                slide.style.webkitTransform = 'translate3d(0,0,0)';
                slide.style.transform = 'translate3d(0,0,0)';
                slide.style.webkitBackfaceVisibility = 'hidden';
                slide.style.backfaceVisibility = 'hidden';
            }
        });
        
        console.log('Slider: Layout actualizado para', slides.length, 'slides');
    }

    // Función para actualizar posición del slider
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
        
        // Fix específico para Safari/iOS
        if (dimensions.isSafari || dimensions.isIOS) {
            wrapper.style.webkitTransform = `translateX(${translateX}px)`;
        }
        
        console.log('Slider: Posición actualizada - index:', currentIndex, 'translateX:', translateX);
        
        if (!forceUpdate) {
            setTimeout(() => {
                isTransitioning = false;
            }, 600);
        }
    }

    // Configurar touch/swipe mejorado para iOS
    function setupTouchCompatibility() {
        const wrapper = document.getElementById('slider-wrapper');
        if (!wrapper) return;
        
        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        if (isTouch) {
            console.log('Slider: Configurando eventos touch');
            
            let touchStartTime = 0;
            let touchDistance = 0;
            let hasMoved = false;
            
            wrapper.addEventListener('touchstart', (e) => {
                if (isTransitioning) return;
                touchStartX = e.touches[0].clientX;
                touchStartTime = Date.now();
                touchDistance = 0;
                hasMoved = false;
                isDragging = true;
                
                // Pausar autoplay durante touch
                pauseAutoPlay();
            }, { passive: true });
            
            wrapper.addEventListener('touchmove', (e) => {
                if (!isDragging || isTransitioning) return;
                touchEndX = e.touches[0].clientX;
                touchDistance = Math.abs(touchStartX - touchEndX);
                hasMoved = touchDistance > 15;
                
                // Prevenir scroll si hay movimiento horizontal significativo
                if (hasMoved) {
                    e.preventDefault();
                }
            }, { passive: false });
            
            wrapper.addEventListener('touchend', (e) => {
                if (!isDragging || isTransitioning) return;
                
                const touchEndTime = Date.now();
                const touchDuration = touchEndTime - touchStartTime;
                const swipeThreshold = 60;
                
                if (hasMoved && touchDistance > swipeThreshold && touchDuration < 500) {
                    if (touchStartX > touchEndX) {
                        goToSlide(currentIndex + 1);
                    } else {
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
                
                // Reanudar autoplay después de un momento
                setTimeout(resumeAutoPlay, 2000);
            }, { passive: true });
        }
    }

    // Función para manejar click en slide
    function handleSlideClick(e, movie, slideDiv) {
        if (isTransitioning || (isDragging && touchDistance > 30)) {
            e.preventDefault();
            return;
        }
        
        console.log('Slider: Click en slide:', movie.title);
        openDetailsModal(movie, slideDiv);
    }

    // Funciones de autoplay
    function startAutoPlay() {
        if (autoPlayInterval) clearInterval(autoPlayInterval);
        
        autoPlayInterval = setInterval(() => {
            if (!isTransitioning && !isDragging && totalSlides > 0) {
                goToSlide(currentIndex + 1);
            }
        }, 7000);
        
        console.log('Slider: Autoplay iniciado');
    }

    function stopAutoPlay() {
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = null;
        }
    }

    function pauseAutoPlay() {
        stopAutoPlay();
    }

    function resumeAutoPlay() {
        if (totalSlides > 0) {
            startAutoPlay();
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
                .filter(item => item && item['Categoría'] === 'Películas' && item['Slider'])
                .map((item, index) => ({
                    id: index.toString(),
                    title: item['Título'] || 'Sin título',
                    description: item['Synopsis'] || 'Descripción no disponible',
                    posterUrl: item['Portada'] || '',
                    backgroundUrl: item['Fondo'] || '',
                    year: item['Año'] ? item['Año'].toString() : '',
                    duration: item['Duración'] || '',
                    genre: item['Géneros'] || '',
                    rating: item['Puntuación 1-10'] || '',
                    director: item['Director(es)'] || '',
                    cast: item['Reparto principal'] || '',
                    synopsis: item['Synopsis'] || '',
                    trailerUrl: item['Trailer'] || '',
                    videoUrl: item['Video iframe'] || item['Ver Película'] || '',
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

        // Limpiar wrapper
        sliderWrapper.innerHTML = '';
        
        // Aplicar layout inicial
        updateSliderLayout(true);
        
        // Crear slides
        slidesData.forEach((movie, index) => {
            const slideDiv = document.createElement('div');
            slideDiv.className = 'slider-slide';
            slideDiv.dataset.index = index;
            
            const imageUrl = movie.sliderUrl || `https://via.placeholder.com/800x400/333/fff?text=${encodeURIComponent(movie.title)}`;
            const mainGenre = movie.genre ? movie.genre.split(/[·,]/)[0].trim() : '';
            
            slideDiv.innerHTML = `
                <div class="slider-img-wrapper">
                    <img src="${imageUrl}" 
                         alt="${movie.title}" 
                         loading="${index === 0 ? 'eager' : 'lazy'}"
                         onerror="this.src='https://via.placeholder.com/800x400/333/fff?text=No+Image'">
                </div>
                <div class="slider-overlay">
                    <div class="slider-title-movie">${movie.title || 'Sin título'}</div>
                    <div class="slider-meta">
                        ${movie.year ? `<span>${movie.year}</span>` : ''}
                        ${movie.duration ? `<span>${movie.duration}</span>` : ''}
                        ${mainGenre ? `<span>${mainGenre}</span>` : ''}
                        ${movie.rating ? `<span><i class="fas fa-star"></i>${movie.rating}</span>` : ''}
                    </div>
                    <div class="slider-description">${movie.description || 'Sin descripción disponible'}</div>
                </div>
            `;

            // Efectos hover (solo en dispositivos con mouse)
            if (window.matchMedia('(hover: hover)').matches) {
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
            }

            // Click handler
            slideDiv.addEventListener('click', (e) => {
                handleSlideClick(e, movie, slideDiv);
            });

            sliderWrapper.appendChild(slideDiv);
        });

        // Configurar controles y touch
        setupControls();
        setupTouchCompatibility();
        
        // Posicionar slider
        currentIndex = 0;
        updateSliderPosition(true);
        updatePagination();
        
        console.log('Slider: Renderizado completado');
    }

    // Configurar controles de navegación
    function setupControls() {
        const prevBtn = document.getElementById('slider-prev');
        const nextBtn = document.getElementById('slider-next');
        
        if (prevBtn) {
            prevBtn.onclick = (e) => {
                e.preventDefault();
                if (!isTransitioning) {
                    pauseAutoPlay();
                    goToSlide(currentIndex - 1);
                    setTimeout(resumeAutoPlay, 3000);
                }
            };
        }
        
        if (nextBtn) {
            nextBtn.onclick = (e) => {
                e.preventDefault();
                if (!isTransitioning) {
                    pauseAutoPlay();
                    goToSlide(currentIndex + 1);
                    setTimeout(resumeAutoPlay, 3000);
                }
            };
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
            
            dot.onclick = (e) => {
                e.preventDefault();
                if (!isTransitioning) {
                    pauseAutoPlay();
                    goToSlide(i);
                    setTimeout(resumeAutoPlay, 3000);
                }
            };
            
            pagination.appendChild(dot);
        }
    }

    // Ir a slide específico
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
    }

    // Actualizar paginación
    function updatePagination() {
        const dots = document.querySelectorAll('.slider-pagination-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
        });
    }

    // Abrir modal de detalles
    function openDetailsModal(movie, element) {
        console.log('Slider: Abriendo modal para:', movie.title);
        pauseAutoPlay();
        
        if (window.detailsModal && typeof window.detailsModal.show === 'function') {
            window.detailsModal.show(movie, element);
            window.activeItem = movie;
        } else {
            console.error('Slider: Modal no disponible');
        }
    }

    // Función de limpieza
    function destroy() {
        console.log('Slider: Destruyendo...');
        isDestroyed = true;
        
        clearTimeout(resizeTimeout);
        stopAutoPlay();
        window.removeEventListener('resize', handleResize);
        
        slidesData = [];
        totalSlides = 0;
        currentIndex = 0;
    }

    // Inicialización
    async function init() {
        if (isDestroyed) return;
        
        console.log('Slider: Inicializando...');
        
        // Prevenir scroll horizontal
        document.body.style.overflowX = 'hidden';
        
        // Cargar datos
        const movies = await loadSliderData();
        if (movies && movies.length > 0) {
            slidesData = movies;
            totalSlides = movies.length;
            
            // Renderizar
            renderSlider(movies);
            
            // Agregar listener de resize
            window.addEventListener('resize', handleResize, { passive: true });
            
            // Iniciar autoplay
            startAutoPlay();
            
            console.log('Slider: Inicialización completada');
        } else {
            console.error('Slider: No se pudieron cargar datos');
        }
    }

    // Cleanup
    window.addEventListener('beforeunload', destroy);
    
    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // API pública
    window.sliderIndependent = {
        goToSlide,
        next: () => goToSlide(currentIndex + 1),
        prev: () => goToSlide(currentIndex - 1),
        getCurrentIndex: () => currentIndex,
        getTotalSlides: () => totalSlides,
        startAutoPlay,
        stopAutoPlay,
        pauseAutoPlay,
        resumeAutoPlay,
        init,
        renderSlider,
        destroy
    };

})();