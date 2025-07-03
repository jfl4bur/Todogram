// Variables
const shareModalOverlay = document.getElementById('share-modal-overlay');
const shareModalContent = document.getElementById('share-modal-content');
const shareModalClose = document.getElementById('share-modal-close');
const sharePreviewImage = document.getElementById('share-preview-image');
const sharePreviewTitle = document.getElementById('share-preview-title');
const sharePreviewDescription = document.getElementById('share-preview-description');
const shareLinkInput = document.getElementById('share-link-input');
const shareLinkButton = document.getElementById('share-link-button');
let currentShareUrl = '';

export function showShareModal(item) {
    if (!item) return;
    
    // Crear URL de compartir
    const normalizedTitle = normalizeText(item.title);
    currentShareUrl = `${window.location.origin}${window.location.pathname}#id=${item.id}&title=${normalizedTitle}`;
    
    // Actualizar elementos del modal
    sharePreviewImage.src = item.posterUrl;
    sharePreviewImage.onerror = function() {
        this.src = 'https://via.placeholder.com/194x271';
    };
    
    sharePreviewTitle.textContent = item.title;
    
    // Limitar la descripción a 120 caracteres con puntos suspensivos
    const maxLength = 120;
    let description = item.description || 'Descripción no disponible';
    if (description.length > maxLength) {
        description = description.substring(0, maxLength) + '...';
    }
    sharePreviewDescription.textContent = description;
    
    shareLinkInput.value = currentShareUrl;
    
    // Actualizar metatags para compartir
    updateMetaTags(item);
    
    // Mostrar el modal
    shareModalOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => {
        shareModalContent.style.opacity = '1';
        shareModalContent.style.transform = 'translateY(0)';
    }, 10);
}

function shareOnSocial(network) {
    if (!currentShareUrl || !activeItem) return;
    
    const title = `Mira ${activeItem.title} en nuestra plataforma`;
    const text = `${activeItem.title}: ${activeItem.description ? activeItem.description.substring(0, 100) + '...' : 'Una gran película que no te puedes perder'}`;
    const imageUrl = activeItem.posterUrl || 'https://via.placeholder.com/194x271';
    
    let shareUrl = '';
    
    switch(network) {
        case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentShareUrl)}`;
            break;
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(currentShareUrl)}`;
            break;
        case 'whatsapp':
            shareUrl = `https://wa.me/?text=${encodeURIComponent(title + ' ' + currentShareUrl)}`;
            break;
        case 'telegram':
            shareUrl = `https://t.me/share/url?url=${encodeURIComponent(currentShareUrl)}&text=${encodeURIComponent(title)}`;
            break;
        default:
            return;
    }
    
    window.open(shareUrl, '_blank', 'width=600,height=400');
}

function copyShareLink() {
    if (!currentShareUrl) return;
    
    shareLinkInput.select();
    document.execCommand('copy');
    
    // Mostrar feedback
    const originalText = shareLinkButton.textContent;
    shareLinkButton.textContent = '¡Copiado!';
    shareLinkButton.style.backgroundColor = '#4CAF50';
    
    setTimeout(() => {
        shareLinkButton.textContent = originalText;
        shareLinkButton.style.backgroundColor = '';
    }, 2000);
}

function closeShareModal() {
    shareModalContent.style.opacity = '0';
    shareModalContent.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        shareModalOverlay.style.display = 'none';
        document.body.style.overflow = 'auto';
    }, 300);
}

shareModalOverlay.addEventListener('click', (e) => {
    if (e.target === shareModalOverlay) {
        closeShareModal();
    }
});

shareModalClose.addEventListener('click', (e) => {
    e.stopPropagation();
    closeShareModal();
});

shareLinkButton.addEventListener('click', copyShareLink);

// Event listeners para los botones de compartir
document.addEventListener('click', function(e) {
    // Botones de redes sociales
    if (e.target.closest('#share-facebook')) {
        shareOnSocial('facebook');
    }
    if (e.target.closest('#share-twitter')) {
        shareOnSocial('twitter');
    }
    if (e.target.closest('#share-whatsapp')) {
        shareOnSocial('whatsapp');
    }
    if (e.target.closest('#share-telegram')) {
        shareOnSocial('telegram');
    }
    if (e.target.closest('#share-link')) {
        copyShareLink();
    }
});