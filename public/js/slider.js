// Slider Rakuten.TV - Versión funcional completa
(function () {
    let currentIndex = 0;
    let totalSlides = 0;
    let isTransitioning = false;
    let resizeTimeout = null;
    let slidesData = [];

    // Limpiar estilos conflictivos
    function removeConflictingStyles() {
        // Remover estilos existentes del slider
        const existingStyles = document.querySelectorAll('style[id*="slider"], link[href*="slider"]');
        existingStyles.forEach(style => {
            if (style.id !== 'slider-rakuten-styles') {
                style.remove();
            }
        });
    }

    // Crear estilos CSS completos y sin conflictos
    function createRakutenStyles() {
        removeConflictingStyles();
        
        let styleElement = document.getElementById('slider-rakuten-styles');
        if (styleElement) {
            styleElement.remove();
        }
        
        styleElement = document.createElement('style');
        styleElement.id = 'slider-rakuten-styles';
        document.head.appendChild(styleElement);

        const viewportWidth = window.innerWidth;
        const slideWidth = Math.floor(viewportWidth * 0.87); // 87vw
        const slideGap = Math.floor(viewportWidth * 0.02); // 2vw gap
        const sideSpace = Math.floor((viewportWidth - slideWidth) / 2); // Espacio a los lados

        styleElement.textContent = `
            /* Resetear estilos base del slider */
            .slider-section {
                position: relative !important;
                width: 100vw !important;
                height: 60vh !important;
                min-height: 400px !important;
                max-height: 600px !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
                background: #141414 !important;
                z-index: 1 !important;
            }

            .slider-section .slider-title {
                display: none !important;
            }

            .slider-container {
                position: relative !important;
                width: 100% !important;
                height: 100% !important;
                overflow: hidden !important;
                margin: 0 !important;
                padding: 0 !important;
            }

            .slider-wrapper {
                position: relative !important;
                display: flex !important;
                height: 100% !important;
                width: calc(100% + ${slideGap}px) !important;
                transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
                will-change: transform !important;
                margin: 0 !important;
                padding: 0 !important;
                left: ${sideSpace}px !important;
            }

            .slider-slide {
                position: relative !important;
                flex: 0 0 ${slideWidth}px !important;
                width: ${slideWidth}px !important;
                height: 100% !important;
                margin-right: ${slideGap}px !important;
                border-radius: 8px !important;
                overflow: hidden !important;
                cursor: pointer !important;
                background: #000 !important;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;
                transition: transform 0.3s ease, box-shadow 0.3s ease !important;
            }

            .slider-slide:hover {
                transform: scale(1.02) !important;
                box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5) !important;
                z-index: 2 !important;
            }

            .slider-slide:last-child {
                margin-right: 0 !important;
            }

            .slider-img-wrapper {
                position: relative !important;
                width: 100% !important;
                height: 100% !important;
                overflow: hidden !important;
                margin: 0 !important;
                padding: 0 !important;
            }

            .slider-img-wrapper img {
                width: 100% !important;
                height: 100% !important;
                object-fit: cover !important;
                object-position: center !important;
                transition: transform 0.3s ease !important;
                display: block !important;
                margin: 0 !important;
                padding: 0 !important;
            }

            .slider-slide:hover .slider-img-wrapper img {
                transform: scale(1.05) !important;
            }

            .slider-overlay {
                position: absolute !important;
                bottom: 0 !important;
                left: 0 !important;
                right: 0 !important;
                background: linear-gradient(
                    to top,
                    rgba(0, 0, 0, 0.9) 0%,
                    rgba(0, 0, 0, 0.7) 30%,
                    rgba(0, 0, 0, 0.4) 60%,
                    transparent 100%
                ) !important;
                padding: 2rem !important;
                color: white !important;
                opacity: 0 !important;
                transform: translateY(20px) !important;
                transition: all 0.4s ease !important;
                pointer-events: none !important;
            }

            .slider-slide:hover .slider-overlay {
                opacity: 1 !important;
                transform: translateY(0) !important;
                pointer-events: all !important;
            }

            .slider-title-movie {
                font-size: clamp(1.5rem, 3vw, 2.5rem) !important;
                font-weight: 700 !important;
                margin-bottom: 0.8rem !important;
                line-height: 1.2 !important;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8) !important;
                color: white !important;
            }

            .slider-meta {
                display: flex !important;
                flex-wrap: wrap !important;
                gap: 1rem !important;
                margin-bottom: 1rem !important;
                font-size: 0.9rem !important;
                opacity: 0.9 !important;
            }

            .slider-meta span {
                display: flex !important;
                align-items: center !important;
                gap: 0.3rem !important;
                font-weight: 500 !important;
                color: white !important;
            }

            .slider-description {
                font-size: 0.95rem !important;
                line-height: 1.5 !important;
                opacity: 0.85 !important;
                max-width: 70% !important;
                display: -webkit-box !important;
                -webkit-line-clamp: 3 !important;
                -webkit-box-orient: vertical !important;
                overflow: hidden !important;
                color: white !important;
            }

            /* Navegación */
            .slider-nav {
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                pointer-events: none !important;
                z-index: 10 !important;
            }

            .slider-nav-btn {
                width: 60px !important;
                height: 60px !important;
                border-radius: 50% !important;
                background: rgba(255, 255, 255, 0.15) !important;
                backdrop-filter: blur(10px) !important;
                border: 2px solid rgba(255, 255, 255, 0.2) !important;
                color: white !important;
                font-size: 1.4rem !important;
                cursor: pointer !important;
                pointer-events: all !important;
                transition: all 0.3s ease !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
                opacity: 0 !important;
                transform: scale(0.8) !important;
                margin: 0 !important;
                padding: 0 !important;
            }

            .slider-container:hover .slider-nav-btn {
                opacity: 1 !important;
                transform: scale(1) !important;
            }

            .slider-nav-btn:hover {
                background: rgba(255, 255, 255, 0.25) !important;
                border-color: rgba(255, 255, 255, 0.4) !important;
                transform: scale(1.1) !important;
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5) !important;
            }

            .slider-nav-btn:active {
                transform: scale(0.95) !important;
            }

            .slider-nav-btn.prev {
                margin-left: ${Math.floor(sideSpace / 2 - 30)}px !important;
            }

            .slider-nav-btn.next {
                margin-right: ${Math.floor(sideSpace / 2 - 30)}px !important;
            }

            /* Paginación */
            .slider-pagination {
                position: absolute !important;
                bottom: 2rem !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
                display: flex !important;
                gap: 0.5rem !important;
                z-index: 10 !important;
                margin: 0 !important;
                padding: 0 !important;
            }

            .slider-pagination-dot {
                width: 10px !important;
                height: 10px !important;
                border-radius: 50% !important;
                background: rgba(255, 255, 255, 0.4) !important;
                border: none !important;
                cursor: pointer !important;
                transition: all 0.3s ease !important;
                opacity: 0.6 !important;
                margin: 0 !important;
                padding: 0 !important;
            }

            .slider-pagination-dot.active {
                background: #ffffff !important;
                opacity: 1 !important;
                transform: scale(1.2) !important;
            }

            .slider-pagination-dot:hover {
                background: rgba(255, 255, 255, 0.8) !important;
                opacity: 1 !important;
                transform: scale(1.1) !important;
            }

            /* Responsive */
            @media (max-width: 768px) {
                .slider-section {
                    height: 50vh !important;
                    min-height: 300px !important;
                }

                .slider-nav-btn {
                    width: 50px !important;
                    height: 50px !important;
                    font-size: 1.2rem !important;
                }

                .slider-overlay {
                    padding: 1.5rem !important;
                }

                .slider-title-movie {
                    font-size: clamp(1.2rem, 4vw, 2rem) !important;
                }

                .slider-description {
                    max-width: 85% !important;
                    -webkit-line-clamp: 2 !important;
                }
            }

            @media (max-width: 480px) {
                .slider-nav-btn {
                    width: 45px !important;
                    height: 45px !important;
                    font-size: 1rem !important;
                }

                .slider-overlay {
                    padding: 1rem !important;
                }
            }
        `;

        console.log('Slider: Estilos aplicados - Ancho slide:', slideWidth, 'Gap:', slideGap, 'Espacio lateral:', sideSpace);
    }

    // Renderizar slider
    function renderSlider() {
        console.log('Slider: Iniciando renderizado...');
        
        const sliderWrapper = document.getElementById('slider-wrapper');
        if (!sliderWrapper) {
            console.error('Slider: slider-wrapper no encontrado');
            return;
        }

        // Obtener datos
        const movies = window.carousel?.moviesData;
        if (!movies || movies.length === 0) {
            console.error('Slider: No hay datos de películas');
            setTimeout(renderSlider, 500);
            return;
        }

        console.log('Slider: Datos disponibles:', movies.length, 'películas');

        // Aplicar estilos
        createRakutenStyles();

        // Seleccionar películas para el slider
        slidesData = [];
        const usedGenres = new Set();
        
        // Ordenar por rating primero
        const sortedMovies = [...movies].sort((a, b) => {
            const ratingA = parseFloat(a.rating) || 0;
            const ratingB = parseFloat(b.rating) || 0;
            return ratingB - ratingA;
        });

        // Seleccionar películas de diferentes géneros
        for (const movie of sortedMovies) {
            if (movie.genre) {
                const mainGenre = movie.genre.split(/[·,]/)[0].trim();
                if (!usedGenres.has(mainGenre)) {
                    slidesData.push(movie);
                    usedGenres.add(mainGenre);
                    if (slidesData.length >= 8) break;
                }
            }
        }

        // Completar si hace falta
        if (slidesData.length < 6) {
            for (const movie of sortedMovies) {
                if (!slidesData.find(m => m.id === movie.id)) {
                    slidesData.push(movie);
                    if (slidesData.length >= 8) break;
                }
                if (slidesData.length >= 8) break;
            }
        }

        totalSlides = slidesData.length;
        console.log('Slider: Renderizando', totalSlides, 'slides');

        // Limpiar y crear slides
        sliderWrapper.innerHTML = '';
        
        slidesData.forEach((movie, index) => {
            const slideDiv = document.createElement('div');
            slideDiv.className = 'slider-slide';
            slideDiv.dataset.index = index;
            
            const imageUrl = movie.postersUrl || movie.posterUrl || movie.imageUrl || 
                           `https://via.placeholder.com/800x450/333/fff?text=${encodeURIComponent(movie.title)}`;
            
            slideDiv.innerHTML = `
                <div class="slider-img-wrapper">
                    <img src="${imageUrl}" 
                         alt="${movie.title}" 
                         loading="${index === 0 ? 'eager' : 'lazy'}"
                         onerror="this.src='https://via.placeholder.com/800x450/333/fff?text=No+Image'">
                </div>
                <div class="slider-overlay">
                    <div class="slider-title-movie">${movie.title || 'Sin título'}</div>
                    <div class="slider-meta">
                        ${movie.year ? `<span>${movie.year}</span>` : ''}
                        ${movie.duration ? `<span>${movie.duration}</span>` : ''}
                        ${movie.genre ? `<span>${movie.genre.split(/[·,]/)[0].trim()}</span>` : ''}
                        ${movie.rating ? `<span><i class="fas fa-star"></i> ${movie.rating}</span>` : ''}
                    </div>
                    <div class="slider-description">${movie.description || movie.synopsis || 'Sin descripción disponible'}</div>
                </div>
            `;

            // Click handler
            slideDiv.addEventListener('click', (e) => {
                if (!isTransitioning) {
                    e.preventDefault();
                    console.log('Slider: Click en slide:', movie.title);
                    if (window.detailsModal && typeof window.detailsModal.show === 'function') {
                        window.detailsModal.show(movie, slideDiv);
                    }
                }
            });

            sliderWrapper.appendChild(slideDiv);
        });

        // Configurar controles
        setupControls();
        
        // Ir al primer slide
        currentIndex = 0;
        updateSliderPosition();
        
        console.log('Slider: Renderizado completado con', totalSlides, 'slides');
    }

    // Configurar controles
    function setupControls() {
        // Navegación
        const prevBtn = document.getElementById('slider-prev');
        const nextBtn = document.getElementById('slider-next');
        
        if (prevBtn) {
            prevBtn.replaceWith(prevBtn.cloneNode(true));
            const newPrevBtn = document.getElementById('slider-prev');
            newPrevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isTransitioning) {
                    goToSlide(currentIndex - 1);
                }
            });
        }
        
        if (nextBtn) {
            nextBtn.replaceWith(nextBtn.cloneNode(true));
            const newNextBtn = document.getElementById('slider-next');
            newNextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isTransitioning) {
                    goToSlide(currentIndex + 1);
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
                    goToSlide(i);
                }
            });
            
            pagination.appendChild(dot);
        }
    }

    // Ir a slide
    function goToSlide(index) {
        if (isTransitioning || totalSlides === 0) return;
        
        // Navegación circular
        if (index < 0) index = totalSlides - 1;
        if (index >= totalSlides) index = 0;
        
        if (index === currentIndex) return;
        
        console.log('Slider: Cambiando a slide', index);
        
        currentIndex = index;
        updateSliderPosition();
        updatePagination();
    }

    // Actualizar posición
    function updateSliderPosition() {
        const wrapper = document.getElementById('slider-wrapper');
        if (!wrapper) return;
        
        isTransitioning = true;
        
        const viewportWidth = window.innerWidth;
        const slideWidth = Math.floor(viewportWidth * 0.87);
        const slideGap = Math.floor(viewportWidth * 0.02);
        
        const translateX = -(slideWidth + slideGap) * currentIndex;
        wrapper.style.transform = `translateX(${translateX}px)`;
        
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

    // Manejar resize
    function handleResize() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (totalSlides > 0) {
                createRakutenStyles();
                updateSliderPosition();
            }
        }, 200);
    }

    // Inicializar
    function init() {
        console.log('Slider: Inicializando...');
        
        if (window.carousel?.moviesData?.length > 0) {
            renderSlider();
            window.addEventListener('resize', handleResize);
        } else {
            console.log('Slider: Esperando datos del carousel...');
            setTimeout(init, 200);
        }
    }

    // Cleanup
    window.addEventListener('beforeunload', () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(resizeTimeout);
    });

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Exponer API
    window.slider = {
        goToSlide,
        next: () => goToSlide(currentIndex + 1),
        prev: () => goToSlide(currentIndex - 1),
        getCurrentIndex: () => currentIndex,
        getTotalSlides: () => totalSlides,
        getSlidesData: () => slidesData,
        init,
        renderSlider,
        createRakutenStyles
    };

})();