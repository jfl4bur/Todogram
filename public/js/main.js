document.addEventListener('DOMContentLoaded', () => {
    if (!window.peliculas || window.peliculas.length === 0) {
        console.error("No se encontraron datos de películas");
        return;
    }

    try {
        const carruselPeliculas = new Carousel('carrusel-peliculas', window.peliculas, 'Películas Populares');
        const hoverModal = new HoverModal();
        const detailsModal = new DetailsModal();
        const videoModal = new VideoModal();
        const shareModal = new ShareModal();
        
        window.detailsModal = detailsModal;
        window.videoModal = videoModal;
        window.shareModal = shareModal;
        
        document.addEventListener('click', (e) => {
            const item = e.target.closest('.item');
            if (item) {
                const itemId = item.dataset.id;
                const pelicula = window.peliculas.find(p => p.id == itemId);
                if (pelicula) window.detailsModal.open(pelicula);
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.style.display = 'none';
                });
                const miniModal = document.getElementById('mini-modal');
                if (miniModal) miniModal.style.display = 'none';
            }
        });
    } catch (error) {
        console.error("Error durante la inicialización:", error);
    }
});