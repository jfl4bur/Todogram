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
class DetailsModal {
    constructor() {
        this.detailsModalOverlay = document.getElementById('details-modal-overlay');
        this.detailsModalContent = document.getElementById('details-modal-content');
        this.detailsModalBackdrop = document.getElementById('details-modal-backdrop');
        this.detailsModalBody = document.getElementById('details-modal-body');
        this.detailsModalClose = document.getElementById('details-modal-close');
        this.activeItem = null;
        this.isDetailsModalOpen = false;
        this.TMDB_API_KEY = 'f28077ae6a89b54c86be927ea88d64d9';
        this.domCache = {}; // Cache para elementos DOM frecuentemente usados

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
        const prevMax = el.style.maxHeight;
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

    animateCollapse(el) {
        if (!el) return;
        el.style.transition = 'max-height 320ms ease, opacity 220ms ease';
        el.style.overflow = 'hidden';
        // measure current full height
        const fullHeight = el.scrollHeight;
        // set max-height to full height then to 0
        el.style.maxHeight = fullHeight + 'px';
        // force reflow
        void el.offsetHeight;
        requestAnimationFrame(() => {
            el.style.maxHeight = '0px';
        });
        const cleanup = () => {
            el.style.maxHeight = '';
            el.style.overflow = '';
            el.removeEventListener('transitionend', cleanup);
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
        this.isDetailsModalOpen = true;
        this.updateUrlForModal(item);
        
        this.detailsModalBody.innerHTML = `
            <div style="display:flex; justify-content:center; align-items:center; height:100%;">
                <div class="skeleton-spinner"></div>
            </div>
        `;
        
        this.detailsModalOverlay.style.display = 'block';
        this.detailsModalOverlay.classList.add('show');
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
        
        this.detailsModalBackdrop.src = backdropUrl;
        this.detailsModalBackdrop.onerror = function() {
            this.src = 'https://www.themoviedb.org/assets/2/v4/glyphicons/basic/glyphicons-basic-4-user-grey-d8fe957375e70239d6abdd549fd7568c89281b2179b5f4470e2e12895792dfa5.svg';
        };
        
    const trailerUrl = item.trailerUrl || (tmdbData?.trailer_url || '');
    const preferredVideo = item.videoUrl || item.videoIframe || item.videoIframe1 || item['Video iframe'] || item['Video iframe 1'] || '';
        
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
            console.log('DetailsModal: Agregando botón de reproducir con URL:', preferredVideo);
            actionButtons += `<button class="details-modal-action-btn primary big-btn" data-video-url="${preferredVideo}"><i class="fas fa-play"></i><span>Ver Película</span><span class="tooltip">Reproducir</span></button>`;
        } else {
            console.log('DetailsModal: No hay videoUrl disponible para:', item.title);
        }
        
        if (preferredVideo) {
            console.log('DetailsModal: Agregando botón de descargar con URL:', preferredVideo);
            secondaryButtons += `<button class="details-modal-action-btn circular" onclick="window.open('${this.generateDownloadUrl(preferredVideo)}', '_blank')"><i class="fas fa-download"></i><span class="tooltip">Descargar</span></button>`;
        }
        
        if (trailerUrl) {
            secondaryButtons += `<button class="details-modal-action-btn circular" data-video-url="${trailerUrl}"><i class="fas fa-film"></i><span class="tooltip">Ver Tráiler</span></button>`;
        }
        
        secondaryButtons += `<button class="details-modal-action-btn circular" id="share-button"><i class="fas fa-share-alt"></i><span class="tooltip">Compartir</span></button>`;
        
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
            ${directorsSection}
            ${writersSection}
            ${castSection}
            ${postersGallery}
            ${backdropsGallery}
        `;
        
        void this.detailsModalOverlay.offsetWidth;
        
        this.detailsModalOverlay.style.opacity = '1';
        this.detailsModalContent.style.transform = 'translateY(0)';
        this.detailsModalContent.style.opacity = '1';
        
        setTimeout(() => {
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
                        // Prefer passing the full item so video-modal can select candidate urls.
                        // If item is missing or doesn't contain candidates, fall back to the data attribute.
                        try {
                            const tried = (item && (item.videoUrl || item.videoIframe || item.videoIframe1));
                            if (item && tried) {
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

            // Long-press handling for mobile tooltips and to prevent tooltip from showing permanently
            const LONG_PRESS_MS = 520; // threshold for long-press
            this.detailsModalBody.querySelectorAll('.details-modal-action-btn').forEach(btn => {
                // Skip if already wired
                if (btn._longPressAttached) return;
                btn._longPressAttached = true;

                let longPressTimer = null;
                let longPressed = false;

                const clearLongPress = () => {
                    if (longPressTimer) {
                        clearTimeout(longPressTimer);
                        longPressTimer = null;
                    }
                };

                const onTouchStart = (e) => {
                    // Only start long-press for touch input
                    longPressed = false;
                    clearLongPress();
                    longPressTimer = setTimeout(() => {
                        longPressed = true;
                        btn.classList.add('active');
                        // Dispatch a custom event to allow other listeners react if needed
                        btn.dispatchEvent(new CustomEvent('longpress', { bubbles: true }));
                    }, LONG_PRESS_MS);
                };

                const onTouchEnd = (e) => {
                    clearLongPress();
                    // If it was a long-press, prevent the following click from triggering actions
                    if (longPressed) {
                        // remove active after a short delay so user sees tooltip
                        setTimeout(() => btn.classList.remove('active'), 600);
                        // prevent the synthesized click
                        e.preventDefault();
                        e.stopPropagation();
                        // mark to suppress next click
                        btn._suppressNextClick = true;
                        setTimeout(() => btn._suppressNextClick = false, 300);
                    }
                };

                const onTouchCancel = (e) => {
                    clearLongPress();
                };

                const onClick = (e) => {
                    if (btn._suppressNextClick) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                    }
                    // For non-touch or normal clicks, ensure tooltip class is not permanently left
                    btn.classList.remove('active');
                };

                btn.addEventListener('touchstart', onTouchStart, { passive: true });
                btn.addEventListener('touchend', onTouchEnd);
                btn.addEventListener('touchcancel', onTouchCancel);
                btn.addEventListener('click', onClick);
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
                    const item = window.activeItem || null;
                    // Ensure ShareModal exists if not created elsewhere
                    try {
                        if (!window.shareModal && typeof ShareModal === 'function') {
                            window.shareModal = new ShareModal();
                        }
                    } catch (err) { /* ignore */ }

                    if (item && window.shareModal) {
                        const currentUrl = window.location.href;
                        let shareUrl = null;
                        try { shareUrl = (typeof window.generateShareUrl === 'function') ? window.generateShareUrl(item, currentUrl) : null; }
                        catch(err) { console.warn('details-modal: generateShareUrl fallback', err); shareUrl = null; }
                        window.shareModal.show({ ...item, shareUrl });
                    } else if (item && !window.shareModal) {
                        // As fallback, open the share URL in a new tab if possible
                        try {
                            let fallbackUrl = item.shareUrl || window.location.href;
                            window.open(fallbackUrl, '_blank');
                        } catch (err) {
                            console.warn('details-modal: share fallback failed', err);
                        }
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
        this.detailsModalContent.style.transform = 'translateY(20px)';
        this.detailsModalContent.style.opacity = '0';
        this.detailsModalOverlay.style.opacity = '0';
        
        setTimeout(() => {
            this.detailsModalOverlay.style.display = 'none';
            this.detailsModalOverlay.classList.remove('show');
            document.body.style.overflow = 'auto';
            this.isDetailsModalOpen = false;
            window.activeItem = null;
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
        if (!item || item.id === '0') return;
        const normalizedTitle = this.normalizeText(item.title);
        // Construir nuevo hash con id y title pero preservar parámetros adicionales existentes (ej. ep)
        const newHashBase = `id=${item.id}&title=${normalizedTitle}`;
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
        const newHash = newHashBase + extras;
        if (window.location.hash.substring(1) !== newHash) {
            window.history.replaceState(null, null, `${window.location.pathname}#${newHash}`);
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
        if (window.location.hash) {
            window.history.replaceState(null, null, window.location.pathname);
        }
    }

    updateMetaTags(item) {
        if (!item) return;
        const title = `Mira ${item.title} en nuestra plataforma`;
        const description = item.description || 'Una gran película que no te puedes perder';
        const imageUrl = item.posterUrl || 'https://via.placeholder.com/194x271';
        const url = `${window.location.origin}${window.location.pathname}#id=${item.id}&title=${this.normalizeText(item.title)}`;
        
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
        return `<div class="details-modal-crew"><h3 class="details-modal-crew-title">${title}</h3><div class="details-modal-crew-list">${crew.slice(0, 6).map(person => `<div class="details-modal-crew-item"><img class="details-modal-crew-photo" src="${person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : 'https://www.themoviedb.org/assets/2/v4/glyphicons/basic/glyphicons-basic-4-user-grey-d8fe957375e70239d6abdd549fd7568c89281b2179b5f4470e2e12895792dfa5.svg'}" alt="${person.name}" loading="lazy"><div class="details-modal-crew-info"><div class="details-modal-crew-name">${person.name}</div><div class="details-modal-crew-role">${title}</div></div></div>`).join('')}</div></div>`;
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

    // Inserta la sección de episodios debajo de la sinopsis (si aplica)
    async insertEpisodesSection(item) {
        try {
            const sectionHtml = await this.getEpisodesSection(item);
            if (!sectionHtml) {
                // Si no hay sección, opcionalmente insertar texto que indique que no hay episodios
                // Reintentar una vez después de un pequeño delay por si la data llega justo después
                await new Promise(r => setTimeout(r, 200));
                const sectionHtml2 = await this.getEpisodesSection(item);
                if (!sectionHtml2) return;
                // Si ahora hay sección, usarla
                desc && desc.insertAdjacentHTML('afterend', sectionHtml2);
                return;
            }
            // Buscar el nodo de descripción actual y añadir la sección después
            const desc = this.detailsModalBody.querySelector('.details-modal-description');
            if (!desc) {
                // Si no existe la descripción, anexar al final
                this.detailsModalBody.insertAdjacentHTML('beforeend', sectionHtml);
                return;
            }
            desc.insertAdjacentHTML('afterend', sectionHtml);

            // Añadir listeners para botones de episodio (si los hay)
            const container = this.detailsModalBody.querySelector('.details-modal-episodes-list');
            if (container) {
                container.querySelectorAll('.details-modal-episode-play').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const url = btn.getAttribute('data-video-url');
                        // Abrir player embebido en pantalla completa
                        if (url) this.openEpisodePlayer(url);
                    });
                });
                // Click en la tarjeta del episodio abre también el player (si no se pulsa el botón)
                container.querySelectorAll('.details-modal-episode-item').forEach(card => {
                    card.addEventListener('click', (e) => {
                        // Si el click fue en el botón, ya manejado
                        if (e.target.closest('.details-modal-episode-play')) return;
                        const url = card.getAttribute('data-video-url');
                        if (url) this.openEpisodePlayer(url);
                    });
                });
                // Inicializar sinopsis de episodios como colapsadas y añadir toggle
                container.querySelectorAll('.details-modal-episode-synopsis').forEach(syn => {
                    syn.classList.add('collapsed');
                    syn.style.maxHeight = 'calc(1.5em * 4)';
                    syn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.toggleSynopsisElement(syn);
                    });
                });
                // Añadir listener en títulos para actualizar hash del navegador
                const outerItem = item;
                container.querySelectorAll('.details-modal-episode-title').forEach(titleEl => {
                    titleEl.style.cursor = 'pointer';
                    titleEl.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const epHash = titleEl.getAttribute('data-ep-hash') || '';
                        const currentItem = window.activeItem || outerItem;
                        const baseId = currentItem?.id || currentItem?.['ID TMDB'] || '';
                        const normalized = currentItem ? this.normalizeText(currentItem.title || currentItem['Título'] || '') : '';
                        const newHash = this.buildModalHash(baseId, normalized, epHash ? {ep: epHash.replace(/^ep=/,'')} : {});
                        if (window.location.hash.substring(1) !== newHash) {
                            window.history.replaceState(null, null, `${window.location.pathname}#${newHash}`);
                        }
                        // además abrir el reproductor si la tarjeta tiene URL de video
                        const card = titleEl.closest('.details-modal-episode-item');
                        const videoUrl = card ? card.getAttribute('data-video-url') : null;
                        if (videoUrl) this.openEpisodePlayer(videoUrl);
                    });
                });
            }
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
            const playBtnInner = ep.video ? `<button class="details-modal-episode-play" data-video-url="${ep.video}" aria-label="Reproducir episodio"><i class="fas fa-play"></i></button>` : '';
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
            headerHtml += `<div class="details-modal-season-filter"><label for="season-select">Temporada</label><select id="season-select" class="details-modal-season-select"><option value="all">Todas</option>`;
            seasons.forEach(s => {
                headerHtml += `<option value="${s}">Temporada ${s}</option>`;
            });
            headerHtml += `</select></div>`;
        }
        headerHtml += `</div>`;

        const section = `<div class="details-modal-episodes">${headerHtml}<div class="details-modal-episodes-list">${listItems}</div></div>`;

        // Delegar listeners para reproducir si hay video
        // (se añadirá en el setTimeout posterior que añade listeners a botones existentes)
        setTimeout(() => {
            const container = this.detailsModalBody.querySelector('.details-modal-episodes-list');
            if (!container) return;
            container.querySelectorAll('.details-modal-episode-play').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const card = btn.closest('.details-modal-episode-item');
                    const url = btn.getAttribute('data-video-url') || (card ? card.getAttribute('data-video-url') : null);
                    // actualizar hash para este episodio
                    try {
                        const outerItem = item;
                        const currentItem = window.activeItem || outerItem;
                        const baseId = currentItem?.id || currentItem?.['ID TMDB'] || '';
                        const normalized = currentItem ? this.normalizeText(currentItem.title || currentItem['Título'] || '') : '';
                        const epHash = card ? (card.getAttribute('data-ep-hash') || '') : '';
                        const newHash = this.buildModalHash(baseId, normalized, epHash ? {ep: epHash.replace(/^ep=/,'')} : {});
                        if (window.location.hash.substring(1) !== newHash) {
                            window.history.replaceState(null, null, `${window.location.pathname}#${newHash}`);
                        }
                    } catch (err) {
                        console.warn('DetailsModal: no se pudo actualizar hash de episodio', err);
                    }
                    if (url) this.openEpisodePlayer(url);
                });
            });
            // Inicializar filtro de temporada si existe
            const seasonSelect = this.detailsModalBody.querySelector('#season-select');
            if (seasonSelect) {
                seasonSelect.addEventListener('change', (e) => {
                    const val = seasonSelect.value;
                    const items = this.detailsModalBody.querySelectorAll('.details-modal-episode-item');
                    items.forEach(it => {
                        const s = it.getAttribute('data-season');
                        if (val === 'all') {
                            it.style.display = '';
                        } else {
                            if (String(s) === String(val)) it.style.display = '';
                            else it.style.display = 'none';
                        }
                    });
                });
            }
            // Click en la tarjeta del episodio abre también el player (si no se pulsa el botón)
            container.querySelectorAll('.details-modal-episode-item').forEach(card => {
                card.addEventListener('click', (e) => {
                    // Si el click fue en el botón, ya manejado
                    if (e.target.closest('.details-modal-episode-play')) return;
                    const url = card.getAttribute('data-video-url');
                    // actualizar hash para este episodio al click en la tarjeta
                    try {
                        const outerItem = item;
                        const currentItem = window.activeItem || outerItem;
                        const baseId = currentItem?.id || currentItem?.['ID TMDB'] || '';
                        const normalized = currentItem ? this.normalizeText(currentItem.title || currentItem['Título'] || '') : '';
                        const epHash = card.getAttribute('data-ep-hash') || '';
                        const newHash = this.buildModalHash(baseId, normalized, epHash ? {ep: epHash.replace(/^ep=/,'')} : {});
                        if (window.location.hash.substring(1) !== newHash) {
                            window.history.replaceState(null, null, `${window.location.pathname}#${newHash}`);
                        }
                    } catch (err) {
                        console.warn('DetailsModal: no se pudo actualizar hash de episodio (card click)', err);
                    }
                    if (url) this.openEpisodePlayer(url);
                });
            });
        }, 300);

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