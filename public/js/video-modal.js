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

        // Helper to safely construct URL objects (add https:// if missing)
        const makeUrl = (raw) => {
            try { return new URL(raw); }
            catch (e) {
                try { return new URL('https://' + raw.replace(/^:\/\//, '')); }
                catch (e2) { return null; }
            }
        };

        // If youtube, use direct embed and skip fallback logic
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const embedUrl = this.getYouTubeEmbedUrl(url);
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

        // Attempt to normalize the provided URL and prepare preferred/fallback variants
        let provided = makeUrl(url);
        let preferredUrl = null;
        let fallbackUrl = null;

        if (provided) {
            // If the provided host already matches primary, preferred = provided
            if (provided.host.includes('upn.one') || provided.host === PRIMARY) {
                preferredUrl = provided.href;
                // build fallback by replacing host
                try { const u2 = new URL(preferredUrl); u2.host = SECONDARY; fallbackUrl = u2.href; } catch (e) { fallbackUrl = null; }
            } else if (provided.host.includes('strp2p.live') || provided.host === SECONDARY) {
                // If provided is secondary, still try primary first by swapping host
                try { const upnCandidate = new URL(provided.href); upnCandidate.host = PRIMARY; preferredUrl = upnCandidate.href; } catch (e) { preferredUrl = provided.href; }
                fallbackUrl = provided.href;
            } else {
                // Unknown host: attempt both by constructing variants replacing hostname if possible
                preferredUrl = provided.href;
                try { const swap = new URL(preferredUrl); swap.host = PRIMARY; preferredUrl = swap.href; swap.host = SECONDARY; fallbackUrl = swap.href; } catch (e) { fallbackUrl = null; }
            }
        } else {
            // As a fallback, attempt naive string replacements
            if (url.includes('upn.one')) {
                preferredUrl = url;
                fallbackUrl = url.replace(/upn\.one/g, 'strp2p.live');
            } else if (url.includes('strp2p.live')) {
                preferredUrl = url.replace(/strp2p\.live/g, 'upn.one');
                fallbackUrl = url;
            } else {
                preferredUrl = url;
                fallbackUrl = null;
            }
        }

        // Function to attempt loading into iframe with fallback logic
        const tryLoad = (first, second) => {
            if (!first && !second) return;
            this.isPlaying = true;
            this.videoModalOverlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';

            const iframe = this.videoIframe;

            // cleanup helpers
            if (this._loadTimeout) { clearTimeout(this._loadTimeout); this._loadTimeout = null; }
            const cleanup = () => {
                if (this._loadTimeout) { clearTimeout(this._loadTimeout); this._loadTimeout = null; }
                iframe.onload = null;
                iframe.onerror = null;
            };

            const setSrcAndWatch = (src, onSuccess, onFail, timeoutMs = 3500) => {
                try {
                    iframe.src = src;
                } catch (e) {
                    onFail && onFail(e);
                    return;
                }

                let didFinish = false;

                iframe.onload = () => {
                    if (didFinish) return; didFinish = true;
                    cleanup();
                    onSuccess && onSuccess();
                };

                iframe.onerror = () => {
                    if (didFinish) return; didFinish = true;
                    cleanup();
                    onFail && onFail(new Error('iframe error'));
                };

                // Timeout: if iframe doesn't load in time, treat as failure and try fallback
                this._loadTimeout = setTimeout(() => {
                    if (didFinish) return;
                    didFinish = true;
                    cleanup();
                    onFail && onFail(new Error('timeout'));
                }, timeoutMs);
            };

            // Try primary
            if (first) {
                setSrcAndWatch(first, () => {
                    // success on primary
                }, (err) => {
                    // attempt secondary if available
                    if (second) {
                        setSrcAndWatch(second, () => {}, (err2) => {
                            // both failed
                            console.error('VideoModal: fallo al cargar primary y fallback', err, err2);
                            cleanup();
                            this.isPlaying = false;
                            iframe.src = '';
                            // show minimal error UI inside overlay
                            this.showLoadError();
                        });
                    } else {
                        console.error('VideoModal: fallo al cargar primary y no hay fallback', err);
                        cleanup();
                        this.isPlaying = false;
                        iframe.src = '';
                        this.showLoadError();
                    }
                });
            } else if (second) {
                // Only second available
                setSrcAndWatch(second, () => {}, (err) => {
                    console.error('VideoModal: fallo al cargar (solo fallback) ', err);
                    cleanup();
                    this.isPlaying = false;
                    iframe.src = '';
                    this.showLoadError();
                });
            }
        };

        tryLoad(preferredUrl, fallbackUrl);
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