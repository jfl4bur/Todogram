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

    // scrollToPage removido (se unificará más abajo para evitar duplicados)

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

        // Determinar tamaño real del item y gap usando el primer elemento
        const firstItem = this.wrapper.querySelector('.custom-carousel-item');
        if (!firstItem) return;
        const itemRect = firstItem.getBoundingClientRect();
        const itemWidth = Math.round(itemRect.width);

        // Intentar inferir gap a partir del siguiente hermano
        let gap = 0;
        const secondItem = firstItem.nextElementSibling;
        if (secondItem) {
            const secondRect = secondItem.getBoundingClientRect();
            gap = Math.round(secondRect.left - (itemRect.left + itemRect.width));
            if (isNaN(gap) || gap < 0) gap = 0;
        }

        const stepSize = itemWidth + gap;
        const containerWidth = this.wrapper.clientWidth;
        const itemsPerViewport = Math.max(1, Math.floor(containerWidth / stepSize));

        const totalItems = this.wrapper.querySelectorAll('.custom-carousel-item').length;
        const maxFirstIndex = Math.max(0, totalItems - itemsPerViewport);

    const itemsArray = Array.from(this.wrapper.querySelectorAll('.custom-carousel-item'));
    let currentIndex = itemsArray.findIndex(el => el.offsetLeft >= this.wrapper.scrollLeft - 1);
    if (currentIndex === -1) currentIndex = Math.max(0, Math.floor(this.wrapper.scrollLeft / stepSize));
        let targetIndex;
        if (direction === 'prev') {
            targetIndex = currentIndex - itemsPerViewport;
        } else {
            targetIndex = currentIndex + itemsPerViewport;
        }
        targetIndex = Math.max(0, Math.min(targetIndex, maxFirstIndex));

        // Calcular desplazamiento final y centrar el grupo cuando haya espacio extra
    const maxScroll = Math.max(0, this.wrapper.scrollWidth - this.wrapper.clientWidth);
    let finalScroll = targetIndex * stepSize;
    finalScroll = Math.max(0, Math.min(finalScroll, maxScroll));
    this.wrapper.scrollTo({ left: finalScroll, behavior: 'smooth' });
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

        const firstItem = this.wrapper.querySelector('.custom-carousel-item');
        if (!firstItem) return;
        const itemRect = firstItem.getBoundingClientRect();
        const itemWidth = Math.round(itemRect.width);

        let gap = 0;
        const secondItem = firstItem.nextElementSibling;
        if (secondItem) {
            const secondRect = secondItem.getBoundingClientRect();
            gap = Math.round(secondRect.left - (itemRect.left + itemRect.width));
            if (isNaN(gap) || gap < 0) gap = 0;
        }

        const stepSize = itemWidth + gap;
        const containerWidth = this.wrapper.clientWidth;
        const itemsPerViewport = Math.max(1, Math.floor(containerWidth / stepSize));

        const totalItems = this.wrapper.querySelectorAll('.custom-carousel-item').length;
        const maxFirstIndex = Math.max(0, totalItems - itemsPerViewport);

    const itemsArray = Array.from(this.wrapper.querySelectorAll('.custom-carousel-item'));
    let currentIndex = itemsArray.findIndex(el => el.offsetLeft >= this.wrapper.scrollLeft - 1);
    if (currentIndex === -1) currentIndex = Math.max(0, Math.floor(this.wrapper.scrollLeft / stepSize));
        let targetIndex = direction === 'prev' ? currentIndex - itemsPerViewport : currentIndex + itemsPerViewport;
        targetIndex = Math.max(0, Math.min(targetIndex, maxFirstIndex));

        // DEBUG: registrar valores para verificar que la paginación se está ejecutando
        try {
            console.debug('scrollToPage', {
                wrapperId: this.wrapper ? this.wrapper.id : null,
                direction,
                currentIndex,
                targetIndex,
                itemsPerViewport,
                stepSize
            });
    } catch (e) {}
    try { __showPaginationDebug({ wrapperId: this.wrapper ? this.wrapper.id : null, direction, currentIndex, targetIndex, itemsPerViewport, stepSize }); } catch (e) {}

    const maxScroll = Math.max(0, this.wrapper.scrollWidth - this.wrapper.clientWidth);
    let finalScroll = targetIndex * stepSize;
    finalScroll = Math.max(0, Math.min(finalScroll, maxScroll));
    this.wrapper.scrollTo({ left: finalScroll, behavior: 'smooth' });
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

        const firstItem = this.wrapper.querySelector('.custom-carousel-item');
        if (!firstItem) return;
        const itemRect = firstItem.getBoundingClientRect();
        const itemWidth = Math.round(itemRect.width);

        let gap = 0;
        const secondItem = firstItem.nextElementSibling;
        if (secondItem) {
            const secondRect = secondItem.getBoundingClientRect();
            gap = Math.round(secondRect.left - (itemRect.left + itemRect.width));
            if (isNaN(gap) || gap < 0) gap = 0;
        }

        const stepSize = itemWidth + gap;
        const containerWidth = this.wrapper.clientWidth;
        const itemsPerViewport = Math.max(1, Math.floor(containerWidth / stepSize));

        const totalItems = this.wrapper.querySelectorAll('.custom-carousel-item').length;
        const maxFirstIndex = Math.max(0, totalItems - itemsPerViewport);

    const itemsArray = Array.from(this.wrapper.querySelectorAll('.custom-carousel-item'));
    let currentIndex = itemsArray.findIndex(el => el.offsetLeft >= this.wrapper.scrollLeft - 1);
    if (currentIndex === -1) currentIndex = Math.max(0, Math.floor(this.wrapper.scrollLeft / stepSize));
        let targetIndex = direction === 'prev' ? currentIndex - itemsPerViewport : currentIndex + itemsPerViewport;
        targetIndex = Math.max(0, Math.min(targetIndex, maxFirstIndex));

        // DEBUG: registrar valores para verificar que la paginación se está ejecutando
        try {
            console.debug('scrollToPage', {
                wrapperId: this.wrapper ? this.wrapper.id : null,
                direction,
                currentIndex,
                targetIndex,
                itemsPerViewport,
                stepSize
            });
        } catch (e) {}

    const groupWidth = itemsPerViewport * stepSize;
    const extraSpace = Math.max(0, containerWidth - groupWidth);

    const maxScroll = Math.max(0, this.wrapper.scrollWidth - this.wrapper.clientWidth);
    let finalScroll = targetIndex * stepSize;
    finalScroll = Math.max(0, Math.min(finalScroll, maxScroll));

    this.wrapper.scrollTo({ left: finalScroll, behavior: 'smooth' });
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
        this.loadAnimeData();
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
        this.scrollToPage('prev');
    }
    scrollToNextPage() {
        this.scrollToPage('next');
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

        // Determinar tamaño real del item y gap usando el primer elemento
        const firstItem = this.wrapper.querySelector('.custom-carousel-item');
        if (!firstItem) return;
        const itemRect = firstItem.getBoundingClientRect();
        const itemWidth = Math.round(itemRect.width);

        // Intentar inferir gap a partir del siguiente hermano
        let gap = 0;
        const secondItem = firstItem.nextElementSibling;
        if (secondItem) {
            const secondRect = secondItem.getBoundingClientRect();
            gap = Math.round(secondRect.left - (itemRect.left + itemRect.width));
            if (isNaN(gap) || gap < 0) gap = 0;
        }

        const stepSize = itemWidth + gap;
        const containerWidth = this.wrapper.clientWidth;
        const itemsPerViewport = Math.max(1, Math.floor(containerWidth / stepSize));

        const totalItems = this.wrapper.querySelectorAll('.custom-carousel-item').length;
        const maxFirstIndex = Math.max(0, totalItems - itemsPerViewport);

    const itemsArray = Array.from(this.wrapper.querySelectorAll('.custom-carousel-item'));
    let currentIndex = itemsArray.findIndex(el => el.offsetLeft >= this.wrapper.scrollLeft - 1);
    if (currentIndex === -1) currentIndex = Math.max(0, Math.floor(this.wrapper.scrollLeft / stepSize));
        let targetIndex;
        if (direction === 'prev') {
            targetIndex = currentIndex - itemsPerViewport;
        } else {
            targetIndex = currentIndex + itemsPerViewport;
        }
        targetIndex = Math.max(0, Math.min(targetIndex, maxFirstIndex));

    // DEBUG: registrar valores para verificar que la paginación se está ejecutando
    try {
        console.debug('scrollToPage', {
            wrapperId: this.wrapper ? this.wrapper.id : null,
            direction,
            currentIndex,
            targetIndex,
            itemsPerViewport,
            stepSize
        });
    } catch (e) {}

    // Calcular desplazamiento final (alineado a la izquierda) — conservar la semántica existente
    const groupWidth = itemsPerViewport * stepSize;
    const extraSpace = Math.max(0, containerWidth - groupWidth);

    const maxScroll = Math.max(0, this.wrapper.scrollWidth - this.wrapper.clientWidth);
    let finalScroll = targetIndex * stepSize;
    finalScroll = Math.max(0, Math.min(finalScroll, maxScroll));

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

        // Determinar tamaño real del item y gap usando el primer elemento
        const firstItem = this.wrapper.querySelector('.custom-carousel-item');
        if (!firstItem) return;
        const itemRect = firstItem.getBoundingClientRect();
        const itemWidth = Math.round(itemRect.width);

        // Intentar inferir gap a partir del siguiente hermano
        let gap = 0;
        const secondItem = firstItem.nextElementSibling;
        if (secondItem) {
            const secondRect = secondItem.getBoundingClientRect();
            gap = Math.round(secondRect.left - (itemRect.left + itemRect.width));
            if (isNaN(gap) || gap < 0) gap = 0;
        }

        const stepSize = itemWidth + gap;
        const containerWidth = this.wrapper.clientWidth;
        const itemsPerViewport = Math.max(1, Math.floor(containerWidth / stepSize));

        const totalItems = this.wrapper.querySelectorAll('.custom-carousel-item').length;
        const maxFirstIndex = Math.max(0, totalItems - itemsPerViewport);

    const itemsArray = Array.from(this.wrapper.querySelectorAll('.custom-carousel-item'));
    let currentIndex = itemsArray.findIndex(el => el.offsetLeft >= this.wrapper.scrollLeft - 1);
    if (currentIndex === -1) currentIndex = Math.max(0, Math.floor(this.wrapper.scrollLeft / stepSize));
        let targetIndex;
        if (direction === 'prev') {
            targetIndex = currentIndex - itemsPerViewport;
        } else {
            targetIndex = currentIndex + itemsPerViewport;
        }
        targetIndex = Math.max(0, Math.min(targetIndex, maxFirstIndex));

    // DEBUG: registrar valores para verificar que la paginación se está ejecutando
    try {
        console.debug('scrollToPage', {
            wrapperId: this.wrapper ? this.wrapper.id : null,
            direction,
            currentIndex,
            targetIndex,
            itemsPerViewport,
            stepSize
        });
    } catch (e) {}

    // Calcular desplazamiento final (alineado a la izquierda) — conservar la semántica existente
    const groupWidth = itemsPerViewport * stepSize;
    const extraSpace = Math.max(0, containerWidth - groupWidth);

    const maxScroll = Math.max(0, this.wrapper.scrollWidth - this.wrapper.clientWidth);
    let finalScroll = targetIndex * stepSize;
    finalScroll = Math.max(0, Math.min(finalScroll, maxScroll));

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
        this.loadDocuData();
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
        this.scrollToPage('prev');
    }
    scrollToNextPage() {
        this.scrollToPage('next');
    }

    scrollToPage(direction) {
        if (!this.wrapper) return;
        const firstItem = this.wrapper.querySelector('.custom-carousel-item');
        if (!firstItem) return;
        const itemRect = firstItem.getBoundingClientRect();
        const itemWidth = Math.round(itemRect.width);
        let gap = 0;
        const secondItem = firstItem.nextElementSibling;
        if (secondItem) {
            const secondRect = secondItem.getBoundingClientRect();
            gap = Math.round(secondRect.left - (itemRect.left + itemRect.width));
            if (isNaN(gap) || gap < 0) gap = 0;
        }

        const stepSize = itemWidth + gap;
        const containerWidth = this.wrapper.clientWidth;
        const itemsPerViewport = Math.max(1, Math.floor(containerWidth / stepSize));
        const totalItems = this.wrapper.querySelectorAll('.custom-carousel-item').length;
        const maxFirstIndex = Math.max(0, totalItems - itemsPerViewport);
        const currentIndex = Math.round(this.wrapper.scrollLeft / stepSize);
        let targetIndex = direction === 'prev' ? currentIndex - itemsPerViewport : currentIndex + itemsPerViewport;
        targetIndex = Math.max(0, Math.min(targetIndex, maxFirstIndex));

        // DEBUG: registrar valores para verificar que la paginación se está ejecutando
        try {
            console.debug('scrollToPage', {
                wrapperId: this.wrapper ? this.wrapper.id : null,
                direction,
                currentIndex,
                targetIndex,
                itemsPerViewport,
                stepSize
            });
        } catch (e) {}

    const maxScroll = Math.max(0, this.wrapper.scrollWidth - this.wrapper.clientWidth);
    let finalScroll = targetIndex * stepSize;
    finalScroll = Math.max(0, Math.min(finalScroll, maxScroll));
    this.wrapper.scrollTo({ left: finalScroll, behavior: 'smooth' });
    }
}

