// Slider tipo Rakuten.TV - Réplica exacta del comportamiento
(function () {
    let currentIndex = 0;
    let totalSlides = 0;
    let isTransitioning = false;
    let resizeTimeout = null;

    // Función para limpiar estilos existentes que puedan interferir
    function clearExistingStyles() {
        const existingStyle = document.getElementById('slider-dynamic-styles');
        if (existingStyle) {
            existingStyle.remove();
        }
    }

    // Crear estilos CSS completos tipo Rakuten.TV
    function createRakutenStyles() {
        clearExistingStyles();
        
        const styleElement = document.createElement('style');
        styleElement.id = 'slider-dynamic-styles';
        document.head.appendChild(styleElement);

        styleElement.textContent = `
            /* Reset y base del slider */
            .slider-section {
                position: relative;
                width: 100vw;
                margin: 0;
                padding: 0;
                overflow: hidden;
                background: #141414;
            }

            .slider-title {
                display: none; /* Ocultar título como en Rakuten */
            }

            .slider-container {
                position: relative;
                width: 100%;
                height: 60vh;
                min-height: 400px;
                max-height: 600px;
                overflow: hidden;
            }

            .slider-wrapper {
                display: flex;
                width: 100%;
                height: 100%;
                transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                will-change: transform;
            }

            .slider-slide {
                flex: 0 0 87vw;
                width: 87vw;
                height: 100%;
                position: relative;
                margin-right: 1.5vw;
                border-radius: 0;
                overflow: hidden;
                cursor: pointer;
                background: #000;
            }

            .slider-slide:last-child {
                margin-right: 0;
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
                object-position: center;
                transition: transform 0.3s ease;
            }

            .slider-slide:hover .slider-img-wrapper img {
                transform: scale(1.02);
            }

            .slider-overlay {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                background: linear-gradient(
                    to top,
                    rgba(0, 0, 0, 0.9) 0%,
                    rgba(0, 0, 0, 0.7) 30%,
                    rgba(0, 0, 0, 0.4) 60%,
                    transparent 100%
                );
                padding: 3rem;
                color: white;
                opacity: 0;
                transform: translateY(20px);
                transition: all 0.3s ease;
                pointer-events: none;
            }

            .slider-slide:hover .slider-overlay {
                opacity: 1;
                transform: translateY(0);
                pointer-events: all;
            }

            .slider-title-movie {
                font-size: clamp(2rem, 4vw, 3.5rem);
                font-weight: 700;
                margin-bottom: 1rem;
                line-height: 1.2;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
            }

            .slider-meta {
                display: flex;
                flex-wrap: wrap;
                gap: 1.5rem;
                margin-bottom: 1.5rem;
                font-size: 1rem;
                opacity: 0.9;
            }

            .slider-meta span {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-weight: 500;
            }

            .slider-description {
                font-size: 1rem;
                line-height: 1.6;
                opacity: 0.85;
                max-width: 60%;
                display: -webkit-box;
                -webkit-line-clamp: 4;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }

            /* Navegación tipo Rakuten.TV */
            .slider-nav {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                pointer-events: none;
                z-index: 20;
            }

            .slider-nav-btn {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border: 2px solid rgba(255, 255, 255, 0.2);
                color: white;
                font-size: 1.5rem;
                cursor: pointer;
                pointer-events: all;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                opacity: 0;
                transform: scale(0.8);
            }

            .slider-nav-btn:hover {
                background: rgba(255, 255, 255, 0.2);
                border-color: rgba(255, 255, 255, 0.4);
                transform: scale(1.1);
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
            }

            .slider-nav-btn:active {
                transform: scale(0.95);
            }

            .slider-nav-btn.prev {
                margin-left: 6.5vw;
                animation: slideInLeft 0.5s ease forwards;
            }

            .slider-nav-btn.next {
                margin-right: 6.5vw;
                animation: slideInRight 0.5s ease forwards;
            }

            .slider-container:hover .slider-nav-btn {
                opacity: 1;
                transform: scale(1);
            }

            @keyframes slideInLeft {
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }

            @keyframes slideInRight {
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }

            /* Paginación tipo Rakuten.TV */
            .slider-pagination {
                position: absolute;
                bottom: 2rem;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 0.5rem;
                z-index: 10;
            }

            .slider-pagination-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.4);
                border: none;
                cursor: pointer;
                transition: all 0.3s ease;
                opacity: 0.6;
            }

            .slider-pagination-dot.active {
                background: #ffffff;
                opacity: 1;
                transform: scale(1.2);
            }

            .slider-pagination-dot:hover {
                background: rgba(255, 255, 255, 0.8);
                opacity: 1;
                transform: scale(1.1);
            }

            /* Responsive Design */
            @media (max-width: 1200px) {
                .slider-slide {
                    flex: 0 0 85vw;
                    width: 85vw;
                }
                
                .slider-nav-btn.prev {
                    margin-left: 7.5vw;
                }
                
                .slider-nav-btn.next {
                    margin-right: 7.5vw;
                }
            }

            @media (max-width: 768px) {
                .slider-container {
                    height: 50vh;
                    min-height: 300px;
                }

                .slider-slide {
                    flex: 0 0 90vw;
                    width: 90vw;
                    margin-right: 2vw;
                }

                .slider-nav-btn {
                    width: 50px;
                    height: 50px;
                    font-size: 1.2rem;
                }

                .slider-nav-btn.prev {
                    margin-left: 5vw;
                }
                
                .slider-nav-btn.next {
                    margin-right: 5vw;
                }

                .slider-overlay {
                    padding: 2rem;
                }

                .slider-title-movie {
                    font-size: clamp(1.5rem, 6vw, 2.5rem);
                }

                .slider-description {
                    max-width: 80%;
                    font-size: 0.9rem;
                    -webkit-line-clamp: 3;
                }
            }

            @media (max-width: 480px) {
                .slider-slide {
                    flex: 0 0 95vw;
                    width: 95vw;
                    margin-right: 2.5vw;
                }

                .slider-nav-btn {
                    width: 45px;
                    height: 45px;
                    font-size: 1rem;
                }

                .slider-nav-btn.prev {
                    margin-left: 2.5vw;
                }
                
                .slider-nav-btn.next {
                    margin-right: 2.5vw;
                }

                .slider-overlay {
                    padding: 1.5rem;
                }

                .slider-description {
                    max-width: 90%;
                    -webkit-line-clamp: 2;
                }
            }
        `;
    }

    // Función para renderizar el slider
    function renderSlider() {
        console.log('Slider Rakuten: Iniciando renderizado...');
        
        const sliderWrapper = document.getElementById('slider-wrapper');
        const sliderContainer = document.querySelector('.slider-container');
        const sliderSection = document.querySelector('.slider-section');
        
        if (!sliderWrapper || !sliderContainer) {
            console.error('Slider: Elementos no encontrados');
            return;
        }

        // Aplicar estilos tipo Rakuten.TV
        createRakutenStyles();

        // Limpiar contenido existente
        sliderWrapper.innerHTML = '';
        sliderWrapper.style.display = 'flex';

        // Obtener datos del carrusel
        const movies = window.carousel?.moviesData;
        if (!movies || movies.length === 0) {
            console.error('Slider: No hay datos de películas');
            return;
        }

        console.log('Slider: Datos disponibles:', movies.length, 'películas');

        // Seleccionar películas destacadas (diferentes géneros)
        const selectedMovies = [];
        const usedGenres = new Set();
        
        // Priorizar películas con mejor rating o más populares
        const sortedMovies = [...movies].sort((a, b) => {
            const ratingA = parseFloat(a.rating) || 0;
            const ratingB = parseFloat(b.rating) || 0;
            return ratingB - ratingA;
        });

        for (const movie of sortedMovies) {
            if (movie.genre && !usedGenres.has(movie.genre.split(/[·,]/)[0].trim())) {
                selectedMovies.push(movie);
                usedGenres.add(movie.genre.split(/[·,]/)[0].trim());
                if (selectedMovies.length >= 8) break; // Máximo 8 slides como Rakuten
            }
        }

        // Si no hay suficientes por género, completar con las mejores
        while (selectedMovies.length < Math.min(8, movies.length)) {
            for (const movie of sortedMovies) {
                if (!selectedMovies.find(m => m.id === movie.id)) {
                    selectedMovies.push(movie);
                    if (selectedMovies.length >= 8) break;
                }
            }
            break;
        }

        totalSlides = selectedMovies.length;
        console.log('Slider: Renderizando', totalSlides, 'slides destacados');

        // Crear slides
        selectedMovies.forEach((movie, index) => {
            const slideDiv = document.createElement('div');
            slideDiv.className = 'slider-slide';
            slideDiv.dataset.itemId = index;
            
            // Usar imagen de mejor calidad si está disponible
            const imageUrl = movie.postersUrl || movie.posterUrl || movie.imageUrl || 'https://via.placeholder.com/1540x600/333/fff?text=No+Image';
            
            slideDiv.innerHTML = `
                <div class="slider-img-wrapper">
                    <img src="${imageUrl}" alt="${movie.title}" loading="${index === 0 ? 'eager' : 'lazy'}">
                </div>
                <div class="slider-overlay">
                    <div class="slider-title-movie">${movie.title}</div>
                    <div class="slider-meta">
                        ${movie.year ? `<span>${movie.year}</span>` : ''}
                        ${movie.duration ? `<span>${movie.duration}</span>` : ''}
                        ${movie.genre ? `<span>${movie.genre.split(/[·,]/)[0].trim()}</span>` : ''}
                        ${movie.rating ? `<span><i class='fas fa-star'></i> ${movie.rating}</span>` : ''}
                    </div>
                    <div class="slider-description">${movie.description || movie.synopsis || ''}</div>
                </div>
            `;

            // Event listeners
            slideDiv.addEventListener('click', (e) => {
                if (!isTransitioning) {
                    e.preventDefault();
                    console.log('Slider: Click en slide:', movie.title);
                    if (window.detailsModal) {
                        window.detailsModal.show(movie, slideDiv);
                    }
                }
            });

            sliderWrapper.appendChild(slideDiv);
        });

        // Crear controles
        createControls();
        
        // Posicionar en el primer slide
        currentIndex = 0;
        updateSliderPosition();
        
        console.log('Slider Rakuten: Renderizado completado');
    }

    // Crear controles de navegación y paginación
    function createControls() {
        // Navegación
        setupNavigation();
        
        // Paginación
        createPagination();
    }

    // Configurar navegación
    function setupNavigation() {
        const prevBtn = document.getElementById('slider-prev');
        const nextBtn = document.getElementById('slider-next');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (!isTransitioning) {
                    goToSlide(currentIndex - 1);
                }
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (!isTransitioning) {
                    goToSlide(currentIndex + 1);
                }
            });
        }

        // Navegación con teclado
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' && !isTransitioning) {
                goToSlide(currentIndex - 1);
            } else if (e.key === 'ArrowRight' && !isTransitioning) {
                goToSlide(currentIndex + 1);
            }
        });
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
            dot.setAttribute('aria-label', `Ir al slide ${i + 1}`);
            if (i === 0) dot.classList.add('active');
            
            dot.addEventListener('click', () => {
                if (!isTransitioning) {
                    goToSlide(i);
                }
            });
            
            pagination.appendChild(dot);
        }
    }

    // Ir a slide específico
    function goToSlide(index) {
        if (isTransitioning) return;
        
        // Navegación circular
        if (index < 0) index = totalSlides - 1;
        if (index >= totalSlides) index = 0;
        
        if (index === currentIndex) return;
        
        currentIndex = index;
        updateSliderPosition();
        updatePagination();
    }

    // Actualizar posición del slider
    function updateSliderPosition() {
        const wrapper = document.getElementById('slider-wrapper');
        if (!wrapper) return;
        
        isTransitioning = true;
        
        // Calcular desplazamiento
        const slideWidth = wrapper.querySelector('.slider-slide')?.offsetWidth || 0;
        const gap = window.innerWidth * 0.015; // 1.5vw gap
        const translateX = -(slideWidth + gap) * currentIndex;
        
        wrapper.style.transform = `translateX(${translateX}px)`;
        
        // Reset transitioning flag
        setTimeout(() => {
            isTransitioning = false;
        }, 600);
    }

    // Actualizar paginación
    function updatePagination() {
        const dots = document.querySelectorAll('.slider-pagination-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
        });
    }

    // Manejar redimensionamiento
    function handleResize() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            createRakutenStyles();
            updateSliderPosition();
        }, 150);
    }

    // Inicializar
    function init() {
        console.log('Slider Rakuten: Inicializando...');
        
        if (window.carousel?.moviesData?.length > 0) {
            renderSlider();
            window.addEventListener('resize', handleResize);
        } else {
            setTimeout(init, 100);
        }
    }

    // Cleanup
    window.addEventListener('beforeunload', () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(resizeTimeout);
    });

    // Iniciar
    init();

    // Exponer API
    window.slider = {
        goToSlide,
        next: () => goToSlide(currentIndex + 1),
        prev: () => goToSlide(currentIndex - 1),
        getCurrentIndex: () => currentIndex,
        getTotalSlides: () => totalSlides,
        init,
        renderSlider
    };

})();