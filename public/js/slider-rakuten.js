// Slider Rakuten.tv - Réplica exacta 1:1
// Comportamiento idéntico al slider principal de Rakuten.tv

console.log('Slider Rakuten: Script cargado, esperando inicialización');

// Variables globales
let currentSlideIndex = 0;
let totalSlides = 0;
let isAnimating = false;

// Función principal para renderizar el slider
function renderSliderRakuten() {
    const sliderWrapper = document.getElementById('slider-wrapper');
    const sliderSkeleton = document.getElementById('slider-skeleton');
    
    if (!sliderWrapper || !sliderSkeleton) {
        console.error('Slider Rakuten: Elementos no encontrados');
        return;
    }
    
    console.log('Slider Rakuten: Renderizando slider...');
    
    // Ocultar skeleton y mostrar slider
    sliderSkeleton.style.display = 'none';
    sliderWrapper.style.display = 'flex';
    
    sliderWrapper.innerHTML = '';

    // Usar los datos del carrusel
    const peliculas = window.carousel.moviesData;
    console.log('Slider Rakuten: Total de películas disponibles:', peliculas.length);

    // Detecta todos los géneros únicos disponibles
    const todosLosGeneros = new Set();
    peliculas.forEach(p => {
        if (p.genre) {
            const generos = p.genre.split(/\s*[·,]\s*/);
            generos.forEach(g => {
                const genero = g.trim();
                if (genero && genero.length > 0) {
                    todosLosGeneros.add(genero);
                }
            });
        }
    });
    
    const generosUnicos = Array.from(todosLosGeneros);
    console.log('Slider Rakuten: Géneros únicos encontrados:', generosUnicos);
    
    // Selecciona la primera película de cada género, sin repeticiones
    const seleccionadas = [];
    const idsIncluidos = new Set();
    
    for (const genero of generosUnicos) {
        const peli = peliculas.find(p => {
            if (!p.genre) return false;
            const generos = p.genre.split(/\s*[·,]\s*/);
            const match = generos.some(g => g.trim().toLowerCase() === genero.toLowerCase());
            return match && !idsIncluidos.has(p.id);
        });
        
        if (peli) {
            seleccionadas.push(peli);
            idsIncluidos.add(peli.id);
        }
    }

    totalSlides = seleccionadas.length;
    console.log('Slider Rakuten: Películas seleccionadas:', totalSlides);

    // Crear paginación
    createSliderPaginationRakuten(totalSlides);

    // Renderiza cada slide
    seleccionadas.forEach((item, idx) => {
        const div = document.createElement('div');
        div.className = 'slider-slide';
        div.setAttribute('data-slide-index', idx);
        div.tabIndex = 0;
        div.setAttribute('role', 'button');
        div.setAttribute('aria-label', item.title);

        // Meta info
        const meta = [];
        if (item.year) meta.push(`<span>${item.year}</span>`);
        if (item.duration) meta.push(`<span>${item.duration}</span>`);
        if (item.genre) meta.push(`<span>${item.genre.split(/[·,]/)[0]}</span>`);
        if (item.rating) meta.push(`<span><i class="fas fa-star"></i> ${item.rating}</span>`);

        div.innerHTML = `
            <div class="slider-img-wrapper">
                <img src="${item.postersUrl || item.posterUrl || 'https://via.placeholder.com/1540x464'}" alt="${item.title}" loading="lazy">
            </div>
            <div class="slider-overlay">
                <div class="slider-title-movie">${item.title}</div>
                <div class="slider-meta">${meta.join('')}</div>
                <div class="slider-description">${item.description || ''}</div>
            </div>
        `;
        
        // Al hacer clic, abre el details-modal
        div.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.detailsModal) {
                window.detailsModal.show(item, div);
            }
        });
        
        // Accesibilidad: enter/space
        div.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (window.detailsModal) {
                    window.detailsModal.show(item, div);
                }
            }
        });
        
        sliderWrapper.appendChild(div);
    });

    // Configurar navegación
    setupSliderNavRakuten();
    
    // Configurar scroll events
    setupScrollEvents();
    
    console.log('Slider Rakuten: Renderizado completado');
}

