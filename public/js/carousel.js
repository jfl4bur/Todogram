// Carrusel de Episodios Series (solo episodios con Título episodio completo)

// Helper: calcular tamaño real del item, gap y cuantos items caben en el contenedor
function computeCarouselStep(wrapper) {
    if (!wrapper) return { stepSize: null, itemsPerViewport: 1, itemWidth: 0, gap: 0 };
    const firstItem = wrapper.querySelector('.custom-carousel-item');
    if (!firstItem) return { stepSize: null, itemsPerViewport: 1, itemWidth: 0, gap: 0 };

    // Forzar reflow/paint para minimizar mediciones a 0 (por lazy-images u otros cambios de layout)
    // Leer propiedades que forzan layout
    // eslint-disable-next-line no-unused-vars
    const _force = wrapper.offsetWidth + firstItem.offsetWidth;

    const itemRect = firstItem.getBoundingClientRect();
    // Preferir offsetWidth (más estable si getBoundingClientRect es 0 por imágenes pendientes)
    let itemWidth = Math.round(firstItem.offsetWidth || itemRect.width || parseFloat(getComputedStyle(firstItem).width) || 0);

    // Intentar estimar gap usando el segundo elemento (varias estrategias)
    let gap = 0;
    const secondItem = firstItem.nextElementSibling;
    if (secondItem) {
        const secondRect = secondItem.getBoundingClientRect();
        // preferir offsetLeft/offsetWidth para calcular gap
        const leftA = firstItem.offsetLeft + firstItem.offsetWidth;
        const leftB = secondItem.offsetLeft || secondRect.left;
        gap = Math.round((leftB - leftA) || (secondRect.left - (itemRect.left + itemRect.width)));
        if (isNaN(gap) || gap < 0) gap = 0;
    }

    // Fallback si por alguna razón itemWidth sigue en 0
    if (!itemWidth || itemWidth <= 0) {
        // intentar leer estilo (por ejemplo si existe aspect-ratio) o usar un valor por defecto razonable
        const cssWidth = parseFloat(getComputedStyle(firstItem).width) || 0;
        if (cssWidth > 0) itemWidth = Math.round(cssWidth);
        else itemWidth = 194; // fallback seguro
    }

    const stepSize = itemWidth + gap;
    const containerWidth = wrapper.clientWidth || 0;
    const itemsPerViewport = stepSize > 0 ? Math.max(1, Math.floor(containerWidth / stepSize)) : 1;
    try {
        console.debug(`[computeCarouselStep] wrapper=${wrapper && wrapper.id ? wrapper.id : 'unknown'} itemWidth=${itemWidth} gap=${gap} stepSize=${stepSize} itemsPerViewport=${itemsPerViewport} containerWidth=${containerWidth}`);
    } catch (e) {}
    return { stepSize, itemsPerViewport, itemWidth, gap };
}

// Setup measurement guard: observa cambios de tamaño e imágenes para asegurar
// que la medición (stepSize) esté lista antes de permitir paginación.
function setupCarouselMeasurementGuard(wrapper, prevBtn, nextBtn) {
    if (!wrapper) return;
    const recalc = () => {
        const { stepSize, itemsPerViewport } = computeCarouselStep(wrapper);
        const ready = !!stepSize && stepSize >= 30;
        wrapper._carouselMeasurement = { stepSize, itemsPerViewport, ready };
        try {
            if (prevBtn) prevBtn.disabled = !ready;
            if (nextBtn) nextBtn.disabled = !ready;
        } catch (e) {}
        return ready;
    };

    // Ejecutar un cálculo inicial
    recalc();

    // ResizeObserver para cambios en el contenedor
    try {
        const ro = new ResizeObserver(() => { recalc(); });
        ro.observe(wrapper);
        // Guardar referencia para posible limpieza
        wrapper._carouselGuard = wrapper._carouselGuard || {};
        wrapper._carouselGuard.resizeObserver = ro;
    } catch (e) {}

    // Adjuntar listeners a imágenes ya presentes y futuras (MutationObserver)
    const attachToImages = (root) => {
        try {
            const imgs = root.querySelectorAll && root.querySelectorAll('img');
            if (!imgs) return;
            imgs.forEach(img => {
                if (img._carouselGuardAttached) return;
                img._carouselGuardAttached = true;
                img.addEventListener('load', () => { setTimeout(recalc, 40); });
                img.addEventListener('error', () => { setTimeout(recalc, 40); });
            });
        } catch (e) {}
    };
    attachToImages(wrapper);

    try {
        const mo = new MutationObserver((mutations) => {
            mutations.forEach(m => {
                if (m.addedNodes && m.addedNodes.length) {
                    m.addedNodes.forEach(n => { if (n && n.querySelectorAll) attachToImages(n); });
                }
            });
            // re-evaluar al añadir nodos
            setTimeout(recalc, 40);
        });
        mo.observe(wrapper, { childList: true, subtree: true });
        wrapper._carouselGuard = wrapper._carouselGuard || {};
        wrapper._carouselGuard.mutationObserver = mo;
    } catch (e) {}

    // Como protección extra, tras 600ms permitir botones aunque no haya medición válida
    setTimeout(() => { recalc(); if (!wrapper._carouselMeasurement || !wrapper._carouselMeasurement.ready) {
        try { if (prevBtn) prevBtn.disabled = false; if (nextBtn) nextBtn.disabled = false; } catch (e) {}
    } }, 600);
}

// Helper: obtener índice del primer item completamente visible en el wrapper
function getFirstFullyVisibleItemIndex(wrapper) {
    try {
        if (!wrapper) return null;
        const items = Array.from(wrapper.querySelectorAll('.custom-carousel-item'));
        if (!items || items.length === 0) return null;
        const containerRect = wrapper.getBoundingClientRect();
        // Tolerancia de 2px para pequeñas diferencias subpixel
        const tol = 2;
        for (let i = 0; i < items.length; i++) {
            const r = items[i].getBoundingClientRect();
            if (r.left >= containerRect.left - tol && r.right <= containerRect.right + tol) {
                return i;
            }
        }
        // Si no hay ninguno completamente visible, devolver el primer parcialmente visible
        for (let i = 0; i < items.length; i++) {
            const r = items[i].getBoundingClientRect();
            if (r.right > containerRect.left + tol && r.left < containerRect.right - tol) {
                return i;
            }
        }
    } catch (e) { /* ignore */ }
    return null;
}

