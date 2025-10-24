class HoverModal {
    constructor() {
        this.modalOverlay = document.getElementById('modal-overlay');
        this.modalContent = document.getElementById('modal-content');
        this.modalBackdrop = document.getElementById('modal-backdrop');
        this.modalBody = document.getElementById('modal-body');
    // Try common carousel/container selectors; fallback to body so positioning still works
    this.carouselContainer = document.querySelector('.carousel-container') || document.querySelector('.catalogo-grid') || document.querySelector('#catalogo-grid-page') || document.body;
        this.activeItem = null;
        this.hoverModalItem = null;
        this.hoverModalOrigin = { x: 0, y: 0 };
        this.hoverModalTimeout = null;
        this.isVisible = false;

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
        // track the currently shown item and its origin element
        this._currentItem = null;
        this._currentOrigin = null;
        // Bound handlers for origin item (so we can add/remove them per-item)
        this._originMouseEnterBound = null;
        this._originMouseLeaveBound = null;

        // Attach delegated listeners once
        this.modalContent.addEventListener('mouseenter', this._onMouseEnter);
        this.modalContent.addEventListener('mouseleave', this._onMouseLeave);
        this.modalContent.addEventListener('click', this._onContentClick);
    }

    show(item, itemElement) {
        // If details modal is open, do not show hover to avoid intercepting clicks
        try {
            if (window.detailsModal && window.detailsModal.isDetailsModalOpen) return;
        } catch (e) {}

        if (!itemElement || !(itemElement instanceof HTMLElement)) {
            console.error('itemElement no válido');
            return;
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
        
        this.modalBackdrop.src = backdropUrl;
        this.modalBackdrop.onerror = function() {
            this.src = 'https://www.themoviedb.org/assets/2/v4/glyphicons/basic/glyphicons-basic-4-user-grey-d8fe957375e70239d6abdd549fd7568c89281b2179b5f4470e2e12895792dfa5.svg';
        };
        
    const trailerUrl = item.trailerUrl;
    // Accept iframe-based video links too (many records use 'Video iframe')
    const preferredVideo = item.videoUrl || item.videoIframe || item.videoIframe1 || item.videoIframe1 || item.videoIframe;
        
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
                        <span>Ver Película</span>
                        <span class="tooltip">Reproducir</span>
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
                    <i class="fas fa-film"></i>
                    <span class="tooltip">Ver Tráiler</span>
                </button>
            `;
        }
        
        secondaryButtons += `
                <button class="details-modal-action-btn circular" id="share-button">
                    <i class="fas fa-share-alt"></i>
                    <span class="tooltip">Compartir</span>
                </button>
            </div>
        `;
        
        this.modalBody.innerHTML = `
            <h2>${item.title}</h2>
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
        
        // show overlay first so computed styles (width/height) are available for accurate positioning
    // Allow pointer events on overlay so modalContent can receive mouseenter/mouseleave reliably
    this.modalOverlay.style.display = 'block';
    this.modalOverlay.style.pointerEvents = 'auto';
        // Ensure the modal uses fixed positioning so it stays in the same viewport spot
        // (we compute coordinates from the item's boundingClientRect)
        this.modalContent.style.position = 'fixed';
        // force reflow so computed sizes are correct
        void this.modalContent.offsetWidth;

        const position = this.calculateModalPosition(itemElement);

        // position modal (keep transform for centering in CSS)
        this.modalContent.style.left = `${position.left}px`;
        this.modalContent.style.top = `${position.top}px`;

        // Attach origin item listeners so leaving the item hides the modal and re-enter cancels hide
        try {
            // remove any previous origin listeners
            if (this._currentOrigin && this._originMouseLeaveBound) {
                this._currentOrigin.removeEventListener('mouseleave', this._originMouseLeaveBound);
                this._currentOrigin.removeEventListener('mouseenter', this._originMouseEnterBound);
            }
        } catch (e) { /* ignore */ }

        if (itemElement && itemElement instanceof HTMLElement) {
            this._originMouseLeaveBound = (e) => {
                // schedule hide when leaving origin; if pointer moves into modal this.modalContent, modal's mouseenter will cancel
                this.hide();
            };
            this._originMouseEnterBound = (e) => {
                this.cancelHide();
            };
            itemElement.addEventListener('mouseleave', this._originMouseLeaveBound);
            itemElement.addEventListener('mouseenter', this._originMouseEnterBound);
        }

        // then add 'show' class to trigger CSS transition
        this.modalContent.classList.add('show');

        // Store current item and origin for use by delegated handlers
        this._currentItem = item;
        this._currentOrigin = itemElement;
        window.activeItem = item;
    }

    close() {
        // clear any pending hide timer
        this.cancelHide();
        this.isVisible = false;
        // remove show class to trigger hide transition
        this.modalContent.classList.remove('show');

        setTimeout(() => {
            this.modalOverlay.style.display = 'none';
            this.modalOverlay.style.pointerEvents = 'none';
            window.isModalOpen = false;
            window.activeItem = null;
            window.hoverModalItem = null;
            this._currentItem = null;
            this._currentOrigin = null;
            // remove any origin listeners we attached
            try {
                if (this._currentOrigin && this._originMouseLeaveBound) {
                    this._currentOrigin.removeEventListener('mouseleave', this._originMouseLeaveBound);
                    this._currentOrigin.removeEventListener('mouseenter', this._originMouseEnterBound);
                }
            } catch (e) {}

            // reset inline positioning
            this.modalContent.style.position = '';
            this.modalContent.style.left = '';
            this.modalContent.style.top = '';
        }, 320); // match CSS transition duration
    }

    // Schedule hide with a small delay to allow transitions between item -> modal without flicker
    hide(delay = 300){
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

    _onMouseEnter(e){
        // cancel any scheduled hide so modal remains visible when cursor moves into it
        this.cancelHide();
    }

    // Delegated click handler for modal content (attached once in constructor)
    _onContentClick(e) {
        e.stopPropagation();
        // Find actionable elements: data-video-url or share-button
        const actionEl = e.target.closest('[data-video-url], #share-button');

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
            // Prefer passing the item object so the video modal can inspect videoIframe/videoIframe1/videoUrl
            if (item) window.videoModal.play(item);
            else if (videoUrl) window.videoModal.play(videoUrl);
        }
    }

    calculateModalPosition(itemElement) {
        if (!itemElement || !this.carouselContainer) {
            return { top: 0, left: 0 };
        }

        // Use viewport coordinates (getBoundingClientRect gives viewport-relative values)
        const rect = itemElement.getBoundingClientRect();
        const modalStyle = getComputedStyle(this.modalContent);
        const modalWidth = parseFloat(modalStyle.width) || this.modalContent.offsetWidth;
        const modalHeight = parseFloat(modalStyle.height) || this.modalContent.offsetHeight;

        // center horizontally on the item's center
        let leftPosition = rect.left + (rect.width / 2) - (modalWidth / 2);
        // clamp to viewport
        const viewportLeft = 0;
        const viewportRight = window.innerWidth || document.documentElement.clientWidth;
        if (leftPosition < viewportLeft + 8) leftPosition = viewportLeft + 8; // small padding
        if (leftPosition + modalWidth > viewportRight - 8) leftPosition = viewportRight - modalWidth - 8;

        // position vertically so modal is vertically centered on the item's center by default
        let topPosition = rect.top + (rect.height / 2) - (modalHeight / 2);
        const viewportTop = 0;
        const viewportBottom = window.innerHeight || document.documentElement.clientHeight;
        if (topPosition < viewportTop + 8) topPosition = viewportTop + 8;
        if (topPosition + modalHeight > viewportBottom - 8) topPosition = viewportBottom - modalHeight - 8;

        return {
            top: Math.round(topPosition),
            left: Math.round(leftPosition)
        };
    }

    generateDownloadUrl(videoUrl) {
        if (!videoUrl) return '#';
        if (videoUrl.includes('?') || videoUrl.includes('#')) {
            return videoUrl + '&dl=1';
        }
        return videoUrl + '?dl=1';
    }
}