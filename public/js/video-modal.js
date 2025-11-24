class VideoModal {
    constructor() {
        this.videoModalOverlay = document.getElementById('video-modal-overlay');
        this.videoModalClose = document.getElementById('video-modal-close');
        this.videoIframe = document.getElementById('video-iframe');
        this.isPlaying = false;
        
        // Option B Button creation
        this.optionBBtn = document.createElement('button');
        this.optionBBtn.innerText = 'Opción B';
        this.optionBBtn.className = 'video-modal-option-b';
        // Style it to look like a button next to close
        this.optionBBtn.style.cssText = `
position: absolute;
top: 20px;
right: 80px; /* Left of the close button */
z - index: 10001;
background: rgba(255, 255, 255, 0.2);
color: white;
border: 1px solid white;
padding: 5px 10px;
cursor: pointer;
border - radius: 5px;
display: none; /* Hidden by default */
`;
        if (this.videoModalOverlay) {
            this.videoModalOverlay.appendChild(this.optionBBtn);
        }

        this.currentVideo1 = null;
        this.currentVideo2 = null;
        this.activeVideo = 1;

        if (!this.videoModalOverlay || !this.videoIframe) {
            console.error("Elementos del modal de video no encontrados");
            return;
        }

        // Fix for mobile/TV playback: ensure iframe has necessary permissions
        this.videoIframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write');
        this.videoIframe.setAttribute('allowfullscreen', 'true');

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.videoModalClose.addEventListener('click', () => {
            this.close();
        });

        this.videoModalOverlay.addEventListener('click', (e) => {
            if (e.target === this.videoModalOverlay) {
                this.close();
            }
        });
        
        // Option B click handler
        this.optionBBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent closing modal
            this.toggleVideoSource();
        });
    }

    toggleVideoSource() {
        if (this.activeVideo === 1 && this.currentVideo2) {
            this.activeVideo = 2;
            this.optionBBtn.innerText = 'Opción A';
            this.loadVideo(this.currentVideo2);
        } else if (this.activeVideo === 2 && this.currentVideo1) {
            this.activeVideo = 1;
            this.optionBBtn.innerText = 'Opción B';
            this.loadVideo(this.currentVideo1);
        }
    }

    play(url1, url2 = null) {
        this.currentVideo1 = url1;
        this.currentVideo2 = url2;
        this.activeVideo = 1;
        
        // Reset button state
        this.optionBBtn.innerText = 'Opción B';
        
        if (this.currentVideo2) {
            this.optionBBtn.style.display = 'block';
        } else {
            this.optionBBtn.style.display = 'none';
        }

        this.loadVideo(url1);
    }

    loadVideo(url) {
        if (!url || this.isPlaying) return; // Only prevent re-play if already playing the *same* video, or if no URL

        // If caller passed an item object or an array of URLs, normalize to candidate list
        const normalizeToCandidates = (input) => {
            // If string, return array with that string
            if (!input) return [];
            if (Array.isArray(input)) return input.filter(Boolean);
            if (typeof input === 'string') return [input];
            // If it's an item-like object, extract likely video fields
            const candidates = [];
            const pushIf = (val) => { if (val && typeof val === 'string' && val.trim() !== '') candidates.push(val.trim()); };
            // Common field names found in dataset
            pushIf(input.videoIframe || input.videoIframe1 || input.videoUrl || input.video);
            // add separately if both exist
            pushIf(input.videoIframe1);
            pushIf(input.videoUrl);
            // also include legacy names
            pushIf(input.videoIframe);
            // Remove duplicates preserving order
            return [...new Set(candidates)];
        };

        const candidates = normalizeToCandidates(url);
        if (!candidates || candidates.length === 0) return;

        // Helper to safely construct URL objects (add https:// if missing)
        const makeUrl = (raw) => {
            try { return new URL(raw); }
            catch (e) {
                try { return new URL('https://' + raw.replace(/^:\/\//, '')); }
                catch (e2) { return null; }
            }
        };

        // If a single candidate is youtube, handle it directly
        if (candidates.length === 1 && (candidates[0].includes('youtube.com') || candidates[0].includes('youtu.be'))) {
            const embedUrl = this.getYouTubeEmbedUrl(candidates[0]);
            if (!embedUrl) return;
            this.isPlaying = true;
            this.videoIframe.src = embedUrl;
            this.videoModalOverlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            return;
        }

        // Domains to prioritize
        const PRIMARY = 'todogram.upn.one';
        const SECONDARY = 'todogram.strp2p.live';

        // Build candidate list including host-swapped variants when possible (prefer upn.one)
        const expandCandidates = (list) => {
            const expanded = [];
            for (const raw of list) {
                if (!raw) continue;
                expanded.push(raw);
                const u = makeUrl(raw);
                if (!u) continue;
                // If it's upn.one, push an strp2p variant as fallback
                if (u.host.includes('upn.one')) {
                    try { const alt = new URL(u.href); alt.host = 'todogram.strp2p.live'; expanded.push(alt.href); } catch (e) { }
                } else if (u.host.includes('strp2p.live')) {
                    try { const alt = new URL(u.href); alt.host = 'todogram.upn.one'; expanded.push(alt.href); } catch (e) { }
                }
            }
            // Remove duplicates preserving order
            return [...new Set(expanded)];
        };

        const expandedCandidates = expandCandidates(candidates);

        // Attempt to load candidates sequentially
        const iframe = this.videoIframe;
        if (this._loadTimeout) { clearTimeout(this._loadTimeout); this._loadTimeout = null; }

        const attemptIndex = { i: 0 };

        const attemptNext = () => {
            if (attemptIndex.i >= expandedCandidates.length) {
                // all failed
                console.error('VideoModal: todos los candidatos fallaron', expandedCandidates);
                this.isPlaying = false;
                iframe.src = '';
                this.showLoadError();
                return;
            }

            const src = expandedCandidates[attemptIndex.i++];
            let didFinish = false;

            const cleanupAttempt = () => {
                if (this._loadTimeout) { clearTimeout(this._loadTimeout); this._loadTimeout = null; }
                iframe.onload = null;
                iframe.onerror = null;
            };

            iframe.onload = () => {
                if (didFinish) return; didFinish = true;
                cleanupAttempt();
                // success
            };

            iframe.onerror = () => {
                if (didFinish) return; didFinish = true;
                cleanupAttempt();
                // try next
                attemptNext();
            };

            // Timeout per attempt
            this._loadTimeout = setTimeout(() => {
                if (didFinish) return; didFinish = true;
                cleanupAttempt();
                attemptNext();
            }, 4000);

            // Set iframe to candidate
            // REVERTIDO: El proxy no funciona en este hosting gratuito (bloqueo 403/CURL).
            // Volvemos a la carga directa para que al menos el video funcione.
            try { iframe.src = src; } catch (e) { cleanupAttempt(); attemptNext(); }
            // Ensure modal visible
            this.isPlaying = true;
            this.videoModalOverlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        };

        attemptNext();
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
    // For upn embeds we use the url as-is (it already contains the fragment/hash player info)
    return url;
}

showLoadError() {
    try {
        // display a small message overlay inside the video modal when both sources fail
        const container = this.videoModalOverlay.querySelector('.video-error-message') || document.createElement('div');
        container.className = 'video-error-message';
        container.innerHTML = `<div style="padding:20px;color:white;background:rgba(0,0,0,0.85);border-radius:8px;max-width:560px;margin:40px auto;text-align:center;">No se pudo cargar el reproductor. Intenta recargar la página o prueba otro enlace.</div>`;
        // remove existing placeholders
        const existing = this.videoModalOverlay.querySelector('.video-error-message');
        if (existing) existing.remove();
        this.videoModalOverlay.appendChild(container);
        // allow user to close
        setTimeout(() => {
            // keep until user closes or 4s then auto-hide
            setTimeout(() => {
                const el = this.videoModalOverlay.querySelector('.video-error-message');
                if (el) el.remove();
            }, 4000);
        }, 50);
    } catch (e) {
        console.error('VideoModal.showLoadError error', e);
    }
}
}