class VideoModal {
    constructor() {
        this.videoModalOverlay = document.getElementById('video-modal-overlay');
        this.videoModalClose = document.getElementById('video-modal-close');
        this.videoIframe = document.getElementById('video-iframe');
        this.isPlaying = false;

        if (!this.videoModalOverlay || !this.videoIframe) {
            console.error("Elementos del modal de video no encontrados");
            return;
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.videoModalClose.addEventListener('click', (e) => {
            e.stopPropagation();
            this.close();
        });
        
        this.videoModalOverlay.addEventListener('click', (e) => {
            if (e.target === this.videoModalOverlay) {
                this.close();
            }
        });
    }

    play(url) {
        if (!url || this.isPlaying) return;
        
        let embedUrl = '';
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            embedUrl = this.getYouTubeEmbedUrl(url);
        } else if (url.includes('upn.one')) {
            embedUrl = this.getUpnEmbedUrl(url);
        }
        
        if (!embedUrl) return;
        
        this.isPlaying = true;
        this.videoIframe.src = embedUrl;
        this.videoModalOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    close() {
        this.isPlaying = false;
        this.videoIframe.src = '';
        this.videoModalOverlay.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    getYouTubeEmbedUrl(url) {
        if (!url) return '';
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        const videoId = (match && match[2].length === 11) ? match[2] : null;
        return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0` : '';
    }

    getUpnEmbedUrl(url) {
        if (!url) return '';
        return url;
    }
}