// Quick runtime sanity log to help debug: indica si el archivo JS se cargó
try { console.log('carousel.js cargado — inicio de ejecución'); } catch (e) {}

// Utility: ensure there is an inner scrollable track when the outer wrapper uses overflow: visible
// This allows items to visually overflow (por ejemplo al hacer zoom) mientras que el scroll horizontal
// sigue funcionando correctamente dentro de `.carousel-track`.
function ensureCarouselTrack(wrapper) {
    if (!wrapper) return null;
    // If a track already exists, return it
    const existing = wrapper.querySelector('.carousel-track');
    if (existing) return existing;
    // Mark wrapper so CSS can relax overflow on inner items when needed (do this always)
    try { wrapper.classList.add('carousel-allow-overflow'); } catch (e) {}

    // If the wrapper is scrollable already, just return the wrapper
    try {
        const style = window.getComputedStyle(wrapper);
        if (style.overflowX !== 'visible' && style.overflowX !== 'hidden') {
            return wrapper;
        }
    } catch (e) {
        // ignore and create track
    }

    // Create track and move children into it
    const track = document.createElement('div');
    track.className = 'carousel-track';
    // Move children into track
    while (wrapper.firstChild) track.appendChild(wrapper.firstChild);
    wrapper.appendChild(track);

    // Also scan ancestors and mark those with restrictive overflow so CSS can relax them.
    try {
        let node = wrapper.parentElement;
        while (node && node !== document.body) {
            const cs = window.getComputedStyle(node);
            const overflowValues = [cs.overflow, cs.overflowX, cs.overflowY].filter(Boolean);
            const hasHidden = overflowValues.some(v => v === 'hidden' || v === 'clip');
            if (hasHidden) {
                try { node.classList.add('carousel-allow-overflow-ancestor'); } catch (e) {}
                // stop at first restrictive ancestor to avoid altering layout too widely
                break;
            }
            node = node.parentElement;
        }
    } catch (e) { }

    // Inline minimal styles to ensure horizontal scrolling works even if outer wrapper is overflow: visible
    track.style.display = 'flex';
    track.style.gap = getComputedStyle(wrapper).getPropertyValue('--carousel-gap') || '8px';
    track.style.overflowX = 'auto';
    track.style.overflowY = 'visible';
    track.style.scrollBehavior = 'smooth';
    track.style.webkitOverflowScrolling = 'touch';

    return track;
}

// Temporarily relax clipping on ancestors while an item is hovered (to allow visual overflow)
function _allowOverflowForItem(item) {
    try {
        if (!item) return;
        const wrapper = item.closest('[id$="-carousel-wrapper"], .carousel-wrapper');
        if (!wrapper) return;
        // If already adjusted, skip
        if (wrapper._adjustedAncestors) return;
        const adjusted = [];
        let node = wrapper.parentElement;
        while (node && node !== document.body) {
            const cs = window.getComputedStyle(node);
            // If any overflow axis is restrictive, relax it
            if (cs.overflow === 'hidden' || cs.overflowX === 'hidden' || cs.overflowY === 'hidden' || cs.overflow === 'clip' || cs.overflowX === 'clip' || cs.overflowY === 'clip') {
                // Save original inline styles so we can restore later
                node.dataset._origOverflow = `${node.style.overflow||''}||${node.style.overflowX||''}||${node.style.overflowY||''}`;
                node.style.overflow = 'visible';
                node.style.overflowX = 'visible';
                node.style.overflowY = 'visible';
                adjusted.push(node);
                // Stop at the first restrictive ancestor to limit layout changes
                break;
            }
            node = node.parentElement;
        }
        if (adjusted.length) wrapper._adjustedAncestors = adjusted;
    } catch (e) { /* silent */ }
}

