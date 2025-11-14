// Permitir que otros scripts llamen a detailsModal.show mediante window.openDetailsModal
document.addEventListener('DOMContentLoaded', function() {
    if (window.detailsModal) {
        window.openDetailsModal = (item, origen) => window.detailsModal.show(item);
    }
    // Helper to open the share modal consistently from any context
    window.openShareModal = function(item) {
        try {
            if (!window.shareModal && typeof ShareModal === 'function') {
                window.shareModal = new ShareModal();
            }
        } catch (err) { /* ignore */ }

        if (window.shareModal && typeof window.shareModal.show === 'function') {
            try {
                const currentUrl = window.location.href;
                let shareUrl = null;
                try { shareUrl = (typeof window.generateShareUrl === 'function') ? window.generateShareUrl(item, currentUrl) : null; } catch(e) { shareUrl = null; }
                window.shareModal.show({ ...item, shareUrl });
                return true;
            } catch (err) {
                console.warn('openShareModal failed', err);
                return false;
            }
        }

        // fallback: open shareUrl directly
        try {
            const url = (item && item.shareUrl) ? item.shareUrl : window.location.href;
            window.open(url, '_blank');
            return true;
        } catch (err) {
            console.warn('openShareModal fallback failed', err);
            return false;
        }
    };
});

