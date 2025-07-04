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

        window.carousel = carousel;
        window.hoverModal = hoverModal;
        window.detailsModal = detailsModal;
        window.videoModal = videoModal;
        window.shareModal = shareModal;
        window.isModalOpen = false;
        window.isDetailsModalOpen = false;
        window.activeItem = null;
        window.hoverModalItem = null;

        document.addEventListener('click', function(e) {
            if (e.target.closest('#share-button')) {
                shareModal.show(window.activeItem);
            }
        });

        window.addEventListener('popstate', function() {
            if (window.detailsModal.isDetailsModalOpen) {
                window.detailsModal.close();
            }
        });

        // Función para procesar parámetros de URL y actualizar metadatos
        function processUrlParams(retryCount = 0, maxRetries = 5) {
            console.log('Procesando URL:', window.location.hash);
            const urlParams = detailsModal.getItemIdFromUrl();
            if (urlParams) {
                console.log('Parámetros de URL encontrados:', urlParams);
                const item = carousel.moviesData.find(movie => movie.id === urlParams.id);
                if (item) {
                    console.log('Película encontrada:', item);
                    const itemElement = document.querySelector(`.custom-carousel-item[data-item-id="${urlParams.id}"]`);
                    if (itemElement) {
                        console.log('Elemento DOM encontrado:', itemElement);
                        detailsModal.show(item, itemElement);

                        // Actualizar metadatos para previsualización en redes sociales
                        updateMetaTags(item);
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
                // Limpiar metadatos si no hay parámetros
                updateMetaTags(null);
            }
        }

        // Función para actualizar las etiquetas meta
        function updateMetaTags(item) {
            const baseUrl = window.location.origin + window.location.pathname;
            const metaTags = [
                { name: 'og:title', content: item ? item.title : 'Todogram - Películas' },
                { name: 'og:description', content: item ? item.description : 'Explora las mejores películas en Todogram.' },
                { name: 'og:image', content: item ? item.posterUrl || 'https://via.placeholder.com/194x271' : 'https://via.placeholder.com/194x271' },
                { name: 'og:url', content: item ? `${baseUrl}#id=${item.id}&title=${encodeURIComponent(item.title)}` : baseUrl },
                { name: 'twitter:card', content: 'summary_large_image' },
                { name: 'twitter:title', content: item ? item.title : 'Todogram - Películas' },
                { name: 'twitter:description', content: item ? item.description : 'Explora las mejores películas en Todogram.' },
                { name: 'twitter:image', content: item ? item.posterUrl || 'https://via.placeholder.com/194x271' : 'https://via.placeholder.com/194x271' }
            ];

            metaTags.forEach(tag => {
                let meta = document.querySelector(`meta[name="${tag.name}"]`) || document.querySelector(`meta[property="${tag.name}"]`);
                if (!meta) {
                    meta = document.createElement('meta');
                    if (tag.name.startsWith('og:')) {
                        meta.setAttribute('property', tag.name);
                    } else {
                        meta.setAttribute('name', tag.name);
                    }
                    document.head.appendChild(meta);
                }
                meta.setAttribute('content', tag.content);
            });
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
            if (!path) return null;
            
            const params = new URLSearchParams(path);
            const id = params.get('id');
            const title = params.get('title');
            
            if (!id || !title) return null;
            
            return {
                id: id,
                normalizedTitle: title
            };
        };
    }
});