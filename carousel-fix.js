// Script para arreglar la paginación dinámica de los carruseles
// Este script se ejecutará después de que se carguen los carruseles

function fixCarouselPagination() {
    console.log('Arreglando paginación dinámica de los carruseles...');
    
    // Función para calcular dimensiones dinámicamente
    function calculateCarouselDimensions(wrapper, carouselName) {
        const itemWidth = 194;
        const gap = 4;
        
        const containerWidth = wrapper.clientWidth;
        if (containerWidth > 0) {
            const itemsPerPage = Math.max(1, Math.floor(containerWidth / (itemWidth + gap)));
            // Calcular step dinámicamente: mostrar 2-3 páginas de elementos
            const step = Math.max(itemsPerPage * 2, itemsPerPage + 2);
            console.log(`${carouselName}: itemsPerPage=${itemsPerPage}, step=${step}, containerWidth=${containerWidth}`);
            return { itemsPerPage, step };
        } else {
            // Si no hay containerWidth, usar valores mínimos dinámicos
            const fallbackItemsPerPage = 5;
            const fallbackStep = fallbackItemsPerPage * 2;
            console.log(`${carouselName}: Usando valores de fallback - itemsPerPage=${fallbackItemsPerPage}, step=${fallbackStep}`);
            return { itemsPerPage: fallbackItemsPerPage, step: fallbackStep };
        }
    }
    
    // Arreglar carrusel de películas
    if (window.carousel && window.carousel.wrapper) {
        const dimensions = calculateCarouselDimensions(window.carousel.wrapper, 'Carousel');
        window.carousel.itemsPerPage = dimensions.itemsPerPage;
        window.carousel.step = dimensions.step;
        console.log('Carousel: Paginación actualizada dinámicamente');
    }
    
    // Arreglar carrusel de series
    if (window.seriesCarousel && window.seriesCarousel.wrapper) {
        const dimensions = calculateCarouselDimensions(window.seriesCarousel.wrapper, 'SeriesCarousel');
        window.seriesCarousel.itemsPerPage = dimensions.itemsPerPage;
        window.seriesCarousel.step = dimensions.step;
        console.log('SeriesCarousel: Paginación actualizada dinámicamente');
    }
    
    // Agregar listener para resize
    window.addEventListener('resize', () => {
        setTimeout(() => {
            if (window.carousel && window.carousel.wrapper) {
                const dimensions = calculateCarouselDimensions(window.carousel.wrapper, 'Carousel');
                window.carousel.itemsPerPage = dimensions.itemsPerPage;
                window.carousel.step = dimensions.step;
            }
            
            if (window.seriesCarousel && window.seriesCarousel.wrapper) {
                const dimensions = calculateCarouselDimensions(window.seriesCarousel.wrapper, 'SeriesCarousel');
                window.seriesCarousel.itemsPerPage = dimensions.itemsPerPage;
                window.seriesCarousel.step = dimensions.step;
            }
        }, 100);
    });
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixCarouselPagination);
} else {
    fixCarouselPagination();
}

// También ejecutar después de un delay para asegurar que los carruseles estén inicializados
setTimeout(fixCarouselPagination, 1000);
setTimeout(fixCarouselPagination, 3000);
