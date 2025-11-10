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

        let resolvedShareUrl = item.shareUrl || null;
        if (!resolvedShareUrl && typeof window.generateShareUrl === 'function') {
            try {
                resolvedShareUrl = window.generateShareUrl(item, window.location.href);
            } catch (err) {
                console.warn('ShareModal: generateShareUrl falló, usando fallback', err);
            }
        }

        if (!resolvedShareUrl) {
            try {
                const url = new URL(window.location.href);
                const hashParts = [];
                if (item.id) hashParts.push('id=' + encodeURIComponent(item.id));
                const normalizedTitle = this.normalizeText(item.title || '');
                if (normalizedTitle) hashParts.push('title=' + encodeURIComponent(normalizedTitle));
                if (hashParts.length) url.hash = hashParts.join('&');
                resolvedShareUrl = url.toString();
            } catch (err) {
                resolvedShareUrl = window.location.href;
            }
        }

        item.shareUrl = resolvedShareUrl;

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

        if (this.shareLinkInput) this.shareLinkInput.value = resolvedShareUrl;
        this.currentShareUrl = resolvedShareUrl;
        this.applyShareMeta(item, resolvedShareUrl);

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

    applyShareMeta(item, shareUrl) {
        if (!item) return;

        if (window.detailsModal && typeof window.detailsModal.updateMetaTags === 'function') {
            try {
                window.detailsModal.updateMetaTags(item);
                return;
            } catch (err) {
                console.warn('ShareModal: no se pudo delegar updateMetaTags', err);
            }
        }

        const title = `Mira ${item.title || 'este contenido'} en nuestra plataforma`;
        const description = item.description || 'Descubre más contenido en Todogram.';
        const imageUrl = item.posterUrl || 'https://via.placeholder.com/194x271';
        let resolvedUrl = shareUrl;

        if (!resolvedUrl) {
            try {
                const baseUrl = new URL(window.location.href);
                if (item.id) {
                    const normalizedTitle = this.normalizeText(item.title || '');
                    const params = new URLSearchParams();
                    params.set('id', item.id);
                    if (normalizedTitle) params.set('title', normalizedTitle);
                    baseUrl.hash = params.toString();
                }
                resolvedUrl = baseUrl.toString();
            } catch (err) {
                resolvedUrl = window.location.href;
            }
        }

        this.ensureMetaElement('og-title', 'property', 'og:title').setAttribute('content', title);
        this.ensureMetaElement('og-description', 'property', 'og:description').setAttribute('content', description);
        this.ensureMetaElement('og-image', 'property', 'og:image').setAttribute('content', imageUrl);
        this.ensureMetaElement('og-url', 'property', 'og:url').setAttribute('content', resolvedUrl);
        this.ensureMetaElement(null, 'property', 'og:type').setAttribute('content', 'website');
        this.ensureMetaElement(null, 'property', 'og:site_name').setAttribute('content', 'Todogram');
        this.ensureMetaElement(null, 'name', 'description').setAttribute('content', description);
        this.ensureMetaElement('twitter-title', 'name', 'twitter:title').setAttribute('content', title);
        this.ensureMetaElement('twitter-description', 'name', 'twitter:description').setAttribute('content', description);
        this.ensureMetaElement('twitter-image', 'name', 'twitter:image').setAttribute('content', imageUrl);
        this.ensureMetaElement(null, 'name', 'twitter:card').setAttribute('content', 'summary_large_image');

        let canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.rel = 'canonical';
            document.head.appendChild(canonical);
        }
        canonical.href = resolvedUrl;
    }

    ensureMetaElement(id, attrName, attrValue) {
        let el = null;
        if (id) el = document.getElementById(id);
        if (!el) {
            try {
                el = document.head.querySelector(`meta[${attrName}="${attrValue}"]`);
            } catch (err) {
                el = null;
            }
        }
        if (!el) {
            el = document.createElement('meta');
            if (attrName && attrValue) el.setAttribute(attrName, attrValue);
            if (id) el.id = id;
            document.head.appendChild(el);
        } else {
            if (id) el.id = id;
            if (attrName && attrValue) el.setAttribute(attrName, attrValue);
        }
        return el;
    }

    normalizeText(text) {
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }
}