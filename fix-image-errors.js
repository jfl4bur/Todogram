// Script para agregar manejo de errores a las imágenes del carrusel de series
// Este script se ejecutará después de que se cargue el carrusel

function addImageErrorHandling() {
    console.log('Agregando manejo de errores a las imágenes del carrusel de series...');
    
    // Buscar todas las imágenes del carrusel de series
    const seriesImages = document.querySelectorAll('#series-carousel-wrapper .poster-image');
    
    seriesImages.forEach((img, index) => {
        // Agregar event listener para errores
        img.addEventListener('error', function() {
            console.log(`SeriesCarousel: Imagen fallida para "${this.alt}", usando placeholder`);
            
            // Crear placeholder con el título de la serie
            const placeholderUrl = `https://via.placeholder.com/194x271/333/fff?text=${encodeURIComponent(this.alt)}`;
            this.src = placeholderUrl;
            this.style.opacity = '1';
            
            // Ocultar loader si existe
            const loader = this.parentElement.previousElementSibling;
            if (loader && loader.classList.contains('loader')) {
                loader.style.display = 'none';
            }
        });
        
        // Verificar si la imagen ya falló
        if (img.complete && img.naturalHeight === 0) {
            console.log(`SeriesCarousel: Imagen ya falló para "${img.alt}", aplicando placeholder`);
            img.dispatchEvent(new Event('error'));
        }
    });
    
    console.log(`SeriesCarousel: Manejo de errores agregado a ${seriesImages.length} imágenes`);
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addImageErrorHandling);
} else {
    addImageErrorHandling();
}

// También ejecutar después de un delay para capturar imágenes cargadas dinámicamente
setTimeout(addImageErrorHandling, 2000);
setTimeout(addImageErrorHandling, 5000);
