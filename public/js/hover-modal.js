class HoverModal {
    constructor() {
        // Prefer a unique, runtime-created overlay to avoid interference from
        // other scripts or duplicated markup. We'll create elements with
        // stable but unique IDs and classes so existing CSS applies.
        const AUTO_IDS = {
            overlay: 'hover-modal-overlay-auto',
            content: 'hover-modal-content-auto',
            backdrop: 'hover-modal-backdrop-auto',
            body: 'hover-modal-body-auto'
        };

        // If not already present, create the auto overlay elements and append to body
        if (!document.getElementById(AUTO_IDS.overlay)) {
            try {
                const ov = document.createElement('div');
                ov.id = AUTO_IDS.overlay;
                ov.className = 'modal-overlay hover-modal-auto';
                ov.style.display = 'none';
                ov.style.pointerEvents = 'none';
                // ensure on-top
                ov.style.zIndex = '12001';

                const cont = document.createElement('div');
                cont.id = AUTO_IDS.content;
                cont.className = 'modal-content hover-modal-auto';
                // content will be positioned by JS; keep pointer-events enabled when shown

                const header = document.createElement('div');
                header.className = 'modal-header';
                const img = document.createElement('img');
                img.id = AUTO_IDS.backdrop;
                img.className = 'modal-backdrop hover-modal-auto';
                img.src = '';
                header.appendChild(img);

                const body = document.createElement('div');
                body.id = AUTO_IDS.body;
                body.className = 'modal-body hover-modal-auto';

                cont.appendChild(header);
                cont.appendChild(body);
                ov.appendChild(cont);
                document.body.appendChild(ov);
            } catch (e) {
                // ignore creation errors and fall back to existing DOM
            }
        }

        // Use the auto overlay when possible; fall back to existing IDs for compatibility
        this.modalOverlay = document.getElementById(AUTO_IDS.overlay) || document.getElementById('modal-overlay');
        this.modalContent = document.getElementById(AUTO_IDS.content) || document.getElementById('modal-content');
        this.modalBackdrop = document.getElementById(AUTO_IDS.backdrop) || document.getElementById('modal-backdrop');
        this.modalBody = document.getElementById(AUTO_IDS.body) || document.getElementById('modal-body');
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
        // Ensure the overlay is a direct child of document.body so that
        // `position: fixed` behaves relative to the viewport and is not
        // affected by ancestor transforms/filters which create containing blocks.
        try {
            if (this.modalOverlay && this.modalOverlay.parentNode !== document.body) {
                document.body.appendChild(this.modalOverlay);
            }
        } catch (e) {
            // ignore if append fails for any reason
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

        // Attach delegated listeners once
        this.modalContent.addEventListener('mouseenter', this._onMouseEnter);
        this.modalContent.addEventListener('mouseleave', this._onMouseLeave);
        this.modalContent.addEventListener('click', this._onContentClick);

        // Instrumentación: observar cambios en atributos style para detectar
        // si otro script actualiza left/top continuamente (causa 'pegado' al puntero)
        try {
            this._mutationObserver = new MutationObserver((mutations) => {
                if (!this.isVisible) return; // solo interesan cambios mientras está visible
                for (const m of mutations) {
                    if (m.type === 'attributes' && (m.attributeName === 'style' || m.attributeName === 'class')) {
                        const left = this.modalContent.style.left;
                        const top = this.modalContent.style.top;
                        // Si detectamos un cambio en style o class, comprobaremos
                        // el estilo computado y forzaremos left/top/position/transform
                        // con prioridad !important para neutralizar cambios externos
                        const comp = getComputedStyle(this.modalContent);
                        const compLeft = comp.left;
                        const compTop = comp.top;
                        const compPos = comp.position;
                        const compTransform = comp.transform;

                        const needFix = (this._fixedLeft != null && this._fixedTop != null) && (
                            compLeft !== this._fixedLeft || compTop !== this._fixedTop || compPos !== 'fixed' || (compTransform && compTransform !== 'none' && compTransform.indexOf('translateY') === -1)
                        );

                        if (needFix) {
                            try {
                                // force left/top/position with important priority
                                this.modalContent.style.setProperty('position', 'fixed', 'important');
                                this.modalOverlay && this.modalOverlay.style && this.modalOverlay.style.setProperty && this.modalOverlay.style.setProperty('position', 'fixed', 'important');
                                this.modalContent.style.setProperty('left', this._fixedLeft, 'important');
                                this.modalContent.style.setProperty('top', this._fixedTop, 'important');
                                // ensure transform is our animation-only value
                                this.modalContent.style.setProperty('transform', 'translateY(0)', 'important');
                            } catch (e) {}
                            const now2 = Date.now();
                            if (!this._lastOverrideLogTime || now2 - this._lastOverrideLogTime > 500) {
                                this._lastOverrideLogTime = now2;
                                try {
                                    const err2 = new Error('hover-modal: forced important override');
                                    console.warn('hover-modal: forced important override ->', { left: this._fixedLeft, top: this._fixedTop, pos: 'fixed' }, err2.stack.split('\n').slice(0,4).join('\n'));
                                } catch (e) { console.warn('hover-modal: forced important override', { left: this._fixedLeft, top: this._fixedTop }); }
                            }
                        } else {
                            // If not needFix but style/class mutated, optionally log for diagnosis
                            if (left || top) {
                                try {
                                    const err = new Error('hover-modal: detected style/class mutation on modal-content');
                                    console.warn('hover-modal: mutation detected ->', { left, top, compLeft, compTop, compPos, compTransform }, err.stack.split('\n').slice(0,4).join('\n'));
                                } catch (e) { console.warn('hover-modal: mutation detected', { left, top, compLeft, compTop, compPos, compTransform }); }
                            }
                        }
                    }
                }
            });
            this._mutationObserver.observe(this.modalContent, { attributes: true, attributeFilter: ['style','class'] });
        } catch (e) {
            // ignore if MutationObserver unsupported or fails
        }

        // Estado para mantener posición fija cuando el modal está visible
        this._fixedLeft = null;
        this._fixedTop = null;
        this._lastOverrideLogTime = 0;
        this._scrollRaf = null;
        this._onScroll = null;
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
    // remember whether the modal was visible BEFORE this call —
    // we must not early-return for the first show() invocation.
    const alreadyVisible = !!this.isVisible;
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
    // Allow pointer events on overlay so modalContent can receive mouseenter/mouseleave reliably
    this.modalOverlay.style.display = 'block';
    this.modalOverlay.style.pointerEvents = 'auto';
        // force reflow so computed sizes are correct
        void this.modalContent.offsetWidth;


        // If modal was already visible BEFORE this call, update content but keep
        // its current position (do not recompute left/top). This prevents the
        // modal from 'siguiendo' al ratón si show() es invocado repetidamente
        // por re-renders/autoplay/etc. IMPORTANT: use alreadyVisible (the
        // previous state) so the initial show() still computes position.
        if (alreadyVisible) {
            this.cancelHide();
            this._currentItem = item;
            // keep existing origin so position stays fixed; only update if not set
            this._currentOrigin = this._currentOrigin || itemElement;
            window.activeItem = item;
            // ensure 'show' class is present so it remains visible
            this.modalContent.classList.add('show');
            return;
        }

        const position = this.calculateModalPosition(itemElement);

        // Compute modal size and position the top-left corner explicitly so we
        // avoid relying on CSS translate(-50%,-50%) which can behave oddly when
        // ancestor elements have transforms or when other scripts override styles.
        const computed = getComputedStyle(this.modalContent);
        const modalWidth = parseFloat(computed.width) || this.modalContent.offsetWidth;
        const modalHeight = parseFloat(computed.height) || this.modalContent.offsetHeight;

        // position.left/top returned are the center coordinates (viewport-based).
        const leftPx = Math.round(position.left - (modalWidth / 2));
        const topPx = Math.round(position.top - (modalHeight / 2));

        // Apply explicit left/top (viewport coordinates) using important to
        // make it harder for other styles/scripts to override.
        try {
            this.modalContent.style.setProperty('left', `${leftPx}px`, 'important');
            this.modalContent.style.setProperty('top', `${topPx}px`, 'important');
            this.modalContent.style.setProperty('position', 'fixed', 'important');
        } catch (e) {
            // fallback
            this.modalContent.style.left = `${leftPx}px`;
            this.modalContent.style.top = `${topPx}px`;
            try { this.modalContent.style.position = 'fixed'; } catch (e) {}
        }

    // Record fixed position so MutationObserver can revert external changes
    this._fixedLeft = getComputedStyle(this.modalContent).left || this.modalContent.style.left;
    this._fixedTop = getComputedStyle(this.modalContent).top || this.modalContent.style.top;

        // Use inline transform/opacity for the show animation so it's controlled
        // by JS and not by stylesheet transforms that may be overridden.
        try {
            this.modalContent.style.transition = 'opacity 300ms ease, transform 300ms ease';
            this.modalContent.style.transform = 'translateY(20px)';
            this.modalContent.style.opacity = '0';
            // force reflow
            void this.modalContent.offsetWidth;
            this.modalContent.style.opacity = '1';
            this.modalContent.style.transform = 'translateY(0)';
        } catch (e) {
            // ignore if inline style setting fails
        }

        // Ensure modal uses fixed positioning (inline) so ancestor rules can't
        // change its positioning behavior. Also ensure no centering translate
        // interferes by setting transform explicitly (we use left/top).
        try {
            this.modalContent.style.position = 'fixed';
            this.modalOverlay.style.position = 'fixed';
            // Remove CSS centering transform to avoid double offsets; we keep
            // a translateY animation only.
            // Note: we do not set translate(-50%,-50%) so left/top represent
            // the modal's top-left corner.
            // Keep pointer events enabled for interaction.
            this.modalContent.style.pointerEvents = 'auto';
        } catch (e) {}

        // Scroll enforcement: during scroll, re-apply the fixed left/top values
        // using RAF to prevent the modal from being moved by other scripts or
        // by layout changes. This is throttled and removed on close.
        if (!this._onScroll) {
            this._onScroll = () => {
                if (!this.isVisible) return;
                if (this._scrollRaf) return;
                this._scrollRaf = window.requestAnimationFrame(() => {
                    try {
                            if (this._fixedLeft != null && this._fixedTop != null) {
                            try {
                                this.modalContent.style.setProperty('left', this._fixedLeft, 'important');
                                this.modalContent.style.setProperty('top', this._fixedTop, 'important');
                                this.modalContent.style.setProperty('position', 'fixed', 'important');
                            } catch (e) {
                                this.modalContent.style.left = this._fixedLeft;
                                this.modalContent.style.top = this._fixedTop;
                                try { this.modalContent.style.position = 'fixed'; } catch (e) {}
                            }
                        }
                    } catch (e) {}
                    this._scrollRaf = null;
                });
            };
            try { window.addEventListener('scroll', this._onScroll, { passive: true }); } catch(e){}
        }

        // Recalculate on window resize to keep modal within viewport bounds
        // (optional; does not run on scroll so modal stays fixed once opened)
        if (!this._onWindowResize) {
            this._onWindowResize = () => {
                if (!this.isVisible) return;
                const pos = this.calculateModalPosition(this._currentOrigin || itemElement);
                const computed2 = getComputedStyle(this.modalContent);
                const mw = parseFloat(computed2.width) || this.modalContent.offsetWidth;
                const mh = parseFloat(computed2.height) || this.modalContent.offsetHeight;
                const lx = Math.round(pos.left - (mw / 2));
                const ty = Math.round(pos.top - (mh / 2));
                try {
                    this.modalContent.style.setProperty('left', `${lx}px`, 'important');
                    this.modalContent.style.setProperty('top', `${ty}px`, 'important');
                    this.modalContent.style.setProperty('position', 'fixed', 'important');
                } catch (e) {
                    this.modalContent.style.left = `${lx}px`;
                    this.modalContent.style.top = `${ty}px`;
                    try { this.modalContent.style.position = 'fixed'; } catch (e) {}
                }
                // Update fixed values on resize
                this._fixedLeft = getComputedStyle(this.modalContent).left || this.modalContent.style.left;
                this._fixedTop = getComputedStyle(this.modalContent).top || this.modalContent.style.top;
            };
            window.addEventListener('resize', this._onWindowResize);
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
            // clear fixed position state
            this._fixedLeft = null;
            this._fixedTop = null;
            // remove resize handler when modal fully closed
            if (this._onWindowResize) {
                window.removeEventListener('resize', this._onWindowResize);
                this._onWindowResize = null;
            }
            // remove scroll handler (if present) and any RAF scheduled
            if (this._onScroll) {
                try { window.removeEventListener('scroll', this._onScroll); } catch(e){}
                this._onScroll = null;
            }
            if (this._scrollRaf) {
                try { window.cancelAnimationFrame(this._scrollRaf); } catch(e){}
                this._scrollRaf = null;
            }
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

        // Use viewport coordinates (getBoundingClientRect) and position with
        // `position: fixed` so the modal stays in the same place while the
        // page is scrolled. Clamp to viewport edges to avoid overflow.
        const rect = itemElement.getBoundingClientRect();
        const modalStyle = getComputedStyle(this.modalContent);
        const modalWidth = parseFloat(modalStyle.width) || this.modalContent.offsetWidth;
        const modalHeight = parseFloat(modalStyle.height) || this.modalContent.offsetHeight;

        // Center the modal horizontally on the item's center in the viewport
        let leftPosition = rect.left + (rect.width / 2);
        // Because CSS uses transform: translate(-50%, -50%), we set left/top to
        // the center point (in viewport coordinates). We must clamp to viewport
        // so the modal doesn't go off-screen.
        const vpWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
        const vpHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

        // Clamp horizontal center so modal stays fully inside viewport
        const minCenterX = modalWidth / 2 + 8; // 8px margin
        const maxCenterX = vpWidth - (modalWidth / 2) - 8;
        leftPosition = Math.min(Math.max(leftPosition, minCenterX), maxCenterX);

        // Vertical center
        let topPosition = rect.top + (rect.height / 2);
        const minCenterY = modalHeight / 2 + 8;
        const maxCenterY = vpHeight - (modalHeight / 2) - 8;
        topPosition = Math.min(Math.max(topPosition, minCenterY), maxCenterY);

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