// Slider tipo Rakuten.tv - Carousel con items adyacentes, bordes redondeados y responsive
(function () {
    const SLIDER_SELECTOR = '#slider-wrapper';
    const SKELETON_SELECTOR = '#slider-skeleton';
    const PAGINATION_SELECTOR = '#slider-pagination';
    const PREV_SELECTOR = '#slider-prev';
    const NEXT_SELECTOR = '#slider-next';
    const SLIDE_CLASS = 'slider-slide';
    let currentIndex = 0;
    let totalSlides = 0;
    let isAnimating = false;
    let lastHash = '';
    let autoplayInterval = null;
    let isHovering = false;

    // Breakpoints y anchos en porcentaje
    function getSlideWidthPercent() {
        const w = window.innerWidth;
        if (w <= 400) return 0.98;
        if (w <= 600) return 0.95;
        if (w <= 900) return 0.90;
        return 0.80;
    }
    function getGap() {
        const w = window.innerWidth;
        if (w <= 400) return 8;
        if (w <= 600) return 12;
        if (w <= 900) return 18;
        return 24;
    }
    // Renderiza el slider
    function renderSlider() {
        const sliderWrapper = document.querySelector(SLIDER_SELECTOR);
        const sliderSkeleton = document.querySelector(SKELETON_SELECTOR);
        if (!sliderWrapper || !sliderSkeleton) return;
        sliderSkeleton.style.display = 'none';
        sliderWrapper.style.display = 'flex';
        sliderWrapper.innerHTML = '';
        // Usar los datos del carrusel
        const peliculas = window.carousel.moviesData;
        console.log('Slider: Datos del carrusel disponibles:', peliculas ? peliculas.length : 0);
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
        console.log('Slider: Renderizando', seleccionadas.length, 'slides');
        // Renderiza cada slide
        seleccionadas.forEach((item, idx) => {
            const div = document.createElement('div');
            div.className = SLIDE_CLASS;
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
            // Event listener principal para el slide completo
            div.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Slider: Click en slide:', item.title, 'ID:', item.id);
                openDetails(item, idx);
            });
            
            // Event listener específico para el overlay
            const overlay = div.querySelector('.slider-overlay');
            if (overlay) {
                overlay.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Slider: Click en overlay de:', item.title);
                    openDetails(item, idx);
                });
            }
            
            // Event listener para la imagen también
            const img = div.querySelector('img');
            if (img) {
                img.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Slider: Click en imagen de:', item.title);
                    openDetails(item, idx);
                });
            }
            div.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    console.log('Slider: Enter/Space en slide:', item.title);
                    openDetails(item, idx);
                }
            });
            sliderWrapper.appendChild(div);
        });
        createPagination(totalSlides);
        setupNav();
        setupSwipe();
        setupAutoplay();
        goToSlide(0, true);
        
        // Test de funcionalidad después de renderizar
        setTimeout(() => {
            console.log('Slider: Test de funcionalidad después de renderizar');
            console.log('Slider: detailsModal disponible:', !!window.detailsModal);
            console.log('Slider: Primer slide disponible:', !!document.querySelector('.slider-slide'));
            
            // Simular click en el primer slide para test
            const firstSlide = document.querySelector('.slider-slide');
            if (firstSlide) {
                console.log('Slider: Primer slide encontrado, simulando click...');
                firstSlide.click();
            }
        }, 1000);
    }
    // Abre el details-modal y sincroniza el hash
    function openDetails(item, idx) {
        console.log('=== SLIDER DEBUG ===');
        console.log('Slider: Función openDetails llamada');
        console.log('Slider: Item:', item);
        console.log('Slider: Index:', idx);
        console.log('Slider: window.detailsModal:', window.detailsModal);
        console.log('Slider: typeof window.detailsModal.show:', typeof window.detailsModal?.show);
        
        // Verificar que tenemos el item
        if (!item || !item.id) {
            console.error('Slider: Item inválido:', item);
            return;
        }
        
        // Intentar abrir el modal directamente
        if (window.detailsModal) {
            console.log('Slider: Intentando abrir modal...');
            try {
                // Marcar que el modal se está abriendo desde el slider
                window.isOpeningFromSlider = true;
                window.detailsModal.show(item);
                console.log('Slider: Modal abierto correctamente');
                
                // Resetear la marca después de un momento
                setTimeout(() => {
                    window.isOpeningFromSlider = false;
                }, 1000);
                
                // Verificar que el modal sigue abierto después de un momento
                setTimeout(() => {
                    const modalOverlay = document.getElementById('details-modal-overlay');
                    if (modalOverlay && modalOverlay.style.display === 'block') {
                        console.log('Slider: Modal sigue abierto después de 500ms');
                    } else {
                        console.log('Slider: Modal se cerró automáticamente');
                    }
                }, 500);
                
                // Actualizar el hash sin triggerear el evento hashchange
                const hash = `#id=${item.id}&title=${encodeURIComponent(item.title)}`;
                const currentHash = window.location.hash;
                if (currentHash !== hash) {
                    // Usar replaceState para no triggerear popstate
                    window.history.replaceState(null, '', hash);
                    lastHash = hash;
                    console.log('Slider: Hash actualizado a:', hash);
                }
            } catch (error) {
                console.error('Slider: Error al abrir modal:', error);
            }
        } else {
            console.error('Slider: detailsModal no está disponible');
        }
        
        console.log('=== FIN DEBUG ===');
    }
    // Sincroniza el modal con el hash
    function syncHashModal() {
        if (!window.carousel || !window.carousel.moviesData) return;
        const hash = window.location.hash;
        console.log('Slider: Sincronizando hash:', hash);
        
        if (hash && hash.includes('id=')) {
            const params = new URLSearchParams(hash.substring(1));
            const id = params.get('id');
            const title = params.get('title');
            
            if (id) {
                const item = window.carousel.moviesData.find(m => m.id == id);
                if (item && window.detailsModal && window.detailsModal.show) {
                    console.log('Slider: Encontrado item para hash:', item.title);
                    window.detailsModal.show(item);
                    
                    // Ir al slide correspondiente
                    const slides = document.querySelectorAll('.slider-slide');
                    const idx = Array.from(slides).findIndex(slide => {
                        const titleElement = slide.querySelector('.slider-title-movie');
                        return titleElement && titleElement.textContent.trim() === item.title.trim();
                    });
                    if (idx >= 0) {
                        console.log('Slider: Navegando al slide:', idx);
                        goToSlide(idx, true);
                    }
                }
            }
        }
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
            const slidePx = slide.offsetWidth;
            const gap = getGap();
            const idx = Math.round(wrapper.scrollLeft / (slidePx + gap));
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
        const slidePx = slide.offsetWidth;
        const gap = getGap();
        const scrollPosition = (slidePx + gap) * idx;
        wrapper.scrollTo({ left: scrollPosition, behavior: instant ? 'auto' : 'smooth' });
        updatePagination(idx);
        updateNavButtons();
        
        // Reiniciar autoplay después de navegación manual
        if (!instant) {
            stopAutoplay();
            setTimeout(() => {
                if (!isHovering) startAutoplay();
            }, 1000);
        }
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
        
        // Ocultar botón prev en el primer slide
        if (currentIndex === 0) {
            prevBtn.style.display = 'none';
        } else {
            prevBtn.style.display = 'flex';
        }
        
        // Ocultar botón next en el último slide
        if (currentIndex === totalSlides - 1) {
            nextBtn.style.display = 'none';
        } else {
            nextBtn.style.display = 'flex';
        }
        
        console.log('Slider: Botones actualizados - currentIndex:', currentIndex, 'totalSlides:', totalSlides);
    }
    // Autoplay como Rakuten.tv
    function setupAutoplay() {
        const wrapper = document.querySelector(SLIDER_SELECTOR);
        if (!wrapper) return;
        
        // Pausar autoplay al hacer hover
        wrapper.addEventListener('mouseenter', () => {
            isHovering = true;
            stopAutoplay();
        });
        
        wrapper.addEventListener('mouseleave', () => {
            isHovering = false;
            startAutoplay();
        });
        
        // Iniciar autoplay
        startAutoplay();
    }
    
    function startAutoplay() {
        if (autoplayInterval) return;
        autoplayInterval = setInterval(() => {
            if (!isHovering && totalSlides > 1) {
                const nextIndex = (currentIndex + 1) % totalSlides;
                goToSlide(nextIndex);
            }
        }, 5000); // 5 segundos como Rakuten.tv
    }
    
    function stopAutoplay() {
        if (autoplayInterval) {
            clearInterval(autoplayInterval);
            autoplayInterval = null;
        }
    }
    
    // Recalcula todo en resize
    function onResize() {
        goToSlide(currentIndex, true);
    }
    // Inicialización automática cuando el carrusel esté listo
    function waitForCarousel() {
        if (window.carousel && window.carousel.moviesData && window.carousel.moviesData.length > 0 && 
            window.detailsModal && typeof window.detailsModal.show === 'function') {
            console.log('Slider: Inicializando con', window.carousel.moviesData.length, 'películas');
            console.log('Slider: detailsModal disponible:', !!window.detailsModal);
            renderSlider();
            syncHashModal();
        } else {
            console.log('Slider: Esperando datos del carrusel o detailsModal...');
            console.log('Slider: carousel disponible:', !!window.carousel);
            console.log('Slider: moviesData disponible:', !!(window.carousel && window.carousel.moviesData));
            console.log('Slider: detailsModal disponible:', !!window.detailsModal);
            setTimeout(waitForCarousel, 100);
        }
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('hashchange', syncHashModal);
    window.addEventListener('beforeunload', stopAutoplay);
    
    // Event listener global para debug
    document.addEventListener('click', (e) => {
        if (e.target.closest('.slider-slide')) {
            console.log('Slider: Click global detectado en slider');
            console.log('Target:', e.target);
            console.log('Closest slider-slide:', e.target.closest('.slider-slide'));
        }
        
        // Debug para modal
        if (e.target.closest('#details-modal-overlay')) {
            console.log('Slider: Click en modal detectado');
        }
    });
    
    // Debug para cambios en el modal
    const modalObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const modalOverlay = document.getElementById('details-modal-overlay');
                if (modalOverlay) {
                    console.log('Slider: Modal display cambió a:', modalOverlay.style.display);
                }
            }
        });
    });
    
    // Observar cambios en el modal
    const modalOverlay = document.getElementById('details-modal-overlay');
    if (modalOverlay) {
        modalObserver.observe(modalOverlay, { attributes: true });
    }
    
    waitForCarousel();
    // Exponer para debug
    window.slider = { 
        goToSlide, 
        startAutoplay, 
        stopAutoplay,
        testDetailsModal: function() {
            console.log('=== TEST DETAILS MODAL ===');
            console.log('detailsModal disponible:', !!window.detailsModal);
            console.log('typeof show:', typeof window.detailsModal?.show);
            
            if (window.carousel && window.carousel.moviesData && window.carousel.moviesData.length > 0) {
                const testItem = window.carousel.moviesData[0];
                console.log('Test item:', testItem);
                
                if (window.detailsModal && window.detailsModal.show) {
                    try {
                        window.detailsModal.show(testItem);
                        console.log('Modal abierto correctamente');
                        
                        // Verificar estado del modal después de 1 segundo
                        setTimeout(() => {
                            const modalOverlay = document.getElementById('details-modal-overlay');
                            console.log('Modal overlay:', modalOverlay);
                            console.log('Modal display:', modalOverlay?.style.display);
                            console.log('Modal classList:', modalOverlay?.classList);
                        }, 1000);
                    } catch (error) {
                        console.error('Error al abrir modal:', error);
                    }
                } else {
                    console.error('detailsModal no disponible');
                }
            } else {
                console.error('No hay datos del carrusel');
            }
            console.log('=== FIN TEST ===');
        },
        
        testCarouselModal: function() {
            console.log('=== TEST CARRUSEL MODAL ===');
            // Simular exactamente lo que hace el carrusel
            if (window.carousel && window.carousel.moviesData && window.carousel.moviesData.length > 0) {
                const testItem = window.carousel.moviesData[0];
                const testElement = document.querySelector('.custom-carousel-item');
                
                if (window.detailsModal && testElement) {
                    try {
                        window.detailsModal.show(testItem, testElement);
                        console.log('Modal del carrusel abierto correctamente');
                    } catch (error) {
                        console.error('Error al abrir modal del carrusel:', error);
                    }
                } else {
                    console.error('detailsModal o elemento del carrusel no disponible');
                }
            }
            console.log('=== FIN TEST CARRUSEL ===');
        }
    };
})(); 