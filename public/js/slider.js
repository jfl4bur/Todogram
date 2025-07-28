// Slider simple - Lógica exacta del carrusel
(function () {
    let currentIndex = 0;
    let totalSlides = 0;
    let autoplayInterval = null;

    // Función simple para renderizar el slider
    function renderSlider() {
        console.log('Slider: Iniciando renderizado...');
        
        const sliderWrapper = document.getElementById('slider-wrapper');
        
        if (!sliderWrapper) {
            console.error('Slider: Elementos no encontrados');
            return;
        }

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
            slideDiv.dataset.itemId = i; // EXACTAMENTE como el carrusel
            
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
        const slide = wrapper.querySelector('.slider-slide');
        if (!slide) return;
        
        const slideWidth = slide.offsetWidth;
        const gap = 24; // gap del CSS
        const scrollPosition = (slideWidth + gap) * index;
        
        wrapper.scrollTo({
            left: scrollPosition,
            behavior: 'smooth'
        });
        
        updatePagination();
    }

    // Actualizar paginación
    function updatePagination() {
        const dots = document.querySelectorAll('.slider-pagination-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
        });
    }

    // Inicializar cuando el carrusel esté listo
    function init() {
        console.log('Slider: Inicializando...');
        
        if (window.carousel && window.carousel.moviesData && window.carousel.moviesData.length > 0) {
            console.log('Slider: Datos disponibles, renderizando...');
            renderSlider();
        } else {
            console.log('Slider: Esperando datos...');
            setTimeout(init, 100);
        }
    }

    // Iniciar inmediatamente
    init();

    // Exponer funciones para debug
    window.slider = {
        renderSlider,
        goToSlide,
        init
    };

})(); 