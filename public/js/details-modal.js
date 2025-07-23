class DetailsModal {
    constructor() {
        this.detailsModalOverlay = document.getElementById('details-modal-overlay');
        this.detailsModalContent = document.getElementById('details-modal-content');
        this.detailsModalBackdrop = document.getElementById('details-modal-backdrop');
        this.detailsModalBody = document.getElementById('details-modal-body');
        this.detailsModalClose = document.getElementById('details-modal-close');
        this.activeItem = null;
        this.isDetailsModalOpen = false;
        this.TMDB_API_KEY = 'f28077ae6a89b54c86be927ea88d64d9';

        if (!this.detailsModalOverlay || !this.detailsModalContent) {
            console.error("Elementos del modal de detalles no encontrados");
            return;
        }

        this.setupEventListeners();
        
        this.galleryModal = document.createElement('div');
        this.galleryModal.id = 'gallery-modal';
        this.galleryModal.className = 'gallery-modal';
        this.galleryModal.innerHTML = `
            <div class="gallery-modal-content">
                <span class="gallery-modal-close">&times;</span>
                <img class="gallery-modal-image">
                <div class="gallery-modal-counter"></div>
                <button class="gallery-modal-prev">&#10094;</button>
                <button class="gallery-modal-next">&#10095;</button>
            </div>
        `;
        document.body.appendChild(this.galleryModal);

        this.galleryImage = this.galleryModal.querySelector('.gallery-modal-image');
        this.galleryCounter = this.galleryModal.querySelector('.gallery-modal-counter');
        this.galleryClose = this.galleryModal.querySelector('.gallery-modal-close');
        this.galleryPrev = this.galleryModal.querySelector('.gallery-modal-prev');
        this.galleryNext = this.galleryModal.querySelector('.gallery-modal-next');

        this.galleryClose.addEventListener('click', () => this.closeGallery());
        this.galleryPrev.addEventListener('click', () => this.navigateGallery(-1));
        this.galleryNext.addEventListener('click', () => this.navigateGallery(1));
        this.galleryModal.addEventListener('click', (e) => {
            if (e.target === this.galleryModal) this.closeGallery();
        });

        this.galleryImages = [];
        this.currentGalleryIndex = 0;
    }

    setupEventListeners() {
        this.detailsModalClose.addEventListener('click', (e) => {
            e.stopPropagation();
            this.close();
        });
        
        this.detailsModalOverlay.addEventListener('click', (e) => {
            if (e.target === this.detailsModalOverlay) {
                this.close();
            }
        });
    }

    async show(item, itemElement) {
        this.isDetailsModalOpen = true;
        this.updateUrlForModal(item);
        
        this.detailsModalBody.innerHTML = `
            <div style="display:flex; justify-content:center; align-items:center; height:100%;">
                <div class="skeleton-spinner"></div>
            </div>
        `;
        
        this.detailsModalOverlay.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        if (this.isIOS()) {
            document.getElementById('ios-helper').offsetHeight;
            this.detailsModalContent.style.display = 'none';
            setTimeout(() => {
                this.detailsModalContent.style.display = 'block';
            }, 50);
        }

        let tmdbData = null;
        if (item.tmdbUrl) {
            tmdbData = await this.fetchTMDBData(item.tmdbUrl);
        }
        
        let tmdbImages = { posters: [], backdrops: [] };
        if (item.tmdbUrl) {
            tmdbImages = await this.fetchTMDBImages(item.tmdbUrl);
        }
        
        // Usar postersUrl si está disponible (campo "Carteles")
        const backdropUrl = item.postersUrl || item.backgroundUrl || item.posterUrl || (tmdbImages.backdrops[0]?.file_path || item.posterUrl);
        
        this.detailsModalBackdrop.src = backdropUrl;
        this.detailsModalBackdrop.onerror = function() {
            this.src = 'https://www.themoviedb.org/assets/2/v4/glyphicons/basic/glyphicons-basic-4-user-grey-d8fe957375e70239d6abdd549fd7568c89281b2179b5f4470e2e12895792dfa5.svg';
        };
        
        const trailerUrl = item.trailerUrl || (tmdbData?.trailer_url || '');
        
        let metaItems = [];
        
        if (item.year) metaItems.push(`<span class="details-modal-meta-item">${item.year}</span>`);
        if (item.duration) metaItems.push(`<span class="details-modal-meta-item">${item.duration}</span>`);
        if (item.genre) metaItems.push(`<span class="details-modal-meta-item">${item.genre}</span>`);
        
        const ageRating = tmdbData?.certification || item.ageRating;
        if (ageRating) metaItems.push(`<span class="details-modal-meta-item"> <span class="age-rating">${ageRating}</span></span>`);
        
        if (item.rating) metaItems.push(`
            <span class="details-modal-meta-item rating">
                <i class="fas fa-star"></i> ${item.rating}
                ${item.tmdbUrl ? `<img src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg" class="details-modal-tmdb-logo" alt="TMDB" onclick="window.open('${item.tmdbUrl}', '_blank')">` : ''}
            </span>
        `);
        
        const audioSubtitlesSection = this.createAudioSubtitlesSection(item.audiosCount, item.subtitlesCount, item.audioList, item.subtitleList);
        
        let actionButtons = '';
        let secondaryButtons = '';
        
        if (item.videoUrl) {
            actionButtons += `
                <button class="details-modal-action-btn primary big-btn" data-video-url="${item.videoUrl}">
                    <i class="fas fa-play"></i>
                    <span>Ver Película</span>
                    <span class="tooltip">Reproducir</span>
                </button>
            `;
        }
        
        if (item.videoUrl) {
            secondaryButtons += `
                <button class="details-modal-action-btn circular" onclick="window.open('${this.generateDownloadUrl(item.videoUrl)}', '_blank')">
                    <i class="fas fa-download"></i>
                    <span class="tooltip">Descargar</span>
                </button>
            `;
        }
        
        if (trailerUrl) {
            secondaryButtons += `
                <button class="details-modal-action-btn circular" data-video-url="${trailerUrl}">
                    <i class="fas fa-film"></i>
                    <span class="tooltip">Ver Tráiler</span>
                </button>
            `;
        }
        
        secondaryButtons += `
            <button class="details-modal-action-btn circular" id="share-button">
                <i class="fas fa-share-alt"></i>
                <span class="tooltip">Compartir</span>
            </button>
        `;
        
        let infoItems = '';
        
        if (tmdbData?.original_title && tmdbData.original_title.toLowerCase() !== item.title.toLowerCase()) {
            infoItems += `
                <div class="details-modal-info-item">
                    <div class="details-modal-info-label">Título original</div>
                    <div class="details-modal-info-value">${tmdbData.original_title}</div>
                </div>
            `;
        }
        
        if (item.year) {
            infoItems += `
                <div class="details-modal-info-item">
                    <div class="details-modal-info-label">Año</div>
                    <div class="details-modal-info-value">${item.year}</div>
                </div>
            `;
        }
        
        if (item.duration) {
            infoItems += `
                <div class="details-modal-info-item">
                    <div class="details-modal-info-label">Duración</div>
                    <div class="details-modal-info-value">${item.duration}</div>
                </div>
            `;
        }
        
        if (item.genre) {
            infoItems += `
                <div class="details-modal-info-item">
                    <div class="details-modal-info-label">Género</div>
                    <div class="details-modal-info-value">${item.genre}</div>
                </div>
            `;
        }
        
        if (ageRating) {
            infoItems += `
                <div class="details-modal-info-item">
                    <div class="details-modal-info-label">Clasificación</div>
                    <div class="details-modal-info-value"> <span class="age-rating">${ageRating}</span></div>
                </div>
            `;
        }
        
        if (tmdbData?.production_companies) {
            infoItems += `
                <div class="details-modal-info-item">
                    <div class="details-modal-info-label">Productora(s)</div>
                    <div class="details-modal-info-value">${tmdbData.production_companies}</div>
                </div>
            `;
        }
        
        if (tmdbData?.production_countries) {
            infoItems += `
                <div class="details-modal-info-item">
                    <div class="details-modal-info-label">País(es)</div>
                    <div class="details-modal-info-value">${tmdbData.production_countries}</div>
                </div>
            `;
        }
        
        if (tmdbData?.status) {
            infoItems += `
                <div class="details-modal-info-item">
                    <div class="details-modal-info-label">Estado</div>
                    <div class="details-modal-info-value">${tmdbData.status}</div>
                </div>
            `;
        }
        
        if (tmdbData?.spoken_languages) {
            infoItems += `
                <div class="details-modal-info-item">
                    <div class="details-modal-info-label">Idioma(s) original(es)</div>
                    <div class="details-modal-info-value">${tmdbData.spoken_languages}</div>
                </div>
            `;
        }
        
        let taglineSection = '';
        if (tmdbData?.tagline) {
            taglineSection = `
                <div class="details-modal-tagline">"${tmdbData.tagline}"</div>
            `;
        }
        
        const description = item.description || (tmdbData?.overview || 'Descripción no disponible');
        
        const directorsSection = tmdbData?.directors?.length > 0 ? this.createCrewSection(tmdbData.directors, 'Director(es)') : '';
        const writersSection = tmdbData?.writers?.length > 0 ? this.createCrewSection(tmdbData.writers, 'Escritor(es)') : '';
        const castSection = tmdbData?.cast?.length > 0 ? this.createCastSection(tmdbData.cast) : '';
        
        const posters = tmdbImages.posters;
        const backdrops = tmdbImages.backdrops;
        
        const postersGallery = posters.length > 0 ? this.createGallerySkeleton('poster', 5) : '';
        const backdropsGallery = backdrops.length > 0 ? this.createGallerySkeleton('backdrop', 4) : '';
        
        this.detailsModalBody.innerHTML = `
            <h1 class="details-modal-title">${item.title}</h1>
            
            ${tmdbData?.original_title && tmdbData.original_title.toLowerCase() !== item.title.toLowerCase() ? `
                <div class="details-modal-original-title">${tmdbData.original_title}</div>
            ` : ''}
            
            <div class="details-modal-meta">
                ${metaItems.join('<span class="details-modal-meta-separator">•</span>')}
            </div>
            
            ${audioSubtitlesSection}
            
            <div class="details-modal-actions">
                <div class="primary-action-row">
                    ${actionButtons}
                </div>
                <div class="secondary-actions-row">
                    ${secondaryButtons}
                </div>
            </div>
            
            ${taglineSection}
            
            <div class="details-modal-description">
                ${description}
            </div>
            
            <div class="details-modal-info">
                ${infoItems}
            </div>
            
            ${directorsSection}
            ${writersSection}
            ${castSection}
            
            ${postersGallery}
            ${backdropsGallery}
        `;
        
        void this.detailsModalOverlay.offsetWidth;
        
        this.detailsModalOverlay.style.opacity = '1';
        this.detailsModalContent.style.transform = 'translateY(0)';
        this.detailsModalContent.style.opacity = '1';
        
        setTimeout(() => {
            if (posters.length > 0) {
                const postersSection = this.createGallerySection(posters, 'Carteles', 'posters');
                const postersContainer = this.detailsModalBody.querySelector('.details-modal-gallery-section:has(.gallery-skeleton)');
                if (postersContainer) {
                    postersContainer.outerHTML = postersSection;
                }
            }
            
            if (backdrops.length > 0) {
                const backdropsSection = this.createGallerySection(backdrops, 'Imágenes de fondo', 'backdrops');
                const backdropsContainer = this.detailsModalBody.querySelectorAll('.details-modal-gallery-section:has(.gallery-skeleton)')[1] || 
                                           this.detailsModalBody.querySelector('.details-modal-gallery-section:has(.gallery-skeleton)');
                if (backdropsContainer) {
                    backdropsContainer.outerHTML = backdropsSection;
                }
            }
            
            this.detailsModalBody.querySelectorAll('.details-modal-action-btn[data-video-url]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const videoUrl = btn.getAttribute('data-video-url');
                    window.videoModal.play(videoUrl);
                });
            });
            
            this.detailsModalBody.querySelectorAll('.details-modal-gallery-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    const galleryType = item.getAttribute('data-gallery-type');
                    const showMore = item.getAttribute('data-show-more');
                    const index = parseInt(item.getAttribute('data-index') || 0);
                    const images = galleryType === 'posters' ? posters : backdrops;
                    
                    if (showMore === 'true') {
                        this.showGallery(images, 0);
                    } else if (images && images.length > 0) {
                        this.showGallery(images, index);
                    }
                });
            });
            
            // Evento para el botón compartir
            this.detailsModalBody.querySelector('#share-button').addEventListener('click', (e) => {
                e.stopPropagation();
                const item = window.activeItem;
                if (item && window.shareModal) {
                    const currentUrl = window.location.href;
                    const shareUrl = window.generateShareUrl(item, currentUrl);
                    window.shareModal.show({ ...item, shareUrl });
                }
            });
            
            // Manejo de tooltips en móviles
            if (window.matchMedia("(max-width: 480px)").matches) {
                this.detailsModalBody.querySelectorAll('.details-modal-action-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        if (this.classList.contains('active')) {
                            return;
                        }
                        this.classList.add('active');
                        setTimeout(() => {
                            this.classList.remove('active');
                        }, 2000);
                    });
                });
            }
            
        }, 100);
        
        if (this.isIOS()) {
            this.detailsModalContent.style.animation = 'none';
            requestAnimationFrame(() => {
                this.detailsModalContent.style.animation = 'iosModalIn 0.4s ease-out forwards';
            });
        }
        
        window.activeItem = item;
    }

    close() {
        this.detailsModalContent.style.transform = 'translateY(20px)';
        this.detailsModalContent.style.opacity = '0';
        this.detailsModalOverlay.style.opacity = '0';
        
        setTimeout(() => {
            this.detailsModalOverlay.style.display = 'none';
            document.body.style.overflow = 'auto';
            this.isDetailsModalOpen = false;
            window.activeItem = null;
            this.restoreUrl();
        }, 300);
    }
    
    showGallery(images, startIndex = 0) {
        if (!images || images.length === 0) return;
        
        this.galleryImages = images;
        this.currentGalleryIndex = startIndex;
        
        this.updateGalleryImage();
        this.galleryModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        document.addEventListener('keydown', this.handleGalleryKeydown);
        this.galleryModal.addEventListener('wheel', this.handleGalleryWheel);
    }

    closeGallery() {
        this.galleryModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        document.removeEventListener('keydown', this.handleGalleryKeydown);
        this.galleryModal.removeEventListener('wheel', this.handleGalleryWheel);
    }

    updateGalleryImage() {
        const image = this.galleryImages[this.currentGalleryIndex];
        this.galleryImage.src = image.file_path;
        this.galleryCounter.textContent = `${this.currentGalleryIndex + 1} / ${this.galleryImages.length}`;
        
        this.galleryPrev.disabled = this.currentGalleryIndex === 0;
        this.galleryNext.disabled = this.currentGalleryIndex === this.galleryImages.length - 1;
    }

    navigateGallery(direction) {
        this.currentGalleryIndex += direction;
        
        if (this.currentGalleryIndex < 0) {
            this.currentGalleryIndex = this.galleryImages.length - 1;
        } else if (this.currentGalleryIndex >= this.galleryImages.length) {
            this.currentGalleryIndex = 0;
        }
        
        this.updateGalleryImage();
    }

    handleGalleryKeydown = (e) => {
        if (!this.galleryModal.style.display || this.galleryModal.style.display === 'none') return;
        
        switch (e.key) {
            case 'ArrowLeft':
                this.navigateGallery(-1);
                break;
            case 'ArrowRight':
                this.navigateGallery(1);
                break;
            case 'Escape':
                this.closeGallery();
                break;
        }
    };

    handleGalleryWheel = (e) => {
        if (!this.galleryModal.style.display || this.galleryModal.style.display === 'none') return;
        
        e.preventDefault();
        if (e.deltaY > 0) {
            this.navigateGallery(1);
        } else {
            this.navigateGallery(-1);
        }
    };

    isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.platform) || 
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }

    normalizeText(text) {
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    updateUrlForModal(item) {
        if (!item || item.id === '0') return;

        const normalizedTitle = this.normalizeText(item.title);
        const newHash = `id=${item.id}&title=${normalizedTitle}`;
        
        if (window.location.hash.substring(1) !== newHash) {
            window.history.replaceState(null, null, `${window.location.pathname}#${newHash}`);
        }
        
        this.updateMetaTags(item);
    }

    restoreUrl() {
        if (window.location.hash) {
            window.history.replaceState(null, null, window.location.pathname);
        }
    }

    updateMetaTags(item) {
        if (!item) return;
        
        const title = `Mira ${item.title} en nuestra plataforma`;
        const description = item.description || 'Una gran película que no te puedes perder';
        const imageUrl = item.posterUrl || 'https://via.placeholder.com/194x271';
        const url = `${window.location.origin}${window.location.pathname}#id=${item.id}&title=${this.normalizeText(item.title)}`;
        
        document.getElementById('og-title').content = title;
        document.getElementById('og-description').content = description;
        document.getElementById('og-image').content = imageUrl;
        document.getElementById('og-url').content = url;
        document.getElementById('twitter-title').content = title;
        document.getElementById('twitter-description').content = description;
        document.getElementById('twitter-image').content = imageUrl;
        
        const canonicalLink = document.querySelector('link[rel="canonical"]') || document.createElement('link');
        canonicalLink.rel = 'canonical';
        canonicalLink.href = url;
        document.head.appendChild(canonicalLink);
        
        if (navigator.userAgent.includes('Facebook')) {
            fetch(`https://graph.facebook.com/?id=${encodeURIComponent(url)}&scrape=true&method=post`);
        }
    }

    async fetchTMDBPoster(tmdbUrl) {
        if (!tmdbUrl) return '';
        
        try {
            const tmdbId = tmdbUrl.match(/movie\/(\d+)/)?.[1];
            if (!tmdbId) return '';
            
            const response = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${this.TMDB_API_KEY}`);
            if (!response.ok) return '';
            
            const data = await response.json();
            return data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : '';
        } catch (error) {
            console.error('Error fetching TMDB poster:', error);
            return '';
        }
    }

    async fetchTMDBImages(tmdbUrl) {
        if (!tmdbUrl) return { posters: [], backdrops: [] };
        
        try {
            const tmdbId = tmdbUrl.match(/movie\/(\d+)/)?.[1];
            if (!tmdbId) return { posters: [], backdrops: [] };
            
            const response = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/images?api_key=${this.TMDB_API_KEY}`);
            if (!response.ok) return { posters: [], backdrops: [] };
            
            const data = await response.json();
            
            const posters = data.posters?.map(poster => ({
                file_path: `https://image.tmdb.org/t/p/w500${poster.file_path}`
            })) || [];
            
            const backdrops = data.backdrops?.map(backdrop => ({
                file_path: `https://image.tmdb.org/t/p/w1280${backdrop.file_path}`
            })) || [];
            
            return { posters, backdrops };
        } catch (error) {
            console.error('Error fetching TMDB images:', error);
            return { posters: [], backdrops: [] };
        }
    }

    async fetchTMDBData(tmdbUrl) {
        if (!tmdbUrl) return null;
        
        try {
            const tmdbId = tmdbUrl.match(/movie\/(\d+)/)?.[1];
            if (!tmdbId) return null;
            
            const response = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${this.TMDB_API_KEY}&language=es-ES&append_to_response=credits,videos,release_dates`);
            if (!response.ok) return null;
            
            const data = await response.json();
            
            let certification = '';
            const releaseDates = data.release_dates?.results?.find(r => r.iso_3166_1 === 'ES');
            if (releaseDates) {
                certification = releaseDates.release_dates[0]?.certification || '';
            }
            
            let trailerUrl = '';
            const trailer = data.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer');
            if (trailer) {
                trailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
            }
            
        const directors = [];
        const writers = [];
        
        if (data.credits?.crew) {
            data.credits.crew.forEach(person => {
                if (person.job === 'Director') {
                    directors.push({
                        id: person.id,
                        name: person.name,
                        profile_path: person.profile_path
                    });
                } else if (person.job === 'Writer' || person.job === 'Screenplay') {
                    writers.push({
                        id: person.id,
                        name: person.name,
                        profile_path: person.profile_path
                    });
                }
            });
        }
        
        const cast = [];
        if (data.credits?.cast) {
            data.credits.cast.slice(0, 10).forEach(actor => {
                cast.push({
                    id: actor.id,
                    name: actor.name,
                    character: actor.character,
                    profile_path: actor.profile_path
                });
            });
        }
        
        return {
            original_title: data.original_title,
            tagline: data.tagline,
            release_date: data.release_date,
            runtime: data.runtime,
            genres: data.genres?.map(g => g.name).join(', '),
            vote_average: data.vote_average?.toFixed(1),
            certification: certification,
            overview: data.overview,
            production_companies: data.production_companies?.map(c => c.name).join(', '),
            production_countries: data.production_countries?.map(c => c.name).join(', '),
            spoken_languages: data.spoken_languages?.map(l => l.name).join(', '),
            status: data.status,
            trailer_url: trailerUrl,
            directors: directors,
            writers: writers,
            cast: cast
        };
    } catch (error) {
        console.error('Error fetching TMDB data:', error);
        return null;
    }
}

createGallerySkeleton(type, count) {
    const skeletonItems = [];
    for (let i = 0; i < count; i++) {
        skeletonItems.push(`
            <div class="gallery-skeleton-item ${type}">
                <div class="gallery-skeleton-spinner"></div>
            </div>
        `);
    }
    
    return `
        <div class="details-modal-gallery-section">
            <h3 class="details-modal-gallery-title">${type === 'poster' ? 'Carteles' : 'Imágenes de fondo'}</h3>
            <div class="gallery-skeleton">
                ${skeletonItems.join('')}
            </div>
        </div>
    `;
}

createGallerySection(images, title, type) {
    if (!images || images.length === 0) return '';
    
    const showCount = type === 'posters' ? 5 : 4;
    const itemClass = type === 'posters' ? 'poster' : 'backdrop';
    
    return `
        <div class="details-modal-gallery-section">
            <h3 class="details-modal-gallery-title">${title}</h3>
            <div class="details-modal-gallery-list">
                ${images.slice(0, showCount).map((image, index) => `
                    <div class="details-modal-gallery-item ${itemClass}" data-gallery-type="${type}" data-index="${index}">
                        <img class="details-modal-gallery-image" 
                             src="${image.file_path}" 
                             loading="lazy"
                             alt="${title} - ${type} ${index + 1}">
                    </div>
                `).join('')}
                ${images.length > showCount ? `
                    <div class="details-modal-gallery-item more" data-gallery-type="${type}" data-show-more="true">
                        <i class="fas fa-images"></i>
                        <span>Ver más (${images.length - showCount})</span>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

createCastSection(cast) {
    if (!cast || cast.length === 0) return '';
    
    return `
        <div class="details-modal-cast">
            <h3 class="details-modal-cast-title">Reparto principal</h3>
            <div class="details-modal-cast-list">
                ${cast.map(person => `
                    <div class="details-modal-cast-item">
                        <img class="details-modal-cast-photo" 
                             src="${person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : 'https://www.themoviedb.org/assets/2/v4/glyphicons/basic/glyphicons-basic-4-user-grey-d8fe957375e70239d6abdd549fd7568c89281b2179b5f4470e2e12895792dfa5.svg'}" 
                             alt="${person.name}"
                             loading="lazy">
                        <div class="details-modal-cast-name">${person.name}</div>
                        <div class="details-modal-cast-character">${person.character}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

createCrewSection(crew, title) {
    if (!crew || crew.length === 0) return '';
    
    return `
        <div class="details-modal-crew">
            <h3 class="details-modal-crew-title">${title}</h3>
            <div class="details-modal-crew-list">
                ${crew.slice(0, 6).map(person => `
                    <div class="details-modal-crew-item">
                        <img class="details-modal-crew-photo" 
                             src="${person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : 'https://www.themoviedb.org/assets/2/v4/glyphicons/basic/glyphicons-basic-4-user-grey-d8fe957375e70239d6abdd549fd7568c89281b2179b5f4470e2e12895792dfa5.svg'}" 
                             alt="${person.name}"
                             loading="lazy">
                        <div class="details-modal-crew-info">
                            <div class="details-modal-crew-name">${person.name}</div>
                            <div class="details-modal-crew-role">${title}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

createAudioSubtitlesSection(audiosCount, subtitlesCount, audioList, subtitleList) {
    let audioContent = '';
    let subtitleContent = '';
    
    if (audioList.length > 0) {
        audioContent = `
            <div class="audio-subtitles-item" onclick="this.classList.toggle('expanded')">
                <i class="fas fa-volume-up"></i>
                <span>Audios (${audiosCount})</span>
                <div class="expandable-content">
                    ${audioList.map(audio => `<div>· ${audio}</div>`).join('')}
                </div>
            </div>
        `;
    }
    
    if (subtitleList.length > 0) {
        subtitleContent = `
            <div class="audio-subtitles-item" onclick="this.classList.toggle('expanded')">
                <i class="fas fa-closed-captioning"></i>
                <span>Subtítulos (${subtitlesCount})</span>
                <div class="expandable-content">
                    ${subtitleList.map(sub => `<div>· ${sub}</div>`).join('')}
                </div>
            </div>
        `;
    }
    
    if (audioContent || subtitleContent) {
        return `
            <div class="audio-subtitles-info">
                ${audioContent}
                ${audioContent && subtitleContent ? '<span class="details-modal-meta-separator">•</span>' : ''}
                ${subtitleContent}
            </div>
        `;
    }
    
    return '';
}

generateDownloadUrl(videoUrl) {
    if (!videoUrl) return '#';
    
    if (videoUrl.includes('?') || videoUrl.includes('#')) {
        return videoUrl + '&dl=1';
    }
    
    return videoUrl + '?dl=1';
}
}