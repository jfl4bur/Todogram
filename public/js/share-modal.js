class ShareModal {
    constructor() {
        this.shareModalOverlay = document.getElementById('share-modal-overlay');
        this.shareModalContent = document.getElementById('share-modal-content');
        this.shareModalClose = document.getElementById('share-modal-close');
        this.sharePreviewImage = document.getElementById('share-preview-image');
        this.sharePreviewTitle = document.getElementById('share-preview-title');
        this.sharePreviewDescription = document.getElementById('share-preview-description');
        this.shareLinkInput = document.getElementById('share-link-input');
        this.shareLinkButton = document.getElementById('share-link-button');
        this.currentShareUrl = '';

        if (!this.shareModalOverlay || !this.shareModalContent || !this.shareModalClose || !this.sharePreviewImage || 
            !this.sharePreviewTitle || !this.sharePreviewDescription || !this.shareLinkInput || !this.shareLinkButton) {
            console.error("Algunos elementos del modal de compartir no encontrados:", {
                shareModalOverlay: this.shareModalOverlay,
                shareModalContent: this.shareModalContent,
                shareModalClose: this.shareModalClose,
                sharePreviewImage: this.sharePreviewImage,
                sharePreviewTitle: this.sharePreviewTitle,
                sharePreviewDescription: this.sharePreviewDescription,
                shareLinkInput: this.shareLinkInput,
                shareLinkButton: this.shareLinkButton
            });
            return;
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.shareModalClose.addEventListener('click', (e) => {
            e.stopPropagation();
            this.close();
        });
        
        this.shareModalOverlay.addEventListener('click', (e) => {
            if (e.target === this.shareModalOverlay) {
                this.close();
            }
        });
        
        this.shareLinkButton.addEventListener('click', () => this.copyShareLink());
        
        // Eventos para los botones de compartir en redes sociales
        document.getElementById('share-facebook')?.addEventListener('click', () => this.shareOnSocial('facebook'));
        document.getElementById('share-twitter')?.addEventListener('click', () => this.shareOnSocial('twitter'));
        document.getElementById('share-whatsapp')?.addEventListener('click', () => this.shareOnSocial('whatsapp'));
        document.getElementById('share-telegram')?.addEventListener('click', () => this.shareOnSocial('telegram'));
        document.getElementById('share-link')?.addEventListener('click', () => this.copyShareLink());
    }

    show(item) {
        if (!item || !item.shareUrl) {
            console.error('Item o shareUrl no definidos:', item);
            return;
        }
        
        // Actualizar elementos del modal
        this.sharePreviewImage.src = item.posterUrl || 'https://via.placeholder.com/194x271';
        this.sharePreviewImage.onerror = function() {
            this.src = 'https://via.placeholder.com/194x271';
        };
        
        this.sharePreviewTitle.textContent = item.title || 'Título no disponible';
        
        const maxLength = 120;
        let description = item.description || 'Descripción no disponible';
        if (description.length > maxLength) {
            description = description.substring(0, maxLength) + '...';
        }
        this.sharePreviewDescription.textContent = description;
        
        this.shareLinkInput.value = item.shareUrl;
        this.currentShareUrl = item.shareUrl;
        
        // Mostrar el modal
        this.shareModalOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        setTimeout(() => {
            this.shareModalContent.style.opacity = '1';
            this.shareModalContent.style.transform = 'translateY(0)';
        }, 10);
    }

    close() {
        this.shareModalContent.style.opacity = '0';
        this.shareModalContent.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            this.shareModalOverlay.style.display = 'none';
            document.body.style.overflow = 'auto';
        }, 300);
    }

    copyShareLink() {
        if (!this.currentShareUrl) return;
        
        this.shareLinkInput.select();
        document.execCommand('copy');
        
        const originalText = this.shareLinkButton.textContent;
        this.shareLinkButton.textContent = '¡Copiado!';
        this.shareLinkButton.style.backgroundColor = '#4CAF50';
        
        setTimeout(() => {
            this.shareLinkButton.textContent = originalText;
            this.shareLinkButton.style.backgroundColor = '';
        }, 2000);
    }

    shareOnSocial(network) {
        if (!this.currentShareUrl) return;
        
        const title = `Mira ${this.sharePreviewTitle.textContent} en nuestra plataforma`;
        const text = `${this.sharePreviewTitle.textContent}: ${this.sharePreviewDescription.textContent}`;
        let shareUrl = '';
        
        switch(network) {
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.currentShareUrl)}`;
                break;
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(this.currentShareUrl)}`;
                break;
            case 'whatsapp':
                shareUrl = `https://wa.me/?text=${encodeURIComponent(title + ' ' + this.currentShareUrl)}`;
                break;
            case 'telegram':
                shareUrl = `https://t.me/share/url?url=${encodeURIComponent(this.currentShareUrl)}&text=${encodeURIComponent(title)}`;
                break;
            default:
                return;
        }
        
        window.open(shareUrl, '_blank', 'width=600,height=400');
    }

    normalizeText(text) {
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    updateMetaTags(item) {
        // Este método no se usa actualmente con la solución estática, pero se mantiene por compatibilidad
        if (!item) return;
    }
}