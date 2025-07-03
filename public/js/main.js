document.addEventListener('DOMContentLoaded', function () {
    // Inicializar componentes
    const carousel = new Carousel();
    const hoverModal = new HoverModal();
    const detailsModal = new DetailsModal();
    const videoModal = new VideoModal();
    const shareModal = new ShareModal();
    // Asumiendo que tenemos una clase GalleryModal
    // const galleryModal = new GalleryModal();

    // Asignar a window para acceso global
    window.carousel = carousel;
    window.hoverModal = hoverModal;
    window.detailsModal = detailsModal;
    window.videoModal = videoModal;
    window.shareModal = shareModal;
    // window.galleryModal = galleryModal;
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

    // Manejar el evento popstate (cuando el usuario navega hacia atrás/adelante)
    window.addEventListener('popstate', function() {
        if (window.detailsModal.isDetailsModalOpen) {
            window.detailsModal.close();
        }
    });

    // Manejo específico para iOS - Solución para hashchange
    if (window.detailsModal.isIOS()) {
        // Verificar hash al cargar la página
        window.addEventListener('load', function() {
            setTimeout(() => {
                const urlParams = window.detailsModal.getItemIdFromUrl();
                if (urlParams) {
                    const item = window.carousel.moviesData.find(movie => movie.id === urlParams.id);
                    if (item) {
                        const itemElement = document.querySelector(`.custom-carousel-item[data-item-id="${item.id}"]`);
                        if (itemElement) {
                            window.detailsModal.show(item, itemElement);
                        }
                    }
                }
            }, 1000);
        });
        
        // Manejar cambios en el hash
        let lastHash = window.location.hash;
        window.addEventListener('hashchange', function() {
            const newHash = window.location.hash;
            if (newHash !== lastHash) {
                lastHash = newHash;
                setTimeout(() => {
                    const urlParams = window.detailsModal.getItemIdFromUrl();
                    if (urlParams) {
                        const item = window.carousel.moviesData.find(movie => movie.id === urlParams.id);
                        if (item) {
                            const itemElement = document.querySelector(`.custom-carousel-item[data-item-id="${item.id}"]`);
                            if (itemElement) {
                                window.detailsModal.show(item, itemElement);
                            }
                        }
                    }
                }, 300);
            }
        });
    }

    // Función para extraer el ID de la URL (se añade al DetailsModal, pero también se puede usar aquí)
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
});