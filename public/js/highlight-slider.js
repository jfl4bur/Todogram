// Slider destacado tipo Rakuten.tv
// Selecciona la última película de cada género solicitado (sin repeticiones)

const HIGHLIGHT_GENRES = [
    'Terror',
    'Acción',
    'Ciencia Ficción',
    'Comedia',
    'Romance'
];

async function loadHighlightSlider() {
    let data = [];
    try {
        const response = await fetch(DATA_URL);
        data = await response.json();
    } catch (e) {
        console.error('No se pudo cargar data.json para el slider destacado', e);
        return;
    }
    // Buscar la última película de cada género (sin repeticiones)
    const selected = [];
    const usedIds = new Set();
    for (const genre of HIGHLIGHT_GENRES) {
        // Buscar la última película que contenga el género (en Géneros)
        const found = data.slice().reverse().find(item => {
            if (!item['Géneros']) return false;
            if (usedIds.has(item['ID TMDB'])) return false;
            return item['Géneros'].toLowerCase().includes(genre.toLowerCase());
        });
        if (found) {
            selected.push(found);
            usedIds.add(found['ID TMDB']);
        }
    }
    renderHighlightSlider(selected);
}

function renderHighlightSlider(movies) {
    const wrapper = document.getElementById('highlight-slider-wrapper');
    if (!wrapper) return;
    wrapper.innerHTML = '';
    movies.forEach((item, idx) => {
        const slide = document.createElement('div');
        slide.className = 'highlight-slider-slide';
        slide.setAttribute('data-highlight-id', item['ID TMDB']);
        slide.innerHTML = `
            <img src="${item['Carteles'] || item['Portada'] || 'https://via.placeholder.com/1200x400'}" alt="${item['Título']}" loading="lazy">
            <div class="highlight-slider-overlay">
                <div class="highlight-slider-title">${item['Título']}</div>
                <div class="highlight-slider-meta">${item['Año'] || ''} ${item['Duración'] ? '· ' + item['Duración'] : ''} ${item['Géneros'] ? '· ' + item['Géneros'].split('·')[0] : ''}</div>
                <div class="highlight-slider-description">${item['Synopsis'] || ''}</div>
            </div>
        `;
        slide.addEventListener('click', () => {
            if (window.detailsModal) {
                // Adaptar al formato esperado por detailsModal
                const mapped = mapHighlightToDetails(item);
                window.detailsModal.show(mapped, slide);
                window.activeItem = mapped;
            }
        });
        wrapper.appendChild(slide);
    });
    setupHighlightSliderNav(movies.length);
}

function mapHighlightToDetails(item) {
    // Mapear los campos del item de data.json al formato esperado por detailsModal
    return {
        id: item['ID TMDB'],
        title: item['Título'],
        description: item['Synopsis'],
        posterUrl: item['Portada'],
        postersUrl: item['Carteles'],
        backgroundUrl: item['Fondo'] || item['Carteles'] || item['Portada'],
        year: item['Año'],
        duration: item['Duración'],
        genre: item['Géneros'],
        rating: item['Puntuación 1-10'],
        ageRating: item['Clasificación'],
        link: item['Enlace'] || '#',
        trailerUrl: item['Trailer'],
        videoUrl: item['Video iframe'],
        tmdbUrl: item['TMDB'],
        audiosCount: item['Audios'] ? item['Audios'].split(',').length : 0,
        subtitlesCount: item['Subtítulos'] ? item['Subtítulos'].split(',').length : 0,
        audioList: item['Audios'] ? item['Audios'].split(',') : [],
        subtitleList: item['Subtítulos'] ? item['Subtítulos'].split(',') : []
    };
}

function setupHighlightSliderNav(slideCount) {
    let current = 0;
    const wrapper = document.getElementById('highlight-slider-wrapper');
    const prevBtn = document.getElementById('highlight-slider-prev');
    const nextBtn = document.getElementById('highlight-slider-next');
    const progressBar = document.getElementById('highlight-slider-progress-bar');
    if (!wrapper || !prevBtn || !nextBtn || !progressBar) return;

    function updateSlider() {
        wrapper.style.transform = `translateX(-${current * 100}vw)`;
        progressBar.style.width = `${((current+1)/slideCount)*100}%`;
    }
    prevBtn.onclick = () => {
        current = (current - 1 + slideCount) % slideCount;
        updateSlider();
    };
    nextBtn.onclick = () => {
        current = (current + 1) % slideCount;
        updateSlider();
    };
    updateSlider();
}

// Inicializar al cargar la página
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadHighlightSlider);
} else {
    loadHighlightSlider();
} 