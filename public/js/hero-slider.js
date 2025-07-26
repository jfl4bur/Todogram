class HeroSlider {
    constructor() {
        this.container = document.getElementById('hero-slider-container');
        this.wrapper = document.getElementById('hero-slider-wrapper');
        this.skeleton = document.getElementById('hero-skeleton');
        this.slidesContainer = document.getElementById('hero-slides');
        this.prevBtn = document.getElementById('hero-prev');
        this.nextBtn = document.getElementById('hero-next');
        this.indicators = document.getElementById('hero-indicators');
        this.progressBar = document.getElementById('hero-auto-progress-bar');
        
        this.slides = [];
        this.moviesData = [];
        this.currentIndex = 0;
        this.maxSlides = 5; // Máximo de slides para el hero
        this.autoPlayInterval = null;
        this.autoPlayDuration = 6000; // 6 segundos por slide
        this.progressInterval = null;
        this.progressDuration = 50; // Intervalo del progreso en ms
        this.isTransitioning = false;
        
        if (!this.container || !this.wrapper || !this.skeleton) {
            console.error("Elementos del hero slider no encontrados");
            return;
        }
        
        this.init();
    }
    
    init() {
        this.loadMoviesData();
    }
    
    async loadMoviesData() {
        try {
            const response = await fetch(DATA_URL);
            if (!response.ok) throw new Error('No se pudo cargar data.json');
            const data = await response.json();
            
            // Filtrar películas con mejor puntuación para el hero
            this.moviesData = data
                .filter(item => 
                    item && 
                    typeof item === 'object' && 
                    item['Categoría'] === 'Películas' &&
                    item['Carteles'] && // Debe tener imagen de fondo
                    item['Portada'] && // Debe tener portada
                    item['Synopsis'] // Debe tener sinopsis
                )
                .map((item, index) => ({
                    id: index.toString(),
                    title: item['Título'] || 'Sin título',
                    description: item['Synopsis'] || 'Descripción no disponible',
                    posterUrl: item['Portada'] || '',
                    backgroundUrl: item['Carteles'] || item['Portada'] || '', // Priorizar carteles para fondo
                    year: item['Año'] ? item['Año'].toString() : '',
                    duration: item['Duración'] || '',
                    genre: item['Géneros'] || '',
                    rating: item['Puntuación 1-10'] ? item['Puntuación 1-10'].toString() : '',
                    ageRating: item['Clasificación'] || '',
                    trailerUrl: item['Trailer'] || '',
                    videoUrl: item['Video iframe'] || '',
                    tmdbUrl: item['TMDB'] || '',
                    verPelicula: item['Ver Película'] || '#'
                }))
                .sort((a, b) => {
                    // Ordenar por puntuación (descendente)
                    const ratingA = parseFloat(a.rating) || 0;
                    const ratingB = parseFloat(b.rating) || 0;
                    return ratingB - ratingA;
                })
                .slice(0, this.maxSlides); // Tomar solo las mejores 5
            
            if (this.moviesData.length === 0) {
                // Datos de ejemplo si no hay películas
                this.moviesData = [
                    {
                        id: "1",
                        title: "Película Destacada",
                        description: "Esta es una película destacada que se muestra en el hero slider cuando no hay datos reales disponibles.",
                        posterUrl: "https://via.placeholder.com/400x600",
                        backgroundUrl: "https://via.placeholder.com/1920x1080",
                        year: "2024",
                        duration: "120 min",
                        genre: "Acción",
                        rating: "8.5",
                        ageRating: "16+",
                        trailerUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                        videoUrl: "",
                        tmdbUrl: "",
                        verPelicula: "#"
                    }
                ];
            }
            
            this.showHeroSlider();
            this.renderSlides();
            this.setupEventListeners();
            this.startAutoPlay();
            
        } catch (error) {
            console.error('Error cargando datos para hero slider:', error);
            this.moviesData = [
                {
                    id: "1",
                    title: "Película Destacada",
                    description: "Esta es una película destacada que se muestra en el hero slider cuando no hay datos reales disponibles.",
                    posterUrl: "https://via.placeholder.com/400x600",
                    backgroundUrl: "https://via.placeholder.com/1920x1080",
                    year: "2024",
                    duration: "120 min",
                    genre: "Acción",
                    rating: "8.5",
                    ageRating: "16+",
                    trailerUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                    videoUrl: "",
                    tmdbUrl: "",
                    verPelicula: "#"
                }
            ];
            this.showHeroSlider();
            this.renderSlides();
            this.setupEventListeners();
            this.startAutoPlay();
        }
    }
    
    showHeroSlider() {
        this.skeleton.style.display = 'none';
        this.wrapper.style.display = 'block';
    }
    
    renderSlides() {
        this.slidesContainer.innerHTML = '';
        this.indicators.innerHTML = '';
        this.slides = [];
        
        this.moviesData.forEach((movie, index) => {
            // Crear slide
            const slide = document.createElement('div');
            slide.className = 'hero-slide';
            slide.style.backgroundImage = `url("${movie.backgroundUrl}")`;
            slide.dataset.index = index;
            
            // Crear contenido del slide
            const content = document.createElement('div');
            content.className = 'hero-content';
            
            const metaInfo = [];
            if (movie.year) metaInfo.push(`<span>${movie.year}</span>`);
            if (movie.duration) metaInfo.push(`<span>${movie.duration}</span>`);
            if (movie.genre) metaInfo.push(`<span>${movie.genre}</span>`);
            if (movie.ageRating) metaInfo.push(`<span class="age-rating">${movie.ageRating}</span>`);
            
            const ratingHtml = movie.rating ? 
                `<div class="hero-rating"><i class="fas fa-star"></i><span>${movie.rating}</span></div>` : '';
            
            content.innerHTML = `
                <h2>${movie.title}</h2>
                <div class="hero-meta">
                    ${metaInfo.join('')}
                    ${ratingHtml}
                </div>
                <div class="hero-description">${movie.description}</div>
                <div class="hero-actions">
                    <button class="hero-btn hero-btn-primary" onclick="window.detailsModal?.show(window.heroSlider.moviesData[${index}])">
                        <i class="fas fa-play"></i>
                        Ver Detalles
                    </button>
                    ${movie.trailerUrl ? `
                        <button class="hero-btn hero-btn-secondary" onclick="window.videoModal?.show('${movie.trailerUrl}')">
                            <i class="fas fa-film"></i>
                            Tráiler
                        </button>
                    ` : ''}
                </div>
            `;
            
            slide.appendChild(content);
            this.slidesContainer.appendChild(slide);
            this.slides.push(slide);
            
            // Crear indicador
            const indicator = document.createElement('div');
            indicator.className = 'hero-indicator';
            indicator.dataset.index = index;
            indicator.addEventListener('click', () => this.goToSlide(index));
            this.indicators.appendChild(indicator);
        });
        
        // Activar primer slide
        if (this.slides.length > 0) {
            this.goToSlide(0);
        }
    }
    
    setupEventListeners() {
        if (this.prevBtn && this.nextBtn) {
            this.prevBtn.addEventListener('click', () => this.prevSlide());
            this.nextBtn.addEventListener('click', () => this.nextSlide());
        }
        
        // Pausar autoplay en hover
        this.container.addEventListener('mouseenter', () => this.pauseAutoPlay());
        this.container.addEventListener('mouseleave', () => this.startAutoPlay());
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.prevSlide();
            if (e.key === 'ArrowRight') this.nextSlide();
        });
        
        // Touch/swipe support
        let startX = 0;
        let endX = 0;
        
        this.container.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
        });
        
        this.container.addEventListener('touchend', (e) => {
            endX = e.changedTouches[0].clientX;
            const diff = startX - endX;
            
            if (Math.abs(diff) > 50) { // Minimum swipe distance
                if (diff > 0) {
                    this.nextSlide(); // Swipe left = next
                } else {
                    this.prevSlide(); // Swipe right = prev
                }
            }
        });
    }
    
    goToSlide(index) {
        if (this.isTransitioning || index === this.currentIndex) return;
        
        this.isTransitioning = true;
        
        // Reset progress
        this.resetProgress();
        
        // Update slides
        this.slides.forEach((slide, i) => {
            slide.classList.remove('active', 'prev', 'next');
            
            if (i === index) {
                slide.classList.add('active');
            } else if (i < index) {
                slide.classList.add('prev');
            } else {
                slide.classList.add('next');
            }
        });
        
        // Update indicators
        document.querySelectorAll('.hero-indicator').forEach((indicator, i) => {
            indicator.classList.toggle('active', i === index);
        });
        
        this.currentIndex = index;
        
        // Reset transition flag after animation
        setTimeout(() => {
            this.isTransitioning = false;
        }, 800);
        
        // Restart progress
        this.startProgress();
    }
    
    nextSlide() {
        const nextIndex = (this.currentIndex + 1) % this.slides.length;
        this.goToSlide(nextIndex);
    }
    
    prevSlide() {
        const prevIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;
        this.goToSlide(prevIndex);
    }
    
    startAutoPlay() {
        this.pauseAutoPlay(); // Clear any existing interval
        
        if (this.slides.length <= 1) return; // No autoplay for single slide
        
        this.autoPlayInterval = setInterval(() => {
            if (!this.isTransitioning) {
                this.nextSlide();
            }
        }, this.autoPlayDuration);
        
        this.startProgress();
    }
    
    pauseAutoPlay() {
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
        }
        this.pauseProgress();
    }
    
    startProgress() {
        this.resetProgress();
        
        if (this.slides.length <= 1) return; // No progress for single slide
        
        let width = 0;
        const increment = 100 / (this.autoPlayDuration / this.progressDuration);
        
        this.progressInterval = setInterval(() => {
            width += increment;
            if (width >= 100) {
                width = 100;
                this.pauseProgress();
            }
            this.progressBar.style.width = `${width}%`;
        }, this.progressDuration);
    }
    
    pauseProgress() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }
    
    resetProgress() {
        this.pauseProgress();
        this.progressBar.style.width = '0%';
    }
    
    // Método para integración con otros modales
    getCurrentMovie() {
        return this.moviesData[this.currentIndex];
    }
}

// Inicializar hero slider cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    window.heroSlider = new HeroSlider();
});

// Exponer globalmente para integración con otros scripts
window.HeroSlider = HeroSlider;