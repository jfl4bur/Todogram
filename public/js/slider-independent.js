// Slider Independiente - Con detección automática de viewport mejorada (estilo Rakuten.tv)
(function () {
    let currentIndex = 0;
    let totalSlides = 0;
    let isTransitioning = false;
    let resizeTimeout = null;
    let slidesData = [];
    let isDestroyed = false;
    let lastViewportWidth = 0;

    // Touch event variables
    let touchStartX = 0;
    let touchMoveX = 0;
    let isDragging = false;
    let dragThreshold = 50; // Min pixels to swipe

    // --- DIMENSION AND LAYOUT ---

    function calculateResponsiveDimensions() {
        const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
        let slideWidth, slideHeight, slideGap, sideSpace;

        if (viewportWidth <= 480) { // Mobile
            slideWidth = Math.floor(viewportWidth * 0.9);
            slideHeight = Math.floor(slideWidth * 0.56);
            slideGap = 10;
        } else if (viewportWidth <= 768) { // Tablet
            slideWidth = Math.floor(viewportWidth * 0.85);
            slideHeight = Math.floor(slideWidth * 0.5);
            slideGap = 15;
        } else { // Desktop
            slideWidth = Math.floor(viewportWidth * 0.8);
            slideHeight = Math.floor(slideWidth * 0.45);
            slideGap = 20;
        }
        
        sideSpace = Math.floor((viewportWidth - slideWidth) / 2);
        
        // Clamp values
        slideWidth = Math.max(280, Math.min(slideWidth, 1600));
        slideHeight = Math.max(157, Math.min(slideHeight, 500));
        slideGap = Math.max(8, slideGap);
        sideSpace = Math.max(10, sideSpace);

        return { slideWidth, slideHeight, slideGap, sideSpace };
    }

    function updateSliderCSSVariables() {
        if (isDestroyed) return;
        const dimensions = calculateResponsiveDimensions();
        const root = document.documentElement;
        root.style.setProperty('--slider-slide-width', `${dimensions.slideWidth}px`);
        root.style.setProperty('--slider-slide-height', `${dimensions.slideHeight}px`);
        root.style.setProperty('--slider-slide-gap', `${dimensions.slideGap}px`);
        root.style.setProperty('--slider-side-space', `${dimensions.sideSpace}px`);
    }

    function updateSliderPosition(forceUpdate = false) {
        if (isDestroyed) return;
        const wrapper = document.getElementById('slider-wrapper');
        if (!wrapper) return;

        if (!forceUpdate) {
            isTransitioning = true;
            wrapper.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        } else {
            wrapper.style.transition = 'none';
        }

        const dimensions = calculateResponsiveDimensions();
        const translateX = -(dimensions.slideWidth + dimensions.slideGap) * currentIndex;
        wrapper.style.transform = `translateX(${translateX}px)`;

        if (!forceUpdate) {
            setTimeout(() => { isTransitioning = false; }, 600);
        }
    }
    
    function forceCompleteRecalculation() {
        updateSliderCSSVariables();
        updateSliderPosition(true);
    }

    function handleResize() {
        if (isDestroyed) return;
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (isDestroyed) return;
            forceCompleteRecalculation();
        }, 150);
    }

    // --- DATA AND RENDERING ---

    async function loadSliderData() {
        try {
            const response = await fetch(DATA_URL);
            if (!response.ok) throw new Error('No se pudo cargar data.json');
            const data = await response.json();
            return data
                .filter(item => item && typeof item === 'object' && item['Categoría'] === 'Películas' && typeof item['Slider'] === 'string' && item['Slider'].trim() !== '')
                .map((item, index) => ({
                    id: index.toString(),
                    title: item['Título'] || 'Sin título',
                    description: item['Synopsis'] || 'Descripción no disponible',
                    sliderUrl: item['Slider'] || '',
                    ...item
                }));
        } catch (error) {
            console.error('Slider: Error cargando datos:', error);
            return [];
        }
    }

    function renderSlider(moviesData = []) {
        if (isDestroyed) return;
        const sliderWrapper = document.getElementById('slider-wrapper');
        if (!sliderWrapper) return;

        slidesData = moviesData.length > 0 ? moviesData : slidesData;
        const selectedMovies = slidesData
            .sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0))
            .slice(0, 8);

        slidesData = selectedMovies;
        totalSlides = slidesData.length;
        if (totalSlides === 0) return;

        sliderWrapper.innerHTML = ''; // Clear existing slides

        slidesData.forEach((movie, index) => {
            const slideDiv = document.createElement('div');
            slideDiv.className = 'slider-slide';
            slideDiv.dataset.index = index;

            const imageUrl = movie.sliderUrl || `https://via.placeholder.com/600x338/333/fff?text=${encodeURIComponent(movie.title)}`;
            
            slideDiv.innerHTML = `
                <div class="slider-img-wrapper">
                    <img src="${imageUrl}" alt="${movie.title}" loading="${index === 0 ? 'eager' : 'lazy'}" onerror="this.style.display='none'">
                </div>
                <div class="slider-overlay">
                    <div class="slider-title-movie">${movie.title || ''}</div>
                    <div class="slider-description">${movie.description || movie.synopsis || ''}</div>
                </div>
            `;

            slideDiv.addEventListener('click', (e) => {
                if (isDragging) { // Prevent click during/after drag
                    e.preventDefault();
                    return;
                }
                if (!isTransitioning) {
                    openDetailsModal(movie, slideDiv);
                }
            });

            sliderWrapper.appendChild(slideDiv);
        });

        setupControls();
        forceCompleteRecalculation();
        updatePagination();
    }

    // --- CONTROLS AND NAVIGATION ---

    function goToSlide(index) {
        if (isTransitioning || totalSlides === 0 || isDestroyed) return;
        
        // Circular navigation
        if (index < 0) {
            index = totalSlides - 1;
        } else if (index >= totalSlides) {
            index = 0;
        }
        
        if (index === currentIndex) return;
        
        currentIndex = index;
        updateSliderPosition();
        updatePagination();
    }

    function setupControls() {
        const prevBtn = document.getElementById('slider-prev');
        const nextBtn = document.getElementById('slider-next');
        const sliderWrapper = document.getElementById('slider-wrapper');

        // Clone and replace buttons to remove old listeners
        if (prevBtn) {
            const newPrevBtn = prevBtn.cloneNode(true);
            prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
            newPrevBtn.addEventListener('click', () => goToSlide(currentIndex - 1));
        }
        
        if (nextBtn) {
            const newNextBtn = nextBtn.cloneNode(true);
            nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
            newNextBtn.addEventListener('click', () => goToSlide(currentIndex + 1));
        }

        // Touch controls
        if (sliderWrapper) {
            sliderWrapper.addEventListener('touchstart', handleTouchStart, { passive: true });
            sliderWrapper.addEventListener('touchmove', handleTouchMove, { passive: true });
            sliderWrapper.addEventListener('touchend', handleTouchEnd);
        }

        createPagination();
    }

    // --- TOUCH HANDLERS ---

    function handleTouchStart(e) {
        isDragging = false;
        touchStartX = e.touches[0].clientX;
        const wrapper = document.getElementById('slider-wrapper');
        if(wrapper) wrapper.style.transition = 'none'; // Disable transition during swipe
    }

    function handleTouchMove(e) {
        if (touchStartX === 0) return;
        touchMoveX = e.touches[0].clientX;
        const diff = touchMoveX - touchStartX;

        // Instantly move the slider with the finger
        const wrapper = document.getElementById('slider-wrapper');
        if(wrapper) {
            const dimensions = calculateResponsiveDimensions();
            const baseTranslateX = -(dimensions.slideWidth + dimensions.slideGap) * currentIndex;
            wrapper.style.transform = `translateX(${baseTranslateX + diff}px)`;
        }
        
        if (Math.abs(diff) > 10) { // Set dragging flag if moved more than 10px
            isDragging = true;
        }
    }

    function handleTouchEnd() {
        if (touchStartX === 0) return;
        const diff = touchMoveX - touchStartX;
        
        // Re-enable transition for snap back
        const wrapper = document.getElementById('slider-wrapper');
        if(wrapper) wrapper.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

        if (Math.abs(diff) > dragThreshold) {
            if (diff < 0) { // Swiped left
                goToSlide(currentIndex + 1);
            } else { // Swiped right
                goToSlide(currentIndex - 1);
            }
        } else {
            // Not enough swipe, snap back to current slide
            updateSliderPosition();
        }

        touchStartX = 0;
        touchMoveX = 0;
        setTimeout(() => { isDragging = false; }, 50);
    }

    // --- PAGINATION ---

    function createPagination() {
        const pagination = document.getElementById('slider-pagination');
        if (!pagination) return;
        pagination.innerHTML = '';
        for (let i = 0; i < totalSlides; i++) {
            const dot = document.createElement('button');
            dot.className = 'slider-pagination-dot';
            dot.dataset.slide = i;
            dot.addEventListener('click', () => goToSlide(i));
            pagination.appendChild(dot);
        }
    }

    function updatePagination() {
        const dots = document.querySelectorAll('.slider-pagination-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
        });
    }
    
    // --- MODAL ---
    
    function openDetailsModal(movie, element) {
        if (window.detailsModal && typeof window.detailsModal.show === 'function') {
            window.detailsModal.show(movie, element);
        } else {
            console.error('Slider: Details modal no está disponible.');
        }
    }

    // --- INITIALIZATION AND CLEANUP ---

    function destroy() {
        isDestroyed = true;
        clearTimeout(resizeTimeout);
        window.removeEventListener('resize', handleResize);
        const sliderWrapper = document.getElementById('slider-wrapper');
        if (sliderWrapper) {
            sliderWrapper.removeEventListener('touchstart', handleTouchStart);
            sliderWrapper.removeEventListener('touchmove', handleTouchMove);
            sliderWrapper.removeEventListener('touchend', handleTouchEnd);
        }
    }

    async function init() {
        if (isDestroyed) return;
        const movies = await loadSliderData();
        if (movies && movies.length > 0) {
            renderSlider(movies);
            window.addEventListener('resize', handleResize, { passive: true });
        } else {
            console.error('Slider: No se pudieron cargar datos para el slider.');
        }
    }

    window.addEventListener('beforeunload', destroy);
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API (optional, but good practice)
    window.sliderIndependent = {
        goToSlide,
        next: () => goToSlide(currentIndex + 1),
        prev: () => goToSlide(currentIndex - 1),
        init,
        destroy
    };
})();
