// Script de depuración para el slider
console.log('=== DEBUG SLIDER ===');

// Verificar elementos del DOM
console.log('Elementos del DOM:');
console.log('- slider-wrapper:', document.getElementById('slider-wrapper'));
console.log('- slider-prev:', document.getElementById('slider-prev'));
console.log('- slider-next:', document.getElementById('slider-next'));
console.log('- slider-pagination:', document.getElementById('slider-pagination'));

// Verificar objetos globales
console.log('Objetos globales:');
console.log('- window.carousel:', window.carousel);
console.log('- window.slider:', window.slider);
console.log('- window.carousel?.moviesData:', window.carousel?.moviesData);
console.log('- window.carousel?.moviesData?.length:', window.carousel?.moviesData?.length);

// Verificar datos de películas
if (window.carousel?.moviesData) {
    console.log('Datos de películas disponibles:');
    console.log('- Total películas:', window.carousel.moviesData.length);
    console.log('- Primeras 3 películas:', window.carousel.moviesData.slice(0, 3));
} else {
    console.log('No hay datos de películas disponibles');
}

// Verificar estilos
console.log('Estilos del slider:');
const sliderSection = document.querySelector('.slider-section');
if (sliderSection) {
    const styles = window.getComputedStyle(sliderSection);
    console.log('- slider-section height:', styles.height);
    console.log('- slider-section width:', styles.width);
    console.log('- slider-section display:', styles.display);
} else {
    console.log('slider-section no encontrado');
}

// Verificar contenido del slider-wrapper
const sliderWrapper = document.getElementById('slider-wrapper');
if (sliderWrapper) {
    console.log('Contenido del slider-wrapper:');
    console.log('- innerHTML length:', sliderWrapper.innerHTML.length);
    console.log('- children count:', sliderWrapper.children.length);
    console.log('- first child:', sliderWrapper.firstElementChild);
} else {
    console.log('slider-wrapper no encontrado');
}

console.log('=== FIN DEBUG SLIDER ==='); 