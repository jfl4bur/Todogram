// Slider Rakuten.TV - Versión simplificada
(function () {
    let currentIndex = 0;
    let totalSlides = 0;
    let isTransitioning = false;
    let resizeTimeout = null;
    let slidesData = [];

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
            console.error('Slider: No hay datos de películas disponibles');
            return;
        }

        console.log('Slider: Datos disponibles:', movies.length, 'películas');

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

        // Si aún no hay suficientes slides, usar todas las películas disponibles
        if (slidesData.length === 0) {
            slidesData = sortedMovies.slice(0, 8);
        }

        totalSlides = slidesData.length;
        console.log('Slider: Renderizando', totalSlides, 'slides');

        if (totalSlides === 0) {
            console.error('Slider: No hay slides para renderizar');
            return;
        }

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
                updateSliderPosition();
            }
        }, 200);
    }

    // Inicializar
    function init() {
        console.log('Slider: Inicializando...');
        
        // Verificar que los elementos del DOM existan
        const sliderWrapper = document.getElementById('slider-wrapper');
        if (!sliderWrapper) {
            console.error('Slider: slider-wrapper no encontrado en el DOM');
            setTimeout(init, 500);
            return;
        }

        // Verificar si ya hay datos disponibles
        if (window.carousel?.moviesData?.length > 0) {
            console.log('Slider: Datos disponibles inmediatamente:', window.carousel.moviesData.length, 'películas');
            renderSlider();
            window.addEventListener('resize', handleResize);
        } else {
            console.log('Slider: Esperando datos del carousel...');
            
            // Crear un observador para detectar cuando los datos estén disponibles
            let attempts = 0;
            const maxAttempts = 50; // 5 segundos máximo
            
            const checkForData = () => {
                attempts++;
                
                if (window.carousel?.moviesData?.length > 0) {
                    console.log('Slider: Datos encontrados después de', attempts * 100, 'ms:', window.carousel.moviesData.length, 'películas');
                    renderSlider();
                    window.addEventListener('resize', handleResize);
                } else if (attempts < maxAttempts) {
                    setTimeout(checkForData, 100);
                } else {
                    console.error('Slider: No se pudieron obtener datos después de', maxAttempts * 100, 'ms');
                    // Crear datos de ejemplo si no hay datos disponibles
                    createFallbackData();
                }
            };
            
            checkForData();
        }
    }

    // Crear datos de fallback si no hay datos disponibles
    function createFallbackData() {
        console.log('Slider: Creando datos de fallback...');
        
        const fallbackMovies = [
            {
                id: "1",
                title: "Película de ejemplo 1",
                description: "Esta es una película de ejemplo para el slider.",
                posterUrl: "https://via.placeholder.com/800x450/333/fff?text=Película+1",
                postersUrl: "https://via.placeholder.com/800x450/333/fff?text=Película+1",
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
                postersUrl: "https://via.placeholder.com/800x450/444/fff?text=Película+2",
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
                postersUrl: "https://via.placeholder.com/800x450/555/fff?text=Película+3",
                year: "2024",
                duration: "110 min",
                genre: "Drama",
                rating: "8.2"
            }
        ];

        // Asignar los datos de fallback
        if (!window.carousel) {
            window.carousel = {};
        }
        window.carousel.moviesData = fallbackMovies;
        
        console.log('Slider: Datos de fallback creados:', fallbackMovies.length, 'películas');
        renderSlider();
        window.addEventListener('resize', handleResize);
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
        createFallbackData
    };

})();