class EpisodiosSeriesCarousel {
    // ...existing code...
    scrollToHash(retries = 10) {
        // Solo actuar si el id existe en episodiosData
        if (!window.location.hash.startsWith('#id=')) return;
        const hash = window.location.hash.substring(1); // quitar '#'
        const params = new URLSearchParams(hash);
        const id = params.get('id');
        const title = params.get('title');
        if (!id || !title) return;
        // Normalizar título igual que DetailsModal.normalizeText
        const normalizeText = (text) => {
            if (!text) return '';
            try {
                return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '');
            } catch (e) {
                return String(text).toLowerCase();
            }
        };
        const decodedTitle = decodeURIComponent(title);
        const item = this.episodiosData.find(ep => String(ep.id) === id && ep.title && normalizeText(ep.title) === decodedTitle);
        if (!item) return; // Si no es un episodio, no hacer nada
        const div = this.wrapper.querySelector(`[data-item-id="${CSS.escape(item.id)}"]`);
        if (div) {
            div.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            if (window.detailsModal && typeof window.detailsModal.show === 'function') {
                window.detailsModal.show(item, div);
            }
        } else if (retries > 0) {
            setTimeout(() => this.scrollToHash(retries - 1), 120);
        }
    }
    constructor() {
        this.wrapper = document.getElementById('episodios-series-carousel-wrapper');
        this.skeleton = document.getElementById('episodios-series-carousel-skeleton');
        this.progressBar = null;
        this.carouselNav = document.getElementById('episodios-series-carousel-nav');
        this.carouselPrev = document.getElementById('episodios-series-carousel-prev');
        this.carouselNext = document.getElementById('episodios-series-carousel-next');
        this.carouselContainer = this.wrapper ? this.wrapper.parentElement : null;
        this.itemsPerPage = 0;
        this.index = 0;
        this.step = 0;
        this.moreAppended = false;
        this.episodiosData = [];
        this.hoverTimeouts = {};
        if (!this.wrapper || !this.skeleton || !this.carouselContainer) return;
        if (!this.carouselPrev || !this.carouselNext || !this.carouselNav) {
            const observer = new MutationObserver(() => {
                this.carouselPrev = document.getElementById('episodios-series-carousel-prev');
                this.carouselNext = document.getElementById('episodios-series-carousel-next');
                this.carouselNav = document.getElementById('episodios-series-carousel-nav');
                if (this.carouselPrev && this.carouselNext && this.carouselNav) {
                    this.setupEventListeners();
                    observer.disconnect();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            return;
        }
        this.init();
    }
    init() {
        if (this.wrapper) {
            this.progressBar = this.wrapper.parentElement.querySelector('.carousel-progress-bar');
        }
        this.setupResizeObserver();
        this.setupEventListeners();
        // Proteger paginación hasta tener mediciones válidas
        try { setupCarouselMeasurementGuard(this.wrapper, this.carouselPrev, this.carouselNext); } catch (e) {}
        this.loadEpisodiosData();
    }
    setupResizeObserver() {
        if (!this.wrapper) return;
        const itemWidth = 246; // 16:9
        const gap = 4;
        const calculate = () => {
            const containerWidth = this.wrapper.clientWidth;
            if (containerWidth > 0) {
                const itemsThatFit = Math.floor(containerWidth / (itemWidth + gap));
                this.itemsPerPage = Math.max(1, itemsThatFit);
                this.step = this.itemsPerPage;
            } else {
                this.itemsPerPage = 1;
                this.step = 1;
            }
        };
        calculate();
        const resizeObserver = new ResizeObserver(() => { calculate(); });
        resizeObserver.observe(this.wrapper);
    }
    setupEventListeners() {
        // Update progress bar on resize
        window.addEventListener('resize', () => { if (this.updateProgressBar) this.updateProgressBar(); });
        if (this.carouselPrev) {
            this.carouselPrev.addEventListener('click', (e) => {
                e.preventDefault();
                try { if (window.sliderIndependent && typeof window.sliderIndependent.pauseAutoPlay === 'function') window.sliderIndependent.pauseAutoPlay(); } catch (err) {}
                this.scrollToPrevPage();
            });
        }
        if (this.carouselNext) {
            this.carouselNext.addEventListener('click', (e) => {
                e.preventDefault();
                try { if (window.sliderIndependent && typeof window.sliderIndependent.pauseAutoPlay === 'function') window.sliderIndependent.pauseAutoPlay(); } catch (err) {}
                this.scrollToNextPage();
            });
        }
        if (this.wrapper) {
            // Update progress bar when the wrapper is scrolled
            this.wrapper.addEventListener('scroll', () => { if (this.updateProgressBar) this.updateProgressBar(); });
            // Also set initial progress
            if (this.updateProgressBar) this.updateProgressBar();
        }
    }
    async loadEpisodiosData() {
        try {
            let data;
            if (window.sharedData) {
                data = window.sharedData;
            } else {
                const response = await fetch(DATA_URL);
                if (!response.ok) throw new Error('No se pudo cargar data.json');
                data = await response.json();
                window.sharedData = data;
            }
            this.episodiosData = [];
            let epIndex = 0;
            for (const item of data) {
                if (item && typeof item === 'object' && item['Categoría'] === 'Series' && item['Título episodio'] && item['Título episodio'].trim() !== '') {
                    this.episodiosData.push({
                        id: `ep_${epIndex}`,
                        title: item['Título episodio'] || 'Sin título',
                        serie: item['Título'] || '',
                        description: item['Synopsis'] || 'Descripción no disponible',
                        posterUrl: item['Portada'] || '',
                        backgroundUrl: item['Portada'] || '',
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
                        subtitleList: item['Subtítulos'] ? item['Subtítulos'].split(',') : [],
                        episodioNum: item['Episodio'] || '',
                        temporada: item['Temporada'] || ''
                    });
                    epIndex++;
                }
            }
            if (this.episodiosData.length === 0) {
                this.episodiosData = [
                    {
                        id: "ep_12345",
                        title: "Ejemplo de episodio",
                        serie: "Serie de ejemplo",
                        description: "Este es un episodio de ejemplo que se muestra cuando no se pueden cargar los datos reales.",
                        posterUrl: "https://via.placeholder.com/246x138",
                        backgroundUrl: "https://via.placeholder.com/246x138",
                        year: "2023",
                        duration: "45 min",
                        genre: "Drama",
                        rating: "8.5",
                        ageRating: "16",
                        link: "#",
                        trailerUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                        videoUrl: "https://ejemplo.com/video.mp4",
                        tmdbUrl: "https://www.themoviedb.org/tv/12345",
                        audiosCount: 1,
                        subtitlesCount: 1,
                        audioList: ["Español"],
                        subtitleList: ["Español"],
                        episodioNum: "1",
                        temporada: "1"
                    }
                ];
            }
            this.showCarousel();
            this.renderItems();
            // Intentar abrir el hash tras cargar datos y renderizar ítems
            setTimeout(() => this.scrollToHash(), 0);
            // Notificar que los datos de episodios están cargados
            if (window.notifyDataLoaded) {
                window.notifyDataLoaded();
            }
        } catch (error) {
            this.episodiosData = [
                {
                    id: "ep_12345",
                    title: "Ejemplo de episodio",
                    serie: "Serie de ejemplo",
                    description: "Este es un episodio de ejemplo que se muestra cuando no se pueden cargar los datos reales.",
                    posterUrl: "https://via.placeholder.com/246x138",
                    backgroundUrl: "https://via.placeholder.com/246x138",
                    year: "2023",
                    duration: "45 min",
                    genre: "Drama",
                    rating: "8.5",
                    ageRating: "16",
                    link: "#",
                    trailerUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                    videoUrl: "https://ejemplo.com/video.mp4",
                    tmdbUrl: "https://www.themoviedb.org/tv/12345",
                    audiosCount: 1,
                    subtitlesCount: 1,
                    audioList: ["Español"],
                    subtitleList: ["Español"],
                    episodioNum: "1",
                    temporada: "1"
                }
            ];
            this.showCarousel();
            this.renderItems();
            setTimeout(() => this.scrollToHash(), 0);
            if (window.notifyDataLoaded) {
                window.notifyDataLoaded();
            }
        }
    }
    showCarousel() {
        this.skeleton.style.display = 'none';
        this.wrapper.style.display = 'flex';
        if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
            this.carouselNav.style.display = 'flex';
        }
    }
    async renderItems() {
        // Limpia el wrapper
        this.wrapper.innerHTML = '';
        // Añadir estilos mínimos para etiquetas si no existen
        if (!document.getElementById('episodios-series-labels-styles')) {
            const sh = document.createElement('style');
            sh.id = 'episodios-series-labels-styles';
            sh.innerHTML = `
                .carousel-labels{display:flex;flex-direction:column;align-items:flex-start;padding:8px 4px 0 4px;gap:2px}
                .carousel-series-title{font-size:12px;color:rgba(255,255,255,0.8);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
                .carousel-episode-title{font-size:13px;color:rgba(255,255,255,1);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
                .episodios-series-item .poster-container{display:block}
            `;
            document.head.appendChild(sh);
        }
        const itemWidth = 300; // Aumentado para mayor tamaño
        const gap = 8; // Un poco más de espacio entre ítems
        for (let i = 0; i < this.episodiosData.length; i++) {
            const item = this.episodiosData[i];
            const div = document.createElement("div");
            div.className = "custom-carousel-item episodios-series-item";
            div.dataset.itemId = item.id;
            const metaInfo = [];
            if (item.serie) metaInfo.push(`<span>${item.serie}</span>`);
            if (item.temporada) metaInfo.push(`<span>T${item.temporada}</span>`);
            if (item.episodioNum) metaInfo.push(`<span>E${item.episodioNum}</span>`);
            if (item.year) metaInfo.push(`<span>${item.year}</span>`);
            if (item.duration) metaInfo.push(`<span>${item.duration}</span>`);
            if (item.genre) metaInfo.push(`<span>${item.genre}</span>`);
            if (item.rating) metaInfo.push(`<div class=\"carousel-rating\"><i class=\"fas fa-star\"></i><span>${item.rating}</span></div>`);
            if (item.ageRating) metaInfo.push(`<span class=\"age-rating\">${item.ageRating}</span>`);
            let posterUrl = item.posterUrl;
            if (!posterUrl) posterUrl = 'https://via.placeholder.com/300x169';
            div.innerHTML = `
                <div class="loader_episodios"><i class="fas fa-spinner"></i></div>
                <div class="poster-container">
                    <img class="episodios-series-card-image" src="${posterUrl}" alt="${item.title}" loading="lazy" style="opacity:0;transition:opacity 0.3s ease">
                    <div class="carousel-overlay">
                        ${metaInfo.length ? `<div class="carousel-meta">${metaInfo.join('')}</div>` : ''}
                        ${item.description ? `<div class="carousel-description">${item.description}</div>` : ''}
                    </div>
                </div>
                <div class="carousel-labels">
                    <div class="carousel-series-title">${item.serie || ''}</div>
                    <div class="carousel-episode-title">${item.title}</div>
                </div>
                <img class="detail-background" src="${item.backgroundUrl || posterUrl}" alt="${item.title} - Background" loading="lazy" style="display:none;width:300px;height:169px;">
            `;
            // Fade-in de imagen
            const img = div.querySelector('.episodios-series-card-image');
            img.onload = function() { img.style.opacity = '1'; const l = div.querySelector('.loader_episodios') || div.querySelector('.loader'); if (l) l.style.display = 'none'; };
            // Hover/modal igual que Series/Animes
            if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
                div.addEventListener('mouseenter', (e) => {
                    const itemId = div.dataset.itemId;
                    if (this.hoverTimeouts[itemId]) {
                        clearTimeout(this.hoverTimeouts[itemId].details);
                        clearTimeout(this.hoverTimeouts[itemId].modal);
                    }
                    const rect = div.getBoundingClientRect();
                    this.hoverModalOrigin = {
                        x: rect.left + rect.width / 2,
                        y: rect.top + rect.height / 2
                    };
                    this.hoverTimeouts[itemId] = {
                        details: setTimeout(() => {
                            const background = div.querySelector('.detail-background');
                            const overlay = div.querySelector('.carousel-overlay');
                            background.style.display = 'block';
                            background.style.opacity = '1';
                            overlay.style.opacity = '1';
                            overlay.style.transform = 'translateY(0)';
                            this.hoverTimeouts[itemId].modal = setTimeout(() => {
                                if (!window.isModalOpen && !window.isDetailsModalOpen) {
                                    window.hoverModalItem = div;
                                    if (window.hoverModal && div) {
                                        window.hoverModal.show(item, div);
                                    }
                                }
                            }, 200);
                        }, 900)
                    };
                });
                div.addEventListener('mouseleave', () => {
                    const itemId = div.dataset.itemId;
                    if (this.hoverTimeouts[itemId]) {
                        clearTimeout(this.hoverTimeouts[itemId].details);
                        clearTimeout(this.hoverTimeouts[itemId].modal);
                        delete this.hoverTimeouts[itemId];
                    }
                    const img = div.querySelector('.episodios-series-card-image');
                    const background = div.querySelector('.detail-background');
                    const overlay = div.querySelector('.carousel-overlay');
                    img.style.opacity = '1';
                    background.style.opacity = '0';
                    overlay.style.opacity = '0';
                    overlay.style.transform = 'translateY(20px)';
                    setTimeout(() => {
                        background.style.display = 'none';
                    }, 300);
                });
            }
            div.addEventListener('click', (e) => {
                e.preventDefault();
                const itemId = div.dataset.itemId;
                if (this.hoverTimeouts[itemId]) {
                    clearTimeout(this.hoverTimeouts[itemId].details);
                    clearTimeout(this.hoverTimeouts[itemId].modal);
                }
                // Hash persistente igual que Series/Animes
                const hash = `id=${encodeURIComponent(item.id)}&title=${encodeURIComponent(item.title)}`;
                if (window.location.hash !== `#${hash}`) {
                    history.pushState(null, '', `#${hash}`);
                }
                if (window.detailsModal && typeof window.detailsModal.show === 'function') {
                    window.detailsModal.show(item, div);
                }
            });
            this.wrapper.appendChild(div);
        }
        // Barra de progreso
        this.updateProgressBar();

        // Hash persistente y navegación directa
        if (!this._hashListener) {
            this._hashListener = true;
            window.addEventListener('hashchange', () => {
                setTimeout(() => this.scrollToHash(), 0);
            });
        }
        // Limpiar hash al cerrar modal (igual que otros carouseles)
        if (window.detailsModalOverlay) {
            const closeBtn = document.getElementById('details-modal-close');
            if (closeBtn && !closeBtn._episodiosHashListener) {
                closeBtn._episodiosHashListener = true;
                closeBtn.addEventListener('click', () => {
                    if (window.location.hash.startsWith('#id=')) {
                        history.replaceState(null, '', window.location.pathname + window.location.search);
                    }
                });
            }
        }
    }

    updateProgressBar() {
        if (!this.progressBar) return;
        if (this.wrapper.scrollWidth > this.wrapper.clientWidth) {
            const scrollPercentage = (this.wrapper.scrollLeft / (this.wrapper.scrollWidth - this.wrapper.clientWidth)) * 100;
            this.progressBar.style.width = `${scrollPercentage}%`;
        } else {
            this.progressBar.style.width = '100%';
        }
    }

    scrollToPrevPage() {
        this.scrollToPage('prev');
    }
    scrollToNextPage() {
        this.scrollToPage('next');
    }
    scrollToPage(direction) {
        if (!this.wrapper) return;
        // Medir paso dinámicamente y alinear al múltiplo de stepSize
    const { stepSize, itemsPerViewport } = computeCarouselStep(this.wrapper);
    try { console.log(`[Carousel][${this.wrapper && this.wrapper.id ? this.wrapper.id : 'unknown'}] measured: stepSize=${stepSize}, itemsPerViewport=${itemsPerViewport}`); } catch (e) {}

        // Si la medición es inválida (p. ej. imágenes aún no cargadas), reintentar unas pocas veces
        if (!stepSize || stepSize < 30) {
            this._scrollRetryCount = (this._scrollRetryCount || 0) + 1;
            if (this._scrollRetryCount <= 3) {
                setTimeout(() => this.scrollToPage(direction), 80);
                return;
            }
            // resetear contador y continuar con fallback
            this._scrollRetryCount = 0;
        }

        // medición válida -> resetear contador
        this._scrollRetryCount = 0;

        // Log diagnóstico del intento de paginación
        try {
            console.log(`[Carousel][${this.wrapper && this.wrapper.id ? this.wrapper.id : 'unknown'}] scrollToPage(${direction}) called -> containerWidth=${this.wrapper.clientWidth}, stepSize=${stepSize}, itemsPerViewport=${itemsPerViewport}, currentScroll=${this.wrapper.scrollLeft}, scrollWidth=${this.wrapper.scrollWidth}`);
        } catch (e) {}

        const currentScroll = this.wrapper.scrollLeft;
        const maxScroll = this.wrapper.scrollWidth - this.wrapper.clientWidth;

        // Calcular índice actual y objetivo
        let currentIndex = null;
        try {
            const idx = getFirstFullyVisibleItemIndex(this.wrapper);
            if (typeof idx === 'number' && idx >= 0) currentIndex = idx;
        } catch (e) { currentIndex = null; }
        if (currentIndex === null) currentIndex = Math.round(currentScroll / stepSize);
        let targetIndex;
        if (direction === 'prev') {
            targetIndex = Math.max(0, currentIndex - itemsPerViewport);
        } else {
            targetIndex = currentIndex + itemsPerViewport;
        }

        const totalItems = this.wrapper.querySelectorAll('.custom-carousel-item').length;
        const maxFirstIndex = Math.max(0, totalItems - itemsPerViewport);
        targetIndex = Math.max(0, Math.min(targetIndex, maxFirstIndex));

        // Intentar alinear usando el elemento objetivo para evitar cálculos de píxeles
        const itemList = Array.from(this.wrapper.querySelectorAll('.custom-carousel-item'));
        const targetItem = itemList[targetIndex];
        if (targetItem && typeof targetItem.scrollIntoView === 'function') {
            try {
                targetItem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
                return;
            } catch (e) {
                // fallback a scrollTo si scrollIntoView falla
            }
        }
        
        const finalScroll = targetIndex * stepSize;
        this.wrapper.scrollTo({ left: Math.max(0, Math.min(finalScroll, maxScroll)), behavior: 'smooth' });
    }

// (Eliminados duplicados y métodos sobrantes)
}

