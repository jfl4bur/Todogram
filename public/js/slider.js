// Slider destacado tipo Rakuten.tv
// Géneros a mostrar
const GENEROS_SLIDER = [
    'Terror',
    'Acción',
    'Ciencia Ficción',
    'Comedia',
    'Romance'
];

// Espera a que el DOM y window.peliculas estén listos
function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
}

ready(() => {
    // Espera a que window.peliculas esté cargado por main.js
    function waitForPeliculas(cb) {
        if (window.peliculas && window.peliculas.length > 0) cb();
        else setTimeout(() => waitForPeliculas(cb), 50);
    }
    waitForPeliculas(() => {
        renderSliderDestacado();
        setupSliderNav();
    });
});

function renderSliderDestacado() {
    const sliderWrapper = document.getElementById('slider-wrapper');
    if (!sliderWrapper) return;
    sliderWrapper.innerHTML = '';

    // Selecciona la primera película de cada género, sin repeticiones
    const seleccionadas = [];
    const idsIncluidos = new Set();
    for (const genero of GENEROS_SLIDER) {
        const peli = window.peliculas.find(p => {
            if (!p['Géneros']) return false;
            const generos = p['Géneros'].split(/\s*[·,]\s*/);
            const match = generos.some(g => g.trim().toLowerCase() === genero.toLowerCase());
            if (match && !idsIncluidos.has(p['ID TMDB'] || p['Ttulo'])) return true;
            return false;
        });
        if (peli) {
            seleccionadas.push(peli);
            idsIncluidos.add(peli['ID TMDB'] || peli['Ttulo']);
        }
    }

    // Renderiza cada slide
    seleccionadas.forEach((item, idx) => {
        const div = document.createElement('div');
        div.className = 'slider-slide';
        div.tabIndex = 0;
        div.setAttribute('role', 'button');
        div.setAttribute('aria-label', item['Ttulo']);

        // Meta info
        const meta = [];
        if (item['Año']) meta.push(`<span>${item['Año']}</span>`);
        if (item['Duración']) meta.push(`<span>${item['Duración']}</span>`);
        if (item['Géneros']) meta.push(`<span>${item['Géneros'].split(/[·,]/)[0]}</span>`);
        if (item['Puntuación 1-10']) meta.push(`<span><i class="fas fa-star"></i> ${item['Puntuación 1-10']}</span>`);

        div.innerHTML = `
            <img src="${item['Carteles'] || item['Portada'] || 'https://via.placeholder.com/1540x400'}" alt="${item['Ttulo']}" loading="lazy">
            <div class="slider-overlay">
                <div class="slider-title-movie">${item['Ttulo']}</div>
                <div class="slider-meta">${meta.join('')}</div>
                <div class="slider-description">${item['Synopsis'] || ''}</div>
            </div>
        `;
        // Al hacer clic, abre el details-modal y actualiza el hash
        div.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.detailsModal) {
                window.detailsModal.show(mapToDetailsModalItem(item), div);
            }
        });
        // Accesibilidad: enter/space
        div.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (window.detailsModal) {
                    window.detailsModal.show(mapToDetailsModalItem(item), div);
                }
            }
        });
        sliderWrapper.appendChild(div);
    });
}

// Convierte el objeto de data.json al formato esperado por detailsModal
function mapToDetailsModalItem(item) {
    return {
        id: item['ID TMDB'] || item['Ttulo'],
        title: item['Ttulo'],
        description: item['Synopsis'],
        posterUrl: item['Portada'],
        postersUrl: item['Carteles'],
        backgroundUrl: item['Carteles'] || item['Portada'],
        year: item['Año'] ? item['Año'].toString() : '',
        duration: item['Duración'] || '',
        genre: item['Géneros'] || '',
        rating: item['Puntuación 1-10'] ? item['Puntuación 1-10'].toString() : '',
        ageRating: item['Clasificación'] || '',
        link: item['Enlace'] || '#',
        trailerUrl: item['Trailer'] || '',
        videoUrl: item['Video iframe'] || '',
        tmdbUrl: item['TMDB'] || '',
        audiosCount: item['Audios'] ? item['Audios'].split(',').length : 0,
        subtitlesCount: item['Subtítulos'] ? item['Subtítulos'].split(',').length : 0,
        audioList: item['Audios'] ? item['Audios'].split(',') : [],
        subtitleList: item['Subtítulos'] ? item['Subtítulos'].split(',') : []
    };
}

// Navegación con flechas y scroll
function setupSliderNav() {
    const wrapper = document.getElementById('slider-wrapper');
    const prevBtn = document.getElementById('slider-prev');
    const nextBtn = document.getElementById('slider-next');
    if (!wrapper || !prevBtn || !nextBtn) return;

    function scrollToSlide(dir) {
        const slide = wrapper.querySelector('.slider-slide');
        if (!slide) return;
        const slideWidth = slide.offsetWidth + 24; // gap
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
    window.addEventListener('resize', updateNav);
    updateNav();
} 