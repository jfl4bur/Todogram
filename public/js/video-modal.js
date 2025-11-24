class VideoModal {
    constructor() {
        this.videoModalOverlay = document.getElementById('video-modal-overlay');
        this.videoModalClose = document.getElementById('video-modal-close');
        this.videoIframe = document.getElementById('video-iframe');
        this.isPlaying = false;

        // State for alternative video sources
        this.videoCandidates = [];
        this.currentVideoIndex = 0;

        if (!this.videoModalOverlay || !this.videoIframe) {
            console.error("Elementos del modal de video no encontrados");
            return;
        }

        // Fix for mobile/TV playback: ensure iframe has necessary permissions
        this.videoIframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write');
        this.videoIframe.setAttribute('allowfullscreen', 'true');

        // Create Option B button dynamically
        this.createOptionBButton();

        this.setupEventListeners();
    }

    createOptionBButton() {
        // Create Option B button if it doesn't exist
        if (!document.getElementById('video-modal-option-b')) {
            const optionBBtn = document.createElement('button');
            optionBBtn.id = 'video-modal-option-b';
            optionBBtn.className = 'video-modal-option-b';
            optionBBtn.textContent = 'Opción B';
            optionBBtn.style.cssText = `
                position: absolute;
                top: 20px;
                right: 80px;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 4px;
                padding: 8px 16px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                z-index: 1001;
                display: none;
                transition: background 0.2s;
            `;
            optionBBtn.addEventListener('mouseenter', () => {
                optionBBtn.style.background = 'rgba(255, 255, 255, 0.2)';
            });
            optionBBtn.addEventListener('mouseleave', () => {
                optionBBtn.style.background = 'rgba(0, 0, 0, 0.7)';
            });
            optionBBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.switchToAlternative();
            });
            this.videoModalOverlay.appendChild(optionBBtn);
        }
        this.videoModalOptionB = document.getElementById('video-modal-option-b');
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

    switchToAlternative() {
        if (this.videoCandidates.length <= 1) return;

        // Move to next candidate
        this.currentVideoIndex = (this.currentVideoIndex + 1) % this.videoCandidates.length;
        const nextUrl = this.videoCandidates[this.currentVideoIndex];

        console.log(`Switching to alternative video ${this.currentVideoIndex + 1}/${this.videoCandidates.length}:`, nextUrl);

        // Update iframe src directly
        this.videoIframe.src = '';
        setTimeout(() => {
            this.videoIframe.src = nextUrl;
        }, 100);
    }

    updateOptionBButton() {
        if (!this.videoModalOptionB) return;

        // Show button only if there are multiple candidates
        if (this.videoCandidates.length > 1) {
            this.videoModalOptionB.style.display = 'block';
            this.videoModalOptionB.textContent = `Opción ${this.currentVideoIndex + 1}/${this.videoCandidates.length}`;
        } else {
            this.videoModalOptionB.style.display = 'none';
        }
    }

    play(url) {
        if (!url || this.isPlaying) return;

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

        const allCandidates = expandCandidates(candidates);

        // Store candidates for Option B button
        this.videoCandidates = allCandidates;
        this.currentVideoIndex = 0;
        this.updateOptionBButton();

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

        // Reset Option B button state
        this.videoCandidates = [];
        this.currentVideoIndex = 0;
        this.updateOptionBButton();
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