// Inicialización de ambos carruseles
window.addEventListener('DOMContentLoaded', () => {
    // Exponer instancias en window para depuración manual desde consola
    try { window.seriesCarousel = new SeriesCarousel(); } catch (e) { console.error('SeriesCarousel init error', e); }
    try { window.documentalesCarousel = new DocumentalesCarousel(); } catch (e) { console.error('DocumentalesCarousel init error', e); }
    try { window.animesCarousel = new AnimesCarousel(); } catch (e) { console.error('AnimesCarousel init error', e); }
    // Algunos proyectos también usan la clase Carousel (películas). Intentamos instanciarla si existe.
    try { if (typeof Carousel !== 'undefined') window.carousel = new Carousel(); } catch (e) { /* no hacer nada si no aplica */ }

    // Panel de depuración inyectado para inspección visual y test manual
    try { __injectCarouselDebugPanel(); } catch (e) { console.error('No se pudo inyectar panel de depuración', e); }
});

// Helper visual de depuración para mostrar en pantalla los valores de paginación
function __showPaginationDebug(obj) {
    try {
        let el = document.getElementById('__pagination-debug-overlay');
        if (!el) {
            el = document.createElement('div');
            el.id = '__pagination-debug-overlay';
            el.style.position = 'fixed';
            el.style.right = '12px';
            el.style.bottom = '12px';
            el.style.zIndex = '99999';
            el.style.background = 'rgba(0,0,0,0.7)';
            el.style.color = '#fff';
            el.style.fontSize = '12px';
            el.style.padding = '8px 10px';
            el.style.borderRadius = '6px';
            el.style.maxWidth = '320px';
            el.style.pointerEvents = 'none';
            document.body.appendChild(el);
        }
        el.textContent = 'PAG: ' + (obj.wrapperId || '') + ' • ' + (obj.direction || '') + ' • cur:' + (obj.currentIndex ?? '') + ' → tgt:' + (obj.targetIndex ?? '') + ' • vp:' + (obj.itemsPerViewport ?? '') + ' • step:' + (obj.stepSize ?? '');
        // desaparecer después de 2.5s
        el.style.opacity = '1';
        clearTimeout(el.__hideTimeout);
        el.__hideTimeout = setTimeout(() => { try { el.style.opacity = '0'; } catch (e) {} }, 2500);
    } catch (e) { /* noop */ }
}

