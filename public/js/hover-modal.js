// Variables
const modalOverlay = document.getElementById('modal-overlay');
const modalContent = document.getElementById('modal-content');
const modalBackdrop = document.getElementById('modal-backdrop');
const modalBody = document.getElementById('modal-body');
let isModalOpen = false;

function calculateModalPosition(itemElement) {
    const rect = itemElement.getBoundingClientRect();
    const carouselRect = carouselContainer.getBoundingClientRect();
    const modalWidth = parseFloat(getComputedStyle(modalContent).width);
    
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

export function showModal(item, itemElement) {
    isModalOpen = true;
    
    // Priorizar imágenes de data.json
    const backdropUrl = item.backgroundUrl || item.posterUrl;
    
    modalBackdrop.src = backdropUrl;
    modalBackdrop.onerror = function() {
        this.src = 'https://www.themoviedb.org/assets/2/v4/glyphicons/basic/glyphicons-basic-4-user-grey-d8fe957375e70239d6abdd549fd7568c89281b2179b5f4470e2e12895792dfa5.svg';
    };
    
    const trailerUrl = item.trailerUrl;
    
    let metaItems = [];
    
    if (item.year) metaItems.push(`<span>${item.year}</span>`);
    
    if (item.duration) metaItems.push(`<span>${item.duration}</span>`);
    
    if (item.genre) metaItems.push(`<span>${item.genre}</span>`);
    
    if (item.ageRating) metaItems.push(`<span class="age-rating">${item.ageRating}</span>`);
    
    if (item.rating) metaItems.push(`
        <div class="rating">
            <i class="fas fa-star"></i>
            <span>${item.rating}</span>
        </div>
    `);
    
    let actionButtons = '';
    
    if (item.videoUrl) {
        actionButtons += `
            <button class="modal-action-btn" data-video-url="${item.videoUrl}">
                <i class="fas fa-play"></i>
                <span>Ver Película</span>
            </button>
            <button class="modal-action-btn" onclick="window.open('${generateDownloadUrl(item.videoUrl)}', '_blank')">
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
    
    modalBody.innerHTML = `
        <h2>${item.title}</h2>
        <div class="meta-info">
            ${metaItems.join('')}
        </div>
        <p class="description">${item.description}</p>
        ${actionButtons ? `<div class="modal-actions">${actionButtons}</div>` : ''}
        <a href="${item.link}" style="display:inline-block;margin-top:15px;padding:8px 15px;background:var(--primary-color);color:white;text-decoration:none;border-radius:4px;">Más información</a>
    `;
    
    const position = calculateModalPosition(itemElement);
    
    modalContent.style.left = `${position.left}px`;
    modalContent.style.top = `${position.top}px`;
    modalContent.style.transform = 'translate(-50%, -50%) scale(0.9)';
    
    modalOverlay.style.display = 'block';
    
    void modalContent.offsetWidth;
    
    modalContent.style.opacity = '1';
    modalContent.style.transform = 'translate(-50%, -50%) scale(1)';
    
    modalContent.addEventListener('mouseleave', () => {
        if (!window.matchMedia("(max-width: 768px)").matches) {
            closeModal();
        }
    });
    
    document.querySelectorAll('.modal-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const videoUrl = btn.getAttribute('data-video-url');
            showVideoModal(videoUrl);
        });
    });
    
    modalContent.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!window.matchMedia("(max-width: 768px)").matches) {
            closeModal();
            showDetailsModal(item, itemElement);
        }
    });
    
    activeItem = item;
}

function closeModal() {
    modalContent.style.opacity = '0';
    modalContent.style.transform = 'translate(-50%, -50%) scale(0.9)';
    
    setTimeout(() => {
        modalOverlay.style.display = 'none';
        isModalOpen = false;
        activeItem = null;
        hoverModalItem = null;
    }, 150);
}

modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
        closeModal();
    }
});

// Función global para generar URL de descarga
window.generateDownloadUrl = function(videoUrl) {
    if (!videoUrl) return '#';
    
    if (videoUrl.includes('?') || videoUrl.includes('#')) {
        return videoUrl + '&dl=1';
    }
    
    return videoUrl + '?dl=1';
};