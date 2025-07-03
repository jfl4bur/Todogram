// Variables
const detailsModalOverlay = document.getElementById('details-modal-overlay');
const detailsModalContent = document.getElementById('details-modal-content');
const detailsModalBackdrop = document.getElementById('details-modal-backdrop');
const detailsModalBody = document.getElementById('details-modal-body');
const detailsModalClose = document.getElementById('details-modal-close');
let isDetailsModalOpen = false;
const TMDB_API_KEY = 'f28077ae6a89b54c86be927ea88d64d9';

// Función para obtener imágenes de TMDB
async function fetchTMDBImages(tmdbUrl) {
    if (!tmdbUrl) return { posters: [], backdrops: [] };
    
    try {
        const tmdbId = tmdbUrl.match(/movie\/(\d+)/)?.[1];
        if (!tmdbId) return { posters: [], backdrops: [] };
        
        const response = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/images?api_key=${TMDB_API_KEY}`);
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

// Función para obtener datos adicionales de TMDB
async function fetchTMDBData(tmdbUrl) {
    if (!tmdbUrl) return null;
    
    try {
        const tmdbId = tmdbUrl.match(/movie\/(\d+)/)?.[1];
        if (!tmdbId) return null;
        
        const response = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=es-ES&append_to_response=credits,videos,release_dates`);
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

// Función para crear skeleton de galería
function createGallerySkeleton(type, count) {
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

// Función mejorada para crear secciones de galería
function createGallerySection(images, title, type) {
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

function createCastSection(cast) {
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

function createCrewSection(crew, title) {
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

function formatRuntime(minutes) {
    if (!minutes) return 'No disponible';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
}

function formatReleaseDate(dateString) {
    if (!dateString) return 'No disponible';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
}

// Función para crear la sección de audios y subtítulos
function createAudioSubtitlesSection(audiosCount, subtitlesCount, audioList, subtitleList) {
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

export async function showDetailsModal(item, itemElement) {
    isDetailsModalOpen = true;
    updateUrlForModal(item);
    
    detailsModalBody.innerHTML = `
        <div style="display:flex; justify-content:center; align-items:center; height:100%;">
            <div class="skeleton-spinner"></div>
        </div>
    `;
    
    detailsModalOverlay.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    if (isIOS()) {
        iosHelper.offsetHeight;
        detailsModalContent.style.display = 'none';
        setTimeout(() => {
            detailsModalContent.style.display = 'block';
        }, 50);
    }

    let tmdbData = null;
    if (item.tmdbUrl) {
        tmdbData = await fetchTMDBData(item.tmdbUrl);
    }
    
    // Obtener imágenes de TMDB para la galería
    let tmdbImages = { posters: [], backdrops: [] };
    if (item.tmdbUrl) {
        tmdbImages = await fetchTMDBImages(item.tmdbUrl);
    }
    
    // Priorizar imágenes de data.json
    const backdropUrl = item.backgroundUrl || (tmdbImages.backdrops[0]?.file_path || item.posterUrl);
    
    detailsModalBackdrop.src = backdropUrl;
    detailsModalBackdrop.onerror = function() {
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
    
    const audioSubtitlesSection = createAudioSubtitlesSection(item.audiosCount, item.subtitlesCount, item.audioList, item.subtitleList);
    
    let actionButtons = '';
    
    if (item.videoUrl) {
        actionButtons += `
            <button class="details-modal-action-btn primary" data-video-url="${item.videoUrl}">
                <i class="fas fa-play"></i>
                <span>Ver Película</span>
                <span class="tooltip">Reproducir</span>
            </button>
        `;
    }
    
    if (item.videoUrl) {
        actionButtons += `
            <button class="details-modal-action-btn circular" onclick="window.open('${generateDownloadUrl(item.videoUrl)}', '_blank')">
                <i class="fas fa-download"></i>
                <span class="tooltip">Descargar</span>
            </button>
        `;
    }
    
    if (trailerUrl) {
        actionButtons += `
            <button class="details-modal-action-btn circular" data-video-url="${trailerUrl}">
                <i class="fas fa-film"></i>
                <span class="tooltip">Ver Tráiler</span>
            </button>
        `;
    }
    
    // Botón para compartir
    actionButtons += `
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
    
    const directorsSection = tmdbData?.directors?.length > 0 ? createCrewSection(tmdbData.directors, 'Director(es)') : '';
    const writersSection = tmdbData?.writers?.length > 0 ? createCrewSection(tmdbData.writers, 'Escritor(es)') : '';
    const castSection = tmdbData?.cast?.length > 0 ? createCastSection(tmdbData.cast) : '';
    
    const posters = tmdbImages.posters;
    const backdrops = tmdbImages.backdrops;
    
    const postersGallery = posters.length > 0 ? createGallerySkeleton('poster', 5) : '';
    const backdropsGallery = backdrops.length > 0 ? createGallerySkeleton('backdrop', 4) : '';
    
    detailsModalBody.innerHTML = `
        <h1 class="details-modal-title">${item.title}</h1>
        
        ${tmdbData?.original_title && tmdbData.original_title.toLowerCase() !== item.title.toLowerCase() ? `
            <div class="details-modal-original-title">${tmdbData.original_title}</div>
        ` : ''}
        
        <div class="details-modal-meta">
            ${metaItems.join('<span class="details-modal-meta-separator">•</span>')}
        </div>
        
        ${audioSubtitlesSection}
        
        ${actionButtons ? `
        <div class="details-modal-actions">
            ${actionButtons}
        </div>
        ` : ''}
        
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
        
        ${item.link ? `<a href="${item.link}" class="details-modal-action-btn secondary" style="margin-top:20px;text-align:center;text-decoration:none;">
            <i class="fas fa-info-circle"></i>
            <span>Más información</span>
        </a>` : ''}
    `;
    
    void detailsModalOverlay.offsetWidth;
    
    detailsModalOverlay.style.opacity = '1';
    detailsModalContent.style.transform = 'translateY(0)';
    detailsModalContent.style.opacity = '1';
    
    setTimeout(() => {
        if (posters.length > 0) {
            const postersSection = createGallerySection(posters, 'Carteles', 'posters');
            const postersContainer = detailsModalBody.querySelector('.details-modal-gallery-section:has(.gallery-skeleton)');
            if (postersContainer) {
                postersContainer.outerHTML = postersSection;
            }
        }
        
        if (backdrops.length > 0) {
            const backdropsSection = createGallerySection(backdrops, 'Imágenes de fondo', 'backdrops');
            const backdropsContainer = detailsModalBody.querySelectorAll('.details-modal-gallery-section:has(.gallery-skeleton)')[1] || 
                                       detailsModalBody.querySelector('.details-modal-gallery-section:has(.gallery-skeleton)');
            if (backdropsContainer) {
                backdropsContainer.outerHTML = backdropsSection;
            }
        }
        
        document.querySelectorAll('.details-modal-action-btn[data-video-url]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const videoUrl = btn.getAttribute('data-video-url');
                showVideoModal(videoUrl);
            });
        });
        
        document.querySelectorAll('.details-modal-gallery-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const galleryType = item.getAttribute('data-gallery-type');
                const showMore = item.getAttribute('data-show-more');
                const index = parseInt(item.getAttribute('data-index') || 0);
                const images = galleryType === 'posters' ? posters : backdrops;
                
                if (showMore === 'true') {
                    showGalleryImageModal(images, 0);
                } else if (images && images.length > 0) {
                    showGalleryImageModal(images, index);
                }
            });
        });
    }, 100);
    
    if (isIOS()) {
        detailsModalContent.style.animation = 'none';
        requestAnimationFrame(() => {
            detailsModalContent.style.animation = 'iosModalIn 0.4s ease-out forwards';
        });
    }
    
    activeItem = item;
}

function closeDetailsModal() {
    detailsModalContent.style.transform = 'translateY(20px)';
    detailsModalContent.style.opacity = '0';
    detailsModalOverlay.style.opacity = '0';
    
    setTimeout(() => {
        detailsModalOverlay.style.display = 'none';
        document.body.style.overflow = 'auto';
        isDetailsModalOpen = false;
        activeItem = null;
        restoreUrl();
    }, 300);
}

detailsModalOverlay.addEventListener('click', (e) => {
    if (e.target === detailsModalOverlay) {
        closeDetailsModal();
    }
});

detailsModalClose.addEventListener('click', (e) => {
    e.stopPropagation();
    closeDetailsModal();
});

// Función para normalizar texto (eliminar acentos y caracteres especiales)
function normalizeText(text) {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function updateUrlForModal(item) {
    if (!item || item.id === '0') return;

    const normalizedTitle = normalizeText(item.title);
    const newHash = `id=${item.id}&title=${normalizedTitle}`;
    
    if (window.location.hash.substring(1) !== newHash) {
        window.history.replaceState(null, null, `${window.location.pathname}#${newHash}`);
    }
    
    // Actualizar metatags cuando se abre un modal
    updateMetaTags(item);
}

function restoreUrl() {
    if (window.location.hash) {
        window.history.replaceState(null, null, window.location.pathname);
    }
}

// Función para actualizar los metatags para compartir
function updateMetaTags(item) {
    if (!item) return;
    
    const title = `Mira ${item.title} en nuestra plataforma`;
    const description = item.description || 'Una gran película que no te puedes perder';
    const imageUrl = item.posterUrl || 'https://via.placeholder.com/194x271';
    const url = `${window.location.origin}${window.location.pathname}#id=${item.id}&title=${normalizeText(item.title)}`;
    
    // Actualizar metatags
    ogTitle.content = title;
    ogDescription.content = description;
    ogImage.content = imageUrl;
    ogUrl.content = url;
    twitterTitle.content = title;
    twitterDescription.content = description;
    twitterImage.content = imageUrl;
    
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

// Elementos de metatags dinámicos
const ogTitle = document.getElementById('og-title');
const ogDescription = document.getElementById('og-description');
const ogImage = document.getElementById('og-image');
const ogUrl = document.getElementById('og-url');
const twitterTitle = document.getElementById('twitter-title');
const twitterDescription = document.getElementById('twitter-description');
const twitterImage = document.getElementById('twitter-image');