function _revertOverflowForItem(item) {
    try {
        if (!item) return;
        const wrapper = item.closest('[id$="-carousel-wrapper"], .carousel-wrapper');
        if (!wrapper) return;
        const adjusted = wrapper._adjustedAncestors;
        if (!adjusted || !adjusted.length) return;
        adjusted.forEach(node => {
            const orig = node.dataset._origOverflow || '';
            const parts = orig.split('||');
            node.style.overflow = parts[0] || '';
            node.style.overflowX = parts[1] || '';
            node.style.overflowY = parts[2] || '';
            delete node.dataset._origOverflow;
        });
        wrapper._adjustedAncestors = null;
    } catch (e) { /* silent */ }
}
// Portal-based hover: move detail-background to document.body so it can escape clipping.
function _createPortalForItem(item) {
    try {
        if (!item) return;
        if (item._portalElement) return;
        const bg = item.querySelector('.detail-background');
        if (!bg) return;
        const rect = bg.getBoundingClientRect();
        const portal = bg.cloneNode(true);
        portal.classList.add('carousel-portal-detail');
        portal.style.position = 'fixed';
        portal.style.left = `${rect.left}px`;
        portal.style.top = `${rect.top}px`;
        portal.style.width = `${rect.width}px`;
        portal.style.height = `${rect.height}px`;
    // Use a very large z-index to try to escape any stacking contexts
    portal.style.zIndex = '2147483647';
        portal.style.display = 'block';
        portal.style.pointerEvents = 'none';
        portal.style.opacity = '1';
        portal.style.transition = 'none';
        portal.style.transform = 'translateZ(0)';
        // Ensure cloned background is visible (some styles may hide it by default)
        try {
            portal.style.display = 'block';
            portal.style.opacity = '1';
            const imgs = portal.querySelectorAll('img');
            imgs.forEach(i => { i.style.opacity = '1'; i.style.display = 'block'; });
        } catch (e) {}
        document.body.appendChild(portal);
        // hide original so we don't see duplicate
        bg.style.display = 'none';
        item._portalElement = portal;

        // updater to reposition portal on scroll/resize/pointermove using rAF for smoothness
        let rafId = null;
        const doUpdate = () => {
            try {
                const rect = item.getBoundingClientRect();
                // If detail-background inside item has different rect, prefer it
                const innerBg = item.querySelector('.detail-background');
                const r = (innerBg && innerBg.getBoundingClientRect && innerBg.getBoundingClientRect().width>0) ? innerBg.getBoundingClientRect() : rect;
                portal.style.left = `${Math.round(r.left)}px`;
                portal.style.top = `${Math.round(r.top)}px`;
                portal.style.width = `${Math.round(r.width)}px`;
                portal.style.height = `${Math.round(r.height)}px`;
            } catch (e) {}
            rafId = null;
        };
        const scheduleUpdate = () => { if (rafId==null) rafId = requestAnimationFrame(doUpdate); };
        const onScroll = scheduleUpdate;
        const onResize = scheduleUpdate;
        const onPointer = scheduleUpdate;
        item._portalUpdater = { onScroll, onResize, onPointer, rafCancel: () => { if (rafId) cancelAnimationFrame(rafId); rafId = null; } };
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', onResize);
        window.addEventListener('pointermove', onPointer, true);
    } catch (e) { /* silent */ }
}

function _removePortalForItem(item) {
    try {
        if (!item) return;
        const portal = item._portalElement;
        if (portal && portal.parentElement) portal.parentElement.removeChild(portal);
        const bg = item.querySelector('.detail-background');
        if (bg) bg.style.display = '';
        // remove listeners and cancel rAF
        try {
            if (item._portalUpdater) {
                try { window.removeEventListener('scroll', item._portalUpdater.onScroll, true); } catch (e) {}
                try { window.removeEventListener('resize', item._portalUpdater.onResize); } catch (e) {}
                try { window.removeEventListener('pointermove', item._portalUpdater.onPointer, true); } catch (e) {}
                try { item._portalUpdater.rafCancel(); } catch (e) {}
                item._portalUpdater = null;
            }
        } catch (e) {}
        item._portalElement = null;
    } catch (e) { /* silent */ }
}

// Attach global pointerenter/pointerleave handlers to use portal approach during hover.
document.addEventListener('pointerenter', function(e){
    try {
        const item = e.target.closest && e.target.closest('.custom-carousel-item');
        if (item) {
            _createPortalForItem(item);
            // keep the old fallback to relax ancestors in case cloning isn't enough
            _allowOverflowForItem(item);
        }
    } catch (e) {}
}, true);
document.addEventListener('pointerleave', function(e){
    try {
        const item = e.target.closest && e.target.closest('.custom-carousel-item');
        if (item) {
            _removePortalForItem(item);
            _revertOverflowForItem(item);
        }
    } catch (e) {}
}, true);

// Add minimal CSS for .carousel-track once
(function addCarouselTrackStyles(){
    if (document.getElementById('carousel-track-styles')) return;
    const s = document.createElement('style');
    s.id = 'carousel-track-styles';
    s.textContent = `
        .carousel-track{display:flex;gap:var(--carousel-gap,8px);overflow-x:auto;overflow-y:visible;scroll-behavior:smooth;-webkit-overflow-scrolling:touch}
        .carousel-track::-webkit-scrollbar{height:8px}
    `;
    document.head.appendChild(s);
})();

