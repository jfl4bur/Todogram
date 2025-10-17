class HoverModal {
    constructor() {
        this.modalOverlay = document.getElementById('modal-overlay');
        this.modalContent = document.getElementById('modal-content');
        this.modalBackdrop = document.getElementById('modal-backdrop');
        this.modalBody = document.getElementById('modal-body');
        this.carouselContainer = document.querySelector('.carousel-container');
        this.activeItem = null;
        this.hoverModalItem = null;
        this.hoverModalOrigin = { x: 0, y: 0 };
        this.hoverModalTimeout = null;
        this.isVisible = false;

        if (!this.modalOverlay || !this.modalContent || !this.carouselContainer) {
            console.error("Elementos del hover modal no encontrados");
            return;
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
    }

    show(item, itemElement) {
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
        
        if (item.videoUrl) {
            actionButtons += `
                <div class="primary-action-row">
                    <button class="details-modal-action-btn primary" data-video-url="${item.videoUrl}">
                        <i class="fas fa-play"></i>
                        <span>Ver Película</span>
                        <span class="tooltip">Reproducir</span>
                    </button>
                </div>
            `;
        }
        
        let secondaryButtons = '<div class="secondary-actions-row">';
        
        if (item.videoUrl) {
            secondaryButtons += `
                <button class="details-modal-action-btn circular" onclick="window.open('${this.generateDownloadUrl(item.videoUrl)}', '_blank')">
                    <i class="fas fa-download"></i>
                    <span class="tooltip">Descargar</span>
                </button>
            `;
        }
        
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
        
        const position = this.calculateModalPosition(itemElement);

        this.modalContent.style.left = `${position.left}px`;
        this.modalContent.style.top = `${position.top}px`;
        this.modalContent.style.transform = 'translate(-50%, -50%) scale(0.9)';

        this.modalOverlay.style.display = 'block';

        void this.modalContent.offsetWidth;

        this.modalContent.style.opacity = '1';
        this.modalContent.style.transform = 'translate(-50%, -50%) scale(1)';

        // Store current item and origin for use by delegated handlers
        this._currentItem = item;
        this._currentOrigin = itemElement;
        window.activeItem = item;
    }

    close() {
        // clear any pending hide timer
        this.cancelHide();
        this.isVisible = false;
        this.modalContent.style.opacity = '0';
        this.modalContent.style.transform = 'translate(-50%, -50%) scale(0.9)';

        setTimeout(() => {
            this.modalOverlay.style.display = 'none';
            window.isModalOpen = false;
            window.activeItem = null;
            window.hoverModalItem = null;
            this._currentItem = null;
            this._currentOrigin = null;
        }, 150);
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
            if (item && window.shareModal) {
                const currentUrl = window.location.href;
                const shareUrl = window.generateShareUrl(item, currentUrl);
                window.shareModal.show({ ...item, shareUrl });
            }
            return;
        }

        // data-video-url button
        const videoUrl = actionEl.getAttribute('data-video-url');
        if (videoUrl && window.videoModal) {
            window.videoModal.play(videoUrl);
        }
    }

    calculateModalPosition(itemElement) {
        if (!itemElement || !this.carouselContainer) {
            return { top: 0, left: 0 };
        }

        const rect = itemElement.getBoundingClientRect();
        const carouselRect = this.carouselContainer.getBoundingClientRect();
        const modalWidth = parseFloat(getComputedStyle(this.modalContent).width);
        
        let leftPosition = rect.left + (rect.width / 2);
        
        if (leftPosition - (modalWidth / 2) < carouselRect.left) {
            leftPosition = carouselRect.left + (modalWidth / 2);
        }
        
        if (leftPosition + (modalWidth / 2) > carouselRect.right) {
            leftPosition = carouselRect.right - (modalWidth / 2);
        }
        
        const topPosition = rect.top + (rect.height / 2);
        
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