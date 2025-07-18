class HoverModal {
    constructor() {
        this.modalOverlay = document.getElementById('modal-overlay');
        this.modalContent = document.getElementById('modal-content');
        this.modalBackdrop = document.getElementById('modal-backdrop');
        this.modalBody = document.getElementById('modal-body');
        this.carouselContainer = document.querySelector('.carousel-container'); // Inicializar carouselContainer
        this.activeItem = null;
        this.hoverModalItem = null;
        this.hoverModalOrigin = { x: 0, y: 0 };
        this.hoverModalTimeout = null;

        // Logs de depuración para verificar los elementos
        console.log('modalOverlay:', this.modalOverlay);
        console.log('modalContent:', this.modalContent);
        console.log('modalBackdrop:', this.modalBackdrop);
        console.log('modalBody:', this.modalBody);
        console.log('carouselContainer:', this.carouselContainer);

        if (!this.modalOverlay || !this.modalContent || !this.carouselContainer) {
            console.error("Elementos del hover modal no encontrados", {
                modalOverlay: this.modalOverlay,
                modalContent: this.modalContent,
                carouselContainer: this.carouselContainer
            });
            return;
        }
    }

    show(item, itemElement) {
        if (!itemElement || !(itemElement instanceof HTMLElement)) {
            console.error('itemElement no está definido o no es un elemento DOM válido:', itemElement);
            return;
        }

        window.isModalOpen = true;
        
        // Priorizar imágenes de data.json
        const backdropUrl = item.backgroundUrl || item.posterUrl;
        
        this.modalBackdrop.src = backdropUrl;
        this.modalBackdrop.onerror = function() {
            this.src = 'https://www.themoviedb.org/assets/2/v4/glyphicons/basic/glyphicons-basic-4-user-grey-d8fe957375e70239d6abdd549fd7568c89281b2179b5f4470e2e12895792dfa5.svg';
        };
        
        const trailerUrl = item.trailerUrl;
        
        let metaItems = [];
        
        if (item.year) metaItems.push(`<span>${item.year}</span>`);
        if (item.duration) metaItems.push(`<span>${item.duration}</span>`);
        if (item.genre) metaItems.push(`<span>${item.genre}</span>`);
        if (item.ageRating) metaItems.push(`<span class="age-rating">${item.ageRating}</span>`);
        if (item.rating) metaItems.push(`<div class="rating"><i class="fas fa-star"></i><span>${item.rating}</span></div>`);
        
        let actionButtons = '';
        
        if (item.videoUrl) {
            actionButtons += `
                <button class="modal-action-btn" data-video-url="${item.videoUrl}">
                    <i class="fas fa-play"></i>
                    <span>Ver Película</span>
                </button>
                <button class="modal-action-btn" onclick="window.open('${this.generateDownloadUrl(item.videoUrl)}', '_blank')">
                    <i class="fas fa-download"></i>
                    <span>Descargar</span>
                </button>
            `;
        }
        
        if (trailerUrl) {
            actionButtons += `
                <button class="modal-action-btn" data-video-url="${trailerUrl}">
                    <i class="fas fa-film"></i>
                    <span>Ver Tráiler</span>
                </button>
            `;
        }
        
        this.modalBody.innerHTML = `
            <h2>${item.title}</h2>
            <div class="meta-info">
                ${metaItems.join('')}
            </div>
            <p class="description">${item.description}</p>
            ${actionButtons ? `<div class="modal-actions">${actionButtons}</div>` : ''}
            <a href="${item.link}" style="display:inline-block;margin-top:15px;padding:8px 15px;background:var(--primary-color);color:white;text-decoration:none;border-radius:4px;">Más información</a>
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
        
        this.modalContent.querySelectorAll('.modal-action-btn').forEach(btn => {
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
        if (!itemElement || !(itemElement instanceof HTMLElement)) {
            console.error('itemElement no es un elemento DOM válido:', itemElement);
            return { top: 0, left: 0 }; // Posición por defecto
        }

        if (!this.carouselContainer || !(this.carouselContainer instanceof HTMLElement)) {
            console.error('carouselContainer no está definido o no es un elemento DOM válido:', this.carouselContainer);
            return { top: 0, left: 0 }; // Posición por defecto
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