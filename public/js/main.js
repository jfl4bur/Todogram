// ===== MAIN.JS - INICIALIZACIÓN PRINCIPAL =====

// Función para inicializar todos los componentes
function initializeComponents() {
    console.log('Inicializando componentes...');
    
    // Inicializar carousel
    if (window.carousel && typeof window.carousel.init === 'function') {
        window.carousel.init();
        console.log('Carousel inicializado');
    }
    
    // Inicializar modales
    if (window.detailsModal && typeof window.detailsModal.init === 'function') {
        window.detailsModal.init();
        console.log('Details modal inicializado');
    }
    
    if (window.shareModal && typeof window.shareModal.init === 'function') {
        window.shareModal.init();
        console.log('Share modal inicializado');
    }
    
    if (window.videoModal && typeof window.videoModal.init === 'function') {
        window.videoModal.init();
        console.log('Video modal inicializado');
    }
    
    if (window.hoverModal && typeof window.hoverModal.init === 'function') {
        window.hoverModal.init();
        console.log('Hover modal inicializado');
    }
    
    // Inicializar slider después de que el carousel esté listo
    if (window.slider && typeof window.slider.init === 'function') {
        // Esperar a que los datos del carousel estén disponibles
        const checkCarouselData = () => {
            if (window.carousel && window.carousel.moviesData && window.carousel.moviesData.length > 0) {
                window.slider.init();
                console.log('Slider inicializado');
            } else {
                setTimeout(checkCarouselData, 100);
            }
        };
        checkCarouselData();
    }
}

// Función para manejar cambios en el hash de la URL
function handleHashChange() {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#movie-')) {
        const movieId = hash.replace('#movie-', '');
        
        // Buscar la película en los datos disponibles
        let movie = null;
        
        if (window.carousel && window.carousel.moviesData) {
            movie = window.carousel.moviesData.find(m => m.id.toString() === movieId);
        }
        
        if (movie && window.detailsModal && typeof window.detailsModal.openModal === 'function') {
            window.detailsModal.openModal(movie);
        }
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM cargado, inicializando...');
        initializeComponents();
        
        // Escuchar cambios en el hash
        window.addEventListener('hashchange', handleHashChange);
        
        // Manejar hash inicial
        handleHashChange();
    });
} else {
    console.log('DOM ya cargado, inicializando...');
    initializeComponents();
    
    // Escuchar cambios en el hash
    window.addEventListener('hashchange', handleHashChange);
    
    // Manejar hash inicial
    handleHashChange();
}

// Función para mostrar/ocultar skeletons
function showSkeleton(selector) {
    const skeleton = document.querySelector(selector);
    if (skeleton) {
        skeleton.style.display = 'flex';
    }
}

function hideSkeleton(selector) {
    const skeleton = document.querySelector(selector);
    if (skeleton) {
        skeleton.style.display = 'none';
    }
}

// Exportar funciones para uso global
window.showSkeleton = showSkeleton;
window.hideSkeleton = hideSkeleton;