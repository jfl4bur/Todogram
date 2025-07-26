// Slider destacado tipo Rakuten.tv
// Géneros a mostrar
const GENEROS_SLIDER = [
    'Terror',
    'Acción', 
    'Ciencia Ficción',
    'Comedia',
    'Romance'
];

// Las funciones del slider estarán disponibles globalmente para ser llamadas desde main.js
console.log('Slider: Script cargado, esperando inicialización desde main.js');

// Función para calcular el ancho de los slides basándose en el tamaño de pantalla
function calculateSlideWidth() {
    const screenWidth = window.innerWidth;
    let slideWidth, gap;
    
    if (screenWidth > 1200) {
        slideWidth = screenWidth - 48; // 24px padding en cada lado
        gap = 24;
    } else if (screenWidth > 900) {
        slideWidth = screenWidth - 48;
        gap = 24;
    } else if (screenWidth > 600) {
        slideWidth = screenWidth - 32; // 16px padding en cada lado
        gap = 16;
    } else if (screenWidth > 480) {
        slideWidth = screenWidth - 16; // 8px padding en cada lado
        gap = 12;
    } else {
        slideWidth = screenWidth - 16;
        gap = 8;
    }
    
    return { slideWidth, gap };
}

function renderSliderDestacado() {
    const sliderWrapper = document.getElementById('slider-wrapper');
    if (!sliderWrapper) {
        console.error('Slider: No se encontró slider-wrapper');
        return;
    }
    
    console.log('Slider: Renderizando slider...');
    sliderWrapper.innerHTML = '';

    // Usar los datos del carrusel
    const peliculas = window.carousel.moviesData;
    console.log('Slider: Total de películas disponibles:', peliculas.length);

    // Selecciona la primera película de cada género, sin repeticiones
    const seleccionadas = [];
    const idsIncluidos = new Set();
    
    for (const genero of GENEROS_SLIDER) {
        console.log(`Slider: Buscando película de género: ${genero}`);
        const peli = peliculas.find(p => {
            if (!p.genre) {
                console.log(`Slider: Película sin género:`, p.title);
                return false;
            }
            const generos = p.genre.split(/\s*[·,]\s*/);
            console.log(`Slider: Géneros de "${p.title}":`, generos);
            const match = generos.some(g => g.trim().toLowerCase() === genero.toLowerCase());
            if (match && !idsIncluidos.has(p.id)) {
                console.log(`Slider: Encontrada película para ${genero}:`, p.title);
                return true;
            }
            return false;
        });
        
        if (peli) {
            seleccionadas.push(peli);
            idsIncluidos.add(peli.id);
            console.log(`Slider: Añadida al slider:`, peli.title);
        } else {
            console.log(`Slider: No se encontró película para género: ${genero}`);
        }
    }

    console.log('Slider: Películas seleccionadas:', seleccionadas.length);

    // Renderiza cada slide
    seleccionadas.forEach((item, idx) => {
        const div = document.createElement('div');
        div.className = 'slider-slide';
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
                <img src="${item.postersUrl || item.posterUrl || 'https://via.placeholder.com/1540x400'}" alt="${item.title}" loading="lazy">
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
            console.log('Slider: Click en película:', item.title);
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

    console.log('Slider: Renderizado completado. Slides creados:', seleccionadas.length);
}

// Navegación con flechas y scroll
function setupSliderNav() {
    const wrapper = document.getElementById('slider-wrapper');
    const prevBtn = document.getElementById('slider-prev');
    const nextBtn = document.getElementById('slider-next');
    if (!wrapper || !prevBtn || !nextBtn) {
        console.error('Slider: Elementos de navegación no encontrados');
        return;
    }

    function scrollToSlide(dir) {
        const slide = wrapper.querySelector('.slider-slide');
        if (!slide) return;
        const slideWidth = slide.offsetWidth;
        wrapper.scrollBy({
            left: dir * slideWidth,
            behavior: 'smooth'
        });
    }
    
    prevBtn.addEventListener('click', e => {
        e.preventDefault();
        scrollToSlide(-1);
    });
    
    nextBtn.addEventListener('click', e => {
        e.preventDefault();
        scrollToSlide(1);
    });
    
    // Oculta flechas si no hay overflow
    function updateNav() {
        setTimeout(() => {
            if (wrapper.scrollWidth > wrapper.clientWidth + 10) {
                prevBtn.style.display = 'flex';
                nextBtn.style.display = 'flex';
            } else {
                prevBtn.style.display = 'none';
                nextBtn.style.display = 'none';
            }
        }, 100);
    }
    
    // Actualizar navegación al cambiar el tamaño de la ventana
    window.addEventListener('resize', () => {
        updateNav();
    });
    
    updateNav();
} 