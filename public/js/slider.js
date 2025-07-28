// Slider responsive - Items dinámicos con botones posicionados sobre items adyacentes
(function () {
    let currentIndex = 0;
    let totalSlides = 0;
    let autoplayInterval = null;
    let resizeTimeout = null;

    // Función para calcular posiciones responsive
    function calculateResponsiveDimensions() {
        const vw = window.innerWidth / 100;
        const itemWidth = 87 * vw; // 87vw
        const containerWidth = window.innerWidth;
        const visibleAdjacentWidth = (containerWidth - itemWidth) / 2; // Espacio visible a cada lado
        
        return {
            itemWidth,
            containerWidth,
            visibleAdjacentWidth,
            gap: 24 // Gap fijo entre items
        };
    }

    // Aplicar estilos CSS dinámicos
    function applyResponsiveStyles() {
        const dimensions = calculateResponsiveDimensions();
        
        // Crear o actualizar estilos dinámicos
        let styleElement = document.getElementById('slider-dynamic-styles');
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'slider-dynamic-styles';
            document.head.appendChild(styleElement);
        }

        styleElement.textContent = `
            .slider-section {
                position: relative;
                width: 100%;
                overflow: hidden;
                margin: 2rem 0;
            }

            .slider-container {
                width: 100%;
                overflow: hidden;
                position: relative;
            }

            .slider-wrapper {
                display: flex;
                gap: ${dimensions.gap}px;
                transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                padding: 0 ${dimensions.visibleAdjacentWidth}px;
                box-sizing: border-box;
            }

            .slider-slide {
                flex: 0 0 ${dimensions.itemWidth}px;
                width: ${dimensions.itemWidth}px;
                height: 60vh;
                min-height: 400px;
                max-height: 600px;
                border-radius: 12px;
                overflow: hidden;
                position: relative;
                cursor: pointer;
                transition: transform 0.3s ease, box-shadow 0.3s ease;
                background: #1a1a1a;
            }

            .slider-slide:hover {
                transform: scale(1.02);
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
                z-index: 2;
            }

            .slider-img-wrapper {
                width: 100%;
                height: 100%;
                position: relative;
                overflow: hidden;
            }

            .slider-img-wrapper img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: transform 0.3s ease;
            }

            .slider-slide:hover .slider-img-wrapper img {
                transform: scale(1.05);
            }

            .slider-overlay {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                background: linear-gradient(transparent, rgba(0, 0, 0, 0.8) 50%, rgba(0, 0, 0, 0.95));
                padding: 3rem 2rem 2rem;
                color: white;
                transform: translateY(20px);
                opacity: 0;
                transition: all 0.3s ease;
            }

            .slider-slide:hover .slider-overlay {
                transform: translateY(0);
                opacity: 1;
            }

            .slider-title-movie {
                font-size: clamp(1.5rem, 3vw, 2.5rem);
                font-weight: 700;
                margin-bottom: 0.5rem;
                line-height: 1.2;
            }

            .slider-meta {
                display: flex;
                flex-wrap: wrap;
                gap: 1rem;
                margin-bottom: 1rem;
                font-size: 0.9rem;
                opacity: 0.9;
            }

            .slider-meta span {
                display: flex;
                align-items: center;
                gap: 0.25rem;
            }

            .slider-description {
                font-size: 0.95rem;
                line-height: 1.5;
                opacity: 0.85;
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }

            .slider-nav {
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
                width: 100%;
                display: flex;
                justify-content: space-between;
                pointer-events: none;
                z-index: 10;
            }

            .slider-nav-btn {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.15);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: white;
                font-size: 1.2rem;
                cursor: pointer;
                pointer-events: all;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            }

            .slider-nav-btn:hover {
                background: rgba(255, 255, 255, 0.25);
                transform: scale(1.1);
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
            }

            .slider-nav-btn:active {
                transform: scale(0.95);
            }

            .slider-nav-btn.prev {
                left: ${dimensions.visibleAdjacentWidth / 2 - 30}px;
            }

            .slider-nav-btn.next {
                right: ${dimensions.visibleAdjacentWidth / 2 - 30}px;
            }

            .slider-pagination {
                display: flex;
                justify-content: center;
                gap: 0.5rem;
                margin-top: 2rem;
            }

            .slider-pagination-dot {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.3);
                border: none;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .slider-pagination-dot.active {
                background: #ffffff;
                transform: scale(1.2);
            }

            .slider-pagination-dot:hover {
                background: rgba(255, 255, 255, 0.6);
                transform: scale(1.1);
            }

            .slider-title {
                font-size: clamp(1.8rem, 4vw, 2.5rem);
                font-weight: 700;
                text-align: center;
                margin-bottom: 2rem;
                background: linear-gradient(135deg, #ffffff, #cccccc);
                background-clip: text;
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }

            /* Responsive adjustments */
            @media (max-width: 768px) {
                .slider-nav-btn {
                    width: 50px;
                    height: 50px;
                    font-size: 1rem;
                }

                .slider-nav-btn.prev {
                    left: ${Math.max(dimensions.visibleAdjacentWidth / 2 - 25, 10)}px;
                }

                .slider-nav-btn.next {
                    right: ${Math.max(dimensions.visibleAdjacentWidth / 2 - 25, 10)}px;
                }

                .slider-overlay {
                    padding: 2rem 1.5rem 1.5rem;
                }

                .slider-slide {
                    min-height: 300px;
                }
            }

            @media (max-width: 480px) {
                .slider-nav-btn {
                    width: 45px;
                    height: 45px;
                    font-size: 0.9rem;
                }

                .slider-nav-btn.prev {
                    left: ${Math.max(dimensions.visibleAdjacentWidth / 2 - 22, 8)}px;
                }

                .slider-nav-btn.next {
                    right: ${Math.max(dimensions.visibleAdjacentWidth / 2 - 22, 8)}px;
                }

                .slider-overlay {
                    padding: 1.5rem 1rem 1rem;
                }
            }
        `;
    }

    // Función simple para renderizar el slider
    function renderSlider() {
        console.log('Slider: Iniciando renderizado...');
        
        const sliderWrapper = document.getElementById('slider-wrapper');
        
        if (!sliderWrapper) {
            console.error('Slider: Elementos no encontrados');
            return;
        }

        // Aplicar estilos responsive
        applyResponsiveStyles();

        // Ocultar skeleton y mostrar wrapper
        sliderWrapper.style.display = 'flex';
        sliderWrapper.innerHTML = '';

        // Obtener datos del carrusel
        const movies = window.carousel.moviesData;
        if (!movies || movies.length === 0) {
            console.error('Slider: No hay datos de películas');
            return;
        }

        console.log('Slider: Datos disponibles:', movies.length, 'películas');

        // Seleccionar primeras películas de diferentes géneros
        const selectedMovies = [];
        const usedGenres = new Set();
        
        for (const movie of movies) {
            if (movie.genre && !usedGenres.has(movie.genre.split(/[·,]/)[0])) {
                selectedMovies.push(movie);
                usedGenres.add(movie.genre.split(/[·,]/)[0]);
                if (selectedMovies.length >= 10) break; // Máximo 10 slides
            }
        }

        totalSlides = selectedMovies.length;
        console.log('Slider: Renderizando', totalSlides, 'slides');

        // Crear cada slide usando la misma lógica que el carrusel
        for (let i = 0; i < selectedMovies.length; i++) {
            const movie = selectedMovies[i];
            console.log('Slider: Creando slide', i, ':', movie.title);
            
            const slideDiv = document.createElement('div');
            slideDiv.className = 'slider-slide';
            slideDiv.dataset.itemId = i;
            
            slideDiv.innerHTML = `
                <div class="slider-img-wrapper">
                    <img src="${movie.postersUrl || movie.posterUrl || 'https://via.placeholder.com/1540x464'}" alt="${movie.title}" loading="lazy">
                </div>
                <div class="slider-overlay">
                    <div class="slider-title-movie">${movie.title}</div>
                    <div class="slider-meta">
                        ${movie.year ? `<span>${movie.year}</span>` : ''}
                        ${movie.duration ? `<span>${movie.duration}</span>` : ''}
                        ${movie.genre ? `<span>${movie.genre.split(/[·,]/)[0]}</span>` : ''}
                        ${movie.rating ? `<span><i class='fas fa-star'></i> ${movie.rating}</span>` : ''}
                    </div>
                    <div class="slider-description">${movie.description || ''}</div>
                </div>
            `;

            // EXACTAMENTE la misma lógica que el carrusel
            slideDiv.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Slider: Click en slide:', movie.title);
                window.detailsModal.show(movie, slideDiv);
            });

            sliderWrapper.appendChild(slideDiv);
        }

        // Crear paginación
        createPagination();
        
        // Configurar navegación
        setupNavigation();
        
        // Ir al primer slide
        goToSlide(0);
        
        console.log('Slider: Renderizado completado');
    }

    // Crear paginación
    function createPagination() {
        const pagination = document.getElementById('slider-pagination');
        if (!pagination) return;
        
        pagination.innerHTML = '';
        
        for (let i = 0; i < totalSlides; i++) {
            const dot = document.createElement('button');
            dot.className = 'slider-pagination-dot';
            dot.setAttribute('data-slide', i);
            if (i === 0) dot.classList.add('active');
            
            dot.addEventListener('click', () => goToSlide(i));
            pagination.appendChild(dot);
        }
    }

    // Configurar navegación
    function setupNavigation() {
        const prevBtn = document.getElementById('slider-prev');
        const nextBtn = document.getElementById('slider-next');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => goToSlide(currentIndex - 1));
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => goToSlide(currentIndex + 1));
        }
    }

    // Ir a slide específico
    function goToSlide(index) {
        if (index < 0) index = totalSlides - 1;
        if (index >= totalSlides) index = 0;
        
        currentIndex = index;
        
        const wrapper = document.getElementById('slider-wrapper');
        if (!wrapper) return;
        
        const dimensions = calculateResponsiveDimensions();
        const slideWidth = dimensions.itemWidth;
        const gap = dimensions.gap;
        
        // Calcular posición considerando el padding del wrapper
        const translateX = -(slideWidth + gap) * index;
        
        wrapper.style.transform = `translateX(${translateX}px)`;
        
        updatePagination();
    }

    // Actualizar paginación
    function updatePagination() {
        const dots = document.querySelectorAll('.slider-pagination-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
        });
    }

    // Manejar redimensionamiento de ventana
    function handleResize() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            applyResponsiveStyles();
            goToSlide(currentIndex); // Reposicionar slide actual
        }, 150);
    }

    // Inicializar cuando el carrusel esté listo
    function init() {
        console.log('Slider: Inicializando...');
        
        if (window.carousel && window.carousel.moviesData && window.carousel.moviesData.length > 0) {
            console.log('Slider: Datos disponibles, renderizando...');
            renderSlider();
            
            // Agregar listener para redimensionamiento
            window.addEventListener('resize', handleResize);
        }
        else {
            console.log('Slider: Esperando datos...');
            setTimeout(init, 100);
        }
    }

    // Limpiar listeners al descargar
    window.addEventListener('beforeunload', () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(resizeTimeout);
        clearInterval(autoplayInterval);
    });

    // Iniciar inmediatamente
    init();

    // Exponer funciones para debug
    window.slider = {
        renderSlider,
        goToSlide,
        init,
        calculateResponsiveDimensions,
        applyResponsiveStyles
    };

})();