function normalizeIframeSource(value){
    try{
        const raw = String(value || '').trim();
        if(!raw) return '';
        const lower = raw.toLowerCase();
        if(lower.includes('<iframe') && lower.includes('src=')) return raw;
        if(/^https?:\/\//i.test(raw) || raw.startsWith('//')) return raw;
        return '';
    }catch(e){ return ''; }
}

function pickPreferredVideo(){
    for(let i=0;i<arguments.length;i++){
        const normalized = normalizeIframeSource(arguments[i]);
        if(normalized) return normalized;
    }
    return '';
}

function isEpisodeItem(item){
    if(!item || typeof item !== 'object') return false;
    if(item.isEpisode) return true;
    if(item.episodioNum || item.temporada) return true;
    const raw = (item.raw && typeof item.raw === 'object') ? item.raw : item;
    const keys = ['Título episodio', 'Título episodio completo', 'Título episodio 1', 'Título episodio (completo)', 'episodeTitle', 'episodeIndex'];
    for(const key of keys){
        if(raw && raw[key] && String(raw[key]).trim() !== '') return true;
    }
    return false;
}

function determinePrimaryActionLabel(item){
    const fallback = 'Ver Película';
    if(!item || typeof item !== 'object') return fallback;
    if(isEpisodeItem(item)) return 'Ver Episodio';
    const candidates = [];
    if(item.category) candidates.push(item.category);
    if(item.originalCategory) candidates.push(item.originalCategory);
    if(item['Categoría']) candidates.push(item['Categoría']);
    if(item.categoryLabel) candidates.push(item.categoryLabel);
    if(item.raw && typeof item.raw === 'object'){
        if(item.raw['Categoría']) candidates.push(item.raw['Categoría']);
        if(item.raw.category) candidates.push(item.raw.category);
    }
    for(const candidate of candidates){
        const normalized = String(candidate || '').trim().toLowerCase();
        if(!normalized) continue;
        if(normalized.includes('documental')) return 'Ver Documental';
        if(normalized.includes('anime')) return 'Ver Anime';
        if(normalized.includes('serie')) return 'Ver Serie';
        if(normalized.includes('episodio')) return 'Ver Episodio';
    }
    return fallback;
}

const DEFAULT_DETAILS_BACKDROP_PLACEHOLDER = 'https://www.themoviedb.org/assets/2/v4/glyphicons/basic/glyphicons-basic-4-user-grey-d8fe957375e70239d6abdd549fd7568c89281b2179b5f4470e2e12895792dfa5.svg';

class DetailsModal {
    constructor() {
        this.detailsModalOverlay = document.getElementById('details-modal-overlay');
        this.detailsModalContent = document.getElementById('details-modal-content');
        this.detailsModalBackdrop = document.getElementById('details-modal-backdrop');
        this.detailsModalBody = document.getElementById('details-modal-body');
        this.detailsModalClose = document.getElementById('details-modal-close');
        this.detailsModalHeader = this.detailsModalContent ? this.detailsModalContent.querySelector('.details-modal-header') : null;
        this.activeItem = null;
        this.isDetailsModalOpen = false;
    this.preModalHash = null;
        this.TMDB_API_KEY = 'f28077ae6a89b54c86be927ea88d64d9';
        this.domCache = {}; // Cache para elementos DOM frecuentemente usados
        this._detailsBackdropLoadHandler = null;
        this._detailsBackdropErrorHandler = null;
        this._detailsBackdropFallbackApplied = false;

        if (!this.detailsModalOverlay || !this.detailsModalContent) {
            console.error("Elementos del modal de detalles no encontrados");
            return;
        }

        this.setupEventListeners();
        
        this.galleryModal = document.createElement('div');
        this.galleryModal.id = 'gallery-modal';
        this.galleryModal.className = 'gallery-modal';
        this.galleryModal.innerHTML = `
            <div class="gallery-modal-content">
                <span class="gallery-modal-close">&times;</span>
                <img class="gallery-modal-image">
                <div class="gallery-modal-counter"></div>
                <button class="gallery-modal-prev">&#10094;</button>
                <button class="gallery-modal-next">&#10095;</button>
            </div>
        `;
        document.body.appendChild(this.galleryModal);

        this.galleryImage = this.galleryModal.querySelector('.gallery-modal-image');
        this.galleryCounter = this.galleryModal.querySelector('.gallery-modal-counter');
        this.galleryClose = this.galleryModal.querySelector('.gallery-modal-close');
        this.galleryPrev = this.galleryModal.querySelector('.gallery-modal-prev');
        this.galleryNext = this.galleryModal.querySelector('.gallery-modal-next');

        this.galleryClose.addEventListener('click', () => this.closeGallery());
        this.galleryPrev.addEventListener('click', () => this.navigateGallery(-1));
        this.galleryNext.addEventListener('click', () => this.navigateGallery(1));
        this.galleryModal.addEventListener('click', (e) => {
            if (e.target === this.galleryModal) this.closeGallery();
        });

        this.galleryImages = [];
        this.currentGalleryIndex = 0;
        this.similarSectionCleanup = [];
        this.episodesSectionCleanup = [];
        this.activeEpisodesSection = null;
    }

    _detachDetailsBackdropListeners() {
        if (!this.detailsModalBackdrop) return;
        if (this._detailsBackdropLoadHandler) {
            try { this.detailsModalBackdrop.removeEventListener('load', this._detailsBackdropLoadHandler); } catch (e) {}
            this._detailsBackdropLoadHandler = null;
        }
        if (this._detailsBackdropErrorHandler) {
            try { this.detailsModalBackdrop.removeEventListener('error', this._detailsBackdropErrorHandler); } catch (e) {}
            this._detailsBackdropErrorHandler = null;
        }
    }

    _handleDetailsBackdropSettled() {
        this._detachDetailsBackdropListeners();
        try { this.detailsModalBackdrop.classList.remove('backdrop-loading'); } catch (e) {}
        try { if (this.detailsModalHeader) this.detailsModalHeader.classList.remove('backdrop-loading'); } catch (e) {}
    }

    _setDetailsBackdropImage(src) {
        if (!this.detailsModalBackdrop) return;

        this._handleDetailsBackdropSettled();

        try { this.detailsModalBackdrop.classList.add('backdrop-loading'); } catch (e) {}
        try { if (this.detailsModalHeader) this.detailsModalHeader.classList.add('backdrop-loading'); } catch (e) {}

        const fallback = DEFAULT_DETAILS_BACKDROP_PLACEHOLDER;
        this._detailsBackdropFallbackApplied = false;

        const onLoad = () => {
            this._handleDetailsBackdropSettled();
        };

        const onError = () => {
            if (!this._detailsBackdropFallbackApplied && fallback) {
                this._detailsBackdropFallbackApplied = true;
                this.detailsModalBackdrop.src = fallback;
            } else {
                this._handleDetailsBackdropSettled();
            }
        };

        this._detailsBackdropLoadHandler = onLoad;
        this._detailsBackdropErrorHandler = onError;

        try {
            this.detailsModalBackdrop.addEventListener('load', this._detailsBackdropLoadHandler, { once: true });
        } catch (e) {
            this.detailsModalBackdrop.addEventListener('load', this._detailsBackdropLoadHandler);
        }
        this.detailsModalBackdrop.addEventListener('error', this._detailsBackdropErrorHandler);

        const finalSrc = src && String(src).trim() ? src : fallback;
        if (finalSrc === fallback) this._detailsBackdropFallbackApplied = true;
        this.detailsModalBackdrop.src = finalSrc;
    }

    // Abre un player embebido en fullscreen usando un iframe
    openEpisodePlayer(url) {
        try {
            if (!url) return;
            // Si ya existe overlay, actualizar src
            let overlay = document.getElementById('details-episode-player-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'details-episode-player-overlay';
                overlay.className = 'details-episode-player-overlay';
                overlay.innerHTML = `
                    <div class="details-episode-player-inner">
                        <button class="details-episode-player-close" aria-label="Cerrar">✕</button>
                        <iframe class="details-episode-player-iframe" src="" frameborder="0" allowfullscreen allow="autoplay; fullscreen"></iframe>
                    </div>
                `;
                document.body.appendChild(overlay);
                // Los estilos del player y de episodios están ahora en public/css/styles.css

                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) this.closeEpisodePlayer();
                });
                overlay.querySelector('.details-episode-player-close').addEventListener('click', () => this.closeEpisodePlayer());
            }
            const iframe = overlay.querySelector('.details-episode-player-iframe');
            // Si la url es una URL de player P2P que usa hashes, intentar usar como src directamente
            // Implementar fallback que muestre un mensaje de error en el mismo overlay en lugar de cerrarlo
            if (overlay._fallbackTimeout) {
                clearTimeout(overlay._fallbackTimeout);
                overlay._fallbackTimeout = null;
            }
            overlay._didLoad = false;
            // Crear un timeout que muestre el estado de error si el iframe no carga en X ms
            overlay._fallbackTimeout = setTimeout(() => {
                if (!overlay._didLoad) {
                    console.warn('DetailsModal: iframe no cargó — mostrar mensaje de error en player.');
                    this.showEpisodePlayerError(overlay, 'No se pudo cargar el reproductor en esta página. Puedes reintentar o cerrar este reproductor.');
                }
            }, 2500);

            iframe.onload = () => {
                overlay._didLoad = true;
                if (overlay._fallbackTimeout) {
                    clearTimeout(overlay._fallbackTimeout);
                    overlay._fallbackTimeout = null;
                }
                // Si había un mensaje de error, eliminarlo
                if (overlay._episodeErrorContainer) {
                    overlay._episodeErrorContainer.remove();
                    overlay._episodeErrorContainer = null;
                }
            };
            iframe.onerror = () => {
                if (overlay._fallbackTimeout) {
                    clearTimeout(overlay._fallbackTimeout);
                    overlay._fallbackTimeout = null;
                }
                console.warn('DetailsModal: iframe error — mostrar mensaje de error en player.');
                this.showEpisodePlayerError(overlay, 'Hubo un error cargando el reproductor. Puedes reintentar o cerrar este reproductor.', url);
            };
            iframe.src = url;
            overlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        } catch (err) {
            console.error('DetailsModal: openEpisodePlayer error', err);
        }
    }

    // Animación basada en medir la altura real para expandir/colapsar sinopsis
    animateExpand(el) {
        if (!el) return;
        el.style.transition = 'max-height 320ms ease, opacity 220ms ease';
        el.style.overflow = 'hidden';
        // from collapsed state (max-height probably set)
        const startHeight = el.getBoundingClientRect().height;
    // temporarily set max-height to none to measure full height
    el.style.maxHeight = 'none';
        const fullHeight = el.scrollHeight;
        // restore to start height then animate to fullHeight
        el.style.maxHeight = startHeight + 'px';
        // force reflow
        void el.offsetHeight;
        requestAnimationFrame(() => {
            el.style.maxHeight = fullHeight + 'px';
        });
        const cleanup = () => {
            el.style.maxHeight = 'none';
            el.style.overflow = '';
            el.removeEventListener('transitionend', cleanup);
        };
        el.addEventListener('transitionend', cleanup);
        el.classList.remove('collapsed');
        el.classList.add('expanded');
    }

    _getCollapsedSynopsisTarget(el) {
        if (!el) return 'calc(1.5em * 4)';
        const data = el.dataset || {};
        const storedPx = parseFloat(data.collapsedHeightPx || '');
        if (!Number.isNaN(storedPx) && storedPx > 0) {
            return storedPx + 'px';
        }
        const stored = data.collapsedMaxHeight;
        if (stored) return stored;
        try {
            const computed = window.getComputedStyle(el);
            const maxHeight = computed.maxHeight;
            if (maxHeight && maxHeight !== 'none') return maxHeight;
            const lineHeightValue = computed.lineHeight;
            let lineHeight = parseFloat(lineHeightValue);
            if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
                const fontSize = parseFloat(computed.fontSize);
                if (Number.isFinite(fontSize) && fontSize > 0) {
                    lineHeight = fontSize * 1.4;
                }
            }
            if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
                lineHeight = 22;
            }
            const clampRaw = data.collapsedLines || computed.getPropertyValue('-webkit-line-clamp') || computed.getPropertyValue('line-clamp') || '';
            let clamp = parseInt(clampRaw, 10);
            if (!Number.isFinite(clamp) || clamp <= 0) clamp = 4;
            return (lineHeight * clamp) + 'px';
        } catch (err) {
            return 'calc(1.5em * 4)';
        }
    }

    _rememberCollapsedSynopsisHeight(el) {
        if (!el) return;
        requestAnimationFrame(() => {
            if (!el.classList.contains('collapsed')) return;
            const rect = el.getBoundingClientRect();
            if (rect && rect.height > 0) {
                el.dataset.collapsedHeightPx = String(rect.height);
            }
        });
    }

    animateCollapse(el) {
        if (!el) return;
        el.style.transition = 'max-height 320ms ease, opacity 220ms ease';
        el.style.overflow = 'hidden';
        // measure current full height
        const fullHeight = el.scrollHeight;
        // resolve target collapsed height (default to 4 lines)
        const targetHeight = this._getCollapsedSynopsisTarget(el);
        // set max-height to full height then to collapsed target
        el.style.maxHeight = fullHeight + 'px';
        // force reflow
        void el.offsetHeight;
        requestAnimationFrame(() => {
            el.style.maxHeight = targetHeight;
        });
        let cleaned = false;
        const cleanup = (evt) => {
            if (cleaned) return;
            if (evt && evt.target !== el) return;
            cleaned = true;
            el.style.maxHeight = targetHeight;
            el.style.overflow = '';
            el.removeEventListener('transitionend', cleanup);
            this._rememberCollapsedSynopsisHeight(el);
        };
        el.addEventListener('transitionend', cleanup);
        el.classList.remove('expanded');
        el.classList.add('collapsed');
    }

    toggleSynopsisElement(el) {
        if (!el) return;
        if (el.classList.contains('expanded')) {
            this.animateCollapse(el);
        } else {
            this.animateExpand(el);
        }
    }

    closeEpisodePlayer() {
        try {
            const overlay = document.getElementById('details-episode-player-overlay');
            if (!overlay) return;
            const iframe = overlay.querySelector('.details-episode-player-iframe');
            if (iframe) iframe.src = 'about:blank';
            // limpiar timeouts y contenedores de error si existen
            if (overlay._fallbackTimeout) {
                clearTimeout(overlay._fallbackTimeout);
                overlay._fallbackTimeout = null;
            }
            if (overlay._episodeErrorContainer) {
                overlay._episodeErrorContainer.remove();
                overlay._episodeErrorContainer = null;
            }
            // Quitar parametro `ep` del hash actual manteniendo id/title y otros extras
            try {
                const currentHash = window.location.hash.substring(1);
                if (currentHash) {
                    const params = new URLSearchParams(currentHash);
                    if (params.has('ep')) {
                        params.delete('ep');
                        const newHashString = params.toString();
                        if (newHashString) {
                            window.history.replaceState(null, null, `${window.location.pathname}#${newHashString}`);
                        } else {
                            window.history.replaceState(null, null, window.location.pathname);
                        }
                    }
                }
            } catch (err) {
                console.warn('DetailsModal: fallo al limpiar ep del hash', err);
            }
            overlay.style.display = 'none';
            document.body.style.overflow = 'auto';
        } catch (err) {
            console.error('DetailsModal: closeEpisodePlayer error', err);
        }
    }

    showEpisodePlayerError(overlay, message, lastUrl) {
        try {
            // evitar duplicados
            if (!overlay) return;
            if (overlay._episodeErrorContainer) return;
            const container = document.createElement('div');
            container.className = 'details-episode-player-error';
            container.innerHTML = `
                <div class="details-episode-player-error-inner">
                    <div class="details-episode-player-error-message">${message}</div>
                    <div class="details-episode-player-error-actions">
                        <button class="details-episode-player-retry">Reintentar</button>
                        <button class="details-episode-player-closebtn">Cerrar</button>
                    </div>
                </div>
            `;
            overlay.appendChild(container);
            overlay._episodeErrorContainer = container;
            // Eventos
            const retryBtn = container.querySelector('.details-episode-player-retry');
            const closeBtn = container.querySelector('.details-episode-player-closebtn');
            retryBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // volver a intentar cargando la url anterior si se proporcionó
                const iframe = overlay.querySelector('.details-episode-player-iframe');
                if (iframe && lastUrl) {
                    // limpiar error visual
                    container.remove();
                    overlay._episodeErrorContainer = null;
                    // re-intentar
                    iframe.src = lastUrl;
                    // restablecer timeout
                    if (overlay._fallbackTimeout) {
                        clearTimeout(overlay._fallbackTimeout);
                        overlay._fallbackTimeout = null;
                    }
                    overlay._didLoad = false;
                    overlay._fallbackTimeout = setTimeout(() => {
                        if (!overlay._didLoad) this.showEpisodePlayerError(overlay, 'No se pudo cargar el reproductor.');
                    }, 2500);
                }
            });
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeEpisodePlayer();
            });
        } catch (err) {
            console.error('DetailsModal: showEpisodePlayerError', err);
        }
    }

    setupEventListeners() {
        this.detailsModalClose.addEventListener('click', (e) => {
            e.stopPropagation();
            this.close();
        });
        
        this.detailsModalOverlay.addEventListener('click', (e) => {
            // Evitar que el mismo tap/click que abrió el modal lo cierre de inmediato.
            // Algunos navegadores/reproducciones de eventos en móviles pueden reenfocar
            // el evento hacia el overlay si el modal se muestra sin esperar al siguiente
            // ciclo de evento. Ignoramos clicks en el overlay durante un breve intervalo
            // tras abrir el modal.
            try {
                if (this._suppressOverlayClickUntil && Date.now() < this._suppressOverlayClickUntil) return;
            } catch (err) {}
            if (e.target === this.detailsModalOverlay) {
                this.close();
            }
        });

        // NOTE: no añadimos delegación de clicks para acciones aquí para no interferir con la implementación
        // original del DetailsModal. Los handlers específicos se agregan cuando el modal renderiza su contenido
        // y el código existente maneja esos eventos. Mantener solo listeners de cierre/overlay.
    }

    async show(item, itemElement) {
        // Normalize: if catalogo passed a 'raw' original row, copy common local fields so this modal can use them
        try {
            const raw = item && item.raw ? item.raw : null;
            if (raw) {
                // directors/writers/cast
                if (!item.director && (raw['Director(es)'] || raw['Director'])) item.director = raw['Director(es)'] || raw['Director'];
                if (!item.writers && (raw['Escritor(es)'] || raw['Escritor'])) item.writers = raw['Escritor(es)'] || raw['Escritor'];
                if (!item.cast && (raw['Reparto principal'] || raw['Reparto'])) item.cast = raw['Reparto principal'] || raw['Reparto'];
                // posters/backdrops/poster
                if (!item.postersUrl && raw['Carteles']) item.postersUrl = raw['Carteles'];
                if (!item.posterUrl && raw['Portada']) item.posterUrl = raw['Portada'];
                if (!item.backgroundUrl && raw['Carteles']) item.backgroundUrl = raw['Carteles'];
                // tmdb url
                if (!item.tmdbUrl && raw['TMDB']) item.tmdbUrl = raw['TMDB'];
            }
        } catch (e) {
            console.warn('DetailsModal: fallo al normalizar item.raw', e);
        }
        console.log('DetailsModal: Abriendo modal para:', item.title);
        console.log('DetailsModal: Datos del item:', {
            videoUrl: item.videoUrl,
            trailerUrl: item.trailerUrl,
            tmdbUrl: item.tmdbUrl
        });
        if (!this.isDetailsModalOpen) {
            const currentHashSnapshot = window.location.hash || '';
            if (currentHashSnapshot && !currentHashSnapshot.startsWith('#id=')) {
                this.preModalHash = currentHashSnapshot;
            } else if (!currentHashSnapshot) {
                this.preModalHash = '';
            } else if (this.preModalHash == null) {
                this.preModalHash = '';
            }
        }
        this.isDetailsModalOpen = true;
        // Instrumentación temporal: marcar timestamp de apertura para depuración
        try { this._openedAt = Date.now(); console.log('DetailsModal: show() timestamp', this._openedAt); } catch(e){}
        this.updateUrlForModal(item);
        this.cleanupSimilarSection();
    this.cleanupEpisodesSection();
        this.scrollModalToTop('auto');
        
        this.detailsModalBody.innerHTML = `
            <div style="display:flex; justify-content:center; align-items:center; height:100%;">
                <div class="skeleton-spinner"></div>
            </div>
        `;
        
        this.detailsModalOverlay.style.display = 'block';
        this.detailsModalOverlay.classList.add('show');
    // Evitar que el click/tap original que abrió el modal (mismo evento)
    // se propague a overlay y cierre el modal inmediatamente.
    try { this._suppressOverlayClickUntil = Date.now() + 350; } catch (e) {}
        document.body.style.overflow = 'hidden';
        console.log('DetailsModal: Modal overlay mostrado con clase show');
        
        if (this.isIOS()) {
            document.getElementById('ios-helper').offsetHeight;
            this.detailsModalContent.style.display = 'none';
            setTimeout(() => {
                this.detailsModalContent.style.display = 'block';
            }, 50);
        }

        let tmdbData = null;
        if (item.tmdbUrl) {
            tmdbData = await this.fetchTMDBData(item.tmdbUrl);
        }
        
        let tmdbImages = { posters: [], backdrops: [] };
        if (item.tmdbUrl) {
            tmdbImages = await this.fetchTMDBImages(item.tmdbUrl);
        }
        
        // Usar postersUrl como prioridad (campo "Carteles")
        const backdropUrl = item.postersUrl || item.backgroundUrl || item.posterUrl || (tmdbImages.backdrops[0]?.file_path || item.posterUrl);
        
        this._setDetailsBackdropImage(backdropUrl);
        
    const trailerUrl = item.trailerUrl || (tmdbData?.trailer_url || '');
    // REGLA ESTRICTA: Sólo considerar iframes/URLs válidos para el botón principal
    const preferredVideo = pickPreferredVideo(item['Video iframe'], item['Video iframe 1'], item.videoIframe, item.videoIframe1, item.videoUrl);
    const playLabel = determinePrimaryActionLabel(item);
        
        let metaItems = [];
        
        if (item.year) metaItems.push(`<span class="details-modal-meta-item">${item.year}</span>`);
        if (item.duration) metaItems.push(`<span class="details-modal-meta-item">${item.duration}</span>`);
        if (item.genre) metaItems.push(`<span class="details-modal-meta-item">${item.genre}</span>`);
        
        const ageRating = tmdbData?.certification || item.ageRating;
        if (ageRating) metaItems.push(`<span class="details-modal-meta-item"> <span class="age-rating">${ageRating}</span></span>`);
        
        if (item.rating) metaItems.push(`<span class="details-modal-meta-item rating"><i class="fas fa-star"></i> ${item.rating}${item.tmdbUrl ? `<img src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg" class="details-modal-tmdb-logo" alt="TMDB" onclick="window.open('${item.tmdbUrl}', '_blank')">` : ''}</span>`);
        
        // Usar datos locales para audio y subtítulos
        const audioSubtitlesSection = this.createAudioSubtitlesSection(
            item.audiosCount || 0, 
            item.subtitlesCount || 0, 
            item.audioList || [], 
            item.subtitleList || []
        );
        
        let actionButtons = '';
        let secondaryButtons = '';
        
        if (preferredVideo) {
            console.log('DetailsModal: Agregando botón principal', { label: playLabel, url: preferredVideo });
            actionButtons += `<button class="details-modal-action-btn primary big-btn" data-video-url="${preferredVideo}"><i class="fas fa-play"></i><span>${playLabel}</span><span class="tooltip">Reproducir</span></button>`;
        } else {
            console.log('DetailsModal: Sin video disponible, mostrando botón de detalles para:', item.title);
            actionButtons += `<button class="details-modal-action-btn primary big-btn" data-open-details="true"><i class="fas fa-info-circle"></i><span>Ver Detalles</span><span class="tooltip">Más información</span></button>`;
        }
        
        if (preferredVideo) {
            console.log('DetailsModal: Agregando botón Descargar (regla estricta) URL:', preferredVideo);
            secondaryButtons += `<button class="details-modal-action-btn circular" onclick="window.open('${this.generateDownloadUrl(preferredVideo)}', '_blank')"><i class="fas fa-download"></i><span class="tooltip">Descargar</span></button>`;
        }
        
        if (trailerUrl) {
            secondaryButtons += `<button class="details-modal-action-btn circular" data-video-url="${trailerUrl}"><svg class="chevtrailer" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><path d="M2.64092 22C1.73625 22 1 21.2522 1 20.332V3.66802C1 2.74777 1.73625 2 2.64092 2H21.3591C22.2637 2 23 2.74777 23 3.66802V20.332C23 21.2522 22.2637 22 21.3591 22H2.64092ZM1.93084 21.0404H22.0566V10.0958H1.93084V21.0404ZM20.4248 9.14782H22.0555V2.9596H16.3749L20.426 9.14782H20.4248ZM14.5803 9.14782H19.3028L15.2494 2.9596H10.5292L14.5803 9.14782ZM8.73465 9.14782H13.456L9.4049 2.9596H4.68355L8.73465 9.14782ZM1.94336 9.14782H7.61035L3.55925 2.9596H1.94222V9.14782H1.94336Z" fill="#F0F0F0"></path><path d="M11 13L14 15.0007L11 17V13Z" fill="#F0F0F0"></path></g></svg><span class="tooltip">Ver Tráiler</span></button>`;
        }
        
        secondaryButtons += `<button class="details-modal-action-btn circular" id="share-button"><svg class="chevcomartir" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3.75,12.5 C3.75,11.4665 4.59075,10.625 5.625,10.625 C6.65925,10.625 7.5,11.4665 7.5,12.5 C7.5,13.5343 6.65925,14.375 5.625,14.375 C4.59075,14.375 3.75,13.5343 3.75,12.5 Z M16.5,18.875 C16.5,17.8407 17.3407,17 18.375,17 C19.4093,17 20.25,17.8407 20.25,18.875 C20.25,19.9093 19.4093,20.75 18.375,20.75 C17.3407,20.75 16.5,19.9093 16.5,18.875 Z M16.5,6.125 C16.5,5.0915 17.3407,4.25 18.375,4.25 C19.4093,4.25 20.25,5.0915 20.25,6.125 C20.25,7.1585 19.4093,8 18.375,8 C17.3407,8 16.5,7.1585 16.5,6.125 Z M2.25,12.5 C2.25,14.3638 3.76125,15.875 5.625,15.875 C6.612,15.875 7.49175,15.4437 8.109,14.768 L15.0638,18.245 C15.0248,18.4497 15,18.659 15,18.875 C15,20.7388 16.5112,22.25 18.375,22.25 C20.2388,22.25 21.75,20.7388 21.75,18.875 C21.75,17.0112 20.2388,15.5 18.375,15.5 C17.2642,15.5 16.287,16.0445 15.672,16.8725 L8.84475,13.4585 C8.93625,13.1532 9,12.8352 9,12.5 C9,12.1648 8.93625,11.8468 8.84475,11.5415 L15.672,8.1275 C16.287,8.95625 17.2642,9.5 18.375,9.5 C20.2388,9.5 21.75,7.98875 21.75,6.125 C21.75,4.26125 20.2388,2.75 18.375,2.75 C16.5112,2.75 15,4.26125 15,6.125 C15,6.341 15.0248,6.55025 15.0638,6.75425 L8.109,10.232 C7.49175,9.55625 6.612,9.125 5.625,9.125 C3.76125,9.125 2.25,10.6363 2.25,12.5 Z"></path></svg><span class="tooltip">Compartir</span></button>`;
        
        let infoItems = '';
        
        // Título original (usar datos locales si no hay TMDB)
        const originalTitle = tmdbData?.original_title || item.originalTitle;
        if (originalTitle && originalTitle.toLowerCase() !== item.title.toLowerCase()) {
            infoItems += `<div class="details-modal-info-item"><div class="details-modal-info-label">Título original</div><div class="details-modal-info-value">${originalTitle}</div></div>`;
        }
        
        if (item.year) {
            infoItems += `<div class="details-modal-info-item"><div class="details-modal-info-label">Año</div><div class="details-modal-info-value">${item.year}</div></div>`;
        }
        
        if (item.duration) {
            infoItems += `<div class="details-modal-info-item"><div class="details-modal-info-label">Duración</div><div class="details-modal-info-value">${item.duration}</div></div>`;
        }
        
        if (item.genre) {
            infoItems += `<div class="details-modal-info-item"><div class="details-modal-info-label">Género</div><div class="details-modal-info-value">${item.genre}</div></div>`;
        }
        
        if (ageRating) {
            infoItems += `<div class="details-modal-info-item"><div class="details-modal-info-label">Clasificación</div><div class="details-modal-info-value"> <span class="age-rating">${ageRating}</span></div></div>`;
        }
        
        // Productora(s) (usar datos locales si no hay TMDB)
        const productionCompanies = tmdbData?.production_companies || item.productionCompanies;
        if (productionCompanies) {
            infoItems += `<div class="details-modal-info-item"><div class="details-modal-info-label">Productora(s)</div><div class="details-modal-info-value">${productionCompanies}</div></div>`;
        }
        
        // País(es) (usar datos locales si no hay TMDB)
        const productionCountries = tmdbData?.production_countries || item.productionCountries;
        if (productionCountries) {
            infoItems += `<div class="details-modal-info-item"><div class="details-modal-info-label">País(es)</div><div class="details-modal-info-value">${productionCountries}</div></div>`;
        }
        
        if (tmdbData?.status) {
            infoItems += `<div class="details-modal-info-item"><div class="details-modal-info-label">Estado</div><div class="details-modal-info-value">${tmdbData.status}</div></div>`;
        }
        
        // Idioma(s) original(es) (usar datos locales si no hay TMDB)
        const spokenLanguages = tmdbData?.spoken_languages || item.spokenLanguages;
        if (spokenLanguages) {
            infoItems += `<div class="details-modal-info-item"><div class="details-modal-info-label">Idioma(s) original(es)</div><div class="details-modal-info-value">${spokenLanguages}</div></div>`;
        }
        
        let taglineSection = '';
        if (tmdbData?.tagline) {
            taglineSection = `<div class="details-modal-tagline">"${tmdbData.tagline}"</div>`;
        }
        
        const description = item.description || (tmdbData?.overview || 'Descripción no disponible');
        
        // Crear secciones de crew y cast usando datos locales si no hay TMDB
        let directorsSection = '';
        let writersSection = '';
        let castSection = '';
        
        if (tmdbData?.directors?.length > 0) {
            directorsSection = this.createCrewSection(tmdbData.directors, 'Director(es)');
        } else if (item.director) {
            // Crear sección de director usando datos locales
            const directors = item.director.split(',').map(director => ({
                name: director.trim(),
                profile_path: null
            }));
            directorsSection = this.createCrewSection(directors, 'Director(es)');
        }
        
        if (tmdbData?.writers?.length > 0) {
            writersSection = this.createCrewSection(tmdbData.writers, 'Escritor(es)');
        } else if (item.writers) {
            // Crear sección de escritores usando datos locales
            const writers = item.writers.split(',').map(writer => ({
                name: writer.trim(),
                profile_path: null
            }));
            writersSection = this.createCrewSection(writers, 'Escritor(es)');
        }
        
        if (tmdbData?.cast?.length > 0) {
            castSection = this.createCastSection(tmdbData.cast);
        } else if (item.cast) {
            // Crear sección de reparto usando datos locales
            const cast = item.cast.split(',').map(actor => ({
                name: actor.trim(),
                character: '',
                profile_path: null
            }));
            castSection = this.createCastSection(cast);
        }

        let crewSections = '';
        if (directorsSection && writersSection) {
            crewSections = `<div class="details-modal-crew-duo">${directorsSection}${writersSection}</div>`;
        } else {
            crewSections = `${directorsSection || ''}${writersSection || ''}`;
        }
        
        let posters = tmdbImages.posters || [];
        let backdrops = tmdbImages.backdrops || [];
        // If local data contains single URL strings for posters/backdrops, convert to expected structure
        try {
            if ((!posters || posters.length === 0) && item.postersUrl && typeof item.postersUrl === 'string' && item.postersUrl.trim() !== '') {
                posters = [{ file_path: item.postersUrl }];
            }
            if ((!backdrops || backdrops.length === 0) && item.backgroundUrl && typeof item.backgroundUrl === 'string' && item.backgroundUrl.trim() !== '') {
                backdrops = [{ file_path: item.backgroundUrl }];
            }
            // Also if only posterUrl exists, include it in posters
            if ((!posters || posters.length === 0) && item.posterUrl && typeof item.posterUrl === 'string' && item.posterUrl.trim() !== '') {
                posters = [{ file_path: item.posterUrl }];
            }
        } catch (e) {
            console.warn('DetailsModal: fallo construyendo poster/backdrop arrays desde datos locales', e);
        }
        
        const postersGallery = posters.length > 0 ? this.createGallerySkeleton('poster', 5) : '';
        const backdropsGallery = backdrops.length > 0 ? this.createGallerySkeleton('backdrop', 4) : '';
        
        this.detailsModalBody.innerHTML = `
            <h1 class="details-modal-title">${item.title}</h1>
            ${tmdbData?.original_title && tmdbData.original_title.toLowerCase() !== item.title.toLowerCase() ? `<div class="details-modal-original-title">${tmdbData.original_title}</div>` : ''}
            <div class="details-modal-meta">${metaItems.join('<span class="details-modal-meta-separator">•</span>')}</div>
            ${audioSubtitlesSection}
            <div class="details-modal-actions">
                <div class="primary-action-row">${actionButtons}</div>
                <div class="secondary-actions-row">${secondaryButtons}</div>
            </div>
            ${taglineSection}
            <div class="details-modal-description">${description}</div>
            <div class="details-modal-info">${infoItems}</div>
            ${crewSections}
            ${castSection}
            ${postersGallery}
            ${backdropsGallery}
            <div class="details-modal-similar-placeholder"></div>
        `;

        // Reemplazar esqueletos inmediatamente para evitar parpadeos y respetar el flujo del contenido
        try {
            if (posters.length > 0) {
                const postersSection = this.createGallerySection(posters, 'Carteles', 'posters');
                const postersContainer = this.detailsModalBody.querySelector('.details-modal-gallery-section:has(.gallery-skeleton)');
                if (postersContainer) postersContainer.outerHTML = postersSection;
            }
            if (backdrops.length > 0) {
                const backdropsSection = this.createGallerySection(backdrops, 'Imágenes de fondo', 'backdrops');
                const backdropsContainer = this.detailsModalBody.querySelectorAll('.details-modal-gallery-section:has(.gallery-skeleton)')[1] || 
                                           this.detailsModalBody.querySelector('.details-modal-gallery-section:has(.gallery-skeleton)');
                if (backdropsContainer) backdropsContainer.outerHTML = backdropsSection;
            }
        } catch (err) {
            console.warn('details-modal: fallo reemplazando galerías', err);
        }

        this.insertSimilarSection(item).catch(err => console.warn('details-modal: similar section error', err));
        
        void this.detailsModalOverlay.offsetWidth;
        
        this.detailsModalOverlay.style.opacity = '1';
        this.detailsModalContent.style.transform = 'translateY(0)';
        this.detailsModalContent.style.opacity = '1';
        
        setTimeout(() => {
            this.detailsModalBody.querySelectorAll('.details-modal-action-btn[data-video-url]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const dataVideo = btn.getAttribute('data-video-url');
                    const item = window.activeItem || null;
                    // Ensure VideoModal exists as a fallback when called from catalogo
                    try {
                        if (!window.videoModal && typeof VideoModal === 'function') {
                            window.videoModal = new VideoModal();
                        }
                    } catch (err) { /* ignore */ }

                    if (window.videoModal) {
                        // If the clicked button is primary (play movie), prefer the item so VideoModal
                        // can select the best candidate. If it's a secondary button (trailer), prefer
                        // the explicit data-video-url so the trailer is played instead of any iframe
                        // listed on the item.
                        try {
                            const isPrimary = btn.classList && btn.classList.contains('primary');
                            const tried = (item && (item.videoUrl || item.videoIframe || item.videoIframe1));
                            if (!isPrimary && dataVideo) {
                                window.videoModal.play(dataVideo);
                            } else if (item && tried) {
                                window.videoModal.play(item);
                            } else if (dataVideo) {
                                window.videoModal.play(dataVideo);
                            }
                        } catch (err) {
                            console.warn('details-modal: videoModal.play failed, falling back to dataVideo', err);
                            if (dataVideo) window.videoModal.play(dataVideo);
                        }
                    } else {
                        // No VideoModal available; try using the attribute raw URL via direct window.open as last resort
                        if (dataVideo) {
                            try { window.open(dataVideo, '_blank'); } catch(e) { console.warn('details-modal: fallback open failed', e); }
                        }
                    }
                });
            });

            this.detailsModalBody.querySelectorAll('.details-modal-action-btn[data-open-details]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    try {
                        if (this.detailsModalContent && typeof this.detailsModalContent.scrollTo === 'function') {
                            this.detailsModalContent.scrollTo({ top: 0, behavior: 'smooth' });
                        } else if (this.detailsModalContent) {
                            this.detailsModalContent.scrollTop = 0;
                        }
                    } catch (err) {
                        console.warn('details-modal: scroll fallback al hacer clic en botón de detalles', err);
                    }
                });
            });

            // Wire simple click/touch handlers to ensure action buttons don't keep an active state
            this.detailsModalBody.querySelectorAll('.details-modal-action-btn').forEach(btn => {
                if (btn._touchHandlersAttached) return;
                btn._touchHandlersAttached = true;
                // Ensure active class does not remain after an interaction
                btn.addEventListener('click', (e) => { try { btn.classList.remove('active'); } catch (err) {} });
                btn.addEventListener('touchend', () => { try { btn.classList.remove('active'); } catch (err) {} }, { passive: true });
                btn.addEventListener('touchcancel', () => { try { btn.classList.remove('active'); } catch (err) {} }, { passive: true });
            });
            
            this.detailsModalBody.querySelectorAll('.details-modal-gallery-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    const galleryType = item.getAttribute('data-gallery-type');
                    const showMore = item.getAttribute('data-show-more');
                    const index = parseInt(item.getAttribute('data-index') || 0);
                    const images = galleryType === 'posters' ? posters : backdrops;
                    
                    if (showMore === 'true') this.showGallery(images, 0);
                    else if (images && images.length > 0) this.showGallery(images, index);
                });
            });
            
            const shareBtn = this.detailsModalBody.querySelector('#share-button');
            if (shareBtn) {
                shareBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Use the item captured by the show() closure rather than relying solely on window.activeItem
                    const shareItem = item || window.activeItem || null;
                    console.log('details-modal: share button clicked, shareItem=', shareItem);
                    try {
                        if (typeof window.openShareModal === 'function') {
                            const ok = window.openShareModal(shareItem);
                            if (!ok) console.warn('details-modal: openShareModal returned false');
                        } else {
                            if (!window.shareModal && typeof ShareModal === 'function') window.shareModal = new ShareModal();
                            const currentUrl = window.location.href;
                            let shareUrl = null;
                            try { shareUrl = (typeof window.generateShareUrl === 'function') ? window.generateShareUrl(shareItem, currentUrl) : null; } catch(err) { shareUrl = null; }
                            if (window.shareModal && typeof window.shareModal.show === 'function') {
                                window.shareModal.show({ ...shareItem, shareUrl });
                            } else {
                                const url = shareItem && shareItem.shareUrl ? shareItem.shareUrl : window.location.href;
                                window.open(url, '_blank');
                            }
                        }
                    } catch (err) {
                        console.error('details-modal: share handler error', err);
                    }
                });
            }
        }, 100);

        // Insertar la sección de episodios de forma asíncrona (no bloquear el render)
        // Inicializar la sinopsis principal como colapsada
        setTimeout(() => {
            const mainDesc = this.detailsModalBody.querySelector('.details-modal-description');
            if (mainDesc) {
                mainDesc.classList.add('collapsed');
                mainDesc.style.maxHeight = 'calc(1.5em * 4)';
                mainDesc.dataset.collapsedMaxHeight = 'calc(1.5em * 4)';
                this._rememberCollapsedSynopsisHeight(mainDesc);
                mainDesc.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleSynopsisElement(mainDesc);
                });
            }
        }, 50);

        this.insertEpisodesSection(item).catch(err => console.warn('DetailsModal: insertEpisodesSection fallo', err));
        
        if (this.isIOS()) {
            this.detailsModalContent.style.animation = 'none';
            requestAnimationFrame(() => {
                this.detailsModalContent.style.animation = 'iosModalIn 0.4s ease-out forwards';
            });
        }
        
        // Ensure shareUrl is set for the active item so share button always has a target
        try {
            if (item && !item.shareUrl) {
                try {
                    const u = new URL(window.location.href);
                    const parts = [];
                    if (item.id) parts.push('id=' + encodeURIComponent(item.id));
                    if (item.title) parts.push('title=' + encodeURIComponent(item.title));
                    if (parts.length) u.hash = parts.join('&');
                    item.shareUrl = u.toString();
                } catch (err) {
                    item.shareUrl = window.location.href;
                }
            }
        } catch (e) { /* ignore */ }

        window.activeItem = item;
        console.log('DetailsModal: Modal completado para:', item.title);
    }

    close() {
        // Diagnostic trace: log stack and time since opened to find who triggers close()
        try {
            const since = this._openedAt ? (Date.now() - this._openedAt) : null;
            console.warn('DetailsModal.close() called; ms since open:', since);
            console.trace();
        } catch (e) {}

        this.cleanupSimilarSection();
    this.cleanupEpisodesSection();

        this._handleDetailsBackdropSettled();
        this.detailsModalContent.style.transform = 'translateY(20px)';
        this.detailsModalContent.style.opacity = '0';
        this.detailsModalOverlay.style.opacity = '0';
        
        setTimeout(() => {
            this.detailsModalOverlay.style.display = 'none';
            this.detailsModalOverlay.classList.remove('show');
            document.body.style.overflow = 'auto';
            this.isDetailsModalOpen = false;
            window.activeItem = null;
            try { console.log('DetailsModal.close(): calling restoreUrl()'); } catch(e){}
            this.restoreUrl();
        }, 300);
    }
    
    showGallery(images, startIndex = 0) {
        if (!images || images.length === 0) return;
        
        this.galleryImages = images;
        this.currentGalleryIndex = startIndex;
        this.updateGalleryImage();
        this.galleryModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', this.handleGalleryKeydown);
        this.galleryModal.addEventListener('wheel', this.handleGalleryWheel);
    }

    closeGallery() {
        this.galleryModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        document.removeEventListener('keydown', this.handleGalleryKeydown);
        this.galleryModal.removeEventListener('wheel', this.handleGalleryWheel);
    }

    updateGalleryImage() {
        const image = this.galleryImages[this.currentGalleryIndex];
        this.galleryImage.src = image.file_path;
        this.galleryCounter.textContent = `${this.currentGalleryIndex + 1} / ${this.galleryImages.length}`;
        this.galleryPrev.disabled = this.currentGalleryIndex === 0;
        this.galleryNext.disabled = this.currentGalleryIndex === this.galleryImages.length - 1;
    }

    navigateGallery(direction) {
        this.currentGalleryIndex += direction;
        if (this.currentGalleryIndex < 0) this.currentGalleryIndex = this.galleryImages.length - 1;
        else if (this.currentGalleryIndex >= this.galleryImages.length) this.currentGalleryIndex = 0;
        this.updateGalleryImage();
    }

    handleGalleryKeydown = (e) => {
        if (!this.galleryModal.style.display || this.galleryModal.style.display === 'none') return;
        
        switch (e.key) {
            case 'ArrowLeft': this.navigateGallery(-1); break;
            case 'ArrowRight': this.navigateGallery(1); break;
            case 'Escape': this.closeGallery(); break;
        }
    };

    handleGalleryWheel = (e) => {
        if (!this.galleryModal.style.display || this.galleryModal.style.display === 'none') return;
        
        e.preventDefault();
        if (e.deltaY > 0) this.navigateGallery(1);
        else this.navigateGallery(-1);
    };

    isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.platform) || 
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }

    normalizeText(text) {
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    updateUrlForModal(item) {
        if (!item) return;
        // Usar TMDB ID si está disponible; si no, caer a id actual
        const canonicalId = (item.tmdbId || item['ID TMDB'] || item.id || '').toString();
        if (!canonicalId || canonicalId === '0') return;
        const normalizedTitle = this.normalizeText(item.title);
        // Construir nuevo hash con id y title pero preservar parámetros adicionales existentes (ej. ep)
        const newHashBase = `id=${canonicalId}&title=${normalizedTitle}`;
        const existingHash = window.location.hash.substring(1);
        let extras = '';
        if (existingHash) {
            try {
                const params = new URLSearchParams(existingHash);
                const extraPairs = [];
                for (const [k, v] of params.entries()) {
                    if (k === 'id' || k === 'title') continue;
                    extraPairs.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
                }
                if (extraPairs.length > 0) extras = '&' + extraPairs.join('&');
            } catch (err) {
                // Si parsing falla, no hacer nada y sobrescribir solo id/title
                console.warn('DetailsModal.updateUrlForModal: fallo parsing hash existente, sobrescribiendo sin extras', err);
            }
        }
        let newHash = newHashBase + extras;
        // Si el item mostrado proviene de un episodio y la URL actual ya contiene un slug que corresponde a episodio,
        // respetar el slug actual (no sobrescribir por el título de la serie) manteniendo id= y ep= si existe.
        try {
            const existing = window.location.hash.substring(1);
            if (existing) {
                const params = new URLSearchParams(existing);
                const existingTitle = params.get('title');
                const existingEp = params.get('ep');
                // Si el existingTitle no coincide con el normalizedTitle y hay ep (o el título parece un capítulo tipo "10-2024"), preservar existingTitle
                if (existingTitle) {
                    const looksEpisode = !!existingEp || /(^\d+[\-_.]+)/.test(existingTitle);
                    if (looksEpisode && existingTitle !== normalizedTitle) {
                        // reconstruir hash con el title existente
                        const extrasObj = {};
                        for (const [k, v] of params.entries()) { if (k !== 'id' && k !== 'title') extrasObj[k] = v; }
                        const extraPairs = Object.keys(extrasObj).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(extrasObj[k])}`);
                        newHash = `id=${canonicalId}&title=${existingTitle}` + (extraPairs.length ? `&${extraPairs.join('&')}` : '');
                    }
                }
            }
        } catch (err) { /* ignore */ }
        if (window.location.hash.substring(1) !== newHash) {
            // Use pushState so the modal hash becomes a persistent history entry
            try {
                window.history.pushState(null, null, `${window.location.pathname}#${newHash}`);
            } catch (err) {
                // fallback to replaceState if pushState is unavailable for any reason
                window.history.replaceState(null, null, `${window.location.pathname}#${newHash}`);
            }
        }
        this.updateMetaTags(item);
    }

    // Construir hash para el modal conservando parámetros extras existentes
    buildModalHash(itemId, itemTitle, extraParamsObj = {}) {
        const base = `id=${itemId}&title=${itemTitle}`;
        const existingHash = window.location.hash.substring(1);
        const extras = {};
        if (existingHash) {
            try {
                const params = new URLSearchParams(existingHash);
                for (const [k, v] of params.entries()) {
                    if (k === 'id' || k === 'title') continue;
                    extras[k] = v;
                }
            } catch (err) {
                console.warn('buildModalHash: fallo parseando hash existente', err);
            }
        }
        // Mergeear extras con extraParamsObj (extraParamsObj tiene prioridad)
        for (const k of Object.keys(extraParamsObj || {})) {
            if (extraParamsObj[k] == null) delete extras[k];
            else extras[k] = String(extraParamsObj[k]);
        }
        const extraPairs = Object.keys(extras).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(extras[k])}`);
        return base + (extraPairs.length > 0 ? '&' + extraPairs.join('&') : '');
    }

    restoreUrl() {
        const baseUrl = `${window.location.pathname}${window.location.search}`;
        const targetHash = (typeof this.preModalHash === 'string') ? this.preModalHash : '';
        const targetUrl = targetHash ? `${baseUrl}${targetHash}` : baseUrl;
        window.history.replaceState(null, null, targetUrl);
        this.preModalHash = null;
    }

    updateMetaTags(item) {
        if (!item) return;
        const title = `Mira ${item.title} en nuestra plataforma`;
        const description = item.description || 'Una gran película que no te puedes perder';
        const imageUrl = item.posterUrl || 'https://via.placeholder.com/194x271';
    const canonicalId = (item.tmdbId || item['ID TMDB'] || item.id || '').toString();
    const url = `${window.location.origin}${window.location.pathname}#id=${canonicalId}&title=${this.normalizeText(item.title)}`;
        
        // Verificar que los elementos meta existan antes de intentar actualizarlos
        const ogTitle = document.getElementById('og-title');
        const ogDescription = document.getElementById('og-description');
        const ogImage = document.getElementById('og-image');
        const ogUrl = document.getElementById('og-url');
        const twitterTitle = document.getElementById('twitter-title');
        const twitterDescription = document.getElementById('twitter-description');
        const twitterImage = document.getElementById('twitter-image');
        
        if (ogTitle) ogTitle.content = title;
        if (ogDescription) ogDescription.content = description;
        if (ogImage) ogImage.content = imageUrl;
        if (ogUrl) ogUrl.content = url;
        if (twitterTitle) twitterTitle.content = title;
        if (twitterDescription) twitterDescription.content = description;
        if (twitterImage) twitterImage.content = imageUrl;
        
        const canonicalLink = document.querySelector('link[rel="canonical"]') || document.createElement('link');
        canonicalLink.rel = 'canonical';
        canonicalLink.href = url;
        document.head.appendChild(canonicalLink);
        if (navigator.userAgent.includes('Facebook')) {
            fetch(`https://graph.facebook.com/?id=${encodeURIComponent(url)}&scrape=true&method=post`);
        }
    }

    async fetchTMDBPoster(tmdbUrl) {
        if (!tmdbUrl) return '';
        try {
            const tmdbId = tmdbUrl.match(/movie\/(\d+)/)?.[1];
            if (!tmdbId) return '';
            const response = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${this.TMDB_API_KEY}`);
            if (!response.ok) return '';
            const data = await response.json();
            return data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : '';
        } catch (error) {
            console.error('Error fetching TMDB poster:', error);
            return '';
        }
    }

    async fetchTMDBImages(tmdbUrl) {
        if (!tmdbUrl) return { posters: [], backdrops: [] };
        try {
            // Detect whether URL points to movie or TV and call the correct endpoint
            let type = 'movie';
            if (/\/tv\//.test(tmdbUrl)) type = 'tv';
            const tmdbId = tmdbUrl.match(/(movie|tv)\/(\d+)/)?.[2] || tmdbUrl.match(/(\d+)/)?.[1];
            if (!tmdbId) return { posters: [], backdrops: [] };
            const response = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}/images?api_key=${this.TMDB_API_KEY}`);
            if (!response.ok) return { posters: [], backdrops: [] };
            const data = await response.json();
            const posters = data.posters?.map(poster => ({ file_path: `https://image.tmdb.org/t/p/w500${poster.file_path}` })) || [];
            const backdrops = data.backdrops?.map(backdrop => ({ file_path: `https://image.tmdb.org/t/p/w1280${backdrop.file_path}` })) || [];
            return { posters, backdrops };
        } catch (error) {
            console.error('Error fetching TMDB images:', error);
            return { posters: [], backdrops: [] };
        }
    }

    async fetchTMDBData(tmdbUrl) {
        if (!tmdbUrl) return null;
        try {
            const tmdbId = tmdbUrl.match(/movie\/(\d+)/)?.[1];
            if (!tmdbId) return null;
            const response = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${this.TMDB_API_KEY}&language=es-ES&append_to_response=credits,videos,release_dates`);
            if (!response.ok) return null;
            const data = await response.json();
            let certification = '';
            const releaseDates = data.release_dates?.results?.find(r => r.iso_3166_1 === 'ES');
            if (releaseDates) certification = releaseDates.release_dates[0]?.certification || '';
            let trailerUrl = '';
            const trailer = data.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer');
            if (trailer) trailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
            const directors = [];
            const writers = [];
            if (data.credits?.crew) {
                data.credits.crew.forEach(person => {
                    if (person.job === 'Director') directors.push({ id: person.id, name: person.name, profile_path: person.profile_path });
                    else if (person.job === 'Writer' || person.job === 'Screenplay') writers.push({ id: person.id, name: person.name, profile_path: person.profile_path });
                });
            }
            const cast = [];
            if (data.credits?.cast) {
                data.credits.cast.slice(0, 10).forEach(actor => {
                    cast.push({ id: actor.id, name: actor.name, character: actor.character, profile_path: actor.profile_path });
                });
            }
            return {
                original_title: data.original_title,
                tagline: data.tagline,
                release_date: data.release_date,
                runtime: data.runtime,
                genres: data.genres?.map(g => g.name).join(', '),
                vote_average: data.vote_average?.toFixed(1),
                certification: certification,
                overview: data.overview,
                production_companies: data.production_companies?.map(c => c.name).join(', '),
                production_countries: data.production_countries?.map(c => c.name).join(', '),
                spoken_languages: data.spoken_languages?.map(l => l.name).join(', '),
                status: data.status,
                trailer_url: trailerUrl,
                directors: directors,
                writers: writers,
                cast: cast
            };
        } catch (error) {
            console.error('Error fetching TMDB data:', error);
            return null;
        }
    }

    createGallerySkeleton(type, count) {
        const skeletonItems = [];
        for (let i = 0; i < count; i++) {
            skeletonItems.push(`<div class="gallery-skeleton-item ${type}"><div class="gallery-skeleton-spinner"></div></div>`);
        }
        return `<div class="details-modal-gallery-section"><h3 class="details-modal-gallery-title">${type === 'poster' ? 'Carteles' : 'Imágenes de fondo'}</h3><div class="gallery-skeleton">${skeletonItems.join('')}</div></div>`;
    }

    createGallerySection(images, title, type) {
        if (!images || images.length === 0) return '';
        const showCount = type === 'posters' ? 5 : 4;
        const itemClass = type === 'posters' ? 'poster' : 'backdrop';
        return `<div class="details-modal-gallery-section"><h3 class="details-modal-gallery-title">${title}</h3><div class="details-modal-gallery-list">${images.slice(0, showCount).map((image, index) => `<div class="details-modal-gallery-item ${itemClass}" data-gallery-type="${type}" data-index="${index}"><img class="details-modal-gallery-image" src="${image.file_path}" loading="lazy" alt="${title} - ${type} ${index + 1}"></div>`).join('')}${images.length > showCount ? `<div class="details-modal-gallery-item more" data-gallery-type="${type}" data-show-more="true"><i class="fas fa-images"></i><span>Ver más (${images.length - showCount})</span></div>` : ''}</div></div>`;
    }

    createCastSection(cast) {
        if (!cast || cast.length === 0) return '';
        return `<div class="details-modal-cast"><h3 class="details-modal-cast-title">Reparto principal</h3><div class="details-modal-cast-list">${cast.map(person => `<div class="details-modal-cast-item"><img class="details-modal-cast-photo" src="${person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : 'https://www.themoviedb.org/assets/2/v4/glyphicons/basic/glyphicons-basic-4-user-grey-d8fe957375e70239d6abdd549fd7568c89281b2179b5f4470e2e12895792dfa5.svg'}" alt="${person.name}" loading="lazy"><div class="details-modal-cast-name">${person.name}</div><div class="details-modal-cast-character">${person.character}</div></div>`).join('')}</div></div>`;
    }

    createCrewSection(crew, title) {
        if (!crew || crew.length === 0) return '';
        const normalized = String(title || '').toLowerCase();
        let roleClass = '';
        if (normalized.includes('director')) roleClass = ' details-modal-crew-directors';
        else if (normalized.includes('escritor')) roleClass = ' details-modal-crew-writers';
        return `<div class="details-modal-crew${roleClass}"><h3 class="details-modal-crew-title">${title}</h3><div class="details-modal-crew-list">${crew.slice(0, 6).map(person => `<div class="details-modal-crew-item"><img class="details-modal-crew-photo" src="${person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : 'https://www.themoviedb.org/assets/2/v4/glyphicons/basic/glyphicons-basic-4-user-grey-d8fe957375e70239d6abdd549fd7568c89281b2179b5f4470e2e12895792dfa5.svg'}" alt="${person.name}" loading="lazy"><div class="details-modal-crew-info"><div class="details-modal-crew-name">${person.name}</div><div class="details-modal-crew-role">${title}</div></div></div>`).join('')}</div></div>`;
    }

    createAudioSubtitlesSection(audiosCount, subtitlesCount, audioList, subtitleList) {
        let audioContent = '';
        let subtitleContent = '';
        
        // Verificar que audioList y subtitleList existan y sean arrays
        const safeAudioList = Array.isArray(audioList) ? audioList : [];
        const safeSubtitleList = Array.isArray(subtitleList) ? subtitleList : [];
        
        if (safeAudioList.length > 0) {
            audioContent = `<div class="audio-subtitles-item" onclick="this.classList.toggle('expanded')"><i class="fas fa-volume-up"></i><span>Audios (${audiosCount || 0})</span><div class="expandable-content">${safeAudioList.map(audio => `<div>· ${audio}</div>`).join('')}</div></div>`;
        }
        if (safeSubtitleList.length > 0) {
            subtitleContent = `<div class="audio-subtitles-item" onclick="this.classList.toggle('expanded')"><i class="fas fa-closed-captioning"></i><span>Subtítulos (${subtitlesCount || 0})</span><div class="expandable-content">${safeSubtitleList.map(sub => `<div>· ${sub}</div>`).join('')}</div></div>`;
        }
        if (audioContent || subtitleContent) {
            return `<div class="audio-subtitles-info">${audioContent}${audioContent && subtitleContent ? '<span class="details-modal-meta-separator">•</span>' : ''}${subtitleContent}</div>`;
        }
        return '';
    }

    generateDownloadUrl(videoUrl) {
        if (!videoUrl) return '#';
        if (videoUrl.includes('?') || videoUrl.includes('#')) return videoUrl + '&dl=1';
        return videoUrl + '?dl=1';
    }

    // Cache simple para el JSON completo
    async loadAllData() {
        if (this.domCache.allData) return this.domCache.allData;
        // Si la app ya cargó la data globalmente, usarla
        // Si ya existe en window, usarlo; esperar un poco en caso de race con otros módulos
        if (window.allData && Array.isArray(window.allData) && window.allData.length > 0) {
            console.log('DetailsModal: usando window.allData en lugar de fetch');
            this.domCache.allData = window.allData;
            return this.domCache.allData;
        }
        // También aceptar sharedData (usado por otros módulos)
        if (window.sharedData && Array.isArray(window.sharedData) && window.sharedData.length > 0) {
            console.log('DetailsModal: usando window.sharedData en lugar de fetch');
            this.domCache.allData = window.sharedData;
            return this.domCache.allData;
        }

        // Intentar esperar a que window.sharedData/window.allData se inicialice por otros módulos (race condition)
        const maxAttempts = 15;
        for (let i = 0; i < maxAttempts; i++) {
            if (window.sharedData && Array.isArray(window.sharedData) && window.sharedData.length > 0) {
                console.log('DetailsModal: detected window.sharedData after wait');
                this.domCache.allData = window.sharedData;
                return this.domCache.allData;
            }
            if (window.allData && Array.isArray(window.allData) && window.allData.length > 0) {
                console.log('DetailsModal: detected window.allData after wait');
                this.domCache.allData = window.allData;
                return this.domCache.allData;
            }
            // small wait
            await new Promise(r => setTimeout(r, 100));
        }
        try {
            console.log('DetailsModal: intentando cargar /public/data.json');
            const resp = await fetch('/public/data.json');
            if (!resp.ok) throw new Error('No se pudo cargar data.json');
            const data = await resp.json();
            this.domCache.allData = data;
            return data;
        } catch (err) {
            console.warn('DetailsModal: fallo al cargar /public/data.json, intentando otras rutas', err);
            const candidates = ['/data.json', 'public/data.json', './public/data.json', './data.json', '../public/data.json'];
            for (const path of candidates) {
                try {
                    console.log('DetailsModal: intentando cargar', path);
                    const resp2 = await fetch(path);
                    if (!resp2.ok) {
                        console.warn('DetailsModal: ruta', path, 'respondió', resp2.status);
                        continue;
                    }
                    const data2 = await resp2.json();
                    this.domCache.allData = data2;
                    return data2;
                } catch (err2) {
                    console.warn('DetailsModal: fallo en ruta', path, err2);
                    continue;
                }
            }
            console.error('DetailsModal: No se pudo cargar data.json en ninguna ruta probada');
            return [];
        }
    }

    cleanupSimilarSection() {
        if (!Array.isArray(this.similarSectionCleanup)) {
            this.similarSectionCleanup = [];
            return;
        }
        this.similarSectionCleanup.forEach(fn => {
            try {
                if (typeof fn === 'function') fn();
            } catch (err) {
                console.warn('DetailsModal: cleanupSimilarSection error', err);
            }
        });
        this.similarSectionCleanup.length = 0;
    }

    cleanupEpisodesSection() {
        if (!Array.isArray(this.episodesSectionCleanup)) {
            this.episodesSectionCleanup = [];
        } else {
            this.episodesSectionCleanup.forEach(fn => {
                try {
                    if (typeof fn === 'function') fn();
                } catch (err) {
                    console.warn('DetailsModal: cleanupEpisodesSection error', err);
                }
            });
            this.episodesSectionCleanup.length = 0;
        }
        this.activeEpisodesSection = null;
    }

    _mountEpisodesSection(sectionHtml, item) {
        if (!sectionHtml || !this.detailsModalBody) return;
        const placeholderParent = this.detailsModalBody;
        const desc = placeholderParent.querySelector('.details-modal-description');
        const wrapper = document.createElement('div');
        wrapper.innerHTML = sectionHtml;
        const section = wrapper.firstElementChild;
        if (!section) return;
        if (desc) {
            desc.insertAdjacentElement('afterend', section);
        } else {
            placeholderParent.insertAdjacentElement('beforeend', section);
        }
        this.activeEpisodesSection = section;
        this.setupEpisodesSection(section, item);
    }

    setupEpisodesSection(section, item) {
        if (!section) return;
        if (!Array.isArray(this.episodesSectionCleanup)) this.episodesSectionCleanup = [];

        const cleanupFns = [];
        const list = section.querySelector('.details-modal-episodes-list');
        if (!list) return;
        const toggleBtn = section.querySelector('.details-modal-episodes-toggle');
        const toggleWrapper = section.querySelector('.details-modal-episodes-toggle-wrapper');
        const fadeEl = section.querySelector('.details-modal-episodes-fade');
        const items = Array.from(list.querySelectorAll('.details-modal-episode-item'));

        const COLLAPSED_VISIBLE_COUNT = 3;
        const PARTIAL_NEXT_FRACTION = 0.8;

        const scheduleUpdate = () => {
            if (list._episodeLayoutFrame) cancelAnimationFrame(list._episodeLayoutFrame);
            list._episodeLayoutFrame = requestAnimationFrame(() => {
                list._episodeLayoutFrame = null;
                updateLayout();
            });
        };

        const visibleItems = () => (
            Array.from(list.children).filter(child => {
                const styles = window.getComputedStyle(child);
                if (styles.display === 'none' || styles.visibility === 'hidden') return false;
                if (child.offsetParent) return true;
                // allow absolutely positioned items still visible
                return styles.position === 'fixed' || styles.position === 'absolute';
            })
        );

        const updateEpisodeHash = (cardEl) => {
            if (!cardEl) return;
            try {
                const outerItem = item;
                const currentItem = window.activeItem || outerItem;
                const baseId = currentItem?.id || currentItem?.['ID TMDB'] || '';
                const normalized = currentItem ? this.normalizeText(currentItem.title || currentItem['Título'] || '') : '';
                const epHash = cardEl.getAttribute('data-ep-hash') || '';
                const params = epHash ? { ep: epHash.replace(/^ep=/, '') } : {};
                const newHash = this.buildModalHash(baseId, normalized, params);
                if (window.location.hash.substring(1) !== newHash) {
                    window.history.replaceState(null, null, `${window.location.pathname}#${newHash}`);
                }
            } catch (err) {
                console.warn('DetailsModal: no se pudo actualizar hash de episodio', err);
            }
        };

        const openCardVideo = (cardEl) => {
            if (!cardEl) return;
            const url = cardEl.getAttribute('data-video-url');
            if (url) this.openEpisodePlayer(url);
        };

        items.forEach(card => {
            const onCardClick = (e) => {
                if (e.target.closest('.details-modal-episode-play')) return;
                updateEpisodeHash(card);
                openCardVideo(card);
            };
            card.addEventListener('click', onCardClick);
            cleanupFns.push(() => card.removeEventListener('click', onCardClick));
        });

        const playButtons = section.querySelectorAll('.details-modal-episode-play');
        playButtons.forEach(btn => {
            const card = btn.closest('.details-modal-episode-item');
            const onPlayClick = (e) => {
                e.stopPropagation();
                updateEpisodeHash(card);
                const url = btn.getAttribute('data-video-url') || (card ? card.getAttribute('data-video-url') : null);
                if (url) this.openEpisodePlayer(url);
            };
            btn.addEventListener('click', onPlayClick);
            cleanupFns.push(() => btn.removeEventListener('click', onPlayClick));
        });

        const synopsisEls = section.querySelectorAll('.details-modal-episode-synopsis');
        synopsisEls.forEach(syn => {
            syn.classList.add('collapsed');
            syn.style.maxHeight = 'calc(1.5em * 4)';
            syn.dataset.collapsedMaxHeight = 'calc(1.5em * 4)';
            this._rememberCollapsedSynopsisHeight(syn);
            const onSynopsisClick = (e) => {
                e.stopPropagation();
                this.toggleSynopsisElement(syn);
                requestAnimationFrame(() => scheduleUpdate());
            };
            syn.addEventListener('click', onSynopsisClick);
            cleanupFns.push(() => syn.removeEventListener('click', onSynopsisClick));
        });

        const titles = section.querySelectorAll('.details-modal-episode-title');
        titles.forEach(titleEl => {
            titleEl.style.cursor = 'pointer';
            const onTitleClick = (e) => {
                e.stopPropagation();
                const card = titleEl.closest('.details-modal-episode-item');
                updateEpisodeHash(card);
                openCardVideo(card);
            };
            titleEl.addEventListener('click', onTitleClick);
            cleanupFns.push(() => titleEl.removeEventListener('click', onTitleClick));
        });

        const seasonSelect = section.querySelector('.details-modal-season-select');
        if (seasonSelect) {
            const filterContainer = seasonSelect.closest('.details-modal-season-filter');
            const onMouseDown = () => { if (filterContainer) filterContainer.classList.add('open'); };
            const onBlur = () => { if (filterContainer) filterContainer.classList.remove('open'); };
            seasonSelect.addEventListener('mousedown', onMouseDown);
            seasonSelect.addEventListener('blur', onBlur);
            cleanupFns.push(() => {
                seasonSelect.removeEventListener('mousedown', onMouseDown);
                seasonSelect.removeEventListener('blur', onBlur);
            });

            const onSeasonChange = () => {
                if (filterContainer) filterContainer.classList.remove('open');
                const val = seasonSelect.value;
                items.forEach(it => {
                    const s = it.getAttribute('data-season');
                    if (val === 'all' || !val) {
                        it.style.display = '';
                    } else {
                        it.style.display = (String(s) === String(val)) ? '' : 'none';
                    }
                });
                requestAnimationFrame(() => scheduleUpdate());
            };
            seasonSelect.addEventListener('change', onSeasonChange);
            cleanupFns.push(() => seasonSelect.removeEventListener('change', onSeasonChange));
        }

        const updateLayout = () => {
            const visible = visibleItems();
            if (!visible.length) {
                list.dataset.collapsedHeight = '0';
                list.dataset.expandedHeight = '0';
                list.style.maxHeight = '0px';
                section.classList.remove('is-expandable', 'is-expanded');
                if (toggleWrapper) toggleWrapper.style.display = 'none';
                if (toggleBtn) {
                    toggleBtn.dataset.expanded = 'false';
                    toggleBtn.setAttribute('aria-expanded', 'false');
                }
                if (fadeEl) {
                    fadeEl.style.opacity = '0';
                    fadeEl.style.pointerEvents = 'none';
                }
                return;
            }

            const styles = window.getComputedStyle(list);
            const gap = parseFloat(styles.rowGap || styles.gap || '0') || 0;
            let expandedHeight = 0;
            let collapsedHeight = 0;

            visible.forEach((itemEl, idx) => {
                const rect = itemEl.getBoundingClientRect();
                const itemHeight = rect.height;
                if (!itemHeight) return;
                expandedHeight += itemHeight;
                if (idx < visible.length - 1) expandedHeight += gap;

                if (visible.length <= COLLAPSED_VISIBLE_COUNT) return;

                if (idx < COLLAPSED_VISIBLE_COUNT) {
                    collapsedHeight += itemHeight;
                    if (idx < COLLAPSED_VISIBLE_COUNT - 1) collapsedHeight += gap;
                } else if (idx === COLLAPSED_VISIBLE_COUNT) {
                    collapsedHeight += itemHeight * PARTIAL_NEXT_FRACTION;
                    collapsedHeight += gap * PARTIAL_NEXT_FRACTION;
                }
            });

            if (visible.length <= COLLAPSED_VISIBLE_COUNT) {
                collapsedHeight = expandedHeight;
            }
            if (!Number.isFinite(collapsedHeight) || collapsedHeight <= 0 || collapsedHeight > expandedHeight) {
                collapsedHeight = expandedHeight;
            }

            list.dataset.collapsedHeight = String(collapsedHeight);
            list.dataset.expandedHeight = String(expandedHeight);

            const isExpanded = list.dataset.state === 'expanded';
            const targetHeight = isExpanded ? expandedHeight : collapsedHeight;
            list.style.maxHeight = `${targetHeight}px`;

            const isExpandable = expandedHeight > collapsedHeight + 1 && visible.length > COLLAPSED_VISIBLE_COUNT;
            section.classList.toggle('is-expandable', isExpandable);
            section.classList.toggle('is-expanded', isExpanded && isExpandable);

            if (toggleWrapper) toggleWrapper.style.display = isExpandable ? '' : 'none';
            if (toggleBtn) {
                if (!isExpandable) {
                    toggleBtn.dataset.expanded = 'false';
                    toggleBtn.setAttribute('aria-expanded', 'false');
                } else {
                    toggleBtn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
                }
            }

            if (fadeEl) {
                const shouldShowFade = isExpandable && !isExpanded;
                fadeEl.style.opacity = shouldShowFade ? '1' : '0';
                fadeEl.style.pointerEvents = shouldShowFade ? '' : 'none';
            }
        };

        const resizeHandler = () => scheduleUpdate();
        window.addEventListener('resize', resizeHandler, { passive: true });
        cleanupFns.push(() => window.removeEventListener('resize', resizeHandler));

        items.forEach(card => {
            const img = card.querySelector('img');
            if (img && !img.complete) {
                const onImgSettled = () => scheduleUpdate();
                img.addEventListener('load', onImgSettled, { once: true });
                img.addEventListener('error', onImgSettled, { once: true });
            }
        });

        if (toggleBtn) {
            const onToggleClick = (ev) => {
                ev.preventDefault();
                const expanded = toggleBtn.dataset.expanded === 'true';
                if (expanded) {
                    toggleBtn.dataset.expanded = 'false';
                    toggleBtn.setAttribute('aria-expanded', 'false');
                    list.dataset.state = 'collapsed';
                    section.classList.remove('is-expanded');
                } else {
                    toggleBtn.dataset.expanded = 'true';
                    toggleBtn.setAttribute('aria-expanded', 'true');
                    list.dataset.state = 'expanded';
                    section.classList.add('is-expanded');
                }
                scheduleUpdate();
                this.scrollElementIntoView(toggleBtn, { behavior: 'smooth', block: 'start', offset: 16 });
            };
            const onToggleKey = (ev) => {
                if (ev.key !== 'Enter' && ev.key !== ' ') return;
                ev.preventDefault();
                onToggleClick(ev);
            };
            toggleBtn.addEventListener('click', onToggleClick);
            toggleBtn.addEventListener('keydown', onToggleKey);
            cleanupFns.push(() => {
                toggleBtn.removeEventListener('click', onToggleClick);
                toggleBtn.removeEventListener('keydown', onToggleKey);
            });
        }

        list.dataset.state = 'collapsed';
        updateLayout();
        scheduleUpdate();
        setTimeout(() => scheduleUpdate(), 120);

        const cleanup = () => {
            cleanupFns.forEach(fn => {
                try {
                    fn();
                } catch (err) {
                    console.warn('DetailsModal: cleanupEpisodesSection handler error', err);
                }
            });
            if (list._episodeLayoutFrame) {
                cancelAnimationFrame(list._episodeLayoutFrame);
                list._episodeLayoutFrame = null;
            }
            list.style.maxHeight = '';
            list.dataset.state = 'collapsed';
            if (this.activeEpisodesSection === section) {
                this.activeEpisodesSection = null;
            }
        };

        this.episodesSectionCleanup.push(cleanup);
    }

    scrollModalToTop(behavior = 'auto') {
        const container = this.detailsModalContent;
        if (!container) return;
        try {
            container.scrollTo({ top: 0, behavior });
        } catch (err) {
            try { container.scrollTop = 0; } catch (_) {}
        }
    }

    scrollElementIntoView(element, { behavior = 'smooth', block = 'start', offset = 0 } = {}) {
        const container = this.detailsModalContent;
        if (!container || !element) return;
        requestAnimationFrame(() => {
            try {
                const containerRect = container.getBoundingClientRect();
                const elementRect = element.getBoundingClientRect();
                const currentScroll = container.scrollTop || 0;
                let targetTop = elementRect.top - containerRect.top + currentScroll - offset;
                if (block === 'center') {
                    targetTop -= (container.clientHeight / 2) - (elementRect.height / 2);
                } else if (block === 'end') {
                    targetTop -= container.clientHeight - elementRect.height;
                }
                if (targetTop < 0) targetTop = 0;
                container.scrollTo({ top: targetTop, behavior });
            } catch (err) {
                try { element.scrollIntoView({ behavior, block }); } catch (_) {}
            }
        });
    }

    _splitGenres(value) {
        if (!value) return [];
        if (Array.isArray(value)) {
            return value.map(v => String(v).trim()).filter(Boolean);
        }
        return String(value)
            .split(/·|\||,|\/|;|&|\s+y\s+/i)
            .map(v => v.trim())
            .filter(Boolean);
    }

    _getGenreListFromItem(item) {
        const genres = [];
        if (!item || typeof item !== 'object') return genres;
        try {
            if (Array.isArray(item.genresList)) {
                item.genresList.forEach(g => {
                    const trimmed = String(g || '').trim();
                    if (trimmed) genres.push(trimmed);
                });
            }
        } catch (err) {}
        const sources = [item.genres, item.genre, item['Géneros'], item['Género']];
        sources.forEach(src => {
            this._splitGenres(src).forEach(g => genres.push(g));
        });
        const seen = new Set();
        return genres.filter(g => {
            const key = String(g || '').toLowerCase();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    _prepareItemForSimilarity(item) {
        if (!item || typeof item !== 'object') return null;
        const rawTitle = String(item.title || item['Título'] || '').trim();
        const normalizedTitle = rawTitle ? this.normalizeText(rawTitle) : '';
        const categoryCandidates = [item.category, item.originalCategory, item['Categoría']]
            .map(v => (v ? String(v).trim().toLowerCase() : ''))
            .filter(Boolean);
        const category = categoryCandidates.length ? categoryCandidates[0] : '';
        const genres = this._getGenreListFromItem(item);
        const genreSet = new Set(genres.map(g => g.toLowerCase()));
        const yearValue = parseInt(item.year || item['Año'] || '', 10);
        const ratingRaw = item.rating || item['Puntuación 1-10'] || item['Puntuación'] || item['Puntuacion'];
        const ratingValue = parseFloat(ratingRaw);
        const idCandidates = [
            item.tmdbId,
            item['ID TMDB'],
            item.id,
            item.tmdb_id,
            item.id_tmdb
        ].map(v => (v != null ? String(v).trim() : '')).filter(Boolean);
        const numericId = idCandidates.find(v => /^\d+$/.test(v)) || null;
        const canonicalId = numericId || (idCandidates.length ? idCandidates[0] : null);
        return {
            normalizedTitle,
            genreSet,
            genres,
            category,
            yearValue: Number.isFinite(yearValue) ? yearValue : null,
            ratingValue: Number.isFinite(ratingValue) ? ratingValue : null,
            numericId,
            canonicalId,
            isEpisode: !!isEpisodeItem(item)
        };
    }

    _normalizeRawDataItem(raw, index = 0) {
        if (!raw || typeof raw !== 'object') return null;
        const title = raw['Título'] || raw['Título original'] || raw['Title'] || '';
        if (!String(title || '').trim()) return null;
        const candidate = {
            id: ((raw['ID TMDB'] || raw['ID'] || raw['id'] || `raw_${index}`) || '').toString().trim(),
            title: String(title).trim(),
            originalTitle: raw['Título original'] || '',
            description: raw['Synopsis'] || raw['Sinopsis'] || raw['Descripción'] || '',
            posterUrl: raw['Portada'] || raw['Carteles'] || '',
            backgroundUrl: raw['Carteles'] || raw['Portada'] || '',
            category: raw['Categoría'] || '',
            originalCategory: raw['Categoría'] || '',
            genres: raw['Géneros'] || raw['Género'] || '',
            year: raw['Año'] || '',
            duration: raw['Duración'] || '',
            rating: (raw['Puntuación 1-10'] || raw['Puntuación'] || raw['Puntuacion'] || '').toString().trim(),
            videoIframe: normalizeIframeSource(raw['Video iframe']),
            videoIframe1: normalizeIframeSource(raw['Video iframe 1'] || raw['Video iframe1']),
            trailerUrl: raw['Trailer'] || raw['TrailerUrl'] || '',
            cast: raw['Reparto principal'] || raw['Reparto'] || '',
            director: raw['Director(es)'] || raw['Director'] || '',
            writers: raw['Escritor(es)'] || raw['Escritor'] || '',
            tmdbUrl: raw['TMDB'] || raw['TMDB URL'] || raw['TMDB_URL'] || '',
            audiosCount: raw['Audios'] ? String(raw['Audios']).split(',').filter(Boolean).length : 0,
            subtitlesCount: raw['Subtítulos'] ? String(raw['Subtítulos']).split(',').filter(Boolean).length : 0,
            audioList: raw['Audios'] ? String(raw['Audios']).split(',').map(s => s.trim()).filter(Boolean) : [],
            subtitleList: raw['Subtítulos'] ? String(raw['Subtítulos']).split(',').map(s => s.trim()).filter(Boolean) : [],
            episodioNum: raw['Episodio'] || '',
            temporada: raw['Temporada'] || '',
            raw
        };
        candidate['Video iframe'] = candidate.videoIframe;
        candidate['Video iframe 1'] = candidate.videoIframe1;
        const tmdbMatch = (candidate.tmdbUrl || '').match(/(movie|tv)\/(\d+)/);
        if (tmdbMatch && tmdbMatch[2]) {
            candidate.tmdbId = tmdbMatch[2];
            if (!candidate.id) candidate.id = tmdbMatch[2];
        } else if (raw['ID TMDB']) {
            candidate.tmdbId = String(raw['ID TMDB']).trim();
            if (!candidate.id) candidate.id = candidate.tmdbId;
        }
        const genresList = this._splitGenres(candidate.genres);
        candidate.genresList = genresList;
        if (!candidate.genre && genresList.length) candidate.genre = genresList[0];
        if (!candidate.posterUrl && candidate.backgroundUrl) candidate.posterUrl = candidate.backgroundUrl;
        candidate.videoUrl = candidate.videoIframe || candidate.videoIframe1 || '';
        candidate.isEpisode = !!isEpisodeItem(candidate);
        candidate._similarMeta = this._prepareItemForSimilarity(candidate);
        return candidate;
    }

    async findSimilarItems(item, maxResults = 56) {
        try {
            const baseMeta = this._prepareItemForSimilarity(item);
            if (!baseMeta) return [];
            if (baseMeta.isEpisode) return [];
            const allData = await this.loadAllData();
            if (!Array.isArray(allData) || allData.length === 0) return [];
            const baseIds = new Set();
            if (baseMeta.canonicalId) baseIds.add(String(baseMeta.canonicalId));
            if (item && item.id) baseIds.add(String(item.id));
            if (item && item.tmdbId) baseIds.add(String(item.tmdbId));
            if (item && item['ID TMDB']) baseIds.add(String(item['ID TMDB']));
            const baseGenres = baseMeta.genreSet || new Set();
            const baseCategory = baseMeta.category;
            const baseYear = baseMeta.yearValue;
            const baseIsEpisode = !!baseMeta.isEpisode;
            const results = [];
            const seen = new Set();
            for (let i = 0; i < allData.length; i++) {
                const candidate = this._normalizeRawDataItem(allData[i], i);
                if (!candidate || !candidate._similarMeta) continue;
                const meta = candidate._similarMeta;
                const candidateId = meta.canonicalId || candidate.id;
                const candidateKey = `${candidateId || ''}|${meta.normalizedTitle || ''}`;
                if (candidateKey && seen.has(candidateKey)) continue;
                seen.add(candidateKey);
                if (candidateId && baseIds.has(String(candidateId))) continue;
                if (meta.normalizedTitle && baseMeta.normalizedTitle && meta.normalizedTitle === baseMeta.normalizedTitle) continue;
                if (!baseIsEpisode && meta.isEpisode) continue;
                let score = 0;
                let sharedGenres = 0;
                if (baseGenres.size && meta.genreSet && meta.genreSet.size) {
                    meta.genreSet.forEach(g => { if (baseGenres.has(g)) sharedGenres++; });
                }
                if (sharedGenres) score += sharedGenres * 8;
                if (!sharedGenres && !baseGenres.size) score += 3;
                if (baseCategory && meta.category && baseCategory === meta.category) score += 6;
                if (baseYear && meta.yearValue) {
                    const diff = Math.abs(baseYear - meta.yearValue);
                    if (diff === 0) score += 5;
                    else if (diff === 1) score += 4;
                    else if (diff <= 3) score += 3;
                    else if (diff <= 5) score += 2;
                    else score += 1;
                }
                if (meta.ratingValue) score += meta.ratingValue * 0.5;
                if (candidate.posterUrl) score += 2;
                if (candidate.videoUrl) score += 1;
                if (!Number.isFinite(score) || score <= 0) score = candidate.posterUrl ? 1.5 : 1;
                results.push({ item: candidate, score });
            }
            if (!results.length) return [];
            results.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                const br = b.item._similarMeta?.ratingValue || 0;
                const ar = a.item._similarMeta?.ratingValue || 0;
                if (br !== ar) return br - ar;
                const by = b.item._similarMeta?.yearValue || 0;
                const ay = a.item._similarMeta?.yearValue || 0;
                return by - ay;
            });
            return results.slice(0, maxResults).map(entry => {
                const sim = entry.item;
                if (!sim['Video iframe']) sim['Video iframe'] = sim.videoIframe || '';
                if (!sim['Video iframe 1']) sim['Video iframe 1'] = sim.videoIframe1 || '';
                return sim;
            });
        } catch (err) {
            console.warn('DetailsModal: findSimilarItems error', err);
            return [];
        }
    }

    createSimilarSectionElement(similarItems) {
        if (!Array.isArray(similarItems) || similarItems.length === 0) return null;
        const section = document.createElement('section');
        section.className = 'details-modal-similar-section';
    const escapeHtml = (value) => String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const escapeAttr = (value) => escapeHtml(value).replace(/"/g, '&quot;');
        const cardsMarkup = similarItems.map((sim, index) => {
            const poster = sim.posterUrl || sim.backgroundUrl || 'https://via.placeholder.com/210x315?text=Sin+imagen';
            const safePoster = escapeAttr(poster);
            const safeTitleAttr = escapeAttr(sim.title || '');
            return `
                <article class="details-modal-similar-card" data-similar-index="${index}" data-item-id="${escapeAttr(sim.id || '')}" data-allow-hover-inside-details="true" role="button" tabindex="0" aria-label="Ver detalles de ${safeTitleAttr}">
                    <div class="details-modal-similar-poster">
                        <img src="${safePoster}" alt="${safeTitleAttr}" loading="lazy">
                    </div>
                </article>
            `;
        }).join('');
        section.innerHTML = `
            <div class="details-modal-similar-header">
                <h3 class="details-modal-similar-title">Películas similares</h3>
            </div>
            <div class="details-modal-similar-grid-wrapper">
                <div class="details-modal-similar-grid" data-state="collapsed">
                    ${cardsMarkup}
                </div>
                <div class="details-modal-similar-fade"></div>
            </div>
            <div class="details-modal-similar-toggle-wrapper">
                <button type="button" class="details-modal-similar-toggle" data-expanded="false">
                    <span class="label-expand">Ver más</span>
                    <span class="label-collapse">Ver menos</span>
                    <svg class="chevron-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><polygon points="16.345 22.75 17.405 21.69 8.716 13 17.405 4.31 16.345 3.25 6.595 13" transform="rotate(-90 12 13)"></polygon></svg>
                </button>
            </div>
        `;
        return section;
    }

    setupSimilarSection(section, similarItems) {
        if (!section) return;
        const grid = section.querySelector('.details-modal-similar-grid');
        const toggleBtn = section.querySelector('.details-modal-similar-toggle');
        const fadeEl = section.querySelector('.details-modal-similar-fade');
        const toggleWrapper = section.querySelector('.details-modal-similar-toggle-wrapper');
        if (!grid) return;
        const cards = Array.from(grid.querySelectorAll('.details-modal-similar-card'));
        if (!cards.length) return;
        const detailsInstance = this;
    const COLLAPSED_ROWS = 2.75;
        const MAX_ROWS = 7;

        const ensureShareUrl = (candidate) => {
            try {
                if (!candidate.shareUrl && typeof window.generateShareUrl === 'function') {
                    candidate.shareUrl = window.generateShareUrl(candidate);
                }
            } catch (err) {}
        };

        const cleanupFns = [];
        const pointerMediaQuery = (window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)')) || null;
        const allowHoverInteractions = !!(pointerMediaQuery && pointerMediaQuery.matches);
        const HOVER_SHOW_DELAY = 900; // ms, align with catalog grid & carousels

        cards.forEach(card => {
            const idx = Number(card.getAttribute('data-similar-index') || '0');
            const data = similarItems[idx];
            if (!data) return;
            ensureShareUrl(data);
            const onClick = (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                try { window.activeItem = data; } catch (err) {}
                if (window.hoverModal && typeof window.hoverModal.hide === 'function') {
                    window.hoverModal.hide(0);
                }
                detailsInstance.show(data, card);
            };
            card.addEventListener('click', onClick);
            cleanupFns.push(() => card.removeEventListener('click', onClick));

            const onKeyDown = (ev) => {
                if (ev.key !== 'Enter' && ev.key !== ' ') return;
                ev.preventDefault();
                card.click();
            };
            card.addEventListener('keydown', onKeyDown);
            cleanupFns.push(() => card.removeEventListener('keydown', onKeyDown));
            if (allowHoverInteractions) {
                const onMouseEnter = () => {
                    if (!window.hoverModal || typeof window.hoverModal.show !== 'function') return;
                    if (card._hoverTimer) {
                        clearTimeout(card._hoverTimer);
                        card._hoverTimer = null;
                    }
                    card._hoverTimer = setTimeout(() => {
                        try {
                            window.hoverModal.show(data, card);
                            if (window.hoverModal.cancelHide) window.hoverModal.cancelHide();
                        } catch (err) {
                            console.error('hoverModal.show error', err);
                        }
                        card._hoverTimer = null;
                    }, HOVER_SHOW_DELAY);
                };
                const onMouseLeave = () => {
                    if (card._hoverTimer) {
                        clearTimeout(card._hoverTimer);
                        card._hoverTimer = null;
                    }
                    if (window.hoverModal && typeof window.hoverModal.hide === 'function') {
                        window.hoverModal.hide(160);
                    }
                };
                card.addEventListener('mouseenter', onMouseEnter);
                card.addEventListener('mouseleave', onMouseLeave);
                cleanupFns.push(() => {
                    card.removeEventListener('mouseenter', onMouseEnter);
                    card.removeEventListener('mouseleave', onMouseLeave);
                    if (card._hoverTimer) {
                        clearTimeout(card._hoverTimer);
                        card._hoverTimer = null;
                    }
                });
            }
        });

        const updateLayout = () => {
            const styles = getComputedStyle(grid);
            const gapY = parseFloat(styles.rowGap || styles.gap || '0');
            const gapX = parseFloat(styles.columnGap || styles.gap || '0');
            const sampleCard = cards.find(card => !card.classList.contains('hidden-by-rowlimit')) || cards[0];
            if (!sampleCard) return;
            const rect = sampleCard.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            let columns = Math.max(1, Math.round((grid.clientWidth + gapX) / (rect.width + gapX)));
            const cssColumns = parseFloat((styles.getPropertyValue('--similar-columns') || '').trim()) || null;
            if (Number.isFinite(cssColumns) && cssColumns > 0) {
                columns = Math.min(columns, cssColumns);
            }
            const maxItems = columns * MAX_ROWS;
            cards.forEach((card, index) => {
                if (index < maxItems) card.classList.remove('hidden-by-rowlimit');
                else card.classList.add('hidden-by-rowlimit');
            });
            const visibleCards = cards.filter(card => !card.classList.contains('hidden-by-rowlimit'));
            const rowsNeeded = visibleCards.length ? Math.ceil(visibleCards.length / columns) : 0;
            const collapsedRows = Math.min(rowsNeeded, COLLAPSED_ROWS);
            const expandedRows = Math.min(rowsNeeded, MAX_ROWS);
            const collapsedHeight = collapsedRows ? (rect.height * collapsedRows) + (collapsedRows > 1 ? gapY * (collapsedRows - 1) : 0) : 0;
            const expandedHeight = expandedRows ? (rect.height * expandedRows) + (expandedRows > 1 ? gapY * (expandedRows - 1) : 0) : collapsedHeight;
            grid.dataset.collapsedHeight = collapsedHeight;
            grid.dataset.expandedHeight = expandedHeight;
            const isExpanded = grid.dataset.state === 'expanded';
            grid.style.maxHeight = `${isExpanded ? expandedHeight : collapsedHeight}px`;
            const isExpandable = rowsNeeded > COLLAPSED_ROWS + 0.2;
            section.classList.toggle('is-expandable', isExpandable);
            if (fadeEl) {
                const shouldShowFade = isExpandable && !isExpanded;
                fadeEl.style.opacity = shouldShowFade ? '1' : '0';
                fadeEl.style.pointerEvents = shouldShowFade ? '' : 'none';
            }
            if (toggleBtn) {
                if (isExpandable) {
                    toggleBtn.style.display = '';
                    if (toggleWrapper) toggleWrapper.style.display = '';
                } else {
                    toggleBtn.style.display = 'none';
                    if (toggleWrapper) toggleWrapper.style.display = 'none';
                    toggleBtn.dataset.expanded = 'false';
                    grid.dataset.state = 'collapsed';
                    section.classList.remove('is-expanded');
                    grid.style.maxHeight = `${collapsedHeight}px`;
                }
            }
        };

        const scheduleUpdate = () => {
            if (grid._similarLayoutFrame) cancelAnimationFrame(grid._similarLayoutFrame);
            grid._similarLayoutFrame = requestAnimationFrame(updateLayout);
        };

        const resizeHandler = () => scheduleUpdate();
        window.addEventListener('resize', resizeHandler, { passive: true });
        this.similarSectionCleanup.push(() => {
            window.removeEventListener('resize', resizeHandler);
            if (grid._similarLayoutFrame) cancelAnimationFrame(grid._similarLayoutFrame);
        });

        cards.forEach(card => {
            const img = card.querySelector('img');
            if (img && !img.complete) {
                const onLoad = () => scheduleUpdate();
                img.addEventListener('load', onLoad, { once: true });
                img.addEventListener('error', onLoad, { once: true });
            }
        });

        scheduleUpdate();
        setTimeout(scheduleUpdate, 80);

        if (toggleBtn) {
            const onToggleClick = (ev) => {
                ev.preventDefault();
                const expanded = toggleBtn.dataset.expanded === 'true';
                const collapsedHeight = parseFloat(grid.dataset.collapsedHeight || '0');
                const expandedHeight = parseFloat(grid.dataset.expandedHeight || '0');
                if (expanded) {
                    toggleBtn.dataset.expanded = 'false';
                    grid.dataset.state = 'collapsed';
                    section.classList.remove('is-expanded');
                    grid.style.maxHeight = `${collapsedHeight}px`;
                } else {
                    toggleBtn.dataset.expanded = 'true';
                    grid.dataset.state = 'expanded';
                    section.classList.add('is-expanded');
                    grid.style.maxHeight = `${expandedHeight}px`;
                }
                scheduleUpdate();
                detailsInstance.scrollElementIntoView(toggleBtn, { behavior: 'smooth', block: 'start', offset: 16 });
            };
            const onToggleKey = (ev) => {
                if (ev.key !== 'Enter' && ev.key !== ' ') return;
                ev.preventDefault();
                onToggleClick(ev);
            };
            toggleBtn.addEventListener('click', onToggleClick);
            toggleBtn.addEventListener('keydown', onToggleKey);
            this.similarSectionCleanup.push(() => {
                toggleBtn.removeEventListener('click', onToggleClick);
                toggleBtn.removeEventListener('keydown', onToggleKey);
            });
        }

        if (cleanupFns.length) {
            this.similarSectionCleanup.push(() => {
                cleanupFns.forEach(fn => {
                    try {
                        fn();
                    } catch (err) {}
                });
            });
        }
    }

    async insertSimilarSection(item) {
        try {
            this.cleanupSimilarSection();
            const placeholder = this.detailsModalBody ? this.detailsModalBody.querySelector('.details-modal-similar-placeholder') : null;
            if (!placeholder) return;
            placeholder.innerHTML = `<div class="details-modal-similar-loading"><div class="skeleton-spinner"></div></div>`;
            const similarItems = await this.findSimilarItems(item);
            if (!similarItems || similarItems.length === 0) {
                placeholder.innerHTML = '';
                return;
            }
            const section = this.createSimilarSectionElement(similarItems);
            if (!section) {
                placeholder.innerHTML = '';
                return;
            }
            placeholder.replaceWith(section);
            this.setupSimilarSection(section, similarItems);
        } catch (err) {
            console.warn('DetailsModal: insertSimilarSection error', err);
            try {
                const placeholder = this.detailsModalBody ? this.detailsModalBody.querySelector('.details-modal-similar-placeholder') : null;
                if (placeholder) placeholder.innerHTML = '';
            } catch (err2) {}
        }
    }

    // Inserta la sección de episodios debajo de la sinopsis (si aplica)
    async insertEpisodesSection(item) {
        try {
            this.cleanupEpisodesSection();
            let sectionHtml = await this.getEpisodesSection(item);
            if (!sectionHtml) {
                await new Promise(r => setTimeout(r, 200));
                sectionHtml = await this.getEpisodesSection(item);
                if (!sectionHtml) return;
            }
            this._mountEpisodesSection(sectionHtml, item);
        } catch (err) {
            console.error('DetailsModal: error insertando sección de episodios', err);
        }
    }

    // Construye la sección HTML de episodios para el item actual
    async getEpisodesSection(item) {
        // Solo aplicable si hay un título de episodio o la categoría indica series/animes
        console.log('DetailsModal: getEpisodesSection llamado para item:', item && (item['Título'] || item.title));
        if (!item) return '';
    // No depender de la categoría del item: mostrar episodios si existen entradas relacionadas con el mismo título
    const itemEpisodeTitle = (item['Título episodio'] || item['Título episodio'] === 0) ? String(item['Título episodio']).trim() : '';

        const allData = await this.loadAllData();
        console.log('DetailsModal: getEpisodesSection -> datos cargados, total items:', Array.isArray(allData) ? allData.length : 0);
        if (!Array.isArray(allData) || allData.length === 0) return '';

        // Agrupar por el campo 'Título' y filtrar por coincidencias en 'Categoría' de tipo serie
        const normalizedTitle = (item['Título'] || item.title || '').trim();
        // Intentar identificar por ID TMDB también
        const itemTMDB = (item['ID TMDB'] || item.id_tmdb || item.tmdbId || (item.tmdbUrl ? (item.tmdbUrl.match(/movie\/(\d+)/)?.[1]) : null) || (item.tmdbUrl ? (item.tmdbUrl.match(/series\/(\d+)/)?.[1]) : null)) || '';
        const targetNormalized = this.normalizeText(normalizedTitle || '');
        console.log('DetailsModal: getEpisodesSection -> buscando episodios para title:', normalizedTitle, 'tmdb:', itemTMDB);

        // Buscar relacionados por varias heurísticas
        const related = allData.filter(d => {
            if (!d) return false;
            const title = (d['Título'] || '').trim();
            const hasEpisode = (d['Título episodio'] || '').toString().trim() !== '';
            if (!hasEpisode) return false;

            // Coincidencia por ID TMDB si existe
            const dTMDB = (d['ID TMDB'] || '').toString().trim();
            if (itemTMDB && dTMDB && itemTMDB.toString() === dTMDB) return true;

            if (!title) return false;
            const titleNormalized = this.normalizeText(title);
            if (targetNormalized && (titleNormalized === targetNormalized)) return true;
            // coincidencia parcial si uno contiene al otro
            if (targetNormalized && (titleNormalized.includes(targetNormalized) || targetNormalized.includes(titleNormalized))) return true;

            return false;
        });
        console.log('DetailsModal: getEpisodesSection -> relacionados encontrados:', related.length, related.map(r => r['Título episodio']));

        if (!related || related.length === 0) return '';

        // Extraer y ordenar por 'Temporada' y 'Episodios' cuando estén presentes
        const episodes = related
            .map(d => ({
                title: d['Título episodio'] || '',
                season: d['Temporada'] ? Number(d['Temporada']) : null,
                episodeIndex: d['Episodios'] ? Number(d['Episodios']) : null,
                video: d['Video iframe'] || d['Video iframe 1'] || d['Ver Película'] || '',
                thumb: d['Portada'] || d['Carteles'] || '',
                synopsis: d['Synopsis'] || d['Sinopsis'] || d['Descripción'] || ''
            }))
            .filter(e => e.title && e.title.trim() !== '')
            .sort((a, b) => {
                if (a.season !== null && b.season !== null && a.season !== b.season) return a.season - b.season;
                if (a.episodeIndex !== null && b.episodeIndex !== null) return a.episodeIndex - b.episodeIndex;
                return a.title.localeCompare(b.title, undefined, {numeric: true});
            });

        if (episodes.length === 0) return '';

        // Construir HTML de la sección
        // Construir cards con miniatura, título y sinopsis
        // Calcular temporadas únicas (omitimos null/undefined)
        const seasonsSet = new Set(episodes.map(e => e.season).filter(s => s !== null && s !== undefined && !Number.isNaN(s)));
        const seasons = Array.from(seasonsSet).sort((a,b)=>a-b);

        const listItems = episodes.map(ep => {
            const playBtnInner = ep.video ? `<button type="button" class="details-modal-episode-play" data-video-url="${ep.video}" aria-label="Reproducir episodio"><svg xmlns="http://www.w3.org/2000/svg" id="CLOSE" fill="PR_WHITE" viewBox="0 0 24 24" class="chevplay"><polygon points="8 5 8 19 19 12"></polygon></svg></button>` : '';
            const episodeNumber = ep.episodeIndex ? `<div class="details-modal-episode-number">${ep.episodeIndex}</div>` : '';
            const thumbImg = ep.thumb ? `<div class="details-modal-episode-thumb">${episodeNumber}<img src="${ep.thumb}" loading="lazy" alt="${ep.title}"><div class="details-modal-play-overlay">${playBtnInner}</div></div>` : `<div class="details-modal-episode-thumb placeholder">${episodeNumber}<div class="details-modal-play-overlay">${playBtnInner}</div></div>`;
            const synopsisHtml = ep.synopsis ? `<div class="details-modal-episode-synopsis">${ep.synopsis}</div>` : '';
            // Añadir atributo data-season para filtrado
            const seasonAttr = ep.season !== null && ep.season !== undefined ? `data-season="${ep.season}"` : 'data-season=""';
            // Preparar hash para este episodio (usar id del item si disponible, sino title normalizado y capítulo)
            const epHash = ep.episodeIndex ? `ep=${ep.episodeIndex}` : '';
            const titleHashAttr = `data-ep-hash="${epHash}"`;
            // agregar data-ep-hash al contenedor de la tarjeta para acceso desde los botones
            return `<div class="details-modal-episode-item" ${seasonAttr} data-video-url="${ep.video || ''}" data-ep-hash="${epHash}">${thumbImg}<div class="details-modal-episode-meta"><div class="details-modal-episode-title" ${titleHashAttr}>${ep.title}</div>${synopsisHtml}</div></div>`;
        }).join('');

        // Construir header con selector de temporadas si hay más de una temporada
        let headerHtml = `<div class="details-modal-episodes-header"><h3 class="details-modal-episodes-title">Episodios</h3>`;
        if (seasons.length > 0) {
            headerHtml += `<div class="details-modal-season-filter"><label for="season-select">Temporada</label><div class="season-select-wrapper"><select id="season-select" class="details-modal-season-select"><option value="all">Todas</option>`;
            seasons.forEach(s => {
                headerHtml += `<option value="${s}">Temporada ${s}</option>`;
            });
            headerHtml += `</select><svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div></div>`;
        }
        headerHtml += `</div>`;

    const section = `<div class="details-modal-episodes">${headerHtml}<div class="details-modal-episodes-list-wrapper"><div class="details-modal-episodes-list" data-state="collapsed">${listItems}</div><div class="details-modal-episodes-fade"></div></div><div class="details-modal-episodes-toggle-wrapper"><button type="button" class="details-modal-episodes-toggle" data-expanded="false" aria-expanded="false"><span class="label-expand">Ver más</span><span class="label-collapse">Ver menos</span><svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div></div>`;

        // Estilos para el header del selector (inserción segura si no existe)
        const styleHeaderExists = !!document.getElementById('details-modal-episodes-header-styles');
        if (!styleHeaderExists) {
            const sh = document.createElement('style');
            sh.id = 'details-modal-episodes-header-styles';
            sh.innerHTML = `
                .details-modal-episodes-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
                .details-modal-season-filter{display:flex;align-items:center;gap:8px}
                .details-modal-season-select{background:transparent;border:1px solid rgba(255,255,255,0.06);padding:8px 10px;border-radius:6px;color:inherit}
            `;
            document.head.appendChild(sh);
        }

        return section;
    }

    // Buscar un episodio dentro de la data global por número y abrir el player si se encuentra
    async openEpisodeByNumber(item, epNumber) {
        try {
            if (!item || !epNumber) return null;
            const allData = await this.loadAllData();
            if (!Array.isArray(allData) || allData.length === 0) return null;

            const normalizedTitle = (item['Título'] || item.title || '').trim();
            const targetNormalized = this.normalizeText(normalizedTitle || '');

            // Buscar coincidentes que tengan 'Título episodio' y coincidan con el título del item
            const related = allData.filter(d => {
                if (!d) return false;
                const title = (d['Título'] || '').trim();
                const hasEpisode = (d['Título episodio'] || '').toString().trim() !== '';
                if (!hasEpisode) return false;
                const dTMDB = (d['ID TMDB'] || '').toString().trim();
                const itemTMDB = (item['ID TMDB'] || item.id_tmdb || item.tmdbId || '') || '';
                if (itemTMDB && dTMDB && itemTMDB.toString() === dTMDB) return true;
                if (!title) return false;
                const titleNormalized = this.normalizeText(title);
                if (titleNormalized === targetNormalized) return true;
                if (titleNormalized.includes(targetNormalized) || targetNormalized.includes(titleNormalized)) return true;
                return false;
            });

            if (!related || related.length === 0) {
                console.warn('DetailsModal: openEpisodeByNumber - no related entries found for item', item && (item.title || item['Título']));
                return false;
            }

            const episodes = related.map(d => ({
                title: d['Título episodio'] || '',
                season: d['Temporada'] ? Number(d['Temporada']) : null,
                episodeIndex: d['Episodios'] ? Number(d['Episodios']) : null,
                video: d['Video iframe'] || d['Video iframe 1'] || d['Ver Película'] || ''
            })).filter(e => e.title && e.title.trim() !== '');

            const epNum = Number(epNumber);
            let found = episodes.find(e => e.episodeIndex === epNum);
            if (!found) {
                // intentar por coincidencia parcial en título: buscar que el título del episodio contenga el número
                found = episodes.find(e => e.title && e.title.includes(String(epNum)));
            }

            // Loguear resumen de episodios encontrados para debugging
            console.log('DetailsModal: openEpisodeByNumber -> episodios candidatos:', episodes.map(e => ({episodeIndex: e.episodeIndex, title: e.title, hasVideo: !!e.video})).slice(0,50));
            if (found && found.video) {
                console.log('DetailsModal: reproducir episodio encontrado para ep=', epNumber, found);
                this.openEpisodePlayer(found.video);
                return true;
            }

            console.warn('DetailsModal: no se encontró episodio con video para ep=', epNumber);
            return false;
        } catch (err) {
            console.error('DetailsModal: openEpisodeByNumber error', err);
            return false;
        }
    }
}