// Crear paginación del slider
function createSliderPaginationRakuten(totalSlides) {
    const pagination = document.getElementById('slider-pagination');
    if (!pagination) return;
    
    pagination.innerHTML = '';
    
    for (let i = 0; i < totalSlides; i++) {
        const dot = document.createElement('button');
        dot.className = 'slider-pagination-dot';
        dot.setAttribute('data-slide', i);
        dot.setAttribute('aria-label', `Ir al slide ${i + 1}`);
        
        if (i === 0) {
            dot.classList.add('active');
        }
        
        dot.addEventListener('click', () => {
            goToSlideRakuten(i);
        });
        
        pagination.appendChild(dot);
    }
}

// Ir a un slide específico
function goToSlideRakuten(slideIndex) {
    if (isAnimating || slideIndex < 0 || slideIndex >= totalSlides) return;
    
    isAnimating = true;
    currentSlideIndex = slideIndex;
    
    const wrapper = document.getElementById('slider-wrapper');
    const slideWidth = window.innerWidth; // 100vw
    
    wrapper.scrollTo({
        left: slideWidth * slideIndex,
        behavior: 'smooth'
    });
    
    // Actualizar dots activos
    updatePaginationDots(slideIndex);
    
    // Actualizar botones de navegación
    setTimeout(() => {
        updateNavButtonsRakuten();
        isAnimating = false;
    }, 300);
}

// Actualizar dots de paginación
function updatePaginationDots(activeIndex) {
    const dots = document.querySelectorAll('.slider-pagination-dot');
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === activeIndex);
    });
}

// Actualizar botones de navegación
function updateNavButtonsRakuten() {
    const prevBtn = document.getElementById('slider-prev');
    const nextBtn = document.getElementById('slider-next');
    
    if (!prevBtn || !nextBtn) return;
    
    // Ocultar botón izquierdo si estamos en el primer slide
    prevBtn.style.display = currentSlideIndex <= 0 ? 'none' : 'flex';
    
    // Ocultar botón derecho si estamos en el último slide
    nextBtn.style.display = currentSlideIndex >= totalSlides - 1 ? 'none' : 'flex';
}

// Configurar navegación con flechas
function setupSliderNavRakuten() {
    const prevBtn = document.getElementById('slider-prev');
    const nextBtn = document.getElementById('slider-next');
    
    if (!prevBtn || !nextBtn) return;

    prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentSlideIndex > 0) {
            goToSlideRakuten(currentSlideIndex - 1);
        }
    });
    
    nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentSlideIndex < totalSlides - 1) {
            goToSlideRakuten(currentSlideIndex + 1);
        }
    });
    
    // Configurar botones inicialmente
    updateNavButtonsRakuten();
}

// Configurar eventos de scroll
function setupScrollEvents() {
    const wrapper = document.getElementById('slider-wrapper');
    
    wrapper.addEventListener('scroll', () => {
        if (isAnimating) return;
        
        const slideWidth = window.innerWidth;
        const currentScroll = wrapper.scrollLeft;
        const newIndex = Math.round(currentScroll / slideWidth);
        
        if (newIndex !== currentSlideIndex) {
            currentSlideIndex = newIndex;
            updatePaginationDots(currentSlideIndex);
            updateNavButtonsRakuten();
        }
    });
}

// Función para inicializar el slider desde main.js
function initSliderRakuten() {
    console.log('Slider Rakuten: Inicializando...');
    
    // Esperar a que los datos estén disponibles
    if (window.carousel && window.carousel.moviesData && window.carousel.moviesData.length > 0) {
        renderSliderRakuten();
    } else {
        console.log('Slider Rakuten: Esperando datos del carrusel...');
        // Reintentar en 100ms
        setTimeout(initSliderRakuten, 100);
    }
}

// Exportar funciones para uso global
window.sliderRakuten = {
    render: renderSliderRakuten,
    goToSlide: goToSlideRakuten,
    init: initSliderRakuten
}; 