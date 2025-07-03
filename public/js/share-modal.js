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

        if (!this.shareModalOverlay || !this.shareModalContent) {
            console.error("Elementos del modal de compartir no encontrados");
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
        document.getElementById('share-facebook').addEventListener('click', () => this.shareOnSocial('facebook'));
        document.getElementById('share-twitter').addEventListener('click', () => this.shareOnSocial('twitter'));
        document.getElementById('share-whatsapp').addEventListener('click', () => this.shareOnSocial('whatsapp'));
        document.getElementById('share-telegram').addEventListener('click', () => this.shareOnSocial('telegram'));
        document.getElementById('share-link').addEventListener('click', () => this.copyShareLink());
    }

    show(item) {
        if (!item) return;
        
        // Crear URL de compartir
        const normalizedTitle = this.normalizeText(item.title);
        this.currentShareUrl = `${window.location.origin}${window.location.pathname}#id=${item.id}&title=${normalizedTitle}`;
        
        // Actualizar elementos del modal
        this.sharePreviewImage.src = item.posterUrl;
        this.sharePreviewImage.onerror = function() {
            this.src = 'https://via.placeholder.com/194x271';
        };
        
        this.sharePreviewTitle.textContent = item.title;
        
        // Limitar la descripción a 120 caracteres con puntos suspensivos
        const maxLength = 120;
        let description = item.description || 'Descripción no disponible';
        if (description.length > maxLength) {
            description = description.substring(0, maxLength) + '...';
        }
        this.sharePreviewDescription.textContent = description;
        
        this.shareLinkInput.value = this.currentShareUrl;
        
        // Actualizar metatags para compartir
        this.updateMetaTags(item);
        
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
        
        // Mostrar feedback
        const originalText = this.shareLinkButton.textContent;
        this.shareLinkButton.textContent = '¡Copiado!';
        this.shareLinkButton.style.backgroundColor = '#4CAF50';
        
        setTimeout(() => {
            this.shareLinkButton.textContent = originalText;
            this.shareLinkButton.style.backgroundColor = '';
        }, 2000);
    }

    shareOnSocial(network) {
        if (!this.currentShareUrl || !window.activeItem) return;
        
        const title = `Mira ${window.activeItem.title} en nuestra plataforma`;
        const text = `${window.activeItem.title}: ${window.activeItem.description ? window.activeItem.description.substring(0, 100) + '...' : 'Una gran película que no te puedes perder'}`;
        const imageUrl = window.activeItem.posterUrl || 'https://via.placeholder.com/194x271';
        
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
        if (!item) return;
        
        const title = `Mira ${item.title} en nuestra plataforma`;
        const description = item.description || 'Una gran película que no te puedes perder';
        const imageUrl = item.posterUrl || 'https://via.placeholder.com/194x271';
        const url = `${window.location.origin}${window.location.pathname}#id=${item.id}&title=${this.normalizeText(item.title)}`;
        
        // Actualizar metatags
        document.getElementById('og-title').content = title;
        document.getElementById('og-description').content = description;
        document.getElementById('og-image').content = imageUrl;
        document.getElementById('og-url').content = url;
        document.getElementById('twitter-title').content = title;
        document.getElementById('twitter-description').content = description;
        document.getElementById('twitter-image').content = imageUrl;
        
        // Actualizar también la URL canónica
        const canonicalLink = document.querySelector('link[rel="canonical"]') || document.createElement('link');
        canonicalLink.rel = 'canonical';
        canonicalLink.href = url;
        document.head.appendChild(canonicalLink);
        
        // Forzar a Facebook a refrescar los metatags
        if (navigator.userAgent.includes('Facebook')) {
            fetch(`https://graph.facebook.com/?id=${encodeURIComponent(url)}&scrape=true&method=post`);
        }
    }
}