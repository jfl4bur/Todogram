document.addEventListener('DOMContentLoaded', function () {
    const carouselWrapper = document.getElementById('carousel-wrapper');
    const skeleton = document.getElementById('carousel-skeleton');
    const carouselContainer = document.querySelector('.carousel-container');
    
    if (!carouselWrapper || !skeleton || !carouselContainer) {
        const observer = new MutationObserver(() => {
            if (document.getElementById('carousel-wrapper') && 
                document.getElementById('carousel-skeleton') && 
                document.querySelector('.carousel-container')) {
                observer.disconnect();
                initializeComponents();
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    } else {
        initializeComponents();
    }

    function initializeComponents() {
        console.log("Main: Inicializando componentes...");
        
        window.performanceCache = {
            domElements: new Map(),
            computedStyles: new Map(),
            lastResize: 0
        };
        
        window.dataLoadedCallbacks = [];
        window.isDataLoaded = false;
        window.urlProcessed = false;
        
        try {
            let initialQ = '';
            const rawHash = window.location.hash || '';
            if (rawHash && rawHash.indexOf('?') !== -1) {
                const query = rawHash.split('?')[1] || '';
                const params = new URLSearchParams(query);
                initialQ = params.get('q') || '';
            }
            if (!initialQ) {
                const params2 = new URLSearchParams(window.location.search || '');
                initialQ = params2.get('q') || '';
            }
            if (initialQ) {
                window.dataLoadedCallbacks.push(() => {
                    try {
                        if (window.headerApplySearch && typeof window.headerApplySearch === 'function') {
                            console.log('Main: applying initial search via headerApplySearch ->', initialQ);
                            window.headerApplySearch(initialQ);
                        }
                    } catch (e) {
                        console.warn('Main: headerApplySearch failed', e);
                    }
                });
            }
        } catch (e) {
            // ignorar lectura de hash fallida
        }
        
        const carousel = new Carousel();
        
        const escapeSelector = (value) => {
            if (value == null) return '';
            const str = String(value);
            if (window.CSS && typeof window.CSS.escape === 'function') {
                try {
                    return window.CSS.escape(str);
                } catch (err) {
                    return str.replace(/"/g, '\\"');
                }
            }
            return str.replace(/"/g, '\\"');
        };
        
        const getShareId = (candidate, fallback = '') => {
            if (!candidate || typeof candidate !== 'object') {
                return fallback != null ? String(fallback) : '';
            }
            if (typeof window.getItemShareId === 'function') {
                try {
                    const computed = window.getItemShareId(candidate, fallback);
                    if (computed != null && String(computed).trim()) {
                        return String(computed).trim();
                    }
                } catch (err) {
                    // usar lógica local si el helper falla
                }
            }
            const candidates = [
                candidate.shareId,
                candidate.tmdbId,
                candidate.id_tmdb,
                candidate.tmdb_id,
                candidate['ID TMDB']
            ];
            for (const raw of candidates) {
                if (raw == null) continue;
                const value = String(raw).trim();
                if (value) return value;
            }
            if (typeof candidate.tmdbUrl === 'string') {
                const match = candidate.tmdbUrl.match(/(\d+)/);
                if (match && match[1]) return match[1];
            }
            if (fallback != null && String(fallback).trim()) return String(fallback).trim();
            if (candidate.id != null) return String(candidate.id);
            return '';
        };
        
        const getSlug = (value) => {
            if (!value) return '';
            if (typeof window.getShareSlug === 'function') {
                try {
                    const slug = window.getShareSlug(value);
                    if (slug) return slug;
                } catch (err) {
                    // continuar con normalizador local
                }
            }
            try {
                return String(value)
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '');
            } catch (err) {
                return String(value)
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '');
            }
        };
        
        const locateElementForItem = (candidate) => {
            if (!candidate) return null;
            const shareId = getShareId(candidate, candidate.id);
            if (shareId) {
                const shareEscaped = escapeSelector(shareId);
                const byShareId = document.querySelector(`.custom-carousel-item[data-share-id="${shareEscaped}"]`);
                if (byShareId) return byShareId;
            }
            if (candidate.id != null) {
                const fallback = escapeSelector(candidate.id);
                const byItemId = document.querySelector(`.custom-carousel-item[data-item-id="${fallback}"]`);
                if (byItemId) return byItemId;
            }
            return null;
        };
        
        window.generateShareUrl = function(item, originalUrl) {
            if (!item) {
                return originalUrl || window.location.href;
            }
            const shareId = getShareId(item, item.id || '');
            const slugSource = item.title || item['Título'] || item['Título episodio'] || '';
            const titleSlug = getSlug(slugSource) || getSlug(item.title || '') || 'todogram';
            if (!shareId) {
                return originalUrl || window.location.href;
            }
            return `https://jfl4bur.github.io/Todogram/public/share/${shareId}-${titleSlug}.html`;
        };
        
        document.addEventListener('click', function(e) {
            if (e.target.closest('#share-button')) {
                const item = window.activeItem;
                if (item && window.shareModal) {
                    const currentUrl = window.location.href;
                    const shareUrl = window.generateShareUrl(item, currentUrl);
                    window.shareModal.show({ ...item, shareUrl });
                } else {
                    console.error('Item o shareModal no definidos:', { item, shareModal: window.shareModal });
                }
            }
        });
        
        window.addEventListener('popstate', function() {
            if (window.detailsModal.isDetailsModalOpen) {
                window.detailsModal.close();
            }
        });
        
        function processUrlParams(retryCount = 0, maxRetries = 10) {
            console.log('Procesando URL:', window.location.hash);
            
            try {
                if (document.querySelector('#catalogo-page-root')) {
                    console.log('Main: página catálogo detectada, salto processUrlParams (catalogo.js la maneja)');
                    return;
                }
            } catch (err) { /* ignore */ }
            
            if (window.urlProcessed) {
                console.log('URL ya procesada, saltando...');
                return;
            }
            
            const urlParams = detailsModal.getItemIdFromUrl();
            if (!urlParams) {
                console.log('No se encontraron parámetros de URL');
                return;
            }
            
            console.log('Parámetros de URL encontrados:', urlParams);
            
            if (!window.isDataLoaded) {
                console.log('Datos aún no cargados, esperando...');
                if (retryCount < maxRetries) {
                    setTimeout(() => processUrlParams(retryCount + 1, maxRetries), 200);
                }
                return;
            }
            
            if (!carousel.moviesData || carousel.moviesData.length === 0) {
                console.log('Datos del carrusel de películas no disponibles, esperando...');
                if (retryCount < maxRetries) {
                    setTimeout(() => processUrlParams(retryCount + 1, maxRetries), 200);
                }
                return;
            }
            
            const matchesShareId = (candidate) => {
                if (!candidate) return false;
                const shareId = getShareId(candidate, candidate.id);
                if (shareId && String(shareId) === String(urlParams.id)) {
                    if (!urlParams.normalizedTitle) return true;
                    const slug = getSlug(candidate.title || candidate['Título'] || candidate['Título episodio'] || '');
                    if (!slug || slug === urlParams.normalizedTitle) return true;
                    console.warn('Main: slug distinto para id buscado, se continúa por id:', { esperado: urlParams.normalizedTitle, obtenido: slug, id: shareId });
                    return true;
                }
                if (candidate.id != null && String(candidate.id) === String(urlParams.id)) return true;
                return false;
            };
            
            let item = Array.isArray(carousel.moviesData) ? carousel.moviesData.find(matchesShareId) : null;
            let itemElement = locateElementForItem(item);
            let itemSource = 'peliculas';
            
            if (!item && window.seriesCarousel && Array.isArray(window.seriesCarousel.seriesData) && window.seriesCarousel.seriesData.length > 0) {
                const found = window.seriesCarousel.seriesData.find(matchesShareId);
                if (found) {
                    item = found;
                    itemElement = locateElementForItem(found);
                    itemSource = 'series';
                    console.log('Serie encontrada en carrusel de series:', item);
                    console.log('Elemento DOM encontrado para serie:', itemElement);
                }
            }
            
            if (!item && window.documentalesCarousel && Array.isArray(window.documentalesCarousel.docuData) && window.documentalesCarousel.docuData.length > 0) {
                const found = window.documentalesCarousel.docuData.find(matchesShareId);
                if (found) {
                    item = found;
                    itemElement = locateElementForItem(found);
                    itemSource = 'documentales';
                    console.log('Documental encontrado en carrusel de documentales:', item);
                    console.log('Elemento DOM encontrado para documental:', itemElement);
                }
            }
            
            if (!item && window.animesCarousel && Array.isArray(window.animesCarousel.animeData) && window.animesCarousel.animeData.length > 0) {
                const found = window.animesCarousel.animeData.find(matchesShareId);
                if (found) {
                    item = found;
                    itemElement = locateElementForItem(found);
                    itemSource = 'animes';
                    console.log('Anime encontrado en carrusel de animes:', item);
                    console.log('Elemento DOM encontrado para anime:', itemElement);
                }
            }
            
            if (!item && window.episodiosCarousel && Array.isArray(window.episodiosCarousel.episodiosData) && window.episodiosCarousel.episodiosData.length > 0) {
                const found = window.episodiosCarousel.episodiosData.find(matchesShareId);
                if (found) {
                    item = found;
                    itemElement = locateElementForItem(found);
                    itemSource = 'episodios';
                    console.log('Episodio encontrado en carrusel de episodios:', item);
                    console.log('Elemento DOM encontrado para episodio:', itemElement);
                }
            }
            
            if (!item && window.episodiosAnimesCarousel && Array.isArray(window.episodiosAnimesCarousel.episodiosData) && window.episodiosAnimesCarousel.episodiosData.length > 0) {
                const found = window.episodiosAnimesCarousel.episodiosData.find(matchesShareId);
                if (found) {
                    item = found;
                    itemElement = locateElementForItem(found);
                    itemSource = 'episodios_animes';
                    console.log('Episodio (anime) encontrado en carrusel de episodios animes:', item);
                    console.log('Elemento DOM encontrado para episodio (anime):', itemElement);
                }
            }
            
            if (!item && window.episodiosDocumentalesCarousel && Array.isArray(window.episodiosDocumentalesCarousel.episodiosData) && window.episodiosDocumentalesCarousel.episodiosData.length > 0) {
                const found = window.episodiosDocumentalesCarousel.episodiosData.find(matchesShareId);
                if (found) {
                    item = found;
                    itemElement = locateElementForItem(found);
                    itemSource = 'episodios_documentales';
                    console.log('Episodio (documental) encontrado en carrusel de episodios documentales:', item);
                    console.log('Elemento DOM encontrado para episodio (documental):', itemElement);
                }
            }
            
            if (!item && window.sliderIndependent && typeof window.sliderIndependent.getSlidesData === 'function') {
                const sliderData = window.sliderIndependent.getSlidesData();
                if (Array.isArray(sliderData) && sliderData.length > 0) {
                    const found = sliderData.find(matchesShareId);
                    if (found) {
                        item = found;
                        itemElement = document.querySelector('.slider-slide[data-index]');
                        itemSource = 'slider';
                        console.log('Película encontrada en slider independiente:', item);
                        console.log('Elemento DOM encontrado para slider:', itemElement);
                    }
                }
            }
            
            if (item) {
                console.log('Item encontrado:', item);
                console.log('Fuente del item:', itemSource);
                window.urlProcessed = true;
                
                if (!itemElement) {
                    console.log(`Elemento DOM no encontrado para id: ${urlParams.id} (probablemente fuera del viewport/paginación)`);
                    console.log(`Item encontrado en: ${itemSource}`);
                    console.log('Abriendo modal sin elemento DOM...');
                } else {
                    console.log('Elemento DOM encontrado:', itemElement);
                }
                
                detailsModal.show(item, itemElement).then(async () => {
                    window.activeItem = item;
                    if (urlParams.ep) {
                        try {
                            console.log('Intentando abrir episodio desde hash ep=', urlParams.ep);
                            const ok = await detailsModal.openEpisodeByNumber(item, urlParams.ep);
                            console.log('Resultado openEpisodeByNumber:', ok);
                            if (!ok) {
                                console.warn('No se pudo reproducir episodio desde hash: puede que no exista o no tenga video.');
                            }
                        } catch (err) {
                            console.error('Error intentando abrir episodio desde hash:', err);
                        }
                    }
                }).catch(err => {
                    console.error('Error mostrando detailsModal desde processUrlParams:', err);
                });
            } else {
                console.error('❌ Item no encontrado para id:', urlParams.id);
                console.log('Verificando datos disponibles:');
                console.log('- Películas cargadas:', carousel.moviesData ? carousel.moviesData.length : 0);
                console.log('- Series cargadas:', window.seriesCarousel && window.seriesCarousel.seriesData ? window.seriesCarousel.seriesData.length : 0);
                console.log('- Slider cargado:', window.sliderIndependent ? 'Sí' : 'No');
                window.urlProcessed = true;
            }
        }
        
        window.notifyDataLoaded = function() {
            window.isDataLoaded = true;
            console.log('Main: Datos cargados, ejecutando callbacks...');
            window.dataLoadedCallbacks.forEach(callback => {
                try {
                    callback();
                } catch (error) {
                    console.error('Error en callback de datos cargados:', error);
                }
            });
            window.dataLoadedCallbacks = [];
        };
        
        window.renderSpecificItem = function(itemId, itemSource) {
            console.log(`Renderizando elemento específico: ${itemId} desde ${itemSource}`);
            
            if (itemSource === 'peliculas' && carousel && carousel.renderSpecificItem) {
                return carousel.renderSpecificItem(itemId);
            } else if (itemSource === 'series' && window.seriesCarousel && window.seriesCarousel.renderSpecificItem) {
                return window.seriesCarousel.renderSpecificItem(itemId);
            }
            
            return null;
        };
        
        window.addEventListener('load', function() {
            if (window.isDataLoaded) {
                requestAnimationFrame(() => {
                    processUrlParams();
                });
            } else {
                window.dataLoadedCallbacks.push(() => {
                    requestAnimationFrame(() => {
                        processUrlParams();
                    });
                });
            }
        });
        
        let lastHash = window.location.hash;
        window.addEventListener('hashchange', function() {
            const newHash = window.location.hash;
            if (newHash !== lastHash) {
                lastHash = newHash;
                window.urlProcessed = false;
                console.log('Hash cambió a:', newHash);
                requestAnimationFrame(() => {
                    processUrlParams();
                });
            }
        });
        
        DetailsModal.prototype.getItemIdFromUrl = function() {
            let raw = window.location.hash.substring(1);
            console.log('Hash procesado (raw):', raw);
            if (!raw) return null;
            
            let query = raw;
            const qIdx = raw.indexOf('?');
            if (qIdx >= 0) {
                query = raw.substring(qIdx + 1);
            } else if (!raw.startsWith('id=') && !raw.startsWith('title=')) {
                return null;
            }
            
            const params = new URLSearchParams(query);
            const id = params.get('id');
            const title = params.get('title');
            const ep = params.get('ep');
            console.log('Parámetros extraídos:', { id, title, ep });
            
            if (!id || !title) return null;
            
            return {
                id: id,
                normalizedTitle: title,
                ep: ep
            };
        };
    }
});