// Carrusel de Episodios Series (solo episodios con Título episodio completo)
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
        if (this.wrapper) {
            const _t = ensureCarouselTrack(this.wrapper) || this.wrapper;
            if (_t !== this.wrapper) { this._originalWrapper = this.wrapper; this.wrapper = _t; }
        }
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
        this.loadEpisodiosData();
    }
    setupResizeObserver() {
        if (!this.wrapper) return;
        const itemWidth = 246; // 16:9
        const gap = 4;
        const calculate = () => {
            const scrollEl = this._originalWrapper || this.wrapper;
            const containerWidth = (scrollEl && scrollEl.clientWidth) || 0;
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
                            try { if (typeof _createPortalForItem === 'function') _createPortalForItem(div); } catch (e) {}
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
                    try { if (typeof _removePortalForItem === 'function') _removePortalForItem(div); } catch (e) {}
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
            // Ensure scrollable track exists when outer wrapper uses overflow: visible
            (function(){
                const _target = ensureCarouselTrack(this.wrapper) || this.wrapper;
                if (_target !== this.wrapper) {
                    this.wrapper = _target;
                    if (!this._carouselTrackListenerAttached) {
                        this.wrapper.addEventListener('scroll', () => { if (this.updateProgressBar) this.updateProgressBar(); });
                        this._carouselTrackListenerAttached = true;
                    }
                }
            }).call(this);
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
        const scrollEl = this._originalWrapper || this.wrapper;
        try {
            if (scrollEl.scrollWidth > scrollEl.clientWidth) {
                const scrollPercentage = (scrollEl.scrollLeft / (scrollEl.scrollWidth - scrollEl.clientWidth)) * 100;
                this.progressBar.style.width = `${scrollPercentage}%`;
            } else {
                this.progressBar.style.width = '100%';
            }
        } catch (e) { this.progressBar.style.width = '100%'; }
    }

    scrollToPrevPage() {
        this.scrollToPage('prev');
    }
    scrollToNextPage() {
        this.scrollToPage('next');
    }
    scrollToPage(direction) {
        if (!this.wrapper) return;
    const scrollEl = this._originalWrapper || this.wrapper;
    const containerWidth = (scrollEl && (scrollEl.clientWidth || (scrollEl.parentElement && scrollEl.parentElement.clientWidth))) || 0;

        // Determinar tamaño del ítem de manera robusta: preferimos offsetWidth
        const firstItem = this.wrapper.querySelector('.custom-carousel-item');
        if (!firstItem) return;
        let itemWidth = Math.round(firstItem.offsetWidth || 0);

        // Si el itemWidth es demasiado pequeño (imagenes no cargadas), intentar rect.width como fallback
        if (!itemWidth || itemWidth < 30) {
            try {
                const rect = firstItem.getBoundingClientRect();
                itemWidth = Math.max(itemWidth, Math.round(rect.width) || 0);
            } catch (e) { }
        }

        // Calcular gap consultando posiciones de offset para evitar problemas de sub-pixel
        let gap = 0;
        const secondItem = firstItem.nextElementSibling;
        if (secondItem) {
            try {
                gap = Math.round(secondItem.offsetLeft - (firstItem.offsetLeft + firstItem.offsetWidth));
                if (isNaN(gap) || gap < 0) gap = 0;
            } catch (e) { gap = 0; }
        }

        // Si aún no tenemos un ancho razonable, usar un valor por defecto para evitar división por cero
        if (!itemWidth) itemWidth = 240;

        const stepSize = itemWidth + gap;
        const itemsPerViewport = Math.max(1, Math.floor(containerWidth / stepSize) || 1);

    // Calcular índice del primer item visible actualmente (alinear a la izquierda)
    const currentIndex = Math.floor((((this._originalWrapper || this.wrapper) && (this._originalWrapper || this.wrapper).scrollLeft) || 0) / stepSize);

        let targetIndex;
        if (direction === 'prev') {
            targetIndex = Math.max(0, currentIndex - itemsPerViewport);
        } else {
            targetIndex = currentIndex + itemsPerViewport;
        }

        // Evitar sobrepasar la cantidad de items
        const totalItems = this.wrapper.querySelectorAll('.custom-carousel-item').length;
        const maxFirstIndex = Math.max(0, totalItems - itemsPerViewport);
        targetIndex = Math.max(0, Math.min(targetIndex, maxFirstIndex));

        const finalScroll = targetIndex * stepSize;
        try { if (scrollEl && typeof scrollEl.scrollTo === 'function') scrollEl.scrollTo({ left: finalScroll, behavior: 'smooth' }); else if (scrollEl) scrollEl.scrollLeft = finalScroll; } catch (e) { if (scrollEl) scrollEl.scrollLeft = finalScroll; }
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
        if (this.wrapper) {
            const _t = ensureCarouselTrack(this.wrapper) || this.wrapper;
            if (_t !== this.wrapper) { this._originalWrapper = this.wrapper; this.wrapper = _t; }
        }
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
        this.loadEpisodiosData();
    }
    setupResizeObserver() {
        if (!this.wrapper) return;
        const itemWidth = 246;
        const gap = 4;
        const calculate = () => {
            const scrollEl = this._originalWrapper || this.wrapper;
            const containerWidth = (scrollEl && scrollEl.clientWidth) || 0;
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
        if (this.carouselPrev) this.carouselPrev.addEventListener('click', (e) => { e.preventDefault(); this.scrollToPrevPage(); });
        if (this.carouselNext) this.carouselNext.addEventListener('click', (e) => { e.preventDefault(); this.scrollToNextPage(); });
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
                        try { if (typeof _createPortalForItem === 'function') _createPortalForItem(div); } catch (e) {}
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
                    try { if (typeof _removePortalForItem === 'function') _removePortalForItem(div); } catch (e) {}
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
            (function(){
                const _target = ensureCarouselTrack(this.wrapper) || this.wrapper;
                if (_target !== this.wrapper) {
                    this.wrapper = _target;
                    if (!this._carouselTrackListenerAttached) {
                        this.wrapper.addEventListener('scroll', () => { if (this.updateProgressBar) this.updateProgressBar(); });
                        this._carouselTrackListenerAttached = true;
                    }
                }
            }).call(this);
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
        const scrollEl = this._originalWrapper || this.wrapper;
        try {
            if (scrollEl.scrollWidth > scrollEl.clientWidth) {
                const scrollPercentage = (scrollEl.scrollLeft / (scrollEl.scrollWidth - scrollEl.clientWidth)) * 100;
                this.progressBar.style.width = `${scrollPercentage}%`;
            } else {
                this.progressBar.style.width = '100%';
            }
        } catch (e) { this.progressBar.style.width = '100%'; }
    }
    scrollToPrevPage() { this.scrollToPage('prev'); }
    scrollToNextPage() { this.scrollToPage('next'); }
    scrollToPage(direction) {
        if (!this.wrapper) return;
    const scrollEl = this._originalWrapper || this.wrapper;
    const containerWidth = (scrollEl && (scrollEl.clientWidth || (scrollEl.parentElement && scrollEl.parentElement.clientWidth))) || 0;

        const firstItem = this.wrapper.querySelector('.custom-carousel-item');
        if (!firstItem) return;
        let itemWidth = Math.round(firstItem.offsetWidth || 0);
        if (!itemWidth || itemWidth < 30) {
            try { const rect = firstItem.getBoundingClientRect(); itemWidth = Math.max(itemWidth, Math.round(rect.width) || 0); } catch (e) {}
        }
        let gap = 0;
        const secondItem = firstItem.nextElementSibling;
        if (secondItem) {
            try { gap = Math.round(secondItem.offsetLeft - (firstItem.offsetLeft + firstItem.offsetWidth)); if (isNaN(gap) || gap < 0) gap = 0; } catch (e) { gap = 0; }
        }
        if (!itemWidth) itemWidth = 240;
        const stepSize = itemWidth + gap;
        const itemsPerViewport = Math.max(1, Math.floor(containerWidth / stepSize) || 1);
    const currentIndex = Math.floor((((this._originalWrapper || this.wrapper) && (this._originalWrapper || this.wrapper).scrollLeft) || 0) / stepSize);
        let targetIndex;
        if (direction === 'prev') targetIndex = Math.max(0, currentIndex - itemsPerViewport); else targetIndex = currentIndex + itemsPerViewport;
        const totalItems = this.wrapper.querySelectorAll('.custom-carousel-item').length;
        const maxFirstIndex = Math.max(0, totalItems - itemsPerViewport);
        targetIndex = Math.max(0, Math.min(targetIndex, maxFirstIndex));
        const finalScroll = targetIndex * stepSize;
        try { if (scrollEl && typeof scrollEl.scrollTo === 'function') scrollEl.scrollTo({ left: finalScroll, behavior: 'smooth' }); else if (scrollEl) scrollEl.scrollLeft = finalScroll; } catch (e) { if (scrollEl) scrollEl.scrollLeft = finalScroll; }
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
        if (this.wrapper) {
            const _t = ensureCarouselTrack(this.wrapper) || this.wrapper;
            if (_t !== this.wrapper) { this._originalWrapper = this.wrapper; this.wrapper = _t; }
        }
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
        this.loadEpisodiosData();
    }
    setupResizeObserver() {
        if (!this.wrapper) return;
        const itemWidth = 246;
        const gap = 4;
        const calculate = () => {
            const scrollEl = this._originalWrapper || this.wrapper;
            const containerWidth = (scrollEl && scrollEl.clientWidth) || 0;
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
        if (this.carouselPrev) this.carouselPrev.addEventListener('click', (e) => { e.preventDefault(); this.scrollToPrevPage(); });
        if (this.carouselNext) this.carouselNext.addEventListener('click', (e) => { e.preventDefault(); this.scrollToNextPage(); });
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
                        try { if (typeof _createPortalForItem === 'function') _createPortalForItem(div); } catch (e) {}
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
                    try { if (typeof _removePortalForItem === 'function') _removePortalForItem(div); } catch (e) {}
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
        const scrollEl = this._originalWrapper || this.wrapper;
        try {
            if (scrollEl.scrollWidth > scrollEl.clientWidth) {
                const scrollPercentage = (scrollEl.scrollLeft / (scrollEl.scrollWidth - scrollEl.clientWidth)) * 100;
                this.progressBar.style.width = `${scrollPercentage}%`;
            } else { this.progressBar.style.width = '100%'; }
        } catch (e) { this.progressBar.style.width = '100%'; }
    }
    scrollToPrevPage() { this.scrollToPage('prev'); }
    scrollToNextPage() { this.scrollToPage('next'); }
    scrollToPage(direction) {
    if (!this.wrapper) return;
    const scrollEl = this._originalWrapper || this.wrapper;
    const containerWidth = (scrollEl && (scrollEl.clientWidth || (scrollEl.parentElement && scrollEl.parentElement.clientWidth))) || 0;
        const firstItem = this.wrapper.querySelector('.custom-carousel-item');
        if (!firstItem) return;
        let itemWidth = Math.round(firstItem.offsetWidth || 0);
        if (!itemWidth || itemWidth < 30) {
            try { const rect = firstItem.getBoundingClientRect(); itemWidth = Math.max(itemWidth, Math.round(rect.width) || 0); } catch (e) {}
        }
        let gap = 0;
        const secondItem = firstItem.nextElementSibling;
        if (secondItem) {
            try { gap = Math.round(secondItem.offsetLeft - (firstItem.offsetLeft + firstItem.offsetWidth)); if (isNaN(gap) || gap < 0) gap = 0; } catch (e) { gap = 0; }
        }
        if (!itemWidth) itemWidth = 240;
        const stepSize = itemWidth + gap;
        const itemsPerViewport = Math.max(1, Math.floor(containerWidth / stepSize) || 1);
    const currentIndex = Math.floor((((this._originalWrapper || this.wrapper) && (this._originalWrapper || this.wrapper).scrollLeft) || 0) / stepSize);
        let targetIndex;
        if (direction === 'prev') targetIndex = Math.max(0, currentIndex - itemsPerViewport); else targetIndex = currentIndex + itemsPerViewport;
        const totalItems = this.wrapper.querySelectorAll('.custom-carousel-item').length;
        const maxFirstIndex = Math.max(0, totalItems - itemsPerViewport);
        targetIndex = Math.max(0, Math.min(targetIndex, maxFirstIndex));
        const finalScroll = targetIndex * stepSize;
        try { if (scrollEl && typeof scrollEl.scrollTo === 'function') scrollEl.scrollTo({ left: finalScroll, behavior: 'smooth' }); else if (scrollEl) scrollEl.scrollLeft = finalScroll; } catch (e) { if (scrollEl) scrollEl.scrollLeft = finalScroll; }
    }
}
class AnimesCarousel {
    constructor() {
        console.log("AnimesCarousel: Constructor iniciado");
        this.wrapper = document.getElementById('animes-carousel-wrapper');
        if (this.wrapper) {
            const _t = ensureCarouselTrack(this.wrapper) || this.wrapper;
            if (_t !== this.wrapper) { this._originalWrapper = this.wrapper; this.wrapper = _t; }
        }
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
        this.loadAnimeData();
    }

    updateProgressBar() {
        if (!this.progressBar || !this.wrapper) return;
        const scrollEl = this._originalWrapper || this.wrapper;
        try {
            if (scrollEl.scrollWidth > scrollEl.clientWidth) {
                const scrollPercentage = (scrollEl.scrollLeft / (scrollEl.scrollWidth - scrollEl.clientWidth)) * 100;
                this.progressBar.style.width = `${scrollPercentage}%`;
            } else {
                this.progressBar.style.width = '100%';
            }
        } catch (e) { this.progressBar.style.width = '100%'; }
    }

    handleScroll() {
        // Update visual progress and trigger lazy loading when near the end
        this.updateProgressBar();
        try {
            const scrollEl = this._originalWrapper || this.wrapper;
            if ((scrollEl.scrollLeft || 0) + scrollEl.clientWidth >= (scrollEl.scrollWidth || 0) - 200) {
                this.renderItems();
            }
        } catch (e) {}
    }
    setupResizeObserver() {
        if (!this.wrapper) return;
        const itemWidth = 194;
        const gap = 4;
        const calculate = () => {
            const scrollEl = this._originalWrapper || this.wrapper;
            const containerWidth = (scrollEl && scrollEl.clientWidth) || 0;
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
        const scrollEl = this._originalWrapper || this.wrapper;
        const containerWidth = (scrollEl && scrollEl.clientWidth) || 0;
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
                    <img class="poster-image" src="${posterUrl}" alt="${item.title}" onload="this.parentElement.previousElementSibling.style.display='none'; this.style.opacity='1'" style="opacity:0;transition:opacity 0.3s ease" loading="lazy">
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
                            try { if (typeof _createPortalForItem === 'function') _createPortalForItem(div); } catch (e) {}
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
                    try { if (typeof _removePortalForItem === 'function') _removePortalForItem(div); } catch (e) {}
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
            const scrollEl = this._originalWrapper || this.wrapper;
            try {
                if (scrollEl.scrollWidth > scrollEl.clientWidth) {
                    const scrollPercentage = (scrollEl.scrollLeft / (scrollEl.scrollWidth - scrollEl.clientWidth)) * 100;
                    this.progressBar.style.width = `${scrollPercentage}%`;
                } else {
                    this.progressBar.style.width = '100%';
                }
            } catch (e) { this.progressBar.style.width = '100%'; }
        }
    }
    scrollToPrevPage() {
        if (!this.wrapper) return;
        const scrollEl = this._originalWrapper || this.wrapper;
        try { const scrollAmount = scrollEl.clientWidth || 0; if (typeof scrollEl.scrollBy === 'function') scrollEl.scrollBy({ left: -scrollAmount, behavior: 'smooth' }); else scrollEl.scrollLeft = Math.max(0, (scrollEl.scrollLeft || 0) - scrollAmount); } catch (e) {}
    }
    scrollToNextPage() {
        if (!this.wrapper) return;
        const scrollEl = this._originalWrapper || this.wrapper;
        try { const scrollAmount = scrollEl.clientWidth || 0; if (typeof scrollEl.scrollBy === 'function') scrollEl.scrollBy({ left: scrollAmount, behavior: 'smooth' }); else scrollEl.scrollLeft = (scrollEl.scrollLeft || 0) + scrollAmount; } catch (e) {}
    }
}
class Carousel {
    constructor() {
        this.wrapper = document.getElementById('carousel-wrapper');
        if (this.wrapper) {
            const _t = ensureCarouselTrack(this.wrapper) || this.wrapper;
            if (_t !== this.wrapper) { this._originalWrapper = this.wrapper; this.wrapper = _t; }
        }
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
            const scrollEl = this._originalWrapper || this.wrapper;
            const containerWidth = (scrollEl && scrollEl.clientWidth) || 0;
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
            this.scrollToPrevPage();
        });
        this.carouselNext.addEventListener('click', (e) => {
            e.preventDefault();
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
        const scrollEl = this._originalWrapper || this.wrapper;
        const containerWidth = (scrollEl && scrollEl.clientWidth) || 0;
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
                    <img class="poster-image" src="${posterUrl}" alt="${item.title}" onload="this.parentElement.previousElementSibling.style.display='none'; this.style.opacity='1'" style="opacity:0;transition:opacity 0.3s ease" loading="lazy">
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
        const itemWidth = 194;
        const gap = 4;
        const scrollEl = this._originalWrapper || this.wrapper;
        const containerWidth = (scrollEl && scrollEl.clientWidth) || 0;
        const itemsPerViewport = Math.floor(containerWidth / (itemWidth + gap));
        const actualScrollAmount = itemsPerViewport * (itemWidth + gap);

        let currentScroll = (scrollEl && scrollEl.scrollLeft) || 0;
        let targetScroll;
        if (direction === 'prev') {
            targetScroll = Math.max(0, currentScroll - actualScrollAmount);
        } else {
            targetScroll = currentScroll + actualScrollAmount;
        }
        // Alinear el scroll para que el item de la izquierda quede completo
        const alignedScroll = Math.round(targetScroll / (itemWidth + gap)) * (itemWidth + gap);
        // Evitar sobrepasar los límites
        const maxScroll = (scrollEl && (scrollEl.scrollWidth - scrollEl.clientWidth)) || 0;
        const finalScroll = Math.max(0, Math.min(alignedScroll, maxScroll));
        try { if (scrollEl && typeof scrollEl.scrollTo === 'function') scrollEl.scrollTo({ left: finalScroll, behavior: 'auto' }); else if (scrollEl) scrollEl.scrollLeft = finalScroll; } catch (e) { if (scrollEl) scrollEl.scrollLeft = finalScroll; }
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
        const scrollEl = this._originalWrapper || this.wrapper;
        try {
            if (scrollEl.scrollWidth > scrollEl.clientWidth) {
                const scrollPercentage = (scrollEl.scrollLeft / (scrollEl.scrollWidth - scrollEl.clientWidth)) * 100;
                this.progressBar.style.width = `${scrollPercentage}%`;
            } else {
                this.progressBar.style.width = '100%';
            }
        } catch (e) { this.progressBar.style.width = '100%'; }
    }

    handleScroll() {
        this.updateProgressBar();
        const scrollEl = this._originalWrapper || this.wrapper;
        if ((scrollEl.scrollLeft || 0) + scrollEl.clientWidth >= (scrollEl.scrollWidth || 0) - 200) {
            this.renderItems();
        }
    }

}

class SeriesCarousel {
    constructor() {
        console.log("SeriesCarousel: Constructor iniciado");
        this.wrapper = document.getElementById('series-carousel-wrapper');
        if (this.wrapper) {
            const _t = ensureCarouselTrack(this.wrapper) || this.wrapper;
            if (_t !== this.wrapper) { this._originalWrapper = this.wrapper; this.wrapper = _t; }
        }
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
            const scrollEl = this._originalWrapper || this.wrapper;
            const containerWidth = (scrollEl && scrollEl.clientWidth) || 0;
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
                this.scrollToPrevPage();
            });
        } else {
            console.error("SeriesCarousel: Botón anterior no encontrado");
        }
        
        if (this.carouselNext) {
            this.carouselNext.addEventListener('click', (e) => {
                e.preventDefault();
                console.log("SeriesCarousel: Botón siguiente clickeado");
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
    const scrollEl = this._originalWrapper || this.wrapper;
    const containerWidth = (scrollEl && scrollEl.clientWidth) || 0;
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
                    <img class="poster-image" src="${posterUrl}" alt="${item.title}" onload="this.parentElement.previousElementSibling.style.display='none'; this.style.opacity='1'" style="opacity:0;transition:opacity 0.3s ease" loading="lazy">
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
        
        const itemWidth = 194;
        const gap = 4;
        const scrollEl = this._originalWrapper || this.wrapper;
        const containerWidth = (scrollEl && scrollEl.clientWidth) || 0;
        
        // Calcular cuántos items caben en la pantalla
        const itemsPerViewport = Math.floor(containerWidth / (itemWidth + gap));
        const actualScrollAmount = itemsPerViewport * (itemWidth + gap);
        
        console.log(`Carousel: Container width: ${containerWidth}px`);
        console.log(`Carousel: Item width: ${itemWidth}px, Gap: ${gap}px`);
        console.log(`Carousel: Items que caben en pantalla: ${itemsPerViewport}`);
        console.log(`Carousel: Scroll amount: ${actualScrollAmount}px`);
        
        if (direction === 'prev') {
            // Calcular la posición anterior
            const currentScroll = (scrollEl && scrollEl.scrollLeft) || 0;
            const targetScroll = Math.max(0, currentScroll - actualScrollAmount);
            
            // Alinear a los límites de los items para que el de la izquierda esté completo
            const alignedScroll = Math.ceil(targetScroll / (itemWidth + gap)) * (itemWidth + gap);
            
            console.log(`Carousel: Prev - Current: ${currentScroll}, Target: ${targetScroll}, Aligned: ${alignedScroll}`);
            
            try { if (scrollEl && typeof scrollEl.scrollTo === 'function') scrollEl.scrollTo({ left: alignedScroll, behavior: 'auto' }); else if (scrollEl) scrollEl.scrollLeft = alignedScroll; } catch (e) {}
        } else {
            // Calcular la posición siguiente
            const currentScroll = (scrollEl && scrollEl.scrollLeft) || 0;
            const maxScroll = (scrollEl && (scrollEl.scrollWidth - scrollEl.clientWidth)) || 0;
            
            // Calcular cuántos items completos caben en la pantalla
            // Usar un valor que funcione bien para la mayoría de pantallas
            const itemsPerViewport = Math.max(4, Math.floor(containerWidth / (itemWidth + gap)));
            
            // Calcular la posición exacta del siguiente scroll
            // Si es el primer clic (currentScroll = 0), usar un cálculo especial
            let targetScroll;
            if (currentScroll === 0) {
                // Para el primer clic, mover exactamente por los items que caben
                targetScroll = itemsPerViewport * (itemWidth + gap);
            } else {
                // Para los siguientes clics, usar el cálculo normal
                targetScroll = currentScroll + (itemsPerViewport * (itemWidth + gap));
            }
            
            console.log(`Carousel: Next - Current: ${currentScroll}, Items per viewport: ${itemsPerViewport}, Target: ${targetScroll}`);
            try { if (scrollEl && typeof scrollEl.scrollTo === 'function') scrollEl.scrollTo({ left: targetScroll, behavior: 'auto' }); else if (scrollEl) scrollEl.scrollLeft = targetScroll; } catch (e) {}
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
        const scrollEl = this._originalWrapper || this.wrapper;
        try {
            if (scrollEl.scrollWidth > scrollEl.clientWidth) {
                const scrollPercentage = (scrollEl.scrollLeft / (scrollEl.scrollWidth - scrollEl.clientWidth)) * 100;
                this.progressBar.style.width = `${scrollPercentage}%`;
            } else {
                this.progressBar.style.width = '100%';
            }
        } catch (e) { this.progressBar.style.width = '100%'; }
    }

    handleScroll() {
        this.updateProgressBar();
        const scrollEl = this._originalWrapper || this.wrapper;
        if ((scrollEl.scrollLeft || 0) + scrollEl.clientWidth >= (scrollEl.scrollWidth || 0) - 200) {
            this.renderItems();
        }
    }

}

class DocumentalesCarousel {
    constructor() {
        console.log("DocumentalesCarousel: Constructor iniciado");
        this.wrapper = document.getElementById('documentales-carousel-wrapper');
        if (this.wrapper) {
            const _t = ensureCarouselTrack(this.wrapper) || this.wrapper;
            if (_t !== this.wrapper) { this._originalWrapper = this.wrapper; this.wrapper = _t; }
        }
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
        this.loadDocuData();
    }

    updateProgressBar() {
        if (!this.progressBar || !this.wrapper) return;
        const scrollEl = this._originalWrapper || this.wrapper;
        try {
            if (scrollEl.scrollWidth > scrollEl.clientWidth) {
                const scrollPercentage = (scrollEl.scrollLeft / (scrollEl.scrollWidth - scrollEl.clientWidth)) * 100;
                this.progressBar.style.width = `${scrollPercentage}%`;
            } else {
                this.progressBar.style.width = '100%';
            }
        } catch (e) { this.progressBar.style.width = '100%'; }
    }

    handleScroll() {
        // Called on wrapper scroll
        this.updateProgressBar();
        try {
            const scrollEl = this._originalWrapper || this.wrapper;
            if ((scrollEl.scrollLeft || 0) + scrollEl.clientWidth >= (scrollEl.scrollWidth || 0) - 200) {
                this.renderItems();
            }
        } catch (e) {}
    }
    setupResizeObserver() {
        if (!this.wrapper) return;
        const itemWidth = 194;
        const gap = 4;
        const calculate = () => {
            const scrollEl = this._originalWrapper || this.wrapper;
            const containerWidth = (scrollEl && scrollEl.clientWidth) || 0;
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
        const scrollEl = this._originalWrapper || this.wrapper;
        const containerWidth = (scrollEl && scrollEl.clientWidth) || 0;
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
                    <img class="poster-image" src="${posterUrl}" alt="${item.title}" onload="this.parentElement.previousElementSibling.style.display='none'; this.style.opacity='1'" style="opacity:0;transition:opacity 0.3s ease" loading="lazy">
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
            (function(){
                const _target = ensureCarouselTrack(this.wrapper) || this.wrapper;
                if (_target !== this.wrapper) {
                    this.wrapper = _target;
                    if (!this._carouselTrackListenerAttached) {
                        this.wrapper.addEventListener('scroll', () => { if (this.updateProgressBar) this.updateProgressBar(); });
                        this._carouselTrackListenerAttached = true;
                    }
                }
            }).call(this);
            this.wrapper.appendChild(div);
        }
        this.index = end;
        // Si hay barra de progreso, actualizarla
        if (this.progressBar) {
            const scrollEl = this._originalWrapper || this.wrapper;
            try {
                if (scrollEl.scrollWidth > scrollEl.clientWidth) {
                    const scrollPercentage = (scrollEl.scrollLeft / (scrollEl.scrollWidth - scrollEl.clientWidth)) * 100;
                    this.progressBar.style.width = `${scrollPercentage}%`;
                } else {
                    this.progressBar.style.width = '100%';
                }
            } catch (e) { this.progressBar.style.width = '100%'; }
        }
    }

    scrollToPrevPage() {
        if (!this.wrapper) return;
        const scrollEl = this._originalWrapper || this.wrapper;
        try { const scrollAmount = scrollEl.clientWidth || 0; if (typeof scrollEl.scrollBy === 'function') scrollEl.scrollBy({ left: -scrollAmount, behavior: 'smooth' }); else scrollEl.scrollLeft = Math.max(0, (scrollEl.scrollLeft || 0) - scrollAmount); } catch (e) {}
    }
    scrollToNextPage() {
        if (!this.wrapper) return;
        const scrollEl = this._originalWrapper || this.wrapper;
        try { const scrollAmount = scrollEl.clientWidth || 0; if (typeof scrollEl.scrollBy === 'function') scrollEl.scrollBy({ left: scrollAmount, behavior: 'smooth' }); else scrollEl.scrollLeft = (scrollEl.scrollLeft || 0) + scrollAmount; } catch (e) {}
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