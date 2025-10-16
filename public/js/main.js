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
        
        const carousel = new Carousel();
        
        // Inicializar el carrusel de series inmediatamente
            console.log("Main: Inicializando carrusel de series...");
            const seriesCarousel = new SeriesCarousel();
            window.seriesCarousel = seriesCarousel;

        // Inicializar el carrusel de episodios (Episodios Series)
            console.log("Main: Inicializando carrusel de episodios...");
            try {
                const episodiosCarousel = new EpisodiosSeriesCarousel();
                window.episodiosCarousel = episodiosCarousel;
            } catch (e) {
                console.error('Error inicializando EpisodiosSeriesCarousel:', e);
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
            const staticBaseUrl = 'https://jfl4bur.github.io/Todogram/public/template/movie-template.html';
            return `${staticBaseUrl}?title=${encodeURIComponent(item.title)}&description=${encodeURIComponent(item.description || 'Explora esta película en Todogram.')}&image=${encodeURIComponent(item.posterUrl || 'https://via.placeholder.com/194x271')}&originalUrl=${encodeURIComponent(originalUrl)}&hash=${encodeURIComponent(window.location.hash)}`;
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
            const path = window.location.hash.substring(1);
            console.log('Hash procesado:', path);
            if (!path) return null;
            
            const params = new URLSearchParams(path);
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