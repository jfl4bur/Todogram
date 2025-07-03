document.addEventListener('DOMContentLoaded', () => {
    // Verificar que los datos existen
    if (!window.peliculas || window.peliculas.length === 0) {
        console.error("No se encontraron datos de películas");
        return;
    }

    try {
        // Inicializar componentes
        const carruselPeliculas = new Carousel('carrusel-peliculas', window.peliculas, 'Películas Populares');
        const hoverModal = new HoverModal();
        const detailsModal = new DetailsModal();
        const videoModal = new VideoModal();
        const shareModal = new ShareModal();
        
        // Guardar instancias en window para acceso global
        window.detailsModal = detailsModal;
        window.videoModal = videoModal;
        window.shareModal = shareModal;
        
        // Evento para abrir modal de detalles
        document.addEventListener('click', (e) => {
            const item = e.target.closest('.item');
            if (item) {
                const itemId = item.dataset.id;
                const pelicula = window.peliculas.find(p => p.id == itemId);
                if (pelicula) detailsModal.open(pelicula);
            }
        });
        
        // Cerrar modales con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.style.display = 'none';
                });
                document.getElementById('mini-modal').style.display = 'none';
            }
        });
    } catch (error) {
        console.error("Error al inicializar componentes:", error);
    }
});