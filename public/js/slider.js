// Slider tipo Rakuten.tv - Carousel con items adyacentes, bordes redondeados y responsive
// Autor: Optimizado para Todogram

(function () {
    const SLIDER_SELECTOR = '#slider-wrapper';
    const SKELETON_SELECTOR = '#slider-skeleton';
    const PAGINATION_SELECTOR = '#slider-pagination';
    const PREV_SELECTOR = '#slider-prev';
    const NEXT_SELECTOR = '#slider-next';

    let currentIndex = 0;
    let totalSlides = 0;
    let isAnimating = false;

    // Utilidad para obtener el gap según el tamaño de pantalla
    function getGap() {
        const w = window.innerWidth;
        if (w <= 375) return 10;
        if (w <= 480) return 12;
        if (w <= 768) return 16;
        if (w <= 900) return 20;
        return 24;
    }

    // Renderiza el slider
    function renderSlider() {
        const sliderWrapper = document.querySelector(SLIDER_SELECTOR);
        const sliderSkeleton = document.querySelector(SKELETON_SELECTOR);
        if (!sliderWrapper || !sliderSkeleton) return;

        // Oculta skeleton y muestra slider
        sliderSkeleton.style.display = 'none';
        sliderWrapper.style.display = 'flex';
        sliderWrapper.innerHTML = '';

        // Usar los datos del carrusel
        const peliculas = window.carousel.moviesData;
        // Detecta todos los géneros únicos disponibles
        const generos = new Set();
        peliculas.forEach(p => {
            if (p.genre) p.genre.split(/\s*[·,]\s*/).forEach(g => generos.add(g.trim()));
        });
        // Selecciona la primera película de cada género, sin repeticiones
        const seleccionadas = [];
        const idsIncluidos = new Set();
        for (const genero of generos) {
            const peli = peliculas.find(p => p.genre && p.genre.split(/\s*[·,]\s*/).some(g => g.trim().toLowerCase() === genero.toLowerCase()) && !idsIncluidos.has(p.id));
            if (peli) {
                seleccionadas.push(peli);
                idsIncluidos.add(peli.id);
            }
        }
        totalSlides = seleccionadas.length;
        // Renderiza cada slide
        seleccionadas.forEach((item, idx) => {
            const div = document.createElement('div');
            div.className = 'slider-slide';
            div.setAttribute('data-slide-index', idx);
            div.tabIndex = 0;
            div.setAttribute('role', 'button');
            div.setAttribute('aria-label', item.title);
            div.innerHTML = `
                <div class="slider-img-wrapper">
                    <img src="${item.postersUrl || item.posterUrl || 'https://via.placeholder.com/1540x464'}" alt="${item.title}" loading="lazy">
                </div>
                <div class="slider-overlay">
                    <div class="slider-title-movie">${item.title}</div>
                    <div class="slider-meta">${item.year ? `<span>${item.year}</span>` : ''}${item.duration ? `<span>${item.duration}</span>` : ''}${item.genre ? `<span>${item.genre.split(/[·,]/)[0]}</span>` : ''}${item.rating ? `<span><i class='fas fa-star'></i> ${item.rating}</span>` : ''}</div>
                    <div class="slider-description">${item.description || ''}</div>
                </div>
            `;
            div.addEventListener('click', () => {
                if (window.detailsModal) window.detailsModal.show(item, div);
            });
            div.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (window.detailsModal) window.detailsModal.show(item, div);
                }
            });
            sliderWrapper.appendChild(div);
        });
        createPagination(totalSlides);
        setupNav();
        setupSwipe();
        goToSlide(0, true);
    }

    // Crea la paginación
    function createPagination(n) {
        const pagination = document.querySelector(PAGINATION_SELECTOR);
        if (!pagination) return;
        pagination.innerHTML = '';
        for (let i = 0; i < n; i++) {
            const dot = document.createElement('button');
            dot.className = 'slider-pagination-dot';
            dot.setAttribute('data-slide', i);
            dot.setAttribute('aria-label', `Ir al slide ${i + 1}`);
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => goToSlide(i));
            pagination.appendChild(dot);
        }
    }

    // Navegación con flechas
    function setupNav() {
        const prevBtn = document.querySelector(PREV_SELECTOR);
        const nextBtn = document.querySelector(NEXT_SELECTOR);
        if (!prevBtn || !nextBtn) return;
        prevBtn.onclick = () => goToSlide(currentIndex - 1);
        nextBtn.onclick = () => goToSlide(currentIndex + 1);
        updateNavButtons();
    }

    // Swipe/touch
    function setupSwipe() {
        const wrapper = document.querySelector(SLIDER_SELECTOR);
        let startX = 0, scrollStart = 0, isDown = false;
        wrapper.addEventListener('pointerdown', e => {
            isDown = true;
            startX = e.pageX;
            scrollStart = wrapper.scrollLeft;
            wrapper.setPointerCapture(e.pointerId);
        });
        wrapper.addEventListener('pointermove', e => {
            if (!isDown) return;
            const dx = e.pageX - startX;
            wrapper.scrollLeft = scrollStart - dx;
        });
        wrapper.addEventListener('pointerup', e => {
            isDown = false;
            const slide = wrapper.querySelector('.slider-slide');
            if (!slide) return;
            const slideWidth = slide.offsetWidth;
            const gap = getGap();
            const idx = Math.round(wrapper.scrollLeft / (slideWidth + gap));
            goToSlide(idx);
        });
        wrapper.addEventListener('pointerleave', () => { isDown = false; });
    }

    // Ir a un slide específico
    function goToSlide(idx, instant) {
        if (idx < 0) idx = 0;
        if (idx >= totalSlides) idx = totalSlides - 1;
        currentIndex = idx;
        const wrapper = document.querySelector(SLIDER_SELECTOR);
        const slide = wrapper.querySelector('.slider-slide');
        if (!slide) return;
        const slideWidth = slide.offsetWidth;
        const gap = getGap();
        const scrollPosition = (slideWidth + gap) * idx;
        wrapper.scrollTo({ left: scrollPosition, behavior: instant ? 'auto' : 'smooth' });
        updatePagination(idx);
        updateNavButtons();
    }

    // Actualiza la paginación
    function updatePagination(idx) {
        document.querySelectorAll('.slider-pagination-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === idx);
        });
    }

    // Actualiza los botones de navegación
    function updateNavButtons() {
        const prevBtn = document.querySelector(PREV_SELECTOR);
        const nextBtn = document.querySelector(NEXT_SELECTOR);
        if (!prevBtn || !nextBtn) return;
        prevBtn.style.display = currentIndex === 0 ? 'none' : 'flex';
        nextBtn.style.display = currentIndex === totalSlides - 1 ? 'none' : 'flex';
    }

    // Inicialización automática cuando el carrusel esté listo
    function waitForCarousel() {
        if (window.carousel && window.carousel.moviesData && window.carousel.moviesData.length > 0) {
            renderSlider();
        } else {
            setTimeout(waitForCarousel, 100);
        }
    }
    waitForCarousel();

    // Exponer para debug
    window.slider = { goToSlide };
})(); 