// Panel de depuración interactivo (temporal) para inspeccionar carruseles en runtime
function __injectCarouselDebugPanel() {
    try {
        if (document.getElementById('__carousel-debug-panel')) return;
        const panel = document.createElement('div');
        panel.id = '__carousel-debug-panel';
        panel.style.cssText = 'position:fixed;right:10px;top:10px;z-index:99999;background:rgba(0,0,0,0.78);color:#fff;padding:8px;border-radius:6px;font-size:12px;font-family:Arial,helvetica,sans-serif;max-width:320px;min-width:180px;box-shadow:0 4px 12px rgba(0,0,0,0.6);';
        panel.innerHTML = `
            <div style="margin-bottom:6px;font-weight:700">Debug Carrusel</div>
            <select id="__carousel-debug-select" style="width:100%;margin-bottom:8px;">
                <option value="series">series</option>
                <option value="documentales">documentales</option>
                <option value="animes">animes</option>
                <option value="carousel">carousel</option>
            </select>
            <div style="display:flex;gap:6px;margin-bottom:8px;">
                <button id="__carousel-debug-metrics" style="flex:1">Métricas</button>
                <button id="__carousel-debug-prev">Prev</button>
                <button id="__carousel-debug-next">Next</button>
            </div>
            <label style="display:block;margin-bottom:6px;font-size:11px"><input type="checkbox" id="__carousel-debug-outline" /> Outline items</label>
            <div id="__carousel-debug-output" style="margin-top:6px;max-height:220px;overflow:auto;font-size:11px;white-space:pre-wrap"></div>
        `;
        document.body.appendChild(panel);

        const sel = panel.querySelector('#__carousel-debug-select');
        const out = panel.querySelector('#__carousel-debug-output');
        const btnMetrics = panel.querySelector('#__carousel-debug-metrics');
        const btnPrev = panel.querySelector('#__carousel-debug-prev');
        const btnNext = panel.querySelector('#__carousel-debug-next');
        const chk = panel.querySelector('#__carousel-debug-outline');

        function getInstance(name) {
            switch (name) {
                case 'series': return window.seriesCarousel;
                case 'documentales': return window.documentalesCarousel;
                case 'animes': return window.animesCarousel;
                case 'carousel': return window.carousel;
                default: return window[name];
            }
        }

        btnMetrics.addEventListener('click', () => {
            const inst = getInstance(sel.value);
            if (!inst) { out.textContent = 'Instancia no encontrada: ' + sel.value; return; }
            try {
                const wrapper = inst.wrapper;
                if (!wrapper) { out.textContent = 'Wrapper no encontrado en ' + sel.value; return; }
                const first = wrapper.querySelector('.custom-carousel-item');
                const second = first && first.nextElementSibling;
                const itemW = first ? Math.round(first.getBoundingClientRect().width) : 'N/A';
                const gap = (first && second) ? Math.round(second.getBoundingClientRect().left - (first.getBoundingClientRect().left + first.getBoundingClientRect().width)) : 'N/A';
                const step = (itemW !== 'N/A' && gap !== 'N/A') ? itemW + gap : 'N/A';
                const clientW = wrapper.clientWidth;
                const itemsPerViewport = (step === 'N/A') ? 'N/A' : Math.max(1, Math.floor(clientW / step));
                const total = wrapper.querySelectorAll('.custom-carousel-item').length;
                const scrollLeft = wrapper.scrollLeft;
                const itemsArray = Array.from(wrapper.querySelectorAll('.custom-carousel-item'));
                const curIndex = (itemsArray.length && typeof scrollLeft === 'number') ? itemsArray.findIndex(el => el.offsetLeft >= scrollLeft - 1) : 'N/A';
                const maxScroll = Math.max(0, wrapper.scrollWidth - wrapper.clientWidth);
                const html = [
                    'wrapperId: ' + (wrapper.id || ''),
                    'clientWidth: ' + clientW,
                    'itemWidth: ' + itemW,
                    'gap: ' + gap,
                    'stepSize: ' + step,
                    'itemsPerViewport: ' + itemsPerViewport,
                    'totalItems: ' + total,
                    'scrollLeft: ' + scrollLeft,
                    'currentIndex: ' + curIndex,
                    'maxScroll: ' + maxScroll
                ].join('\n');
                out.textContent = html;
                console.log('Carousel Debug Metrics', { wrapperId: wrapper.id, clientW, itemW, gap, step, itemsPerViewport, total, scrollLeft, curIndex, maxScroll });
            } catch (e) { out.textContent = 'Error: ' + (e && e.message); console.error(e); }
        });

        btnPrev.addEventListener('click', () => {
            const inst = getInstance(sel.value);
            if (inst && typeof inst.scrollToPrevPage === 'function') inst.scrollToPrevPage();
            else out.textContent = 'No scrollToPrevPage en instancia';
        });
        btnNext.addEventListener('click', () => {
            const inst = getInstance(sel.value);
            if (inst && typeof inst.scrollToNextPage === 'function') inst.scrollToNextPage();
            else out.textContent = 'No scrollToNextPage en instancia';
        });

        chk.addEventListener('change', (e) => {
            const els = document.querySelectorAll('.custom-carousel-item');
            els.forEach(el => { el.style.outline = e.target.checked ? '2px solid rgba(255,0,0,0.6)' : ''; });
        });

    } catch (e) { console.error('Error in __injectCarouselDebugPanel', e); }
}