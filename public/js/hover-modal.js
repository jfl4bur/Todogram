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
    // animation timing (ms) - keep in sync with CSS
    this.ITEM_SCALE_DURATION = 220;
    this.ITEM_SCALE_PAUSE = 120; // micro-pausa antes de empezar el scale-down
    this.MODAL_TRANSITION_DURATION = 320; // coincide con CSS transition
    this._waitingToShowModal = false;
    this._hideSequenceInProgress = false;
    // track the currently shown item and its origin element
        this._currentItem = null;
        this._currentOrigin = null;
    // remember original parent so we can restore DOM position
    this._originalParent = this.modalContent.parentElement;
    this._carouselPositionChanged = false;

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

        // Determine the best container for positioning based on the hovered item.
        // This addresses cases where HoverModal was instantiated before the
        // catalog DOM existed (so constructor fallback picked body).
        try {
            const candidate = itemElement.closest('.carousel-container, .catalogo-grid, #catalogo-grid-page') || document.body;
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

        // We want the item to scale first, then reveal the hover modal (modal
        // should animate starting from the item's scaled size). To do that we
        // apply the scale to the item, wait for its transition, then position
        // and show the modal.

        // cancel any previous waiting/show handlers
        this._waitingToShowModal = false;
        try {
            if (this._showAfterItemHandler && this._currentOrigin && this._currentOrigin._showAfterItemAttached) {
                try { this._currentOrigin.removeEventListener('transitionend', this._showAfterItemHandler); } catch(e){}
                this._currentOrigin._showAfterItemAttached = false;
                this._showAfterItemHandler = null;
            }
        } catch(e){}

        // If the item is already scaled (class present), reveal immediately.
        const origin = itemElement;
        const revealModalNow = () => {
            // position modal (keep transform for centering in CSS)
            this.modalContent.style.left = `${position.left}px`;
            this.modalContent.style.top = `${position.top}px`;

            // then add 'show' class to trigger CSS transition
            this.modalContent.classList.add('show');

            // Attach scroll/resize listeners only when necessary.
            if (this.modalContent.parentElement === this.carouselContainer && this.carouselContainer !== document.body) {
                window.addEventListener('resize', this._onResize);
            } else {
                window.addEventListener('scroll', this._onScroll, true);
                window.addEventListener('resize', this._onResize);
            }

            // Decide pointer-events on overlay
            try {
                if (this.modalContent.parentElement === this._originalParent) {
                    this.modalOverlay.style.pointerEvents = 'auto';
                } else {
                    this.modalOverlay.style.pointerEvents = 'none';
                }
            } catch (e) {}

            // Store current item and origin for use by delegated handlers
            window.activeItem = item;
        };

        // Apply scale to origin now (if not already)
        try {
            if (origin && origin.classList && !origin.classList.contains('hover-zoom')) {
                origin.classList.add('hover-zoom');
            }
        } catch (e) {}

        // If origin is already scaled, reveal immediately, else wait for its transition
        if (origin && origin.addEventListener) {
            let called = false;
            const onEnd = (ev) => {
                if (ev && ev.propertyName && ev.propertyName.indexOf('transform') === -1) return;
                if (called) return; called = true;
                try { origin.removeEventListener('transitionend', onEnd); origin._showAfterItemAttached = false; } catch(e){}
                this._waitingToShowModal = false;
                revealModalNow();
            };
            // attach handler
            try { origin.addEventListener('transitionend', onEnd); origin._showAfterItemAttached = true; this._showAfterItemHandler = onEnd; this._waitingToShowModal = true; } catch(e) { called = true; }
            // fallback: if transitionend doesn't fire, reveal after ITEM_SCALE_DURATION + 40ms
            setTimeout(() => { if (!called) { called = true; try { origin.removeEventListener('transitionend', onEnd); } catch(e){} this._waitingToShowModal = false; revealModalNow(); } }, this.ITEM_SCALE_DURATION + 60);
            // If the origin already had the class, transitionend may not fire; in that case we still reveal immediately
            if (origin.classList.contains('hover-zoom') && !this._waitingToShowModal) {
                revealModalNow();
            }
        } else {
            revealModalNow();
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

        // end of show()
    }

    close() {
        // clear any pending hide timer
        this.cancelHide();
        if (!this.isVisible) return; // nothing to do
        this.isVisible = false;
        // Start hide sequence: first micropause, then scale item down, then hide modal
        if (this._hideSequenceInProgress) return;
        this._hideSequenceInProgress = true;
        const origin = this._currentOrigin;

        const continueAfterItemScaled = () => {
            // now hide the modal (scale/fade out)
            try { this.modalContent.classList.remove('show'); } catch (e) {}

            // when modal transition ends, perform restore
            let modalEnded = false;
            const onModalEnd = (ev) => {
                if (modalEnded) return; modalEnded = true;
                try { this.modalContent.removeEventListener('transitionend', onModalEnd); } catch(e){}
                // hide overlay and restore state
                try { this.modalOverlay.style.display = 'none'; this.modalOverlay.style.pointerEvents = 'none'; } catch(e){}
                window.isModalOpen = false;
                window.activeItem = null;
                window.hoverModalItem = null;
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
                // cleanup any remaining clip classes
                try {
                    if (this._currentWrapper && this._currentWrapper.classList) this._currentWrapper.classList.remove('hover-no-clip');
                    if (this._currentSection && this._currentSection.classList) this._currentSection.classList.remove('hover-no-clip');
                } catch (e) {}
                this._hideSequenceInProgress = false;
                // clear current refs
                this._currentItem = null;
                this._currentOrigin = null;
                this._currentWrapper = null;
                this._currentSection = null;
                // remove scroll/resize listeners now
                try { window.removeEventListener('scroll', this._onScroll, true); window.removeEventListener('resize', this._onResize); } catch(e){}
            };

            // attach modal transitionend
            try { this.modalContent.addEventListener('transitionend', onModalEnd); } catch(e){}
            // fallback: ensure cleanup after MODAL_TRANSITION_DURATION
            setTimeout(() => { if (!modalEnded) onModalEnd(); }, this.MODAL_TRANSITION_DURATION + 50);
        };

        // sequence: micropause -> scale origin down -> continueAfterItemScaled
        setTimeout(() => {
            if (!origin) {
                // no origin: just hide modal immediately
                continueAfterItemScaled();
                return;
            }
            let called = false;
            const onItemScaled = (ev) => {
                if (ev && ev.propertyName && ev.propertyName.indexOf('transform') === -1) return;
                if (called) return; called = true;
                try { origin.removeEventListener('transitionend', onItemScaled); } catch(e){}
                // proceed to hide modal after item scaled
                continueAfterItemScaled();
            };
            try { origin.addEventListener('transitionend', onItemScaled); } catch(e){}
            // trigger scale down (apply closing class and remove hover-zoom so transform runs)
            try { origin.classList.add('hover-zoom-closing'); origin.classList.remove('hover-zoom'); } catch(e){}
            // fallback: if no transitionend, proceed after ITEM_SCALE_DURATION + 80ms
            setTimeout(() => { if (!called) { called = true; try { origin.removeEventListener('transitionend', onItemScaled); } catch(e){} continueAfterItemScaled(); } }, this.ITEM_SCALE_DURATION + 80);
        }, this.ITEM_SCALE_PAUSE);
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