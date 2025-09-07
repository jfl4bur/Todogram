// Script para implementar paginación dinámica en los carruseles
// Este script se ejecutará después de que se carguen los carruseles

function implementDynamicPagination() {
    console.log('Implementando paginación dinámica...');
    
    // Función para calcular items por página dinámicamente
    function calculateItemsPerPage(wrapper) {
        if (!wrapper) return 5;
        
        const itemWidth = 194; // Ancho fijo de cada item
        const gap = 4; // Gap entre items
        const containerWidth = wrapper.clientWidth;
        
        // Calcular cuántos items caben en el viewport
        const itemsPerPage = Math.floor((containerWidth + gap) / (itemWidth + gap));
        
        // Asegurar un mínimo de 1 item
        return Math.max(1, itemsPerPage);
    }
    
    // Función para actualizar la paginación de un carrusel
    function updateCarouselPagination(carouselInstance, carouselName) {
        if (!carouselInstance || !carouselInstance.wrapper) {
            console.log(`${carouselName}: Instancia no disponible`);
            return;
        }
        
        // Calcular items por página dinámicamente
        const newItemsPerPage = calculateItemsPerPage(carouselInstance.wrapper);
        
        // Actualizar la instancia del carrusel
        carouselInstance.itemsPerPage = newItemsPerPage;
        carouselInstance.step = newItemsPerPage * 2; // Renderizar 2x items por página
        
        console.log(`${carouselName}: Paginación actualizada - itemsPerPage: ${newItemsPerPage}, step: ${carouselInstance.step}`);
        
        return newItemsPerPage;
    }
    
    // Función para interceptar los métodos de scroll
    function interceptScrollMethods(carouselInstance, carouselName) {
        if (!carouselInstance) return;
        
        // Guardar métodos originales
        const originalScrollToPrevPage = carouselInstance.scrollToPrevPage;
        const originalScrollToNextPage = carouselInstance.scrollToNextPage;
        
        // Interceptar scrollToPrevPage
        carouselInstance.scrollToPrevPage = function() {
            console.log(`${carouselName}: Scroll anterior - recalculando paginación`);
            updateCarouselPagination(this, carouselName);
            
            const itemWidth = 194;
            const gap = 4;
            const scrollAmount = Math.max(1, this.itemsPerPage) * (itemWidth + gap);
            
            console.log(`${carouselName}: Scroll anterior - itemsPerPage: ${this.itemsPerPage}, scrollAmount: ${scrollAmount}`);
            
            this.wrapper.scrollBy({
                left: -scrollAmount,
                behavior: 'smooth'
            });
        };
        
        // Interceptar scrollToNextPage
        carouselInstance.scrollToNextPage = function() {
            console.log(`${carouselName}: Scroll siguiente - recalculando paginación`);
            updateCarouselPagination(this, carouselName);
            
            const itemWidth = 194;
            const gap = 4;
            const scrollAmount = Math.max(1, this.itemsPerPage) * (itemWidth + gap);
            
            console.log(`${carouselName}: Scroll siguiente - itemsPerPage: ${this.itemsPerPage}, scrollAmount: ${scrollAmount}`);
            
            this.wrapper.scrollBy({
                left: scrollAmount,
                behavior: 'smooth'
            });
        };
        
        console.log(`${carouselName}: Métodos de scroll interceptados`);
    }
    
    // Aplicar paginación dinámica a los carruseles
    function applyDynamicPagination() {
        // Carrusel de películas
        if (window.carousel) {
            console.log('Aplicando paginación dinámica al carrusel de películas...');
            updateCarouselPagination(window.carousel, 'Carousel');
            interceptScrollMethods(window.carousel, 'Carousel');
        } else {
            console.log('Carrusel de películas no disponible aún');
        }
        
        // Carrusel de series
        if (window.seriesCarousel) {
            console.log('Aplicando paginación dinámica al carrusel de series...');
            updateCarouselPagination(window.seriesCarousel, 'SeriesCarousel');
            interceptScrollMethods(window.seriesCarousel, 'SeriesCarousel');
        } else {
            console.log('Carrusel de series no disponible aún');
        }
    }
    
    // Ejecutar inmediatamente
    applyDynamicPagination();
    
    // También ejecutar después de delays para capturar carruseles cargados dinámicamente
    setTimeout(applyDynamicPagination, 1000);
    setTimeout(applyDynamicPagination, 3000);
    setTimeout(applyDynamicPagination, 5000);
    
    // Escuchar cambios de tamaño de ventana
    window.addEventListener('resize', () => {
        console.log('Ventana redimensionada - recalculando paginación...');
        setTimeout(applyDynamicPagination, 100);
    });
    
    console.log('Paginación dinámica implementada');
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', implementDynamicPagination);
} else {
    implementDynamicPagination();
}
