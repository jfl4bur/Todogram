// Slider simplificado - Versión funcional directa
(function () {
    let currentIndex = 0;
    let totalSlides = 0;
    let isTransitioning = false;
    let slidesData = [];

    // Crear estilos CSS básicos
    function createBasicStyles() {
        let styleElement = document.getElementById('slider-basic-styles');
        if (styleElement) {
            styleElement.remove();
        }
        
        styleElement = document.createElement('style');
        styleElement.id = 'slider-basic-styles';
        document.head.appendChild(styleElement);

        const viewportWidth = window.innerWidth;
        const slideWidth = Math.floor(viewportWidth * 0.87);
        const slideGap = Math.floor(viewportWidth * 0.02);
        const sideSpace = Math.floor((viewportWidth - slideWidth) / 2);

        styleElement.textContent = `
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
    }

    // Crear datos de ejemplo
    function createSampleData() {
        return [
            {
                id: "1",
                title: "Película de ejemplo 1",
                description: "Esta es una película de ejemplo para el slider.",
                posterUrl: "https://via.placeholder.com/800x450/333/fff?text=Película+1",
                year: "2024",
                duration: "120 min",
                genre: "Acción",
                rating: "8.5"
            },
            {
                id: "2", 
                title: "Película de ejemplo 2",
                description: "Otra película de ejemplo para mostrar en el slider.",
                posterUrl: "https://via.placeholder.com/800x450/444/fff?text=Película+2",
                year: "2024",
                duration: "95 min",
                genre: "Comedia",
                rating: "7.8"
            },
            {
                id: "3",
                title: "Película de ejemplo 3", 
                description: "Una tercera película de ejemplo para completar el slider.",
                posterUrl: "https://via.placeholder.com/800x450/555/fff?text=Película+3",
                year: "2024",
                duration: "110 min",
                genre: "Drama",
                rating: "8.2"
            },
            {
                id: "4",
                title: "Película de ejemplo 4", 
                description: "Una cuarta película de ejemplo para el slider.",
                posterUrl: "https://via.placeholder.com/800x450/666/fff?text=Película+4",
                year: "2024",
                duration: "105 min",
                genre: "Ciencia Ficción",
                rating: "8.7"
            },
            {
                id: "5",
                title: "Película de ejemplo 5", 
                description: "Una quinta película de ejemplo para el slider.",
                posterUrl: "https://via.placeholder.com/800x450/777/fff?text=Película+5",
                year: "2024",
                duration: "115 min",
                genre: "Thriller",
                rating: "8.1"
            }
        ];
    }

    // Renderizar slider
    function renderSlider() {
        console.log('Slider Simple: Iniciando renderizado...');
        
        const sliderWrapper = document.getElementById('slider-wrapper');
        if (!sliderWrapper) {
            console.error('Slider Simple: slider-wrapper no encontrado');
            return;
        }

        // Crear estilos
        createBasicStyles();

        // Usar datos de ejemplo
        slidesData = createSampleData();
        totalSlides = slidesData.length;
        console.log('Slider Simple: Renderizando', totalSlides, 'slides');

        // Limpiar y crear slides
        sliderWrapper.innerHTML = '';
        
        slidesData.forEach((movie, index) => {
            const slideDiv = document.createElement('div');
            slideDiv.className = 'slider-slide';
            slideDiv.dataset.index = index;
            
            slideDiv.innerHTML = `
                <div class="slider-img-wrapper">
                    <img src="${movie.posterUrl}" 
                         alt="${movie.title}" 
                         loading="${index === 0 ? 'eager' : 'lazy'}"
                         onerror="this.src='https://via.placeholder.com/800x450/333/fff?text=No+Image'">
                </div>
                <div class="slider-overlay">
                    <div class="slider-title-movie">${movie.title}</div>
                    <div class="slider-meta">
                        ${movie.year ? `<span>${movie.year}</span>` : ''}
                        ${movie.duration ? `<span>${movie.duration}</span>` : ''}
                        ${movie.genre ? `<span>${movie.genre}</span>` : ''}
                        ${movie.rating ? `<span><i class="fas fa-star"></i> ${movie.rating}</span>` : ''}
                    </div>
                    <div class="slider-description">${movie.description}</div>
                </div>
            `;

            // Click handler
            slideDiv.addEventListener('click', (e) => {
                if (!isTransitioning) {
                    e.preventDefault();
                    console.log('Slider Simple: Click en slide:', movie.title);
                }
            });

            sliderWrapper.appendChild(slideDiv);
        });

        // Configurar controles
        setupControls();
        
        // Ir al primer slide
        currentIndex = 0;
        updateSliderPosition();
        
        console.log('Slider Simple: Renderizado completado con', totalSlides, 'slides');
    }

    // Configurar controles
    function setupControls() {
        // Navegación
        const prevBtn = document.getElementById('slider-prev');
        const nextBtn = document.getElementById('slider-next');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isTransitioning) {
                    goToSlide(currentIndex - 1);
                }
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
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
        
        console.log('Slider Simple: Cambiando a slide', index);
        
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

    // Inicializar
    function init() {
        console.log('Slider Simple: Inicializando...');
        
        const sliderWrapper = document.getElementById('slider-wrapper');
        if (!sliderWrapper) {
            console.error('Slider Simple: slider-wrapper no encontrado en el DOM');
            setTimeout(init, 500);
            return;
        }

        renderSlider();
    }

    // Auto-init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Exponer API
    window.sliderSimple = {
        goToSlide,
        next: () => goToSlide(currentIndex + 1),
        prev: () => goToSlide(currentIndex - 1),
        getCurrentIndex: () => currentIndex,
        getTotalSlides: () => totalSlides,
        getSlidesData: () => slidesData,
        init,
        renderSlider
    };

})(); 