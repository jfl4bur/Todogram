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
        // scroll/resize handlers to keep modal aligned with its origin while visible
        this._onScroll = this._onScroll.bind(this);
        this._onResize = this._onResize.bind(this);
        this._pendingRAF = false;
    // track the currently shown item and its origin element
        this._currentItem = null;
        this._currentOrigin = null;
    // remember original parent so we can restore DOM position
    this._originalParent = this.modalContent.parentElement;
    this._carouselPositionChanged = false;
        // active scroll container for the currently shown item (e.g. catalog grid)
        this._activeScrollContainer = null;

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
        
        // show overlay first so computed styles (width) are available for accurate positioning
        // Do not decide pointer-events until we know whether the modalContent will
        // remain inside the overlay or be moved into the carousel container.
        this.modalOverlay.style.display = 'block';
        // force reflow so computed sizes are correct
        void this.modalContent.offsetWidth;

        // Determine the best scroll container for this item (nearest ancestor that scrolls)
        try {
            const targetScroll = this.findScrollContainer(itemElement) || this.carouselContainer || document.body;
            this._activeScrollContainer = targetScroll;
            if (this._activeScrollContainer && this.modalContent.parentElement !== this._activeScrollContainer && this._activeScrollContainer !== document.body) {
                const cs = getComputedStyle(this._activeScrollContainer);
                if (cs.position === 'static') {
                    this._activeScrollContainer.style.position = 'relative';
                    this._carouselPositionChanged = true;
                }
                this._activeScrollContainer.appendChild(this.modalContent);
            }
        } catch (e) {}

    const position = this.calculateModalPosition(itemElement);

        // position modal (keep transform for centering in CSS)
        this.modalContent.style.left = `${position.left}px`;
        this.modalContent.style.top = `${position.top}px`;

        // then add 'show' class to trigger CSS transition
        this.modalContent.classList.add('show');

        // Attach scroll/resize listeners only when necessary.
        // If modalContent is inside the same scroll container as the item, the
        // browser will move it natively during scroll and we don't need a window
        // scroll handler (avoids JS-driven lag). Otherwise keep listeners.
        if (this._activeScrollContainer && this.modalContent.parentElement === this._activeScrollContainer && this._activeScrollContainer !== document.body) {
            // no global scroll listener needed
            window.addEventListener('resize', this._onResize);
        } else {
            window.addEventListener('scroll', this._onScroll, true);
            window.addEventListener('resize', this._onResize);
        }

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
                if (this._carouselPositionChanged && this._activeScrollContainer) {
                    this._activeScrollContainer.style.position = '';
                    this._carouselPositionChanged = false;
                }
                this._activeScrollContainer = null;
            } catch (e) {}
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

    // Find the nearest ancestor that can scroll (overflow auto/scroll and scrollable area)
    findScrollContainer(el) {
        let node = el;
        while (node && node !== document.body && node !== document.documentElement) {
            try {
                const cs = getComputedStyle(node);
                const overflowY = cs.overflowY;
                const overflowX = cs.overflowX;
                const canScrollY = (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay');
                const canScrollX = (overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'overlay');
                // consider it scrollable if it allows overflow and has scrollable content
                if ((canScrollY && node.scrollHeight > node.clientHeight) || (canScrollX && node.scrollWidth > node.clientWidth)) return node;
            } catch (e) {}
            node = node.parentElement;
        }
        // fallback: known catalog containers that may be scroll roots
        const fallbacks = [document.querySelector('.catalogo-body'), document.querySelector('#catalogo-grid-page'), document.querySelector('.catalogo-grid')];
        for (const elF of fallbacks) {
            if (elF) return elF;
        }
        return null;
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
}