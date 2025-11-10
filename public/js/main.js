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
        
        // Sistema de cache global para optimización
        window.performanceCache = {
            domElements: new Map(),
            computedStyles: new Map(),
            lastResize: 0
        };
        
        // Sistema de notificación para datos cargados
        window.dataLoadedCallbacks = [];
        window.isDataLoaded = false;
        window.urlProcessed = false; // Evitar procesar URL múltiples veces
                // If there's a persisted search query in the hash or search, capture it and register to apply after data load
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
                        // Enqueue callback so header receives it after dataLoadedCallbacks exist
                        window.dataLoadedCallbacks.push(() => {
                            try {
                                if (window.headerApplySearch && typeof window.headerApplySearch === 'function') {
                                    console.log('Main: applying initial search via headerApplySearch ->', initialQ);
                                    window.headerApplySearch(initialQ);
                                }
                            } catch (e) { console.warn('Main: headerApplySearch failed', e); }
                        });
                    }
                } catch (e) {}
        
        const carousel = new Carousel();
        
        // Inicializar el carrusel de series inmediatamente
            console.log("Main: Inicializando carrusel de series...");
            // Evitar instanciar dos veces si ya fue creado por otro módulo
            if (!window.seriesCarousel) {
                const seriesCarousel = new SeriesCarousel();
                window.seriesCarousel = seriesCarousel;
            } else {
                console.log('Main: seriesCarousel ya existe — no se crea otra instancia');
            }

        // Inicializar el carrusel de episodios (Episodios Series)
            console.log("Main: Inicializando carrusel de episodios...");
            try {
                const episodiosCarousel = new EpisodiosSeriesCarousel();
                window.episodiosCarousel = episodiosCarousel;
            } catch (e) {
                console.error('Error inicializando EpisodiosSeriesCarousel:', e);
            }
            // Inicializar el carrusel de episodios para Animes
            console.log("Main: Inicializando carrusel de episodios (Animes)...");
            try {
                const episodiosAnimesCarousel = new EpisodiosAnimesCarousel();
                window.episodiosAnimesCarousel = episodiosAnimesCarousel;
            } catch (e) {
                console.error('Error inicializando EpisodiosAnimesCarousel:', e);
            }
            // Inicializar el carrusel de episodios para Documentales
            console.log("Main: Inicializando carrusel de episodios (Documentales)...");
            try {
                const episodiosDocumentalesCarousel = new EpisodiosDocumentalesCarousel();
                window.episodiosDocumentalesCarousel = episodiosDocumentalesCarousel;
            } catch (e) {
                console.error('Error inicializando EpisodiosDocumentalesCarousel:', e);
            }
        
        // Verificar que el carrusel de series se inicializó correctamente
        setTimeout(() => {
            console.log("Main: Verificando carrusel de series después de 1 segundo...");
            console.log("Main: seriesCarousel:", !!window.seriesCarousel);
            console.log("Main: Elementos del carrusel de series:", {
                wrapper: !!window.seriesCarousel?.wrapper,
                carouselPrev: !!window.seriesCarousel?.carouselPrev,
                carouselNext: !!window.seriesCarousel?.carouselNext,
                carouselNav: !!window.seriesCarousel?.carouselNav
            });
        }, 1000);
        
        const hoverModal = new HoverModal();
        const detailsModal = new DetailsModal();
        const videoModal = new VideoModal();
        const shareModal = new ShareModal();

        // El skeleton del slider se maneja internamente en slider-independent.js
        // No necesitamos configurarlo aquí ya que se inicializa automáticamente

        window.carousel = carousel;
        window.hoverModal = hoverModal;
        window.detailsModal = detailsModal;
        window.videoModal = videoModal;
        window.shareModal = shareModal;
        window.isModalOpen = false;
        window.isDetailsModalOpen = false;
        window.activeItem = null;
        window.hoverModalItem = null;

                // El slider independiente se inicializa automáticamente
        // No necesitamos delays ni polling

        // Función para generar URL de compartir
        window.generateShareUrl = function(item, originalUrl) {
            if (!item) return originalUrl || window.location.href;
            try {
                const baseUrl = new URL(originalUrl || window.location.href);
                if (!item.id) return baseUrl.toString();

                const detailsInstance = window.detailsModal;
                const normalizeTitle = (titleValue) => {
                    if (!titleValue) return '';
                    try {
                        if (detailsInstance && typeof detailsInstance.normalizeText === 'function') {
                            return detailsInstance.normalizeText(titleValue);
                        }
                        return String(titleValue)
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .toLowerCase()
                            .replace(/[^a-z0-9]/g, '-')
                            .replace(/-+/g, '-')
                            .replace(/^-|-$/g, '');
                    } catch (err) {
                        return String(titleValue).toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    }
                };

                const normalizedTitle = normalizeTitle(item.title || '');
                let hashValue = '';

                if (detailsInstance && typeof detailsInstance.buildModalHash === 'function') {
                    hashValue = detailsInstance.buildModalHash(item.id, normalizedTitle);
                } else {
                    const params = new URLSearchParams();
                    params.set('id', item.id);
                    if (normalizedTitle) params.set('title', normalizedTitle);
                    hashValue = params.toString();
                }

                if (hashValue) baseUrl.hash = hashValue;
                return baseUrl.toString();
            } catch (error) {
                console.warn('Main: generateShareUrl fallback to original URL', error);
                return originalUrl || window.location.href;
            }
        };

        // Evento para el botón "Share" dentro del modal de detalles
        document.addEventListener('click', function(e) {
            if (e.target.closest('#share-button')) {
                const item = window.activeItem;
                if (item && window.shareModal) {
                    const currentUrl = window.location.href;
                    const shareUrl = window.generateShareUrl(item, currentUrl);
                    window.shareModal.show({ ...item, shareUrl }); // Pasar shareUrl al modal
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

        // Función para procesar parámetros de URL
        function processUrlParams(retryCount = 0, maxRetries = 10) {
            console.log('Procesando URL:', window.location.hash);
            
            // Guard: si estamos en la página de catálogo, dejar que `catalogo.js` gestione
            // la apertura de modales y el procesamiento de hashes para esa sección.
            // Esto evita intentos duplicados de abrir el mismo modal.
            try {
                if (document.querySelector('#catalogo-page-root')) {
                    console.log('Main: página catálogo detectada, salto processUrlParams (catalogo.js la maneja)');
                    return;
                }
            } catch (err) { /* ignore */ }

            // Evitar procesar múltiples veces
            if (window.urlProcessed) {
                console.log('URL ya procesada, saltando...');
                return;
            }
            
            const urlParams = detailsModal.getItemIdFromUrl();
            if (urlParams) {
                console.log('Parámetros de URL encontrados:', urlParams);
                
                // Verificar que los datos estén cargados
                if (!window.isDataLoaded) {
                    console.log('Datos aún no cargados, esperando...');
                    if (retryCount < maxRetries) {
                        setTimeout(() => processUrlParams(retryCount + 1, maxRetries), 200);
                    }
                    return;
                }
                
                // Verificar que los carruseles tengan datos
                if (!carousel.moviesData || carousel.moviesData.length === 0) {
                    console.log('Datos del carrusel de películas no disponibles, esperando...');
                    if (retryCount < maxRetries) {
                        setTimeout(() => processUrlParams(retryCount + 1, maxRetries), 200);
                    }
                    return;
                }
                
                // Buscar en el carousel de películas primero
                let item = carousel.moviesData.find(movie => movie.id === urlParams.id);
                let itemElement = document.querySelector(`.custom-carousel-item[data-item-id="${urlParams.id}"]`);
                let itemSource = 'peliculas';

                // Si no se encuentra en el carousel de películas, buscar en el carrusel de series
                if (!item && window.seriesCarousel && window.seriesCarousel.seriesData && window.seriesCarousel.seriesData.length > 0) {
                    item = window.seriesCarousel.seriesData.find(series => series.id === urlParams.id);
                    if (item) {
                        itemElement = document.querySelector(`.custom-carousel-item[data-item-id="${urlParams.id}"]`);
                        itemSource = 'series';
                        console.log('Serie encontrada en carrusel de series:', item);
                        console.log('Elemento DOM encontrado para serie:', itemElement);
                    }
                }

                // Si no se encuentra en el carrusel de series, buscar en el carrusel de documentales

                if (!item && window.documentalesCarousel && window.documentalesCarousel.docuData && window.documentalesCarousel.docuData.length > 0) {
                    item = window.documentalesCarousel.docuData.find(docu => docu.id === urlParams.id);
                    if (item) {
                        itemElement = document.querySelector(`.custom-carousel-item[data-item-id="${urlParams.id}"]`);
                        itemSource = 'documentales';
                        console.log('Documental encontrado en carrusel de documentales:', item);
                        console.log('Elemento DOM encontrado para documental:', itemElement);
                    }
                }

                // Si no se encuentra en documentales, buscar en el carrusel de animes
                if (!item && window.animesCarousel && window.animesCarousel.animeData && window.animesCarousel.animeData.length > 0) {
                    item = window.animesCarousel.animeData.find(anime => anime.id === urlParams.id);
                    if (item) {
                        itemElement = document.querySelector(`.custom-carousel-item[data-item-id="${urlParams.id}"]`);
                        itemSource = 'animes';
                        console.log('Anime encontrado en carrusel de animes:', item);
                        console.log('Elemento DOM encontrado para anime:', itemElement);
                    }
                }

                // Buscar en el carrusel de episodios (Episodios Series)
                if (!item && window.episodiosCarousel && window.episodiosCarousel.episodiosData && window.episodiosCarousel.episodiosData.length > 0) {
                    item = window.episodiosCarousel.episodiosData.find(ep => ep.id === urlParams.id);
                    if (item) {
                        itemElement = document.querySelector(`.custom-carousel-item[data-item-id="${urlParams.id}"]`);
                        itemSource = 'episodios';
                        console.log('Episodio encontrado en carrusel de episodios:', item);
                        console.log('Elemento DOM encontrado para episodio:', itemElement);
                    }
                }

                // Buscar en el carrusel de episodios (Episodios Animes)
                if (!item && window.episodiosAnimesCarousel && window.episodiosAnimesCarousel.episodiosData && window.episodiosAnimesCarousel.episodiosData.length > 0) {
                    item = window.episodiosAnimesCarousel.episodiosData.find(ep => ep.id === urlParams.id);
                    if (item) {
                        itemElement = document.querySelector(`.custom-carousel-item[data-item-id="${urlParams.id}"]`);
                        itemSource = 'episodios_animes';
                        console.log('Episodio (anime) encontrado en carrusel de episodios animes:', item);
                        console.log('Elemento DOM encontrado para episodio (anime):', itemElement);
                    }
                }

                // Buscar en el carrusel de episodios (Episodios Documentales)
                if (!item && window.episodiosDocumentalesCarousel && window.episodiosDocumentalesCarousel.episodiosData && window.episodiosDocumentalesCarousel.episodiosData.length > 0) {
                    item = window.episodiosDocumentalesCarousel.episodiosData.find(ep => ep.id === urlParams.id);
                    if (item) {
                        itemElement = document.querySelector(`.custom-carousel-item[data-item-id="${urlParams.id}"]`);
                        itemSource = 'episodios_documentales';
                        console.log('Episodio (documental) encontrado en carrusel de episodios documentales:', item);
                        console.log('Elemento DOM encontrado para episodio (documental):', itemElement);
                    }
                }

                // Si no se encuentra en ningún carrusel, buscar en el slider independiente
                if (!item && window.sliderIndependent) {
                    const sliderData = window.sliderIndependent.getSlidesData();
                    item = sliderData.find(movie => movie.id === urlParams.id);
                    if (item) {
                        itemElement = document.querySelector(`.slider-slide[data-index]`);
                        itemSource = 'slider';
                        console.log('Película encontrada en slider independiente:', item);
                    }
                }
                
                if (item) {
                    console.log('Item encontrado:', item);
                    console.log('Fuente del item:', itemSource);
                    window.urlProcessed = true; // Marcar como procesado
                    
                    // Intentar encontrar el elemento DOM, pero no es crítico
                    if (!itemElement) {
                        console.log(`Elemento DOM no encontrado para itemId: ${urlParams.id} (probablemente fuera del viewport/paginación)`);
                        console.log(`Item encontrado en: ${itemSource}`);
                        console.log('Abriendo modal sin elemento DOM...');
                        console.log('✅ El modal de detalles funciona perfectamente sin elemento DOM');
                    } else {
                        console.log('Elemento DOM encontrado:', itemElement);
                        console.log('✅ Abriendo modal con elemento DOM');
                    }
                    
                    // Abrir el modal independientemente de si existe el elemento DOM
                    // detailsModal.show es async; ejecutar openEpisodeByNumber después si la URL incluye ep
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
                    window.urlProcessed = true; // Marcar como procesado incluso si no se encuentra
                }
            } else {
                console.log('No se encontraron parámetros de URL');
            }
        }

        // Función para notificar que los datos están cargados
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
        
        // Función para renderizar dinámicamente un elemento específico si es necesario
        window.renderSpecificItem = function(itemId, itemSource) {
            console.log(`Renderizando elemento específico: ${itemId} desde ${itemSource}`);
            
            if (itemSource === 'peliculas' && carousel && carousel.renderSpecificItem) {
                return carousel.renderSpecificItem(itemId);
            } else if (itemSource === 'series' && window.seriesCarousel && window.seriesCarousel.renderSpecificItem) {
                return window.seriesCarousel.renderSpecificItem(itemId);
            }
            
            return null;
        };

        // Manejar parámetros de URL al cargar la página
        window.addEventListener('load', function() {
            // Si los datos ya están cargados, procesar inmediatamente
            if (window.isDataLoaded) {
                requestAnimationFrame(() => {
                    processUrlParams();
                });
            } else {
                // Si no, agregar a la cola de callbacks
                window.dataLoadedCallbacks.push(() => {
                    requestAnimationFrame(() => {
                processUrlParams();
                    });
                });
            }
        });

        // Manejar cambios en el hash de la URL
        let lastHash = window.location.hash;
        window.addEventListener('hashchange', function() {
            const newHash = window.location.hash;
            if (newHash !== lastHash) {
                lastHash = newHash;
                window.urlProcessed = false; // Resetear para permitir procesar nuevo hash
                console.log('Hash cambió a:', newHash);
                // Usar requestAnimationFrame para mejor rendimiento
                requestAnimationFrame(() => {
                    processUrlParams();
                });
            }
        });

        DetailsModal.prototype.getItemIdFromUrl = function() {
            let raw = window.location.hash.substring(1);
            console.log('Hash procesado (raw):', raw);
            if (!raw) return null;

            // Si el hash tiene un prefijo de sección como 'catalogo?....' o 'catalogo',
            // extraer únicamente la parte de query (?a=1&b=2). Si no hay '?', aceptar
            // la cadena si comienza con 'id=' (antiguo formato).
            let query = raw;
            const qIdx = raw.indexOf('?');
            if (qIdx >= 0) {
                query = raw.substring(qIdx + 1);
            } else if (!raw.startsWith('id=') && !raw.startsWith('title=')) {
                // no hay query y no parece ser un conjunto de params -> nada que hacer
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