// Slider Rakuten.TV - Versión funcional completa
(function () {
    let currentIndex = 0;
    let totalSlides = 0;
    let isTransitioning = false;
    let resizeTimeout = null;
    let slidesData = [];

    // Función para actualizar las variables CSS dinámicamente
    function updateSliderCSSVariables() {
        const viewportWidth = window.innerWidth;
        const slideWidth = Math.floor(viewportWidth * 0.87); // 87vw
        const slideGap = Math.floor(viewportWidth * 0.02); // 2vw gap
        const sideSpace = Math.floor((viewportWidth - slideWidth) / 2); // Espacio a los lados
        const navBtnOffset = Math.floor(sideSpace / 2 - 30);

        // Actualizar variables CSS
        document.documentElement.style.setProperty('--slider-slide-width', `${slideWidth}px`);
        document.documentElement.style.setProperty('--slider-slide-gap', `${slideGap}px`);
        document.documentElement.style.setProperty('--slider-side-space', `${sideSpace}px`);
        document.documentElement.style.setProperty('--slider-nav-btn-offset', `${navBtnOffset}px`);

        console.log('Slider: Variables CSS actualizadas - Ancho slide:', slideWidth, 'Gap:', slideGap, 'Espacio lateral:', sideSpace);
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

        // Aplicar variables CSS
        updateSliderCSSVariables();

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

        // Si aún no hay suficientes, tomar las primeras películas
        if (slidesData.length < 6) {
            for (const movie of sortedMovies) {
                if (!slidesData.find(m => m.id === movie.id)) {
                    slidesData.push(movie);
                    if (slidesData.length >= 8) break;
                }
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
            
            // Usar la imagen correcta según los datos disponibles
            const imageUrl = movie.postersUrl || movie.posterUrl || movie.imageUrl || 
                           `https://via.placeholder.com/800x450/333/fff?text=${encodeURIComponent(movie.title)}`;
            
            // Obtener el género principal
            const mainGenre = movie.genre ? movie.genre.split(/[·,]/)[0].trim() : '';
            
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
                        ${mainGenre ? `<span>${mainGenre}</span>` : ''}
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

    // Actualizar posición usando variables CSS
    function updateSliderPosition() {
        const wrapper = document.getElementById('slider-wrapper');
        if (!wrapper) return;
        
        isTransitioning = true;
        
        // Obtener valores de las variables CSS
        const slideWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--slider-slide-width')) || Math.floor(window.innerWidth * 0.87);
        const slideGap = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--slider-slide-gap')) || Math.floor(window.innerWidth * 0.02);
        
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

    // Manejar resize con actualización en tiempo real
    function handleResize() {
        clearTimeout(resizeTimeout);
        
        // Actualización inmediata para mejor respuesta
        if (totalSlides > 0) {
            updateSliderCSSVariables();
            updateSliderPosition();
        }
        
        // Actualización adicional después de un breve delay para asegurar estabilidad
        resizeTimeout = setTimeout(() => {
            if (totalSlides > 0) {
                updateSliderCSSVariables();
                updateSliderPosition();
            }
        }, 100);
    }

    // Inicializar
    function init() {
        console.log('Slider: Inicializando...');
        
        // Inicializar variables CSS
        updateSliderCSSVariables();
        
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
        updateSliderCSSVariables
    };

})();