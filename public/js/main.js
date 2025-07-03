document.addEventListener('DOMContentLoaded', function () {
    // Verificar si los elementos existen antes de inicializar
    const carouselWrapper = document.getElementById('carousel-wrapper');
    const skeleton = document.getElementById('carousel-skeleton');
    
    if (!carouselWrapper || !skeleton) {
        // Si no existen, esperar a que Softr cargue el bloque
        const observer = new MutationObserver(() => {
            if (document.getElementById('carousel-wrapper') && 
                document.getElementById('carousel-skeleton')) {
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
        // Inicializar componentes
        const carousel = new Carousel();
        const hoverModal = new HoverModal();
        const detailsModal = new DetailsModal();
        const videoModal = new VideoModal();
        const shareModal = new ShareModal();

        // Asignar a window para acceso global
        window.carousel = carousel;
        window.hoverModal = hoverModal;
        window.detailsModal = detailsModal;
        window.videoModal = videoModal;
        window.shareModal = shareModal;
        window.isModalOpen = false;
        window.isDetailsModalOpen = false;
        window.activeItem = null;
        window.hoverModalItem = null;

        // Evento para abrir modal de compartir desde el modal de detalles
        document.addEventListener('click', function(e) {
            if (e.target.closest('#share-button')) {
                shareModal.show(window.activeItem);
            }
        });

        // Manejar el evento popstate
        window.addEventListener('popstate', function() {
            if (window.detailsModal.isDetailsModalOpen) {
                window.detailsModal.close();
            }
        });

        // Manejo específico para iOS
        if (detailsModal.isIOS()) {
            window.addEventListener('load', function() {
                setTimeout(() => {
                    const urlParams = detailsModal.getItemIdFromUrl();
                    if (urlParams) {
                        const item = carousel.moviesData.find(movie => movie.id === urlParams.id);
                        if (item) {
                            const itemElement = document.querySelector(`.custom-carousel-item[data-item-id="${urlParams.id}"]`);
                            if (itemElement) {
                                detailsModal.show(item, itemElement);
                            }
                        }
                    }
                }, 1000);
            });
            
            let lastHash = window.location.hash;
            window.addEventListener('hashchange', function() {
                const newHash = window.location.hash;
                if (newHash !== lastHash) {
                    lastHash = newHash;
                    setTimeout(() => {
                        const urlParams = detailsModal.getItemIdFromUrl();
                        if (urlParams) {
                            const item = carousel.moviesData.find(movie => movie.id === urlParams.id);
                            if (item) {
                                const itemElement = document.querySelector(`.custom-carousel-item[data-item-id="${urlParams.id}"]`);
                                if (itemElement) {
                                    detailsModal.show(item, itemElement);
                                }
                            }
                        }
                    }, 300);
                }
            });
        }

        // Añadir función getItemIdFromUrl a DetailsModal
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