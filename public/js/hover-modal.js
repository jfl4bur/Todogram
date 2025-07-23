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

        if (!this.modalOverlay || !this.modalContent || !this.carouselContainer) {
            console.error("Elementos del hover modal no encontrados");
            return;
        }
    }

    show(item, itemElement) {
        if (!itemElement || !(itemElement instanceof HTMLElement)) {
            console.error('itemElement no válido');
            return;
        }

        window.isModalOpen = true;
        
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
        // Mostrar age-rating (campo "Clasificación")
        if (item.ageRating) metaItems.push(`<span class="age-rating">${item.ageRating}</span>`);
        
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
        
        this.modalContent.addEventListener('mouseleave', () => {
            if (!window.matchMedia("(max-width: 768px)").matches) {
                this.close();
            }
        });
        
        this.modalContent.querySelectorAll('[data-video-url]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const videoUrl = btn.getAttribute('data-video-url');
                window.videoModal.play(videoUrl);
            });
        });
        
        this.modalContent.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!window.matchMedia("(max-width: 768px)").matches) {
                this.close();
                window.detailsModal.show(item, itemElement);
            }
        });
        
        // Evento para el botón compartir
        this.modalContent.querySelector('#share-button').addEventListener('click', (e) => {
            e.stopPropagation();
            const item = window.activeItem;
            if (item && window.shareModal) {
                const currentUrl = window.location.href;
                const shareUrl = window.generateShareUrl(item, currentUrl);
                window.shareModal.show({ ...item, shareUrl });
            }
        });
        
        // Comportamiento de tooltips en móviles
        if (window.matchMedia("(max-width: 480px)").matches) {
            this.modalContent.querySelectorAll('.details-modal-action-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    if (this.classList.contains('active')) {
                        return;
                    }
                    this.classList.add('active');
                    setTimeout(() => {
                        this.classList.remove('active');
                    }, 2000);
                });
            });
        }
        
        window.activeItem = item;
    }

    close() {
        if (this.hoverModalTimeout) {
            clearTimeout(this.hoverModalTimeout);
        }
        
        this.modalContent.style.opacity = '0';
        this.modalContent.style.transform = 'translate(-50%, -50%) scale(0.9)';
        
        setTimeout(() => {
            this.modalOverlay.style.display = 'none';
            window.isModalOpen = false;
            window.activeItem = null;
            window.hoverModalItem = null;
        }, 150);
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