// Carrusel de Episodios Animes (paralelo a EpisodiosSeriesCarousel)
class EpisodiosAnimesCarousel {
    scrollToHash(retries = 10) {
        if (!window.location.hash.startsWith('#id=')) return;
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const id = params.get('id');
        const title = params.get('title');
        if (!id || !title) return;
        const normalizeText = (text) => {
            if (!text) return '';
            try {
                return text.normalize("NFD").replace(/[00-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            } catch (e) { return String(text).toLowerCase(); }
        };
        const decodedTitle = decodeURIComponent(title);
        const item = this.episodiosData.find(ep => String(ep.id) === id && ep.title && normalizeText(ep.title) === decodedTitle);
        if (!item) return;
        const div = this.wrapper.querySelector(`[data-item-id="${CSS.escape(item.id)}"]`);
        if (div) {
            div.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            if (window.detailsModal && typeof window.detailsModal.show === 'function') {
                window.detailsModal.show(item, div);
            }
        } else if (retries > 0) {
            setTimeout(() => this.scrollToHash(retries - 1), 120);
        }
    }
    constructor() {
        this.wrapper = document.getElementById('episodios-animes-carousel-wrapper');
        this.skeleton = document.getElementById('episodios-animes-carousel-skeleton');
        this.progressBar = null;
        this.carouselNav = document.getElementById('episodios-animes-carousel-nav');
        this.carouselPrev = document.getElementById('episodios-animes-carousel-prev');
        this.carouselNext = document.getElementById('episodios-animes-carousel-next');
        this.carouselContainer = this.wrapper ? this.wrapper.parentElement : null;
        // Diagnostic logs to validate DOM presence and initialization order
        console.log('[EpisodiosAnimesCarousel] constructor -> wrapper:', this.wrapper, 'skeleton:', this.skeleton);
        console.log('[EpisodiosAnimesCarousel] constructor -> carouselNav:', this.carouselNav, 'carouselPrev:', this.carouselPrev, 'carouselNext:', this.carouselNext, 'carouselContainer:', this.carouselContainer);
        this.itemsPerPage = 0;
        this.index = 0;
        this.step = 0;
        this.moreAppended = false;
        this.episodiosData = [];
        this.hoverTimeouts = {};
        if (!this.wrapper || !this.skeleton || !this.carouselContainer) return;
        if (!this.carouselPrev || !this.carouselNext || !this.carouselNav) {
            const observer = new MutationObserver(() => {
                this.carouselPrev = document.getElementById('episodios-animes-carousel-prev');
                this.carouselNext = document.getElementById('episodios-animes-carousel-next');
                this.carouselNav = document.getElementById('episodios-animes-carousel-nav');
                if (this.carouselPrev && this.carouselNext && this.carouselNav) {
                    this.setupEventListeners();
                    observer.disconnect();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            return;
        }
        this.init();
    }
    init() {
        if (this.wrapper) this.progressBar = this.wrapper.parentElement.querySelector('.carousel-progress-bar');
        this.setupResizeObserver();
        this.setupEventListeners();
        try { setupCarouselMeasurementGuard(this.wrapper, this.carouselPrev, this.carouselNext); } catch (e) {}
        this.loadEpisodiosData();
    }
    setupResizeObserver() {
        if (!this.wrapper) return;
        const itemWidth = 246;
        const gap = 4;
        const calculate = () => {
            const containerWidth = this.wrapper.clientWidth;
            if (containerWidth > 0) {
                const itemsThatFit = Math.floor(containerWidth / (itemWidth + gap));
                this.itemsPerPage = Math.max(1, itemsThatFit);
                this.step = this.itemsPerPage;
            } else {
                this.itemsPerPage = 1;
                this.step = 1;
            }
        };
        calculate();
        const resizeObserver = new ResizeObserver(() => { calculate(); });
        resizeObserver.observe(this.wrapper);
    }
    setupEventListeners() {
        window.addEventListener('resize', () => { if (this.updateProgressBar) this.updateProgressBar(); });
    if (this.carouselPrev) this.carouselPrev.addEventListener('click', (e) => { e.preventDefault(); try { if (window.sliderIndependent && typeof window.sliderIndependent.pauseAutoPlay === 'function') window.sliderIndependent.pauseAutoPlay(); } catch (err) {} this.scrollToPrevPage(); });
    if (this.carouselNext) this.carouselNext.addEventListener('click', (e) => { e.preventDefault(); try { if (window.sliderIndependent && typeof window.sliderIndependent.pauseAutoPlay === 'function') window.sliderIndependent.pauseAutoPlay(); } catch (err) {} this.scrollToNextPage(); });
        if (this.wrapper) {
            this.wrapper.addEventListener('scroll', () => { if (this.updateProgressBar) this.updateProgressBar(); });
            if (this.updateProgressBar) this.updateProgressBar();
        }
    }
    async loadEpisodiosData() {
        try {
            let data;
            if (window.sharedData) data = window.sharedData; else {
                const response = await fetch(DATA_URL);
                if (!response.ok) throw new Error('No se pudo cargar data.json');
                data = await response.json();
                window.sharedData = data;
            }
            this.episodiosData = [];
            let epIndex = 0;
            for (const item of data) {
                if (item && typeof item === 'object' && item['Categoría'] === 'Animes' && item['Título episodio'] && item['Título episodio'].trim() !== '') {
                    this.episodiosData.push({
                        id: `ep_anime_${epIndex}`,
                        title: item['Título episodio'] || 'Sin título',
                        serie: item['Título'] || '',
                        description: item['Synopsis'] || 'Descripción no disponible',
                        posterUrl: item['Portada'] || '',
                        backgroundUrl: item['Portada'] || '',
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
                        subtitleList: item['Subtítulos'] ? item['Subtítulos'].split(',') : [],
                        episodioNum: item['Episodio'] || '',
                        temporada: item['Temporada'] || ''
                    });
                    epIndex++;
                }
            }
            if (this.episodiosData.length === 0) {
                this.episodiosData = [{ id: "ep_anime_12345", title: "Ejemplo de episodio", serie: "Anime de ejemplo", description: "Ejemplo", posterUrl: "https://via.placeholder.com/246x138", backgroundUrl: "https://via.placeholder.com/246x138", year: "2023", duration: "24 min", genre: "Animación", rating: "8.0", ageRating: "13", link: "#", trailerUrl: "", videoUrl: "", tmdbUrl: "", audiosCount: 1, subtitlesCount: 1, audioList: ["JP"], subtitleList: ["ESP"], episodioNum: "1", temporada: "1" }];
            }
            this.showCarousel();
            this.renderItems();
            setTimeout(() => this.scrollToHash(), 0);
            if (window.notifyDataLoaded) window.notifyDataLoaded();
        } catch (error) {
            this.episodiosData = [{ id: "ep_anime_12345", title: "Ejemplo de episodio", serie: "Anime de ejemplo", description: "Ejemplo", posterUrl: "https://via.placeholder.com/246x138", backgroundUrl: "https://via.placeholder.com/246x138", year: "2023", duration: "24 min", genre: "Animación", rating: "8.0", ageRating: "13", link: "#", trailerUrl: "", videoUrl: "", tmdbUrl: "", audiosCount: 1, subtitlesCount: 1, audioList: ["JP"], subtitleList: ["ESP"], episodioNum: "1", temporada: "1" }];
            this.showCarousel();
            this.renderItems();
            setTimeout(() => this.scrollToHash(), 0);
            if (window.notifyDataLoaded) window.notifyDataLoaded();
        }
    }
    showCarousel() {
        this.skeleton.style.display = 'none';
        this.wrapper.style.display = 'flex';
        if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
            this.carouselNav.style.display = 'flex';
        }
    }
    async renderItems() {
        this.wrapper.innerHTML = '';
        if (!document.getElementById('episodios-animes-labels-styles')) {
            const sh = document.createElement('style');
            sh.id = 'episodios-animes-labels-styles';
            sh.innerHTML = `
                .carousel-labels{display:flex;flex-direction:column;align-items:flex-start;padding:8px 4px 0 4px;gap:2px}
                .carousel-series-title{font-size:12px;color:rgba(255,255,255,0.8);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
                .carousel-episode-title{font-size:13px;color:rgba(255,255,255,1);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
                .episodios-animes-item .poster-container{display:block}
            `;
            document.head.appendChild(sh);
        }
        const itemWidth = 300;
        const gap = 8;
        for (let i = 0; i < this.episodiosData.length; i++) {
            const item = this.episodiosData[i];
            const div = document.createElement('div');
            // Use the exact same item classes as EpisodiosSeriesCarousel so styles and behavior match
            div.className = 'custom-carousel-item episodios-series-item';
            div.dataset.itemId = item.id;
            const metaInfo = [];
            if (item.serie) metaInfo.push(`<span>${item.serie}</span>`);
            if (item.temporada) metaInfo.push(`<span>T${item.temporada}</span>`);
            if (item.episodioNum) metaInfo.push(`<span>E${item.episodioNum}</span>`);
            if (item.year) metaInfo.push(`<span>${item.year}</span>`);
            if (item.duration) metaInfo.push(`<span>${item.duration}</span>`);
            if (item.genre) metaInfo.push(`<span>${item.genre}</span>`);
            if (item.rating) metaInfo.push(`<div class="carousel-rating"><i class="fas fa-star"></i><span>${item.rating}</span></div>`);
            if (item.ageRating) metaInfo.push(`<span class="age-rating">${item.ageRating}</span>`);
            let posterUrl = item.posterUrl || 'https://via.placeholder.com/300x169';
            div.innerHTML = `
                <div class="loader_episodios"><i class="fas fa-spinner"></i></div>
                <div class="poster-container">
                    <img class="episodios-series-card-image" src="${posterUrl}" alt="${item.title}" loading="lazy" style="opacity:0;transition:opacity 0.3s ease">
                    <div class="carousel-overlay">
                        ${metaInfo.length ? `<div class="carousel-meta">${metaInfo.join('')}</div>` : ''}
                        ${item.description ? `<div class="carousel-description">${item.description}</div>` : ''}
                    </div>
                </div>
                <div class="carousel-labels">
                    <div class="carousel-series-title">${item.serie || ''}</div>
                    <div class="carousel-episode-title">${item.title}</div>
                </div>
                <img class="detail-background" src="${item.backgroundUrl || posterUrl}" alt="${item.title} - Background" loading="lazy" style="display:none;width:300px;height:169px;">
            `;
            const img = div.querySelector('.episodios-series-card-image');
            img.onload = function() { img.style.opacity = '1'; const l = div.querySelector('.loader_episodios') || div.querySelector('.loader'); if (l) l.style.display = 'none'; };
            if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
                div.addEventListener('mouseenter', (e) => {
                    const itemId = div.dataset.itemId;
                    if (this.hoverTimeouts[itemId]) {
                        clearTimeout(this.hoverTimeouts[itemId].details);
                        clearTimeout(this.hoverTimeouts[itemId].modal);
                    }
                    const rect = div.getBoundingClientRect();
                    this.hoverModalOrigin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                    this.hoverTimeouts[itemId] = { details: setTimeout(() => {
                        const background = div.querySelector('.detail-background');
                        const overlay = div.querySelector('.carousel-overlay');
                        background.style.display = 'block';
                        background.style.opacity = '1';
                        overlay.style.opacity = '1';
                        overlay.style.transform = 'translateY(0)';
                        this.hoverTimeouts[itemId].modal = setTimeout(() => {
                            if (!window.isModalOpen && !window.isDetailsModalOpen) {
                                window.hoverModalItem = div;
                                if (window.hoverModal && div) window.hoverModal.show(item, div);
                            }
                        }, 200);
                    }, 900) };
                });
                div.addEventListener('mouseleave', () => {
                    const itemId = div.dataset.itemId;
                    if (this.hoverTimeouts[itemId]) { clearTimeout(this.hoverTimeouts[itemId].details); clearTimeout(this.hoverTimeouts[itemId].modal); delete this.hoverTimeouts[itemId]; }
                    const img = div.querySelector('.episodios-series-card-image');
                    const background = div.querySelector('.detail-background');
                    const overlay = div.querySelector('.carousel-overlay');
                    img.style.opacity = '1';
                    background.style.opacity = '0';
                    overlay.style.opacity = '0';
                    overlay.style.transform = 'translateY(20px)';
                    setTimeout(() => { background.style.display = 'none'; }, 300);
                });
            }
            div.addEventListener('click', (e) => {
                e.preventDefault();
                const itemId = div.dataset.itemId;
                if (this.hoverTimeouts[itemId]) { clearTimeout(this.hoverTimeouts[itemId].details); clearTimeout(this.hoverTimeouts[itemId].modal); }
                const hash = `id=${encodeURIComponent(item.id)}&title=${encodeURIComponent(item.title)}`;
                if (window.location.hash !== `#${hash}`) history.pushState(null, '', `#${hash}`);
                if (window.detailsModal && typeof window.detailsModal.show === 'function') window.detailsModal.show(item, div);
            });
            this.wrapper.appendChild(div);
        }
        this.updateProgressBar();
        if (!this._hashListener) { this._hashListener = true; window.addEventListener('hashchange', () => { setTimeout(() => this.scrollToHash(), 0); }); }
        if (window.detailsModalOverlay) {
            const closeBtn = document.getElementById('details-modal-close');
            if (closeBtn && !closeBtn._episodiosHashListener) { closeBtn._episodiosHashListener = true; closeBtn.addEventListener('click', () => { if (window.location.hash.startsWith('#id=')) history.replaceState(null, '', window.location.pathname + window.location.search); }); }
        }
    }
    updateProgressBar() {
        if (!this.progressBar) return;
        if (this.wrapper.scrollWidth > this.wrapper.clientWidth) {
            const scrollPercentage = (this.wrapper.scrollLeft / (this.wrapper.scrollWidth - this.wrapper.clientWidth)) * 100;
            this.progressBar.style.width = `${scrollPercentage}%`;
        } else {
            this.progressBar.style.width = '100%';
        }
    }
    scrollToPrevPage() { this.scrollToPage('prev'); }
    scrollToNextPage() { this.scrollToPage('next'); }
    scrollToPage(direction) {
        if (!this.wrapper) return;
    const { stepSize, itemsPerViewport } = computeCarouselStep(this.wrapper);
    try { console.log(`[Carousel][${this.wrapper && this.wrapper.id ? this.wrapper.id : 'unknown'}] measured: stepSize=${stepSize}, itemsPerViewport=${itemsPerViewport}`); } catch (e) {}
        if (!stepSize || stepSize < 30) {
            this._scrollRetryCount = (this._scrollRetryCount || 0) + 1;
            if (this._scrollRetryCount <= 3) {
                setTimeout(() => this.scrollToPage(direction), 80);
                return;
            }
            this._scrollRetryCount = 0;
        }
        this._scrollRetryCount = 0;
        const currentScroll = this.wrapper.scrollLeft;
        const maxScroll = this.wrapper.scrollWidth - this.wrapper.clientWidth;
        let currentIndex = null;
        try {
            const idx = getFirstFullyVisibleItemIndex(this.wrapper);
            if (typeof idx === 'number' && idx >= 0) currentIndex = idx;
        } catch (e) { currentIndex = null; }
        if (currentIndex === null) currentIndex = Math.round(currentScroll / stepSize);
        let targetIndex;
        if (direction === 'prev') targetIndex = Math.max(0, currentIndex - itemsPerViewport); else targetIndex = currentIndex + itemsPerViewport;
        const totalItems = this.wrapper.querySelectorAll('.custom-carousel-item').length;
        const maxFirstIndex = Math.max(0, totalItems - itemsPerViewport);
        targetIndex = Math.max(0, Math.min(targetIndex, maxFirstIndex));
        const finalScroll = targetIndex * stepSize;
        this.wrapper.scrollTo({ left: Math.max(0, Math.min(finalScroll, maxScroll)), behavior: 'smooth' });
    }
}

// Nota: la instancia de EpisodiosSeriesCarousel se crea desde `main.js` durante initializeComponents()
// Nuevo: Carrusel de Episodios Documentales (paralelo a EpisodiosSeriesCarousel / EpisodiosAnimesCarousel)
class EpisodiosDocumentalesCarousel {
    scrollToHash(retries = 10) {
        if (!window.location.hash.startsWith('#id=')) return;
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const id = params.get('id');
        const title = params.get('title');
        if (!id || !title) return;
        const normalizeText = (text) => {
            if (!text) return '';
            try {
                return text.normalize("NFD").replace(/[ -\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            } catch (e) { return String(text).toLowerCase(); }
        };
        const decodedTitle = decodeURIComponent(title);
        const item = this.episodiosData.find(ep => String(ep.id) === id && ep.title && normalizeText(ep.title) === decodedTitle);
        if (!item) return;
        const div = this.wrapper.querySelector(`[data-item-id="${CSS.escape(item.id)}"]`);
        if (div) {
            div.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            if (window.detailsModal && typeof window.detailsModal.show === 'function') {
                window.detailsModal.show(item, div);
            }
        } else if (retries > 0) {
            setTimeout(() => this.scrollToHash(retries - 1), 120);
        }
    }
    constructor() {
        this.wrapper = document.getElementById('episodios-documentales-carousel-wrapper');
        this.skeleton = document.getElementById('episodios-documentales-carousel-skeleton');
        this.progressBar = null;
        this.carouselNav = document.getElementById('episodios-documentales-carousel-nav');
        this.carouselPrev = document.getElementById('episodios-documentales-carousel-prev');
        this.carouselNext = document.getElementById('episodios-documentales-carousel-next');
        this.carouselContainer = this.wrapper ? this.wrapper.parentElement : null;
        this.itemsPerPage = 0;
        this.index = 0;
        this.step = 0;
        this.moreAppended = false;
        this.episodiosData = [];
        this.hoverTimeouts = {};
        if (!this.wrapper || !this.skeleton || !this.carouselContainer) return;
        if (!this.carouselPrev || !this.carouselNext || !this.carouselNav) {
            const observer = new MutationObserver(() => {
                this.carouselPrev = document.getElementById('episodios-documentales-carousel-prev');
                this.carouselNext = document.getElementById('episodios-documentales-carousel-next');
                this.carouselNav = document.getElementById('episodios-documentales-carousel-nav');
                if (this.carouselPrev && this.carouselNext && this.carouselNav) {
                    this.setupEventListeners();
                    observer.disconnect();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            return;
        }
        this.init();
    }
    init() {
        if (this.wrapper) this.progressBar = this.wrapper.parentElement.querySelector('.carousel-progress-bar');
        this.setupResizeObserver();
        this.setupEventListeners();
        try { setupCarouselMeasurementGuard(this.wrapper, this.carouselPrev, this.carouselNext); } catch (e) {}
        this.loadEpisodiosData();
    }
    setupResizeObserver() {
        if (!this.wrapper) return;
        const itemWidth = 246;
        const gap = 4;
        const calculate = () => {
            const containerWidth = this.wrapper.clientWidth;
            if (containerWidth > 0) {
                const itemsThatFit = Math.floor(containerWidth / (itemWidth + gap));
                this.itemsPerPage = Math.max(1, itemsThatFit);
                this.step = this.itemsPerPage;
            } else {
                this.itemsPerPage = 1;
                this.step = 1;
            }
        };
        calculate();
        const resizeObserver = new ResizeObserver(() => { calculate(); });
        resizeObserver.observe(this.wrapper);
    }
    setupEventListeners() {
        window.addEventListener('resize', () => { if (this.updateProgressBar) this.updateProgressBar(); });
    if (this.carouselPrev) this.carouselPrev.addEventListener('click', (e) => { e.preventDefault(); try { if (window.sliderIndependent && typeof window.sliderIndependent.pauseAutoPlay === 'function') window.sliderIndependent.pauseAutoPlay(); } catch (err) {} this.scrollToPrevPage(); });
    if (this.carouselNext) this.carouselNext.addEventListener('click', (e) => { e.preventDefault(); try { if (window.sliderIndependent && typeof window.sliderIndependent.pauseAutoPlay === 'function') window.sliderIndependent.pauseAutoPlay(); } catch (err) {} this.scrollToNextPage(); });
        if (this.wrapper) {
            this.wrapper.addEventListener('scroll', () => { if (this.updateProgressBar) this.updateProgressBar(); });
            if (this.updateProgressBar) this.updateProgressBar();
        }
    }
    async loadEpisodiosData() {
        try {
            let data;
            if (window.sharedData) data = window.sharedData; else {
                const response = await fetch(DATA_URL);
                if (!response.ok) throw new Error('No se pudo cargar data.json');
                data = await response.json();
                window.sharedData = data;
            }
            this.episodiosData = [];
            let epIndex = 0;
            for (const item of data) {
                if (item && typeof item === 'object' && item['Categoría'] === 'Documentales' && item['Título episodio'] && item['Título episodio'].trim() !== '') {
                    this.episodiosData.push({
                        id: `ep_docu_${epIndex}`,
                        title: item['Título episodio'] || 'Sin título',
                        serie: item['Título'] || '',
                        description: item['Synopsis'] || 'Descripción no disponible',
                        posterUrl: item['Portada'] || '',
                        backgroundUrl: item['Portada'] || '',
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
                        subtitleList: item['Subtítulos'] ? item['Subtítulos'].split(',') : [],
                        episodioNum: item['Episodio'] || '',
                        temporada: item['Temporada'] || ''
                    });
                    epIndex++;
                }
            }
            if (this.episodiosData.length === 0) {
                this.episodiosData = [{ id: "ep_docu_12345", title: "Ejemplo de episodio documental", serie: "Documental de ejemplo", description: "Ejemplo", posterUrl: "https://via.placeholder.com/246x138", backgroundUrl: "https://via.placeholder.com/246x138", year: "2023", duration: "30 min", genre: "Documental", rating: "7.5", ageRating: "0", link: "#", trailerUrl: "", videoUrl: "", tmdbUrl: "", audiosCount: 1, subtitlesCount: 1, audioList: ["Español"], subtitleList: ["Español"], episodioNum: "1", temporada: "1" }];
            }
            this.showCarousel();
            this.renderItems();
            setTimeout(() => this.scrollToHash(), 0);
            if (window.notifyDataLoaded) window.notifyDataLoaded();
        } catch (error) {
            this.episodiosData = [{ id: "ep_docu_12345", title: "Ejemplo de episodio documental", serie: "Documental de ejemplo", description: "Ejemplo", posterUrl: "https://via.placeholder.com/246x138", backgroundUrl: "https://via.placeholder.com/246x138", year: "2023", duration: "30 min", genre: "Documental", rating: "7.5", ageRating: "0", link: "#", trailerUrl: "", videoUrl: "", tmdbUrl: "", audiosCount: 1, subtitlesCount: 1, audioList: ["Español"], subtitleList: ["Español"], episodioNum: "1", temporada: "1" }];
            this.showCarousel();
            this.renderItems();
            setTimeout(() => this.scrollToHash(), 0);
            if (window.notifyDataLoaded) window.notifyDataLoaded();
        }
    }
    showCarousel() {
        this.skeleton.style.display = 'none';
        this.wrapper.style.display = 'flex';
        if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
            this.carouselNav.style.display = 'flex';
        }
    }
    async renderItems() {
        this.wrapper.innerHTML = '';
        if (!document.getElementById('episodios-documentales-labels-styles')) {
            const sh = document.createElement('style');
            sh.id = 'episodios-documentales-labels-styles';
            sh.innerHTML = `
                .carousel-labels{display:flex;flex-direction:column;align-items:flex-start;padding:8px 4px 0 4px;gap:2px}
                .carousel-series-title{font-size:12px;color:rgba(255,255,255,0.8);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
                .carousel-episode-title{font-size:13px;color:rgba(255,255,255,1);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
                .episodios-series-item .poster-container{display:block}
            `;
            document.head.appendChild(sh);
        }
        const itemWidth = 300;
        const gap = 8;
        for (let i = 0; i < this.episodiosData.length; i++) {
            const item = this.episodiosData[i];
            const div = document.createElement('div');
            div.className = 'custom-carousel-item episodios-series-item';
            div.dataset.itemId = item.id;
            const metaInfo = [];
            if (item.serie) metaInfo.push(`<span>${item.serie}</span>`);
            if (item.temporada) metaInfo.push(`<span>T${item.temporada}</span>`);
            if (item.episodioNum) metaInfo.push(`<span>E${item.episodioNum}</span>`);
            if (item.year) metaInfo.push(`<span>${item.year}</span>`);
            if (item.duration) metaInfo.push(`<span>${item.duration}</span>`);
            if (item.genre) metaInfo.push(`<span>${item.genre}</span>`);
            if (item.rating) metaInfo.push(`<div class="carousel-rating"><i class="fas fa-star"></i><span>${item.rating}</span></div>`);
            if (item.ageRating) metaInfo.push(`<span class="age-rating">${item.ageRating}</span>`);
            let posterUrl = item.posterUrl || 'https://via.placeholder.com/300x169';
            div.innerHTML = `
                <div class="loader_episodios"><i class="fas fa-spinner"></i></div>
                <div class="poster-container">
                    <img class="episodios-series-card-image" src="${posterUrl}" alt="${item.title}" loading="lazy" style="opacity:0;transition:opacity 0.3s ease">
                    <div class="carousel-overlay">
                        ${metaInfo.length ? `<div class="carousel-meta">${metaInfo.join('')}</div>` : ''}
                        ${item.description ? `<div class="carousel-description">${item.description}</div>` : ''}
                    </div>
                </div>
                <div class="carousel-labels">
                    <div class="carousel-series-title">${item.serie || ''}</div>
                    <div class="carousel-episode-title">${item.title}</div>
                </div>
                <img class="detail-background" src="${item.backgroundUrl || posterUrl}" alt="${item.title} - Background" loading="lazy" style="display:none;width:300px;height:169px;">
            `;
            const img = div.querySelector('.episodios-series-card-image');
            img.onload = function() { img.style.opacity = '1'; const l = div.querySelector('.loader_episodios') || div.querySelector('.loader'); if (l) l.style.display = 'none'; };
            if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
                div.addEventListener('mouseenter', (e) => {
                    const itemId = div.dataset.itemId;
                    if (this.hoverTimeouts[itemId]) { clearTimeout(this.hoverTimeouts[itemId].details); clearTimeout(this.hoverTimeouts[itemId].modal); }
                    const rect = div.getBoundingClientRect();
                    this.hoverModalOrigin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                    this.hoverTimeouts[itemId] = { details: setTimeout(() => {
                        const background = div.querySelector('.detail-background');
                        const overlay = div.querySelector('.carousel-overlay');
                        background.style.display = 'block';
                        background.style.opacity = '1';
                        overlay.style.opacity = '1';
                        overlay.style.transform = 'translateY(0)';
                        this.hoverTimeouts[itemId].modal = setTimeout(() => {
                            if (!window.isModalOpen && !window.isDetailsModalOpen) {
                                window.hoverModalItem = div;
                                if (window.hoverModal && div) window.hoverModal.show(item, div);
                            }
                        }, 200);
                    }, 900) };
                });
                div.addEventListener('mouseleave', () => {
                    const itemId = div.dataset.itemId;
                    if (this.hoverTimeouts[itemId]) { clearTimeout(this.hoverTimeouts[itemId].details); clearTimeout(this.hoverTimeouts[itemId].modal); delete this.hoverTimeouts[itemId]; }
                    const img = div.querySelector('.episodios-series-card-image');
                    const background = div.querySelector('.detail-background');
                    const overlay = div.querySelector('.carousel-overlay');
                    img.style.opacity = '1';
                    background.style.opacity = '0';
                    overlay.style.opacity = '0';
                    overlay.style.transform = 'translateY(20px)';
                    setTimeout(() => { background.style.display = 'none'; }, 300);
                });
            }
            div.addEventListener('click', (e) => {
                e.preventDefault();
                const itemId = div.dataset.itemId;
                if (this.hoverTimeouts[itemId]) { clearTimeout(this.hoverTimeouts[itemId].details); clearTimeout(this.hoverTimeouts[itemId].modal); }
                const hash = `id=${encodeURIComponent(item.id)}&title=${encodeURIComponent(item.title)}`;
                if (window.location.hash !== `#${hash}`) history.pushState(null, '', `#${hash}`);
                if (window.detailsModal && typeof window.detailsModal.show === 'function') window.detailsModal.show(item, div);
            });
            this.wrapper.appendChild(div);
        }
        this.updateProgressBar();
        if (!this._hashListener) { this._hashListener = true; window.addEventListener('hashchange', () => { setTimeout(() => this.scrollToHash(), 0); }); }
        if (window.detailsModalOverlay) {
            const closeBtn = document.getElementById('details-modal-close');
            if (closeBtn && !closeBtn._episodiosHashListener) { closeBtn._episodiosHashListener = true; closeBtn.addEventListener('click', () => { if (window.location.hash.startsWith('#id=')) history.replaceState(null, '', window.location.pathname + window.location.search); }); }
        }
    }
    updateProgressBar() {
        if (!this.progressBar) return;
        if (this.wrapper.scrollWidth > this.wrapper.clientWidth) {
            const scrollPercentage = (this.wrapper.scrollLeft / (this.wrapper.scrollWidth - this.wrapper.clientWidth)) * 100;
            this.progressBar.style.width = `${scrollPercentage}%`;
        } else { this.progressBar.style.width = '100%'; }
    }
    scrollToPrevPage() { this.scrollToPage('prev'); }
    scrollToNextPage() { this.scrollToPage('next'); }
    scrollToPage(direction) {
        if (!this.wrapper) return;
    const { stepSize, itemsPerViewport } = computeCarouselStep(this.wrapper);
    try { console.log(`[Carousel][${this.wrapper && this.wrapper.id ? this.wrapper.id : 'unknown'}] measured: stepSize=${stepSize}, itemsPerViewport=${itemsPerViewport}`); } catch (e) {}
        if (!stepSize || stepSize < 30) {
            this._scrollRetryCount = (this._scrollRetryCount || 0) + 1;
            if (this._scrollRetryCount <= 3) {
                setTimeout(() => this.scrollToPage(direction), 80);
                return;
            }
            this._scrollRetryCount = 0;
        }
        this._scrollRetryCount = 0;
        const currentScroll = this.wrapper.scrollLeft;
        const maxScroll = this.wrapper.scrollWidth - this.wrapper.clientWidth;
        let currentIndex = null;
        try {
            const idx = getFirstFullyVisibleItemIndex(this.wrapper);
            if (typeof idx === 'number' && idx >= 0) currentIndex = idx;
        } catch (e) { currentIndex = null; }
        if (currentIndex === null) currentIndex = Math.round(currentScroll / stepSize);
        let targetIndex;
        if (direction === 'prev') targetIndex = Math.max(0, currentIndex - itemsPerViewport); else targetIndex = currentIndex + itemsPerViewport;
        const totalItems = this.wrapper.querySelectorAll('.custom-carousel-item').length;
        const maxFirstIndex = Math.max(0, totalItems - itemsPerViewport);
        targetIndex = Math.max(0, Math.min(targetIndex, maxFirstIndex));
        const finalScroll = targetIndex * stepSize;
        this.wrapper.scrollTo({ left: Math.max(0, Math.min(finalScroll, maxScroll)), behavior: 'smooth' });
    }
}
class AnimesCarousel {
    constructor() {
        console.log("AnimesCarousel: Constructor iniciado");
        this.wrapper = document.getElementById('animes-carousel-wrapper');
        this.skeleton = document.getElementById('animes-carousel-skeleton');
        this.progressBar = null;
        this.carouselNav = document.getElementById('animes-carousel-nav');
        this.carouselPrev = document.getElementById('animes-carousel-prev');
        this.carouselNext = document.getElementById('animes-carousel-next');
        this.carouselContainer = document.querySelector('#animes-carousel-wrapper').parentElement;
        this.itemsPerPage = 0;
        this.index = 0;
        this.step = 0;
        this.moreAppended = false;
        this.animeData = [];
        this.hoverTimeouts = {};

        if (!this.wrapper || !this.skeleton || !this.carouselContainer) {
            console.error("Elementos del carrusel de animes no encontrados");
            return;
        }
        if (!this.carouselPrev || !this.carouselNext || !this.carouselNav) {
            const observer = new MutationObserver(() => {
                this.carouselPrev = document.getElementById('animes-carousel-prev');
                this.carouselNext = document.getElementById('animes-carousel-next');
                this.carouselNav = document.getElementById('animes-carousel-nav');
                if (this.carouselPrev && this.carouselNext && this.carouselNav) {
                    this.setupEventListeners();
                    observer.disconnect();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            return;
        }
        this.init();
    }
    init() {
        if (this.wrapper) {
            this.progressBar = this.wrapper.parentElement.querySelector('.carousel-progress-bar');
        }
        this.setupResizeObserver();
        this.setupEventListeners();
        try { setupCarouselMeasurementGuard(this.wrapper, this.carouselPrev, this.carouselNext); } catch (e) {}
        this.loadAnimeData();
    }

    updateProgressBar() {
        if (!this.progressBar || !this.wrapper) return;
        try {
            if (this.wrapper.scrollWidth > this.wrapper.clientWidth) {
                const scrollPercentage = (this.wrapper.scrollLeft / (this.wrapper.scrollWidth - this.wrapper.clientWidth)) * 100;
                this.progressBar.style.width = `${scrollPercentage}%`;
            } else {
                this.progressBar.style.width = '100%';
            }
        } catch (e) {}
    }

    handleScroll() {
        // Update visual progress and trigger lazy loading when near the end
        this.updateProgressBar();
        try {
            if (this.wrapper.scrollLeft + this.wrapper.clientWidth >= this.wrapper.scrollWidth - 200) {
                this.renderItems();
            }
        } catch (e) {}
    }
    setupResizeObserver() {
        if (!this.wrapper) return;
        const itemWidth = 194;
        const gap = 4;
        const calculate = () => {
            const containerWidth = this.wrapper.clientWidth;
            if (containerWidth > 0) {
                const itemsThatFit = Math.floor(containerWidth / (itemWidth + gap));
                this.itemsPerPage = Math.max(1, itemsThatFit);
                this.step = this.itemsPerPage;
            } else {
                this.itemsPerPage = 1;
                this.step = 1;
            }
        };
        calculate();
        const resizeObserver = new ResizeObserver(() => { calculate(); });
        resizeObserver.observe(this.wrapper);
    }
    setupEventListeners() {
        window.addEventListener('resize', () => this.calculateItemsPerPage && this.calculateItemsPerPage());
        if (this.carouselPrev) {
            this.carouselPrev.addEventListener('click', (e) => {
                e.preventDefault();
                try { if (window.sliderIndependent && typeof window.sliderIndependent.pauseAutoPlay === 'function') window.sliderIndependent.pauseAutoPlay(); } catch (err) {}
                this.scrollToPrevPage();
            });
        }
        if (this.carouselNext) {
            this.carouselNext.addEventListener('click', (e) => {
                e.preventDefault();
                try { if (window.sliderIndependent && typeof window.sliderIndependent.pauseAutoPlay === 'function') window.sliderIndependent.pauseAutoPlay(); } catch (err) {}
                this.scrollToNextPage();
            });
        }
        if (this.wrapper) {
            this.wrapper.addEventListener('scroll', () => this.handleScroll());
        }
    }
    async loadAnimeData() {
        try {
            let data;
            if (window.sharedData) {
                data = window.sharedData;
            } else {
                const response = await fetch(DATA_URL);
                if (!response.ok) throw new Error('No se pudo cargar data.json');
                data = await response.json();
                window.sharedData = data;
            }
            this.animeData = [];
            let animeIndex = 0;
            for (const item of data) {
                if (item && typeof item === 'object' && 
                    item['Categoría'] === 'Animes' && 
                    (!item['Título episodio'] || item['Título episodio'].trim() === '')) {
                    this.animeData.push({
                        id: `anime_${animeIndex}`,
                        title: item['Título'] || 'Sin título',
                        description: item['Synopsis'] || 'Descripción no disponible',
                        posterUrl: item['Portada'] || '',
                        postersUrl: item['Carteles'] || '',
                        backgroundUrl: item['Portada'] || '',
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
                        subtitleList: item['Subtítulos'] ? item['Subtítulos'].split(',') : [],
                        episodes: item['Episodios'] || []
                    });
                    animeIndex++;
                }
            }
            if (this.animeData.length === 0) {
                this.animeData = [
                    {
                        id: "anime_12345",
                        title: "Ejemplo de anime",
                        description: "Este es un anime de ejemplo que se muestra cuando no se pueden cargar los datos reales.",
                        posterUrl: "https://via.placeholder.com/194x271",
                        postersUrl: "https://via.placeholder.com/194x271",
                        backgroundUrl: "https://via.placeholder.com/194x271",
                        year: "2023",
                        duration: "24 min",
                        genre: "Acción",
                        rating: "8.5",
                        ageRating: "TP",
                        link: "#",
                        trailerUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                        videoUrl: "https://ejemplo.com/video.mp4",
                        tmdbUrl: "https://www.themoviedb.org/movie/12345",
                        audiosCount: 1,
                        subtitlesCount: 1,
                        audioList: ["Español"],
                        subtitleList: ["Español"],
                        episodes: []
                    }
                ];
            }
            this.showCarousel();
            this.renderItems();
        } catch (error) {
            this.animeData = [
                {
                    id: "anime_12345",
                    title: "Ejemplo de anime",
                    description: "Este es un anime de ejemplo que se muestra cuando no se pueden cargar los datos reales.",
                    posterUrl: "https://via.placeholder.com/194x271",
                    postersUrl: "https://via.placeholder.com/194x271",
                    backgroundUrl: "https://via.placeholder.com/194x271",
                    year: "2023",
                    duration: "24 min",
                    genre: "Acción",
                    rating: "8.5",
                    ageRating: "TP",
                    link: "#",
                    trailerUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                    videoUrl: "https://ejemplo.com/video.mp4",
                    tmdbUrl: "https://www.themoviedb.org/movie/12345",
                    audiosCount: 1,
                    subtitlesCount: 1,
                    audioList: ["Español"],
                    subtitleList: ["Español"],
                    episodes: []
                }
            ];
            this.showCarousel();
            this.renderItems();
        }
    }
    showCarousel() {
        this.skeleton.style.display = 'none';
        this.wrapper.style.display = 'flex';
        if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
            this.carouselNav.style.display = 'flex';
        }
    }
    async renderItems() {
        const containerWidth = this.wrapper.clientWidth;
        const itemWidth = 194;
        const gap = 4;
        const itemsThatFit = containerWidth > 0 ? Math.floor(containerWidth / (itemWidth + gap)) : 5;
        const step = Math.max(itemsThatFit * 2, 10);
        if (this.index === 0) {
            this.wrapper.innerHTML = '';
        }
        const end = Math.min(this.index + step, this.animeData.length);
        for (let i = this.index; i < end; i++) {
            const item = this.animeData[i];
            const div = document.createElement("div");
            div.className = "custom-carousel-item";
            div.dataset.itemId = i;
            const metaInfo = [];
            if (item.year) metaInfo.push(`<span>${item.year}</span>`);
            if (item.duration) metaInfo.push(`<span>${item.duration}</span>`);
            if (item.genre) metaInfo.push(`<span>${item.genre}</span>`);
            if (item.rating) metaInfo.push(`<div class=\"carousel-rating\"><i class=\"fas fa-star\"></i><span>${item.rating}</span></div>`);
            if (item.ageRating) metaInfo.push(`<span class=\"age-rating\">${item.ageRating}</span>`);
            let posterUrl = item.posterUrl;
            if (!posterUrl) posterUrl = 'https://via.placeholder.com/194x271';
            div.innerHTML = `
                <div class="loader"><i class="fas fa-spinner"></i></div>
                <div class="poster-container">
                    <img class="poster-image" src="${posterUrl}" alt="${item.title}" width="194" height="271" onload="this.parentElement.previousElementSibling.style.display='none'; this.style.opacity='1'" style="opacity:0;transition:opacity 0.3s ease" loading="lazy">
                </div>
                <img class="detail-background" src="${item.backgroundUrl || posterUrl}" alt="${item.title} - Background" loading="lazy" style="display:none">
                <div class="carousel-overlay">
                    <div class="carousel-title-overlay">${item.title}</div>
                    ${metaInfo.length ? `<div class="carousel-meta">${metaInfo.join('')}</div>` : ''}
                    ${item.description ? `<div class="carousel-description">${item.description}</div>` : ''}
                </div>
            `;
            if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
                div.addEventListener('mouseenter', (e) => {
                    const itemId = div.dataset.itemId;
                    if (this.hoverTimeouts[itemId]) {
                        clearTimeout(this.hoverTimeouts[itemId].details);
                        clearTimeout(this.hoverTimeouts[itemId].modal);
                    }
                    const rect = div.getBoundingClientRect();
                    this.hoverModalOrigin = {
                        x: rect.left + rect.width / 2,
                        y: rect.top + rect.height / 2
                    };
                    this.hoverTimeouts[itemId] = {
                        details: setTimeout(() => {
                            const background = div.querySelector('.detail-background');
                            const overlay = div.querySelector('.carousel-overlay');
                            background.style.display = 'block';
                            background.style.opacity = '1';
                            overlay.style.opacity = '1';
                            overlay.style.transform = 'translateY(0)';
                            this.hoverTimeouts[itemId].modal = setTimeout(() => {
                                if (!window.isModalOpen && !window.isDetailsModalOpen) {
                                    window.hoverModalItem = div;
                                    if (window.hoverModal && div) {
                                        window.hoverModal.show(item, div);
                                    }
                                }
                            }, 200);
                        }, 900)
                    };
                });
                div.addEventListener('mouseleave', () => {
                    const itemId = div.dataset.itemId;
                    if (this.hoverTimeouts[itemId]) {
                        clearTimeout(this.hoverTimeouts[itemId].details);
                        clearTimeout(this.hoverTimeouts[itemId].modal);
                        delete this.hoverTimeouts[itemId];
                    }
                    const poster = div.querySelector('.poster-image');
                    const background = div.querySelector('.detail-background');
                    const overlay = div.querySelector('.carousel-overlay');
                    poster.style.opacity = '1';
                    background.style.opacity = '0';
                    overlay.style.opacity = '0';
                    overlay.style.transform = 'translateY(20px)';
                    setTimeout(() => {
                        background.style.display = 'none';
                    }, 300);
                });
            }
            div.addEventListener('click', (e) => {
                e.preventDefault();
                const itemId = div.dataset.itemId;
                if (this.hoverTimeouts[itemId]) {
                    clearTimeout(this.hoverTimeouts[itemId].details);
                    clearTimeout(this.hoverTimeouts[itemId].modal);
                }
                // Actualizar el hash de la URL para persistencia
                const hash = `id=${encodeURIComponent(item.id)}&title=${encodeURIComponent(item.title)}`;
                if (window.location.hash !== `#${hash}`) {
                    history.pushState(null, '', `#${hash}`);
                }
                window.detailsModal.show(item, div);
            });
            this.wrapper.appendChild(div);
        }
        this.index = end;
        // Si hay barra de progreso, actualizarla
        if (this.progressBar) {
            if (this.wrapper.scrollWidth > this.wrapper.clientWidth) {
                const scrollPercentage = (this.wrapper.scrollLeft / (this.wrapper.scrollWidth - this.wrapper.clientWidth)) * 100;
                this.progressBar.style.width = `${scrollPercentage}%`;
            } else {
                this.progressBar.style.width = '100%';
            }
        }
    }
    scrollToPrevPage() {
        if (!this.wrapper) return;
        const scrollAmount = this.wrapper.clientWidth;
        this.wrapper.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
    scrollToNextPage() {
        if (!this.wrapper) return;
        const scrollAmount = this.wrapper.clientWidth;
        this.wrapper.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
}
class Carousel {
    constructor() {
        this.wrapper = document.getElementById('carousel-wrapper');
        this.skeleton = document.getElementById('carousel-skeleton');
        this.progressBar = document.querySelector('.carousel-progress-bar');
        this.carouselNav = document.getElementById('carousel-nav');
        this.carouselPrev = document.getElementById('carousel-prev');
        this.carouselNext = document.getElementById('carousel-next');
        this.carouselContainer = document.querySelector('.carousel-container');
        this.itemsPerPage = 0; // Se calculará dinámicamente
        this.index = 0;
        this.step = 0; // Se calculará dinámicamente
        this.moreAppended = false;
        this.moviesData = [];
        this.hoverTimeouts = {};

        if (!this.wrapper || !this.skeleton || !this.carouselContainer) {
            console.error("Elementos del carrusel no encontrados");
            return;
        }
        if (!this.carouselPrev || !this.carouselNext || !this.carouselNav) {
            console.error("Elementos de navegación del carrusel no encontrados");
            const observer = new MutationObserver(() => {
                this.carouselPrev = document.getElementById('carousel-prev');
                this.carouselNext = document.getElementById('carousel-next');
                this.carouselNav = document.getElementById('carousel-nav');
                if (this.carouselPrev && this.carouselNext && this.carouselNav) {
                    this.setupEventListeners();
                    observer.disconnect();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            return;
        }

        this.init();
    }

    init() {
        this.setupResizeObserver();
        this.setupEventListeners();
        try { setupCarouselMeasurementGuard(this.wrapper, this.carouselPrev, this.carouselNext); } catch (e) {}
        this.loadMoviesData();
    }

    setupResizeObserver() {
        if (!this.wrapper) {
            console.error('wrapper no definido en setupResizeObserver');
            // No establecer valores estáticos, se calcularán dinámicamente cuando sea necesario
            return;
        }

        const itemWidth = 194;
        const gap = 4;

        const calculate = () => {
            const containerWidth = this.wrapper.clientWidth;
            if (containerWidth > 0) {
                // Calcular cuántos items caben en la pantalla
                const itemsThatFit = Math.floor(containerWidth / (itemWidth + gap));
                this.itemsPerPage = Math.max(1, itemsThatFit);
                // El step es exactamente los items que caben en la pantalla
                this.step = this.itemsPerPage;
                console.log(`Carousel: itemsPerPage: ${this.itemsPerPage}, step: ${this.step} para width: ${containerWidth}`);
            } else {
                // Valores mínimos para que funcione inicialmente
                this.itemsPerPage = 1;
                this.step = 1;
            }
        };

        calculate();
        const resizeObserver = new ResizeObserver(() => {
            calculate();
        });
        resizeObserver.observe(this.wrapper);
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.calculateItemsPerPage());
        this.carouselPrev.addEventListener('click', (e) => {
            e.preventDefault();
            try { if (window.sliderIndependent && typeof window.sliderIndependent.pauseAutoPlay === 'function') window.sliderIndependent.pauseAutoPlay(); } catch (err) {}
            this.scrollToPrevPage();
        });
        this.carouselNext.addEventListener('click', (e) => {
            e.preventDefault();
            try { if (window.sliderIndependent && typeof window.sliderIndependent.pauseAutoPlay === 'function') window.sliderIndependent.pauseAutoPlay(); } catch (err) {}
            this.scrollToNextPage();
        });
        this.wrapper.addEventListener('scroll', () => this.handleScroll());
    }

    async loadMoviesData() {
        try {
            // Intentar usar datos compartidos primero
            let data;
            if (window.sharedData) {
                console.log("Carousel: Usando datos compartidos");
                data = window.sharedData;
            } else {
                console.log("Carousel: Haciendo fetch de datos...");
                const response = await fetch(DATA_URL);
                if (!response.ok) throw new Error('No se pudo cargar data.json');
                data = await response.json();
                // Guardar datos para compartir con otros componentes
                window.sharedData = data;
            }
            
            this.moviesData = data
                .filter(item => item && typeof item === 'object' && item['Categoría'] === 'Películas')
                .map((item, index) => ({
                    id: index.toString(),
                    title: item['Título'] || 'Sin título',
                    description: item['Synopsis'] || 'Descripción no disponible',
                    posterUrl: item['Portada'] || '',
                    postersUrl: item['Carteles'] || '', // Añadido campo postersUrl
                    backgroundUrl: item['Fondo'] || '',
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
                }));

            if (this.moviesData.length === 0) {
                this.moviesData = [
                    {
                        id: "12345",
                        title: "Ejemplo de película",
                        description: "Esta es una película de ejemplo que se muestra cuando no se pueden cargar los datos reales.",
                        posterUrl: "https://via.placeholder.com/194x271",
                        postersUrl: "https://via.placeholder.com/194x271",
                        backgroundUrl: "https://via.placeholder.com/194x271",
                        year: "2023",
                        duration: "120 min",
                        genre: "Acción",
                        rating: "8.5",
                        ageRating: "16",
                        link: "#",
                        trailerUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                        videoUrl: "https://ejemplo.com/video.mp4",
                        tmdbUrl: "https://www.themoviedb.org/movie/12345",
                        audiosCount: 1,
                        subtitlesCount: 1,
                        audioList: ["Español"],
                        subtitleList: ["Español"]
                    }
                ];
            }

            this.showCarousel();
            this.renderItems();
            
            // Notificar que los datos de películas están cargados
            if (window.notifyDataLoaded) {
                window.notifyDataLoaded();
            }
        } catch (error) {
            console.error('Error cargando datos:', error);
            this.moviesData = [
                {
                    id: "12345",
                    title: "Ejemplo de película",
                    description: "Esta es una película de ejemplo que se muestra cuando no se pueden cargar los datos reales.",
                    posterUrl: "https://via.placeholder.com/194x271",
                    postersUrl: "https://via.placeholder.com/194x271",
                    backgroundUrl: "https://via.placeholder.com/194x271",
                    year: "2023",
                    duration: "120 min",
                    genre: "Acción",
                    rating: "8.5",
                    ageRating: "16",
                    link: "#",
                    trailerUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                    videoUrl: "https://ejemplo.com/video.mp4",
                    tmdbUrl: "https://www.themoviedb.org/movie/12345",
                    audiosCount: 1,
                    subtitlesCount: 1,
                    audioList: ["Español"],
                    subtitleList: ["Español"]
                }
            ];
            this.showCarousel();
            this.renderItems();
        }
    }

    showCarousel() {
        this.skeleton.style.display = 'none';
        this.wrapper.style.display = 'flex';
        if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
            this.carouselNav.style.display = 'flex';
        }
    }

    async renderItems() {
        // Calcular cuántos items caben en la pantalla
        const containerWidth = this.wrapper.clientWidth;
        const itemWidth = 194;
        const gap = 4;
        const itemsThatFit = containerWidth > 0 ? Math.floor(containerWidth / (itemWidth + gap)) : 5;
        
        // Renderizar MÁS items de los que caben (para que haya scroll)
        const step = Math.max(itemsThatFit * 2, 10); // Renderizar el doble + mínimo 10
        
        // Si es la primera vez, limpiar el contenedor
        if (this.index === 0) {
            this.wrapper.innerHTML = '';
        }
        
        const end = Math.min(this.index + step, this.moviesData.length);
        
        for (let i = this.index; i < end; i++) {
            const item = this.moviesData[i];
            const div = document.createElement("div");
            div.className = "custom-carousel-item";
            div.dataset.itemId = i;

            const metaInfo = [];
            if (item.year) metaInfo.push(`<span>${item.year}</span>`);
            if (item.duration) metaInfo.push(`<span>${item.duration}</span>`);
            if (item.genre) metaInfo.push(`<span>${item.genre}</span>`);
            if (item.rating) metaInfo.push(`<div class="carousel-rating"><i class="fas fa-star"></i><span>${item.rating}</span></div>`);
            if (item.ageRating) metaInfo.push(`<span class="age-rating">${item.ageRating}</span>`);

            let posterUrl = item.posterUrl;
            if (!posterUrl) {
                posterUrl = 'https://via.placeholder.com/194x271';
            }

            div.innerHTML = `
                <div class="loader"><i class="fas fa-spinner"></i></div>
                <div class="poster-container">
                    <img class="poster-image" src="${posterUrl}" alt="${item.title}" width="194" height="271" onload="this.parentElement.previousElementSibling.style.display='none'; this.style.opacity='1'" style="opacity:0;transition:opacity 0.3s ease" loading="lazy">
                </div>
                <img class="detail-background" src="${item.backgroundUrl || posterUrl}" alt="${item.title} - Background" loading="lazy" style="display:none">
                            <div class="carousel-overlay">
                <div class="carousel-title-overlay">${item.title}</div>
                ${metaInfo.length ? `<div class="carousel-meta">${metaInfo.join('')}</div>` : ''}
                ${item.description ? `<div class="carousel-description">${item.description}</div>` : ''}
            </div>
            `;

            if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
                div.addEventListener('mouseenter', (e) => {
                    const itemId = div.dataset.itemId;
                    
                    if (this.hoverTimeouts[itemId]) {
                        clearTimeout(this.hoverTimeouts[itemId].details);
                        clearTimeout(this.hoverTimeouts[itemId].modal);
                    }
                    
                    const rect = div.getBoundingClientRect();
                    this.hoverModalOrigin = {
                        x: rect.left + rect.width / 2,
                        y: rect.top + rect.height / 2
                    };
                    
                    this.hoverTimeouts[itemId] = {
                        details: setTimeout(() => {
                            const background = div.querySelector('.detail-background');
                            const overlay = div.querySelector('.carousel-overlay');
                            background.style.display = 'block';
                            background.style.opacity = '1';
                            overlay.style.opacity = '1';
                            overlay.style.transform = 'translateY(0)';
                            
                            this.hoverTimeouts[itemId].modal = setTimeout(() => {
                                if (!window.isModalOpen && !window.isDetailsModalOpen) {
                                    window.hoverModalItem = div;
                                    if (window.hoverModal && div) {
                                        window.hoverModal.show(item, div);
                                    }
                                }
                            }, 200);
                        }, 900)
                    };
                });

                div.addEventListener('mouseleave', () => {
                    const itemId = div.dataset.itemId;
                    
                    if (this.hoverTimeouts[itemId]) {
                        clearTimeout(this.hoverTimeouts[itemId].details);
                        clearTimeout(this.hoverTimeouts[itemId].modal);
                        delete this.hoverTimeouts[itemId];
                    }
                    
                    const poster = div.querySelector('.poster-image');
                    const background = div.querySelector('.detail-background');
                    const overlay = div.querySelector('.carousel-overlay');
                    
                    poster.style.opacity = '1';
                    background.style.opacity = '0';
                    overlay.style.opacity = '0';
                    overlay.style.transform = 'translateY(20px)';
                    
                    setTimeout(() => {
                        background.style.display = 'none';
                    }, 300);
                });
            }

            div.addEventListener('click', (e) => {
                e.preventDefault();
                const itemId = div.dataset.itemId;
                if (this.hoverTimeouts[itemId]) {
                    clearTimeout(this.hoverTimeouts[itemId].details);
                    clearTimeout(this.hoverTimeouts[itemId].modal);
                }
                window.detailsModal.show(item, div);
            });

            this.wrapper.appendChild(div);
            console.log(`SeriesCarousel: Elemento ${i} añadido al DOM`);
        }

        this.index = end;
        this.updateProgressBar();
    }

    scrollToPrevPage() {
        this.scrollToPage('prev');
    }

    scrollToNextPage() {
        this.scrollToPage('next');
    }

    scrollToPage(direction) {
        if (!this.wrapper) return;
        // Calcular dinámicamente el tamaño del item y el gap para evitar errores en el primer clic
    const { stepSize, itemsPerViewport } = computeCarouselStep(this.wrapper);
    try { console.log(`[Carousel][${this.wrapper && this.wrapper.id ? this.wrapper.id : 'unknown'}] measured: stepSize=${stepSize}, itemsPerViewport=${itemsPerViewport}`); } catch (e) {}
        if (!stepSize || stepSize < 30) {
            this._scrollRetryCount = (this._scrollRetryCount || 0) + 1;
            if (this._scrollRetryCount <= 3) {
                setTimeout(() => this.scrollToPage(direction), 80);
                return;
            }
            this._scrollRetryCount = 0;
        }
        this._scrollRetryCount = 0;

        const containerWidth = this.wrapper.clientWidth;
        const actualScrollAmount = itemsPerViewport * stepSize;

        let currentScroll = this.wrapper.scrollLeft;
        let targetScroll;
        if (direction === 'prev') {
            targetScroll = Math.max(0, currentScroll - actualScrollAmount);
        } else {
            targetScroll = currentScroll + actualScrollAmount;
        }
        // Alinear el scroll para que el item de la izquierda quede completo
        const alignedScroll = Math.round(targetScroll / stepSize) * stepSize;
        // Evitar sobrepasar los límites
        const maxScroll = this.wrapper.scrollWidth - this.wrapper.clientWidth;
        const finalScroll = Math.max(0, Math.min(alignedScroll, maxScroll));
        this.wrapper.scrollTo({ left: finalScroll, behavior: 'smooth' });
    }

    // Método para contar elementos realmente visibles
    getVisibleItemsCount() {
        if (!this.wrapper) return 1;
        
        const items = this.wrapper.querySelectorAll('.custom-carousel-item');
        if (items.length === 0) return 1;
        
        const containerRect = this.wrapper.getBoundingClientRect();
        let visibleCount = 0;
        
        items.forEach(item => {
            const itemRect = item.getBoundingClientRect();
            // Un elemento es visible si está completamente dentro del contenedor
            if (itemRect.left >= containerRect.left && itemRect.right <= containerRect.right) {
                visibleCount++;
            }
        });
        
        console.log(`Carousel: Total items: ${items.length}, Completamente visibles: ${visibleCount}`);
        return Math.max(1, visibleCount);
    }

    updateProgressBar() {
        if (!this.progressBar) return;
        
        if (this.wrapper.scrollWidth > this.wrapper.clientWidth) {
            const scrollPercentage = (this.wrapper.scrollLeft / (this.wrapper.scrollWidth - this.wrapper.clientWidth)) * 100;
            this.progressBar.style.width = `${scrollPercentage}%`;
        } else {
            this.progressBar.style.width = '100%';
        }
    }

    handleScroll() {
        this.updateProgressBar();
        if (this.wrapper.scrollLeft + this.wrapper.clientWidth >= this.wrapper.scrollWidth - 200) {
            this.renderItems();
        }
    }

}

class SeriesCarousel {
    constructor() {
        console.log("SeriesCarousel: Constructor iniciado");
        this.wrapper = document.getElementById('series-carousel-wrapper');
        this.skeleton = document.getElementById('series-carousel-skeleton');
        this.progressBar = null; // Se configurará después de verificar que wrapper existe
        this.carouselNav = document.getElementById('series-carousel-nav');
        this.carouselPrev = document.getElementById('series-carousel-prev');
        this.carouselNext = document.getElementById('series-carousel-next');
        this.carouselContainer = document.querySelector('#series-carousel-wrapper').parentElement;
        this.itemsPerPage = 0; // Se calculará dinámicamente
        this.index = 0;
        this.step = 0; // Se calculará dinámicamente
        this.moreAppended = false;
        this.seriesData = [];
        this.hoverTimeouts = {};

        console.log("SeriesCarousel: Elementos encontrados:", {
            wrapper: !!this.wrapper,
            skeleton: !!this.skeleton,
            carouselNav: !!this.carouselNav,
            carouselPrev: !!this.carouselPrev,
            carouselNext: !!this.carouselNext,
            carouselContainer: !!this.carouselContainer
        });

        if (!this.wrapper || !this.skeleton || !this.carouselContainer) {
            console.error("Elementos del carrusel de series no encontrados", {
                wrapper: !!this.wrapper,
                skeleton: !!this.skeleton,
                carouselContainer: !!this.carouselContainer,
                progressBar: !!this.progressBar
            });
            return;
        }
        if (!this.carouselPrev || !this.carouselNext || !this.carouselNav) {
            console.error("Elementos de navegación del carrusel de series no encontrados");
            const observer = new MutationObserver(() => {
                this.carouselPrev = document.getElementById('series-carousel-prev');
                this.carouselNext = document.getElementById('series-carousel-next');
                this.carouselNav = document.getElementById('series-carousel-nav');
                if (this.carouselPrev && this.carouselNext && this.carouselNav) {
                    this.setupEventListeners();
                    observer.disconnect();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            return;
        }

        this.init();
    }

    init() {
        console.log("SeriesCarousel: Iniciando configuración...");
        
        // Configurar el progress bar ahora que sabemos que wrapper existe
        if (this.wrapper) {
            this.progressBar = this.wrapper.parentElement.querySelector('.carousel-progress-bar');
            console.log("SeriesCarousel: Progress bar configurado:", !!this.progressBar);
        }
        
        this.setupResizeObserver();
        this.setupEventListeners();
        try { setupCarouselMeasurementGuard(this.wrapper, this.carouselPrev, this.carouselNext); } catch (e) {}
        this.loadSeriesData();
    }

    setupResizeObserver() {
        if (!this.wrapper) {
            console.error('wrapper no definido en setupResizeObserver');
            // No establecer valores estáticos, se calcularán dinámicamente cuando sea necesario
            return;
        }

        const itemWidth = 194;
        const gap = 4;

        const calculate = () => {
            const containerWidth = this.wrapper.clientWidth;
            if (containerWidth > 0) {
                // Calcular cuántos items caben en la pantalla
                const itemsThatFit = Math.floor(containerWidth / (itemWidth + gap));
                this.itemsPerPage = Math.max(1, itemsThatFit);
                // El step es exactamente los items que caben en la pantalla
                this.step = this.itemsPerPage;
                console.log(`Carousel: itemsPerPage: ${this.itemsPerPage}, step: ${this.step} para width: ${containerWidth}`);
            } else {
                // Valores mínimos para que funcione inicialmente
                this.itemsPerPage = 1;
                this.step = 1;
            }
        };

        calculate();
        const resizeObserver = new ResizeObserver(() => {
            calculate();
        });
        resizeObserver.observe(this.wrapper);
    }

    setupEventListeners() {
        console.log("SeriesCarousel: Configurando event listeners...");
        console.log("SeriesCarousel: Elementos encontrados:", {
            carouselPrev: !!this.carouselPrev,
            carouselNext: !!this.carouselNext,
            wrapper: !!this.wrapper
        });
        
        window.addEventListener('resize', () => this.calculateItemsPerPage());
        
        if (this.carouselPrev) {
            this.carouselPrev.addEventListener('click', (e) => {
                e.preventDefault();
                console.log("SeriesCarousel: Botón anterior clickeado");
                try { if (window.sliderIndependent && typeof window.sliderIndependent.pauseAutoPlay === 'function') window.sliderIndependent.pauseAutoPlay(); } catch (err) {}
                this.scrollToPrevPage();
            });
        } else {
            console.error("SeriesCarousel: Botón anterior no encontrado");
        }
        
        if (this.carouselNext) {
            this.carouselNext.addEventListener('click', (e) => {
                e.preventDefault();
                console.log("SeriesCarousel: Botón siguiente clickeado");
                try { if (window.sliderIndependent && typeof window.sliderIndependent.pauseAutoPlay === 'function') window.sliderIndependent.pauseAutoPlay(); } catch (err) {}
                this.scrollToNextPage();
            });
        } else {
            console.error("SeriesCarousel: Botón siguiente no encontrado");
        }
        
        if (this.wrapper) {
            this.wrapper.addEventListener('scroll', () => this.handleScroll());
        } else {
            console.error("SeriesCarousel: Wrapper no encontrado para scroll");
        }
        
        console.log("SeriesCarousel: Event listeners configurados correctamente");
    }

    async loadSeriesData() {
        try {
            console.log("SeriesCarousel: Cargando datos...");
            
            // Intentar usar datos compartidos primero
            let data;
            if (window.sharedData) {
                console.log("SeriesCarousel: Usando datos compartidos");
                data = window.sharedData;
            } else {
                console.log("SeriesCarousel: Haciendo fetch de datos...");
                const response = await fetch(DATA_URL);
                if (!response.ok) throw new Error('No se pudo cargar data.json');
                data = await response.json();
                // Guardar datos para compartir con otros componentes
                window.sharedData = data;
            }
            
            console.log("SeriesCarousel: Procesando series...");
            
            // Optimización: Un solo filtro y mapeo
            this.seriesData = [];
            let seriesIndex = 0;
            
            for (const item of data) {
                if (item && typeof item === 'object' && 
                    item['Categoría'] === 'Series' && 
                    (!item['Título episodio'] || item['Título episodio'].trim() === '')) {
                    
                    this.seriesData.push({
                        id: `series_${seriesIndex}`,
                        title: item['Título'] || 'Sin título',
                        description: item['Synopsis'] || 'Descripción no disponible',
                        posterUrl: item['Portada'] || '',
                        postersUrl: item['Carteles'] || '',
                        backgroundUrl: item['Portada'] || '',
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
                    });
                    seriesIndex++;
                }
            }

            console.log(`SeriesCarousel: Se encontraron ${this.seriesData.length} series`);
            
            if (this.seriesData.length === 0) {
                this.seriesData = [
                    {
                        id: "series_12345",
                        title: "Ejemplo de serie",
                        description: "Esta es una serie de ejemplo que se muestra cuando no se pueden cargar los datos reales.",
                        posterUrl: "https://via.placeholder.com/194x271",
                        postersUrl: "https://via.placeholder.com/194x271",
                        backgroundUrl: "https://via.placeholder.com/194x271",
                        year: "2023",
                        duration: "45 min",
                        genre: "Drama",
                        rating: "8.5",
                        ageRating: "16",
                        link: "#",
                        trailerUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                        videoUrl: "https://ejemplo.com/video.mp4",
                        tmdbUrl: "https://www.themoviedb.org/tv/12345",
                        audiosCount: 1,
                        subtitlesCount: 1,
                        audioList: ["Español"],
                        subtitleList: ["Español"]
                    }
                ];
            }

            this.showCarousel();
            this.renderItems();
            
            // Notificar que los datos de series están cargados
            if (window.notifyDataLoaded) {
                window.notifyDataLoaded();
            }
        } catch (error) {
            console.error('Error cargando datos de series:', error);
            this.seriesData = [
                {
                    id: "series_12345",
                    title: "Ejemplo de serie",
                    description: "Esta es una serie de ejemplo que se muestra cuando no se pueden cargar los datos reales.",
                    posterUrl: "https://via.placeholder.com/194x271",
                    postersUrl: "https://via.placeholder.com/194x271",
                    backgroundUrl: "https://via.placeholder.com/194x271",
                    year: "2023",
                    duration: "45 min",
                    genre: "Drama",
                    rating: "8.5",
                    ageRating: "16",
                    link: "#",
                    trailerUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                    videoUrl: "https://ejemplo.com/video.mp4",
                    tmdbUrl: "https://www.themoviedb.org/tv/12345",
                    audiosCount: 1,
                    subtitlesCount: 1,
                    audioList: ["Español"],
                    subtitleList: ["Español"]
                }
            ];
            this.showCarousel();
            this.renderItems();
            
            // Notificar que los datos de series están cargados (fallback)
            if (window.notifyDataLoaded) {
                window.notifyDataLoaded();
            }
        }
    }

    showCarousel() {
        this.skeleton.style.display = 'none';
        this.wrapper.style.display = 'flex';
        if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
            this.carouselNav.style.display = 'flex';
        }
    }

    async renderItems() {
        console.log("SeriesCarousel: renderItems llamado");
        console.log("SeriesCarousel: seriesData.length:", this.seriesData.length);
        console.log("SeriesCarousel: index:", this.index);
        
        // Calcular cuántos items caben en la pantalla
        const containerWidth = this.wrapper.clientWidth;
        const itemWidth = 194;
        const gap = 4;
        const itemsThatFit = containerWidth > 0 ? Math.floor(containerWidth / (itemWidth + gap)) : 5;
        
        // Renderizar MÁS items de los que caben (para que haya scroll)
        const step = Math.max(itemsThatFit * 2, 10); // Renderizar el doble + mínimo 10
        console.log("SeriesCarousel: items que caben:", itemsThatFit, "step para renderizar:", step);
        
        // Si es la primera vez, limpiar el contenedor
        if (this.index === 0) {
            this.wrapper.innerHTML = '';
        }
        
        const end = Math.min(this.index + step, this.seriesData.length);
        console.log("SeriesCarousel: end:", end);
        
        for (let i = this.index; i < end; i++) {
            const item = this.seriesData[i];
            const div = document.createElement("div");
            div.className = "custom-carousel-item";
            div.dataset.itemId = item.id;

            const metaInfo = [];
            if (item.year) metaInfo.push(`<span>${item.year}</span>`);
            if (item.duration) metaInfo.push(`<span>${item.duration}</span>`);
            if (item.genre) metaInfo.push(`<span>${item.genre}</span>`);
            if (item.rating) metaInfo.push(`<div class="carousel-rating"><i class="fas fa-star"></i><span>${item.rating}</span></div>`);
            if (item.ageRating) metaInfo.push(`<span class="age-rating">${item.ageRating}</span>`);

            let posterUrl = item.posterUrl;
            if (!posterUrl) {
                posterUrl = 'https://via.placeholder.com/194x271';
            }

            div.innerHTML = `
                <div class="loader"><i class="fas fa-spinner"></i></div>
                <div class="poster-container">
                    <img class="poster-image" src="${posterUrl}" alt="${item.title}" width="194" height="271" onload="this.parentElement.previousElementSibling.style.display='none'; this.style.opacity='1'" style="opacity:0;transition:opacity 0.3s ease" loading="lazy">
                </div>
                <img class="detail-background" src="${item.backgroundUrl || posterUrl}" alt="${item.title} - Background" loading="lazy" style="display:none">
                            <div class="carousel-overlay">
                <div class="carousel-title">${item.title}</div>
                ${metaInfo.length ? `<div class="carousel-meta">${metaInfo.join('')}</div>` : ''}
                ${item.description ? `<div class="carousel-description">${item.description}</div>` : ''}
            </div>
            `;

            if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
                div.addEventListener('mouseenter', (e) => {
                    const itemId = div.dataset.itemId;
                    
                    if (this.hoverTimeouts[itemId]) {
                        clearTimeout(this.hoverTimeouts[itemId].details);
                        clearTimeout(this.hoverTimeouts[itemId].modal);
                    }
                    
                    const rect = div.getBoundingClientRect();
                    this.hoverModalOrigin = {
                        x: rect.left + rect.width / 2,
                        y: rect.top + rect.height / 2
                    };
                    
                    this.hoverTimeouts[itemId] = {
                        details: setTimeout(() => {
                            const background = div.querySelector('.detail-background');
                            const overlay = div.querySelector('.carousel-overlay');
                            background.style.display = 'block';
                            background.style.opacity = '1';
                            overlay.style.opacity = '1';
                            overlay.style.transform = 'translateY(0)';
                            
                            this.hoverTimeouts[itemId].modal = setTimeout(() => {
                                if (!window.isModalOpen && !window.isDetailsModalOpen) {
                                    window.hoverModalItem = div;
                                    if (window.hoverModal && div) {
                                        window.hoverModal.show(item, div);
                                    }
                                }
                            }, 200);
                        }, 900)
                    };
                });

                div.addEventListener('mouseleave', () => {
                    const itemId = div.dataset.itemId;
                    
                    if (this.hoverTimeouts[itemId]) {
                        clearTimeout(this.hoverTimeouts[itemId].details);
                        clearTimeout(this.hoverTimeouts[itemId].modal);
                        delete this.hoverTimeouts[itemId];
                    }
                    
                    const poster = div.querySelector('.poster-image');
                    const background = div.querySelector('.detail-background');
                    const overlay = div.querySelector('.carousel-overlay');
                    
                    poster.style.opacity = '1';
                    background.style.opacity = '0';
                    overlay.style.opacity = '0';
                    overlay.style.transform = 'translateY(20px)';
                    
                    setTimeout(() => {
                        background.style.display = 'none';
                    }, 300);
                });
            }

            div.addEventListener('click', (e) => {
                e.preventDefault();
                const itemId = div.dataset.itemId;
                if (this.hoverTimeouts[itemId]) {
                    clearTimeout(this.hoverTimeouts[itemId].details);
                    clearTimeout(this.hoverTimeouts[itemId].modal);
                }
                window.detailsModal.show(item, div);
            });

            this.wrapper.appendChild(div);
            console.log(`SeriesCarousel: Elemento ${i} añadido al DOM`);
        }

        this.index = end;
        this.updateProgressBar();
    }

    scrollToPrevPage() {
        this.scrollToPage('prev');
    }

    scrollToNextPage() {
        this.scrollToPage('next');
    }

    scrollToPage(direction) {
        if (!this.wrapper) return;
        // Usar medición dinámica para evitar errores de ancho en el primer clic
    const { stepSize, itemsPerViewport } = computeCarouselStep(this.wrapper);
    try { console.log(`[Carousel][${this.wrapper && this.wrapper.id ? this.wrapper.id : 'unknown'}] measured: stepSize=${stepSize}, itemsPerViewport=${itemsPerViewport}`); } catch (e) {}
        if (!stepSize) return;

        const containerWidth = this.wrapper.clientWidth;
        const currentScroll = this.wrapper.scrollLeft;
        const maxScroll = this.wrapper.scrollWidth - this.wrapper.clientWidth;

        if (direction === 'prev') {
            const actualScrollAmount = itemsPerViewport * stepSize;
            const targetScroll = Math.max(0, currentScroll - actualScrollAmount);
            const alignedScroll = Math.round(targetScroll / stepSize) * stepSize;
            this.wrapper.scrollTo({ left: Math.max(0, Math.min(alignedScroll, maxScroll)), behavior: 'smooth' });
        } else {
            const actualScrollAmount = itemsPerViewport * stepSize;
            let targetScroll = currentScroll + actualScrollAmount;
            // Si estamos en el inicio, asegurar que el primer movimiento sea exactamente itemsPerViewport
            if (currentScroll === 0) {
                targetScroll = itemsPerViewport * stepSize;
            }
            const alignedScroll = Math.round(targetScroll / stepSize) * stepSize;
            this.wrapper.scrollTo({ left: Math.max(0, Math.min(alignedScroll, maxScroll)), behavior: 'smooth' });
        }
    }

    // Método para contar elementos realmente visibles
    getVisibleItemsCount() {
        if (!this.wrapper) return 1;
        
        const items = this.wrapper.querySelectorAll('.custom-carousel-item');
        if (items.length === 0) return 1;
        
        const containerRect = this.wrapper.getBoundingClientRect();
        let visibleCount = 0;
        
        items.forEach(item => {
            const itemRect = item.getBoundingClientRect();
            // Un elemento es visible si está completamente dentro del contenedor
            if (itemRect.left >= containerRect.left && itemRect.right <= containerRect.right) {
                visibleCount++;
            }
        });
        
        console.log(`Carousel: Total items: ${items.length}, Completamente visibles: ${visibleCount}`);
        return Math.max(1, visibleCount);
    }

    updateProgressBar() {
        if (!this.progressBar) return;
        
        if (this.wrapper.scrollWidth > this.wrapper.clientWidth) {
            const scrollPercentage = (this.wrapper.scrollLeft / (this.wrapper.scrollWidth - this.wrapper.clientWidth)) * 100;
            this.progressBar.style.width = `${scrollPercentage}%`;
        } else {
            this.progressBar.style.width = '100%';
        }
    }

    handleScroll() {
        this.updateProgressBar();
        if (this.wrapper.scrollLeft + this.wrapper.clientWidth >= this.wrapper.scrollWidth - 200) {
            this.renderItems();
        }
    }

}

class DocumentalesCarousel {
    constructor() {
        console.log("DocumentalesCarousel: Constructor iniciado");
        this.wrapper = document.getElementById('documentales-carousel-wrapper');
        this.skeleton = document.getElementById('documentales-carousel-skeleton');
        this.progressBar = null;
        this.carouselNav = document.getElementById('documentales-carousel-nav');
        this.carouselPrev = document.getElementById('documentales-carousel-prev');
        this.carouselNext = document.getElementById('documentales-carousel-next');
        this.carouselContainer = document.querySelector('#documentales-carousel-wrapper').parentElement;
        this.itemsPerPage = 0;
        this.index = 0;
        this.step = 0;
        this.moreAppended = false;
        this.docuData = [];
        this.hoverTimeouts = {};

        if (!this.wrapper || !this.skeleton || !this.carouselContainer) {
            console.error("Elementos del carrusel de documentales no encontrados");
            return;
        }
        if (!this.carouselPrev || !this.carouselNext || !this.carouselNav) {
            const observer = new MutationObserver(() => {
                this.carouselPrev = document.getElementById('documentales-carousel-prev');
                this.carouselNext = document.getElementById('documentales-carousel-next');
                this.carouselNav = document.getElementById('documentales-carousel-nav');
                if (this.carouselPrev && this.carouselNext && this.carouselNav) {
                    this.setupEventListeners();
                    observer.disconnect();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            return;
        }
        this.init();
    }
    init() {
        if (this.wrapper) {
            this.progressBar = this.wrapper.parentElement.querySelector('.carousel-progress-bar');
        }
        this.setupResizeObserver();
        this.setupEventListeners();
        try { setupCarouselMeasurementGuard(this.wrapper, this.carouselPrev, this.carouselNext); } catch (e) {}
        this.loadDocuData();
    }

    updateProgressBar() {
        if (!this.progressBar || !this.wrapper) return;
        try {
            if (this.wrapper.scrollWidth > this.wrapper.clientWidth) {
                const scrollPercentage = (this.wrapper.scrollLeft / (this.wrapper.scrollWidth - this.wrapper.clientWidth)) * 100;
                this.progressBar.style.width = `${scrollPercentage}%`;
            } else {
                this.progressBar.style.width = '100%';
            }
        } catch (e) {}
    }

    handleScroll() {
        // Called on wrapper scroll
        this.updateProgressBar();
        try {
            if (this.wrapper.scrollLeft + this.wrapper.clientWidth >= this.wrapper.scrollWidth - 200) {
                this.renderItems();
            }
        } catch (e) {}
    }
    setupResizeObserver() {
        if (!this.wrapper) return;
        const itemWidth = 194;
        const gap = 4;
        const calculate = () => {
            const containerWidth = this.wrapper.clientWidth;
            if (containerWidth > 0) {
                const itemsThatFit = Math.floor(containerWidth / (itemWidth + gap));
                this.itemsPerPage = Math.max(1, itemsThatFit);
                this.step = this.itemsPerPage;
            } else {
                this.itemsPerPage = 1;
                this.step = 1;
            }
        };
        calculate();
        const resizeObserver = new ResizeObserver(() => { calculate(); });
        resizeObserver.observe(this.wrapper);
    }
    setupEventListeners() {
        window.addEventListener('resize', () => this.calculateItemsPerPage && this.calculateItemsPerPage());
        if (this.carouselPrev) {
            this.carouselPrev.addEventListener('click', (e) => {
                e.preventDefault();
                this.scrollToPrevPage();
            });
        }
        if (this.carouselNext) {
            this.carouselNext.addEventListener('click', (e) => {
                e.preventDefault();
                this.scrollToNextPage();
            });
        }
        if (this.wrapper) {
            this.wrapper.addEventListener('scroll', () => this.handleScroll && this.handleScroll());
        }
    }
    async loadDocuData() {
        try {
            let data;
            if (window.sharedData) {
                data = window.sharedData;
            } else {
                const response = await fetch(DATA_URL);
                if (!response.ok) throw new Error('No se pudo cargar data.json');
                data = await response.json();
                window.sharedData = data;
            }
            this.docuData = [];
            let docuIndex = 0;
            for (const item of data) {
                if (item && typeof item === 'object' && item['Categoría'] === 'Documentales') {
                    // Excluir filas que correspondan a episodios: si tienen título de episodio u otros campos de episodio
                    try {
                        const episodeKeys = ['Título episodio', 'Título episodio completo', 'Título episodio 1', 'Episodio', 'Título episodio (completo)'];
                        const hasEpisodeTitle = episodeKeys.some(k => item[k] && String(item[k]).trim() !== '');
                        if (hasEpisodeTitle) {
                            // Saltar esta entrada: es un episodio, no un documental independiente
                            continue;
                        }
                    } catch (e) {
                        // si algo falla, no bloqueramos la carga
                    }
                    this.docuData.push({
                        id: `docu_${docuIndex}`,
                        title: item['Título'] || 'Sin título',
                        description: item['Synopsis'] || 'Descripción no disponible',
                        posterUrl: item['Portada'] || '',
                        postersUrl: item['Carteles'] || '',
                        backgroundUrl: item['Portada'] || '',
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
                    });
                    docuIndex++;
                }
            }
            if (this.docuData.length === 0) {
                this.docuData = [
                    {
                        id: "docu_12345",
                        title: "Ejemplo de documental",
                        description: "Este es un documental de ejemplo que se muestra cuando no se pueden cargar los datos reales.",
                        posterUrl: "https://via.placeholder.com/194x271",
                        postersUrl: "https://via.placeholder.com/194x271",
                        backgroundUrl: "https://via.placeholder.com/194x271",
                        year: "2023",
                        duration: "90 min",
                        genre: "Historia",
                        rating: "8.5",
                        ageRating: "TP",
                        link: "#",
                        trailerUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                        videoUrl: "https://ejemplo.com/video.mp4",
                        tmdbUrl: "https://www.themoviedb.org/movie/12345",
                        audiosCount: 1,
                        subtitlesCount: 1,
                        audioList: ["Español"],
                        subtitleList: ["Español"]
                    }
                ];
            }
            this.showCarousel();
            this.renderItems();
        } catch (error) {
            this.docuData = [
                {
                    id: "docu_12345",
                    title: "Ejemplo de documental",
                    description: "Este es un documental de ejemplo que se muestra cuando no se pueden cargar los datos reales.",
                    posterUrl: "https://via.placeholder.com/194x271",
                    postersUrl: "https://via.placeholder.com/194x271",
                    backgroundUrl: "https://via.placeholder.com/194x271",
                    year: "2023",
                    duration: "90 min",
                    genre: "Historia",
                    rating: "8.5",
                    ageRating: "TP",
                    link: "#",
                    trailerUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                    videoUrl: "https://ejemplo.com/video.mp4",
                    tmdbUrl: "https://www.themoviedb.org/movie/12345",
                    audiosCount: 1,
                    subtitlesCount: 1,
                    audioList: ["Español"],
                    subtitleList: ["Español"]
                }
            ];
            this.showCarousel();
            this.renderItems();
        }
    }
    showCarousel() {
        this.skeleton.style.display = 'none';
        this.wrapper.style.display = 'flex';
        if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
            this.carouselNav.style.display = 'flex';
        }
    }

    async renderItems() {
        const containerWidth = this.wrapper.clientWidth;
        const itemWidth = 194;
        const gap = 4;
        const itemsThatFit = containerWidth > 0 ? Math.floor(containerWidth / (itemWidth + gap)) : 5;
        const step = Math.max(itemsThatFit * 2, 10);
        if (this.index === 0) {
            this.wrapper.innerHTML = '';
        }
        const end = Math.min(this.index + step, this.docuData.length);
        for (let i = this.index; i < end; i++) {
            const item = this.docuData[i];
            const div = document.createElement("div");
            div.className = "custom-carousel-item";
            div.dataset.itemId = i;
            const metaInfo = [];
            if (item.year) metaInfo.push(`<span>${item.year}</span>`);
            if (item.duration) metaInfo.push(`<span>${item.duration}</span>`);
            if (item.genre) metaInfo.push(`<span>${item.genre}</span>`);
            if (item.rating) metaInfo.push(`<div class=\"carousel-rating\"><i class=\"fas fa-star\"></i><span>${item.rating}</span></div>`);
            if (item.ageRating) metaInfo.push(`<span class=\"age-rating\">${item.ageRating}</span>`);
            let posterUrl = item.posterUrl;
            if (!posterUrl) posterUrl = 'https://via.placeholder.com/194x271';
            div.innerHTML = `
                <div class="loader"><i class="fas fa-spinner"></i></div>
                <div class="poster-container">
                    <img class="poster-image" src="${posterUrl}" alt="${item.title}" width="194" height="271" onload="this.parentElement.previousElementSibling.style.display='none'; this.style.opacity='1'" style="opacity:0;transition:opacity 0.3s ease" loading="lazy">
                </div>
                <img class="detail-background" src="${item.backgroundUrl || posterUrl}" alt="${item.title} - Background" loading="lazy" style="display:none">
                <div class="carousel-overlay">
                    <div class="carousel-title-overlay">${item.title}</div>
                    ${metaInfo.length ? `<div class="carousel-meta">${metaInfo.join('')}</div>` : ''}
                    ${item.description ? `<div class="carousel-description">${item.description}</div>` : ''}
                </div>
            `;
            if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
                div.addEventListener('mouseenter', (e) => {
                    const itemId = div.dataset.itemId;
                    if (this.hoverTimeouts[itemId]) {
                        clearTimeout(this.hoverTimeouts[itemId].details);
                        clearTimeout(this.hoverTimeouts[itemId].modal);
                    }
                    const rect = div.getBoundingClientRect();
                    this.hoverModalOrigin = {
                        x: rect.left + rect.width / 2,
                        y: rect.top + rect.height / 2
                    };
                    this.hoverTimeouts[itemId] = {
                        details: setTimeout(() => {
                            const background = div.querySelector('.detail-background');
                            const overlay = div.querySelector('.carousel-overlay');
                            background.style.display = 'block';
                            background.style.opacity = '1';
                            overlay.style.opacity = '1';
                            overlay.style.transform = 'translateY(0)';
                            this.hoverTimeouts[itemId].modal = setTimeout(() => {
                                if (!window.isModalOpen && !window.isDetailsModalOpen) {
                                    window.hoverModalItem = div;
                                    if (window.hoverModal && div) {
                                        window.hoverModal.show(item, div);
                                    }
                                }
                            }, 200);
                        }, 900)
                    };
                });
                div.addEventListener('mouseleave', () => {
                    const itemId = div.dataset.itemId;
                    if (this.hoverTimeouts[itemId]) {
                        clearTimeout(this.hoverTimeouts[itemId].details);
                        clearTimeout(this.hoverTimeouts[itemId].modal);
                        delete this.hoverTimeouts[itemId];
                    }
                    const poster = div.querySelector('.poster-image');
                    const background = div.querySelector('.detail-background');
                    const overlay = div.querySelector('.carousel-overlay');
                    poster.style.opacity = '1';
                    background.style.opacity = '0';
                    overlay.style.opacity = '0';
                    overlay.style.transform = 'translateY(20px)';
                    setTimeout(() => {
                        background.style.display = 'none';
                    }, 300);
                });
            }
            div.addEventListener('click', (e) => {
                e.preventDefault();
                const itemId = div.dataset.itemId;
                if (this.hoverTimeouts[itemId]) {
                    clearTimeout(this.hoverTimeouts[itemId].details);
                    clearTimeout(this.hoverTimeouts[itemId].modal);
                }
                window.detailsModal.show(item, div);
            });
            this.wrapper.appendChild(div);
        }
        this.index = end;
        // Si hay barra de progreso, actualizarla
        if (this.progressBar) {
            if (this.wrapper.scrollWidth > this.wrapper.clientWidth) {
                const scrollPercentage = (this.wrapper.scrollLeft / (this.wrapper.scrollWidth - this.wrapper.clientWidth)) * 100;
                this.progressBar.style.width = `${scrollPercentage}%`;
            } else {
                this.progressBar.style.width = '100%';
            }
        }
    }

    scrollToPrevPage() {
        if (!this.wrapper) return;
        const scrollAmount = this.wrapper.clientWidth;
        this.wrapper.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
    scrollToNextPage() {
        if (!this.wrapper) return;
        const scrollAmount = this.wrapper.clientWidth;
        this.wrapper.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
}

// Inicialización de ambos carruseles
window.addEventListener('DOMContentLoaded', () => {
    if (!window.seriesCarousel) {
        window.seriesCarousel = new SeriesCarousel();
    } else {
        console.log('Carousel.js: seriesCarousel ya existe — no se crea otra instancia');
    }
    window.documentalesCarousel = new DocumentalesCarousel();
    window.animesCarousel = new AnimesCarousel();
});