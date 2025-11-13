function normalizeHoverIframe(value){
    try{
        const raw = String(value || '').trim();
        if(!raw) return '';
        const lower = raw.toLowerCase();
        if(lower.includes('<iframe') && lower.includes('src=')) return raw;
        if(/^https?:\/\//i.test(raw) || raw.startsWith('//')) return raw;
        return '';
    }catch(e){ return ''; }
}

function pickHoverPreferredVideo(){
    for(let i=0;i<arguments.length;i++){
        const normalized = normalizeHoverIframe(arguments[i]);
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

const DEFAULT_MODAL_BACKDROP_PLACEHOLDER = 'https://www.themoviedb.org/assets/2/v4/glyphicons/basic/glyphicons-basic-4-user-grey-d8fe957375e70239d6abdd549fd7568c89281b2179b5f4470e2e12895792dfa5.svg';

class HoverModal {
    constructor() {
        this.modalOverlay = document.getElementById('modal-overlay');
        this.modalContent = document.getElementById('modal-content');
        this.modalBackdrop = document.getElementById('modal-backdrop');
        this.modalBody = document.getElementById('modal-body');
        this.modalHeader = this.modalContent ? this.modalContent.querySelector('.modal-header') : null;
    // Try common carousel/container selectors; fallback to body so positioning still works
    this.carouselContainer = document.querySelector('.carousel-container') || document.querySelector('.catalogo-grid') || document.querySelector('#catalogo-grid-page') || document.body;
        this.activeItem = null;
        this.hoverModalItem = null;
        this.hoverModalOrigin = { x: 0, y: 0 };
    this.hoverModalTimeout = null;
    this.isVisible = false;
    this._isInsideDetailsContext = false;

        if (!this.modalOverlay || !this.modalContent) {
            console.error("Elementos del hover modal no encontrados");
            return;
        }
        if (!this.carouselContainer) {
            console.warn('HoverModal: carousel container no encontrado — usando document.body como fallback');
            this.carouselContainer = document.body;
        }
        // Bind handlers once to avoid multiple attachments when show() is called repeatedly
        this._onMouseLeave = this._onMouseLeave.bind(this);
        this._onContentClick = this._onContentClick.bind(this);
    this._onMouseEnter = this._onMouseEnter.bind(this);
        // scroll/resize handlers to keep modal aligned with its origin while visible
        this._onScroll = this._onScroll.bind(this);
        this._onResize = this._onResize.bind(this);
        this._pendingRAF = false;
    // track the currently shown item and its origin element
        this._currentItem = null;
        this._currentOrigin = null;
    // portal element used to render a cloned origin in document.body so it can
    // escape any overflow: hidden/auto ancestors without breaking carousel scroll
    this._portalEl = null;
    this._portalTimeout = null;
    // whether the portal is currently animating back to origin
    this._portalAnimating = false;
    // remember original parent so we can restore DOM position
    this._originalParent = this.modalContent.parentElement;
    this._carouselPositionChanged = false;
    // whether we rendered the visual via portal clone
    this._portalActive = false;
        this._hoverBackdropLoadHandler = null;
        this._hoverBackdropErrorHandler = null;
        this._hoverBackdropFallbackApplied = false;

        // Attach delegated listeners once
        this.modalContent.addEventListener('mouseenter', this._onMouseEnter);
        this.modalContent.addEventListener('mouseleave', this._onMouseLeave);
        this.modalContent.addEventListener('click', this._onContentClick);
    }

    show(item, itemElement) {
        if (!itemElement || !(itemElement instanceof HTMLElement)) {
            console.error('itemElement no válido');
            return;
        }

        let allowInsideDetails = false;
        try {
            allowInsideDetails = !!(itemElement.dataset && itemElement.dataset.allowHoverInsideDetails === 'true');
        } catch (e) {}

        this._isInsideDetailsContext = allowInsideDetails;

        if (allowInsideDetails) {
            try {
                this.modalOverlay.style.zIndex = '13010';
                this.modalContent.style.zIndex = '13011';
            } catch (e) {}
        } else {
            try {
                this.modalOverlay.style.zIndex = '';
                this.modalContent.style.zIndex = '';
            } catch (e) {}
        }

        if (!allowInsideDetails) {
            // If details modal is open, do not show hover to avoid intercepting clicks
            try {
                if (window.detailsModal && window.detailsModal.isDetailsModalOpen) return;
            } catch (e) {}
        }

        // Evitar mostrar si ya está visible

            // If already visible, cancel any pending hide and continue to update content/position
            if (this.isVisible) {
                this.cancelHide();
            }

    // cancel any pending hide
    this.cancelHide();
    window.isModalOpen = true;
    this.isVisible = true;
        
        // Usar postersUrl como prioridad (campo "Carteles")
        const backdropUrl = item.postersUrl || item.backgroundUrl || item.posterUrl;
        
        this._setHoverBackdropImage(backdropUrl);
        
    const trailerUrl = item.trailerUrl;
    // REGLA ESTRICTA: Sólo considerar iframes/URLs válidos para mostrar el botón principal
    const preferredVideo = pickHoverPreferredVideo(item['Video iframe'], item['Video iframe 1'], item.videoIframe, item.videoIframe1, item.videoUrl);
    const primaryLabel = determinePrimaryActionLabel(item);
        
        let metaItems = [];
        
        if (item.year) metaItems.push(`<span>${item.year}</span>`);
        if (item.duration) metaItems.push(`<span>${item.duration}</span>`);
        if (item.rating) metaItems.push(`<div class="rating"><i class="fas fa-star"></i><span>${item.rating}</span></div>`);
        
        // CORRECCIÓN: Asegurar que se muestra age-rating si existe
        if (item.ageRating && item.ageRating.trim() !== '') {
            metaItems.push(`<span class="age-rating">${item.ageRating}</span>`);
        }
        
        let genreInfo = '';
        if (item.genre) {
            genreInfo = `<div class="genre-info">${item.genre}</div>`;
        }
        
        let actionButtons = '';
        
        if (preferredVideo) {
            actionButtons += `
                <div class="primary-action-row">
                    <button class="details-modal-action-btn primary" data-video-url="${preferredVideo}">
                        <i class="fas fa-play"></i>
                        <span>${primaryLabel}</span>
                        <span class="tooltip">Reproducir</span>
                    </button>
                </div>
            `;
        } else {
            actionButtons += `
                <div class="primary-action-row">
                    <button class="details-modal-action-btn primary" data-open-details="true">
                        <i class="fas fa-info-circle"></i>
                        <span>Ver Detalles</span>
                        <span class="tooltip">Más información</span>
                    </button>
                </div>
            `;
        }
        
        let secondaryButtons = '<div class="secondary-actions-row">';
        
        // Nota: eliminamos el botón de "Descargar" del hover modal para mantener
        // la descarga únicamente en el modal de detalles. Si se necesita reactivar
        // en el futuro, restaurar el bloque de abajo.
        
        if (trailerUrl) {
            secondaryButtons += `
                <button class="details-modal-action-btn circular" data-video-url="${trailerUrl}">
                    <svg class="chevtrailer" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><path d="M2.64092 22C1.73625 22 1 21.2522 1 20.332V3.66802C1 2.74777 1.73625 2 2.64092 2H21.3591C22.2637 2 23 2.74777 23 3.66802V20.332C23 21.2522 22.2637 22 21.3591 22H2.64092ZM1.93084 21.0404H22.0566V10.0958H1.93084V21.0404ZM20.4248 9.14782H22.0555V2.9596H16.3749L20.426 9.14782H20.4248ZM14.5803 9.14782H19.3028L15.2494 2.9596H10.5292L14.5803 9.14782ZM8.73465 9.14782H13.456L9.4049 2.9596H4.68355L8.73465 9.14782ZM1.94336 9.14782H7.61035L3.55925 2.9596H1.94222V9.14782H1.94336Z" fill="#F0F0F0"></path><path d="M11 13L14 15.0007L11 17V13Z" fill="#F0F0F0"></path></g></svg>
                    <span class="tooltip">Ver Tráiler</span>
                </button>
            `;
        }
        
        secondaryButtons += `
                <button class="details-modal-action-btn circular" id="share-button">
                    <svg class="chevcomartir" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3.75,12.5 C3.75,11.4665 4.59075,10.625 5.625,10.625 C6.65925,10.625 7.5,11.4665 7.5,12.5 C7.5,13.5343 6.65925,14.375 5.625,14.375 C4.59075,14.375 3.75,13.5343 3.75,12.5 Z M16.5,18.875 C16.5,17.8407 17.3407,17 18.375,17 C19.4093,17 20.25,17.8407 20.25,18.875 C20.25,19.9093 19.4093,20.75 18.375,20.75 C17.3407,20.75 16.5,19.9093 16.5,18.875 Z M16.5,6.125 C16.5,5.0915 17.3407,4.25 18.375,4.25 C19.4093,4.25 20.25,5.0915 20.25,6.125 C20.25,7.1585 19.4093,8 18.375,8 C17.3407,8 16.5,7.1585 16.5,6.125 Z M2.25,12.5 C2.25,14.3638 3.76125,15.875 5.625,15.875 C6.612,15.875 7.49175,15.4437 8.109,14.768 L15.0638,18.245 C15.0248,18.4497 15,18.659 15,18.875 C15,20.7388 16.5112,22.25 18.375,22.25 C20.2388,22.25 21.75,20.7388 21.75,18.875 C21.75,17.0112 20.2388,15.5 18.375,15.5 C17.2642,15.5 16.287,16.0445 15.672,16.8725 L8.84475,13.4585 C8.93625,13.1532 9,12.8352 9,12.5 C9,12.1648 8.93625,11.8468 8.84475,11.5415 L15.672,8.1275 C16.287,8.95625 17.2642,9.5 18.375,9.5 C20.2388,9.5 21.75,7.98875 21.75,6.125 C21.75,4.26125 20.2388,2.75 18.375,2.75 C16.5112,2.75 15,4.26125 15,6.125 C15,6.341 15.0248,6.55025 15.0638,6.75425 L8.109,10.232 C7.49175,9.55625 6.612,9.125 5.625,9.125 C3.76125,9.125 2.25,10.6363 2.25,12.5 Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                    <span class="tooltip">Compartir</span>
                </button>
            </div>
        `;
        
        this.modalBody.innerHTML = `
            <div class="hover-title-wrapper">
                <span class="hover-title">${item.title}</span>
            </div>
            <div class="meta-info">
                ${metaItems.join('')}
            </div>
            ${genreInfo}
            <div class="modal-actions">
                ${actionButtons}
                ${secondaryButtons}
            </div>
            <p class="description">${item.description}</p>
        `;
        
        // show overlay first so computed styles (width) are available for accurate positioning
        // Do not decide pointer-events until we know whether the modalContent will
        // remain inside the overlay or be moved into the carousel container.
        this.modalOverlay.style.display = 'block';
        // force reflow so computed sizes are correct
        void this.modalContent.offsetWidth;

        // Determine the best container for positioning based on the hovered item.
        // This addresses cases where HoverModal was instantiated before the
        // catalog DOM existed (so constructor fallback picked body).
        try {
            const candidate = itemElement.closest('.carousel-container, .catalogo-grid, #catalogo-grid-page, .details-modal-body, .details-modal-content') || document.body;
            // update carouselContainer to the candidate for this show() call
            this.carouselContainer = candidate || document.body;
            // If possible, move the modalContent into the carouselContainer so the browser
            // will move it synchronously with container scrolling (no JS lag).
            if (this.carouselContainer && this.modalContent.parentElement !== this.carouselContainer && this.carouselContainer !== document.body) {
                const cs = getComputedStyle(this.carouselContainer);
                if (cs.position === 'static') {
                    this.carouselContainer.style.position = 'relative';
                    this._carouselPositionChanged = true;
                }
                this.carouselContainer.appendChild(this.modalContent);
            }
        } catch (e) {}

        const position = this.calculateModalPosition(itemElement);

        // position modal (keep transform for centering in CSS)
        this.modalContent.style.left = `${position.left}px`;
        this.modalContent.style.top = `${position.top}px`;

        // Compute modal start scale so it appears to grow from the item's size
        try {
            const rect = itemElement.getBoundingClientRect();
            const modalWidth = parseFloat(getComputedStyle(this.modalContent).width) || 1;
            const startScale = Math.max(0.25, Math.min(1, rect.width / modalWidth));
            this.modalContent.style.setProperty('--modal-start-scale', String(startScale));
        } catch (e) {}

        // Show the hover modal immediately (no wait). If a portal clone exists
        // it will animate under the modal; ensure modal gets the 'show' class.
        try {
            this.modalContent.classList.add('show');
        } catch (e) {}

        // Attach scroll/resize listeners only when necessary.
        // If modalContent is inside the same scroll container as the item, the
        // browser will move it natively during scroll and we don't need a window
        // scroll handler (avoids JS-driven lag). Otherwise keep listeners.
        if (this.modalContent.parentElement === this.carouselContainer && this.carouselContainer !== document.body) {
            // no global scroll listener needed
            window.addEventListener('resize', this._onResize);
        } else {
            window.addEventListener('scroll', this._onScroll, true);
            window.addEventListener('resize', this._onResize);
        }

    // If a portal clone exists, ensure it's positioned under the modal.
    // The portal will be appended to the modal's parent so it naturally
    // follows the modal (no scroll listeners required).

        // Decide whether overlay should accept pointer events. If modalContent
        // is inside the overlay (original behavior), let the overlay receive
        // pointer events so mouseenter/mouseleave on modal work. If we moved
        // the modal out, disable pointer events on the overlay so it doesn't
        // block clicks to the page (modalContent itself will receive events).
        try {
            if (this.modalContent.parentElement === this._originalParent) {
                this.modalOverlay.style.pointerEvents = 'auto';
            } else {
                this.modalOverlay.style.pointerEvents = 'none';
            }
        } catch (e) {}

        // Store current item and origin for use by delegated handlers
        // remove hover class from previous origin (if any) and cancel any pending scale-down handlers
        try {
            // clean any leftover hover classes on elements other than the new origin
            const leftovers = document.querySelectorAll('.hover-zoom, .hover-zoom-closing');
            leftovers.forEach(el => {
                try {
                    if (el !== this._currentOrigin && el !== itemElement) {
                        el.classList.remove('hover-zoom');
                        el.classList.remove('hover-zoom-closing');
                        try { el.style.removeProperty('--hover-transform-origin'); } catch(e){}
                        try { el.style.removeProperty('--hover-translate-x'); } catch(e){}
                        if (el._scaleDownHandlerAttached && this._scaleDownHandler) {
                            try { el.removeEventListener('transitionend', this._scaleDownHandler); } catch(e){}
                            el._scaleDownHandlerAttached = false;
                        }
                    }
                } catch (e) {}
            });

                    if (this._currentOrigin && this._currentOrigin.classList) {
                try { this._currentOrigin.classList.remove('hover-zoom-closing'); } catch(e){}
                if (this._scaleDownHandler && this._currentOrigin._scaleDownHandlerAttached) {
                    try { this._currentOrigin.removeEventListener('transitionend', this._scaleDownHandler); } catch(e){}
                    this._currentOrigin._scaleDownHandlerAttached = false;
                    this._scaleDownHandler = null;
                }
            }
        } catch(e){}
    const previousOrigin = this._currentOrigin;
    this._currentItem = item;
    this._currentOrigin = itemElement;
        // add hover-zoom class to keep the item scaled while hover modal is visible
        try {
            if (this._currentOrigin && this._currentOrigin.classList) {
                // detect if this item belongs to an "episodios" carousel where scaling causes layout issues
                const isEpisodios = !!itemElement.closest('#episodios-series-carousel-wrapper, #episodios-animes-carousel-wrapper, #episodios-documentales-carousel-wrapper, .episodios-series-item, .episodios-animes-item, .episodios-documentales-item');

                if (!isEpisodios) {
                    // determine if the item is near the left or right edge of its scroll container
                    try {
                        const container = itemElement.closest('.catalogo-grid, .carousel-container, #carousel-wrapper') || this.carouselContainer || document.body;
                        const cRect = container.getBoundingClientRect();
                        const iRect = itemElement.getBoundingClientRect();
                        const itemWidth = iRect.width || (iRect.right - iRect.left);
                        const leftDist = iRect.left - cRect.left;
                        const rightDist = cRect.right - iRect.right;
                        // choose threshold as 25% of item width to detect items at edges
                        const threshold = Math.max(8, itemWidth * 0.25);
                        let originVal = 'center center';
                        if (leftDist < threshold) originVal = 'left center';
                        else if (rightDist < threshold) originVal = 'right center';
                        this._currentOrigin.style.setProperty('--hover-transform-origin', originVal);
                        // small inward shift so scaled item keeps margin when near edges
                        try {
                            const translateAmt = `${Math.max(12, Math.round(itemWidth * 0.06))}px`;
                            if (originVal.indexOf('left') === 0) this._currentOrigin.style.setProperty('--hover-translate-x', translateAmt);
                            else if (originVal.indexOf('right') === 0) this._currentOrigin.style.setProperty('--hover-translate-x', `-${translateAmt}`);
                            else this._currentOrigin.style.setProperty('--hover-translate-x', '0px');
                        } catch (er2) {}
                    } catch (er) {}
                    // If possible, create a portal clone so the scaled item can escape
                    // any ancestor clipping (overflow:hidden/auto) without changing
                    // the carousel's overflow behavior which would break pagination.
                    try {
                        const shouldPortal = !isEpisodios;
                        if (shouldPortal) this._createPortalForOrigin(this._currentOrigin, previousOrigin);
                    } catch (pe) {}

                    // Only add hover class to the original origin if we did NOT
                    // create a portal clone. When portal is used the clone owns
                    // the visual animation and the origin must remain static/hidden.
                    if (!this._portalActive) {
                        this._currentOrigin.classList.add('hover-zoom');
                    }
                } else {
                    // ensure any residual variables are cleared for episodios items
                    try { this._currentOrigin.style.removeProperty('--hover-transform-origin'); } catch(e){}
                    try { this._currentOrigin.style.removeProperty('--hover-translate-x'); } catch(e){}
                }
            }
        } catch(e){}
        // Attempt to find a carousel wrapper ancestor to disable clipping while scaled
        // NOTE: exclude the top-level '#carousel-wrapper' element to avoid applying
        // the class to the main carousel root which can create layout conflicts.
        try {
            const wrapper = itemElement.closest('[id$="-carousel-wrapper"], .carousel-wrapper');
            if (wrapper) {
                // keep reference for cleanup, but do NOT add the class to avoid
                // changing overflow on global carousel wrappers which causes layout issues
                this._currentWrapper = wrapper;
                // also record parent section (but do not modify its classes)
                const section = wrapper.closest('.carousel-section');
                if (section) { this._currentSection = section; }
            }
        } catch (e) {}
        window.activeItem = item;
    }

    close() {
        // clear any pending hide timer
        this.cancelHide();
        this.isVisible = false;
        this._handleHoverBackdropSettled();
        // remove show class to trigger hide transition
        this.modalContent.classList.remove('show');

        // Wait for the modal's hide transition to finish, then scale the origin back after a small pause
        try {
            const modal = this.modalContent;
            // cleanup any previous handler
            try { if (this._modalCloseHandler) { modal.removeEventListener('transitionend', this._modalCloseHandler); this._modalCloseHandler = null; } } catch(e){}

            this._modalCloseHandler = (ev) => {
                // only react to opacity/transform endings
                if (ev && ev.propertyName && ev.propertyName.indexOf('opacity') === -1 && ev.propertyName.indexOf('transform') === -1) return;
                try {
                    // hide overlay immediately when modal finished closing
                    this.modalOverlay.style.display = 'none';
                    this.modalOverlay.style.pointerEvents = 'none';
                    try {
                        this.modalOverlay.style.zIndex = '';
                        this.modalContent.style.zIndex = '';
                    } catch (e) {}
                    this._isInsideDetailsContext = false;
                    // animate portal clone back to origin and restore origin visibility
                    try { this._removePortal(true); } catch (e) {}
                    window.isModalOpen = false;
                    window.activeItem = null;
                    window.hoverModalItem = null;
                } catch (e) {}

                // small micro-pause before scaling the origin back (in ms) - set to 0 for instant handoff
                const MICRO_PAUSE = 0;

                // start origin scale-down after micro-pause
                setTimeout(() => {
                    try {
                        const origin = this._currentOrigin;
                        // If we used a portal clone for the visual, skip scaling the
                        // original element back — the clone animates back instead.
                        if (this._portalActive) {
                            try {
                                if (this._currentWrapper && this._currentWrapper.classList) this._currentWrapper.classList.remove('hover-no-clip');
                                if (this._currentSection && this._currentSection.classList) this._currentSection.classList.remove('hover-no-clip');
                            } catch (e) {}
                        } else if (origin && origin.classList) {
                            // remove any previous scale-down handler on origin
                            try { if (this._scaleDownHandler && origin._scaleDownHandlerAttached) { origin.removeEventListener('transitionend', this._scaleDownHandler); origin._scaleDownHandlerAttached = false; } } catch(e){}

                            // handler to run once origin transform ends
                            this._scaleDownHandler = (e2) => {
                                if (e2 && e2.propertyName && e2.propertyName.indexOf('transform') === -1) return;
                                try {
                                    origin.classList.remove('hover-zoom');
                                    origin.classList.remove('hover-zoom-closing');
                                    try { origin.style.removeProperty('--hover-transform-origin'); } catch(e){}
                                    try { origin.style.removeProperty('--hover-translate-x'); } catch(e){}
                                } catch (e) {}
                                // restore wrapper clipping behaviour
                                try {
                                    if (this._currentWrapper && this._currentWrapper.classList) this._currentWrapper.classList.remove('hover-no-clip');
                                    if (this._currentSection && this._currentSection.classList) this._currentSection.classList.remove('hover-no-clip');
                                } catch (e) {}
                                // cleanup
                                try { origin.removeEventListener('transitionend', this._scaleDownHandler); origin._scaleDownHandlerAttached = false; } catch(e){}
                                this._scaleDownHandler = null;
                                this._currentWrapper = null;
                                this._currentSection = null;
                                this._currentItem = null;
                                this._currentOrigin = null;
                            };

                            origin.addEventListener('transitionend', this._scaleDownHandler);
                            origin._scaleDownHandlerAttached = true;
                            // trigger scale down while keeping z-index
                            origin.classList.add('hover-zoom-closing');

                            // fallback: si transitionend no se dispara, forzar la limpieza tras el tiempo de animación
                            // ahora alineado con la duración estándar del hover modal (~220ms)
                            setTimeout(() => {
                                try {
                                    if (this._scaleDownHandler) {
                                        try { origin.removeEventListener('transitionend', this._scaleDownHandler); } catch(e){}
                                        origin.classList.remove('hover-zoom');
                                        origin.classList.remove('hover-zoom-closing');
                                        try { origin.style.removeProperty('--hover-transform-origin'); } catch(e){}
                                        try { origin.style.removeProperty('--hover-translate-x'); } catch(e){}
                                        if (this._currentWrapper && this._currentWrapper.classList) this._currentWrapper.classList.remove('hover-no-clip');
                                        if (this._currentSection && this._currentSection.classList) this._currentSection.classList.remove('hover-no-clip');
                                    }
                                } catch (e) {}
                                this._scaleDownHandler = null;
                                this._currentWrapper = null;
                                this._currentSection = null;
                                this._currentItem = null;
                                this._currentOrigin = null;
                            }, 260);
                        } else {
                            // no origin — just clear wrapper/state
                            try {
                                if (this._currentWrapper && this._currentWrapper.classList) this._currentWrapper.classList.remove('hover-no-clip');
                                if (this._currentSection && this._currentSection.classList) this._currentSection.classList.remove('hover-no-clip');
                            } catch (e) {}
                            this._currentWrapper = null;
                            this._currentSection = null;
                            this._currentItem = null;
                            this._currentOrigin = null;
                        }
                    } catch(e) {}
                }, MICRO_PAUSE);

                // cleanup modal close handler
                try { modal.removeEventListener('transitionend', this._modalCloseHandler); } catch(e){}
                this._modalCloseHandler = null;

                // remove scroll/resize listeners when modal fully closed
                try {
                    window.removeEventListener('scroll', this._onScroll, true);
                    window.removeEventListener('resize', this._onResize);
                } catch (e) {}

                // restore modalContent to its original parent if we moved it
                try {
                    if (this._originalParent && this.modalContent.parentElement !== this._originalParent) {
                        this._originalParent.appendChild(this.modalContent);
                    }
                    if (this._carouselPositionChanged && this.carouselContainer) {
                        this.carouselContainer.style.position = '';
                        this._carouselPositionChanged = false;
                    }
                } catch (e) {}
            };

            // attach handler (will fire when modal's opacity/transform transition completes)
            modal.addEventListener('transitionend', this._modalCloseHandler);

            // fallback: if transitionend doesn't fire, run handler after timeout roughly matching CSS transition
            this._modalCloseTimeout = setTimeout(() => {
                try { if (this._modalCloseHandler) this._modalCloseHandler({ propertyName: 'transform' }); } catch(e){}
            }, 200);
            // Start animating the portal clone back immediately (overlap with modal close)
            try { if (this._portalEl) this._removePortal(true); } catch(e){}
        } catch(e) {
            // if anything fails, ensure we at least attempt to restore state
            try {
                this.modalOverlay.style.display = 'none';
                this.modalOverlay.style.pointerEvents = 'none';
                try {
                    this.modalOverlay.style.zIndex = '';
                    this.modalContent.style.zIndex = '';
                } catch (e) {}
                this._isInsideDetailsContext = false;
                window.isModalOpen = false;
            } catch (e) {}
            try {
                if (this._currentWrapper && this._currentWrapper.classList) this._currentWrapper.classList.remove('hover-no-clip');
                if (this._currentSection && this._currentSection.classList) this._currentSection.classList.remove('hover-no-clip');
                try { this._removePortal(); } catch(e){}
            } catch (e) {}
            this._currentWrapper = null; this._currentSection = null; this._currentItem = null; this._currentOrigin = null;
        }
    }

    // Schedule hide; default 0 so transition starts immediately on mouseleave
    hide(delay = 0){
        this.cancelHide();
        this.hoverModalTimeout = setTimeout(()=>{
            this.close();
            this.hoverModalTimeout = null;
        }, delay);
    }

    cancelHide(){
        if(this.hoverModalTimeout){
            clearTimeout(this.hoverModalTimeout);
            this.hoverModalTimeout = null;
        }
    }

    // Delegated handler for mouse leave (attached once in constructor)
    _onMouseLeave(e) {
        if (!window.matchMedia("(max-width: 768px)").matches) {
            // schedule hide to avoid flicker when moving from item to modal
            this.hide();
        }
    }

    _detachHoverBackdropListeners() {
        if (!this.modalBackdrop) return;
        if (this._hoverBackdropLoadHandler) {
            try { this.modalBackdrop.removeEventListener('load', this._hoverBackdropLoadHandler); } catch (e) {}
            this._hoverBackdropLoadHandler = null;
        }
        if (this._hoverBackdropErrorHandler) {
            try { this.modalBackdrop.removeEventListener('error', this._hoverBackdropErrorHandler); } catch (e) {}
            this._hoverBackdropErrorHandler = null;
        }
    }

    _handleHoverBackdropSettled() {
        this._detachHoverBackdropListeners();
        try { this.modalBackdrop.classList.remove('backdrop-loading'); } catch (e) {}
        try { if (this.modalHeader) this.modalHeader.classList.remove('backdrop-loading'); } catch (e) {}
    }

    _setHoverBackdropImage(src) {
        if (!this.modalBackdrop) return;

        this._handleHoverBackdropSettled();

        try { this.modalBackdrop.classList.add('backdrop-loading'); } catch (e) {}
        try { if (this.modalHeader) this.modalHeader.classList.add('backdrop-loading'); } catch (e) {}

        const fallback = DEFAULT_MODAL_BACKDROP_PLACEHOLDER;
        this._hoverBackdropFallbackApplied = false;

        const onLoad = () => {
            this._handleHoverBackdropSettled();
        };

        const onError = () => {
            if (!this._hoverBackdropFallbackApplied && fallback) {
                this._hoverBackdropFallbackApplied = true;
                this.modalBackdrop.src = fallback;
            } else {
                this._handleHoverBackdropSettled();
            }
        };

        this._hoverBackdropLoadHandler = onLoad;
        this._hoverBackdropErrorHandler = onError;

        try {
            this.modalBackdrop.addEventListener('load', this._hoverBackdropLoadHandler, { once: true });
        } catch (e) {
            this.modalBackdrop.addEventListener('load', this._hoverBackdropLoadHandler);
        }
        this.modalBackdrop.addEventListener('error', this._hoverBackdropErrorHandler);

        const finalSrc = src && String(src).trim() ? src : fallback;
        if (finalSrc === fallback) this._hoverBackdropFallbackApplied = true;
        this.modalBackdrop.src = finalSrc;
    }

    _onMouseEnter(e){
        // cancel any scheduled hide so modal remains visible when cursor moves into it
        this.cancelHide();
    }

    // Keep modal aligned with origin while visible. Throttle with rAF.
    _onScroll() {
        if (!this.isVisible) return;
        if (this._pendingRAF) return;
        this._pendingRAF = true;
        requestAnimationFrame(() => {
            try {
                this.updatePosition();
            } catch (e) {}
            this._pendingRAF = false;
        });
    }

    _onResize() {
        if (!this.isVisible) return;
        this.updatePosition();
    }

    updatePosition() {
        if (!this._currentOrigin) return;
        const position = this.calculateModalPosition(this._currentOrigin);
        this.modalContent.style.left = `${position.left}px`;
        this.modalContent.style.top = `${position.top}px`;
    }

    // Delegated click handler for modal content (attached once in constructor)
    _onContentClick(e) {
        e.stopPropagation();
        // Find actionable elements: play/trailer buttons, fallback details button or share button
    const actionEl = e.target.closest('[data-video-url], [data-open-details], #share-button');
        if (actionEl && actionEl.hasAttribute('data-open-details')) {
            const item = this._currentItem;
            const origin = this._currentOrigin;
            this.close();
            if (item && window.detailsModal && typeof window.detailsModal.show === 'function') {
                try {
                    window.detailsModal.show(item, origin);
                } catch (err) {
                    console.warn('hover-modal: fallo al abrir detailsModal desde botón de detalles', err);
                }
            }
            return;
        }

        if (!actionEl) {
            // Clicked on modal content but not on a specific action -> open details
            if (!window.matchMedia("(max-width: 768px)").matches) {
                const item = this._currentItem;
                const origin = this._currentOrigin;
                this.close();
                if (item && window.detailsModal) {
                    window.detailsModal.show(item, origin);
                }
            }
            return;
        }

        // Share button
        if (actionEl.id === 'share-button') {
            const item = this._currentItem || window.activeItem;
            try {
                if (typeof window.openShareModal === 'function') {
                    window.openShareModal(item);
                } else {
                    // fallback: ensure shareModal exists and show
                    if (!window.shareModal && typeof ShareModal === 'function') window.shareModal = new ShareModal();
                    const currentUrl = window.location.href;
                    let shareUrl = null;
                    try { shareUrl = (typeof window.generateShareUrl === 'function') ? window.generateShareUrl(item, currentUrl) : null; } catch(e) { shareUrl = null; }
                    if (window.shareModal) window.shareModal.show({ ...item, shareUrl });
                }
            } catch (err) { console.warn('hover-modal: share open failed', err); }
            return;
        }

        // data-video-url button -> pass the full item when available so VideoModal can build candidates
        const videoUrl = actionEl.getAttribute('data-video-url');
        if (window.videoModal) {
            const item = this._currentItem || window.activeItem;
            // If the clicked button is the primary action (play movie), prefer the item so VideoModal
            // can select the best candidate. If it's a secondary button (e.g. trailer), prefer the
            // explicit data-video-url on the button so the trailer is played instead of any iframe
            // listed on the item.
            const isPrimary = actionEl.classList && (actionEl.classList.contains('primary') || (actionEl.closest && actionEl.closest('.primary-action-row')));
            if (!isPrimary && videoUrl) {
                // Play the explicit URL (trailer)
                window.videoModal.play(videoUrl);
            } else if (item) {
                window.videoModal.play(item);
            } else if (videoUrl) {
                window.videoModal.play(videoUrl);
            }
        }
    }

    calculateModalPosition(itemElement) {
        if (!itemElement || !this.carouselContainer) {
            return { top: 0, left: 0 };
        }

        const rect = itemElement.getBoundingClientRect();
        const carouselRect = this.carouselContainer.getBoundingClientRect();
        const modalWidth = parseFloat(getComputedStyle(this.modalContent).width);
        
        // If modalContent is a child of the carousel container, we should compute
        // coordinates relative to that container so the modal moves natively with it.
        let leftPosition;
        if (this.modalContent.parentElement === this.carouselContainer) {
            leftPosition = (rect.left - carouselRect.left) + (rect.width / 2);
        } else {
            leftPosition = rect.left + (rect.width / 2);
        }
        
        // Compute boundaries differently depending on coordinate space
        if (this.modalContent.parentElement === this.carouselContainer) {
            const minLeft = (modalWidth / 2);
            const maxLeft = (carouselRect.width - (modalWidth / 2));
            if (leftPosition < minLeft) leftPosition = minLeft;
            if (leftPosition > maxLeft) leftPosition = maxLeft;
        } else {
            if (leftPosition - (modalWidth / 2) < carouselRect.left) {
                leftPosition = carouselRect.left + (modalWidth / 2);
            }
            if (leftPosition + (modalWidth / 2) > carouselRect.right) {
                leftPosition = carouselRect.right - (modalWidth / 2);
            }
        }
        
        let topPosition;
        if (this.modalContent.parentElement === this.carouselContainer) {
            topPosition = (rect.top - carouselRect.top) + (rect.height / 2);
        } else {
            topPosition = rect.top + (rect.height / 2);
        }
        
        return {
            top: topPosition,
            left: leftPosition
        };
    }

    generateDownloadUrl(videoUrl) {
        if (!videoUrl) return '#';
        if (videoUrl.includes('?') || videoUrl.includes('#')) {
            return videoUrl + '&dl=1';
        }
        return videoUrl + '?dl=1';
    }

    /* Portal helpers: clone origin into document.body so it can visually escape
       ancestor clipping without modifying carousel overflow (which breaks pagination). */
    _createPortalForOrigin(origin, previousOrigin = null) {
        try {
            // remove any existing portal
            this._removePortal(false, previousOrigin);
            if (!origin || !(origin instanceof HTMLElement)) return;

            const rect = origin.getBoundingClientRect();
            const clone = origin.cloneNode(true);

            // Remove any id on the clone to avoid duplicates
            try { clone.removeAttribute('id'); } catch (e) {}

            clone.classList.add('hover-portal-clone');
            // ensure clone starts unscaled so we can trigger the transition
            clone.classList.remove('hover-zoom');

            // Determine appropriate parent for the portal: prefer the modal's
            // parent so the clone follows the modal's coordinate system and
            // stays visually fixed relative to it (no scroll updates needed).
            const portalParent = (this.modalContent && this.modalContent.parentElement) ? this.modalContent.parentElement : document.body;
            const useBody = (portalParent === document.body);

            // inline styles to pin the clone to the same position within the
            // chosen parent coordinate space
            if (useBody) {
                clone.style.position = 'fixed';
                clone.style.left = `${rect.left}px`;
                clone.style.top = `${rect.top}px`;
            } else {
                // position absolute relative to portalParent
                const pRect = portalParent.getBoundingClientRect();
                clone.style.position = 'absolute';
                clone.style.left = `${Math.round(rect.left - pRect.left)}px`;
                clone.style.top = `${Math.round(rect.top - pRect.top)}px`;
            }
            clone.style.width = `${Math.round(rect.width)}px`;
            clone.style.height = `${Math.round(rect.height)}px`;
            clone.style.margin = '0';
            // place clone under modal hover content: modal-content uses z-index ~1001
            // choose 1000 so the cloned item appears beneath the modal but above page
            clone.style.zIndex = '1000';
            clone.style.pointerEvents = 'none';
            clone.style.boxSizing = 'border-box';

            // copy CSS variables used for transform origin/translate
            try {
                const originTransform = origin.style.getPropertyValue('--hover-transform-origin') || getComputedStyle(origin).getPropertyValue('--hover-transform-origin') || 'center center';
                const originTranslate = origin.style.getPropertyValue('--hover-translate-x') || getComputedStyle(origin).getPropertyValue('--hover-translate-x') || '0px';
                clone.style.setProperty('--hover-transform-origin', originTransform);
                clone.style.setProperty('--hover-translate-x', originTranslate);
            } catch (e) {}

            // append to the selected parent. If parent is the modal's parent,
            // insert the clone right before the modal so it appears beneath it.
            try {
                if (useBody) document.body.appendChild(clone);
                else portalParent.insertBefore(clone, this.modalContent);
            } catch (e) {
                // fallback to body if insertion fails
                try { document.body.appendChild(clone); } catch (ee) {}
            }
            // debug hooks removed in production
            // hide original to avoid duplicate visuals but keep layout
            try { origin.style.visibility = 'hidden'; } catch (e) {}

            // force reflow then add hover-zoom to animate
            void clone.offsetWidth;
            clone.classList.add('hover-zoom');

            this._portalEl = clone;
            // mark portal active so we skip origin animations
            this._portalActive = true;
        } catch (e) {
            console.warn('hover-modal: portal creation failed', e);
            try { this._removePortal(); } catch (er) {}
        }
    }

    _removePortal(animateBack = false, originToRestore = null) {
        try {
            if (!this._portalEl) return;
            const clone = this._portalEl;
            const origin = originToRestore || this._currentOrigin;
            // If requested, animate the clone back to the origin rect before removing
                // If requested, animate the clone back to the origin.
                // Use a different strategy depending on where the origin lives:
                // - catalog items: use transform-only (translate3d + scale) to avoid
                //   layout animations and rebounding in complex grids.
                // - carousel items: use left/top/width/height animation (legacy)
                //   to preserve the previously expected carousel motion.
                if (animateBack && origin && origin instanceof HTMLElement) {
            try {
                // prevent duplicate animate-backs
                if (this._portalAnimating) return;
                this._portalAnimating = true;
                const isCatalogOrigin = !!origin.closest('.catalogo-grid, #catalogo-grid-page');
                        // compute rects once
                        const oRect = origin.getBoundingClientRect();
                        const cRect = clone.getBoundingClientRect();

                        if (isCatalogOrigin) {
                            // --- CATALOG: transform-only animation (current behavior) ---

                            // Ensure the clone is positioned relative to the viewport so
                            // transform translations map predictably. Convert to fixed
                            // positioning at current viewport coords.
                            try {
                                const curLeft = Math.round(cRect.left);
                                const curTop = Math.round(cRect.top);
                                clone.style.position = 'fixed';
                                clone.style.left = `${curLeft}px`;
                                clone.style.top = `${curTop}px`;
                                // ensure explicit width/height so scale math matches
                                clone.style.width = `${Math.round(cRect.width)}px`;
                                clone.style.height = `${Math.round(cRect.height)}px`;
                                // move into body to avoid parent transform/overflow surprises
                                if (clone.parentElement && clone.parentElement !== document.body) {
                                    document.body.appendChild(clone);
                                }
                            } catch (e) {}

                            // compute translation delta in viewport pixels
                            const deltaX = Math.round(oRect.left - cRect.left);
                            const deltaY = Math.round(oRect.top - cRect.top);
                            const targetScale = (cRect.width > 0) ? (oRect.width / cRect.width) : 1;

                            // debug hooks removed in production

                            // prepare transform-based animation: start from current visual
                            // state (keep current scale/translate from CSS variables) and
                            // animate to target translate + target scale
                            // ensure clone is visible and non-interactive
                            clone.style.pointerEvents = 'none';
                            clone.style.transition = 'transform 220ms ease-out, opacity 220ms ease-out';
                            // ensure GPU-acceleration hints
                            clone.style.willChange = 'transform';

                            // Force the transform-origin to match the origin so scaling
                            // appears to grow/shrink toward the right anchor.
                            try {
                                const originTO = origin.style.getPropertyValue('--hover-transform-origin') || getComputedStyle(origin).transformOrigin || 'center center';
                                clone.style.transformOrigin = originTO;
                            } catch (e) {}

                            // Disable transitions on all children inside the clone so that
                            // only the clone's transform animates. This prevents nested
                            // elements from animating and causing apparent rebounding.
                            try {
                                const inner = clone.querySelectorAll('*');
                                inner.forEach((n) => {
                                    try { n.style.transition = 'none'; } catch (e) {}
                                });
                                // child transitions disabled
                            } catch (e) {}

                            // set initial transform to current hover visual if not already
                            // read computed style for transform; fallback to scale(1.3)
                            try {
                                const cs = getComputedStyle(clone);
                                const currentTransform = cs.transform && cs.transform !== 'none' ? cs.transform : null;
                                if (!currentTransform) {
                                    clone.style.transform = 'translate3d(0px,0px,0px) scale(1.3)';
                                }
                            } catch (e) {
                                clone.style.transform = 'translate3d(0px,0px,0px) scale(1.3)';
                            }

                            // force reflow then trigger the transform to move+scale into origin
                            void clone.offsetWidth;
                            clone.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0px) scale(${targetScale})`;

                            const cleanup = () => {
                                try { if (clone && clone.parentElement) clone.parentElement.removeChild(clone); } catch (e) {}
                                this._portalEl = null;
                                try { origin.style.visibility = ''; } catch (e) {}
                                this._portalActive = false;
                                this._portalAnimating = false;
                                try { this._detachPortalScrollListeners(); } catch (e) {}
                            };

                            const onEnd = (ev) => {
                                if (ev && ev.propertyName && ev.propertyName.indexOf('transform') === -1) return;
                                try { clone.removeEventListener('transitionend', onEnd); } catch(e){}
                                cleanup();
                                if (this._portalTimeout) { try { clearTimeout(this._portalTimeout); } catch(e){} this._portalTimeout = null; }
                            };
                            try { clone.addEventListener('transitionend', onEnd); } catch(e){}

                            this._portalTimeout = setTimeout(() => {
                                try { clone.removeEventListener('transitionend', onEnd); } catch(e){}
                                cleanup();
                                if (this._portalTimeout) { try { clearTimeout(this._portalTimeout); } catch(e){} this._portalTimeout = null; }
                            }, 360);
                            return;

                        } else {
                            // --- CAROUSEL: legacy left/top/width/height animation (preserve prior feel) ---

                            // Use gentle ease-out but animate layout properties to match
                            // previous carousel behavior which looked correct for sliders.
                            try {
                                // recompute origin rect in case layout changed
                                const targetRect = origin.getBoundingClientRect();
                                clone.style.transition = 'transform 220ms ease-out, left 220ms ease-out, top 220ms ease-out, width 220ms ease-out, height 220ms ease-out, opacity 220ms ease-out';
                                clone.style.pointerEvents = 'none';

                                try {
                                    const p = clone.parentElement;
                                    if (p && p !== document.body) {
                                        const pRect = p.getBoundingClientRect();
                                        clone.style.left = `${Math.round(targetRect.left - pRect.left)}px`;
                                        clone.style.top = `${Math.round(targetRect.top - pRect.top)}px`;
                                    } else {
                                        clone.style.left = `${Math.round(targetRect.left)}px`;
                                        clone.style.top = `${Math.round(targetRect.top)}px`;
                                    }
                                } catch (e) {
                                    clone.style.left = `${Math.round(targetRect.left)}px`;
                                    clone.style.top = `${Math.round(targetRect.top)}px`;
                                }

                                clone.style.width = `${Math.round(targetRect.width)}px`;
                                clone.style.height = `${Math.round(targetRect.height)}px`;
                                // remove visual scale so it animates back visibly
                                clone.classList.remove('hover-zoom');

                                const cleanup2 = () => {
                                    try { if (clone && clone.parentElement) clone.parentElement.removeChild(clone); } catch (e) {}
                                    this._portalEl = null;
                                    try { origin.style.visibility = ''; } catch (e) {}
                                    this._portalActive = false;
                                    this._portalAnimating = false;
                                    try { this._detachPortalScrollListeners(); } catch (e) {}
                                };

                                const onEnd2 = (ev) => {
                                    if (ev && ev.propertyName && ['left','top','transform','width','height','opacity'].indexOf(ev.propertyName) === -1) return;
                                    try { clone.removeEventListener('transitionend', onEnd2); } catch(e){}
                                    cleanup2();
                                    if (this._portalTimeout) { try { clearTimeout(this._portalTimeout); } catch(e){} this._portalTimeout = null; }
                                };
                                try { clone.addEventListener('transitionend', onEnd2); } catch(e){}
                                this._portalTimeout = setTimeout(() => {
                                    try { clone.removeEventListener('transitionend', onEnd2); } catch(e){}
                                    cleanup2();
                                    if (this._portalTimeout) { try { clearTimeout(this._portalTimeout); } catch(e){} this._portalTimeout = null; }
                                }, 360);
                                return;
                            } catch (e) {
                                console.warn('hover-modal: portal animateBack (carousel) failed', e);
                                // fallthrough to immediate removal
                            }
                        }
                    } catch (e) {
                        console.warn('hover-modal: portal animateBack failed', e);
                        // fallthrough to immediate removal
                    }
                }

            try { this._detachPortalScrollListeners(); } catch (e) {}
            if (this._portalEl && this._portalEl.parentElement) {
                try { this._portalEl.parentElement.removeChild(this._portalEl); } catch (e) {}
            }
            this._portalEl = null;
            const restoreTarget = originToRestore || this._currentOrigin;
            if (restoreTarget && restoreTarget.style) {
                try { restoreTarget.style.visibility = ''; } catch (e) {}
            }
            this._portalActive = false;
            this._portalAnimating = false;
            if (this._portalTimeout) { try { clearTimeout(this._portalTimeout); } catch(e){} this._portalTimeout = null; }
        } catch (e) {}
    }

    _positionPortalUnderModal() {
        try {
            if (!this._portalEl || !this.modalContent) return;
            const clone = this._portalEl;
            const modalRect = this.modalContent.getBoundingClientRect();
            const cRect = clone.getBoundingClientRect();
            // center clone horizontally under modal and place slightly below
            const targetLeft = modalRect.left + Math.max(0, (modalRect.width - cRect.width) / 2);
            const targetTop = modalRect.top + modalRect.height + 8; // 8px gap

            // use left/top transitions for this repositioning
            clone.style.transition = 'left 200ms cubic-bezier(.22,.9,.23,1), top 200ms cubic-bezier(.22,.9,.23,1), opacity 160ms ease';
            clone.style.left = `${Math.round(targetLeft)}px`;
            clone.style.top = `${Math.round(targetTop)}px`;

            // attach scroll/resize listeners so clone follows modal (stays fixed relative to modal)
            this._attachPortalScrollListeners();
        } catch (e) {
            console.warn('hover-modal: positionPortalUnderModal failed', e);
        }
    }

    _attachPortalScrollListeners() {
        try {
            if (this._portalScrollAttached) return;
            this._portalOnScroll = this._portalOnScroll || this._portalOnScrollHandler.bind(this);
            window.addEventListener('scroll', this._portalOnScroll, true);
            window.addEventListener('resize', this._portalOnScroll);
            this._portalScrollAttached = true;
        } catch (e) {}
    }

    _detachPortalScrollListeners() {
        try {
            if (!this._portalScrollAttached) return;
            window.removeEventListener('scroll', this._portalOnScroll, true);
            window.removeEventListener('resize', this._portalOnScroll);
            this._portalScrollAttached = false;
        } catch (e) {}
    }

    _portalOnScrollHandler() {
        try {
            if (!this._portalEl || !this.modalContent) return;
            const clone = this._portalEl;
            const modalRect = this.modalContent.getBoundingClientRect();
            const cRect = clone.getBoundingClientRect();
            const targetLeft = modalRect.left + Math.max(0, (modalRect.width - cRect.width) / 2);
            const targetTop = modalRect.top + modalRect.height + 8;
            // update without heavy layout thrash
            clone.style.left = `${Math.round(targetLeft)}px`;
            clone.style.top = `${Math.round(targetTop)}px`;
        } catch (e) {}
    }
}