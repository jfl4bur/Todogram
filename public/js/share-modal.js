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
        this.isVisible = false;

        // Warn if optional elements are missing but continue: modal can still work with minimal UI
        const missing = [];
        if (!this.shareModalOverlay) missing.push('shareModalOverlay');
        if (!this.shareModalContent) missing.push('shareModalContent');
        if (!this.shareModalClose) missing.push('shareModalClose');
        if (!this.sharePreviewImage) missing.push('sharePreviewImage');
        if (!this.sharePreviewTitle) missing.push('sharePreviewTitle');
        if (!this.sharePreviewDescription) missing.push('sharePreviewDescription');
        if (!this.shareLinkInput) missing.push('shareLinkInput');
        if (!this.shareLinkButton) missing.push('shareLinkButton');
        if (missing.length) console.warn('ShareModal: faltan elementos opcionales en el DOM:', missing);

        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.shareModalClose) {
            this.shareModalClose.addEventListener('click', (e) => {
                e.stopPropagation();
                this.close();
            });
        }

        if (this.shareModalOverlay) {
            this.shareModalOverlay.addEventListener('click', (e) => {
                if (e.target === this.shareModalOverlay) this.close();
            });
        }

        if (this.shareLinkButton) this.shareLinkButton.addEventListener('click', () => this.copyShareLink());

        document.getElementById('share-facebook')?.addEventListener('click', () => this.shareOnSocial('facebook'));
        document.getElementById('share-twitter')?.addEventListener('click', () => this.shareOnSocial('twitter'));
        document.getElementById('share-whatsapp')?.addEventListener('click', () => this.shareOnSocial('whatsapp'));
        document.getElementById('share-telegram')?.addEventListener('click', () => this.shareOnSocial('telegram'));
        document.getElementById('share-link')?.addEventListener('click', () => this.copyShareLink());
    }
    show(item) {
        if (!item || this.isVisible) {
            console.warn('ShareModal.show llamado sin item o modal ya visible', item);
            return;
        }

        // Generar shareUrl si falta
        if (!item.shareUrl) {
            try {
                const url = new URL(window.location.href);
                const hashParts = [];
                if (item.id) hashParts.push('id=' + encodeURIComponent(item.id));
                if (item.title) hashParts.push('title=' + encodeURIComponent(item.title));
                if (hashParts.length) url.hash = hashParts.join('&');
                item.shareUrl = url.toString();
            } catch (err) {
                item.shareUrl = window.location.href;
            }
        }

        this.isVisible = true;

        // Actualizar elementos del modal con datos dinámicos del item (usar guards)
        if (this.sharePreviewImage) {
            this.sharePreviewImage.src = item.posterUrl || 'https://via.placeholder.com/194x271';
            this.sharePreviewImage.onerror = function() { this.src = 'https://via.placeholder.com/194x271'; };
        }

        if (this.sharePreviewTitle) this.sharePreviewTitle.textContent = item.title || 'Título no disponible';

        const maxLength = 120;
        let description = item.description || 'Descripción no disponible';
        if (description.length > maxLength) description = description.substring(0, maxLength) + '...';
        if (this.sharePreviewDescription) this.sharePreviewDescription.textContent = description;

        if (this.shareLinkInput) this.shareLinkInput.value = item.shareUrl;
        this.currentShareUrl = item.shareUrl;

        // Mostrar el modal (si existen elementos)
        if (this.shareModalOverlay) this.shareModalOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        if (this.shareModalContent) {
            setTimeout(() => {
                this.shareModalContent.style.opacity = '1';
                this.shareModalContent.style.transform = 'translateY(0)';
            }, 10);
        }
    }

    close() {
        this.isVisible = false;
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
}