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
    // portal element used to render a cloned origin in document.body so it can
    // escape any overflow: hidden/auto ancestors without breaking carousel scroll
    this._portalEl = null;
    this._portalTimeout = null;
    // remember original parent so we can restore DOM position
    this._originalParent = this.modalContent.parentElement;
    this._carouselPositionChanged = false;
    // whether we rendered the visual via portal clone
    this._portalActive = false;

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

        // position modal (keep transform for centering in CSS)
        this.modalContent.style.left = `${position.left}px`;
        this.modalContent.style.top = `${position.top}px`;

        // Compute modal start scale so it appears to grow from the item's size
        try {
                    const oRect = origin.getBoundingClientRect();
                    // compute current clone rect and required deltas
                    const cRect = clone.getBoundingClientRect();
                    const dx = oRect.left - cRect.left;
                    const dy = oRect.top - cRect.top;
                    const scale = (cRect.width > 0) ? (oRect.width / cRect.width) : 1;

                    // ensure clone will transition only transform/opacity (more performant)
                    clone.style.transition = 'transform 300ms cubic-bezier(.22,.9,.23,1), opacity 200ms ease';
                    clone.style.pointerEvents = 'none';

                    // Remove hover class so computed transform is the starting point, then
                    // set target transform to translate the clone to the origin and scale it.
                    try { clone.classList.remove('hover-zoom'); } catch(e){}

                    // apply transform to animate back. Using translate3d + scale is
                    // smoother and resilient to scroll because it doesn't change layout.
                    // Start the transition by setting the target transform.
                    // Use requestAnimationFrame to ensure style mutations are flushed.
                    requestAnimationFrame(() => {
                        try {
                            clone.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${scale})`;
                        } catch (e) {}
                    });

                    // wait for transitionend or timeout
                    const cleanup = () => {
                        try { if (clone && clone.parentElement) clone.parentElement.removeChild(clone); } catch (e) {}
                        this._portalEl = null;
                        try { origin.style.visibility = ''; } catch (e) {}
                        this._portalActive = false;
                    };
                    const onEnd = (ev) => {
                        if (ev && ev.propertyName && ev.propertyName.indexOf('transform') === -1 && ev.propertyName.indexOf('opacity') === -1) return;
                        try { clone.removeEventListener('transitionend', onEnd); } catch(e){}
                        cleanup();
                        if (this._portalTimeout) { try { clearTimeout(this._portalTimeout); } catch(e){} this._portalTimeout = null; }
                    };
                    try { clone.addEventListener('transitionend', onEnd); } catch(e){}
                    // safety timeout slightly longer than transition
                    this._portalTimeout = setTimeout(() => {
                        try { clone.removeEventListener('transitionend', onEnd); } catch(e){}
                        cleanup();
                        if (this._portalTimeout) { try { clearTimeout(this._portalTimeout); } catch(e){} this._portalTimeout = null; }
                    }, 380);
        } catch (e) {
            // fallback: just show
            try { this.modalContent.classList.add('show'); } catch (e) {}
        }

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
                        if (shouldPortal) this._createPortalForOrigin(this._currentOrigin);
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

                            // fallback: if transitionend doesn't fire, force cleanup after shorter timeout for snappier UX
                            // adjusted to match faster closing transition (70ms) -> use 120ms as safety window
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
                            }, 120);
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
    _createPortalForOrigin(origin) {
        try {
            // remove any existing portal
            this._removePortal();
            if (!origin || !(origin instanceof HTMLElement)) return;

            const rect = origin.getBoundingClientRect();
            const clone = origin.cloneNode(true);

            // Remove any id on the clone to avoid duplicates
            try { clone.removeAttribute('id'); } catch (e) {}

            clone.classList.add('hover-portal-clone');
            // ensure clone starts unscaled so we can trigger the transition
            clone.classList.remove('hover-zoom');

            // inline styles to size the clone; positioning handled depending on parent
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

            // Append clone to the same parent as the modalContent so it mirrors
            // the modal's positioning (prevents it moving differently on scroll).
            const portalParent = (this.modalContent && this.modalContent.parentElement) ? this.modalContent.parentElement : document.body;
            if (portalParent === document.body) {
                // fixed positioning relative to viewport
                clone.style.position = 'fixed';
                clone.style.left = `${rect.left}px`;
                clone.style.top = `${rect.top}px`;
            } else {
                // absolute positioning relative to portalParent
                clone.style.position = 'absolute';
                try {
                    const pRect = portalParent.getBoundingClientRect();
                    clone.style.left = `${rect.left - pRect.left}px`;
                    clone.style.top = `${rect.top - pRect.top}px`;
                } catch (e) {
                    clone.style.left = `${rect.left}px`;
                    clone.style.top = `${rect.top}px`;
                }
            }
            portalParent.appendChild(clone);
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

    _removePortal(animateBack = false) {
        try {
            if (!this._portalEl) return;
            const clone = this._portalEl;
            const origin = this._currentOrigin;
            // If requested, animate the clone back to the origin rect before removing
            if (animateBack && origin && origin instanceof HTMLElement) {
                try {
                    const oRect = origin.getBoundingClientRect();
                    // ensure clone has fixed positioning and will transition
                    // use slightly longer transform timing with ease-out for smoother motion
                    clone.style.transition = 'transform 200ms cubic-bezier(.22,.9,.23,1), left 200ms cubic-bezier(.22,.9,.23,1), top 200ms cubic-bezier(.22,.9,.23,1), width 200ms cubic-bezier(.22,.9,.23,1), height 200ms cubic-bezier(.22,.9,.23,1), opacity 200ms ease';
                    // make sure clone is visible during animation
                    clone.style.pointerEvents = 'none';
                    // set target position/size to match origin
                    clone.style.left = `${oRect.left}px`;
                    clone.style.top = `${oRect.top}px`;
                    clone.style.width = `${Math.round(oRect.width)}px`;
                    clone.style.height = `${Math.round(oRect.height)}px`;
                    // remove hover-zoom (scale) so it animates back
                    clone.classList.remove('hover-zoom');

                    // wait for transitionend or timeout
                    const cleanup = () => {
                        try { if (clone && clone.parentElement) clone.parentElement.removeChild(clone); } catch (e) {}
                        this._portalEl = null;
                        // restore origin visibility and mark portal inactive
                        try { origin.style.visibility = ''; } catch (e) {}
                        this._portalActive = false;
                    };
                    const onEnd = (ev) => {
                        // accept left/top/transform/width/height
                        if (ev && ev.propertyName && ['left','top','transform','width','height','opacity'].indexOf(ev.propertyName) === -1) return;
                        try { clone.removeEventListener('transitionend', onEnd); } catch(e){}
                        cleanup();
                        if (this._portalTimeout) { try { clearTimeout(this._portalTimeout); } catch(e){} this._portalTimeout = null; }
                    };
                    try { clone.addEventListener('transitionend', onEnd); } catch(e){}
                    // safety timeout
                    this._portalTimeout = setTimeout(() => {
                        try { clone.removeEventListener('transitionend', onEnd); } catch(e){}
                        cleanup();
                        if (this._portalTimeout) { try { clearTimeout(this._portalTimeout); } catch(e){} this._portalTimeout = null; }
                    }, 260);
                    // safety: slightly longer than transition to ensure complete
                    // fallback cleanup if transitionend doesn't fire
                    // (already set above to 260ms)
                    return;
                } catch (e) {
                    console.warn('hover-modal: portal animateBack failed', e);
                    // fallthrough to immediate removal
                }
            }

            if (this._portalEl && this._portalEl.parentElement) {
                try { this._portalEl.parentElement.removeChild(this._portalEl); } catch (e) {}
            }
            this._portalEl = null;
            if (this._currentOrigin && this._currentOrigin.style) {
                try { this._currentOrigin.style.visibility = ''; } catch (e) {}
            }
            this._portalActive = false;
            if (this._portalTimeout) { try { clearTimeout(this._portalTimeout); } catch(e){} this._portalTimeout = null; }
        } catch (e) {}
    }
}