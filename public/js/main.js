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
        const carousel = new Carousel();
        const hoverModal = new HoverModal();
        const detailsModal = new DetailsModal();
        const videoModal = new VideoModal();
        const shareModal = new ShareModal();

        // Inicializar skeleton del slider
        const sliderSkeleton = document.getElementById('slider-skeleton');
        const sliderWrapper = document.getElementById('slider-wrapper');
        if (sliderSkeleton && sliderWrapper) {
            sliderSkeleton.style.display = 'flex';
            sliderWrapper.style.display = 'none';
            console.log('Main: Skeleton del slider inicializado');
            console.log('Main: Skeleton visible:', sliderSkeleton.style.display);
            console.log('Main: Slider wrapper oculto:', sliderWrapper.style.display);
        } else {
            console.error('Main: No se encontraron elementos del skeleton del slider');
            console.error('Main: sliderSkeleton:', sliderSkeleton);
            console.error('Main: sliderWrapper:', sliderWrapper);
        }

        window.carousel = carousel;
        window.hoverModal = hoverModal;
        window.detailsModal = detailsModal;
        window.videoModal = videoModal;
        window.shareModal = shareModal;
        window.isModalOpen = false;
        window.isDetailsModalOpen = false;
        window.activeItem = null;
        window.hoverModalItem = null;

        // Inicializar el slider independiente
        function initializeSlider() {
            if (window.sliderIndependent) {
                console.log('Main: Slider independiente disponible');
                // El slider independiente se inicializa automáticamente
            } else {
                console.log('Main: Esperando slider independiente...');
                setTimeout(initializeSlider, 100);
            }
        }
        
        // Iniciar el slider después de un pequeño delay
        setTimeout(initializeSlider, 500);

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
        function processUrlParams(retryCount = 0, maxRetries = 5) {
            console.log('Procesando URL:', window.location.hash);
            const urlParams = detailsModal.getItemIdFromUrl();
            if (urlParams) {
                console.log('Parámetros de URL encontrados:', urlParams);
                
                // Buscar en el carousel primero
                let item = carousel.moviesData.find(movie => movie.id === urlParams.id);
                let itemElement = document.querySelector(`.custom-carousel-item[data-item-id="${urlParams.id}"]`);
                
                // Si no se encuentra en el carousel, buscar en el slider independiente
                if (!item && window.sliderIndependent) {
                    const sliderData = window.sliderIndependent.getSlidesData();
                    item = sliderData.find(movie => movie.id === urlParams.id);
                    if (item) {
                        itemElement = document.querySelector(`.slider-slide[data-index]`);
                        console.log('Película encontrada en slider independiente:', item);
                    }
                }
                
                if (item) {
                    console.log('Película encontrada:', item);
                    if (itemElement) {
                        console.log('Elemento DOM encontrado:', itemElement);
                        detailsModal.show(item, itemElement);
                        window.activeItem = item;
                    } else if (retryCount < maxRetries) {
                        console.warn(`Elemento DOM no encontrado para itemId: ${urlParams.id}, reintentando (${retryCount + 1}/${maxRetries})`);
                        setTimeout(() => processUrlParams(retryCount + 1, maxRetries), 200);
                    } else {
                        console.error('Elemento DOM no encontrado para itemId:', urlParams.id);
                    }
                } else {
                    console.error('Película no encontrada para id:', urlParams.id);
                }
            } else {
                console.log('No se encontraron parámetros de URL');
            }
        }

        // Manejar parámetros de URL al cargar la página
        window.addEventListener('load', function() {
            setTimeout(() => {
                processUrlParams();
            }, 500);
        });

        // Manejar cambios en el hash de la URL
        let lastHash = window.location.hash;
        window.addEventListener('hashchange', function() {
            const newHash = window.location.hash;
            if (newHash !== lastHash) {
                lastHash = newHash;
                console.log('Hash cambió a:', newHash);
                setTimeout(() => {
                    processUrlParams();
                }, 300);
            }
        });

        DetailsModal.prototype.getItemIdFromUrl = function() {
            const path = window.location.hash.substring(1);
            console.log('Hash procesado:', path);
            if (!path) return null;
            
            const params = new URLSearchParams(path);
            const id = params.get('id');
            const title = params.get('title');
            console.log('Parámetros extraídos:', { id, title });
            
            if (!id || !title) return null;
            
            return {
                id: id,
                normalizedTitle: title
            };
        };
    }
});